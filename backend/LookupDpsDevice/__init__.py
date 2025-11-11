
import os
import time
import hmac
import hashlib
import base64
import urllib.parse
import json
import requests
import azure.functions as func

DPS_HOST = os.environ.get("DPS_HOST")
DPS_SAS_KEY_NAME = os.environ.get("DPS_SAS_KEY_NAME", "provisioningserviceowner")
DPS_SAS_KEY = os.environ.get("DPS_SAS_KEY")
API_VERSION = os.environ.get("DPS_API_VERSION", "2021-10-01")

def build_sas_token(resource_uri, key_name, key_value, expiry=600):
    ttl = int(time.time()) + expiry
    sr = urllib.parse.quote_plus(resource_uri)
    to_sign = (sr + "\n" + str(ttl)).encode("utf-8")
    try:
        key = base64.b64decode(key_value)
    except Exception as e:
        raise ValueError(f"Invalid DPS_SAS_KEY base64: {e}")
    signature = base64.b64encode(hmac.new(key, to_sign, hashlib.sha256).digest())
    sig = urllib.parse.quote_plus(signature)
    token = f"SharedAccessSignature sr={sr}&sig={sig}&se={ttl}&skn={key_name}"
    return token

def http_get(path):
    sas = build_sas_token(DPS_HOST, DPS_SAS_KEY_NAME, DPS_SAS_KEY, expiry=600)
    headers = {"Authorization": sas, "Content-Type": "application/json", "x-ms-version": API_VERSION}
    url = f"https://{DPS_HOST}{path}"
    resp = requests.get(url, headers=headers, timeout=15)
    return resp

def get_registration_state(reg_id):
    path = f"/registrations/{urllib.parse.quote(reg_id)}?api-version={API_VERSION}"
    return http_get(path)

def get_enrollment(reg_id):
    path = f"/enrollments/{urllib.parse.quote(reg_id)}?api-version={API_VERSION}"
    return http_get(path)

def parse_request_json(req):
    try:
        return req.get_json()
    except Exception:
        try:
            body = req.get_body()
            if not body:
                return {}
            return json.loads(body.decode("utf-8"))
        except Exception:
            return {}

def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body_json = parse_request_json(req)
        reg_id = req.params.get("regId") or body_json.get("regId")
        if not reg_id:
            return func.HttpResponse(json.dumps({"error": "Missing query parameter 'regId'"}), mimetype="application/json", status_code=400)

        if not (DPS_HOST and DPS_SAS_KEY and DPS_SAS_KEY_NAME):
            return func.HttpResponse(json.dumps({"error": "DPS configuration not set in environment"}), mimetype="application/json", status_code=500)

        reg_resp = get_registration_state(reg_id)
        try:
            reg_json = reg_resp.json()
        except Exception:
            reg_json = {"status_code": reg_resp.status_code, "body": reg_resp.text}

        enroll_resp = get_enrollment(reg_id)
        try:
            enroll_json = enroll_resp.json()
        except Exception:
            enroll_json = {"status_code": enroll_resp.status_code, "body": enroll_resp.text}

        found = False
        if isinstance(reg_json, dict) and (reg_json.get("registrationId") == reg_id or reg_json.get("status") is not None):
            found = True
        if isinstance(enroll_json, dict) and (enroll_json.get("registrationId") == reg_id or enroll_json.get("status") is not None):
            found = True

        result = {
            "regId": reg_id,
            "foundInDps": found,
            "registration_http_status": reg_resp.status_code,
            "registration": reg_json,
            "enrollment_http_status": enroll_resp.status_code,
            "enrollment": enroll_json
        }
        return func.HttpResponse(json.dumps(result, default=str), mimetype="application/json", status_code=200)

    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), mimetype="application/json", status_code=500)
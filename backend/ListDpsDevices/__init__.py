import os, time, hmac, hashlib, base64, urllib.parse, json, requests
import azure.functions as func

DPS_HOST = os.environ.get("DPS_HOST")
DPS_SAS_KEY_NAME = os.environ.get("DPS_SAS_KEY_NAME", "provisioningserviceowner")
DPS_SAS_KEY = os.environ.get("DPS_SAS_KEY")
API_VERSION = os.environ.get("DPS_API_VERSION", "2021-10-01")

def build_sas_token(resource_uri, key_name, key_value, expiry=600):
    ttl = int(time.time()) + expiry
    sr = urllib.parse.quote_plus(resource_uri)
    to_sign = (sr + "\n" + str(ttl)).encode("utf-8")
    key = base64.b64decode(key_value)
    signature = base64.b64encode(hmac.new(key, to_sign, hashlib.sha256).digest())
    sig = urllib.parse.quote_plus(signature)
    return f"SharedAccessSignature sr={sr}&sig={sig}&se={ttl}&skn={key_name}"

def query_enrollments():
    sas = build_sas_token(DPS_HOST, DPS_SAS_KEY_NAME, DPS_SAS_KEY, expiry=600)
    headers = {
        "Authorization": sas,
        "Content-Type": "application/json",
        "x-ms-version": API_VERSION
    }

    # Query individual enrollments
    url_enrollments = f"https://{DPS_HOST}/enrollments/query?api-version={API_VERSION}"
    resp_enrollments = requests.post(url_enrollments, headers=headers, json={"query": "select * from enrollments"}, timeout=20)
    
    # Query enrollment groups
    url_groups = f"https://{DPS_HOST}/enrollmentGroups/query?api-version={API_VERSION}"
    resp_groups = requests.post(url_groups, headers=headers, json={"query": "select * from enrollmentGroups"}, timeout=20)
    
    return {
        "individual_enrollments_status": resp_enrollments.status_code,
        "individual_enrollments": try_json(resp_enrollments),
        "enrollment_groups_status": resp_groups.status_code,
        "enrollment_groups": try_json(resp_groups)
    }

def try_json(resp):
    try:
        return resp.json()
    except Exception:
        return resp.text

def main(req: func.HttpRequest) -> func.HttpResponse:
    if not (DPS_HOST and DPS_SAS_KEY and DPS_SAS_KEY_NAME):
        return func.HttpResponse("DPS configuration missing.", status_code=500)
    try:
        result = query_enrollments()
        return func.HttpResponse(json.dumps(result, default=str), mimetype="application/json", status_code=200)
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)

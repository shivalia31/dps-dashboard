import React, {useState} from "react";
import { API_BASE } from "./config";

export default function DeviceRegistration(){
  const [regId, setRegId] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  async function handleProvision(){
    setError(null); setResp(null);
    const id = regId.trim();
    if (!id) { setError("Enter a registration/device id"); return; }
    setLoading(true);
    try{
      const url = `${API_BASE}/api/AutoCreateHubAndProvisionDevice?regId=${encodeURIComponent(id)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setResp(j);
    }catch(e){
      setError(String(e));
    }finally{ setLoading(false); }
  }

  return (
    <div>
      <h2>Device Registration (auto-provision)</h2>
      <div style={{display:"flex", gap:10, alignItems:"center"}}>
        <input className="input" placeholder="e.g. ble_dps_sym" value={regId} onChange={e=>setRegId(e.target.value)} />
        <button onClick={handleProvision} disabled={loading}>{loading?"Working...":"Register & Provision"}</button>
      </div>

      {error && <div style={{color:"salmon", marginTop:12}}>{error}</div>}
      {resp && (
        <div style={{marginTop:12}}>
          <div className="card">
            <div><strong>Status:</strong> {resp.deviceResult?.status || resp.message || "Completed"}</div>
            <div style={{marginTop:8}}><strong>Hub:</strong> {resp.hubResourceName || resp.iothub}</div>
            <details style={{marginTop:8}}>
              <summary>Full response JSON</summary>
              <pre className="json">{JSON.stringify(resp, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
      {!resp && !error && <div style={{marginTop:8}} className="muted"><small></small></div>}
    </div>
  )
}

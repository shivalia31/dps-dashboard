import React, {useState} from "react";
import { API_BASE } from "./config";

export default function DpsDeviceSearch(){
  const [regId, setRegId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSearch(){
    setError(null); setResult(null);
    const id = regId.trim();
    if (!id) { setError("Enter a registration/device id"); return; }
    setLoading(true);
    try{
      const resp = await fetch(`${API_BASE}/api/LookupDpsDevice?regId=${encodeURIComponent(id)}`);
      if(!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      setResult(json);
    }catch(e){
      setError(String(e));
    }finally{ setLoading(false); }
  }

  return (
    <div>
      <h2>DPS Search</h2>
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <input className="input" placeholder="Registration ID" value={regId} onChange={e=>setRegId(e.target.value)} />
        <button onClick={handleSearch} disabled={loading}>{loading?"Searching...":"Search DPS"}</button>
      </div>

      {error && <div style={{color:"salmon", marginTop:12}}>{error}</div>}
      {result && (
        <div style={{marginTop:12}}>
          <div className="card">
            <div><strong>Reg ID:</strong> {result.regId}</div>
            <div><strong>Found in DPS:</strong> {result.foundInDps ? "✅ Yes" : "❌ No"}</div>
            <div><strong>Registration status:</strong> {result.registration_http_status}</div>
            <div><strong>Enrollment status:</strong> {result.enrollment_http_status}</div>
            {result.registration && result.registration.assignedHub && (
              <div style={{marginTop:8}}><strong>Assigned Hub:</strong> {result.registration.assignedHub}</div>
            )}
            {result.registration && result.registration.deviceId && (
              <div><strong>Device ID:</strong> {result.registration.deviceId}</div>
            )}
            <details style={{marginTop:8}}>
              <summary>Registration JSON</summary>
              <pre className="json">{JSON.stringify(result.registration, null, 2)}</pre>
            </details>
            <details style={{marginTop:8}}>
              <summary>Enrollment JSON</summary>
              <pre className="json">{JSON.stringify(result.enrollment, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

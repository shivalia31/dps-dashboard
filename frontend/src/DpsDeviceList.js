// src/DpsDeviceList.js
import React, { useState } from "react";
import { API_BASE } from "./config";

function ensureArray(possible) {
  if (!possible) return [];
  if (Array.isArray(possible)) return possible;
  // Some DPS endpoints return an object with a 'value' array
  if (possible.value && Array.isArray(possible.value)) return possible.value;
  // If it's an object that looks like a single enrollment, wrap it
  if (typeof possible === "object") return [possible];
  return [];
}

function shortDate(t) {
  try {
    return t ? new Date(t).toLocaleString() : "-";
  } catch {
    return t;
  }
}

function Badge({ children, color = "var(--accent)" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 8,
      background: "rgba(59,130,246,0.08)",
      color: "var(--text)",
      fontWeight: 600,
      marginRight: 8,
      border: "1px solid rgba(255,255,255,0.02)"
    }}>
      {children}
    </span>
  );
}

export default function DpsDeviceList() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function loadAll() {
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const resp = await fetch(`${API_BASE}/api/ListDpsDevices`);
      if (!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // normalize possible response shapes
  const individualEnrollments =
    ensureArray(data && (data.individual_enrollments || data.registrations || data.registrationsList || data));
  const enrollmentGroups = ensureArray(data && (data.enrollment_groups || data.enrollments || data.enrollmentGroups));

  // helper to extract useful fields from an enrollment object
  function extractFields(en) {
    // enrollment might be the enrollment object or DPS's registrationState; handle both
    const registrationId = en.registrationId || en.registrationState?.registrationId || en.deviceId || en.id;
    const deviceId = en.deviceId || en.registrationState?.deviceId || (en.registrationState && en.registrationState.deviceId);
    const assignedHub = en.registrationState?.assignedHub || en.assignedHub || (en.registrationState && en.registrationState.assignedHub);
    const status = en.registrationState?.status || en.status || en.provisioningStatus || null;
    const provisioningStatus = en.provisioningStatus || (en.status === "enabled" ? "enabled" : null);
    const created = en.createdDateTimeUtc || en.registrationState?.createdDateTimeUtc || en.created;
    const updated = en.lastUpdatedDateTimeUtc || en.registrationState?.lastUpdatedDateTimeUtc || en.updatedDateTimeUtc;
    const reprovisionPolicy = en.reprovisionPolicy || en.reprovisioningPolicy || en.reprovisionPolicy;
    const iothubs = en.iotHubs || en.allocationPolicy?.iotHubs || en.iotHubsList;
    return { registrationId, deviceId, assignedHub, status, provisioningStatus, created, updated, reprovisionPolicy, iothubs };
  }

  return (
    <div>
      <h2>All DPS Devices</h2>

      <div style={{ marginTop: 10 }}>
        <button onClick={loadAll} disabled={loading}>{loading ? "Loading..." : "Load all DPS items"}</button>
      </div>

      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

      {/* Individual enrollments */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Individual Enrollments</h3>
        {individualEnrollments.length === 0 && !loading && <div className="muted">Click "Load all DPS items" to view devices</div>}
        {individualEnrollments.map((en, idx) => {
          const f = extractFields(en);
          return (
            <div key={idx} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{f.registrationId || "—"}</div>
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>
                    <small>Device ID: </small><strong>{f.deviceId || "—"}</strong>
                    {f.assignedHub && <><span style={{ marginLeft: 12 }} /><small>Hub:</small> <strong>{f.assignedHub}</strong></>}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {f.status && <Badge>{f.status}</Badge>}
                  {f.provisioningStatus && <Badge>{f.provisioningStatus}</Badge>}
                  {f.iothubs && Array.isArray(f.iothubs) && f.iothubs.length > 0 && <div style={{ marginTop: 6, color: "var(--muted)" }}><small>IoT Hubs:</small> <strong>{f.iothubs.join(", ")}</strong></div>}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", color: "var(--muted)" }}>
                <div><small>Created:</small> {shortDate(f.created)}</div>
                <div><small>Last updated:</small> {shortDate(f.updated)}</div>
                <div><small>Reprovision:</small> {f.reprovisionPolicy ? JSON.stringify(f.reprovisionPolicy) : "—"}</div>
              </div>

              {/* Raw JSON toggle */}
              <details style={{ marginTop: 10 }}>
                <summary>Show raw enrollment JSON</summary>
                <pre className="json">{JSON.stringify(en, null, 2)}</pre>
              </details>
            </div>
          );
        })}
      </div>

      {/* Enrollment groups */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Enrollment Groups</h3>
        {enrollmentGroups.length === 0 && !loading && <div className="muted">No enrollment groups found.</div>}
        {enrollmentGroups.map((eg, idx) => {
          const f = extractFields(eg);
          return (
            <div key={idx} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{eg.enrollmentGroupId || eg.groupId || f.registrationId || `group-${idx}`}</div>
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>{eg.description || eg.attestation?.type || ""}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {f.status && <Badge>{f.status}</Badge>}
                </div>
              </div>

              <div style={{ marginTop: 10, color: "var(--muted)" }}>
                <div><small>Created:</small> {shortDate(f.created)}</div>
                <div><small>Last updated:</small> {shortDate(f.updated)}</div>
              </div>

              <details style={{ marginTop: 10 }}>
                <summary>Show raw group JSON</summary>
                <pre className="json">{JSON.stringify(eg, null, 2)}</pre>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

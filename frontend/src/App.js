import React, { useState } from "react";
import DpsDeviceSearch from "./DpsDeviceSearch";
import DpsDeviceList from "./DpsDeviceList";
import DeviceRegistration from "./DeviceRegistration";

export default function App() {
  const [tab, setTab] = useState("register");
  return (
    <div className="app">
      <div className="header">
        <h1 style={{margin:0}}>Device Commissioning</h1>
      </div>

      <nav>
        <button className={`tab ${tab==="register"?"active":""}`} onClick={()=>setTab("register")}>Device Registration</button>
        <button className={`tab ${tab==="search"?"active":""}`} onClick={()=>setTab("search")}>DPS Search</button>
        <button className={`tab ${tab==="list"?"active":""}`} onClick={()=>setTab("list")}>DPS Devices</button>
      </nav>

      <div className="panel">
        {tab==="register" && <DeviceRegistration/>}
        {tab==="search" && <DpsDeviceSearch/>}
        {tab==="list" && <DpsDeviceList/>}
      </div>
    </div>
  );
}

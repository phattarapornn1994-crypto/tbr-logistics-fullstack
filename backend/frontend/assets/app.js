// assets/app.js

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let TOKEN = localStorage.getItem("tbr_token") || "";

function setStatus(msg){ const el=$("#auth_status"); if(el) el.textContent=msg||""; }

async function api(path, {method="GET", json, auth=false} = {}){
  const url = `${window.API_BASE}${path}`;
  const headers = { "Content-Type":"application/json" };
  if (auth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: json ? JSON.stringify(json) : undefined });
  if (!res.ok){
    const txt = await res.text().catch(()=> "");
    throw new Error(`${res.status} ${res.statusText} :: ${txt}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// ---------- Tabs ----------
function openTab(name){
  $$(".tab").forEach(x=>x.classList.remove("active"));
  $(`#tab-${name}`)?.classList.add("active");
}

// ---------- Auth ----------
async function register(){
  try{
    const username = $("#auth_username").value.trim();
    const password = $("#auth_password").value;
    if (!username || !password) return setStatus("กรอก username/password");
    const data = await api("/auth/register", { method:"POST", json:{ username, password } });
    TOKEN = data.access_token; localStorage.setItem("tbr_token", TOKEN);
    setStatus("สมัครสำเร็จและล็อกอินแล้ว");
  }catch(e){ setStatus("สมัครไม่ได้: " + e.message); }
}

async function login(){
  try{
    const username = $("#auth_username").value.trim();
    const password = $("#auth_password").value;
    if (!username || !password) return setStatus("กรอก username/password");
    const data = await api("/auth/login", { method:"POST", json:{ username, password } });
    TOKEN = data.access_token; localStorage.setItem("tbr_token", TOKEN);
    setStatus("ล็อกอินสำเร็จ");
  }catch(e){ setStatus("ล็อกอินไม่ได้: " + e.message); }
}

// ---------- Customers ----------
async function loadCustomers(){
  const q = $("#cust_search")?.value || "";
  const rows = await api(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const tb = $("#customers_tbody"); tb.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.code}</td>
      <td>${r.name||""}</td>
      <td>${r.type||""}</td>
      <td>${(r.lat??"")}, ${(r.lng??"")}</td>
      <td><button class="btn" onclick="deleteCustomer('${r.code}')">ลบ</button></td>`;
    tb.appendChild(tr);
  });
}

async function saveCustomer(){
  try{
    const payload = {
      code: $("#cust_code").value.trim(),
      name: $("#cust_name").value.trim(),
      contact: $("#cust_contact").value.trim(),
      type: $("#cust_type").value.trim(),
      hours: $("#cust_hours").value.trim(),
      note: $("#cust_note").value.trim(),
      addr: $("#cust_addr").value.trim(),
      lat: parseFloat($("#cust_lat").value || "0"),
      lng: parseFloat($("#cust_lng").value || "0"),
    };
    if (!payload.code) return alert("กรอกรหัสลูกค้า");
    await api("/customers", { method:"POST", json:payload, auth:true });
    await loadCustomers(); alert("บันทึกแล้ว");
  }catch(e){ alert("บันทึกลูกค้าไม่ได้: " + e.message); }
}

async function deleteCustomer(code){
  if (!confirm(`ลบลูกค้า ${code}?`)) return;
  try{
    await api(`/customers/${encodeURIComponent(code)}`, { method:"DELETE", auth:true });
    await loadCustomers();
  }catch(e){ alert("ลบไม่ได้: " + e.message); }
}

async function seedCustomers(){
  const samples = [
    { code:"C001", name:"ร้าน A", lat:13.75, lng:100.55 },
    { code:"C002", name:"ร้าน B", lat:13.70, lng:100.50 },
    { code:"C003", name:"ร้าน C", lat:13.78, lng:100.60 },
  ];
  for (const s of samples){
    await api("/customers", { method:"POST", json:s, auth:true }).catch(()=>{});
  }
  await loadCustomers();
}

// ---------- Vehicles ----------
async function loadVehicles(){
  const q = $("#veh_search")?.value || "";
  const rows = await api(`/vehicles${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const tb = $("#vehicles_tbody"); tb.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.plate}</td>
      <td>${r.type||""}</td>
      <td>${r.capW||0} / ${r.capV||0}</td>
      <td>${r.owner||""}</td>
      <td>${r.costPerKm||0}</td>
      <td>${r.status||""}</td>
      <td><button class="btn" onclick="deleteVehicle('${r.plate}')">ลบ</button></td>`;
    tb.appendChild(tr);
  });
}

async function saveVehicle(){
  try{
    const payload = {
      plate: $("#veh_plate").value.trim(),
      type: $("#veh_type").value.trim(),
      capW: parseFloat($("#veh_cap_w").value || "0"),
      capV: parseFloat($("#veh_cap_v").value || "0"),
      owner: $("#veh_owner").value.trim(),
      costPerKm: parseFloat($("#veh_cost").value || "20"),
      status: $("#veh_status").value,
    };
    if (!payload.plate) return alert("กรอกทะเบียนรถ");
    await api("/vehicles", { method:"POST", json:payload, auth:true });
    await loadVehicles(); alert("บันทึกแล้ว");
  }catch(e){ alert("บันทึกรถไม่ได้: " + e.message); }
}

async function deleteVehicle(plate){
  if (!confirm(`ลบรถ ${plate}?`)) return;
  try{
    await api(`/vehicles/${encodeURIComponent(plate)}`, { method:"DELETE", auth:true });
    await loadVehicles();
  }catch(e){ alert("ลบรถไม่ได้: " + e.message); }
}

async function seedVehicles(){
  const samples = [
    { plate:"6W-001", type:"6W", capW:12, capV:30, owner:"OWN", costPerKm:22, status:"ready" },
    { plate:"10W-001", type:"10W", capW:18, capV:45, owner:"SUB", costPerKm:28, status:"ready" },
  ];
  for (const s of samples){
    await api("/vehicles", { method:"POST", json:s, auth:true }).catch(()=>{});
  }
  await loadVehicles();
}

// ---------- Planning ----------
function addPlanRow(){
  const tb = $("#plan_lines");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="input" placeholder="C001"/></td>
    <td><input class="input" type="number" step="0.01" placeholder="ตัน"/></td>
    <td><input class="input" type="number" step="0.01" placeholder="ลบ.ม."/></td>
    <td><input class="input" placeholder="ประเภทสินค้า"/></td>
    <td><button class="btn" onclick="this.closest('tr').remove()">ลบ</button></td>`;
  tb.appendChild(tr);
}

async function analyzePlan(){
  try{
    const name = $("#plan_name").value.trim() || "Plan";
    const date = $("#plan_date").value || new Date().toISOString().slice(0,10);
    const [latStr, lngStr] = ($("#plan_origin").value.trim() || "").split(",");
    const origin_lat = parseFloat(latStr), origin_lng = parseFloat(lngStr);

    const lines = [];
    $$("#plan_lines tr").forEach(tr=>{
      const tds = tr.querySelectorAll("td");
      const code = tds[0].querySelector("input").value.trim();
      const w = parseFloat(tds[1].querySelector("input").value || "0");
      const v = parseFloat(tds[2].querySelector("input").value || "0");
      const mat = tds[3].querySelector("input").value.trim();
      if (code) lines.push({ customer_code: code, w, v, mat });
    });

    if (Number.isNaN(origin_lat) || Number.isNaN(origin_lng))
      return alert("กรอก Origin เป็น lat,lng เช่น 13.75,100.50");
    if (!lines.length) return alert("เพิ่มรายการลูกค้าอย่างน้อย 1 แถว");

    const res = await api("/plans/optimize", { method:"POST", json:{ name, date, origin_lat, origin_lng, lines }});
    renderPlanResult(res);
  }catch(e){ alert("วิเคราะห์แผนไม่ได้: " + e.message); }
}

function renderPlanResult(plan){
  const s = $("#plan_summary");
  s.innerHTML = `
    <div class="metric"><div class="k">รวมระยะทาง</div><div class="v">${(plan.totalKm||0).toFixed(2)} km</div></div>
    <div class="metric"><div class="k">รวมต้นทุน</div><div class="v">${(plan.totalCost||0).toFixed(2)}</div></div>
    <div class="metric"><div class="k">รวมตัน</div><div class="v">${(plan.totalW||0).toFixed(2)}</div></div>
    <div class="metric"><div class="k">รวมลบ.ม.</div><div class="v">${(plan.totalV||0).toFixed(2)}</div></div>`;

  const box = $("#routes_container"); box.innerHTML = "";
  (plan.routes||[]).forEach((r, i)=>{
    const orders = (r.orders||[]).map(o=>`${o.code} (${o.w||0}/${o.v||0})`).join(" → ");
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="font-semibold">คันที่ ${i+1} • ${r.vehicle?.plate||"-"}</div>
      <div class="text-sm text-gray-600">ระยะทาง ${(r.distanceKm||0).toFixed(2)} km • ต้นทุน ${(r.cost||0).toFixed(2)}</div>
      <div class="mt-1">${orders||"-"}</div>`;
    box.appendChild(div);
  });

  drawMap(plan);
}

// ---------- Map ----------
let _map, _layer;
function ensureMap(){
  if (!_map){
    _map = L.map("map").setView([13.7563, 100.5018], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:18 }).addTo(_map);
    _layer = L.layerGroup().addTo(_map);
  }else{ _layer.clearLayers(); }
}

function drawMap(plan){
  ensureMap();
  const origin = [plan.origin_lat, plan.origin_lng];
  const bounds = [];
  L.marker(origin).addTo(_layer).bindPopup("Origin");
  bounds.push(origin);

  (plan.routes||[]).forEach((r, idx)=>{
    const pts = [origin].concat((r.orders||[]).map(o=>[o.lat,o.lng])).concat([origin]);
    bounds.push(...pts);
    L.polyline(pts, { weight:4 }).addTo(_layer).bindPopup(`Route ${idx+1}`);
    pts.slice(1,-1).forEach((p,i)=> L.circleMarker(p,{radius:5}).addTo(_layer).bindTooltip(r.orders[i].code));
  });

  if (bounds.length) _map.fitBounds(bounds);
}

// ---------- Export ----------
function exportRaw(kind){
  const a = document.createElement("a");
  a.href = `${window.API_BASE}/${kind}`; a.target = "_blank"; a.click();
}

function exportPlanExcel(){
  try{
    const wb = XLSX.utils.book_new();
    const rows = [];
    $$("#routes_container > .card").forEach((div, i)=>{
      const t = div.querySelector(".font-semibold")?.textContent || `Route ${i+1}`;
      const info = div.querySelector(".text-sm")?.textContent || "";
      const seq = div.querySelector(".mt-1")?.textContent || "";
      rows.push([t, info, seq]);
    });
    const ws = XLSX.utils.aoa_to_sheet([["Route","Info","Sequence"], ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Routes");
    const out = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    saveAs(new Blob([out]), "plan.xlsx");
  }catch(e){ alert("Export Excel ไม่สำเร็จ: " + e.message); }
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", ()=>{
  if (TOKEN) setStatus("พบ token แล้ว พร้อมใช้งาน");
  loadCustomers().catch(()=>{});
  loadVehicles().catch(()=>{});
  if (!$("#plan_lines").children.length) addPlanRow();
});

// expose globals for HTML onclick
window.openTab = openTab;
window.register = register;
window.login = login;
window.loadCustomers = loadCustomers;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.seedCustomers = seedCustomers;
window.loadVehicles = loadVehicles;
window.saveVehicle = saveVehicle;
window.deleteVehicle = deleteVehicle;
window.seedVehicles = seedVehicles;
window.addPlanRow = addPlanRow;
window.analyzePlan = analyzePlan;
window.exportPlanExcel = exportPlanExcel;
window.exportRaw = exportRaw;

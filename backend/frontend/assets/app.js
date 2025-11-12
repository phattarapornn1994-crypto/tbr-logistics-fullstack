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
  // ตัวอย่างร้านขายของเก่า (ลูกค้า) กระจายทั่วประเทศไทย
  const samples = [
    { code:"SHOP001", name:"ร้านของเก่าบางกอก", type:"ร้านขายของเก่า", contact:"02-123-4567", addr:"กรุงเทพมหานคร", lat:13.7563, lng:100.5018, hours:"08:00-18:00", note:"รับซื้อแก้ว, โลหะ" },
    { code:"SHOP002", name:"ร้านรีไซเคิลนนทบุรี", type:"ร้านขายของเก่า", contact:"02-234-5678", addr:"นนทบุรี", lat:13.8621, lng:100.5144, hours:"09:00-17:00", note:"รับซื้อพลาสติก, กระดาษ" },
    { code:"SHOP003", name:"ร้านของเก่าปทุมธานี", type:"ร้านขายของเก่า", contact:"02-345-6789", addr:"ปทุมธานี", lat:13.9529, lng:100.4998, hours:"08:30-17:30", note:"รับซื้อแก้ว, โลหะ, พลาสติก" },
    { code:"SHOP004", name:"ร้านรีไซเคิลสมุทรปราการ", type:"ร้านขายของเก่า", contact:"02-456-7890", addr:"สมุทรปราการ", lat:13.5998, lng:100.5970, hours:"08:00-18:00", note:"รับซื้อทุกประเภท" },
    { code:"SHOP005", name:"ร้านของเก่านครปฐม", type:"ร้านขายของเก่า", contact:"034-123-456", addr:"นครปฐม", lat:13.8199, lng:100.0623, hours:"09:00-17:00", note:"รับซื้อแก้ว, โลหะ" },
    { code:"SHOP006", name:"ร้านรีไซเคิลราชบุรี", type:"ร้านขายของเก่า", contact:"032-234-567", addr:"ราชบุรี", lat:13.5360, lng:99.8131, hours:"08:00-18:00", note:"รับซื้อพลาสติก, กระดาษ" },
    { code:"SHOP007", name:"ร้านของเก่าชลบุรี", type:"ร้านขายของเก่า", contact:"038-345-678", addr:"ชลบุรี", lat:13.3611, lng:100.9847, hours:"08:30-17:30", note:"รับซื้อทุกประเภท" },
    { code:"SHOP008", name:"ร้านรีไซเคิลอยุธยา", type:"ร้านขายของเก่า", contact:"035-456-789", addr:"พระนครศรีอยุธยา", lat:14.3533, lng:100.5774, hours:"09:00-17:00", note:"รับซื้อแก้ว, โลหะ" },
    { code:"SHOP009", name:"ร้านของเก่าสระบุรี", type:"ร้านขายของเก่า", contact:"036-567-890", addr:"สระบุรี", lat:14.5289, lng:100.9101, hours:"08:00-18:00", note:"รับซื้อพลาสติก, กระดาษ" },
    { code:"SHOP010", name:"ร้านรีไซเคิลนครสวรรค์", type:"ร้านขายของเก่า", contact:"056-678-901", addr:"นครสวรรค์", lat:15.7047, lng:100.1373, hours:"08:30-17:30", note:"รับซื้อทุกประเภท" },
    { code:"SHOP011", name:"ร้านของเก่าเชียงใหม่", type:"ร้านขายของเก่า", contact:"053-789-012", addr:"เชียงใหม่", lat:18.7883, lng:98.9853, hours:"09:00-17:00", note:"รับซื้อแก้ว, โลหะ" },
    { code:"SHOP012", name:"ร้านรีไซเคิลขอนแก่น", type:"ร้านขายของเก่า", contact:"043-890-123", addr:"ขอนแก่น", lat:16.4423, lng:102.8357, hours:"08:00-18:00", note:"รับซื้อพลาสติก, กระดาษ" },
    { code:"SHOP013", name:"ร้านของเก่าโคราช", type:"ร้านขายของเก่า", contact:"044-901-234", addr:"นครราชสีมา", lat:14.9707, lng:102.1020, hours:"08:30-17:30", note:"รับซื้อทุกประเภท" },
    { code:"SHOP014", name:"ร้านรีไซเคิลอุบลราชธานี", type:"ร้านขายของเก่า", contact:"045-012-345", addr:"อุบลราชธานี", lat:15.2287, lng:104.8563, hours:"09:00-17:00", note:"รับซื้อแก้ว, โลหะ" },
    { code:"SHOP015", name:"ร้านของเก่าภูเก็ต", type:"ร้านขายของเก่า", contact:"076-123-456", addr:"ภูเก็ต", lat:7.8804, lng:98.3923, hours:"08:00-18:00", note:"รับซื้อพลาสติก, กระดาษ" },
  ];
  for (const s of samples){
    await api("/customers", { method:"POST", json:s, auth:true }).catch(()=>{});
  }
  await loadCustomers();
  alert(`เพิ่มตัวอย่างร้านขายของเก่า ${samples.length} ร้านแล้ว`);
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
let _customersList = [];

async function loadCustomersForPlan(){
  try {
    _customersList = await api("/customers");
    updatePlanCustomerOptions();
  } catch(e) {
    console.error("Failed to load customers:", e);
  }
}

function updatePlanCustomerOptions(){
  const selects = $$("#plan_lines select.customer-select");
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    _customersList.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = `${c.code} - ${c.name || ''} (${c.type || ''})`;
      if (c.code === currentValue) opt.selected = true;
      select.appendChild(opt);
    });
  });
}

function addPlanRow(){
  const tb = $("#plan_lines");
  const tr = document.createElement("tr");
  const selectId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  tr.innerHTML = `
    <td>
      <select id="${selectId}" class="input customer-select" onchange="updateCustomerInfo(this)">
        <option value="">-- เลือกลูกค้า --</option>
      </select>
    </td>
    <td><input class="input" type="number" step="0.01" placeholder="ตัน" min="0"/></td>
    <td><input class="input" type="number" step="0.01" placeholder="ลบ.ม." min="0"/></td>
    <td><input class="input" placeholder="ประเภทสินค้า"/></td>
    <td><button class="btn" onclick="this.closest('tr').remove()">ลบ</button></td>`;
  tb.appendChild(tr);
  
  // เติมข้อมูลลูกค้าใน select
  const select = $(`#${selectId}`);
  _customersList.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = `${c.code} - ${c.name || ''} (${c.type || ''})`;
    select.appendChild(opt);
  });
}

function updateCustomerInfo(select){
  const code = select.value;
  const customer = _customersList.find(c => c.code === code);
  if (customer) {
    // สามารถแสดงข้อมูลเพิ่มเติมได้ที่นี่
    console.log("Selected customer:", customer);
  }
}

async function analyzePlan(){
  try{
    const name = $("#plan_name").value.trim() || "Plan";
    const date = $("#plan_date").value || new Date().toISOString().slice(0,10);
    
    // ใช้พิกัดจาก input ที่อ่านได้ หรือจาก dropdown
    const origin_lat = parseFloat($("#plan_origin_lat").value || "0");
    const origin_lng = parseFloat($("#plan_origin_lng").value || "0");

    const lines = [];
    $$("#plan_lines tr").forEach(tr=>{
      const tds = tr.querySelectorAll("td");
      const codeInput = tds[0].querySelector("input, select");
      const code = codeInput ? (codeInput.value || codeInput.textContent || "").trim() : "";
      const w = parseFloat(tds[1].querySelector("input").value || "0");
      const v = parseFloat(tds[2].querySelector("input").value || "0");
      const mat = tds[3].querySelector("input").value.trim();
      if (code) lines.push({ customer_code: code, w, v, mat });
    });

    if (Number.isNaN(origin_lat) || Number.isNaN(origin_lng) || origin_lat === 0 || origin_lng === 0)
      return alert("กรุณาเลือกลาน TBR Master หรือกรอกพิกัด Origin");
    if (!lines.length) return alert("เพิ่มรายการลูกค้าอย่างน้อย 1 แถว");

    const res = await api("/plans/optimize", { method:"POST", json:{ name, date, origin_lat, origin_lng, lines }});
    renderPlanResult(res);
    openTab('result');
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
let _map, _layer, _currentLayer = 'osm', _baseLayers = {};

function ensureMap(){
  if (!_map){
    _map = L.map("map").setView([13.7563, 100.5018], 6);
    
    // สร้าง base layers หลายแบบ
    _baseLayers.osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    });
    
    _baseLayers.satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: '© Esri'
    });
    
    _baseLayers.terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: '© OpenTopoMap'
    });
    
    _baseLayers.osm.addTo(_map);
    _layer = L.layerGroup().addTo(_map);
    
    // เพิ่ม layer control
    L.control.layers(_baseLayers).addTo(_map);
  }else{ _layer.clearLayers(); }
}

function switchMapLayer(type){
  if (!_map) return;
  _currentLayer = type;
  _map.eachLayer(layer => {
    if (layer instanceof L.TileLayer && layer !== _layer) {
      _map.removeLayer(layer);
    }
  });
  if (_baseLayers[type]) {
    _baseLayers[type].addTo(_map);
  }
}

function drawMap(plan){
  ensureMap();
  const origin = [plan.origin_lat, plan.origin_lng];
  const bounds = [origin];
  
  // จุดเริ่มต้น (ลาน) - สีน้ำเงิน
  const originIcon = L.divIcon({
    className: 'custom-origin-icon',
    html: '<div style="background: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  L.marker(origin, { icon: originIcon }).addTo(_layer)
    .bindPopup(`<b>📍 จุดเริ่มต้น (ลาน)</b><br>${plan.name || 'Origin'}<br>${plan.origin_lat.toFixed(4)}, ${plan.origin_lng.toFixed(4)}`);

  // สีสำหรับแต่ละเส้นทาง
  const routeColors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  (plan.routes||[]).forEach((r, idx)=>{
    const color = routeColors[idx % routeColors.length];
    const orders = r.orders || [];
    const pts = [origin].concat(orders.map(o=>[o.lat,o.lng])).concat([origin]);
    bounds.push(...pts);
    
    // วาดเส้นทาง
    L.polyline(pts, {
      weight: 5,
      color: color,
      opacity: 0.8,
      dashArray: idx % 2 === 0 ? null : '10, 5'
    }).addTo(_layer).bindPopup(`
      <b>🚚 เส้นทาง ${idx+1}</b><br>
      รถ: ${r.vehicle?.plate || '-'}<br>
      ระยะทาง: ${(r.distanceKm||0).toFixed(2)} km<br>
      ต้นทุน: ${(r.cost||0).toFixed(2)} บาท<br>
      จำนวนจุด: ${orders.length} จุด
    `);
    
    // วาดจุดลูกค้า - สีเขียว
    orders.forEach((o, i) => {
      const customerIcon = L.divIcon({
        className: 'custom-customer-icon',
        html: `<div style="background: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${i+1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([o.lat, o.lng], { icon: customerIcon }).addTo(_layer)
        .bindPopup(`
          <b>🟢 ลูกค้า ${i+1}</b><br>
          รหัส: ${o.code}<br>
          ชื่อ: ${o.name || '-'}<br>
          น้ำหนัก: ${(o.w||0).toFixed(2)} ตัน<br>
          ปริมาตร: ${(o.v||0).toFixed(2)} ลบ.ม.<br>
          สินค้า: ${o.mat || '-'}
        `)
        .bindTooltip(`${o.code} (${i+1})`, { permanent: false });
    });
  });

  if (bounds.length) {
    _map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// ---------- Yard Selection ----------
function selectYardOrigin(){
  const select = $("#plan_origin_yard");
  const value = select.value;
  if (!value) {
    $("#plan_origin_lat").value = "";
    $("#plan_origin_lng").value = "";
    return;
  }
  const [lat, lng] = value.split(",").map(parseFloat);
  if (!isNaN(lat) && !isNaN(lng)) {
    $("#plan_origin_lat").value = lat;
    $("#plan_origin_lng").value = lng;
  }
}

function loadYardOptions(){
  const select = $("#plan_origin_yard");
  if (!select || !window.TBR_MASTERS) return;
  
  // จัดกลุ่มตามภาค
  const byRegion = {};
  window.TBR_MASTERS.YARDS_MASTER.forEach(yard => {
    if (!byRegion[yard.region]) byRegion[yard.region] = [];
    byRegion[yard.region].push(yard);
  });
  
  // เพิ่ม options
  Object.keys(byRegion).sort().forEach(region => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = region;
    byRegion[region].forEach(yard => {
      const opt = document.createElement("option");
      opt.value = `${yard.lat},${yard.lng}`;
      opt.textContent = `${yard.name} (${yard.address})`;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
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
  loadCustomersForPlan().catch(()=>{});
  loadVehicles().catch(()=>{});
  loadYardOptions();
  if (!$("#plan_lines").children.length) addPlanRow();
  
  // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
  const today = new Date().toISOString().slice(0,10);
  const dateInput = $("#plan_date");
  if (dateInput) dateInput.value = today;
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
window.selectYardOrigin = selectYardOrigin;
window.switchMapLayer = switchMapLayer;
window.updateCustomerInfo = updateCustomerInfo;

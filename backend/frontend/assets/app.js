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
    { plate:"18W-001", type:"18W", capW:25, capV:60, owner:"OWN", costPerKm:35, status:"ready" },
  ];
  for (const s of samples){
    await api("/vehicles", { method:"POST", json:s, auth:true }).catch(()=>{});
  }
  await loadVehicles();
  alert(`เพิ่มตัวอย่างรถ ${samples.length} คันแล้ว`);
}

async function loadTestData(){
  try {
    // ใช้ข้อมูลตัวอย่างจาก seed customers และ vehicles
    await seedCustomers();
    await seedVehicles();
    await loadCustomers();
    await loadCustomersForPlan();
    
    // สร้างข้อมูลตัวอย่างแผน
    const sampleCustomers = _customersList.slice(0, 5); // ใช้ 5 ลูกค้าแรก
    
    // ล้างตารางเดิม
    $("#plan_lines").innerHTML = "";
    
    // เติมข้อมูลแผน
    $("#plan_name").value = "แผนส่งบรรจุภัณฑ์รีไซเคิล ตัวอย่าง";
    $("#plan_date").value = new Date().toISOString().slice(0, 10);
    $("#plan_type").value = "daily";
    
    // ใช้ลานแรกจาก TBR_MASTERS
    if (window.TBR_MASTERS && window.TBR_MASTERS.YARDS_MASTER && window.TBR_MASTERS.YARDS_MASTER.length > 0) {
      const firstYard = window.TBR_MASTERS.YARDS_MASTER[0];
      $("#plan_origin_lat").value = firstYard.lat;
      $("#plan_origin_lng").value = firstYard.lng;
      $("#plan_origin_yard").value = `${firstYard.lat},${firstYard.lng}`;
    } else {
      // ใช้พิกัดกรุงเทพ
      $("#plan_origin_lat").value = 13.7563;
      $("#plan_origin_lng").value = 100.5018;
    }
    
    // เพิ่มข้อมูลลูกค้า
    sampleCustomers.forEach((cust, idx) => {
      addPlanRow();
      const rows = $$("#plan_lines tr");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const tds = lastRow.querySelectorAll("td");
        const select = tds[0].querySelector("select");
        if (select) {
          select.value = cust.code;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          select.dispatchEvent(event);
        }
        // เติมข้อมูลน้ำหนักและปริมาตรแบบสุ่ม
        if (tds[1]) tds[1].querySelector("input").value = (Math.random() * 3 + 1).toFixed(2);
        if (tds[2]) tds[2].querySelector("input").value = (Math.random() * 8 + 3).toFixed(2);
        if (tds[3]) tds[3].querySelector("input").value = "บรรจุภัณฑ์รีไซเคิล";
      }
    });
    
    alert(`โหลดข้อมูลตัวอย่างสำเร็จ: ${sampleCustomers.length} รายการ`);
  } catch(e) {
    console.error("Failed to load test data:", e);
    alert("ไม่สามารถโหลดข้อมูลตัวอย่างได้: " + e.message);
  }
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
    const plan_type = $("#plan_type").value || "daily";
    const maxVehicles = parseInt($("#max_vehicles").value || "0");
    
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

    const payload = {
      name, date, origin_lat, origin_lng, lines,
      plan_type,
      max_vehicles: maxVehicles > 0 ? maxVehicles : null,
      consider_traffic: $("#consider_traffic").checked,
      consider_highway: $("#consider_highway").checked,
      consider_flood: $("#consider_flood").checked,
      consider_breakdown: $("#consider_breakdown").checked,
      consider_hills: $("#consider_hills").checked
    };

    const res = await api("/plans/optimize", { method:"POST", json: payload });
    await renderPlanResult(res);
    openTab('result');
  }catch(e){ 
    console.error("Plan analysis error:", e);
    alert("ไม่สามารถวิเคราะห์แผนได้ กรุณาตรวจสอบข้อมูล");
  }
}

function haversine(lat1, lon1, lat2, lon2){
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function renderPlanResult(plan){
  // เก็บข้อมูลแผนไว้สำหรับรายงาน
  _currentPlanResult = plan;
  
  const s = $("#plan_summary");
  
  // คำนวณสถิติเพิ่มเติม
  const totalRoutes = (plan.routes || []).length;
  const avgDistancePerRoute = totalRoutes > 0 ? (plan.totalKm / totalRoutes) : 0;
  const avgCostPerRoute = totalRoutes > 0 ? (plan.totalCost / totalRoutes) : 0;
  const avgCostPerKm = plan.totalKm > 0 ? (plan.totalCost / plan.totalKm) : 0;
  const totalUtilization = (plan.routes || []).reduce((sum, r) => {
    const vehicle = r.vehicle || {};
    const orders = r.orders || [];
    const totalW = orders.reduce((s, o) => s + (o.w || 0), 0);
    const totalV = orders.reduce((s, o) => s + (o.v || 0), 0);
    const wUtil = vehicle.capW > 0 ? (totalW / vehicle.capW * 100) : 0;
    const vUtil = vehicle.capV > 0 ? (totalV / vehicle.capV * 100) : 0;
    return sum + ((wUtil + vUtil) / 2);
  }, 0) / totalRoutes;
  
  s.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div class="metric">
        <div class="k">จำนวนเส้นทาง</div>
        <div class="v">${totalRoutes} เส้นทาง</div>
      </div>
      <div class="metric">
        <div class="k">รวมระยะทาง</div>
        <div class="v">${(plan.totalKm||0).toFixed(2)} km</div>
      </div>
      <div class="metric">
        <div class="k">รวมต้นทุน</div>
        <div class="v">${(plan.totalCost||0).toFixed(2)} บาท</div>
      </div>
      <div class="metric">
        <div class="k">ต้นทุน/กม.</div>
        <div class="v">${avgCostPerKm.toFixed(2)} บาท</div>
      </div>
      <div class="metric">
        <div class="k">รวมน้ำหนัก</div>
        <div class="v">${(plan.totalW||0).toFixed(2)} ตัน</div>
      </div>
      <div class="metric">
        <div class="k">รวมปริมาตร</div>
        <div class="v">${(plan.totalV||0).toFixed(2)} ลบ.ม.</div>
      </div>
      <div class="metric">
        <div class="k">Utilization เฉลี่ย</div>
        <div class="v">${totalUtilization.toFixed(1)}%</div>
      </div>
      <div class="metric">
        <div class="k">ระยะทางเฉลี่ย</div>
        <div class="v">${avgDistancePerRoute.toFixed(2)} km</div>
      </div>
    </div>`;
  
  // แสดงคำแนะนำจำนวนรถ
  const vehicleRecDiv = $("#vehicle_recommendation");
  if (vehicleRecDiv && plan.recommended_vehicles && plan.actual_vehicles) {
    if (plan.actual_vehicles !== plan.recommended_vehicles) {
      vehicleRecDiv.className = "mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs";
      vehicleRecDiv.innerHTML = `
        <strong>💡 คำแนะนำ:</strong> ระบบแนะนำใช้ ${plan.recommended_vehicles} คัน 
        แต่ปัจจุบันใช้ ${plan.actual_vehicles} คัน 
        ${plan.actual_vehicles > plan.recommended_vehicles ? '(ใช้มากเกินไป)' : '(อาจใช้รถน้อยเกินไป)'}
      `;
    } else {
      vehicleRecDiv.className = "mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs";
      vehicleRecDiv.innerHTML = `
        <strong>✅ เหมาะสม:</strong> ใช้ ${plan.actual_vehicles} คัน ตามที่ระบบแนะนำ
      `;
    }
    vehicleRecDiv.classList.remove("hidden");
  }

  const box = $("#routes_container"); box.innerHTML = "";
  const analysisBox = $("#route_analysis"); analysisBox.innerHTML = "";
  const alertBox = $("#double_handling_alert");
  let hasDoubleHandling = false;
  let totalEmptyReturnKm = 0;

  for (let i = 0; i < (plan.routes || []).length; i++) {
    const r = plan.routes[i];
    const orders = r.orders || [];
    const vehicle = r.vehicle || {};
    
    // ตรวจสอบ double handling (รถกลับเปล่า)
    const lastOrder = orders[orders.length - 1];
    let emptyReturnKm = 0;
    if (lastOrder) {
      emptyReturnKm = haversine(lastOrder.lat, lastOrder.lng, plan.origin_lat, plan.origin_lng);
      if (emptyReturnKm > 0.1) { // ถ้ากลับมากกว่า 100 เมตร
        hasDoubleHandling = true;
        totalEmptyReturnKm += emptyReturnKm;
      }
    }

    // สรุปเส้นทาง (จัดรูปแบบใหม่)
    const routeDiv = document.createElement("div");
    routeDiv.className = "p-3 border border-gray-200 rounded-lg bg-white";
    routeDiv.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="font-semibold text-sm">🚚 เส้นทาง ${i+1}: ${vehicle.plate||"-"} (${vehicle.type||"-"})</div>
        <div class="text-xs text-gray-500">${orders.length} จุด</div>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div><span class="text-gray-600">ระยะทาง:</span> <span class="font-semibold">${(r.distanceKm||0).toFixed(2)} km</span></div>
        <div><span class="text-gray-600">ต้นทุน:</span> <span class="font-semibold">${(r.cost||0).toFixed(2)} บาท</span></div>
        <div><span class="text-gray-600">เวลา:</span> <span class="font-semibold">${((r.distanceKm||0)/60).toFixed(1)} ชม.</span></div>
      </div>
      <div class="text-xs text-gray-700 bg-gray-50 p-2 rounded">
        <strong>ลำดับ:</strong> ${orders.map((o, idx) => `${idx+1}.${o.code}`).join(" → ")}
      </div>
      ${emptyReturnKm > 0.1 && emptyReturnKm > 5 ? `<div class="mt-2 text-xs text-orange-600 bg-orange-50 p-1 rounded">⚠️ กลับเปล่า ${emptyReturnKm.toFixed(2)} km</div>` : ''}`;
    box.appendChild(routeDiv);

    // การวิเคราะห์เส้นทางแบบเจาะลึก
    const analysisDiv = document.createElement("div");
    analysisDiv.className = "route-detail";
    analysisDiv.innerHTML = `<div class="font-semibold text-sm mb-2">📊 เส้นทางที่ ${i+1} - ${vehicle.plate||"-"}</div>`;
    
    const stepsDiv = document.createElement("div");
    let totalW = 0, totalV = 0;
    let prevLat = plan.origin_lat, prevLng = plan.origin_lng;
    let cumulativeKm = 0;
    const avgSpeed = 60; // km/h

    // จุดเริ่มต้น
    const startStep = document.createElement("div");
    startStep.className = "route-step";
    startStep.innerHTML = `
      <div class="route-step-number">0</div>
      <div class="flex-1">
        <div class="font-semibold">📍 จุดเริ่มต้น (ลาน)</div>
        <div class="text-sm text-gray-600">${plan.origin_lat.toFixed(4)}, ${plan.origin_lng.toFixed(4)}</div>
      </div>
      <div class="text-sm text-gray-500">เริ่มต้น</div>
    `;
    stepsDiv.appendChild(startStep);

    // แต่ละจุดส่งของ
    orders.forEach((order, idx) => {
      const stepKm = haversine(prevLat, prevLng, order.lat, order.lng);
      cumulativeKm += stepKm;
      const estTime = (stepKm / avgSpeed * 60).toFixed(0); // นาที
      totalW += (order.w || 0);
      totalV += (order.v || 0);

      const stepDiv = document.createElement("div");
      stepDiv.className = "route-step";
      stepDiv.innerHTML = `
        <div class="route-step-number">${idx + 1}</div>
        <div class="flex-1">
          <div class="font-semibold">${order.code} - ${order.name || ''}</div>
          <div class="text-sm text-gray-600">${order.lat.toFixed(4)}, ${order.lng.toFixed(4)}</div>
          <div class="text-xs text-gray-500 mt-1">
            น้ำหนัก: ${(order.w||0).toFixed(2)} ตัน | ปริมาตร: ${(order.v||0).toFixed(2)} ลบ.ม. | สินค้า: ${order.mat || '-'}
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm font-semibold text-green-600">${stepKm.toFixed(2)} km</div>
          <div class="text-xs text-gray-500">~${estTime} นาที</div>
          <div class="text-xs text-gray-400">รวม ${cumulativeKm.toFixed(2)} km</div>
        </div>
      `;
      stepsDiv.appendChild(stepDiv);

      prevLat = order.lat;
      prevLng = order.lng;
    });

    // จุดกลับ (ถ้ามี)
    if (orders.length > 0) {
      const returnKm = haversine(prevLat, prevLng, plan.origin_lat, plan.origin_lng);
      const returnTime = (returnKm / avgSpeed * 60).toFixed(0);
      const returnStep = document.createElement("div");
      returnStep.className = "route-step";
      returnStep.innerHTML = `
        <div class="route-step-number">↩</div>
        <div class="flex-1">
          <div class="font-semibold">📍 กลับลาน (${returnKm > 0.1 ? 'รถเปล่า' : 'ใกล้ลาน'})</div>
          <div class="text-sm text-gray-600">${plan.origin_lat.toFixed(4)}, ${plan.origin_lng.toFixed(4)}</div>
        </div>
        <div class="text-right">
          <div class="text-sm font-semibold ${returnKm > 0.1 ? 'text-orange-600' : 'text-green-600'}">${returnKm.toFixed(2)} km</div>
          <div class="text-xs text-gray-500">~${returnTime} นาที</div>
          ${returnKm > 0.1 ? '<div class="text-xs text-orange-600 font-semibold">⚠️ Double Handling</div>' : ''}
        </div>
      `;
      stepsDiv.appendChild(returnStep);
    }

    // คำนวณ Utilization และ Efficiency
    const wUtil = vehicle.capW > 0 ? (totalW / vehicle.capW * 100) : 0;
    const vUtil = vehicle.capV > 0 ? (totalV / vehicle.capV * 100) : 0;
    const avgUtil = (wUtil + vUtil) / 2;
    const costPerTon = totalW > 0 ? (r.cost / totalW) : 0;
    const costPerKm = r.distanceKm > 0 ? (r.cost / r.distanceKm) : 0;
    const efficiency = r.distanceKm > 0 && orders.length > 0 ? (orders.length / r.distanceKm * 100) : 0;
    
    // Optimize Layout
    const layoutProducts = orders.map(o => ({
      type: o.mat || 'บรรจุภัณฑ์รีไซเคิล',
      length: Math.cbrt(o.v || 1) * 1.2,
      width: Math.cbrt(o.v || 1) * 1.0,
      height: Math.cbrt(o.v || 1) * 0.8,
      weight: o.w || 0,
      stackable: true
    }));
    
    let layoutResult = null;
    try {
      layoutResult = await api("/api/routing/layout-optimize", {
        method: "POST",
        json: {
          vehicle_plate: vehicle.plate,
          products: layoutProducts
        }
      });
    } catch(e) {
      // ไม่แสดง error
    }

    // สรุปเส้นทางพร้อมการวิเคราะห์
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200";
    summaryDiv.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
        <div><span class="font-semibold">ระยะทาง:</span> ${(r.distanceKm||0).toFixed(2)} km</div>
        <div><span class="font-semibold">น้ำหนัก:</span> ${totalW.toFixed(2)} ตัน</div>
        <div><span class="font-semibold">ปริมาตร:</span> ${totalV.toFixed(2)} ลบ.ม.</div>
        <div><span class="font-semibold">ต้นทุน:</span> ${(r.cost||0).toFixed(2)} บาท</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3 pt-3 border-t border-gray-200">
        <div>
          <span class="font-semibold">Utilization:</span> 
          <span class="${avgUtil >= 80 ? 'text-green-600' : avgUtil >= 60 ? 'text-yellow-600' : 'text-red-600'}">${avgUtil.toFixed(1)}%</span>
          <div class="text-xs text-gray-500">น้ำหนัก: ${wUtil.toFixed(1)}% | ปริมาตร: ${vUtil.toFixed(1)}%</div>
        </div>
        <div>
          <span class="font-semibold">ต้นทุน/ตัน:</span> <span class="text-blue-600">${costPerTon.toFixed(2)} บาท</span>
        </div>
        <div>
          <span class="font-semibold">ต้นทุน/กม.:</span> <span class="text-blue-600">${costPerKm.toFixed(2)} บาท</span>
        </div>
        <div>
          <span class="font-semibold">Efficiency:</span> ${efficiency.toFixed(2)} จุด/100km
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-gray-200">
        <div class="text-xs font-semibold mb-2">💰 วิเคราะห์ต้นทุนขนส่ง</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div class="bg-blue-50 p-2 rounded">
            <div class="text-gray-600">ต้นทุนฐาน (ระยะทาง)</div>
            <div class="font-semibold text-blue-700">${(r.distanceKm * (vehicle.costPerKm || 20)).toFixed(2)} บาท</div>
          </div>
          <div class="bg-green-50 p-2 rounded">
            <div class="text-gray-600">ต้นทุนรวม (รวมปัจจัย)</div>
            <div class="font-semibold text-green-700">${(r.cost||0).toFixed(2)} บาท</div>
          </div>
          <div class="bg-orange-50 p-2 rounded">
            <div class="text-gray-600">ส่วนต่าง</div>
            <div class="font-semibold ${((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))) > 0 ? 'text-red-600' : 'text-green-600'}">${((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))) > 0 ? '+' : ''}${((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))).toFixed(2)} บาท</div>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-600">
          <strong>รายละเอียดต้นทุน:</strong> ต้นทุนฐาน ${(r.distanceKm * (vehicle.costPerKm || 20)).toFixed(2)} บาท 
          ${((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))) > 0 ? 
            `+ ปัจจัยเพิ่มเติม ${((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))).toFixed(2)} บาท` : 
            `(ประหยัด ${Math.abs((r.cost||0) - (r.distanceKm * (vehicle.costPerKm || 20))).toFixed(2)} บาท)`}
        </div>
      </div>
      ${layoutResult ? `
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="text-xs font-semibold mb-2">📦 การจัดวางสินค้า (Layout Optimization)</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div>Utilization: <span class="${layoutResult.utilization_percent >= 80 ? 'text-green-600' : 'text-yellow-600'}">${layoutResult.utilization_percent.toFixed(1)}%</span></div>
            <div>น้ำหนักใช้: ${layoutResult.total_weight_used.toFixed(2)}/${vehicle.capW} ตัน</div>
            <div>ปริมาตรใช้: ${layoutResult.total_volume_used.toFixed(2)}/${vehicle.capV} ลบ.ม.</div>
          </div>
          ${layoutResult.warnings && layoutResult.warnings.length > 0 ? `
            <div class="mt-2 text-xs text-orange-600">⚠️ ${layoutResult.warnings.length} คำเตือน</div>
          ` : ''}
        </div>
      ` : ''}
      <div class="mt-2 text-xs text-gray-500">
        เวลาเดินทาง: ${((r.distanceKm||0) / avgSpeed).toFixed(1)} ชม.
        ${emptyReturnKm > 0.1 ? ` | ⚠️ กลับเปล่า: ${emptyReturnKm.toFixed(2)} km` : ''}
      </div>
    `;
    stepsDiv.appendChild(summaryDiv);
    analysisDiv.appendChild(stepsDiv);
    analysisBox.appendChild(analysisDiv);
  }

  // แสดงการแจ้งเตือน Double Handling (แบบกระชับ)
  if (hasDoubleHandling && totalEmptyReturnKm > 5) {
    alertBox.className = "alert-warning";
    alertBox.innerHTML = `
      <div class="flex items-center gap-2 text-xs">
        <span>⚠️</span>
        <div>
          <span class="font-semibold">Double Handling:</span> ระยะกลับเปล่า ${totalEmptyReturnKm.toFixed(2)} km
        </div>
      </div>
    `;
  } else {
    alertBox.className = "hidden";
  }

  // วาดแผนที่
  drawMap(plan);
  
  // วาด Longdo Map ถ้าเลือกใช้
  if (_currentLayer === 'longdo' || !_map) {
    await drawLongdoMap(plan);
  }
  
  // สร้างรายงานอัตโนมัติ
  generateDetailedReport();
}

// ---------- Map ----------
let _map, _layer, _currentLayer = 'osm', _baseLayers = {};
let _longdoMap = null;
let _isochroneLayer = null;

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
  _currentLayer = type;
  
  if (type === 'longdo') {
    // สลับไปใช้ Longdo Map
    if (_map) {
      _map.remove();
      _map = null;
    }
    
    if (!_longdoMap && typeof longdo !== 'undefined') {
      const mapDiv = document.getElementById('map');
      mapDiv.innerHTML = ''; // Clear Leaflet map
      _longdoMap = new longdo.Map({
        placeholder: mapDiv,
        zoom: 10,
        lastView: false
      });
      
      _longdoMap.Event.bind("ready", function() {
        // เพิ่ม Traffic Layer
        if (window.longdo && window.longdo.Layers) {
          _longdoMap.Layers.insert(1, window.longdo.Layers.TRAFFIC);
        }
      });
      
      // วาดแผนที่ใหม่ถ้ามีข้อมูล
      if (_currentPlanResult) {
        drawLongdoMap(_currentPlanResult);
      }
    }
    return;
  }
  
  // กลับมาใช้ Leaflet
  if (_longdoMap) {
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = '';
    _longdoMap = null;
  }
  
  ensureMap();
  
  if (!_map) return;
  _map.eachLayer(layer => {
    if (layer instanceof L.TileLayer && layer !== _layer) {
      _map.removeLayer(layer);
    }
  });
  if (_baseLayers[type]) {
    _baseLayers[type].addTo(_map);
  }
  
  // วาดแผนที่ใหม่ถ้ามีข้อมูล
  if (_currentPlanResult) {
    drawMap(_currentPlanResult);
  }
}

function drawMap(plan){
  ensureMap();
  if (!_map || !plan) return;
  
  _layer.clearLayers();
  
  // จุดเริ่มต้น
  const originIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  
  const originMarker = L.marker([plan.origin_lat, plan.origin_lng], { icon: originIcon })
    .addTo(_layer)
    .bindPopup(`<strong>📍 จุดเริ่มต้น (ลาน)</strong><br>${plan.name || 'Origin'}`);
  
  // วาดเส้นทางและลูกค้า
  const routeColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const bounds = [[plan.origin_lat, plan.origin_lng]];
  
  (plan.routes || []).forEach((r, idx) => {
    const color = routeColors[idx % routeColors.length];
    const orders = r.orders || [];
    
    // สร้างเส้นทาง
    const routePoints = [
      [plan.origin_lat, plan.origin_lng],
      ...orders.map(o => [o.lat, o.lng]),
      [plan.origin_lat, plan.origin_lng]
    ];
    
    const polyline = L.polyline(routePoints, {
      color: color,
      weight: 4,
      opacity: 0.7
    }).addTo(_layer);
    
    // เพิ่ม markers สำหรับลูกค้า
    orders.forEach((o, oIdx) => {
      bounds.push([o.lat, o.lng]);
      
      const customerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${oIdx + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      L.marker([o.lat, o.lng], { icon: customerIcon })
        .addTo(_layer)
        .bindPopup(`
          <strong>${o.code} - ${o.name || ''}</strong><br>
          น้ำหนัก: ${(o.w||0).toFixed(2)} ตัน<br>
          ปริมาตร: ${(o.v||0).toFixed(2)} ลบ.ม.<br>
          สินค้า: ${o.mat || '-'}
        `);
    });
  });
  
  // Fit bounds
  if (bounds.length > 1) {
    _map.fitBounds(bounds, { padding: [50, 50] });
  }
}

async function drawLongdoMap(plan){
  if (!_longdoMap) {
    initLongdoMap();
    await new Promise(resolve => {
      if (_longdoMap) {
        _longdoMap.Event.bind("ready", resolve);
      } else {
        setTimeout(resolve, 500);
      }
    });
  }
  
  if (!_longdoMap || typeof longdo === 'undefined') {
    setTimeout(() => drawLongdoMap(plan), 500);
    return;
  }
  
  // Clear existing
  _longdoMap.Overlays.clear();
  _longdoMap.Route.clear();
  _routeResults = [];
  
  const routeResultDiv = document.getElementById('route_result');
  if (routeResultDiv) routeResultDiv.innerHTML = '';
  
  // จุดเริ่มต้น
  const originMarker = new longdo.Marker(
    { lon: plan.origin_lng, lat: plan.origin_lat },
    { 
      title: '📍 จุดเริ่มต้น (ลาน)', 
      detail: plan.name || 'Origin',
      icon: { url: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="white" stroke-width="3"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">S</text>
        </svg>
      `) }
    }
  );
  _longdoMap.Overlays.add(originMarker);
  
  // วาดเส้นทางและลูกค้า
  const routeColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  for (let idx = 0; idx < (plan.routes || []).length; idx++) {
    const r = plan.routes[idx];
    const color = routeColors[idx % routeColors.length];
    const orders = r.orders || [];
    const vehicle = r.vehicle || {};
    
    // สร้าง waypoints สำหรับเส้นทาง
    const waypoints = [
      { lon: plan.origin_lng, lat: plan.origin_lat, label: 'จุดเริ่มต้น' }
    ];
    
    orders.forEach((o, oIdx) => {
      waypoints.push({ 
        lon: o.lng, 
        lat: o.lat, 
        label: `${oIdx + 1}. ${o.code}` 
      });
      
      // เพิ่ม marker สำหรับลูกค้า
      const customerMarker = new longdo.Marker(
        { lon: o.lng, lat: o.lat },
        { 
          title: `${o.code} - ${o.name || ''}`,
          detail: `น้ำหนัก: ${(o.w||0).toFixed(2)} ตัน | ปริมาตร: ${(o.v||0).toFixed(2)} ลบ.ม.`,
          icon: { url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2" opacity="0.9"/>
              <text x="14" y="18" text-anchor="middle" fill="white" font-size="11" font-weight="bold">${oIdx + 1}</text>
            </svg>
          `) }
        }
      );
      _longdoMap.Overlays.add(customerMarker);
    });
    
    // กลับจุดเริ่มต้น
    waypoints.push({ 
      lon: plan.origin_lng, 
      lat: plan.origin_lat, 
      label: 'กลับลาน' 
    });
    
    // ใช้ Route API เพื่อวาดเส้นทาง (ตามเอกสาร Longdo Map API)
    // สำหรับแต่ละเส้นทาง ต้องวาดแยกกัน
    _longdoMap.Route.clear();
    
    // เพิ่ม waypoints
    waypoints.forEach(wp => {
      _longdoMap.Route.add({ lon: wp.lon, lat: wp.lat });
    });
    
    // ตั้งค่า Route options (ถ้ามี)
    if (longdo.RouteMode) {
      _longdoMap.Route.mode(longdo.RouteMode.FASTEST);
    }
    if (longdo.RouteType) {
      _longdoMap.Route.type(longdo.RouteType.CAR);
    }
    
    // ตั้งค่า placeholder สำหรับแสดงผลลัพธ์เฉพาะเส้นทางแรก
    if (routeResultDiv && idx === 0) {
      _longdoMap.Route.placeholder(routeResultDiv);
    } else if (idx > 0) {
      // สำหรับเส้นทางอื่นๆ ไม่แสดง placeholder
      _longdoMap.Route.placeholder(null);
    }
    
    // ค้นหาเส้นทาง
    try {
      const routeInfo = _longdoMap.Route.search();
      
      // เก็บข้อมูลเส้นทาง
      _routeResults.push({
        routeIndex: idx + 1,
        vehicle: vehicle.plate || `รถ ${idx + 1}`,
        waypoints: waypoints,
        routeInfo: routeInfo,
        color: color
      });
    } catch(e) {
      console.log("Route search error:", e);
    }
    
    // สร้างคำอธิบายเส้นทาง
    await generateRouteExplanation(r, idx, plan, routeResultDiv);
  }
  
  // Fit bounds
  if (plan.routes && plan.routes.length > 0) {
    const bounds = [];
    bounds.push({ lon: plan.origin_lng, lat: plan.origin_lat });
    plan.routes.forEach(r => {
      (r.orders || []).forEach(o => {
        bounds.push({ lon: o.lng, lat: o.lat });
      });
    });
    _longdoMap.bounds(bounds);
  }
}

async function generateRouteExplanation(route, routeIndex, plan, container){
  if (!container) return;
  
  const orders = route.orders || [];
  const vehicle = route.vehicle || {};
  const routeColor = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][routeIndex % 6];
  
  let explanation = `<div class="mb-3 p-2 border-l-2 bg-white rounded" style="border-color: ${routeColor}">
    <div class="font-semibold text-xs mb-1">เส้นทาง ${routeIndex + 1}: ${vehicle.plate || 'N/A'} (${vehicle.type || 'N/A'})</div>
    <div class="text-xs text-gray-600 mb-2">
      ระยะทาง: ${(route.distanceKm||0).toFixed(2)} km | ต้นทุน: ${(route.cost||0).toFixed(2)} บาท | 
      จำนวนจุด: ${orders.length} จุด
    </div>
    <div class="text-xs mb-2">
      <strong>ลำดับการเดินทาง:</strong><br>
      <span class="text-gray-700">📍 จุดเริ่มต้น</span> → 
      ${orders.map((o, i) => `<span class="text-gray-700">${i+1}.${o.code}</span>`).join(' → ')} → 
      <span class="text-gray-700">📍 กลับลาน</span>
    </div>`;
  
  // วิเคราะห์ทำไมเลือกเส้นทางนี้
  const factors = [];
  if (plan.consider_traffic !== false) {
    factors.push('หลีกเลี่ยงจราจรติดขัด');
  }
  if (plan.consider_highway !== false) {
    factors.push('ใช้ทางด่วนเพื่อประหยัดเวลา');
  }
  if (plan.consider_flood !== false) {
    factors.push('หลีกเลี่ยงพื้นที่น้ำท่วม');
  }
  if (plan.consider_breakdown !== false) {
    factors.push('หลีกเลี่ยงเส้นทางเสี่ยงรถเสีย');
  }
  if (plan.consider_hills !== false) {
    factors.push('หลีกเลี่ยงเส้นทางเนินเขาสูง');
  }
  
  if (factors.length > 0) {
    explanation += `<div class="text-xs text-gray-700 mt-2 p-1 bg-green-50 rounded">
      <strong>✅ เหตุผลเลือกเส้นทางนี้:</strong> ${factors.join(', ')}
    </div>`;
  }
  
  // วิเคราะห์เส้นทางทางเลือกที่หลีกเลี่ยง
  explanation += `<div class="text-xs text-gray-600 mt-2 p-1 bg-yellow-50 rounded">
    <strong>⚠️ เส้นทางที่หลีกเลี่ยง:</strong><br>
    • ทางชุมชน (แคบ, จราจรหนาแน่น, เสี่ยงอุบัติเหตุ)<br>
    • เส้นทางที่มีด่านตรวจมาก (เสียเวลา, เอกสาร)<br>
    • พื้นที่น้ำท่วม/กำลังก่อสร้าง (เสี่ยงติดขัด)<br>
    • เส้นทางเนินเขาสูง (ใช้เชื้อเพลิงมาก, เสี่ยงรถเสีย)
  </div>`;
  
  // คำอธิบายการเดินทาง
  const avgSpeed = 60;
  const totalTime = (route.distanceKm || 0) / avgSpeed;
  explanation += `<div class="text-xs text-blue-600 mt-2 p-1 bg-blue-50 rounded">
    <strong>📋 คำอธิบายการเดินทาง:</strong><br>
    • เริ่มต้นจากลาน → เดินทางไปยังลูกค้าตามลำดับ → กลับลาน<br>
    • เวลาเดินทางประมาณ: ${totalTime.toFixed(1)} ชั่วโมง<br>
    • ความเร็วเฉลี่ย: ${avgSpeed} km/h (รวมเวลาจอดส่งของ)
  </div>`;
  
  explanation += `</div>`;
  
  container.innerHTML += explanation;
}

// ไม่ใช้ Leaflet แล้ว ใช้ Longdo Map เท่านั้น

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

// ---------- File Upload ----------
async function handleFileUpload(event){
  const file = event.target.files[0];
  if (!file) return;

  try {
    const fileExt = file.name.split('.').pop().toLowerCase();
    let data;

    if (fileExt === 'csv') {
      const text = await file.text();
      data = parseCSV(text);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(firstSheet);
    } else {
      alert('รองรับเฉพาะไฟล์ .xlsx, .xls, หรือ .csv');
      return;
    }

    if (!data || data.length === 0) {
      alert('ไฟล์ว่างหรือไม่สามารถอ่านข้อมูลได้');
      return;
    }

    // Parse ข้อมูลจากไฟล์
    const parsed = parseFileData(data);
    
    // ตรวจสอบว่าเป็นรูปแบบ transport plan หรือไม่
    if (parsed.plans && parsed.plans.length > 0) {
      // รูปแบบ transport plan - แสดงแผนหลายวัน
      await handleTransportPlanFormat(parsed);
      return;
    }
    
    // รูปแบบปกติ
    // เติมข้อมูลลงในฟอร์ม
    if (parsed.origin) {
      $("#plan_origin_lat").value = parsed.origin.lat;
      $("#plan_origin_lng").value = parsed.origin.lng;
    }
    if (parsed.name) $("#plan_name").value = parsed.name;
    if (parsed.date) $("#plan_date").value = parsed.date;

    // ล้างตารางเดิม
    $("#plan_lines").innerHTML = "";

    // เพิ่มข้อมูลลูกค้า
    parsed.lines.forEach(line => {
      addPlanRow();
      const rows = $$("#plan_lines tr");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const tds = lastRow.querySelectorAll("td");
        const select = tds[0].querySelector("select");
        if (select && line.customer_code) {
          select.value = line.customer_code;
        }
        if (tds[1]) tds[1].querySelector("input").value = line.w || "";
        if (tds[2]) tds[2].querySelector("input").value = line.v || "";
        if (tds[3]) tds[3].querySelector("input").value = line.mat || "";
      }
    });

    alert(`โหลดข้อมูลสำเร็จ: ${parsed.lines.length} รายการ`);
    
    // รันอัตโนมัติถ้ามีข้อมูลครบ
    if (parsed.lines.length > 0 && parsed.origin) {
      setTimeout(() => {
        if (confirm('ต้องการวิเคราะห์และสร้างเส้นทางอัตโนมัติเลยไหม?')) {
          analyzePlan();
        }
      }, 500);
    }
  } catch(e) {
    alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + e.message);
    console.error(e);
  }

  // Reset file input
  event.target.value = '';
}

async function handleTransportPlanFormat(parsed){
  // สร้างลูกค้าในระบบก่อน
  if (parsed.customersList && parsed.customersList.length > 0) {
    let created = 0;
    for (const cust of parsed.customersList) {
      try {
        await api("/customers", {
          method: "POST",
          json: {
            code: cust.code,
            name: cust.name,
            lat: cust.lat,
            lng: cust.lng,
            type: "ร้านขายของเก่า",
            note: "นำเข้าจากไฟล์แผนการขนส่ง"
          },
          auth: true
        });
        created++;
      } catch(e) {
        // อาจมีอยู่แล้ว ข้าม
        console.log("Customer exists:", cust.code);
      }
    }
    await loadCustomers();
    await loadCustomersForPlan();
    alert(`สร้างลูกค้า ${created} รายการจากไฟล์`);
  }
  
  // แสดงแผนทั้งหมด
  const planContainer = document.createElement("div");
  planContainer.className = "card mt-4";
  planContainer.innerHTML = `
    <h3 class="text-lg font-bold mb-4">📋 แผนการขนส่งที่โหลดมา (${parsed.plans.length} แผน)</h3>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${parsed.plans.map((plan, idx) => `
        <div class="p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100" 
             onclick="loadPlanToForm(${idx})" data-plan-index="${idx}">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold text-green-800">${plan.name}</div>
              <div class="text-sm text-green-700">
                ลาน: ${plan.yard_name} | รถ: ${plan.vehicle} | 
                ลูกค้า: ${plan.lines.length} รายการ | 
                ระยะทาง: ${plan.route_distance_km.toFixed(2)} km | 
                ต้นทุน: ${plan.company_cost_THB.toFixed(2)} บาท
              </div>
            </div>
            <button class="btn primary" onclick="event.stopPropagation(); analyzePlanFromData(${idx})">
              วิเคราะห์
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // เก็บข้อมูลแผนไว้ใน window
  window._uploadedPlans = parsed.plans;
  
  // แทรกก่อนตาราง plan_lines
  const planSection = document.querySelector("#tab-plan .card");
  const existingPlanContainer = planSection.querySelector(".uploaded-plans-container");
  if (existingPlanContainer) {
    existingPlanContainer.remove();
  }
  planContainer.classList.add("uploaded-plans-container");
  const planLinesDiv = planSection.querySelector(".mt-4");
  if (planLinesDiv) {
    planSection.insertBefore(planContainer, planLinesDiv);
  } else {
    planSection.appendChild(planContainer);
  }
  
  alert(`โหลดแผนการขนส่งสำเร็จ: ${parsed.plans.length} แผน\nคลิกที่แผนเพื่อโหลดลงฟอร์มหรือวิเคราะห์`);
}

function loadPlanToForm(planIndex){
  if (!window._uploadedPlans || !window._uploadedPlans[planIndex]) return;
  
  const plan = window._uploadedPlans[planIndex];
  
  // เติมข้อมูลแผน
  $("#plan_name").value = plan.name;
  $("#plan_date").value = plan.date;
  if (plan.origin) {
    $("#plan_origin_lat").value = plan.origin.lat;
    $("#plan_origin_lng").value = plan.origin.lng;
  }
  
  // ล้างตารางเดิม
  $("#plan_lines").innerHTML = "";
  
  // เพิ่มข้อมูลลูกค้า
  plan.lines.forEach(line => {
    addPlanRow();
    const rows = $$("#plan_lines tr");
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const tds = lastRow.querySelectorAll("td");
      const select = tds[0].querySelector("select");
      if (select && line.customer_code) {
        select.value = line.customer_code;
      }
      if (tds[1]) tds[1].querySelector("input").value = line.w || "";
      if (tds[2]) tds[2].querySelector("input").value = line.v || "";
      if (tds[3]) tds[3].querySelector("input").value = line.mat || "";
    }
  });
  
  alert(`โหลดแผน "${plan.name}" ลงฟอร์มแล้ว`);
}

async function analyzePlanFromData(planIndex){
  if (!window._uploadedPlans || !window._uploadedPlans[planIndex]) return;
  
  const plan = window._uploadedPlans[planIndex];
  
  // เติมข้อมูลแผน
  $("#plan_name").value = plan.name;
  $("#plan_date").value = plan.date;
  if (plan.origin) {
    $("#plan_origin_lat").value = plan.origin.lat;
    $("#plan_origin_lng").value = plan.origin.lng;
  }
  
  // ล้างตารางเดิม
  $("#plan_lines").innerHTML = "";
  
  // เพิ่มข้อมูลลูกค้า
  plan.lines.forEach(line => {
    addPlanRow();
    const rows = $$("#plan_lines tr");
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const tds = lastRow.querySelectorAll("td");
      const select = tds[0].querySelector("select");
      if (select && line.customer_code) {
        select.value = line.customer_code;
      }
      if (tds[1]) tds[1].querySelector("input").value = line.w || "";
      if (tds[2]) tds[2].querySelector("input").value = line.v || "";
      if (tds[3]) tds[3].querySelector("input").value = line.mat || "";
    }
  });
  
  // รอให้ select อัปเดต
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // วิเคราะห์อัตโนมัติ
  analyzePlan();
}

function parseCSV(text){
  // รองรับ CSV ที่มี multiline fields (เช่น customer field ที่มี newline)
  const lines = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      // End of line (outside quotes)
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  // Add last line
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) return [];
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse data rows
  return lines.slice(1).map(line => {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Add last value
    
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || '').replace(/^"|"$/g, '');
    });
    return obj;
  });
}

function parseFileData(data){
  // รองรับหลายรูปแบบ
  const result = {
    origin: null,
    name: '',
    date: '',
    lines: [],
    plans: [] // สำหรับแผนหลายวัน
  };

  // ตรวจสอบว่าเป็นรูปแบบ transport_plan หรือไม่
  const firstRow = data[0] || {};
  const hasPlanDay = 'plan_day' in firstRow || 'plan_day' in firstRow;
  const hasYard = 'yard' in firstRow;
  const hasRouteId = 'route_id' in firstRow;
  
  if (hasPlanDay && hasYard) {
    // รูปแบบ transport_plan_50_orders.csv
    return parseTransportPlanFormat(data);
  }

  // หา origin (อาจอยู่ในแถวแรกหรือคอลัมน์พิเศษ)
  if (firstRow.origin_lat && firstRow.origin_lng) {
    result.origin = { lat: parseFloat(firstRow.origin_lat), lng: parseFloat(firstRow.origin_lng) };
  } else if (firstRow.lat && firstRow.lng && firstRow.type === 'origin') {
    result.origin = { lat: parseFloat(firstRow.lat), lng: parseFloat(firstRow.lng) };
  }

  // หาชื่อแผนและวันที่
  result.name = firstRow.plan_name || firstRow.name || firstRow['ชื่อแผน'] || '';
  result.date = firstRow.date || firstRow['วันที่'] || '';

  // Parse lines
  data.forEach(row => {
    // ข้ามแถว origin
    if (row.type === 'origin') return;

    const customerCode = row.customer_code || row.code || row['รหัสลูกค้า'] || row['ลูกค้า'] || '';
    const w = parseFloat(row.w || row.weight || row['น้ำหนัก'] || row['ตัน'] || row.order_ton || 0);
    const v = parseFloat(row.v || row.volume || row['ปริมาตร'] || row['ลบ.ม.'] || 0);
    const mat = row.mat || row.material || row['สินค้า'] || row['ประเภท'] || '';

    if (customerCode) {
      result.lines.push({ customer_code: customerCode, w, v, mat });
    }
  });

  return result;
}

function parseTransportPlanFormat(data){
  // Parse รูปแบบ transport_plan_50_orders.csv
  const result = {
    plans: [],
    yards: new Map(), // yard name -> {lat, lng}
    customers: new Map() // customer name -> {code, lat, lng}
  };

  // กลุ่มข้อมูลตาม plan_day และ route_id
  const plansByDay = new Map();
  
  data.forEach(row => {
    const planDay = parseInt(row.plan_day || row['plan_day'] || '1');
    const yard = (row.yard || row['yard'] || '').trim();
    const customerName = (row.customer || row['customer'] || '').trim();
    const lat = parseFloat(row.lat || row['lat'] || 0);
    const lng = parseFloat(row.lng || row['lng'] || 0);
    const orderTon = parseFloat(row.order_ton || row['order_ton'] || 0);
    const routeId = parseInt(row.route_id || row['route_id'] || 0);
    const vehicle = (row.vehicle || row['vehicle'] || '6W').trim();
    const routeDistance = parseFloat(row.route_distance_km || row['route_distance_km'] || 0);
    const companyCost = parseFloat(row.company_cost_THB || row['company_cost_THB'] || 0);
    
    // ทำความสะอาดชื่อลูกค้า (ลบ "customer" และข้อมูล pandas ออก)
    let cleanCustomerName = customerName
      .replace(/^customer\s+/i, '')
      .replace(/\n.*$/g, '')
      .replace(/Name:.*$/g, '')
      .replace(/dtype:.*$/g, '')
      .trim();
    
    // สร้าง customer code จากชื่อ
    const customerCode = cleanCustomerName.substring(0, 20).replace(/\s+/g, '_').toUpperCase() || `CUST_${routeId}_${Math.random().toString(36).substr(2, 5)}`;
    
    // เก็บข้อมูล yard
    if (yard && lat && lng) {
      if (!result.yards.has(yard)) {
        // หาพิกัด yard จาก TBR_MASTERS หรือใช้พิกัดแรกที่เจอ
        const yardInfo = findYardByName(yard);
        result.yards.set(yard, {
          name: yard,
          lat: yardInfo ? yardInfo.lat : lat,
          lng: yardInfo ? yardInfo.lng : lng
        });
      }
    }
    
    // เก็บข้อมูลลูกค้า
    if (!result.customers.has(customerCode)) {
      result.customers.set(customerCode, {
        code: customerCode,
        name: cleanCustomerName,
        lat: lat,
        lng: lng
      });
    }
    
    // กลุ่มตาม plan_day และ route_id
    const key = `${planDay}_${routeId}`;
    if (!plansByDay.has(planDay)) {
      plansByDay.set(planDay, new Map());
    }
    const routes = plansByDay.get(planDay);
    if (!routes.has(routeId)) {
      routes.set(routeId, {
        plan_day: planDay,
        yard: yard,
        vehicle: vehicle,
        route_id: routeId,
        route_distance_km: routeDistance,
        company_cost_THB: companyCost,
        orders: []
      });
    }
    
    routes.get(routeId).orders.push({
      customer_code: customerCode,
      customer_name: cleanCustomerName,
      lat: lat,
      lng: lng,
      w: orderTon,
      v: orderTon * 2.5, // ประมาณปริมาตรจากน้ำหนัก
      mat: 'บรรจุภัณฑ์รีไซเคิล'
    });
  });
  
  // แปลงเป็น array ของแผน
  plansByDay.forEach((routes, planDay) => {
    routes.forEach((route, routeId) => {
      result.plans.push({
        plan_day: planDay,
        name: `แผนวันที่ ${planDay} - เส้นทาง ${routeId + 1}`,
        date: new Date(Date.now() + (planDay - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        origin: result.yards.get(route.yard) || { lat: 13.7563, lng: 100.5018 },
        yard_name: route.yard,
        vehicle: route.vehicle,
        route_id: route.route_id,
        route_distance_km: route.route_distance_km,
        company_cost_THB: route.company_cost_THB,
        lines: route.orders.map(o => ({
          customer_code: o.customer_code,
          w: o.w,
          v: o.v,
          mat: o.mat
        }))
      });
    });
  });
  
  // เก็บข้อมูลลูกค้าทั้งหมดเพื่อสร้างในระบบ
  result.customersList = Array.from(result.customers.values());
  
  return result;
}

function findYardByName(yardName){
  if (!window.TBR_MASTERS || !window.TBR_MASTERS.YARDS_MASTER) return null;
  
  const match = window.TBR_MASTERS.YARDS_MASTER.find(y => 
    y.name.includes(yardName) || 
    yardName.includes(y.name) ||
    y.address.includes(yardName)
  );
  return match;
}

// ---------- Export ----------
function exportRaw(kind){
  const a = document.createElement("a");
  a.href = `${window.API_BASE}/${kind}`; a.target = "_blank"; a.click();
}

function exportPlanExcel(){
  try{
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: สรุปแผน
    const summaryRows = [["สรุปแผนการขนส่ง"], []];
    const summaryDiv = $("#plan_summary");
    if (summaryDiv) {
      summaryDiv.querySelectorAll(".metric").forEach(m => {
        const k = m.querySelector(".k")?.textContent || "";
        const v = m.querySelector(".v")?.textContent || "";
        summaryRows.push([k, v]);
      });
    }
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, "สรุปแผน");
    
    // Sheet 2: เส้นทางทั้งหมด
    const routeRows = [["ลำดับ", "ทะเบียนรถ", "ประเภท", "ระยะทาง (km)", "ต้นทุน (บาท)", "จำนวนจุด", "Utilization (%)", "ต้นทุน/ตัน", "ต้นทุน/กม.", "Efficiency"]];
    $$("#routes_container > div").forEach((div, i)=>{
      const text = div.textContent || "";
      const plate = text.match(/เส้นทาง \d+: ([^\s(]+)/)?.[1] || "";
      const type = text.match(/\(([^)]+)\)/)?.[1] || "";
      const distance = text.match(/ระยะทาง: ([\d.]+)/)?.[1] || "0";
      const cost = text.match(/ต้นทุน: ([\d.]+)/)?.[1] || "0";
      const points = text.match(/(\d+) จุด/)?.[1] || "0";
      routeRows.push([i+1, plate, type, distance, cost, points, "", "", "", ""]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(routeRows);
    XLSX.utils.book_append_sheet(wb, ws2, "เส้นทาง");
    
    // Sheet 3: วิเคราะห์ต้นทุน
    const costRows = [["เส้นทาง", "ทะเบียน", "ระยะทาง (km)", "ต้นทุนฐาน", "ต้นทุนรวม", "ส่วนต่าง", "ต้นทุน/ตัน", "ต้นทุน/กม.", "Utilization (%)"]];
    $$("#route_analysis .route-detail").forEach((div, i)=>{
      const text = div.textContent || "";
      const plate = text.match(/เส้นทางที่ \d+: ([^\s]+)/)?.[1] || "";
      const distance = text.match(/ระยะทาง: ([\d.]+)/)?.[1] || "0";
      const cost = text.match(/ต้นทุน: ([\d.]+)/)?.[1] || "0";
      const costPerTon = text.match(/ต้นทุน\/ตัน: ([\d.]+)/)?.[1] || "0";
      const costPerKm = text.match(/ต้นทุน\/กม\.: ([\d.]+)/)?.[1] || "0";
      const util = text.match(/Utilization: ([\d.]+)/)?.[1] || "0";
      costRows.push([`เส้นทาง ${i+1}`, plate, distance, "", cost, "", costPerTon, costPerKm, util]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(costRows);
    XLSX.utils.book_append_sheet(wb, ws3, "วิเคราะห์ต้นทุน");
    
    const out = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    saveAs(new Blob([out]), `plan_report_${new Date().toISOString().slice(0,10)}.xlsx`);
    alert("Export Excel สำเร็จ");
  }catch(e){ alert("Export Excel ไม่สำเร็จ: " + e.message); }
}

let _currentPlanResult = null;

function generateDetailedReport(){
  if (!_currentPlanResult) {
    alert("ยังไม่มีข้อมูลแผน กรุณาวิเคราะห์แผนก่อน");
    return;
  }
  
  const plan = _currentPlanResult;
  const reportDiv = $("#detailed_report");
  if (!reportDiv) return;
  
  // คำนวณสถิติทั้งหมด
  const totalRoutes = (plan.routes || []).length;
  const totalKm = plan.totalKm || 0;
  const totalCost = plan.totalCost || 0;
  const totalW = plan.totalW || 0;
  const totalV = plan.totalV || 0;
  
  // คำนวณต้นทุนเฉลี่ย
  const avgCostPerRoute = totalRoutes > 0 ? (totalCost / totalRoutes) : 0;
  const avgCostPerKm = totalKm > 0 ? (totalCost / totalKm) : 0;
  const avgCostPerTon = totalW > 0 ? (totalCost / totalW) : 0;
  
  // คำนวณ Utilization เฉลี่ย
  let totalUtil = 0;
  (plan.routes || []).forEach(r => {
    const vehicle = r.vehicle || {};
    const orders = r.orders || [];
    const totalW = orders.reduce((s, o) => s + (o.w || 0), 0);
    const totalV = orders.reduce((s, o) => s + (o.v || 0), 0);
    const wUtil = vehicle.capW > 0 ? (totalW / vehicle.capW * 100) : 0;
    const vUtil = vehicle.capV > 0 ? (totalV / vehicle.capV * 100) : 0;
    totalUtil += ((wUtil + vUtil) / 2);
  });
  const avgUtil = totalRoutes > 0 ? (totalUtil / totalRoutes) : 0;
  
  // คำนวณ Efficiency
  const totalPoints = (plan.routes || []).reduce((sum, r) => sum + (r.orders || []).length, 0);
  const efficiency = totalKm > 0 ? (totalPoints / totalKm * 100) : 0;
  
  // วิเคราะห์ต้นทุนแต่ละ route
  const costAnalysis = (plan.routes || []).map((r, idx) => {
    const vehicle = r.vehicle || {};
    const orders = r.orders || [];
    const baseCost = r.distanceKm * (vehicle.costPerKm || 20);
    const actualCost = r.cost || 0;
    const costDiff = actualCost - baseCost;
    const costDiffPercent = baseCost > 0 ? ((costDiff / baseCost) * 100) : 0;
    const totalW = orders.reduce((s, o) => s + (o.w || 0), 0);
    const costPerTon = totalW > 0 ? (actualCost / totalW) : 0;
    const costPerKm = r.distanceKm > 0 ? (actualCost / r.distanceKm) : 0;
    
    return {
      route: idx + 1,
      plate: vehicle.plate || "N/A",
      type: vehicle.type || "N/A",
      distance: r.distanceKm || 0,
      baseCost: baseCost,
      actualCost: actualCost,
      costDiff: costDiff,
      costDiffPercent: costDiffPercent,
      costPerTon: costPerTon,
      costPerKm: costPerKm,
      points: orders.length,
      weight: totalW
    };
  });
  
  // สร้างรายงาน
  reportDiv.innerHTML = `
    <div class="space-y-4">
      <!-- Executive Summary -->
      <div class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
        <h3 class="text-sm font-bold mb-3 text-green-800">📋 สรุปผู้บริหาร (Executive Summary)</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <div class="text-gray-600">แผนการขนส่ง</div>
            <div class="font-bold text-lg text-green-700">${plan.name || 'N/A'}</div>
            <div class="text-gray-500">${plan.date || ''}</div>
          </div>
          <div>
            <div class="text-gray-600">จำนวนเส้นทาง</div>
            <div class="font-bold text-lg text-green-700">${totalRoutes} เส้นทาง</div>
            <div class="text-gray-500">${plan.recommended_vehicles ? `แนะนำ: ${plan.recommended_vehicles} คัน` : ''}</div>
          </div>
          <div>
            <div class="text-gray-600">รวมระยะทาง</div>
            <div class="font-bold text-lg text-green-700">${totalKm.toFixed(2)} km</div>
            <div class="text-gray-500">เฉลี่ย: ${(totalKm/totalRoutes).toFixed(2)} km/เส้นทาง</div>
          </div>
          <div>
            <div class="text-gray-600">รวมต้นทุน</div>
            <div class="font-bold text-lg text-green-700">${totalCost.toFixed(2)} บาท</div>
            <div class="text-gray-500">เฉลี่ย: ${avgCostPerRoute.toFixed(2)} บาท/เส้นทาง</div>
          </div>
        </div>
      </div>
      
      <!-- Key Performance Indicators -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 class="text-sm font-bold mb-3">📊 ตัวชี้วัดประสิทธิภาพ (KPIs)</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="p-2 bg-blue-50 rounded">
            <div class="text-gray-600">ต้นทุน/กม.</div>
            <div class="font-bold text-blue-700 text-base">${avgCostPerKm.toFixed(2)} บาท</div>
          </div>
          <div class="p-2 bg-green-50 rounded">
            <div class="text-gray-600">ต้นทุน/ตัน</div>
            <div class="font-bold text-green-700 text-base">${avgCostPerTon.toFixed(2)} บาท</div>
          </div>
          <div class="p-2 bg-purple-50 rounded">
            <div class="text-gray-600">Utilization เฉลี่ย</div>
            <div class="font-bold text-purple-700 text-base">${avgUtil.toFixed(1)}%</div>
          </div>
          <div class="p-2 bg-orange-50 rounded">
            <div class="text-gray-600">Efficiency</div>
            <div class="font-bold text-orange-700 text-base">${efficiency.toFixed(2)} จุด/100km</div>
          </div>
        </div>
      </div>
      
      <!-- Cost Analysis by Route -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg">
        <h3 class="text-sm font-bold mb-3">💰 วิเคราะห์ต้นทุนขนส่งแต่ละ Route</h3>
        <div class="overflow-x-auto">
          <table class="table text-xs">
            <thead>
              <tr>
                <th>Route</th>
                <th>ทะเบียน</th>
                <th>ระยะทาง (km)</th>
                <th>ต้นทุนฐาน</th>
                <th>ต้นทุนรวม</th>
                <th>ส่วนต่าง</th>
                <th>% ส่วนต่าง</th>
                <th>ต้นทุน/ตัน</th>
                <th>ต้นทุน/กม.</th>
                <th>จำนวนจุด</th>
              </tr>
            </thead>
            <tbody>
              ${costAnalysis.map(ca => `
                <tr>
                  <td>${ca.route}</td>
                  <td>${ca.plate}</td>
                  <td>${ca.distance.toFixed(2)}</td>
                  <td>${ca.baseCost.toFixed(2)}</td>
                  <td class="font-semibold">${ca.actualCost.toFixed(2)}</td>
                  <td class="${ca.costDiff > 0 ? 'text-red-600' : 'text-green-600'}">${ca.costDiff > 0 ? '+' : ''}${ca.costDiff.toFixed(2)}</td>
                  <td class="${ca.costDiffPercent > 0 ? 'text-red-600' : 'text-green-600'}">${ca.costDiffPercent > 0 ? '+' : ''}${ca.costDiffPercent.toFixed(1)}%</td>
                  <td>${ca.costPerTon.toFixed(2)}</td>
                  <td>${ca.costPerKm.toFixed(2)}</td>
                  <td>${ca.points}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="font-bold bg-gray-100">
                <td colspan="2">รวม</td>
                <td>${totalKm.toFixed(2)}</td>
                <td>${costAnalysis.reduce((s, ca) => s + ca.baseCost, 0).toFixed(2)}</td>
                <td>${totalCost.toFixed(2)}</td>
                <td>${costAnalysis.reduce((s, ca) => s + ca.costDiff, 0).toFixed(2)}</td>
                <td>${((costAnalysis.reduce((s, ca) => s + ca.costDiff, 0) / costAnalysis.reduce((s, ca) => s + ca.baseCost, 0)) * 100).toFixed(1)}%</td>
                <td>${avgCostPerTon.toFixed(2)}</td>
                <td>${avgCostPerKm.toFixed(2)}</td>
                <td>${totalPoints}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <!-- Recommendations -->
      <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 class="text-sm font-bold mb-3 text-yellow-800">💡 คำแนะนำและข้อเสนอแนะ</h3>
        <div class="text-xs space-y-2">
          ${avgUtil < 70 ? '<div>• <strong>Utilization ต่ำ:</strong> พิจารณารวมเส้นทางหรือใช้รถขนาดเล็กลง</div>' : ''}
          ${avgCostPerKm > 30 ? '<div>• <strong>ต้นทุน/กม. สูง:</strong> พิจารณาใช้ทางด่วนหรือปรับเส้นทาง</div>' : ''}
          ${efficiency < 1 ? '<div>• <strong>Efficiency ต่ำ:</strong> เส้นทางมีระยะทางมากแต่จุดส่งน้อย พิจารณารวมเส้นทาง</div>' : ''}
          ${plan.recommended_vehicles && plan.actual_vehicles && plan.actual_vehicles > plan.recommended_vehicles ? 
            `<div>• <strong>ใช้รถมากเกินไป:</strong> แนะนำใช้ ${plan.recommended_vehicles} คัน แต่ใช้ ${plan.actual_vehicles} คัน</div>` : ''}
          ${costAnalysis.some(ca => ca.costDiffPercent > 20) ? 
            '<div>• <strong>ต้นทุนสูงกว่าฐานมาก:</strong> มีบางเส้นทางที่ต้นทุนสูงกว่าฐานมาก พิจารณาตรวจสอบปัจจัยเพิ่มเติม</div>' : ''}
          <div>• <strong>การปรับปรุง:</strong> พิจารณาใช้ระบบ Route Optimization เพื่อลดระยะทางและต้นทุน</div>
        </div>
      </div>
    </div>
  `;
  
  openTab('report');
}

function exportReportExcel(){
  if (!_currentPlanResult) {
    alert("ยังไม่มีข้อมูลแผน กรุณาวิเคราะห์แผนก่อน");
    return;
  }
  exportPlanExcel();
}

// ---------- Yard Selection ----------
function selectYardOrigin(){
  const select = $("#plan_origin_yard");
  if (!select || !select.value) return;
  
  const [lat, lng] = select.value.split(',').map(parseFloat);
  if (lat && lng) {
    $("#plan_origin_lat").value = lat;
    $("#plan_origin_lng").value = lng;
  }
}

function loadYardOptions(){
  const select = $("#plan_origin_yard");
  if (!select || !window.TBR_MASTERS) return;
  
  // ล้าง options เดิม
  select.innerHTML = '<option value="">-- เลือกลาน (TBR Master) --</option>';
  
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

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", ()=>{
  // โหลดลาน options
  loadYardOptions();
  
  // Auto login สำหรับใช้ภายใน
  if (!TOKEN) {
    // สร้าง token ชั่วคราวสำหรับใช้ภายใน
    TOKEN = "internal-use-token";
    localStorage.setItem("tbr_token", TOKEN);
  }
  
  // เริ่มต้น Longdo Map
  initLongdoMap();
  
  loadCustomers().catch(()=>{});
  loadCustomersForPlan().catch(()=>{});
  loadVehicles().catch(()=>{});
  loadYardOptions();
  if (!$("#plan_lines").children.length) addPlanRow();
  
  // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
  const today = new Date().toISOString().slice(0,10);
  const dateInput = $("#plan_date");
  if (dateInput) dateInput.value = today;
  
  // เปิดแท็บ master เป็นค่าเริ่มต้น
  openTab('master');
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
window.handleFileUpload = handleFileUpload;
window.calculateIsochrone = calculateIsochrone;
window.loadTestData = loadTestData;
window.loadPlanToForm = loadPlanToForm;
window.analyzePlanFromData = analyzePlanFromData;

// ---------- Isochrone/IsoDistance ----------
async function calculateIsochrone(){
  try {
    const lat = parseFloat($("#isochrone_lat").value);
    const lng = parseFloat($("#isochrone_lng").value);
    const timeMinutes = parseInt($("#isochrone_time").value || "30");
    const distanceKm = $("#isochrone_distance").value ? parseFloat($("#isochrone_distance").value) : null;

    if (isNaN(lat) || isNaN(lng)) {
      return alert("กรุณากรอกพิกัด Lat และ Lng");
    }

    const result = await api("/api/routing/isochrone", {
      method: "POST",
      json: { lat, lng, time_minutes: timeMinutes, distance_km: distanceKm }
    });

    // วาดขอบเขตบนแผนที่
    if (_map && result.coordinates) {
      if (_isochroneLayer) {
        _map.removeLayer(_isochroneLayer);
      }
      _isochroneLayer = L.polygon(result.coordinates, {
        color: '#22c55e',
        fillColor: '#86efac',
        fillOpacity: 0.3,
        weight: 2
      }).addTo(_map);
      
      _map.fitBounds(_isochroneLayer.getBounds());
      
      // แสดง popup
      const center = _isochroneLayer.getBounds().getCenter();
      _isochroneLayer.bindPopup(`
        <b>📐 ขอบเขตการให้บริการ</b><br>
        ${timeMinutes ? `เวลา: ${timeMinutes} นาที` : ''}<br>
        ${distanceKm ? `ระยะทาง: ${distanceKm} km` : ''}
      `).openPopup();
    }

    alert(`คำนวณขอบเขตสำเร็จ: ${result.coordinates.length} จุด`);
  } catch(e) {
    alert("คำนวณขอบเขตไม่ได้: " + e.message);
  }
}

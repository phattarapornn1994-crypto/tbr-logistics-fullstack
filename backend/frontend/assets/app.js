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
  const tb = $("#customers_tbody"); 
  if (tb) {
    tb.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.code}</td>
      <td>${r.name||""}</td>
      <td>${r.type||""}</td>
      <td>${(r.lat??"")}, ${(r.lng??"")}</td>
        <td><button class="btn text-xs" onclick="deleteCustomer('${r.code}')">ลบ</button></td>`;
    tb.appendChild(tr);
  });
  }
}

async function loadProductsTable(){
  try {
    const data = await api("/products");
    const tb = $("#products_table");
    if (tb) {
      tb.innerHTML = "";
      if (data.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">ยังไม่มีข้อมูลสินค้า กรุณาเพิ่มสินค้าเริ่มต้น</td></tr>';
      } else {
        data.forEach(p => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td class="font-semibold">${p.code}</td>
            <td>${p.name || ''}</td>
            <td><span class="badge">${p.category || ''}</span></td>
            <td class="text-xs">${p.width_cm}x${p.length_cm}x${p.height_cm} cm</td>
            <td class="text-xs font-semibold">${p.weight_kg} kg/${p.unit || 'ก้อน'}</td>
            <td><button class="btn text-xs" onclick="deleteProduct(${p.id})">ลบ</button></td>
          `;
          tb.appendChild(tr);
        });
      }
    }
  } catch(e) {
    console.error("Failed to load products table:", e);
    const tb = $("#products_table");
    if (tb) {
      tb.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-4">ไม่สามารถโหลดข้อมูลสินค้าได้</td></tr>';
    }
  }
}

async function addProduct(){
  try {
    const code = $("#product_code").value.trim();
    const name = $("#product_name").value.trim();
    const category = $("#product_category").value;
    const unit = $("#product_unit").value;
    const width_cm = parseFloat($("#product_width_cm").value || "0");
    const length_cm = parseFloat($("#product_length_cm").value || "0");
    const height_cm = parseFloat($("#product_height_cm").value || "0");
    const weight_kg = parseFloat($("#product_weight_kg").value || "0");
    const pieces_per_box = $("#product_pieces_per_box").value ? parseInt($("#product_pieces_per_box").value) : null;
    const stackableCheckbox = $("#product_stackable");
    const stackable = stackableCheckbox ? (stackableCheckbox.checked === true) : true;
    const max_stack = $("#product_max_stack").value ? parseInt($("#product_max_stack").value) : null;
    
    if (!code || !name) {
      alert("กรุณากรอกรหัสและชื่อสินค้า");
      return;
    }
    
    await api("/products", {
      method: "POST",
      json: {
        code,
        name,
        category,
        unit,
        width_cm,
        length_cm,
        height_cm,
        weight_kg,
        pieces_per_box,
        stackable,
        max_stack
      }
    });
    
    // ล้างฟอร์ม
    $("#product_code").value = "";
    $("#product_name").value = "";
    $("#product_width_cm").value = "";
    $("#product_length_cm").value = "";
    $("#product_height_cm").value = "";
    $("#product_weight_kg").value = "";
    $("#product_pieces_per_box").value = "";
    $("#product_max_stack").value = "";
    
    await loadProducts();
    await loadProductsTable();
    alert("เพิ่มสินค้าสำเร็จ");
  } catch(e) {
    console.error("Failed to add product:", e);
    alert("ไม่สามารถเพิ่มสินค้าได้: " + (e.message || "Unknown error"));
  }
}

async function deleteProduct(productId){
  if (!confirm("ยืนยันการลบสินค้า?")) return;
  try {
    await api(`/products/${productId}`, { method: "DELETE" });
    await loadProducts();
    await loadProductsTable();
  } catch(e) {
    console.error("Failed to delete product:", e);
    alert("ไม่สามารถลบสินค้าได้");
  }
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

async function seedDefaultProducts(){
  try {
    const defaultProducts = [
      {
        code: "BOTTLE_12",
        name: "ขวดเก่า (12 ใบ/กล่อง)",
        category: "ขวดเก่า",
        unit: "กล่อง",
        width_cm: 23,
        length_cm: 31,
        height_cm: 27,
        weight_kg: 5.5, // ประมาณน้ำหนักต่อกล่อง
        pieces_per_box: 12,
        stackable: true,
        max_stack: 10,
        note: "ขนาดกล่อง 23x31x27 cm"
      },
      {
        code: "BOTTLE_24",
        name: "ขวดเก่า (24 ใบ/กล่อง)",
        category: "ขวดเก่า",
        unit: "กล่อง",
        width_cm: 23,
        length_cm: 31,
        height_cm: 27,
        weight_kg: 11, // ประมาณน้ำหนักต่อกล่อง
        pieces_per_box: 24,
        stackable: true,
        max_stack: 10,
        note: "ขนาดกล่อง 23x31x27 cm"
      },
      {
        code: "PAPER_BALE",
        name: "PAPER อัดก้อน",
        category: "PAPER",
        unit: "ก้อน",
        width_cm: 100, // ~1.0-1.5m เฉลี่ย 1.25m
        length_cm: 125,
        height_cm: 100, // ~0.75-1.25m เฉลี่ย 1.0m
        weight_kg: 600, // ~400-800 kg เฉลี่ย 600 kg
        stackable: true,
        max_stack: 3,
        note: "ขนาดก้อน: 100x125x100 cm, น้ำหนัก: 600 kg/ก้อน"
      },
      {
        code: "PET_BALE",
        name: "PET อัดก้อน",
        category: "PET",
        unit: "ก้อน",
        width_cm: 80,
        length_cm: 110,
        height_cm: 120,
        weight_kg: 650,
        stackable: true,
        max_stack: 3,
        note: "ขนาดก้อน: 80x110x120 cm, น้ำหนัก: 650 kg/ก้อน"
      },
      {
        code: "HDPE_BALE",
        name: "HDPE อัดก้อน",
        category: "HDPE",
        unit: "ก้อน",
        width_cm: 80,
        length_cm: 110,
        height_cm: 120,
        weight_kg: 650,
        stackable: true,
        max_stack: 3,
        note: "ขนาดก้อน: 80x110x120 cm, น้ำหนัก: 650 kg/ก้อน"
      },
      {
        code: "UBC_BALE",
        name: "UBC อัดก้อน",
        category: "UBC",
        unit: "ก้อน",
        width_cm: 90,
        length_cm: 120,
        height_cm: 150,
        weight_kg: 700, // ~600-800 kg เฉลี่ย 700 kg
        stackable: true,
        max_stack: 3,
        note: "ขนาดก้อน: 90x120x150 cm, น้ำหนัก: 700 kg/ก้อน"
      }
    ];
    
    let created = 0;
    for (const product of defaultProducts) {
      try {
        // ตรวจสอบให้แน่ใจว่า stackable มีค่าเสมอ
        const productData = {
          ...product,
          stackable: product.stackable !== undefined ? product.stackable : true
        };
        await api("/products", { method: "POST", json: productData });
        created++;
      } catch(e) {
        // ถ้ามีอยู่แล้วข้าม
        if (e.message && (e.message.includes("already exists") || e.message.includes("403") || e.message.includes("400"))) {
          continue;
        }
        console.error("Failed to create product:", product.code, e);
      }
    }
    
    await loadProducts();
    alert(`เพิ่มสินค้าเริ่มต้นสำเร็จ: ${created} รายการ`);
  } catch(e) {
    console.error("Failed to seed products:", e);
    alert("ไม่สามารถเพิ่มสินค้าเริ่มต้นได้: " + e.message);
  }
}

function openProductManager(){
  // เปิด modal สำหรับจัดการสินค้า
  const modal = $("#product_modal");
  if (modal) {
    modal.classList.remove("hidden");
    loadProductsTableModal();
  }
}

async function loadProductsTableModal(){
  // โหลดตารางสินค้าใน modal โดยตรง
  try {
    const data = await api("/products");
    const tb = $("#products_table_modal");
    if (tb) {
      tb.innerHTML = "";
      if (data.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">ยังไม่มีข้อมูลสินค้า กรุณาเพิ่มสินค้าเริ่มต้น</td></tr>';
      } else {
        data.forEach(p => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td class="font-semibold">${p.code}</td>
            <td>${p.name || ''}</td>
            <td><span class="badge">${p.category || ''}</span></td>
            <td class="text-xs">${p.width_cm}x${p.length_cm}x${p.height_cm} cm</td>
            <td class="text-xs font-semibold">${p.weight_kg} kg/${p.unit || 'ก้อน'}</td>
            <td class="text-xs">${p.unit || 'ก้อน'}</td>
            <td class="text-xs">${p.stackable ? '✓' : '✗'}</td>
            <td><button class="btn text-xs" onclick="deleteProduct(${p.id})">ลบ</button></td>
          `;
          tb.appendChild(tr);
        });
      }
    }
  } catch(e) {
    console.error("Failed to load products table modal:", e);
    const tb = $("#products_table_modal");
    if (tb) {
      tb.innerHTML = '<tr><td colspan="8" class="text-center text-red-500 py-4">ไม่สามารถโหลดข้อมูลสินค้าได้</td></tr>';
    }
  }
}

function closeProductManager(){
  const modal = $("#product_modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

async function loadTestData(){
  try {
    // ใช้ข้อมูลตัวอย่างจาก seed customers และ vehicles
    await seedCustomers();
    await seedVehicles();
    await loadCustomers();
    await loadCustomersForPlan();
    
    // เพิ่มสินค้าเริ่มต้นถ้ายังไม่มี
    if (_productsList.length === 0) {
      await seedDefaultProducts();
    }
    
    // สร้างข้อมูลตัวอย่างแผน
    const sampleCustomers = _customersList.slice(0, 5); // ใช้ 5 ลูกค้าแรก
    
    // ล้างตารางเดิม
    $("#plan_lines").innerHTML = "";
    $("#return_lines").innerHTML = "";
    
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
    
    // เพิ่มข้อมูลลูกค้า พร้อมสินค้า
    const products = _productsList.length > 0 ? _productsList : [
      { code: "PAPER_BALE", name: "PAPER อัดก้อน" },
      { code: "PET_BALE", name: "PET อัดก้อน" },
      { code: "UBC_BALE", name: "UBC อัดก้อน" }
    ];
    
    sampleCustomers.forEach((cust, idx) => {
      addPlanRow();
      const rows = $$("#plan_lines tr");
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const tds = lastRow.querySelectorAll("td");
        const customerSelect = tds[0].querySelector("select");
        const productSelect = tds[1].querySelector("select");
        const quantityInput = tds[2].querySelector("input");
        const weightInput = tds[3].querySelector("input");
        const volumeInput = tds[4].querySelector("input");
        const typeInput = tds[5].querySelector("input");
        
        if (customerSelect) {
          customerSelect.value = cust.code;
          const event = new Event('change', { bubbles: true });
          customerSelect.dispatchEvent(event);
        }
        
        // เลือกสินค้าแบบสุ่ม
        const product = products[idx % products.length];
        if (productSelect && product) {
          productSelect.value = product.code;
          if (quantityInput) quantityInput.value = (Math.floor(Math.random() * 5) + 2).toString(); // 2-6 ก้อน/กล่อง
          const changeEvent = new Event('change', { bubbles: true });
          productSelect.dispatchEvent(changeEvent);
        } else {
          // ถ้าไม่มีสินค้า ให้กรอกเอง
          if (quantityInput) quantityInput.value = (Math.floor(Math.random() * 5) + 2).toString();
          if (weightInput) weightInput.value = (Math.random() * 3 + 1).toFixed(2);
          if (volumeInput) volumeInput.value = (Math.random() * 8 + 3).toFixed(2);
          if (typeInput) typeInput.value = "บรรจุภัณฑ์รีไซเคิล";
        }
      }
    });
    
    // เพิ่มตัวอย่าง return item (Double Handling)
    if (sampleCustomers.length > 0) {
      addReturnRow();
      const returnRows = $$("#return_lines tr");
      const returnRow = returnRows[returnRows.length - 1];
      if (returnRow) {
        const tds = returnRow.querySelectorAll("td");
        const customerSelect = tds[0].querySelector("select");
        const productSelect = tds[1].querySelector("select");
        const quantityInput = tds[2].querySelector("input");
        
        if (customerSelect) {
          customerSelect.value = sampleCustomers[0].code; // ใช้ลูกค้าแรก
        }
        if (productSelect && products.length > 0) {
          productSelect.value = products[0].code;
          if (quantityInput) quantityInput.value = "3"; // 3 ก้อน/กล่อง
          const changeEvent = new Event('change', { bubbles: true });
          productSelect.dispatchEvent(changeEvent);
        }
      }
    }
    
    alert(`โหลดข้อมูลตัวอย่างสำเร็จ: ${sampleCustomers.length} รายการส่งออก, 1 รายการกลับลาน`);
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

let _productsList = [];

async function loadProducts(){
  try {
    _productsList = await api("/products");
    updateProductOptions();
    await loadProductsTable();
  } catch(e) {
    console.error("Failed to load products:", e);
    _productsList = [];
  }
}

function updateProductOptions(){
  // อัปเดต product select ในทุกแถว
  $$("#plan_lines select.product-select, #return_lines select.product-select").forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- เลือกสินค้า --</option>';
    _productsList.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.code;
      opt.textContent = `${p.code} - ${p.name} (${p.category})`;
      select.appendChild(opt);
    });
    if (currentValue) select.value = currentValue;
  });
  
  // แสดงรายการสินค้า
  const productsDiv = $("#products_list");
  if (productsDiv && _productsList.length > 0) {
    productsDiv.innerHTML = `<div class="text-xs">มีสินค้า ${_productsList.length} รายการ: ${_productsList.map(p => p.name).join(", ")}</div>`;
  }
}

function addPlanRow(){
  const tb = $("#plan_lines");
  const tr = document.createElement("tr");
  const selectId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const productSelectId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  tr.innerHTML = `
    <td>
      <select id="${selectId}" class="input customer-select text-xs" onchange="updateCustomerInfo(this)">
        <option value="">-- เลือกลูกค้า --</option>
      </select>
    </td>
    <td>
      <select id="${productSelectId}" class="input product-select text-xs" onchange="updateProductInfo(this)">
        <option value="">-- เลือกสินค้า --</option>
      </select>
    </td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="จำนวน" min="0"/></td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="ตัน" min="0"/></td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="ลบ.ม." min="0"/></td>
    <td><input class="input text-xs" placeholder="ประเภท"/></td>
    <td><button class="btn text-xs" onclick="this.closest('tr').remove()">ลบ</button></td>`;
  tb.appendChild(tr);
  
  // เติมข้อมูลลูกค้าใน select
  const select = $(`#${selectId}`);
  _customersList.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = `${c.code} - ${c.name || ''}`;
    select.appendChild(opt);
  });
  
  // เติมข้อมูลสินค้าใน select
  const productSelect = $(`#${productSelectId}`);
  _productsList.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.code;
    opt.textContent = `${p.code} - ${p.name}`;
    productSelect.appendChild(opt);
  });
}

function addReturnRow(){
  const tb = $("#return_lines");
  const tr = document.createElement("tr");
  const selectId = `return_customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const productSelectId = `return_product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  tr.innerHTML = `
    <td>
      <select id="${selectId}" class="input customer-select text-xs" onchange="updateCustomerInfo(this)">
        <option value="">-- เลือกลูกค้า --</option>
      </select>
    </td>
    <td>
      <select id="${productSelectId}" class="input product-select text-xs" onchange="updateProductInfo(this)">
        <option value="">-- เลือกสินค้า --</option>
      </select>
    </td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="จำนวน" min="0"/></td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="ตัน" min="0"/></td>
    <td><input class="input text-xs" type="number" step="0.01" placeholder="ลบ.ม." min="0"/></td>
    <td><input class="input text-xs" placeholder="ประเภท"/></td>
    <td><button class="btn text-xs" onclick="this.closest('tr').remove()">ลบ</button></td>`;
  tb.appendChild(tr);
  
  // เติมข้อมูลลูกค้าใน select
  const select = $(`#${selectId}`);
  _customersList.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = `${c.code} - ${c.name || ''}`;
    select.appendChild(opt);
  });
  
  // เติมข้อมูลสินค้าใน select
  const productSelect = $(`#${productSelectId}`);
  _productsList.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.code;
    opt.textContent = `${p.code} - ${p.name}`;
    productSelect.appendChild(opt);
  });
}

function updateProductInfo(select){
  const productCode = select.value;
  const product = _productsList.find(p => p.code === productCode);
  if (product) {
    const tr = select.closest("tr");
    const tds = tr.querySelectorAll("td");
    
    // อัปเดตจำนวน, น้ำหนัก, ปริมาตร
    const quantityInput = tds[2].querySelector("input");
    const weightInput = tds[3].querySelector("input");
    const volumeInput = tds[4].querySelector("input");
    const typeInput = tds[5].querySelector("input");
    
    if (quantityInput && !quantityInput.value) {
      quantityInput.value = "1";
    }
    
    // คำนวณน้ำหนักและปริมาตรจากจำนวน
    if (quantityInput && quantityInput.value) {
      const qty = parseFloat(quantityInput.value) || 1;
      const weightKg = product.weight_kg * qty;
      const volumeCm3 = (product.length_cm * product.width_cm * product.height_cm) * qty;
      const volumeM3 = volumeCm3 / 1000000;
      
      if (weightInput) weightInput.value = (weightKg / 1000).toFixed(3); // แปลงเป็นตัน
      if (volumeInput) volumeInput.value = volumeM3.toFixed(3);
    }
    
    if (typeInput) typeInput.value = product.category;
  }
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
      const codeInput = tds[0].querySelector("select");
      const productInput = tds[1].querySelector("select");
      const quantityInput = tds[2].querySelector("input");
      const code = codeInput ? codeInput.value.trim() : "";
      const productCode = productInput ? productInput.value.trim() : "";
      const quantity = parseFloat(quantityInput ? quantityInput.value : "0");
      const w = parseFloat(tds[3].querySelector("input").value || "0");
      const v = parseFloat(tds[4].querySelector("input").value || "0");
      const mat = tds[5].querySelector("input").value.trim();
      if (code) {
        lines.push({ 
          customer_code: code, 
          w, 
          v, 
          mat,
          product_code: productCode || null,
          quantity: quantity || null,
          return_item: false
        });
      }
    });
    
    // อ่าน return_items
    const returnItems = [];
    $$("#return_lines tr").forEach(tr=>{
      const tds = tr.querySelectorAll("td");
      const codeInput = tds[0].querySelector("select");
      const productInput = tds[1].querySelector("select");
      const quantityInput = tds[2].querySelector("input");
      const code = codeInput ? codeInput.value.trim() : "";
      const productCode = productInput ? productInput.value.trim() : "";
      const quantity = parseFloat(quantityInput ? quantityInput.value : "0");
      const w = parseFloat(tds[3].querySelector("input").value || "0");
      const v = parseFloat(tds[4].querySelector("input").value || "0");
      const mat = tds[5].querySelector("input").value.trim();
      if (code) {
        returnItems.push({ 
          customer_code: code, 
          w, 
          v, 
          mat,
          product_code: productCode || null,
          quantity: quantity || null,
          return_item: true
        });
      }
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
      consider_hills: $("#consider_hills").checked,
      return_items: returnItems.length > 0 ? returnItems : null
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
  
  // อัปเดต route selector
  const selector = $("#route_selector");
  if (selector && plan.routes) {
    selector.innerHTML = '<option value="">-- เลือกเส้นทาง --</option>';
    plan.routes.forEach((r, idx) => {
      const vehicle = r.vehicle || {};
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `เส้นทาง ${idx + 1}: ${vehicle.plate || 'N/A'} (${(r.distanceKm||0).toFixed(2)} km)`;
      selector.appendChild(opt);
    });
  }
  
  const s = $("#plan_summary");
  if (!s) return;
  
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
    <div class="table-wrap" style="max-height: none; overflow-x: auto;">
      <table class="table" style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 12.5%;">จำนวนเส้นทาง</th>
            <th style="width: 12.5%;">รวมระยะทาง</th>
            <th style="width: 12.5%;">รวมต้นทุน</th>
            <th style="width: 12.5%;">ต้นทุน/กม.</th>
            <th style="width: 12.5%;">รวมน้ำหนัก</th>
            <th style="width: 12.5%;">รวมปริมาตร</th>
            <th style="width: 12.5%;">Utilization เฉลี่ย</th>
            <th style="width: 12.5%;">ระยะทางเฉลี่ย</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold text-green-700" style="text-align: center;">${totalRoutes} เส้นทาง</td>
            <td class="font-bold text-blue-700" style="text-align: center;">${(plan.totalKm||0).toFixed(2)} km</td>
            <td class="font-bold text-green-700" style="text-align: center;">${(plan.totalCost||0).toFixed(2)} บาท</td>
            <td class="font-bold text-purple-700" style="text-align: center;">${avgCostPerKm.toFixed(2)} บาท</td>
            <td class="font-bold text-gray-900" style="text-align: center;">${(plan.totalW||0).toFixed(2)} ตัน</td>
            <td class="font-bold text-gray-900" style="text-align: center;">${(plan.totalV||0).toFixed(2)} ลบ.ม.</td>
            <td class="font-bold ${totalUtilization >= 80 ? 'text-green-600' : totalUtilization >= 60 ? 'text-yellow-600' : 'text-red-600'}" style="text-align: center;">${totalUtilization.toFixed(1)}%</td>
            <td class="font-bold text-gray-900" style="text-align: center;">${avgDistancePerRoute.toFixed(2)} km</td>
          </tr>
        </tbody>
      </table>
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
    routeDiv.className = "p-4 border border-gray-200 rounded-lg bg-white shadow-sm";
    routeDiv.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="font-semibold text-sm">🚚 เส้นทาง ${i+1}: ${vehicle.plate||"-"} (${vehicle.type||"-"})</div>
        <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${orders.length} จุด</div>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-3 text-xs">
        <div class="bg-blue-50 p-2 rounded"><span class="text-gray-600 block mb-1">ระยะทาง</span> <span class="font-bold text-blue-700">${(r.distanceKm||0).toFixed(2)} km</span></div>
        <div class="bg-green-50 p-2 rounded"><span class="text-gray-600 block mb-1">ต้นทุน</span> <span class="font-bold text-green-700">${(r.cost||0).toFixed(2)} บาท</span></div>
        <div class="bg-purple-50 p-2 rounded"><span class="text-gray-600 block mb-1">เวลา</span> <span class="font-bold text-purple-700">${((r.distanceKm||0)/60).toFixed(1)} ชม.</span></div>
      </div>
      <div class="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
        <strong class="block mb-2">ลำดับการส่ง:</strong> 
        <div class="flex flex-wrap gap-1">${orders.map((o, idx) => `<span class="bg-white px-2 py-1 rounded border">${idx+1}. ${o.code}</span>`).join("")}</div>
      </div>
      ${emptyReturnKm > 0.1 && emptyReturnKm > 5 ? `<div class="mt-3 text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">⚠️ กลับเปล่า ${emptyReturnKm.toFixed(2)} km</div>` : ''}`;
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

  // วาดแผนที่ - วาดทั้ง Leaflet และ Longdo Map
  drawMap(plan);
  
  // วาด Longdo Map อัตโนมัติเมื่อแสดงผลลัพธ์
  // ตรวจสอบว่ามี Longdo Map อยู่แล้วหรือไม่ ถ้าไม่มีให้ initialize ก่อน
  if (typeof longdo !== 'undefined') {
    const mapDiv = document.getElementById('map');
    if (mapDiv && !_longdoMap) {
      // Initialize Longdo Map ถ้ายังไม่มี
      mapDiv.innerHTML = ''; // Clear existing map
      _longdoMap = new longdo.Map({
        placeholder: mapDiv,
        zoom: 10,
        pitch: 45, // 3D view
        lastView: false
      });
      
      _longdoMap.Event.bind("ready", async function() {
        // เพิ่ม Traffic Layer
        if (window.longdo && window.longdo.Layers) {
          try {
            _longdoMap.Layers.insert(1, window.longdo.Layers.TRAFFIC);
          } catch(e) {
            console.warn("Error adding traffic layer:", e);
          }
        }
        
        // วาดแผนที่ใหม่เมื่อ ready
        try {
          await drawLongdoMap(plan);
        } catch(e) {
          console.warn("Error drawing Longdo Map after ready:", e);
        }
      });
    } else if (_longdoMap) {
      // ถ้ามี Longdo Map อยู่แล้ว ให้วาดแผนที่ใหม่ทันที
      setTimeout(async () => {
        try {
          await drawLongdoMap(plan);
        } catch(e) {
          console.warn("Error drawing Longdo Map:", e);
        }
      }, 300);
    }
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
    
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;
    
    if (!_longdoMap && typeof longdo !== 'undefined') {
      mapDiv.innerHTML = ''; // Clear Leaflet map
      _longdoMap = new longdo.Map({
        placeholder: mapDiv,
        zoom: 10,
        pitch: 45, // 3D view
        lastView: false
      });
      
      _longdoMap.Event.bind("ready", function() {
        // เพิ่ม Traffic Layer
        if (window.longdo && window.longdo.Layers) {
          try {
            _longdoMap.Layers.insert(1, window.longdo.Layers.TRAFFIC);
          } catch(e) {
            console.warn("Error adding traffic layer:", e);
          }
        }
        
        // วาดแผนที่ใหม่ถ้ามีข้อมูล - รอให้ map ready ก่อน
        if (_currentPlanResult) {
          setTimeout(() => {
            drawLongdoMap(_currentPlanResult).catch(e => {
              console.warn("Error drawing Longdo Map after switch:", e);
            });
          }, 300);
        }
      });
    } else if (_longdoMap && _currentPlanResult) {
      // ถ้ามี Longdo Map อยู่แล้ว ให้วาดแผนที่ใหม่
      setTimeout(() => {
        drawLongdoMap(_currentPlanResult).catch(e => {
          console.warn("Error redrawing Longdo Map:", e);
        });
      }, 100);
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

function initLongdoMap(){
  if (typeof longdo === 'undefined') {
    console.warn("Longdo Map API not loaded");
    return false;
  }
  
  const mapDiv = document.getElementById('map');
  if (!mapDiv) return false;
  
  mapDiv.innerHTML = ''; // Clear existing map
  _longdoMap = new longdo.Map({
    placeholder: mapDiv,
    zoom: 10,
    pitch: 45, // เพิ่มมิติ 3D
    lastView: false
  });
  
  _longdoMap.Event.bind("ready", function() {
    // เพิ่ม Traffic Layer
    if (window.longdo && window.longdo.Layers) {
      _longdoMap.Layers.insert(1, window.longdo.Layers.TRAFFIC);
    }
    
    // เพิ่ม 3D objects layer (optional)
    if (window.deck && window.deck.ScenegraphLayer) {
      try {
        const scale = 2;
        const data = [{
          coordinates: [100.5, 13.7, 0],
          scale: [scale, scale, scale],
          color: [0, 255, 0, 255],
          translation: [0, 0, 0],
        }];
        
        const layer = new window.deck.MapboxLayer({
          id: "scenegraph-layer",
          type: window.deck.ScenegraphLayer,
          data,
          scenegraph: "https://maplibre.org/maplibre-gl-js/docs/assets/34M_17/34M_17.gltf",
          getPosition: (d) => d.coordinates,
          getScale: (d) => d.scale,
          getTranslation: (d) => d.translation,
          opacity: 1,
          _lighting: "pbr",
          parameters: { depthTest: true },
        });
        _longdoMap.Layers.insert("", layer);
      } catch(e) {
        console.log("3D layer not available:", e);
      }
    }
  });
  
  return true;
}

async function drawLongdoMap(plan){
  if (!_longdoMap) {
    if (!initLongdoMap()) {
      console.warn("Failed to initialize Longdo Map");
      return;
    }
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
  
  // Clear existing - เพิ่ม error handling
  try {
    if (_longdoMap && _longdoMap.Overlays) {
      _longdoMap.Overlays.clear();
    }
    if (_longdoMap && _longdoMap.Route) {
      _longdoMap.Route.clear();
    }
  } catch(e) {
    console.warn("Error clearing Longdo Map overlays:", e);
  }
  _routeResults = [];
  
  const routeResultDiv = document.getElementById('route_result');
  if (routeResultDiv) routeResultDiv.innerHTML = '';
  
  // ตรวจสอบว่ามี plan data
  if (!plan || !plan.origin_lng || !plan.origin_lat) {
    console.warn("Invalid plan data for Longdo Map");
    return;
  }
  
  // จุดเริ่มต้น - เพิ่ม error handling
  try {
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
    if (_longdoMap && _longdoMap.Overlays) {
      _longdoMap.Overlays.add(originMarker);
    }
  } catch(e) {
    console.warn("Error adding origin marker:", e);
  }
  
  // วาดเส้นทางและลูกค้า - แสดงทุกเส้นทางพร้อม markers
  const routeColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  // วาดเส้นทางทั้งหมด
  for (let idx = 0; idx < (plan.routes || []).length; idx++) {
    const r = plan.routes[idx];
    const color = routeColors[idx % routeColors.length];
    const orders = r.orders || [];
    const vehicle = r.vehicle || {};
    
    // สร้าง waypoints สำหรับเส้นทาง
    const waypoints = [
      { lon: plan.origin_lng, lat: plan.origin_lat, label: 'จุดเริ่มต้น', type: 'origin' }
    ];
    
    for (let oIdx = 0; oIdx < orders.length; oIdx++) {
      const o = orders[oIdx];
      waypoints.push({ 
        lon: o.lng, 
        lat: o.lat, 
        label: `${oIdx + 1}. ${o.code}`,
        type: 'customer',
        order: o
      });
      
      // เพิ่ม marker สำหรับลูกค้า - แสดงพิกัดและข้อมูล - เพิ่ม error handling
      try {
        if (!o.lng || !o.lat || isNaN(o.lng) || isNaN(o.lat)) {
          console.warn(`Invalid coordinates for customer ${o.code}:`, o);
          continue;
        }
        const customerMarker = new longdo.Marker(
          { lon: o.lng, lat: o.lat },
          { 
            title: `${o.code} - ${o.name || ''}`,
            detail: `พิกัด: ${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}\nน้ำหนัก: ${(o.w||0).toFixed(2)} ตัน | ปริมาตร: ${(o.v||0).toFixed(2)} ลบ.ม.`,
            icon: { url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="13" fill="${color}" stroke="white" stroke-width="2" opacity="0.9"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${oIdx + 1}</text>
              </svg>
            `) }
          }
        );
        if (_longdoMap && _longdoMap.Overlays) {
          _longdoMap.Overlays.add(customerMarker);
        }
      } catch(e) {
        console.warn(`Error adding marker for customer ${o.code}:`, e);
      }
    }
    
    // กลับจุดเริ่มต้น
    waypoints.push({ 
      lon: plan.origin_lng, 
      lat: plan.origin_lat, 
      label: 'กลับลาน',
      type: 'return'
    });
    
    // ใช้ Route API เพื่อวาดเส้นทาง - วาดแต่ละเส้นทางแยกกัน - เพิ่ม error handling
    try {
      if (idx === 0) {
        // เส้นทางแรก - ใช้ Route API
        if (_longdoMap && _longdoMap.Route) {
          _longdoMap.Route.clear();
          
          // เพิ่ม waypoints
          waypoints.forEach(wp => {
            if (wp.lon && wp.lat && !isNaN(wp.lon) && !isNaN(wp.lat)) {
              try {
                _longdoMap.Route.add({ lon: wp.lon, lat: wp.lat });
              } catch(e) {
                console.warn("Error adding waypoint:", wp, e);
              }
            }
          });
          
          // ตั้งค่า Route options (ถ้ามี)
          if (longdo && longdo.RouteMode && _longdoMap.Route && typeof _longdoMap.Route.mode === 'function') {
            try {
              _longdoMap.Route.mode(longdo.RouteMode.FASTEST);
            } catch(e) {
              console.log("Route.mode not available:", e);
            }
          }
          
          // ตั้งค่า placeholder สำหรับแสดงผลลัพธ์เฉพาะเส้นทางแรก
          if (routeResultDiv && _longdoMap.Route && typeof _longdoMap.Route.placeholder === 'function') {
            try {
              _longdoMap.Route.placeholder(routeResultDiv);
            } catch(e) {
              console.warn("Error setting route placeholder:", e);
            }
          }
          
          // ค้นหาเส้นทาง
          if (_longdoMap.Route && typeof _longdoMap.Route.search === 'function') {
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
              console.warn("Route search error:", e);
            }
          }
        }
      } else {
        // เส้นทางอื่นๆ - วาดด้วย polyline
        try {
          const validWaypoints = waypoints.filter(wp => wp.lon && wp.lat && !isNaN(wp.lon) && !isNaN(wp.lat));
          if (validWaypoints.length > 0 && _longdoMap && _longdoMap.Overlays) {
            const polyline = new longdo.Polyline(
              validWaypoints.map(wp => ({ lon: wp.lon, lat: wp.lat })),
              {
                lineColor: color,
                lineWidth: 3,
                opacity: 0.7
              }
            );
            _longdoMap.Overlays.add(polyline);
          }
        } catch(e) {
          console.warn("Error adding polyline:", e);
        }
      }
    } catch(e) {
      console.warn(`Error drawing route ${idx + 1}:`, e);
    }
    
    // สร้างคำอธิบายเส้นทาง
    await generateRouteExplanation(r, idx, plan, routeResultDiv);
  }
  
  // Fit bounds - ใช้ bound() เพื่อแสดงขอบเขตที่ครอบคลุมทุกจุด - เพิ่ม error handling
  try {
    if (plan.routes && plan.routes.length > 0 && _longdoMap) {
      const allLons = [plan.origin_lng];
      const allLats = [plan.origin_lat];
      
      plan.routes.forEach(r => {
        (r.orders || []).forEach(o => {
          if (o.lng && o.lat && !isNaN(o.lng) && !isNaN(o.lat)) {
            allLons.push(o.lng);
            allLats.push(o.lat);
          }
        });
      });
      
      if (allLons.length > 1 && allLats.length > 1) {
        const minLon = Math.min(...allLons);
        const maxLon = Math.max(...allLons);
        const minLat = Math.min(...allLats);
        const maxLat = Math.max(...allLats);
        
        // ใช้ bound() เพื่อแสดงขอบเขต
        if (_longdoMap.bound && typeof _longdoMap.bound === 'function') {
          try {
            _longdoMap.bound({
              minLon: minLon,
              minLat: minLat,
              maxLon: maxLon,
              maxLat: maxLat
            });
          } catch(e) {
            console.warn("Error setting bounds:", e);
          }
        }
        
        // หรือใช้ location() เพื่อไปยังจุดกึ่งกลาง
        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;
        if (_longdoMap.location && typeof _longdoMap.location === 'function') {
          try {
            _longdoMap.location({ lon: centerLon, lat: centerLat }, true);
          } catch(e) {
            console.warn("Error setting location:", e);
          }
        }
        
        // ปรับ zoom ให้เหมาะสม
        const lonDiff = maxLon - minLon;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lonDiff, latDiff);
        
        // คำนวณ zoom level จากขอบเขต
        let zoomLevel = 10;
        if (maxDiff > 5) zoomLevel = 7;
        else if (maxDiff > 2) zoomLevel = 8;
        else if (maxDiff > 1) zoomLevel = 9;
        else if (maxDiff > 0.5) zoomLevel = 10;
        else if (maxDiff > 0.2) zoomLevel = 11;
        else zoomLevel = 12;
        
        if (_longdoMap.zoom && typeof _longdoMap.zoom === 'function') {
          try {
            _longdoMap.zoom(zoomLevel, true);
          } catch(e) {
            console.warn("Error setting zoom:", e);
          }
        }
      }
    } else if (_longdoMap && plan.origin_lng && plan.origin_lat) {
      // ถ้าไม่มีเส้นทาง ให้ไปยังจุดเริ่มต้น
      if (_longdoMap.location && typeof _longdoMap.location === 'function') {
        try {
          _longdoMap.location({ lon: plan.origin_lng, lat: plan.origin_lat }, true);
        } catch(e) {
          console.warn("Error setting origin location:", e);
        }
      }
    }
  } catch(e) {
    console.warn("Error fitting bounds:", e);
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

// ---------- Longdo Map Controls ----------
function longdoZoomIn(){
  if (_longdoMap) {
    _longdoMap.zoom(true, true);
  }
}

function longdoZoomOut(){
  if (_longdoMap) {
    _longdoMap.zoom(false, true);
  }
}

function longdoGetCurrentLocation(){
  if (_longdoMap) {
    // ไปยังตำแหน่งปัจจุบัน (Geolocation)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          _longdoMap.location({ 
            lon: position.coords.longitude, 
            lat: position.coords.latitude 
          }, true);
          _longdoMap.zoom(15, true);
        },
        (error) => {
          alert("ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้");
        }
      );
    } else {
      // ถ้าไม่มี Geolocation ให้ใช้ location mode
      if (longdo.LocationMode) {
        _longdoMap.location(longdo.LocationMode.Geolocation);
      }
    }
  }
}

function longdoShowBounds(){
  if (_longdoMap) {
    const bounds = _longdoMap.bound();
    const zoomRange = _longdoMap.zoomRange();
    const currentLocation = _longdoMap.location();
    
    alert(`ขอบเขตแผนที่:\n` +
      `Min: ${bounds?.minLat?.toFixed(4)}, ${bounds?.minLon?.toFixed(4)}\n` +
      `Max: ${bounds?.maxLat?.toFixed(4)}, ${bounds?.maxLon?.toFixed(4)}\n\n` +
      `Zoom Range: ${zoomRange?.min || 'N/A'} - ${zoomRange?.max || 'N/A'}\n` +
      `ตำแหน่งปัจจุบัน: ${currentLocation?.lat?.toFixed(4)}, ${currentLocation?.lon?.toFixed(4) || currentLocation?.lng?.toFixed(4)}`
    );
  }
}

// ---------- Route Detail Analysis ----------
let _selectedRouteIndex = null;
let _routeDetailMap = null;
let _routeDetailLongdoMap = null;
let _routeDetailLayer = null;
let _routeWaypoints = [];
let _currentRouteMapLayer = 'osm';

function selectRouteForDetail(){
  const selector = $("#route_selector");
  if (!selector || !selector.value) {
    _selectedRouteIndex = null;
    return;
  }
  
  _selectedRouteIndex = parseInt(selector.value);
  if (!_currentPlanResult || !_currentPlanResult.routes) return;
  
  const route = _currentPlanResult.routes[_selectedRouteIndex];
  if (!route) return;
  
  displayRouteDetail(route, _selectedRouteIndex);
}

function displayRouteDetail(route, routeIndex){
  const plan = _currentPlanResult;
  if (!plan || !route) return;
  
  const orders = route.orders || [];
  const vehicle = route.vehicle || {};
  
  // แสดงข้อมูลเส้นทาง
  const infoDiv = $("#route_detail_info");
  if (infoDiv) {
    const totalW = orders.reduce((s, o) => s + (o.w || 0), 0);
    const totalV = orders.reduce((s, o) => s + (o.v || 0), 0);
    const wUtil = vehicle.capW > 0 ? (totalW / vehicle.capW * 100) : 0;
    const vUtil = vehicle.capV > 0 ? (totalV / vehicle.capV * 100) : 0;
    const avgUtil = (wUtil + vUtil) / 2;
    const costPerTon = totalW > 0 ? (route.cost / totalW) : 0;
    const costPerKm = route.distanceKm > 0 ? (route.cost / route.distanceKm) : 0;
    
    infoDiv.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <div class="text-gray-600 mb-1">เส้นทาง</div>
          <div class="font-bold text-base">${routeIndex + 1} - ${vehicle.plate || 'N/A'}</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">ระยะทาง</div>
          <div class="font-bold text-base text-blue-700">${(route.distanceKm||0).toFixed(2)} km</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">ต้นทุน</div>
          <div class="font-bold text-base text-green-700">${(route.cost||0).toFixed(2)} บาท</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">Utilization</div>
          <div class="font-bold text-base ${avgUtil >= 80 ? 'text-green-600' : avgUtil >= 60 ? 'text-yellow-600' : 'text-red-600'}">${avgUtil.toFixed(1)}%</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">จำนวนจุด</div>
          <div class="font-bold">${orders.length} จุด</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">ต้นทุน/ตัน</div>
          <div class="font-bold">${costPerTon.toFixed(2)} บาท</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">ต้นทุน/กม.</div>
          <div class="font-bold">${costPerKm.toFixed(2)} บาท</div>
        </div>
        <div>
          <div class="text-gray-600 mb-1">น้ำหนักรวม</div>
          <div class="font-bold">${totalW.toFixed(2)} ตัน</div>
        </div>
      </div>
    `;
  }
  
  // เตรียม waypoints
  _routeWaypoints = [
    { lon: plan.origin_lng, lat: plan.origin_lat, label: 'จุดเริ่มต้น', type: 'origin' }
  ];
  orders.forEach((o, idx) => {
    _routeWaypoints.push({
      lon: o.lng,
      lat: o.lat,
      label: `${o.code} - ${o.name || ''}`,
      type: 'customer',
      order: o
    });
  });
  _routeWaypoints.push({
    lon: plan.origin_lng,
    lat: plan.origin_lat,
    label: 'กลับลาน',
    type: 'return'
  });
  
  // วาดแผนที่
  drawRouteDetailMap(plan, route, routeIndex);
  
  // วาด Longdo Route ถ้าเลือกใช้
  if (_currentRouteMapLayer === 'longdo') {
    drawLongdoRouteDetail(plan, route, routeIndex);
  }
}

function drawRouteDetailMap(plan, route, routeIndex){
  const mapDiv = document.getElementById('route_detail_map');
  if (!mapDiv) return;
  
  // ใช้ Leaflet
  if (!_routeDetailMap) {
    _routeDetailMap = L.map('route_detail_map').setView([plan.origin_lat, plan.origin_lng], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(_routeDetailMap);
    _routeDetailLayer = L.layerGroup().addTo(_routeDetailMap);
  } else {
    _routeDetailLayer.clearLayers();
  }
  
  const orders = route.orders || [];
  const routeColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const color = routeColors[routeIndex % routeColors.length];
  
  // จุดเริ่มต้น
  const originIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  
  L.marker([plan.origin_lat, plan.origin_lng], { icon: originIcon })
    .addTo(_routeDetailLayer)
    .bindPopup(`<strong>📍 จุดเริ่มต้น (ลาน)</strong><br>${plan.name || 'Origin'}`);
  
  // ลูกค้า
  const bounds = [[plan.origin_lat, plan.origin_lng]];
  orders.forEach((o, idx) => {
    bounds.push([o.lat, o.lng]);
    
    const customerIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${idx + 1}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    L.marker([o.lat, o.lng], { icon: customerIcon })
      .addTo(_routeDetailLayer)
      .bindPopup(`
        <strong>${o.code} - ${o.name || ''}</strong><br>
        น้ำหนัก: ${(o.w||0).toFixed(2)} ตัน<br>
        ปริมาตร: ${(o.v||0).toFixed(2)} ลบ.ม.
      `);
  });
  
  // เส้นทาง
  const routePoints = [
    [plan.origin_lat, plan.origin_lng],
    ...orders.map(o => [o.lat, o.lng]),
    [plan.origin_lat, plan.origin_lng]
  ];
  
  L.polyline(routePoints, {
    color: color,
    weight: 5,
    opacity: 0.8
  }).addTo(_routeDetailLayer);
  
  // Fit bounds
  if (bounds.length > 1) {
    _routeDetailMap.fitBounds(bounds, { padding: [50, 50] });
  }
}

async function drawLongdoRouteDetail(plan, route, routeIndex){
  const mapDiv = document.getElementById('route_detail_map');
  const resultDiv = document.getElementById('route_detail_result');
  if (!mapDiv || !resultDiv) return;
  
  // ถ้ายังไม่ใช่ Longdo Map ให้สลับ
  if (!_routeDetailLongdoMap) {
    if (_routeDetailMap) {
      _routeDetailMap.remove();
      _routeDetailMap = null;
    }
    
    if (typeof longdo === 'undefined') {
      console.warn("Longdo Map API not loaded");
      return;
    }
    
    mapDiv.innerHTML = '';
    _routeDetailLongdoMap = new longdo.Map({
      placeholder: mapDiv,
      zoom: 10,
      pitch: 45,
      lastView: false
    });
    
    _routeDetailLongdoMap.Event.bind("ready", function() {
      if (window.longdo && window.longdo.Layers) {
        _routeDetailLongdoMap.Layers.insert(1, window.longdo.Layers.TRAFFIC);
      }
      
      // ตั้งค่า Route placeholder
      _routeDetailLongdoMap.Route.placeholder(resultDiv);
      
      // เพิ่ม waypoints
      _routeDetailLongdoMap.Route.clear();
      _routeWaypoints.forEach(wp => {
        if (wp.type === 'origin') {
          const marker = new longdo.Marker(
            { lon: wp.lon, lat: wp.lat },
            { title: '📍 จุดเริ่มต้น (ลาน)', detail: plan.name || 'Origin' }
          );
          _routeDetailLongdoMap.Route.add(marker);
        } else if (wp.type === 'customer') {
          const marker = new longdo.Marker(
            { lon: wp.lon, lat: wp.lat },
            { 
              title: wp.label,
              detail: `น้ำหนัก: ${(wp.order.w||0).toFixed(2)} ตัน | ปริมาตร: ${(wp.order.v||0).toFixed(2)} ลบ.ม.`
            }
          );
          _routeDetailLongdoMap.Route.add(marker);
        } else {
          _routeDetailLongdoMap.Route.add({ lon: wp.lon, lat: wp.lat });
        }
      });
      
      // ตั้งค่า Route options
      if (longdo.RouteMode && typeof _routeDetailLongdoMap.Route.mode === 'function') {
        try {
          _routeDetailLongdoMap.Route.mode(longdo.RouteMode.FASTEST);
        } catch(e) {
          console.log("Route.mode not available:", e);
        }
      }
      // Route.type อาจไม่มีใน Longdo Map API v3
      // if (longdo.RouteType && typeof _routeDetailLongdoMap.Route.type === 'function') {
      //   try {
      //     _routeDetailLongdoMap.Route.type(longdo.RouteType.CAR);
      //   } catch(e) {
      //     console.log("Route.type not available:", e);
      //   }
      // }
      
      // ค้นหาเส้นทาง
      try {
        _routeDetailLongdoMap.Route.search();
      } catch(e) {
        console.log("Route search error:", e);
      }
      
      // Fit bounds
      const allLons = _routeWaypoints.map(wp => wp.lon);
      const allLats = _routeWaypoints.map(wp => wp.lat);
      const minLon = Math.min(...allLons);
      const maxLon = Math.max(...allLons);
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      
      _routeDetailLongdoMap.bound({
        minLon: minLon,
        minLat: minLat,
        maxLon: maxLon,
        maxLat: maxLat
      });
    });
  } else {
    // ถ้ามี Longdo Map อยู่แล้ว ให้อัปเดต
    _routeDetailLongdoMap.Route.clear();
    _routeDetailLongdoMap.Route.placeholder(resultDiv);
    _routeWaypoints.forEach(wp => {
      if (wp.type === 'origin' || wp.type === 'customer') {
        const marker = new longdo.Marker(
          { lon: wp.lon, lat: wp.lat },
          { title: wp.label, detail: wp.order ? `น้ำหนัก: ${(wp.order.w||0).toFixed(2)} ตัน` : '' }
        );
        _routeDetailLongdoMap.Route.add(marker);
      } else {
        _routeDetailLongdoMap.Route.add({ lon: wp.lon, lat: wp.lat });
      }
    });
    _routeDetailLongdoMap.Route.search();
  }
}

function switchRouteMapLayer(type){
  _currentRouteMapLayer = type;
  
  if (type === 'longdo') {
    if (_routeDetailMap) {
      _routeDetailMap.remove();
      _routeDetailMap = null;
    }
    if (_currentPlanResult && _selectedRouteIndex !== null) {
      const route = _currentPlanResult.routes[_selectedRouteIndex];
      if (route) {
        drawLongdoRouteDetail(_currentPlanResult, route, _selectedRouteIndex);
      }
    }
  } else {
    if (_routeDetailLongdoMap) {
      const mapDiv = document.getElementById('route_detail_map');
      if (mapDiv) mapDiv.innerHTML = '';
      _routeDetailLongdoMap = null;
    }
    if (_currentPlanResult && _selectedRouteIndex !== null) {
      const route = _currentPlanResult.routes[_selectedRouteIndex];
      if (route) {
        drawRouteDetailMap(_currentPlanResult, route, _selectedRouteIndex);
      }
    }
  }
}

function addWaypointToRoute(){
  if (!_routeDetailLongdoMap || _selectedRouteIndex === null) {
    alert("กรุณาเลือกเส้นทางและใช้ Longdo Map ก่อน");
    return;
  }
  
  const lon = prompt("ลองจิจูด (Lng):");
  const lat = prompt("ละติจูด (Lat):");
  
  if (lon && lat) {
    const lonNum = parseFloat(lon);
    const latNum = parseFloat(lat);
    
    if (!isNaN(lonNum) && !isNaN(latNum)) {
      _routeDetailLongdoMap.Route.add({ lon: lonNum, lat: latNum });
      _routeDetailLongdoMap.Route.search();
      
      _routeWaypoints.push({
        lon: lonNum,
        lat: latNum,
        label: `จุดเพิ่มเติม ${_routeWaypoints.length}`,
        type: 'custom'
      });
    } else {
      alert("กรุณากรอกพิกัดที่ถูกต้อง");
    }
  }
}

function recalculateRoute(){
  if (!_routeDetailLongdoMap || _selectedRouteIndex === null) {
    alert("กรุณาเลือกเส้นทางและใช้ Longdo Map ก่อน");
    return;
  }
  
  _routeDetailLongdoMap.Route.search();
}

function routeZoomIn(){
  if (_routeDetailLongdoMap) {
    _routeDetailLongdoMap.zoom(true, true);
  } else if (_routeDetailMap) {
    _routeDetailMap.zoomIn();
  }
}

function routeZoomOut(){
  if (_routeDetailLongdoMap) {
    _routeDetailLongdoMap.zoom(false, true);
  } else if (_routeDetailMap) {
    _routeDetailMap.zoomOut();
  }
}

function routeGetCurrentLocation(){
  if (_routeDetailLongdoMap) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          _routeDetailLongdoMap.location({ 
            lon: position.coords.longitude, 
            lat: position.coords.latitude 
          }, true);
          _routeDetailLongdoMap.zoom(15, true);
        },
        (error) => {
          alert("ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้");
        }
      );
    }
  } else if (_routeDetailMap) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          _routeDetailMap.setView([position.coords.latitude, position.coords.longitude], 15);
        },
        (error) => {
          alert("ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้");
        }
      );
    }
  }
}

function routeShowBounds(){
  if (_routeDetailLongdoMap) {
    const bounds = _routeDetailLongdoMap.bound();
    const zoomRange = _routeDetailLongdoMap.zoomRange();
    const currentLocation = _routeDetailLongdoMap.location();
    
    alert(`ขอบเขตแผนที่:\n` +
      `Min: ${bounds?.minLat?.toFixed(4)}, ${bounds?.minLon?.toFixed(4)}\n` +
      `Max: ${bounds?.maxLat?.toFixed(4)}, ${bounds?.maxLon?.toFixed(4)}\n\n` +
      `Zoom Range: ${zoomRange?.min || 'N/A'} - ${zoomRange?.max || 'N/A'}\n` +
      `ตำแหน่งปัจจุบัน: ${currentLocation?.lat?.toFixed(4)}, ${currentLocation?.lon?.toFixed(4) || currentLocation?.lng?.toFixed(4)}`
    );
  } else if (_routeDetailMap) {
    const bounds = _routeDetailMap.getBounds();
    const center = _routeDetailMap.getCenter();
    const zoom = _routeDetailMap.getZoom();
    
    alert(`ขอบเขตแผนที่:\n` +
      `Min: ${bounds.getSouth().toFixed(4)}, ${bounds.getWest().toFixed(4)}\n` +
      `Max: ${bounds.getNorth().toFixed(4)}, ${bounds.getEast().toFixed(4)}\n\n` +
      `จุดกึ่งกลาง: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}\n` +
      `Zoom Level: ${zoom}`
    );
  }
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
  
  // โหลดสินค้า
  loadProducts();
  
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
// เก็บ reference ของฟังก์ชันเดิมก่อน override
const originalOpenTab = openTab;
window.openTab = function(name) {
  originalOpenTab(name);
  if (name === 'products') {
    loadProductsTable();
  }
};
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

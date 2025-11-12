const API = () => window.API_BASE.replace(/\/$/, '')
const qs = (s, el=document) => el.querySelector(s)
const qsa = (s, el=document) => [...el.querySelectorAll(s)]
const fmt = (n, d=2) => Number(n||0).toFixed(d)

function openTab(name){
  qsa('.tab').forEach(el=>el.classList.remove('active'))
  qs('#tab-'+name).classList.add('active')
  if(name==='result'){ initMap(); renderResult() }
  if(name==='master'){ loadCustomers(); loadVehicles() }
}

async function loadCustomers(){
  const q = qs('#cust_search')?.value || ''
  const res = await fetch(`${API()}/customers?q=${encodeURIComponent(q)}`)
  const rows = await res.json()
  const tb = qs('#customers_tbody'); tb.innerHTML=''
  rows.forEach(c=>{
    const tr=document.createElement('tr')
    tr.innerHTML = `<td>${c.code}</td><td>${c.name}</td><td>${c.type||''}</td><td>${fmt(c.lat,4)}, ${fmt(c.lng,4)}</td>
    <td class='text-right'><button class='btn' onclick="fillCustomer('${c.code}')">แก้ไข</button>
    <button class='btn' onclick="delCustomer('${c.code}')">ลบ</button></td>`
    tb.appendChild(tr)
  })
}
async function saveCustomer(){
  const payload = {
    code: val('cust_code'), name: val('cust_name'), contact: val('cust_contact'),
    type: val('cust_type'), hours: val('cust_hours'), note: val('cust_note'), addr: val('cust_addr'),
    lat: parseFloat(val('cust_lat')), lng: parseFloat(val('cust_lng'))
  }
  if(!payload.code || !payload.name){ alert('กรุณากรอกรหัสและชื่อ'); return }
  await fetch(`${API()}/customers`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
  clearCustomerForm(); loadCustomers(); rebuildPlanCustomerOptions()
}
async function delCustomer(code){ if(!confirm('ลบลูกค้า '+code+' ?')) return; await fetch(`${API()}/customers/${code}`, {method:'DELETE'}); loadCustomers(); rebuildPlanCustomerOptions() }
async function fillCustomer(code){
  const res = await fetch(`${API()}/customers?q=${encodeURIComponent(code)}`)
  const [c] = await res.json()
  if(!c) return
  setVal('cust_code', c.code); setVal('cust_name', c.name); setVal('cust_contact', c.contact||'')
  setVal('cust_type', c.type||''); setVal('cust_hours', c.hours||''); setVal('cust_note', c.note||'')
  setVal('cust_addr', c.addr||''); setVal('cust_lat', c.lat); setVal('cust_lng', c.lng)
}
function clearCustomerForm(){ ['cust_code','cust_name','cust_contact','cust_type','cust_hours','cust_note','cust_addr','cust_lat','cust_lng'].forEach(id=>setVal(id,'')) }

async function loadVehicles(){
  const q = qs('#veh_search')?.value || ''
  const res = await fetch(`${API()}/vehicles?q=${encodeURIComponent(q)}`)
  const rows = await res.json()
  const tb = qs('#vehicles_tbody'); tb.innerHTML=''
  rows.forEach(v=>{
    const tr=document.createElement('tr')
    tr.innerHTML = `<td>${v.plate}</td><td>${v.type||''}</td><td>${fmt(v.capW)}/${fmt(v.capV)}</td><td>${v.owner||''}</td><td>${fmt(v.costPerKm)}</td><td><span class='badge'>${v.status}</span></td>
    <td class='text-right'><button class='btn' onclick="fillVehicle('${v.plate}')">แก้ไข</button>
    <button class='btn' onclick="delVehicle('${v.plate}')">ลบ</button></td>`
    tb.appendChild(tr)
  })
}
async function saveVehicle(){
  const payload = { plate: val('veh_plate'), type: val('veh_type'), capW: +val('veh_cap_w')||0, capV:+val('veh_cap_v')||0, owner: val('veh_owner'), costPerKm:+val('veh_cost')||0, status: val('veh_status') }
  if(!payload.plate){ alert('ทะเบียนรถจำเป็น'); return }
  await fetch(`${API()}/vehicles`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
  clearVehicleForm(); loadVehicles()
}
async function delVehicle(plate){ if(!confirm('ลบรถ '+plate+' ?')) return; await fetch(`${API()}/vehicles/${plate}`, {method:'DELETE'}); loadVehicles() }
async function fillVehicle(plate){
  const res = await fetch(`${API()}/vehicles?q=${encodeURIComponent(plate)}`)
  const [v] = await res.json(); if(!v) return
  setVal('veh_plate', v.plate); setVal('veh_type', v.type||''); setVal('veh_cap_w', v.capW); setVal('veh_cap_v', v.capV)
  setVal('veh_owner', v.owner||''); setVal('veh_cost', v.costPerKm); setVal('veh_status', v.status)
}
function clearVehicleForm(){ ['veh_plate','veh_type','veh_cap_w','veh_cap_v','veh_owner','veh_cost'].forEach(id=>setVal(id,'')); setVal('veh_status','ready') }

function addPlanRow(){
  const tr=document.createElement('tr')
  tr.innerHTML = `
    <td><select class="input plan-customer-select"></select></td>
    <td><input type="number" step="0.001" class="input plan-w" placeholder="ตัน"/></td>
    <td><input type="number" step="0.001" class="input plan-v" placeholder="ลบ.ม."/></td>
    <td><input class="input plan-mat" placeholder="สินค้า"/></td>
    <td class="text-right"><button class="btn" onclick="this.closest('tr').remove()">ลบ</button></td>`
  qs('#plan_lines').appendChild(tr)
  rebuildPlanCustomerOptions()
}
async function rebuildPlanCustomerOptions(){
  const res = await fetch(`${API()}/customers`)
  const rows = await res.json()
  qsa('.plan-customer-select').forEach(sel=>{
    const v = sel.value
    sel.innerHTML = `<option value="">เลือก</option>` + rows.map(c=>`<option value="${c.code}">${c.code} - ${c.name}</option>`).join('')
    sel.value = v
  })
}
async function analyzePlan(){
  const name = val('plan_name') || ('แผน-'+new Date().toISOString().slice(0,10))
  const date = val('plan_date') || new Date().toISOString().slice(0,10)
  const originStr = val('plan_origin') || '13.7563,100.5018'
  const [olat, olng] = originStr.split(',').map(Number)
  const rows = qsa('#plan_lines tr').map(r=>{
    const code = r.querySelector('.plan-customer-select').value
    const w = +r.querySelector('.plan-w').value || 0
    const v = +r.querySelector('.plan-v').value || 0
    const mat = r.querySelector('.plan-mat').value || ''
    if(!code) return null
    return {customer_code: code, w, v, mat}
  }).filter(Boolean)
  if(!rows.length){ alert('กรุณาเพิ่มลูกค้าอย่างน้อย 1 แถว'); return }

  const payload = { name, date, origin_lat: olat, origin_lng: olng, lines: rows }
  const res = await fetch(`${API()}/plans/optimize`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
  const plan = await res.json()
  window._lastPlan = plan
  openTab('result'); renderResult()
}

let map, layer
function initMap(){
  if(map) return
  map = L.map('map').setView([13.7563, 100.5018], 7)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)
  layer = L.layerGroup().addTo(map)
}
function renderResult(){
  if(!window._lastPlan){ qs('#routes_container').innerHTML = '<div class="text-sm text-gray-500">ยังไม่มีแผน</div>'; return }
  layer.clearLayers()
  const p = window._lastPlan
  const Sdiv = qs('#plan_summary'); Sdiv.innerHTML=''
  ;[
    ['จำนวนรถ', p.routes.length],
    ['ระยะทางรวม (กม.)', fmt(p.totalKm)],
    ['ต้นทุนรวม (บาท)', fmt(p.totalCost)],
    ['ปริมาณรวม (ตัน/ลบ.ม.)', `${fmt(p.totalW)}/${fmt(p.totalV)}`],
  ].forEach(([k,v])=>{
    const el=document.createElement('div'); el.className='p-3 rounded-xl border bg-white'
    el.innerHTML=`<div class='text-xs text-gray-500'>${k}</div><div class='text-lg font-semibold'>${v}</div>`
    Sdiv.appendChild(el)
  })

  const rc = qs('#routes_container'); rc.innerHTML=''
  const depot = [p.origin_lat, p.origin_lng]
  L.marker(depot).addTo(layer).bindPopup('คลังสินค้า')
  let bounds=[depot]
  p.routes.forEach((r,idx)=>{
    const card=document.createElement('div'); card.className='border rounded-xl p-3 bg-white'
    const listHtml = r.orders.map((o,i)=>`<li>${i+1}. ${o.code} – ${o.name} <span class='text-xs text-gray-500'>(${fmt(o.w)}t / ${fmt(o.v)}m³)</span></li>`).join('')
    card.innerHTML = `
      <div class='flex items-center justify-between'>
        <div class='font-semibold'>Route #${idx+1} • รถ ${r.vehicle.plate} (${r.vehicle.type||''})</div>
        <div class='text-sm'>ระยะทาง ~ <b>${fmt(r.distanceKm)}</b> กม. • ต้นทุน ~ <b>${fmt(r.cost)}</b> บาท</div>
      </div>
      <ol class='list-decimal ml-5 mt-2 space-y-1'>${listHtml}</ol>`
    rc.appendChild(card)
    const pts=[depot, ...r.orders.map(o=>[o.lat,o.lng]), depot]
    L.polyline(pts).addTo(layer)
    r.orders.forEach(o=> L.circleMarker([o.lat,o.lng],{radius:5}).addTo(layer).bindPopup(`${o.code} – ${o.name}`))
    bounds.push(...pts)
  })
  if(bounds.length) map.fitBounds(bounds)
}

function toCSV(rows){
  const esc=v=>`"${String(v??'').replaceAll('"','""')}"`
  const keys=Object.keys(rows[0]||{})
  const header=keys.map(esc).join(',')
  const body=rows.map(r=>keys.map(k=>esc(r[k])).join(',')).join('\n')
  return header+'\n'+body
}
async function exportRaw(kind){
  let rows=[]
  if(kind==='customers'){ rows = await (await fetch(`${API()}/customers`)).json() }
  if(kind==='vehicles'){ rows = await (await fetch(`${API()}/vehicles`)).json() }
  if(!rows.length){ alert('ไม่มีข้อมูล'); return }
  const blob=new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8'})
  saveAs(blob, `${kind}-${new Date().toISOString().slice(0,10)}.csv`)
}
function exportPlanExcel(){
  const p = window._lastPlan; if(!p){ alert('ยังไม่มีแผน'); return }
  const summary=[ ['ชื่อแผน', p.name], ['วันที่', p.date], ['จำนวนรถ', p.routes.length], ['ระยะทางรวม (กม.)', p.totalKm], ['ต้นทุนรวม (บาท)', p.totalCost], ['ปริมาณรวม (ตัน)', p.totalW], ['ปริมาตรรวม (ลบ.ม.)', p.totalV] ]
  const routes=[['Route','ทะเบียน','ประเภท','ลำดับ','ลูกค้า','ตัน','ลบ.ม.','Lat','Lng','ระยะทาง(กม.)','ต้นทุน(บาท)']]
  p.routes.forEach((r,i)=>{
    r.orders.forEach((o,idx)=> routes.push([i+1, r.vehicle.plate, r.vehicle.type||'', idx+1, `${o.code}-${o.name}`, o.w, o.v, o.lat, o.lng, '', '']))
    routes.push([i+1, r.vehicle.plate, r.vehicle.type||'', '', 'รวม', r.orders.reduce((s,x)=>s+x.w,0), r.orders.reduce((s,x)=>s+x.v,0), '', '', r.distanceKm, r.cost])
  })
  const wb=XLSX.utils.book_new(); const ws1=XLSX.utils.aoa_to_sheet(summary); const ws2=XLSX.utils.aoa_to_sheet(routes)
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary'); XLSX.utils.book_append_sheet(wb, ws2, 'Routes')
  const out=XLSX.write(wb, {bookType:'xlsx', type:'array'})
  saveAs(new Blob([out],{type:'application/octet-stream'}), `plan-${p.name}.xlsx`)
}

const val=id=>qs('#'+id)?.value||''
const setVal=(id,v)=>{ const el=qs('#'+id); if(el) el.value=v }

window.addEventListener('DOMContentLoaded', ()=>{ loadCustomers(); loadVehicles(); addPlanRow(); addPlanRow(); })

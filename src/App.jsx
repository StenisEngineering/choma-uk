import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ─── Brand tokens ─────────────────────────────────────────────
const B = {
  red:"#C8321A", redLight:"#FBF0ED",
  green:"#1A6B3A", greenSoft:"#E8F3EE",
  orange:"#D4680A", orangeLight:"#FEF3E8",
  amber:"#8A5F00", amberLight:"#FFF8E8",
  blue:"#1A52A0", blueSoft:"#E8EEF8",
  purple:"#5C3D9A", purpleSoft:"#F0ECF8",
  text:"#111110", textMid:"#6B6965", textDim:"#B0AEAC",
  wa:"#25D366",
  bg:"#F8F8F6", card:"#FFFFFF", border:"#EAEAE8", surface:"#F3F3F1", divider:"#EDECEA",
};

const fmt = n => "£" + Number(n).toFixed(2);
const openWA = (phone, msg) => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");

// ─── UK delivery zones (postcode prefixes) ────────────────────
const ZONES = [
  { code:"E",  label:"East London",         fee:2.50 },
  { code:"N",  label:"North London",        fee:2.50 },
  { code:"SE", label:"South East London",   fee:3.00 },
  { code:"SW", label:"South West London",   fee:3.00 },
  { code:"W",  label:"West London",         fee:2.50 },
  { code:"EC", label:"Central London",      fee:3.50 },
  { code:"WC", label:"Central London",      fee:3.50 },
  { code:"IG", label:"Ilford / Redbridge",  fee:2.00 },
  { code:"RM", label:"Romford / Havering",  fee:2.50 },
];

const getZone = postcode => {
  const pc = postcode.trim().toUpperCase();
  return ZONES.find(z => pc.startsWith(z.code)) || null;
};

// ─── Allergen key ─────────────────────────────────────────────
const ALLERGENS = {
  gluten:"🌾", dairy:"🥛", eggs:"🥚", nuts:"🥜",
  soya:"🫘", celery:"🥬", mustard:"🟡", fish:"🐟",
};

// ─── Menu ─────────────────────────────────────────────────────
const MENU = [
  { id:"M1", name:"Jollof Rice & Chicken",   price:12.50, cat:"Mains",
    emoji:"🍛", desc:"Smoky party-style jollof with grilled chicken thigh",
    allergens:["gluten"], halal:true, vegan:false, available:true,
    portion:"400g", cals:620 },
  { id:"M2", name:"Egusi Soup & Eba",         price:11.00, cat:"Mains",
    emoji:"🫕", desc:"Rich melon seed soup with stockfish & eba swallow",
    allergens:["fish","gluten"], halal:true, vegan:false, available:true,
    portion:"450g", cals:580 },
  { id:"M3", name:"Fried Rice & Beef Stew",   price:13.00, cat:"Mains",
    emoji:"🍚", desc:"Nigerian fried rice with tender braised beef",
    allergens:["soya","eggs"], halal:true, vegan:false, available:true,
    portion:"420g", cals:650 },
  { id:"M4", name:"Vegetable Pepper Soup",    price:9.00,  cat:"Mains",
    emoji:"🍲", desc:"Light aromatic pepper soup — plant-based",
    allergens:[], halal:true, vegan:true, available:true,
    portion:"350ml", cals:180 },
  { id:"M5", name:"Suya Chicken Skewers",     price:9.50,  cat:"Small plates",
    emoji:"🍢", desc:"Spiced grilled chicken skewers with groundnut dust",
    allergens:["nuts"], halal:true, vegan:false, available:true,
    portion:"3 skewers", cals:310 },
  { id:"M6", name:"Puff Puff (6 pcs)",        price:5.00,  cat:"Small plates",
    emoji:"🍩", desc:"Soft golden fried dough, lightly sweetened",
    allergens:["gluten","eggs","dairy"], halal:true, vegan:false, available:true,
    portion:"6 pieces", cals:420 },
  { id:"M7", name:"Plantain & Black-eyed Peas",price:8.50, cat:"Small plates",
    emoji:"🍌", desc:"Caramelised ripe plantain with seasoned beans",
    allergens:[], halal:true, vegan:true, available:true,
    portion:"300g", cals:390 },
  { id:"M8", name:"Meat Pies (2 pcs)",         price:6.50, cat:"Small plates",
    emoji:"🥧", desc:"Freshly baked shortcrust pies with spiced beef mince",
    allergens:["gluten","eggs","dairy"], halal:true, vegan:false, available:false,
    portion:"2 pies", cals:480 },
];

// ─── Orders ───────────────────────────────────────────────────
const INIT_ORDERS = [
  { id:"CHO104", customer:"Amara Osei",   phone:"447911223344",
    address:"42 Forest Road, London E17 6JQ", postcode:"E17",
    items:[{name:"Jollof Rice & Chicken",qty:2,price:12.50},{name:"Puff Puff (6 pcs)",qty:1,price:5.00}],
    subtotal:30.00, deliveryFee:2.50, total:32.50,
    status:"Preparing", time:"12:34", note:"No bones in the chicken please", rider:null,
    paymentMethod:"Card", paid:true },
  { id:"CHO103", customer:"Taiwo Adeyemi",phone:"447922334455",
    address:"7 Hainault Street, Ilford IG1 4EH", postcode:"IG1",
    items:[{name:"Egusi Soup & Eba",qty:1,price:11.00},{name:"Suya Chicken Skewers",qty:2,price:9.50}],
    subtotal:30.00, deliveryFee:2.00, total:32.00,
    status:"Out for delivery", time:"11:50", note:"", rider:"James",
    paymentMethod:"Bank transfer", paid:true },
  { id:"CHO102", customer:"Blessing Nwosu",phone:"447933445566",
    address:"19 Romford Road, London E15 4BZ", postcode:"E15",
    items:[{name:"Fried Rice & Beef Stew",qty:2,price:13.00}],
    subtotal:26.00, deliveryFee:2.50, total:28.50,
    status:"Delivered", time:"10:20", note:"", rider:"James",
    paymentMethod:"Card", paid:true },
];

const SS = {
  "New":              { bg:B.blueSoft,    color:B.blue   },
  "Preparing":        { bg:B.orangeLight, color:B.orange },
  "Ready":            { bg:B.redLight,    color:B.red    },
  "Out for delivery": { bg:B.amberLight,  color:B.amber  },
  "Delivered":        { bg:B.greenSoft,   color:B.green  },
  "Cancelled":        { bg:B.surface,     color:B.textMid},
};

// ─── Shared atoms ─────────────────────────────────────────────
function Pill({ s }) {
  const c = SS[s]||{bg:B.surface,color:B.textMid};
  return <span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
    background:c.bg,color:c.color,whiteSpace:"nowrap" }}>{s}</span>;
}

function AllergenBadges({ allergens }) {
  if(!allergens?.length) return <span style={{ fontSize:11,color:B.green,fontWeight:600 }}>✓ No major allergens</span>;
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4 }}>
      {allergens.map(a=>(
        <span key={a} style={{ fontSize:11,background:B.amberLight,color:B.amber,
          borderRadius:6,padding:"2px 7px",fontWeight:600,border:`1px solid ${B.amber}30` }}>
          {ALLERGENS[a]} {a}
        </span>
      ))}
    </div>
  );
}

function DietBadge({ halal, vegan }) {
  return (
    <div style={{ display:"flex",gap:4 }}>
      {halal&&<span style={{ fontSize:10,background:"#E8F5EE",color:B.green,borderRadius:6,
        padding:"2px 7px",fontWeight:700,border:`1px solid ${B.green}30` }}>✓ Halal</span>}
      {vegan&&<span style={{ fontSize:10,background:B.purpleSoft,color:B.purple,borderRadius:6,
        padding:"2px 7px",fontWeight:700,border:`1px solid ${B.purple}30` }}>🌱 Vegan</span>}
    </div>
  );
}

function Card({ children,onClick,style={} }) {
  return <div onClick={onClick} style={{ background:B.card,border:`1px solid ${B.border}`,
    borderRadius:16,padding:"14px 16px",cursor:onClick?"pointer":"default",
    transition:"box-shadow 0.15s",...style }}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.07)")}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow="none")}>{children}</div>;
}

function Btn({ children,onClick,v="primary",full=false,style={},disabled=false }) {
  const vs = {
    primary:{ background:B.red,     color:"#fff" },
    ghost:  { background:B.surface, color:B.text, border:`1px solid ${B.border}` },
    wa:     { background:B.wa,      color:"#fff" },
    green:  { background:B.green,   color:"#fff" },
    orange: { background:B.orange,  color:"#fff" },
    stripe: { background:"#635BFF", color:"#fff" },
  };
  return <button onClick={onClick} disabled={disabled}
    style={{ padding:"12px 18px",borderRadius:12,fontSize:14,fontWeight:700,border:"none",
      cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.45:1,
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
      boxSizing:"border-box",transition:"transform 0.1s",...vs[v],...style }}
    onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{children}</button>;
}

function Input({ label,value,onChange,placeholder,type="text",hint }) {
  return <div style={{ marginBottom:14 }}>
    {label&&<div style={{ fontSize:12,fontWeight:600,color:B.textMid,marginBottom:5,
      textTransform:"uppercase",letterSpacing:0.4 }}>{label}</div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%",padding:"11px 13px",background:B.surface,
        border:`1.5px solid ${B.border}`,borderRadius:10,color:B.text,
        fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
      onFocus={e=>e.target.style.borderColor=B.red}
      onBlur={e=>e.target.style.borderColor=B.border} />
    {hint&&<div style={{ fontSize:11,color:B.textMid,marginTop:4 }}>{hint}</div>}
  </div>;
}

function Section({ title,children,style={} }) {
  return <div style={{ marginBottom:20,...style }}>
    <div style={{ fontSize:12,fontWeight:700,color:B.textMid,textTransform:"uppercase",
      letterSpacing:0.5,marginBottom:10 }}>{title}</div>
    {children}
  </div>;
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function ChomaUK() {
  const [view,  setView]  = useState("customer");
  const [orders,setOrders]= useState(INIT_ORDERS);
  const [cookBadge, setCookBadge]   = useState(0);
  const [riderBadge,setRiderBadge]  = useState(0);

  const addOrder = o => { setOrders(p=>[o,...p]); setCookBadge(b=>b+1); };

  const updateOrders = fn => {
    setOrders(prev => {
      const next = fn(prev);
      const nowReady = next.filter(o=>o.status==="Ready"&&!o.rider).length;
      const wasReady = prev.filter(o=>o.status==="Ready"&&!o.rider).length;
      if(nowReady>wasReady) setRiderBadge(b=>b+1);
      return next;
    });
  };

  const TABS = [
    { id:"customer", label:"🛒 Customer"                    },
    { id:"cook",     label:"👨‍🍳 Cook",    badge:cookBadge   },
    { id:"rider",    label:"🛵 Rider",    badge:riderBadge  },
    { id:"tracking", label:"📍 Tracking"                    },
  ];

  return (
    <div style={{ minHeight:"100vh",background:"#EBEBEA",display:"flex",
      flexDirection:"column",fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif" }}>
      {/* Switcher bar */}
      <div style={{ background:B.card,borderBottom:`1px solid ${B.divider}`,
        padding:"10px 16px",flexShrink:0 }}>
        <div style={{ fontSize:10,color:B.textDim,fontWeight:700,letterSpacing:1.5,
          textTransform:"uppercase",marginBottom:8 }}>
          Choma UK · 4 connected apps · preview only
        </div>
        <div style={{ display:"flex",gap:6 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{ setView(t.id);
              if(t.id==="cook") setCookBadge(0);
              if(t.id==="rider") setRiderBadge(0); }}
              style={{ padding:"8px 14px",borderRadius:20,fontSize:12,fontWeight:700,
                cursor:"pointer",whiteSpace:"nowrap",border:"none",position:"relative",
                background:view===t.id?B.red:B.surface,
                color:view===t.id?"#fff":B.textMid,transition:"all 0.15s" }}>
              {t.label}
              {(t.badge||0)>0&&(
                <span style={{ position:"absolute",top:-4,right:-4,width:17,height:17,
                  borderRadius:9,background:B.orange,color:"#fff",fontSize:9,
                  fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1,overflow:"hidden" }}>
        {view==="customer" && <CustomerPage onOrderPlaced={addOrder} />}
        {view==="cook"     && <CookDashboard orders={orders} setOrders={updateOrders} />}
        {view==="rider"    && <RiderApp orders={orders} setOrders={updateOrders} />}
        {view==="tracking" && <TrackingPage orders={orders} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. CUSTOMER PAGE
// ════════════════════════════════════════════════════════════════
function CustomerPage({ onOrderPlaced }) {
  const [cart,  setCart]  = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  useEffect(() => {
  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category');
    if (!error) setMenuItems(data);
    setMenuLoading(false);
  };
  fetchMenu();
  }, []);
  const [step,  setStep]  = useState("menu"); // menu|checkout|payment|confirmed
  const [info,  setInfo]  = useState({ name:"",phone:"",email:"",postcode:"",address:"",note:"" });
  const [placed,setPlaced]= useState(null);
  const [filter,setFilter]= useState("All");
  const [showAllergens,setShowAllergens] = useState(null); // item id
  const [payStep,setPayStep] = useState("form"); // form|processing|done
  const [gdpr,  setGdpr]  = useState(false);

  const add = id => setCart(c=>({...c,[id]:(c[id]||0)+1}));
  const rem = id => setCart(c=>{ const n={...c}; n[id]>1?n[id]--:delete n[id]; return n; });

  const zone = getZone(info.postcode);
  const deliveryFee = zone?.fee ?? 0;
  const subtotal = Object.entries(cart).reduce((s,[id,q])=>{ const m=menuItems.find(m=>m.id===id); return s+(m?m.price*q:0); },0);
  const total = subtotal + (zone ? deliveryFee : 0);
  const count = Object.values(cart).reduce((s,q)=>s+q,0);
  const shown = menuItems.filter(m => filter === "All" || m.category === filter);

  // ── Allergen modal ──
  const allergenItem = menuItems.find(m=>m.id===showAllergens);

  // ── Confirmed ──
  if(step==="confirmed"&&placed) return (
    <div style={{ height:"100%",background:B.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:32,overflowY:"auto" }}>
      <div style={{ fontSize:64,marginBottom:14 }}>🎉</div>
      <div style={{ fontSize:22,fontWeight:800,color:B.text,marginBottom:6,textAlign:"center" }}>
        Order confirmed!
      </div>
      <div style={{ fontSize:14,color:B.textMid,textAlign:"center",lineHeight:1.7,marginBottom:6 }}>
        Thank you {placed.customer.split(" ")[0]}.<br/>Your food is being freshly prepared.
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:24,padding:"6px 14px",
        background:B.greenSoft,border:`1px solid ${B.green}30`,borderRadius:20 }}>
        <span style={{ color:B.green,fontWeight:700,fontSize:13 }}>
          💳 Payment confirmed · {placed.paymentMethod}
        </span>
      </div>
      <Card style={{ width:"100%",maxWidth:380,marginBottom:20 }}>
        <div style={{ fontSize:12,color:B.textMid,fontWeight:700,textTransform:"uppercase",
          letterSpacing:0.4,marginBottom:10 }}>Order summary</div>
        {placed.items.map((it,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",
            borderBottom:i<placed.items.length-1?`1px solid ${B.divider}`:"none" }}>
            <span style={{ fontSize:13,color:B.textMid }}>{it.name} ×{it.qty}</span>
            <span style={{ fontSize:13,fontWeight:600,color:B.text }}>{fmt(it.price*it.qty)}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",
          borderTop:`1px solid ${B.divider}`,marginTop:2 }}>
          <span style={{ fontSize:13,color:B.textMid }}>Delivery ({placed.zone})</span>
          <span style={{ fontSize:13,color:B.text }}>{fmt(placed.deliveryFee)}</span>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,fontWeight:800,fontSize:15 }}>
          <span>Total</span><span style={{ color:B.red }}>{fmt(placed.total)}</span>
        </div>
      </Card>
      <div style={{ width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:10 }}>
        <Btn full v="wa" onClick={()=>openWA(placed.phone,
          `Hello ${placed.customer.split(" ")[0]} 👋\n\nYour Choma order is confirmed!\n\n`+
          placed.items.map(i=>`${i.name} ×${i.qty}`).join("\n")+
          `\n\nDelivery to: ${placed.postcode}\nEstimated delivery: 45–60 min 🛵\n\nTrack your order: choma.co.uk/track/${placed.id}`)}>
          💬 Get WhatsApp updates
        </Btn>
        <Btn full v="ghost" onClick={()=>{ setCart({}); setStep("menu"); setInfo({name:"",phone:"",email:"",postcode:"",address:"",note:""}); setGdpr(false); }}>
          Order again
        </Btn>
      </div>
    </div>
  );

  // ── Stripe payment step ──
  if(step==="payment") return (
    <div style={{ height:"100%",background:B.bg,overflowY:"auto" }}>
      <div style={{ maxWidth:520,margin:"0 auto",padding:"20px 20px 40px" }}>
        <button onClick={()=>setStep("checkout")} style={{ background:B.card,
          border:`1px solid ${B.border}`,borderRadius:8,padding:"8px 14px",
          color:B.textMid,fontSize:13,cursor:"pointer",marginBottom:20 }}>‹ Back</button>

        <div style={{ fontSize:20,fontWeight:800,color:B.text,marginBottom:4 }}>Secure payment</div>
        <div style={{ fontSize:13,color:B.textMid,marginBottom:20 }}>
          Payments processed securely by Stripe
        </div>

        {/* Order total reminder */}
        <div style={{ background:B.redLight,border:`1px solid ${B.red}25`,borderRadius:12,
          padding:"12px 16px",marginBottom:20,display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontSize:14,color:B.textMid }}>Total to pay</span>
          <span style={{ fontSize:16,fontWeight:800,color:B.red }}>{fmt(total)}</span>
        </div>

        {payStep==="form"&&(
          <>
            {/* Stripe card form simulation */}
            <Card style={{ marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:12 }}>Card details</div>
              <Input label="Cardholder name" value="" onChange={()=>{}} placeholder="Amara Osei" />
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12,fontWeight:600,color:B.textMid,marginBottom:5,
                  textTransform:"uppercase",letterSpacing:0.4 }}>Card number</div>
                <div style={{ padding:"11px 13px",background:B.surface,
                  border:`1.5px solid ${B.border}`,borderRadius:10,
                  display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:14,color:B.textDim }}>1234 5678 9012 3456</span>
                  <span style={{ fontSize:18 }}>💳</span>
                </div>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:B.textMid,marginBottom:5,
                    textTransform:"uppercase",letterSpacing:0.4 }}>Expiry</div>
                  <div style={{ padding:"11px 13px",background:B.surface,
                    border:`1.5px solid ${B.border}`,borderRadius:10,color:B.textDim,fontSize:14 }}>
                    MM / YY
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:B.textMid,marginBottom:5,
                    textTransform:"uppercase",letterSpacing:0.4 }}>CVC</div>
                  <div style={{ padding:"11px 13px",background:B.surface,
                    border:`1.5px solid ${B.border}`,borderRadius:10,color:B.textDim,fontSize:14 }}>
                    •••
                  </div>
                </div>
              </div>
            </Card>
            <div style={{ display:"flex",alignItems:"center",gap:10,
              background:B.surface,borderRadius:10,padding:"10px 14px",
              marginBottom:20,fontSize:12,color:B.textMid }}>
              <span style={{ fontSize:16 }}>🔒</span>
              256-bit SSL encryption · Powered by Stripe
            </div>
            <Btn full v="stripe" onClick={async ()=>{
              setPayStep("processing");
              setTimeout(async ()=>{
                const o = {
                  id:`CHO${Date.now().toString().slice(-3)}`,
                  customer:info.name, phone:info.phone.replace(/\D/g,""),
                  email:info.email, postcode:info.postcode,
                  address:info.address||`${info.postcode}, UK`,
                  note:info.note, zone:zone?.label||"",
                  items:Object.entries(cart).map(([id,qty])=>{ const m=menuItems.find(m=>m.id===id); return m?{name:m.name,qty,price:m.price}:null; }).filter(Boolean),
                  subtotal, deliveryFee, total,
                  status:"New", time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
                  rider:null, paymentMethod:"Stripe card", paid:true,
                };
                await supabase.from('orders').insert([{
  id: o.id,
  customer_name: o.customer_name || o.customer,
  customer_phone: o.customer_phone || o.phone,
  customer_email: o.email,
  delivery_address: o.address,
  postcode: o.postcode,
  delivery_zone: o.zone,
  delivery_fee: o.deliveryFee,
  subtotal: o.subtotal,
  total: o.total,
  status: 'New',
  payment_method: o.paymentMethod,
  paid: false,
  note: o.note,
  items: o.items || [],
}]);
onOrderPlaced(o); setPlaced(o); setPayStep("done"); setStep("confirmed");
              },2000);
            }}>Pay {fmt(total)} securely</Btn>
            <div style={{ marginTop:12,textAlign:"center",fontSize:12,color:B.textMid }}>
              Or{" "}
              <span style={{ color:B.blue,cursor:"pointer",fontWeight:600 }}
                onClick={()=>{
                  const o = {
                    id:`CHO${Date.now().toString().slice(-3)}`,
                    customer:info.name, phone:info.phone.replace(/\D/g,""),
                    email:info.email, postcode:info.postcode,
                    address:info.address||`${info.postcode}, UK`, note:info.note,
                    zone:zone?.label||"",
                    items:Object.entries(cart).map(([id,qty])=>{ const m=menuItems.find(m=>m.id===id); return m?{name:m.name,qty,price:m.price}:null; }).filter(Boolean),
                    subtotal, deliveryFee, total, status:"New",
                    time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
                    rider:null, paymentMethod:"Bank transfer", paid:false,
                  };
                  onOrderPlaced(o); setPlaced(o); setStep("confirmed");
                }}>pay by bank transfer</span>
            </div>
          </>
        )}

        {payStep==="processing"&&(
          <div style={{ textAlign:"center",padding:"40px 20px" }}>
            <div style={{ fontSize:48,marginBottom:16 }}>⏳</div>
            <div style={{ fontSize:16,fontWeight:700,color:B.text,marginBottom:8 }}>Processing payment…</div>
            <div style={{ fontSize:13,color:B.textMid }}>Please don't close this page</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Checkout ──
  if(step==="checkout") return (
    <div style={{ height:"100%",background:B.bg,overflowY:"auto" }}>
      <div style={{ maxWidth:520,margin:"0 auto",padding:"20px 20px 40px" }}>
        <button onClick={()=>setStep("menu")} style={{ background:B.card,
          border:`1px solid ${B.border}`,borderRadius:8,padding:"8px 14px",
          color:B.textMid,fontSize:13,cursor:"pointer",marginBottom:20 }}>‹ Back to menu</button>

        <div style={{ fontSize:20,fontWeight:800,color:B.text,marginBottom:16 }}>Your order</div>

        {/* Cart */}
        <Card style={{ marginBottom:20 }}>
          {Object.entries(cart).map(([id,qty])=>{ const m=menuItems.find(m=>m.id===id); return m?(
            <div key={id} style={{ display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${B.divider}` }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:22 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize:14,fontWeight:600,color:B.text }}>{m.name}</div>
                  <div style={{ fontSize:12,color:B.textMid }}>{fmt(m.price)} each</div>
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <button onClick={()=>rem(m.id)} style={{ width:28,height:28,borderRadius:8,
                  background:B.surface,border:`1px solid ${B.border}`,cursor:"pointer",fontSize:16 }}>−</button>
                <span style={{ fontSize:15,fontWeight:700,color:B.red,minWidth:16,textAlign:"center" }}>{qty}</span>
                <button onClick={()=>add(m.id)} style={{ width:28,height:28,borderRadius:8,
                  background:B.red,border:"none",color:"#fff",cursor:"pointer",fontSize:16 }}>+</button>
              </div>
            </div>
          ):null; })}
          <div style={{ padding:"8px 0 4px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13 }}>
              <span style={{ color:B.textMid }}>Subtotal</span>
              <span style={{ color:B.text,fontWeight:600 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13 }}>
              <span style={{ color:B.textMid }}>Delivery</span>
              <span style={{ color:zone?B.text:B.textDim,fontWeight:600 }}>
                {zone?fmt(deliveryFee):"Enter postcode below"}
              </span>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,
              fontWeight:800,fontSize:16,borderTop:`1px solid ${B.divider}`,marginTop:4 }}>
              <span>Total</span><span style={{ color:B.red }}>{zone?fmt(total):"—"}</span>
            </div>
          </div>
        </Card>

        {/* Delivery details */}
        <Section title="Your details">
          <Input label="Full name" value={info.name} onChange={v=>setInfo(i=>({...i,name:v}))} placeholder="Amara Osei" />
          <Input label="Phone / WhatsApp" value={info.phone} onChange={v=>setInfo(i=>({...i,phone:v}))} placeholder="+44 7xxx xxxxxx" hint="UK format — we'll send updates via WhatsApp" />
          <Input label="Email" value={info.email} onChange={v=>setInfo(i=>({...i,email:v}))} placeholder="amara@email.com" type="email" hint="For your order confirmation" />
        </Section>

        <Section title="Delivery address">
          <Input label="Postcode" value={info.postcode} onChange={v=>setInfo(i=>({...i,postcode:v}))} placeholder="E17 6JQ" hint={zone?`✓ ${zone.label} — delivery fee: ${fmt(zone.fee)}`:"Enter your postcode to check if we deliver to you"} />
          {info.postcode && !zone && info.postcode.length > 2 && (
            <div style={{ padding:"10px 14px",background:"#FEF3E8",border:`1px solid ${B.orange}30`,
              borderRadius:10,marginTop:-8,marginBottom:14,fontSize:13,color:B.orange,fontWeight:600 }}>
              ⚠️ Sorry, we don't currently deliver to {info.postcode.toUpperCase()}. Check our delivery zones below.
            </div>
          )}
          <Input label="Full address" value={info.address} onChange={v=>setInfo(i=>({...i,address:v}))} placeholder="42 Forest Road, London E17 6JQ" />
          <Input label="Delivery note (optional)" value={info.note} onChange={v=>setInfo(i=>({...i,note:v}))} placeholder="Leave at door, ring bell, etc." />
        </Section>

        {/* Delivery zones info */}
        <Card style={{ marginBottom:20,background:B.surface,borderColor:"transparent" }}>
          <div style={{ fontSize:12,fontWeight:700,color:B.textMid,textTransform:"uppercase",
            letterSpacing:0.5,marginBottom:10 }}>Our delivery zones</div>
          {ZONES.map(z=>(
            <div key={z.code} style={{ display:"flex",justifyContent:"space-between",
              padding:"5px 0",borderBottom:`1px solid ${B.divider}`,fontSize:13 }}>
              <span style={{ color:B.textMid }}>{z.code} — {z.label}</span>
              <span style={{ color:B.text,fontWeight:600 }}>{fmt(z.fee)}</span>
            </div>
          ))}
        </Card>

        {/* GDPR consent */}
        <div style={{ background:B.surface,border:`1px solid ${B.border}`,borderRadius:12,
          padding:"14px",marginBottom:20 }}>
          <label style={{ display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer" }}>
            <input type="checkbox" checked={gdpr} onChange={e=>setGdpr(e.target.checked)}
              style={{ marginTop:2,flexShrink:0 }} />
            <div style={{ fontSize:13,color:B.textMid,lineHeight:1.6 }}>
              I agree to Choma's{" "}
              <span style={{ color:B.red,textDecoration:"underline",cursor:"pointer" }}>Privacy Policy</span>
              {" "}and consent to my personal data being processed to fulfil this order.
              Your data will not be shared with third parties.
              <span style={{ display:"block",marginTop:4,fontSize:11,color:B.textDim }}>
                In compliance with UK GDPR · You can request deletion at any time
              </span>
            </div>
          </label>
        </div>

        <Btn full onClick={()=>setStep("payment")}
          disabled={!info.name||!info.phone||!info.postcode||!zone||!gdpr}>
          Continue to payment →
        </Btn>
        {!gdpr&&info.name&&<div style={{ textAlign:"center",fontSize:12,color:B.textMid,marginTop:8 }}>
          Please accept the privacy policy to continue
        </div>}
      </div>
    </div>
  );

  // ── Main menu ──
  return (
    <div style={{ height:"100%",background:B.bg,overflowY:"auto" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(180deg,#FBF0ED 0%,#F8F8F6 100%)",
        padding:"28px 20px 20px",textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:10 }}>🍳</div>
        <div style={{ fontSize:28,fontWeight:800,color:B.text,letterSpacing:-0.5 }}>Choma</div>
        <div style={{ fontSize:11,color:B.red,fontWeight:700,letterSpacing:3,
          textTransform:"uppercase",marginBottom:8 }}>Home Kitchen · London</div>

        {/* Food hygiene badge */}
        <div style={{ display:"inline-flex",alignItems:"center",gap:8,
          background:"#fff",border:"2px solid #1A6B3A",borderRadius:12,
          padding:"6px 14px",marginBottom:12 }}>
          <div style={{ display:"flex",gap:2 }}>
            {[1,2,3,4,5].map(s=>(
              <span key={s} style={{ fontSize:14,color:B.green }}>★</span>
            ))}
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:800,color:B.green }}>Food Hygiene Rating</div>
            <div style={{ fontSize:10,color:B.textMid }}>Rated by local authority</div>
          </div>
        </div>

        <div style={{ fontSize:13,color:B.textMid,lineHeight:1.7,maxWidth:280,margin:"0 auto 12px" }}>
          Authentic Nigerian home cooking, made fresh to order.
          Delivering across East & North London.
        </div>
        <div style={{ display:"flex",justifyContent:"center",gap:18 }}>
          {[["⏱","45–60 min"],["💳","Card / Transfer"],["✓ Halal","All items"]].map(([ic,tx])=>(
            <div key={tx} style={{ display:"flex",flexDirection:"column",alignItems:"center",
              gap:3,fontSize:11,color:B.textMid,fontWeight:600 }}>
              <span style={{ fontSize:ic.startsWith("✓")?"12px":"18px",
                color:ic.startsWith("✓")?B.green:"inherit",fontWeight:ic.startsWith("✓")?700:"inherit" }}>{ic}</span>
              {tx}
            </div>
          ))}
        </div>
      </div>

      {/* Allergen notice */}
      <div style={{ margin:"12px 20px 0",padding:"10px 14px",background:B.amberLight,
        border:`1px solid ${B.amber}30`,borderRadius:10,
        fontSize:12,color:B.amber,lineHeight:1.6 }}>
        ⚠️ <strong>Allergen information:</strong> Tap any item to see full allergen details.
        If you have a severe allergy, please contact us before ordering.
      </div>

      {/* Filters */}
      <div style={{ padding:"12px 20px 8px",display:"flex",gap:8 }}>
        {["All","Mains","Small plates"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"7px 16px",borderRadius:20,
            fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",
            border:`1.5px solid ${filter===f?B.red:B.border}`,
            background:filter===f?B.redLight:"transparent",
            color:filter===f?B.red:B.textMid }}>{f}</button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ padding:"0 20px",maxWidth:520,margin:"0 auto" }}>
        {shown.map(m=>(
          <div key={m.id} style={{ background:B.card,border:`1px solid ${B.border}`,
            borderRadius:16,padding:"14px 16px",marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:12,flex:1 }}>
                <div style={{ width:54,height:54,borderRadius:13,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:28,flexShrink:0 }}>{m.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:700,color:B.text }}>{m.name}</div>
                  <div style={{ fontSize:12,color:B.textMid,marginTop:2,lineHeight:1.5 }}>{m.description}</div>
                  <div style={{ display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap" }}>
                    <span style={{ fontSize:15,fontWeight:800,color:B.red }}>{fmt(m.price)}</span>
                    <span style={{ fontSize:11,color:B.textMid }}>{m.portion}</span>
                    <span style={{ fontSize:11,color:B.textMid }}>{m.cals} kcal</span>
                  </div>
                  <div style={{ marginTop:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" }}>
                    <DietBadge halal={m.halal} vegan={m.vegan} />
                    <button onClick={()=>setShowAllergens(showAllergens===m.id?null:m.id)}
                      style={{ fontSize:10,padding:"2px 8px",borderRadius:6,cursor:"pointer",
                        background:B.amberLight,color:B.amber,border:`1px solid ${B.amber}30`,
                        fontWeight:600 }}>Allergens ⓘ</button>
                  </div>
                  {showAllergens===m.id&&(
                    <div style={{ marginTop:8,padding:"8px 10px",background:B.amberLight,
                      borderRadius:8,border:`1px solid ${B.amber}20` }}>
                      <AllergenBadges allergens={m.allergens} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flexShrink:0,marginLeft:10 }}>
                {cart[m.id]?(
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <button onClick={()=>rem(m.id)} style={{ width:28,height:28,borderRadius:8,
                      background:B.surface,border:`1px solid ${B.border}`,cursor:"pointer",fontSize:16 }}>−</button>
                    <span style={{ fontSize:15,fontWeight:700,color:B.red,minWidth:18,textAlign:"center" }}>{cart[m.id]}</span>
                    <button onClick={()=>add(m.id)} style={{ width:28,height:28,borderRadius:8,
                      background:B.red,border:"none",color:"#fff",cursor:"pointer",fontSize:16 }}>+</button>
                  </div>
                ):(
                  <button onClick={()=>add(m.id)} style={{ width:34,height:34,borderRadius:10,
                    background:B.red,border:"none",color:"#fff",cursor:"pointer",fontSize:18 }}>+</button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{ height:100 }} />
      </div>

      {/* Cart CTA */}
      {count>0&&(
        <div style={{ position:"fixed",bottom:0,left:0,right:0,padding:"16px 20px 24px",
          background:"linear-gradient(transparent,#F8F8F6 30%)",pointerEvents:"none" }}>
          <button onClick={()=>setStep("checkout")} style={{ width:"100%",maxWidth:520,
            margin:"0 auto",display:"flex",padding:"15px 20px",borderRadius:16,
            background:B.red,color:"#fff",border:"none",cursor:"pointer",
            fontWeight:800,fontSize:15,alignItems:"center",justifyContent:"space-between",
            pointerEvents:"all",boxShadow:`0 8px 24px ${B.red}45` }}>
            <span style={{ background:"rgba(255,255,255,0.2)",borderRadius:8,
              padding:"2px 10px",fontSize:14 }}>{count} item{count!==1?"s":""}</span>
            <span>View order</span>
            <span>{fmt(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. COOK DASHBOARD
// ════════════════════════════════════════════════════════════════
function CookDashboard() {
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("live");
  const [orders, setOrders] = useState([]);

useEffect(() => {
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      console.log('orders data:', data);
    if (!error) setOrders(data.map(o => ({
  ...o,
  items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
})));
  };
  fetchOrders();

  // Real-time listener - new orders appear instantly
  const subscription = supabase
    .channel('orders')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'orders' },
      () => fetchOrders()
    )
    .subscribe();

  return () => supabase.removeChannel(subscription);
}, []);
  const NEXT={"New":"Preparing","Preparing":"Ready","Ready":"Out for delivery","Out for delivery":"Delivered"};
  const live=orders.filter(o=>!["Delivered","Cancelled"].includes(o.status));
  const done=orders.filter(o=>["Delivered","Cancelled"].includes(o.status));
  const list=tab==="live"?live:done;
  const todayRev=orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0);

  const advance=o=>{
    const next=NEXT[o.status]; if(!next) return;
    setOrders(p=>p.map(x=>x.id===o.id?{...x,status:next}:x));
    if(sel?.id===o.id) setSel(p=>p?{...p,status:next}:null);
    const msgs={Preparing:"🔥 We've started preparing your order!",
      Ready:"✅ Your order is packed and ready for pickup by our rider.",
      "Out for delivery":"🛵 Your order is on its way!",
      Delivered:"🎉 Delivered! Thank you for ordering from Choma ❤️"};
    openWA(o.customer_phone,`Hello ${o.customer_name.split(" ")[0]},\n\n${msgs[next]||""}\n\nTrack: choma.co.uk/track/${o.id}`);
  };

  return (
    <div style={{ height:"100%",background:B.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <div style={{ padding:"14px 20px 10px",background:B.card,
        borderBottom:`1px solid ${B.divider}`,flexShrink:0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:B.text }}>🍳 Kitchen live</div>
            <div style={{ fontSize:12,color:B.textMid }}>Choma · London</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11,color:B.textMid,fontWeight:600,textTransform:"uppercase" }}>Today's revenue</div>
            <div style={{ fontSize:18,fontWeight:800,color:B.green }}>{fmt(todayRev)}</div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {[["New",B.red,"#FBF0ED"],["Preparing",B.orange,"#FEF3E8"],["On way",B.amber,"#FFF8E8"],["Done",B.green,B.greenSoft]].map(([l,c,bg])=>(
            <div key={l} style={{ flex:1,background:bg,borderRadius:10,padding:"8px 6px",textAlign:"center" }}>
              <div style={{ fontSize:18,fontWeight:800,color:c }}>
                {orders.filter(o=>o.status===(l==="On way"?"Out for delivery":l==="Done"?"Delivered":l)).length}
              </div>
              <div style={{ fontSize:10,color:c,fontWeight:700,opacity:0.8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",background:B.card,borderBottom:`1px solid ${B.divider}`,flexShrink:0 }}>
        {[["live",`Live (${live.length})`],["done",`Done (${done.length})`]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1,padding:"11px",background:"none",
            border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
            color:tab===id?B.red:B.textMid,
            borderBottom:tab===id?`2px solid ${B.red}`:"2px solid transparent" }}>{lbl}</button>
        ))}
      </div>
      <div style={{ flex:1,display:"flex",minHeight:0,overflow:"hidden" }}>
        <div style={{ width:sel?"42%":"100%",overflowY:"auto",
          borderRight:sel?`1px solid ${B.divider}`:"none",transition:"width 0.2s" }}>
          {list.length===0&&(
            <div style={{ padding:"40px 20px",textAlign:"center",color:B.textMid }}>
              <div style={{ fontSize:36,marginBottom:8 }}>🎉</div>
              <div style={{ fontWeight:700 }}>{tab==="live"?"All caught up!":"No completed orders yet"}</div>
            </div>
          )}
          {list.map(o=>(
            <div key={o.id} onClick={()=>setSel(sel?.id===o.id?null:o)}
              style={{ padding:"13px 16px",borderBottom:`1px solid ${B.divider}`,
                cursor:"pointer",transition:"background 0.12s",
                background:sel?.id===o.id?B.surface:"transparent",
                borderLeft:`3px solid ${sel?.id===o.id?B.red:"transparent"}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:700,color:B.text }}>{o.customer_name}</div>
                  <div style={{ fontSize:11,color:B.textDim }}>{o.id} · {o.time} · {o.postcode}</div>
                </div>
                <Pill s={o.status} />
              </div>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,color:B.textMid }}>{(o.items||[]).length} item{(o.items||[]).length!==1?"s":""}</span>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  {o.paid
                    ?<span style={{ fontSize:11,color:B.green,fontWeight:700 }}>💳 Paid</span>
                    :<span style={{ fontSize:11,color:B.amber,fontWeight:700 }}>⏳ Awaiting transfer</span>}
                  <span style={{ fontSize:13,fontWeight:700,color:B.red }}>{fmt(o.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {sel&&(
          <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontSize:15,fontWeight:800,color:B.text }}>{sel.customer_name_name}</div>
              <button onClick={()=>setSel(null)} style={{ background:B.surface,
                border:`1px solid ${B.border}`,borderRadius:8,width:28,height:28,
                cursor:"pointer",color:B.textMid,fontSize:16 }}>✕</button>
            </div>
            <Card style={{ marginBottom:10 }}>
  {(sel.items||[]).map((it,i)=>(
    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",
      borderBottom:i<(sel.items||[]).length-1?`1px solid ${B.divider}`:"none",fontSize:13 }}>
      <span style={{ color:B.textMid }}>{it.name} ×{it.qty}</span>
      <span style={{ fontWeight:600,color:B.text }}>{fmt(it.price*it.qty)}</span>
    </div>
  ))}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",
                borderTop:`1px solid ${B.divider}`,fontSize:13 }}>
                <span style={{ color:B.textMid }}>Delivery</span>
                <span style={{ color:B.text }}>{fmt(sel.delivery_fee)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,fontWeight:700,fontSize:15 }}>
                <span>Total</span><span style={{ color:B.red }}>{fmt(sel.total)}</span>
              </div>
            </Card>
            <div style={{ background:B.surface,borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:13 }}>
              <div style={{ color:B.textMid }}>📍 {sel.address}</div>
              <div style={{ color:B.textMid,marginTop:3 }}>📮 {sel.postcode} · {sel.zone}</div>
              {sel.note&&<div style={{ color:B.orange,marginTop:4,fontStyle:"italic" }}>💬 "{sel.note}"</div>}
              {sel.rider&&<div style={{ color:B.green,marginTop:4,fontWeight:600 }}>🛵 {sel.rider}</div>}
              <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:6 }}>
                {sel.paid
                  ?<span style={{ fontSize:12,color:B.green,fontWeight:700 }}>💳 {sel.paymentMethod} — paid</span>
                  :<span style={{ fontSize:12,color:B.amber,fontWeight:700 }}>⏳ {sel.paymentMethod} — awaiting</span>}
              </div>
            </div>
            {NEXT[sel.status]&&(
              <Btn full onClick={()=>advance(orders.find(o=>o.id===sel.id)||sel)} style={{ marginBottom:8 }}>
                Mark as {NEXT[sel.status]} + notify 💬
              </Btn>
            )}
            <Btn full v="wa" onClick={()=>openWA(sel.customer_phone,`Hello ${sel.customer_name_name.split(" ")[0]}, update on your order ${sel.id}: ${sel.status}.`)}>
              💬 Custom message
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. RIDER APP
// ════════════════════════════════════════════════════════════════
function RiderApp({ orders, setOrders }) {
  const RIDER="James";
  const [screen,setScreen]=useState("home");
  const [activeOrder,setActiveOrder]=useState(null);

  const mine      = orders.filter(o=>o.rider===RIDER&&o.status==="Out for delivery");
  const available = orders.filter(o=>o.status==="Ready"&&!o.rider);
  const completed = orders.filter(o=>o.rider===RIDER&&o.status==="Delivered");
  const todayEarnings = completed.length * 4.50;

  const claim = o => {
    setOrders(p=>p.map(x=>x.id===o.id?{...x,rider:RIDER}:x));
    openWA("447800000000",`Hi, I'm claiming order ${o.id} for ${o.customer_name} (${o.postcode}). On my way to collect now 🛵`);
  };

  const pickup = o => {
    setOrders(p=>p.map(x=>x.id===o.id?{...x,status:"Out for delivery",rider:RIDER}:x));
    openWA(o.customer_phone,`Hello ${o.customer_name.split(" ")[0]} 👋, your Choma order is on its way!\n📍 Delivering to: ${o.address}\nEstimated arrival: 15–25 mins 🛵`);
    setActiveOrder({...o,status:"Out for delivery"});
  };

  const deliver = o => {
    setOrders(p=>p.map(x=>x.id===o.id?{...x,status:"Delivered"}:x));
    openWA(o.customer_phone,`Hello ${o.customer_name.split(" ")[0]}, your order has been delivered! 🎉\n\nEnjoy your meal from Choma 🍛\nThank you for ordering — we hope to see you again soon!`);
    setActiveOrder(null); setScreen("home");
  };

  if(screen==="earnings") return (
    <div style={{ height:"100%",background:B.bg,display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"14px 20px 12px",background:B.card,
        borderBottom:`1px solid ${B.border}`,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>setScreen("home")} style={{ background:B.surface,
            border:`1px solid ${B.border}`,borderRadius:8,width:32,height:32,cursor:"pointer",
            fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <div style={{ fontSize:17,fontWeight:700,color:B.text }}>My earnings</div>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
          <Card style={{ background:B.greenSoft,borderColor:"transparent",textAlign:"center",padding:"18px 12px" }}>
            <div style={{ fontSize:11,color:B.green,fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Today</div>
            <div style={{ fontSize:28,fontWeight:800,color:B.green }}>{fmt(todayEarnings)}</div>
          </Card>
          <Card style={{ background:B.blueSoft,borderColor:"transparent",textAlign:"center",padding:"18px 12px" }}>
            <div style={{ fontSize:11,color:B.blue,fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Deliveries</div>
            <div style={{ fontSize:28,fontWeight:800,color:B.blue }}>{completed.length}</div>
          </Card>
        </div>
        <Card style={{ marginBottom:16,background:B.amberLight,borderColor:"transparent" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:12,color:B.amber,fontWeight:700,textTransform:"uppercase" }}>Rate per delivery</div>
              <div style={{ fontSize:24,fontWeight:800,color:B.amber,marginTop:4 }}>£4.50</div>
            </div>
            <div style={{ fontSize:36 }}>🛵</div>
          </div>
        </Card>
        <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:10 }}>Completed today</div>
        {completed.length===0&&(
          <Card><div style={{ textAlign:"center",padding:"16px 0",color:B.textMid,fontSize:13 }}>No completed runs yet</div></Card>
        )}
        {completed.map(o=>(
          <Card key={o.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:B.text }}>{o.customer_name}</div>
                <div style={{ fontSize:12,color:B.textMid }}>📍 {o.postcode} · {o.time}</div>
              </div>
              <div style={{ fontSize:14,fontWeight:800,color:B.green }}>+£4.50</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  if(screen==="detail"&&activeOrder) {
    const live=orders.find(o=>o.id===activeOrder.id)||activeOrder;
    return (
      <div style={{ height:"100%",background:B.bg,display:"flex",flexDirection:"column" }}>
        <div style={{ padding:"14px 20px 12px",background:B.card,
          borderBottom:`1px solid ${B.border}`,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <button onClick={()=>setScreen("home")} style={{ background:B.surface,
                border:`1px solid ${B.border}`,borderRadius:8,width:32,height:32,cursor:"pointer",
                fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
              <div>
                <div style={{ fontSize:17,fontWeight:700,color:B.text }}>{live.id}</div>
                <div style={{ fontSize:12,color:B.textMid }}>{live.customer}</div>
              </div>
            </div>
            <Pill s={live.status} />
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
          <div style={{ background:`linear-gradient(135deg,${B.redLight},#fff)`,
            border:`1px solid ${B.red}25`,borderRadius:16,padding:"18px",
            marginBottom:14,textAlign:"center" }}>
            <div style={{ fontSize:11,color:B.red,fontWeight:700,textTransform:"uppercase",
              letterSpacing:0.5,marginBottom:8 }}>Deliver to</div>
            <div style={{ fontSize:17,fontWeight:800,color:B.text,lineHeight:1.4 }}>
              📍 {live.address}
            </div>
            <div style={{ fontSize:14,color:B.textMid,marginTop:4 }}>📮 {live.postcode}</div>
            <button onClick={()=>window.open(`https://maps.google.com/?q=${encodeURIComponent(live.address)}`, "_blank")}
              style={{ marginTop:12,padding:"8px 18px",borderRadius:20,background:B.red,
                color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:13 }}>
              Open in Maps 🗺
            </button>
          </div>
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:8 }}>Customer</div>
            <div style={{ fontSize:15,fontWeight:700,color:B.text }}>{live.customer}</div>
            <div style={{ fontSize:13,color:B.textMid,marginTop:3 }}>+{live.phone}</div>
            {live.note&&<div style={{ fontSize:13,color:B.orange,marginTop:6,fontStyle:"italic" }}>💬 "{live.note}"</div>}
          </Card>
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:8 }}>Items</div>
            {live.items.map((it,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",
                borderBottom:i<live.items.length-1?`1px solid ${B.divider}`:"none" }}>
                <div style={{ width:24,height:24,borderRadius:6,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:700,color:B.red,flexShrink:0 }}>{it.qty}×</div>
                <span style={{ fontSize:14,color:B.text }}>{it.name}</span>
              </div>
            ))}
            <div style={{ marginTop:10,padding:"8px 10px",background:B.greenSoft,
              borderRadius:8,fontSize:13,color:B.green,fontWeight:700 }}>
              💳 Prepaid — no cash collection needed
            </div>
          </Card>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {live.status==="Ready"&&live.rider===RIDER&&(
              <Btn full v="orange" onClick={()=>pickup(live)}>✅ Confirm pickup — start delivery</Btn>
            )}
            {live.status==="Out for delivery"&&(
              <Btn full v="green" onClick={()=>deliver(live)}>🎉 Mark as delivered</Btn>
            )}
            <Btn full v="wa" onClick={()=>openWA(live.phone,
              `Hello ${live.customer.split(" ")[0]}, I'm your Choma delivery rider. I'll be with you at ${live.postcode} shortly 🛵`)}>
              💬 Message customer
            </Btn>
            <Btn full v="ghost" onClick={()=>openWA("447800000000",
              `Hi, there's an issue with order ${live.id} for ${live.customer}. Please call me.`)}>
              📞 Contact kitchen
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:"100%",background:B.bg,display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"16px 20px 12px",background:B.card,
        borderBottom:`1px solid ${B.border}`,flexShrink:0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:20,fontWeight:800,color:B.text }}>Hey {RIDER} 🛵</div>
            <div style={{ fontSize:13,color:B.textMid }}>Choma Delivery · London</div>
          </div>
          <button onClick={()=>setScreen("earnings")} style={{ background:B.greenSoft,
            border:`1px solid ${B.green}30`,borderRadius:12,padding:"8px 14px",cursor:"pointer",textAlign:"center" }}>
            <div style={{ fontSize:11,color:B.green,fontWeight:700,textTransform:"uppercase" }}>Today</div>
            <div style={{ fontSize:16,fontWeight:800,color:B.green }}>{fmt(todayEarnings)}</div>
          </button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14 }}>
          {[["Active",mine.length,B.orange],["Available",available.length,B.red],["Done",completed.length,B.green]].map(([l,v,c])=>(
            <div key={l} style={{ background:`${c}18`,borderRadius:10,padding:"8px 6px",textAlign:"center" }}>
              <div style={{ fontSize:20,fontWeight:800,color:c }}>{v}</div>
              <div style={{ fontSize:10,color:c,fontWeight:700,opacity:0.8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 20px" }}>
        {mine.length>0&&(
          <>
            <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:10 }}>🔴 Active delivery</div>
            {mine.map(o=>(
              <div key={o.id} style={{ background:`linear-gradient(135deg,${B.orangeLight},#fff)`,
                border:`2px solid ${B.orange}35`,borderRadius:16,padding:"16px",marginBottom:16,cursor:"pointer" }}
                onClick={()=>{ setActiveOrder(o); setScreen("detail"); }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:15,fontWeight:800,color:B.text }}>{o.customer_name}</div>
                    <div style={{ fontSize:13,color:B.textMid }}>📍 {o.address}</div>
                    <div style={{ fontSize:12,color:B.textMid }}>📮 {o.postcode}</div>
                  </div>
                  <Pill s={o.status} />
                </div>
                <Btn full v="orange" onClick={e=>{ e.stopPropagation(); setActiveOrder(o); setScreen("detail"); }}>View delivery details</Btn>
              </div>
            ))}
          </>
        )}
        <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:10 }}>🟢 Available ({available.length})</div>
        {available.length===0&&(
          <Card style={{ marginBottom:14 }}>
            <div style={{ textAlign:"center",padding:"14px 0",color:B.textMid,fontSize:13 }}>No orders ready for pickup</div>
          </Card>
        )}
        {available.map(o=>(
          <Card key={o.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:B.text }}>{o.customer_name}</div>
                <div style={{ fontSize:12,color:B.textMid }}>📮 {o.postcode} · {o.zone}</div>
                <div style={{ fontSize:12,color:B.textMid }}>{o.items.length} item{o.items.length!==1?"s":""} · {o.time}</div>
              </div>
              <div style={{ background:B.amberLight,border:`1px solid ${B.amber}25`,
                borderRadius:10,padding:"6px 10px",textAlign:"center" }}>
                <div style={{ fontSize:11,color:B.amber,fontWeight:700 }}>Earning</div>
                <div style={{ fontSize:14,fontWeight:800,color:B.amber }}>£4.50</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <Btn v="ghost" style={{ flex:1,fontSize:13 }} onClick={()=>{ setActiveOrder(o); setScreen("detail"); }}>View details</Btn>
              <Btn style={{ flex:1,fontSize:13 }} onClick={()=>claim(o)}>🛵 Claim</Btn>
            </div>
          </Card>
        ))}
        {completed.length>0&&(
          <>
            <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:10,marginTop:4 }}>✅ Completed ({completed.length})</div>
            {completed.map(o=>(
              <Card key={o.id} style={{ marginBottom:10,opacity:0.7 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:600,color:B.text }}>{o.customer_name}</div>
                    <div style={{ fontSize:12,color:B.textMid }}>📮 {o.postcode} · {o.time}</div>
                  </div>
                  <div style={{ fontSize:14,fontWeight:800,color:B.green }}>+£4.50</div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
      <div style={{ display:"flex",background:B.card,borderTop:`1px solid ${B.border}`,
        paddingTop:4,paddingBottom:10,flexShrink:0 }}>
        {[["🏠","Home","home"],["📦","Orders","home"],["💰","Earnings","earnings"]].map(([ic,lb,sc])=>(
          <button key={lb} onClick={()=>setScreen(sc)} style={{ flex:1,background:"none",border:"none",
            cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            padding:"5px 0",color:screen===sc?B.red:B.textDim,transition:"color 0.15s" }}>
            <span style={{ fontSize:19 }}>{ic}</span>
            <span style={{ fontSize:10,fontWeight:screen===sc?700:500 }}>{lb}</span>
            {screen===sc&&<div style={{ width:4,height:4,borderRadius:2,background:B.red }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. TRACKING PAGE
// ════════════════════════════════════════════════════════════════
function TrackingPage({ orders }) {
  const [oid,setOid]=useState("");
  const [found,setFound]=useState(null);
  const [searched,setSearched]=useState(false);
  const STAGES=["New","Preparing","Ready","Out for delivery","Delivered"];
  const MSGS={New:"Order received — we're getting your food ready 👍",
    Preparing:"Being freshly cooked in our kitchen 🔥",
    Ready:"Packed and waiting for your rider 📦",
    "Out for delivery":"Your rider is on the way 🛵",
    Delivered:"Delivered! Enjoy your meal 🍽️"};
  const search=()=>{ setFound(orders.find(o=>o.id.toLowerCase()===oid.trim().toLowerCase())||null); setSearched(true); };

  return (
    <div style={{ height:"100%",background:B.bg,overflowY:"auto" }}>
      <div style={{ maxWidth:480,margin:"0 auto",padding:"28px 20px 40px" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ fontSize:44,marginBottom:10 }}>📍</div>
          <div style={{ fontSize:22,fontWeight:800,color:B.text }}>Track your order</div>
          <div style={{ fontSize:14,color:B.textMid,marginTop:6,lineHeight:1.6 }}>
            Enter your order number from the WhatsApp message you received
          </div>
        </div>
        <div style={{ display:"flex",gap:10,marginBottom:14 }}>
          <input value={oid} onChange={e=>setOid(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()}
            placeholder="e.g. CHO104" style={{ flex:1,padding:"13px 16px",background:B.card,
              border:`1.5px solid ${B.border}`,borderRadius:12,color:B.text,
              fontSize:15,outline:"none",fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor=B.red}
            onBlur={e=>e.target.style.borderColor=B.border} />
          <button onClick={search} style={{ padding:"13px 20px",borderRadius:12,background:B.red,
            color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:14 }}>Track</button>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:20 }}>
          <span style={{ fontSize:12,color:B.textMid,alignSelf:"center" }}>Try:</span>
          {orders.map(o=>(
            <button key={o.id} onClick={()=>{ setOid(o.id); setFound(o); setSearched(true); }}
              style={{ padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,
                background:B.surface,border:`1px solid ${B.border}`,color:B.textMid,cursor:"pointer" }}>
              {o.id}
            </button>
          ))}
        </div>
        {searched&&!found&&(
          <Card style={{ textAlign:"center",padding:"32px 20px" }}>
            <div style={{ fontSize:36,marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:16,fontWeight:700,color:B.text }}>Order not found</div>
            <div style={{ fontSize:13,color:B.textMid,marginTop:6 }}>Check the order number in your WhatsApp confirmation</div>
          </Card>
        )}
        {found&&(
          <>
            <Card style={{ marginBottom:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:12,color:B.textDim,marginBottom:3 }}>{found.id}</div>
                  <div style={{ fontSize:17,fontWeight:800,color:B.text }}>{found.customer}</div>
                </div>
                <Pill s={found.status} />
              </div>
              {STAGES.map((st,i)=>{
                const idx=STAGES.indexOf(found.status);
                const done=i<=idx; const active=i===idx;
                return (
                  <div key={st} style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                      <div style={{ width:28,height:28,borderRadius:14,flexShrink:0,
                        background:done?B.red:B.surface,border:`2px solid ${done?B.red:B.border}`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",
                        boxShadow:active?`0 0 0 4px ${B.redLight}`:"" }}>
                        {done?(active?"●":"✓"):""}
                      </div>
                      {i<STAGES.length-1&&<div style={{ width:2,height:24,background:done&&!active?B.red:B.divider }} />}
                    </div>
                    <div style={{ paddingTop:4 }}>
                      <div style={{ fontSize:14,fontWeight:active?700:500,
                        color:active?B.red:done?B.text:B.textMid }}>{st}</div>
                      {active&&<div style={{ fontSize:12,color:B.textMid,marginTop:2 }}>{MSGS[st]}</div>}
                    </div>
                  </div>
                );
              })}
            </Card>
            <Card style={{ marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:700,color:B.text,marginBottom:8 }}>Order details</div>
              {found.items.map((it,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",
                  borderBottom:i<found.items.length-1?`1px solid ${B.divider}`:"none" }}>
                  <span style={{ fontSize:14,color:B.textMid }}>{it.name} ×{it.qty}</span>
                  <span style={{ fontSize:14,fontWeight:600,color:B.text }}>{fmt(it.price*it.qty)}</span>
                </div>
              ))}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderTop:`1px solid ${B.divider}`,marginTop:2 }}>
                <span style={{ color:B.textMid }}>Delivery</span>
                <span style={{ color:B.text }}>{fmt(found.deliveryFee)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,fontWeight:800,fontSize:15 }}>
                <span>Total</span><span style={{ color:B.red }}>{fmt(found.total)}</span>
              </div>
            </Card>
            <Card style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,color:B.textMid,fontWeight:600,textTransform:"uppercase",marginBottom:4 }}>Delivering to</div>
              <div style={{ fontSize:14,color:B.text,fontWeight:500 }}>📍 {found.address}</div>
              <div style={{ fontSize:13,color:B.textMid,marginTop:3 }}>📮 {found.postcode} · {found.zone}</div>
              {found.rider&&<div style={{ fontSize:13,color:B.green,marginTop:6,fontWeight:600 }}>🛵 Rider: {found.rider}</div>}
              <div style={{ marginTop:8,display:"flex",alignItems:"center",gap:6 }}>
                {found.paid
                  ?<span style={{ fontSize:12,color:B.green,fontWeight:700 }}>💳 {found.paymentMethod} — confirmed</span>
                  :<span style={{ fontSize:12,color:B.amber,fontWeight:700 }}>⏳ {found.paymentMethod} — pending</span>}
              </div>
            </Card>
            {found.status!=="Delivered"&&(
              <Btn full v="wa" onClick={()=>openWA(found.phone||"447800000000",
                `Hi Choma, checking on order ${found.id}. Status shows: ${found.status}. Any update? 🙏`)}>
                💬 Message kitchen
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

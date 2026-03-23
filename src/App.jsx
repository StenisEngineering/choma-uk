import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ─── AfroCrave Kitchen Brand Tokens ───────────────────────────
const B = {
  // Warm orange / gold / earthy palette
  primary:      "#D4580A",   // deep burnt orange
  primaryLight: "#FEF0E6",
  primaryDark:  "#A8420A",
  gold:         "#C8960A",   // rich gold
  goldLight:    "#FEF9E6",
  green:        "#1A6B3A",
  greenSoft:    "#E6F4EE",
  red:          "#C0392B",
  redSoft:      "#FDECEA",
  blue:         "#1A52A0",
  blueSoft:     "#E8EEF8",
  purple:       "#5C3D9A",
  purpleSoft:   "#F0ECF8",
  // Neutrals — warm cream base
  bg:           "#FFFBF5",
  card:         "#FFFFFF",
  cardWarm:     "#FFFDF8",
  border:       "#EDE8E0",
  surface:      "#F7F2EA",
  divider:      "#EDE8E0",
  // Text — warm brown tones
  text:         "#1A1208",
  textMid:      "#6B5D4A",
  textDim:      "#B0A08A",
  // WhatsApp
  wa:           "#25D366",
  // Kitchen number
  kitchenPhone: "447823644323",
  kitchenWA:    "447823644323",
};

const fmt = n => "£" + Number(n).toFixed(2);
const openWA = (phone, msg) =>
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");

// ─── Distance-based delivery calculator ───────────────────────
// Sunderland SR postcodes → flat £5
// Outside Sunderland → £5 base + £0.75/mile beyond 5 miles
// Approximate distances from Sunderland centre (SR1) in miles

const POSTCODE_DISTANCES = {
  // Sunderland — flat £5
  SR1:3, SR2:3, SR3:4, SR4:3, SR5:4, SR6:4, SR7:6, SR8:10,
  // Northeast areas
  DH1:12, DH2:10, DH3:8, DH4:7, DH5:8, DH6:14,
  NE1:15, NE2:15, NE3:16, NE4:15, NE5:17, NE6:14,
  NE8:13, NE9:12, NE10:11, NE11:13, NE16:14,
  NE31:10, NE32:10, NE33:11, NE34:10, NE35:9, NE36:9,
  NE37:8, NE38:8, NE39:15,
  TS1:25, TS2:24, TS3:24, TS4:25, TS5:26,
  DL1:25, DL2:24, DL3:26,
};

const isSunderland = pc => {
  const upper = pc.trim().toUpperCase();
  return upper.startsWith("SR") && !["SR7","SR8"].includes(upper.slice(0,3));
};

const calculateDelivery = (postcode) => {
  const pc = postcode.trim().toUpperCase();
  const prefix = pc.match(/^([A-Z]{1,2}\d{1,2})/)?.[1];
  if (!prefix) return null;

  if (isSunderland(pc)) {
    return { fee: 5.00, label: "Sunderland", miles: 0, available: true };
  }

  const miles = POSTCODE_DISTANCES[prefix];
  if (!miles) return { fee: 0, label: "", miles: 0, available: false };

  const fee = miles <= 5 ? 5.00 : 5.00 + Math.round((miles - 5) * 0.75 * 100) / 100;
  const area = prefix.startsWith("NE") ? "Newcastle / Tyneside"
    : prefix.startsWith("DH") ? "County Durham"
    : prefix.startsWith("TS") ? "Teesside"
    : prefix.startsWith("DL") ? "Darlington"
    : "Northeast";

  return { fee: Math.min(fee, 15.00), label: area, miles, available: true };
};

// ─── Status styles ─────────────────────────────────────────────
const SS = {
  "New":              { bg:B.blueSoft,    color:B.blue    },
  "Preparing":        { bg:B.primaryLight,color:B.primary },
  "Ready":            { bg:B.goldLight,   color:B.gold    },
  "Out for delivery": { bg:"#FFF8E6",     color:"#9A6B00" },
  "Delivered":        { bg:B.greenSoft,   color:B.green   },
  "Cancelled":        { bg:B.surface,     color:B.textMid },
};

function normalise(o) {
  return {
    ...o,
    items:         typeof o.items==="string" ? JSON.parse(o.items) : (o.items||[]),
    customer:      o.customer_name,
    phone:         o.customer_phone,
    email:         o.customer_email,
    address:       o.delivery_address,
    zone:          o.delivery_zone,
    deliveryFee:   o.delivery_fee,
    paymentMethod: o.payment_method,
    rider:         o.rider_name,
    note:          o.note||"",
  };
}

// ─── Shared hook ───────────────────────────────────────────────
function useOrders() {
  const [orders, setOrders] = useState([]);
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders").select("*").order("created_at",{ascending:false});
    if (!error && data) setOrders(data.map(normalise));
  };
  useEffect(()=>{
    fetchOrders();
    const sub = supabase.channel("orders_ac")
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},fetchOrders)
      .subscribe();
    return ()=>supabase.removeChannel(sub);
  },[]);
  return [orders, setOrders, fetchOrders];
}

// ─── Shared atoms ──────────────────────────────────────────────
function Pill({ s }) {
  const c = SS[s]||{bg:B.surface,color:B.textMid};
  return <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,
    background:c.bg,color:c.color,whiteSpace:"nowrap"}}>{s}</span>;
}

function Card({ children, onClick, style={} }) {
  return <div onClick={onClick} style={{background:B.card,border:`1px solid ${B.border}`,
    borderRadius:18,padding:"16px 18px",cursor:onClick?"pointer":"default",
    transition:"box-shadow 0.15s,transform 0.1s",...style}}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow="0 6px 24px rgba(212,88,10,0.12)";e.currentTarget.style.transform="translateY(-1px)";}}}
    onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}}>
    {children}
  </div>;
}

function Btn({ children, onClick, v="primary", full=false, style={}, disabled=false }) {
  const vs = {
    primary:{ background:B.primary, color:"#fff" },
    gold:   { background:B.gold,    color:"#fff" },
    ghost:  { background:B.surface, color:B.text, border:`1px solid ${B.border}` },
    wa:     { background:B.wa,      color:"#fff" },
    green:  { background:B.green,   color:"#fff" },
    orange: { background:B.primary, color:"#fff" },
    stripe: { background:"#635BFF", color:"#fff" },
    danger: { background:B.redSoft, color:B.red, border:`1px solid ${B.red}30` },
  };
  return <button onClick={onClick} disabled={disabled}
    style={{padding:"14px 20px",borderRadius:14,fontSize:15,fontWeight:700,border:"none",
      cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.45:1,
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
      boxSizing:"border-box",transition:"transform 0.1s,box-shadow 0.1s",letterSpacing:0.2,
      ...vs[v],...style}}
    onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type="text", hint }) {
  return <div style={{marginBottom:16}}>
    {label&&<div style={{fontSize:13,fontWeight:700,color:B.textMid,marginBottom:6,
      textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{width:"100%",padding:"13px 15px",background:B.surface,
        border:`1.5px solid ${B.border}`,borderRadius:12,color:B.text,
        fontSize:16,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
      onFocus={e=>e.target.style.borderColor=B.primary}
      onBlur={e=>e.target.style.borderColor=B.border}/>
    {hint&&<div style={{fontSize:12,color:B.textMid,marginTop:5,lineHeight:1.5}}>{hint}</div>}
  </div>;
}

function Section({ title, children, style={} }) {
  return <div style={{marginBottom:24,...style}}>
    <div style={{fontSize:13,fontWeight:700,color:B.textMid,textTransform:"uppercase",
      letterSpacing:0.6,marginBottom:12}}>{title}</div>
    {children}
  </div>;
}

function AllergenBadges({ allergens }) {
  const icons = {gluten:"🌾",dairy:"🥛",eggs:"🥚",nuts:"🥜",soya:"🫘",fish:"🐟",celery:"🥬",mustard:"🟡"};
  if(!allergens?.length) return <span style={{fontSize:12,color:B.green,fontWeight:600}}>✓ No major allergens</span>;
  return <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
    {allergens.map(a=>(
      <span key={a} style={{fontSize:11,background:B.goldLight,color:B.gold,
        borderRadius:6,padding:"2px 8px",fontWeight:600,border:`1px solid ${B.gold}30`}}>
        {icons[a]||"⚠️"} {a}
      </span>
    ))}
  </div>;
}

// ─── ORDER SUCCESS PAGE ────────────────────────────────────────
function OrderSuccessPage({ orderId, onDone }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      await supabase.from("orders").update({paid:true,payment_method:"Card payment"}).eq("id",orderId);
      const {data} = await supabase.from("orders").select("*").eq("id",orderId).single();
      if(data) setOrder(normalise(data));
      setLoading(false);
    };
    if(orderId) load();
  },[orderId]);

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.bg}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>⏳</div>
        <div style={{fontSize:18,fontWeight:700,color:B.text}}>Confirming your order…</div>
      </div>
    </div>
  );

  const o = order;
  if(!o) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:B.bg,padding:32}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>✅</div>
        <div style={{fontSize:20,fontWeight:800,color:B.text,marginBottom:16}}>Payment confirmed!</div>
        <Btn onClick={onDone}>Back to menu</Btn>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:B.bg,overflowY:"auto"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg, ${B.primary} 0%, ${B.gold} 100%)`,
        padding:"40px 24px 32px",textAlign:"center",color:"#fff"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.2)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,
          margin:"0 auto 16px",border:"3px solid rgba(255,255,255,0.5)"}}>✓</div>
        <div style={{fontSize:28,fontWeight:800,marginBottom:6,letterSpacing:-0.5}}>
          Order confirmed!
        </div>
        <div style={{fontSize:16,opacity:0.9,lineHeight:1.6}}>
          Thank you {o.customer.split(" ")[0]}!<br/>
          AfroCrave Kitchen is preparing your food.
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,
          background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"8px 16px"}}>
          <span style={{fontSize:14,fontWeight:700}}>💳 Payment confirmed · {o.paymentMethod}</span>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px 40px"}}>
        {/* Order number */}
        <Card style={{marginBottom:14,background:B.cardWarm}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:B.textMid,fontWeight:700,textTransform:"uppercase",
                letterSpacing:0.5,marginBottom:4}}>Order number</div>
              <div style={{fontSize:22,fontWeight:800,color:B.text}}>{o.id}</div>
            </div>
            <Pill s={o.status}/>
          </div>
        </Card>

        {/* Items */}
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:12}}>
            🍛 Items ordered
          </div>
          {o.items.map((it,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",
              padding:"10px 0",borderBottom:i<o.items.length-1?`1px solid ${B.divider}`:"none"}}>
              <span style={{fontSize:15,color:B.textMid}}>{it.name} ×{it.qty}</span>
              <span style={{fontSize:15,fontWeight:600,color:B.text}}>{fmt(it.price*it.qty)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",
            padding:"10px 0",borderTop:`1px solid ${B.divider}`,fontSize:14}}>
            <span style={{color:B.textMid}}>Delivery ({o.zone})</span>
            <span style={{color:B.text,fontWeight:600}}>{fmt(o.deliveryFee)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
            fontWeight:800,fontSize:18}}>
            <span>Total paid</span>
            <span style={{color:B.green}}>{fmt(o.total)}</span>
          </div>
        </Card>

        {/* Delivery */}
        <Card style={{marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:10}}>
            📍 Delivery details
          </div>
          <div style={{fontSize:15,color:B.textMid,marginBottom:6}}>{o.address}</div>
          <div style={{fontSize:14,color:B.textMid,marginBottom:8}}>📮 {o.postcode}</div>
          {o.note&&(
            <div style={{fontSize:14,color:B.primary,fontStyle:"italic",marginBottom:8}}>
              💬 "{o.note}"
            </div>
          )}
          <div style={{padding:"10px 14px",background:B.goldLight,borderRadius:10,
            fontSize:13,color:B.gold,fontWeight:600}}>
            ⏱ Estimated delivery: 45–75 minutes
          </div>
        </Card>

        {/* Actions */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Btn full v="wa" onClick={()=>openWA(B.kitchenWA,
            `Hello! My order ${o.id} is confirmed. Items: ${o.items.map(i=>`${i.name} ×${i.qty}`).join(", ")}. Total: ${fmt(o.total)}. Delivering to: ${o.address}.`)}>
            💬 Message kitchen on WhatsApp
          </Btn>
          <Btn full v="ghost" onClick={onDone}>Order again</Btn>
        </div>

        <div style={{marginTop:20,textAlign:"center",fontSize:12,color:B.textDim,lineHeight:1.7}}>
          Questions? WhatsApp us on +44 7823 644323<br/>
          AfroCrave Kitchen · Authentic Nigerian Home Cooking
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function AfroCraveApp() {
  const [view, setView] = useState("customer");
  const [cookBadge,  setCookBadge]  = useState(0);
  const [riderBadge, setRiderBadge] = useState(0);

  const params = new URLSearchParams(window.location.search);
  const successOrderId = params.get("order");
  const isSuccess      = params.get("success") === "true";

  const [showSuccess, setShowSuccess] = useState(isSuccess && !!successOrderId);

  const onOrderPlaced = () => setCookBadge(b=>b+1);

  const handleSuccessDone = () => {
    setShowSuccess(false);
    window.history.replaceState({},""," /");
  };

  if(showSuccess && successOrderId) return (
    <OrderSuccessPage orderId={successOrderId} onDone={handleSuccessDone}/>
  );

  const TABS = [
    {id:"customer", label:"🛒 Order"},
    {id:"cook",     label:"👩‍🍳 Kitchen", badge:cookBadge},
    {id:"rider",    label:"🛵 Rider",   badge:riderBadge},
    {id:"tracking", label:"📍 Track"},
  ];

  return (
    <div style={{minHeight:"100vh",background:B.bg,display:"flex",flexDirection:"column",
      fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",maxWidth:600,margin:"0 auto"}}>
      {/* Top nav bar */}
      <div style={{background:B.card,borderBottom:`1px solid ${B.divider}`,
        padding:"10px 16px",flexShrink:0,position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
              style={{width:44,height:44,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:B.text,letterSpacing:-0.3}}>
                AfroCrave Kitchen
              </div>
              <div style={{fontSize:11,color:B.primary,fontWeight:600,letterSpacing:0.5}}>
                AUTHENTIC NIGERIAN CUISINE
              </div>
            </div>
          </div>
          <div style={{fontSize:10,color:B.textDim,fontWeight:600,letterSpacing:1,
            textTransform:"uppercase",textAlign:"right",lineHeight:1.4}}>
            Powered by<br/>
            <span style={{color:B.primary,fontWeight:800}}>Choma</span>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setView(t.id);
              if(t.id==="cook") setCookBadge(0);
              if(t.id==="rider") setRiderBadge(0);}}
              style={{flex:1,padding:"8px 4px",borderRadius:12,fontSize:12,fontWeight:700,
                cursor:"pointer",border:"none",position:"relative",letterSpacing:0.2,
                background:view===t.id?B.primary:B.surface,
                color:view===t.id?"#fff":B.textMid,transition:"all 0.15s"}}>
              {t.label}
              {(t.badge||0)>0&&(
                <span style={{position:"absolute",top:-4,right:-2,width:18,height:18,
                  borderRadius:9,background:B.gold,color:"#fff",fontSize:10,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflow:"hidden"}}>
        {view==="customer" && <CustomerPage onOrderPlaced={onOrderPlaced}/>}
        {view==="cook"     && <CookDashboard/>}
        {view==="rider"    && <RiderApp/>}
        {view==="tracking" && <TrackingPage/>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. CUSTOMER PAGE
// ════════════════════════════════════════════════════════════════
function CustomerPage({ onOrderPlaced }) {
  const [cart,          setCart]          = useState({});
  const [menuItems,     setMenuItems]     = useState([]);
  const [step,          setStep]          = useState("menu");
  const [info,          setInfo]          = useState({name:"",phone:"",email:"",postcode:"",address:"",note:""});
  const [filter,        setFilter]        = useState("All");
  const [showAllergens, setShowAllergens] = useState(null);
  const [payStep,       setPayStep]       = useState("form");
  const [payError,      setPayError]      = useState("");
  const [gdpr,          setGdpr]          = useState(false);

  useEffect(()=>{
    supabase.from("menu_items").select("*").eq("available",true).order("category")
      .then(({data,error})=>{if(!error&&data) setMenuItems(data);});
  },[]);

  const add = id => setCart(c=>({...c,[id]:(c[id]||0)+1}));
  const rem = id => setCart(c=>{const n={...c};n[id]>1?n[id]--:delete n[id];return n;});

  const delivery    = info.postcode.length>2 ? calculateDelivery(info.postcode) : null;
  const deliveryFee = delivery?.fee ?? 0;
  const subtotal    = Object.entries(cart).reduce((s,[id,q])=>{
    const m=menuItems.find(m=>m.id===id); return s+(m?m.price*q:0);
  },0);
  const total = subtotal + (delivery?.available ? deliveryFee : 0);
  const count = Object.values(cart).reduce((s,q)=>s+q,0);
  const shown = menuItems.filter(m=>filter==="All"||m.category===filter);

  const cats = [...new Set(menuItems.map(m=>m.category))];

  const buildOrder = (paymentMethod) => ({
    id:            `ACK${Date.now().toString().slice(-4)}`,
    customer:      info.name,
    phone:         info.phone.replace(/\D/g,""),
    email:         info.email,
    postcode:      info.postcode.toUpperCase(),
    address:       info.address||`${info.postcode.toUpperCase()}, UK`,
    note:          info.note,
    zone:          delivery?.label||"",
    items:         Object.entries(cart).map(([id,qty])=>{
      const m=menuItems.find(m=>m.id===id); return m?{name:m.name,qty,price:m.price}:null;
    }).filter(Boolean),
    subtotal, deliveryFee, total,
    status:        "New",
    time:          new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
    rider:         null, paymentMethod, paid:false,
  });

  const saveOrder = async (o) => {
    await supabase.from("orders").insert([{
      id:o.id, customer_name:o.customer, customer_phone:o.phone,
      customer_email:o.email, delivery_address:o.address,
      postcode:o.postcode, delivery_zone:o.zone,
      delivery_fee:o.deliveryFee, subtotal:o.subtotal,
      total:o.total, status:"New", payment_method:o.paymentMethod,
      paid:o.paid, note:o.note, items:o.items,
    }]);
    return o;
  };

  // ── Payment ──
  if(step==="payment") return (
    <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px 60px"}}>
        <button onClick={()=>{setStep("checkout");setPayStep("form");setPayError("");}}
          style={{background:B.card,border:`1px solid ${B.border}`,borderRadius:10,
            padding:"10px 16px",color:B.textMid,fontSize:14,cursor:"pointer",
            marginBottom:24,display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
          ‹ Back
        </button>

        <div style={{fontSize:24,fontWeight:800,color:B.text,marginBottom:4,letterSpacing:-0.5}}>
          Secure payment
        </div>
        <div style={{fontSize:14,color:B.textMid,marginBottom:24}}>
          Powered by Stripe · 256-bit SSL encryption
        </div>

        <div style={{background:`linear-gradient(135deg,${B.primaryLight},${B.goldLight})`,
          border:`1px solid ${B.primary}25`,borderRadius:16,
          padding:"16px 20px",marginBottom:24,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:15,color:B.textMid,fontWeight:600}}>Total to pay</span>
          <span style={{fontSize:22,fontWeight:800,color:B.primary}}>{fmt(total)}</span>
        </div>

        {payError&&(
          <div style={{padding:"14px 16px",background:B.redSoft,border:`1px solid ${B.red}30`,
            borderRadius:12,marginBottom:16,fontSize:14,color:B.red,fontWeight:600}}>
            ⚠️ {payError}
          </div>
        )}

        {payStep==="form"&&(
          <>
            <Card style={{marginBottom:16,background:B.surface}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <span style={{fontSize:24}}>🔒</span>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:B.text}}>Secure card payment</div>
                  <div style={{fontSize:13,color:B.textMid}}>
                    You'll be redirected to Stripe's secure checkout
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {["💳 Visa","💳 Mastercard","💳 Amex"].map(c=>(
                  <span key={c} style={{fontSize:12,color:B.textMid,background:B.card,
                    border:`1px solid ${B.border}`,borderRadius:8,padding:"4px 10px",fontWeight:600}}>
                    {c}
                  </span>
                ))}
              </div>
            </Card>

            <Btn full v="stripe" style={{fontSize:16,padding:"16px"}} onClick={async()=>{
              setPayStep("processing"); setPayError("");
              try {
                const o = buildOrder("Card payment");
                await saveOrder(o);
                onOrderPlaced();
                const response = await fetch("/api/create-checkout",{
                  method:"POST",
                  headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({items:o.items,deliveryFee:o.deliveryFee,
                    orderId:o.id,customerEmail:o.email}),
                });
                const data = await response.json();
                if(data.url){ window.location.assign(data.url); }
                else { setPayError(data.error||"Payment failed. Please try again."); setPayStep("form"); }
              } catch(err) {
                setPayError("Connection error. Please check your internet and try again.");
                setPayStep("form");
              }
            }}>🔒 Pay {fmt(total)} securely</Btn>

            <div style={{marginTop:16,textAlign:"center"}}>
              <div style={{fontSize:13,color:B.textMid,marginBottom:12}}>— or —</div>
              <Btn full v="ghost" style={{fontSize:15}} onClick={async()=>{
                const o = buildOrder("Bank transfer");
                await saveOrder(o);
                onOrderPlaced();
                setPayStep("bank");
              }}>🏦 Pay by bank transfer</Btn>
            </div>
          </>
        )}

        {payStep==="processing"&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:56,marginBottom:16}}>⏳</div>
            <div style={{fontSize:18,fontWeight:700,color:B.text,marginBottom:8}}>
              Connecting to Stripe…
            </div>
            <div style={{fontSize:14,color:B.textMid}}>
              Please wait, do not close this page
            </div>
          </div>
        )}

        {payStep==="bank"&&(
          <div>
            <Card style={{marginBottom:14,background:B.greenSoft,borderColor:`${B.green}30`}}>
              <div style={{fontSize:15,fontWeight:700,color:B.green,marginBottom:12}}>
                Bank transfer details
              </div>
              {[["Account name","AfroCrave Kitchen"],["Sort code","XX-XX-XX"],
                ["Account number","XXXXXXXX"],["Reference","Your order ID"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:`1px solid ${B.green}20`,fontSize:14}}>
                  <span style={{color:B.textMid}}>{l}</span>
                  <span style={{fontWeight:700,color:B.text}}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{fontSize:14,color:B.textMid,lineHeight:1.7,marginBottom:20,
              padding:"14px 16px",background:B.surface,borderRadius:12}}>
              💬 Please send payment and WhatsApp us to confirm.
              Your order will be prepared once payment is verified.
            </div>
            <Btn full v="wa" onClick={()=>openWA(B.kitchenWA,
              `Hi AfroCrave Kitchen! I've just placed an order and will be paying by bank transfer. Please confirm bank details. Thank you!`)}>
              💬 Confirm via WhatsApp
            </Btn>
          </div>
        )}
      </div>
    </div>
  );

  // ── Checkout ──
  if(step==="checkout") return (
    <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px 60px"}}>
        <button onClick={()=>setStep("menu")} style={{background:B.card,
          border:`1px solid ${B.border}`,borderRadius:10,padding:"10px 16px",
          color:B.textMid,fontSize:14,cursor:"pointer",marginBottom:24,
          display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
          ‹ Back to menu
        </button>
        <div style={{fontSize:24,fontWeight:800,color:B.text,marginBottom:20,letterSpacing:-0.5}}>
          Your order
        </div>

        {/* Cart items */}
        <Card style={{marginBottom:20}}>
          {Object.entries(cart).map(([id,qty])=>{
            const m=menuItems.find(m=>m.id===id); return m?(
            <div key={id} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${B.divider}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:26}}>{m.emoji}</span>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:B.text}}>{m.name}</div>
                  <div style={{fontSize:13,color:B.textMid}}>{fmt(m.price)} each</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>rem(m.id)} style={{width:32,height:32,borderRadius:10,
                  background:B.surface,border:`1px solid ${B.border}`,cursor:"pointer",fontSize:18,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontSize:17,fontWeight:700,color:B.primary,minWidth:20,
                  textAlign:"center"}}>{qty}</span>
                <button onClick={()=>add(m.id)} style={{width:32,height:32,borderRadius:10,
                  background:B.primary,border:"none",color:"#fff",cursor:"pointer",fontSize:18,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ):null;})}
          <div style={{paddingTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:14}}>
              <span style={{color:B.textMid}}>Subtotal</span>
              <span style={{color:B.text,fontWeight:600}}>{fmt(subtotal)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:14}}>
              <span style={{color:B.textMid}}>Delivery</span>
              <span style={{color:delivery?.available?B.text:B.textDim,fontWeight:600}}>
                {delivery?.available ? fmt(deliveryFee) : "Enter postcode below"}
              </span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
              fontWeight:800,fontSize:18,borderTop:`1px solid ${B.divider}`,marginTop:4}}>
              <span>Total</span>
              <span style={{color:B.primary}}>
                {delivery?.available ? fmt(total) : "—"}
              </span>
            </div>
          </div>
        </Card>

        {/* Customer details */}
        <Section title="Your details">
          <Input label="Full name" value={info.name}
            onChange={v=>setInfo(i=>({...i,name:v}))} placeholder="Your full name"/>
          <Input label="Phone / WhatsApp" value={info.phone}
            onChange={v=>setInfo(i=>({...i,phone:v}))} placeholder="+44 7xxx xxxxxx"
            hint="UK format — we'll send order updates here"/>
          <Input label="Email address" value={info.email}
            onChange={v=>setInfo(i=>({...i,email:v}))} placeholder="your@email.com"
            type="email" hint="Your Stripe receipt will be sent here"/>
        </Section>

        <Section title="Delivery address">
          <Input label="Postcode" value={info.postcode}
            onChange={v=>setInfo(i=>({...i,postcode:v}))} placeholder="SR1 1AA"
            hint={
              delivery?.available
                ? `✓ ${delivery.label} — delivery fee: ${fmt(delivery.fee)}${delivery.miles>5?` (${delivery.miles} miles)`:""}`
                : delivery && !delivery.available
                ? "⚠️ Sorry, we don't currently deliver to this area"
                : "Enter your postcode to calculate delivery"
            }/>
          {delivery && !delivery.available && info.postcode.length > 3 && (
            <div style={{padding:"12px 16px",background:B.redSoft,border:`1px solid ${B.red}30`,
              borderRadius:12,marginTop:-8,marginBottom:16,fontSize:14,color:B.red,fontWeight:600}}>
              ⚠️ We don't currently deliver to {info.postcode.toUpperCase()}.
              We deliver across Sunderland and the Northeast.
            </div>
          )}
          <Input label="Full address" value={info.address}
            onChange={v=>setInfo(i=>({...i,address:v}))}
            placeholder="123 High Street, Sunderland SR1 1AA"/>
          <Input label="Delivery note (optional)" value={info.note}
            onChange={v=>setInfo(i=>({...i,note:v}))}
            placeholder="Leave at door, ring bell twice, etc."/>
        </Section>

        {/* Delivery info */}
        <Card style={{marginBottom:20,background:B.surface,borderColor:"transparent"}}>
          <div style={{fontSize:13,fontWeight:700,color:B.textMid,textTransform:"uppercase",
            letterSpacing:0.5,marginBottom:12}}>Delivery pricing</div>
          <div style={{fontSize:14,color:B.textMid,lineHeight:1.8}}>
            📍 <strong style={{color:B.text}}>Sunderland (all SR postcodes)</strong> — flat £5.00<br/>
            🗺 <strong style={{color:B.text}}>Outside Sunderland</strong> — £5.00 + £0.75/mile<br/>
            📦 <strong style={{color:B.text}}>Newcastle, Durham, Seaham</strong> and more
          </div>
        </Card>

        {/* GDPR */}
        <div style={{background:B.surface,border:`1px solid ${B.border}`,
          borderRadius:14,padding:"16px",marginBottom:24}}>
          <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
            <input type="checkbox" checked={gdpr} onChange={e=>setGdpr(e.target.checked)}
              style={{marginTop:3,flexShrink:0,width:18,height:18}}/>
            <div style={{fontSize:14,color:B.textMid,lineHeight:1.7}}>
              I agree to AfroCrave Kitchen's{" "}
              <span style={{color:B.primary,textDecoration:"underline",cursor:"pointer"}}>
                Privacy Policy
              </span>
              {" "}and consent to my data being processed to fulfil this order.
              <span style={{display:"block",marginTop:4,fontSize:12,color:B.textDim}}>
                UK GDPR compliant · You can request deletion at any time
              </span>
            </div>
          </label>
        </div>

        <Btn full style={{fontSize:16,padding:"16px"}}
          onClick={()=>setStep("payment")}
          disabled={!info.name||!info.phone||!info.postcode||!delivery?.available||!gdpr}>
          Continue to payment →
        </Btn>
        {!gdpr&&info.name&&(
          <div style={{textAlign:"center",fontSize:13,color:B.textMid,marginTop:10}}>
            Please accept the privacy policy to continue
          </div>
        )}
      </div>
    </div>
  );

  // ── Main menu ──
  return (
    <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg, #2A1208 0%, #5C2A08 50%, #8A4510 100%)`,
        padding:"32px 24px 28px",color:"#fff",position:"relative",overflow:"hidden"}}>
        {/* decorative circles */}
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,
          borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
        <div style={{position:"absolute",bottom:-60,left:-30,width:160,height:160,
          borderRadius:"50%",background:"rgba(212,88,10,0.15)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
            style={{width:100,height:100,borderRadius:20,objectFit:"cover",
              marginBottom:14,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}/>
          <div style={{fontSize:11,color:"rgba(255,200,100,0.8)",fontWeight:700,
            letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>
            ✦ Home Kitchen · Sunderland ✦
          </div>
          <div style={{fontSize:34,fontWeight:900,letterSpacing:-1,marginBottom:10,
            lineHeight:1.15,textShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
            Authentic Nigerian<br/>
            <span style={{color:"#F5C842"}}>Home Cooking</span>
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",lineHeight:1.8,
            marginBottom:20,maxWidth:300,fontWeight:400}}>
            Made fresh to order, delivered hot to your door across Sunderland & the Northeast.
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["⏱ 45–75 min"],["✓ All Halal"],["🏠 Home cooked"],["💳 Card / Bank"]].map((tx)=>(
              <div key={tx} style={{
                background:"rgba(245,200,66,0.15)",
                border:"1px solid rgba(245,200,66,0.3)",
                borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:700,
                color:"rgba(255,255,255,0.95)",letterSpacing:0.3}}>
                {tx}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allergen notice */}
      <div style={{margin:"16px 20px 0",padding:"12px 16px",background:B.goldLight,
        border:`1px solid ${B.gold}30`,borderRadius:12,
        fontSize:13,color:B.gold,lineHeight:1.6,fontWeight:500}}>
        ⚠️ <strong>Allergen info:</strong> Tap any item to see allergen details.
        Severe allergy? Please WhatsApp us before ordering.
      </div>

      {/* Category filters */}
      <div style={{padding:"16px 20px 8px",display:"flex",gap:8,overflowX:"auto"}}>
        {["All",...cats].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"8px 18px",borderRadius:20,
            fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${filter===f?B.primary:B.border}`,
            background:filter===f?B.primaryLight:"transparent",
            color:filter===f?B.primary:B.textMid}}>
            {f}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{padding:"8px 20px 20px"}}>
        {shown.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:B.textMid}}>
            <div style={{fontSize:40,marginBottom:12}}>🍳</div>
            <div style={{fontSize:16,fontWeight:600}}>Menu loading…</div>
          </div>
        )}
        {shown.map(m=>(
          <div key={m.id} style={{background:B.card,border:`1px solid ${B.border}`,
            borderRadius:18,padding:"16px",marginBottom:14,
            transition:"box-shadow 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",gap:12}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,flex:1}}>
                <div style={{width:62,height:62,borderRadius:16,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:32,flexShrink:0}}>{m.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:B.text,lineHeight:1.3,
                    marginBottom:4}}>{m.name}</div>
                  <div style={{fontSize:13,color:B.textMid,lineHeight:1.6,
                    marginBottom:8}}>{m.description}</div>
                  <div style={{display:"flex",gap:10,alignItems:"center",
                    flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontSize:18,fontWeight:800,color:B.primary}}>
                      {fmt(m.price)}
                    </span>
                    {m.portion&&<span style={{fontSize:12,color:B.textDim}}>{m.portion}</span>}
                    {m.calories&&<span style={{fontSize:12,color:B.textDim}}>{m.calories} kcal</span>}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    {m.is_halal&&(
                      <span style={{fontSize:11,background:B.greenSoft,color:B.green,
                        borderRadius:6,padding:"2px 8px",fontWeight:700,
                        border:`1px solid ${B.green}20`}}>✓ Halal</span>
                    )}
                    {m.is_vegan&&(
                      <span style={{fontSize:11,background:B.purpleSoft,color:B.purple,
                        borderRadius:6,padding:"2px 8px",fontWeight:700}}>🌱 Vegan</span>
                    )}
                    <button onClick={()=>setShowAllergens(showAllergens===m.id?null:m.id)}
                      style={{fontSize:11,padding:"2px 8px",borderRadius:6,cursor:"pointer",
                        background:B.goldLight,color:B.gold,border:`1px solid ${B.gold}30`,
                        fontWeight:600}}>
                      Allergens ⓘ
                    </button>
                  </div>
                  {showAllergens===m.id&&(
                    <div style={{marginTop:10,padding:"10px 12px",background:B.goldLight,
                      borderRadius:10,border:`1px solid ${B.gold}20`}}>
                      <AllergenBadges allergens={m.allergens}/>
                    </div>
                  )}
                </div>
              </div>
              {/* Add/remove controls */}
              <div style={{flexShrink:0}}>
                {cart[m.id]?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    <button onClick={()=>add(m.id)} style={{width:36,height:36,borderRadius:10,
                      background:B.primary,border:"none",color:"#fff",cursor:"pointer",
                      fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                    <span style={{fontSize:17,fontWeight:800,color:B.primary}}>{cart[m.id]}</span>
                    <button onClick={()=>rem(m.id)} style={{width:36,height:36,borderRadius:10,
                      background:B.surface,border:`1px solid ${B.border}`,color:B.text,
                      cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",
                      justifyContent:"center"}}>−</button>
                  </div>
                ):(
                  <button onClick={()=>add(m.id)} style={{width:44,height:44,borderRadius:14,
                    background:B.primary,border:"none",color:"#fff",cursor:"pointer",
                    fontSize:24,display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:`0 4px 12px ${B.primary}40`}}>+</button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div style={{height:120}}/>
      </div>

      {/* Sticky cart button */}
      {count>0&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:600,padding:"16px 20px 24px",
          background:`linear-gradient(transparent, ${B.bg} 30%)`,pointerEvents:"none"}}>
          <button onClick={()=>setStep("checkout")}
            style={{width:"100%",padding:"18px 24px",borderRadius:18,
              background:`linear-gradient(135deg, ${B.primary}, ${B.gold})`,
              color:"#fff",border:"none",cursor:"pointer",
              fontWeight:800,fontSize:16,display:"flex",alignItems:"center",
              justifyContent:"space-between",pointerEvents:"all",
              boxShadow:`0 8px 32px ${B.primary}50`,letterSpacing:0.2}}>
            <span style={{background:"rgba(255,255,255,0.2)",borderRadius:10,
              padding:"4px 12px",fontSize:14}}>
              {count} item{count!==1?"s":""}
            </span>
            <span>View order</span>
            <span style={{fontSize:18,fontWeight:800}}>{fmt(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. COOK / KITCHEN DASHBOARD
// ════════════════════════════════════════════════════════════════
function CookDashboard() {
  const [orders,, fetchOrders] = useOrders();
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("live");

  const NEXT = {"New":"Preparing","Preparing":"Ready","Ready":"Out for delivery","Out for delivery":"Delivered"};
  const live = orders.filter(o=>!["Delivered","Cancelled"].includes(o.status));
  const done = orders.filter(o=>["Delivered","Cancelled"].includes(o.status));
  const list = tab==="live"?live:done;
  const todayRev = orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0);

  const advance = async (o) => {
    const next=NEXT[o.status]; if(!next) return;
    await supabase.from("orders").update({status:next}).eq("id",o.id);
    fetchOrders();
    if(sel?.id===o.id) setSel(p=>p?{...p,status:next}:null);
    const msgs = {
      Preparing:"🔥 We've started preparing your order!",
      Ready:"✅ Your food is packed and ready for pickup by our rider.",
      "Out for delivery":"🛵 Your order is on its way to you!",
      Delivered:"🎉 Delivered! Thank you for ordering from AfroCrave Kitchen ❤️",
    };
    openWA(o.phone,
      `Hello ${o.customer.split(" ")[0]} 👋\n\n${msgs[next]}\n\nAfroCrave Kitchen 🍛\nTrack: afrocravekitchen.co.uk/track/${o.id}`);
  };

  return (
    <div style={{height:"100%",background:B.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 20px 12px",background:B.card,
        borderBottom:`1px solid ${B.divider}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:B.text}}>🍳 Kitchen live</div>
            <div style={{fontSize:13,color:B.textMid}}>AfroCrave Kitchen · Sunderland</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:B.textMid,fontWeight:700,textTransform:"uppercase"}}>
              Today's revenue
            </div>
            <div style={{fontSize:20,fontWeight:800,color:B.green}}>{fmt(todayRev)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["New",B.blue,B.blueSoft],["Cooking",B.primary,B.primaryLight],
            ["On way","#9A6B00","#FFF8E6"],["Done",B.green,B.greenSoft]].map(([l,c,bg])=>(
            <div key={l} style={{flex:1,background:bg,borderRadius:12,
              padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>
                {orders.filter(o=>o.status===(
                  l==="Cooking"?"Preparing":l==="On way"?"Out for delivery":
                  l==="Done"?"Delivered":l)).length}
              </div>
              <div style={{fontSize:11,color:c,fontWeight:700,opacity:0.8}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:B.card,borderBottom:`1px solid ${B.divider}`,
        flexShrink:0}}>
        {[["live",`Live (${live.length})`],["done",`Done (${done.length})`]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:"13px",background:"none",border:"none",cursor:"pointer",
              fontSize:14,fontWeight:700,
              color:tab===id?B.primary:B.textMid,
              borderBottom:tab===id?`3px solid ${B.primary}`:"3px solid transparent"}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
        {/* Order list */}
        <div style={{width:sel?"42%":"100%",overflowY:"auto",
          borderRight:sel?`1px solid ${B.divider}`:"none",transition:"width 0.2s"}}>
          {list.length===0&&(
            <div style={{padding:"48px 20px",textAlign:"center",color:B.textMid}}>
              <div style={{fontSize:40,marginBottom:12}}>🎉</div>
              <div style={{fontSize:16,fontWeight:700}}>
                {tab==="live"?"All caught up!":"No completed orders yet"}
              </div>
            </div>
          )}
          {list.map(o=>(
            <div key={o.id} onClick={()=>setSel(sel?.id===o.id?null:o)}
              style={{padding:"14px 18px",borderBottom:`1px solid ${B.divider}`,
                cursor:"pointer",transition:"background 0.12s",
                background:sel?.id===o.id?B.surface:"transparent",
                borderLeft:`4px solid ${sel?.id===o.id?B.primary:"transparent"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:B.text}}>{o.customer}</div>
                  <div style={{fontSize:12,color:B.textDim}}>{o.id} · {o.postcode}</div>
                </div>
                <Pill s={o.status}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:B.textMid}}>
                  {o.items.length} item{o.items.length!==1?"s":""}
                </span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {o.paid
                    ?<span style={{fontSize:12,color:B.green,fontWeight:700}}>💳 Paid</span>
                    :<span style={{fontSize:12,color:B.gold,fontWeight:700}}>⏳ Awaiting</span>}
                  <span style={{fontSize:14,fontWeight:800,color:B.primary}}>{fmt(o.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {sel&&(
          <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:800,color:B.text}}>{sel.customer}</div>
              <button onClick={()=>setSel(null)} style={{background:B.surface,
                border:`1px solid ${B.border}`,borderRadius:8,width:30,height:30,
                cursor:"pointer",color:B.textMid,fontSize:16}}>✕</button>
            </div>
            <Card style={{marginBottom:12}}>
              {sel.items.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:i<sel.items.length-1?`1px solid ${B.divider}`:"none",
                  fontSize:14}}>
                  <span style={{color:B.textMid}}>{it.name} ×{it.qty}</span>
                  <span style={{fontWeight:600,color:B.text}}>{fmt(it.price*it.qty)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
                borderTop:`1px solid ${B.divider}`,fontSize:13}}>
                <span style={{color:B.textMid}}>Delivery</span>
                <span style={{color:B.text,fontWeight:600}}>{fmt(sel.deliveryFee)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
                fontWeight:800,fontSize:16}}>
                <span>Total</span>
                <span style={{color:B.primary}}>{fmt(sel.total)}</span>
              </div>
            </Card>
            <div style={{background:B.surface,borderRadius:12,padding:"12px 14px",
              marginBottom:12,fontSize:14}}>
              <div style={{color:B.textMid,marginBottom:4}}>📍 {sel.address}</div>
              <div style={{color:B.textMid,marginBottom:4}}>📮 {sel.postcode} · {sel.zone}</div>
              {sel.note&&<div style={{color:B.primary,fontStyle:"italic"}}>💬 "{sel.note}"</div>}
              {sel.rider&&<div style={{color:B.green,fontWeight:600,marginTop:4}}>🛵 {sel.rider}</div>}
              <div style={{marginTop:8}}>
                {sel.paid
                  ?<span style={{fontSize:13,color:B.green,fontWeight:700}}>💳 {sel.paymentMethod} — paid</span>
                  :<span style={{fontSize:13,color:B.gold,fontWeight:700}}>⏳ {sel.paymentMethod} — awaiting</span>}
              </div>
            </div>
            {NEXT[sel.status]&&(
              <Btn full onClick={()=>advance(sel)} style={{marginBottom:10,fontSize:14}}>
                Mark as {NEXT[sel.status]} + notify 💬
              </Btn>
            )}
            <Btn full v="wa" style={{fontSize:14}}
              onClick={()=>openWA(sel.phone,
                `Hello ${sel.customer.split(" ")[0]}, update on order ${sel.id}: ${sel.status}. AfroCrave Kitchen 🍛`)}>
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
function RiderApp() {
  const RIDER = "Rider";
  const [orders,, fetchOrders] = useOrders();
  const [screen,      setScreen]      = useState("home");
  const [activeOrder, setActiveOrder] = useState(null);

  const mine      = orders.filter(o=>o.rider===RIDER&&o.status==="Out for delivery");
  const available = orders.filter(o=>o.status==="Ready"&&!o.rider);
  const completed = orders.filter(o=>o.rider===RIDER&&o.status==="Delivered");
  const earnings  = completed.length * 4.50;

  const claim = async (o) => {
    await supabase.from("orders").update({rider_name:RIDER}).eq("id",o.id);
    fetchOrders();
    openWA(B.kitchenWA,
      `Hi AfroCrave Kitchen! I'm claiming order ${o.id} for ${o.customer} (${o.postcode}). On my way to collect now 🛵`);
  };

  const pickup = async (o) => {
    await supabase.from("orders").update({status:"Out for delivery",rider_name:RIDER}).eq("id",o.id);
    fetchOrders();
    openWA(o.phone,
      `Hello ${o.customer.split(" ")[0]} 👋, your order from AfroCrave Kitchen is on its way!\n📍 Delivering to: ${o.address}\nEstimated: 20–30 mins 🛵`);
    setActiveOrder({...o,status:"Out for delivery"});
  };

  const deliver = async (o) => {
    await supabase.from("orders").update({status:"Delivered"}).eq("id",o.id);
    fetchOrders();
    openWA(o.phone,
      `Hello ${o.customer.split(" ")[0]} 🎉, your order has been delivered!\n\nEnjoy your meal from AfroCrave Kitchen 🍛\nThank you for ordering!`);
    setActiveOrder(null); setScreen("home");
  };

  if(screen==="earnings") return (
    <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
      <div style={{padding:"16px 20px 12px",background:B.card,
        borderBottom:`1px solid ${B.border}`,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setScreen("home")} style={{background:B.surface,
          border:`1px solid ${B.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",
          fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontSize:18,fontWeight:800,color:B.text}}>My earnings</div>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card style={{background:B.greenSoft,borderColor:"transparent",textAlign:"center",padding:"20px 12px"}}>
            <div style={{fontSize:12,color:B.green,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Today</div>
            <div style={{fontSize:30,fontWeight:800,color:B.green}}>{fmt(earnings)}</div>
          </Card>
          <Card style={{background:B.blueSoft,borderColor:"transparent",textAlign:"center",padding:"20px 12px"}}>
            <div style={{fontSize:12,color:B.blue,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Runs</div>
            <div style={{fontSize:30,fontWeight:800,color:B.blue}}>{completed.length}</div>
          </Card>
        </div>
        <Card style={{marginBottom:20,background:B.goldLight,borderColor:"transparent"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:B.gold,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Rate per delivery</div>
              <div style={{fontSize:26,fontWeight:800,color:B.gold}}>£4.50</div>
            </div>
            <div style={{fontSize:40}}>🛵</div>
          </div>
        </Card>
        {completed.map(o=>(
          <Card key={o.id} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:B.text}}>{o.customer}</div>
                <div style={{fontSize:13,color:B.textMid}}>📮 {o.postcode}</div>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:B.green}}>+£4.50</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  if(screen==="detail"&&activeOrder) {
    const live = orders.find(o=>o.id===activeOrder.id)||activeOrder;
    return (
      <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
        <div style={{padding:"16px 20px 12px",background:B.card,
          borderBottom:`1px solid ${B.border}`,display:"flex",
          justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setScreen("home")} style={{background:B.surface,
              border:`1px solid ${B.border}`,borderRadius:10,width:36,height:36,
              cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",
              justifyContent:"center"}}>‹</button>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:B.text}}>{live.id}</div>
              <div style={{fontSize:13,color:B.textMid}}>{live.customer}</div>
            </div>
          </div>
          <Pill s={live.status}/>
        </div>
        <div style={{padding:"20px"}}>
          {/* Address — prominent */}
          <div style={{background:`linear-gradient(135deg,#2A1208,#5C2A08)`,
            borderRadius:18,padding:"20px",marginBottom:16,textAlign:"center",color:"#fff"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:700,
              textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Deliver to</div>
            <div style={{fontSize:18,fontWeight:800,lineHeight:1.4}}>📍 {live.address}</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.7)",marginTop:6}}>
              📮 {live.postcode}
            </div>
            <button onClick={()=>window.open(`https://maps.google.com/?q=${encodeURIComponent(live.address)}`,"_blank")}
              style={{marginTop:14,padding:"10px 20px",borderRadius:20,
                background:"rgba(255,255,255,0.2)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",
                cursor:"pointer",fontWeight:700,fontSize:14}}>
              Open in Maps 🗺
            </button>
          </div>

          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:10}}>Customer</div>
            <div style={{fontSize:16,fontWeight:700,color:B.text}}>{live.customer}</div>
            <div style={{fontSize:14,color:B.textMid,marginTop:4}}>+{live.phone}</div>
            {live.note&&<div style={{fontSize:14,color:B.primary,marginTop:8,fontStyle:"italic"}}>💬 "{live.note}"</div>}
          </Card>

          <Card style={{marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:10}}>Items</div>
            {live.items.map((it,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                borderBottom:i<live.items.length-1?`1px solid ${B.divider}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:800,color:B.primary,flexShrink:0}}>{it.qty}×</div>
                <span style={{fontSize:15,color:B.text}}>{it.name}</span>
              </div>
            ))}
            <div style={{marginTop:12,padding:"10px 14px",background:B.greenSoft,
              borderRadius:10,fontSize:14,color:B.green,fontWeight:700}}>
              💳 Prepaid — no cash collection needed
            </div>
          </Card>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {live.status==="Ready"&&live.rider===RIDER&&(
              <Btn full v="gold" style={{fontSize:15}} onClick={()=>pickup(live)}>
                ✅ Confirm pickup — start delivery
              </Btn>
            )}
            {live.status==="Out for delivery"&&(
              <Btn full v="green" style={{fontSize:15}} onClick={()=>deliver(live)}>
                🎉 Mark as delivered
              </Btn>
            )}
            <Btn full v="wa" style={{fontSize:14}}
              onClick={()=>openWA(live.phone,
                `Hello ${live.customer.split(" ")[0]}, I'm your AfroCrave Kitchen delivery rider. I'll be with you at ${live.postcode} shortly 🛵`)}>
              💬 Message customer
            </Btn>
            <Btn full v="ghost" style={{fontSize:14}}
              onClick={()=>openWA(B.kitchenWA,
                `Hi AfroCrave Kitchen, issue with order ${live.id}. Please call me.`)}>
              📞 Contact kitchen
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:B.bg,minHeight:"100%",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"18px 20px 14px",background:B.card,
        borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:B.text}}>Hey {RIDER} 🛵</div>
            <div style={{fontSize:13,color:B.textMid}}>AfroCrave Kitchen · Sunderland</div>
          </div>
          <button onClick={()=>setScreen("earnings")}
            style={{background:B.greenSoft,border:`1px solid ${B.green}30`,
              borderRadius:14,padding:"10px 16px",cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:11,color:B.green,fontWeight:700,textTransform:"uppercase"}}>Today</div>
            <div style={{fontSize:18,fontWeight:800,color:B.green}}>{fmt(earnings)}</div>
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16}}>
          {[["Active",mine.length,B.primary],["Available",available.length,B.gold],["Done",completed.length,B.green]].map(([l,v,c])=>(
            <div key={l} style={{background:`${c}18`,borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:11,color:c,fontWeight:700,opacity:0.8}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {/* Active */}
        {mine.length>0&&(
          <>
            <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:12}}>🔴 Active delivery</div>
            {mine.map(o=>(
              <div key={o.id} style={{background:`linear-gradient(135deg,${B.primaryLight},#fff)`,
                border:`2px solid ${B.primary}30`,borderRadius:18,padding:"18px",
                marginBottom:16,cursor:"pointer"}}
                onClick={()=>{setActiveOrder(o);setScreen("detail");}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:B.text}}>{o.customer}</div>
                    <div style={{fontSize:13,color:B.textMid}}>📍 {o.address}</div>
                  </div>
                  <Pill s={o.status}/>
                </div>
                <Btn full v="primary" style={{fontSize:14}}
                  onClick={e=>{e.stopPropagation();setActiveOrder(o);setScreen("detail");}}>
                  View delivery details
                </Btn>
              </div>
            ))}
          </>
        )}

        {/* Available */}
        <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:12}}>
          🟢 Available to claim ({available.length})
        </div>
        {available.length===0&&(
          <Card style={{marginBottom:16}}>
            <div style={{textAlign:"center",padding:"16px 0",color:B.textMid,fontSize:14}}>
              No orders ready for pickup
            </div>
          </Card>
        )}
        {available.map(o=>(
          <Card key={o.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:B.text}}>{o.customer}</div>
                <div style={{fontSize:13,color:B.textMid}}>📮 {o.postcode} · {o.zone}</div>
                <div style={{fontSize:13,color:B.textMid}}>
                  {o.items.length} item{o.items.length!==1?"s":""}
                </div>
              </div>
              <div style={{background:B.goldLight,border:`1px solid ${B.gold}25`,
                borderRadius:12,padding:"8px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:B.gold,fontWeight:700}}>Earning</div>
                <div style={{fontSize:16,fontWeight:800,color:B.gold}}>£4.50</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn v="ghost" style={{flex:1,fontSize:13}}
                onClick={()=>{setActiveOrder(o);setScreen("detail");}}>
                View details
              </Btn>
              <Btn style={{flex:1,fontSize:13}} onClick={()=>claim(o)}>
                🛵 Claim order
              </Btn>
            </div>
          </Card>
        ))}

        {/* Completed */}
        {completed.length>0&&(
          <>
            <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:12,marginTop:4}}>
              ✅ Completed today ({completed.length})
            </div>
            {completed.map(o=>(
              <Card key={o.id} style={{marginBottom:10,opacity:0.7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:600,color:B.text}}>{o.customer}</div>
                    <div style={{fontSize:13,color:B.textMid}}>📮 {o.postcode}</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:B.green}}>+£4.50</div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{display:"flex",background:B.card,borderTop:`1px solid ${B.border}`,
        paddingTop:6,paddingBottom:12,flexShrink:0}}>
        {[["🏠","Home","home"],["📦","Orders","home"],["💰","Earnings","earnings"]].map(([ic,lb,sc])=>(
          <button key={lb} onClick={()=>setScreen(sc)}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"6px 0",color:screen===sc?B.primary:B.textDim,transition:"color 0.15s"}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:11,fontWeight:screen===sc?700:500}}>{lb}</span>
            {screen===sc&&<div style={{width:4,height:4,borderRadius:2,background:B.primary}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. ORDER TRACKING
// ════════════════════════════════════════════════════════════════
function TrackingPage() {
  const [orders] = useOrders();
  const [oid,      setOid]     = useState("");
  const [found,    setFound]   = useState(null);
  const [searched, setSearched]= useState(false);

  const STAGES = ["New","Preparing","Ready","Out for delivery","Delivered"];
  const MSGS = {
    New:"Order received — we're getting started 👍",
    Preparing:"Being freshly cooked in our kitchen 🔥",
    Ready:"Packed and waiting for your rider 📦",
    "Out for delivery":"Your rider is on the way 🛵",
    Delivered:"Delivered! Enjoy your meal 🍛",
  };

  const search = () => {
    setFound(orders.find(o=>o.id.toLowerCase()===oid.trim().toLowerCase())||null);
    setSearched(true);
  };

  return (
    <div style={{background:B.bg,minHeight:"100%",overflowY:"auto"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"32px 20px 60px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:12}}>📍</div>
          <div style={{fontSize:26,fontWeight:800,color:B.text,letterSpacing:-0.5}}>
            Track your order
          </div>
          <div style={{fontSize:15,color:B.textMid,marginTop:8,lineHeight:1.7}}>
            Enter your order number from<br/>your WhatsApp confirmation
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <input value={oid} onChange={e=>setOid(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&search()}
            placeholder="e.g. ACK1234"
            style={{flex:1,padding:"15px 18px",background:B.card,
              border:`1.5px solid ${B.border}`,borderRadius:14,color:B.text,
              fontSize:16,outline:"none",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor=B.primary}
            onBlur={e=>e.target.style.borderColor=B.border}/>
          <button onClick={search}
            style={{padding:"15px 22px",borderRadius:14,
              background:`linear-gradient(135deg,${B.primary},${B.gold})`,
              color:"#fff",border:"none",cursor:"pointer",fontWeight:700,fontSize:15}}>
            Track
          </button>
        </div>

        {/* Recent orders shortcut */}
        {orders.slice(0,4).length>0&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
            <span style={{fontSize:13,color:B.textMid,alignSelf:"center"}}>Recent:</span>
            {orders.slice(0,4).map(o=>(
              <button key={o.id}
                onClick={()=>{setOid(o.id);setFound(o);setSearched(true);}}
                style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,
                  background:B.surface,border:`1px solid ${B.border}`,
                  color:B.textMid,cursor:"pointer"}}>
                {o.id}
              </button>
            ))}
          </div>
        )}

        {searched&&!found&&(
          <Card style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:44,marginBottom:12}}>🔍</div>
            <div style={{fontSize:18,fontWeight:700,color:B.text}}>Order not found</div>
            <div style={{fontSize:14,color:B.textMid,marginTop:8,lineHeight:1.6}}>
              Check the order number in your WhatsApp confirmation message
            </div>
          </Card>
        )}

        {found&&(
          <>
            {/* Status card */}
            <Card style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontSize:13,color:B.textDim,marginBottom:4}}>{found.id}</div>
                  <div style={{fontSize:20,fontWeight:800,color:B.text}}>{found.customer}</div>
                </div>
                <Pill s={found.status}/>
              </div>
              {/* Progress steps */}
              {STAGES.map((st,i)=>{
                const idx=STAGES.indexOf(found.status);
                const done=i<=idx; const active=i===idx;
                return (
                  <div key={st} style={{display:"flex",alignItems:"flex-start",gap:14}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{width:32,height:32,borderRadius:16,flexShrink:0,
                        background:done?`linear-gradient(135deg,${B.primary},${B.gold})`:B.surface,
                        border:`2px solid ${done?B.primary:B.border}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:14,color:"#fff",
                        boxShadow:active?`0 0 0 5px ${B.primaryLight}`:""}}>
                        {done?(active?"●":"✓"):""}
                      </div>
                      {i<STAGES.length-1&&(
                        <div style={{width:2,height:28,
                          background:done&&!active?B.primary:B.divider}}/>
                      )}
                    </div>
                    <div style={{paddingTop:6}}>
                      <div style={{fontSize:15,fontWeight:active?700:500,
                        color:active?B.primary:done?B.text:B.textMid}}>{st}</div>
                      {active&&(
                        <div style={{fontSize:13,color:B.textMid,marginTop:3,
                          lineHeight:1.5}}>{MSGS[st]}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Order details */}
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:12}}>
                Order details
              </div>
              {found.items.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:i<found.items.length-1?`1px solid ${B.divider}`:"none"}}>
                  <span style={{fontSize:14,color:B.textMid}}>{it.name} ×{it.qty}</span>
                  <span style={{fontSize:14,fontWeight:600,color:B.text}}>{fmt(it.price*it.qty)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
                fontSize:13,borderTop:`1px solid ${B.divider}`,marginTop:2}}>
                <span style={{color:B.textMid}}>Delivery</span>
                <span style={{color:B.text,fontWeight:600}}>{fmt(found.deliveryFee)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
                fontWeight:800,fontSize:17}}>
                <span>Total</span>
                <span style={{color:B.primary}}>{fmt(found.total)}</span>
              </div>
            </Card>

            {/* Delivery info */}
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:11,color:B.textMid,fontWeight:700,
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Delivering to</div>
              <div style={{fontSize:15,color:B.text,fontWeight:500,marginBottom:4}}>
                📍 {found.address}
              </div>
              <div style={{fontSize:14,color:B.textMid,marginBottom:found.rider?8:0}}>
                📮 {found.postcode} · {found.zone}
              </div>
              {found.rider&&(
                <div style={{fontSize:14,color:B.green,fontWeight:700}}>
                  🛵 Rider: {found.rider}
                </div>
              )}
              <div style={{marginTop:10}}>
                {found.paid
                  ?<span style={{fontSize:13,color:B.green,fontWeight:700}}>
                    💳 {found.paymentMethod} — confirmed
                  </span>
                  :<span style={{fontSize:13,color:B.gold,fontWeight:700}}>
                    ⏳ {found.paymentMethod} — pending
                  </span>}
              </div>
            </Card>

            {found.status!=="Delivered"&&(
              <Btn full v="wa" style={{fontSize:15}}
                onClick={()=>openWA(B.kitchenWA,
                  `Hi AfroCrave Kitchen, checking on order ${found.id}. Status shows: ${found.status}. Any update? 🙏`)}>
                💬 Message kitchen
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

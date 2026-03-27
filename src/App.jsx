import { useState, useEffect, useRef } from "react";
import React from "react";
import { supabase } from "./supabase";
import {
  ShoppingCart, ChefHat, Bike, MapPin, Lock,
  Home, Package, Wallet, Star, Settings,
  Plus, Minus, Pencil, Trash2, Check, X, Eye, EyeOff,
  Phone, MessageCircle, Clock, MapPinned,
  ChevronRight, ChevronLeft, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, LogOut,
  Users, UtensilsCrossed, ClipboardList,
  TrendingUp, Bell, Search, Filter, ToggleLeft,
  ToggleRight, BadgeCheck, Leaf, Flame,
  CreditCard, ShieldCheck,
} from "lucide-react";

// ─── AfroCrave Kitchen Brand Tokens ───────────────────────────
const B = {
  // Premium AfroCrave palette
  primary:      "#C96A1B",   // burnt orange
  primaryLight: "#FFF1E2",
  primaryDark:  "#A95412",
  gold:         "#E7A93B",   // golden amber
  goldLight:    "#FEF9EC",
  green:        "#2E7D32",
  greenSoft:    "#EAF6EC",
  red:          "#B23A30",
  redSoft:      "#FCECEA",
  blue:         "#1A52A0",
  blueSoft:     "#E8EEF8",
  purple:       "#5C3D9A",
  purpleSoft:   "#F0ECF8",
  dark:         "#5A3418",   // cocoa brown
  // Neutrals — warm cream base
  bg:           "#FFF8F1",
  card:         "#FFFFFF",
  cardWarm:     "#FFFDF8",
  border:       "#E9DDD0",
  surface:      "#FFFDF9",
  divider:      "#F0E8DC",
  // Text — warm brown tones
  text:         "#1F1A17",
  textMid:      "#6F655E",
  textDim:      "#A0968E",
  // WhatsApp
  wa:           "#25D366",
  // Kitchen number
  kitchenPhone: import.meta.env.VITE_KITCHEN_WA||"447823644323",
  kitchenWA:    import.meta.env.VITE_KITCHEN_WA||"447823644323",
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
  return <span style={{padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:700,
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
    style={{padding:"clamp(12px,3.5vw,16px) clamp(16px,4vw,22px)",borderRadius:14,
      fontSize:"clamp(16px,4vw,18px)",fontWeight:700,border:"none",
      cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?0.45:1,
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,
      boxSizing:"border-box",transition:"transform 0.1s,box-shadow 0.1s",letterSpacing:0.2,
      ...vs[v],...style}}
    onMouseDown={e=>!disabled&&(e.currentTarget.style.transform="scale(0.97)")}
    onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type="text", hint }) {
  const inputMode = type==="tel"?"tel":type==="number"?"numeric":"text";
  const ref = useRef(null);

  // Sync external value to DOM only when it differs — prevents cursor jump
  useEffect(()=>{
    if(ref.current && document.activeElement !== ref.current){
      ref.current.value = value||"";
    }
  },[value]);

  return <div style={{marginBottom:16}}>
    {label&&<div style={{fontSize:13,fontWeight:700,
      color:B.textMid,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>
      {label}</div>}
    <input
      ref={ref}
      type={type}
      inputMode={inputMode}
      defaultValue={value||""}
      onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize={type==="email"?"none":"sentences"}
      spellCheck="false"
      style={{width:"100%",padding:"14px 16px",background:B.surface,
        border:`1.5px solid ${B.border}`,borderRadius:12,color:B.text,
        fontSize:16,outline:"none",
        boxSizing:"border-box",fontFamily:"inherit",
        WebkitAppearance:"none",appearance:"none",
        touchAction:"manipulation"}}
      onFocus={e=>{e.target.style.borderColor=B.primary;}}
      onBlur={e=>{
        e.target.style.borderColor=B.border;
        onChange(e.target.value);
      }}
    />
    {hint&&<div style={{fontSize:12,color:B.textMid,
      marginTop:5,lineHeight:1.5}}>{hint}</div>}
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
  if(!allergens?.length) return <span style={{fontSize:13,color:B.green,fontWeight:600}}>✓ No major allergens</span>;
  return <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
    {allergens.map(a=>(
      <span key={a} style={{fontSize:13,background:B.goldLight,color:B.gold,
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
        <div style={{fontSize:16,fontWeight:700,color:B.text}}>Confirming your order…</div>
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
      <div style={{background:`linear-gradient(135deg,#1A0C04,#2D1508,#5A3418)`,
        padding:"40px 24px 32px",textAlign:"center",color:"#fff"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.2)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,
          margin:"0 auto 16px",border:"2px solid rgba(76,175,80,0.5)"}}><CheckCircle size={44} color="#4CAF50"/></div>
        <div style={{fontSize:28,fontWeight:800,marginBottom:6,letterSpacing:-0.5}}>
          Order confirmed! 🎉
        </div>
        <div style={{fontSize:15,color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>
          Thank you {o.customer.split(" ")[0]}!<br/>
          Your food is being freshly prepared.
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,
          background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"8px 16px"}}>
          <span style={{fontSize:16,fontWeight:700}}>💳 Payment confirmed · {o.paymentMethod}</span>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px 40px"}}>
        {/* ETA block */}
        <div style={{
          background:`linear-gradient(135deg,${B.primaryLight},#FEF9EC)`,
          border:`1px solid ${B.primary}20`,borderRadius:16,
          padding:"14px 18px",marginBottom:16,
          display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:44,height:44,borderRadius:12,
            background:B.primary,display:"flex",alignItems:"center",
            justifyContent:"center",flexShrink:0,fontSize:20}}>⏱</div>
          <div>
            <div style={{fontSize:12,color:B.textMid,marginBottom:2,fontWeight:600}}>
              Estimated delivery time
            </div>
            <div style={{fontSize:20,fontWeight:800,color:B.primary}}>
              45 – 75 minutes
            </div>
            <div style={{fontSize:12,color:B.textMid,marginTop:2}}>
              Freshly prepared and delivered hot to your door
            </div>
          </div>
        </div>

        {/* Order number */}
        <Card style={{marginBottom:14,background:B.cardWarm}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,color:B.textMid,fontWeight:700,textTransform:"uppercase",
                letterSpacing:0.5,marginBottom:4}}>Order number</div>
              <div style={{fontSize:22,fontWeight:800,color:B.text}}>{o.id}</div>
            </div>
            <Pill s={o.status}/>
          </div>
        </Card>

        {/* Items */}
        <Card style={{marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:12}}>
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
          <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:10}}>
            📍 Delivery details
          </div>
          <div style={{fontSize:15,color:B.textMid,marginBottom:6}}>{o.address}</div>
          <div style={{fontSize:15,color:B.textMid,marginBottom:8}}>📮 {o.postcode}</div>
          {o.note&&(
            <div style={{fontSize:16,color:B.primary,fontStyle:"italic",marginBottom:8}}>
              💬 "{o.note}"
            </div>
          )}
          <div style={{padding:"10px 14px",background:B.goldLight,borderRadius:10,
            fontSize:13,color:B.gold,fontWeight:600}}>
            ⏱ Estimated delivery: 45–75 minutes
          </div>
        </Card>

        {/* Actions */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {/* Print / Screenshot receipt */}
          <button onClick={()=>window.print()}
            style={{width:"100%",padding:"14px",borderRadius:14,
              background:"#fff",border:`1.5px solid ${B.border}`,
              fontSize:16,fontWeight:700,color:B.text,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              fontFamily:"inherit"}}>
            🖨️ Print / Save receipt
          </button>
          {o.phone && (
            <Btn full v="wa" onClick={()=>openWA(B.kitchenWA,
              `Hello! My order ${o.id} is confirmed. Items: ${o.items.map(i=>`${i.name} ×${i.qty}`).join(", ")}. Total: ${fmt(o.total)}. Delivering to: ${o.address}.`)}>
              Message kitchen on WhatsApp
            </Btn>
          )}
          {!o.phone && (
            <div style={{padding:"12px 16px",background:B.goldLight,
              border:`1px solid ${B.gold}30`,borderRadius:12,
              fontSize:16,color:B.gold,textAlign:"center",fontWeight:600}}>
              💡 Track your order using number <strong>{o.id}</strong>
            </div>
          )}
          <Btn full v="ghost" onClick={onDone}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              <ShoppingCart size={16}/>
              Order again
            </span>
          </Btn>
        </div>

        {/* Need help section */}
        <Card style={{marginTop:16,background:B.surface,
          borderColor:"transparent"}}>
          <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:10}}>
            Need help with your order?
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>openWA(B.kitchenWA,
              `Hi, I need help with my order ${o.id}`)}
              style={{display:"flex",alignItems:"center",gap:10,
                padding:"12px 14px",background:"#fff",
                border:`1px solid ${B.border}`,borderRadius:12,
                cursor:"pointer",textAlign:"left",width:"100%",
                fontFamily:"inherit"}}>
              <div style={{width:36,height:36,borderRadius:10,
                background:"#25D366",display:"flex",alignItems:"center",
                justifyContent:"center",fontSize:18,flexShrink:0}}>💬</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:B.text}}>
                  WhatsApp the kitchen
                </div>
                <div style={{fontSize:12,color:B.textMid}}>
                  Quick response during opening hours
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Trust footer */}
        <div style={{textAlign:"center",marginTop:20,padding:"0 16px"}}>
          <div style={{fontSize:12,color:B.textDim,lineHeight:1.8}}>
            AfroCrave Kitchen Ltd · Co. No. 17119134<br/>
            Registered in England & Wales
          </div>
          <div style={{fontSize:11,color:B.textDim,marginTop:4}}>
            POWERED BY <span style={{color:B.primary,fontWeight:700}}>CHOMA</span>
          </div>
        </div>

        {/* Screenshot tip */}
        <div style={{background:B.goldLight,border:`1px solid ${B.gold}30`,
          borderRadius:12,padding:"10px 14px",textAlign:"center",
          marginBottom:16}}>
          <div style={{fontSize:16,color:B.gold,fontWeight:600,marginBottom:3}}>
            📸 Screenshot tip
          </div>
          <div style={{fontSize:15,color:B.textMid,lineHeight:1.6}}>
            Take a screenshot of this page to save your order number{" "}
            <strong style={{color:B.text}}>{o.id}</strong>.
            You'll need it to track your order.
          </div>
        </div>

        <div style={{marginTop:20,textAlign:"center",fontSize:14,color:B.textDim,lineHeight:1.7}}>
          Questions? WhatsApp us on +44 7823 644323<br/>
          AfroCrave Kitchen Ltd · Co. No. 17119134
          Registered in England & Wales
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ════════════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1000);
    const t2 = setTimeout(() => onDone(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"linear-gradient(160deg, #5A3418 0%, #5A3418 55%, #8A4510 100%)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      transition:"opacity 0.6s ease",
      opacity: fade ? 0 : 1,
      pointerEvents: fade ? "none" : "all",
    }}>
      {/* Decorative circles */}
      <div style={{position:"absolute",top:-60,right:-60,width:240,height:240,
        borderRadius:"50%",background:"rgba(255,255,255,0.03)"}}/>
      <div style={{position:"absolute",bottom:-80,left:-40,width:200,height:200,
        borderRadius:"50%",background:"rgba(212,88,10,0.12)"}}/>

      {/* Logo */}
      <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
        <div style={{
          width:120, height:120, borderRadius:28,
          overflow:"hidden", margin:"0 auto 20px",
          boxShadow:"0 16px 48px rgba(0,0,0,0.5)",
          border:"2px solid rgba(245,200,66,0.3)",
        }}>
          <img src="/Logo_AfrocraveKitchen.webp"
            alt="AfroCrave Kitchen"
            loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>

        <div style={{fontSize:16,color:"rgba(245,200,66,0.8)",fontWeight:700,
          letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>
          ✦ Powered by Choma ✦
        </div>

        <div style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:-0.5,
          marginBottom:6,textShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
          AfroCrave Kitchen
        </div>

        <div style={{fontSize:16,color:"rgba(255,255,255,0.65)",fontWeight:400,
          letterSpacing:0.3}}>
          Authentic Nigerian Home Cooking
        </div>

        {/* Loading dots */}
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:32}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:8, height:8, borderRadius:"50%",
              background:"rgba(245,200,66,0.6)",
              animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`,
            }}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}



// ════════════════════════════════════════════════════════════════
// STAFF APP — One URL /staff with role selector
// ════════════════════════════════════════════════════════════════
const PASSWORDS = {
  kitchen: import.meta.env.VITE_PASS_KITCHEN,
  rider:   import.meta.env.VITE_PASS_RIDER,
  manager: import.meta.env.VITE_PASS_MANAGER,
  admin:   import.meta.env.VITE_PASS_ADMIN,
};

const ROLES = [
  { id:"kitchen", label:"Kitchen Staff", icon:"👩‍🍳", desc:"Manage orders & kitchen" },
  { id:"rider",   label:"Rider",         icon:"🛵", desc:"Delivery assignments"   },
  { id:"manager", label:"Manager",       icon:"⚡", desc:"Kitchen + oversight"    },
  { id:"admin",   label:"Admin",         icon:"🔐", desc:"Full platform access"   },
];

function RiderLogin() { return null; } // kept for compatibility

function StaffApp() {
  const [step,      setStep]     = useState("role"); // role | password | app
  const [role,      setRole]     = useState(null);
  const [password,  setPassword] = useState("");
  const [error,     setError]    = useState("");
  const [showPass,  setShowPass] = useState(false);
  const [view,      setView]     = useState("cook");
  const [cookBadge, setCookBadge]  = useState(0);
  const [riderBadge,setRiderBadge] = useState(0);

  const selectRole = (r) => {
    setRole(r);
    setPassword("");
    setError("");
    setStep("password");
  };

  const login = () => {
    if (password === PASSWORDS[role.id]) {
      setStep("app");
      setError("");
      setView(role.id === "rider" ? "rider" : "cook");
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  // ── Role selector ──
  if (step === "role") return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(170deg,#5A3418 0%,#3D1A06 40%,#5A3418 80%,#5A3418 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"24px",fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
      boxSizing:"border-box",
    }}>
      <div style={{width:"100%",maxWidth:"380px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:72,height:72,borderRadius:18,
            background:"rgba(255,255,255,0.09)",
            border:"1.5px solid rgba(200,150,10,0.4)",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 14px",overflow:"hidden"}}>
            <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
              loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>
            Staff Portal
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.5)"}}>
            AfroCrave Kitchen · Select your role
          </div>
        </div>

        {/* Role cards */}
        <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"20px"}}>
          {ROLES.map(r=>(
            <button key={r.id} onClick={()=>selectRole(r)}
              style={{
                width:"100%",
                background:"rgba(255,255,255,0.08)",
                border:"0.5px solid rgba(255,255,255,0.15)",
                borderRadius:"16px",
                padding:"16px 20px",
                display:"flex",alignItems:"center",gap:"14px",
                cursor:"pointer",
                textAlign:"left",
                transition:"all 0.15s",
                fontFamily:"inherit",
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.14)";
                e.currentTarget.style.borderColor="rgba(200,150,10,0.4)";
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background="rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";
              }}>
              <div style={{width:44,height:44,borderRadius:12,
                background:"rgba(200,150,10,0.15)",
                border:"0.5px solid rgba(200,150,10,0.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,flexShrink:0}}>
                {r.icon}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:2}}>
                  {r.label}
                </div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.45)"}}>
                  {r.desc}
                </div>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.3)"
                style={{marginLeft:"auto",flexShrink:0}}/>
            </button>
          ))}
        </div>

        <div style={{textAlign:"center"}}>
          <a href="/" style={{fontSize:16,color:"rgba(255,255,255,0.3)",
            textDecoration:"none",display:"flex",alignItems:"center",
            justifyContent:"center",gap:4}}>
            <ChevronLeft size={14} color="rgba(255,255,255,0.3)"/>
            Back to customer app
          </a>
        </div>
      </div>
    </div>
  );

  // ── Password screen ──
  if (step === "password") return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(170deg,#5A3418 0%,#3D1A06 40%,#5A3418 80%,#5A3418 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"24px",fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
      boxSizing:"border-box",
    }}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        {/* Back + role indicator */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"24px"}}>
          <button onClick={()=>{setStep("role");setError("");setPassword("");}}
            style={{background:"rgba(255,255,255,0.08)",border:"0.5px solid rgba(255,255,255,0.15)",
              borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <ChevronLeft size={18} color="rgba(255,255,255,0.6)"/>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,
              background:"rgba(200,150,10,0.15)",
              border:"0.5px solid rgba(200,150,10,0.3)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              {role.icon}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{role.label}</div>
              <div style={{fontSize:16,color:"rgba(255,255,255,0.4)"}}>Enter your password</div>
            </div>
          </div>
        </div>

        {/* Password card */}
        <div style={{background:"rgba(255,255,255,0.08)",
          border:"0.5px solid rgba(255,255,255,0.15)",
          borderRadius:20,padding:"24px 20px"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:600,color:"rgba(255,255,255,0.6)",
              marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>
              Password
            </div>
            <div style={{position:"relative"}}>
              <input
                type={showPass?"text":"password"}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&login()}
                placeholder={`${role.label} password`}
                autoFocus
                style={{
                  width:"100%",padding:"13px 44px 13px 14px",
                  background:"rgba(255,255,255,0.08)",
                  border:`1.5px solid ${error?"rgba(220,80,50,0.6)":"rgba(255,255,255,0.15)"}`,
                  borderRadius:12,color:"#fff",fontSize:16,
                  outline:"none",boxSizing:"border-box",fontFamily:"inherit",
                }}
                onFocus={e=>e.target.style.borderColor="rgba(200,150,10,0.6)"}
                onBlur={e=>e.target.style.borderColor=error?"rgba(220,80,50,0.6)":"rgba(255,255,255,0.15)"}
              />
              <button onClick={()=>setShowPass(s=>!s)}
                style={{position:"absolute",right:12,top:"50%",
                  transform:"translateY(-50%)",background:"none",border:"none",
                  cursor:"pointer",display:"flex",alignItems:"center",padding:0}}>
                {showPass
                  ? <EyeOff size={18} color="rgba(255,255,255,0.4)"/>
                  : <Eye size={18} color="rgba(255,255,255,0.4)"/>
                }
              </button>
            </div>
          </div>

          {error&&(
            <div style={{fontSize:16,color:"#FF8A7A",marginBottom:14,
              background:"rgba(220,80,50,0.15)",padding:"10px 12px",
              borderRadius:10,border:"0.5px solid rgba(220,80,50,0.3)"}}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={login} disabled={!password}
            style={{
              width:"100%",
              background:password?"linear-gradient(135deg,#E05A0A,#E7A93B)":"rgba(255,255,255,0.1)",
              border:"none",borderRadius:14,padding:"14px",
              fontSize:16,fontWeight:700,
              color:password?"#fff":"rgba(255,255,255,0.3)",
              cursor:password?"pointer":"not-allowed",
              fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            }}>
            <Lock size={16}/>
            Sign in as {role.label}
          </button>
        </div>

        <div style={{textAlign:"center",marginTop:16,fontSize:16,
          color:"rgba(255,255,255,0.25)"}}>
          Authorised staff only · AfroCrave Kitchen
        </div>
      </div>
    </div>
  );

  // ── App screen — show correct tabs based on role ──
  const TABS = role.id === "admin"
    ? [
        {id:"order",    label:"Order",   icon:<ShoppingCart size={16}/>},
        {id:"cook",     label:"Kitchen", icon:<ChefHat size={16}/>,  badge:cookBadge},
        {id:"rider",    label:"Rider",   icon:<Bike size={16}/>,     badge:riderBadge},
        {id:"tracking", label:"Track",   icon:<MapPin size={16}/>},
        {id:"admin",    label:"Admin",   icon:<Lock size={16}/>},
      ]
    : role.id === "manager"
    ? [
        {id:"order",    label:"Order",   icon:<ShoppingCart size={16}/>},
        {id:"cook",     label:"Kitchen", icon:<ChefHat size={16}/>,  badge:cookBadge},
        {id:"rider",    label:"Rider",   icon:<Bike size={16}/>,     badge:riderBadge},
        {id:"tracking", label:"Track",   icon:<MapPin size={16}/>},
      ]
    : role.id === "rider"
    ? [
        {id:"rider",    label:"Rider",   icon:<Bike size={16}/>},
        {id:"tracking", label:"Track",   icon:<MapPin size={16}/>},
      ]
    : [ // kitchen staff
        {id:"cook",     label:"Kitchen", icon:<ChefHat size={16}/>,  badge:cookBadge},
        {id:"tracking", label:"Track",   icon:<MapPin size={16}/>},
      ];

  return (
    <div style={{minHeight:"100vh",background:"#FFFDF9",display:"flex",
      flexDirection:"column",fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
      width:"100%"}}>
      {/* Staff nav bar */}
      <div style={{background:"#5A3418",padding:"10px 16px",
        flexShrink:0,position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 8px rgba(90,52,24,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",
          justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
              style={{width:32,height:32,borderRadius:8,objectFit:"cover"}}/>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>
                AfroCrave Kitchen
              </div>
              <div style={{fontSize:16,color:"rgba(200,150,10,0.8)",fontWeight:600}}>
                {role.icon} {role.label}
              </div>
            </div>
          </div>
          <button onClick={()=>{setStep("role");setRole(null);setPassword("");}}
            style={{background:"rgba(255,255,255,0.08)",
              border:"0.5px solid rgba(255,255,255,0.15)",
              borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.6)",
              fontSize:16,fontWeight:600,cursor:"pointer",
              display:"flex",alignItems:"center",gap:4}}>
            <LogOut size={12}/>
            Sign out
          </button>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{
              setView(t.id);
              if(t.id==="cook")  setCookBadge(0);
              if(t.id==="rider") setRiderBadge(0);
            }}
              style={{flex:1,padding:"8px 4px",borderRadius:12,
                fontSize:16,fontWeight:700,cursor:"pointer",border:"none",
                position:"relative",letterSpacing:0.2,
                display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                background:view===t.id?"rgba(255,255,255,0.15)":"transparent",
                color:view===t.id?"#fff":"rgba(255,255,255,0.5)",
                transition:"all 0.15s"}}>
              {t.icon}
              {t.label}
              {(t.badge||0)>0&&(
                <span style={{position:"absolute",top:-4,right:-2,width:18,height:18,
                  borderRadius:9,background:"#E7A93B",color:"#fff",fontSize:16,
                  fontWeight:800,display:"flex",alignItems:"center",
                  justifyContent:"center"}}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        {view==="order"    && <CustomerPage onOrderPlaced={()=>setCookBadge(b=>b+1)}/>}
        {view==="cook"     && <CookDashboard/>}
        {view==="rider"    && <RiderApp/>}
        {view==="tracking" && <TrackingPage/>}
        {view==="admin"    && role.id==="admin" && <AdminPanel/>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function AfroCraveApp() {
  const [showSplash,   setShowSplash]   = useState(true);
  const [page,         setPage]         = useState("landing"); // landing | order | tracking
  const [view,         setView]         = useState("cook");
  const [cookBadge,    setCookBadge]    = useState(0);
  const [riderBadge,   setRiderBadge]   = useState(0);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  const params        = new URLSearchParams(window.location.search);
  const successOrderId = params.get("order");
  const isSuccess      = params.get("success") === "true";
  const isStaffRoute = window.location.pathname === "/staff";

  const [showSuccess, setShowSuccess] = useState(isSuccess && !!successOrderId);
  const [isStaff,     setIsStaff]     = useState(isStaffRoute);

  const handleSuccessDone = () => {
    setShowSuccess(false);
    window.history.replaceState({},""," /");
  };

  // Skip splash if coming back from Stripe payment
  if(showSplash && !isSuccess) return <SplashScreen onDone={()=>setShowSplash(false)}/>;

  // Staff route — show staff app directly
  if(isStaff) return <StaffApp/>;

  // Order success page — must check BEFORE landing page
  if(showSuccess && successOrderId) return (
    <OrderSuccessPage orderId={successOrderId} onDone={handleSuccessDone}/>
  );

  // Customer landing page
  if(page==="landing" && !isSuccess) return (
    <LandingPage
      onOrder={()=>setPage("order")}
      onTrack={()=>setPage("tracking")}
    />
  );

  // Customer order flow
  if(page==="order") return (
    <CustomerPage onOrderPlaced={()=>setCookBadge(b=>b+1)}/>
  );

  // Customer tracking flow
  if(page==="tracking") return (
    <div style={{minHeight:"100vh",background:B.bg,
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#fff",padding:"10px 16px",
        borderBottom:"1px solid #E9DDD0",display:"flex",
        alignItems:"center",gap:10}}>
        <button onClick={()=>setPage("landing")}
          style={{background:"none",border:"none",cursor:"pointer",
            fontSize:22,color:"#C96A1B",padding:"0 4px",lineHeight:1}}>‹</button>
        <div style={{fontSize:16,fontWeight:700,color:"#1F1A17"}}>Track your order</div>
      </div>
      <TrackingPage/>
    </div>
  );

  if(showSuccess && successOrderId) return (
    <OrderSuccessPage orderId={successOrderId} onDone={handleSuccessDone}/>
  );

  const TABS = [
    {id:"cook",  label:"Kitchen", icon:<ChefHat size={16}/>, badge:cookBadge},
    {id:"rider", label:"Rider",   icon:<Bike size={16}/>, badge:riderBadge},
    {id:"admin", label:"Admin",   icon:<Lock size={16}/>},
  ];

  return (
    <div style={{minHeight:"100vh",background:B.bg,display:"flex",flexDirection:"column",
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",width:"100%",
      overflowX:"hidden"}}>
      {/* Top nav bar */}
      <div style={{background:B.card,borderBottom:`1px solid ${B.divider}`,
        padding:"10px 16px",flexShrink:0,position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)",width:"100%",
        boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
              style={{width:44,height:44,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:B.text,letterSpacing:-0.3}}>
                AfroCrave Kitchen
              </div>
              <div style={{fontSize:15,color:B.primary,fontWeight:600,letterSpacing:0.5}}>
                AUTHENTIC NIGERIAN CUISINE
              </div>
            </div>
          </div>
          <div style={{fontSize:14,color:B.textDim,fontWeight:600,letterSpacing:1,
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
              style={{flex:1,padding:"8px 4px",borderRadius:12,fontSize:16,fontWeight:700,
                cursor:"pointer",border:"none",position:"relative",letterSpacing:0.2,
                background:view===t.id?B.primary:B.surface,
                color:view===t.id?"#fff":B.textMid,transition:"all 0.15s"}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}>
                {t.icon}
                {t.label}
              </span>
              {(t.badge||0)>0&&(
                <span style={{position:"absolute",top:-4,right:-2,width:18,height:18,
                  borderRadius:9,background:B.gold,color:"#fff",fontSize:16,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflow:"hidden"}}>
        {view==="cook"  && <CookDashboard/>}
        {view==="rider" && <RiderApp/>}
        {view==="admin" && <AdminPanel/>}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// LANDING PAGE — Customer entry point
// ════════════════════════════════════════════════════════════════
function LandingPage({ onOrder, onTrack }) {
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(170deg,#5A3418 0%,#3D1A06 40%,#5A3418 80%,#5A3418 100%)",
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      justifyContent:"space-between",
      padding:"clamp(24px,6vw,40px) clamp(20px,5vw,32px) clamp(18px,4vw,28px)",
      position:"relative",
      overflow:"hidden",
      boxSizing:"border-box",
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      {/* Decorative glows */}
      <div style={{position:"absolute",top:"-60px",right:"-60px",width:"200px",height:"200px",
        borderRadius:"50%",background:"rgba(212,88,10,0.10)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"60px",left:"-50px",width:"160px",height:"160px",
        borderRadius:"50%",background:"rgba(200,150,10,0.07)",pointerEvents:"none"}}/>

      {/* TOP — Logo + Brand */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        position:"relative",zIndex:1,textAlign:"center"}}>
        {/* Logo */}
        <div style={{
          width:"clamp(72px,18vw,90px)",
          height:"clamp(72px,18vw,90px)",
          borderRadius:"22px",
          background:"rgba(255,255,255,0.09)",
          border:"1.5px solid rgba(200,150,10,0.4)",
          display:"flex",alignItems:"center",justifyContent:"center",
          marginBottom:"clamp(12px,3vw,18px)",
          overflow:"hidden",
          flexShrink:0,
        }}>
          <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
            loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
        {/* Location tag */}
        <div style={{
          fontSize:"clamp(11px,2.5vw,13px)",
          color:"rgba(245,200,66,0.8)",
          fontWeight:600,
          letterSpacing:"2px",
          textTransform:"uppercase",
          marginBottom:"clamp(6px,1.5vw,10px)",
        }}>✦ Home Kitchen · Sunderland ✦</div>
        {/* Main headline */}
        <div style={{
          fontSize:"clamp(20px,5.5vw,26px)",
          fontWeight:700,
          color:"#ffffff",
          lineHeight:1.2,
          marginBottom:"3px",
        }}>Authentic Nigerian</div>
        <div style={{
          fontSize:"clamp(20px,5.5vw,26px)",
          fontWeight:700,
          color:"#F5C842",
          lineHeight:1.2,
        }}>Home Cooking</div>
      </div>

      {/* MIDDLE — Tagline + Badges + Rating */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        gap:"clamp(12px,3vw,18px)",position:"relative",zIndex:1,width:"100%",
        textAlign:"center"}}>
        {/* Tagline */}
        <div style={{
          fontSize:"clamp(13px,3.2vw,15px)",
          color:"rgba(255,255,255,0.65)",
          lineHeight:1.7,
          maxWidth:"300px",
        }}>
          Made fresh to order, delivered hot<br/>
          to your door across Sunderland<br/>
          &amp; the Northeast
        </div>

        {/* Badges */}
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"center"}}>
          {["⏱ 45–75 min","🍲 Naija Standard","💳 Card & Bank"].map(b=>(
            <div key={b} style={{
              background:"rgba(245,200,66,0.10)",
              border:"0.5px solid rgba(245,200,66,0.25)",
              borderRadius:"20px",
              padding:"4px 11px",
              fontSize:"clamp(12px,2.8vw,14px)",
              color:"rgba(255,255,255,0.85)",
              fontWeight:600,
              whiteSpace:"nowrap",
            }}>{b}</div>
          ))}
        </div>

        {/* Food hygiene */}
        <div style={{
          background:"rgba(255,255,255,0.07)",
          border:"0.5px solid rgba(255,255,255,0.13)",
          borderRadius:"10px",
          padding:"6px 14px",
          display:"flex",
          alignItems:"center",
          gap:"8px",
          marginBottom:"4px",
        }}>
          <div style={{display:"flex",gap:"3px",flexShrink:0}}>
            {[1,2,3,4,5].map(s=>(
              <div key={s} style={{width:"8px",height:"8px",
                background:"#F5C842",borderRadius:"2px"}}/>
            ))}
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:"10px",color:"#F5C842",fontWeight:600,lineHeight:1.3}}>
              Food Hygiene Rating
            </div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",lineHeight:1.3}}>
              Rated by local authority · Sunderland
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{width:"100%",position:"relative",zIndex:1}}>
        <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",
          textAlign:"center",textTransform:"uppercase",letterSpacing:"2px",
          marginBottom:"10px"}}>How it works</div>
        <div style={{display:"flex",gap:"6px",justifyContent:"center"}}>
          {[
            {n:"1",label:"Browse menu"},
            {n:"2",label:"Checkout"},
            {n:"3",label:"Track order"},
          ].map((s,i)=>(
            <div key={s.n} style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <div style={{display:"flex",flexDirection:"column",
                alignItems:"center",gap:"4px"}}>
                <div style={{width:"28px",height:"28px",borderRadius:"50%",
                  background:"rgba(245,200,66,0.15)",
                  border:"0.5px solid rgba(245,200,66,0.3)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"11px",fontWeight:"700",color:"#F5C842"}}>
                  {s.n}
                </div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.5)",
                  textAlign:"center",whiteSpace:"nowrap"}}>{s.label}</div>
              </div>
              {i<2&&<div style={{width:"20px",height:"1px",
                background:"rgba(255,255,255,0.15)",marginBottom:"14px"}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM — CTAs */}
      <div style={{width:"100%",maxWidth:"360px",display:"flex",
        flexDirection:"column",gap:"12px",position:"relative",zIndex:1,
        marginTop:"8px"}}>
        {/* Primary CTA */}
        <button onClick={onOrder} style={{
          width:"100%",
          background:"linear-gradient(135deg,#E05A0A,#E7A93B)",
          border:"none",
          borderRadius:"16px",
          padding:"clamp(13px,3.5vw,16px)",
          fontSize:"clamp(15px,3.8vw,17px)",
          fontWeight:700,
          color:"#fff",
          cursor:"pointer",
          letterSpacing:"0.3px",
          boxShadow:"0 6px 20px rgba(212,88,10,0.45)",
          fontFamily:"inherit",
        }}>
          Start your order →
        </button>
        {/* Secondary CTA */}
        <button onClick={onTrack} style={{
          width:"100%",
          background:"rgba(255,255,255,0.08)",
          border:"0.5px solid rgba(255,255,255,0.18)",
          borderRadius:"14px",
          padding:"clamp(11px,3vw,13px)",
          fontSize:"clamp(14px,3.5vw,16px)",
          fontWeight:600,
          color:"rgba(255,255,255,0.75)",
          cursor:"pointer",
          fontFamily:"inherit",
        }}>
          Track my order
        </button>
        {/* Powered by */}
        <div style={{textAlign:"center",paddingTop:"2px",
          background:"rgba(0,0,0,0.18)",borderRadius:"20px",
          padding:"5px 16px",display:"inline-block",alignSelf:"center"}}>
          <span style={{fontSize:"9px",
            color:"rgba(255,255,255,0.55)",letterSpacing:"1.2px"}}>
            POWERED BY{" "}
          </span>
          <span style={{fontSize:"9px",
            color:"#F5C842",fontWeight:700,letterSpacing:"1.5px"}}>
            CHOMA
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. CUSTOMER PAGE
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// STEP INDICATOR
// ════════════════════════════════════════════════════════════════
function StepIndicator({current}) {
  const steps = [
    {id:"menu",     label:"Menu"},
    {id:"cart",     label:"Cart"},
    {id:"checkout", label:"Details"},
    {id:"payment",  label:"Payment"},
  ];
  const curr = steps.findIndex(s=>s.id===current);
  return (
    <div style={{display:"flex",alignItems:"center",
      padding:"10px 16px 8px",background:"#fff",
      borderBottom:`1px solid ${B.border}`}}>
      {steps.map((s,i)=>(
        <React.Fragment key={s.id}>
          <div style={{display:"flex",flexDirection:"column",
            alignItems:"center",gap:3}}>
            <div style={{
              width:26,height:26,borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,
              background:i<curr?B.green:i===curr?B.primary:B.border,
              color:i<=curr?"#fff":B.textMid,
              transition:"all 0.3s",
            }}>
              {i<curr?"✓":i+1}
            </div>
            <div style={{fontSize:9,fontWeight:700,
              color:i===curr?B.primary:i<curr?B.green:B.textDim,
              whiteSpace:"nowrap",letterSpacing:0.3}}>
              {s.label}
            </div>
          </div>
          {i<steps.length-1&&(
            <div style={{flex:1,height:2,borderRadius:2,
              margin:"0 4px 14px",
              background:i<curr?B.green:B.border,
              transition:"background 0.3s"}}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CustomerPage({ onOrderPlaced }) {
  const [cart,        setCart]        = useState({});
  const [menuItems,   setMenuItems]   = useState([]);
  const [screen,      setScreen]      = useState("home");
  const [history,     setHistory]     = useState(["home"]);
  const [catFilter,   setCatFilter]   = useState("All");
  const [search,      setSearch]      = useState("");
  const [info,        setInfo]        = useState({name:"",phone:"",email:"",address:"",postcode:"",note:""});
  const [gdpr,        setGdpr]        = useState(false);
  const [delivery,    setDelivery]    = useState(null);
  const [payStep,     setPayStep]     = useState("form");
  const [payError,    setPayError]    = useState("");
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Navigate with history tracking
  const navigateTo = (newScreen) => {
    setHistory(h=>[...h, newScreen]);
    setScreen(newScreen);
    window.history.pushState({screen:newScreen}, "", window.location.pathname);
  };

  const navigateBack = () => {
    setHistory(h=>{
      if(h.length <= 1) return h;
      const newHistory = h.slice(0, -1);
      setScreen(newHistory[newHistory.length-1]);
      return newHistory;
    });
  };

  // Intercept Android back button
  useEffect(()=>{
    const handlePop = () => {
      navigateBack();
      window.history.pushState({}, "", window.location.pathname);
    };
    window.history.pushState({screen:"home"}, "", window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return ()=>window.removeEventListener("popstate", handlePop);
  },[]);

  useEffect(()=>{
    supabase.from("menu_items")
      .select("id,name,description,price,category,emoji,portion,calories,allergens,is_halal,is_vegan,available,image_url,chef_pick")
      .eq("available",true).order("category")
      .then(({data})=>{ if(data) setMenuItems(data); });
  },[]);

  const cartItems  = Object.values(cart);
  const count      = cartItems.reduce((s,i)=>s+i.qty,0);
  const subtotal   = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const deliveryFee= delivery?.fee||0;
  const total      = subtotal+deliveryFee;
  const fmt        = v=>`£${v.toFixed(2)}`;

  const addItem    = m=>setCart(c=>({...c,[m.id]:{...m,qty:(c[m.id]?.qty||0)+1}}));
  const removeItem = m=>setCart(c=>{
    const qty=(c[m.id]?.qty||0)-1;
    if(qty<=0){const n={...c};delete n[m.id];return n;}
    return{...c,[m.id]:{...c[m.id],qty}};
  });

  const categories = ["All",...new Set(menuItems.map(m=>m.category))];
  const shown = menuItems.filter(m=>{
    const cm = catFilter==="All"||m.category===catFilter;
    const sm = !search||m.name.toLowerCase().includes(search.toLowerCase());
    return cm&&sm;
  });
  const chefPicks = menuItems.filter(m=>m.chef_pick).slice(0,4);
  const categoryMap = {
    "Rice Dishes":   {emoji:"🍛", color:"#FFF1E2"},
    "Nigerian Soups":{emoji:"🫕", color:"#FFF1E2"},
    "Snacks":        {emoji:"🥟", color:"#FFF1E2"},
    "Cakes":         {emoji:"🎂", color:"#FFF1E2"},
  };

  useEffect(()=>{
    if(!info.postcode||info.postcode.length<3) return;
    const timer = setTimeout(()=>{
      const pc=info.postcode.toUpperCase().replace(/\s/g,"");
      if(/^SR[1-6]/.test(pc))
        setDelivery({fee:5.00,zone:"Sunderland",available:true,label:"£5.00 flat fee"});
      else if(pc.length>=5)
        setDelivery({fee:7.50,zone:"Northeast",available:true,label:"£7.50"});
    }, 400);
    return ()=>clearTimeout(timer);
  },[info.postcode]);

  if(showPrivacy) return <PrivacyPolicy onBack={()=>setShowPrivacy(false)}/>;

  // ── Bottom nav ──
  const Nav = ()=>(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:560,background:"rgba(255,253,249,0.97)",
      borderTop:`1px solid ${B.border}`,display:"flex",zIndex:200,
      padding:"6px 0 max(8px,env(safe-area-inset-bottom))",
      backdropFilter:"blur(12px)"}}>
      {[
        {id:"home",  icon:<Home size={22}/>,         label:"Home"},
        {id:"menu",  icon:<UtensilsCrossed size={22}/>,label:"Menu"},
        {id:"cart",  icon:<ShoppingCart size={22}/>, label:"Cart"},
        {id:"track", icon:<MapPin size={22}/>,       label:"Track"},
      ].map(t=>(
        <button key={t.id} onClick={()=>navigateTo(t.id)}
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
            gap:2,background:"none",border:"none",cursor:"pointer",
            color:screen===t.id?B.primary:B.textMid,transition:"color 0.15s",
            position:"relative",padding:"4px 0",fontFamily:"inherit"}}>
          {t.icon}
          <span style={{fontSize:10,fontWeight:screen===t.id?800:500}}>{t.label}</span>
          {t.id==="cart"&&count>0&&(
            <div style={{position:"absolute",top:0,right:"18%",width:18,height:18,
              borderRadius:9,background:B.primary,color:"#fff",fontSize:10,
              fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {count}
            </div>
          )}
          {screen===t.id&&(
            <div style={{position:"absolute",bottom:-6,width:24,height:3,
              borderRadius:2,background:B.primary}}/>
          )}
        </button>
      ))}
    </div>
  );

  // ── Shared wrapper ──
  const Wrap = ({children})=>(
    <div style={{background:B.bg,minHeight:"100vh",overflowY:"auto",paddingBottom:72,
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
      maxWidth:560,margin:"0 auto",position:"relative",
      overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
      {children}
      <Nav/>
    </div>
  );

  // ── Food image ──
  const FoodImg = ({m,size=72,radius=12})=>(
    <div style={{width:size,height:size,borderRadius:radius,background:"#F6E8D8",
      flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",
      justifyContent:"center",fontSize:size*0.42}}>
      {m.image_url
        ? <img src={m.image_url} alt={m.name} loading="lazy"
            style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : m.emoji||"🍛"}
    </div>
  );

  // ══════════════════════════════════════════
  // HOME — McDonald's structure
  // ══════════════════════════════════════════
  if(screen==="home") return (
    <Wrap>
      {/* Full-bleed hero */}
      <div style={{background:`linear-gradient(160deg,#1A0C04 0%,#3D1A06 50%,#5A3418 100%)`,
        padding:"20px 16px 36px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,
          borderRadius:"50%",background:"rgba(231,169,59,0.08)"}}/>
        <div style={{position:"absolute",bottom:-20,left:-20,width:100,height:100,
          borderRadius:"50%",background:"rgba(201,106,27,0.1)"}}/>
        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:20,position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave"
              style={{width:38,height:38,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",lineHeight:1.2}}>
                AfroCrave Kitchen
              </div>
              <div style={{fontSize:10,color:"#E7A93B",fontWeight:700,letterSpacing:0.5}}>
                AUTHENTIC NIGERIAN HOME COOKING
              </div>
            </div>
          </div>
        </div>
        {/* Hero headline */}
        <div style={{position:"relative",zIndex:1,marginBottom:16}}>
          <div style={{fontSize:28,fontWeight:900,color:"#fff",lineHeight:1.15,
            letterSpacing:-0.5,marginBottom:8}}>
            Fresh Nigerian food,<br/>
            <span style={{color:"#E7A93B"}}>delivered hot</span>
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6,
            marginBottom:14}}>
            Home cooked to order · Sunderland & Northeast
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[
              {icon:<Clock size={11}/>, text:"45–75 min"},
              {icon:<MapPin size={11}/>, text:"SR & NE delivery"},
              {icon:<Star size={11}/>,  text:"Naija Standard"},
            ].map((b,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4,
                background:"rgba(255,255,255,0.12)",
                border:"0.5px solid rgba(255,255,255,0.2)",
                borderRadius:20,padding:"5px 10px",
                fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.9)"}}>
                {b.icon}{b.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* White bottom sheet — McDonald's style */}
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",
        marginTop:-20,position:"relative",zIndex:1,padding:"20px 16px 0"}}>

        {/* Primary CTA */}
        <button onClick={()=>navigateTo("menu")}
          style={{width:"100%",background:B.primary,border:"none",
            borderRadius:16,padding:"16px",fontSize:16,fontWeight:800,
            color:"#fff",cursor:"pointer",fontFamily:"inherit",
            boxShadow:`0 6px 20px ${B.primary}45`,marginBottom:20,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <UtensilsCrossed size={18} color="#fff"/>
          Start your order
        </button>

        {/* Category tiles — McDonald's grid */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:800,color:B.text,
            textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
            Browse menu
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {categories.filter(c=>c!=="All").map(cat=>(
              <button key={cat} onClick={()=>{setCatFilter(cat);navigateTo("menu");}}
                style={{background:B.bg,border:`1.5px solid ${B.border}`,
                  borderRadius:16,padding:"16px 12px",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                  cursor:"pointer",fontFamily:"inherit",
                  transition:"all 0.15s"}}>
                <div style={{fontSize:32}}>{categoryMap[cat]?.emoji||"🍽"}</div>
                <div style={{fontSize:13,fontWeight:800,color:B.text,
                  textAlign:"center"}}>{cat}</div>
                <div style={{fontSize:11,color:B.textMid}}>
                  {menuItems.filter(m=>m.category===cat).length} items
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chef's picks preview */}
        {chefPicks.length>0&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:15,fontWeight:800,color:B.text}}>
                ⭐ Chef's Picks
              </div>
              <button onClick={()=>navigateTo("menu")}
                style={{fontSize:13,fontWeight:700,color:B.primary,
                  background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                See all →
              </button>
            </div>
            {chefPicks.map(m=>(
              <div key={m.id} style={{background:B.surface,
                border:`1px solid ${B.border}`,borderRadius:14,
                padding:12,display:"flex",gap:12,
                alignItems:"center",marginBottom:8,
                overflow:"hidden",width:"100%",boxSizing:"border-box"}}>
                <FoodImg m={m} size={60} radius={10}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:B.text,
                    marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",
                    whiteSpace:"nowrap"}}>{m.name}</div>
                  <div style={{fontSize:13,color:B.textMid,marginBottom:4,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {m.description}
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:B.primaryDark}}>
                    {fmt(m.price)}
                  </div>
                </div>
                <button onClick={()=>addItem(m)}
                  style={{width:34,height:34,borderRadius:9,background:B.primary,
                    border:"none",cursor:"pointer",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Plus size={18} color="#fff"/>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Why AfroCrave */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:800,color:B.text,
            textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
            Why AfroCrave?
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {emoji:"🍲",title:"Home cooked",desc:"Fresh by hand every order"},
              {emoji:"⏱",title:"45–75 min",desc:"Hot to your door"},
              {emoji:"🇳🇬",title:"100% Naija",desc:"Authentic recipes"},
              {emoji:"💳",title:"Card or bank",desc:"Easy payment"},
            ].map((w,i)=>(
              <div key={i} style={{background:B.surface,border:`1px solid ${B.border}`,
                borderRadius:14,padding:"14px 12px"}}>
                <div style={{fontSize:24,marginBottom:6}}>{w.emoji}</div>
                <div style={{fontSize:13,fontWeight:800,color:B.text,marginBottom:3}}>
                  {w.title}
                </div>
                <div style={{fontSize:12,color:B.textMid,lineHeight:1.5}}>
                  {w.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Wrap>
  );

  // ══════════════════════════════════════════
  // MENU — Deliveroo style
  // ══════════════════════════════════════════
  if(screen==="menu") return (
    <Wrap>
      {/* Dark header with search */}
      <div style={{background:`linear-gradient(135deg,#1A0C04,#3D1A06,#5A3418)`,
        padding:"14px 16px 16px",position:"sticky",top:0,zIndex:100,
        width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave"
            style={{width:34,height:34,borderRadius:9,objectFit:"cover",flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>
              AfroCrave Kitchen
            </div>
            <div style={{fontSize:10,color:"#E7A93B",fontWeight:700,letterSpacing:0.5}}>
              AUTHENTIC NIGERIAN CUISINE
            </div>
          </div>
          {count>0&&(
            <div style={{background:B.primary,borderRadius:20,
              padding:"5px 12px",display:"flex",alignItems:"center",gap:5,
              cursor:"pointer"}} onClick={()=>navigateTo("cart")}>
              <ShoppingCart size={13} color="#fff"/>
              <span style={{fontSize:12,fontWeight:800,color:"#fff"}}>{count}</span>
            </div>
          )}
        </div>
        {/* Search */}
        <div style={{background:"rgba(255,255,255,0.1)",
          border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,
          padding:"9px 12px",display:"flex",alignItems:"center",gap:8}}>
          <Search size={15} color="rgba(255,255,255,0.6)"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search dishes..."
            style={{background:"none",border:"none",outline:"none",
              color:"#fff",fontSize:14,flex:1,fontFamily:"inherit"}}/>
          {search&&(
            <button onClick={()=>setSearch("")}
              style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
              <X size={14} color="rgba(255,255,255,0.6)"/>
            </button>
          )}
        </div>
      </div>

      {/* Sticky category pills — Deliveroo */}
      <div style={{background:"#fff",borderBottom:`1px solid ${B.border}`,
        padding:"8px 16px",position:"sticky",top:88,zIndex:99,
        display:"flex",gap:6,overflowX:"auto",
        WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {categories.map(cat=>(
          <button key={cat} onClick={()=>setCatFilter(cat)}
            style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,
              cursor:"pointer",border:`1.5px solid ${catFilter===cat?B.primary:B.border}`,
              background:catFilter===cat?B.primary:"#fff",
              color:catFilter===cat?"#fff":B.textMid,
              whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit",
              transition:"all 0.15s"}}>
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{padding:"10px 16px 0"}}>
        {shown.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🍳</div>
            <div style={{fontSize:16,fontWeight:700,color:B.text}}>
              {search?"No dishes found":"Loading menu…"}
            </div>
          </div>
        )}

        {[...new Set(shown.map(m=>m.category))].map(cat=>(
          <div key={cat}>
            {/* Category divider */}
            <div style={{display:"flex",alignItems:"center",gap:8,
              padding:"10px 0 8px"}}>
              <div style={{flex:1,height:1,background:B.border}}/>
              <div style={{fontSize:11,fontWeight:800,color:B.primary,
                textTransform:"uppercase",letterSpacing:2,
                background:B.primaryLight,padding:"4px 12px",
                borderRadius:20,border:`1px solid ${B.primary}20`,
                whiteSpace:"nowrap"}}>
                {cat}
              </div>
              <div style={{flex:1,height:1,background:B.border}}/>
            </div>

            {/* Food cards — Deliveroo style */}
            {shown.filter(m=>m.category===cat).map((m,i)=>(
              <div key={m.id} style={{
                background:i%2===0?B.surface:B.card,
                border:`1px solid ${B.border}`,borderRadius:16,
                padding:14,marginBottom:10}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <FoodImg m={m} size={80} radius={13}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"flex-start",
                      gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      <div style={{fontSize:15,fontWeight:700,color:B.text,
                        lineHeight:1.3,flex:1}}>
                        {m.name}
                      </div>
                      {m.chef_pick&&(
                        <span style={{fontSize:10,fontWeight:800,
                          background:`linear-gradient(135deg,${B.primary},${B.gold})`,
                          color:"#fff",borderRadius:20,padding:"2px 8px",
                          whiteSpace:"nowrap",flexShrink:0}}>
                          ⭐ Chef's Pick
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:13,color:B.textMid,marginBottom:8,
                      lineHeight:1.5,display:"-webkit-box",
                      WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                      {m.description}
                    </div>
                    <div style={{display:"flex",alignItems:"center",
                      justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:17,fontWeight:800,color:B.primaryDark}}>
                          {fmt(m.price)}
                        </div>
                        {m.portion&&(
                          <div style={{fontSize:11,color:B.textDim}}>{m.portion}</div>
                        )}
                      </div>
                      {/* +/- qty controls */}
                      {cart[m.id]?.qty>0 ? (
                        <div style={{display:"flex",alignItems:"center",gap:8,
                          background:B.primaryLight,borderRadius:12,
                          padding:"5px 6px",border:`1.5px solid ${B.primary}25`}}>
                          <button onClick={()=>removeItem(m)}
                            style={{width:30,height:30,borderRadius:8,
                              background:B.primary,border:"none",cursor:"pointer",
                              display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Minus size={14} color="#fff"/>
                          </button>
                          <span style={{fontSize:15,fontWeight:800,color:B.primary,
                            minWidth:18,textAlign:"center"}}>
                            {cart[m.id].qty}
                          </span>
                          <button onClick={()=>addItem(m)}
                            style={{width:30,height:30,borderRadius:8,
                              background:B.primary,border:"none",cursor:"pointer",
                              display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Plus size={14} color="#fff"/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={()=>addItem(m)}
                          style={{width:38,height:38,borderRadius:11,
                            background:B.primary,border:"none",cursor:"pointer",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            boxShadow:`0 4px 12px ${B.primary}40`}}>
                          <Plus size={20} color="#fff"/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{height:count>0?100:20}}/>
      </div>

      {/* Sticky cart bar */}
      {count>0&&(
        <div style={{position:"fixed",bottom:66,left:"50%",
          transform:"translateX(-50%)",
          width:"calc(100% - 32px)",maxWidth:528,zIndex:150}}>
          <button onClick={()=>navigateTo("cart")}
            style={{width:"100%",background:B.primary,border:"none",
              borderRadius:16,padding:"14px 20px",
              display:"flex",alignItems:"center",justifyContent:"space-between",
              cursor:"pointer",boxShadow:`0 8px 28px ${B.primary}55`,
              fontFamily:"inherit"}}>
            <span style={{background:"rgba(255,255,255,0.2)",borderRadius:8,
              padding:"3px 10px",fontSize:13,fontWeight:800,color:"#fff"}}>
              {count} item{count!==1?"s":""}
            </span>
            <span style={{fontSize:14,fontWeight:800,color:"#fff"}}>View order</span>
            <span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{fmt(subtotal)}</span>
          </button>
        </div>
      )}
    </Wrap>
  );

  // ══════════════════════════════════════════
  // CART — McDonald's clean
  // ══════════════════════════════════════════
  if(screen==="cart") return (
    <Wrap>
      {/* Header */}
      <div style={{background:"#fff",padding:"16px",
        borderBottom:`1px solid ${B.border}`,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:100,
        width:"100%",boxSizing:"border-box"}}>
        <div style={{fontSize:20,fontWeight:900,color:B.text}}>Your order</div>
        <button onClick={()=>navigateTo("menu")}
          style={{fontSize:13,fontWeight:700,color:B.primary,
            background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
          + Add items
        </button>
      </div>

      <div style={{padding:"16px",maxWidth:560,margin:"0 auto"}}>
        {cartItems.length===0 ? (
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:56,marginBottom:12}}>🛒</div>
            <div style={{fontSize:18,fontWeight:800,color:B.text,marginBottom:6}}>
              Your cart is empty
            </div>
            <div style={{fontSize:14,color:B.textMid,marginBottom:20}}>
              Add some delicious Nigerian food
            </div>
            <button onClick={()=>navigateTo("menu")}
              style={{background:B.primary,border:"none",borderRadius:14,
                padding:"13px 28px",fontSize:15,fontWeight:800,color:"#fff",
                cursor:"pointer",fontFamily:"inherit"}}>
              Browse menu
            </button>
          </div>
        ) : (
          <>
            {/* Items list — McDonald's tight style */}
            <div style={{background:"#fff",border:`1px solid ${B.border}`,
              borderRadius:18,overflow:"hidden",marginBottom:14}}>
              {cartItems.map((item,i)=>(
                <div key={item.id} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                  borderBottom:i<cartItems.length-1?`1px solid ${B.divider}`:"none"}}>
                  <FoodImg m={item} size={48} radius={10}/>
                  <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
                    <div style={{fontSize:14,fontWeight:700,color:B.text,
                      marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",
                      whiteSpace:"nowrap"}}>{item.name}</div>
                    <div style={{fontSize:13,fontWeight:800,color:B.primaryDark}}>
                      {fmt(item.price*item.qty)}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,
                    background:B.primaryLight,borderRadius:10,padding:"4px 5px",
                    border:`1.5px solid ${B.primary}20`}}>
                    <button onClick={()=>removeItem(item)}
                      style={{width:26,height:26,borderRadius:7,background:B.primary,
                        border:"none",cursor:"pointer",display:"flex",
                        alignItems:"center",justifyContent:"center"}}>
                      <Minus size={12} color="#fff"/>
                    </button>
                    <span style={{fontSize:14,fontWeight:800,color:B.primary,
                      minWidth:16,textAlign:"center"}}>{item.qty}</span>
                    <button onClick={()=>addItem(item)}
                      style={{width:26,height:26,borderRadius:7,background:B.primary,
                        border:"none",cursor:"pointer",display:"flex",
                        alignItems:"center",justifyContent:"center"}}>
                      <Plus size={12} color="#fff"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div style={{background:B.primaryLight,border:`1px solid ${B.primary}15`,
              borderRadius:16,padding:14,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",
                padding:"5px 0",borderBottom:`1px solid ${B.primary}15`}}>
                <span style={{fontSize:14,color:B.textMid}}>Subtotal</span>
                <span style={{fontSize:14,fontWeight:700,color:B.text}}>{fmt(subtotal)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",
                padding:"5px 0",borderBottom:`1px solid ${B.primary}15`}}>
                <span style={{fontSize:14,color:B.textMid}}>Delivery</span>
                <span style={{fontSize:14,fontWeight:700,color:B.text}}>
                  from £5.00
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",
                padding:"8px 0 0"}}>
                <span style={{fontSize:16,fontWeight:800,color:B.text}}>
                  Estimated total
                </span>
                <span style={{fontSize:16,fontWeight:800,color:B.primary}}>
                  ~{fmt(subtotal+5)}
                </span>
              </div>
            </div>

            {/* Min order warning */}
            {subtotal<15&&(
              <div style={{background:"#FCECEA",border:`1px solid ${B.red}20`,
                borderRadius:14,padding:"12px 14px",marginBottom:14,
                display:"flex",alignItems:"center",gap:10}}>
                <AlertTriangle size={18} color={B.red}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:B.red}}>
                    Minimum order £15
                  </div>
                  <div style={{fontSize:12,color:B.red,opacity:0.8}}>
                    Add {fmt(15-subtotal)} more to continue
                  </div>
                </div>
              </div>
            )}

            {/* CTA — McDonald's bold single button */}
            <button onClick={()=>navigateTo("checkout")}
              disabled={subtotal<15}
              style={{width:"100%",
                background:subtotal>=15?B.primary:"#D8CBBE",
                border:"none",borderRadius:16,padding:"16px",
                fontSize:16,fontWeight:800,color:"#fff",
                cursor:subtotal>=15?"pointer":"not-allowed",
                fontFamily:"inherit",marginBottom:8,
                boxShadow:subtotal>=15?`0 6px 20px ${B.primary}45`:"none"}}>
              {subtotal>=15
                ? `Checkout → Pay ~${fmt(subtotal+5)}`
                : `Add ${fmt(15-subtotal)} more to continue`}
            </button>
          </>
        )}
      </div>
    </Wrap>
  );

  // ══════════════════════════════════════════
  // CHECKOUT
  // ══════════════════════════════════════════
  if(screen==="checkout") return (
    <Wrap>
      <div style={{background:"#fff",padding:"14px 16px",
        borderBottom:`1px solid ${B.border}`,
        display:"flex",alignItems:"center",gap:10,
        position:"sticky",top:0,zIndex:100}}>
        <button onClick={()=>navigateTo("cart")}
          style={{background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",color:B.primary,padding:0}}>
          <ChevronLeft size={24}/>
        </button>
        <div style={{fontSize:17,fontWeight:800,color:B.text}}>Delivery details</div>
      </div>
      <StepIndicator current="checkout"/>

      <div style={{padding:"16px",maxWidth:560,margin:"0 auto"}}>
        {/* Order recap */}
        <div style={{background:B.surface,border:`1px solid ${B.border}`,
          borderRadius:16,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:800,color:B.textMid,
            textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
            Order summary
          </div>
          {cartItems.map(item=>(
            <div key={item.id} style={{display:"flex",justifyContent:"space-between",
              padding:"5px 0",borderBottom:`1px solid ${B.divider}`}}>
              <span style={{fontSize:14,color:B.textMid}}>
                {item.name} ×{item.qty}
              </span>
              <span style={{fontSize:14,fontWeight:700,color:B.text}}>
                {fmt(item.price*item.qty)}
              </span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",
            padding:"8px 0 0",fontSize:16,fontWeight:800}}>
            <span style={{color:B.text}}>Subtotal</span>
            <span style={{color:B.primary}}>{fmt(subtotal)}</span>
          </div>
        </div>

        {/* Form - uncontrolled inputs to prevent mobile focus loss */}
        <div style={{background:B.surface,border:`1px solid ${B.border}`,
          borderRadius:16,padding:14,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:800,color:B.textMid,
            textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>
            Your details
          </div>
          {[
            {id:"name",    label:"Full name *",                type:"text",  placeholder:"Your full name",           hint:"",            required:true,  validate:null},
            {id:"email",   label:"Email address",              type:"email", placeholder:"your@email.com",           hint:"Confirmation sent here", required:false, validate:/^[^@]+@[^@]+\.[^@]+$/},
            {id:"phone",   label:"Phone / WhatsApp (optional)",type:"tel",   placeholder:"+44 7xxx xxxxxx",          hint:"For live delivery updates", required:false, validate:null},
            {id:"postcode",label:"Postcode *",                 type:"text",  placeholder:"SR1 1AA",                  hint:delivery?`✓ ${delivery.label}`:"Enter postcode to see delivery fee", required:true, validate:null},
            {id:"address", label:"Delivery address *",         type:"text",  placeholder:"Full delivery address",    hint:"",            required:true,  validate:null},
            {id:"note",    label:"Order notes (optional)",     type:"text",  placeholder:"Any special requests",     hint:"",            required:false, validate:null},
          ].map(f=>(
            <div key={f.id} style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:B.textMid,
                marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>
                {f.label}
              </div>
              <input
                id={`field-${f.id}`}
                name={f.id}
                type={f.type}
                inputMode={f.id==="phone"?"tel":f.id==="postcode"?"text":f.type==="email"?"email":"text"}
                defaultValue={info[f.id]||""}
                placeholder={f.placeholder}
                autoComplete={f.id==="email"?"email":f.id==="name"?"name":f.id==="postcode"?"postal-code":f.id==="address"?"street-address":"off"}
                autoCorrect="off"
                autoCapitalize={f.type==="email"||f.id==="phone"?"none":"sentences"}
                spellCheck="false"
                onBlur={e=>{
                  let val = e.target.value;
                  // Sanitise
                  if(f.id==="postcode") val = val.toUpperCase().trim();
                  if(f.id==="phone")    val = val.replace(/[^0-9+\s\-()]/g,"");
                  e.target.value = val;
                  // Validate
                  let err = "";
                  if(f.required && !val.trim()) err = `${f.label.replace(" *","")} is required`;
                  if(f.validate && val && !f.validate.test(val)) err = "Please enter a valid email address";
                  if(f.id==="phone" && val && !/^[0-9+]/.test(val)) err = "Phone must start with a number or +";
                  // Show error
                  const errEl = document.getElementById(`err-${f.id}`);
                  if(errEl) errEl.textContent = err;
                  e.target.style.borderColor = err ? B.red : B.border;
                  // Save to state
                  setInfo(i=>({...i,[f.id]:val}));
                }}
                style={{
                  width:"100%",padding:"14px 16px",
                  background:"#fff",
                  border:`1.5px solid ${B.border}`,
                  borderRadius:12,color:B.text,
                  fontSize:16,outline:"none",
                  boxSizing:"border-box",
                  fontFamily:"inherit",
                  WebkitAppearance:"none",appearance:"none",
                  touchAction:"manipulation",
                  display:"block",
                }}
                onFocus={e=>{
                  e.target.style.borderColor=B.primary;
                  const errEl=document.getElementById(`err-${f.id}`);
                  if(errEl) errEl.textContent="";
                }}
              />
              {/* Inline error message */}
              <div id={`err-${f.id}`}
                style={{fontSize:12,color:B.red,marginTop:4,
                  fontWeight:600,minHeight:0}}/>
              {f.hint&&!info[f.id]&&(
                <div style={{fontSize:12,color:B.textMid,marginTop:2,
                  lineHeight:1.4}}>
                  {f.hint}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delivery fee */}
        {delivery&&(
          <div style={{background:B.primaryLight,border:`1px solid ${B.primary}20`,
            borderRadius:14,padding:"12px 14px",marginBottom:14,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <MapPin size={16} color={B.primary}/>
              <span style={{fontSize:14,fontWeight:600,color:B.primaryDark}}>
                Delivery to {delivery.zone}
              </span>
            </div>
            <span style={{fontSize:15,fontWeight:800,color:B.primary}}>
              {fmt(deliveryFee)}
            </span>
          </div>
        )}

        {/* GDPR */}
        <div style={{background:B.surface,border:`1px solid ${B.border}`,
          borderRadius:14,padding:14,marginBottom:14}}>
          <button onClick={()=>setGdpr(g=>!g)}
            style={{display:"flex",alignItems:"flex-start",gap:10,
              background:"none",border:"none",cursor:"pointer",
              textAlign:"left",width:"100%",fontFamily:"inherit",padding:0}}>
            <div style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,
              background:gdpr?B.primary:B.surface,
              border:`2px solid ${gdpr?B.primary:B.border}`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {gdpr&&<Check size={12} color="#fff"/>}
            </div>
            <span style={{fontSize:13,color:B.textMid,lineHeight:1.6}}>
              I agree to AfroCrave Kitchen Ltd's{" "}
              <span style={{color:B.primary,textDecoration:"underline"}}
                onClick={e=>{e.stopPropagation();setShowPrivacy(true);}}>
                Privacy Policy
              </span>
              {" "}· UK GDPR · Co. No. 17119134
            </span>
          </button>
        </div>

        {/* Total + CTA */}
        <div style={{background:`linear-gradient(135deg,${B.primaryLight},#FEF9EC)`,
          border:`1px solid ${B.primary}20`,borderRadius:16,
          padding:"14px 16px",marginBottom:14,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:16,fontWeight:800,color:B.text}}>Total</span>
          <span style={{fontSize:20,fontWeight:800,color:B.primary}}>
            {delivery?fmt(total):"+ delivery"}
          </span>
        </div>

        <button onClick={()=>{
            const fields=["name","email","phone","postcode","address","note"];
            const collected={};
            let hasErrors=false;
            fields.forEach(f=>{
              const el=document.getElementById(`field-${f}`);
              if(!el) return;
              let val=el.value.trim();
              if(f==="postcode") val=val.toUpperCase();
              if(f==="phone")    val=val.replace(/[^0-9+\s]/g,"");
              el.value=val;
              collected[f]=val;
              const errEl=document.getElementById(`err-${f}`);
              const required=["name","postcode","address"];
              if(required.includes(f)&&!val){
                if(errEl) errEl.textContent=f.charAt(0).toUpperCase()+f.slice(1)+" is required";
                el.style.borderColor=B.red;
                hasErrors=true;
              } else if(f==="email"&&val&&!val.includes("@")){
                if(errEl) errEl.textContent="Please enter a valid email address";
                el.style.borderColor=B.red;
                hasErrors=true;
              } else if(f==="phone"&&val&&!/^[0-9+]/.test(val)){
                if(errEl) errEl.textContent="Phone must contain numbers only";
                el.style.borderColor=B.red;
                hasErrors=true;
              }
            });
            if(hasErrors) return;
            if(!delivery?.available){
              const el=document.getElementById("field-postcode");
              const errEl=document.getElementById("err-postcode");
              if(errEl) errEl.textContent="Please enter a valid UK postcode";
              if(el) el.style.borderColor=B.red;
              return;
            }
            setInfo(i=>({...i,...collected}));
            setTimeout(()=>navigateTo("payment"),80);
          }}
          disabled={!gdpr}
          style={{width:"100%",
            background:gdpr?B.primary:"#D8CBBE",
            border:"none",borderRadius:16,padding:"16px",
            fontSize:15,fontWeight:800,color:"#fff",
            cursor:gdpr?"pointer":"not-allowed",
            fontFamily:"inherit",marginBottom:20}}>
          Continue to payment →
        </button>
      </div>
    </Wrap>
  );

  // ══════════════════════════════════════════
  // PAYMENT
  // ══════════════════════════════════════════
    const handleStripe = async () => {
      setPayStep("loading"); setPayError("");
      const orderId = "ACK"+(Math.random()*9000+1000|0).toString().padStart(4,"0");
      const {error} = await supabase.from("orders").insert([{
        id:orderId, customer_name:info.name, customer_phone:info.phone,
        customer_email:info.email, delivery_address:info.address,
        postcode:info.postcode, note:info.note,
        delivery_zone:delivery?.zone, delivery_fee:deliveryFee,
        subtotal, total,
        items:JSON.stringify(cartItems.map(i=>({name:i.name,qty:i.qty,price:i.price}))),
        status:"New", payment_method:"card", paid:false,
      }]);
      if(error){setPayStep("form");setPayError("Could not save order — please try again.");return;}
      if(onOrderPlaced) onOrderPlaced();
      const res = await fetch("/api/create-checkout",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          orderId,
          items: cartItems.map(i=>({name:i.name,qty:i.qty,price:i.price})),
          deliveryFee,
          customerEmail: info.email||undefined,
        }),
      });
      const json = await res.json();
      if(json.url) window.location.href=json.url;
      else{setPayStep("form");setPayError("Payment setup failed — please try again.");}
    };

    const handleBank = async () => {
      setPayStep("loading");
      const orderId = "ACK"+(Math.random()*9000+1000|0).toString().padStart(4,"0");
      await supabase.from("orders").insert([{
        id:orderId, customer_name:info.name, customer_phone:info.phone,
        customer_email:info.email, delivery_address:info.address,
        postcode:info.postcode, note:info.note,
        delivery_zone:delivery?.zone, delivery_fee:deliveryFee,
        subtotal, total,
        items:JSON.stringify(cartItems.map(i=>({name:i.name,qty:i.qty,price:i.price}))),
        status:"New", payment_method:"bank", paid:false,
      }]);
      if(onOrderPlaced) onOrderPlaced();
      setPayStep("bank_pending");
    };

  if(screen==="payment") {
    if(payStep==="loading") return (
      <Wrap>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",minHeight:"70vh",gap:16}}>
          <div style={{width:52,height:52,border:`4px solid ${B.primaryLight}`,
            borderTopColor:B.primary,borderRadius:"50%",
            animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontSize:16,fontWeight:700,color:B.text}}>
            Setting up your payment…
          </div>
        </div>
      </Wrap>
    );
    if(payStep==="bank_pending") return (
      <Wrap>
        <div style={{padding:20,maxWidth:560,margin:"0 auto"}}>
          <div style={{background:B.greenSoft,border:`1px solid ${B.green}30`,
            borderRadius:20,padding:24,marginBottom:16,textAlign:"center"}}>
            <CheckCircle size={52} color={B.green} style={{marginBottom:12}}/>
            <div style={{fontSize:22,fontWeight:800,color:B.text,marginBottom:6}}>
              Order placed!
            </div>
            <div style={{fontSize:14,color:B.textMid}}>
              Complete your bank transfer to confirm
            </div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${B.border}`,
            borderRadius:16,padding:16,marginBottom:16}}>
            {[
              ["Account name","AfroCrave Kitchen Ltd"],
              ["Sort code","XX-XX-XX"],
              ["Account number","XXXXXXXX"],
              ["Amount",fmt(total)],
              ["Reference","Your order ID"],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                padding:"9px 0",borderBottom:`1px solid ${B.divider}`}}>
                <span style={{fontSize:13,color:B.textMid}}>{l}</span>
                <span style={{fontSize:13,fontWeight:700,color:B.text}}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>openWA(B.kitchenWA,
            "Hi AfroCrave Kitchen, I have placed an order and completed bank transfer.")}
            style={{width:"100%",background:"#25D366",border:"none",borderRadius:16,
              padding:16,fontSize:15,fontWeight:800,color:"#fff",
              cursor:"pointer",fontFamily:"inherit"}}>
            💬 Confirm via WhatsApp
          </button>
        </div>
      </Wrap>
    );
    return (
      <Wrap>
        <div style={{background:"#fff",padding:"14px 16px",
          borderBottom:`1px solid ${B.border}`,
          display:"flex",alignItems:"center",gap:10,
          position:"sticky",top:0,zIndex:100}}>
          <button onClick={()=>navigateTo("checkout")}
            style={{background:"none",border:"none",cursor:"pointer",
              display:"flex",alignItems:"center",color:B.primary,padding:0}}>
            <ChevronLeft size={24}/>
          </button>
          <div style={{fontSize:17,fontWeight:800,color:B.text}}>Payment</div>
        </div>
        <StepIndicator current="payment"/>

        <div style={{padding:16,maxWidth:560,margin:"0 auto"}}>
          {/* Total */}
          <div style={{background:`linear-gradient(135deg,${B.primaryLight},#FEF9EC)`,
            border:`1px solid ${B.primary}20`,borderRadius:18,
            padding:"18px 20px",marginBottom:20,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,color:B.textMid,fontWeight:600,marginBottom:2}}>
                Total to pay
              </div>
              <div style={{fontSize:28,fontWeight:900,color:B.primary,letterSpacing:-0.5}}>
                {fmt(total)}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:B.textMid}}>{count} item{count!==1?"s":""}</div>
              <div style={{fontSize:12,color:B.textMid}}>+{fmt(deliveryFee)} delivery</div>
            </div>
          </div>

          {payError&&(
            <div style={{background:"#FCECEA",border:`1px solid ${B.red}20`,
              borderRadius:12,padding:"10px 14px",marginBottom:14,
              fontSize:13,color:B.red,fontWeight:600}}>
              ⚠️ {payError}
            </div>
          )}

          <div style={{fontSize:12,fontWeight:800,color:B.textMid,
            textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
            Choose payment method
          </div>

          {/* Card — primary */}
          <button onClick={handleStripe}
            style={{width:"100%",background:B.primary,border:"none",
              borderRadius:16,padding:"18px 20px",
              display:"flex",alignItems:"center",gap:14,
              cursor:"pointer",marginBottom:10,fontFamily:"inherit",
              boxShadow:`0 6px 20px ${B.primary}40`}}>
            <div style={{width:46,height:46,borderRadius:12,
              background:"rgba(255,255,255,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <CreditCard size={24} color="#fff"/>
            </div>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Pay by card</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.75)"}}>
                Visa, Mastercard · Powered by Stripe
              </div>
            </div>
            <ChevronRight size={20} color="rgba(255,255,255,0.7)"/>
          </button>

          {/* Bank — secondary */}
          <button onClick={handleBank}
            style={{width:"100%",background:B.surface,
              border:`1.5px solid ${B.border}`,borderRadius:16,
              padding:"18px 20px",display:"flex",alignItems:"center",gap:14,
              cursor:"pointer",fontFamily:"inherit",marginBottom:20}}>
            <div style={{width:46,height:46,borderRadius:12,
              background:B.primaryLight,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Wallet size={24} color={B.primary}/>
            </div>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:B.text}}>Bank transfer</div>
              <div style={{fontSize:12,color:B.textMid}}>Pay directly to our account</div>
            </div>
            <ChevronRight size={20} color={B.textDim}/>
          </button>

          <div style={{display:"flex",alignItems:"center",gap:8,
            justifyContent:"center"}}>
            <ShieldCheck size={14} color={B.textDim}/>
            <span style={{fontSize:12,color:B.textDim}}>
              Secure · Your data is protected
            </span>
          </div>
        </div>
      </Wrap>
    );
  }

    // ══════════════════════════════════════════
  // TRACK (from bottom nav)
  // ══════════════════════════════════════════
  if(screen==="track") return (
    <Wrap>
      <div style={{background:B.surface,padding:"14px 16px",
        borderBottom:`1px solid ${B.border}`,
        position:"sticky",top:0,zIndex:100}}>
        <div style={{fontSize:17,fontWeight:800,color:B.text}}>Track order</div>
      </div>
      <TrackingPage/>
    </Wrap>
  );

  return <Wrap><div style={{padding:20}}>Loading…</div></Wrap>;
}



function NotificationBanner({ notifications, onDismiss }) {
  if (!notifications.length) return null;
  return (
    <div style={{position:"sticky",top:0,zIndex:200,width:"100%"}}>
      {notifications.map((n,i)=>(
        <div key={n.id} style={{
          background: n.type==="order" ? "#1A52A0"
            : n.type==="ready" ? "#E7A93B"
            : n.type==="delivered" ? "#2E7D32"
            : "#C96A1B",
          padding:"12px 16px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:12,
          borderBottom:"1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{fontSize:20,flexShrink:0}}>
              {n.type==="order"?"🛒":n.type==="ready"?"✅":n.type==="delivered"?"🎉":"🔔"}
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"#fff",lineHeight:1.3}}>
                {n.title}
              </div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",marginTop:2}}>
                {n.message}
              </div>
            </div>
          </div>
          <button onClick={()=>onDismiss(n.id)}
            style={{background:"rgba(255,255,255,0.15)",border:"none",
              borderRadius:8,width:28,height:28,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,color:"#fff"}}>
            <X size={14} color="#fff"/>
          </button>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. COOK / KITCHEN DASHBOARD
// ════════════════════════════════════════════════════════════════
function CookDashboard() {
  const [orders,, fetchOrders] = useOrders();
  const [sel,           setSel]           = useState(null);
  const [notifications, setNotifications] = useState([]);
  const prevCount = useRef(0);

  const live = orders.filter(o=>!["Delivered","Cancelled"].includes(o.status));
  const done = orders.filter(o=>o.status==="Delivered").slice(0,5);

  // New order notification
  useEffect(()=>{
    const newOrders = orders.filter(o=>o.status==="New");
    if(newOrders.length > prevCount.current && prevCount.current >= 0){
      const latest = newOrders[0];
      if(latest) setNotifications(p=>[...p,{
        id:Date.now(), type:"order",
        title:`New order — ${latest.customer}`,
        message:`${latest.items?.length||0} item${(latest.items?.length||0)!==1?"s":""} · ${fmt(latest.total)} · ${latest.postcode}`,
      }].slice(-3));
    }
    prevCount.current = newOrders.length;
  },[orders]);

  const NEXT = {
    "New":             "Preparing",
    "Preparing":       "Ready",
    "Ready":           "Out for delivery",
    "Out for delivery":"Delivered",
  };

  const STATUS_COLOR = {
    "New":             {bg:"#EBF4FF", text:"#1A52A0", border:"#B5D4F4"},
    "Preparing":       {bg:"#FFF1E2", text:"#A95412", border:"#FDDBB4"},
    "Ready":           {bg:"#EAF6EC", text:"#2E7D32", border:"#A8D5AB"},
    "Out for delivery":{bg:"#F3EEF8", text:"#5C3D9A", border:"#C4B0E0"},
    "Delivered":       {bg:"#F4F4F4", text:"#6F655E", border:"#D8D4D0"},
  };

  const advance = async (o) => {
    const next = NEXT[o.status];
    if(!next) return;
    await supabase.from("orders").update({status:next}).eq("id",o.id);
    if(o.phone) openWA(o.phone, `Hi ${o.customer.split(" ")[0]}! Your AfroCrave order ${o.id} is now: ${next}. ${next==="Out for delivery"?"Your rider is on the way!":""}`);
    fetchOrders();
    setSel(null);
  };

  const revenue = orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0);
  const newCount = orders.filter(o=>o.status==="New").length;
  const prepCount = orders.filter(o=>o.status==="Preparing").length;
  const readyCount = orders.filter(o=>o.status==="Ready").length;

  return (
    <div style={{height:"100%",background:"#F4F1EE",display:"flex",
      flexDirection:"column",overflow:"hidden",width:"100%"}}>

      {/* Notification banners */}
      {notifications.map(n=>(
        <div key={n.id} style={{background:"#1A52A0",padding:"10px 14px",
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
          flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.title}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>{n.message}</div>
          </div>
          <button onClick={()=>setNotifications(p=>p.filter(x=>x.id!==n.id))}
            style={{background:"rgba(255,255,255,0.2)",border:"none",
              borderRadius:6,width:24,height:24,cursor:"pointer",color:"#fff",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={12} color="#fff"/>
          </button>
        </div>
      ))}

      {/* Header strip */}
      <div style={{background:"#1F1A17",padding:"10px 14px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <ChefHat size={18} color="#E7A93B"/>
            <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>Kitchen</span>
            <div style={{width:8,height:8,borderRadius:"50%",
              background:"#2E7D32",marginLeft:4}}/>
          </div>
          <button onClick={fetchOrders}
            style={{background:"rgba(255,255,255,0.1)",border:"none",
              borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.7)",
              fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <RefreshCw size={12}/>Refresh
          </button>
        </div>
        {/* Quick stats */}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {[
            {label:"NEW",  value:newCount,  bg:"#1A52A0"},
            {label:"PREP", value:prepCount, bg:"#A95412"},
            {label:"READY",value:readyCount,bg:"#2E7D32"},
            {label:"TODAY",value:`£${revenue.toFixed(0)}`,bg:"#5A3418"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:s.bg,
              borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>{s.value}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",
                fontWeight:700,letterSpacing:0.5}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Order detail modal */}
      {sel&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:200,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",width:"100%",borderRadius:"20px 20px 0 0",
            padding:"20px 16px 32px",maxHeight:"80vh",overflowY:"auto"}}>
            {/* Order header */}
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:22,fontWeight:900,color:"#1F1A17",
                  letterSpacing:-0.5}}>{sel.id}</div>
                <div style={{fontSize:14,color:"#6F655E"}}>{sel.customer}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {(() => {
                  const c = STATUS_COLOR[sel.status]||STATUS_COLOR["New"];
                  return (
                    <div style={{background:c.bg,border:`1px solid ${c.border}`,
                      borderRadius:8,padding:"4px 10px",fontSize:12,
                      fontWeight:700,color:c.text}}>
                      {sel.status}
                    </div>
                  );
                })()}
                <button onClick={()=>setSel(null)}
                  style={{background:"#F4F1EE",border:"none",borderRadius:8,
                    width:32,height:32,cursor:"pointer",display:"flex",
                    alignItems:"center",justifyContent:"center"}}>
                  <X size={16}/>
                </button>
              </div>
            </div>

            {/* Items */}
            <div style={{background:"#F4F1EE",borderRadius:12,
              padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                Items ordered
              </div>
              {(sel.items||[]).map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"6px 0",borderBottom:i<sel.items.length-1?"1px solid #E9DDD0":"none"}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#1F1A17"}}>
                    {it.name}
                  </span>
                  <span style={{fontSize:15,fontWeight:800,color:"#C96A1B"}}>
                    ×{it.qty}
                  </span>
                </div>
              ))}
            </div>

            {/* Order info */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
              gap:8,marginBottom:16}}>
              {[
                ["Time",     sel.time||"—"],
                ["Payment",  sel.paid?"✓ Paid":"⏳ Pending"],
                ["Postcode", sel.postcode||"—"],
                ["Total",    fmt(sel.total)],
              ].map(([l,v])=>(
                <div key={l} style={{background:"#F4F1EE",borderRadius:10,
                  padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"#A0968E",fontWeight:700,
                    textTransform:"uppercase",letterSpacing:0.3,marginBottom:3}}>
                    {l}
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:"#1F1A17"}}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            {sel.note&&(
              <div style={{background:"#FFF1E2",border:"1px solid #FDDBB4",
                borderRadius:10,padding:"10px 12px",marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:800,color:"#A95412",
                  marginBottom:3}}>NOTE</div>
                <div style={{fontSize:14,color:"#1F1A17"}}>{sel.note}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {NEXT[sel.status]&&(
                <button onClick={()=>advance(sel)}
                  style={{width:"100%",background:"#C96A1B",border:"none",
                    borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
                    color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                  Mark as {NEXT[sel.status]} →
                </button>
              )}
              {sel.phone&&(
                <button onClick={()=>openWA(sel.phone,
                  `Hi ${sel.customer.split(" ")[0]}, your AfroCrave order ${sel.id} status: ${sel.status}`)}
                  style={{width:"100%",background:"#25D366",border:"none",
                    borderRadius:14,padding:"13px",fontSize:14,fontWeight:700,
                    color:"#fff",cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <MessageCircle size={16} color="#fff"/>
                  WhatsApp customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order board */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 10px 20px"}}>
        {live.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:18,fontWeight:800,color:"#1F1A17"}}>
              All clear
            </div>
            <div style={{fontSize:14,color:"#6F655E",marginTop:4}}>
              No active orders right now
            </div>
          </div>
        )}

        {live.map(o=>{
          const c = STATUS_COLOR[o.status]||STATUS_COLOR["New"];
          return (
            <button key={o.id} onClick={()=>setSel(o)}
              style={{width:"100%",background:"#fff",
                border:`2px solid ${c.border}`,borderRadius:14,
                padding:"14px",marginBottom:8,cursor:"pointer",
                textAlign:"left",fontFamily:"inherit",
                display:"flex",flexDirection:"column",gap:8}}>
              {/* Top row */}
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center"}}>
                <div style={{fontSize:18,fontWeight:900,color:"#1F1A17",
                  letterSpacing:-0.3}}>{o.id}</div>
                <div style={{background:c.bg,border:`1px solid ${c.border}`,
                  borderRadius:6,padding:"3px 10px",fontSize:12,
                  fontWeight:800,color:c.text}}>
                  {o.status}
                </div>
              </div>
              {/* Items */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(o.items||[]).map((it,i)=>(
                  <div key={i} style={{background:"#F4F1EE",borderRadius:6,
                    padding:"3px 8px",fontSize:13,fontWeight:700,color:"#1F1A17"}}>
                    {it.name} ×{it.qty}
                  </div>
                ))}
              </div>
              {/* Bottom row */}
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center"}}>
                <div style={{fontSize:13,color:"#6F655E"}}>{o.customer} · {o.postcode}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,fontWeight:700,
                    color:o.paid?"#2E7D32":"#A95412"}}>
                    {o.paid?"Paid":"Unpaid"}
                  </span>
                  <span style={{fontSize:13,fontWeight:800,color:"#1F1A17"}}>
                    {fmt(o.total)}
                  </span>
                </div>
              </div>
              {o.note&&(
                <div style={{background:"#FFF1E2",borderRadius:6,
                  padding:"4px 8px",fontSize:12,color:"#A95412",fontWeight:600}}>
                  📝 {o.note}
                </div>
              )}
            </button>
          );
        })}

        {/* Completed today */}
        {done.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
              textTransform:"uppercase",letterSpacing:0.5,
              padding:"8px 4px",marginBottom:6}}>
              Completed today
            </div>
            {done.map(o=>(
              <div key={o.id} style={{background:"#F4F1EE",borderRadius:10,
                padding:"10px 12px",marginBottom:6,opacity:0.7,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:"#1F1A17"}}>
                    {o.id}
                  </span>
                  <span style={{fontSize:13,color:"#6F655E",marginLeft:8}}>
                    {o.customer}
                  </span>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:"#2E7D32"}}>
                  {fmt(o.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function RiderApp() {
  const [orders,, fetchOrders] = useOrders();
  const [RIDER] = useState("Rider");
  const [sel,         setSel]         = useState(null);
  const [riderNotifs, setRiderNotifs] = useState([]);
  const prevAvail = useRef(0);

  const available = orders.filter(o=>o.status==="Ready"&&!o.rider_name);
  const mine      = orders.filter(o=>o.rider_name===RIDER&&
    ["Out for delivery"].includes(o.status));
  const completed = orders.filter(o=>o.rider_name===RIDER&&o.status==="Delivered");
  const earnings  = completed.length * 4.50;

  // Notification for new ready orders
  useEffect(()=>{
    if(available.length > prevAvail.current && prevAvail.current >= 0){
      setRiderNotifs(p=>[...p,{
        id:Date.now(),
        title:"New delivery available!",
        message:`${available[0]?.customer} · ${available[0]?.postcode}`,
      }].slice(-2));
    }
    prevAvail.current = available.length;
  },[available]);

  const claimOrder = async (o) => {
    await supabase.from("orders")
      .update({rider_name:RIDER, status:"Out for delivery"})
      .eq("id",o.id);
    fetchOrders();
    setSel(null);
  };

  const markDelivered = async (o) => {
    await supabase.from("orders")
      .update({status:"Delivered"})
      .eq("id",o.id);
    if(o.customer_phone) openWA(o.customer_phone,
      `Hi ${o.customer_name?.split(" ")[0]}, your AfroCrave order ${o.id} has been delivered! Enjoy your meal 🍛`);
    fetchOrders();
    setSel(null);
  };

  return (
    <div style={{height:"100%",background:"#F4F1EE",display:"flex",
      flexDirection:"column",overflow:"hidden",width:"100%"}}>

      {/* Notifications */}
      {riderNotifs.map(n=>(
        <div key={n.id} style={{background:"#2E7D32",padding:"10px 14px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          flexShrink:0}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.title}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>{n.message}</div>
          </div>
          <button onClick={()=>setRiderNotifs(p=>p.filter(x=>x.id!==n.id))}
            style={{background:"rgba(255,255,255,0.2)",border:"none",
              borderRadius:6,width:24,height:24,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={12} color="#fff"/>
          </button>
        </div>
      ))}

      {/* Header */}
      <div style={{background:"#1F1A17",padding:"12px 14px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Bike size={18} color="#E7A93B"/>
            <span style={{fontSize:15,fontWeight:800,color:"#fff"}}>Rider</span>
          </div>
          <button onClick={fetchOrders}
            style={{background:"rgba(255,255,255,0.1)",border:"none",
              borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.7)",
              fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <RefreshCw size={12}/>Refresh
          </button>
        </div>
        {/* Earnings strip */}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {[
            {label:"AVAILABLE", value:available.length, bg:"#2E7D32"},
            {label:"ACTIVE",    value:mine.length,      bg:"#A95412"},
            {label:"TODAY",     value:completed.length, bg:"#1A52A0"},
            {label:"EARNED",    value:`£${earnings.toFixed(0)}`, bg:"#5A3418"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:s.bg,
              borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>{s.value}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",
                fontWeight:700,letterSpacing:0.5}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Order detail bottom sheet */}
      {sel&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:200,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",width:"100%",borderRadius:"20px 20px 0 0",
            padding:"20px 16px 36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:22,fontWeight:900,color:"#1F1A17"}}>
                  {sel.id}
                </div>
                <div style={{fontSize:14,color:"#6F655E"}}>{sel.customer}</div>
              </div>
              <button onClick={()=>setSel(null)}
                style={{background:"#F4F1EE",border:"none",borderRadius:8,
                  width:36,height:36,cursor:"pointer",display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                <X size={18}/>
              </button>
            </div>

            {/* Address */}
            <div style={{background:"#F4F1EE",borderRadius:12,
              padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>
                Delivery address
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"#1F1A17",
                marginBottom:2}}>{sel.address}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#C96A1B"}}>
                {sel.postcode}
              </div>
            </div>

            {/* Items summary */}
            <div style={{background:"#F4F1EE",borderRadius:12,
              padding:"10px 14px",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>
                Items
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(sel.items||[]).map((it,i)=>(
                  <div key={i} style={{background:"#fff",borderRadius:6,
                    padding:"3px 8px",fontSize:13,fontWeight:700,color:"#1F1A17"}}>
                    {it.name} ×{it.qty}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact + map buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
              gap:8,marginBottom:12}}>
              {sel.phone&&(
                <button onClick={()=>window.open(`tel:+${sel.phone}`)}
                  style={{background:"#EAF6EC",border:"1px solid #A8D5AB",
                    borderRadius:12,padding:"12px 8px",cursor:"pointer",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <Phone size={20} color="#2E7D32"/>
                  <span style={{fontSize:11,fontWeight:700,color:"#2E7D32"}}>Call</span>
                </button>
              )}
              {sel.phone&&(
                <button onClick={()=>openWA(sel.phone,
                  `Hi ${sel.customer?.split(" ")[0]}, I'm your AfroCrave rider heading to you now!`)}
                  style={{background:"#EAF6EC",border:"1px solid #A8D5AB",
                    borderRadius:12,padding:"12px 8px",cursor:"pointer",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <MessageCircle size={20} color="#2E7D32"/>
                  <span style={{fontSize:11,fontWeight:700,color:"#2E7D32"}}>WhatsApp</span>
                </button>
              )}
              <button onClick={()=>window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sel.address+", "+sel.postcode+", UK")}`,"_blank")}
                style={{background:"#EBF4FF",border:"1px solid #B5D4F4",
                  borderRadius:12,padding:"12px 8px",cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <MapPinned size={20} color="#1A52A0"/>
                <span style={{fontSize:11,fontWeight:700,color:"#1A52A0"}}>Navigate</span>
              </button>
            </div>

            {/* Primary action */}
            {sel.status==="Ready"&&(
              <button onClick={()=>claimOrder(sel)}
                style={{width:"100%",background:"#C96A1B",border:"none",
                  borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
                  color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                Accept delivery →
              </button>
            )}
            {sel.status==="Out for delivery"&&(
              <button onClick={()=>markDelivered(sel)}
                style={{width:"100%",background:"#2E7D32",border:"none",
                  borderRadius:14,padding:"16px",fontSize:16,fontWeight:800,
                  color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                ✓ Mark as delivered
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 10px 20px"}}>

        {/* Active delivery */}
        {mine.map(o=>(
          <div key={o.id}>
            <div style={{fontSize:11,fontWeight:800,color:"#A95412",
              textTransform:"uppercase",letterSpacing:0.5,padding:"4px 4px 6px"}}>
              🔴 Active delivery
            </div>
            <button onClick={()=>setSel(o)}
              style={{width:"100%",background:"#fff",
                border:"2px solid #C96A1B",borderRadius:14,
                padding:"16px",marginBottom:12,cursor:"pointer",
                textAlign:"left",fontFamily:"inherit"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:20,fontWeight:900,color:"#1F1A17"}}>
                  {o.id}
                </div>
                <div style={{background:"#FFF1E2",border:"1px solid #FDDBB4",
                  borderRadius:6,padding:"4px 10px",fontSize:12,
                  fontWeight:800,color:"#A95412"}}>
                  Out for delivery
                </div>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:"#1F1A17",
                marginBottom:4}}>{o.customer}</div>
              <div style={{fontSize:14,color:"#6F655E",marginBottom:10}}>
                {o.address} · {o.postcode}
              </div>
              <div style={{background:"#C96A1B",borderRadius:10,padding:"12px",
                textAlign:"center",fontSize:14,fontWeight:800,color:"#fff"}}>
                Tap to mark delivered →
              </div>
            </button>
          </div>
        ))}

        {/* Available orders */}
        {available.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#2E7D32",
              textTransform:"uppercase",letterSpacing:0.5,padding:"4px 4px 6px"}}>
              🟢 Available to pick up ({available.length})
            </div>
            {available.map(o=>(
              <button key={o.id} onClick={()=>setSel(o)}
                style={{width:"100%",background:"#fff",
                  border:"2px solid #A8D5AB",borderRadius:14,
                  padding:"14px",marginBottom:8,cursor:"pointer",
                  textAlign:"left",fontFamily:"inherit"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:18,fontWeight:900,color:"#1F1A17"}}>
                    {o.id}
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:"#C96A1B"}}>
                    £4.50 earning
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#1F1A17",
                  marginBottom:3}}>{o.customer}</div>
                <div style={{fontSize:13,color:"#6F655E",marginBottom:10}}>
                  {o.postcode}
                </div>
                <div style={{background:"#EAF6EC",border:"1px solid #A8D5AB",
                  borderRadius:10,padding:"10px",textAlign:"center",
                  fontSize:14,fontWeight:800,color:"#2E7D32"}}>
                  Accept delivery →
                </div>
              </button>
            ))}
          </div>
        )}

        {mine.length===0&&available.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🛵</div>
            <div style={{fontSize:18,fontWeight:800,color:"#1F1A17"}}>
              No deliveries yet
            </div>
            <div style={{fontSize:14,color:"#6F655E",marginTop:4}}>
              Orders will appear here when ready
            </div>
          </div>
        )}

        {/* Completed today */}
        {completed.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
              textTransform:"uppercase",letterSpacing:0.5,
              padding:"8px 4px",marginBottom:6}}>
              Completed today ({completed.length})
            </div>
            {completed.map(o=>(
              <div key={o.id} style={{background:"#F4F1EE",borderRadius:10,
                padding:"10px 14px",marginBottom:6,opacity:0.7,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:"#1F1A17"}}>
                    {o.id}
                  </span>
                  <span style={{fontSize:13,color:"#6F655E",marginLeft:8}}>
                    {o.customer}
                  </span>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:"#2E7D32"}}>
                  +£4.50
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


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
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <div style={{width:72,height:72,borderRadius:"50%",
              background:B.primaryLight,display:"flex",alignItems:"center",
              justifyContent:"center"}}>
              <MapPin size={36} color={B.primary}/>
            </div>
          </div>
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
            <span style={{fontSize:16,color:B.textMid,alignSelf:"center"}}>Recent:</span>
            {orders.slice(0,4).map(o=>(
              <button key={o.id}
                onClick={()=>{setOid(o.id);setFound(o);setSearched(true);}}
                style={{padding:"6px 14px",borderRadius:20,fontSize:16,fontWeight:700,
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
            <div style={{fontSize:16,fontWeight:700,color:B.text}}>Order not found</div>
            <div style={{fontSize:15,color:B.textMid,marginTop:8,lineHeight:1.6}}>
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
                  <div style={{fontSize:14,color:B.textDim,marginBottom:4}}>{found.id}</div>
                  <div style={{fontSize:20,fontWeight:800,color:B.text}}>{found.customer}</div>
                </div>
                <Pill s={found.status}/>
              </div>
              {/* Deliveroo-style progress bar */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",gap:3,marginBottom:6}}>
                  {STAGES.map((st,si)=>{
                    const curr=STAGES.indexOf(found.status);
                    return(
                      <div key={st} style={{flex:1,height:5,borderRadius:3,
                        background:si<curr?B.green:si===curr?B.primary:B.border,
                        transition:"background 0.3s"}}/>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {["Received","Preparing","Ready","Delivery","Done"].map((lbl,si)=>{
                    const curr=STAGES.indexOf(found.status);
                    return(
                      <div key={lbl} style={{fontSize:9,fontWeight:si===curr?800:500,
                        color:si<curr?B.green:si===curr?B.primary:B.textDim,
                        textAlign:"center",flex:1}}>
                        {lbl}
                      </div>
                    );
                  })}
                </div>
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
                        fontSize:16,color:"#fff",
                        boxShadow:active?`0 0 0 5px ${B.primaryLight}`:""}}>
                        {done?(active?"●":"✓"):""}
                      </div>
                      {i<STAGES.length-1&&(
                        <div style={{width:2,height:28,
                          background:done&&!active?B.primary:B.divider}}/>
                      )}
                    </div>
                    <div style={{paddingTop:6}}>
                      <div style={{fontSize:16,fontWeight:active?700:500,
                        color:active?B.primary:done?B.text:B.textMid}}>{st}</div>
                      {active&&(
                        <div style={{fontSize:14,color:B.textMid,marginTop:3,
                          lineHeight:1.5}}>{MSGS[st]}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Order details */}
            <Card style={{marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700,color:B.text,marginBottom:12}}>
                Order details
              </div>
              {found.items.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:i<found.items.length-1?`1px solid ${B.divider}`:"none"}}>
                  <span style={{fontSize:15,color:B.textMid}}>{it.name} ×{it.qty}</span>
                  <span style={{fontSize:15,fontWeight:600,color:B.text}}>{fmt(it.price*it.qty)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
                fontSize:16,borderTop:`1px solid ${B.divider}`,marginTop:2}}>
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
              <div style={{fontSize:16,color:B.textMid,fontWeight:700,
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Delivering to</div>
              <div style={{fontSize:16,color:B.text,fontWeight:500,marginBottom:4}}>
                📍 {found.address}
              </div>
              <div style={{fontSize:15,color:B.textMid,marginBottom:found.rider?8:0}}>
                📮 {found.postcode} · {found.zone}
              </div>
              {found.rider&&(
                <div style={{fontSize:14,color:B.green,fontWeight:700}}>
                  🛵 Rider: {found.rider}
                </div>
              )}
              <div style={{marginTop:10}}>
                {found.paid
                  ?<span style={{fontSize:14,color:B.green,fontWeight:700}}>
                    💳 {found.paymentMethod} — confirmed
                  </span>
                  :<span style={{fontSize:14,color:B.gold,fontWeight:700}}>
                    ⏳ {found.paymentMethod} — pending
                  </span>}
              </div>
            </Card>

            {found.status!=="Delivered"&&(
              <Btn full v="wa" style={{fontSize:15}}
                onClick={()=>openWA(B.kitchenWA,
                  `Hi AfroCrave Kitchen, checking on order ${found.id}. Status shows: ${found.status}. Any update? 🙏`)}>
                Message kitchen
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════════
// Passwords defined in StaffApp
const ADMIN_PASS  = import.meta.env.VITE_PASS_ADMIN;
const KITCHEN_PASS = import.meta.env.VITE_PASS_KITCHEN;

function AdminPanel() {
  const [authed,    setAuthed]    = useState(false);
  const [role,      setRole]      = useState(null);
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [section,   setSection]   = useState("orders");
  const [menuItems, setMenuItems] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [riders,    setRiders]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState("");
  const [selOrder,  setSelOrder]  = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [menuForm,    setMenuForm]    = useState({
    name:"", description:"", price:"", category:"Rice Dishes",
    emoji:"🍛", portion:"", calories:"", available:true,
    is_vegan:false, chef_pick:false,
    imagePreview:null, imageFile:null, imageUrl:"",
  });

  const [riderForm,   setRiderForm]   = useState({name:"",phone:""});
  const [addingRider, setAddingRider] = useState(false);

  const [settings, setSettings] = useState({
    kitchenName:"AfroCrave Kitchen",
    phone:"+44 7823 644323",
    address:"Sunderland, UK",
    minOrder:"15",
    deliveryTime:"45–75 min",
  });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  const login = () => {
    if(password===ADMIN_PASS){setAuthed(true);setRole("super");setError("");loadAll();}
    else if(password===KITCHEN_PASS){setAuthed(true);setRole("kitchen");setError("");loadAll();}
    else{setError("Incorrect password.");setPassword("");}
  };

  const loadAll = async () => {
    setLoading(true);
    const [mR,oR,rR,sR] = await Promise.all([
      supabase.from("menu_items").select("*").order("category"),
      supabase.from("orders").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("riders").select("*").order("name"),
      supabase.from("kitchen_settings").select("*").eq("id",1).single(),
    ]);
    if(mR.data)  setMenuItems(mR.data);
    if(oR.data)  setOrders(oR.data.map(o=>({...o,
      items:typeof o.items==="string"?JSON.parse(o.items):(o.items||[])})));
    if(rR.data)  setRiders(rR.data);
    if(sR.data)  setSettings({
      kitchenName: sR.data.kitchen_name||"AfroCrave Kitchen",
      phone:       sR.data.phone||"+44 7823 644323",
      address:     sR.data.address||"Sunderland, UK",
      minOrder:    sR.data.min_order?.toString()||"15",
      deliveryTime:sR.data.delivery_time||"45–75 min",
    });
    setLoading(false);
  };

  // Login screen
  if(!authed) return (
    <div style={{minHeight:"100%",background:"#1F1A17",display:"flex",
      alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <Lock size={48} color="#E7A93B" style={{marginBottom:12}}/>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:4}}>
            Admin Access
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.5)"}}>
            AfroCrave Kitchen · Choma Platform
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,0.07)",
          border:"0.5px solid rgba(255,255,255,0.12)",
          borderRadius:18,padding:"20px"}}>
          <Input label="Password" value={password}
            onChange={v=>setPassword(v)} placeholder="Enter your password"
            type="password"/>
          {error&&(
            <div style={{fontSize:13,color:"#FF8A7A",marginBottom:14,
              background:"rgba(220,80,50,0.15)",padding:"10px 12px",
              borderRadius:10}}>⚠️ {error}</div>
          )}
          <button onClick={login} disabled={!password}
            style={{width:"100%",background:password?"#C96A1B":"rgba(255,255,255,0.1)",
              border:"none",borderRadius:12,padding:"14px",fontSize:15,
              fontWeight:800,color:password?"#fff":"rgba(255,255,255,0.3)",
              cursor:password?"pointer":"not-allowed",fontFamily:"inherit"}}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );

  const SECTIONS = [
    {id:"orders",  label:"Orders",   icon:<ClipboardList size={14}/>},
    {id:"menu",    label:"Menu",     icon:<UtensilsCrossed size={14}/>},
    {id:"riders",  label:"Riders",   icon:<Bike size={14}/>},
    {id:"settings",label:"Settings", icon:<Settings size={14}/>},
  ];

  const CATEGORIES = ["Rice Dishes","Nigerian Soups","Snacks","Cakes"];

  // Stats
  const today = orders.filter(o=>{
    const d = new Date(o.created_at);
    const t = new Date();
    return d.toDateString()===t.toDateString();
  });
  const statuses = ["New","Preparing","Ready","Out for delivery","Delivered"];

  const saveMenuItem = async () => {
    if(!menuForm.name||!menuForm.price) return;
    setLoading(true);
    let imageUrl = menuForm.imageUrl||"";
    if(menuForm.imageFile){
      const fileName=`menu/${Date.now()}_${menuForm.name.replace(/\s+/g,"_")}.jpg`;
      const {data:ud,error:ue}=await supabase.storage
        .from("food-images").upload(fileName,menuForm.imageFile,{upsert:true});
      if(!ue&&ud){
        const {data:urlData}=supabase.storage.from("food-images").getPublicUrl(fileName);
        imageUrl=urlData.publicUrl;
      }
    }
    const data={
      name:menuForm.name, description:menuForm.description,
      price:parseFloat(menuForm.price), category:menuForm.category,
      emoji:menuForm.emoji, portion:menuForm.portion,
      calories:parseInt(menuForm.calories)||0,
      available:menuForm.available, is_vegan:menuForm.is_vegan,
      chef_pick:menuForm.chef_pick, allergens:[], image_url:imageUrl,
    };
    if(editingItem)
      await supabase.from("menu_items").update(data).eq("id",editingItem.id);
    else
      await supabase.from("menu_items").insert([data]);
    showToast(editingItem?"✅ Item updated":"✅ Item added");
    setEditingItem(null);
    setMenuForm({name:"",description:"",price:"",category:"Rice Dishes",
      emoji:"🍛",portion:"",calories:"",available:true,is_vegan:false,
      chef_pick:false,imagePreview:null,imageFile:null,imageUrl:""});
    await loadAll(); setLoading(false);
  };

  const deleteMenuItem = async id => {
    if(!window.confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id",id);
    showToast("🗑️ Deleted"); await loadAll();
  };

  const toggleAvailable = async item => {
    await supabase.from("menu_items").update({available:!item.available}).eq("id",item.id);
    showToast(item.available?"❌ Marked sold out":"✅ Marked available");
    await loadAll();
  };

  const editItem = item => {
    setEditingItem(item);
    setMenuForm({
      name:item.name, description:item.description||"",
      price:item.price.toString(), category:item.category,
      emoji:item.emoji||"🍛", portion:item.portion||"",
      calories:item.calories?.toString()||"",
      available:item.available, is_vegan:item.is_vegan,
      chef_pick:item.chef_pick||false,
      imagePreview:item.image_url||null, imageFile:null,
      imageUrl:item.image_url||"",
    });
  };

  const saveRider = async () => {
    if(!riderForm.name||!riderForm.phone) return;
    await supabase.from("riders").insert([{
      name:riderForm.name, phone:riderForm.phone.replace(/\D/g,""),
    }]);
    showToast("✅ Rider added");
    setRiderForm({name:"",phone:""}); setAddingRider(false);
    await loadAll();
  };

  const assignRider = async (orderId, riderName) => {
    await supabase.from("orders").update({rider_name:riderName}).eq("id",orderId);
    showToast(`✅ Assigned to ${riderName}`); await loadAll();
  };

  return (
    <div style={{minHeight:"100%",background:"#F4F1EE",display:"flex",
      flexDirection:"column"}}>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:70,left:"50%",
          transform:"translateX(-50%)",zIndex:9999,
          background:"#1F1A17",color:"#fff",padding:"10px 20px",
          borderRadius:20,fontSize:13,fontWeight:700}}>
          {toast}
        </div>
      )}

      {/* Order detail sheet */}
      {selOrder&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:300,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",width:"100%",
            borderRadius:"20px 20px 0 0",padding:"20px 16px 36px",
            maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:22,fontWeight:900,color:"#1F1A17"}}>
                  {selOrder.id}
                </div>
                <div style={{fontSize:14,color:"#6F655E"}}>
                  {selOrder.customer_name}
                </div>
              </div>
              <button onClick={()=>setSelOrder(null)}
                style={{background:"#F4F1EE",border:"none",borderRadius:8,
                  width:36,height:36,cursor:"pointer",display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                <X size={18}/>
              </button>
            </div>
            {/* Full order details */}
            <div style={{background:"#F4F1EE",borderRadius:12,
              padding:"12px 14px",marginBottom:12}}>
              {(selOrder.items||[]).map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:i<selOrder.items.length-1
                    ?"1px solid #E9DDD0":"none"}}>
                  <span style={{fontSize:14,fontWeight:700}}>{it.name}</span>
                  <span style={{fontSize:14,fontWeight:800,color:"#C96A1B"}}>
                    ×{it.qty}
                  </span>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",
              gap:8,marginBottom:12}}>
              {[
                ["Status",  selOrder.status],
                ["Payment", selOrder.paid?"✓ Paid":"⏳ Pending"],
                ["Total",   fmt(selOrder.total)],
                ["Postcode",selOrder.postcode],
              ].map(([l,v])=>(
                <div key={l} style={{background:"#F4F1EE",borderRadius:10,
                  padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"#A0968E",fontWeight:700,
                    textTransform:"uppercase",letterSpacing:0.3,marginBottom:2}}>
                    {l}
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:"#1F1A17"}}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:13,color:"#6F655E",marginBottom:12,
              padding:"8px 12px",background:"#F4F1EE",borderRadius:10}}>
              📍 {selOrder.delivery_address}
            </div>
            {/* Assign rider */}
            {selOrder.status==="Ready"&&riders.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:800,color:"#A0968E",
                  textTransform:"uppercase",marginBottom:8}}>
                  Assign rider
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {riders.map(r=>(
                    <button key={r.id}
                      onClick={()=>{assignRider(selOrder.id,r.name);setSelOrder(null);}}
                      style={{background:"#EAF6EC",border:"1px solid #A8D5AB",
                        borderRadius:10,padding:"8px 14px",fontSize:13,
                        fontWeight:700,color:"#2E7D32",cursor:"pointer",
                        fontFamily:"inherit"}}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delete order */}
            <button onClick={async()=>{
              if(!window.confirm(`Delete order ${selOrder.id}? This cannot be undone.`)) return;
              await supabase.from("orders").delete().eq("id",selOrder.id);
              showToast("🗑️ Order deleted");
              setSelOrder(null);
              await loadAll();
            }}
              style={{width:"100%",background:"#FCECEA",
                border:"1px solid #F0C4C0",borderRadius:12,
                padding:"11px",fontSize:13,fontWeight:700,
                color:"#B23A30",cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Trash2 size={14} color="#B23A30"/>
              Delete this order
            </button>
          </div>
        </div>
      )}

      {/* Admin header */}
      <div style={{background:"#1F1A17",padding:"12px 14px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",
          alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>
              {role==="super"?"⚡ Admin":"👩‍🍳 Kitchen Admin"}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>
              AfroCrave Kitchen
            </div>
          </div>
          <button onClick={()=>{setAuthed(false);setPassword("");setRole(null);}}
            style={{background:"rgba(255,255,255,0.1)",border:"none",
              borderRadius:8,padding:"5px 10px",color:"rgba(255,255,255,0.6)",
              fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <LogOut size={12}/>Sign out
          </button>
        </div>

        {/* Today stats */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[
            {label:"TODAY",  value:today.length},
            {label:"NEW",    value:today.filter(o=>o.status==="New").length,      bg:"#1A52A0"},
            {label:"PREP",   value:today.filter(o=>o.status==="Preparing").length,bg:"#A95412"},
            {label:"DONE",   value:today.filter(o=>o.status==="Delivered").length,bg:"#2E7D32"},
          ].map((s,i)=>(
            <div key={s.label} style={{flex:1,
              background:s.bg||"rgba(255,255,255,0.1)",
              borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{s.value}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",
                fontWeight:700,letterSpacing:0.5}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div style={{display:"flex",gap:3}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)}
              style={{flex:1,padding:"7px 4px",borderRadius:10,
                fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                background:section===s.id?"rgba(255,255,255,0.2)":"transparent",
                color:section===s.id?"#fff":"rgba(255,255,255,0.5)",
                fontFamily:"inherit"}}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>
      </div>

      {loading&&(
        <div style={{padding:16,textAlign:"center",color:"#6F655E",fontSize:14}}>
          Loading…
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"12px 12px 40px"}}>

        {/* ── ORDERS ── */}
        {section==="orders"&&(
          <div>
            {/* Revenue card */}
            <div style={{background:"#fff",border:"1px solid #E9DDD0",
              borderRadius:14,padding:"14px 16px",marginBottom:12,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,color:"#6F655E",fontWeight:700,
                  textTransform:"uppercase",letterSpacing:0.5}}>
                  Today's revenue
                </div>
                <div style={{fontSize:28,fontWeight:900,color:"#C96A1B",letterSpacing:-0.5}}>
                  {fmt(today.filter(o=>o.paid).reduce((s,o)=>s+o.total,0))}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,color:"#6F655E"}}>
                  {today.filter(o=>o.paid).length} paid
                </div>
                <div style={{fontSize:13,color:"#A95412",fontWeight:600}}>
                  {today.filter(o=>!o.paid).length} pending
                </div>
              </div>
            </div>

            {/* Order filter tabs + Clear all */}
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",
              alignItems:"center"}}>
              {[
                {id:"active",  label:"Active",   filter:o=>!["Delivered","Cancelled"].includes(o.status)},
                {id:"archive", label:"Archive",  filter:o=>["Delivered","Cancelled"].includes(o.status)},
                {id:"all",     label:"All",      filter:()=>true},
              ].map(t=>(
                <button key={t.id}
                  onClick={()=>setSection("orders_"+t.id)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:12,
                    fontWeight:700,cursor:"pointer",border:"none",
                    background:section==="orders_"+t.id||
                      (t.id==="active"&&section==="orders")
                      ?"#1F1A17":"#E9DDD0",
                    color:section==="orders_"+t.id||
                      (t.id==="active"&&section==="orders")
                      ?"#fff":"#6F655E",
                    fontFamily:"inherit"}}>
                  {t.label} ({orders.filter(t.filter).length})
                </button>
              ))}
              <button onClick={async()=>{
                if(!window.confirm("Delete ALL orders? This is permanent and cannot be undone.")) return;
                const {error} = await supabase.from("orders").delete().gt("id","");
                if(!error){showToast("🗑️ All orders cleared");await loadAll();}
                else showToast("⚠️ Error clearing orders");
              }}
                style={{marginLeft:"auto",padding:"5px 10px",borderRadius:20,
                  fontSize:11,fontWeight:700,cursor:"pointer",
                  background:"#FCECEA",border:"1px solid #F0C4C0",
                  color:"#B23A30",fontFamily:"inherit"}}>
                🗑️ Clear all
              </button>
            </div>

            {(() => {
              const activeFilter = section==="orders_archive"
                ? o=>["Delivered","Cancelled"].includes(o.status)
                : section==="orders_all"
                ? ()=>true
                : o=>!["Delivered","Cancelled"].includes(o.status);
              const filtered = orders.filter(activeFilter);
              if(filtered.length===0) return (
                <div style={{textAlign:"center",padding:"32px 20px",color:"#6F655E"}}>
                  No orders here
                </div>
              );
              return filtered.map(o=>(
                <button key={o.id} onClick={()=>setSelOrder(o)}
                style={{width:"100%",background:"#fff",
                  border:"1px solid #E9DDD0",borderRadius:12,
                  padding:"12px 14px",marginBottom:8,cursor:"pointer",
                  textAlign:"left",fontFamily:"inherit",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:15,fontWeight:800,color:"#1F1A17"}}>
                      {o.id}
                    </span>
                    <Pill s={o.status}/>
                  </div>
                  <div style={{fontSize:13,color:"#6F655E",overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {o.customer_name} · {o.postcode}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#C96A1B"}}>
                    {fmt(o.total)}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,
                    color:o.paid?"#2E7D32":"#A95412"}}>
                    {o.paid?"Paid":"Pending"}
                  </div>
                </div>
              </button>
              ));
            })()}
          </div>
        )}

        {/* ── MENU ── */}
        {section==="menu"&&(
          <div>
            {/* Add/Edit form */}
            <div style={{background:"#fff",border:`1px solid ${editingItem?"#C96A1B":"#E9DDD0"}`,
              borderRadius:14,padding:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:800,color:"#1F1A17",marginBottom:12}}>
                {editingItem?"✏️ Edit item":"➕ Add new item"}
              </div>

              {/* Image upload */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6F655E",
                  textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>
                  Food photo
                </div>
                <label style={{display:"block",cursor:"pointer"}}>
                  <div style={{width:"100%",aspectRatio:"2.5/1",
                    background:"#F4F1EE",
                    border:`1.5px dashed ${menuForm.imagePreview?"#C96A1B":"#E9DDD0"}`,
                    borderRadius:12,display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",
                    overflow:"hidden",position:"relative"}}>
                    {menuForm.imagePreview
                      ? <img src={menuForm.imagePreview} alt="Food"
                          style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      : <><Plus size={20} color="#A0968E"/>
                          <div style={{fontSize:12,color:"#A0968E",marginTop:4}}>
                            Tap to add photo
                          </div></>
                    }
                  </div>
                  <input type="file" accept="image/*" style={{display:"none"}}
                    onChange={e=>{
                      const file=e.target.files[0];
                      if(file){
                        const r=new FileReader();
                        r.onload=ev=>setMenuForm(f=>({...f,
                          imageFile:file,imagePreview:ev.target.result}));
                        r.readAsDataURL(file);
                      }
                    }}/>
                </label>
                {menuForm.imagePreview&&(
                  <button onClick={()=>setMenuForm(f=>({...f,
                    imagePreview:null,imageFile:null}))}
                    style={{marginTop:4,fontSize:11,color:"#B23A30",
                      background:"none",border:"none",cursor:"pointer",
                      fontWeight:600}}>
                    Remove photo
                  </button>
                )}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#6F655E",
                    textTransform:"uppercase",letterSpacing:0.4,marginBottom:4}}>
                    Emoji
                  </div>
                  <input value={menuForm.emoji}
                    onChange={e=>setMenuForm(f=>({...f,emoji:e.target.value}))}
                    style={{width:"100%",padding:"10px",background:"#F4F1EE",
                      border:"1px solid #E9DDD0",borderRadius:8,fontSize:20,
                      boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#6F655E",
                    textTransform:"uppercase",letterSpacing:0.4,marginBottom:4}}>
                    Category
                  </div>
                  <select value={menuForm.category}
                    onChange={e=>setMenuForm(f=>({...f,category:e.target.value}))}
                    style={{width:"100%",padding:"10px",background:"#F4F1EE",
                      border:"1px solid #E9DDD0",borderRadius:8,fontSize:13,
                      boxSizing:"border-box",fontFamily:"inherit",color:"#1F1A17"}}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <Input label="Dish name" value={menuForm.name}
                onChange={v=>setMenuForm(f=>({...f,name:v}))}
                placeholder="e.g. Jollof Rice + Chicken"/>
              <Input label="Description" value={menuForm.description}
                onChange={v=>setMenuForm(f=>({...f,description:v}))}
                placeholder="Short description"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Input label="Price (£)" value={menuForm.price}
                  onChange={v=>setMenuForm(f=>({...f,price:v}))}
                  placeholder="12.50" type="number"/>
                <Input label="Portion" value={menuForm.portion}
                  onChange={v=>setMenuForm(f=>({...f,portion:v}))}
                  placeholder="e.g. 450g"/>
              </div>

              {/* Toggles */}
              <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                {[
                  ["available","Available","#2E7D32"],
                  ["is_vegan","Vegan","#5C3D9A"],
                  ["chef_pick","Chef's Pick","#C96A1B"],
                ].map(([key,label,color])=>(
                  <button key={key}
                    onClick={()=>setMenuForm(f=>({...f,[key]:!f[key]}))}
                    style={{display:"flex",alignItems:"center",gap:6,
                      padding:"7px 12px",borderRadius:20,
                      border:`1.5px solid ${menuForm[key]?color:"#E9DDD0"}`,
                      background:menuForm[key]?`${color}15`:"transparent",
                      cursor:"pointer",fontSize:13,fontWeight:700,
                      color:menuForm[key]?color:"#A0968E",fontFamily:"inherit"}}>
                    <div style={{width:12,height:12,borderRadius:"50%",
                      background:menuForm[key]?color:"#E9DDD0"}}/>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{display:"flex",gap:8}}>
                <Btn full onClick={saveMenuItem}
                  disabled={!menuForm.name||!menuForm.price}>
                  {editingItem?"Save changes":"Add to menu"}
                </Btn>
                {editingItem&&(
                  <Btn v="ghost" onClick={()=>{
                    setEditingItem(null);
                    setMenuForm({name:"",description:"",price:"",
                      category:"Rice Dishes",emoji:"🍛",portion:"",
                      calories:"",available:true,is_vegan:false,
                      chef_pick:false,imagePreview:null,imageFile:null,imageUrl:""});
                  }}>Cancel</Btn>
                )}
              </div>
            </div>

            {/* Menu list */}
            {CATEGORIES.map(cat=>{
              const catItems = menuItems.filter(m=>m.category===cat);
              if(!catItems.length) return null;
              return (
                <div key={cat} style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#A0968E",
                    textTransform:"uppercase",letterSpacing:0.5,
                    marginBottom:8,padding:"0 2px"}}>
                    {cat} ({catItems.length})
                  </div>
                  {catItems.map(item=>(
                    <div key={item.id} style={{background:"#fff",
                      border:`1px solid ${item.available?"#E9DDD0":"#F0C4C0"}`,
                      borderLeft:`4px solid ${item.available?"#2E7D32":"#B23A30"}`,
                      borderRadius:10,padding:"10px 12px",marginBottom:6,
                      display:"flex",alignItems:"center",gap:10,
                      opacity:item.available?1:0.7}}>
                      <div style={{width:44,height:44,borderRadius:8,
                        background:"#F4F1EE",overflow:"hidden",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:20}}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name}
                              style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          : item.emoji}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#1F1A17",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {item.name}
                          {item.chef_pick&&
                            <span style={{fontSize:10,background:"#FFF1E2",
                              color:"#C96A1B",borderRadius:4,padding:"1px 5px",
                              marginLeft:5,fontWeight:800}}>
                              ⭐
                            </span>}
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:"#A95412"}}>
                          £{item.price.toFixed(2)}
                          <span style={{fontSize:11,color:"#A0968E",marginLeft:6,
                            fontWeight:600}}>
                            {item.available?"Available":"Sold out"}
                          </span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        <button onClick={()=>toggleAvailable(item)}
                          style={{padding:"5px 8px",borderRadius:6,fontSize:11,
                            fontWeight:700,cursor:"pointer",border:"none",
                            background:item.available?"#FCECEA":"#EAF6EC",
                            color:item.available?"#B23A30":"#2E7D32"}}>
                          {item.available?"Sold out":"Available"}
                        </button>
                        <button onClick={()=>editItem(item)}
                          style={{padding:"5px 8px",borderRadius:6,fontSize:11,
                            fontWeight:700,cursor:"pointer",border:"none",
                            background:"#FFF1E2",color:"#C96A1B"}}>
                          <Pencil size={12}/>
                        </button>
                        <button onClick={()=>deleteMenuItem(item.id)}
                          style={{padding:"5px 8px",borderRadius:6,fontSize:11,
                            fontWeight:700,cursor:"pointer",border:"none",
                            background:"#FCECEA",color:"#B23A30"}}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── RIDERS ── */}
        {section==="riders"&&(
          <div>
            <Btn full style={{marginBottom:12}}
              onClick={()=>setAddingRider(true)}>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <Plus size={14}/>Add rider
              </span>
            </Btn>

            {addingRider&&(
              <div style={{background:"#fff",border:"1px solid #C96A1B",
                borderRadius:14,padding:14,marginBottom:12}}>
                <Input label="Full name" value={riderForm.name}
                  onChange={v=>setRiderForm(f=>({...f,name:v}))}
                  placeholder="Rider's full name"/>
                <Input label="Phone / WhatsApp" value={riderForm.phone}
                  onChange={v=>setRiderForm(f=>({...f,phone:v}))}
                  placeholder="+44 7xxx xxxxxx"/>
                <div style={{display:"flex",gap:8}}>
                  <Btn full onClick={saveRider}
                    disabled={!riderForm.name||!riderForm.phone}>
                    Add rider
                  </Btn>
                  <Btn v="ghost" onClick={()=>{
                    setAddingRider(false);setRiderForm({name:"",phone:""});}}>
                    Cancel
                  </Btn>
                </div>
              </div>
            )}

            {riders.length===0&&!addingRider&&(
              <div style={{textAlign:"center",padding:"32px 20px"}}>
                <Bike size={48} color="#A0968E" style={{marginBottom:8}}/>
                <div style={{fontSize:16,fontWeight:700,color:"#1F1A17"}}>
                  No riders yet
                </div>
              </div>
            )}

            {riders.map(rider=>(
              <div key={rider.id} style={{background:"#fff",
                border:"1px solid #E9DDD0",borderRadius:12,
                padding:"12px 14px",marginBottom:8,
                display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,
                  background:"#FFF1E2",display:"flex",alignItems:"center",
                  justifyContent:"center",flexShrink:0}}>
                  <Bike size={20} color="#C96A1B"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#1F1A17"}}>
                    {rider.name}
                  </div>
                  <div style={{fontSize:13,color:"#6F655E"}}>+{rider.phone}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>openWA(rider.phone,
                    `Hi ${rider.name}, AfroCrave Kitchen: are you available for deliveries?`)}
                    style={{background:"#25D366",border:"none",borderRadius:8,
                      width:34,height:34,cursor:"pointer",display:"flex",
                      alignItems:"center",justifyContent:"center"}}>
                    <MessageCircle size={14} color="#fff"/>
                  </button>
                  <button onClick={async()=>{
                    if(!window.confirm(`Remove ${rider.name}?`)) return;
                    await supabase.from("riders").delete().eq("id",rider.id);
                    showToast("Rider removed"); await loadAll();
                  }}
                    style={{background:"#FCECEA",border:"none",borderRadius:8,
                      width:34,height:34,cursor:"pointer",display:"flex",
                      alignItems:"center",justifyContent:"center"}}>
                    <Trash2 size={14} color="#B23A30"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {section==="settings"&&(
          <div>
            <div style={{background:"#fff",border:"1px solid #E9DDD0",
              borderRadius:14,padding:14,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:800,color:"#1F1A17",marginBottom:12}}>
                Kitchen information
              </div>
              <Input label="Kitchen name" value={settings.kitchenName}
                onChange={v=>setSettings(s=>({...s,kitchenName:v}))}/>
              <Input label="WhatsApp / Phone" value={settings.phone}
                onChange={v=>setSettings(s=>({...s,phone:v}))}/>
              <Input label="Address" value={settings.address}
                onChange={v=>setSettings(s=>({...s,address:v}))}/>
              <Input label="Minimum order (£)" value={settings.minOrder}
                onChange={v=>setSettings(s=>({...s,minOrder:v}))}
                type="number"/>
              <Input label="Delivery time" value={settings.deliveryTime}
                onChange={v=>setSettings(s=>({...s,deliveryTime:v}))}/>
              <button onClick={async()=>{
                setLoading(true);
                const {error}=await supabase.from("kitchen_settings").upsert({
                  id:1, kitchen_name:settings.kitchenName,
                  phone:settings.phone, address:settings.address,
                  min_order:parseFloat(settings.minOrder)||0,
                  delivery_time:settings.deliveryTime,
                  updated_at:new Date().toISOString(),
                });
                setLoading(false);
                if(!error) showToast("✅ Settings saved");
                else showToast("⚠️ Could not save");
              }}
                style={{width:"100%",background:"#C96A1B",border:"none",
                  borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,
                  color:"#fff",cursor:"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Check size={14}/>Save settings
              </button>
            </div>

            {/* Platform info */}
            <div style={{background:"#fff",border:"1px solid #E9DDD0",
              borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,color:"#A0968E",
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
                Platform
              </div>
              {[
                ["Platform","Choma"],
                ["Company","AfroCrave Kitchen Ltd"],
                ["Co. No.","17119134"],
                ["Role",role==="super"?"Super Admin":"Kitchen Admin"],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:"1px solid #F0E8DC",fontSize:13}}>
                  <span style={{color:"#6F655E"}}>{l}</span>
                  <span style={{fontWeight:700,color:"#1F1A17"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function PrivacyPolicy({ onBack }) {
  return (
    <div style={{minHeight:"100vh",background:B.bg,
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{background:"#5A3418",padding:"14px 20px",
        display:"flex",alignItems:"center",gap:12,
        position:"sticky",top:0,zIndex:100}}>
        <button onClick={onBack}
          style={{background:"rgba(255,255,255,0.1)",border:"none",
            borderRadius:8,width:36,height:36,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <ChevronLeft size={20} color="#fff"/>
        </button>
        <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Privacy Policy</div>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"28px 20px 60px"}}>
        {/* Company header */}
        <div style={{marginBottom:28,paddingBottom:20,
          borderBottom:"1px solid #E9DDD0"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#1F1A17",
            marginBottom:6}}>Privacy Policy</div>
          <div style={{fontSize:16,color:"#6F655E",lineHeight:1.7}}>
            <strong>AfroCrave Kitchen Ltd</strong><br/>
            Company No. 17119134<br/>
            Registered in England & Wales<br/>
            Last updated: 26 March 2026
          </div>
        </div>

        {[
          {
            title:"1. Who we are",
            body:`AfroCrave Kitchen Ltd ("we", "us", "our") is a private limited company registered in England and Wales (Company No. 17119134). We operate a home kitchen food ordering service at afrocravekitchen.choma.app. We are the data controller for personal information collected through this service. Contact us at: +44 7823 644323`
          },
          {
            title:"2. What data we collect",
            body:`When you place an order we collect: your full name, email address, delivery address and postcode, phone number (optional), your order details and payment status, and your delivery notes. We do not store your card details — payments are processed securely by Stripe.`
          },
          {
            title:"3. Why we collect it",
            body:`We collect your data solely to fulfil your food order. Specifically: to prepare and deliver your order, to send you an order confirmation, to contact you about your delivery (if you provide a phone number), and to comply with legal obligations. We do not use your data for marketing without your explicit consent.`
          },
          {
            title:"4. Legal basis (UK GDPR)",
            body:`We process your data under Article 6(1)(b) of UK GDPR — processing necessary for the performance of a contract. By placing an order you enter into a contract with AfroCrave Kitchen Ltd for the supply of food.`
          },
          {
            title:"5. How long we keep your data",
            body:`We retain order records for 7 years as required by UK tax law (HMRC). After this period your data is securely deleted. You may request earlier deletion subject to our legal obligations.`
          },
          {
            title:"6. Who we share your data with",
            body:`We share your data only where necessary: with Stripe to process your payment, with our delivery riders to fulfil your order (name, address, phone number only), and with Supabase (our database provider) who process data on our behalf under a data processing agreement. We never sell your data to third parties.`
          },
          {
            title:"7. Your rights",
            body:`Under UK GDPR you have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to processing, and data portability. To exercise any of these rights contact us via WhatsApp at +44 7823 644323 or by post at our registered address. We will respond within 30 days.`
          },
          {
            title:"8. Cookies",
            body:`Our ordering app does not use tracking cookies. We use only essential technical storage required for the app to function (such as your cart contents during an active session).`
          },
          {
            title:"9. Security",
            body:`We take reasonable technical and organisational measures to protect your data. All data is transmitted over HTTPS. Payment data is handled entirely by Stripe and never touches our servers. Our database is hosted on Supabase with row-level security enabled.`
          },
          {
            title:"10. Complaints",
            body:`If you have a concern about how we handle your data you may contact the Information Commissioner's Office (ICO) at ico.org.uk or by calling 0303 123 1113.`
          },
        ].map(section=>(
          <div key={section.title} style={{marginBottom:24}}>
            <div style={{fontSize:16,fontWeight:700,color:"#1F1A17",
              marginBottom:8}}>{section.title}</div>
            <div style={{fontSize:15,color:"#6F655E",lineHeight:1.8}}>
              {section.body}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{marginTop:32,padding:"16px 20px",
          background:"#5A3418",borderRadius:16,
          textAlign:"center"}}>
          <div style={{fontSize:16,color:"rgba(255,255,255,0.7)",
            lineHeight:1.8}}>
            AfroCrave Kitchen Ltd · Co. No. 17119134<br/>
            Registered in England & Wales<br/>
            <span style={{color:"#F5C842",fontWeight:600}}>
              +44 7823 644323
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

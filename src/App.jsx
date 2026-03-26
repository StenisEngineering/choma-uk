import { useState, useEffect, useRef } from "react";
import React from "react";
import { supabase } from "./supabase";
import {
  ShoppingCart, ChefHat, Bike, MapPin, Lock,
  Home, Package, Wallet, Star, Settings,
  Plus, Pencil, Trash2, Check, X, Eye, EyeOff,
  Phone, MessageCircle, Clock, MapPinned,
  ChevronRight, ChevronLeft, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, LogOut,
  Users, UtensilsCrossed, ClipboardList,
  TrendingUp, Bell, Search, Filter, ToggleLeft,
  ToggleRight, BadgeCheck, Leaf, Flame,
} from "lucide-react";

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
  return <div style={{marginBottom:16}}>
    {label&&<div style={{fontSize:"clamp(14px,3.5vw,16px)",fontWeight:700,
      color:B.textMid,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>
      {label}</div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{width:"100%",padding:"14px 16px",background:B.surface,
        border:`1.5px solid ${B.border}`,borderRadius:12,color:B.text,
        fontSize:"clamp(17px,4.2vw,19px)",outline:"none",boxSizing:"border-box",
        fontFamily:"inherit"}}
      onFocus={e=>e.target.style.borderColor=B.primary}
      onBlur={e=>e.target.style.borderColor=B.border}/>
    {hint&&<div style={{fontSize:14,color:B.textMid,marginTop:5,lineHeight:1.5}}>{hint}</div>}
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
    <div style={{minHeight:"100vh",background:"#F5E6D0",overflowY:"auto"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg, ${B.primary} 0%, ${B.gold} 100%)`,
        padding:"40px 24px 32px",textAlign:"center",color:"#fff"}}>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.2)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,
          margin:"0 auto 16px",border:"3px solid rgba(255,255,255,0.5)"}}><CheckCircle size={36} color={B.green}/></div>
        <div style={{fontSize:28,fontWeight:800,marginBottom:6,letterSpacing:-0.5}}>
          Order confirmed!
        </div>
        <div style={{fontSize:16,opacity:0.9,lineHeight:1.6}}>
          Thank you {o.customer.split(" ")[0]}!<br/>
          AfroCrave Kitchen is preparing your food.
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,
          background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"8px 16px"}}>
          <span style={{fontSize:16,fontWeight:700}}>💳 Payment confirmed · {o.paymentMethod}</span>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px 40px"}}>
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
          <Btn full v="ghost" onClick={onDone}>Order again</Btn>
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
      background:"linear-gradient(160deg, #2A1208 0%, #5C2A08 55%, #8A4510 100%)",
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
  kitchen: "|tislife2026|",
  rider:   "|funtoride26|",
  manager: "|favour2026|",
  admin:   "|willsucc££d2026",
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
      background:"linear-gradient(170deg,#3D1A06 0%,#5C2A0A 40%,#6B3210 70%,#7A3A14 100%)",
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
      background:"linear-gradient(170deg,#3D1A06 0%,#5C2A0A 40%,#6B3210 70%,#7A3A14 100%)",
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
              background:password?"linear-gradient(135deg,#E05A0A,#C8960A)":"rgba(255,255,255,0.1)",
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
    <div style={{minHeight:"100vh",background:"#FFFBF5",display:"flex",
      flexDirection:"column",fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif",
      width:"100%"}}>
      {/* Staff nav bar */}
      <div style={{background:"#2A1208",padding:"10px 16px",
        flexShrink:0,position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
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
                  borderRadius:9,background:"#C8960A",color:"#fff",fontSize:16,
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
    <div style={{minHeight:"100vh",background:"#F5E6D0",
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#fff",padding:"10px 16px",
        borderBottom:"1px solid #EDE8E0",display:"flex",
        alignItems:"center",gap:10}}>
        <button onClick={()=>setPage("landing")}
          style={{background:"none",border:"none",cursor:"pointer",
            fontSize:22,color:"#D4580A",padding:"0 4px",lineHeight:1}}>‹</button>
        <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave"
          style={{width:32,height:32,borderRadius:8,objectFit:"cover"}}/>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#1A1208"}}>AfroCrave Kitchen</div>
          <div style={{fontSize:16,color:"#D4580A",fontWeight:600}}>AUTHENTIC NIGERIAN CUISINE</div>
        </div>
        <button onClick={()=>setPage("tracking")}
          style={{marginLeft:"auto",background:"none",border:"0.5px solid #EDE8E0",
            borderRadius:8,padding:"5px 10px",fontSize:16,color:"#6B5D4A",
            cursor:"pointer",fontWeight:600}}>Track order</button>
      </div>
      <CustomerPage onOrderPlaced={()=>setCookBadge(b=>b+1)}/>
    </div>
  );

  // Customer tracking flow
  if(page==="tracking") return (
    <div style={{minHeight:"100vh",background:"#F5E6D0",
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#fff",padding:"10px 16px",
        borderBottom:"1px solid #EDE8E0",display:"flex",
        alignItems:"center",gap:10}}>
        <button onClick={()=>setPage("landing")}
          style={{background:"none",border:"none",cursor:"pointer",
            fontSize:22,color:"#D4580A",padding:"0 4px",lineHeight:1}}>‹</button>
        <div style={{fontSize:16,fontWeight:700,color:"#1A1208"}}>Track your order</div>
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
      background:"linear-gradient(170deg,#3D1A06 0%,#5C2A0A 40%,#6B3210 70%,#7A3A14 100%)",
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
          background:"linear-gradient(135deg,#E05A0A,#C8960A)",
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
  const [showPrivacy,   setShowPrivacy]   = useState(false);

  useEffect(()=>{
    supabase.from("menu_items")
      .select("id,name,description,price,category,emoji,portion,calories,allergens,is_halal,is_vegan,available,image_url")
      .eq("available",true)
      .order("category")
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
    hasPhone:      !!info.phone,
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

  // ── Privacy Policy ──
  if(showPrivacy) return (
    <PrivacyPolicy onBack={()=>setShowPrivacy(false)}/>
  );

  // ── Payment ──
  if(step==="payment") return (
    <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 60px"}}>
        <button onClick={()=>{setStep("checkout");setPayStep("form");setPayError("");}}
          style={{background:B.card,border:`1px solid ${B.border}`,borderRadius:10,
            padding:"10px 16px",color:B.textMid,fontSize:16,cursor:"pointer",
            marginBottom:24,display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
          ‹ Back
        </button>

        <div style={{fontSize:24,fontWeight:800,color:B.text,marginBottom:4,letterSpacing:-0.5}}>
          Secure payment
        </div>
        <div style={{fontSize:15,color:B.textMid,marginBottom:24}}>
          Powered by Stripe · 256-bit SSL encryption
        </div>

        <div style={{background:`linear-gradient(135deg,${B.primaryLight},${B.goldLight})`,
          border:`1px solid ${B.primary}25`,borderRadius:16,
          padding:"16px 20px",marginBottom:24,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:14,color:B.textMid,fontWeight:600}}>Total to pay</span>
          <span style={{fontSize:22,fontWeight:800,color:B.primary}}>{fmt(total)}</span>
        </div>

        {payError&&(
          <div style={{padding:"14px 16px",background:B.redSoft,border:`1px solid ${B.red}30`,
            borderRadius:12,marginBottom:16,fontSize:16,color:B.red,fontWeight:600}}>
            ⚠️ {payError}
          </div>
        )}

        {payStep==="form"&&(
          <>
            <Card style={{marginBottom:16,background:B.surface}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <span style={{fontSize:24}}>🔒</span>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:B.text}}>Secure card payment</div>
                  <div style={{fontSize:15,color:B.textMid}}>
                    You'll be redirected to Stripe's secure checkout
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {["💳 Visa","💳 Mastercard","💳 Amex"].map(c=>(
                  <span key={c} style={{fontSize:16,color:B.textMid,background:B.card,
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
              <div style={{fontSize:15,color:B.textMid,marginBottom:12}}>— or —</div>
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
            <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:8}}>
              Connecting to Stripe…
            </div>
            <div style={{fontSize:15,color:B.textMid}}>
              Please wait, do not close this page
            </div>
          </div>
        )}

        {payStep==="bank"&&(
          <div>
            <Card style={{marginBottom:14,background:B.greenSoft,borderColor:`${B.green}30`}}>
              <div style={{fontSize:16,fontWeight:700,color:B.green,marginBottom:12}}>
                Bank transfer details
              </div>
              {[["Account name","AfroCrave Kitchen Ltd"],["Sort code","XX-XX-XX"],
                ["Account number","XXXXXXXX"],["Reference","Your order ID"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:`1px solid ${B.green}20`,fontSize:14}}>
                  <span style={{color:B.textMid}}>{l}</span>
                  <span style={{fontWeight:700,color:B.text}}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{fontSize:15,color:B.textMid,lineHeight:1.7,marginBottom:20,
              padding:"14px 16px",background:B.surface,borderRadius:12}}>
              💬 Please send payment and WhatsApp us to confirm.
              Your order will be prepared once payment is verified.
            </div>
            <Btn full v="wa" onClick={()=>openWA(B.kitchenWA,
              `Hi AfroCrave Kitchen! I've just placed an order and will be paying by bank transfer. Please confirm bank details. Thank you!`)}>
              Confirm via WhatsApp
            </Btn>
          </div>
        )}
      </div>
    </div>
  );

  // ── Checkout ──
  if(step==="checkout") return (
    <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
      <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 60px"}}>
        <button onClick={()=>setStep("menu")} style={{background:B.card,
          border:`1px solid ${B.border}`,borderRadius:10,padding:"10px 16px",
          color:B.textMid,fontSize:16,cursor:"pointer",marginBottom:24,
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
                  <div style={{fontSize:16,fontWeight:600,color:B.text}}>{m.name}</div>
                  <div style={{fontSize:15,color:B.textMid}}>{fmt(m.price)} each</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>rem(m.id)} style={{width:32,height:32,borderRadius:10,
                  background:B.surface,border:`1px solid ${B.border}`,cursor:"pointer",fontSize:16,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontSize:16,fontWeight:700,color:B.primary,minWidth:20,
                  textAlign:"center"}}>{qty}</span>
                <button onClick={()=>add(m.id)} style={{width:32,height:32,borderRadius:10,
                  background:B.primary,border:"none",color:"#fff",cursor:"pointer",fontSize:16,
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
            {subtotal>0&&subtotal<15&&(
              <div style={{marginTop:10,padding:"10px 12px",
                background:"#FDECEA",border:"1px solid rgba(200,50,30,0.15)",
                borderRadius:10,fontSize:16,color:"#C0392B",fontWeight:600,
                textAlign:"center"}}>
                Minimum order £15 · Add {fmt(15-subtotal)} more to continue
              </div>
            )}
          </div>
        </Card>

        {/* Customer details */}
        <Section title="Your details">
          <Input label="Full name" value={info.name}
            onChange={v=>setInfo(i=>({...i,name:v}))} placeholder="Your full name"/>
          <Input label="Phone / WhatsApp (optional)" value={info.phone}
            onChange={v=>setInfo(i=>({...i,phone:v.replace(/[^0-9+]/g,"")}))}
            placeholder="+44 7xxx xxxxxx" type="tel"
            hint="Add your number to receive live WhatsApp updates on your order"/>
          <Input label="Email address" value={info.email}
            onChange={v=>setInfo(i=>({...i,email:v}))} placeholder="your@email.com"
            type="email" hint="Required — your order confirmation will be sent here"/>
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
              borderRadius:12,marginTop:-8,marginBottom:16,fontSize:16,color:B.red,fontWeight:600}}>
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
          <div style={{fontSize:15,color:B.textMid,lineHeight:1.8}}>
            📍 <strong style={{color:B.text}}>Sunderland (all SR postcodes)</strong> — flat £5.00<br/>
            🗺 <strong style={{color:B.text}}>Outside Sunderland</strong> — £5.00 + £0.75/mile<br/>
            📦 <strong style={{color:B.text}}>Newcastle, Durham, Seaham</strong> and more
          </div>
        </Card>

        {/* GDPR */}
        {!info.phone && (
          <div style={{padding:"10px 14px",background:B.blueSoft,
            border:`1px solid ${B.blue}20`,borderRadius:10,marginBottom:12,
            fontSize:14,color:B.blue,lineHeight:1.6}}>
            ℹ️ No phone number? No problem — you can track your order using your order number after payment.
          </div>
        )}
        <div style={{background:B.surface,border:`1px solid ${B.border}`,
          borderRadius:14,padding:"16px",marginBottom:24}}>
          <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
            <input type="checkbox" checked={gdpr} onChange={e=>setGdpr(e.target.checked)}
              style={{marginTop:3,flexShrink:0,width:18,height:18}}/>
            <div style={{fontSize:15,color:B.textMid,lineHeight:1.7}}>
              I agree to AfroCrave Kitchen Ltd's{" "}
              <span style={{color:B.primary,textDecoration:"underline",cursor:"pointer"}}
                onClick={()=>setShowPrivacy(true)}>
                Privacy Policy
              </span>
              {" "}and consent to my data being processed to fulfil this order.
              <span style={{display:"block",marginTop:4,fontSize:14,color:B.textDim}}>
                UK GDPR compliant · You can request deletion at any time
              </span>
            </div>
          </label>
        </div>

        <Btn full style={{fontSize:16,padding:"16px"}}
          onClick={()=>setStep("payment")}
          disabled={!info.name||!info.postcode||!delivery?.available||!gdpr||subtotal<15}>
          Continue to payment →
        </Btn>
        {!gdpr&&info.name&&(
          <div style={{textAlign:"center",fontSize:16,color:B.textMid,marginTop:10}}>
            Please accept the privacy policy to continue
          </div>
        )}
      </div>
    </div>
  );

  // ── Main menu ──
  return (
    <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg, #2A1208 0%, #5C2A08 50%, #8A4510 100%)`,
        padding:"24px 16px 22px",color:"#fff",position:"relative",overflow:"hidden",
        textAlign:"center",width:"100%",boxSizing:"border-box"}}>
        {/* decorative circles */}
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,
          borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
        <div style={{position:"absolute",bottom:-60,left:-30,width:160,height:160,
          borderRadius:"50%",background:"rgba(212,88,10,0.15)"}}/>
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",
          alignItems:"center"}}>
          <img src="/Logo_AfrocraveKitchen.webp" alt="AfroCrave Kitchen"
            style={{width:80,height:80,borderRadius:16,objectFit:"cover",
              marginBottom:12,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}/>
          <div style={{fontSize:16,color:"rgba(255,200,100,0.85)",fontWeight:700,
            letterSpacing:2.5,textTransform:"uppercase",marginBottom:8}}>
            ✦ Home Kitchen · Sunderland ✦
          </div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-0.5,marginBottom:8,
            lineHeight:1.15,textShadow:"0 2px 20px rgba(0,0,0,0.4)"}}>
            Authentic Nigerian<br/>
            <span style={{color:"#F5C842"}}>Home Cooking</span>
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",lineHeight:1.8,
            marginBottom:14,maxWidth:320,fontWeight:400}}>
            Made fresh to order, delivered hot to your door across Sunderland & the Northeast.
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {["⏱ 45–75 min","🍲 Home Cooked. Naija Standard","💳 Card / Bank","📍 Sunderland & NE"].map((tx)=>(
              <div key={tx} style={{
                background:"rgba(245,200,66,0.15)",
                border:"1px solid rgba(245,200,66,0.3)",
                borderRadius:20,padding:"7px 14px",fontSize:16,fontWeight:700,
                color:"rgba(255,255,255,0.95)",letterSpacing:0.3}}>
                {tx}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allergen notice */}
      {/* Kitchen status from Supabase would go here - for now managed in cook dashboard */}
      <div style={{margin:"0",padding:"12px 16px",background:B.goldLight,
        border:`1px solid ${B.gold}30`,borderRadius:12,
        fontSize:16,color:B.gold,lineHeight:1.6,fontWeight:500}}>
        ⚠️ <strong>Allergen info:</strong> Tap any item to see allergen details.
        Severe allergy? Please WhatsApp us before ordering.
      </div>

      {/* Category filters */}
      <div style={{padding:"12px 12px 8px",display:"flex",gap:8,overflowX:"auto",
        WebkitOverflowScrolling:"touch",background:"#FFF8F0"}}>
        {["All",...cats].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"8px 18px",borderRadius:20,
            fontSize:16,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${filter===f?B.primary:B.border}`,
            background:filter===f?B.primaryLight:"transparent",
            color:filter===f?B.primary:B.textMid}}>
            {f}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{padding:"8px 12px 20px"}}>
        {shown.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:B.textMid}}>
            <div style={{fontSize:40,marginBottom:12}}>🍳</div>
            <div style={{fontSize:16,fontWeight:600}}>Menu loading…</div>
          </div>
        )}
        {/* Group menu items by category */}
        {[...new Set(shown.map(m=>m.category))].map(cat=>(
          <div key={cat}>
            {/* Category header */}
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"14px 4px 8px"}}>
              <div style={{flex:1,height:"1px",background:B.border}}/>
              <div style={{fontSize:11,fontWeight:800,color:B.primary,
                textTransform:"uppercase",letterSpacing:2,
                padding:"4px 14px",background:B.primaryLight,
                borderRadius:20,border:`1px solid ${B.primary}20`,
                whiteSpace:"nowrap"}}>
                {cat}
              </div>
              <div style={{flex:1,height:"1px",background:B.border}}/>
            </div>
            {/* Items grid */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))",
              gap:"0",
            }}>
            {shown.filter(m=>m.category===cat).map((m,idx)=>(
              <div key={m.id} style={{
                background: idx%2===0 ? "#FFFBF5" : "#FFF3E8",
                borderBottom:`1px solid ${B.border}`,
                padding:"16px",
                transition:"background 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",gap:12}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,flex:1}}>
                <div style={{width:62,height:62,borderRadius:16,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:32,flexShrink:0,overflow:"hidden"}}>
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name}
                        loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : m.emoji
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:700,color:B.text,lineHeight:1.3,
                    marginBottom:4}}>{m.name}</div>
                  <div style={{fontSize:15,color:B.textMid,lineHeight:1.6,
                    marginBottom:8}}>{m.description}</div>
                  <div style={{display:"flex",gap:10,alignItems:"center",
                    flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontSize:17,fontWeight:800,color:B.primary}}>
                      {fmt(m.price)}
                    </span>
                    {m.portion&&<span style={{fontSize:14,color:B.textDim}}>{m.portion}</span>}
                    {m.calories&&<span style={{fontSize:14,color:B.textDim}}>{m.calories} kcal</span>}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    {m.is_halal&&(
                      <span style={{fontSize:16,background:B.goldLight,color:B.gold,
                        borderRadius:6,padding:"3px 10px",fontWeight:700,fontStyle:"italic",
                        border:`1px solid ${B.gold}30`,letterSpacing:0.2}}>
                        🍲 Home Cooked. Naija Standard
                      </span>
                    )}
                    {m.is_vegan&&(
                      <span style={{fontSize:16,background:B.purpleSoft,color:B.purple,
                        borderRadius:6,padding:"2px 8px",fontWeight:700}}>🌱 Vegan</span>
                    )}
                    <button onClick={()=>setShowAllergens(showAllergens===m.id?null:m.id)}
                      style={{fontSize:16,padding:"2px 8px",borderRadius:6,cursor:"pointer",
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
            </div>
          </div>
        ))}
        <div style={{height:120}}/>
      </div>

      {/* Sticky cart button */}
      {count>0&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",padding:"12px 12px 20px",
          background:`linear-gradient(transparent, ${B.bg} 30%)`,pointerEvents:"none"}}>
          <button onClick={()=>setStep("checkout")}
            style={{width:"100%",padding:"16px 20px",borderRadius:18,
              background:`linear-gradient(135deg, ${B.primary}, ${B.gold})`,
              color:"#fff",border:"none",cursor:"pointer",
              fontWeight:800,fontSize:16,display:"flex",alignItems:"center",
              justifyContent:"space-between",pointerEvents:"all",
              boxShadow:`0 8px 32px ${B.primary}50`,letterSpacing:0.2}}>
            <span style={{background:"rgba(255,255,255,0.2)",borderRadius:10,
              padding:"4px 12px",fontSize:14}}>
              {count} item{count!==1?"s":""}
            </span>
            <span>{subtotal<15?`Add £${(15-subtotal).toFixed(2)} more`:"View order"}</span>
            <span style={{fontSize:16,fontWeight:800}}>{fmt(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// NOTIFICATION BANNER
// ════════════════════════════════════════════════════════════════
function NotificationBanner({ notifications, onDismiss }) {
  if (!notifications.length) return null;
  return (
    <div style={{position:"sticky",top:0,zIndex:200,width:"100%"}}>
      {notifications.map((n,i)=>(
        <div key={n.id} style={{
          background: n.type==="order" ? "#1A52A0"
            : n.type==="ready" ? "#C8960A"
            : n.type==="delivered" ? "#1A6B3A"
            : "#D4580A",
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
  const [tab,           setTab]           = useState("live");
  const [notifications, setNotifications] = useState([]);
  const prevOrderCount  = useRef(0);

  // Watch for new orders and show notification
  useEffect(()=>{
    const newOrders = orders.filter(o=>o.status==="New");
    if(newOrders.length > prevOrderCount.current && prevOrderCount.current >= 0){
      const latest = newOrders[0];
      if(latest){
        setNotifications(prev=>[...prev, {
          id: Date.now(),
          type: "order",
          title: `New order — ${latest.customer}`,
          message: `${latest.items.length} item${latest.items.length!==1?"s":""} · ${fmt(latest.total)} · ${latest.postcode}`,
        }].slice(-3)); // max 3 notifications
      }
    }
    prevOrderCount.current = newOrders.length;
  },[orders]);
  const [isOpen, setIsOpen] = useState(true);

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
    <div style={{height:"100%",background:B.bg,display:"flex",flexDirection:"column",
      overflow:"hidden",width:"100%"}}>
      <NotificationBanner
        notifications={notifications}
        onDismiss={id=>setNotifications(prev=>prev.filter(n=>n.id!==id))}
      />
      {/* Header */}
      <div style={{padding:"14px 16px 12px",background:B.card,
        borderBottom:`1px solid ${B.divider}`,flexShrink:0,width:"100%",
        boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:B.text}}><span style={{display:"flex",alignItems:"center",gap:8}}><ChefHat size={20} color={B.primary}/> Kitchen live</span></div>
            <div style={{fontSize:14,color:B.textMid}}>AfroCrave Kitchen · Sunderland</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,color:B.textMid,fontWeight:700,textTransform:"uppercase"}}>
              Today's revenue
            </div>
            <div style={{fontSize:20,fontWeight:800,color:B.green}}>{fmt(todayRev)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["New",B.blue,B.blueSoft],["Preparing",B.primary,B.primaryLight],
            ["On way","#9A6B00","#FFF8E6"],["Done",B.green,B.greenSoft]].map(([l,c,bg])=>(
            <div key={l} style={{flex:1,background:bg,borderRadius:12,
              padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>
                {orders.filter(o=>o.status===(
                  l==="Preparing"?"Preparing":l==="On way"?"Out for delivery":
                  l==="Done"?"Delivered":l)).length}
              </div>
              <div style={{fontSize:16,color:c,fontWeight:700,opacity:0.8}}>{l}</div>
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
              fontSize:16,fontWeight:700,
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
                  <div style={{fontSize:16,fontWeight:700,color:B.text}}>{o.customer}</div>
                  <div style={{fontSize:14,color:B.textDim}}>{o.id} · {o.postcode}</div>
                </div>
                <Pill s={o.status}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:15,color:B.textMid}}>
                  {o.items.length} item{o.items.length!==1?"s":""}
                </span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {o.paid
                    ?<span style={{fontSize:14,color:B.green,fontWeight:700}}>💳 Paid</span>
                    :<span style={{fontSize:14,color:B.gold,fontWeight:700}}>⏳ Awaiting</span>}
                  <span style={{fontSize:17,fontWeight:800,color:B.primary}}>{fmt(o.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {sel&&(
          <div style={{flex:1,overflowY:"auto",padding:"14px 14px",
            boxSizing:"border-box"}}>
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
                  ?<span style={{fontSize:14,color:B.green,fontWeight:700}}>💳 {sel.paymentMethod} — paid</span>
                  :<span style={{fontSize:14,color:B.gold,fontWeight:700}}>⏳ {sel.paymentMethod} — awaiting</span>}
              </div>
            </div>
            {NEXT[sel.status]&&(
              <Btn full onClick={()=>advance(sel)} style={{marginBottom:10,fontSize:14}}>
                Mark as {NEXT[sel.status]}
              </Btn>
            )}
            <Btn full v="wa" style={{fontSize:14}}
              onClick={()=>openWA(sel.phone,
                `Hello ${sel.customer.split(" ")[0]}, update on order ${sel.id}: ${sel.status}. AfroCrave Kitchen 🍛`)}>
              Custom message
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
  const [riderNotifs, setRiderNotifs] = useState([]);
  const prevAvailable = useRef(0);

  useEffect(()=>{
    if(available.length > prevAvailable.current && prevAvailable.current >= 0){
      setRiderNotifs(prev=>[...prev,{
        id:Date.now(),
        type:"ready",
        title:"New delivery available!",
        message:`${available[0]?.customer} · ${available[0]?.postcode} · £4.50 earning`,
      }].slice(-3));
    }
    prevAvailable.current = available.length;
  },[available]);

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
    <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
      <div style={{padding:"16px 20px 12px",background:B.card,
        borderBottom:`1px solid ${B.border}`,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setScreen("home")} style={{background:B.surface,
          border:`1px solid ${B.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",
          fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <div style={{fontSize:16,fontWeight:800,color:B.text}}>My earnings</div>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card style={{background:B.greenSoft,borderColor:"transparent",textAlign:"center",padding:"20px 12px"}}>
            <div style={{fontSize:14,color:B.green,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Today</div>
            <div style={{fontSize:30,fontWeight:800,color:B.green}}>{fmt(earnings)}</div>
          </Card>
          <Card style={{background:B.blueSoft,borderColor:"transparent",textAlign:"center",padding:"20px 12px"}}>
            <div style={{fontSize:14,color:B.blue,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Runs</div>
            <div style={{fontSize:30,fontWeight:800,color:B.blue}}>{completed.length}</div>
          </Card>
        </div>
        <Card style={{marginBottom:20,background:B.goldLight,borderColor:"transparent"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,color:B.gold,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Rate per delivery</div>
              <div style={{fontSize:26,fontWeight:800,color:B.gold}}>£4.50</div>
            </div>
            <div style={{fontSize:40}}><Bike size={22} color="#fff"/></div>
          </div>
        </Card>
        {completed.map(o=>(
          <Card key={o.id} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:B.text}}>{o.customer}</div>
                <div style={{fontSize:15,color:B.textMid}}>📮 {o.postcode}</div>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:B.green}}>+£4.50</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  if(screen==="detail"&&activeOrder) {
    const live = orders.find(o=>o.id===activeOrder.id)||activeOrder;
    return (
      <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
        <div style={{padding:"16px 20px 12px",background:B.card,
          borderBottom:`1px solid ${B.border}`,display:"flex",
          justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setScreen("home")} style={{background:B.surface,
              border:`1px solid ${B.border}`,borderRadius:10,width:36,height:36,
              cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",
              justifyContent:"center"}}>‹</button>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:B.text}}>{live.id}</div>
              <div style={{fontSize:15,color:B.textMid}}>{live.customer}</div>
            </div>
          </div>
          <Pill s={live.status}/>
        </div>
        <div style={{padding:"20px"}}>
          {/* Address — prominent */}
          <div style={{background:`linear-gradient(135deg,#2A1208,#5C2A08)`,
            borderRadius:18,padding:"20px",marginBottom:16,textAlign:"center",color:"#fff"}}>
            <div style={{fontSize:16,color:"rgba(255,255,255,0.6)",fontWeight:700,
              textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Deliver to</div>
            <div style={{fontSize:16,fontWeight:800,lineHeight:1.4}}>📍 {live.address}</div>
            <div style={{fontSize:16,color:"rgba(255,255,255,0.7)",marginTop:6}}>
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
            <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:10}}>Customer</div>
            <div style={{fontSize:16,fontWeight:700,color:B.text}}>{live.customer}</div>
            <div style={{fontSize:15,color:B.textMid,marginTop:4}}>+{live.phone}</div>
            {live.note&&<div style={{fontSize:16,color:B.primary,marginTop:8,fontStyle:"italic"}}>💬 "{live.note}"</div>}
          </Card>

          <Card style={{marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:10}}>Items</div>
            {live.items.map((it,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                borderBottom:i<live.items.length-1?`1px solid ${B.divider}`:"none"}}>
                <div style={{width:28,height:28,borderRadius:8,background:B.surface,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:17,fontWeight:800,color:B.primary,flexShrink:0}}>{it.qty}×</div>
                <span style={{fontSize:16,color:B.text}}>{it.name}</span>
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
              Message customer
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
    <div style={{background:B.bg,minHeight:"100%",display:"flex",flexDirection:"column",
      width:"100%",boxSizing:"border-box"}}>
      <NotificationBanner
        notifications={riderNotifs}
        onDismiss={id=>setRiderNotifs(prev=>prev.filter(n=>n.id!==id))}
      />
      {/* Header */}
      <div style={{padding:"14px 16px 12px",background:B.card,
        borderBottom:`1px solid ${B.border}`,flexShrink:0,width:"100%",
        boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:B.text}}>Hey {RIDER} 🛵</div>
            <div style={{fontSize:14,color:B.textMid}}>AfroCrave Kitchen · Sunderland</div>
          </div>
          <button onClick={()=>setScreen("earnings")}
            style={{background:B.greenSoft,border:`1px solid ${B.green}30`,
              borderRadius:14,padding:"10px 16px",cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:14,color:B.green,fontWeight:700,textTransform:"uppercase"}}>Today</div>
            <div style={{fontSize:16,fontWeight:800,color:B.green}}>{fmt(earnings)}</div>
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16}}>
          {[["Active",mine.length,B.primary],["Available",available.length,B.gold],["Done",completed.length,B.green]].map(([l,v,c])=>(
            <div key={l} style={{background:`${c}18`,borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:16,color:c,fontWeight:700,opacity:0.8}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",width:"100%",
        boxSizing:"border-box"}}>
        {/* Active */}
        {mine.length>0&&(
          <>
            <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:12}}>🔴 Active delivery</div>
            {mine.map(o=>(
              <div key={o.id} style={{background:`linear-gradient(135deg,${B.primaryLight},#fff)`,
                border:`2px solid ${B.primary}30`,borderRadius:18,padding:"18px",
                marginBottom:16,cursor:"pointer"}}
                onClick={()=>{setActiveOrder(o);setScreen("detail");}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:B.text}}>{o.customer}</div>
                    <div style={{fontSize:15,color:B.textMid}}>📍 {o.address}</div>
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
        <div style={{fontSize:15,fontWeight:700,color:B.text,marginBottom:12}}>
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
                <div style={{fontSize:16,fontWeight:700,color:B.text}}>{o.customer}</div>
                <div style={{fontSize:15,color:B.textMid}}>📮 {o.postcode} · {o.zone}</div>
                <div style={{fontSize:15,color:B.textMid}}>
                  {o.items.length} item{o.items.length!==1?"s":""}
                </div>
              </div>
              <div style={{background:B.goldLight,border:`1px solid ${B.gold}25`,
                borderRadius:12,padding:"8px 12px",textAlign:"center"}}>
                <div style={{fontSize:14,color:B.gold,fontWeight:700}}>Earning</div>
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
            <div style={{fontSize:16,fontWeight:700,color:B.text,marginBottom:12,marginTop:4}}>
              ✅ Completed today ({completed.length})
            </div>
            {completed.map(o=>(
              <Card key={o.id} style={{marginBottom:10,opacity:0.7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:600,color:B.text}}>{o.customer}</div>
                    <div style={{fontSize:15,color:B.textMid}}>📮 {o.postcode}</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:B.green}}>+£4.50</div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{display:"flex",background:B.card,borderTop:`1px solid ${B.border}`,
        paddingTop:6,paddingBottom:12,flexShrink:0}}>
        {[
          {icon:<Home size={22}/>, label:"Home",     sc:"home"},
          {icon:<Package size={22}/>, label:"Orders", sc:"home"},
          {icon:<Wallet size={22}/>, label:"Earnings",sc:"earnings"},
        ].map(({icon,label,sc})=>(
          <button key={label} onClick={()=>setScreen(sc)}
            style={{flex:1,background:"none",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"6px 0",color:screen===sc?B.primary:B.textDim,transition:"color 0.15s"}}>
            {icon}
            <span style={{fontSize:16,fontWeight:screen===sc?700:500}}>{label}</span>
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
    <div style={{background:"linear-gradient(180deg,#FFF4E8 0%,#FFF8F0 30%,#FFF4E8 100%)",minHeight:"100%",overflowY:"auto"}}>
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
const ADMIN_PASS  = "|willsucc££d2026";
const KITCHEN_PASS = "|tislife2026|";

function AdminPanel() {
  const [authed,    setAuthed]    = useState(false);
  const [role,      setRole]      = useState(null); // "super" | "kitchen"
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");
  const [section,   setSection]   = useState("menu"); // menu | riders | orders | settings
  const [menuItems, setMenuItems] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [riders,    setRiders]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState("");

  // Menu form state
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm,    setMenuForm]    = useState({
    name:"", description:"", price:"", category:"Rice Dishes",
    emoji:"🍛", portion:"", calories:"", available:true, is_halal:true, is_vegan:false,
    imagePreview:null, imageFile:null, imageUrl:"",
  });

  // Rider form state
  const [riderForm, setRiderForm] = useState({ name:"", phone:"" });
  const [addingRider, setAddingRider] = useState(false);

  // Settings form
  const [settings, setSettings] = useState({
    kitchenName:"AfroCrave Kitchen",
    phone:"+44 7823 644323",
    address:"Sunderland, UK",
    minOrder:"0",
    deliveryTime:"45–75 min",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const login = () => {
    if (password === ADMIN_PASS) {
      setAuthed(true); setRole("super"); setError("");
      loadAll();
    } else if (password === KITCHEN_PASS) {
      setAuthed(true); setRole("kitchen"); setError("");
      loadAll();
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const [menuRes, ordersRes, ridersRes] = await Promise.all([
      supabase.from("menu_items").select("*").order("category"),
      supabase.from("orders").select("*").order("created_at", {ascending:false}).limit(50),
      supabase.from("riders").select("*").order("name"),
    ]);
    if (menuRes.data)   setMenuItems(menuRes.data);
    if (ordersRes.data) setOrders(ordersRes.data.map(o=>({
      ...o,
      items: typeof o.items==="string" ? JSON.parse(o.items) : (o.items||[]),
    })));
    if (ridersRes.data) setRiders(ridersRes.data);
    setLoading(false);
  };

  // ── Login screen ──
  if (!authed) return (
    <div style={{minHeight:"100%",background:B.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:56,marginBottom:12,display:"flex",justifyContent:"center"}}><Lock size={56} color={B.primary}/></div>
          <div style={{fontSize:24,fontWeight:800,color:B.text,marginBottom:6}}>
            Admin Access
          </div>
          <div style={{fontSize:15,color:B.textMid}}>
            AfroCrave Kitchen · Choma Platform
          </div>
        </div>
        <Card>
          <Input label="Password" value={password}
            onChange={v=>setPassword(v)} placeholder="Enter your password"
            type="password"/>
          {error&&(
            <div style={{fontSize:16,color:B.red,marginBottom:12,
              padding:"10px 12px",background:B.redSoft,borderRadius:10}}>
              ⚠️ {error}
            </div>
          )}
          <Btn full onClick={login} disabled={!password}>
            🔐 Sign in
          </Btn>
        </Card>
        <div style={{textAlign:"center",marginTop:16,fontSize:14,color:B.textDim}}>
          Kitchen staff use your kitchen password<br/>
          Choma admin use the platform password
        </div>
      </div>
    </div>
  );

  const SECTIONS = [
    {id:"menu",     label:"Menu",    icon:<UtensilsCrossed size={14}/>, desc:"Add, edit, remove dishes"},
    {id:"orders",   label:"Orders",  icon:<ClipboardList size={14}/>, desc:"View all orders"},
    {id:"riders",   label:"Riders",  icon:<Bike size={14}/>, desc:"Manage delivery riders"},
    {id:"settings", label:"Settings",icon:<Settings size={14}/>, desc:"Kitchen info & zones"},
  ];

  const CATEGORIES = ["Rice Dishes","Nigerian Soups","Snacks","Cakes"];

  // ── Save menu item ──
  const saveMenuItem = async () => {
    if (!menuForm.name || !menuForm.price) return;
    setLoading(true);

    // Upload image to Supabase storage if a new image was selected
    let imageUrl = menuForm.imageUrl || "";
    if (menuForm.imageFile) {
      const fileName = `menu/${Date.now()}_${menuForm.name.replace(/\s+/g,"_")}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(fileName, menuForm.imageFile, { upsert: true });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const data = {
      name:        menuForm.name,
      description: menuForm.description,
      price:       parseFloat(menuForm.price),
      category:    menuForm.category,
      emoji:       menuForm.emoji,
      portion:     menuForm.portion,
      calories:    parseInt(menuForm.calories)||0,
      available:   menuForm.available,
      is_halal:    menuForm.is_halal,
      is_vegan:    menuForm.is_vegan,
      allergens:   [],
      image_url:   imageUrl,
    };
    if (editingItem) {
      await supabase.from("menu_items").update(data).eq("id", editingItem.id);
      showToast("✅ Menu item updated");
    } else {
      await supabase.from("menu_items").insert([data]);
      showToast("✅ Menu item added");
    }
    setEditingItem(null);
    setMenuForm({name:"",description:"",price:"",category:"Rice Dishes",
      emoji:"🍛",portion:"",calories:"",available:true,is_halal:true,is_vegan:false});
    await loadAll();
    setLoading(false);
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete this menu item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    showToast("🗑️ Item deleted");
    await loadAll();
  };

  const toggleAvailable = async (item) => {
    await supabase.from("menu_items").update({available:!item.available}).eq("id",item.id);
    showToast(item.available ? "❌ Item marked sold out" : "✅ Item marked available");
    await loadAll();
  };

  const editItem = (item) => {
    setEditingItem(item);
    setMenuForm({
      name:         item.name,
      description:  item.description||"",
      price:        item.price.toString(),
      category:     item.category,
      emoji:        item.emoji||"🍛",
      portion:      item.portion||"",
      calories:     item.calories?.toString()||"",
      available:    item.available,
      is_halal:     item.is_halal,
      is_vegan:     item.is_vegan,
      imagePreview: item.image_url||null,
      imageFile:    null,
      imageUrl:     item.image_url||"",
    });
  };

  // ── Save rider ──
  const saveRider = async () => {
    if (!riderForm.name || !riderForm.phone) return;
    await supabase.from("riders").insert([{
      name:  riderForm.name,
      phone: riderForm.phone.replace(/\D/g,""),
    }]);
    showToast("✅ Rider added");
    setRiderForm({name:"",phone:""});
    setAddingRider(false);
    await loadAll();
  };

  const deleteRider = async (id) => {
    if (!window.confirm("Remove this rider?")) return;
    await supabase.from("riders").delete().eq("id",id);
    showToast("🗑️ Rider removed");
    await loadAll();
  };

  return (
    <div style={{minHeight:"100%",background:B.bg,display:"flex",flexDirection:"column"}}>

      {/* Toast notification */}
      {toast&&(
        <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",
          zIndex:9999,background:B.text,color:"#fff",padding:"12px 24px",
          borderRadius:20,fontSize:16,fontWeight:700,
          boxShadow:"0 8px 24px rgba(0,0,0,0.2)"}}>
          {toast}
        </div>
      )}

      {/* Admin header */}
      <div style={{background:`linear-gradient(135deg,#2A1208,#5C2A08)`,
        padding:"16px 16px 14px",color:"#fff",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>
              {role==="super" ? "⚡ Super Admin" : "👩‍🍳 Kitchen Admin"}
            </div>
            <div style={{fontSize:16,color:"rgba(255,255,255,0.6)",marginTop:2}}>
              AfroCrave Kitchen · Choma Platform
            </div>
          </div>
          <button onClick={()=>{setAuthed(false);setPassword("");setRole(null);}}
            style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",
              borderRadius:10,padding:"6px 14px",color:"#fff",fontSize:16,
              fontWeight:700,cursor:"pointer"}}>
            Sign out
          </button>
        </div>

        {/* Section tabs */}
        <div style={{display:"flex",gap:4,marginTop:14,overflowX:"auto"}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)}
              style={{padding:"8px 14px",borderRadius:12,fontSize:16,fontWeight:700,
                cursor:"pointer",border:"none",whiteSpace:"nowrap",
                display:"flex",alignItems:"center",gap:6,
                background:section===s.id?"rgba(255,255,255,0.2)":"transparent",
                color:section===s.id?"#fff":"rgba(255,255,255,0.6)"}}>
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading&&(
        <div style={{padding:"20px",textAlign:"center",color:B.textMid,fontSize:14}}>
          Loading…
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 40px"}}>

        {/* ── MENU SECTION ── */}
        {section==="menu"&&(
          <div>
            {/* Add/Edit form */}
            <Card style={{marginBottom:20,background:editingItem?B.goldLight:B.card,
              borderColor:editingItem?B.gold:"transparent"}}>
              <div style={{fontSize:18,fontWeight:800,color:B.text,marginBottom:14}}>
                {editingItem ? "✏️ Edit menu item" : "➕ Add new item"}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:B.textMid,marginBottom:5,
                    textTransform:"uppercase",letterSpacing:0.4}}>Food photo</div>
                  <label style={{display:"block",cursor:"pointer"}}>
                    <div style={{width:"100%",aspectRatio:"1",background:B.surface,
                      border:`1.5px dashed ${menuForm.imagePreview?B.primary:B.border}`,
                      borderRadius:12,display:"flex",flexDirection:"column",
                      alignItems:"center",justifyContent:"center",overflow:"hidden",
                      position:"relative"}}>
                      {menuForm.imagePreview ? (
                        <img src={menuForm.imagePreview} alt="Food"
                          loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      ) : (
                        <>
                          <Plus size={24} color={B.textDim}/>
                          <div style={{fontSize:14,color:B.textDim,marginTop:6,
                            textAlign:"center",padding:"0 8px"}}>
                            Tap to add photo
                          </div>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{
                        const file = e.target.files[0];
                        if(file){
                          const reader = new FileReader();
                          reader.onload = ev => setMenuForm(f=>({
                            ...f,
                            imageFile: file,
                            imagePreview: ev.target.result,
                          }));
                          reader.readAsDataURL(file);
                        }
                      }}/>
                  </label>
                  {menuForm.imagePreview&&(
                    <button onClick={()=>setMenuForm(f=>({...f,imagePreview:null,imageFile:null}))}
                      style={{marginTop:6,fontSize:16,color:B.red,background:"none",
                        border:"none",cursor:"pointer",fontWeight:600}}>
                      Remove photo
                    </button>
                  )}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:B.textMid,marginBottom:5,
                    textTransform:"uppercase",letterSpacing:0.4}}>Category</div>
                  <select value={menuForm.category}
                    onChange={e=>setMenuForm(f=>({...f,category:e.target.value}))}
                    style={{width:"100%",padding:"10px 12px",background:B.surface,
                      border:`1.5px solid ${B.border}`,borderRadius:10,fontSize:16,
                      boxSizing:"border-box",fontFamily:"inherit",color:B.text}}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <Input label="Dish name" value={menuForm.name}
                onChange={v=>setMenuForm(f=>({...f,name:v}))}
                placeholder="e.g. Jollof Rice + Chicken"/>
              <Input label="Description" value={menuForm.description}
                onChange={v=>setMenuForm(f=>({...f,description:v}))}
                placeholder="Short description of the dish"/>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Input label="Price (£)" value={menuForm.price}
                  onChange={v=>setMenuForm(f=>({...f,price:v}))}
                  placeholder="12.50" type="number"/>
                <Input label="Portion size" value={menuForm.portion}
                  onChange={v=>setMenuForm(f=>({...f,portion:v}))}
                  placeholder="e.g. 450g"/>
              </div>

              <Input label="Calories (optional)" value={menuForm.calories}
                onChange={v=>setMenuForm(f=>({...f,calories:v}))}
                placeholder="e.g. 620" type="number"/>

              {/* Toggles */}
              <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  ["available","Available for order",B.green],
                  ["is_vegan","Vegan",B.purple],
                ].map(([key,label,color])=>(
                  <button key={key}
                    onClick={()=>setMenuForm(f=>({...f,[key]:!f[key]}))}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
                      borderRadius:20,border:`1.5px solid ${menuForm[key]?color:B.border}`,
                      background:menuForm[key]?`${color}15`:"transparent",
                      cursor:"pointer",fontSize:16,fontWeight:700,
                      color:menuForm[key]?color:B.textMid}}>
                    <div style={{width:14,height:14,borderRadius:"50%",
                      background:menuForm[key]?color:B.border}}/>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{display:"flex",gap:10}}>
                <Btn full onClick={saveMenuItem}
                  disabled={!menuForm.name||!menuForm.price}>
                  {editingItem ? "Save changes" : "Add to menu"}
                </Btn>
                {editingItem&&(
                  <Btn v="ghost" onClick={()=>{
                    setEditingItem(null);
                    setMenuForm({name:"",description:"",price:"",category:"Rice Dishes",
                      emoji:"🍛",portion:"",calories:"",available:true,
                      is_halal:true,is_vegan:false,imagePreview:null,imageFile:null,imageUrl:""});
                  }}>Cancel</Btn>
                )}
              </div>
            </Card>

            {/* Menu items list grouped by category */}
            {CATEGORIES.map(cat=>{
              const items = menuItems.filter(m=>m.category===cat);
              if(!items.length) return null;
              return (
                <div key={cat} style={{marginBottom:20}}>
                  <div style={{fontSize:14,fontWeight:700,color:B.textMid,
                    textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
                    {cat} ({items.length})
                  </div>
                  {items.map(item=>(
                    <Card key={item.id} style={{marginBottom:10,
                      opacity:item.available?1:0.6,
                      borderLeft:`4px solid ${item.available?B.green:B.red}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"flex-start",gap:10}}>
                        <div style={{display:"flex",gap:10,flex:1}}>
                          <div style={{width:48,height:48,borderRadius:10,
                          background:B.surface,overflow:"hidden",flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                          {item.image_url
                            ? <img src={item.image_url} alt={item.name}
                                loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : item.emoji
                          }
                        </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:16,fontWeight:700,color:B.text}}>
                              {item.name}
                            </div>
                            <div style={{fontSize:14,color:B.textMid,marginTop:2}}>
                              {item.description}
                            </div>
                            <div style={{display:"flex",gap:8,marginTop:6,
                              alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontSize:17,fontWeight:800,color:B.primary}}>
                                £{item.price.toFixed(2)}
                              </span>
                              {item.portion&&item.portion!=="0"&&(
                                <span style={{fontSize:14,color:B.textDim}}>
                                  {item.portion}
                                </span>
                              )}
                              <span style={{fontSize:16,fontWeight:700,
                                color:item.available?B.green:B.red}}>
                                {item.available?"● Available":"● Sold out"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                          <button onClick={()=>toggleAvailable(item)}
                            style={{padding:"6px 10px",borderRadius:8,fontSize:16,
                              fontWeight:700,cursor:"pointer",border:"none",
                              background:item.available?B.redSoft:B.greenSoft,
                              color:item.available?B.red:B.green}}>
                            {item.available?"Sold out":"Available"}
                          </button>
                          <button onClick={()=>editItem(item)}
                            style={{padding:"6px 10px",borderRadius:8,fontSize:16,
                              fontWeight:700,cursor:"pointer",border:"none",
                              background:B.goldLight,color:B.gold}}>
                            ✏️ Edit
                          </button>
                          <button onClick={()=>deleteMenuItem(item.id)}
                            style={{padding:"6px 10px",borderRadius:8,fontSize:16,
                              fontWeight:700,cursor:"pointer",border:"none",
                              background:B.redSoft,color:B.red}}>
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ORDERS SECTION ── */}
        {section==="orders"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[
                ["Total orders",orders.length,B.primary],
                ["Paid orders",orders.filter(o=>o.paid).length,B.green],
                ["Pending",orders.filter(o=>!o.paid).length,B.gold],
                ["Revenue",`£${orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0).toFixed(2)}`,B.green],
              ].map(([label,value,color])=>(
                <Card key={label} style={{textAlign:"center",padding:"14px 10px",
                  background:B.surface,borderColor:"transparent"}}>
                  <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
                  <div style={{fontSize:15,color:B.textMid,marginTop:4,fontWeight:600}}>
                    {label}
                  </div>
                </Card>
              ))}
            </div>

            {orders.map(o=>(
              <Card key={o.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:B.text}}>
                      {o.customer_name}
                    </div>
                    <div style={{fontSize:14,color:B.textDim}}>
                      {o.id} · {o.postcode}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <Pill s={o.status}/>
                    <div style={{fontSize:17,fontWeight:800,color:B.primary,marginTop:4}}>
                      £{o.total?.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:15,color:B.textMid,marginBottom:6}}>
                  📍 {o.delivery_address}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {(o.items||[]).map((it,i)=>(
                    <span key={i} style={{fontSize:16,background:B.surface,
                      borderRadius:8,padding:"4px 10px",color:B.textMid,fontWeight:600}}>
                      {it.name} ×{it.qty}
                    </span>
                  ))}
                </div>
                <div style={{marginTop:8,display:"flex",justifyContent:"space-between",
                  alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:700,
                    color:o.paid?B.green:B.gold}}>
                    {o.paid?"💳 Paid":"⏳ Awaiting payment"}
                  </span>
                  <span style={{fontSize:14,color:B.textDim}}>
                    {new Date(o.created_at).toLocaleDateString("en-GB",
                      {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── RIDERS SECTION ── */}
        {section==="riders"&&(
          <div>
            <Btn full style={{marginBottom:16}}
              onClick={()=>setAddingRider(true)}>
              ➕ Add new rider
            </Btn>

            {addingRider&&(
              <Card style={{marginBottom:16,background:B.goldLight,
                borderColor:B.gold}}>
                <div style={{fontSize:18,fontWeight:800,color:B.text,marginBottom:14}}>
                  Add rider
                </div>
                <Input label="Full name" value={riderForm.name}
                  onChange={v=>setRiderForm(f=>({...f,name:v}))}
                  placeholder="Rider's full name"/>
                <Input label="Phone / WhatsApp" value={riderForm.phone}
                  onChange={v=>setRiderForm(f=>({...f,phone:v}))}
                  placeholder="+44 7xxx xxxxxx"/>
                <div style={{display:"flex",gap:10}}>
                  <Btn full onClick={saveRider}
                    disabled={!riderForm.name||!riderForm.phone}>
                    Add rider
                  </Btn>
                  <Btn v="ghost" onClick={()=>{
                    setAddingRider(false);
                    setRiderForm({name:"",phone:""});
                  }}>Cancel</Btn>
                </div>
              </Card>
            )}

            {riders.length===0&&!addingRider&&(
              <Card style={{textAlign:"center",padding:"32px 20px"}}>
                <div style={{fontSize:36,marginBottom:12}}><Bike size={22} color="#fff"/></div>
                <div style={{fontSize:16,fontWeight:700,color:B.text}}>
                  No riders yet
                </div>
                <div style={{fontSize:15,color:B.textMid,marginTop:6}}>
                  Add your first delivery rider above
                </div>
              </Card>
            )}

            {riders.map(rider=>(
              <Card key={rider.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,
                      background:`linear-gradient(135deg,${B.primary},${B.gold})`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:22,flexShrink:0}}><Bike size={22} color="#fff"/></div>
                    <div>
                      <div style={{fontSize:16,fontWeight:700,color:B.text}}>
                        {rider.name}
                      </div>
                      <div style={{fontSize:15,color:B.textMid}}>
                        +{rider.phone}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn v="wa" style={{padding:"8px 12px",fontSize:13}}
                      onClick={()=>openWA(rider.phone,
                        `Hi ${rider.name}, this is AfroCrave Kitchen. Are you available for deliveries today?`)}>
                      💬
                    </Btn>
                    <Btn v="danger" style={{padding:"8px 12px",fontSize:13}}
                      onClick={()=>deleteRider(rider.id)}>
                      🗑️
                    </Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── SETTINGS SECTION ── */}
        {section==="settings"&&(
          <div>
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:800,color:B.text,marginBottom:14}}>
                Kitchen information
              </div>
              <Input label="Kitchen name" value={settings.kitchenName}
                onChange={v=>setSettings(s=>({...s,kitchenName:v}))}
                placeholder="AfroCrave Kitchen"/>
              <Input label="WhatsApp / Phone" value={settings.phone}
                onChange={v=>setSettings(s=>({...s,phone:v}))}
                placeholder="+44 7823 644323"/>
              <Input label="Address / Location" value={settings.address}
                onChange={v=>setSettings(s=>({...s,address:v}))}
                placeholder="Sunderland, UK"/>
              <Input label="Minimum order (£)" value={settings.minOrder}
                onChange={v=>setSettings(s=>({...s,minOrder:v}))}
                placeholder="15.00" type="number"
                hint="Set to 0 for no minimum order"/>
              <Input label="Estimated delivery time" value={settings.deliveryTime}
                onChange={v=>setSettings(s=>({...s,deliveryTime:v}))}
                placeholder="45–75 min"
                hint="Shown to customers on the order page"/>
              <Btn full v="green" onClick={()=>showToast("✅ Settings saved — contact Choma support to apply")}>
                Save settings
              </Btn>
              <div style={{fontSize:16,color:B.textMid,marginTop:10,textAlign:"center"}}>
                Some settings require a code update to take effect.
              </div>
            </Card>

            {/* Delivery zones */}
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:800,color:B.text,marginBottom:14}}>
                📍 Delivery zones
              </div>
              <div style={{fontSize:15,color:B.textMid,lineHeight:1.8,marginBottom:10}}>
                <strong style={{color:B.text}}>Sunderland (all SR postcodes)</strong> — £5.00 flat fee<br/>
                <strong style={{color:B.text}}>Outside Sunderland</strong> — £5.00 + £0.75/mile<br/>
                <strong style={{color:B.text}}>Maximum charge</strong> — £15.00
              </div>
              <div style={{padding:"12px 14px",background:B.goldLight,borderRadius:10,
                fontSize:13,color:B.gold,fontWeight:600}}>
                💡 To change delivery pricing, WhatsApp Choma support
              </div>
            </Card>

            {/* Platform info */}
            <Card style={{background:B.surface,borderColor:"transparent"}}>
              <div style={{fontSize:14,fontWeight:700,color:B.textMid,
                textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>
                Platform
              </div>
              {[
                ["Platform","Choma"],
                ["Kitchen","AfroCrave Kitchen"],
                ["Plan","Starter"],
                ["Support","WhatsApp: +44 7823 644323"],
              ].map(([label,value])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",
                  padding:"8px 0",borderBottom:`1px solid ${B.divider}`,fontSize:14}}>
                  <span style={{color:B.textMid}}>{label}</span>
                  <span style={{fontWeight:600,color:B.text}}>{value}</span>
                </div>
              ))}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PRIVACY POLICY PAGE
// ════════════════════════════════════════════════════════════════
function PrivacyPolicy({ onBack }) {
  return (
    <div style={{minHeight:"100vh",background:"#FFF8F0",
      fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,sans-serif"}}>
      {/* Header */}
      <div style={{background:"#2A1208",padding:"14px 20px",
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
          borderBottom:"1px solid #EDE8E0"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#1A1208",
            marginBottom:6}}>Privacy Policy</div>
          <div style={{fontSize:16,color:"#6B5D4A",lineHeight:1.7}}>
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
            <div style={{fontSize:16,fontWeight:700,color:"#1A1208",
              marginBottom:8}}>{section.title}</div>
            <div style={{fontSize:15,color:"#6B5D4A",lineHeight:1.8}}>
              {section.body}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{marginTop:32,padding:"16px 20px",
          background:"#2A1208",borderRadius:16,
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

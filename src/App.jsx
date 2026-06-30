import { useState, useEffect, useRef } from "react";
import Fox, { getFoxStage } from "./Fox";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:         "#0F0A1A",
  card:       "#1A1228",
  cardBorder: "#2D1F45",
  accent:     "#F4845F",
  gold:       "#F9C74F",
  green:      "#6FCF97",
  purple:     "#A78BFA",
  blue:       "#60A5FA",
  text:       "#F5EFE6",
  muted:      "#8B7BA8",
};

// ─── FOOD DATABASE (normalizzato per porzione standard) ───────────────────────
const FOOD_DB = {
  "Carne e Pesce": [
    { name:"Petto di pollo",            kcal:165, p:31, c:0,  f:3.6, type:"protein" },
    { name:"Coscia di pollo",           kcal:215, p:26, c:0,  f:12,  type:"protein" },
    { name:"Bistecca di manzo",         kcal:250, p:26, c:0,  f:16,  type:"protein" },
    { name:"Salmone al forno",          kcal:208, p:28, c:0,  f:10,  type:"protein" },
    { name:"Tonno in scatola",          kcal:130, p:28, c:0,  f:1.5, type:"protein" },
    { name:"Merluzzo",                  kcal:82,  p:18, c:0,  f:0.7, type:"protein" },
    { name:"Gamberetti",                kcal:99,  p:20, c:0.9,f:1.7, type:"protein" },
    { name:"Prosciutto cotto",          kcal:130, p:19, c:1,  f:5.5, type:"protein" },
    { name:"Prosciutto di Parma",       kcal:90,  p:7,  c:0,  f:7,   type:"protein" },
    { name:"Mortadella Bologna",        kcal:155, p:7.5,c:0.5,f:14,  type:"fat"     },
    { name:"Salsiccia",                 kcal:302, p:13, c:2,  f:27,  type:"fat"     },
    { name:"Cotoletta alla bolognese",  kcal:380, p:28, c:12, f:24,  type:"protein" },
  ],
  "Uova e Latticini": [
    { name:"Uovo intero",               kcal:78,  p:6,  c:0.6,f:5,   type:"protein" },
    { name:"Uova strapazzate (2)",      kcal:180, p:14, c:1,  f:13,  type:"protein" },
    { name:"Mozzarella",                kcal:280, p:18, c:2,  f:22,  type:"fat"     },
    { name:"Parmigiano Reggiano",       kcal:119, p:10, c:0,  f:8.5, type:"protein" },
    { name:"Ricotta",                   kcal:174, p:11, c:3,  f:13,  type:"fat"     },
    { name:"Yogurt greco",              kcal:100, p:10, c:6,  f:3,   type:"protein" },
    { name:"Latte intero (200ml)",      kcal:130, p:6.6,c:9.6,f:7.4, type:"fat"     },
    { name:"Burrata",                   kcal:330, p:15, c:2,  f:30,  type:"fat"     },
  ],
  "Pasta e Cereali": [
    { name:"Pasta al pomodoro",         kcal:350, p:12, c:65, f:5,   type:"carb"    },
    { name:"Pasta al ragu",             kcal:450, p:20, c:58, f:15,  type:"carb"    },
    { name:"Tagliatelle al ragu",       kcal:480, p:22, c:52, f:18,  type:"carb"    },
    { name:"Tortellini in brodo",       kcal:320, p:14, c:42, f:10,  type:"carb"    },
    { name:"Lasagne verdi bolognese",   kcal:420, p:20, c:38, f:20,  type:"carb"    },
    { name:"Riso bollito",              kcal:130, p:2.7,c:28, f:0.3, type:"carb"    },
    { name:"Risotto ai funghi",         kcal:320, p:8,  c:52, f:9,   type:"carb"    },
    { name:"Gnocchi al pomodoro",       kcal:310, p:8,  c:58, f:5,   type:"carb"    },
    { name:"Pane bianco",               kcal:134, p:4,  c:27, f:0.9, type:"carb"    },
    { name:"Piadina romagnola",         kcal:290, p:7,  c:42, f:10,  type:"carb"    },
    { name:"Gnocco fritto",             kcal:340, p:6,  c:38, f:18,  type:"fat"     },
    { name:"Tigella",                   kcal:220, p:6,  c:32, f:8,   type:"carb"    },
  ],
  "Verdure e Legumi": [
    { name:"Insalata mista",            kcal:15,  p:1,  c:2,  f:0.2, type:"light"   },
    { name:"Zucchine",                  kcal:17,  p:1.2,c:3.1,f:0.3, type:"light"   },
    { name:"Spinaci",                   kcal:23,  p:2.9,c:3.6,f:0.4, type:"light"   },
    { name:"Broccoli",                  kcal:34,  p:2.8,c:7,  f:0.4, type:"light"   },
    { name:"Ceci cotti",                kcal:164, p:8.9,c:27, f:2.6, type:"carb"    },
    { name:"Lenticchie cotte",          kcal:116, p:9,  c:20, f:0.4, type:"protein" },
    { name:"Patate al forno",           kcal:150, p:3,  c:30, f:3,   type:"carb"    },
    { name:"Minestrone",                kcal:85,  p:4,  c:14, f:1.5, type:"light"   },
    { name:"Erbazzone",                 kcal:220, p:8,  c:22, f:11,  type:"fat"     },
  ],
  "Frutta": [
    { name:"Mela",                      kcal:72,  p:0.4,c:19, f:0.2, type:"light"   },
    { name:"Banana",                    kcal:105, p:1.3,c:27, f:0.4, type:"carb"    },
    { name:"Arancia",                   kcal:62,  p:1.2,c:15, f:0.2, type:"light"   },
    { name:"Fragole",                   kcal:32,  p:0.7,c:8,  f:0.3, type:"light"   },
    { name:"Avocado",                   kcal:160, p:2,  c:9,  f:15,  type:"fat"     },
  ],
  "Surgelati": [
    { name:"Bastoncini di pesce (2)",   kcal:160, p:8,  c:16, f:7,   type:"carb"    },
    { name:"Sofficini (2)",             kcal:280, p:8,  c:30, f:14,  type:"carb"    },
    { name:"Lasagne surgelate",         kcal:380, p:18, c:38, f:16,  type:"carb"    },
    { name:"Crocchette pollo (3)",      kcal:220, p:12, c:18, f:11,  type:"protein" },
    { name:"Cotolette di pesce",        kcal:180, p:10, c:14, f:9,   type:"protein" },
    { name:"Wurstel",                   kcal:120, p:5,  c:1,  f:11,  type:"fat"     },
  ],
  "Piatti pronti": [
    { name:"Pizza margherita (fetta)",  kcal:270, p:11, c:35, f:9,   type:"carb"    },
    { name:"Hamburger classico",        kcal:480, p:26, c:40, f:24,  type:"fat"     },
    { name:"Piadina squacquerone",      kcal:480, p:14, c:52, f:24,  type:"fat"     },
    { name:"Tramezzino tonno",          kcal:350, p:14, c:42, f:13,  type:"carb"    },
  ],
  "Colazione e Snack": [
    { name:"Caffe espresso",            kcal:2,   p:0.1,c:0.3,f:0,   type:"light"   },
    { name:"Cappuccino",                kcal:80,  p:4,  c:8,  f:3,   type:"light"   },
    { name:"Brioche",                   kcal:250, p:5,  c:38, f:9,   type:"carb"    },
    { name:"Yogurt bianco",             kcal:61,  p:3.5,c:7,  f:1.5, type:"light"   },
    { name:"Biscotti (3)",              kcal:150, p:2,  c:23, f:6,   type:"carb"    },
    { name:"Nutella (20g)",             kcal:110, p:1.4,c:12, f:6.5, type:"fat"     },
    { name:"Barretta cioccolato",       kcal:160, p:2,  c:18, f:9,   type:"fat"     },
    { name:"Frutta secca (30g)",        kcal:180, p:5,  c:6,  f:16,  type:"fat"     },
  ],
  "Bevande": [
    { name:"Acqua",                     kcal:0,   p:0,  c:0,  f:0,   type:"light"   },
    { name:"Succo arancia (200ml)",     kcal:90,  p:1,  c:22, f:0,   type:"carb"    },
    { name:"Coca Cola (330ml)",         kcal:139, p:0,  c:35, f:0,   type:"carb"    },
    { name:"Birra (330ml)",             kcal:143, p:1,  c:13, f:0,   type:"carb"    },
    { name:"Vino rosso (150ml)",        kcal:127, p:0.1,c:4,  f:0,   type:"light"   },
    { name:"Lambrusco (150ml)",         kcal:90,  p:0.1,c:5,  f:0,   type:"light"   },
  ],
};

const ALL_FOODS = Object.entries(FOOD_DB).flatMap(([cat,items]) =>
  items.map(f => ({ ...f, _cat: cat }))
);

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function load(k,fb){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().split("T")[0]; }

// ─── FOX STATE LOGIC ─────────────────────────────────────────────────────────
function computeFoxMood(hunger, energy, happiness) {
  if (hunger > 75 || happiness < 25) return "sad";
  if (hunger < 25 && energy > 60 && happiness > 70) return "excited";
  if (hunger < 40 && energy > 45 && happiness > 50) return "happy";
  if (energy < 25) return "sad";
  return "neutral";
}

// Stima qualità pasto 0-1 basata su bilanciamento macro (non solo calorie)
function mealQuality(food) {
  const p = food.p||0, c = food.c||0, f = food.f||0;
  const tot = p+c+f;
  if (tot === 0) return 0.5;
  const pRatio = p/tot;
  // pasto con buona quota proteica = qualità più alta, grassi eccessivi la abbassano
  let q = 0.45 + pRatio*0.4;
  if (f/tot > 0.55) q -= 0.15;
  return Math.max(0.2, Math.min(1, q));
}

function getFoodEffect(food) {
  const quality = mealQuality(food);
  const happinessDelta = Math.round(8 + quality*12); // 8-20
  switch(food.type) {
    case "protein": return { hungerDelta:-35, energyDelta:+20, happinessDelta, label:"Energia stabile!"   , reaction:"energetic" };
    case "carb":    return { hungerDelta:-30, energyDelta:+30, happinessDelta, label:"Carica subito!"     , reaction:"energetic" };
    case "fat":     return { hungerDelta:-25, energyDelta:+10, happinessDelta, label:"Sazio e calmo!"     , reaction:"neutral"   };
    case "light":   return { hungerDelta:-15, energyDelta:+8,  happinessDelta, label:"Leggero e fresco!"  , reaction:"happy"     };
    default:        return { hungerDelta:-20, energyDelta:+15, happinessDelta, label:"Buono!"             , reaction:"happy"     };
  }
}

// Messaggi reazione mostrati nel popup dopo il pasto
const REACTION_MESSAGES = {
  happy:     ["Che buono!", "Mi piace!", "Delizioso!"],
  energetic: ["Che carica!", "Sento l'energia!", "Forza pura!"],
  neutral:   ["Mmh, ok.", "Va bene così.", "Non male."],
  sad:       ["Avrei voluto di meglio...", "Speravo in altro."],
};
function pickReaction(type) {
  const arr = REACTION_MESSAGES[type] || REACTION_MESSAGES.neutral;
  return arr[Math.floor(Math.random()*arr.length)];
}

function getStreak(log) {
  let s=0; const today=new Date();
  for(let i=0;i<60;i++){
    const d=new Date(today); d.setDate(today.getDate()-i);
    const k=d.toISOString().split("T")[0];
    if(log[k]?.meals?.length>0) s++;
    else if(i>0) break;
  }
  return s;
}

function calcBMR(w,h,a,sex){
  if(!w||!h||!a) return 2000;
  return sex==="M"?Math.round(10*w+6.25*h-5*a+5):Math.round(10*w+6.25*h-5*a-161);
}
function calcTDEE(bmr,act){
  const f={sedentario:1.2,leggero:1.375,moderato:1.55,attivo:1.725};
  return Math.round(bmr*(f[act]||1.375));
}
const GOALS={
  perdere_peso:    {label:"Perdere peso",   emoji:"📉", mult:0.8},
  mangiare_meglio: {label:"Mangiare meglio",emoji:"🥗", mult:1.0},
  tener_traccia:   {label:"Tener traccia",  emoji:"📋", mult:1.1},
};

// ─── HUNGER/ENERGY BAR ────────────────────────────────────────────────────────
function StatBar({ label, value, color, icon }) {
  return (
    <div style={{flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{color:C.muted,fontSize:11}}>{icon} {label}</span>
        <span style={{color,fontSize:11,fontWeight:700}}>{Math.round(value)}%</span>
      </div>
      <div style={{height:6,background:"#0F0A1A",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${value}%`,background:color,borderRadius:3,transition:"width 0.6s ease"}}/>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function NutriFox() {
  const [screen,    setScreen]    = useState("home");
  const [setupDone, setSetupDone] = useState(()=>load("nf_setupDone",false));
  const [foxName,   setFoxName]   = useState(()=>load("nf_foxName","Foxy"));
  const [goalKey,   setGoalKey]   = useState(()=>load("nf_goalKey","mangiare_meglio"));
  const [profile,   setProfile]   = useState(()=>load("nf_profile",{weight:"",height:"",age:"",sex:"M",activity:"leggero"}));
  const [dailyLog,  setDailyLog]  = useState(()=>load("nf_dailyLog",{}));
  const [favorites, setFavorites] = useState(()=>load("nf_favorites",[]));
  const [recentFoods,setRecentFoods]=useState(()=>load("nf_recent",[]));
  const [customRecipes,setCustomRecipes]=useState(()=>load("nf_recipes",[]));
  const [water,     setWater]     = useState(()=>load("nf_water_"+todayKey(),0));
  const [aiMessages,setAiMessages]= useState(()=>load("nf_aimsg",[]));
  const [aiInput,   setAiInput]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Fox state — esteso con happiness, health, lastFedAt (campi originali invariati)
  const [foxState,  setFoxState]  = useState(()=>load("nf_foxstate",{hunger:50,energy:50,happiness:70,health:90,lastFedAt:null}));
  const [bounce,    setBounce]    = useState(false);
  const [feedLabel, setFeedLabel] = useState("");
  const [reaction,  setReaction]  = useState(null); // {type, message} — popup temporaneo 2-3s
  const [tempName,  setTempName]  = useState("Foxy");
  const [tempGoal,  setTempGoal]  = useState("mangiare_meglio");

  // Log screen state
  const [search,    setSearch]    = useState("");
  const [activeCategory, setActiveCategory] = useState("Recenti");
  const [mealType,  setMealType]  = useState("Pranzo");
  const [logMode,   setLogMode]   = useState("db");
  const [customFood,setCustomFood]= useState({name:"",kcal:"",p:"",c:"",f:""});
  const [builderName,setBuilderName]=useState("");
  const [builderIngredients,setBuilderIngredients]=useState([]);
  const [builderSearch,setBuilderSearch]=useState("");
  const [builderCategory,setBuilderCategory]=useState("Tutti");

  // Persist
  useEffect(()=>save("nf_setupDone",setupDone),[setupDone]);
  useEffect(()=>save("nf_foxName",foxName),[foxName]);
  useEffect(()=>save("nf_goalKey",goalKey),[goalKey]);
  useEffect(()=>save("nf_profile",profile),[profile]);
  useEffect(()=>save("nf_dailyLog",dailyLog),[dailyLog]);
  useEffect(()=>save("nf_favorites",favorites),[favorites]);
  useEffect(()=>save("nf_recent",recentFoods),[recentFoods]);
  useEffect(()=>save("nf_recipes",customRecipes),[customRecipes]);
  useEffect(()=>save("nf_water_"+todayKey(),water),[water]);
  useEffect(()=>save("nf_foxstate",foxState),[foxState]);
  useEffect(()=>save("nf_aimsg",aiMessages.slice(-40)),[aiMessages]);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[aiMessages]);

  // Decay system leggero: ogni minuto hunger sale, energy scende.
  // Se hunger troppo alto, happiness scende di conseguenza. Health segue happiness nel tempo.
  useEffect(()=>{
    const iv = setInterval(()=>{
      setFoxState(prev=>{
        const hunger    = Math.min(100, prev.hunger+2);
        const energy    = Math.max(0, prev.energy-1);
        const happiness = hunger > 70 ? Math.max(0, (prev.happiness??70)-2) : (prev.happiness??70);
        const health    = happiness < 30 ? Math.max(0, (prev.health??90)-1) : (prev.health??90);
        return { ...prev, hunger, energy, happiness, health };
      });
    }, 60000); // ogni minuto
    return ()=>clearInterval(iv);
  },[]);

  const today    = todayKey();
  const todayData= dailyLog[today]||{meals:[]};
  const streak   = getStreak(dailyLog);
  const stage    = getFoxStage(streak);
  const mood     = computeFoxMood(foxState.hunger, foxState.energy, foxState.happiness??70);

  function goalKcal(){
    const bmr=calcBMR(Number(profile.weight),Number(profile.height),Number(profile.age),profile.sex);
    const tdee=calcTDEE(bmr,profile.activity);
    const mult=GOALS[goalKey]?.mult||1;
    return profile.weight?Math.round(tdee*mult):(goalKey==="perdere_peso"?1600:goalKey==="tener_traccia"?2200:2000);
  }

  const totalKcal = todayData.meals.reduce((s,m)=>s+m.kcal,0);
  const totalP    = todayData.meals.reduce((s,m)=>s+(m.p||0),0);
  const totalC    = todayData.meals.reduce((s,m)=>s+(m.c||0),0);
  const totalF    = todayData.meals.reduce((s,m)=>s+(m.f||0),0);
  const gKcal     = goalKcal();
  const targetWater = Math.round(((Number(profile.weight)||70)*35+(totalKcal/1000)*300)/250);

  const weekDays = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split("T")[0];});
  const weekKcals= weekDays.map(d=>(dailyLog[d]?.meals||[]).reduce((s,m)=>s+m.kcal,0));
  const weekAvg  = Math.round(weekKcals.filter(k=>k>0).reduce((s,k)=>s+k,0)/(weekKcals.filter(k=>k>0).length||1));

  // Food lists
  const categories=["Recenti","Preferiti","Tutti",...Object.keys(FOOD_DB)];
  function getPool(cat){
    if(cat==="Recenti") return recentFoods.slice(0,12);
    if(cat==="Preferiti") return ALL_FOODS.filter(f=>favorites.includes(f.name));
    if(cat==="Tutti") return ALL_FOODS;
    return FOOD_DB[cat]||[];
  }
  const pool=getPool(activeCategory);
  const filteredFoods=search?ALL_FOODS.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())):pool;
  const bPool=builderCategory==="Tutti"?ALL_FOODS:(FOOD_DB[builderCategory]||[]);
  const filteredBuilder=builderSearch?ALL_FOODS.filter(f=>f.name.toLowerCase().includes(builderSearch.toLowerCase())):bPool;
  const bKcal=builderIngredients.reduce((s,i)=>s+i.kcal,0);
  const bP=builderIngredients.reduce((s,i)=>s+(i.p||0),0);
  const bC=builderIngredients.reduce((s,i)=>s+(i.c||0),0);
  const bF=builderIngredients.reduce((s,i)=>s+(i.f||0),0);

  async function askFox(userMsg) {
    if(!userMsg.trim()||aiLoading) return;
    const userEntry = {role:"user", content:userMsg};
    setAiMessages(prev=>[...prev, userEntry]);
    setAiInput("");
    setAiLoading(true);

    const meals = todayData.meals.map(m=>`${m.name} (${m.kcal} kcal, P:${m.p}g C:${m.c}g G:${m.f}g)`).join(", ");
    const profile_str = profile.weight ? `Peso: ${profile.weight}kg, Altezza: ${profile.height}cm, Eta: ${profile.age}anni, Sesso: ${profile.sex}, Attivita: ${profile.activity}` : "Profilo non inserito";
    const systemPrompt = `Sei ${foxName}, una volpe simpatica e affettuosa che aiuta l'utente a mangiare meglio. Parli in italiano, in prima persona, con calore e un pizzico di umorismo da volpe. Sei concisa (max 3 frasi). Non sei un medico.

Dati oggi:
- Pasti: ${meals||"nessuno ancora"}
- Calorie: ${totalKcal}/${gKcal} kcal
- Proteine: ${Math.round(totalP)}g, Carboidrati: ${Math.round(totalC)}g, Grassi: ${Math.round(totalF)}g
- Acqua: ${water}/${targetWater} bicchieri
- Streak: ${streak} giorni
- Tuo stato: Fame ${Math.round(foxState.hunger)}%, Energia ${Math.round(foxState.energy)}%
- Profilo: ${profile_str}
- Obiettivo: ${GOALS[goalKey].label}

Rispondi alla domanda dell'utente tenendo conto di questi dati reali. Se non hai mangiato molto, incoraggialo. Se hai esagerato, dillo con gentilezza.`;

    try {
      const history = aiMessages.slice(-10).map(m=>({role:m.role,content:m.content}));
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:300,
          system:systemPrompt,
          messages:[...history,{role:"user",content:userMsg}]
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Uhm... non riesco a rispondere ora!";
      setAiMessages(prev=>[...prev,{role:"assistant",content:reply}]);
      // Fox reacts to AI interaction
      setBounce(true); setTimeout(()=>setBounce(false),600);
    } catch(err) {
      setAiMessages(prev=>[...prev,{role:"assistant",content:"Ops, ho avuto un problema! Riprova tra poco."}]);
    }
    setAiLoading(false);
  }

  function triggerBounce(label){
    setBounce(true); setFeedLabel(label);
    setTimeout(()=>setBounce(false),600);
    setTimeout(()=>setFeedLabel(""),2000);
  }

  // Reaction popup: appare sopra la volpe per 2.5s dopo ogni pasto
  function triggerReaction(type){
    const message = pickReaction(type);
    setReaction({ type, message });
    setTimeout(()=>setReaction(null), 2500);
  }

  function addFood(food){
    const effect=getFoodEffect(food);
    setFoxState(prev=>({
      ...prev,
      hunger:Math.max(0,prev.hunger+effect.hungerDelta),
      energy:Math.min(100,prev.energy+effect.energyDelta),
      happiness:Math.min(100,(prev.happiness??70)+effect.happinessDelta),
      lastFedAt:Date.now(),
    }));
    triggerBounce(effect.label);
    triggerReaction(effect.reaction);
    const entry={...food,meal:mealType,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})};
    setDailyLog(prev=>({...prev,[today]:{meals:[...(prev[today]?.meals||[]),entry]}}));
    setRecentFoods(prev=>[food,...prev.filter(f=>f.name!==food.name)].slice(0,20));
    setSearch(""); setScreen("home");
  }

  function addCustomFood(){
    if(!customFood.name||!customFood.kcal) return;
    addFood({name:customFood.name,kcal:Number(customFood.kcal),p:Number(customFood.p)||0,c:Number(customFood.c)||0,f:Number(customFood.f)||0,type:"carb"});
    setCustomFood({name:"",kcal:"",p:"",c:"",f:""});
  }

  function removeFood(idx){
    setDailyLog(prev=>{const meals=[...(prev[today]?.meals||[])];meals.splice(idx,1);return{...prev,[today]:{meals}};});
  }

  function saveRecipe(){
    if(!builderName||builderIngredients.length===0) return;
    setCustomRecipes(prev=>[...prev,{name:builderName,kcal:Math.round(bKcal),p:Math.round(bP),c:Math.round(bC),f:Math.round(bF),ingredients:builderIngredients,type:"carb"}]);
    setBuilderName("");setBuilderIngredients([]);setBuilderSearch("");setScreen("log");
  }

  const inp={width:"100%",background:"#0F0A1A",border:"1px solid #2D1F45",borderRadius:10,color:C.text,padding:"10px 14px",fontSize:15,boxSizing:"border-box",outline:"none"};

  // ── AI COACH SCREEN ─────────────────────────────────────────────────────────
  if(screen==="coach") return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{padding:"20px 16px 12px",background:C.card,borderBottom:`1px solid ${C.cardBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setScreen("home")} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.text,padding:"7px 13px",cursor:"pointer",fontSize:14}}>← Indietro</button>
          <div>
            <div style={{color:C.text,fontWeight:800,fontSize:16}}>Parla con {foxName}</div>
            <div style={{color:C.muted,fontSize:11}}>La tua volpe coach nutrizionale</div>
          </div>
          <div style={{marginLeft:"auto"}}>
            <Fox mood={mood} streak={streak} size={44} bounce={bounce}/>
          </div>
        </div>
        {/* Today summary pill */}
        <div style={{display:"flex",gap:8,marginTop:12,overflowX:"auto",paddingBottom:4}}>
          {[["🍽️",totalKcal+"/"+ gKcal+" kcal"],["💪",Math.round(totalP)+"g P"],["🔥",streak+" gg"]].map(([ic,val])=>(
            <div key={val} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:20,padding:"4px 12px",fontSize:11,color:C.muted,whiteSpace:"nowrap",flexShrink:0}}>{ic} {val}</div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
        {aiMessages.length===0&&(
          <div style={{textAlign:"center",padding:"30px 20px"}}>
            <Fox mood="happy" streak={streak} size={100}/>
            <p style={{color:C.muted,fontSize:14,marginTop:12}}>Ciao! Sono {foxName}, la tua coach nutrizionale.</p>
            <p style={{color:C.muted,fontSize:13}}>Chiedimi dei tuoi pasti, cosa mangiare, consigli sull'energia... sono qui!</p>
            {/* Suggested questions */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
              {["Come sto mangiando oggi?","Ho bisogno di piu proteine?","Cosa mi manca per stasera?","Come mai mi sento senza energia?"].map(q=>(
                <button key={q} onClick={()=>askFox(q)} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:20,color:C.text,padding:"10px 16px",fontSize:13,cursor:"pointer",textAlign:"left"}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {aiMessages.map((msg,i)=>(
          <div key={i} style={{display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-end"}}>
            {msg.role==="assistant"&&(
              <div style={{width:28,height:28,borderRadius:"50%",background:C.card,border:`1px solid ${C.cardBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🦊</div>
            )}
            <div style={{maxWidth:"80%",background:msg.role==="user"?`linear-gradient(135deg,${C.accent},#E8553F)`:C.card,border:msg.role==="user"?"none":`1px solid ${C.cardBorder}`,borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",color:C.text,fontSize:13,lineHeight:1.5}}>
              {msg.content}
            </div>
          </div>
        ))}
        {aiLoading&&(
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:C.card,border:`1px solid ${C.cardBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🦊</div>
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:"18px 18px 18px 4px",padding:"10px 16px"}}>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.muted,animation:`dotBounce 1s ${i*0.2}s infinite`}}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"12px 16px 32px",background:C.card,borderTop:`1px solid ${C.cardBorder}`}}>
        <div style={{display:"flex",gap:8}}>
          <input
            value={aiInput}
            onChange={e=>setAiInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&askFox(aiInput)}
            placeholder={"Chiedi qualcosa a "+foxName+"..."}
            style={{flex:1,background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:12,color:C.text,padding:"11px 14px",fontSize:14,outline:"none"}}
          />
          <button onClick={()=>askFox(aiInput)} disabled={aiLoading||!aiInput.trim()}
            style={{background:aiLoading||!aiInput.trim()?"#2D1F45":`linear-gradient(135deg,${C.accent},#E8553F)`,border:"none",borderRadius:12,color:"white",padding:"11px 16px",fontSize:16,cursor:aiLoading?"not-allowed":"pointer",flexShrink:0,transition:"all 0.2s"}}>
            {aiLoading?"...":"➤"}
          </button>
        </div>
        <div style={{color:C.muted,fontSize:10,textAlign:"center",marginTop:6}}>Powered by Claude · I dati rimangono sul tuo dispositivo</div>
      </div>

      <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}@keyframes floatUp{0%{transform:translateX(-50%) translateY(0);opacity:1}100%{transform:translateX(-50%) translateY(-30px);opacity:0}}@keyframes reactionPop{0%{transform:translateX(-50%) translateY(6px) scale(0.9);opacity:0}15%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}80%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}100%{transform:translateX(-50%) translateY(-10px) scale(0.95);opacity:0}}`}</style>
    </div>
  );

  // ── SETUP ────────────────────────────────────────────────────────────────────
  if(!setupDone) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",padding:24}}>
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:28,padding:32,maxWidth:360,width:"100%",textAlign:"center",animation:"slideUp 0.4s ease"}}>
        <Fox mood="excited" streak={0} size={150}/>
        <h1 style={{color:C.text,fontSize:24,margin:"12px 0 4px",fontWeight:800}}>Ciao! Sono la tua volpe</h1>
        <p style={{color:C.muted,fontSize:13,marginBottom:24}}>Crescero con te, giorno dopo giorno</p>
        <label style={{display:"block",textAlign:"left",color:C.muted,fontSize:13,marginBottom:6}}>Come mi chiamo?</label>
        <input value={tempName} onChange={e=>setTempName(e.target.value)} placeholder="Es. Foxy, Aurora..." style={{...inp,marginBottom:18}}/>
        <label style={{display:"block",textAlign:"left",color:C.muted,fontSize:13,marginBottom:10}}>Obiettivo principale</label>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
          {Object.entries(GOALS).map(([k,g])=>(
            <button key={k} onClick={()=>setTempGoal(k)} style={{background:tempGoal===k?"#F4845F22":"#0F0A1A",border:`2px solid ${tempGoal===k?C.accent:C.cardBorder}`,borderRadius:12,color:C.text,padding:"11px 16px",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s"}}>
              <span style={{fontSize:18}}>{g.emoji}</span>
              <span style={{fontWeight:600}}>{g.label}</span>
              {tempGoal===k&&<span style={{marginLeft:"auto",color:C.accent}}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={()=>{setFoxName(tempName||"Foxy");setGoalKey(tempGoal);setSetupDone(true);}} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},#E8553F)`,border:"none",borderRadius:14,color:"white",padding:14,fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:`0 4px 20px ${C.accent}55`}}>
          Inizia con {tempName||"Foxy"} →
        </button>
      </div>
    </div>
  );

  // ── BUILDER ──────────────────────────────────────────────────────────────────
  if(screen==="builder"){
    const bCats=["Tutti",...Object.keys(FOOD_DB)];
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",padding:"20px 16px 40px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <button onClick={()=>setScreen("log")} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.text,padding:"8px 14px",cursor:"pointer",fontSize:14}}>← Indietro</button>
          <h2 style={{color:C.text,margin:0,fontSize:18,fontWeight:700}}>Crea piatto</h2>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,marginBottom:14}}>
          <label style={{color:C.muted,fontSize:13,display:"block",marginBottom:6}}>Nome del piatto</label>
          <input value={builderName} onChange={e=>setBuilderName(e.target.value)} placeholder="Es. Pasta con verdure..." style={inp}/>
        </div>
        {builderIngredients.length>0&&(
          <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{color:C.text,fontWeight:700,fontSize:14}}>Ingredienti</span>
              <span style={{color:C.accent,fontWeight:700,fontSize:14}}>{Math.round(bKcal)} kcal</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {[["P",Math.round(bP),C.purple],["C",Math.round(bC),C.gold],["G",Math.round(bF),C.accent]].map(([l,v,col])=>(
                <div key={l} style={{background:"#0F0A1A",borderRadius:8,padding:"6px 10px",textAlign:"center"}}>
                  <div style={{color:col,fontWeight:700,fontSize:14}}>{v}g</div>
                  <div style={{color:C.muted,fontSize:11}}>{l==="P"?"Prot.":l==="C"?"Carb.":"Grassi"}</div>
                </div>
              ))}
            </div>
            {builderIngredients.map((ing,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0F0A1A",borderRadius:8,padding:"8px 12px",marginBottom:4}}>
                <span style={{color:C.text,fontSize:13}}>{ing.name}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:C.accent,fontSize:12,fontWeight:600}}>{ing.kcal}</span>
                  <button onClick={()=>{const a=[...builderIngredients];a.splice(i,1);setBuilderIngredients(a);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              </div>
            ))}
            <button onClick={saveRecipe} style={{width:"100%",background:C.green,border:"none",borderRadius:10,color:"#0F0A1A",padding:11,fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>Salva piatto</button>
          </div>
        )}
        <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16}}>
          <input value={builderSearch} onChange={e=>setBuilderSearch(e.target.value)} placeholder="Cerca ingrediente..." style={{...inp,marginBottom:10}}/>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
            {bCats.map(cat=>(
              <button key={cat} onClick={()=>setBuilderCategory(cat)} style={{background:builderCategory===cat?C.accent:C.bg,border:`1px solid ${builderCategory===cat?C.accent:C.cardBorder}`,borderRadius:20,color:"white",padding:"5px 12px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",fontWeight:builderCategory===cat?700:400}}>{cat}</button>
            ))}
          </div>
          <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
            {filteredBuilder.map((f,i)=>(
              <button key={i} onClick={()=>setBuilderIngredients(p=>[...p,f])} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:9,color:C.text,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left"}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div><div style={{fontSize:10,color:C.muted}}>P {f.p}g · C {f.c}g</div></div>
                <span style={{color:C.accent,fontWeight:700,fontSize:12,flexShrink:0,marginLeft:8}}>+{f.kcal}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LOG SCREEN ───────────────────────────────────────────────────────────────
  if(screen==="log") return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",padding:"20px 16px 40px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setScreen("home")} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.text,padding:"8px 14px",cursor:"pointer",fontSize:14}}>← Indietro</button>
        <h2 style={{color:C.text,margin:0,fontSize:18,fontWeight:700}}>Aggiungi pasto</h2>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["Colazione","Pranzo","Cena","Spuntino"].map(t=>(
          <button key={t} onClick={()=>setMealType(t)} style={{background:mealType===t?C.accent:C.card,border:`1px solid ${mealType===t?C.accent:C.cardBorder}`,borderRadius:20,color:"white",padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:mealType===t?700:400}}>{t}</button>
        ))}
      </div>
      <div style={{display:"flex",background:C.card,borderRadius:12,padding:4,marginBottom:14,border:`1px solid ${C.cardBorder}`,gap:3}}>
        {[["db","Database"],["recipes","Miei piatti"],["custom","Manuale"]].map(([k,l])=>(
          <button key={k} onClick={()=>setLogMode(k)} style={{flex:1,background:logMode===k?C.accent:"transparent",border:"none",borderRadius:9,color:"white",padding:"8px 4px",fontSize:12,cursor:"pointer",fontWeight:logMode===k?700:400}}>{l}</button>
        ))}
      </div>

      {logMode==="db"&&(
        <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca alimento..." style={{...inp,marginBottom:10}}/>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12}}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>{setActiveCategory(cat);setSearch("");}} style={{background:activeCategory===cat&&!search?C.accent:C.card,border:`1px solid ${activeCategory===cat&&!search?C.accent:C.cardBorder}`,borderRadius:20,color:"white",padding:"5px 12px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",fontWeight:activeCategory===cat&&!search?700:400}}>{cat}</button>
            ))}
          </div>
          {search&&<div style={{color:C.muted,fontSize:12,marginBottom:8}}>{filteredFoods.length} risultati</div>}
          <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:440,overflowY:"auto"}}>
            {filteredFoods.length===0?<p style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Nessun alimento trovato</p>
            :filteredFoods.map((f,i)=>(
              <div key={i} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:10,display:"flex",alignItems:"center",overflow:"hidden",minHeight:42}}>
                <button onClick={()=>addFood(f)} style={{flex:1,background:"none",border:"none",color:C.text,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left",minWidth:0}}>
                  <div style={{flex:1,minWidth:0,paddingRight:8}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>P {f.p}g · C {f.c}g · G {f.f}g</div>
                  </div>
                  <span style={{color:C.accent,fontWeight:700,fontSize:13,flexShrink:0}}>{f.kcal}</span>
                </button>
                <button onClick={()=>setFavorites(p=>p.includes(f.name)?p.filter(n=>n!==f.name):[...p,f.name])} style={{background:"none",border:"none",borderLeft:`1px solid ${C.cardBorder}`,color:favorites.includes(f.name)?C.gold:C.muted,fontSize:16,padding:"0 12px",cursor:"pointer",alignSelf:"stretch",display:"flex",alignItems:"center",flexShrink:0}}>
                  {favorites.includes(f.name)?"★":"☆"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {logMode==="recipes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>setScreen("builder")} style={{background:"#F4845F11",border:`2px dashed ${C.accent}`,borderRadius:14,color:C.accent,padding:14,fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Crea nuovo piatto</button>
          {customRecipes.length===0?<p style={{color:C.muted,textAlign:"center",fontSize:13,marginTop:20}}>Nessun piatto salvato ancora.</p>
          :customRecipes.map((r,i)=>(
            <button key={i} onClick={()=>addFood(r)} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:12,color:C.text,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>{r.name}</div><div style={{fontSize:11,color:C.muted}}>P {r.p}g · C {r.c}g · G {r.f}g</div></div>
              <span style={{color:C.accent,fontWeight:700,fontSize:14}}>{r.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}

      {logMode==="custom"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["name","Nome","text"],["kcal","Calorie (kcal)","number"],["p","Proteine (g)","number"],["c","Carboidrati (g)","number"],["f","Grassi (g)","number"]].map(([k,label,type])=>(
            <div key={k}>
              <label style={{color:C.muted,fontSize:13,display:"block",marginBottom:4}}>{label}</label>
              <input type={type} value={customFood[k]} onChange={e=>setCustomFood(p=>({...p,[k]:e.target.value}))} placeholder={label} style={inp}/>
            </div>
          ))}
          <button onClick={addCustomFood} style={{background:C.accent,border:"none",borderRadius:12,color:"white",padding:13,fontSize:15,fontWeight:700,cursor:"pointer"}}>Aggiungi</button>
        </div>
      )}
    </div>
  );

  // ── HISTORY ──────────────────────────────────────────────────────────────────
  if(screen==="history"){
    const days=Object.entries(dailyLog).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button onClick={()=>setScreen("home")} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.text,padding:"8px 14px",cursor:"pointer",fontSize:14}}>← Indietro</button>
          <h2 style={{color:C.text,margin:0,fontSize:18,fontWeight:700}}>Storico</h2>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
          <div><div style={{color:C.gold,fontSize:22,fontWeight:800}}>🔥 {streak}</div><div style={{color:C.muted,fontSize:11}}>streak</div></div>
          <div><div style={{color:C.accent,fontSize:22,fontWeight:800}}>{weekAvg}</div><div style={{color:C.muted,fontSize:11}}>media kcal</div></div>
          <div><div style={{color:C.green,fontSize:22,fontWeight:800}}>{days.length}</div><div style={{color:C.muted,fontSize:11}}>giorni log</div></div>
        </div>
        {days.length===0?<p style={{color:C.muted,textAlign:"center",marginTop:60}}>Nessun dato ancora.</p>
        :days.map(([date,data])=>{
          const kcal=data.meals.reduce((s,m)=>s+m.kcal,0);
          const r=kcal/gKcal;
          return(
            <div key={date} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:"12px 16px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{color:C.text,fontWeight:600,fontSize:14}}>{date===today?"Oggi":new Date(date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"})}</span>
                <span style={{color:r>=0.85&&r<=1.1?C.green:C.accent,fontWeight:700,fontSize:14}}>{kcal} kcal</span>
              </div>
              <div style={{height:5,background:"#0F0A1A",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(r*100,100)}%`,background:r>=0.85&&r<=1.1?C.green:C.accent,borderRadius:3}}/>
              </div>
              <div style={{color:C.muted,fontSize:11,marginTop:5}}>{data.meals.length} pasti</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────────
  if(screen==="settings") return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",padding:"20px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>setScreen("home")} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.text,padding:"8px 14px",cursor:"pointer",fontSize:14}}>← Indietro</button>
        <h2 style={{color:C.text,margin:0,fontSize:18,fontWeight:700}}>Impostazioni</h2>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:20,marginBottom:14}}>
        <label style={{color:C.muted,fontSize:13,display:"block",marginBottom:6}}>Nome della volpe</label>
        <input value={foxName} onChange={e=>setFoxName(e.target.value)} style={inp}/>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:20,marginBottom:14}}>
        <p style={{color:C.muted,fontSize:13,margin:"0 0 8px"}}>Profilo fisico</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[["weight","Peso (kg)"],["height","Altezza (cm)"],["age","Eta"]].map(([k,l])=>(
            <div key={k}>
              <label style={{color:C.muted,fontSize:12,display:"block",marginBottom:4}}>{l}</label>
              <input type="number" value={profile[k]} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))} style={inp}/>
            </div>
          ))}
          <div>
            <label style={{color:C.muted,fontSize:12,display:"block",marginBottom:4}}>Sesso</label>
            <div style={{display:"flex",gap:6}}>
              {[["M","M"],["F","F"]].map(([v,l])=>(
                <button key={v} onClick={()=>setProfile(p=>({...p,sex:v}))} style={{flex:1,background:profile.sex===v?C.accent:"#0F0A1A",border:`1px solid ${profile.sex===v?C.accent:C.cardBorder}`,borderRadius:8,color:"white",padding:9,fontSize:13,cursor:"pointer"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <label style={{color:C.muted,fontSize:12,display:"block",marginBottom:6}}>Attivita</label>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {[["sedentario","Sedentario"],["leggero","Leggero"],["moderato","Moderato"],["attivo","Attivo"]].map(([v,l])=>(
            <button key={v} onClick={()=>setProfile(p=>({...p,activity:v}))} style={{background:profile.activity===v?"#F4845F22":"#0F0A1A",border:`1px solid ${profile.activity===v?C.accent:C.cardBorder}`,borderRadius:9,color:C.text,padding:"8px 12px",fontSize:13,cursor:"pointer",textAlign:"left",fontWeight:profile.activity===v?700:400}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:20,marginBottom:14}}>
        <p style={{color:C.muted,fontSize:13,margin:"0 0 10px"}}>Obiettivo</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Object.entries(GOALS).map(([k,g])=>(
            <button key={k} onClick={()=>setGoalKey(k)} style={{background:goalKey===k?"#F4845F22":"#0F0A1A",border:`2px solid ${goalKey===k?C.accent:C.cardBorder}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span>{g.emoji}</span><span style={{fontWeight:600}}>{g.label}</span>
              {goalKey===k&&<span style={{marginLeft:"auto",color:C.accent}}>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <button onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){localStorage.clear();window.location.reload();}}} style={{width:"100%",background:"#C0392B22",border:"1px solid #C0392B",borderRadius:12,color:"#C0392B",padding:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancella tutti i dati</button>
    </div>
  );

  // ── HOME ──────────────────────────────────────────────────────────────────────
  const moodLabels={happy:"Soddisfatta",excited:"Euforica!",neutral:"Tranquilla",sad:"Ho fame..."};
  const moodEmoji ={happy:"😊",excited:"🤩",neutral:"😌",sad:"😟"};
  const hungerColor=foxState.hunger>70?C.accent:foxState.hunger>40?C.gold:C.green;
  const energyColor=foxState.energy>60?C.green:foxState.energy>30?C.gold:C.accent;
  const happinessColor=(foxState.happiness??70)>60?C.green:(foxState.happiness??70)>30?C.gold:C.accent;
  const reactionColors={happy:C.green,energetic:C.gold,neutral:C.purple,sad:C.accent};

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif",maxWidth:420,margin:"0 auto",padding:"16px 16px 100px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{color:C.muted,fontSize:12}}>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{color:C.text,fontSize:18,fontWeight:800}}>NutriFox</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}`,borderRadius:20,padding:"4px 12px",fontSize:12,color:C.gold,fontWeight:700}}>🔥 {streak}</div>
          <button onClick={()=>setScreen("settings")} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.muted,padding:"8px 10px",cursor:"pointer",fontSize:16}}>⚙️</button>
        </div>
      </div>

      {/* FOX CARD — central and dominant: lo stato emotivo è ora il focus primario */}
      <div style={{background:`linear-gradient(160deg,${C.card} 0%,#120D20 100%)`,border:`1px solid ${stage.aura?C.gold:C.cardBorder}`,borderRadius:28,padding:"20px 16px",marginBottom:14,textAlign:"center",position:"relative",overflow:"hidden"}}>
        {/* background glow */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:200,height:200,background:`radial-gradient(circle,${stage.color}18 0%,transparent 70%)`,pointerEvents:"none"}}/>

        <div style={{position:"absolute",top:14,right:16,background:`${stage.color}22`,border:`1px solid ${stage.color}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:stage.color,fontWeight:700}}>{stage.name}</div>

        {/* Fox + reaction popup + feed label */}
        <div style={{position:"relative",display:"inline-block"}}>
          <Fox mood={mood} streak={streak} size={160} bounce={bounce}/>
          {feedLabel&&(
            <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${C.accent},#E8553F)`,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:700,color:"white",whiteSpace:"nowrap",animation:"floatUp 2s ease-out forwards",boxShadow:`0 4px 16px ${C.accent}55`}}>
              {feedLabel}
            </div>
          )}
          {/* Reaction popup — feedback emotivo dopo ogni pasto, 2-3s */}
          {reaction&&(
            <div style={{position:"absolute",top:-38,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1.5px solid ${reactionColors[reaction.type]||C.purple}`,borderRadius:16,padding:"6px 14px",fontSize:12,fontWeight:600,color:reactionColors[reaction.type]||C.purple,whiteSpace:"nowrap",animation:"reactionPop 2.5s ease-out forwards",boxShadow:`0 4px 14px #00000055`,zIndex:5}}>
              {reaction.message}
            </div>
          )}
        </div>

        {/* Stato emotivo — ora elemento centrale, più evidente del tracker calorico */}
        <div style={{color:C.text,fontWeight:700,fontSize:16,marginTop:4}}>{foxName}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:12}}>
          <span style={{fontSize:18}}>{moodEmoji[mood]||"😌"}</span>
          <span style={{color:stage.color,fontSize:14,fontWeight:700}}>{moodLabels[mood]||"Tranquilla"}</span>
        </div>
        <button onClick={()=>setScreen("coach")} style={{background:`linear-gradient(135deg,${C.purple}33,${C.purple}11)`,border:`1px solid ${C.purple}55`,borderRadius:20,color:C.purple,padding:"6px 18px",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:14,transition:"all 0.2s"}}>
          Parla con {foxName} ✨
        </button>

        {/* Fox stats — ora 3 barre: fame, energia, felicità */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <StatBar label="Fame" value={foxState.hunger} color={hungerColor} icon="🍽️"/>
          <StatBar label="Energia" value={foxState.energy} color={energyColor} icon="⚡"/>
          <StatBar label="Felicità" value={foxState.happiness??70} color={happinessColor} icon="💖"/>
        </div>

        {/* Streak progress */}
        {streak<30&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
              <span>{stage.name}</span>
              <span>{streak<7?"→ Giovane ("+streak+"/7)":streak<14?"→ Adulta ("+streak+"/14)":"→ Leggendaria ("+streak+"/30)"}</span>
            </div>
            <div style={{height:4,background:"#0F0A1A",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${streak<7?(streak/7)*100:streak<14?((streak-7)/7)*100:((streak-14)/16)*100}%`,background:stage.color,borderRadius:2,transition:"width 0.5s"}}/>
            </div>
          </div>
        )}
        {streak>=30&&<div style={{color:C.gold,fontSize:12,fontWeight:700}}>Hai raggiunto il massimo!</div>}
      </div>

      {/* Calorie card — peso visivo leggermente ridotto, la volpe resta il focus */}
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:"13px 16px",marginBottom:14,opacity:0.92}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{color:C.muted,fontSize:10,marginBottom:1}}>Calorie oggi</div>
            <div style={{color:C.text,fontSize:21,fontWeight:700}}>{totalKcal}<span style={{color:C.muted,fontSize:12,fontWeight:400}}> / {gKcal}</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.muted,fontSize:10}}>{GOALS[goalKey].emoji} {GOALS[goalKey].label}</div>
            <div style={{color:totalKcal>gKcal?C.accent:C.green,fontSize:12,fontWeight:600}}>{totalKcal>gKcal?"+"+(totalKcal-gKcal)+" kcal":(gKcal-totalKcal)+" rimaste"}</div>
          </div>
        </div>
        <div style={{height:6,background:"#0F0A1A",borderRadius:3,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",width:`${Math.min((totalKcal/gKcal)*100,100)}%`,background:`linear-gradient(90deg,${C.accent},${C.gold})`,borderRadius:3,transition:"width 0.5s"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {[["P",totalP,C.purple],["C",totalC,C.gold],["G",totalF,C.accent]].map(([l,v,col])=>(
            <div key={l} style={{background:"#0F0A1A",borderRadius:8,padding:"5px 8px",textAlign:"center"}}>
              <div style={{color:col,fontSize:13,fontWeight:700}}>{Math.round(v)}g</div>
              <div style={{color:C.muted,fontSize:9}}>{l==="P"?"Proteine":l==="C"?"Carb.":"Grassi"}</div>
            </div>
          ))}
        </div>
        {weekAvg>0&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.cardBorder}`,display:"flex",justifyContent:"space-between"}}><span style={{color:C.muted,fontSize:12}}>Media settimana</span><span style={{color:C.purple,fontSize:12,fontWeight:700}}>{weekAvg} kcal/giorno</span></div>}
      </div>

      {/* Water */}
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{color:C.text,fontWeight:700,fontSize:14}}>Acqua 💧</span>
          <span style={{color:water>=targetWater?C.green:C.muted,fontSize:12,fontWeight:600}}>{water}/{targetWater} bicchieri</span>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
          {Array.from({length:targetWater},(_,i)=>(
            <button key={i} onClick={()=>setWater(i<water?i:i+1)} style={{fontSize:18,background:"none",border:"none",cursor:"pointer",padding:1,opacity:i<water?1:0.2,transition:"opacity 0.2s"}}>💧</button>
          ))}
        </div>
        <div style={{height:4,background:"#0F0A1A",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min((water/targetWater)*100,100)}%`,background:`linear-gradient(90deg,${C.blue},#38BDF8)`,borderRadius:2,transition:"width 0.4s"}}/>
        </div>
      </div>

      {/* Meals */}
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{color:C.text,fontWeight:700,fontSize:14}}>Pasti oggi</span>
          <span style={{color:C.muted,fontSize:12}}>{todayData.meals.length} loggati</span>
        </div>
        {todayData.meals.length===0?(
          <p style={{color:C.muted,fontSize:13,textAlign:"center",padding:"10px 0",margin:0}}>{foxName} aspetta il primo pasto!</p>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:220,overflowY:"auto"}}>
            {todayData.meals.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0F0A1A",borderRadius:7,padding:"6px 10px"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:C.text,fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                  <div style={{color:C.muted,fontSize:10}}>{m.meal} · {m.time}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:8,flexShrink:0}}>
                  <span style={{color:C.accent,fontWeight:700,fontSize:12}}>{m.kcal}</span>
                  <button onClick={()=>removeFood(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:C.card,borderTop:`1px solid ${C.cardBorder}`,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"10px 0 22px"}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:screen==="home"?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10}}>
          <span style={{fontSize:20}}>🏠</span>Home
        </button>
        <button onClick={()=>setScreen("log")} style={{background:`linear-gradient(135deg,${C.accent},#E8553F)`,border:"none",borderRadius:"50%",width:54,height:54,color:"white",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${C.accent}66`}}>+</button>
        <button onClick={()=>setScreen("history")} style={{background:"none",border:"none",color:screen==="history"?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10}}>
          <span style={{fontSize:20}}>📅</span>Storico
        </button>
        <button onClick={()=>setScreen("coach")} style={{background:"none",border:"none",color:screen==="coach"?C.purple:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10}}>
          <span style={{fontSize:20}}>🦊</span>Coach
        </button>
      </div>
    </div>
  );
}

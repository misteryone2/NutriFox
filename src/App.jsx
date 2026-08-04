import { useState, useMemo, memo } from "react";
import Fox from "./Fox";
import { useNutriFox, GOALS, sumMacros } from "./useNutriFox";
import { FOOD_DB, ALL_FOODS } from "./FoodDB";
 
// ─────────────────────────────────────────────────────────────────────────────
// App.jsx — v1.4.1
//
// Release di consolidamento: App.jsx non contiene più logica di business.
// Tutta la gestione di pasti, idratazione, statistiche, dialoghi, memoria
// della volpe e calcoli nutrizionali vive in useNutriFox.js. Questo file
// resta responsabile solo di: navigazione tra schermate, stato dei form
// (input non ancora confermati), e rendering.
//
// v1.9: due aggiunte UI, nessun cambio di architettura. Impostazioni: target
// personalizzato opzionale (calorie/macro) che sovrascrive il calcolo
// automatico nel profilo unificato. Builder: selettore pasto + pulsante
// "Suggerisci pasto" che chiama il nuovo motore suggestMealFor e mostra il
// "Perché questo?" prima di accettare gli ingredienti proposti. La card Coach
// in home mostra ora anche i traguardi settimanali, accanto a quelli
// giornalieri già esistenti.
//
// v1.9.2: il riquadro "Suggerimento intelligente" diventa iterativo. Ogni
// ingrediente ha un tasto blocca (🔒/🔓, resta invariato con "Rigenera") e un
// tasto sostituisci (🔄, cambia solo quel singolo ingrediente). "Rigenera
// proposta" ricompone l'intero pasto rispettando i blocchi ed evitando gli
// alimenti già mostrati in questa sessione — la logica di esclusione vive
// interamente in useNutriFox.js, qui solo lo stato locale di sessione
// (builderLocked/builderShownNames) e il rendering.
//
// v2.0: foxState diventa un oggetto strutturato (Fox Engine in useNutriFox.js)
// invece di un insieme di variabili sciolte (hunger/energy/happiness/
// lastFedAt). App.jsx legge ora foxState.emotion.hunger/happiness e
// foxState.behavior.lastFedAt — stessa UI, stesso comportamento, solo i
// percorsi dei campi sono cambiati.
//
// v2.1: behaviorState (Behavior Engine) passato a <Fox> insieme a
// relationship/trust — nessun'altra modifica a questo file: la logica
// comportamentale vive interamente in useNutriFox.js/Fox.jsx/FoxBrain.js.
//
// v2.2: decisionState (Decision Engine) passato a <Fox> — stessa logica,
// nessun'altra modifica a questo file.
// ─────────────────────────────────────────────────────────────────────────────
 
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
 
// ─── HUNGER/ENERGY BAR ────────────────────────────────────────────────────────
const StatBar = memo(function StatBar({ label, value, color, icon }) {
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
});
 
// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function NutriFox() {
  const nf = useNutriFox();
  const {
    setupDone, setSetupDone, foxName, setFoxName, goalKey, setGoalKey, profile, setProfile,
    dailyLog, favorites, customRecipes, water, setWater,
    aiMessages, aiInput, setAiInput, aiLoading, askFox, chatEndRef,
    foxState, bounce, feedLabel, reaction, reward, licking, specialEmotion, behaviorState, decisionState,
    today, todayData, streak, stage, mood, contextualMessage,
    totalKcal, totalP, totalC, totalF, gKcal, targetWater, weekAvg,
    insights, suggestPortion, suggestMealFor, substituteMealIngredientFor,
    categories, getPool,
    addFood, addCustomFood, removeFood, saveRecipe, toggleFavorite,
  } = nf;
 
  // Navigazione + stato dei form (UI-local, non persistito, non business logic)
  const [screen,    setScreen]    = useState("home");
  const [tempName,  setTempName]  = useState("Foxy");
  const [tempGoal,  setTempGoal]  = useState("mangiare_meglio");
  const [search,    setSearch]    = useState("");
  const [activeCategory, setActiveCategory] = useState("Recenti");
  const [mealType,  setMealType]  = useState("Pranzo");
  const [logMode,   setLogMode]   = useState("db");
  const [customFood,setCustomFood]= useState({name:"",kcal:"",p:"",c:"",f:""});
  const [builderName,setBuilderName]=useState("");
  const [builderIngredients,setBuilderIngredients]=useState([]);
  const [builderSearch,setBuilderSearch]=useState("");
  const [builderCategory,setBuilderCategory]=useState("Tutti");
  const [builderMealType,setBuilderMealType]=useState("Pranzo");
  const [builderSuggestion,setBuilderSuggestion]=useState(null);
  const [builderLocked,setBuilderLocked]=useState({});      // { main:true, carb:false, side:true }
  const [builderShownNames,setBuilderShownNames]=useState([]); // nomi già proposti in questa sessione
 
  const inp={width:"100%",background:"#0F0A1A",border:"1px solid #2D1F45",borderRadius:10,color:C.text,padding:"10px 14px",fontSize:15,boxSizing:"border-box"};
 
  // Liste filtrate: memoizzate così non si ricalcolano ad ogni render (es.
  // quando cambia solo il popup di reazione dopo un pasto, o durante il decay).
  const pool=getPool(activeCategory);
  const filteredFoods=useMemo(
    ()=>search?ALL_FOODS.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())):pool,
    [search,pool,ALL_FOODS]
  );
  const bPool=builderCategory==="Tutti"?ALL_FOODS:(FOOD_DB[builderCategory]||[]);
  const filteredBuilder=useMemo(
    ()=>builderSearch?ALL_FOODS.filter(f=>f.name.toLowerCase().includes(builderSearch.toLowerCase())):bPool,
    [builderSearch,bPool,ALL_FOODS]
  );
  const builderTotals = useMemo(()=>sumMacros(builderIngredients),[builderIngredients]);
  const bKcal=builderTotals.kcal, bP=builderTotals.p, bC=builderTotals.c, bF=builderTotals.f;
 
  // Messaggi di validazione per i form (mancavano in v1.4.1: cliccare "Aggiungi"
  // o "Salva piatto" senza compilare i campi non dava alcun feedback visibile).
  const [customFoodError, setCustomFoodError] = useState("");
  const [recipeError, setRecipeError] = useState("");
 
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
            style={{flex:1,background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:12,color:C.text,padding:"11px 14px",fontSize:14}}
          />
          <button onClick={()=>askFox(aiInput)} disabled={aiLoading||!aiInput.trim()} aria-label="Invia messaggio"
            style={{background:aiLoading||!aiInput.trim()?"#2D1F45":`linear-gradient(135deg,${C.accent},#E8553F)`,border:"none",borderRadius:12,color:"white",padding:"11px 16px",fontSize:16,cursor:aiLoading?"not-allowed":"pointer",flexShrink:0,transition:"all 0.2s"}}>
            {aiLoading?"...":"➤"}
          </button>
        </div>
        <div style={{color:C.muted,fontSize:10,textAlign:"center",marginTop:6}}>Powered by Claude · I dati rimangono sul tuo dispositivo</div>
      </div>
 
      <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}@keyframes floatUp{0%{transform:translateX(-50%) translateY(0);opacity:1}100%{transform:translateX(-50%) translateY(-30px);opacity:0}}@keyframes reactionPop{0%{transform:translateX(-50%) translateY(6px) scale(0.9);opacity:0}15%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}80%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}100%{transform:translateX(-50%) translateY(-10px) scale(0.95);opacity:0}}@keyframes rewardPop{0%{transform:translateX(-50%) scale(0.4) rotate(-10deg);opacity:0}25%{transform:translateX(-50%) scale(1.3) rotate(8deg);opacity:1}45%{transform:translateX(-50%) scale(1) rotate(-4deg);opacity:1}100%{transform:translateX(-50%) translateY(-26px) scale(0.9) rotate(0deg);opacity:0}}@keyframes rewardShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-2px)}40%{transform:translateX(2px)}60%{transform:translateX(-1.5px)}80%{transform:translateX(1.5px)}}.reward-shake{animation:rewardShake 0.4s ease-in-out 2}`}</style>
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
        <div style={{background:`linear-gradient(160deg,${C.purple}18,${C.card})`,border:`1px solid ${C.purple}44`,borderRadius:16,padding:16,marginBottom:14}}>
          <div style={{color:C.purple,fontWeight:700,fontSize:13,marginBottom:8}}>🧠 Suggerimento intelligente</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {["Colazione","Pranzo","Cena","Spuntino"].map(t=>(
              <button key={t} onClick={()=>{setBuilderMealType(t);setBuilderSuggestion(null);setBuilderLocked({});setBuilderShownNames([]);}} style={{background:builderMealType===t?C.purple:C.bg,border:`1px solid ${builderMealType===t?C.purple:C.cardBorder}`,borderRadius:20,color:"white",padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:builderMealType===t?700:400}}>{t}</button>
            ))}
          </div>
          <button onClick={()=>{
            const s=suggestMealFor(builderMealType);
            setBuilderSuggestion(s);
            setBuilderLocked({});
            setBuilderShownNames(s?s.items.map(f=>f.name):[]);
          }} style={{width:"100%",background:C.purple,border:"none",borderRadius:10,color:"#0F0A1A",padding:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Suggerisci pasto per {builderMealType.toLowerCase()}
          </button>
          {builderSuggestion&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
                {builderSuggestion.items.map((f,i)=>{
                  const locked = !!builderLocked[f._slot];
                  return (
                    <div key={i} style={{background:"#0F0A1A",borderRadius:8,padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <div style={{fontSize:12,color:C.text,flex:1,minWidth:0}}>
                        <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                        {f.portionLabel&&<div style={{color:C.muted,fontSize:10}}>{f.portionLabel}</div>}
                      </div>
                      <span style={{color:C.accent,fontSize:12,fontWeight:700,flexShrink:0}}>{f.dispKcal} kcal</span>
                      <button onClick={()=>setBuilderLocked(p=>({...p,[f._slot]:!p[f._slot]}))} aria-label={locked?"Sblocca ingrediente":"Blocca ingrediente"} title={locked?"Sblocca":"Blocca (non cambierà con Rigenera)"} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,flexShrink:0,opacity:locked?1:0.4}}>{locked?"🔒":"🔓"}</button>
                      <button onClick={()=>{
                        const updated=substituteMealIngredientFor(builderSuggestion, f._slot, builderShownNames);
                        setBuilderSuggestion(updated);
                        setBuilderShownNames(p=>[...p, ...updated.items.map(x=>x.name)]);
                      }} disabled={locked} aria-label={`Sostituisci ${f.name}`} title="Sostituisci questo ingrediente" style={{background:"none",border:"none",cursor:locked?"not-allowed":"pointer",fontSize:14,flexShrink:0,opacity:locked?0.25:0.8}}>🔄</button>
                    </div>
                  );
                })}
              </div>
              <p style={{color:C.muted,fontSize:11,lineHeight:1.4,fontStyle:"italic",margin:"0 0 10px"}}>Perché questo? {builderSuggestion.reason}</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{
                  const lockedFoods={};
                  builderSuggestion.items.forEach(f=>{ if(builderLocked[f._slot]) lockedFoods[f._slot]=f; });
                  const carryNames = builderSuggestion.items.filter(f=>!builderLocked[f._slot]).map(f=>f.name);
                  const s=suggestMealFor(builderMealType, { excludeNames:[...builderShownNames,...carryNames], lockedFoods });
                  setBuilderSuggestion(s);
                  setBuilderShownNames(p=>[...p, ...(s?s.items.map(f=>f.name):[])]);
                }} style={{flex:1,background:C.bg,border:`1px solid ${C.purple}`,borderRadius:9,color:C.purple,padding:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  🔁 Rigenera proposta
                </button>
                <button onClick={()=>{
                  setBuilderIngredients(p=>[...p,...builderSuggestion.items.map(f=>({ name:f.name, kcal:f.dispKcal, p:f.dispP, c:f.dispC, f:f.dispF, type:f.type, portionLabel:f.portionLabel }))]);
                  setBuilderSuggestion(null);
                  setBuilderLocked({});
                  setBuilderShownNames([]);
                }} style={{flex:1,background:C.green,border:"none",borderRadius:9,color:"#0F0A1A",padding:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  Usa questi ingredienti
                </button>
              </div>
            </div>
          )}
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
                  <button onClick={()=>{const a=[...builderIngredients];a.splice(i,1);setBuilderIngredients(a);}} aria-label={`Rimuovi ${ing.name}`} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              </div>
            ))}
            <button
              onClick={()=>{
                if(!builderName.trim()){ setRecipeError("Dai un nome al piatto prima di salvarlo"); return; }
                if(saveRecipe(builderName, builderIngredients)){
                  setBuilderName(""); setBuilderIngredients([]); setBuilderSearch(""); setRecipeError(""); setScreen("log");
                }
              }}
              style={{width:"100%",background:C.green,border:"none",borderRadius:10,color:"#0F0A1A",padding:11,fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>
              Salva piatto
            </button>
            {recipeError&&<p role="alert" style={{color:C.accent,fontSize:12,textAlign:"center",marginTop:8,marginBottom:0}}>{recipeError}</p>}
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
            :filteredFoods.map((f,i)=>{
              const portion = suggestPortion(f, mealType);
              return(
              <div key={i} style={{background:"#0F0A1A",border:`1px solid ${C.cardBorder}`,borderRadius:10,display:"flex",alignItems:"center",overflow:"hidden",minHeight:42}}>
                <button
                  onClick={()=>{ addFood(f, mealType); setSearch(""); setScreen("home"); }}
                  style={{flex:1,background:"none",border:"none",color:C.text,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left",minWidth:0}}>
                  <div style={{flex:1,minWidth:0,paddingRight:8}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>P {f.p}g · C {f.c}g · G {f.f}g{portion&&portion.ratio!==1?` · ${portion.label}`:""}</div>
                  </div>
                  <span style={{color:C.accent,fontWeight:700,fontSize:13,flexShrink:0}}>{f.kcal}</span>
                </button>
                <button onClick={()=>toggleFavorite(f.name)} aria-label={favorites.includes(f.name)?`Rimuovi ${f.name} dai preferiti`:`Aggiungi ${f.name} ai preferiti`} aria-pressed={favorites.includes(f.name)} style={{background:"none",border:"none",borderLeft:`1px solid ${C.cardBorder}`,color:favorites.includes(f.name)?C.gold:C.muted,fontSize:16,padding:"0 12px",cursor:"pointer",alignSelf:"stretch",display:"flex",alignItems:"center",flexShrink:0}}>
                  {favorites.includes(f.name)?"★":"☆"}
                </button>
              </div>
              );
            })}
          </div>
        </>
      )}
 
      {logMode==="recipes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>setScreen("builder")} style={{background:"#F4845F11",border:`2px dashed ${C.accent}`,borderRadius:14,color:C.accent,padding:14,fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Crea nuovo piatto</button>
          {customRecipes.length===0?<p style={{color:C.muted,textAlign:"center",fontSize:13,marginTop:20}}>Nessun piatto salvato ancora.</p>
          :customRecipes.map((r,i)=>{
            const portion = suggestPortion(r, mealType);
            return(
            <button
              key={i}
              onClick={()=>{ addFood(r, mealType); setSearch(""); setScreen("home"); }}
              style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:12,color:C.text,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>{r.name}</div><div style={{fontSize:11,color:C.muted}}>P {r.p}g · C {r.c}g · G {r.f}g{portion&&portion.ratio!==1?` · ${portion.label}`:""}</div></div>
              <span style={{color:C.accent,fontWeight:700,fontSize:14}}>{r.kcal} kcal</span>
            </button>
            );
          })}
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
          <button
            onClick={()=>{
              if(!customFood.name.trim()||!customFood.kcal){ setCustomFoodError("Servono almeno nome e calorie"); return; }
              if(addCustomFood(customFood, mealType)){
                setCustomFood({name:"",kcal:"",p:"",c:"",f:""}); setCustomFoodError(""); setSearch(""); setScreen("home");
              }
            }}
            style={{background:C.accent,border:"none",borderRadius:12,color:"white",padding:13,fontSize:15,fontWeight:700,cursor:"pointer"}}>
            Aggiungi
          </button>
          {customFoodError&&<p role="alert" style={{color:C.accent,fontSize:12,textAlign:"center",margin:0}}>{customFoodError}</p>}
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
        {insights.trend&&(
          <div style={{background:`${C.purple}18`,border:`1px solid ${C.purple}44`,borderRadius:14,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.text,display:"flex",alignItems:"center",gap:8}}>
            <span>{insights.trend.direction==="up"?"📈":insights.trend.direction==="down"?"📉":"➡️"}</span>
            <span>Trend ultimi {insights.trend.daysLogged} giorni: {insights.trend.direction==="up"?"in aumento":insights.trend.direction==="down"?"in calo":"stabile"} (~{insights.trend.avg} kcal/giorno)</span>
          </div>
        )}
        {days.length===0?<p style={{color:C.muted,textAlign:"center",marginTop:60}}>Nessun dato ancora.</p>
        :days.map(([date,data])=>{
          const kcal=sumMacros(data.meals).kcal;
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
      <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:20,marginBottom:14}}>
        <p style={{color:C.muted,fontSize:13,margin:"0 0 4px"}}>Target personalizzato (opzionale)</p>
        <p style={{color:C.muted,fontSize:11,margin:"0 0 10px",lineHeight:1.4}}>Se lo lasci vuoto, calorie e macro restano calcolati in automatico dal tuo profilo e obiettivo.</p>
        <label style={{color:C.muted,fontSize:12,display:"block",marginBottom:4}}>Calorie giornaliere</label>
        <input type="number" value={profile.customKcal||""} placeholder={`Automatico (${gKcal})`} onChange={e=>setProfile(p=>({...p,customKcal:e.target.value}))} style={{...inp,marginBottom:10}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["proteinTargetG","Prot. (g)"],["carbTargetG","Carb. (g)"],["fatTargetG","Grassi (g)"]].map(([k,l])=>(
            <div key={k}>
              <label style={{color:C.muted,fontSize:11,display:"block",marginBottom:4}}>{l}</label>
              <input type="number" value={profile.customMacros?.[k]||""} onChange={e=>setProfile(p=>({...p,customMacros:{...p.customMacros,[k]:e.target.value}}))} style={inp}/>
            </div>
          ))}
        </div>
      </div>
      <button onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){localStorage.clear();window.location.reload();}}} style={{width:"100%",background:"#C0392B22",border:"1px solid #C0392B",borderRadius:12,color:"#C0392B",padding:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancella tutti i dati</button>
    </div>
  );
 
  // ── HOME ──────────────────────────────────────────────────────────────────────
  const moodLabels={happy:"Soddisfatta",excited:"Euforica!",content:"Serena",neutral:"Tranquilla",sad:"Ho fame...",proud:"Orgogliosa!",curious:"Curiosa"};
  const moodEmoji ={happy:"😊",excited:"🤩",content:"🙂",neutral:"😌",sad:"😟",proud:"🏆",curious:"🤔"};
  // v1.8: se il motore ha richiesto un'emozione speciale, l'etichetta la segue —
  // niente più disallineamento tra volto (proud/curious) e testo sotto il nome.
  const displayMood = specialEmotion || mood;
  const hungerColor=foxState.emotion.hunger>70?C.accent:foxState.emotion.hunger>40?C.gold:C.green;
  const energyColor=foxState.energy>60?C.green:foxState.energy>30?C.gold:C.accent;
  const happinessColor=foxState.emotion.happiness>60?C.green:foxState.emotion.happiness>30?C.gold:C.accent;
  const reactionColors={happy:C.green,energetic:C.gold,neutral:C.purple,sad:C.accent,relieved:C.blue};
 
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
          <button onClick={()=>setScreen("settings")} aria-label="Impostazioni" style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,color:C.muted,padding:"8px 10px",cursor:"pointer",fontSize:16}}>⚙️</button>
        </div>
      </div>
 
      {/* FOX CARD — central and dominant: lo stato emotivo è ora il focus primario */}
      <div className={reward?"reward-shake":""} style={{background:`linear-gradient(160deg,${C.card} 0%,#120D20 100%)`,border:`1px solid ${stage.aura?C.gold:C.cardBorder}`,borderRadius:28,padding:"20px 16px",marginBottom:14,textAlign:"center",position:"relative",overflow:"hidden"}}>
        {/* background glow */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:200,height:200,background:`radial-gradient(circle,${stage.color}18 0%,transparent 70%)`,pointerEvents:"none"}}/>
 
        <div style={{position:"absolute",top:14,right:16,background:`${stage.color}22`,border:`1px solid ${stage.color}`,borderRadius:20,padding:"3px 10px",fontSize:11,color:stage.color,fontWeight:700}}>{stage.name}</div>
 
        {/* Effetto ricompensa — meno di 2s, sopra tutta la card */}
        {reward&&(
          <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",fontSize:30,animation:"rewardPop 1.7s ease-out forwards",pointerEvents:"none",zIndex:6}}>
            {reward.icon}
          </div>
        )}
 
        {/* Fox + reaction popup + feed label */}
        <div style={{position:"relative",display:"inline-block"}}>
          <Fox mood={mood} streak={streak} size={160} bounce={bounce} lastFedAt={foxState.behavior.lastFedAt} licking={licking} specialEmotion={specialEmotion} relationship={foxState.relationship} trust={foxState.trust} behaviorState={behaviorState} decisionState={decisionState}/>
          {feedLabel&&(
            <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${C.accent},#E8553F)`,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:700,color:"white",whiteSpace:"nowrap",animation:"floatUp 2s ease-out forwards",boxShadow:`0 4px 16px ${C.accent}55`}}>
              {feedLabel}
            </div>
          )}
          {/* Reaction popup — feedback emotivo dopo ogni pasto, 2-3s */}
          {reaction&&(
            <div style={{position:"absolute",top:-38,left:"50%",transform:"translateX(-50%)",background:C.card,border:`1.5px solid ${reactionColors[reaction.type]||C.purple}`,borderRadius:16,padding:"6px 14px",fontSize:12,fontWeight:600,color:reactionColors[reaction.type]||C.purple,maxWidth:220,textAlign:"center",lineHeight:1.35,animation:"reactionPop 2.5s ease-out forwards",boxShadow:`0 4px 14px #00000055`,zIndex:5}}>
              {reaction.message}
            </div>
          )}
        </div>
 
        {/* Stato emotivo — fumetto con dialogo contestuale, sostituisce l'etichetta generica */}
        <div style={{color:C.text,fontWeight:700,fontSize:16,marginTop:4}}>{foxName}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
          <span style={{fontSize:16}}>{moodEmoji[displayMood]||"😌"}</span>
          <span style={{color:stage.color,fontSize:12,fontWeight:700}}>{moodLabels[displayMood]||"Tranquilla"}</span>
        </div>
        <div style={{background:"#0F0A1A99",borderRadius:14,padding:"8px 14px",margin:"0 8px 12px",fontSize:12.5,color:C.text,lineHeight:1.4,fontStyle:"italic"}}>
          "{contextualMessage}"
        </div>
        <button onClick={()=>setScreen("coach")} style={{background:`linear-gradient(135deg,${C.purple}33,${C.purple}11)`,border:`1px solid ${C.purple}55`,borderRadius:20,color:C.purple,padding:"6px 18px",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:14,transition:"all 0.2s"}}>
          Parla con {foxName} ✨
        </button>
 
        {/* Fox stats — ora 3 barre: fame, energia, felicità */}
        <div style={{display:"flex",gap:10,marginBottom:14}}>
          <StatBar label="Fame" value={foxState.emotion.hunger} color={hungerColor} icon="🍽️"/>
          <StatBar label="Energia" value={foxState.energy} color={energyColor} icon="⚡"/>
          <StatBar label="Felicità" value={foxState.emotion.happiness} color={happinessColor} icon="💖"/>
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
            <button key={i} onClick={()=>setWater(i<water?i:i+1)} aria-label={`Bicchiere ${i+1}${i<water?" (bevuto)":""}`} aria-pressed={i<water} style={{fontSize:18,background:"none",border:"none",cursor:"pointer",padding:1,opacity:i<water?1:0.2,transition:"opacity 0.2s"}}>💧</button>
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
                  <button onClick={()=>removeFood(i)} aria-label={`Rimuovi ${m.name}`} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {/* Coach — motore di analisi nutrizionale (v1.6) */}
      <div style={{background:`linear-gradient(160deg,${C.purple}18,${C.card})`,border:`1px solid ${C.purple}44`,borderRadius:18,padding:14,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
          <span style={{fontSize:14}}>🧠</span>
          <span style={{color:C.purple,fontWeight:700,fontSize:13}}>Il consiglio di {foxName}</span>
        </div>
        <p style={{color:C.text,fontSize:13,lineHeight:1.4,margin:"0 0 12px"}}>{insights.headline}</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {insights.dailyGoals.map(g=>(
            <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:g.done?C.green:C.muted}}>
              <span style={{fontSize:13}}>{g.done?"✅":"⬜"}</span>
              <span style={{textDecoration:g.done?"line-through":"none"}}>{g.label}</span>
            </div>
          ))}
        </div>
        {insights.weeklyGoals?.length>0 && (
          <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.purple}33`}}>
            <div style={{color:C.purple,fontWeight:700,fontSize:11,marginBottom:6}}>Traguardi della settimana</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {insights.weeklyGoals.map(g=>(
                <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:g.done?C.green:C.muted}}>
                  <span style={{fontSize:13}}>{g.done?"✅":"⬜"}</span>
                  <span>{g.label}{typeof g.progress==="number"?` (${g.progress}/7)`:""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
 
      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:C.card,borderTop:`1px solid ${C.cardBorder}`,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"10px 0 22px"}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:screen==="home"?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:10}}>
          <span style={{fontSize:20}}>🏠</span>Home
        </button>
        <button onClick={()=>setScreen("log")} aria-label="Aggiungi pasto" style={{background:`linear-gradient(135deg,${C.accent},#E8553F)`,border:"none",borderRadius:"50%",width:54,height:54,color:"white",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${C.accent}66`}}>+</button>
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
 


import { useState, useEffect } from "react";

const COLORS = {
  bg: "#1C1228", card: "#251A35", cardBorder: "#3A2850",
  accent: "#F4845F", accentSoft: "#F4845F22",
  gold: "#F9C74F", goldSoft: "#F9C74F22",
  green: "#6FCF97", greenSoft: "#6FCF9722",
  text: "#F5EFE6", textMuted: "#9E8FB0", purple: "#A78BFA",
  blue: "#60A5FA",
};

const GOALS = {
  perdere_peso:    { label: "Perdere peso",   kcal: 1600, emoji: "📉" },
  mangiare_meglio: { label: "Mangiare meglio", kcal: 2000, emoji: "🥗" },
  tener_traccia:   { label: "Tener traccia",  kcal: 2200, emoji: "📋" },
};

// ─── DATABASE ────────────────────────────────────────────────────────────────
const FOOD_DB = {
  "🥩 Carne & Pesce": [
    { name: "Petto di pollo", kcal: 165, p: 31, c: 0,   f: 3.6 },
    { name: "Coscia di pollo", kcal: 215, p: 26, c: 0,  f: 12  },
    { name: "Bistecca di manzo", kcal: 250, p: 26, c: 0, f: 16 },
    { name: "Macinato di manzo", kcal: 280, p: 25, c: 0, f: 20 },
    { name: "Salmone al forno", kcal: 208, p: 28, c: 0,  f: 10 },
    { name: "Tonno in scatola", kcal: 130, p: 28, c: 0,  f: 1.5},
    { name: "Merluzzo",         kcal: 82,  p: 18, c: 0,  f: 0.7},
    { name: "Gamberetti",       kcal: 99,  p: 20, c: 0.9,f: 1.7},
    { name: "Prosciutto cotto", kcal: 130, p: 19, c: 1,  f: 5.5},
    { name: "Mortadella",       kcal: 311, p: 15, c: 1,  f: 28 },
    { name: "Salsiccia",        kcal: 302, p: 13, c: 2,  f: 27 },
  ],
  "🥚 Uova & Latticini": [
    { name: "Uovo intero",        kcal: 78,  p: 6,  c: 0.6,f: 5   },
    { name: "Uova strapazzate (2)",kcal:180, p: 14, c: 1,  f: 13  },
    { name: "Mozzarella (100g)",  kcal: 280, p: 18, c: 2,  f: 22  },
    { name: "Parmigiano (30g)",   kcal: 119, p: 10, c: 0,  f: 8.5 },
    { name: "Ricotta (100g)",     kcal: 174, p: 11, c: 3,  f: 13  },
    { name: "Yogurt greco",       kcal: 100, p: 10, c: 6,  f: 3   },
    { name: "Yogurt bianco",      kcal: 61,  p: 3.5,c: 7,  f: 1.5 },
    { name: "Latte intero (200ml)",kcal:130, p: 6.6,c: 9.6,f: 7.4 },
    { name: "Latte scremato (200ml)",kcal:70,p: 6.8,c: 9.8,f: 0.2 },
  ],
  "🍝 Pasta & Cereali": [
    { name: "Pasta al pomodoro",  kcal: 350, p: 12, c: 65, f: 5   },
    { name: "Pasta in bianco",    kcal: 290, p: 10, c: 58, f: 3   },
    { name: "Pasta al ragù",      kcal: 450, p: 20, c: 58, f: 15  },
    { name: "Riso bollito (100g cotto)", kcal:130,p:2.7,c:28,f:0.3},
    { name: "Risotto ai funghi",  kcal: 320, p: 8,  c: 52, f: 9   },
    { name: "Pane bianco (50g)",  kcal: 134, p: 4,  c: 27, f: 0.9 },
    { name: "Pane integrale (50g)",kcal:120, p: 5,  c: 22, f: 1.5 },
    { name: "Crackers (5 pz)",    kcal: 110, p: 2.5,c: 18, f: 3.5 },
    { name: "Grissini (4 pz)",    kcal: 120, p: 3,  c: 20, f: 3.5 },
    { name: "Farro (100g cotto)", kcal: 150, p: 6,  c: 30, f: 1   },
    { name: "Orzo (100g cotto)",  kcal: 123, p: 3,  c: 25, f: 0.4 },
    { name: "Polenta (100g)",     kcal: 83,  p: 2,  c: 18, f: 0.5 },
  ],
  "🥦 Verdure": [
    { name: "Insalata mista",     kcal: 15,  p: 1,  c: 2,  f: 0.2 },
    { name: "Pomodori (100g)",    kcal: 18,  p: 0.9,c: 3.5,f: 0.2 },
    { name: "Zucchine (100g)",    kcal: 17,  p: 1.2,c: 3.1,f: 0.3 },
    { name: "Carote (100g)",      kcal: 41,  p: 0.9,c: 10, f: 0.2 },
    { name: "Spinaci (100g)",     kcal: 23,  p: 2.9,c: 3.6,f: 0.4 },
    { name: "Broccoli (100g)",    kcal: 34,  p: 2.8,c: 7,  f: 0.4 },
    { name: "Cavolfiore (100g)",  kcal: 25,  p: 1.9,c: 5,  f: 0.3 },
    { name: "Peperoni (100g)",    kcal: 31,  p: 1,  c: 6,  f: 0.3 },
    { name: "Melanzane (100g)",   kcal: 25,  p: 1,  c: 6,  f: 0.2 },
    { name: "Funghi champignon",  kcal: 22,  p: 3,  c: 4,  f: 0.3 },
    { name: "Minestra di verdure",kcal: 85,  p: 4,  c: 14, f: 1.5 },
    { name: "Piselli (100g)",     kcal: 81,  p: 5,  c: 14, f: 0.4 },
    { name: "Patate (100g)",      kcal: 77,  p: 2,  c: 17, f: 0.1 },
    { name: "Patate al forno",    kcal: 150, p: 3,  c: 30, f: 3   },
  ],
  "🍎 Frutta": [
    { name: "Mela (media)",       kcal: 72,  p: 0.4,c: 19, f: 0.2 },
    { name: "Banana (media)",     kcal: 105, p: 1.3,c: 27, f: 0.4 },
    { name: "Arancia (media)",    kcal: 62,  p: 1.2,c: 15, f: 0.2 },
    { name: "Fragole (100g)",     kcal: 32,  p: 0.7,c: 8,  f: 0.3 },
    { name: "Uva (100g)",         kcal: 69,  p: 0.7,c: 18, f: 0.2 },
    { name: "Kiwi",               kcal: 61,  p: 1.1,c: 15, f: 0.5 },
    { name: "Pera (media)",       kcal: 57,  p: 0.4,c: 15, f: 0.1 },
    { name: "Anguria (200g)",     kcal: 60,  p: 1.2,c: 15, f: 0.2 },
    { name: "Pesche (media)",     kcal: 39,  p: 0.9,c: 10, f: 0.3 },
  ],
  "🥫 Sughi & Condimenti": [
    { name: "Sugo al pomodoro (100g)",     kcal: 45,  p: 1.5,c: 8,  f: 1.2 },
    { name: "Sugo all'arrabbiata (100g)",  kcal: 55,  p: 1.5,c: 8,  f: 2.5 },
    { name: "Ragù di carne (100g)",        kcal: 150, p: 10, c: 6,  f: 10  },
    { name: "Pesto alla genovese (30g)",   kcal: 130, p: 2.5,c: 1.5,f: 13  },
    { name: "Besciamella (50ml)",          kcal: 72,  p: 2,  c: 5,  f: 5   },
    { name: "Olio d'oliva (10ml)",         kcal: 90,  p: 0,  c: 0,  f: 10  },
    { name: "Burro (10g)",                 kcal: 74,  p: 0.1,c: 0,  f: 8.3 },
    { name: "Maionese (15g)",              kcal: 104, p: 0.2,c: 0.3,f: 11  },
    { name: "Ketchup (20g)",               kcal: 22,  p: 0.3,c: 5,  f: 0.1 },
    { name: "Salsa di soia (15ml)",        kcal: 9,   p: 1.3,c: 0.9,f: 0   },
  ],
  "❄️ Surgelati": [
    { name: "Bastoncini di pesce (2 pz)",  kcal: 160, p: 8,  c: 16, f: 7   },
    { name: "Cotolette di pesce (1 pz)",   kcal: 180, p: 10, c: 14, f: 9   },
    { name: "Sofficini (2 pz)",            kcal: 280, p: 8,  c: 30, f: 14  },
    { name: "Lasagne surgelate (porzione)",kcal: 380, p: 18, c: 38, f: 16  },
    { name: "Pizza surgelata (½)",         kcal: 420, p: 14, c: 54, f: 16  },
    { name: "Patatine fritte surgelate",   kcal: 270, p: 3.5,c: 36, f: 13  },
    { name: "Verdure miste surgelate",     kcal: 45,  p: 3,  c: 8,  f: 0.5 },
    { name: "Spinaci surgelati (100g)",    kcal: 22,  p: 2.8,c: 2,  f: 0.4 },
    { name: "Crocchette di pollo (3 pz)",  kcal: 220, p: 12, c: 18, f: 11  },
    { name: "Minestrone surgelato",        kcal: 60,  p: 3,  c: 11, f: 0.5 },
    { name: "Cannelloni surgelati",        kcal: 290, p: 14, c: 28, f: 13  },
    { name: "Wurstel (1 pz)",              kcal: 120, p: 5,  c: 1,  f: 11  },
  ],
  "🍕 Piatti pronti & Fast food": [
    { name: "Pizza margherita (1 fetta)",  kcal: 270, p: 11, c: 35, f: 9   },
    { name: "Pizza 4 stagioni (1 fetta)",  kcal: 290, p: 13, c: 33, f: 11  },
    { name: "Trancio di pizza bianca",     kcal: 310, p: 9,  c: 48, f: 9   },
    { name: "Hamburger classico",          kcal: 480, p: 26, c: 40, f: 24  },
    { name: "Panino al prosciutto",        kcal: 320, p: 16, c: 38, f: 10  },
    { name: "Tramezzino tonno/mais",       kcal: 350, p: 14, c: 42, f: 13  },
    { name: "Supplì (1 pz)",               kcal: 180, p: 6,  c: 22, f: 8   },
    { name: "Arancino (1 pz)",             kcal: 280, p: 8,  c: 38, f: 10  },
  ],
  "☕ Colazione & Snack": [
    { name: "Caffè espresso",              kcal: 2,   p: 0.1,c: 0.3,f: 0   },
    { name: "Caffè con zucchero",          kcal: 30,  p: 0.3,c: 7,  f: 0   },
< truncated lines 124-528 >
              </div>
              <div style={{ color:COLORS.textMuted, fontSize:12, marginTop:6 }}>{data.meals.length} pasti loggati</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  if (screen === "settings") return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={()=>setScreen("home")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"8px 14px", cursor:"pointer", fontSize:14 }}>← Indietro</button>
        <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>Impostazioni</h2>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:20, marginBottom:16 }}>
        <label style={{ color:COLORS.textMuted, fontSize:13, display:"block", marginBottom:6 }}>Nome della volpe</label>
        <input value={foxName} onChange={e=>setFoxName(e.target.value)} style={inputStyle}/>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:20 }}>
        <p style={{ color:COLORS.textMuted, fontSize:13, margin:"0 0 12px" }}>Obiettivo</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Object.entries(GOALS).map(([k,g]) => (
            <button key={k} onClick={()=>setGoalKey(k)} style={{ background:goalKey===k?COLORS.accentSoft:COLORS.bg, border:`2px solid ${goalKey===k?COLORS.accent:COLORS.cardBorder}`, borderRadius:12, color:COLORS.text, padding:"12px 16px", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{fontSize:20}}>{g.emoji}</span>
              <div style={{textAlign:"left"}}><div style={{fontWeight:600}}>{g.label}</div><div style={{color:COLORS.textMuted,fontSize:12}}>{g.kcal} kcal/giorno</div></div>
              {goalKey===k && <span style={{marginLeft:"auto",color:COLORS.accent}}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Home ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px 100px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{color:COLORS.textMuted,fontSize:13}}>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{color:COLORS.text,fontSize:20,fontWeight:700}}>NutriFox 🦊</div>
        </div>
        <button onClick={()=>setScreen("settings")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.textMuted, padding:"8px 12px", cursor:"pointer", fontSize:18 }}>⚙️</button>
      </div>

      {/* Fox card */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:24, padding:"24px 20px", marginBottom:16, textAlign:"center", position:"relative" }}>
        <div style={{ position:"absolute", top:14, left:16, background:COLORS.goldSoft, border:`1px solid ${COLORS.gold}`, borderRadius:20, padding:"4px 12px", fontSize:12, color:COLORS.gold, fontWeight:700 }}>
          🔥 {streak} {streak===1?"giorno":"giorni"}
        </div>
        <Fox mood={mood} size={110}/>
        <div style={{color:COLORS.text,fontWeight:600,fontSize:15,marginTop:8}}>{foxName}</div>
        <div style={{ background:COLORS.bg, borderRadius:12, padding:"10px 16px", marginTop:10, color:COLORS.textMuted, fontSize:13, fontStyle:"italic" }}>"{foxMsg}"</div>
      </div>

      {/* Kcal card */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:"20px 20px 16px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{color:COLORS.textMuted,fontSize:12,marginBottom:2}}>Calorie oggi</div>
            <div style={{color:COLORS.text,fontSize:28,fontWeight:800}}>{totalKcal} <span style={{color:COLORS.textMuted,fontSize:14,fontWeight:400}}>/ {goal.kcal} kcal</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:COLORS.textMuted,fontSize:11}}>{goal.emoji} {goal.label}</div>
            <div style={{color:totalKcal>goal.kcal?COLORS.accent:COLORS.green,fontSize:14,fontWeight:700}}>
              {totalKcal>goal.kcal?`+${totalKcal-goal.kcal}`:`${goal.kcal-totalKcal} rimaste`}
            </div>
          </div>
        </div>
        <div style={{ height:10, background:COLORS.bg, borderRadius:5, overflow:"hidden", marginBottom:14 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${COLORS.accent},${COLORS.gold})`, borderRadius:5, transition:"width 0.5s" }}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["Proteine",totalP,COLORS.purple],["Carboidrati",totalC,COLORS.gold],["Grassi",totalF,COLORS.accent]].map(([label,val,color]) => (
            <div key={label} style={{ background:COLORS.bg, borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
              <div style={{color,fontSize:16,fontWeight:700}}>{Math.round(val)}g</div>
              <div style={{color:COLORS.textMuted,fontSize:11}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals list */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{color:COLORS.text,fontWeight:700,fontSize:15}}>Pasti di oggi</span>
          <span style={{color:COLORS.textMuted,fontSize:13}}>{todayData.meals.length} loggati</span>
        </div>
        {todayData.meals.length === 0 ? (
          <p style={{color:COLORS.textMuted,fontSize:13,textAlign:"center",padding:"12px 0",margin:0}}>Nessun pasto ancora. {foxName} aspetta! 🦊</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {todayData.meals.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.bg, borderRadius:10, padding:"10px 12px" }}>
                <div>
                  <div style={{color:COLORS.text,fontSize:14,fontWeight:500}}>{m.name}</div>
                  <div style={{color:COLORS.textMuted,fontSize:11}}>{m.meal} · {m.time}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{color:COLORS.accent,fontWeight:700,fontSize:14}}>{m.kcal} kcal</span>
                  <button onClick={()=>removeFood(i)} style={{background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:16,padding:"0 2px"}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:COLORS.card, borderTop:`1px solid ${COLORS.cardBorder}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"12px 0 20px" }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", color:screen==="home"?COLORS.accent:COLORS.textMuted, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10 }}>
          <span style={{fontSize:20}}>🏠</span> Home
        </button>
        <button onClick={()=>setScreen("log")} style={{ background:COLORS.accent, border:"none", borderRadius:"50%", width:52, height:52, color:"white", fontSize:26, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${COLORS.accent}66` }}>+</button>
        <button onClick={()=>setScreen("history")} style={{ background:"none", border:"none", color:screen==="history"?COLORS.accent:COLORS.textMuted, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10 }}>
          <span style={{fontSize:20}}>📅</span> Storico
        </button>
      </div>
    </div>
  );
}

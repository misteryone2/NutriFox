import { useState, useEffect, useMemo, useRef } from "react";
import { getFoxStage } from "./Fox";
import { FOOD_DB, ALL_FOODS } from "./FoodDB";
 
// ─────────────────────────────────────────────────────────────────────────────
// useNutriFox.js — v1.9.3
//
// Release di consolidamento tecnico: tutta la logica di business che prima
// viveva dentro App.jsx (gestione pasti, idratazione, statistiche, dialoghi,
// memoria della volpe, calcoli nutrizionali, mood, persistenza) è stata
// spostata qui in un unico hook. App.jsx resta responsabile solo di
// orchestrare la UI: navigazione tra schermate, stato dei form, rendering.
//
// v1.8.2: il database alimenti (FOOD_DB/ALL_FOODS) è stato spostato nel suo
// file dedicato, FoodDB.js — era già isolato e pronto per questo passaggio
// dalla v1.4.1. Qui viene solo importato per uso interno (getPool, ricerca
// porzioni): chi consuma i dati direttamente (App.jsx) li importa da
// FoodDB.js, non più da questo hook — separazione più netta tra dati e logica.
//
// v1.9: Memoria e personalizzazione. Nessun refactoring strutturale — stessa
// architettura, stesse sezioni. Aggiunte tre sezioni nuove più avanti nel
// file (PROFILO UTENTE UNIFICATO, MEMORIA COMPORTAMENTALE, MEAL BUILDER
// INTELLIGENTE) e piccole estensioni a sezioni esistenti (PROGRESSIONE &
// OBIETTIVI ora include anche traguardi settimanali; il motore messaggi
// unificato v1.7 guadagna nuove voci che leggono dalla memoria comportamentale
// invece di ricalcolare pattern ad hoc). Tutto resta deterministico, puro
// dove possibile, e già nella forma dati "fatti strutturati" che una futura
// AI potrà limitarsi a tradurre in linguaggio naturale — lo stesso principio
// già seguito dal motore di analisi nutrizionale v1.6.
//
// v1.9.1: rifinitura — unificazione definitiva della memoria comportamentale.
// getMealRoutine e la vecchia getFoodMemoryCount (ora getWeeklyFoodCounts)
// erano ancora invocate direttamente da buildReactionCandidates e
// buildAmbientContext, duplicando scansioni del diario già fatte da
// getUserMemory. Ora ogni superficie legge solo da userMemory: zero doppi
// calcoli, un'unica fonte di verità per la memoria. Nessun cambio di
// comportamento visibile, solo di dove viene letto il dato.
//
// v1.9.2: il Meal Builder diventa iterativo — rigenera, sostituisci un
// singolo ingrediente, blocca quello che piace, evita sempre gli alimenti
// già mangiati oggi. Nuove funzioni condivise (buildMealSlots,
// pickFirstEligible, mealBudget, composeMealItems) usate sia dalla
// generazione iniziale sia dalla rigenerazione sia dalla sostituzione:
// nessuna logica duplicata tra le tre azioni. Ancora zero AI, zero casualità.
//
// v1.9.3: la memoria per singolo alimento smette di essere un semplice
// contatore. getFoodMemory sostituisce sia la vecchia getTopFoods (contava
// solo su 30gg) sia getWeeklyFoodCounts (solo su 7gg, scansione separata)
// con un'unica scansione che produce, per ogni alimento: ultimo utilizzo,
// frequenza settimanale, frequenza mensile, pasto preferito. Nuova
// getRecurringCombos rileva le combinazioni di alimenti che ricorrono nello
// stesso pasto. topFoods/foodCounts restano esposti per compatibilità con le
// superfici esistenti, ma derivano ora da getFoodMemory — mai più da una
// scansione propria.
// ─────────────────────────────────────────────────────────────────────────────
 
// ─── STORAGE ──────────────────────────────────────────────────────────────────
function load(k,fb){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().split("T")[0]; }
 
// ─── MOOD SYSTEM (stati intermedi, v1.4) ──────────────────────────────────────
// Il mood non scatta da uno stato all'altro in un colpo solo. MOOD_ORDER
// definisce una scala continua; ad ogni aggiornamento dello stato (decay
// periodico o pasto) calcoliamo il mood "target" in base alle statistiche
// attuali, ma il mood effettivamente mostrato si sposta di un solo gradino
// per volta verso il target.
export const MOOD_ORDER = ["sad", "neutral", "content", "happy", "excited"];
 
function computeTargetMoodIndex(hunger, energy, happiness) {
  if (hunger > 75 || happiness < 25 || energy < 25) return 0; // sad
  if (hunger < 25 && energy > 60 && happiness > 70) return 4; // excited
  if (hunger < 40 && energy > 45 && happiness > 55) return 3; // happy
  if (hunger < 55 && energy > 35 && happiness > 40) return 2; // content
  return 1; // neutral
}
 
// Sposta l'indice corrente di un solo passo verso il target (mai di scatto)
function stepMoodIndex(currentIndex, targetIndex) {
  if (currentIndex == null) return targetIndex;
  if (currentIndex === targetIndex) return currentIndex;
  return currentIndex + Math.sign(targetIndex - currentIndex);
}
 
// ─── NUTRIZIONE ────────────────────────────────────────────────────────────────
// Stima qualità pasto 0-1 basata su bilanciamento macro (non solo calorie)
function mealQuality(food) {
  const p = food.p||0, c = food.c||0, f = food.f||0;
  const tot = p+c+f;
  if (tot === 0) return 0.5;
  const pRatio = p/tot;
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
 
// Somma kcal/p/c/f di una lista di alimenti — usata sia per i totali
// giornalieri sia per i totali del builder di ricette (v1.4.1: prima erano
// due reduce duplicati, ora un'unica funzione condivisa).
export function sumMacros(items) {
  return {
    kcal: items.reduce((s,i)=>s+(i.kcal||0),0),
    p:    items.reduce((s,i)=>s+(i.p||0),0),
    c:    items.reduce((s,i)=>s+(i.c||0),0),
    f:    items.reduce((s,i)=>s+(i.f||0),0),
  };
}
 
// ─── MOTORE DECISIONALE UNIFICATO (v1.7) ───────────────────────────────────────
// Prima ogni superficie (didascalia in home, popup dopo il pasto, headline del
// coach) aveva la propria logica di scelta del messaggio: un if/else in
// ordine di priorità per la didascalia, un pescaggio pesato per il popup, un
// altro if/else per la headline. Le regole erano equivalenti nello spirito
// ("mostra prima ciò che conta di più") ma implementate tre volte in modo
// diverso. Ora un'unica coppia di funzioni primitive gestisce la selezione
// per tutte e tre le superfici:
//
//  - pickTopPriority(candidati): dato un elenco già filtrato per eleggibilità,
//    sceglie il candidato di priorità più alta (numero più basso = più
//    importante); a parità di priorità sceglie a caso pesato tra i pari.
//  - selectMessage(libreria, ctx, storico): valuta condition() e cooldown per
//    ogni voce della libreria, poi delega a pickTopPriority.
//
// Il cooldown (persistito in nf_msgHistory) evita che un "fatto" via via
// meno urgente di un avviso importante si ripeta troppo spesso — le regole
// generali sono le stesse per tutte le superfici, cambia solo la libreria di
// contenuti che ciascuna consulta.
 
function pickTopPriority(eligible) {
  if (eligible.length === 0) return null;
  const topPriority = Math.min(...eligible.map(c=>c.priority));
  const topTier = eligible.filter(c=>c.priority===topPriority);
  const totalWeight = topTier.reduce((s,c)=>s+(c.weight||1),0);
  let r = Math.random()*totalWeight;
  for (const c of topTier) {
    const w = c.weight||1;
    if (r < w) return c;
    r -= w;
  }
  return topTier[topTier.length-1];
}
 
function selectMessage(library, ctx, messageHistory, now=Date.now()) {
  const eligible = library
    .filter(c => {
      if (!c.condition(ctx)) return false;
      if (c.cooldownMin>0) {
        const last = messageHistory[c.id];
        if (last && now-last < c.cooldownMin*60000) return false;
      }
      return true;
    })
    .map(c => ({ id:c.id, priority:c.priority, weight:c.weight, emotion:c.emotion||null, text: typeof c.text==="function" ? c.text(ctx) : c.text }));
  return pickTopPriority(eligible);
}
 
// ─── LIBRERIE DI CONTENUTO ──────────────────────────────────────────────────────
// Ogni voce: { id, priority (1=più importante..5=presenza leggera), cooldownMin,
// condition(ctx), text(ctx) }. Aggiungere un nuovo messaggio significa
// aggiungere una voce qui, non toccare la logica di selezione.
 
// Superficie "reaction": popup che appare subito dopo aver registrato un pasto.
const REACTION_MESSAGES = {
  happy:     ["Che buono!", "Mi piace!", "Delizioso!", "{food}? Sì grazie!", "Che bontà questo {food}!", "Yum!", "Mi fa sempre piacere!"],
  energetic: ["Che carica!", "Sento l'energia!", "Forza pura!", "{food} è proprio quello che ci voleva!", "Ora sì che si corre!", "Che sprint!"],
  neutral:   ["Mmh, ok.", "Va bene così.", "Non male.", "Ci sta.", "Va giù bene."],
  sad:       ["Avrei voluto di meglio...", "Speravo in altro."],
  relieved:  ["Finalmente! Che sollievo 😌", "Aspettavo proprio questo momento!", "Ah, ora va molto meglio.", "Grazie, ne avevo davvero bisogno.", "{food}, giusto in tempo!"],
};
function pickReaction(type, foodName) {
  const arr = REACTION_MESSAGES[type] || REACTION_MESSAGES.neutral;
  const msg = arr[Math.floor(Math.random()*arr.length)];
  return foodName ? msg.replace("{food}", foodName) : msg.replace("{food} ","").replace("{food}","Buono");
}
 
// Genera le chiavi data (YYYY-MM-DD) degli ultimi n giorni. offset=0 include
// oggi, offset=1 parte da ieri.
function lastNDayKeys(n, offset=0) {
  const keys = [];
  for (let i = offset; i < offset+n; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    keys.push(d.toISOString().split("T")[0]);
  }
  return keys;
}
 
// ─── MEMORIA COMPORTAMENTALE (v1.9 · unificata in v1.9.1 · arricchita in v1.9.3) ─
// v1.9 introduceva getUserMemory ma alcune superfici (buildReactionCandidates,
// buildAmbientContext) continuavano a scansionare il diario per conto proprio
// con getMealRoutine/getFoodMemoryCount, duplicando calcoli già fatti qui.
// v1.9.1 ha chiuso il cerchio: getMealRoutine è chiamata SOLO da getUserMemory,
// e getFoodMemoryCount non esiste più. Ogni altra superficie (ambient,
// reazione al pasto, coach, meal builder) legge esclusivamente da userMemory.
//
// v1.9.3: la memoria per singolo alimento non era più un semplice contatore
// da un pezzo (getTopFoods contava solo occorrenze su 30gg, getWeeklyFoodCounts
// solo su 7gg — due scansioni separate dello stesso diario). getFoodMemory le
// sostituisce entrambe con un'unica scansione che produce, per ogni alimento
// visto negli ultimi 60 giorni: ultimo utilizzo, frequenza settimanale,
// frequenza mensile, e il pasto in cui compare più spesso. getRecurringCombos
// aggiunge le combinazioni di alimenti che ricorrono nello stesso pasto.
// topFoods e foodCounts restano esposti (compatibilità con le superfici
// esistenti) ma sono ora derivati da getFoodMemory, non da scansioni proprie.

// Memoria per singolo alimento: un'unica scansione del diario produce, per
// ogni nome visto negli ultimi `days` giorni, tutti i fatti che prima
// richiedevano scansioni separate. Restituisce una mappa nome->record per
// lookup O(1) da qualunque superficie (coach, reazione, meal builder, futura
// AI che dovrà solo tradurre questi fatti in linguaggio naturale).
function getFoodMemory(dailyLog, days=60) {
  const weekKeys  = new Set(lastNDayKeys(7));
  const monthKeys = new Set(lastNDayKeys(30));
  const byName = {};

  for (const key of lastNDayKeys(days)) {
    const meals = dailyLog[key]?.meals || [];
    meals.forEach(m => {
      const rec = byName[m.name] || { name:m.name, lastUsed:null, weekCount:0, monthCount:0, totalCount:0, mealCounts:{} };
      if (!rec.lastUsed || key > rec.lastUsed) rec.lastUsed = key;
      if (weekKeys.has(key))  rec.weekCount++;
      if (monthKeys.has(key)) rec.monthCount++;
      rec.totalCount++;
      rec.mealCounts[m.meal] = (rec.mealCounts[m.meal]||0)+1;
      byName[m.name] = rec;
    });
  }

  Object.values(byName).forEach(rec => {
    const sortedMeals = Object.entries(rec.mealCounts).sort((a,b)=>b[1]-a[1]);
    rec.preferredMeal = sortedMeals[0]?.[0] || null;
  });

  return byName;
}

// Alimenti più ricorrenti (soglia minima 2 volte nel mese, altrimenti non è
// ancora un'abitudine riconoscibile) — derivato da getFoodMemory, non da una
// scansione propria.
function getTopFoods(foodMemory, limit=5) {
  return Object.values(foodMemory)
    .filter(r => r.monthCount>=2)
    .sort((a,b) => b.monthCount-a.monthCount)
    .slice(0,limit)
    .map(r => ({ name:r.name, count:r.monthCount }));
}

// Mappa nome->conteggio settimanale, per compatibilità con le superfici che
// consultano solo la frequenza dei 7 giorni (reazione al pasto, ambient) —
// anche questa derivata da getFoodMemory, mai da una scansione propria.
function getWeeklyFoodCounts(foodMemory) {
  const counts = {};
  Object.values(foodMemory).forEach(r => { counts[r.name] = r.weekCount; });
  return counts;
}

// Combinazioni ricorrenti: coppie di alimenti registrati nello stesso pasto
// (stesso giorno, stesso tipo pasto) che si ripetono almeno `minOccurrences`
// volte negli ultimi `days` giorni — es. "pasta + parmigiano" se è successo
// almeno 2 volte. Alimenti duplicati nello stesso pasto contano una sola
// volta (un doppione con se stesso non è una "combinazione").
function getRecurringCombos(dailyLog, days=30, minOccurrences=2, limit=5) {
  const pairCounts = {};
  for (const key of lastNDayKeys(days)) {
    const meals = dailyLog[key]?.meals || [];
    const byMealType = {};
    meals.forEach(m => { (byMealType[m.meal] = byMealType[m.meal]||[]).push(m.name); });
    Object.values(byMealType).forEach(names => {
      const unique = [...new Set(names)];
      for (let i=0; i<unique.length; i++) {
        for (let j=i+1; j<unique.length; j++) {
          const pairKey = [unique[i], unique[j]].sort().join("|||");
          pairCounts[pairKey] = (pairCounts[pairKey]||0)+1;
        }
      }
    });
  }
  return Object.entries(pairCounts)
    .filter(([,c]) => c>=minOccurrences)
    .sort((a,b) => b[1]-a[1])
    .slice(0,limit)
    .map(([pairKey,count]) => ({ items: pairKey.split("|||"), count }));
}

// Pattern di idratazione: l'acqua non vive nel dailyLog ma in chiavi separate
// (nf_water_YYYY-MM-DD), quindi si legge con lo stesso `load` di sempre.
function getHydrationPattern(days=7) {
  const history = lastNDayKeys(days).map(k => load("nf_water_"+k, null)).filter(v => v!=null);
  if (!history.length) return null;
  const avg = history.reduce((a,b)=>a+b,0)/history.length;
  const lowDays = history.filter(v => v<4).length;
  return { avg: Math.round(avg*10)/10, lowDays, daysTracked: history.length };
}

// Punto di ingresso unico della memoria comportamentale.
function getUserMemory(dailyLog) {
  const foodMemory = getFoodMemory(dailyLog);
  return {
    mealRoutines: {
      Colazione: getMealRoutine(dailyLog, "Colazione"),
      Pranzo:    getMealRoutine(dailyLog, "Pranzo"),
      Cena:      getMealRoutine(dailyLog, "Cena"),
      Spuntino:  getMealRoutine(dailyLog, "Spuntino"),
    },
    foodMemory,
    topFoods: getTopFoods(foodMemory),
    foodCounts: getWeeklyFoodCounts(foodMemory),
    combos: getRecurringCombos(dailyLog),
    hydration: getHydrationPattern(),
  };
}
 
// Ordinale italiano semplice per i numeri più comuni in questo contesto
function ordinalIt(n) {
  const words = { 1:"il primo", 2:"il secondo", 3:"il terzo", 4:"il quarto", 5:"il quinto", 6:"il sesto", 7:"il settimo" };
  return words[n] || `il numero ${n}`;
}
 
// Routine di un tipo di pasto: media oraria negli ultimi 14 giorni (esclusi
// oggi), solo se ci sono abbastanza dati per parlare davvero di "abitudine".
function getMealRoutine(dailyLog, mealType) {
  const hours = [];
  for (const key of lastNDayKeys(14, 1)) {
    const meals = dailyLog[key]?.meals || [];
    meals.filter(m => m.meal === mealType).forEach(m => {
      const h = parseInt((m.time||"").split(":")[0], 10);
      if (!isNaN(h)) hours.push(h);
    });
  }
  if (hours.length < 3) return null;
  const avgHour = Math.round(hours.reduce((a,b)=>a+b,0)/hours.length);
  return { avgHour, samples: hours.length };
}
 
// Candidati per la reazione al pasto. A differenza delle altre due superfici
// non è una libreria statica valutata automaticamente: dipende dal singolo
// alimento appena registrato, quindi viene costruita al volo — ma la scelta
// finale passa dallo stesso pickTopPriority condiviso.
// v1.9.1: legge esclusivamente da userMemory (già calcolata una volta
// nell'hook), non riceve più dailyLog e non scansiona più nulla da sé —
// stessa logica di prima, una sola fonte di verità per la memoria.
function buildReactionCandidates({ reactionType, foodName, userMemory, mealType, waitedLong }) {
  const candidates = [
    { priority:5, text: pickReaction(reactionType, foodName) }, // presenza leggera, sempre disponibile
  ];
  if (waitedLong) {
    candidates.push({ priority:1, text: pickReaction("relieved", foodName) }); // avviso importante: aspettava da ore
  }
  const memoryCount = userMemory?.foodCounts?.[foodName] || 0;
  if (memoryCount >= 3) {
    candidates.push({ priority:3, text: `È ${ordinalIt(memoryCount)} ${foodName} questa settimana!` }); // riconoscimento
  }
  const routine = userMemory?.mealRoutines?.[mealType];
  if (routine) {
    const diff = Math.abs(new Date().getHours() - routine.avgHour);
    if (diff <= 1) candidates.push({ priority:3, text: `Puntuale come sempre, ${mealType.toLowerCase()} verso le ${routine.avgHour}!` });
    else if (diff >= 3) candidates.push({ priority:4, text: `Oggi ${mealType.toLowerCase()} un po' fuori dai tuoi orari soliti, va benissimo comunque!` });
  }
  return pickTopPriority(candidates).text;
}
 
// Superficie "ambient": la didascalia sempre visibile sotto la volpe in home.
// Stessa gerarchia di prima (bisogni fisici > memoria > routine > umore) ma
// espressa come dati anziché come catena di if/else.
const AMBIENT_MESSAGES = [
  { id:"amb_long_wait",    priority:1, cooldownMin:0,
    condition: ctx => ctx.hoursSinceLastFed!=null && ctx.hoursSinceLastFed>=5,
    text: () => "È da tanto che non mangiamo... quando vuoi io ci sono!" },
  { id:"amb_thirsty",      priority:1, cooldownMin:0, emotion:"curious",
    condition: ctx => ctx.water < ctx.targetWater*0.4 && ctx.mealsCount>0,
    text: () => "Ho un po' sete... un bicchiere d'acqua? 💧" },
  { id:"amb_low_protein",  priority:2, cooldownMin:0, emotion:"curious",
    condition: ctx => ctx.totalP<20 && ctx.mealsCount>=2,
    text: () => "Oggi ci servirebbe un po' più di forza, che ne dici di qualcosa di proteico?" },
  { id:"amb_three_meals",  priority:3, cooldownMin:0, emotion:"proud",
    condition: ctx => ctx.mealsCount===3,
    text: () => "Questo è il terzo pasto di oggi, stiamo andando alla grande!" },
  { id:"amb_weekly_memory",priority:3, cooldownMin:180, emotion:"proud",
    condition: ctx => !!ctx.frequentFood,
    text: ctx => `È ${ordinalIt(ctx.frequentFood.count)} ${ctx.frequentFood.name} questa settimana — ti piace davvero! 🦊` },
  { id:"amb_water_done",   priority:3, cooldownMin:0, emotion:"proud",
    condition: ctx => ctx.water>=ctx.targetWater && ctx.mealsCount>0,
    text: () => "Hai già bevuto abbastanza, bravissimo!" },
  { id:"amb_on_track",     priority:3, cooldownMin:0, emotion:"proud",
    condition: ctx => ctx.totalKcal>0 && ctx.totalKcal<=ctx.gKcal && ctx.mealsCount>=2,
    text: () => "Stai rispettando il tuo obiettivo, sono fiera di te!" },
  { id:"amb_routine_greeting", priority:4, cooldownMin:0, emotion:"curious",
    condition: ctx => ctx.mealsCount===0 && !!ctx.breakfastRoutine && new Date().getHours()<11,
    text: ctx => `Di solito fai colazione verso le ${ctx.breakfastRoutine.avgHour}, ti aspetto! 🦊` },
  { id:"amb_lunch_routine", priority:4, cooldownMin:180, emotion:"curious",
    condition: ctx => !!ctx.lunchRoutine && new Date().getHours()>=11 && new Date().getHours()<15 && !ctx.todayMeals.some(m=>m.meal==="Pranzo"),
    text: ctx => `Di solito pranzi verso le ${ctx.lunchRoutine.avgHour}, quando vuoi sono qui! 🦊` },
  { id:"amb_dinner_routine", priority:4, cooldownMin:180, emotion:"curious",
    condition: ctx => !!ctx.dinnerRoutine && new Date().getHours()>=18 && new Date().getHours()<21 && !ctx.todayMeals.some(m=>m.meal==="Cena"),
    text: ctx => `Di solito ceni verso le ${ctx.dinnerRoutine.avgHour}, ti aspetto! 🦊` },
  { id:"amb_hydration_habit", priority:3, cooldownMin:360, emotion:"curious",
    condition: ctx => ctx.hydrationWeak && ctx.mealsCount>=1 && ctx.water < ctx.targetWater*0.5,
    text: () => "Negli ultimi giorni hai bevuto meno del solito, oggi proviamo a fare un po' meglio? 💧" },
  { id:"amb_mood_excited", priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="excited", text: () => "Mi sento davvero bene oggi! ✨" },
  { id:"amb_mood_happy",   priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="happy",   text: () => "Che bella giornata insieme!" },
  { id:"amb_mood_content", priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="content", text: () => "Tutto tranquillo, mi sento serena." },
  { id:"amb_mood_sad",     priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="sad",     text: () => "Un po' giù di energie... ma so che ci riprendiamo!" },
  { id:"amb_greeting",     priority:5, cooldownMin:0, condition: ctx=>ctx.mealsCount===0,   text: ctx => `Ehi, sono ${ctx.foxName}! Pronta quando vuoi iniziare la giornata 🦊` },
  { id:"amb_default",      priority:5, cooldownMin:0, condition: () => true,                text: () => "Sono curiosa di scoprire cosa mangiamo oggi!" },
];
 
// Costruisce il contesto per la superficie ambient, pre-calcolando i fatti
// che richiedono una scansione del diario. Dalla v1.9 le routine dei pasti e
// il pattern di idratazione arrivano già pronti da getUserMemory (calcolato
// una sola volta nell'hook), invece di essere ricalcolati qui.
function buildAmbientContext(base) {
  const { todayMeals, userMemory } = base;
  const counts = userMemory?.foodCounts || {};
  const frequentFood = todayMeals?.length
    ? todayMeals.map(m => ({ name:m.name, count:counts[m.name]||0 })).find(f => f.count>=3) || null
    : null;
  const routines = userMemory?.mealRoutines || {};
  const hyd = userMemory?.hydration;
  const hydrationWeak = hyd ? hyd.lowDays >= Math.ceil(hyd.daysTracked/2) : false;
  return { ...base, frequentFood, breakfastRoutine: routines.Colazione||null, lunchRoutine: routines.Pranzo||null, dinnerRoutine: routines.Cena||null, hydrationWeak };
}
 
// ─── PROGRESSIONE & OBIETTIVI ──────────────────────────────────────────────────
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
export const GOALS={
  perdere_peso:    {label:"Perdere peso",   emoji:"📉", mult:0.8},
  mangiare_meglio: {label:"Mangiare meglio",emoji:"🥗", mult:1.0},
  tener_traccia:   {label:"Tener traccia",  emoji:"📋", mult:1.1},
};

// ─── PROFILO UTENTE UNIFICATO (v1.9) ────────────────────────────────────────────
// Prima calorie (goalKcal, nell'hook) e macro (getMacroTargets, sotto) erano
// due derivazioni indipendenti, ciascuna consultata da un punto diverso del
// codice. getUserProfile le combina in un solo oggetto — la "base di tutte
// le analisi" richiesta per questa versione — e introduce override manuali
// opzionali: se l'utente imposta un obiettivo calorico o dei target macro
// propri (profile.customKcal / profile.customMacros), questi hanno sempre la
// precedenza sul calcolo automatico, che resta comunque il fallback di
// sempre (BMR/TDEE/percentuali, invariati). Deterministico.
function getUserProfile(profile, goalKey, autoKcal, autoTargets) {
  const kcalTarget = profile.customKcal ? Math.round(Number(profile.customKcal)) : autoKcal;
  const cm = profile.customMacros;
  const macroTargets = (cm && cm.proteinTargetG)
    ? { proteinTargetG: Number(cm.proteinTargetG)||0, carbTargetG: Number(cm.carbTargetG)||0, fatTargetG: Number(cm.fatTargetG)||0 }
    : autoTargets;
  return { ...profile, goalKey, kcalTarget, macroTargets, isCustomKcal: !!profile.customKcal, isCustomMacros: !!(cm && cm.proteinTargetG) };
}
 
// ─── MOTORE DI ANALISI NUTRIZIONALE (v1.6) ─────────────────────────────────────
// Tutta questa sezione è deterministica e pura: nessuna chiamata esterna,
// nessuno stato React. Prende in input i dati già calcolati dall'hook (totali,
// obiettivi, storico) e restituisce fatti e suggerimenti concreti. È pensata
// per essere riutilizzabile così com'è anche da una futura AI: le stesse
// funzioni possono alimentare un prompt (i "fatti" restano identici), oppure
// generare direttamente il testo come fa oggi getNutritionInsights().
 
// Quota indicativa di calorie giornaliere per tipo di pasto — usata sia per i
// suggerimenti di porzione sia per l'analisi della distribuzione calorica.
const MEAL_SHARE = { Colazione:0.20, Pranzo:0.35, Cena:0.35, Spuntino:0.10 };
 
// Obiettivi di macronutrienti in grammi. Se il peso è noto usiamo una stima
// realistica (1.6g proteine/kg), altrimenti una ripartizione percentuale
// standard delle calorie totali. Sempre deterministico, mai casuale.
function getMacroTargets(gKcal, profile) {
  const proteinTargetG = profile.weight ? Math.round(Number(profile.weight)*1.6) : Math.round(gKcal*0.15/4);
  const fatTargetG = Math.round(gKcal*0.28/9);
  const carbTargetG = Math.max(0, Math.round((gKcal - proteinTargetG*4 - fatTargetG*9)/4));
  return { proteinTargetG, carbTargetG, fatTargetG };
}
 
// Estrae i grammi/ml già presenti nel nome di un alimento, es. "Cozze (100g)".
// Molte voci del database li hanno già; quando mancano si ragiona per porzioni.
function parsePortionGrams(food) {
  const m = food.name.match(/\((\d+)\s*(g|ml)\)/i);
  return m ? { amount:Number(m[1]), unit:m[2].toLowerCase() } : null;
}
 
const PORTION_LABELS = { 0.5:"metà porzione", 0.75:"¾ di porzione", 1:"porzione intera", 1.25:"1¼ porzioni", 1.5:"1½ porzioni", 1.75:"1¾ porzioni", 2:"porzione doppia" };
const PORTION_STEPS = [0.5,0.75,1,1.25,1.5,1.75,2];
 
// Quantità consigliata per un alimento, nel contesto del pasto e di quanto
// budget calorico resta in giornata. Non prescrive mai "zero": anche a
// obiettivo già superato suggerisce almeno metà porzione (mai giudicante).
function suggestPortion(food, mealType, { gKcal, totalKcal }) {
  if (!food.kcal || food.kcal<=0) return null; // es. acqua: nessun senso di suggerire quantità
  const share = MEAL_SHARE[mealType] ?? 0.25;
  const remainingKcal = Math.max(0, gKcal-totalKcal);
  const idealSlot = Math.min(remainingKcal>0?remainingKcal:gKcal*share, gKcal*share);
  let ratio = idealSlot/food.kcal;
  ratio = Math.max(0.5, Math.min(2, ratio));
  ratio = PORTION_STEPS.reduce((a,b)=>Math.abs(b-ratio)<Math.abs(a-ratio)?b:a);
  const parsed = parsePortionGrams(food);
  return {
    ratio,
    label: parsed ? `~${Math.round(parsed.amount*ratio)}${parsed.unit} consigliati` : PORTION_LABELS[ratio],
  };
}
 
// Quale macronutriente è più indietro rispetto al proprio obiettivo giornaliero.
function analyzeMissingNutrient({ totalP, totalC, totalF, targets }) {
  const gaps = [
    { nutrient:"proteine",    pct: targets.proteinTargetG ? totalP/targets.proteinTargetG : 1, missing: Math.max(0,targets.proteinTargetG-totalP) },
    { nutrient:"carboidrati", pct: targets.carbTargetG    ? totalC/targets.carbTargetG    : 1, missing: Math.max(0,targets.carbTargetG-totalC) },
    { nutrient:"grassi",      pct: targets.fatTargetG     ? totalF/targets.fatTargetG     : 1, missing: Math.max(0,targets.fatTargetG-totalF) },
  ];
  const worst = gaps.reduce((a,b)=>b.pct<a.pct?b:a);
  if (worst.pct >= 0.85) return null; // già in linea, nulla da segnalare
  return { nutrient: worst.nutrient, missingGrams: Math.round(worst.missing) };
}
 
// Equilibrio dei pasti già registrati oggi: troppo grassi o troppo poche proteine.
function analyzeMealBalance(meals) {
  if (!meals.length) return null;
  const t = sumMacros(meals);
  const cals = t.p*4 + t.c*4 + t.f*9;
  if (cals===0) return null;
  const fatPct = (t.f*9)/cals, proteinPct = (t.p*4)/cals;
  if (fatPct > 0.45) return { type:"fat_heavy", pct:Math.round(fatPct*100) };
  if (proteinPct < 0.12 && meals.length>=2) return { type:"low_protein", pct:Math.round(proteinPct*100) };
  return null;
}
 
// Distribuzione calorica tra i pasti di oggi: un singolo pasto troppo dominante.
function analyzeDistribution(todayMeals) {
  if (todayMeals.length<2) return null;
  const byMeal = {};
  todayMeals.forEach(m=>{ byMeal[m.meal]=(byMeal[m.meal]||0)+(m.kcal||0); });
  const total = Object.values(byMeal).reduce((a,b)=>a+b,0);
  if (total===0) return null;
  const top = Object.entries(byMeal).map(([meal,kcal])=>({meal,pct:Math.round((kcal/total)*100)})).reduce((a,b)=>b.pct>a.pct?b:a);
  return top.pct>=65 ? top : null;
}
 
// Trend delle calorie negli ultimi giorni (esclude oggi, che è ancora in corso).
// Riusa lastNDayKeys/sumMacros già usati per memoria pasti e media settimanale.
function analyzeTrend(dailyLog, days=7) {
  const kcals = lastNDayKeys(days,1).map(k=>sumMacros(dailyLog[k]?.meals||[]).kcal).reverse();
  const logged = kcals.filter(k=>k>0);
  if (logged.length < 3) return null;
  const half = Math.floor(logged.length/2);
  const firstAvg = logged.slice(0,half).reduce((a,b)=>a+b,0)/half;
  const secondAvg = logged.slice(-half).reduce((a,b)=>a+b,0)/half;
  const diff = secondAvg-firstAvg;
  const direction = Math.abs(diff) < firstAvg*0.08 ? "stable" : diff>0 ? "up" : "down";
  return { direction, daysLogged: logged.length, avg: Math.round(logged.reduce((a,b)=>a+b,0)/logged.length) };
}
 
// 2-3 piccoli obiettivi per la giornata, sempre calcolati dallo stato reale
// (mai statici): l'utente vede subito cosa è già raggiunto.
function getDailyGoals({ targetWater, water, missingNutrient, mealsCount }) {
  const goals = [{ id:"water", label:`Bevi ${targetWater} bicchieri d'acqua`, done: water>=targetWater }];
  if (missingNutrient) goals.push({ id:"nutrient", label:`Aggiungi una fonte di ${missingNutrient.nutrient}`, done:false });
  goals.push({ id:"meals", label:"Registra almeno 3 pasti oggi", done: mealsCount>=3 });
  return goals.slice(0,3);
}

// Traguardi settimanali (v1.9): stessa forma dei dailyGoals ma su un
// orizzonte di 7 giorni — danno un senso di progresso che il singolo giorno
// da solo non può dare. Deterministico, calcolato sullo stesso dailyLog.
function getWeeklyGoals(dailyLog, gKcal, hydration) {
  const days = lastNDayKeys(7).map(k=>dailyLog[k]);
  const loggedDays = days.filter(d=>d?.meals?.length>0).length;
  const onTargetDays = days.filter(d=>{
    const k = sumMacros(d?.meals||[]).kcal;
    return k>0 && k<=gKcal*1.15 && k>=gKcal*0.85;
  }).length;
  const goals = [
    { id:"week_logged",   label:"Registra almeno 5 giorni su 7",        done: loggedDays>=5,   progress:loggedDays },
    { id:"week_calories", label:"Calorie nel target per 4 giorni su 7", done: onTargetDays>=4, progress:onTargetDays },
  ];
  if (hydration) {
    const goodDays = hydration.daysTracked - hydration.lowDays;
    goals.push({ id:"week_hydration", label:"Idratazione adeguata almeno 4 giorni su 7", done: goodDays>=4, progress: goodDays });
  }
  return goals;
}

// ─── MEAL BUILDER INTELLIGENTE (v1.9 · iterativo dalla v1.9.2) ─────────────────
// Il builder esisteva già dalla v1.4.1, ma componeva solo ciò che l'utente
// sceglieva manualmente. Dalla v1.9 suggestMeal propone un pasto completo
// (2-3 ingredienti, grammature dinamiche) mirato a colmare il macronutriente
// più carente della giornata, con lo stesso budget calorico per pasto già
// usato da suggestPortion (MEAL_SHARE).
//
// v1.9.2: il builder diventa iterativo — rigenera, sostituisci un singolo
// ingrediente, blocca quelli che piacciono, evita quelli già mangiati oggi.
// Nessuna AI, nessun pescaggio casuale: ogni "candidato successivo" è
// semplicemente il prossimo elemento della stessa classifica deterministica
// (per proteine/carboidrati) non ancora escluso — a parità di esclusioni,
// stesso risultato, sempre riproducibile. mealBudget/pickFirstEligible/
// composeMealItems sono condivisi da generazione, rigenerazione e
// sostituzione: nessuna logica duplicata tra le tre azioni.

const MEAL_TYPE_POOLS = {
  Colazione: ["Uova e Latticini", "Colazione e Snack", "Frutta"],
  Pranzo:    ["Carne e Pesce",    "Pasta e Cereali",    "Verdure e Legumi"],
  Cena:      ["Carne e Pesce",    "Verdure e Legumi",   "Pasta e Cereali"],
  Spuntino:  ["Frutta",           "Colazione e Snack",  "Uova e Latticini"],
};
// Peso calorico di ciascuno slot nel pasto — normalizzato dinamicamente sugli
// slot effettivamente presenti (composeMealItems), così un pasto a 2
// ingredienti (es. carboidrato saltato per "grassi mancanti") resta coerente.
const SLOT_WEIGHTS = { main:0.5, carb:0.35, side:0.15 };

function sortByKey(pool, key) {
  return [...pool.filter(f=>f.kcal>0)].sort((a,b)=>(b[key]||0)-(a[key]||0));
}
// Per il componente "carboidrato" del pasto si preferiscono alimenti con
// type:"carb" — altrimenti ordinare per soli grammi di carboidrati
// premierebbe dolci/dessert (es. Tiramisù) solo perché più zuccherini.
function sortCarb(pool) {
  const carbTyped = pool.filter(f => f.type==="carb" && f.kcal>0);
  const base = carbTyped.length ? carbTyped : pool.filter(f=>f.kcal>0);
  return [...base].sort((a,b)=>(b.c||0)-(a.c||0));
}

// Classifiche ordinate (non solo il primo) per i 3 slot del pasto — condivise
// da generazione, rigenerazione e sostituzione: cambia solo quale candidato
// della stessa lista viene scelto, mai il criterio di ordinamento.
function buildMealSlots(mealType, foodDB) {
  const cats = MEAL_TYPE_POOLS[mealType] || Object.keys(foodDB);
  const sideCat = foodDB[cats[2]]||[];
  const lightSide = sideCat.filter(f=>f.type==="light");
  return {
    main: sortByKey(foodDB[cats[0]]||[], "p"),
    carb: sortCarb(foodDB[cats[1]]||[]),
    side: sortByKey(lightSide.length?lightSide:sideCat, "c"),
  };
}

// Primo candidato della lista non ancora escluso (già mangiato oggi, già
// mostrato in questa sessione di suggerimenti, o già usato in un altro slot).
// Se la lista si esaurisce, si ricomincia dal primo — un pasto ripetuto è
// comunque meglio di nessun pasto, e la maggior parte delle categorie ha
// abbastanza voci da non arrivarci mai in pratica.
function pickFirstEligible(sortedList, excludeNames) {
  if (!sortedList.length) return null;
  return sortedList.find(f => !excludeNames.includes(f.name)) || sortedList[0];
}

// Budget calorico per il pasto indicato — stessa formula per generazione,
// rigenerazione e sostituzione singola (nessuna duplicazione).
function mealBudget(mealType, gKcal, totalKcal) {
  const share = MEAL_SHARE[mealType] ?? 0.25;
  const remaining = Math.max(0, gKcal-totalKcal);
  return Math.max(250, Math.min(remaining>0?remaining:gKcal*share, gKcal*share*1.4));
}

// Grammatura dinamica per un ingrediente del pasto — stessa scala
// PORTION_STEPS/PORTION_LABELS di suggestPortion, applicata alla quota di
// budget assegnata a quello slot.
function scalePortionForBudget(food, kcalBudget) {
  let ratio = kcalBudget/food.kcal;
  ratio = Math.max(0.5, Math.min(2, ratio));
  ratio = PORTION_STEPS.reduce((a,b)=>Math.abs(b-ratio)<Math.abs(a-ratio)?b:a);
  const parsed = parsePortionGrams(food);
  return { ratio, label: parsed ? `~${Math.round(parsed.amount*ratio)}${parsed.unit}` : PORTION_LABELS[ratio] };
}

// Compone gli item finali (con grammatura e valori calorici scalati) a
// partire dagli alimenti scelti per ciascuno slot presente. I valori
// originali dell'alimento (kcal/p/c/f "per porzione base") restano intatti
// sotto disp*, così un pasto può essere ricomposto più volte (rigenera,
// sostituisci) senza mai comporre errori a catena sulle grammature.
function composeMealItems(slotFoods, budget) {
  const present = Object.entries(slotFoods).filter(([,f])=>f);
  const totalWeight = present.reduce((s,[slot])=>s+(SLOT_WEIGHTS[slot]||0), 0) || 1;
  return present.map(([slot,food])=>{
    const share = (SLOT_WEIGHTS[slot]||0)/totalWeight;
    const portion = scalePortionForBudget(food, budget*share);
    const r = portion.ratio;
    return {
      ...food, _slot:slot, portionRatio:r, portionLabel:portion.label,
      dispKcal: Math.round(food.kcal*r),
      dispP:    Math.round((food.p||0)*r*10)/10,
      dispC:    Math.round((food.c||0)*r*10)/10,
      dispF:    Math.round((food.f||0)*r*10)/10,
    };
  });
}

function sumDispTotals(items) {
  return {
    kcal: items.reduce((s,i)=>s+i.dispKcal,0),
    p:    Math.round(items.reduce((s,i)=>s+i.dispP,0)*10)/10,
    c:    Math.round(items.reduce((s,i)=>s+i.dispC,0)*10)/10,
    f:    Math.round(items.reduce((s,i)=>s+i.dispF,0)*10)/10,
  };
}

// Genera (o rigenera) un pasto completo. `excludeNames` copre sia gli
// alimenti già mangiati oggi sia quelli già mostrati in questa sessione di
// suggerimenti (evita ingredienti appena usati). `lockedFoods` mantiene gli
// slot che l'utente ha bloccato perché gli piacciono, invariati nella scelta
// dell'alimento (la grammatura può comunque adattarsi al budget residuo).
function suggestMeal({ mealType, gKcal, totalKcal, totalP, totalC, totalF, targets, foodDB, excludeNames=[], lockedFoods={} }) {
  const budget = mealBudget(mealType, gKcal, totalKcal);
  const missing = analyzeMissingNutrient({ totalP, totalC, totalF, targets });
  const slots = buildMealSlots(mealType, foodDB);

  const picked = { main:null, carb:null, side:null };
  const used = [...excludeNames];

  ["main","carb","side"].forEach(slot=>{
    if (lockedFoods[slot]) { picked[slot]=lockedFoods[slot]; used.push(lockedFoods[slot].name); return; }
    if (slot==="carb" && missing?.nutrient==="grassi") return; // in quel caso non serve altro carboidrato
    const candidate = pickFirstEligible(slots[slot], used);
    if (candidate) { picked[slot]=candidate; used.push(candidate.name); }
  });

  const items = composeMealItems(picked, budget);
  if (!items.length) return null;
  const totals = sumDispTotals(items);
  const mainItem = items.find(i=>i._slot==="main") || items[0];

  const reason = missing
    ? `Ti mancano ancora circa ${missing.missingGrams}g di ${missing.nutrient} oggi: ${mainItem.name.toLowerCase()} aiuta a colmarli. Budget stimato per ${mealType.toLowerCase()}: ~${Math.round(budget)} kcal, da cui le grammature.`
    : `I tuoi macro di oggi sono già ben bilanciati: ho proposto un pasto vario. Budget stimato per ${mealType.toLowerCase()}: ~${Math.round(budget)} kcal, da cui le grammature.`;

  return { items, totals, reason, mealType };
}

// Sostituisce un singolo slot della proposta corrente, lasciando gli altri
// esattamente come sono (stesso alimento — la grammatura può cambiare di
// poco per via del ribilanciamento del budget tra gli slot presenti).
function substituteMealIngredient({ suggestion, slot, gKcal, totalKcal, foodDB, excludeNames=[] }) {
  const mealType = suggestion.mealType;
  const slots = buildMealSlots(mealType, foodDB);
  const currentNames = suggestion.items.map(i=>i.name);
  const candidate = pickFirstEligible(slots[slot], [...excludeNames, ...currentNames]);
  if (!candidate) return suggestion; // nessuna alternativa idonea: meglio non cambiare nulla

  const kept = {};
  suggestion.items.forEach(i => { if (i._slot!==slot) kept[i._slot]=i; });
  kept[slot] = candidate;

  const budget = mealBudget(mealType, gKcal, totalKcal);
  const items = composeMealItems(kept, budget);
  const totals = sumDispTotals(items);
  const reason = `Ho sostituito con ${candidate.name.toLowerCase()}, lasciando invariato il resto del pasto.`;

  return { ...suggestion, items, totals, reason };
}
 
// Punto di ingresso unico del motore: combina tutte le analisi e sceglie il
// messaggio più utile da mostrare come "headline" del coach. La priorità
// riflette cosa è più actionable adesso per l'utente.
// Superficie "insight": la headline della card Coach in home. Stessa priorità
// di prima (nutriente mancante > equilibrio pasti > distribuzione > trend >
// presenza leggera), ora espressa come libreria valutata da selectMessage.
const INSIGHT_MESSAGES = [
  { id:"ins_missing_nutrient", priority:2, cooldownMin:0,
    condition: ctx => !!ctx.missingNutrient,
    text: ctx => `Ti mancano circa ${ctx.missingNutrient.missingGrams}g di ${ctx.missingNutrient.nutrient} rispetto al tuo obiettivo di oggi.` },
  { id:"ins_fat_heavy", priority:2, cooldownMin:0,
    condition: ctx => ctx.mealBalance?.type==="fat_heavy",
    text: ctx => `Oggi i pasti sono piuttosto ricchi di grassi (${ctx.mealBalance.pct}% delle calorie).` },
  { id:"ins_low_protein_balance", priority:2, cooldownMin:0,
    condition: ctx => ctx.mealBalance?.type==="low_protein",
    text: ctx => `Potresti aggiungere più proteine ai prossimi pasti (solo ${ctx.mealBalance.pct}% delle calorie finora).` },
  { id:"ins_distribution", priority:2, cooldownMin:0,
    condition: ctx => !!ctx.distribution,
    text: ctx => `${ctx.distribution.meal} ha coperto il ${ctx.distribution.pct}% delle calorie di oggi: prova a distribuirle meglio nei prossimi giorni.` },
  { id:"ins_trend_up", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="up",
    text: ctx => `Le tue calorie medie sono in aumento negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_trend_down", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="down",
    text: ctx => `Le tue calorie medie sono in calo negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_all_good", priority:5, cooldownMin:0,
    condition: () => true,
    text: () => "Stai mantenendo un buon equilibrio nutrizionale, continua così!" },
];
 
function getNutritionInsights({ dailyLog, todayMeals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, hydration }, messageHistory) {
  const missingNutrient = analyzeMissingNutrient({ totalP, totalC, totalF, targets });
  const mealBalance = analyzeMealBalance(todayMeals);
  const distribution = analyzeDistribution(todayMeals);
  const trend = analyzeTrend(dailyLog);
  const dailyGoals = getDailyGoals({ targetWater, water, missingNutrient, mealsCount: todayMeals.length });
  const weeklyGoals = getWeeklyGoals(dailyLog, gKcal, hydration);
 
  const picked = selectMessage(INSIGHT_MESSAGES, { missingNutrient, mealBalance, distribution, trend }, messageHistory);
 
  return { targets, missingNutrient, mealBalance, distribution, trend, dailyGoals, weeklyGoals, headline: picked.text, headlineId: picked.id };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPALE — tutto lo stato persistito, le derivazioni e le azioni.
// App.jsx chiama questo hook una volta e usa l'oggetto restituito per il
// rendering; non contiene più alcuna logica di business propria.
// ─────────────────────────────────────────────────────────────────────────────
export function useNutriFox() {
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
 
  // Fox state — happiness, health, lastFedAt, moodIndex (stati intermedi v1.4)
  const [foxState,  setFoxState]  = useState(()=>load("nf_foxstate",{hunger:50,energy:50,happiness:70,health:90,lastFedAt:null,moodIndex:1,lastDecayAt:Date.now()}));
  const [bounce,    setBounce]    = useState(false);
  const [feedLabel, setFeedLabel] = useState("");
  const [reaction,  setReaction]  = useState(null); // {type, message} — popup temporaneo 2-3s
  const [reward,    setReward]    = useState(null); // {icon} — effetto ricompensa <2s (streak/acqua/obiettivo)
  const [licking,   setLicking]   = useState(false); // si lecca i baffi subito dopo il pasto
  const [celebratedToday, setCelebratedToday] = useState(()=>load("nf_celebrated_"+todayKey(),{}));
  // Cooldown del motore decisionale unificato (v1.7): quando è stato mostrato
  // per l'ultima volta ogni id di messaggio, condiviso tra le tre superfici.
  const [messageHistory, setMessageHistory] = useState(()=>load("nf_msgHistory",{}));
  function recordMessageShown(id){ if(!id) return; setMessageHistory(prev=>({...prev,[id]:Date.now()})); }
 
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
  useEffect(()=>save("nf_celebrated_"+todayKey(),celebratedToday),[celebratedToday]);
  useEffect(()=>save("nf_msgHistory",messageHistory),[messageHistory]);
 
  // v1.8.1: bug fix — il decay avanzava solo mentre l'app restava aperta
  // tramite il setInterval sotto. Su mobile si apre, si consulta, si chiude:
  // il timer si ferma e non recupera mai il tempo trascorso nel frattempo, per
  // cui fame/energia/felicità sembravano congelate da una sessione all'altra.
  // Questo effetto, eseguito una sola volta al mount, applica il decay
  // "arretrato" in base al tempo reale trascorso da lastDecayAt (persistito),
  // con un tetto di 6 ore per evitare valori assurdi se l'app resta chiusa a
  // lungo — oltre quella soglia la volpe è comunque già "addormentata" via pose.
  useEffect(()=>{
    setFoxState(prev=>{
      const lastDecay = prev.lastDecayAt || Date.now();
      const elapsedMin = Math.min(360, Math.max(0, (Date.now()-lastDecay)/60000));
      if (elapsedMin < 1) return { ...prev, lastDecayAt: Date.now() };
      const hunger    = Math.min(100, prev.hunger + 2*elapsedMin);
      const energy    = Math.max(0, prev.energy - 1*elapsedMin);
      const happiness = hunger > 70 ? Math.max(0, (prev.happiness??70) - 2*elapsedMin) : (prev.happiness??70);
      const health    = happiness < 30 ? Math.max(0, (prev.health??90) - 1*elapsedMin) : (prev.health??90);
      const target    = computeTargetMoodIndex(hunger, energy, happiness);
      const moodIndex = stepMoodIndex(prev.moodIndex, target);
      return { ...prev, hunger, energy, happiness, health, moodIndex, lastDecayAt: Date.now() };
    });
  }, []);
 
  // Decay system leggero: ogni minuto hunger sale, energy scende.
  // moodIndex avanza di un solo gradino per tick verso il mood "target".
  useEffect(()=>{
    const iv = setInterval(()=>{
      setFoxState(prev=>{
        const hunger    = Math.min(100, prev.hunger+2);
        const energy    = Math.max(0, prev.energy-1);
        const happiness = hunger > 70 ? Math.max(0, (prev.happiness??70)-2) : (prev.happiness??70);
        const health    = happiness < 30 ? Math.max(0, (prev.health??90)-1) : (prev.health??90);
        const target     = computeTargetMoodIndex(hunger, energy, happiness);
        const moodIndex  = stepMoodIndex(prev.moodIndex, target);
        return { ...prev, hunger, energy, happiness, health, moodIndex, lastDecayAt: Date.now() };
      });
    }, 60000); // ogni minuto
    return ()=>clearInterval(iv);
  },[]);
 
  const today    = todayKey();
  const todayData= dailyLog[today]||{meals:[]};
  // streak itera fino a 60 giorni di log: memoizzato, ricalcola solo se dailyLog cambia
  const streak   = useMemo(()=>getStreak(dailyLog),[dailyLog]);
  const stage    = useMemo(()=>getFoxStage(streak),[streak]);
  const mood     = MOOD_ORDER[foxState.moodIndex ?? computeTargetMoodIndex(foxState.hunger, foxState.energy, foxState.happiness??70)];
 
  function goalKcal(){
    const bmr=calcBMR(Number(profile.weight),Number(profile.height),Number(profile.age),profile.sex);
    const tdee=calcTDEE(bmr,profile.activity);
    const mult=GOALS[goalKey]?.mult||1;
    return profile.weight?Math.round(tdee*mult):(goalKey==="perdere_peso"?1600:goalKey==="tener_traccia"?2200:2000);
  }
 
  const todayTotals = sumMacros(todayData.meals);
  const totalKcal = todayTotals.kcal, totalP = todayTotals.p, totalC = todayTotals.c, totalF = todayTotals.f;

  // v1.9: profilo utente unificato — calorie e macro target diventano un
  // solo oggetto derivato (userProfile), con eventuali override manuali
  // dell'utente sempre prioritari sul calcolo automatico invariato sotto.
  const autoKcal = useMemo(()=>goalKcal(), [profile.weight, profile.height, profile.age, profile.sex, profile.activity, goalKey]);
  const autoTargets = useMemo(()=>getMacroTargets(autoKcal, profile), [autoKcal, profile.weight]);
  const userProfile = useMemo(()=>getUserProfile(profile, goalKey, autoKcal, autoTargets), [profile, goalKey, autoKcal, autoTargets]);
  const gKcal   = userProfile.kcalTarget;
  const targets = userProfile.macroTargets;
  const targetWater = Math.round(((Number(profile.weight)||70)*35+(totalKcal/1000)*300)/250);

  // v1.9: memoria comportamentale unificata — routine pasti, alimenti
  // ricorrenti, pattern di idratazione. Memoizzata sul diario, consultata da
  // ambient, coach e traguardi settimanali.
  const userMemory = useMemo(()=>getUserMemory(dailyLog), [dailyLog]);
 
  // weekAvg itera 7 giorni e somma i pasti di ciascuno: memoizzato
  const weekAvg = useMemo(()=>{
    const weekKcals = lastNDayKeys(7).map(d=>sumMacros(dailyLog[d]?.meals||[]).kcal);
    const nonZero = weekKcals.filter(k=>k>0);
    return Math.round(nonZero.reduce((s,k)=>s+k,0)/(nonZero.length||1));
  },[dailyLog]);
 
  const hoursSinceLastFed = foxState.lastFedAt ? (Date.now()-foxState.lastFedAt)/3600000 : null;
 
  // Superficie "ambient" (didascalia in home): memoizzata sulle dipendenze
  // reali, non ricalcola ad ogni tick di decay se nulla di rilevante è
  // cambiato. Il cooldown viene registrato solo quando il messaggio
  // selezionato CAMBIA (transizione), non ad ogni render — altrimenti un
  // messaggio si auto-invaliderebbe l'istante dopo essere apparso.
  const ambientResult = useMemo(()=>selectMessage(AMBIENT_MESSAGES, buildAmbientContext({
    hoursSinceLastFed, water, targetWater, totalP, mealsCount:todayData.meals.length,
    totalKcal, gKcal, mood, foxName, dailyLog, todayMeals:todayData.meals, userMemory,
  }), messageHistory),[hoursSinceLastFed, water, targetWater, totalP, todayData.meals, totalKcal, gKcal, mood, foxName, dailyLog, messageHistory, userMemory]);
  const contextualMessage = ambientResult.text;
  // v1.8: quale emozione mostrare sul volto mentre questo messaggio è attivo.
  // Una ricompensa in corso (streak/obiettivo/acqua) vince sempre — è il
  // momento più "orgoglioso" possibile — altrimenti segue il messaggio ambient.
  const specialEmotion = reward ? "proud" : ambientResult.emotion;
  const prevAmbientId = useRef(null);
  useEffect(()=>{
    if (ambientResult.id !== prevAmbientId.current) {
      if (prevAmbientId.current) recordMessageShown(prevAmbientId.current);
      prevAmbientId.current = ambientResult.id;
    }
  },[ambientResult.id]);
 
  // Motore di analisi nutrizionale (v1.6): combina target macro, equilibrio
  // pasti, distribuzione calorica e trend recente. Memoizzato perché include
  // un'analisi su 7 giorni di storico, non va ricalcolata ad ogni render.
  // La headline (v1.7) passa dallo stesso motore/cooldown condiviso.
  const insights = useMemo(()=>getNutritionInsights({
    dailyLog, todayMeals:todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, hydration:userMemory.hydration,
  }, messageHistory),[dailyLog, todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, messageHistory, userMemory]);
  const prevInsightId = useRef(null);
  useEffect(()=>{
    if (insights.headlineId !== prevInsightId.current) {
      if (prevInsightId.current) recordMessageShown(prevInsightId.current);
      prevInsightId.current = insights.headlineId;
    }
  },[insights.headlineId]);
 
  // Quantità consigliata per un alimento specifico nel contesto del pasto che
  // si sta per registrare. Non memoizzata: è una funzione O(1) invocata per
  // ogni riga della lista alimenti, il costo è trascurabile.
  function suggestPortionFor(food, mealType) {
    return suggestPortion(food, mealType, { gKcal, totalKcal });
  }

  // v1.9: propone un pasto completo per il tipo indicato, mirato a colmare
  // il macro più carente della giornata. v1.9.2: accetta anche esclusioni
  // (già mostrate in questa sessione) e slot bloccati dall'utente, ed evita
  // sempre gli alimenti già registrati oggi ("appena usati"). Non memoizzata
  // (chiamata solo su tap dei pulsanti del builder, non ad ogni render).
  function suggestMealFor(mealType, { excludeNames=[], lockedFoods={} } = {}) {
    const eatenToday = todayData.meals.map(m=>m.name);
    return suggestMeal({ mealType, gKcal, totalKcal, totalP, totalC, totalF, targets, foodDB: FOOD_DB, excludeNames:[...eatenToday, ...excludeNames], lockedFoods });
  }

  // v1.9.2: sostituisce un solo ingrediente della proposta corrente (uno
  // slot: main/carb/side), lasciando gli altri invariati. Evita comunque gli
  // alimenti già mangiati oggi e quelli già mostrati in questa sessione.
  function substituteMealIngredientFor(suggestion, slot, excludeNames=[]) {
    const eatenToday = todayData.meals.map(m=>m.name);
    return substituteMealIngredient({ suggestion, slot, gKcal, totalKcal, foodDB: FOOD_DB, excludeNames:[...eatenToday, ...excludeNames] });
  }
 
  // Effetti di ricompensa: si attivano una sola volta per evento al giorno.
  useEffect(()=>{
    if (todayData.meals.length>0 && totalKcal<=gKcal && totalKcal>=gKcal*0.85 && !celebratedToday.goal) {
      setReward({icon:"🎯"});
      setCelebratedToday(p=>({...p,goal:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[totalKcal,gKcal]);
 
  useEffect(()=>{
    if (water>=targetWater && targetWater>0 && !celebratedToday.water) {
      setReward({icon:"💧"});
      setCelebratedToday(p=>({...p,water:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[water,targetWater]);
 
  useEffect(()=>{
    if (streak>0 && streak%7===0 && !celebratedToday["streak"+streak]) {
      setReward({icon:"🔥"});
      setCelebratedToday(p=>({...p,["streak"+streak]:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[streak]);
 
  // Food lists
  const categories=["Recenti","Preferiti","Tutti",...Object.keys(FOOD_DB)];
  function getPool(cat){
    if(cat==="Recenti") return recentFoods.slice(0,12);
    if(cat==="Preferiti") return ALL_FOODS.filter(f=>favorites.includes(f.name));
    if(cat==="Tutti") return ALL_FOODS;
    return FOOD_DB[cat]||[];
  }
 
  function toggleFavorite(name){
    setFavorites(prev => prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name]);
  }
 
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
      if (!res.ok) throw new Error(data?.error?.message || "Richiesta non riuscita");
      const reply = data.content?.[0]?.text || "Uhm... non riesco a rispondere ora!";
      setAiMessages(prev=>[...prev,{role:"assistant",content:reply}]);
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
 
  function triggerReaction(type, message){
    setReaction({ type, message });
    setTimeout(()=>setReaction(null), 2500);
  }
 
  // Aggiunge un alimento al log di oggi e fa reagire la volpe. Non tocca
  // navigazione o stato dei form: quello resta responsabilità di App.jsx.
  function addFood(food, mealType){
    const effect=getFoodEffect(food);
    const waitedLong = hoursSinceLastFed != null && hoursSinceLastFed >= 5;
    const reactionType = waitedLong ? "relieved" : effect.reaction;
    const message = buildReactionCandidates({
      reactionType, foodName:food.name, userMemory, mealType, waitedLong,
    });
    setFoxState(prev=>{
      const hunger    = Math.max(0,prev.hunger+effect.hungerDelta);
      const energy    = Math.min(100,prev.energy+effect.energyDelta);
      const happiness = Math.min(100,(prev.happiness??70)+effect.happinessDelta);
      const target    = computeTargetMoodIndex(hunger, energy, happiness);
      const moodIndex = stepMoodIndex(prev.moodIndex, target);
      return { ...prev, hunger, energy, happiness, lastFedAt:Date.now(), moodIndex };
    });
    triggerBounce(effect.label);
    triggerReaction(reactionType, message);
    setLicking(true);
    setTimeout(()=>setLicking(false), 900);
    const entry={...food,meal:mealType,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})};
    setDailyLog(prev=>({...prev,[today]:{meals:[...(prev[today]?.meals||[]),entry]}}));
    setRecentFoods(prev=>[food,...prev.filter(f=>f.name!==food.name)].slice(0,20));
  }
 
  // Ritorna true/false in base al successo, così App.jsx sa se resettare il
  // form e navigare (stesso comportamento della v1.4, solo riorganizzato).
  function addCustomFood(fields, mealType){
    if(!fields.name||!fields.kcal) return false;
    addFood({name:fields.name,kcal:Number(fields.kcal),p:Number(fields.p)||0,c:Number(fields.c)||0,f:Number(fields.f)||0,type:"carb"}, mealType);
    return true;
  }
 
  function removeFood(idx){
    setDailyLog(prev=>{const meals=[...(prev[today]?.meals||[])];meals.splice(idx,1);return{...prev,[today]:{meals}};});
  }
 
  function saveRecipe(name, ingredients){
    if(!name||ingredients.length===0) return false;
    const totals = sumMacros(ingredients);
    setCustomRecipes(prev=>[...prev,{name,kcal:Math.round(totals.kcal),p:Math.round(totals.p),c:Math.round(totals.c),f:Math.round(totals.f),ingredients,type:"carb"}]);
    return true;
  }
 
  return {
    // profilo & setup
    setupDone, setSetupDone, foxName, setFoxName, goalKey, setGoalKey, profile, setProfile,
    // dati persistiti letti direttamente dalla UI
    dailyLog, favorites, customRecipes, water, setWater,
    // coach AI
    aiMessages, aiInput, setAiInput, aiLoading, askFox, chatEndRef,
    // stato volpe
    foxState, bounce, feedLabel, reaction, reward, licking, specialEmotion,
    // derivazioni
    today, todayData, streak, stage, mood, contextualMessage,
    totalKcal, totalP, totalC, totalF, gKcal, targetWater, weekAvg,
    // profilo utente unificato e memoria comportamentale (v1.9)
    userProfile, userMemory,
    // motore di analisi nutrizionale (v1.6) — insights include ora anche
    // weeklyGoals (v1.9)
    insights, suggestPortion: suggestPortionFor,
    // meal builder intelligente (v1.9, iterativo dalla v1.9.2)
    suggestMealFor, substituteMealIngredientFor,
    // alimenti
    categories, getPool,
    // azioni
    addFood, addCustomFood, removeFood, saveRecipe, toggleFavorite,
  };
}
 


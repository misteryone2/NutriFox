import { useState, useEffect, useMemo, useRef } from "react";
import { getFoxStage } from "./Fox";
import { FOOD_DB, ALL_FOODS } from "./FoodDB";

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// useNutriFox.js — v2.1
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
//
// (v1.9.4 non tocca questo file: ha arricchito solo FoodDB.js con nuovi
// metadati per alimento, non ancora consultati da questa logica.)
//
// v1.9.5: il motore messaggi (v1.7) guadagna un sistema di varietà. Il
// cooldown da solo è un interruttore on/off; non impediva a un messaggio di
// tornare a ripetersi appena il cooldown scadeva, se restava l'unico
// candidato idoneo. Ora nf_msgHistory tiene, per ogni id, { last, count }
// invece di un semplice timestamp: count alimenta sia una penalità morbida
// sul peso (pickTopPriority riceve pesi già scontati in base a quante volte
// il messaggio è stato mostrato di recente) sia un'esclusione temporanea
// oltre soglia (VARIETY_SUPPRESS_AFTER) — ma solo se esiste un'alternativa
// idonea, mai un silenzio. Il conteggio decade da solo dopo
// VARIETY_DECAY_HOURS di pausa. Storico salvato prima di questa versione
// (timestamp puro) resta compatibile tramite normalizeHistoryEntry.
//
// v1.9.6: pulizia strutturale, zero cambi di comportamento. Il file era
// diventato enorme (1258 righe) e le sue parti si erano sparpagliate nel
// tempo — es. INSIGHT_MESSAGES/getNutritionInsights (nutrizione) erano
// finiti fisicamente dopo il Meal Builder solo perché aggiunti in quel punto
// in v1.9.2, non per un criterio logico. Tutto il codice a livello di modulo
// (fuori dall'hook) è stato riorganizzato in 6 sezioni marcate, in ordine di
// dipendenza (ognuna usa solo sezioni che la precedono, mai il contrario):
// PERSISTENCE → PROFILE ENGINE → MEMORY ENGINE → NUTRITION ENGINE →
// SUGGESTION ENGINE → FOX ENGINE. L'hook useNutriFox() resta un unico blocco
// alla fine, invariato al suo interno — riordinare lo stato/i memo/gli effetti
// di un hook React comporta rischi reali di rompere l'ordine delle
// dipendenze per zero beneficio; l'estrazione futura in moduli riguarderà
// prima le funzioni pure qui sopra, l'hook stesso è un progetto a parte.
// Verificato con un confronto insiemistico automatico (nessuna riga persa o
// duplicata) e un secondo confronto sull'elenco di tutte le dichiarazioni
// top-level prima/dopo (identico) — questa non è una riscrittura, è uno
// spostamento puro.
//
// v1.9.7: gli insight erano tutti "istantanei" — fatti su oggi o su un trend
// a breve termine. Tre nuove funzioni pure distinguono ora tre timeframe:
// analyzeWeeklyNutrientHabit/analyzeWeeklyMealPattern riconoscono un problema
// che si ripete nella maggioranza dei giorni della settimana (non più un
// caso isolato di oggi), analyzeWeekOverWeek confronta la settimana corrente
// con quella precedente e sceglie la variazione più significativa — qui la
// volpe inizia davvero a parlare di progressi, non solo di stato attuale.
// Ogni voce di INSIGHT_MESSAGES è ora etichettata con un timeframe esplicito
// ("today"/"week_habit"/"week_progress", INSIGHT_TIMEFRAMES) restituito in
// headlineTimeframe — la priorità resta il criterio di scelta (un problema
// urgente di oggi batte sempre un'osservazione settimanale). Entrambi i
// confronti richiedono almeno 3 giorni loggati per lato: con pochi dati non
// si dice nulla, piuttosto che azzardare un confronto disonesto.
//
// v2.0 — Evoluzione architetturale. Non nuove funzionalità: separazione
// definitiva di logica nutrizionale e comportamentale, con 5 responsabilità
// nette (User Profile, User Memory, Nutrition Engine, Fox Engine, Message
// Engine), ancora tutte in questo file — l'estrazione fisica in moduli
// separati resta un passo a parte, per quando sarà il momento.
//
//  - Nutrition Engine: getNutritionInsights diventa computeNutritionState —
//    SOLI fatti, nessuna scelta di testo. Il Meal Builder si sposta qui da
//    quella che era "Suggestion Engine" (suggerire cibo è dominio
//    nutrizionale, non dialogo).
//  - Message Engine (ex "Suggestion Engine"): assorbe anche INSIGHT_MESSAGES/
//    AMBIENT_MESSAGES/REACTION_MESSAGES e i loro context-builder — prima
//    erano sparsi tra Nutrition Engine e Fox Engine. Non legge più mai
//    dailyLog: legge solo nutritionState/userMemory/foxState.
//  - Fox Engine: diventa il vero centro della parte comportamentale. Un solo
//    oggetto foxState (emotion, energy, relationship, trust, experience,
//    curiosity, personality, memory, behavior) — tutto il resto dell'app
//    legge solo questo. Lo stato biologico grezzo tick-based (prima si
//    chiamava anch'esso "foxState") è stato rinominato fxVitals: è un INPUT
//    di computeFoxState, non lo stato completo. experience/trust/curiosity
//    sono calcoli di crescita/prevedibilità/esplorazione (non contatori
//    semplici — vedi i commenti sulle singole funzioni). relationship è UNO
//    degli attributi, non il fulcro: altri potranno affiancarlo in futuro
//    senza riprogettare il modello. memory include eventi storici (prima
//    streak settimanale, primo ritorno dopo una pausa), non solo l'ultimo.
//    personality è statica per ora, predisposta per l'AI futura.
//  - FoxBrain.js/FoxAnimations.js (v2.0, non più solo useNutriFox.js):
//    relationship/trust influenzano SOLO elementi secondari — warmthScale/
//    glowOpacity in FoxBrain (mai lo stage, che resta legato solo alla
//    streak) e una modulazione ±10% dei micro-eventi in FoxAnimations
//    (mai i pesi/la personalità di base). FoxSVG.jsx resta invariato.
//  - Eliminata una duplicazione preesistente: deriveStage viveva sia in
//    FoxBrain.js sia (copiata) in Fox.jsx; ora è unica, esportata da
//    FoxBrain ed esposta da Fox.jsx come semplice re-export.
// Tutto deterministico (zero Math.random() nel nuovo codice), verificato con
// test isolati su scenari sintetici di 90 giorni (esperienza, streak mai
// raggiunta, milestone storiche, pause e ritorni) prima di essere collegato
// all'hook.
//
// v2.1 — Evoluzione cognitiva della volpe (Behavior Engine + Learning Layer).
// Ancora nessuna AI, ancora architettura a 7 file, ancora FoxSVG invariato.
//
//  - foxState si estende con 5 nuovi attributi: confidence (quanto la volpe
//    è "sicura" di ciò che sa — volume di dati + trust + stabilità dei
//    synthetic mood), motivation (la spinta osservata nell'utente: obiettivi,
//    week-over-week, streak vs record), attachment (legame di lungo periodo:
//    experience + relationship + milestone), adaptation (il Learning Layer:
//    costanza + trust + idratazione + curiosity + risposta ai consigli —
//    combinati, non un modello che si allena, solo dati che cambiano nel
//    tempo), moodHistory (ultimi 7 stati SINTETICI dedotti da dailyLog, non
//    un log reale — nessun nuovo store persistente).
//  - Nuova computeBehaviorState(): traduce foxState+nutritionState in
//    comportamento corrente (etichetta), iniziativa, frequenza consigli,
//    intensità animazioni, propensione a incoraggiare/osservare. Meno
//    interventi quando l'utente va bene (isDoingWell → observePropensity
//    alta, initiative bassa), più supporto quando c'è un problema reale.
//  - Message Engine: selectMessage/buildReactionCandidates accettano ora
//    behaviorState. adviceFrequency scala il cooldown (±15%, "quando
//    parlare"); applyBehaviorModulation (unica funzione condivisa dalle due
//    superfici) pesa i candidati già esistenti in base al loro tono
//    (MESSAGE_TONE: encouraging/direct) e a encouragePropensity/initiative
//    ("quale tono") — nessuna nuova libreria di frasi.
//  - FoxBrain/FoxAnimations: behaviorState modula LEGGERMENTE warmth/glow
//    (nudge ±0.1 da animationIntensity), un pose lean minuscolo (±2px da
//    currentBehavior), e — tramite lo stesso vitality già di v2.0, ora
//    fuso con animationIntensity in un solo calcolo in Fox.jsx — anche la
//    durata delle micro-animazioni in FoxAnimations, sempre nella stessa
//    banda ±10%. Stage/streak/FoxSVG invariati.
//  - Deduplicazione: la formula di warmth (relationship+trust)/200 era
//    scritta sia in Fox.jsx sia dentro FoxBrain — ora vive una sola volta in
//    FoxBrain (computeWarmth, esportata), usata da entrambi.
// Verificato con test isolati (moodHistory, confidence/motivation/
// attachment/adaptation su uno scenario di 60 giorni "virtuoso", e
// computeBehaviorState su due scenari opposti: tutto ok → celebratory/
// observing/iniziativa bassa; problema urgente → supportive/iniziativa
// massima) prima di collegare tutto all'hook.
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 1 · PERSISTENCE
// Storage grezzo (localStorage) e utility di date condivise da tutti gli altri motori.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Storage ────────────────────────────────────────────────────────────────
// ─── STORAGE ──────────────────────────────────────────────────────────────────
function load(k,fb){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().split("T")[0]; }

// ─── Date/chiavi giorno ─────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 2 · PROFILE ENGINE
// Chi è l'utente e quali sono i suoi obiettivi: BMR/TDEE, GOALS, e il profilo
// unificato (calorie/macro target, con eventuali override manuali).
// ═════════════════════════════════════════════════════════════════════════════

// ─── Calcolo automatico (BMR/TDEE) e obiettivi ─────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 3 · MEMORY ENGINE
// Memoria comportamentale: cosa mangia di solito l'utente, quando, con cosa,
// e quanto beve. Usata da Nutrition Engine (traguardi settimanali) e da Fox
// Engine (reazioni e didascalie che citano le abitudini).
// ═════════════════════════════════════════════════════════════════════════════

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

// ─── Routine orarie di un tipo di pasto ────────────────────────────────────
// Routine di un tipo di pasto: media oraria negli ultimi 14 giorni (esclusi
// oggi), solo se ci sono abbastanza dati per parlare davvero di "abitudine".
// v2.0: oltre alla media, anche `spreadHours` — quanto sono sparsi gli orari
// intorno alla media (deviazione media assoluta). Non serve solo a sapere
// QUANDO l'utente mangia di solito, ma QUANTO è prevedibile: un valore basso
// alimenta la fiducia del Fox Engine, uno alto la riduce. Nessuna nuova
// scansione: stessi campioni già raccolti per avgHour.
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
  const spreadHours = Math.round((hours.reduce((s,h)=>s+Math.abs(h-avgHour),0)/hours.length)*10)/10;
  return { avgHour, samples: hours.length, spreadHours };
}

// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 4 · NUTRITION ENGINE
// Analisi nutrizionale pura: totali, target, cosa manca, come sono distribuiti
// i pasti, il trend, i traguardi (giornalieri e settimanali), lo stato
// nutrizionale del giorno/settimana, e il Meal Builder (suggerire cibo è
// dominio nutrizionale, non dialogo — spostato qui dalla v2.0, prima viveva
// insieme al motore messaggi solo per contiguità storica). Nessuno stato
// React, nessuna chiamata esterna, nessuna scelta di testo: questo motore
// restituisce SOLO fatti strutturati (nutritionState) — è il Message Engine,
// più avanti, a scegliere quale fatto diventa la headline mostrata.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Totali e streak di costanza ────────────────────────────────────────────
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

// v1.9.7: fino ad ora gli insight erano tutti "istantanei" — fatti su oggi
// (missingNutrient/mealBalance/distribution) o su un trend a breve termine
// (analyzeTrend, comunque interno agli ultimi 7 giorni). Mancava una vera
// distinzione tra "problema di oggi" (isolato, può essere un caso) e
// "abitudine della settimana" (lo stesso problema che si ripete più giorni —
// non più un caso). analyzeWeeklyNutrientHabit riusa la stessa
// analyzeMealBalance già scritta per oggi, applicata a ciascun giorno della
// settimana: nessuna logica di sbilancio duplicata, cambia solo su quanti
// giorni viene valutata.

// Sbilancio di macro che si ripete nella maggioranza dei giorni loggati della
// settimana (esclude oggi, ancora in corso) — non un fatto isolato ma un
// pattern. Richiede almeno 3 giorni loggati per parlare di "abitudine".
function analyzeWeeklyNutrientHabit(dailyLog, days=7) {
  const loggedDaysMeals = lastNDayKeys(days,1)
    .map(k => dailyLog[k]?.meals || [])
    .filter(meals => meals.length>0);
  if (loggedDaysMeals.length < 3) return null;
  const balances = loggedDaysMeals.map(analyzeMealBalance).filter(Boolean);
  if (!balances.length) return null;
  const counts = {};
  balances.forEach(b => { counts[b.type] = (counts[b.type]||0)+1; });
  const [type, days_] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if (days_ < Math.ceil(loggedDaysMeals.length*0.6)) return null; // non abbastanza ricorrente da essere un'abitudine
  return { type, days: days_, totalDays: loggedDaysMeals.length };
}

// Quale pasto tende a dominare le calorie della giornata, in media, sui
// giorni della settimana — stessa domanda di analyzeDistribution ma sull'arco
// della settimana invece che sul solo oggi.
function analyzeWeeklyMealPattern(dailyLog, days=7) {
  const totalsByMeal = {};
  let daysWithData = 0;
  lastNDayKeys(days,1).forEach(k => {
    const meals = dailyLog[k]?.meals || [];
    if (!meals.length) return;
    const byMeal = {};
    meals.forEach(m => { byMeal[m.meal] = (byMeal[m.meal]||0)+(m.kcal||0); });
    const dayTotal = Object.values(byMeal).reduce((a,b)=>a+b,0);
    if (!dayTotal) return;
    daysWithData++;
    Object.entries(byMeal).forEach(([meal,kcal]) => {
      totalsByMeal[meal] = (totalsByMeal[meal]||0) + kcal/dayTotal; // media delle quote giornaliere
    });
  });
  if (daysWithData < 3) return null;
  const avgShares = Object.entries(totalsByMeal).map(([meal,sum])=>({ meal, avgPct:Math.round((sum/daysWithData)*100) }));
  if (!avgShares.length) return null;
  const top = avgShares.reduce((a,b)=>b.avgPct>a.avgPct?b:a);
  return top.avgPct>=55 ? top : null;
}

// Confronto tra la settimana corrente e quella precedente — la vera novità
// richiesta: la volpe può iniziare a parlare di progressi, non solo dello
// stato attuale. Richiede almeno 3 giorni loggati in ENTRAMBE le settimane,
// altrimenti il confronto non sarebbe onesto e si preferisce non dire nulla.
// Deterministico: a parità di dati, sceglie sempre la stessa metrica (quella
// con la variazione più marcata), mai a caso.
function analyzeWeekOverWeek(dailyLog, gKcal) {
  const summarize = keys => {
    const daysMeals = keys.map(k=>dailyLog[k]?.meals||[]).filter(m=>m.length>0);
    if (daysMeals.length < 3) return null;
    const totals = daysMeals.map(sumMacros);
    const avgKcal = totals.reduce((a,b)=>a+b.kcal,0)/daysMeals.length;
    const avgP    = totals.reduce((a,b)=>a+b.p,0)/daysMeals.length;
    const onTargetDays = totals.filter(t=>t.kcal>0 && t.kcal<=gKcal*1.15 && t.kcal>=gKcal*0.85).length;
    return { daysLogged: daysMeals.length, avgKcal, avgP, onTargetDays };
  };
  const thisWeek = summarize(lastNDayKeys(7,1));   // esclude oggi, ancora in corso
  const lastWeek = summarize(lastNDayKeys(7,8));   // i 7 giorni precedenti a quelli
  if (!thisWeek || !lastWeek) return null;

  const proteinDeltaPct = lastWeek.avgP>0 ? Math.round(((thisWeek.avgP-lastWeek.avgP)/lastWeek.avgP)*100) : 0;
  const onTargetDelta = thisWeek.onTargetDays - lastWeek.onTargetDays;
  const loggedDelta = thisWeek.daysLogged - lastWeek.daysLogged;

  const candidates = [
    { metric:"protein",  delta:proteinDeltaPct, magnitude:Math.abs(proteinDeltaPct) },
    { metric:"onTarget", delta:onTargetDelta,   magnitude:Math.abs(onTargetDelta)*15 },  // scalato per confrontabilità con %
    { metric:"logged",   delta:loggedDelta,     magnitude:Math.abs(loggedDelta)*15 },
  ].filter(c => c.magnitude>=10); // soglia minima: sotto, non vale la pena dirlo
  if (!candidates.length) return null;
  const best = candidates.reduce((a,b)=>b.magnitude>a.magnitude?b:a);
  return { metric:best.metric, delta:best.delta, thisWeek, lastWeek };
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

// ─── Stato nutrizionale (fatti, nessuna scelta di testo) ───────────────────
// v2.0: prima questa funzione (getNutritionInsights) calcolava i fatti E
// sceglieva il testo della headline nello stesso posto — mescolando Nutrition
// Engine e Message Engine. Ora restituisce SOLO fatti strutturati
// (nutritionState): è il Message Engine, più avanti nel file, a scegliere
// quale fatto diventa la headline, leggendo esclusivamente questo oggetto.
function computeNutritionState({ dailyLog, todayMeals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, weeklyGoals }) {
  const missingNutrient = analyzeMissingNutrient({ totalP, totalC, totalF, targets });
  const mealBalance = analyzeMealBalance(todayMeals);
  const distribution = analyzeDistribution(todayMeals);
  const trend = analyzeTrend(dailyLog);
  const weeklyHabit = analyzeWeeklyNutrientHabit(dailyLog);
  const weeklyMealPattern = analyzeWeeklyMealPattern(dailyLog);
  const weekOverWeek = analyzeWeekOverWeek(dailyLog, gKcal);
  const dailyGoals = getDailyGoals({ targetWater, water, missingNutrient, mealsCount: todayMeals.length });

  return { targets, missingNutrient, mealBalance, distribution, trend, weeklyHabit, weeklyMealPattern, weekOverWeek, dailyGoals, weeklyGoals };
}

// ═════════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 5 · MESSAGE ENGINE
// Tutto ciò che riguarda "cosa dice la volpe": il motore di selezione
// (priorità + varietà, v1.7/v1.9.5) e le librerie di dialogo (reazione al
// pasto, didascalia ambient) con il loro contesto. Dalla v2.0 questo motore
// non legge più dailyLog: consulta esclusivamente gli stati strutturati
// restituiti da User Profile, User Memory, Nutrition Engine e Fox Engine —
// la stessa disciplina già in vigore per INSIGHT_MESSAGES (nutritionState) è
// ora estesa anche ad AMBIENT_MESSAGES/REACTION_MESSAGES (foxState/
// userMemory).
// ═════════════════════════════════════════════════════════════════════════════

// ─── Motore di selezione messaggi (priorità + varietà) ─────────────────────
// ─── MOTORE DECISIONALE UNIFICATO (v1.7 · sistema di varietà in v1.9.5) ────────
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
//
// v1.9.5: il cooldown da solo è un interruttore on/off (o è passato abbastanza
// tempo o no) e non impedisce a un messaggio di tornare a ripetersi appena il
// cooldown scade, se resta l'unico candidato idoneo in quel momento. Manca
// una vera memoria di "questa frase è stata mostrata troppe volte". Il
// sistema di varietà aggiunge due meccanismi, entrambi basati sullo stesso
// storico già persistito (nf_msgHistory), esteso da un timestamp a
// { last, count }:
//   1. Penalità morbida sul peso: più un messaggio è stato mostrato di
//      recente, meno probabile è che vinca un pareggio di priorità con un
//      altro candidato altrettanto idoneo (pickTopPriority resta invariato,
//      riceve solo pesi già scontati).
//   2. Esclusione temporanea (fatica): oltre una soglia di ripetizioni
//      ravvicinate, il messaggio viene escluso del tutto da questo turno di
//      selezione — MA solo se esiste almeno un'alternativa idonea; se fosse
//      l'unico candidato possibile, torna comunque eleggibile (mai un
//      "silenzio" pur di rispettare la varietà).
// Il contatore si azzera da solo se il messaggio non viene rivisto per
// VARIETY_DECAY_HOURS: la fatica è sempre relativa al periodo recente, non
// un giudizio permanente sul messaggio.

const VARIETY_DECAY_HOURS   = 12;   // oltre questa pausa, il conteggio riparte da zero
const VARIETY_SUPPRESS_AFTER = 3;   // mostrato 3+ volte di recente → escluso se c'è un'alternativa
const VARIETY_PENALTY        = 0.35; // quanto pesa ogni mostra recente sul peso (soft)

// Storico prima della v1.9.5: nf_msgHistory salvava solo un timestamp numerico
// per id. Normalizza il formato vecchio in { last, count:1 } così un utente
// che aggiorna l'app non perde né rompe lo storico già accumulato.
function normalizeHistoryEntry(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return { last: raw, count: 1 };
  return raw;
}

function varietyFactor(id, messageHistory, now) {
  const entry = normalizeHistoryEntry(messageHistory[id]);
  if (!entry) return 1;
  if (now-entry.last >= VARIETY_DECAY_HOURS*3600000) return 1; // troppo tempo fa, nessuna penalità
  return 1/(1+VARIETY_PENALTY*(entry.count||1));
}

function isFatigued(id, messageHistory, now) {
  const entry = normalizeHistoryEntry(messageHistory[id]);
  if (!entry) return false;
  if (now-entry.last >= VARIETY_DECAY_HOURS*3600000) return false;
  return (entry.count||0) >= VARIETY_SUPPRESS_AFTER;
}

// ─── Modulazione da behaviorState (v2.1) ────────────────────────────────────
// Il Behavior Engine (Fox Engine) non aggiunge nuove frasi: modula come viene
// scelto TRA quelle già esistenti. Due leve, condivise da selectMessage e
// buildReactionCandidates (un'unica fonte di verità, non due copie):
//  - il tono di ogni id (MESSAGE_TONE) — "encouraging"/"direct"/"neutral" —
//    una classificazione statica delle frasi già scritte, non un nuovo
//    contenuto;
//  - applyBehaviorModulation, che usa encouragePropensity/initiative di
//    behaviorState per pesare più o meno un candidato in base al suo tono.
const MESSAGE_TONE = {
  // encouraging: rinforzo positivo, "sta andando bene"
  amb_on_track:"encouraging", amb_water_done:"encouraging", amb_three_meals:"encouraging",
  amb_weekly_memory:"encouraging", amb_mood_happy:"encouraging", amb_mood_excited:"encouraging",
  ins_all_good:"encouraging", ins_progress_protein_up:"encouraging", ins_progress_ontarget_up:"encouraging",
  ins_progress_logged_up:"encouraging", reaction_ontime:"encouraging", reaction_frequency:"encouraging",
  // direct: segnala qualcosa da correggere/notare, tono più diretto
  ins_missing_nutrient:"direct", ins_fat_heavy:"direct", ins_low_protein_balance:"direct",
  ins_distribution:"direct", ins_weekly_habit_fat:"direct", ins_weekly_habit_protein:"direct",
  amb_low_protein:"direct", amb_thirsty:"direct", amb_hydration_habit:"direct",
};

// Applica la modulazione di tono/frequenza a un elenco di candidati già
// pesati (dopo la varietà) — stessa funzione per Message Engine e reazione al
// pasto, mai due logiche separate per lo stesso concetto.
function applyBehaviorModulation(candidates, behaviorState) {
  if (!behaviorState) return candidates;
  const { encouragePropensity=0.5, initiative=50 } = behaviorState;
  return candidates.map(c => {
    const tone = MESSAGE_TONE[c.id];
    let factor = 1;
    if (tone === "encouraging") factor *= 0.7 + encouragePropensity*0.6;   // 0.7–1.3
    if (tone === "direct")      factor *= 0.85 + (initiative/100)*0.3;     // 0.85–1.15
    return { ...c, weight: c.weight*factor };
  });
}

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
 
// v2.1: nuovo parametro opzionale `behaviorState` — "quando parlare" (il
// cooldown effettivo si scala di ±15% con adviceFrequency: iniziativa alta
// = parla più spesso, osservazione alta = parla meno), "quale tono" (pesi
// modulati da applyBehaviorModulation). Nessuna nuova libreria di frasi:
// solo la selezione tra quelle esistenti cambia.
function selectMessage(library, ctx, messageHistory, now=Date.now(), behaviorState=null) {
  const adviceFrequency = behaviorState?.adviceFrequency ?? 1;
  const eligible = library.filter(c => {
    if (!c.condition(ctx)) return false;
    if (c.cooldownMin>0) {
      const entry = normalizeHistoryEntry(messageHistory[c.id]);
      if (entry && now-entry.last < c.cooldownMin*60000*adviceFrequency) return false;
    }
    return true;
  });
  // "Freschi": idonei e non affaticati da troppe ripetizioni ravvicinate. Se
  // rimane qualcosa, si sceglie solo da lì; altrimenti si ripiega sull'intero
  // insieme idoneo — la varietà non deve mai produrre un silenzio.
  const fresh = eligible.filter(c => !isFatigued(c.id, messageHistory, now));
  const pool = fresh.length ? fresh : eligible;
  const candidates = applyBehaviorModulation(pool.map(c => ({
    id:c.id, priority:c.priority,
    weight:(c.weight||1) * varietyFactor(c.id, messageHistory, now),
    emotion:c.emotion||null,
    text: typeof c.text==="function" ? c.text(ctx) : c.text,
  })), behaviorState);
  return pickTopPriority(candidates);
}

// ─── Headline del coach (sceglie da nutritionState) ────────────────────────
// Superficie "insight": la headline della card Coach in home. Stessa priorità
// di sempre (nutriente mancante > equilibrio pasti > distribuzione > trend >
// presenza leggera). v2.0: legge esclusivamente `nutritionState` (prodotto da
// Nutrition Engine) — non calcola più nulla da dailyLog/targets direttamente,
// coerente con la regola "il motore messaggi usa solo stati strutturati".
// v1.9.7: ogni voce appartiene esplicitamente a un timeframe — "today" (fatto
// isolato di oggi), "week_habit" (si ripete nella settimana, non più un
// caso), "week_progress" (confronto con la settimana scorsa: qui la volpe
// inizia a parlare di progressi, non solo di stato attuale).
const INSIGHT_TIMEFRAMES = {
  ins_missing_nutrient:"today", ins_fat_heavy:"today", ins_low_protein_balance:"today",
  ins_distribution:"today", ins_all_good:"today",
  ins_trend_up:"week_habit", ins_trend_down:"week_habit",
  ins_weekly_habit_fat:"week_habit", ins_weekly_habit_protein:"week_habit", ins_weekly_meal_pattern:"week_habit",
  ins_progress_protein_up:"week_progress", ins_progress_protein_down:"week_progress",
  ins_progress_ontarget_up:"week_progress", ins_progress_logged_up:"week_progress",
};

const INSIGHT_MESSAGES = [
  // ── today: problema isolato di oggi ────────────────────────────────────
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
  // ── week_habit: si ripete nella settimana, non più un caso isolato ─────
  { id:"ins_trend_up", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="up",
    text: ctx => `Le tue calorie medie sono in aumento negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_trend_down", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="down",
    text: ctx => `Le tue calorie medie sono in calo negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_weekly_habit_fat", priority:3, cooldownMin:720,
    condition: ctx => ctx.weeklyHabit?.type==="fat_heavy",
    text: ctx => `Non è solo oggi: i pasti sono stati ricchi di grassi per ${ctx.weeklyHabit.days} giorni su ${ctx.weeklyHabit.totalDays} questa settimana.` },
  { id:"ins_weekly_habit_protein", priority:3, cooldownMin:720,
    condition: ctx => ctx.weeklyHabit?.type==="low_protein",
    text: ctx => `Le proteine sono state basse ${ctx.weeklyHabit.days} giorni su ${ctx.weeklyHabit.totalDays} questa settimana — è diventata un'abitudine.` },
  { id:"ins_weekly_meal_pattern", priority:4, cooldownMin:720,
    condition: ctx => !!ctx.weeklyMealPattern,
    text: ctx => `${ctx.weeklyMealPattern.meal} copre in media il ${ctx.weeklyMealPattern.avgPct}% delle calorie della giornata questa settimana.` },
  // ── week_progress: confronto con la settimana scorsa ───────────────────
  { id:"ins_progress_protein_up", priority:3, cooldownMin:720,
    condition: ctx => ctx.weekOverWeek?.metric==="protein" && ctx.weekOverWeek.delta>0,
    text: ctx => `Questa settimana le tue proteine medie sono più alte della scorsa (+${ctx.weekOverWeek.delta}%) — bel progresso! 💪` },
  { id:"ins_progress_protein_down", priority:4, cooldownMin:720,
    condition: ctx => ctx.weekOverWeek?.metric==="protein" && ctx.weekOverWeek.delta<0,
    text: ctx => `Questa settimana le proteine medie sono un po' più basse della scorsa (${ctx.weekOverWeek.delta}%).` },
  { id:"ins_progress_ontarget_up", priority:3, cooldownMin:720,
    condition: ctx => ctx.weekOverWeek?.metric==="onTarget" && ctx.weekOverWeek.delta>0,
    text: ctx => `Questa settimana hai centrato il target calorico ${ctx.weekOverWeek.delta} giorni in più della scorsa!` },
  { id:"ins_progress_logged_up", priority:3, cooldownMin:720,
    condition: ctx => ctx.weekOverWeek?.metric==="logged" && ctx.weekOverWeek.delta>0,
    text: ctx => `Hai registrato ${ctx.weekOverWeek.delta} giorni in più questa settimana rispetto alla scorsa — sempre più costante!` },
  // ── today: presenza leggera di riserva ──────────────────────────────────
  { id:"ins_all_good", priority:5, cooldownMin:0,
    condition: () => true,
    text: () => "Stai mantenendo un buon equilibrio nutrizionale, continua così!" },
];

// v2.1: behaviorState passato attraverso a selectMessage — nessuna logica di
// tono/frequenza duplicata qui, vive solo dentro selectMessage/
// applyBehaviorModulation.
function pickNutritionHeadline(nutritionState, messageHistory, behaviorState) {
  const picked = selectMessage(INSIGHT_MESSAGES, nutritionState, messageHistory, Date.now(), behaviorState);
  const headlineTimeframe = INSIGHT_TIMEFRAMES[picked.id] || "today";
  return { headline: picked.text, headlineId: picked.id, headlineTimeframe };
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

// ─── Testo ordinale per i richiami di memoria ("è il terzo yogurt...") ────
// Ordinale italiano semplice per i numeri più comuni in questo contesto
function ordinalIt(n) {
  const words = { 1:"il primo", 2:"il secondo", 3:"il terzo", 4:"il quarto", 5:"il quinto", 6:"il sesto", 7:"il settimo" };
  return words[n] || `il numero ${n}`;
}

// Candidati per la reazione al pasto. A differenza delle altre due superfici
// non è una libreria statica valutata automaticamente: dipende dal singolo
// alimento appena registrato, quindi viene costruita al volo — ma la scelta
// finale passa dallo stesso pickTopPriority condiviso.
// v1.9.1: legge esclusivamente da userMemory (già calcolata una volta
// nell'hook), non riceve più dailyLog e non scansiona più nulla da sé —
// stessa logica di prima, una sola fonte di verità per la memoria.
// v2.1: behaviorState modula il peso — stesso helper di selectMessage
// (applyBehaviorModulation), nessuna logica duplicata. I candidati guadagnano
// un `id` leggero solo per la classificazione di tono (MESSAGE_TONE) — non è
// una nuova frase, il testo resta quello già scelto da pickReaction.
function buildReactionCandidates({ reactionType, foodName, userMemory, mealType, waitedLong, behaviorState }) {
  const candidates = [
    { id:"reaction_base", priority:5, text: pickReaction(reactionType, foodName) }, // presenza leggera, sempre disponibile
  ];
  if (waitedLong) {
    candidates.push({ id:"reaction_relieved", priority:1, text: pickReaction("relieved", foodName) }); // avviso importante: aspettava da ore
  }
  const memoryCount = userMemory?.foodCounts?.[foodName] || 0;
  if (memoryCount >= 3) {
    candidates.push({ id:"reaction_frequency", priority:3, text: `È ${ordinalIt(memoryCount)} ${foodName} questa settimana!` }); // riconoscimento
  }
  const routine = userMemory?.mealRoutines?.[mealType];
  if (routine) {
    const diff = Math.abs(new Date().getHours() - routine.avgHour);
    if (diff <= 1) candidates.push({ id:"reaction_ontime", priority:3, text: `Puntuale come sempre, ${mealType.toLowerCase()} verso le ${routine.avgHour}!` });
    else if (diff >= 3) candidates.push({ id:"reaction_offtime", priority:4, text: `Oggi ${mealType.toLowerCase()} un po' fuori dai tuoi orari soliti, va benissimo comunque!` });
  }
  return pickTopPriority(applyBehaviorModulation(candidates, behaviorState)).text;
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

// ═════════════════════════════════════════════════════════════════════════════
// SEZIONE 6 · FOX ENGINE
// Il vero centro della parte comportamentale (v2.0). Non solo mood/energia
// (esistenti dalla v1.4) ma un modello completo e unico dello stato della
// volpe — foxState — che include emotion, energy, relationship, trust,
// experience, curiosity, personality, memory, behavior. Tutto calcolato in
// modo deterministico da dati già presenti nell'app (dailyLog, streak,
// userMemory, customRecipes), MAI da uno store separato che potrebbe
// disallinearsi — stesso principio già seguito da getUserMemory. Ogni altro
// modulo (UI, Message Engine, futura AI) legge solo foxState, mai le singole
// variabili grezze.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Mood ───────────────────────────────────────────────────────────────────
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

// ─── Effetto di un pasto su fame/energia/felicità ──────────────────────────
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

// ─── Mappa nome alimento → gruppo alimentare ───────────────────────────────
// Costruita una sola volta da ALL_FOODS (dati statici, non cambiano a
// runtime) — usata dal calcolo della curiosità per contare i GRUPPI
// alimentari distinti provati, non solo i singoli nomi.
const FOOD_GROUP_MAP = Object.fromEntries(ALL_FOODS.map(f => [f.name, f.gruppo]));

// ─── Statistiche di vita dell'app ──────────────────────────────────────────
// Un'unica scansione di TUTTO il dailyLog (non solo gli ultimi N giorni) per
// i fatti cumulativi: da quanto tempo l'utente usa l'app, quanti giorni/pasti
// in totale. Base per experience e relationship — mai un contatore isolato.
function computeLifetimeStats(dailyLog) {
  const keys = Object.keys(dailyLog).filter(k => dailyLog[k]?.meals?.length>0).sort();
  if (!keys.length) return { totalDaysLogged:0, totalMealsLogged:0, firstDayKey:null, daysSinceFirstUse:0 };
  const totalMealsLogged = keys.reduce((s,k)=>s+dailyLog[k].meals.length,0);
  const firstDayKey = keys[0];
  const daysSinceFirstUse = Math.max(0, Math.round((Date.now()-new Date(firstDayKey).getTime())/86400000));
  return { totalDaysLogged: keys.length, totalMealsLogged, firstDayKey, daysSinceFirstUse };
}

// Streak più lunga MAI raggiunta (non solo quella attuale) — un'unica
// scansione cronologica di tutta la storia, non gli ultimi 60 giorni come
// getStreak (che serve a uno scopo diverso: la streak "viva" di oggi).
function computeBestStreakEver(dailyLog) {
  const keys = Object.keys(dailyLog).filter(k => dailyLog[k]?.meals?.length>0).sort();
  if (!keys.length) return 0;
  let best = 1, current = 1;
  for (let i=1;i<keys.length;i++){
    const diffDays = Math.round((new Date(keys[i]) - new Date(keys[i-1]))/86400000);
    current = diffDays===1 ? current+1 : 1;
    if (current>best) best = current;
  }
  return best;
}

// ─── Esperienza (crescita, non un contatore) ───────────────────────────────
// Combina da quanto tempo l'utente usa l'app, la streak più lunga mai
// raggiunta, quanti obiettivi settimanali sta centrando di recente, la
// varietà alimentare, e la costanza nel tempo (giorni loggati sul totale dei
// giorni da quando ha iniziato) — non "giorni × pasti". Scala 0-100.
function computeExperience({ lifetimeStats, bestStreakEver, distinctFoodsCount, weeklyGoals }) {
  const usageScore       = Math.min(100, lifetimeStats.daysSinceFirstUse/2);            // ~200 giorni = pieno
  const streakScore      = Math.min(100, (bestStreakEver/30)*100);
  const goalsScore       = weeklyGoals?.length ? (weeklyGoals.filter(g=>g.done).length/weeklyGoals.length)*100 : 0;
  const varietyScore     = Math.min(100, distinctFoodsCount*2);                          // 50 alimenti distinti = pieno
  const consistencyScore = lifetimeStats.daysSinceFirstUse>0
    ? Math.min(100, (lifetimeStats.totalDaysLogged/lifetimeStats.daysSinceFirstUse)*100)
    : 0;
  const score = usageScore*0.25 + streakScore*0.3 + goalsScore*0.2 + varietyScore*0.1 + consistencyScore*0.15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── Fiducia (prevedibilità, non regolarità) ───────────────────────────────
// Non misura quanto l'utente è regolare in astratto, ma quanto la volpe
// riesce a PREVEDERNE il comportamento: routine con orari stabili
// (spreadHours basso, v2.0) alimentano la fiducia più di una semplice
// frequenza grezza. Media pesata sui campioni disponibili di ciascun pasto.
function computeTrust(mealRoutines) {
  const routines = Object.values(mealRoutines || {}).filter(Boolean);
  if (!routines.length) return 50; // nessuna routine ancora riconoscibile: punto di partenza neutro
  let weightedSum = 0, totalWeight = 0;
  routines.forEach(r => {
    const predictability = Math.max(0, 100 - r.spreadHours*25); // spread di 4h → predictability 0
    weightedSum += predictability*r.samples;
    totalWeight += r.samples;
  });
  return Math.round(totalWeight ? weightedSum/totalWeight : 50);
}

// ─── Curiosità (esplorazione, non solo conteggio alimenti) ────────────────
// Non solo quanti alimenti diversi, ma quanti GRUPPI alimentari distinti
// (varietà di categorie, non solo di nomi) e quante ricette personalizzate
// create — tre segnali diversi di "quanto esplora", combinati insieme.
function computeCuriosity({ dailyLog, customRecipes, days=30 }) {
  const names = new Set(), groups = new Set();
  lastNDayKeys(days).forEach(k => {
    (dailyLog[k]?.meals||[]).forEach(m => {
      names.add(m.name);
      const g = FOOD_GROUP_MAP[m.name];
      if (g) groups.add(g);
    });
  });
  const foodScore   = Math.min(100, names.size*4);    // 25 alimenti distinti/mese = pieno
  const groupScore  = Math.min(100, groups.size*10);  // 10 gruppi distinti = pieno (~14 esistono in FoodDB)
  const recipeScore = Math.min(100, (customRecipes?.length||0)*15);
  return Math.round(foodScore*0.5 + groupScore*0.35 + recipeScore*0.15);
}

// ─── Relationship Score ─────────────────────────────────────────────────────
// Uno degli attributi di foxState tra altri (v2.0) — non più il fulcro del
// sistema. Costanza recente, streak, obiettivi raggiunti, continuità d'uso.
// In futuro altri indicatori (attachment, confidence...) potranno affiancarlo
// come nuovi attributi paralleli, senza richiedere di riprogettare il modello.
function computeRelationshipScore({ streak, lifetimeStats, weeklyGoals }) {
  const streakScore      = Math.min(100, (streak/30)*100);
  const consistencyScore = lifetimeStats.daysSinceFirstUse>0
    ? Math.min(100, (lifetimeStats.totalDaysLogged/Math.min(30, lifetimeStats.daysSinceFirstUse||1))*100)
    : 0;
  const goalsScore    = weeklyGoals?.length ? (weeklyGoals.filter(g=>g.done).length/weeklyGoals.length)*100 : 50;
  const continuityScore = lifetimeStats.daysSinceFirstUse>=1 ? 100 : 0; // presenza storica minima già accertata
  return Math.round(streakScore*0.35 + consistencyScore*0.3 + goalsScore*0.25 + continuityScore*0.1);
}

// ─── Behavior Engine (v2.1) ─────────────────────────────────────────────────
// Estende il Fox Engine con attributi che riguardano non "chi è" la volpe
// (i tratti v2.0) ma "come si comporta adesso" — sempre derivati dagli stessi
// dati già presenti, mai un nuovo store persistente.

// moodHistory: non un log completo, solo gli ultimi `days` stati SINTETICI —
// una stima retrospettiva di "come è andata quella giornata" dedotta dai dati
// (calorie in target, numero di pasti), non il mood reale registrato in quel
// momento (che non viene salvato per ogni giorno). Ricalcolata ogni volta da
// dailyLog, mai un array che si aggiorna in incrementale.
function computeMoodHistory(dailyLog, gKcal, days=7) {
  return lastNDayKeys(days,1).map(k => {
    const meals = dailyLog[k]?.meals || [];
    if (!meals.length) return { date:k, syntheticMood:null };
    const kcal = sumMacros(meals).kcal;
    const onTarget = kcal>0 && kcal<=gKcal*1.15 && kcal>=gKcal*0.85;
    let syntheticMood;
    if (onTarget && meals.length>=3) syntheticMood = "content";
    else if (meals.length>=2) syntheticMood = "neutral";
    else syntheticMood = "sad";
    return { date:k, syntheticMood };
  }).reverse(); // ordine cronologico, più vecchio prima
}

// Quanto sono STABILI i synthetic mood recenti — meno oscillazioni tra stati
// diversi significa che la volpe "legge" meglio l'andamento dell'utente.
function computeMoodStability(moodHistory) {
  const valid = moodHistory.filter(m=>m.syntheticMood);
  if (valid.length < 3) return 50; // troppo pochi dati: punto di partenza neutro
  const distinct = new Set(valid.map(m=>m.syntheticMood)).size;
  return Math.max(0, 100 - (distinct-1)*25);
}

// ─── Confidence ─────────────────────────────────────────────────────────────
// Quanto la volpe è "sicura" di ciò che sa sull'utente — non quanto l'utente
// sta andando bene, ma quanti dati e quanto stabili sono i pattern osservati.
// Combina volume di dati (giorni totali loggati), fiducia (prevedibilità
// delle routine) e stabilità dei synthetic mood recenti.
function computeConfidence({ lifetimeStats, trust, moodHistory }) {
  const dataVolumeScore = Math.min(100, lifetimeStats.totalDaysLogged*2); // 50 giorni = pieno
  const stabilityScore = computeMoodStability(moodHistory);
  return Math.round(dataVolumeScore*0.4 + trust*0.35 + stabilityScore*0.25);
}

// ─── Motivation ──────────────────────────────────────────────────────────────
// La "spinta" osservata nell'utente in questo momento — quanto la traiettoria
// recente (obiettivi settimanali, confronto con la settimana scorsa, streak
// rispetto al proprio record) sta andando nella direzione giusta.
function computeMotivation({ weeklyGoals, weekOverWeek, streak, bestStreakEver }) {
  const goalsScore = weeklyGoals?.length ? (weeklyGoals.filter(g=>g.done).length/weeklyGoals.length)*100 : 50;
  const progressScore = weekOverWeek
    ? (weekOverWeek.delta>0 ? 75 : weekOverWeek.delta<0 ? 35 : 50)
    : 50;
  const streakMomentum = bestStreakEver>0 ? Math.min(100,(streak/bestStreakEver)*100) : (streak>0?100:50);
  return Math.round(goalsScore*0.4 + progressScore*0.35 + streakMomentum*0.25);
}

// ─── Attachment ──────────────────────────────────────────────────────────────
// Legame di lungo periodo — a differenza di relationship (più reattivo alla
// settimana recente), attachment pesa di più la storia cumulativa: quanto
// tempo insieme (experience), quanti momenti speciali già condivisi
// (memory.milestones), e il relationship score come componente più "live".
function computeAttachment({ experience, relationship, memory }) {
  const milestonesScore = Math.min(100, (memory?.milestones?.length||0)*30);
  return Math.round(experience*0.4 + relationship*0.35 + milestonesScore*0.25);
}

// ─── Learning Layer (adaptation) ────────────────────────────────────────────
// Non machine learning: un punteggio deterministico che combina 5 segnali
// già derivati altrove — costanza (consistencyScore), risposta ai consigli
// (adviceResponseScore, proxy dal confronto settimana-su-settimana: se le
// metriche migliorano, l'utente sta "rispondendo" ai consigli passati),
// regolarità dei pasti (trust, già basato sulle routine), idratazione
// (hydration), varietà alimentare (curiosity). Più alto: più la volpe si è
// "tarata" su questo utente specifico — non un modello che si allena, solo
// una funzione pura di dati che cambiano nel tempo.
function computeAdaptation({ lifetimeStats, trust, hydration, curiosity, weekOverWeek }) {
  const consistencyScore = lifetimeStats.daysSinceFirstUse>0
    ? Math.min(100, (lifetimeStats.totalDaysLogged/lifetimeStats.daysSinceFirstUse)*100)
    : 0;
  const hydrationScore = hydration ? Math.max(0, 100-hydration.lowDays*20) : 50;
  const adviceResponseScore = weekOverWeek ? (weekOverWeek.delta>0 ? 70 : weekOverWeek.delta<0 ? 30 : 50) : 50;
  const score = consistencyScore*0.3 + trust*0.25 + hydrationScore*0.15 + curiosity*0.15 + adviceResponseScore*0.15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── Punto di ingresso del Behavior Engine: computeBehaviorState ───────────
// Non un ennesimo insieme di numeri: traduce gli attributi di foxState +
// nutritionState in decisioni comportamentali concrete — quanto la volpe
// prende iniziativa, quanto spesso parla, con che tono, quanto si anima.
// Il Message Engine lo consulta ACCANTO a foxState (mai al posto di), per
// decidere quando/quanto/come parlare — senza aggiungere nuove frasi, solo
// modulando la selezione di quelle esistenti.
function computeBehaviorState({ foxState, nutritionState, weeklyGoals }) {
  const { motivation, attachment, adaptation } = foxState;
  const goalsRate = weeklyGoals?.length ? weeklyGoals.filter(g=>g.done).length/weeklyGoals.length : 0.5;
  const hasUrgentIssue = !!(nutritionState?.missingNutrient
    || nutritionState?.mealBalance?.type==="fat_heavy"
    || nutritionState?.mealBalance?.type==="low_protein");
  const isDoingWell = goalsRate>=0.66 && !hasUrgentIssue;

  // Comportamento corrente: un'etichetta sintetica, sempre la stessa a parità
  // di input — utile a UI/AI future, non solo al motore messaggi.
  let currentBehavior;
  if (hasUrgentIssue)                       currentBehavior = "supportive";
  else if (isDoingWell && motivation>=65)    currentBehavior = "celebratory";
  else if (isDoingWell)                     currentBehavior = "observing";
  else if (motivation<35)                   currentBehavior = "encouraging";
  else                                       currentBehavior = "attentive";

  // Iniziativa: più alta se c'è un problema da segnalare o se la volpe ha
  // "energia sociale" (motivation/attachment alti); più bassa quando tutto va
  // bene — meno interventi quando l'utente sta andando bene, come richiesto.
  const initiative = Math.round(Math.max(0, Math.min(100,
    40 + (hasUrgentIssue?30:0) + motivation*0.3 + attachment*0.2 + (isDoingWell?-20:10)
  )));

  // Frequenza consigli: moltiplicatore sul cooldown dei messaggi nel Message
  // Engine — iniziativa alta = cooldown più corti (parla più spesso),
  // iniziativa bassa = cooldown più lunghi (osserva di più). Variazione
  // contenuta (±15%): è un tono, non uno stravolgimento della priorità.
  const adviceFrequency = Math.max(0.85, Math.min(1.15, 1 - (initiative-50)/250));

  // Intensità animazioni (0-1): una volpe più "in sintonia" (motivation +
  // attachment + adaptation alti) è più espressiva nelle micro-animazioni.
  const animationIntensity = Math.round(Math.max(0, Math.min(100, (motivation+attachment+adaptation)/3)))/100;

  const observePropensity = Math.round(isDoingWell ? 70+goalsRate*20 : 30)/100;
  const encouragePropensity = Math.round(motivation<50 ? 70 : (40+(hasUrgentIssue?20:0)))/100;

  return { currentBehavior, initiative, adviceFrequency, animationIntensity, encouragePropensity, observePropensity };
}

// ─── Personalità (statica per ora) ─────────────────────────────────────────
// Tratti di temperamento di base, non ancora derivati dal comportamento (a
// differenza degli attributi dinamici sopra) — predisposizione per future
// varianti di personalità e per l'integrazione AI, che potrà modulare il tono
// in base a questi tratti senza toccare la logica decisionale.
const FOX_PERSONALITY = { optimism:0.6, curiosity:0.55, calm:0.5, playfulness:0.55 };

// ─── Memoria emozionale ─────────────────────────────────────────────────────
// Non solo l'ultimo evento significativo, ma anche i momenti speciali della
// storia dell'utente — prima streak settimanale, primo ritorno dopo una
// pausa — per dare continuità al rapporto nel tempo, non solo un'istantanea
// di oggi. Un'unica scansione cronologica di dailyLog produce tutto insieme.
function computeFoxMemory({ dailyLog, weeklyGoals }) {
  const keys = Object.keys(dailyLog).filter(k => dailyLog[k]?.meals?.length>0).sort();
  const milestones = [];
  let current = 1, firstWeekDate = null, longestGap = 0, firstReturnDate = null;
  for (let i=1;i<keys.length;i++){
    const diffDays = Math.round((new Date(keys[i]) - new Date(keys[i-1]))/86400000);
    if (diffDays===1) {
      current++;
      if (current===7 && !firstWeekDate) firstWeekDate = keys[i];
    } else {
      if (diffDays-1 > longestGap) longestGap = diffDays-1;
      if (diffDays>=5 && !firstReturnDate) firstReturnDate = keys[i];
      current = 1;
    }
  }
  if (keys.length) milestones.push({ type:"first_use", date:keys[0], label:"Primo giorno insieme" });
  if (firstWeekDate) milestones.push({ type:"first_week_streak", date:firstWeekDate, label:"Prima settimana intera di streak" });
  if (firstReturnDate) milestones.push({ type:"return_after_break", date:firstReturnDate, label:"Primo ritorno dopo una pausa" });
  milestones.sort((a,b)=> a.date<b.date ? -1 : 1);

  const lastUsedDay = keys.length ? keys[keys.length-1] : null;
  const lastSignificantEvent = milestones.length ? milestones[milestones.length-1] : null;
  const lastDifficulty = longestGap>=3 ? { type:"long_gap", days:longestGap, label:`Una pausa di ${longestGap} giorni` } : null;
  const lastEncouragement = weeklyGoals?.some(g=>g.done)
    ? { type:"weekly_goal", label:"Traguardo settimanale raggiunto" }
    : null;

  return { lastSignificantEvent, lastUsedDay, lastDifficulty, lastEncouragement, milestones };
}

// ─── Punto di ingresso unico: foxState ─────────────────────────────────────
// Un solo oggetto che rappresenta TUTTO lo stato della volpe. Ogni altro
// modulo (UI, Message Engine, futura AI) legge solo questo, mai le singole
// variabili grezze. Sempre ricalcolato dai dati già esistenti nell'app
// (dailyLog, streak, userMemory, customRecipes, vitals) — mai da uno store
// separato che potrebbe disallinearsi, stesso principio già seguito da
// getUserMemory. Deterministico, zero Math.random(), memoizzato nell'hook.
function computeFoxState({ vitals, mood, streak, hoursSinceLastFed, dailyLog, userMemory, customRecipes, weeklyGoals, gKcal, weekOverWeek }) {
  const lifetimeStats = computeLifetimeStats(dailyLog);
  const bestStreakEver = computeBestStreakEver(dailyLog);
  const distinctFoodsCount = userMemory?.foodMemory ? Object.keys(userMemory.foodMemory).length : 0;

  const experience   = computeExperience({ lifetimeStats, bestStreakEver, distinctFoodsCount, weeklyGoals });
  const trust        = computeTrust(userMemory?.mealRoutines);
  const curiosity     = computeCuriosity({ dailyLog, customRecipes });
  const relationship = computeRelationshipScore({ streak, lifetimeStats, weeklyGoals });
  const memory        = computeFoxMemory({ dailyLog, weeklyGoals });

  // v2.1 — Behavior Engine: nuovi attributi derivati, sempre dagli stessi
  // dati esistenti (dailyLog/userMemory/weeklyGoals/weekOverWeek), mai da un
  // nuovo store persistente.
  const moodHistory = computeMoodHistory(dailyLog, gKcal);
  const confidence   = computeConfidence({ lifetimeStats, trust, moodHistory });
  const motivation   = computeMotivation({ weeklyGoals, weekOverWeek, streak, bestStreakEver });
  const attachment   = computeAttachment({ experience, relationship, memory });
  const adaptation   = computeAdaptation({ lifetimeStats, trust, hydration:userMemory?.hydration, curiosity, weekOverWeek });

  return {
    emotion: { mood, hunger:vitals.hunger, happiness:vitals.happiness??70, health:vitals.health??90 },
    energy: vitals.energy,
    relationship,
    trust,
    experience,
    curiosity,
    confidence,
    motivation,
    attachment,
    adaptation,
    moodHistory,
    personality: FOX_PERSONALITY,
    memory,
    behavior: { lastFedAt:vitals.lastFedAt, hoursSinceLastFed, streak, bestStreakEver },
  };
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
  // Stato biologico grezzo della volpe (fame/energia/felicità/salute, tick-based).
  // v2.0: rinominato da foxState a fxVitals — è un INPUT grezzo che decade nel
  // tempo, non lo stato completo della volpe. Il vero foxState (più sotto) è un
  // oggetto derivato, ricalcolato ogni volta da fxVitals + dati esistenti.
  const [fxVitals,  setFxVitals]  = useState(()=>load("nf_foxstate",{hunger:50,energy:50,happiness:70,health:90,lastFedAt:null,moodIndex:1,lastDecayAt:Date.now()}));
  const [bounce,    setBounce]    = useState(false);
  const [feedLabel, setFeedLabel] = useState("");
  const [reaction,  setReaction]  = useState(null); // {type, message} — popup temporaneo 2-3s
  const [reward,    setReward]    = useState(null); // {icon} — effetto ricompensa <2s (streak/acqua/obiettivo)
  const [licking,   setLicking]   = useState(false); // si lecca i baffi subito dopo il pasto
  const [celebratedToday, setCelebratedToday] = useState(()=>load("nf_celebrated_"+todayKey(),{}));
  // Cooldown del motore decisionale unificato (v1.7): quando è stato mostrato
  // per l'ultima volta ogni id di messaggio, condiviso tra le tre superfici.
  // v1.9.5: ogni voce ora è { last, count } — count è quante volte il
  // messaggio è stato mostrato senza una pausa di VARIETY_DECAY_HOURS,
  // alimenta il sistema di varietà (penalità + esclusione temporanea).
  const [messageHistory, setMessageHistory] = useState(()=>load("nf_msgHistory",{}));
  function recordMessageShown(id){
    if(!id) return;
    setMessageHistory(prev=>{
      const now = Date.now();
      const prevEntry = normalizeHistoryEntry(prev[id]);
      const stillRecent = prevEntry && (now-prevEntry.last) < VARIETY_DECAY_HOURS*3600000;
      const count = stillRecent ? (prevEntry.count||0)+1 : 1;
      return {...prev, [id]:{ last:now, count }};
    });
  }
 
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
  useEffect(()=>save("nf_foxstate",fxVitals),[fxVitals]);
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
    setFxVitals(prev=>{
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
      setFxVitals(prev=>{
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
  const mood     = MOOD_ORDER[fxVitals.moodIndex ?? computeTargetMoodIndex(fxVitals.hunger, fxVitals.energy, fxVitals.happiness??70)];
 
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
 
  const hoursSinceLastFed = fxVitals.lastFedAt ? (Date.now()-fxVitals.lastFedAt)/3600000 : null;

  // v2.0: weeklyGoals calcolato una sola volta qui (prima veniva ricalcolato
  // dentro getNutritionInsights) — condiviso da Nutrition Engine (nutritionState)
  // e Fox Engine (foxState), nessuna duplicazione della stessa chiamata.
  const weeklyGoals = useMemo(()=>getWeeklyGoals(dailyLog, gKcal, userMemory.hydration), [dailyLog, gKcal, userMemory]);

  // Nutrition Engine: solo fatti, nessuna scelta di testo (v2.0).
  const nutritionState = useMemo(()=>computeNutritionState({
    dailyLog, todayMeals:todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, weeklyGoals,
  }),[dailyLog, todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, targets, water, targetWater, weeklyGoals]);

  // Fox Engine: un solo oggetto foxState con tutto lo stato della volpe
  // (v2.0, esteso in v2.1 con confidence/motivation/attachment/adaptation/
  // moodHistory). Sempre ricalcolato da fxVitals + dati esistenti, mai da uno
  // store a parte. Ogni altro modulo (UI, Message Engine) legge solo questo.
  const foxState = useMemo(()=>computeFoxState({
    vitals:fxVitals, mood, streak, hoursSinceLastFed, dailyLog, userMemory, customRecipes, weeklyGoals,
    gKcal, weekOverWeek:nutritionState.weekOverWeek,
  }),[fxVitals, mood, streak, hoursSinceLastFed, dailyLog, userMemory, customRecipes, weeklyGoals, gKcal, nutritionState.weekOverWeek]);

  // Behavior Engine (v2.1): traduce foxState + nutritionState in decisioni
  // comportamentali concrete (iniziativa, frequenza, tono, intensità). Il
  // Message Engine lo consulta ACCANTO a foxState per decidere quando/quanto/
  // come parlare — mai al posto degli stati strutturati già esistenti.
  const behaviorState = useMemo(()=>computeBehaviorState({
    foxState, nutritionState, weeklyGoals,
  }),[foxState, nutritionState, weeklyGoals]);
 
  // Superficie "ambient" (didascalia in home): memoizzata sulle dipendenze
  // reali, non ricalcola ad ogni tick di decay se nulla di rilevante è
  // cambiato. Il cooldown viene registrato solo quando il messaggio
  // selezionato CAMBIA (transizione), non ad ogni render — altrimenti un
  // messaggio si auto-invaliderebbe l'istante dopo essere apparso.
  // v2.0: non passa più `dailyLog` — legge solo userMemory (Memory Engine),
  // coerente con "il motore messaggi usa solo stati strutturati".
  // v2.1: behaviorState passato a selectMessage per modulare tono/frequenza.
  const ambientResult = useMemo(()=>selectMessage(AMBIENT_MESSAGES, buildAmbientContext({
    hoursSinceLastFed, water, targetWater, totalP, mealsCount:todayData.meals.length,
    totalKcal, gKcal, mood, foxName, todayMeals:todayData.meals, userMemory,
  }), messageHistory, Date.now(), behaviorState),[hoursSinceLastFed, water, targetWater, totalP, todayData.meals, totalKcal, gKcal, mood, foxName, messageHistory, userMemory, behaviorState]);
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
 
  // Headline del coach: il Message Engine sceglie da nutritionState (v2.0),
  // non calcola più nulla da sé. `insights` resta il nome esposto ad App.jsx
  // per compatibilità, ma ora è la fusione di nutritionState + la scelta del
  // Message Engine, invece di un'unica funzione che faceva entrambe le cose.
  const headlinePick = useMemo(()=>pickNutritionHeadline(nutritionState, messageHistory, behaviorState),[nutritionState, messageHistory, behaviorState]);
  const insights = { ...nutritionState, ...headlinePick };
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
- Tuo stato: Fame ${Math.round(fxVitals.hunger)}%, Energia ${Math.round(fxVitals.energy)}%
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
      reactionType, foodName:food.name, userMemory, mealType, waitedLong, behaviorState,
    });
    setFxVitals(prev=>{
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
    // Fox Engine (v2.0): foxState è l'UNICO stato della volpe che il resto
    // dell'app deve leggere — emotion/energy/relationship/trust/experience/
    // curiosity/personality/memory/behavior. bounce/feedLabel/reaction/reward/
    // licking restano variabili UI-transient separate (animazioni brevi, non
    // stato "della volpe" in senso comportamentale).
    foxState, bounce, feedLabel, reaction, reward, licking, specialEmotion,
    // derivazioni
    today, todayData, streak, stage, mood, contextualMessage,
    totalKcal, totalP, totalC, totalF, gKcal, targetWater, weekAvg,
    // profilo utente unificato e memoria comportamentale (v1.9)
    userProfile, userMemory,
    // Behavior Engine (v2.1): decisioni comportamentali derivate da foxState
    // + nutritionState — usato dal Message Engine, esposto anche per una
    // eventuale UI futura (es. mostrare "la volpe sta osservando").
    behaviorState,
    // Nutrition Engine (v2.0): insights = nutritionState + la scelta di
    // headline del Message Engine, fuse in un solo oggetto per compatibilità
    // con chi già consultava `insights`.
    insights, suggestPortion: suggestPortionFor,
    // meal builder intelligente (v1.9, iterativo dalla v1.9.2)
    suggestMealFor, substituteMealIngredientFor,
    // alimenti
    categories, getPool,
    // azioni
    addFood, addCustomFood, removeFood, saveRecipe, toggleFavorite,
  };
}

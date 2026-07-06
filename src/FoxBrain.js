import { useMemo } from "react";
import { getAnimationIntent } from "./FoxAnimations";
 
// ─────────────────────────────────────────────────────────────────────────────
// useFoxBrain — hook unico che centralizza tutte le derivazioni visive della volpe.
//
// INPUT:  { mood, streak, lastFedAt, bounce }  (dati grezzi da App.jsx)
// OUTPUT: { brain } — oggetto unico con tutto il necessario per Fox.jsx e FoxSVG
//
// Nessun useState, nessun timer: solo calcoli derivati da props.
//
// v1.3.2: prima la pose (awake/sitting/lying/asleep) veniva calcolata qui dentro
// ma l'intent delle animazioni idle veniva calcolato a parte in Fox.jsx a partire
// dal mood grezzo — risultato: una volpe addormentata da ore continuava a fare
// sguardi/salti da sveglia, e "mood sleeping" (occhi chiusi) non veniva mai
// prodotto perché computeFoxMood non lo restituisce mai. deriveVisualState()
// unifica questo calcolo in un unico posto puro, usato sia da Fox.jsx (per
// scegliere l'intent prima di chiamare gli hook) sia da useFoxBrain.
// ─────────────────────────────────────────────────────────────────────────────
 
// Stage in base alla streak
function deriveStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true,  scale:1.12 };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false, scale:1.06 };
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false, scale:1.02 };
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false, scale:1.0  };
}
 
// Trasformazioni CSS corrispondenti alla pose
function poseToTransform(pose) {
  const map = {
    awake:   { scaleY:1,    offsetY:0,  transition:"1.4s cubic-bezier(.4,0,.2,1)" },
    sitting: { scaleY:0.92, offsetY:4,  transition:"1.4s cubic-bezier(.4,0,.2,1)" },
    lying:   { scaleY:0.85, offsetY:7,  transition:"1.4s cubic-bezier(.4,0,.2,1)" },
    asleep:  { scaleY:0.78, offsetY:10, transition:"1.4s cubic-bezier(.4,0,.2,1)" },
  };
  return map[pose] || map.awake;
}
 
// Outfit in base allo stadio
function deriveColors(streak) {
  if (streak >= 30) return { sw:"#D4A830", swD:"#A07820", pt:"#7C3A0A" };
  if (streak >= 14) return { sw:"#7C3AED", swD:"#5B21B6", pt:"#3B0764" };
  if (streak >= 7)  return { sw:"#16A34A", swD:"#14532D", pt:"#052E16" };
  return                   { sw:"#C8B49A", swD:"#A89278", pt:"#4A3020" };
}
 
// Espressioni per mood — dati puramente visivi, nessuna logica
// v1.4: aggiunto "content" — stato intermedio tra "neutral" e "happy", usato
// dal sistema di mood graduale (moodIndex) in App.jsx quando la volpe sta
// migliorando ma non è ancora del tutto "happy".
// v1.8: aggiunti "proud" e "curious" — non fanno parte della scala graduale
// (MOOD_ORDER), sono stati "speciali" che il motore decisionale (v1.7) può
// richiedere temporaneamente mentre un messaggio di riconoscimento o di
// riflessione è attivo (vedi specialEmotion in useNutriFox.js). Due nuovi
// campi su ogni espressione: browAsymmetry (sopracciglio destro più alto,
// usato da "curious") e badge (icona breve accanto alla testa, come lo "zzz"
// già esistente per il sonno).
const MOOD_EXPR = {
  happy:   { bY:-3, bCurve:6,  mouth:"M 46 65 Q 52 72 58 65", eH:0.62, open:true,  cheeksUp:true,  mouthFill:true,  mouthFillOpacity:0.18, sparkleBrows:false, earMood:"relaxed", sleepy:false, browAsymmetry:0, badge:null },
  excited: { bY:-6, bCurve:9,  mouth:"M 43 64 Q 52 76 61 64", eH:1.12, open:true,  cheeksUp:true,  mouthFill:true,  mouthFillOpacity:0.22, sparkleBrows:true,  earMood:"up",      sleepy:false, browAsymmetry:0, badge:null },
  content: { bY:-1, bCurve:3,  mouth:"M 46 66 Q 52 71 58 66", eH:0.85, open:true,  cheeksUp:false, mouthFill:true,  mouthFillOpacity:0.10, sparkleBrows:false, earMood:"relaxed", sleepy:false, browAsymmetry:0, badge:null },
  neutral: { bY:0,  bCurve:1,  mouth:"M 46 67 Q 52 70 58 67", eH:1.0,  open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"up",      sleepy:false, browAsymmetry:0, badge:null },
  sad:     { bY:4,  bCurve:-5, mouth:"M 46 71 Q 52 65 58 71", eH:0.88, open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"down",    sleepy:false, browAsymmetry:0, badge:null },
  // proud: riconoscimento/traguardo (streak, obiettivo, ricompensa) — sorriso
  // sicuro, testa un filo più alta, un piccolo badge a stella accanto alla testa.
  proud:   { bY:-4, bCurve:7,  mouth:"M 44 65 Q 52 73 60 65", eH:0.68, open:true,  cheeksUp:true,  mouthFill:true,  mouthFillOpacity:0.20, sparkleBrows:true,  earMood:"up",      sleepy:false, browAsymmetry:0, badge:"star" },
  // curious: nota qualcosa o invita a riflettere — un sopracciglio alzato,
  // occhi un po' più aperti, piccolo punto interrogativo accanto alla testa.
  curious: { bY:0,  bCurve:2,  mouth:"M 47 68 Q 52 69 57 68", eH:1.08, open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"up",      sleepy:false, browAsymmetry:6, badge:"question" },
  // drowsy: pose "lying" (2-4h senza mangiare) — occhi socchiusi, non ancora chiusi del tutto
  drowsy:  { bY:2,  bCurve:-1, mouth:"M 46 68 Q 52 70 58 68", eH:0.32, open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"down",    sleepy:false, browAsymmetry:0, badge:null },
  sleeping:{ bY:0,  bCurve:0,  mouth:"M 46 67 Q 52 70 58 67", eH:0,    open:false, cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"relaxed", sleepy:true,  browAsymmetry:0, badge:null },
};
 
const EAR_ANGLES = {
  up:      { left:0,   right:0   },
  relaxed: { left:6,   right:-6  },
  down:    { left:14,  right:-14 },
};
 
// Pose fisica pura, senza hook — usata sia da deriveVisualState che da useFoxBrain
function poseFromHours(hoursSinceLastFed) {
  if (hoursSinceLastFed == null) return "awake";
  if (hoursSinceLastFed >= 6)   return "asleep";
  if (hoursSinceLastFed >= 4)   return "lying";
  if (hoursSinceLastFed >= 2)   return "sitting";
  return "awake";
}
 
// ─── FUNZIONE PURA CONDIVISA ──────────────────────────────────────────────────
// Combina il mood "emotivo" (calcolato in App.jsx da hunger/energy/happiness)
// con la pose fisica (calcolata da quanto tempo è passato dall'ultimo pasto) in
// un unico "visualMood" coerente: se il corpo è addormentato, l'espressione lo
// segue sempre, indipendentemente da cosa direbbe il mood emotivo da solo.
// Nessun hook qui dentro: può essere chiamata anche fuori da un componente React.
export function deriveVisualState({ mood, lastFedAt }) {
  const hoursSinceLastFed = lastFedAt ? (Date.now() - lastFedAt) / 3600000 : null;
  const pose = poseFromHours(hoursSinceLastFed);
  const visualMood = pose === "asleep" ? "sleeping"
    : pose === "lying"                 ? "drowsy"
    : mood;
  return { pose, visualMood, hoursSinceLastFed };
}
 
// ─── HOOK PRINCIPALE ─────────────────────────────────────────────────────────
// v1.8: il visualMood finale (che ora può includere un'emozione speciale come
// "proud"/"curious" richiesta dal motore decisionale) viene risolto una sola
// volta in Fox.jsx e passato qui come resolvedVisualMood — questo hook non lo
// ricalcola più da solo, usa deriveVisualState solo per pose/hoursSinceLastFed.
export function useFoxBrain({ mood, streak, lastFedAt, bounce, hop, stretch, earTwitch, resolvedVisualMood }) {
  return useMemo(() => {
    const stage               = deriveStage(streak);
    const colors               = deriveColors(streak);
    const { pose, hoursSinceLastFed } = deriveVisualState({ mood, lastFedAt });
    const visualMood          = resolvedVisualMood;
    const poseTransform       = poseToTransform(pose);
    const intent              = getAnimationIntent(visualMood);
    const ex                  = MOOD_EXPR[visualMood] || MOOD_EXPR.neutral;
    const baseEarAngle        = EAR_ANGLES[ex.earMood] || EAR_ANGLES.up;
 
    // Le orecchie si abbassano in pose non-awake, reagiscono anche all'earTwitch
    const earAngle = pose !== "awake"
      ? { left: baseEarAngle.left + 10, right: baseEarAngle.right - 10 }
      : earTwitch
        ? { left: baseEarAngle.left + 8, right: baseEarAngle.right }
        : baseEarAngle;
 
    // Animazione corpo — ora segue la pose reale, non solo il mood emotivo
    // v1.4: "stretch" (si stiracchia) ha priorità subito dopo bounce/hop
    // v1.8: "proud" riusa l'animazione excited (stesso brio, espressione diversa)
    const bodyAnim = bounce       ? "fox-bounce"
      : hop                       ? "fox-hop"
      : stretch                   ? "fox-stretch"
      : pose === "asleep"         ? "fox-breathe"
      : pose === "lying"          ? "fox-drowsy"
      : visualMood === "sad"      ? "fox-sad"
      : (visualMood === "excited" || visualMood === "proud") ? "fox-excited"
      : "fox-idle";
 
    // Velocità coda: dipende da intent
    const tailSpeed = intent === "playful" ? "1.8s"
      : intent === "drowsy"                ? "5s"
      : intent === "sleepy"                ? "6s"
      : "3.5s";
 
    return {
      // per FoxSVG (puramente visivo)
      ex, colors, stage, earAngle,
      // per il wrapper in Fox.jsx
      poseTransform, bodyAnim, tailSpeed,
      // metadati
      pose, visualMood, intent, hoursSinceLastFed,
    };
  }, [mood, streak, lastFedAt, bounce, hop, stretch, earTwitch, resolvedVisualMood]);
}
 
 


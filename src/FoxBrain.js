import { useMemo } from "react";
import { getAnimationIntent } from "./FoxAnimations";

// ─────────────────────────────────────────────────────────────────────────────
// useFoxBrain — hook unico che centralizza tutte le derivazioni visive della volpe.
//
// INPUT:  { mood, streak, lastFedAt, bounce }  (dati grezzi da App.jsx)
// OUTPUT: { brain } — oggetto unico con tutto il necessario per Fox.jsx e FoxSVG
//
// Nessun useState, nessun timer: solo calcoli derivati da props.
// ─────────────────────────────────────────────────────────────────────────────

// Stage in base alla streak
function deriveStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true,  scale:1.12 };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false, scale:1.06 };
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false, scale:1.02 };
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false, scale:1.0  };
}

// Pose fisica in base a ore dall'ultimo pasto
function derivePose(hoursSinceLastFed) {
  if (hoursSinceLastFed == null) return "awake";
  if (hoursSinceLastFed >= 6)   return "asleep";
  if (hoursSinceLastFed >= 4)   return "lying";
  if (hoursSinceLastFed >= 2)   return "sitting";
  return "awake";
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
const MOOD_EXPR = {
  happy:   { bY:-3, bCurve:6,  mouth:"M 46 65 Q 52 72 58 65", eH:0.62, open:true,  cheeksUp:true,  mouthFill:true,  mouthFillOpacity:0.18, sparkleBrows:false, earMood:"relaxed", sleepy:false },
  excited: { bY:-6, bCurve:9,  mouth:"M 43 64 Q 52 76 61 64", eH:1.12, open:true,  cheeksUp:true,  mouthFill:true,  mouthFillOpacity:0.22, sparkleBrows:true,  earMood:"up",      sleepy:false },
  neutral: { bY:0,  bCurve:1,  mouth:"M 46 67 Q 52 70 58 67", eH:1.0,  open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"up",      sleepy:false },
  sad:     { bY:4,  bCurve:-5, mouth:"M 46 71 Q 52 65 58 71", eH:0.88, open:true,  cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"down",    sleepy:false },
  sleeping:{ bY:0,  bCurve:0,  mouth:"M 46 67 Q 52 70 58 67", eH:0,    open:false, cheeksUp:false, mouthFill:false, mouthFillOpacity:0,    sparkleBrows:false, earMood:"relaxed", sleepy:true  },
};

const EAR_ANGLES = {
  up:      { left:0,   right:0   },
  relaxed: { left:6,   right:-6  },
  down:    { left:14,  right:-14 },
};

// ─── HOOK PRINCIPALE ─────────────────────────────────────────────────────────
export function useFoxBrain({ mood, streak, lastFedAt, bounce, hop, earTwitch }) {
  return useMemo(() => {
    const stage              = deriveStage(streak);
    const colors             = deriveColors(streak);
    const hoursSinceLastFed  = lastFedAt ? (Date.now() - lastFedAt) / 3600000 : null;
    const pose               = mood === "sleeping" ? "asleep" : derivePose(hoursSinceLastFed);
    const poseTransform      = poseToTransform(pose);
    const intent             = getAnimationIntent(mood);
    const ex                 = MOOD_EXPR[mood] || MOOD_EXPR.neutral;
    const baseEarAngle       = EAR_ANGLES[ex.earMood] || EAR_ANGLES.up;

    // Le orecchie si abbassano in pose non-awake, reagiscono anche all'earTwitch
    const earAngle = pose !== "awake"
      ? { left: baseEarAngle.left + 10, right: baseEarAngle.right - 10 }
      : earTwitch
        ? { left: baseEarAngle.left + 8, right: baseEarAngle.right }
        : baseEarAngle;

    // Animazione corpo
    const bodyAnim = bounce    ? "fox-bounce"
      : hop                    ? "fox-hop"
      : pose === "asleep"      ? "fox-breathe"
      : mood === "sleeping"    ? "fox-breathe"
      : mood === "sad"         ? "fox-sad"
      : mood === "excited"     ? "fox-excited"
      : "fox-idle";

    // Velocità coda: dipende da intent
    const tailSpeed = intent === "playful" ? "1.8s"
      : intent === "sleepy"                ? "6s"
      : "3.5s";

    return {
      // per FoxSVG (puramente visivo)
      ex, colors, stage, earAngle,
      // per il wrapper in Fox.jsx
      poseTransform, bodyAnim, tailSpeed,
      // metadati
      pose, intent, hoursSinceLastFed,
    };
  }, [mood, streak, lastFedAt, bounce, hop, earTwitch]);
}

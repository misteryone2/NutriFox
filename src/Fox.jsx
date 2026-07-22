import { useEffect, useRef, useState, memo } from "react";
import { useFoxBrain, deriveVisualState, deriveStage, computeWarmth } from "./FoxBrain";
import { useFoxAnimations, getAnimationIntent } from "./FoxAnimations";
import FoxSVG from "./FoxSVG";
 
// ─────────────────────────────────────────────────────────────────────────────
// Fox.jsx v1.4 — orchestratore puro.
// Non contiene logica derivativa: tutto viene da useFoxBrain e useFoxAnimations.
// Responsabilità: assemblare le props, applicare il wrapper CSS, mostrare particelle.
//
// v1.3.2: l'intent ora si calcola da deriveVisualState({mood, lastFedAt}), la
// stessa funzione pura usata da useFoxBrain — prima veniva calcolato solo dal
// mood grezzo, ignorando la pose fisica, e la volpe restava "attiva" (sguardi,
// salti) anche quando il corpo era già addormentato o sdraiato.
//
// v2.0: getFoxStage non è più una copia locale — è deriveStage di FoxBrain.js,
// semplicemente re-esportata per compatibilità con App.jsx (eliminata la
// duplicazione). Due nuove prop opzionali, relationship/trust (da foxState,
// Fox Engine in useNutriFox.js): alimentano warmthScale/glowOpacity in
// FoxBrain (postura/luminosità, MAI lo stage) e vitality in FoxAnimations
// (±10% su frequenza dei micro-eventi) — passate attraverso, non ricalcolate.
//
// v2.1: nuova prop opzionale behaviorState (Behavior Engine, useNutriFox.js).
// `vitality` (passata a FoxAnimations) ora nasce da UN SOLO calcolo che fonde
// relationship/trust (v2.0) con behaviorState.animationIntensity (v2.1) —
// non due formule separate. behaviorState viene anche passato a useFoxBrain
// così com'è, che lo usa per un nudge leggero su warmth/glow/pose (mai su
// stage/streak/FoxSVG).
// ─────────────────────────────────────────────────────────────────────────────
 
// Re-export per compatibilità con App.jsx (che importa getFoxStage)
export { deriveStage as getFoxStage };
 
function Fox({ mood = "neutral", streak = 0, size = 160, bounce = false, lastFedAt = null, licking = false, specialEmotion = null, relationship = 50, trust = 50, behaviorState = null }) {
 
  // 1. Pose + visualMood di base con la stessa funzione pura usata da useFoxBrain.
  //    v1.8: se il motore decisionale chiede un'emozione speciale (proud/curious)
  //    la applichiamo qui, RISOLVENDO UNA VOLA SOLA il visualMood finale — tranne
  //    quando la volpe sta dormendo/è assopita, che vince sempre su tutto il resto.
  const { visualMood: baseVisualMood, hoursSinceLastFed } = deriveVisualState({ mood, lastFedAt });
  const visualMood = (baseVisualMood==="sleeping" || baseVisualMood==="drowsy")
    ? baseVisualMood
    : (specialEmotion || baseVisualMood);
  const intent = getAnimationIntent(visualMood);
  // Bucket a 15 minuti: evita che l'effetto di rallentamento del blink si
  // riarmi ad ogni singolo render (hoursSinceLastFed cambia in continuazione).
  const hoursBucket = hoursSinceLastFed != null ? Math.round(hoursSinceLastFed*4)/4 : null;
 
  // 2. Micro-animazioni idle: scheduler unico, valori boolean/numerici.
  //    v2.0: vitality = media di relationship/trust. v2.1: si fonde con
  //    behaviorState.animationIntensity — UN SOLO calcolo di vitalità, non
  //    due formule separate che potrebbero disallinearsi.
  const baseWarmth = computeWarmth(relationship, trust);
  const vitality = behaviorState
    ? Math.max(0, Math.min(1, baseWarmth*0.6 + behaviorState.animationIntensity*0.4))
    : baseWarmth;
  const { blink, lookOffset, headTilt, tailFlick, earTwitch, hop, yawn, stretch } = useFoxAnimations(intent, hoursBucket, vitality);
 
  // 3. Tutte le derivazioni visive: un oggetto unico, nessuna logica inline qui.
  //    Il visualMood già risolto sopra viene passato così com'è, non ricalcolato.
  //    v2.1: behaviorState passato a useFoxBrain per modulare leggermente
  //    pose/warmth/glow — mai stage/streak (invariati).
  const brain = useFoxBrain({ mood, streak, lastFedAt, bounce, hop, stretch, earTwitch, resolvedVisualMood: visualMood, relationship, trust, behaviorState });
 
  const { stage, poseTransform, bodyAnim, tailSpeed } = brain;
 
  const showParticles = visualMood === "happy" || visualMood === "excited" || visualMood === "proud";
 
  // v1.3.2: due varianti di bounce scelte a caso ad ogni pasto, così il feedback
  // al pasto non è sempre identico al pixel.
  const [bounceVariant, setBounceVariant] = useState(1);
  const wasBounce = useRef(false);
  useEffect(() => {
    if (bounce && !wasBounce.current) setBounceVariant(Math.random() < 0.5 ? 1 : 2);
    wasBounce.current = bounce;
  }, [bounce]);
  const resolvedBodyAnim = bodyAnim === "fox-bounce" && bounceVariant === 2 ? "fox-bounce2" : bodyAnim;
 
  const moodDescriptions = { happy:"felice", excited:"euforica", content:"serena", neutral:"tranquilla", sad:"un po' giù", drowsy:"assopita", sleeping:"addormentata" };
 
  return (
    <div role="img" aria-label={`Volpe, stato: ${moodDescriptions[brain.visualMood] || "tranquilla"}`} style={{ position:"relative", display:"inline-block", lineHeight:0 }}>
 
      {/* Aura leggendaria (solo stage, invariata) */}
      {stage.aura && (
        <div style={{
          position:"absolute", inset:-22, borderRadius:"50%",
          background:"radial-gradient(circle,#F9C74F40 0%,#F9C74F12 55%,transparent 70%)",
          animation:"aura 2.4s ease-in-out infinite", pointerEvents:"none",
        }}/>
      )}

      {/* v2.0: luminosità secondaria legata al legame (relationship/trust) —
          indipendente dall'aura leggendaria, sempre presente ma sottile,
          non compete visivamente con lo stage. */}
      {!stage.aura && brain.glowOpacity > 0.08 && (
        <div style={{
          position:"absolute", inset:-14, borderRadius:"50%",
          background:`radial-gradient(circle, ${stage.color}${Math.round(brain.glowOpacity*255).toString(16).padStart(2,"0")} 0%, transparent 65%)`,
          pointerEvents:"none",
        }}/>
      )}
 
      {/* Particelle felicità */}
      {showParticles && [
        { t:4,  l:-4, e:"✨", d:0   },
        { t:-2, l:8,  e:"⭐", d:0.3 },
        { t:10, l:12, e:"💫", d:0.6 },
      ].map(p => (
        <div key={p.e} style={{
          position:"absolute", top:p.t, left:p.l, fontSize:13,
          animation:`pfloat 1.5s ${p.d}s ease-out forwards`, opacity:0, pointerEvents:"none",
        }}>{p.e}</div>
      ))}
 
      {/* Wrapper corpo: applica pose (scaleY, offsetY) e animazione */}
      <div
        className={resolvedBodyAnim}
        style={{
          width: size,
          height: size * 1.18 * stage.scale,
          transform: `scale(${stage.scale * brain.warmthScale}) scaleY(${poseTransform.scaleY}) translateY(${poseTransform.offsetY + brain.poseLeanY}px)`,
          transition: `transform ${poseTransform.transition}`,
          filter:`drop-shadow(0 10px 24px ${stage.color}50) drop-shadow(0 3px 8px #00000038)`,
        }}
      >
        {/* FoxSVG: completamente dumb, riceve solo valori visivi già calcolati */}
        <FoxSVG
          ex={brain.ex}
          colors={brain.colors}
          streak={streak}
          legendary={stage.aura}
          blink={blink}
          lookOffset={lookOffset}
          headTilt={headTilt}
          earAngle={brain.earAngle}
          tailSpeed={tailSpeed}
          yawning={yawn}
          licking={licking}
        />
      </div>
 
      <style>{`
        .fox-idle    { animation: foxIdle    3.8s ease-in-out infinite; }
        .fox-bounce  { animation: foxBounce  0.55s cubic-bezier(.36,.07,.19,.97) both; }
        .fox-bounce2 { animation: foxBounce2 0.6s  cubic-bezier(.36,.07,.19,.97) both; }
        .fox-hop     { animation: foxHop     0.5s  cubic-bezier(.36,.07,.19,.97) both; }
        .fox-breathe { animation: foxBreathe 4.5s ease-in-out infinite; }
        .fox-drowsy  { animation: foxDrowsy  5.2s ease-in-out infinite; }
        .fox-stretch { animation: foxStretch 0.9s cubic-bezier(.45,0,.55,1) both; }
        .fox-sad     { animation: foxSad     4s   ease-in-out infinite; }
        .fox-excited { animation: foxExcited 0.85s ease-in-out infinite; }
 
        .fox-torso-group { animation: torsoBreathe 3.6s ease-in-out infinite; }
        .fox-head-group  { transition: transform 0.5s cubic-bezier(.34,1.4,.64,1); }
        .fox-tongue      { transform-origin: 49px 66px; animation: foxLick 0.9s ease-in-out 2; }
 
        @keyframes foxIdle    { 0%,100%{ transform:translateY(0); }       50%{ transform:translateY(-5px); } }
        @keyframes foxBounce  { 0%{transform:scale(1) translateY(0);} 20%{transform:scale(1.08,.93) translateY(5px);} 45%{transform:scale(.94,1.06) translateY(-13px);} 65%{transform:scale(1.04,.97) translateY(3px);} 82%{transform:scale(.98,1.02) translateY(-4px);} 100%{transform:scale(1) translateY(0);} }
        @keyframes foxBounce2 { 0%{transform:scale(1) translateY(0) rotate(0);} 18%{transform:scale(1.1,.9) translateY(6px) rotate(-2deg);} 42%{transform:scale(.92,1.08) translateY(-15px) rotate(2deg);} 68%{transform:scale(1.05,.96) translateY(2px) rotate(-1deg);} 86%{transform:scale(.99,1.01) translateY(-3px) rotate(0);} 100%{transform:scale(1) translateY(0) rotate(0);} }
        @keyframes foxHop     { 0%{transform:scale(1) translateY(0);} 35%{transform:scale(1.04,.96) translateY(-10px);} 70%{transform:scale(.98,1.02) translateY(2px);} 100%{transform:scale(1) translateY(0);} }
        @keyframes foxBreathe { 0%,100%{ transform:scale(1); }            50%{ transform:scale(1.02) translateY(-2px); } }
        @keyframes foxDrowsy  { 0%,100%{ transform:translateY(0) scale(1); } 50%{ transform:translateY(3px) scale(1.008,0.99); } }
        @keyframes foxStretch { 0%{transform:scale(1) translateY(0);} 40%{transform:scale(0.94,1.14) translateY(-6px);} 70%{transform:scale(1.06,0.92) translateY(2px);} 100%{transform:scale(1) translateY(0);} }
        @keyframes foxLick    { 0%,100%{ transform:translateY(0) scaleY(1); } 50%{ transform:translateY(3px) scaleY(1.3); } }
        @keyframes foxSad     { 0%,100%{ transform:translateY(0) rotate(0deg); }  50%{ transform:translateY(5px) rotate(-1deg); } }
        @keyframes foxExcited { 0%,100%{ transform:translateY(0) scale(1); }      30%{ transform:translateY(-7px) scale(1.03); } 70%{ transform:translateY(-3px) scale(1.01); } }
        @keyframes torsoBreathe { 0%,100%{ transform:scaleY(1); } 50%{ transform:scaleY(1.015); } }
        @keyframes aura       { 0%,100%{ opacity:.5; transform:scale(1); } 50%{ opacity:1; transform:scale(1.06); } }
        @keyframes pfloat     { 0%{ transform:translateY(0); opacity:1; } 100%{ transform:translateY(-50px); opacity:0; } }
 
        /* Rispetta la preferenza di sistema per il movimento ridotto: le
           animazioni ambientali continue (idle/breathe/drowsy/excited/sad)
           si fermano, quelle di feedback (bounce/hop/stretch/lick) restano
           ma molto più brevi, per non perdere il riscontro dell'interazione. */
        @media (prefers-reduced-motion: reduce) {
          .fox-idle, .fox-breathe, .fox-drowsy, .fox-sad, .fox-excited,
          .fox-torso-group { animation: none !important; }
          .fox-bounce, .fox-bounce2, .fox-hop, .fox-stretch, .fox-tongue { animation-duration: 0.15s !important; }
          .fox-head-group { transition-duration: 0.15s !important; }
        }
      `}</style>
    </div>
  );
}
 
export default memo(Fox);


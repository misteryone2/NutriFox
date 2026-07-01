import { useFoxBrain } from "./FoxBrain";
import { useFoxAnimations, getAnimationIntent } from "./FoxAnimations";
import FoxSVG from "./FoxSVG";

// ─────────────────────────────────────────────────────────────────────────────
// Fox.jsx v1.4 — orchestratore puro.
// Non contiene logica derivativa: tutto viene da useFoxBrain e useFoxAnimations.
// Responsabilità: assemblare le props, applicare il wrapper CSS, mostrare particelle.
// ─────────────────────────────────────────────────────────────────────────────

// Re-export per compatibilità con App.jsx (che importa getFoxStage)
export function getFoxStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true,  scale:1.12 };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false, scale:1.06 };
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false, scale:1.02 };
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false, scale:1.0  };
}

export default function Fox({ mood = "neutral", streak = 0, size = 160, bounce = false, lastFedAt = null }) {

  // 1. Calcola intent dall'esterno (non dentro useFoxBrain, rimane coerente con FoxAnimations)
  const intent = getAnimationIntent(mood);

  // 2. Micro-animazioni idle: scheduler unico, valori boolean/numerici
  const { blink, lookOffset, headTilt, tailFlick, earTwitch, hop } = useFoxAnimations(intent);

  // 3. Tutte le derivazioni visive: un oggetto unico, nessuna logica inline qui
  const brain = useFoxBrain({ mood, streak, lastFedAt, bounce, hop, earTwitch });

  const { stage, poseTransform, bodyAnim, tailSpeed } = brain;

  const showParticles = mood === "happy" || mood === "excited";

  return (
    <div style={{ position:"relative", display:"inline-block", lineHeight:0 }}>

      {/* Aura leggendaria */}
      {stage.aura && (
        <div style={{
          position:"absolute", inset:-22, borderRadius:"50%",
          background:"radial-gradient(circle,#F9C74F40 0%,#F9C74F12 55%,transparent 70%)",
          animation:"aura 2.4s ease-in-out infinite", pointerEvents:"none",
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
        className={bodyAnim}
        style={{
          width: size,
          height: size * 1.18 * stage.scale,
          transform: `scale(${stage.scale}) scaleY(${poseTransform.scaleY}) translateY(${poseTransform.offsetY}px)`,
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
        />
      </div>

      <style>{`
        .fox-idle    { animation: foxIdle    3.8s ease-in-out infinite; }
        .fox-bounce  { animation: foxBounce  0.55s cubic-bezier(.36,.07,.19,.97) both; }
        .fox-hop     { animation: foxHop     0.5s  cubic-bezier(.36,.07,.19,.97) both; }
        .fox-breathe { animation: foxBreathe 4.5s ease-in-out infinite; }
        .fox-sad     { animation: foxSad     4s   ease-in-out infinite; }
        .fox-excited { animation: foxExcited 0.85s ease-in-out infinite; }

        .fox-torso-group { animation: torsoBreathe 3.6s ease-in-out infinite; }
        .fox-head-group  { transition: transform 0.5s cubic-bezier(.34,1.4,.64,1); }

        @keyframes foxIdle    { 0%,100%{ transform:translateY(0); }       50%{ transform:translateY(-5px); } }
        @keyframes foxBounce  { 0%{transform:scale(1) translateY(0);} 20%{transform:scale(1.08,.93) translateY(5px);} 45%{transform:scale(.94,1.06) translateY(-13px);} 65%{transform:scale(1.04,.97) translateY(3px);} 82%{transform:scale(.98,1.02) translateY(-4px);} 100%{transform:scale(1) translateY(0);} }
        @keyframes foxHop     { 0%{transform:scale(1) translateY(0);} 35%{transform:scale(1.04,.96) translateY(-10px);} 70%{transform:scale(.98,1.02) translateY(2px);} 100%{transform:scale(1) translateY(0);} }
        @keyframes foxBreathe { 0%,100%{ transform:scale(1); }            50%{ transform:scale(1.02) translateY(-2px); } }
        @keyframes foxSad     { 0%,100%{ transform:translateY(0) rotate(0deg); }  50%{ transform:translateY(5px) rotate(-1deg); } }
        @keyframes foxExcited { 0%,100%{ transform:translateY(0) scale(1); }      30%{ transform:translateY(-7px) scale(1.03); } 70%{ transform:translateY(-3px) scale(1.01); } }
        @keyframes torsoBreathe { 0%,100%{ transform:scaleY(1); } 50%{ transform:scaleY(1.015); } }
        @keyframes aura       { 0%,100%{ opacity:.5; transform:scale(1); } 50%{ opacity:1; transform:scale(1.06); } }
        @keyframes pfloat     { 0%{ transform:translateY(0); opacity:1; } 100%{ transform:translateY(-50px); opacity:0; } }
      `}</style>
    </div>
  );
}

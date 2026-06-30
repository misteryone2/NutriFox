import { useFoxAnimations } from "./FoxAnimations";
import FoxSVG from "./FoxSVG";

// ─────────────────────────────────────────────────────────────────────────────
// Fox.jsx — componente principale: calcola stato visivo (mood, stadio, colori)
// e lo passa al disegno puro (FoxSVG) e alle animazioni idle (FoxAnimations).
// ─────────────────────────────────────────────────────────────────────────────

export function getFoxStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true,  scale:1.12, legs:"tall"  };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false, scale:1.06, legs:"normal"};
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false, scale:1.02, legs:"normal"};
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false, scale:1.0,  legs:"short" };
}

// Espressioni per mood — ogni proprietà guida una parte del disegno in FoxSVG
const MOOD_EXPR = {
  happy: {
    bY:-3, bCurve:6, mouth:"M 46 65 Q 52 72 58 65",
    eH:0.62, open:true, cheeksUp:true, mouthFill:true, mouthFillOpacity:0.18,
    sparkleBrows:false, earMood:"relaxed",
  },
  excited: {
    bY:-6, bCurve:9, mouth:"M 43 64 Q 52 76 61 64",
    eH:1.12, open:true, cheeksUp:true, mouthFill:true, mouthFillOpacity:0.22,
    sparkleBrows:true, earMood:"up",
  },
  neutral: {
    bY:0, bCurve:1, mouth:"M 46 67 Q 52 70 58 67",
    eH:1.0, open:true, cheeksUp:false, mouthFill:false,
    sparkleBrows:false, earMood:"up",
  },
  sad: {
    bY:4, bCurve:-5, mouth:"M 46 71 Q 52 65 58 71",
    eH:0.88, open:true, cheeksUp:false, mouthFill:false,
    sparkleBrows:false, earMood:"down",
  },
  sleeping: {
    bY:0, bCurve:0, mouth:"M 46 67 Q 52 70 58 67",
    eH:0, open:false, sleepy:true, cheeksUp:false, mouthFill:false,
    sparkleBrows:false, earMood:"relaxed",
  },
};

const EAR_ANGLES = {
  up:       { left:0,  right:0  },
  relaxed:  { left:6,  right:-6 },
  down:     { left:14, right:-14},
};

export default function Fox({ mood = "neutral", streak = 0, size = 160, bounce = false }) {
  const stage = getFoxStage(streak);
  const ex    = MOOD_EXPR[mood] || MOOD_EXPR.neutral;
  const ears  = EAR_ANGLES[ex.earMood] || EAR_ANGLES.up;

  const { blink, lookOffset, headTilt, tailFlick } = useFoxAnimations(mood);

  // Colori outfit per stadio
  const sw = streak>=30?"#D4A830":streak>=14?"#7C3AED":streak>=7?"#16A34A":"#C8B49A";
  const swD= streak>=30?"#A07820":streak>=14?"#5B21B6":streak>=7?"#14532D":"#A89278";
  const pt = streak>=30?"#7C3A0A":streak>=14?"#3B0764":streak>=7?"#052E16":"#4A3020";

  const bodyAnim = bounce            ? "fox-bounce"
    : mood === "sleeping"            ? "fox-breathe"
    : mood === "sad"                 ? "fox-sad"
    : mood === "excited"             ? "fox-excited"
    : "fox-idle";

  const tailAnimSpeed = mood === "excited" ? "1.8s" : mood === "sad" ? "5s" : tailFlick ? "0.5s" : "3.5s";

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
      {(mood==="happy"||mood==="excited") && [
        { t:4,  l:-4, e:"✨", d:0   },
        { t:-2, l:8,  e:"⭐", d:0.3 },
        { t:10, l:12, e:"💫", d:0.6 },
      ].map(p => (
        <div key={p.e} style={{
          position:"absolute", top:p.t, left:p.l, fontSize:13,
          animation:`pfloat 1.5s ${p.d}s ease-out forwards`, opacity:0, pointerEvents:"none",
        }}>{p.e}</div>
      ))}

      <div
        className={bodyAnim}
        style={{
          width: size, height: size * 1.18 * stage.scale, transform:`scale(${stage.scale})`,
          filter:`drop-shadow(0 10px 24px ${stage.color}50) drop-shadow(0 3px 8px #00000038)`,
        }}
      >
        <FoxSVG
          ex={ex}
          colors={{ sw, swD, pt }}
          streak={streak}
          legendary={stage.aura}
          blink={blink}
          lookOffset={lookOffset}
          headTilt={headTilt}
          earAngle={ears}
        />
      </div>

      <style>{`
        .fox-idle    { animation: foxIdle    3.8s ease-in-out infinite; }
        .fox-bounce  { animation: foxBounce  0.55s cubic-bezier(.36,.07,.19,.97) both; }
        .fox-breathe { animation: foxBreathe 4.5s ease-in-out infinite; }
        .fox-sad     { animation: foxSad     4s   ease-in-out infinite; }
        .fox-excited { animation: foxExcited 0.85s ease-in-out infinite; }

        .fox-tail-group  { animation: tailwag ${tailAnimSpeed} ease-in-out infinite; }
        .fox-torso-group { animation: torsoBreathe 3.6s ease-in-out infinite; }
        .fox-head-group  { transition: transform 0.5s cubic-bezier(.34,1.4,.64,1); }

        @keyframes foxIdle {
          0%,100%{ transform:translateY(0); }
          50%    { transform:translateY(-5px); }
        }
        @keyframes foxBounce {
          0%  { transform:scale(1) translateY(0); }
          20% { transform:scale(1.08,.93) translateY(5px); }
          45% { transform:scale(.94,1.06) translateY(-13px); }
          65% { transform:scale(1.04,.97) translateY(3px); }
          82% { transform:scale(.98,1.02) translateY(-4px); }
          100%{ transform:scale(1) translateY(0); }
        }
        @keyframes foxBreathe {
          0%,100%{ transform:scale(1); }
          50%    { transform:scale(1.02) translateY(-2px); }
        }
        @keyframes foxSad {
          0%,100%{ transform:translateY(0) rotate(0deg); }
          50%    { transform:translateY(5px) rotate(-1deg); }
        }
        @keyframes foxExcited {
          0%,100%{ transform:translateY(0) scale(1); }
          30%    { transform:translateY(-7px) scale(1.03); }
          70%    { transform:translateY(-3px) scale(1.01); }
        }
        @keyframes torsoBreathe {
          0%,100%{ transform:scaleY(1); }
          50%    { transform:scaleY(1.015); }
        }
        @keyframes tailwag {
          0%,100%{ transform:rotate(0deg); }
          35%    { transform:rotate(10deg); }
          70%    { transform:rotate(-7deg); }
        }
        @keyframes aura {
          0%,100%{ opacity:.5; transform:scale(1); }
          50%    { opacity:1;  transform:scale(1.06); }
        }
        @keyframes pfloat {
          0%  { transform:translateY(0);     opacity:1; }
          100%{ transform:translateY(-50px); opacity:0; }
        }
      `}</style>
    </div>
  );
}

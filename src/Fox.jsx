export function getFoxStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true  };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false };
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false };
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false };
}

export default function Fox({ mood = "neutral", streak = 0, size = 160, bounce = false }) {
  const stage = getFoxStage(streak);

  // Outfit per stadio
  const coat     = streak>=30?"#C9A84C":streak>=14?"#7C3AED":streak>=7?"#16A34A":"#C8B89A";
  const coatD    = streak>=30?"#A07830":streak>=14?"#5B21B6":streak>=7?"#166534":"#A89878";
  const coatDD   = streak>=30?"#7A5820":streak>=14?"#3B1196":streak>=7?"#0E4020":"#887858";
  const pants    = streak>=30?"#78350F":streak>=14?"#3B0764":streak>=7?"#052E16":"#4A3728";

  // Mood expressions
  const moods = {
    happy:   { brow:-2, browCurve:5,  mouth:"M 46 64 Q 52 71 58 64", blush:true,  eyeH:9,  open:true  },
    excited: { brow:-5, browCurve:8,  mouth:"M 43 62 Q 52 73 61 62", blush:true,  eyeH:10, open:true  },
    neutral: { brow:0,  browCurve:1,  mouth:"M 46 65 Q 52 68 58 65", blush:false, eyeH:8,  open:true  },
    sad:     { brow:4,  browCurve:-4, mouth:"M 46 69 Q 52 64 58 69", blush:false, eyeH:7,  open:true  },
    sleeping:{ brow:0,  browCurve:0,  mouth:"M 46 65 Q 52 68 58 65", blush:false, eyeH:0,  open:false },
  };
  const ex = moods[mood] || moods.neutral;

  const anim = bounce      ? "fox-bounce"
    : mood==="sleeping"    ? "fox-breathe"
    : mood==="sad"         ? "fox-sad"
    : mood==="excited"     ? "fox-excited"
    : "fox-idle";

  return (
    <div style={{position:"relative",display:"inline-block",lineHeight:0}}>

      {/* Aura leggendaria */}
      {stage.aura&&(
        <div style={{position:"absolute",inset:-24,borderRadius:"50%",
          background:"radial-gradient(circle,#F9C74F40 0%,#F9C74F10 55%,transparent 72%)",
          animation:"aura 2.5s ease-in-out infinite",pointerEvents:"none"}}/>
      )}

      {/* Particelle felicità */}
      {(mood==="happy"||mood==="excited")&&[
        {t:6, l:-6, s:15, d:0,   i:"✨"},
        {t:-2,l:4,  s:13, d:0.3, i:"⭐"},
        {t:10,l:10, s:11, d:0.6, i:"💫"},
      ].map(({t,l,s,d,i})=>(
        <div key={i} style={{position:"absolute",top:t,left:l,fontSize:s,
          animation:`pfloat 1.5s ${d}s ease-out forwards`,opacity:0,pointerEvents:"none"}}>{i}</div>
      ))}

      <svg width={size} height={size*1.22} viewBox="0 0 120 146"
        className={anim}
        style={{display:"block",
          filter:`drop-shadow(0 12px 28px ${stage.color}55) drop-shadow(0 3px 8px #00000040)`}}>
        <defs>
          {/* Pelo principale */}
          <radialGradient id="fg1" cx="42%" cy="32%" r="62%">
            <stop offset="0%"   stopColor="#F9A05A"/>
            <stop offset="45%"  stopColor="#E97840"/>
            <stop offset="100%" stopColor="#C45E22"/>
          </radialGradient>
          {/* Pelo laterale/scuro */}
          <radialGradient id="fg2" cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor="#D86A28"/>
            <stop offset="100%" stopColor="#A84A10"/>
          </radialGradient>
          {/* Bianco/crema */}
          <radialGradient id="fg3" cx="50%" cy="38%" r="56%">
            <stop offset="0%"   stopColor="#FEFCF8"/>
            <stop offset="55%"  stopColor="#F7F0E8"/>
            <stop offset="100%" stopColor="#EDE2D4"/>
          </radialGradient>
          {/* Coda */}
          <radialGradient id="tg" cx="28%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#F9A05A"/>
            <stop offset="50%"  stopColor="#E07030"/>
            <stop offset="100%" stopColor="#B05018"/>
          </radialGradient>
          {/* Iride */}
          <radialGradient id="iris" cx="38%" cy="32%" r="62%">
            <stop offset="0%"   stopColor="#B06828"/>
            <stop offset="42%"  stopColor="#7B3F00"/>
            <stop offset="100%" stopColor="#3A1800"/>
          </radialGradient>
          {/* Outfit */}
          <linearGradient id="og" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={coat}/>
            <stop offset="100%" stopColor={coatD}/>
          </linearGradient>
          {/* Ombra morbida corpo */}
          <filter id="soft" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.5"/>
          </filter>
          {/* Glow occhi */}
          <filter id="eglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Clip testa */}
          <clipPath id="headClip">
            <ellipse cx="52" cy="50" rx="31" ry="29"/>
          </clipPath>
        </defs>

        {/* ══ OMBRA A TERRA ══ */}
        <ellipse cx="56" cy="144" rx="32" ry="5" fill="#00000025"/>

        {/* ══ CODA ══ */}
        <g style={{transformOrigin:"78px 116px",animation:"tailwag 3.2s ease-in-out infinite"}}>
          {/* ombra coda */}
          <path d="M 78 118 Q 112 96 108 62 Q 104 40 86 50 Q 100 68 90 94 Q 85 110 78 116 Z"
            fill="#00000022" transform="translate(3,5)" filter="url(#soft)"/>
          {/* corpo coda */}
          <path d="M 78 118 Q 112 96 108 62 Q 104 40 86 50 Q 100 68 90 94 Q 85 110 78 116 Z"
            fill="url(#tg)"/>
          {/* striscia scura */}
          <path d="M 80 116 Q 108 98 106 68 Q 102 48 88 56 Q 100 72 91 96 Q 87 110 81 114 Z"
            fill="#C05020" opacity="0.38"/>
          {/* highlight coda */}
          <path d="M 82 112 Q 104 96 102 72 Q 100 56 89 60"
            stroke="#F9A05A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.42"/>
          {/* punta bianca */}
          <ellipse cx="98" cy="49" rx="13" ry="10"
            fill="url(#fg3)" transform="rotate(-34 98 49)"/>
          <ellipse cx="97" cy="47" rx="7" ry="5.5"
            fill="white" opacity="0.55" transform="rotate(-34 97 47)"/>
        </g>

        {/* ══ GAMBE ══ */}
        {/* sx */}
        <rect x="37" y="118" width="17" height="26" rx="8.5" fill="url(#og)"/>
        <rect x="37" y="128" width="17" height="16" rx="7"   fill={pants}/>
        <ellipse cx="45" cy="145" rx="12" ry="6"   fill="#2E1508"/>
        <ellipse cx="45" cy="143" rx="10" ry="4.5" fill="#3D1E0A"/>
        {[39,45,51].map(x=><ellipse key={x} cx={x} cy={x===45?146:144} rx="3.8" ry="3.2" fill="#4A2610" key={x}/>)}
        {/* dx */}
        <rect x="66" y="118" width="17" height="26" rx="8.5" fill="url(#og)"/>
        <rect x="66" y="128" width="17" height="16" rx="7"   fill={pants}/>
        <ellipse cx="74" cy="145" rx="12" ry="6"   fill="#2E1508"/>
        <ellipse cx="74" cy="143" rx="10" ry="4.5" fill="#3D1E0A"/>
        {[68,74,80].map(x=><ellipse key={x} cx={x} cy={x===74?146:144} rx="3.8" ry="3.2" fill="#4A2610"/>)}

        {/* ══ CORPO ══ */}
        {/* ombra corpo */}
        <ellipse cx="55" cy="106" rx="26" ry="20" fill="#00000028" filter="url(#soft)" transform="translate(2,6)"/>
        {/* maglione */}
        <rect x="26" y="84" width="68" height="44" rx="22" fill="url(#og)"/>
        {/* texture maglione */}
        {[91,99,107].map(y=>(
          <path key={y}
            d={`M30 ${y} Q34 ${y-4} 38 ${y} Q42 ${y+4} 46 ${y} Q50 ${y-4} 54 ${y} Q58 ${y+4} 62 ${y} Q66 ${y-4} 70 ${y} Q74 ${y+4} 78 ${y} Q82 ${y-4} 86 ${y} Q88 ${y} 90 ${y}`}
            stroke={coatDD} strokeWidth="1.3" fill="none" opacity="0.4" strokeLinecap="round"/>
        ))}
        {/* pancia chiara */}
        <ellipse cx="56" cy="110" rx="18" ry="12" fill="url(#fg3)" opacity="0.22"/>
        {/* collo alto */}
        <rect x="36" y="75" width="48" height="20" rx="11" fill="url(#og)"/>
        <rect x="38" y="76" width="44" height="14" rx="10" fill={coatD} opacity="0.28"/>
        {/* righe collo */}
        {[81,85].map(y=>(
          <path key={y} d={`M38 ${y} Q60 ${y-1} 82 ${y}`}
            stroke={coatDD} strokeWidth="1.1" fill="none" opacity="0.35" strokeLinecap="round"/>
        ))}

        {/* ══ BRACCIA ══ */}
        {/* sx */}
        <path d="M 26 91 Q 8 102 10 122 Q 12 132 22 128 Q 17 116 22 106 Z" fill="url(#og)"/>
        <ellipse cx="12" cy="128" rx="10.5" ry="8" fill="#2E1508"/>
        <ellipse cx="12" cy="127" rx="8.5"  ry="6" fill="#3D1E0A"/>
        {[6,12,18].map(x=><ellipse key={x} cx={x} cy={x===12?130:128} rx="3.5" ry="3" fill="#4A2610"/>)}
        {/* dx */}
        <path d="M 94 91 Q 112 102 110 122 Q 108 132 98 128 Q 103 116 98 106 Z" fill="url(#og)"/>
        <ellipse cx="108" cy="128" rx="10.5" ry="8" fill="#2E1508"/>
        <ellipse cx="108" cy="127" rx="8.5"  ry="6" fill="#3D1E0A"/>
        {[102,108,114].map(x=><ellipse key={x} cx={x} cy={x===108?130:128} rx="3.5" ry="3" fill="#4A2610"/>)}

        {/* ══ TESTA ══ */}
        {/* ombra testa */}
        <ellipse cx="54" cy="52" rx="32" ry="30"
          fill="#00000030" filter="url(#soft)" transform="translate(2,5)"/>
        {/* cranio */}
        <ellipse cx="52" cy="50" rx="31" ry="29" fill="url(#fg1)"/>
        {/* guance scure */}
        <ellipse cx="26" cy="57" rx="13" ry="11" fill="url(#fg2)" opacity="0.38"/>
        <ellipse cx="78" cy="57" rx="13" ry="11" fill="url(#fg2)" opacity="0.38"/>
        {/* highlight testa */}
        <ellipse cx="43" cy="30" rx="15" ry="9"
          fill="#F9A05A" opacity="0.28" transform="rotate(-12 43 30)"/>

        {/* ══ ORECCHIE ══ */}
        {/* sx — ombra */}
        <polygon points="30,28 20,-2 50,18" fill="#00000028" transform="translate(2,4)" filter="url(#soft)"/>
        {/* sx — strati pelo */}
        <polygon points="30,28 20,-2 50,18" fill="url(#fg1)"/>
        <polygon points="32,27 24,2  48,19" fill="#C04818" opacity="0.42"/>
        <polygon points="34,26 28,6  46,20" fill="#F0906A" opacity="0.65"/>
        <polygon points="36,25 31,9  44,21" fill="#FECFB8" opacity="0.55"/>
        {/* sx — pelo interno */}
        <path d="M 30 20 Q 33 11 42 17" stroke="#FDF0E8" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M 32 23 Q 36 14 43 19" stroke="#FDF0E8" strokeWidth="0.9" fill="none" opacity="0.4"  strokeLinecap="round"/>

        {/* dx — ombra */}
        <polygon points="74,28 84,-2 54,18" fill="#00000028" transform="translate(2,4)" filter="url(#soft)"/>
        {/* dx — strati pelo */}
        <polygon points="74,28 84,-2 54,18" fill="url(#fg1)"/>
        <polygon points="72,27 80,2  56,19" fill="#C04818" opacity="0.42"/>
        <polygon points="70,26 76,6  58,20" fill="#F0906A" opacity="0.65"/>
        <polygon points="68,25 73,9  60,21" fill="#FECFB8" opacity="0.55"/>
        {/* dx — pelo interno */}
        <path d="M 74 20 Q 71 11 62 17" stroke="#FDF0E8" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M 72 23 Q 68 14 61 19" stroke="#FDF0E8" strokeWidth="0.9" fill="none" opacity="0.4"  strokeLinecap="round"/>

        {/* ══ MUSO ══ */}
        <ellipse cx="52" cy="61" rx="21" ry="16" fill="url(#fg3)"/>
        <ellipse cx="52" cy="59" rx="19" ry="13" fill="#FAF4EC"/>
        {/* separazione muso/testa */}
        <path d="M 33 57 Q 52 53 71 57"
          stroke="#E8DDD0" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round"/>

        {/* ══ OCCHI ══ */}
        {ex.open ? (
          <g>
            {/* --- OCCHIO SX --- */}
            {/* bianco */}
            <ellipse cx="38" cy={44+ex.brow*0.4} rx="8" ry={ex.eyeH*0.92}
              fill="white" style={{filter:"drop-shadow(0 2px 5px #00000030)"}}/>
            {/* iride */}
            <circle cx="38" cy={45+ex.brow*0.4} r="6" fill="url(#iris)"/>
            {/* pupilla */}
            <circle cx="38" cy={45+ex.brow*0.4} r="3.8" fill="#150500"/>
            {/* riflesso grande */}
            <circle cx="40" cy={42+ex.brow*0.4} r="2.1" fill="white" opacity="0.92" filter="url(#eglow)"/>
            {/* riflesso piccolo */}
            <circle cx="36" cy={48+ex.brow*0.4} r="1.1" fill="white" opacity="0.5"/>
            {/* limbus */}
            <circle cx="38" cy={45+ex.brow*0.4} r="6"
              fill="none" stroke="#9A5518" strokeWidth="0.8" opacity="0.5"/>
            {/* ciglia superiori sx */}
            <path d={`M 31 ${38+ex.brow*0.4} Q 33 ${35+ex.brow*0.4} 36 ${37+ex.brow*0.4}`}
              stroke="#5A2800" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d={`M 38 ${36+ex.brow*0.4} Q 40 ${34+ex.brow*0.4} 43 ${36+ex.brow*0.4}`}
              stroke="#5A2800" strokeWidth="1.6" fill="none" strokeLinecap="round"/>

            {/* --- OCCHIO DX --- */}
            <ellipse cx="66" cy={44+ex.brow*0.4} rx="8" ry={ex.eyeH*0.92}
              fill="white" style={{filter:"drop-shadow(0 2px 5px #00000030)"}}/>
            <circle cx="66" cy={45+ex.brow*0.4} r="6" fill="url(#iris)"/>
            <circle cx="66" cy={45+ex.brow*0.4} r="3.8" fill="#150500"/>
            <circle cx="68" cy={42+ex.brow*0.4} r="2.1" fill="white" opacity="0.92" filter="url(#eglow)"/>
            <circle cx="64" cy={48+ex.brow*0.4} r="1.1" fill="white" opacity="0.5"/>
            <circle cx="66" cy={45+ex.brow*0.4} r="6"
              fill="none" stroke="#9A5518" strokeWidth="0.8" opacity="0.5"/>
            <path d={`M 59 ${38+ex.brow*0.4} Q 61 ${35+ex.brow*0.4} 64 ${37+ex.brow*0.4}`}
              stroke="#5A2800" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
            <path d={`M 66 ${36+ex.brow*0.4} Q 68 ${34+ex.brow*0.4} 71 ${36+ex.brow*0.4}`}
              stroke="#5A2800" strokeWidth="1.6" fill="none" strokeLinecap="round"/>

            {/* ── SOPRACCIGLIA ── */}
            <path d={`M 31 ${35+ex.brow} Q 38 ${31+ex.brow-ex.browCurve} 45 ${35+ex.brow}`}
              stroke="#5A2800" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
            <path d={`M 59 ${35+ex.brow} Q 66 ${31+ex.brow-ex.browCurve} 73 ${35+ex.brow}`}
              stroke="#5A2800" strokeWidth="2.6" fill="none" strokeLinecap="round"/>

            {/* sopracciglia excited extra */}
            {mood==="excited"&&(
              <>
                <path d={`M 29 ${28+ex.brow} Q 38 ${23+ex.brow} 47 ${28+ex.brow}`}
                  stroke="#F9C74F" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85"/>
                <path d={`M 57 ${28+ex.brow} Q 66 ${23+ex.brow} 75 ${28+ex.brow}`}
                  stroke="#F9C74F" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85"/>
              </>
            )}
          </g>
        ) : (
          /* ── OCCHI CHIUSI / SLEEPING ── */
          <g>
            <path d="M 31 44 Q 38 39 45 44"
              stroke="#5A2800" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            <path d="M 59 44 Q 66 39 73 44"
              stroke="#5A2800" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            {/* ciglia sleeping */}
            {[[32,43,30,39],[37,41,37,37],[43,42,45,39],[60,43,58,39],[65,41,65,37],[71,42,73,39]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#5A2800" strokeWidth="1.8" strokeLinecap="round"/>
            ))}
            <text x="80" y="33" fontSize="9"  fill="#A78BFA" fontWeight="bold" opacity="0.85">z</text>
            <text x="86" y="23" fontSize="11" fill="#A78BFA" fontWeight="bold">z</text>
            <text x="93" y="13" fontSize="13" fill="#A78BFA" fontWeight="bold">z</text>
          </g>
        )}

        {/* ══ NASO ══ */}
        <ellipse cx="52" cy="56" rx="5.2" ry="3.8" fill="#1A0500"/>
        <ellipse cx="52" cy="55" rx="4.2" ry="2.8" fill="#2A0800"/>
        {/* highlight naso */}
        <ellipse cx="50.5" cy="54.2" rx="2" ry="1.4" fill="white" opacity="0.32"/>
        {/* philtrum */}
        <path d="M 52 57 L 52 62" stroke="#C8A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.65"/>

        {/* ══ BOCCA ══ */}
        <path d={ex.mouth} stroke="#5C3018" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {/* interno bocca excited */}
        {mood==="excited"&&(
          <>
            <path d="M 43 62 Q 52 73 61 62" fill="#FF8FA3" opacity="0.22"/>
            <path d="M 47 64 L 47 69 M 52 65 L 52 70 M 57 64 L 57 69"
              stroke="white" strokeWidth="2.8" strokeLinecap="round" opacity="0.65"/>
          </>
        )}
        {/* bocca happy fill */}
        {mood==="happy"&&(
          <path d="M 46 64 Q 52 71 58 64" fill="#FF8FA3" opacity="0.18"/>
        )}

        {/* ══ BLUSH ══ */}
        {ex.blush&&(
          <>
            <ellipse cx="26" cy="64" rx="11" ry="6.5" fill="#F4845F" opacity="0.16"/>
            <ellipse cx="78" cy="64" rx="11" ry="6.5" fill="#F4845F" opacity="0.16"/>
            {/* puntini blush sx */}
            {[[22,63],[25,66],[28,63],[24,60]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r="1.2" fill="#F4845F" opacity="0.38"/>
            ))}
            {/* puntini blush dx */}
            {[[74,63],[77,66],[80,63],[76,60]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r="1.2" fill="#F4845F" opacity="0.38"/>
            ))}
          </>
        )}

        {/* ══ BAFFI ══ */}
        {[
          [28,63,10,60],[28,66,10,66],[28,69,11,73],
          [76,63,94,60],[76,66,94,66],[76,69,93,73],
        ].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#C8A882" strokeWidth="1" opacity="0.6" strokeLinecap="round"/>
        ))}

        {/* ══ DETTAGLI PELO TESTA ══ */}
        {/* ciuffo */}
        <path d="M 46 23 Q 49 15 52 21 Q 55 15 58 23"
          stroke="#F9A05A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55"/>
        {/* pelo laterale sx */}
        <path d="M 24 52 Q 20 58 22 64"
          stroke="#B85A18" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.35"/>
        {/* pelo laterale dx */}
        <path d="M 80 52 Q 84 58 82 64"
          stroke="#B85A18" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.35"/>

        {/* ══ BADGE STADIO ══ */}
        {streak>=7&&(
          <text x="56" y="100" textAnchor="middle" fontSize="9" fill={coatDD} fontWeight="bold" opacity="0.7">
            {streak>=30?"★":streak>=14?"◆":"●"}
          </text>
        )}
      </svg>

      <style>{`
        .fox-idle    { animation: foxIdle    3.8s ease-in-out infinite; }
        .fox-bounce  { animation: foxBounce  0.6s cubic-bezier(.36,.07,.19,.97) both; }
        .fox-breathe { animation: foxBreathe 4.8s ease-in-out infinite; }
        .fox-sad     { animation: foxSad     4.2s ease-in-out infinite; }
        .fox-excited { animation: foxExcited 0.9s ease-in-out infinite; }

        @keyframes foxIdle {
          0%,100%{ transform:translateY(0) rotate(0deg); }
          35%    { transform:translateY(-5px) rotate(0.5deg); }
          70%    { transform:translateY(-2px) rotate(-0.4deg); }
        }
        @keyframes foxBounce {
          0%  { transform:scale(1) translateY(0); }
          18% { transform:scale(1.08,.94) translateY(5px); }
          40% { transform:scale(.95,1.06) translateY(-13px); }
          62% { transform:scale(1.04,.97) translateY(3px); }
          80% { transform:scale(.98,1.02) translateY(-5px); }
          100%{ transform:scale(1) translateY(0); }
        }
        @keyframes foxBreathe {
          0%,100%{ transform:scale(1) translateY(0); }
          50%    { transform:scale(1.022) translateY(-2px); }
        }
        @keyframes foxSad {
          0%,100%{ transform:translateY(0) rotate(0deg); }
          50%    { transform:translateY(5px) rotate(-1.2deg); }
        }
        @keyframes foxExcited {
          0%,100%{ transform:translateY(0) rotate(0deg) scale(1); }
          25%    { transform:translateY(-7px) rotate(2.5deg) scale(1.03); }
          75%    { transform:translateY(-3px) rotate(-2deg) scale(1.01); }
        }
        @keyframes tailwag {
          0%,100%{ transform:rotate(0deg); }
          30%    { transform:rotate(9deg); }
          70%    { transform:rotate(-7deg); }
        }
        @keyframes aura {
          0%,100%{ opacity:.55; transform:scale(1); }
          50%    { opacity:1;   transform:scale(1.06); }
        }
        @keyframes pfloat {
          0%  { transform:translateY(0) scale(1);    opacity:1; }
          100%{ transform:translateY(-55px) scale(1.3); opacity:0; }
        }
      `}</style>
    </div>
  );
}

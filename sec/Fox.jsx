import { useEffect, useRef } from "react";

export function getFoxStage(streak) {
  if (streak >= 30) return { name:"Leggendaria", color:"#F9C74F", aura:true  };
  if (streak >= 14) return { name:"Adulta",      color:"#A78BFA", aura:false };
  if (streak >= 7)  return { name:"Giovane",     color:"#6FCF97", aura:false };
  return                   { name:"Cucciolo",    color:"#F4845F", aura:false };
}

export default function Fox({ mood = "neutral", streak = 0, size = 160, bounce = false }) {
  const stage  = getFoxStage(streak);

  // Outfit per stadio
  const sweater  = streak>=30?"#C9A84C":streak>=14?"#7C3AED":streak>=7?"#16A34A":"#D4C5A9";
  const sweaterD = streak>=30?"#A07830":streak>=14?"#5B21B6":streak>=7?"#166534":"#B5A48A";
  const pants    = streak>=30?"#78350F":streak>=14?"#4C1D95":streak>=7?"#14532D":"#57433A";
  const stageColor = stage.color;

  // Mood → espressione
  const expr = {
    happy:    { eyeScaleY:1,    browY:-2, browCurve:4,  mouthD:"M 44 62 Q 50 69 56 62", blush:true,  pupils:4   },
    excited:  { eyeScaleY:1.1, browY:-5, browCurve:6,  mouthD:"M 41 60 Q 50 71 59 60", blush:true,  pupils:3.5 },
    neutral:  { eyeScaleY:1,    browY:0,  browCurve:0,  mouthD:"M 44 63 Q 50 66 56 63", blush:false, pupils:4   },
    sad:      { eyeScaleY:0.85, browY:3,  browCurve:-3, mouthD:"M 44 67 Q 50 62 56 67", blush:false, pupils:3.8 },
    sleeping: { eyeScaleY:0,    browY:0,  browCurve:0,  mouthD:"M 44 63 Q 50 66 56 63", blush:false, pupils:4   },
  };
  const ex = expr[mood] || expr.neutral;

  const animClass = bounce ? "fox-bounce"
    : mood === "sleeping" ? "fox-breathe"
    : mood === "sad"      ? "fox-sad"
    : mood === "excited"  ? "fox-excited"
    : "fox-idle";

  return (
    <div style={{ position:"relative", display:"inline-block" }}>

      {/* Aura leggendaria */}
      {stage.aura && (
        <div style={{
          position:"absolute", inset:-20, borderRadius:"50%",
          background:`radial-gradient(circle, #F9C74F44 0%, #F9C74F11 50%, transparent 70%)`,
          animation:"aura-pulse 2.5s ease-in-out infinite",
          pointerEvents:"none",
        }}/>
      )}

      {/* Particelle happiness */}
      {(mood==="happy"||mood==="excited") && (
        <>
          <div style={{position:"absolute",top:8,left:-4,fontSize:14,animation:"particle-float 1.4s ease-out forwards",opacity:0,pointerEvents:"none"}}>✨</div>
          <div style={{position:"absolute",top:-4,right:2,fontSize:12,animation:"particle-float 1.6s 0.3s ease-out forwards",opacity:0,pointerEvents:"none"}}>⭐</div>
          <div style={{position:"absolute",top:16,right:-8,fontSize:10,animation:"particle-float 1.2s 0.6s ease-out forwards",opacity:0,pointerEvents:"none"}}>💫</div>
        </>
      )}

      <svg
        width={size} height={size * 1.25}
        viewBox="0 0 120 150"
        className={animClass}
        style={{ display:"block", filter:`drop-shadow(0 10px 28px ${stageColor}66) drop-shadow(0 4px 8px #00000055)` }}
      >
        <defs>
          {/* Pelo principale - gradiente radiale caldo */}
          <radialGradient id="furMain" cx="45%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#F5944A"/>
            <stop offset="40%"  stopColor="#E8763A"/>
            <stop offset="100%" stopColor="#C05A20"/>
          </radialGradient>

          {/* Pelo scuro per ombre */}
          <radialGradient id="furDark" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#D4651A"/>
            <stop offset="100%" stopColor="#A04010"/>
          </radialGradient>

          {/* Pelo bianco crema */}
          <radialGradient id="furCream" cx="50%" cy="40%" r="55%">
            <stop offset="0%"   stopColor="#FDFAF5"/>
            <stop offset="60%"  stopColor="#F5EFE6"/>
            <stop offset="100%" stopColor="#E8DDD0"/>
          </radialGradient>

          {/* Occhio - iride */}
          <radialGradient id="irisL" cx="40%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#A0622A"/>
            <stop offset="40%"  stopColor="#7B3F00"/>
            <stop offset="100%" stopColor="#4A2000"/>
          </radialGradient>
          <radialGradient id="irisR" cx="40%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#A0622A"/>
            <stop offset="40%"  stopColor="#7B3F00"/>
            <stop offset="100%" stopColor="#4A2000"/>
          </radialGradient>

          {/* Maglione gradiente */}
          <linearGradient id="sweaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={sweater}/>
            <stop offset="100%" stopColor={sweaterD}/>
          </linearGradient>

          {/* Coda gradiente */}
          <radialGradient id="tailGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#F5944A"/>
            <stop offset="60%"  stopColor="#D4651A"/>
            <stop offset="100%" stopColor="#A04010"/>
          </radialGradient>

          {/* Filtro morbido pelo */}
          <filter id="furSoft" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Ombra interna testa */}
          <filter id="headShade">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>

          {/* Glow occhi */}
          <filter id="eyeGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ══ CODA ══ */}
        <g className="fox-tail">
          {/* Ombra coda */}
          <path d="M 80 120 Q 115 100 110 66 Q 106 44 88 54 Q 100 70 92 96 Q 87 112 80 118 Z"
            fill="#00000033" transform="translate(3,4)"/>
          {/* Corpo coda */}
          <path d="M 80 120 Q 115 100 110 66 Q 106 44 88 54 Q 100 70 92 96 Q 87 112 80 118 Z"
            fill="url(#tailGrad)"/>
          {/* Striscia scura coda */}
          <path d="M 82 118 Q 110 102 107 72 Q 104 52 90 58 Q 100 72 93 96 Q 89 110 83 116 Z"
            fill="#C05A20" opacity="0.5"/>
          {/* Punta bianca */}
          <ellipse cx="100" cy="52" rx="12" ry="9" fill="url(#furCream)" transform="rotate(-32 100 52)"/>
          <ellipse cx="99"  cy="50" rx="7"  ry="5" fill="white" opacity="0.6" transform="rotate(-32 99 50)"/>
          {/* Highlight coda */}
          <path d="M 83 116 Q 106 104 104 76 Q 102 58 91 62"
            stroke="#F5944A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
        </g>

        {/* ══ GAMBE ══ */}
        {/* Gamba sinistra */}
        <rect x="39" y="122" width="16" height="25" rx="8" fill={`url(#sweaterGrad)`}/>
        <rect x="39" y="132" width="16" height="15" rx="6" fill={pants}/>
        {/* Piede sinistro */}
        <ellipse cx="47" cy="148" rx="11" ry="6" fill="#3D2010"/>
        <ellipse cx="47" cy="147" rx="9"  ry="4.5" fill="#4D2918"/>
        <ellipse cx="41" cy="146" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="47" cy="149" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="53" cy="146" rx="3.5" ry="3" fill="#5A3020"/>
        {/* Gamba destra */}
        <rect x="65" y="122" width="16" height="25" rx="8" fill={`url(#sweaterGrad)`}/>
        <rect x="65" y="132" width="16" height="15" rx="6" fill={pants}/>
        {/* Piede destro */}
        <ellipse cx="73" cy="148" rx="11" ry="6" fill="#3D2010"/>
        <ellipse cx="73" cy="147" rx="9"  ry="4.5" fill="#4D2918"/>
        <ellipse cx="67" cy="146" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="73" cy="149" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="79" cy="146" rx="3.5" ry="3" fill="#5A3020"/>

        {/* ══ CORPO / MAGLIONE ══ */}
        <rect x="27" y="86" width="66" height="44" rx="20" fill="url(#sweaterGrad)"/>
        {/* Texture maglione a trecce */}
        {[92,100,108].map(y=>(
          <path key={y}
            d={`M 33 ${y} Q 37 ${y-4} 41 ${y} Q 45 ${y+4} 49 ${y} Q 53 ${y-4} 57 ${y} Q 61 ${y+4} 65 ${y} Q 69 ${y-4} 73 ${y} Q 77 ${y+4} 81 ${y} Q 85 ${y-4} 87 ${y}`}
            stroke={sweaterD} strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round"/>
        ))}
        {/* Collo alto */}
        <rect x="37" y="77" width="46" height="20" rx="10" fill="url(#sweaterGrad)"/>
        <rect x="39" y="78" width="42" height="14" rx="9"  fill={sweaterD} opacity="0.3"/>
        {/* Righe collo */}
        <path d="M 39 83 Q 60 81 81 83" stroke={sweaterD} strokeWidth="1" fill="none" opacity="0.5"/>
        <path d="M 39 87 Q 60 85 81 87" stroke={sweaterD} strokeWidth="1" fill="none" opacity="0.5"/>
        {/* Pancia */}
        <ellipse cx="60" cy="112" rx="18" ry="12" fill="url(#furCream)" opacity="0.25"/>
        {/* Ombra corpo basso */}
        <ellipse cx="60" cy="128" rx="22" ry="6" fill="#00000033"/>

        {/* ══ BRACCIA ══ */}
        {/* Braccio sinistro */}
        <path d="M 27 93 Q 9 104 11 124 Q 13 134 23 130 Q 18 118 24 108 Z" fill="url(#sweaterGrad)"/>
        <ellipse cx="13" cy="130" rx="10" ry="7.5" fill="#3D2010"/>
        <ellipse cx="13" cy="129" rx="8"  ry="5.5" fill="#4D2918"/>
        <ellipse cx="7"  cy="128" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="13" cy="131" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="19" cy="128" rx="3.5" ry="3" fill="#5A3020"/>
        {/* Braccio destro */}
        <path d="M 93 93 Q 111 104 109 124 Q 107 134 97 130 Q 102 118 96 108 Z" fill="url(#sweaterGrad)"/>
        <ellipse cx="107" cy="130" rx="10" ry="7.5" fill="#3D2010"/>
        <ellipse cx="107" cy="129" rx="8"  ry="5.5" fill="#4D2918"/>
        <ellipse cx="101" cy="128" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="107" cy="131" rx="3.5" ry="3" fill="#5A3020"/>
        <ellipse cx="113" cy="128" rx="3.5" ry="3" fill="#5A3020"/>

        {/* ══ TESTA ══ */}
        {/* Ombra testa */}
        <ellipse cx="62" cy="55" rx="30" ry="28" fill="#00000033" transform="translate(2,4)"/>
        {/* Cranio */}
        <ellipse cx="60" cy="50" rx="30" ry="28" fill="url(#furMain)"/>
        {/* Zona laterale scura */}
        <ellipse cx="33" cy="57" rx="12" ry="10" fill="url(#furDark)" opacity="0.45"/>
        <ellipse cx="87" cy="57" rx="12" ry="10" fill="url(#furDark)" opacity="0.45"/>
        {/* Highlight testa */}
        <ellipse cx="50" cy="32" rx="14" ry="8" fill="#F5944A" opacity="0.3" transform="rotate(-10 50 32)"/>

        {/* ══ ORECCHIE ══ */}
        {/* Ombra orecchio sinistro */}
        <polygon points="34,28 23,0 52,18" fill="#00000033" transform="translate(2,3)"/>
        <polygon points="34,28 23,0 52,18" fill="url(#furMain)"/>
        <polygon points="36,27 27,4 50,19" fill="#A04010" opacity="0.45"/>
        <polygon points="37,26 30,7 48,20" fill="#F5A07A" opacity="0.7"/>
        <polygon points="38,25 33,10 46,20" fill="#FECBB0" opacity="0.5"/>
        {/* Pelo interno orecchio */}
        <path d="M 34 22 Q 36 12 44 18" stroke="#F5EFE6" strokeWidth="1" fill="none" opacity="0.5"/>
        <path d="M 36 24 Q 39 15 45 20" stroke="#F5EFE6" strokeWidth="0.8" fill="none" opacity="0.4"/>

        {/* Ombra orecchio destro */}
        <polygon points="86,28 97,0 68,18" fill="#00000033" transform="translate(2,3)"/>
        <polygon points="86,28 97,0 68,18" fill="url(#furMain)"/>
        <polygon points="84,27 93,4 70,19" fill="#A04010" opacity="0.45"/>
        <polygon points="83,26 90,7 72,20" fill="#F5A07A" opacity="0.7"/>
        <polygon points="82,25 87,10 74,20" fill="#FECBB0" opacity="0.5"/>
        <path d="M 86 22 Q 84 12 76 18" stroke="#F5EFE6" strokeWidth="1" fill="none" opacity="0.5"/>
        <path d="M 84 24 Q 81 15 75 20" stroke="#F5EFE6" strokeWidth="0.8" fill="none" opacity="0.4"/>

        {/* ══ MUSO ══ */}
        <ellipse cx="60" cy="62" rx="21" ry="16" fill="url(#furCream)"/>
        <ellipse cx="60" cy="60" rx="19" ry="13" fill="#F8F2EA"/>
        {/* Separazione muso */}
        <path d="M 42 58 Q 60 54 78 58" stroke="#E8DDD0" strokeWidth="1" fill="none" opacity="0.6"/>

        {/* ══ OCCHI ══ */}
        {mood === "sleeping" ? (
          <g>
            {/* Occhi chiusi con ciglia eleganti */}
            <path d="M 39 46 Q 46 41 53 46" stroke="#7B3F00" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            <path d="M 67 46 Q 74 41 81 46" stroke="#7B3F00" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            {/* Ciglia */}
            {[[40,45,38,41],[45,43,45,39],[51,44,53,41],[68,45,66,41],[74,43,74,39],[80,44,82,41]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7B3F00" strokeWidth="1.8" strokeLinecap="round"/>
            ))}
            <text x="86" y="33" fontSize="9"  fill="#A78BFA" fontWeight="bold" opacity="0.8">z</text>
            <text x="92" y="24" fontSize="11" fill="#A78BFA" fontWeight="bold" opacity="0.9">z</text>
            <text x="98" y="16" fontSize="13" fill="#A78BFA" fontWeight="bold">z</text>
          </g>
        ) : (
          <g>
            {/* Bianco occhio sx */}
            <ellipse cx="46" cy={46+ex.browY*0.5} rx="8.5" ry={8.5*ex.eyeScaleY} fill="white"
              style={{filter:"drop-shadow(0 2px 4px #00000033)"}}/>
            {/* Iride sx */}
            <circle  cx="46" cy={47+ex.browY*0.5} r="6.2" fill="url(#irisL)"/>
            {/* Pupilla sx */}
            <circle  cx="46" cy={47+ex.browY*0.5} r={ex.pupils} fill="#0D0500"/>
            {/* Riflesso principale sx */}
            <circle  cx="48" cy={44+ex.browY*0.5} r="2" fill="white" opacity="0.9" filter="url(#eyeGlow)"/>
            {/* Riflesso secondario sx */}
            <circle  cx="44" cy={50+ex.browY*0.5} r="1" fill="white" opacity="0.5"/>
            {/* Bagliore limbus sx */}
            <circle  cx="46" cy={47+ex.browY*0.5} r="6.2" fill="none" stroke="#A0622A" strokeWidth="0.8" opacity="0.6"/>

            {/* Bianco occhio dx */}
            <ellipse cx="74" cy={46+ex.browY*0.5} rx="8.5" ry={8.5*ex.eyeScaleY} fill="white"
              style={{filter:"drop-shadow(0 2px 4px #00000033)"}}/>
            {/* Iride dx */}
            <circle  cx="74" cy={47+ex.browY*0.5} r="6.2" fill="url(#irisR)"/>
            {/* Pupilla dx */}
            <circle  cx="74" cy={47+ex.browY*0.5} r={ex.pupils} fill="#0D0500"/>
            {/* Riflesso principale dx */}
            <circle  cx="76" cy={44+ex.browY*0.5} r="2" fill="white" opacity="0.9" filter="url(#eyeGlow)"/>
            {/* Riflesso secondario dx */}
            <circle  cx="72" cy={50+ex.browY*0.5} r="1" fill="white" opacity="0.5"/>
            {/* Bagliore limbus dx */}
            <circle  cx="74" cy={47+ex.browY*0.5} r="6.2" fill="none" stroke="#A0622A" strokeWidth="0.8" opacity="0.6"/>

            {/* Sopracciglia */}
            <path d={`M 39 ${37+ex.browY} Q 46 ${37+ex.browY-ex.browCurve} 53 ${37+ex.browY}`}
              stroke="#6B3A00" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d={`M 67 ${37+ex.browY} Q 74 ${37+ex.browY-ex.browCurve} 81 ${37+ex.browY}`}
              stroke="#6B3A00" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

            {/* Extra sopracciglia eccitata */}
            {mood==="excited"&&(
              <>
                <path d={`M 37 ${31+ex.browY} Q 46 ${25+ex.browY} 55 ${31+ex.browY}`}
                  stroke="#F9C74F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
                <path d={`M 65 ${31+ex.browY} Q 74 ${25+ex.browY} 83 ${31+ex.browY}`}
                  stroke="#F9C74F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
              </>
            )}
          </g>
        )}

        {/* ══ NASO ══ */}
        <ellipse cx="60" cy="57" rx="5" ry="3.5" fill="#1C0500"/>
        <ellipse cx="60" cy="56" rx="4" ry="2.5" fill="#2D0A00"/>
        {/* Highlight naso */}
        <ellipse cx="58.5" cy="55.5" rx="1.8" ry="1.2" fill="white" opacity="0.35"/>
        {/* Philtrum */}
        <path d="M 60 57 L 60 62" stroke="#C8A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>

        {/* ══ BOCCA ══ */}
        <path d={ex.mouthD} stroke="#5C3A1E" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        {mood==="happy"&&(
          <path d="M 44 62 Q 50 69 56 62" fill="#FF8FA3" opacity="0.2"/>
        )}
        {mood==="excited"&&(
          <>
            <path d="M 41 60 Q 50 71 59 60" fill="#FF8FA3" opacity="0.25"/>
            {/* Dentini */}
            <path d="M 46 63 L 46 67 M 50 64 L 50 68 M 54 63 L 54 67"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
          </>
        )}

        {/* ══ BLUSH ══ */}
        {ex.blush&&(
          <>
            <ellipse cx="35" cy="63" rx="10" ry="6" fill="#F4845F" opacity="0.18"/>
            <ellipse cx="85" cy="63" rx="10" ry="6" fill="#F4845F" opacity="0.18"/>
            {/* Puntini blush */}
            {[-2,2].map((dx,i)=>[34+dx*3,36+dx*3,38+dx*3].map((x,j)=>(
              <circle key={`${i}-${j}`} cx={x} cy={63+(j%2)} r="1" fill="#F4845F" opacity="0.35"/>
            )))}
            {[-2,2].map((dx,i)=>[82+dx*3,84+dx*3,86+dx*3].map((x,j)=>(
              <circle key={`r${i}-${j}`} cx={x} cy={63+(j%2)} r="1" fill="#F4845F" opacity="0.35"/>
            )))}
          </>
        )}

        {/* ══ BAFFI ══ */}
        {[[-22,62,-4,59],[-22,65,-4,65],[-22,68,-5,71],[22,62,4,59],[22,65,4,65],[22,68,5,71]].map(([dx,dy,ex2,ey],i)=>(
          <line key={i}
            x1={60+dx} y1={dy} x2={60+ex2} y2={ey}
            stroke="#C8A882" strokeWidth="0.9" opacity="0.65" strokeLinecap="round"/>
        ))}

        {/* ══ PELO DETTAGLIO ══ */}
        {/* Ciuffo testa */}
        <path d="M 54 25 Q 57 18 60 23 Q 63 18 66 25" stroke="#F5944A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
        {/* Pelo laterale */}
        <path d="M 32 52 Q 28 58 30 64" stroke="#C05A20" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round"/>
        <path d="M 88 52 Q 92 58 90 64" stroke="#C05A20" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round"/>

        {/* ══ BADGE STADIO ══ */}
        {streak>=30&&(
          <text x="60" y="103" textAnchor="middle" fontSize="10" fill="#F9C74F" fontWeight="bold"
            style={{filter:"drop-shadow(0 0 4px #F9C74F)"}}>★</text>
        )}
      </svg>

      <style>{`
        .fox-idle    { animation: foxIdle 3.5s ease-in-out infinite; }
        .fox-bounce  { animation: foxBounce 0.55s cubic-bezier(0.36,0.07,0.19,0.97); }
        .fox-breathe { animation: foxBreathe 4.5s ease-in-out infinite; }
        .fox-sad     { animation: foxSad 4s ease-in-out infinite; }
        .fox-excited { animation: foxExcited 0.8s ease-in-out infinite; }
        .fox-tail    { animation: tailWag 3s ease-in-out infinite; transform-origin: 80px 118px; }

        @keyframes foxIdle {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%     { transform: translateY(-5px) rotate(0.4deg); }
          66%     { transform: translateY(-2px) rotate(-0.3deg); }
        }
        @keyframes foxBounce {
          0%   { transform: scale(1) translateY(0); }
          20%  { transform: scale(1.1,0.9) translateY(4px); }
          40%  { transform: scale(0.95,1.05) translateY(-12px); }
          60%  { transform: scale(1.05,0.95) translateY(2px); }
          80%  { transform: scale(0.98,1.02) translateY(-5px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes foxBreathe {
          0%,100% { transform: scale(1) translateY(0); }
          50%     { transform: scale(1.025) translateY(-2px); }
        }
        @keyframes foxSad {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(4px) rotate(-1deg); }
        }
        @keyframes foxExcited {
          0%,100% { transform: translateY(0) rotate(0deg) scale(1); }
          25%     { transform: translateY(-6px) rotate(2deg) scale(1.02); }
          75%     { transform: translateY(-3px) rotate(-2deg) scale(1.01); }
        }
        @keyframes tailWag {
          0%,100% { transform: rotate(0deg); }
          30%     { transform: rotate(8deg); }
          70%     { transform: rotate(-6deg); }
        }
        @keyframes aura-pulse {
          0%,100% { opacity:0.5; transform:scale(1); }
          50%     { opacity:1;   transform:scale(1.05); }
        }
        @keyframes particle-float {
          0%   { transform:translateY(0) scale(1);   opacity:1; }
          100% { transform:translateY(-50px) scale(1.3); opacity:0; }
        }
      `}</style>
    </div>
  );
}

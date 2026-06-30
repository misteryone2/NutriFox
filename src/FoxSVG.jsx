// ─────────────────────────────────────────────────────────────────────────────
// Disegno puro della volpe: markup SVG, nessuna logica di stato.
// Riceve tutto già calcolato da Fox.jsx (mood, colori, sguardo, ecc.)
// ─────────────────────────────────────────────────────────────────────────────

export default function FoxSVG({
  ex, colors, streak, legendary, blink, lookOffset, headTilt, earAngle,
}) {
  const { sw, swD, pt } = colors;
  const eyesClosed = ex.open === false || blink;

  return (
    <svg width="100%" height="100%" viewBox="0 0 104 123"
      style={{ display:"block", overflow:"visible" }}>
      <defs>
        <radialGradient id="fur" cx="38%" cy="28%" r="68%">
          <stop offset="0%"  stopColor="#FAA868"/>
          <stop offset="50%" stopColor="#E87638"/>
          <stop offset="100%" stopColor="#C25C1E"/>
        </radialGradient>
        <radialGradient id="furS" cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor="#D46828"/>
          <stop offset="100%" stopColor="#9C4610"/>
        </radialGradient>
        <radialGradient id="cream" cx="48%" cy="32%" r="60%">
          <stop offset="0%"  stopColor="#FEFCF8"/>
          <stop offset="60%" stopColor="#F6EEE4"/>
          <stop offset="100%" stopColor="#E8DCCE"/>
        </radialGradient>
        <radialGradient id="tail" cx="26%" cy="22%" r="72%">
          <stop offset="0%"  stopColor="#FAA868"/>
          <stop offset="50%" stopColor="#E07030"/>
          <stop offset="100%" stopColor="#AC4C16"/>
        </radialGradient>
        <radialGradient id="iris" cx="33%" cy="25%" r="68%">
          <stop offset="0%"  stopColor="#C8803A"/>
          <stop offset="42%" stopColor="#7B3F00"/>
          <stop offset="100%" stopColor="#341600"/>
        </radialGradient>
        <linearGradient id="sw" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"  stopColor={sw}/>
          <stop offset="100%" stopColor={swD}/>
        </linearGradient>
        <filter id="blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4"/>
        </filter>
        <filter id="eg" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {legendary && (
          <filter id="goldglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        )}
      </defs>

      {/* OMBRA A TERRA */}
      <ellipse cx="50" cy="121" rx="28" ry="4" fill="#00000020"/>

      {/* CODA — inerzia elastica via CSS, vedi style esterno */}
      <g className="fox-tail-group" style={{ transformOrigin:"72px 110px" }}>
        <path d="M 72 113 Q 102 92 99 58 Q 96 35 78 45 Q 91 62 83 89 Q 79 104 72 111 Z"
          fill="#00000016" transform="translate(2,4)" filter="url(#blur)"/>
        <path d="M 72 113 Q 102 92 99 58 Q 96 35 78 45 Q 91 62 83 89 Q 79 104 72 111 Z"
          fill="url(#tail)"/>
        <path d="M 74 109 Q 97 90 95 62 Q 93 45 80 50"
          stroke="#FAA868" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.36"/>
        <ellipse cx="89" cy="43" rx="12" ry="9.5" fill="url(#cream)" transform="rotate(-35 89 43)"/>
        <ellipse cx="88" cy="41" rx="6.5" ry="5" fill="white" opacity="0.5" transform="rotate(-35 88 41)"/>
      </g>

      {/* GAMBE */}
      <rect x="33" y="110" width="15" height="13" rx="7" fill={pt}/>
      <rect x="56" y="110" width="15" height="13" rx="7" fill={pt}/>
      <ellipse cx="40" cy="121" rx="10.5" ry="5.5" fill="#2A0E04"/>
      <ellipse cx="63" cy="121" rx="10.5" ry="5.5" fill="#2A0E04"/>
      {[34,40,46].map(x=><ellipse key={"l"+x} cx={x} cy={x===40?123:121} rx="3.4" ry="3" fill="#3A1A08"/>)}
      {[57,63,69].map(x=><ellipse key={"r"+x} cx={x} cy={x===63?123:121} rx="3.4" ry="3" fill="#3A1A08"/>)}

      {/* CORPO / MAGLIONE — leggero movimento respiro via CSS class esterna */}
      <g className="fox-torso-group" style={{ transformOrigin:"50px 100px" }}>
        <ellipse cx="50" cy="103" rx="24" ry="15" fill="#00000018" filter="url(#blur)" transform="translate(1,5)"/>
        <rect x="24" y="82" width="60" height="38" rx="20" fill="url(#sw)"/>
        <ellipse cx="50" cy="102" rx="16" ry="10" fill={sw} opacity="0.32"/>
        <ellipse cx="50" cy="100" rx="11" ry="6" fill="white" opacity="0.14"/>
        <rect x="34" y="72" width="36" height="18" rx="10" fill="url(#sw)"/>
        <rect x="36" y="73" width="32" height="13" rx="9" fill={swD} opacity="0.28"/>

        {/* BRACCIA */}
        <path d="M 24 88 Q 10 97 12 113 Q 13 119 20 116 Q 16 106 20 98 Z" fill="url(#sw)"/>
        <ellipse cx="12" cy="116" rx="9" ry="7" fill="#2A0E04"/>
        {[6,12,18].map(x=><ellipse key={"al"+x} cx={x} cy={x===12?118:116} rx="3.1" ry="2.7" fill="#3A1A08"/>)}
        <path d="M 80 88 Q 94 97 92 113 Q 91 119 84 116 Q 88 106 84 98 Z" fill="url(#sw)"/>
        <ellipse cx="92" cy="116" rx="9" ry="7" fill="#2A0E04"/>
        {[86,92,98].map(x=><ellipse key={"ar"+x} cx={x} cy={x===92?118:116} rx="3.1" ry="2.7" fill="#3A1A08"/>)}
      </g>

      {/* TESTA — gruppo con tilt + respiro leggero, via CSS class esterna */}
      <g className="fox-head-group" style={{ transformOrigin:"49px 75px", transform:`rotate(${headTilt}deg)` }}>

        {/* ombra testa */}
        <ellipse cx="51" cy="48" rx="34" ry="32" fill="#00000022" filter="url(#blur)" transform="translate(2,6)"/>
        {/* cranio */}
        <ellipse cx="49" cy="46" rx="34" ry="32" fill="url(#fur)"/>
        {/* ombra interna sotto (profondità) */}
        <ellipse cx="49" cy="62" rx="26" ry="14" fill="#00000014"/>
        {/* guance scure laterali */}
        <ellipse cx="20" cy="55" rx="14" ry="11" fill="url(#furS)" opacity="0.3"/>
        <ellipse cx="78" cy="55" rx="14" ry="11" fill="url(#furS)" opacity="0.3"/>
        {/* highlight luce alto-sx */}
        <ellipse cx="32" cy="22" rx="16" ry="10" fill="#FFC68C" opacity="0.32" transform="rotate(-18 32 22)"/>
        <ellipse cx="28" cy="18" rx="7"  ry="4"  fill="#FFE0BC" opacity="0.3"  transform="rotate(-18 28 18)"/>

        {/* ORECCHIE — angolo dinamico in base al mood */}
        <g style={{ transformOrigin:"24px 22px", transform:`rotate(${earAngle.left}deg)` }}>
          <polygon points="24,26 14,0 44,16" fill="url(#fur)"/>
          <polygon points="26,25 19,4  42,17" fill="#9C4610" opacity="0.28"/>
          <polygon points="27,24 22,7  40,18" fill="#C04818" opacity="0.34"/>
          <polygon points="29,23 24,9  38,19" fill="#FECFB8" opacity="0.55"/>
        </g>
        <g style={{ transformOrigin:"74px 22px", transform:`rotate(${earAngle.right}deg)` }}>
          <polygon points="74,26 90,0 60,16" fill="url(#fur)"/>
          <polygon points="72,25 79,4  62,17" fill="#9C4610" opacity="0.28"/>
          <polygon points="71,24 76,7  64,18" fill="#C04818" opacity="0.34"/>
          <polygon points="69,23 74,9  66,19" fill="#FECFB8" opacity="0.55"/>
        </g>

        {/* MUSO */}
        <ellipse cx="49" cy="59" rx="20" ry="15" fill="url(#cream)"/>
        <ellipse cx="49" cy="57" rx="18" ry="12" fill="#FAF4EC"/>
        <ellipse cx="44" cy="53" rx="7" ry="4" fill="white" opacity="0.3"/>

        {/* OCCHI */}
        {!eyesClosed ? (
          <g>
            {/* SX */}
            <ellipse cx={34+lookOffset.x} cy={42+ex.bY*0.4+lookOffset.y} rx="9" ry={9*ex.eH}
              fill="white" style={{ filter:"drop-shadow(0 2px 6px #00000026)" }}/>
            <circle cx={34+lookOffset.x*1.4} cy={43+ex.bY*0.4+lookOffset.y*1.2} r="6.6" fill="url(#iris)"/>
            <circle cx={34+lookOffset.x*1.4} cy={43+ex.bY*0.4+lookOffset.y*1.2} r="4.3" fill="#100300"/>
            <circle cx={36.2+lookOffset.x*1.4} cy={39.8+ex.bY*0.4+lookOffset.y*1.2} r="2.3" fill="white" opacity="0.95" filter="url(#eg)"/>
            <circle cx={32.4+lookOffset.x*1.4} cy={46+ex.bY*0.4+lookOffset.y*1.2} r="1.1" fill="white" opacity="0.5"/>
            <circle cx={35+lookOffset.x*1.4} cy={45+ex.bY*0.4+lookOffset.y*1.2} r="0.7" fill="white" opacity="0.35"/>

            {/* DX */}
            <ellipse cx={64+lookOffset.x} cy={42+ex.bY*0.4+lookOffset.y} rx="9" ry={9*ex.eH}
              fill="white" style={{ filter:"drop-shadow(0 2px 6px #00000026)" }}/>
            <circle cx={64+lookOffset.x*1.4} cy={43+ex.bY*0.4+lookOffset.y*1.2} r="6.6" fill="url(#iris)"/>
            <circle cx={64+lookOffset.x*1.4} cy={43+ex.bY*0.4+lookOffset.y*1.2} r="4.3" fill="#100300"/>
            <circle cx={66.2+lookOffset.x*1.4} cy={39.8+ex.bY*0.4+lookOffset.y*1.2} r="2.3" fill="white" opacity="0.95" filter="url(#eg)"/>
            <circle cx={62.4+lookOffset.x*1.4} cy={46+ex.bY*0.4+lookOffset.y*1.2} r="1.1" fill="white" opacity="0.5"/>
            <circle cx={65+lookOffset.x*1.4} cy={45+ex.bY*0.4+lookOffset.y*1.2} r="0.7" fill="white" opacity="0.35"/>

            {legendary && (
              <>
                <circle cx="34" cy={43+ex.bY*0.4} r="7.5" fill="none" stroke="#F9C74F" strokeWidth="1" opacity="0.6" filter="url(#goldglow)"/>
                <circle cx="64" cy={43+ex.bY*0.4} r="7.5" fill="none" stroke="#F9C74F" strokeWidth="1" opacity="0.6" filter="url(#goldglow)"/>
              </>
            )}

            {/* SOPRACCIGLIA */}
            <path d={`M 26 ${33+ex.bY} Q 34 ${29+ex.bY-ex.bCurve} 42 ${33+ex.bY}`}
              stroke="#5A2800" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
            <path d={`M 56 ${33+ex.bY} Q 64 ${29+ex.bY-ex.bCurve} 72 ${33+ex.bY}`}
              stroke="#5A2800" strokeWidth="2.8" fill="none" strokeLinecap="round"/>

            {ex.sparkleBrows && (
              <>
                <path d={`M 24 ${26+ex.bY} Q 34 ${21+ex.bY} 44 ${26+ex.bY}`}
                  stroke="#F9C74F" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.9"/>
                <path d={`M 54 ${26+ex.bY} Q 64 ${21+ex.bY} 74 ${26+ex.bY}`}
                  stroke="#F9C74F" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.9"/>
              </>
            )}
          </g>
        ) : (
          <g>
            <path d="M 26 42 Q 34 37 42 42" stroke="#5A2800" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M 56 42 Q 64 37 72 42" stroke="#5A2800" strokeWidth="3" fill="none" strokeLinecap="round"/>
            {ex.sleepy && (
              <>
                {[[27,41,25,37],[33,39,33,35],[40,40,42,37],[57,41,55,37],[63,39,63,35],[70,40,72,37]].map(([x1,y1,x2,y2],i)=>(
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5A2800" strokeWidth="2" strokeLinecap="round"/>
                ))}
                <text x="78" y="32" fontSize="9"  fill="#A78BFA" fontWeight="bold">z</text>
                <text x="84" y="23" fontSize="11" fill="#A78BFA" fontWeight="bold">z</text>
                <text x="90" y="14" fontSize="13" fill="#A78BFA" fontWeight="bold">z</text>
              </>
            )}
          </g>
        )}

        {/* NASO */}
        <ellipse cx="49" cy="53" rx="5" ry="3.5" fill="#1A0400"/>
        <ellipse cx="48" cy="52" rx="2" ry="1.3" fill="white" opacity="0.3"/>
        <path d="M 49 54 L 49 59" stroke="#C8A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>

        {/* BOCCA */}
        <path d={ex.mouth} stroke="#5C3018" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        {ex.mouthFill && <path d={ex.mouth} fill="#FF8FA3" opacity={ex.mouthFillOpacity}/>}

        {/* GUANCE SOLLEVATE (happy/excited) */}
        {ex.cheeksUp && (
          <>
            <ellipse cx="20" cy="58" rx="9" ry="5.5" fill="#F4845F" opacity="0.16"/>
            <ellipse cx="78" cy="58" rx="9" ry="5.5" fill="#F4845F" opacity="0.16"/>
          </>
        )}

        {/* BAFFI */}
        {[[28,60,12,57],[28,63,12,63],[28,66,13,69],[70,60,86,57],[70,63,86,63],[70,66,85,69]].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#C8A882" strokeWidth="0.9" opacity="0.5" strokeLinecap="round"/>
        ))}

        {/* Badge stadio */}
        {streak>=30 && (
          <text x="49" y="20" textAnchor="middle" fontSize="9" fill="#F9C74F" fontWeight="bold" opacity="0.85" filter="url(#goldglow)">★</text>
        )}
      </g>
    </svg>
  );
}

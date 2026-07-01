import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// FoxAnimations.js — scheduler unico per le micro-animazioni idle.
//
// v1.4: invece di più setTimeout annidati indipendenti (uno per blink, uno per
// sguardo/testa/coda...), un solo loop a "tick" valuta ad ogni intervallo quali
// eventi possono partire, rispettando:
//  - cooldown individuale per tipo di evento
//  - probabilità pesata in base all'animation intent
//  - mutua esclusione (un solo evento "grande" alla volta, il blink è leggero
//    e può sempre sovrapporsi perché non interferisce visivamente)
// ─────────────────────────────────────────────────────────────────────────────

const TICK_MS = 700; // risoluzione dello scheduler

// Intent → pesi relativi degli eventi disponibili. Più alto = più probabile.
// "idle": comportamento di base, sveglia ma tranquilla
// "playful": eccitata, eventi più frequenti e vivaci
// "sleepy": pochi eventi, solo i più delicati
// "alert": triste/in difficoltà, movimenti minimi e lenti
const INTENT_WEIGHTS = {
  idle:    { look:3, tilt:2, tailFlick:2, earTwitch:2, hop:1 },
  playful: { look:3, tilt:2, tailFlick:4, earTwitch:3, hop:3 },
  sleepy:  { look:0, tilt:0, tailFlick:0, earTwitch:0, hop:0 },
  alert:   { look:1, tilt:1, tailFlick:0, earTwitch:1, hop:0 },
};

// Cooldown minimo (ms) tra due eventi dello stesso tipo
const COOLDOWNS = { look:4000, tilt:5000, tailFlick:3000, earTwitch:3500, hop:9000 };
// Durata di ogni evento una volta attivato
const DURATIONS = { look:1200, tilt:1500, tailFlick:600, earTwitch:500, hop:500 };
// Tra un evento "corpo" e l'altro lasciamo un minimo di respiro per non sovrapporli
const GLOBAL_EVENT_GAP = 1800;

export function getAnimationIntent(mood) {
  if (mood === "sleeping") return "sleepy";
  if (mood === "sad") return "alert";
  if (mood === "excited") return "playful";
  return "idle";
}

function pickWeightedEvent(weights) {
  const entries = Object.entries(weights).filter(([,w]) => w > 0);
  const total = entries.reduce((s,[,w]) => s+w, 0);
  if (total === 0) return null;
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return null;
}

export function useFoxAnimations(intent) {
  const [blink,     setBlink]     = useState(false);
  const [lookOffset,setLookOffset]= useState({ x: 0, y: 0 });
  const [headTilt,  setHeadTilt]  = useState(0);
  const [tailFlick, setTailFlick] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [hop,       setHop]       = useState(false);

  const lastFired   = useRef({ look:0, tilt:0, tailFlick:0, earTwitch:0, hop:0 });
  const lastAnyBody = useRef(0); // ultimo evento "corpo" (esclude blink) per evitare stacking
  const eventTimers  = useRef([]);

  // ── Blink: indipendente dallo scheduler principale, leggero e non esclusivo ──
  useEffect(() => {
    if (intent === "sleepy") { setBlink(false); return; }
    let active = true;
    const speed = intent === "playful" ? [1800,4000] : [2500,6000];

    function scheduleBlink() {
      const delay = speed[0] + Math.random()*(speed[1]-speed[0]);
      const t = setTimeout(() => {
        if (!active) return;
        setBlink(true);
        const t2 = setTimeout(() => { if (active) setBlink(false); }, 140);
        eventTimers.current.push(t2);
        scheduleBlink();
      }, delay);
      eventTimers.current.push(t);
    }
    scheduleBlink();
    return () => { active = false; };
  }, [intent]);

  // ── Scheduler unico per gli eventi "corpo" (look/tilt/tail/ear/hop) ──────────
  useEffect(() => {
    const weights = INTENT_WEIGHTS[intent] || INTENT_WEIGHTS.idle;
    if (Object.values(weights).every(w => w === 0)) return; // sleepy: nessun evento

    let active = true;
    const interval = setInterval(() => {
      if (!active) return;
      const now = Date.now();

      // mutua esclusione: non avviare un nuovo evento corpo se uno è appena partito
      if (now - lastAnyBody.current < GLOBAL_EVENT_GAP) return;

      // candidati disponibili = peso > 0 E cooldown rispettato
      const available = {};
      for (const key of Object.keys(weights)) {
        if (weights[key] > 0 && now - lastFired.current[key] >= COOLDOWNS[key]) {
          available[key] = weights[key];
        }
      }
      const chosen = pickWeightedEvent(available);
      if (!chosen) return;

      // probabilità di "non fare nulla" comunque, per non essere troppo meccanici
      if (Math.random() > 0.55) return;

      lastFired.current[chosen] = now;
      lastAnyBody.current = now;

      if (chosen === "look") {
        const x = (Math.random()*5-2.5), y = (Math.random()*2-1);
        setLookOffset({ x, y });
        const t = setTimeout(() => { if(active) setLookOffset({x:0,y:0}); }, DURATIONS.look);
        eventTimers.current.push(t);
      } else if (chosen === "tilt") {
        const tilt = Math.random()*6-3;
        setHeadTilt(tilt);
        const t = setTimeout(() => { if(active) setHeadTilt(0); }, DURATIONS.tilt);
        eventTimers.current.push(t);
      } else if (chosen === "tailFlick") {
        setTailFlick(true);
        const t = setTimeout(() => { if(active) setTailFlick(false); }, DURATIONS.tailFlick);
        eventTimers.current.push(t);
      } else if (chosen === "earTwitch") {
        setEarTwitch(true);
        const t = setTimeout(() => { if(active) setEarTwitch(false); }, DURATIONS.earTwitch);
        eventTimers.current.push(t);
      } else if (chosen === "hop") {
        setHop(true);
        const t = setTimeout(() => { if(active) setHop(false); }, DURATIONS.hop);
        eventTimers.current.push(t);
      }
    }, TICK_MS);

    return () => { active = false; clearInterval(interval); };
  }, [intent]);

  // Reset pose quando si entra in sleepy, e cleanup generale allo smontaggio
  useEffect(() => {
    if (intent === "sleepy") {
      setLookOffset({x:0,y:0}); setHeadTilt(0); setTailFlick(false); setEarTwitch(false); setHop(false);
    }
  }, [intent]);

  useEffect(() => () => { eventTimers.current.forEach(t => clearTimeout(t)); }, []);

  return { blink, lookOffset, headTilt, tailFlick, earTwitch, hop };
}

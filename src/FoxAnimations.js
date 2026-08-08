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
//
// v1.3.2: il tick non è più un metronomo fisso — usa un intervallo con jitter
// e una probabilità di "non far nulla" diversa per ogni intent, così la stessa
// combinazione di eventi non si ripete mai in modo identico. Aggiunto anche
// l'intent "drowsy" (assopita, non ancora addormentata) e piccola variabilità
// sulle durate degli eventi.
//
// v2.0: nuovo parametro opzionale `vitality` (0-1, da foxState — vedi
// Fox.jsx/useNutriFox.js) modula nothingProb e i cooldown di ±10% al
// massimo. La personalità di base (INTENT_WEIGHTS, i pesi relativi tra i
// vari eventi) resta invariata — nessuna riscrittura dello scheduler, solo
// un piccolo fattore moltiplicativo applicato ai due punti che già esistevano.
//
// v2.1: lo stesso vitalityFactor (ora informato anche da behaviorState —
// vedi Fox.jsx) modula anche la DURATA delle micro-animazioni (DURATIONS),
// non solo probabilità e cooldown — sempre lo stesso fattore unico, mai una
// seconda formula separata per lo stesso concetto di "vivacità".
//
// v2.2.2 — restyling grafico: NESSUNA modifica di logica in questo file,
// per scelta deliberata. "Aggiungi inerzia, piccoli ritardi nei movimenti"
// per orecchie/coda è stato ottenuto con CSS transition/animation a
// "overshoot" (cubic-bezier con valore >1) in FoxSVG.jsx/Fox.jsx — lo
// stesso booleano earTwitch/tailFlick calcolato qui arriva a destinazione
// con un piccolo rimbalzo fisico invece di scattare, senza aggiungere un
// secondo stato o un secondo timer. Scheduler invariato, come richiesto.
// ─────────────────────────────────────────────────────────────────────────────
 
const TICK_MIN = 550, TICK_MAX = 950; // risoluzione dello scheduler, con jitter
 
// Intent → pesi relativi degli eventi disponibili. Più alto = più probabile.
// "idle": comportamento di base, sveglia ma tranquilla
// "playful": eccitata, eventi più frequenti e vivaci
// "drowsy": assopita (pose "lying"), movimenti radi e morbidi
// "sleepy": addormentata, nessun evento corpo
// "alert": triste/in difficoltà, movimenti minimi e lenti
//
// v1.4: due nuove micro-azioni autonome — "yawn" (sbadiglio, tipico di drowsy)
// e "stretch" (si stiracchia, tipico di idle/playful dopo un po' di quiete).
const INTENT_WEIGHTS = {
  idle:    { look:3, tilt:2, tailFlick:2, earTwitch:2, hop:1, yawn:0, stretch:1 },
  playful: { look:3, tilt:2, tailFlick:4, earTwitch:3, hop:3, yawn:0, stretch:1 },
  drowsy:  { look:1, tilt:1, tailFlick:0, earTwitch:1, hop:0, yawn:3, stretch:0 },
  sleepy:  { look:0, tilt:0, tailFlick:0, earTwitch:0, hop:0, yawn:0, stretch:0 },
  alert:   { look:1, tilt:1, tailFlick:0, earTwitch:1, hop:0, yawn:0, stretch:0 },
};
 
// Probabilità di "non far nulla" anche quando un evento sarebbe disponibile.
// Più alta per gli stati calmi, più bassa per playful così si sente più viva.
const NOTHING_PROB = { idle:0.5, playful:0.22, drowsy:0.78, alert:0.68, sleepy:1 };
 
// Cooldown minimo (ms) tra due eventi dello stesso tipo
const COOLDOWNS = { look:4000, tilt:5000, tailFlick:3000, earTwitch:3500, hop:9000, yawn:16000, stretch:22000 };
// Durata di ogni evento una volta attivato (poi variata con un po' di jitter)
const DURATIONS = { look:1200, tilt:1500, tailFlick:600, earTwitch:500, hop:500, yawn:1400, stretch:900 };
// Tra un evento "corpo" e l'altro lasciamo un minimo di respiro per non sovrapporli
const GLOBAL_EVENT_GAP = 1800;
 
// Varia un valore ms di ±pct in modo che nessun movimento duri sempre uguale
function jitter(ms, pct = 0.25) {
  const delta = ms * pct;
  return Math.round(ms - delta + Math.random() * delta * 2);
}
 
export function getAnimationIntent(mood) {
  if (mood === "sleeping") return "sleepy";
  if (mood === "drowsy") return "drowsy";
  if (mood === "sad") return "alert";
  if (mood === "excited" || mood === "proud") return "playful";
  return "idle"; // include "curious": tranquilla ma sveglia, coerente con l'idea di notare qualcosa
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
 
// v2.0: nuovo parametro opzionale `vitality` (0-1, da foxState — media di
// relationship/trust in Fox.jsx). Modula molto leggermente (±10% al
// massimo, mai di più) la probabilità di "non fare nulla" e i cooldown tra
// un micro-evento e l'altro: una volpe con legame più forte è un po' più
// presente/vivace, senza alterare la personalità di base né riscrivere lo
// scheduler — stessi pesi (INTENT_WEIGHTS), stesso principio, solo un
// piccolo fattore moltiplicativo in più.
export function useFoxAnimations(intent, hoursSinceLastFed = null, vitality = 0.5) {
  const [blink,     setBlink]     = useState(false);
  const [lookOffset,setLookOffset]= useState({ x: 0, y: 0 });
  const [headTilt,  setHeadTilt]  = useState(0);
  const [tailFlick, setTailFlick] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [hop,       setHop]       = useState(false);
  const [yawn,      setYawn]      = useState(false);
  const [stretch,   setStretch]   = useState(false);
 
  const lastFired   = useRef({ look:0, tilt:0, tailFlick:0, earTwitch:0, hop:0, yawn:0, stretch:0 });
  const lastAnyBody = useRef(0); // ultimo evento "corpo" (esclude blink) per evitare stacking
  const eventTimers  = useRef([]);

  // Fattore di modulazione: vitality=0.5 (neutro) → 1 (nessun cambiamento);
  // vitality=1 → 0.9 (10% più vivace: meno "nulla", cooldown più corti);
  // vitality=0 → 1.1 (10% più quieta). Clampato per garantire il limite ±10%.
  const vitalityFactor = Math.max(0.9, Math.min(1.1, 1 - (vitality-0.5)*0.2));
 
  // ── Blink: indipendente dallo scheduler principale, leggero e non esclusivo ──
  // v1.4: durante "drowsy" il blink rallenta progressivamente in base a quante ore
  // sono passate dall'ultimo pasto — l'effetto "occhi sempre più pesanti" prima di
  // addormentarsi del tutto, invece di uno switch netto tra due velocità fisse.
  useEffect(() => {
    if (intent === "sleepy") { setBlink(false); return; }
    let active = true;
    const speed = intent === "playful" ? [1800,4000]
      : intent === "drowsy" ? (() => {
          const t = hoursSinceLastFed != null ? Math.min(1, Math.max(0, (hoursSinceLastFed-4)/2)) : 0.5;
          return [3200 + t*2200, 6000 + t*3500];
        })()
      : [2500,6000];
 
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
  }, [intent, hoursSinceLastFed]);
 
  // ── Scheduler unico per gli eventi "corpo" (look/tilt/tail/ear/hop) ──────────
  // v1.3.2: loop a setTimeout ricorsivo con intervallo variabile (jitter), invece
  // di un setInterval fisso — evita la cadenza "a metronomo" che rendeva la volpe
  // meccanica anche quando gli eventi stessi erano vari.
  useEffect(() => {
    const weights = INTENT_WEIGHTS[intent] || INTENT_WEIGHTS.idle;
    if (Object.values(weights).every(w => w === 0)) return; // sleepy: nessun evento
 
    const nothingProb = Math.max(0, Math.min(1, (NOTHING_PROB[intent] ?? 0.5) * vitalityFactor));
    let active = true;
    let tickTimer = null;
 
    function scheduleTick() {
      const delay = TICK_MIN + Math.random() * (TICK_MAX - TICK_MIN);
      tickTimer = setTimeout(runTick, delay);
      eventTimers.current.push(tickTimer);
    }
 
    function runTick() {
      if (!active) return;
      const now = Date.now();
 
      // mutua esclusione: non avviare un nuovo evento corpo se uno è appena partito
      if (now - lastAnyBody.current < GLOBAL_EVENT_GAP) { scheduleTick(); return; }
 
      // candidati disponibili = peso > 0 E cooldown rispettato (modulato ±10% da vitality)
      const available = {};
      for (const key of Object.keys(weights)) {
        if (weights[key] > 0 && now - lastFired.current[key] >= COOLDOWNS[key]*vitalityFactor) {
          available[key] = weights[key];
        }
      }
      const chosen = pickWeightedEvent(available);
 
      // probabilità di "non fare nulla" comunque, diversa per ogni stato d'animo
      if (!chosen || Math.random() < nothingProb) { scheduleTick(); return; }
 
      lastFired.current[chosen] = now;
      lastAnyBody.current = now;
 
      if (chosen === "look") {
        const x = (Math.random()*5-2.5), y = (Math.random()*2-1);
        setLookOffset({ x, y });
        const t = setTimeout(() => { if(active) setLookOffset({x:0,y:0}); }, jitter(DURATIONS.look*vitalityFactor));
        eventTimers.current.push(t);
      } else if (chosen === "tilt") {
        const tilt = Math.random()*6-3;
        setHeadTilt(tilt);
        const t = setTimeout(() => { if(active) setHeadTilt(0); }, jitter(DURATIONS.tilt*vitalityFactor));
        eventTimers.current.push(t);
      } else if (chosen === "tailFlick") {
        setTailFlick(true);
        const t = setTimeout(() => { if(active) setTailFlick(false); }, jitter(DURATIONS.tailFlick*vitalityFactor));
        eventTimers.current.push(t);
      } else if (chosen === "earTwitch") {
        setEarTwitch(true);
        const t = setTimeout(() => { if(active) setEarTwitch(false); }, jitter(DURATIONS.earTwitch*vitalityFactor));
        eventTimers.current.push(t);
      } else if (chosen === "hop") {
        setHop(true);
        const t = setTimeout(() => { if(active) setHop(false); }, jitter(DURATIONS.hop*vitalityFactor));
        eventTimers.current.push(t);
      } else if (chosen === "yawn") {
        setYawn(true);
        const t = setTimeout(() => { if(active) setYawn(false); }, jitter(DURATIONS.yawn*vitalityFactor, 0.15));
        eventTimers.current.push(t);
      } else if (chosen === "stretch") {
        setStretch(true);
        const t = setTimeout(() => { if(active) setStretch(false); }, jitter(DURATIONS.stretch*vitalityFactor, 0.15));
        eventTimers.current.push(t);
      }
 
      scheduleTick();
    }
 
    scheduleTick();
    return () => { active = false; if (tickTimer) clearTimeout(tickTimer); };
  }, [intent, vitalityFactor]);
 
  // Reset pose quando si entra in sleepy, e cleanup generale allo smontaggio
  useEffect(() => {
    if (intent === "sleepy") {
      setLookOffset({x:0,y:0}); setHeadTilt(0); setTailFlick(false); setEarTwitch(false); setHop(false); setYawn(false); setStretch(false);
    }
  }, [intent]);
 
  useEffect(() => () => { eventTimers.current.forEach(t => clearTimeout(t)); }, []);
 
  return { blink, lookOffset, headTilt, tailFlick, earTwitch, hop, yawn, stretch };
}
 
 


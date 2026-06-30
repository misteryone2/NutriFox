import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Hook che pilota tutte le micro-animazioni idle della volpe:
// blink, sguardo, inclinazione testa, colpo di coda.
// Ogni evento è randomico e indipendente, per dare un effetto "vivo".
// ─────────────────────────────────────────────────────────────────────────────

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function useFoxAnimations(mood) {
  const [blink,     setBlink]     = useState(false);
  const [lookOffset,setLookOffset]= useState({ x: 0, y: 0 });
  const [headTilt,  setHeadTilt]  = useState(0);
  const [tailFlick, setTailFlick] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);
  const [hop,       setHop]       = useState(false);

  const timers = useRef([]);

  function clearAllTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }

  // ── Blink loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mood === "sleeping") return; // occhi già chiusi, non serve blink
    let active = true;

    function scheduleBlink() {
      const delay = randBetween(2500, 6000);
      const t = setTimeout(() => {
        if (!active) return;
        setBlink(true);
        const t2 = setTimeout(() => { if(active) setBlink(false); }, 140);
        timers.current.push(t2);
        scheduleBlink();
      }, delay);
      timers.current.push(t);
    }
    scheduleBlink();

    return () => { active = false; clearAllTimers(); };
  }, [mood]);

  // ── Sguardo / inclinazione testa loop (idle, ogni 8-15s) ────────────────────
  useEffect(() => {
    if (mood === "sleeping") {
      setLookOffset({ x:0, y:0 });
      setHeadTilt(0);
      return;
    }
    let active = true;

    function scheduleIdleEvent() {
      const delay = randBetween(8000, 15000);
      const t = setTimeout(() => {
        if (!active) return;
        const choice = Math.floor(randBetween(0, 5));
        if (choice === 0) {
          // sguardo laterale
          const x = randBetween(-2.5, 2.5);
          const y = randBetween(-1, 1);
          setLookOffset({ x, y });
          const t2 = setTimeout(() => { if(active) setLookOffset({x:0,y:0}); }, 1200);
          timers.current.push(t2);
        } else if (choice === 1) {
          // inclinazione testa
          const tilt = randBetween(-3, 3);
          setHeadTilt(tilt);
          const t2 = setTimeout(() => { if(active) setHeadTilt(0); }, 1500);
          timers.current.push(t2);
        } else if (choice === 2) {
          // colpo di coda extra
          setTailFlick(true);
          const t2 = setTimeout(() => { if(active) setTailFlick(false); }, 600);
          timers.current.push(t2);
        } else if (choice === 3) {
          // movimento orecchie
          setEarTwitch(true);
          const t2 = setTimeout(() => { if(active) setEarTwitch(false); }, 500);
          timers.current.push(t2);
        } else {
          // piccolo salto occasionale, solo se sveglia e non già impegnata
          if (mood !== "sad") {
            setHop(true);
            const t2 = setTimeout(() => { if(active) setHop(false); }, 500);
            timers.current.push(t2);
          }
        }
        scheduleIdleEvent();
      }, delay);
      timers.current.push(t);
    }
    scheduleIdleEvent();

    return () => { active = false; };
  }, [mood]);

  useEffect(() => () => clearAllTimers(), []);

  return { blink, lookOffset, headTilt, tailFlick, earTwitch, hop };
}

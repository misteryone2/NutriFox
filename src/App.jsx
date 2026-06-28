import { useState, useEffect } from "react";

const COLORS = {
  bg: "#1C1228", card: "#251A35", cardBorder: "#3A2850",
  accent: "#F4845F", accentSoft: "#F4845F22",
  gold: "#F9C74F", goldSoft: "#F9C74F22",
  green: "#6FCF97", greenSoft: "#6FCF9722",
  text: "#F5EFE6", textMuted: "#9E8FB0", purple: "#A78BFA",
};

const GOALS = {
  perdere_peso:    { label: "Perdere peso",   kcal: 1600, emoji: "📉" },
  mangiare_meglio: { label: "Mangiare meglio", kcal: 2000, emoji: "🥗" },
  tener_traccia:   { label: "Tener traccia",  kcal: 2200, emoji: "📋" },
};

const FOOD_DB = {
  "Carne e Pesce": [
    { name: "Petto di pollo", kcal: 165, p: 31, c: 0, f: 3.6 },
    { name: "Coscia di pollo", kcal: 215, p: 26, c: 0, f: 12 },
    { name: "Pollo arrosto", kcal: 239, p: 27, c: 0, f: 14 },
    { name: "Bistecca di manzo", kcal: 250, p: 26, c: 0, f: 16 },
    { name: "Macinato di manzo", kcal: 280, p: 25, c: 0, f: 20 },
    { name: "Cotoletta alla bolognese", kcal: 380, p: 28, c: 12, f: 24 },
    { name: "Salmone al forno", kcal: 208, p: 28, c: 0, f: 10 },
    { name: "Tonno in scatola", kcal: 130, p: 28, c: 0, f: 1.5 },
    { name: "Merluzzo", kcal: 82, p: 18, c: 0, f: 0.7 },
    { name: "Orata al forno", kcal: 120, p: 22, c: 0, f: 3.5 },
    { name: "Branzino al forno", kcal: 115, p: 21, c: 0, f: 3.2 },
    { name: "Calamari", kcal: 92, p: 15, c: 3, f: 1.4 },
    { name: "Gamberetti", kcal: 99, p: 20, c: 0.9, f: 1.7 },
    { name: "Vongole (100g)", kcal: 74, p: 13, c: 3, f: 1 },
    { name: "Prosciutto cotto", kcal: 130, p: 19, c: 1, f: 5.5 },
    { name: "Prosciutto di Parma (30g)", kcal: 90, p: 7, c: 0, f: 7 },
    { name: "Culatello (30g)", kcal: 95, p: 8, c: 0, f: 7 },
    { name: "Mortadella Bologna (50g)", kcal: 155, p: 7.5, c: 0.5, f: 14 },
    { name: "Salsiccia", kcal: 302, p: 13, c: 2, f: 27 },
    { name: "Pancetta (30g)", kcal: 140, p: 7, c: 0, f: 13 },
  ],
  "Uova e Latticini": [
    { name: "Uovo intero", kcal: 78, p: 6, c: 0.6, f: 5 },
    { name: "Uova strapazzate (2)", kcal: 180, p: 14, c: 1, f: 13 },
    { name: "Frittata (2 uova)", kcal: 210, p: 14, c: 2, f: 16 },
    { name: "Mozzarella (100g)", kcal: 280, p: 18, c: 2, f: 22 },
    { name: "Parmigiano Reggiano (30g)", kcal: 119, p: 10, c: 0, f: 8.5 },
    { name: "Grana Padano (30g)", kcal: 114, p: 10, c: 0, f: 8 },
    { name: "Ricotta (100g)", kcal: 174, p: 11, c: 3, f: 13 },
    { name: "Squacquerone (50g)", kcal: 130, p: 6, c: 1, f: 11 },
    { name: "Yogurt greco", kcal: 100, p: 10, c: 6, f: 3 },
    { name: "Yogurt bianco", kcal: 61, p: 3.5, c: 7, f: 1.5 },
    { name: "Latte intero (200ml)", kcal: 130, p: 6.6, c: 9.6, f: 7.4 },
    { name: "Latte scremato (200ml)", kcal: 70, p: 6.8, c: 9.8, f: 0.2 },
    { name: "Burrata (100g)", kcal: 330, p: 15, c: 2, f: 30 },
  ],
  "Pasta e Cereali": [
    { name: "Pasta al pomodoro", kcal: 350, p: 12, c: 65, f: 5 },
    { name: "Pasta in bianco", kcal: 290, p: 10, c: 58, f: 3 },
    { name: "Pasta al ragù", kcal: 450, p: 20, c: 58, f: 15 },
    { name: "Tagliatelle al ragù bolognese", kcal: 480, p: 22, c: 52, f: 18 },
    { name: "Tortellini in brodo", kcal: 320, p: 14, c: 42, f: 10 },
    { name: "Tortellini panna e prosciutto", kcal: 520, p: 18, c: 48, f: 26 },
    { name: "Lasagne verdi alla bolognese", kcal: 420, p: 20, c: 38, f: 20 },
    { name: "Pasta e fagioli", kcal: 280, p: 14, c: 45, f: 5 },
    { name: "Pasta e ceci", kcal: 290, p: 13, c: 48, f: 4 },
    { name: "Riso bollito (100g cotto)", kcal: 130, p: 2.7, c: 28, f: 0.3 },
    { name: "Risotto ai funghi", kcal: 320, p: 8, c: 52, f: 9 },
    { name: "Risotto allo zafferano", kcal: 340, p: 8, c: 55, f: 10 },
    { name: "Gnocchi al pomodoro", kcal: 310, p: 8, c: 58, f: 5 },
    { name: "Pane bianco (50g)", kcal: 134, p: 4, c: 27, f: 0.9 },
    { name: "Pane integrale (50g)", kcal: 120, p: 5, c: 22, f: 1.5 },
    { name: "Piadina romagnola", kcal: 290, p: 7, c: 42, f: 10 },
    { name: "Gnocco fritto", kcal: 340, p: 6, c: 38, f: 18 },
    { name: "Crescentina (tigella)", kcal: 220, p: 6, c: 32, f: 8 },
    { name: "Crackers (5 pz)", kcal: 110, p: 2.5, c: 18, f: 3.5 },
    { name: "Grissini (4 pz)", kcal: 120, p: 3, c: 20, f: 3.5 },
    { name: "Farro (100g cotto)", kcal: 150, p: 6, c: 30, f: 1 },
    { name: "Orzo (100g cotto)", kcal: 123, p: 3, c: 25, f: 0.4 },
    { name: "Polenta (100g)", kcal: 83, p: 2, c: 18, f: 0.5 },
    { name: "Quinoa (100g cotta)", kcal: 120, p: 4.4, c: 22, f: 1.9 },
  ],
  "Verdure e Legumi": [
    { name: "Insalata mista", kcal: 15, p: 1, c: 2, f: 0.2 },
    { name: "Pomodori (100g)", kcal: 18, p: 0.9, c: 3.5, f: 0.2 },
    { name: "Zucchine (100g)", kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
    { name: "Carote (100g)", kcal: 41, p: 0.9, c: 10, f: 0.2 },
    { name: "Spinaci (100g)", kcal: 23, p: 2.9, c: 3.6, f: 0.4 },
    { name: "Broccoli (100g)", kcal: 34, p: 2.8, c: 7, f: 0.4 },
    { name: "Cavolfiore (100g)", kcal: 25, p: 1.9, c: 5, f: 0.3 },
    { name: "Peperoni (100g)", kcal: 31, p: 1, c: 6, f: 0.3 },
    { name: "Melanzane (100g)", kcal: 25, p: 1, c: 6, f: 0.2 },
    { name: "Funghi champignon", kcal: 22, p: 3, c: 4, f: 0.3 },
    { name: "Funghi porcini (100g)", kcal: 28, p: 3.7, c: 4.3, f: 0.5 },
    { name: "Minestra di verdure", kcal: 85, p: 4, c: 14, f: 1.5 },
    { name: "Piselli (100g)", kcal: 81, p: 5, c: 14, f: 0.4 },
    { name: "Patate (100g)", kcal: 77, p: 2, c: 17, f: 0.1 },
    { name: "Patate al forno", kcal: 150, p: 3, c: 30, f: 3 },
    { name: "Ceci cotti (100g)", kcal: 164, p: 8.9, c: 27, f: 2.6 },
    { name: "Lenticchie cotte (100g)", kcal: 116, p: 9, c: 20, f: 0.4 },
    { name: "Fagioli borlotti (100g)", kcal: 128, p: 8.7, c: 21, f: 0.5 },
    { name: "Erbazzone (1 fetta)", kcal: 220, p: 8, c: 22, f: 11 },
    { name: "Cipolla (100g)", kcal: 40, p: 1.1, c: 9, f: 0.1 },
    { name: "Aglio (10g)", kcal: 15, p: 0.6, c: 3, f: 0.1 },
    { name: "Asparagi (100g)", kcal: 20, p: 2.2, c: 3.7, f: 0.2 },
    { name: "Carciofi (100g)", kcal: 47, p: 3.3, c: 10, f: 0.2 },
  ],
  "Frutta": [
    { name: "Mela (media)", kcal: 72, p: 0.4, c: 19, f: 0.2 },
    { name: "Banana (media)", kcal: 105, p: 1.3, c: 27, f: 0.4 },
    { name: "Arancia (media)", kcal: 62, p: 1.2, c: 15, f: 0.2 },
    { name: "Fragole (100g)", kcal: 32, p: 0.7, c: 8, f: 0.3 },
    { name: "Uva (100g)", kcal: 69, p: 0.7, c: 18, f: 0.2 },
    { name: "Kiwi", kcal: 61, p: 1.1, c: 15, f: 0.5 },
    { name: "Pera (media)", kcal: 57, p: 0.4, c: 15, f: 0.1 },
    { name: "Anguria (200g)", kcal: 60, p: 1.2, c: 15, f: 0.2 },
    { name: "Pesche (media)", kcal: 39, p: 0.9, c: 10, f: 0.3 },
    { name: "Mango (100g)", kcal: 60, p: 0.8, c: 15, f: 0.4 },
    { name: "Ananas (100g)", kcal: 50, p: 0.5, c: 13, f: 0.1 },
    { name: "Avocado (mezzo)", kcal: 160, p: 2, c: 9, f: 15 },
    { name: "Lamponi (100g)", kcal: 52, p: 1.2, c: 12, f: 0.7 },
    { name: "Mirtilli (100g)", kcal: 57, p: 0.7, c: 14, f: 0.3 },
    { name: "Albicocche (2 pz)", kcal: 48, p: 1.4, c: 11, f: 0.4 },
  ],
  "Sughi e Condimenti": [
    { name: "Sugo al pomodoro (100g)", kcal: 45, p: 1.5, c: 8, f: 1.2 },
    { name: "Sugo all'arrabbiata (100g)", kcal: 55, p: 1.5, c: 8, f: 2.5 },
    { name: "Ragu bolognese (100g)", kcal: 150, p: 10, c: 6, f: 10 },
    { name: "Pesto alla genovese (30g)", kcal: 130, p: 2.5, c: 1.5, f: 13 },
    { name: "Besciamella (50ml)", kcal: 72, p: 2, c: 5, f: 5 },
    { name: "Olio d'oliva (10ml)", kcal: 90, p: 0, c: 0, f: 10 },
    { name: "Burro (10g)", kcal: 74, p: 0.1, c: 0, f: 8.3 },
    { name: "Maionese (15g)", kcal: 104, p: 0.2, c: 0.3, f: 11 },
    { name: "Ketchup (20g)", kcal: 22, p: 0.3, c: 5, f: 0.1 },
    { name: "Salsa di soia (15ml)", kcal: 9, p: 1.3, c: 0.9, f: 0 },
    { name: "Aceto balsamico (15ml)", kcal: 21, p: 0.2, c: 5, f: 0 },
  ],
  "Surgelati": [
    { name: "Bastoncini di pesce (2 pz)", kcal: 160, p: 8, c: 16, f: 7 },
    { name: "Cotolette di pesce (1 pz)", kcal: 180, p: 10, c: 14, f: 9 },
    { name: "Sofficini (2 pz)", kcal: 280, p: 8, c: 30, f: 14 },
    { name: "Lasagne surgelate", kcal: 380, p: 18, c: 38, f: 16 },
    { name: "Pizza surgelata (meta)", kcal: 420, p: 14, c: 54, f: 16 },
    { name: "Patatine fritte surgelate", kcal: 270, p: 3.5, c: 36, f: 13 },
    { name: "Verdure miste surgelate", kcal: 45, p: 3, c: 8, f: 0.5 },
    { name: "Spinaci surgelati (100g)", kcal: 22, p: 2.8, c: 2, f: 0.4 },
    { name: "Crocchette di pollo (3 pz)", kcal: 220, p: 12, c: 18, f: 11 },
    { name: "Minestrone surgelato", kcal: 60, p: 3, c: 11, f: 0.5 },
    { name: "Cannelloni surgelati", kcal: 290, p: 14, c: 28, f: 13 },
    { name: "Wurstel (1 pz)", kcal: 120, p: 5, c: 1, f: 11 },
    { name: "Tortellini surgelati (porzione)", kcal: 340, p: 15, c: 44, f: 11 },
    { name: "Cordon bleu (1 pz)", kcal: 280, p: 16, c: 16, f: 16 },
  ],
  "Piatti pronti": [
    { name: "Pizza margherita (1 fetta)", kcal: 270, p: 11, c: 35, f: 9 },
    { name: "Pizza 4 stagioni (1 fetta)", kcal: 290, p: 13, c: 33, f: 11 },
    { name: "Trancio di pizza bianca", kcal: 310, p: 9, c: 48, f: 9 },
    { name: "Piadina con squacquerone", kcal: 480, p: 14, c: 52, f: 24 },
    { name: "Piadina con prosciutto e rucola", kcal: 440, p: 18, c: 46, f: 20 },
    { name: "Hamburger classico", kcal: 480, p: 26, c: 40, f: 24 },
    { name: "Panino al prosciutto", kcal: 320, p: 16, c: 38, f: 10 },
    { name: "Tramezzino tonno e mais", kcal: 350, p: 14, c: 42, f: 13 },
    { name: "Supplì (1 pz)", kcal: 180, p: 6, c: 22, f: 8 },
    { name: "Arancino (1 pz)", kcal: 280, p: 8, c: 38, f: 10 },
    { name: "Parmigiana di melanzane", kcal: 220, p: 9, c: 14, f: 14 },
  ],
  "Colazione e Snack": [
    { name: "Caffe espresso", kcal: 2, p: 0.1, c: 0.3, f: 0 },
    { name: "Caffe con zucchero", kcal: 30, p: 0.3, c: 7, f: 0 },
    { name: "Cappuccino", kcal: 80, p: 4, c: 8, f: 3 },
    { name: "Brioche vuota", kcal: 250, p: 5, c: 38, f: 9 },
    { name: "Brioche con marmellata", kcal: 310, p: 5, c: 52, f: 9 },
    { name: "Biscotti (3 pz)", kcal: 150, p: 2, c: 23, f: 6 },
    { name: "Fette biscottate (2 pz)", kcal: 140, p: 3, c: 28, f: 2 },
    { name: "Marmellata (20g)", kcal: 50, p: 0.2, c: 13, f: 0 },
    { name: "Nutella (20g)", kcal: 110, p: 1.4, c: 12, f: 6.5 },
    { name: "Gelato (1 pallina)", kcal: 130, p: 2, c: 18, f: 6 },
    { name: "Barretta cioccolato (30g)", kcal: 160, p: 2, c: 18, f: 9 },
    { name: "Cioccolato fondente (30g)", kcal: 170, p: 2.5, c: 18, f: 10 },
    { name: "Patatine (30g)", kcal: 163, p: 2, c: 15, f: 11 },
    { name: "Frutta secca mista (30g)", kcal: 180, p: 5, c: 6, f: 16 },
    { name: "Torta di mele (1 fetta)", kcal: 280, p: 4, c: 42, f: 11 },
    { name: "Crostata (1 fetta)", kcal: 320, p: 4, c: 46, f: 13 },
    { name: "Zuppa inglese (porzione)", kcal: 350, p: 6, c: 52, f: 13 },
  ],
  "Bevande": [
    { name: "Acqua", kcal: 0, p: 0, c: 0, f: 0 },
    { name: "Succo d'arancia (200ml)", kcal: 90, p: 1, c: 22, f: 0 },
    { name: "Coca Cola (330ml)", kcal: 139, p: 0, c: 35, f: 0 },
    { name: "Birra (330ml)", kcal: 143, p: 1, c: 13, f: 0 },
    { name: "Vino rosso (150ml)", kcal: 127, p: 0.1, c: 4, f: 0 },
    { name: "Vino bianco (150ml)", kcal: 121, p: 0.1, c: 3.5, f: 0 },
    { name: "Lambrusco (150ml)", kcal: 90, p: 0.1, c: 5, f: 0 },
    { name: "Smoothie frutta (200ml)", kcal: 120, p: 1, c: 28, f: 0.5 },
    { name: "Latte d'avena (200ml)", kcal: 90, p: 2, c: 16, f: 2 },
    { name: "Latte di soia (200ml)", kcal: 80, p: 6, c: 7, f: 3 },
  ],
};

const ALL_FOODS = Object.entries(FOOD_DB).flatMap(([cat, items]) =>
  items.map(f => ({ ...f, category: cat }))
);

function Fox({ mood, size = 120 }) {
  const moods = {
    happy:    { eyeY: 52, mouthD: "M 44 65 Q 50 72 56 65", tail: "#F4845F", blush: true },
    excited:  { eyeY: 50, mouthD: "M 42 63 Q 50 74 58 63", tail: "#F9C74F", blush: true },
    neutral:  { eyeY: 54, mouthD: "M 44 66 Q 50 68 56 66", tail: "#A78BFA", blush: false },
    sad:      { eyeY: 56, mouthD: "M 44 70 Q 50 64 56 70", tail: "#9E8FB0", blush: false },
    sleeping: { eyeY: 55, mouthD: "M 44 66 Q 50 69 56 66", tail: "#6FCF97", blush: false },
  };
  const m = moods[mood] || moods.neutral;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter:"drop-shadow(0 4px 12px rgba(244,132,95,0.3))" }}>
      <ellipse cx="50" cy="72" rx="22" ry="18" fill="#E8763A"/>
      <ellipse cx="50" cy="75" rx="13" ry="11" fill="#F5EFE6"/>
      <path d="M 68 72 Q 88 58 82 42 Q 76 30 68 38 Q 74 50 66 60 Z" fill={m.tail} opacity="0.9"/>
      <ellipse cx="75" cy="36" rx="6" ry="5" fill="#F5EFE6" transform="rotate(-20 75 36)"/>
      <ellipse cx="50" cy="46" rx="20" ry="19" fill="#E8763A"/>
      <polygon points="34,30 30,14 42,26" fill="#E8763A"/>
      <polygon points="36,29 33,17 41,26" fill="#C0392B" opacity="0.5"/>
      <polygon points="66,30 70,14 58,26" fill="#E8763A"/>
      <polygon points="64,29 67,17 59,26" fill="#C0392B" opacity="0.5"/>
      <ellipse cx="50" cy="52" rx="13" ry="11" fill="#F5EFE6"/>
      {mood === "sleeping" ? (
        <>
          <path d="M 43 54 Q 46 51 49 54" stroke="#1C1228" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M 51 54 Q 54 51 57 54" stroke="#1C1228" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <text x="62" y="38" fontSize="8" fill="#A78BFA" fontWeight="bold">z</text>
          <text x="67" y="32" fontSize="10" fill="#A78BFA" fontWeight="bold">z</text>
          <text x="73" y="25" fontSize="12" fill="#A78BFA" fontWeight="bold">z</text>
        </>
      ) : (
        <>
          <circle cx="45" cy={m.eyeY} r="4" fill="#1C1228"/>
          <circle cx="55" cy={m.eyeY} r="4" fill="#1C1228"/>
          <circle cx="46.5" cy={m.eyeY-1.5} r="1.2" fill="white"/>
          <circle cx="56.5" cy={m.eyeY-1.5} r="1.2" fill="white"/>
        </>
      )}
      <ellipse cx="50" cy="61" rx="2.5" ry="2" fill="#C0392B"/>
      <path d={m.mouthD} stroke="#1C1228" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {m.blush && (
        <>
          <ellipse cx="39" cy="58" rx="5" ry="3" fill="#F4845F" opacity="0.35"/>
          <ellipse cx="61" cy="58" rx="5" ry="3" fill="#F4845F" opacity="0.35"/>
        </>
      )}
      <ellipse cx="35" cy="84" rx="7" ry="5" fill="#E8763A"/>
      <ellipse cx="65" cy="84" rx="7" ry="5" fill="#E8763A"/>
    </svg>
  );
}

function todayKey() { return new Date().toISOString().split("T")[0]; }

function getStreak(log) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (log[key]?.meals?.length > 0) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getMood(ratio) {
  if (ratio === 0) return "sleeping";
  if (ratio < 0.5) return "sad";
  if (ratio < 0.85) return "neutral";
  if (ratio <= 1.1) return "happy";
  return "excited";
}

function getFoxMessage(mood, name) {
  const msgs = {
    sleeping: ["Ehi " + name + ", non ho ancora mangiato oggi!", "Inizia a loggare il primo pasto!"],
    sad:      [name + "... sei sicuro di aver mangiato abbastanza?", "Ricordati di mangiare bene oggi"],
    neutral:  ["Stiamo andando bene!", "Continua cosi, siamo a meta strada"],
    happy:    ["Ottima giornata! Sono soddisfatta", name + ", oggi stai andando alla grande!"],
    excited:  ["WOW! Obiettivo centrato!", "Perfetto! Hai trovato il tuo equilibrio"],
  };
  const arr = msgs[mood] || msgs.neutral;
  return arr[Math.floor(Math.random() * arr.length)];
}

const inputStyle = {
  width: "100%", background: "#1C1228", border: "1px solid #3A2850",
  borderRadius: 10, color: "#F5EFE6", padding: "10px 14px",
  fontSize: 15, boxSizing: "border-box", outline: "none",
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function NutriFox() {
  const [screen, setScreen] = useState("home");
  const [goalKey, setGoalKey] = useState(() => load("nf_goalKey", "mangiare_meglio"));
  const [foxName, setFoxName] = useState(() => load("nf_foxName", "Foxy"));
  const [dailyLog, setDailyLog] = useState(() => load("nf_dailyLog", {}));
  const [customRecipes, setCustomRecipes] = useState(() => load("nf_recipes", []));
  const [favorites, setFavorites] = useState(() => load("nf_favorites", []));
  const [recentFoods, setRecentFoods] = useState(() => load("nf_recent", []));
  const [setupDone, setSetupDone] = useState(() => load("nf_setupDone", false));
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Recenti");
  const [mealType, setMealType] = useState("Pranzo");
  const [logMode, setLogMode] = useState("db");
  const [customFood, setCustomFood] = useState({ name:"", kcal:"", p:"", c:"", f:"" });
  const [foxMsg, setFoxMsg] = useState("");
  const [tempName, setTempName] = useState("Foxy");
  const [tempGoal, setTempGoal] = useState("mangiare_meglio");
  const [builderName, setBuilderName] = useState("");
  const [builderIngredients, setBuilderIngredients] = useState([]);
  const [builderSearch, setBuilderSearch] = useState("");
  const [builderCategory, setBuilderCategory] = useState("Tutti");

  useEffect(() => { save("nf_goalKey", goalKey); }, [goalKey]);
  useEffect(() => { save("nf_foxName", foxName); }, [foxName]);
  useEffect(() => { save("nf_dailyLog", dailyLog); }, [dailyLog]);
  useEffect(() => { save("nf_recipes", customRecipes); }, [customRecipes]);
  useEffect(() => { save("nf_favorites", favorites); }, [favorites]);
  useEffect(() => { save("nf_recent", recentFoods); }, [recentFoods]);
  useEffect(() => { save("nf_setupDone", setupDone); }, [setupDone]);

  const today = todayKey();
  const todayData = dailyLog[today] || { meals: [] };
  const goal = GOALS[goalKey];
  const totalKcal = todayData.meals.reduce((s,m) => s+m.kcal, 0);
  const totalP = todayData.meals.reduce((s,m) => s+(m.p||0), 0);
  const totalC = todayData.meals.reduce((s,m) => s+(m.c||0), 0);
  const totalF = todayData.meals.reduce((s,m) => s+(m.f||0), 0);
  const ratio = totalKcal / goal.kcal;
  const mood = getMood(ratio);
  const streak = getStreak(dailyLog);
  const pct = Math.min(ratio*100, 100);

  // Weekly avg
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-i);
    return d.toISOString().split("T")[0];
  });
  const weekKcals = weekDays.map(d => (dailyLog[d]?.meals||[]).reduce((s,m)=>s+m.kcal,0));
  const weekAvg = Math.round(weekKcals.filter(k=>k>0).reduce((s,k)=>s+k,0) / (weekKcals.filter(k=>k>0).length||1));

  useEffect(() => { setFoxMsg(getFoxMessage(mood, foxName)); }, [mood, foxName]);

  const categories = ["Recenti", "Preferiti", "Tutti", ...Object.keys(FOOD_DB)];

  function getPoolForCategory(cat) {
    if (cat === "Recenti") return recentFoods.slice(0,10);
    if (cat === "Preferiti") return ALL_FOODS.filter(f => favorites.includes(f.name));
    if (cat === "Tutti") return ALL_FOODS;
    return FOOD_DB[cat] || [];
  }

  const pool = getPoolForCategory(activeCategory);
  const filteredFoods = search
    ? ALL_FOODS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : pool;

  const builderPool = builderCategory === "Tutti" ? ALL_FOODS : (FOOD_DB[builderCategory]||[]);
  const filteredBuilder = builderSearch
    ? ALL_FOODS.filter(f => f.name.toLowerCase().includes(builderSearch.toLowerCase()))
    : builderPool;

  const builderKcal = builderIngredients.reduce((s,i)=>s+i.kcal,0);
  const builderP = builderIngredients.reduce((s,i)=>s+(i.p||0),0);
  const builderC = builderIngredients.reduce((s,i)=>s+(i.c||0),0);
  const builderF = builderIngredients.reduce((s,i)=>s+(i.f||0),0);

  function toggleFavorite(name) {
    setFavorites(prev => prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name]);
  }

  function addFood(food) {
    const entry = { ...food, meal: mealType, time: new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}) };
    setDailyLog(prev => ({ ...prev, [today]: { meals:[...(prev[today]?.meals||[]), entry] } }));
    setRecentFoods(prev => {
      const filtered = prev.filter(f => f.name !== food.name);
      return [food, ...filtered].slice(0, 20);
    });
    setSearch(""); setScreen("home");
  }

  function addCustomFood() {
    if (!customFood.name || !customFood.kcal) return;
    addFood({ name:customFood.name, kcal:Number(customFood.kcal), p:Number(customFood.p)||0, c:Number(customFood.c)||0, f:Number(customFood.f)||0 });
    setCustomFood({ name:"", kcal:"", p:"", c:"", f:"" });
  }

  function removeFood(idx) {
    setDailyLog(prev => { const meals=[...(prev[today]?.meals||[])]; meals.splice(idx,1); return {...prev,[today]:{meals}}; });
  }

  function saveRecipe() {
    if (!builderName || builderIngredients.length === 0) return;
    const recipe = { name:builderName, kcal:Math.round(builderKcal), p:Math.round(builderP), c:Math.round(builderC), f:Math.round(builderF), ingredients:builderIngredients };
    setCustomRecipes(prev => [...prev, recipe]);
    setBuilderName(""); setBuilderIngredients([]); setBuilderSearch(""); setScreen("log");
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (!setupDone) return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:24, padding:36, maxWidth:380, width:"100%", textAlign:"center" }}>
        <Fox mood="excited" size={110}/>
        <h1 style={{ color:COLORS.text, fontSize:26, margin:"16px 0 6px", fontWeight:700 }}>Ciao! Sono la tua volpe</h1>
        <p style={{ color:COLORS.textMuted, fontSize:14, marginBottom:28 }}>Aiutami a conoscerti prima di iniziare</p>
        <label style={{ display:"block", textAlign:"left", color:COLORS.textMuted, fontSize:13, marginBottom:6 }}>Come mi chiamo?</label>
        <input value={tempName} onChange={e=>setTempName(e.target.value)} placeholder="Es. Foxy, Aurora..." style={{...inputStyle, marginBottom:20}}/>
        <label style={{ display:"block", textAlign:"left", color:COLORS.textMuted, fontSize:13, marginBottom:10 }}>Qual e il tuo obiettivo?</label>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
          {Object.entries(GOALS).map(([k,g]) => (
            <button key={k} onClick={()=>setTempGoal(k)} style={{ background:tempGoal===k?COLORS.accentSoft:COLORS.bg, border:`2px solid ${tempGoal===k?COLORS.accent:COLORS.cardBorder}`, borderRadius:12, color:COLORS.text, padding:"12px 16px", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{fontSize:20}}>{g.emoji}</span>
              <div style={{textAlign:"left"}}><div style={{fontWeight:600}}>{g.label}</div><div style={{color:COLORS.textMuted,fontSize:12}}>{g.kcal} kcal/giorno</div></div>
              {tempGoal===k && <span style={{marginLeft:"auto",color:COLORS.accent}}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={()=>{ setFoxName(tempName||"Foxy"); setGoalKey(tempGoal); setSetupDone(true); }} style={{ width:"100%", background:COLORS.accent, border:"none", borderRadius:14, color:"white", padding:14, fontSize:16, fontWeight:700, cursor:"pointer" }}>
          Inizia con {tempName||"Foxy"} →
        </button>
      </div>
    </div>
  );

  // ── Builder ────────────────────────────────────────────────────────────────
  if (screen === "builder") {
    const bCats = ["Tutti", ...Object.keys(FOOD_DB)];
    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px 40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={()=>setScreen("log")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"8px 14px", cursor:"pointer", fontSize:14 }}>← Indietro</button>
          <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>Crea piatto</h2>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <label style={{ color:COLORS.textMuted, fontSize:13, display:"block", marginBottom:6 }}>Nome del piatto</label>
          <input value={builderName} onChange={e=>setBuilderName(e.target.value)} placeholder="Es. Pasta con verdure e tonno..." style={inputStyle}/>
        </div>
        {builderIngredients.length > 0 && (
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ color:COLORS.text, fontWeight:700, fontSize:14 }}>Ingredienti</span>
              <span style={{ color:COLORS.accent, fontWeight:700, fontSize:14 }}>{Math.round(builderKcal)} kcal tot.</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:12 }}>
              {[["P",Math.round(builderP),COLORS.purple],["C",Math.round(builderC),COLORS.gold],["G",Math.round(builderF),COLORS.accent]].map(([l,v,c])=>(
                <div key={l} style={{ background:COLORS.bg, borderRadius:8, padding:"6px 10px", textAlign:"center" }}>
                  <div style={{color:c,fontWeight:700,fontSize:14}}>{v}g</div>
                  <div style={{color:COLORS.textMuted,fontSize:11}}>{l==="P"?"Prot.":l==="C"?"Carb.":"Grassi"}</div>
                </div>
              ))}
            </div>
            {builderIngredients.map((ing,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.bg, borderRadius:8, padding:"8px 12px", marginBottom:6 }}>
                <span style={{ color:COLORS.text, fontSize:13 }}>{ing.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:COLORS.accent, fontSize:13, fontWeight:600 }}>{ing.kcal} kcal</span>
                  <button onClick={()=>{ const a=[...builderIngredients]; a.splice(i,1); setBuilderIngredients(a); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:15 }}>✕</button>
                </div>
              </div>
            ))}
            <button onClick={saveRecipe} style={{ width:"100%", background:COLORS.green, border:"none", borderRadius:12, color:"#1C1228", padding:12, fontSize:15, fontWeight:700, cursor:"pointer", marginTop:8 }}>
              Salva piatto
            </button>
          </div>
        )}
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:16 }}>
          <p style={{ color:COLORS.textMuted, fontSize:13, margin:"0 0 10px" }}>Aggiungi ingredienti</p>
          <input value={builderSearch} onChange={e=>setBuilderSearch(e.target.value)} placeholder="Cerca ingrediente..." style={{...inputStyle, marginBottom:10}}/>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:10 }}>
            {bCats.map(cat => (
              <button key={cat} onClick={()=>setBuilderCategory(cat)} style={{ background:builderCategory===cat?COLORS.accent:COLORS.bg, border:`1px solid ${builderCategory===cat?COLORS.accent:COLORS.cardBorder}`, borderRadius:20, color:"white", padding:"5px 12px", fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontWeight:builderCategory===cat?700:400 }}>{cat}</button>
            ))}
          </div>
          <div style={{ maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {filteredBuilder.map((f,i) => (
              <button key={i} onClick={()=>setBuilderIngredients(prev=>[...prev,f])} style={{ background:COLORS.bg, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"10px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
                <div><div style={{fontSize:13,fontWeight:600}}>{f.name}</div><div style={{fontSize:11,color:COLORS.textMuted}}>P {f.p}g · C {f.c}g · G {f.f}g</div></div>
                <span style={{color:COLORS.accent,fontWeight:700,fontSize:13}}>+{f.kcal}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Log screen ─────────────────────────────────────────────────────────────
  if (screen === "log") {
    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px 40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={()=>setScreen("home")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"8px 14px", cursor:"pointer", fontSize:14 }}>← Indietro</button>
          <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>Aggiungi pasto</h2>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {["Colazione","Pranzo","Cena","Spuntino"].map(t => (
            <button key={t} onClick={()=>setMealType(t)} style={{ background:mealType===t?COLORS.accent:COLORS.card, border:`1px solid ${mealType===t?COLORS.accent:COLORS.cardBorder}`, borderRadius:20, color:"white", padding:"7px 14px", fontSize:13, cursor:"pointer", fontWeight:mealType===t?700:400 }}>{t}</button>
          ))}
        </div>
        <div style={{ display:"flex", background:COLORS.card, borderRadius:12, padding:4, marginBottom:16, border:`1px solid ${COLORS.cardBorder}`, gap:3 }}>
          {[["db","Database"],["recipes","Miei piatti"],["custom","Manuale"]].map(([k,l]) => (
            <button key={k} onClick={()=>setLogMode(k)} style={{ flex:1, background:logMode===k?COLORS.accent:"transparent", border:"none", borderRadius:9, color:"white", padding:"8px 4px", fontSize:12, cursor:"pointer", fontWeight:logMode===k?700:400 }}>{l}</button>
          ))}
        </div>

        {logMode === "db" && (
          <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca alimento..." style={{...inputStyle, marginBottom:10}}/>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:12 }}>
              {categories.map(cat => (
                <button key={cat} onClick={()=>{ setActiveCategory(cat); setSearch(""); }} style={{ background:activeCategory===cat&&!search?COLORS.accent:COLORS.card, border:`1px solid ${activeCategory===cat&&!search?COLORS.accent:COLORS.cardBorder}`, borderRadius:20, color:"white", padding:"5px 12px", fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontWeight:activeCategory===cat&&!search?700:400 }}>{cat}</button>
              ))}
            </div>
            {search && <div style={{color:COLORS.textMuted,fontSize:12,marginBottom:8}}>{filteredFoods.length} risultati per "{search}"</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:420, overflowY:"auto" }}>
              {filteredFoods.length === 0 ? (
                <p style={{color:COLORS.textMuted,fontSize:13,textAlign:"center",padding:20}}>Nessun alimento trovato</p>
              ) : filteredFoods.map((f,i) => (
                <div key={i} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:12, display:"flex", alignItems:"center", overflow:"hidden" }}>
                  <button onClick={()=>addFood(f)} style={{ flex:1, background:"none", border:"none", color:COLORS.text, padding:"12px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600}}>{f.name}</div>
                      <div style={{fontSize:11,color:COLORS.textMuted}}>P {f.p}g · C {f.c}g · G {f.f}g {f.category ? "· "+f.category : ""}</div>
                    </div>
                    <span style={{color:COLORS.accent,fontWeight:700,fontSize:15,marginLeft:8}}>{f.kcal}</span>
                  </button>
                  <button onClick={()=>toggleFavorite(f.name)} style={{ background:"none", border:"none", borderLeft:`1px solid ${COLORS.cardBorder}`, color:favorites.includes(f.name)?COLORS.gold:COLORS.textMuted, fontSize:18, padding:"0 14px", cursor:"pointer", alignSelf:"stretch", display:"flex", alignItems:"center" }}>
                    {favorites.includes(f.name) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {logMode === "recipes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={()=>setScreen("builder")} style={{ background:COLORS.accentSoft, border:`2px dashed ${COLORS.accent}`, borderRadius:14, color:COLORS.accent, padding:14, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              + Crea nuovo piatto
            </button>
            {customRecipes.length === 0 ? (
              <p style={{ color:COLORS.textMuted, textAlign:"center", fontSize:13, marginTop:20 }}>Nessun piatto salvato ancora.</p>
            ) : customRecipes.map((r,i) => (
              <button key={i} onClick={()=>addFood(r)} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:14, color:COLORS.text, padding:"14px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{r.name}</div>
                  <div style={{fontSize:12,color:COLORS.textMuted}}>P {r.p}g · C {r.c}g · G {r.f}g · {r.ingredients?.length||0} ingredienti</div>
                </div>
                <span style={{color:COLORS.accent,fontWeight:700,fontSize:15}}>{r.kcal} kcal</span>
              </button>
            ))}
          </div>
        )}

        {logMode === "custom" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[["name","Nome alimento","text"],["kcal","Calorie (kcal)","number"],["p","Proteine (g)","number"],["c","Carboidrati (g)","number"],["f","Grassi (g)","number"]].map(([k,label,type]) => (
              <div key={k}>
                <label style={{ color:COLORS.textMuted, fontSize:13, display:"block", marginBottom:4 }}>{label}</label>
                <input type={type} value={customFood[k]} onChange={e=>setCustomFood(p=>({...p,[k]:e.target.value}))} placeholder={label} style={inputStyle}/>
              </div>
            ))}
            <button onClick={addCustomFood} style={{ background:COLORS.accent, border:"none", borderRadius:12, color:"white", padding:13, fontSize:15, fontWeight:700, cursor:"pointer", marginTop:4 }}>Aggiungi pasto</button>
          </div>
        )}
      </div>
    );
  }

  // ── History ────────────────────────────────────────────────────────────────
  if (screen === "history") {
    const days = Object.entries(dailyLog).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={()=>setScreen("home")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"8px 14px", cursor:"pointer", fontSize:14 }}>← Indietro</button>
          <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>Storico</h2>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:16, marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
          <div>
            <div style={{color:COLORS.gold,fontSize:22,fontWeight:800}}>🔥 {streak}</div>
            <div style={{color:COLORS.textMuted,fontSize:11}}>streak giorni</div>
          </div>
          <div>
            <div style={{color:COLORS.accent,fontSize:22,fontWeight:800}}>{weekAvg}</div>
            <div style={{color:COLORS.textMuted,fontSize:11}}>media kcal/giorno</div>
          </div>
          <div>
            <div style={{color:COLORS.green,fontSize:22,fontWeight:800}}>{days.length}</div>
            <div style={{color:COLORS.textMuted,fontSize:11}}>giorni loggati</div>
          </div>
        </div>
        {days.length === 0 ? (
          <p style={{ color:COLORS.textMuted, textAlign:"center", marginTop:60 }}>Nessun dato ancora.</p>
        ) : days.map(([date,data]) => {
          const kcal = data.meals.reduce((s,m)=>s+m.kcal,0);
          const r = kcal/goal.kcal;
          const isToday = date===today;
          return (
            <div key={date} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:COLORS.text, fontWeight:600, fontSize:14 }}>{isToday ? "Oggi" : new Date(date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"})}</span>
                <span style={{ color:r>=0.85&&r<=1.1?COLORS.green:COLORS.accent, fontWeight:700, fontSize:14 }}>{kcal} / {goal.kcal} kcal</span>
              </div>
              <div style={{ height:6, background:COLORS.bg, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(r*100,100)}%`, background:r>=0.85&&r<=1.1?COLORS.green:COLORS.accent, borderRadius:3 }}/>
              </div>
              <div style={{ color:COLORS.textMuted, fontSize:12, marginTop:6 }}>{data.meals.length} pasti loggati</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  if (screen === "settings") return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={()=>setScreen("home")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.text, padding:"8px 14px", cursor:"pointer", fontSize:14 }}>← Indietro</button>
        <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>Impostazioni</h2>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:20, marginBottom:16 }}>
        <label style={{ color:COLORS.textMuted, fontSize:13, display:"block", marginBottom:6 }}>Nome della volpe</label>
        <input value={foxName} onChange={e=>setFoxName(e.target.value)} style={inputStyle}/>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:20, marginBottom:16 }}>
        <p style={{ color:COLORS.textMuted, fontSize:13, margin:"0 0 12px" }}>Obiettivo</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Object.entries(GOALS).map(([k,g]) => (
            <button key={k} onClick={()=>setGoalKey(k)} style={{ background:goalKey===k?COLORS.accentSoft:COLORS.bg, border:`2px solid ${goalKey===k?COLORS.accent:COLORS.cardBorder}`, borderRadius:12, color:COLORS.text, padding:"12px 16px", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{fontSize:20}}>{g.emoji}</span>
              <div style={{textAlign:"left"}}><div style={{fontWeight:600}}>{g.label}</div><div style={{color:COLORS.textMuted,fontSize:12}}>{g.kcal} kcal/giorno</div></div>
              {goalKey===k && <span style={{marginLeft:"auto",color:COLORS.accent}}>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:16, padding:20 }}>
        <p style={{ color:COLORS.textMuted, fontSize:13, margin:"0 0 12px" }}>Dati</p>
        <button onClick={()=>{ if(window.confirm("Vuoi davvero cancellare tutti i dati?")){ localStorage.clear(); window.location.reload(); }}} style={{ width:"100%", background:"#C0392B22", border:"1px solid #C0392B", borderRadius:12, color:"#C0392B", padding:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Cancella tutti i dati
        </button>
      </div>
    </div>
  );

  // ── Home ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:420, margin:"0 auto", padding:"24px 16px 100px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{color:COLORS.textMuted,fontSize:13}}>{new Date().toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{color:COLORS.text,fontSize:20,fontWeight:700}}>NutriFox</div>
        </div>
        <button onClick={()=>setScreen("settings")} style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, color:COLORS.textMuted, padding:"8px 12px", cursor:"pointer", fontSize:18 }}>⚙️</button>
      </div>

      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:24, padding:"24px 20px", marginBottom:16, textAlign:"center", position:"relative" }}>
        <div style={{ position:"absolute", top:14, left:16, background:COLORS.goldSoft, border:`1px solid ${COLORS.gold}`, borderRadius:20, padding:"4px 12px", fontSize:12, color:COLORS.gold, fontWeight:700 }}>
          🔥 {streak} {streak===1?"giorno":"giorni"}
        </div>
        <Fox mood={mood} size={110}/>
        <div style={{color:COLORS.text,fontWeight:600,fontSize:15,marginTop:8}}>{foxName}</div>
        <div style={{ background:COLORS.bg, borderRadius:12, padding:"10px 16px", marginTop:10, color:COLORS.textMuted, fontSize:13, fontStyle:"italic" }}>"{foxMsg}"</div>
      </div>

      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:"20px 20px 16px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{color:COLORS.textMuted,fontSize:12,marginBottom:2}}>Calorie oggi</div>
            <div style={{color:COLORS.text,fontSize:28,fontWeight:800}}>{totalKcal} <span style={{color:COLORS.textMuted,fontSize:14,fontWeight:400}}>/ {goal.kcal} kcal</span></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:COLORS.textMuted,fontSize:11}}>{goal.emoji} {goal.label}</div>
            <div style={{color:totalKcal>goal.kcal?COLORS.accent:COLORS.green,fontSize:14,fontWeight:700}}>
              {totalKcal>goal.kcal ? "+" + (totalKcal-goal.kcal) + " kcal" : (goal.kcal-totalKcal) + " rimaste"}
            </div>
          </div>
        </div>
        <div style={{ height:10, background:COLORS.bg, borderRadius:5, overflow:"hidden", marginBottom:14 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${COLORS.accent},${COLORS.gold})`, borderRadius:5, transition:"width 0.5s" }}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["Proteine",totalP,COLORS.purple],["Carboidrati",totalC,COLORS.gold],["Grassi",totalF,COLORS.accent]].map(([label,val,color]) => (
            <div key={label} style={{ background:COLORS.bg, borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
              <div style={{color,fontSize:16,fontWeight:700}}>{Math.round(val)}g</div>
              <div style={{color:COLORS.textMuted,fontSize:11}}>{label}</div>
            </div>
          ))}
        </div>
        {weekAvg > 0 && (
          <div style={{marginTop:12, borderTop:`1px solid ${COLORS.cardBorder}`, paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <span style={{color:COLORS.textMuted,fontSize:12}}>Media settimana</span>
            <span style={{color:COLORS.purple,fontSize:13,fontWeight:700}}>{weekAvg} kcal/giorno</span>
          </div>
        )}
      </div>

      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{color:COLORS.text,fontWeight:700,fontSize:15}}>Pasti di oggi</span>
          <span style={{color:COLORS.textMuted,fontSize:13}}>{todayData.meals.length} loggati</span>
        </div>
        {todayData.meals.length === 0 ? (
          <p style={{color:COLORS.textMuted,fontSize:13,textAlign:"center",padding:"12px 0",margin:0}}>Nessun pasto ancora. {foxName} aspetta!</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {todayData.meals.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.bg, borderRadius:10, padding:"10px 12px" }}>
                <div>
                  <div style={{color:COLORS.text,fontSize:14,fontWeight:500}}>{m.name}</div>
                  <div style={{color:COLORS.textMuted,fontSize:11}}>{m.meal} · {m.time}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{color:COLORS.accent,fontWeight:700,fontSize:14}}>{m.kcal} kcal</span>
                  <button onClick={()=>removeFood(i)} style={{background:"none",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:16,padding:"0 2px"}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:COLORS.card, borderTop:`1px solid ${COLORS.cardBorder}`, display:"flex", justifyContent:"space-around", alignItems:"center", padding:"12px 0 20px" }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", color:screen==="home"?COLORS.accent:COLORS.textMuted, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10 }}>
          <span style={{fontSize:20}}>🏠</span> Home
        </button>
        <button onClick={()=>setScreen("log")} style={{ background:COLORS.accent, border:"none", borderRadius:"50%", width:52, height:52, color:"white", fontSize:26, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${COLORS.accent}66` }}>+</button>
        <button onClick={()=>setScreen("history")} style={{ background:"none", border:"none", color:screen==="history"?COLORS.accent:COLORS.textMuted, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10 }}>
          <span style={{fontSize:20}}>📅</span> Storico
        </button>
      </div>
    </div>
  );
}

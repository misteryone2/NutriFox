import { useState, useEffect, useMemo, useRef } from "react";
import { getFoxStage } from "./Fox";

// ─────────────────────────────────────────────────────────────────────────────
// useNutriFox.js — v1.4.1
//
// Release di consolidamento tecnico: tutta la logica di business che prima
// viveva dentro App.jsx (gestione pasti, idratazione, statistiche, dialoghi,
// memoria della volpe, calcoli nutrizionali, mood, persistenza) è stata
// spostata qui in un unico hook. App.jsx resta responsabile solo di
// orchestrare la UI: navigazione tra schermate, stato dei form, rendering.
//
// Nessuna funzionalità nuova, nessun comportamento cambiato — solo
// riorganizzazione. Le funzioni pure (mood, dialoghi, memoria) restano
// pure e senza side-effect, così come nella v1.4.
// ─────────────────────────────────────────────────────────────────────────────

// ─── FOOD DATABASE (normalizzato per porzione standard) ───────────────────────
// v1.4.1: struttura invariata ma isolata in cima al modulo e già esportata —
// pronta per essere spostata in un file dedicato (es. FOOD_DB.js) in futuro
// con un semplice taglia-incolla, senza toccare il resto della logica.
export const FOOD_DB = {
  "Carne e Pesce": [
    { name:"Petto di pollo",            kcal:165, p:31, c:0,  f:3.6, type:"protein" },
    { name:"Coscia di pollo",           kcal:215, p:26, c:0,  f:12,  type:"protein" },
    { name:"Pollo arrosto",             kcal:239, p:27, c:0,  f:14,  type:"protein" },
    { name:"Bistecca di manzo",         kcal:250, p:26, c:0,  f:16,  type:"protein" },
    { name:"Macinato di manzo",         kcal:280, p:25, c:0,  f:20,  type:"protein" },
    { name:"Lonza di maiale",           kcal:185, p:29, c:0,  f:7,   type:"protein" },
    { name:"Fesa di tacchino",          kcal:135, p:29, c:0,  f:1.5, type:"protein" },
    { name:"Agnello (coscia)",          kcal:258, p:25, c:0,  f:17,  type:"protein" },
    { name:"Salmone al forno",          kcal:208, p:28, c:0,  f:10,  type:"protein" },
    { name:"Tonno in scatola",          kcal:130, p:28, c:0,  f:1.5, type:"protein" },
    { name:"Merluzzo",                  kcal:82,  p:18, c:0,  f:0.7, type:"protein" },
    { name:"Orata al forno",            kcal:120, p:22, c:0,  f:3.5, type:"protein" },
    { name:"Branzino al forno",         kcal:115, p:21, c:0,  f:3.2, type:"protein" },
    { name:"Sgombro in scatola",        kcal:200, p:19, c:0,  f:14,  type:"protein" },
    { name:"Alici sott'olio (50g)",     kcal:95,  p:13, c:0,  f:5,   type:"protein" },
    { name:"Polpo lessato",             kcal:82,  p:15, c:2,  f:1,   type:"protein" },
    { name:"Seppie",                    kcal:79,  p:16, c:0.8,f:1,   type:"protein" },
    { name:"Gamberetti",                kcal:99,  p:20, c:0.9,f:1.7, type:"protein" },
    { name:"Cozze (100g)",              kcal:86,  p:12, c:3.7,f:2.2, type:"protein" },
    { name:"Prosciutto cotto",          kcal:130, p:19, c:1,  f:5.5, type:"protein" },
    { name:"Prosciutto di Parma",       kcal:90,  p:7,  c:0,  f:7,   type:"protein" },
    { name:"Culatello",                 kcal:95,  p:8,  c:0,  f:7,   type:"protein" },
    { name:"Bresaola",                  kcal:98,  p:21, c:0,  f:1.5, type:"protein" },
    { name:"Mortadella Bologna",        kcal:155, p:7.5,c:0.5,f:14,  type:"fat"     },
    { name:"Salsiccia",                 kcal:302, p:13, c:2,  f:27,  type:"fat"     },
    { name:"Cotechino (porzione)",      kcal:320, p:14, c:1,  f:29,  type:"fat"     },
    { name:"Cotoletta alla bolognese",  kcal:380, p:28, c:12, f:24,  type:"protein" },
    { name:"Spezzatino di manzo",       kcal:210, p:24, c:4,  f:10,  type:"protein" },
    { name:"Polpette al sugo (3)",      kcal:280, p:18, c:12, f:17,  type:"protein" },
    { name:"Pollo alla cacciatora",     kcal:260, p:28, c:6,  f:14,  type:"protein" },
    { name:"Tonno alla griglia",        kcal:200, p:34, c:0,  f:7,   type:"protein" },
    { name:"Petto di tacchino grigliato", kcal:150, p:32, c:0, f:1.8, type:"protein" },
    { name:"Ceviche di pesce (100g)",   kcal:110, p:18, c:4,  f:2,   type:"protein" },
    { name:"Involtini di pollo (2 pz)", kcal:220, p:26, c:4,  f:11,  type:"protein" },
  ],
  "Uova e Latticini": [
    { name:"Uovo intero",               kcal:78,  p:6,  c:0.6,f:5,   type:"protein" },
    { name:"Uova strapazzate (2)",      kcal:180, p:14, c:1,  f:13,  type:"protein" },
    { name:"Frittata (2 uova)",         kcal:210, p:14, c:2,  f:16,  type:"protein" },
    { name:"Uova sode (2)",             kcal:156, p:12, c:1,  f:11,  type:"protein" },
    { name:"Mozzarella",                kcal:280, p:18, c:2,  f:22,  type:"fat"     },
    { name:"Parmigiano Reggiano",       kcal:119, p:10, c:0,  f:8.5, type:"protein" },
    { name:"Grana Padano",              kcal:114, p:10, c:0,  f:8,   type:"protein" },
    { name:"Pecorino (30g)",            kcal:120, p:8,  c:0.5,f:10,  type:"fat"     },
    { name:"Ricotta",                   kcal:174, p:11, c:3,  f:13,  type:"fat"     },
    { name:"Squacquerone (50g)",        kcal:130, p:6,  c:1,  f:11,  type:"fat"     },
    { name:"Stracchino (50g)",          kcal:120, p:7,  c:0.5,f:10,  type:"fat"     },
    { name:"Yogurt greco",              kcal:100, p:10, c:6,  f:3,   type:"protein" },
    { name:"Yogurt bianco",             kcal:61,  p:3.5,c:7,  f:1.5, type:"light"   },
    { name:"Kefir (200ml)",             kcal:90,  p:6,  c:9,  f:2.5, type:"protein" },
    { name:"Latte intero (200ml)",      kcal:130, p:6.6,c:9.6,f:7.4, type:"fat"     },
    { name:"Latte scremato (200ml)",    kcal:70,  p:6.8,c:9.8,f:0.2, type:"light"   },
    { name:"Burrata",                   kcal:330, p:15, c:2,  f:30,  type:"fat"     },
  ],
  "Pasta e Cereali": [
    { name:"Pasta al pomodoro",         kcal:350, p:12, c:65, f:5,   type:"carb"    },
    { name:"Pasta in bianco",           kcal:290, p:10, c:58, f:3,   type:"carb"    },
    { name:"Pasta al pesto",            kcal:420, p:12, c:60, f:16,  type:"carb"    },
    { name:"Pasta alla norma",          kcal:380, p:10, c:62, f:11,  type:"carb"    },
    { name:"Pasta al ragu",             kcal:450, p:20, c:58, f:15,  type:"carb"    },
    { name:"Pasta e fagioli",           kcal:280, p:14, c:45, f:5,   type:"carb"    },
    { name:"Pasta e ceci",              kcal:290, p:13, c:48, f:4,   type:"carb"    },
    { name:"Tagliatelle al ragu",       kcal:480, p:22, c:52, f:18,  type:"carb"    },
    { name:"Tortellini in brodo",       kcal:320, p:14, c:42, f:10,  type:"carb"    },
    { name:"Tortellini panna e prosciutto", kcal:520, p:18, c:48, f:26, type:"fat"  },
    { name:"Lasagne verdi bolognese",   kcal:420, p:20, c:38, f:20,  type:"carb"    },
    { name:"Spaghetti alle vongole",    kcal:380, p:18, c:58, f:9,   type:"carb"    },
    { name:"Riso bollito",              kcal:130, p:2.7,c:28, f:0.3, type:"carb"    },
    { name:"Riso integrale",            kcal:150, p:3.5,c:30, f:1.5, type:"carb"    },
    { name:"Risotto ai funghi",         kcal:320, p:8,  c:52, f:9,   type:"carb"    },
    { name:"Risotto allo zafferano",    kcal:340, p:8,  c:55, f:10,  type:"carb"    },
    { name:"Risotto ai gamberetti",     kcal:360, p:16, c:52, f:9,   type:"carb"    },
    { name:"Gnocchi al pomodoro",       kcal:310, p:8,  c:58, f:5,   type:"carb"    },
    { name:"Pane bianco",               kcal:134, p:4,  c:27, f:0.9, type:"carb"    },
    { name:"Pane integrale",            kcal:120, p:5,  c:22, f:1.5, type:"carb"    },
    { name:"Pane di segale",            kcal:110, p:4.5,c:20, f:1,   type:"carb"    },
    { name:"Focaccia (100g)",           kcal:280, p:7,  c:40, f:9,   type:"carb"    },
    { name:"Piadina romagnola",         kcal:290, p:7,  c:42, f:10,  type:"carb"    },
    { name:"Gnocco fritto",             kcal:340, p:6,  c:38, f:18,  type:"fat"     },
    { name:"Tigella",                   kcal:220, p:6,  c:32, f:8,   type:"carb"    },
    { name:"Polenta (100g)",            kcal:83,  p:2,  c:18, f:0.5, type:"carb"    },
    { name:"Farro (100g cotto)",        kcal:150, p:6,  c:30, f:1,   type:"carb"    },
    { name:"Orzo (100g cotto)",         kcal:123, p:3,  c:25, f:0.4, type:"carb"    },
    { name:"Quinoa (100g cotta)",       kcal:120, p:4.4,c:22, f:1.9, type:"carb"    },
    { name:"Avena (porridge 200ml)",    kcal:150, p:5,  c:27, f:3,   type:"carb"    },
    { name:"Crackers (5 pz)",           kcal:110, p:2.5,c:18, f:3.5, type:"carb"    },
    { name:"Pasta alla carbonara",      kcal:460, p:18, c:55, f:18,  type:"carb"    },
  ],
  "Verdure e Legumi": [
    { name:"Insalata mista",            kcal:15,  p:1,  c:2,  f:0.2, type:"light"   },
    { name:"Pomodori (100g)",           kcal:18,  p:0.9,c:3.5,f:0.2, type:"light"   },
    { name:"Zucchine",                  kcal:17,  p:1.2,c:3.1,f:0.3, type:"light"   },
    { name:"Melanzane",                 kcal:25,  p:1,  c:6,  f:0.2, type:"light"   },
    { name:"Peperoni",                  kcal:31,  p:1,  c:6,  f:0.3, type:"light"   },
    { name:"Spinaci",                   kcal:23,  p:2.9,c:3.6,f:0.4, type:"light"   },
    { name:"Broccoli",                  kcal:34,  p:2.8,c:7,  f:0.4, type:"light"   },
    { name:"Cavolfiore",                kcal:25,  p:1.9,c:5,  f:0.3, type:"light"   },
    { name:"Carote (100g)",             kcal:41,  p:0.9,c:10, f:0.2, type:"light"   },
    { name:"Asparagi (100g)",           kcal:20,  p:2.2,c:3.7,f:0.2, type:"light"   },
    { name:"Carciofi (100g)",           kcal:47,  p:3.3,c:10, f:0.2, type:"light"   },
    { name:"Fagiolini (100g)",          kcal:31,  p:1.8,c:7,  f:0.2, type:"light"   },
    { name:"Funghi champignon",         kcal:22,  p:3,  c:4,  f:0.3, type:"light"   },
    { name:"Funghi porcini",            kcal:28,  p:3.7,c:4.3,f:0.5, type:"light"   },
    { name:"Rucola (50g)",              kcal:20,  p:2.5,c:2,  f:0.7, type:"light"   },
    { name:"Rape rosse cotte",          kcal:43,  p:1.6,c:10, f:0.2, type:"light"   },
    { name:"Cavolo cappuccio (100g)",   kcal:25,  p:1.3,c:6,  f:0.1, type:"light"   },
    { name:"Ceci cotti",                kcal:164, p:8.9,c:27, f:2.6, type:"carb"    },
    { name:"Lenticchie cotte",          kcal:116, p:9,  c:20, f:0.4, type:"protein" },
    { name:"Fagioli borlotti (100g)",   kcal:128, p:8.7,c:21, f:0.5, type:"protein" },
    { name:"Fagioli cannellini (100g)", kcal:120, p:9,  c:20, f:0.5, type:"protein" },
    { name:"Piselli (100g)",            kcal:81,  p:5,  c:14, f:0.4, type:"carb"    },
    { name:"Edamame (100g)",            kcal:122, p:11, c:10, f:5,   type:"protein" },
    { name:"Patate lesse (100g)",       kcal:77,  p:2,  c:17, f:0.1, type:"carb"    },
    { name:"Patate al forno",           kcal:150, p:3,  c:30, f:3,   type:"carb"    },
    { name:"Minestrone",                kcal:85,  p:4,  c:14, f:1.5, type:"light"   },
    { name:"Passata di pomodoro (100g)",kcal:24,  p:1.1,c:5,  f:0.2, type:"light"   },
    { name:"Erbazzone",                 kcal:220, p:8,  c:22, f:11,  type:"fat"     },
    { name:"Zuppa di lenticchie",       kcal:140, p:9,  c:22, f:2,   type:"protein" },
    { name:"Caponata (100g)",           kcal:90,  p:1.5,c:9,  f:5,   type:"light"   },
    { name:"Melanzane a funghetto",     kcal:90,  p:2,  c:8,  f:6,   type:"light"   },
    { name:"Zucca al forno (150g)",     kcal:65,  p:1.5,c:14, f:0.3, type:"light"   },
    { name:"Hummus di ceci fatto in casa (50g)", kcal:120, p:4.5,c:9,  f:8,  type:"protein" },
  ],
  "Frutta": [
    { name:"Mela",                      kcal:72,  p:0.4,c:19, f:0.2, type:"light"   },
    { name:"Banana",                    kcal:105, p:1.3,c:27, f:0.4, type:"carb"    },
    { name:"Arancia",                   kcal:62,  p:1.2,c:15, f:0.2, type:"light"   },
    { name:"Mandarino (2 pz)",          kcal:70,  p:1,  c:17, f:0.3, type:"light"   },
    { name:"Pera",                      kcal:57,  p:0.4,c:15, f:0.1, type:"light"   },
    { name:"Pesca",                     kcal:39,  p:0.9,c:10, f:0.3, type:"light"   },
    { name:"Albicocche (2 pz)",         kcal:48,  p:1.4,c:11, f:0.4, type:"light"   },
    { name:"Fragole (100g)",            kcal:32,  p:0.7,c:8,  f:0.3, type:"light"   },
    { name:"Ciliegie (100g)",           kcal:63,  p:1,  c:16, f:0.2, type:"light"   },
    { name:"Uva (100g)",                kcal:69,  p:0.7,c:18, f:0.2, type:"light"   },
    { name:"Kiwi",                      kcal:61,  p:1.1,c:15, f:0.5, type:"light"   },
    { name:"Mango (100g)",              kcal:60,  p:0.8,c:15, f:0.4, type:"light"   },
    { name:"Ananas (100g)",             kcal:50,  p:0.5,c:13, f:0.1, type:"light"   },
    { name:"Anguria (200g)",            kcal:60,  p:1.2,c:15, f:0.2, type:"light"   },
    { name:"Melone (200g)",             kcal:68,  p:1.7,c:16, f:0.3, type:"light"   },
    { name:"Lamponi (100g)",            kcal:52,  p:1.2,c:12, f:0.7, type:"light"   },
    { name:"Mirtilli (100g)",           kcal:57,  p:0.7,c:14, f:0.3, type:"light"   },
    { name:"Avocado",                   kcal:160, p:2,  c:9,  f:15,  type:"fat"     },
    { name:"Frutto della passione (2)", kcal:48,  p:2,  c:11, f:0.4, type:"light"   },
    { name:"Fico (2 pz)",               kcal:74,  p:0.8,c:19, f:0.3, type:"light"   },
    { name:"Cocco (30g)",               kcal:106, p:1,  c:4,  f:10,  type:"fat"     },
  ],
  "Sughi e Condimenti": [
    { name:"Sugo al pomodoro (100g)",   kcal:45,  p:1.5,c:8,  f:1.2, type:"light"   },
    { name:"Sugo all'arrabbiata",       kcal:55,  p:1.5,c:8,  f:2.5, type:"light"   },
    { name:"Ragu bolognese (100g)",     kcal:150, p:10, c:6,  f:10,  type:"protein" },
    { name:"Pesto alla genovese (30g)", kcal:130, p:2.5,c:1.5,f:13,  type:"fat"     },
    { name:"Besciamella (50ml)",        kcal:72,  p:2,  c:5,  f:5,   type:"fat"     },
    { name:"Olio d'oliva (10ml)",       kcal:90,  p:0,  c:0,  f:10,  type:"fat"     },
    { name:"Burro (10g)",               kcal:74,  p:0.1,c:0,  f:8.3, type:"fat"     },
    { name:"Aceto balsamico (15ml)",    kcal:21,  p:0.2,c:5,  f:0,   type:"light"   },
    { name:"Maionese (15g)",            kcal:104, p:0.2,c:0.3,f:11,  type:"fat"     },
    { name:"Salsa di soia (15ml)",      kcal:9,   p:1.3,c:0.9,f:0,   type:"light"   },
    { name:"Hummus (50g)",              kcal:115, p:4,  c:9,  f:7,   type:"protein" },
    { name:"Guacamole (50g)",           kcal:80,  p:1,  c:4,  f:7,   type:"fat"     },
    { name:"Tzatziki (50g)",            kcal:55,  p:3,  c:3,  f:3,   type:"light"   },
    { name:"Salsa BBQ (30g)",           kcal:60,  p:0.3,c:14, f:0.2, type:"carb"    },
  ],
  "Surgelati": [
    { name:"Bastoncini di pesce (2)",   kcal:160, p:8,  c:16, f:7,   type:"carb"    },
    { name:"Sofficini (2)",             kcal:280, p:8,  c:30, f:14,  type:"carb"    },
    { name:"Lasagne surgelate",         kcal:380, p:18, c:38, f:16,  type:"carb"    },
    { name:"Cannelloni surgelati",      kcal:290, p:14, c:28, f:13,  type:"carb"    },
    { name:"Pizza surgelata (meta)",    kcal:420, p:14, c:54, f:16,  type:"carb"    },
    { name:"Crocchette pollo (3)",      kcal:220, p:12, c:18, f:11,  type:"protein" },
    { name:"Cotolette di pesce",        kcal:180, p:10, c:14, f:9,   type:"protein" },
    { name:"Cordon bleu (1 pz)",        kcal:280, p:16, c:16, f:16,  type:"protein" },
    { name:"Minestrone surgelato",      kcal:60,  p:3,  c:11, f:0.5, type:"light"   },
    { name:"Spinaci surgelati",         kcal:22,  p:2.8,c:2,  f:0.4, type:"light"   },
    { name:"Verdure miste surgelate",   kcal:45,  p:3,  c:8,  f:0.5, type:"light"   },
    { name:"Patatine fritte surgelate", kcal:270, p:3.5,c:36, f:13,  type:"carb"    },
    { name:"Wurstel",                   kcal:120, p:5,  c:1,  f:11,  type:"fat"     },
    { name:"Tortellini surgelati",      kcal:340, p:15, c:44, f:11,  type:"carb"    },
    { name:"Burger di soia surgelato",  kcal:180, p:16, c:14, f:6,   type:"protein" },
    { name:"Edamame surgelato (100g)",  kcal:122, p:11, c:10, f:5,   type:"protein" },
  ],
  "Piatti pronti": [
    { name:"Pizza margherita (fetta)",  kcal:270, p:11, c:35, f:9,   type:"carb"    },
    { name:"Pizza 4 stagioni (fetta)",  kcal:290, p:13, c:33, f:11,  type:"carb"    },
    { name:"Pizza bianca (100g)",       kcal:310, p:9,  c:48, f:9,   type:"carb"    },
    { name:"Hamburger classico",        kcal:480, p:26, c:40, f:24,  type:"fat"     },
    { name:"Piadina squacquerone",      kcal:480, p:14, c:52, f:24,  type:"fat"     },
    { name:"Piadina prosciutto rucola", kcal:440, p:18, c:46, f:20,  type:"carb"    },
    { name:"Tramezzino tonno",          kcal:350, p:14, c:42, f:13,  type:"carb"    },
    { name:"Panino al prosciutto",      kcal:320, p:16, c:38, f:10,  type:"carb"    },
    { name:"Supplì (1 pz)",             kcal:180, p:6,  c:22, f:8,   type:"carb"    },
    { name:"Arancino (1 pz)",           kcal:280, p:8,  c:38, f:10,  type:"carb"    },
    { name:"Parmigiana di melanzane",   kcal:220, p:9,  c:14, f:14,  type:"fat"     },
    { name:"Quiche lorraine (fetta)",   kcal:330, p:10, c:26, f:21,  type:"fat"     },
    { name:"Kebab in pita",             kcal:480, p:24, c:48, f:20,  type:"carb"    },
    { name:"Sushi misto (8 pz)",        kcal:320, p:14, c:52, f:6,   type:"carb"    },
    { name:"Bowl di riso con salmone",  kcal:420, p:28, c:45, f:12,  type:"protein" },
    { name:"Poke bowl salmone",         kcal:420, p:26, c:48, f:14,  type:"protein" },
  ],
  "Colazione e Snack": [
    { name:"Caffe espresso",            kcal:2,   p:0.1,c:0.3,f:0,   type:"light"   },
    { name:"Caffe macchiato",           kcal:20,  p:0.8,c:2,  f:0.7, type:"light"   },
    { name:"Cappuccino",                kcal:80,  p:4,  c:8,  f:3,   type:"light"   },
    { name:"Latte macchiato",           kcal:110, p:5,  c:12, f:4,   type:"light"   },
    { name:"Tè verde",                  kcal:2,   p:0,  c:0.5,f:0,   type:"light"   },
    { name:"Brioche",                   kcal:250, p:5,  c:38, f:9,   type:"carb"    },
    { name:"Brioche integrale",         kcal:210, p:6,  c:34, f:7,   type:"carb"    },
    { name:"Fette biscottate (2 pz)",   kcal:140, p:3,  c:28, f:2,   type:"carb"    },
    { name:"Yogurt bianco",             kcal:61,  p:3.5,c:7,  f:1.5, type:"light"   },
    { name:"Biscotti (3)",              kcal:150, p:2,  c:23, f:6,   type:"carb"    },
    { name:"Muesli (50g)",              kcal:190, p:5,  c:34, f:4,   type:"carb"    },
    { name:"Granola (50g)",             kcal:220, p:5,  c:35, f:7,   type:"carb"    },
    { name:"Nutella (20g)",             kcal:110, p:1.4,c:12, f:6.5, type:"fat"     },
    { name:"Marmellata (20g)",          kcal:50,  p:0.2,c:13, f:0,   type:"carb"    },
    { name:"Burro di arachidi (20g)",   kcal:120, p:5,  c:4,  f:10,  type:"fat"     },
    { name:"Barretta proteica",         kcal:200, p:20, c:20, f:5,   type:"protein" },
    { name:"Barretta cioccolato",       kcal:160, p:2,  c:18, f:9,   type:"fat"     },
    { name:"Cioccolato fondente (30g)", kcal:170, p:2.5,c:18, f:10,  type:"fat"     },
    { name:"Gelato (1 pallina)",        kcal:130, p:2,  c:18, f:6,   type:"fat"     },
    { name:"Patatine (30g)",            kcal:163, p:2,  c:15, f:11,  type:"fat"     },
    { name:"Frutta secca (30g)",        kcal:180, p:5,  c:6,  f:16,  type:"fat"     },
    { name:"Pistacchi (30g)",           kcal:175, p:6,  c:8,  f:14,  type:"fat"     },
    { name:"Mandorle (30g)",            kcal:175, p:6,  c:6,  f:15,  type:"fat"     },
    { name:"Rice cake (2 pz)",          kcal:70,  p:1.5,c:15, f:0.5, type:"carb"    },
    { name:"Torta di mele (fetta)",     kcal:280, p:4,  c:42, f:11,  type:"carb"    },
    { name:"Tiramisù (porzione)",       kcal:380, p:7,  c:38, f:22,  type:"fat"     },
    { name:"Panna cotta",               kcal:220, p:3,  c:25, f:12,  type:"fat"     },
    { name:"Pancake (2)",               kcal:220, p:6,  c:34, f:7,   type:"carb"    },
    { name:"Porridge alla frutta",      kcal:230, p:7,  c:38, f:5,   type:"carb"    },
    { name:"Skyr naturale (150g)",      kcal:95,  p:16, c:6,  f:0.3, type:"protein" },
  ],
  "Bevande": [
    { name:"Acqua",                     kcal:0,   p:0,  c:0,  f:0,   type:"light"   },
    { name:"Acqua frizzante",           kcal:0,   p:0,  c:0,  f:0,   type:"light"   },
    { name:"Succo arancia (200ml)",     kcal:90,  p:1,  c:22, f:0,   type:"carb"    },
    { name:"Succo mela (200ml)",        kcal:96,  p:0.3,c:24, f:0,   type:"carb"    },
    { name:"Smoothie frutta (200ml)",   kcal:120, p:1,  c:28, f:0.5, type:"carb"    },
    { name:"Coca Cola (330ml)",         kcal:139, p:0,  c:35, f:0,   type:"carb"    },
    { name:"Coca Cola Zero (330ml)",    kcal:1,   p:0,  c:0,  f:0,   type:"light"   },
    { name:"Aranciata (330ml)",         kcal:130, p:0,  c:33, f:0,   type:"carb"    },
    { name:"Birra (330ml)",             kcal:143, p:1,  c:13, f:0,   type:"carb"    },
    { name:"Birra artigianale (330ml)", kcal:180, p:2,  c:18, f:0,   type:"carb"    },
    { name:"Vino rosso (150ml)",        kcal:127, p:0.1,c:4,  f:0,   type:"light"   },
    { name:"Vino bianco (150ml)",       kcal:121, p:0.1,c:3.5,f:0,   type:"light"   },
    { name:"Prosecco (150ml)",          kcal:108, p:0.3,c:3,  f:0,   type:"light"   },
    { name:"Lambrusco (150ml)",         kcal:90,  p:0.1,c:5,  f:0,   type:"light"   },
    { name:"Spritz (200ml)",            kcal:120, p:0,  c:8,  f:0,   type:"light"   },
    { name:"Latte di avena (200ml)",    kcal:90,  p:2,  c:16, f:2,   type:"carb"    },
    { name:"Latte di soia (200ml)",     kcal:80,  p:6,  c:7,  f:3,   type:"protein" },
    { name:"Latte di mandorla (200ml)", kcal:50,  p:1,  c:7,  f:2,   type:"light"   },
    { name:"Protein shake (300ml)",     kcal:180, p:30, c:8,  f:3,   type:"protein" },
    { name:"Chinotto (330ml)",          kcal:120, p:0,  c:30, f:0,   type:"carb"    },
    { name:"Tè freddo limone (330ml)",  kcal:110, p:0,  c:27, f:0,   type:"carb"    },
    { name:"Kombucha (250ml)",          kcal:55,  p:0,  c:14, f:0,   type:"light"   },
  ],
};

export const ALL_FOODS = Object.entries(FOOD_DB).flatMap(([cat,items]) =>
  items.map(f => ({ ...f, _cat: cat }))
);

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function load(k,fb){ try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().split("T")[0]; }

// ─── MOOD SYSTEM (stati intermedi, v1.4) ──────────────────────────────────────
// Il mood non scatta da uno stato all'altro in un colpo solo. MOOD_ORDER
// definisce una scala continua; ad ogni aggiornamento dello stato (decay
// periodico o pasto) calcoliamo il mood "target" in base alle statistiche
// attuali, ma il mood effettivamente mostrato si sposta di un solo gradino
// per volta verso il target.
export const MOOD_ORDER = ["sad", "neutral", "content", "happy", "excited"];

function computeTargetMoodIndex(hunger, energy, happiness) {
  if (hunger > 75 || happiness < 25 || energy < 25) return 0; // sad
  if (hunger < 25 && energy > 60 && happiness > 70) return 4; // excited
  if (hunger < 40 && energy > 45 && happiness > 55) return 3; // happy
  if (hunger < 55 && energy > 35 && happiness > 40) return 2; // content
  return 1; // neutral
}

// Sposta l'indice corrente di un solo passo verso il target (mai di scatto)
function stepMoodIndex(currentIndex, targetIndex) {
  if (currentIndex == null) return targetIndex;
  if (currentIndex === targetIndex) return currentIndex;
  return currentIndex + Math.sign(targetIndex - currentIndex);
}

// ─── NUTRIZIONE ────────────────────────────────────────────────────────────────
// Stima qualità pasto 0-1 basata su bilanciamento macro (non solo calorie)
function mealQuality(food) {
  const p = food.p||0, c = food.c||0, f = food.f||0;
  const tot = p+c+f;
  if (tot === 0) return 0.5;
  const pRatio = p/tot;
  let q = 0.45 + pRatio*0.4;
  if (f/tot > 0.55) q -= 0.15;
  return Math.max(0.2, Math.min(1, q));
}

function getFoodEffect(food) {
  const quality = mealQuality(food);
  const happinessDelta = Math.round(8 + quality*12); // 8-20
  switch(food.type) {
    case "protein": return { hungerDelta:-35, energyDelta:+20, happinessDelta, label:"Energia stabile!"   , reaction:"energetic" };
    case "carb":    return { hungerDelta:-30, energyDelta:+30, happinessDelta, label:"Carica subito!"     , reaction:"energetic" };
    case "fat":     return { hungerDelta:-25, energyDelta:+10, happinessDelta, label:"Sazio e calmo!"     , reaction:"neutral"   };
    case "light":   return { hungerDelta:-15, energyDelta:+8,  happinessDelta, label:"Leggero e fresco!"  , reaction:"happy"     };
    default:        return { hungerDelta:-20, energyDelta:+15, happinessDelta, label:"Buono!"             , reaction:"happy"     };
  }
}

// Somma kcal/p/c/f di una lista di alimenti — usata sia per i totali
// giornalieri sia per i totali del builder di ricette (v1.4.1: prima erano
// due reduce duplicati, ora un'unica funzione condivisa).
export function sumMacros(items) {
  return {
    kcal: items.reduce((s,i)=>s+(i.kcal||0),0),
    p:    items.reduce((s,i)=>s+(i.p||0),0),
    c:    items.reduce((s,i)=>s+(i.c||0),0),
    f:    items.reduce((s,i)=>s+(i.f||0),0),
  };
}

// ─── MOTORE DECISIONALE UNIFICATO (v1.7) ───────────────────────────────────────
// Prima ogni superficie (didascalia in home, popup dopo il pasto, headline del
// coach) aveva la propria logica di scelta del messaggio: un if/else in
// ordine di priorità per la didascalia, un pescaggio pesato per il popup, un
// altro if/else per la headline. Le regole erano equivalenti nello spirito
// ("mostra prima ciò che conta di più") ma implementate tre volte in modo
// diverso. Ora un'unica coppia di funzioni primitive gestisce la selezione
// per tutte e tre le superfici:
//
//  - pickTopPriority(candidati): dato un elenco già filtrato per eleggibilità,
//    sceglie il candidato di priorità più alta (numero più basso = più
//    importante); a parità di priorità sceglie a caso pesato tra i pari.
//  - selectMessage(libreria, ctx, storico): valuta condition() e cooldown per
//    ogni voce della libreria, poi delega a pickTopPriority.
//
// Il cooldown (persistito in nf_msgHistory) evita che un "fatto" via via
// meno urgente di un avviso importante si ripeta troppo spesso — le regole
// generali sono le stesse per tutte le superfici, cambia solo la libreria di
// contenuti che ciascuna consulta.

function pickTopPriority(eligible) {
  if (eligible.length === 0) return null;
  const topPriority = Math.min(...eligible.map(c=>c.priority));
  const topTier = eligible.filter(c=>c.priority===topPriority);
  const totalWeight = topTier.reduce((s,c)=>s+(c.weight||1),0);
  let r = Math.random()*totalWeight;
  for (const c of topTier) {
    const w = c.weight||1;
    if (r < w) return c;
    r -= w;
  }
  return topTier[topTier.length-1];
}

function selectMessage(library, ctx, messageHistory, now=Date.now()) {
  const eligible = library
    .filter(c => {
      if (!c.condition(ctx)) return false;
      if (c.cooldownMin>0) {
        const last = messageHistory[c.id];
        if (last && now-last < c.cooldownMin*60000) return false;
      }
      return true;
    })
    .map(c => ({ id:c.id, priority:c.priority, weight:c.weight, text: typeof c.text==="function" ? c.text(ctx) : c.text }));
  return pickTopPriority(eligible);
}

// ─── LIBRERIE DI CONTENUTO ──────────────────────────────────────────────────────
// Ogni voce: { id, priority (1=più importante..5=presenza leggera), cooldownMin,
// condition(ctx), text(ctx) }. Aggiungere un nuovo messaggio significa
// aggiungere una voce qui, non toccare la logica di selezione.

// Superficie "reaction": popup che appare subito dopo aver registrato un pasto.
const REACTION_MESSAGES = {
  happy:     ["Che buono!", "Mi piace!", "Delizioso!", "{food}? Sì grazie!", "Che bontà questo {food}!", "Yum!", "Mi fa sempre piacere!"],
  energetic: ["Che carica!", "Sento l'energia!", "Forza pura!", "{food} è proprio quello che ci voleva!", "Ora sì che si corre!", "Che sprint!"],
  neutral:   ["Mmh, ok.", "Va bene così.", "Non male.", "Ci sta.", "Va giù bene."],
  sad:       ["Avrei voluto di meglio...", "Speravo in altro."],
  relieved:  ["Finalmente! Che sollievo 😌", "Aspettavo proprio questo momento!", "Ah, ora va molto meglio.", "Grazie, ne avevo davvero bisogno.", "{food}, giusto in tempo!"],
};
function pickReaction(type, foodName) {
  const arr = REACTION_MESSAGES[type] || REACTION_MESSAGES.neutral;
  const msg = arr[Math.floor(Math.random()*arr.length)];
  return foodName ? msg.replace("{food}", foodName) : msg.replace("{food} ","").replace("{food}","Buono");
}

// Genera le chiavi data (YYYY-MM-DD) degli ultimi n giorni. offset=0 include
// oggi, offset=1 parte da ieri.
function lastNDayKeys(n, offset=0) {
  const keys = [];
  for (let i = offset; i < offset+n; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    keys.push(d.toISOString().split("T")[0]);
  }
  return keys;
}

// Quante volte un dato alimento è stato mangiato negli ultimi 7 giorni
// (oggi incluso). Usata per frasi tipo "È il terzo yogurt questa settimana!".
function getFoodMemoryCount(dailyLog, foodName) {
  let count = 0;
  for (const key of lastNDayKeys(7)) {
    const meals = dailyLog[key]?.meals || [];
    count += meals.filter(m => m.name === foodName).length;
  }
  return count;
}

// Ordinale italiano semplice per i numeri più comuni in questo contesto
function ordinalIt(n) {
  const words = { 1:"il primo", 2:"il secondo", 3:"il terzo", 4:"il quarto", 5:"il quinto", 6:"il sesto", 7:"il settimo" };
  return words[n] || `il numero ${n}`;
}

// Routine di un tipo di pasto: media oraria negli ultimi 14 giorni (esclusi
// oggi), solo se ci sono abbastanza dati per parlare davvero di "abitudine".
function getMealRoutine(dailyLog, mealType) {
  const hours = [];
  for (const key of lastNDayKeys(14, 1)) {
    const meals = dailyLog[key]?.meals || [];
    meals.filter(m => m.meal === mealType).forEach(m => {
      const h = parseInt((m.time||"").split(":")[0], 10);
      if (!isNaN(h)) hours.push(h);
    });
  }
  if (hours.length < 3) return null;
  const avgHour = Math.round(hours.reduce((a,b)=>a+b,0)/hours.length);
  return { avgHour, samples: hours.length };
}

// Candidati per la reazione al pasto. A differenza delle altre due superfici
// non è una libreria statica valutata automaticamente: dipende dal singolo
// alimento appena registrato, quindi viene costruita al volo — ma la scelta
// finale passa dallo stesso pickTopPriority condiviso.
function buildReactionCandidates({ reactionType, foodName, dailyLog, mealType, waitedLong }) {
  const candidates = [
    { priority:5, text: pickReaction(reactionType, foodName) }, // presenza leggera, sempre disponibile
  ];
  if (waitedLong) {
    candidates.push({ priority:1, text: pickReaction("relieved", foodName) }); // avviso importante: aspettava da ore
  }
  const memoryCount = getFoodMemoryCount(dailyLog, foodName);
  if (memoryCount >= 3) {
    candidates.push({ priority:3, text: `È ${ordinalIt(memoryCount)} ${foodName} questa settimana!` }); // riconoscimento
  }
  const routine = getMealRoutine(dailyLog, mealType);
  if (routine) {
    const diff = Math.abs(new Date().getHours() - routine.avgHour);
    if (diff <= 1) candidates.push({ priority:3, text: `Puntuale come sempre, ${mealType.toLowerCase()} verso le ${routine.avgHour}!` });
    else if (diff >= 3) candidates.push({ priority:4, text: `Oggi ${mealType.toLowerCase()} un po' fuori dai tuoi orari soliti, va benissimo comunque!` });
  }
  return pickTopPriority(candidates).text;
}

// Superficie "ambient": la didascalia sempre visibile sotto la volpe in home.
// Stessa gerarchia di prima (bisogni fisici > memoria > routine > umore) ma
// espressa come dati anziché come catena di if/else.
const AMBIENT_MESSAGES = [
  { id:"amb_long_wait",    priority:1, cooldownMin:0,
    condition: ctx => ctx.hoursSinceLastFed!=null && ctx.hoursSinceLastFed>=5,
    text: () => "È da tanto che non mangiamo... quando vuoi io ci sono!" },
  { id:"amb_thirsty",      priority:1, cooldownMin:0,
    condition: ctx => ctx.water < ctx.targetWater*0.4 && ctx.mealsCount>0,
    text: () => "Ho un po' sete... un bicchiere d'acqua? 💧" },
  { id:"amb_low_protein",  priority:2, cooldownMin:0,
    condition: ctx => ctx.totalP<20 && ctx.mealsCount>=2,
    text: () => "Oggi ci servirebbe un po' più di forza, che ne dici di qualcosa di proteico?" },
  { id:"amb_three_meals",  priority:3, cooldownMin:0,
    condition: ctx => ctx.mealsCount===3,
    text: () => "Questo è il terzo pasto di oggi, stiamo andando alla grande!" },
  { id:"amb_weekly_memory",priority:3, cooldownMin:180,
    condition: ctx => !!ctx.frequentFood,
    text: ctx => `È ${ordinalIt(ctx.frequentFood.count)} ${ctx.frequentFood.name} questa settimana — ti piace davvero! 🦊` },
  { id:"amb_water_done",   priority:3, cooldownMin:0,
    condition: ctx => ctx.water>=ctx.targetWater && ctx.mealsCount>0,
    text: () => "Hai già bevuto abbastanza, bravissimo!" },
  { id:"amb_on_track",     priority:3, cooldownMin:0,
    condition: ctx => ctx.totalKcal>0 && ctx.totalKcal<=ctx.gKcal && ctx.mealsCount>=2,
    text: () => "Stai rispettando il tuo obiettivo, sono fiera di te!" },
  { id:"amb_routine_greeting", priority:4, cooldownMin:0,
    condition: ctx => ctx.mealsCount===0 && !!ctx.breakfastRoutine && new Date().getHours()<11,
    text: ctx => `Di solito fai colazione verso le ${ctx.breakfastRoutine.avgHour}, ti aspetto! 🦊` },
  { id:"amb_mood_excited", priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="excited", text: () => "Mi sento davvero bene oggi! ✨" },
  { id:"amb_mood_happy",   priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="happy",   text: () => "Che bella giornata insieme!" },
  { id:"amb_mood_content", priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="content", text: () => "Tutto tranquillo, mi sento serena." },
  { id:"amb_mood_sad",     priority:5, cooldownMin:0, condition: ctx=>ctx.mood==="sad",     text: () => "Un po' giù di energie... ma so che ci riprendiamo!" },
  { id:"amb_greeting",     priority:5, cooldownMin:0, condition: ctx=>ctx.mealsCount===0,   text: ctx => `Ehi, sono ${ctx.foxName}! Pronta quando vuoi iniziare la giornata 🦊` },
  { id:"amb_default",      priority:5, cooldownMin:0, condition: () => true,                text: () => "Sono curiosa di scoprire cosa mangiamo oggi!" },
];

// Costruisce il contesto per la superficie ambient, pre-calcolando i due fatti
// che richiedono una scansione del diario (una sola volta, non per ogni voce
// della libreria).
function buildAmbientContext(base) {
  const { dailyLog, todayMeals } = base;
  const frequentFood = todayMeals?.length
    ? todayMeals.map(m => ({ name:m.name, count:getFoodMemoryCount(dailyLog, m.name) })).find(f => f.count>=3) || null
    : null;
  const breakfastRoutine = dailyLog ? getMealRoutine(dailyLog, "Colazione") : null;
  return { ...base, frequentFood, breakfastRoutine };
}

// ─── PROGRESSIONE & OBIETTIVI ──────────────────────────────────────────────────
function getStreak(log) {
  let s=0; const today=new Date();
  for(let i=0;i<60;i++){
    const d=new Date(today); d.setDate(today.getDate()-i);
    const k=d.toISOString().split("T")[0];
    if(log[k]?.meals?.length>0) s++;
    else if(i>0) break;
  }
  return s;
}

function calcBMR(w,h,a,sex){
  if(!w||!h||!a) return 2000;
  return sex==="M"?Math.round(10*w+6.25*h-5*a+5):Math.round(10*w+6.25*h-5*a-161);
}
function calcTDEE(bmr,act){
  const f={sedentario:1.2,leggero:1.375,moderato:1.55,attivo:1.725};
  return Math.round(bmr*(f[act]||1.375));
}
export const GOALS={
  perdere_peso:    {label:"Perdere peso",   emoji:"📉", mult:0.8},
  mangiare_meglio: {label:"Mangiare meglio",emoji:"🥗", mult:1.0},
  tener_traccia:   {label:"Tener traccia",  emoji:"📋", mult:1.1},
};

// ─── MOTORE DI ANALISI NUTRIZIONALE (v1.6) ─────────────────────────────────────
// Tutta questa sezione è deterministica e pura: nessuna chiamata esterna,
// nessuno stato React. Prende in input i dati già calcolati dall'hook (totali,
// obiettivi, storico) e restituisce fatti e suggerimenti concreti. È pensata
// per essere riutilizzabile così com'è anche da una futura AI: le stesse
// funzioni possono alimentare un prompt (i "fatti" restano identici), oppure
// generare direttamente il testo come fa oggi getNutritionInsights().

// Quota indicativa di calorie giornaliere per tipo di pasto — usata sia per i
// suggerimenti di porzione sia per l'analisi della distribuzione calorica.
const MEAL_SHARE = { Colazione:0.20, Pranzo:0.35, Cena:0.35, Spuntino:0.10 };

// Obiettivi di macronutrienti in grammi. Se il peso è noto usiamo una stima
// realistica (1.6g proteine/kg), altrimenti una ripartizione percentuale
// standard delle calorie totali. Sempre deterministico, mai casuale.
function getMacroTargets(gKcal, profile) {
  const proteinTargetG = profile.weight ? Math.round(Number(profile.weight)*1.6) : Math.round(gKcal*0.15/4);
  const fatTargetG = Math.round(gKcal*0.28/9);
  const carbTargetG = Math.max(0, Math.round((gKcal - proteinTargetG*4 - fatTargetG*9)/4));
  return { proteinTargetG, carbTargetG, fatTargetG };
}

// Estrae i grammi/ml già presenti nel nome di un alimento, es. "Cozze (100g)".
// Molte voci del database li hanno già; quando mancano si ragiona per porzioni.
function parsePortionGrams(food) {
  const m = food.name.match(/\((\d+)\s*(g|ml)\)/i);
  return m ? { amount:Number(m[1]), unit:m[2].toLowerCase() } : null;
}

const PORTION_LABELS = { 0.5:"metà porzione", 0.75:"¾ di porzione", 1:"porzione intera", 1.25:"1¼ porzioni", 1.5:"1½ porzioni", 1.75:"1¾ porzioni", 2:"porzione doppia" };
const PORTION_STEPS = [0.5,0.75,1,1.25,1.5,1.75,2];

// Quantità consigliata per un alimento, nel contesto del pasto e di quanto
// budget calorico resta in giornata. Non prescrive mai "zero": anche a
// obiettivo già superato suggerisce almeno metà porzione (mai giudicante).
function suggestPortion(food, mealType, { gKcal, totalKcal }) {
  if (!food.kcal || food.kcal<=0) return null; // es. acqua: nessun senso di suggerire quantità
  const share = MEAL_SHARE[mealType] ?? 0.25;
  const remainingKcal = Math.max(0, gKcal-totalKcal);
  const idealSlot = Math.min(remainingKcal>0?remainingKcal:gKcal*share, gKcal*share);
  let ratio = idealSlot/food.kcal;
  ratio = Math.max(0.5, Math.min(2, ratio));
  ratio = PORTION_STEPS.reduce((a,b)=>Math.abs(b-ratio)<Math.abs(a-ratio)?b:a);
  const parsed = parsePortionGrams(food);
  return {
    ratio,
    label: parsed ? `~${Math.round(parsed.amount*ratio)}${parsed.unit} consigliati` : PORTION_LABELS[ratio],
  };
}

// Quale macronutriente è più indietro rispetto al proprio obiettivo giornaliero.
function analyzeMissingNutrient({ totalP, totalC, totalF, targets }) {
  const gaps = [
    { nutrient:"proteine",    pct: targets.proteinTargetG ? totalP/targets.proteinTargetG : 1, missing: Math.max(0,targets.proteinTargetG-totalP) },
    { nutrient:"carboidrati", pct: targets.carbTargetG    ? totalC/targets.carbTargetG    : 1, missing: Math.max(0,targets.carbTargetG-totalC) },
    { nutrient:"grassi",      pct: targets.fatTargetG     ? totalF/targets.fatTargetG     : 1, missing: Math.max(0,targets.fatTargetG-totalF) },
  ];
  const worst = gaps.reduce((a,b)=>b.pct<a.pct?b:a);
  if (worst.pct >= 0.85) return null; // già in linea, nulla da segnalare
  return { nutrient: worst.nutrient, missingGrams: Math.round(worst.missing) };
}

// Equilibrio dei pasti già registrati oggi: troppo grassi o troppo poche proteine.
function analyzeMealBalance(meals) {
  if (!meals.length) return null;
  const t = sumMacros(meals);
  const cals = t.p*4 + t.c*4 + t.f*9;
  if (cals===0) return null;
  const fatPct = (t.f*9)/cals, proteinPct = (t.p*4)/cals;
  if (fatPct > 0.45) return { type:"fat_heavy", pct:Math.round(fatPct*100) };
  if (proteinPct < 0.12 && meals.length>=2) return { type:"low_protein", pct:Math.round(proteinPct*100) };
  return null;
}

// Distribuzione calorica tra i pasti di oggi: un singolo pasto troppo dominante.
function analyzeDistribution(todayMeals) {
  if (todayMeals.length<2) return null;
  const byMeal = {};
  todayMeals.forEach(m=>{ byMeal[m.meal]=(byMeal[m.meal]||0)+(m.kcal||0); });
  const total = Object.values(byMeal).reduce((a,b)=>a+b,0);
  if (total===0) return null;
  const top = Object.entries(byMeal).map(([meal,kcal])=>({meal,pct:Math.round((kcal/total)*100)})).reduce((a,b)=>b.pct>a.pct?b:a);
  return top.pct>=65 ? top : null;
}

// Trend delle calorie negli ultimi giorni (esclude oggi, che è ancora in corso).
// Riusa lastNDayKeys/sumMacros già usati per memoria pasti e media settimanale.
function analyzeTrend(dailyLog, days=7) {
  const kcals = lastNDayKeys(days,1).map(k=>sumMacros(dailyLog[k]?.meals||[]).kcal).reverse();
  const logged = kcals.filter(k=>k>0);
  if (logged.length < 3) return null;
  const half = Math.floor(logged.length/2);
  const firstAvg = logged.slice(0,half).reduce((a,b)=>a+b,0)/half;
  const secondAvg = logged.slice(-half).reduce((a,b)=>a+b,0)/half;
  const diff = secondAvg-firstAvg;
  const direction = Math.abs(diff) < firstAvg*0.08 ? "stable" : diff>0 ? "up" : "down";
  return { direction, daysLogged: logged.length, avg: Math.round(logged.reduce((a,b)=>a+b,0)/logged.length) };
}

// 2-3 piccoli obiettivi per la giornata, sempre calcolati dallo stato reale
// (mai statici): l'utente vede subito cosa è già raggiunto.
function getDailyGoals({ targetWater, water, missingNutrient, mealsCount }) {
  const goals = [{ id:"water", label:`Bevi ${targetWater} bicchieri d'acqua`, done: water>=targetWater }];
  if (missingNutrient) goals.push({ id:"nutrient", label:`Aggiungi una fonte di ${missingNutrient.nutrient}`, done:false });
  goals.push({ id:"meals", label:"Registra almeno 3 pasti oggi", done: mealsCount>=3 });
  return goals.slice(0,3);
}

// Punto di ingresso unico del motore: combina tutte le analisi e sceglie il
// messaggio più utile da mostrare come "headline" del coach. La priorità
// riflette cosa è più actionable adesso per l'utente.
// Superficie "insight": la headline della card Coach in home. Stessa priorità
// di prima (nutriente mancante > equilibrio pasti > distribuzione > trend >
// presenza leggera), ora espressa come libreria valutata da selectMessage.
const INSIGHT_MESSAGES = [
  { id:"ins_missing_nutrient", priority:2, cooldownMin:0,
    condition: ctx => !!ctx.missingNutrient,
    text: ctx => `Ti mancano circa ${ctx.missingNutrient.missingGrams}g di ${ctx.missingNutrient.nutrient} rispetto al tuo obiettivo di oggi.` },
  { id:"ins_fat_heavy", priority:2, cooldownMin:0,
    condition: ctx => ctx.mealBalance?.type==="fat_heavy",
    text: ctx => `Oggi i pasti sono piuttosto ricchi di grassi (${ctx.mealBalance.pct}% delle calorie).` },
  { id:"ins_low_protein_balance", priority:2, cooldownMin:0,
    condition: ctx => ctx.mealBalance?.type==="low_protein",
    text: ctx => `Potresti aggiungere più proteine ai prossimi pasti (solo ${ctx.mealBalance.pct}% delle calorie finora).` },
  { id:"ins_distribution", priority:2, cooldownMin:0,
    condition: ctx => !!ctx.distribution,
    text: ctx => `${ctx.distribution.meal} ha coperto il ${ctx.distribution.pct}% delle calorie di oggi: prova a distribuirle meglio nei prossimi giorni.` },
  { id:"ins_trend_up", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="up",
    text: ctx => `Le tue calorie medie sono in aumento negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_trend_down", priority:4, cooldownMin:0,
    condition: ctx => ctx.trend?.direction==="down",
    text: ctx => `Le tue calorie medie sono in calo negli ultimi giorni (~${ctx.trend.avg} kcal/giorno).` },
  { id:"ins_all_good", priority:5, cooldownMin:0,
    condition: () => true,
    text: () => "Stai mantenendo un buon equilibrio nutrizionale, continua così!" },
];

function getNutritionInsights({ dailyLog, todayMeals, totalP, totalC, totalF, gKcal, totalKcal, profile, water, targetWater }, messageHistory) {
  const targets = getMacroTargets(gKcal, profile);
  const missingNutrient = analyzeMissingNutrient({ totalP, totalC, totalF, targets });
  const mealBalance = analyzeMealBalance(todayMeals);
  const distribution = analyzeDistribution(todayMeals);
  const trend = analyzeTrend(dailyLog);
  const dailyGoals = getDailyGoals({ targetWater, water, missingNutrient, mealsCount: todayMeals.length });

  const picked = selectMessage(INSIGHT_MESSAGES, { missingNutrient, mealBalance, distribution, trend }, messageHistory);

  return { targets, missingNutrient, mealBalance, distribution, trend, dailyGoals, headline: picked.text, headlineId: picked.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPALE — tutto lo stato persistito, le derivazioni e le azioni.
// App.jsx chiama questo hook una volta e usa l'oggetto restituito per il
// rendering; non contiene più alcuna logica di business propria.
// ─────────────────────────────────────────────────────────────────────────────
export function useNutriFox() {
  const [setupDone, setSetupDone] = useState(()=>load("nf_setupDone",false));
  const [foxName,   setFoxName]   = useState(()=>load("nf_foxName","Foxy"));
  const [goalKey,   setGoalKey]   = useState(()=>load("nf_goalKey","mangiare_meglio"));
  const [profile,   setProfile]   = useState(()=>load("nf_profile",{weight:"",height:"",age:"",sex:"M",activity:"leggero"}));
  const [dailyLog,  setDailyLog]  = useState(()=>load("nf_dailyLog",{}));
  const [favorites, setFavorites] = useState(()=>load("nf_favorites",[]));
  const [recentFoods,setRecentFoods]=useState(()=>load("nf_recent",[]));
  const [customRecipes,setCustomRecipes]=useState(()=>load("nf_recipes",[]));
  const [water,     setWater]     = useState(()=>load("nf_water_"+todayKey(),0));
  const [aiMessages,setAiMessages]= useState(()=>load("nf_aimsg",[]));
  const [aiInput,   setAiInput]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Fox state — happiness, health, lastFedAt, moodIndex (stati intermedi v1.4)
  const [foxState,  setFoxState]  = useState(()=>load("nf_foxstate",{hunger:50,energy:50,happiness:70,health:90,lastFedAt:null,moodIndex:1}));
  const [bounce,    setBounce]    = useState(false);
  const [feedLabel, setFeedLabel] = useState("");
  const [reaction,  setReaction]  = useState(null); // {type, message} — popup temporaneo 2-3s
  const [reward,    setReward]    = useState(null); // {icon} — effetto ricompensa <2s (streak/acqua/obiettivo)
  const [licking,   setLicking]   = useState(false); // si lecca i baffi subito dopo il pasto
  const [celebratedToday, setCelebratedToday] = useState(()=>load("nf_celebrated_"+todayKey(),{}));
  // Cooldown del motore decisionale unificato (v1.7): quando è stato mostrato
  // per l'ultima volta ogni id di messaggio, condiviso tra le tre superfici.
  const [messageHistory, setMessageHistory] = useState(()=>load("nf_msgHistory",{}));
  function recordMessageShown(id){ if(!id) return; setMessageHistory(prev=>({...prev,[id]:Date.now()})); }

  // Persist
  useEffect(()=>save("nf_setupDone",setupDone),[setupDone]);
  useEffect(()=>save("nf_foxName",foxName),[foxName]);
  useEffect(()=>save("nf_goalKey",goalKey),[goalKey]);
  useEffect(()=>save("nf_profile",profile),[profile]);
  useEffect(()=>save("nf_dailyLog",dailyLog),[dailyLog]);
  useEffect(()=>save("nf_favorites",favorites),[favorites]);
  useEffect(()=>save("nf_recent",recentFoods),[recentFoods]);
  useEffect(()=>save("nf_recipes",customRecipes),[customRecipes]);
  useEffect(()=>save("nf_water_"+todayKey(),water),[water]);
  useEffect(()=>save("nf_foxstate",foxState),[foxState]);
  useEffect(()=>save("nf_aimsg",aiMessages.slice(-40)),[aiMessages]);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[aiMessages]);
  useEffect(()=>save("nf_celebrated_"+todayKey(),celebratedToday),[celebratedToday]);
  useEffect(()=>save("nf_msgHistory",messageHistory),[messageHistory]);

  // Decay system leggero: ogni minuto hunger sale, energy scende.
  // moodIndex avanza di un solo gradino per tick verso il mood "target".
  useEffect(()=>{
    const iv = setInterval(()=>{
      setFoxState(prev=>{
        const hunger    = Math.min(100, prev.hunger+2);
        const energy    = Math.max(0, prev.energy-1);
        const happiness = hunger > 70 ? Math.max(0, (prev.happiness??70)-2) : (prev.happiness??70);
        const health    = happiness < 30 ? Math.max(0, (prev.health??90)-1) : (prev.health??90);
        const target     = computeTargetMoodIndex(hunger, energy, happiness);
        const moodIndex  = stepMoodIndex(prev.moodIndex, target);
        return { ...prev, hunger, energy, happiness, health, moodIndex };
      });
    }, 60000); // ogni minuto
    return ()=>clearInterval(iv);
  },[]);

  const today    = todayKey();
  const todayData= dailyLog[today]||{meals:[]};
  // streak itera fino a 60 giorni di log: memoizzato, ricalcola solo se dailyLog cambia
  const streak   = useMemo(()=>getStreak(dailyLog),[dailyLog]);
  const stage    = useMemo(()=>getFoxStage(streak),[streak]);
  const mood     = MOOD_ORDER[foxState.moodIndex ?? computeTargetMoodIndex(foxState.hunger, foxState.energy, foxState.happiness??70)];

  function goalKcal(){
    const bmr=calcBMR(Number(profile.weight),Number(profile.height),Number(profile.age),profile.sex);
    const tdee=calcTDEE(bmr,profile.activity);
    const mult=GOALS[goalKey]?.mult||1;
    return profile.weight?Math.round(tdee*mult):(goalKey==="perdere_peso"?1600:goalKey==="tener_traccia"?2200:2000);
  }

  const todayTotals = sumMacros(todayData.meals);
  const totalKcal = todayTotals.kcal, totalP = todayTotals.p, totalC = todayTotals.c, totalF = todayTotals.f;
  const gKcal     = goalKcal();
  const targetWater = Math.round(((Number(profile.weight)||70)*35+(totalKcal/1000)*300)/250);

  // weekAvg itera 7 giorni e somma i pasti di ciascuno: memoizzato
  const weekAvg = useMemo(()=>{
    const weekKcals = lastNDayKeys(7).map(d=>sumMacros(dailyLog[d]?.meals||[]).kcal);
    const nonZero = weekKcals.filter(k=>k>0);
    return Math.round(nonZero.reduce((s,k)=>s+k,0)/(nonZero.length||1));
  },[dailyLog]);

  const hoursSinceLastFed = foxState.lastFedAt ? (Date.now()-foxState.lastFedAt)/3600000 : null;

  // Superficie "ambient" (didascalia in home): memoizzata sulle dipendenze
  // reali, non ricalcola ad ogni tick di decay se nulla di rilevante è
  // cambiato. Il cooldown viene registrato solo quando il messaggio
  // selezionato CAMBIA (transizione), non ad ogni render — altrimenti un
  // messaggio si auto-invaliderebbe l'istante dopo essere apparso.
  const ambientResult = useMemo(()=>selectMessage(AMBIENT_MESSAGES, buildAmbientContext({
    hoursSinceLastFed, water, targetWater, totalP, mealsCount:todayData.meals.length,
    totalKcal, gKcal, mood, foxName, dailyLog, todayMeals:todayData.meals,
  }), messageHistory),[hoursSinceLastFed, water, targetWater, totalP, todayData.meals, totalKcal, gKcal, mood, foxName, dailyLog, messageHistory]);
  const contextualMessage = ambientResult.text;
  const prevAmbientId = useRef(null);
  useEffect(()=>{
    if (ambientResult.id !== prevAmbientId.current) {
      if (prevAmbientId.current) recordMessageShown(prevAmbientId.current);
      prevAmbientId.current = ambientResult.id;
    }
  },[ambientResult.id]);

  // Motore di analisi nutrizionale (v1.6): combina target macro, equilibrio
  // pasti, distribuzione calorica e trend recente. Memoizzato perché include
  // un'analisi su 7 giorni di storico, non va ricalcolata ad ogni render.
  // La headline (v1.7) passa dallo stesso motore/cooldown condiviso.
  const insights = useMemo(()=>getNutritionInsights({
    dailyLog, todayMeals:todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, profile, water, targetWater,
  }, messageHistory),[dailyLog, todayData.meals, totalP, totalC, totalF, gKcal, totalKcal, profile, water, targetWater, messageHistory]);
  const prevInsightId = useRef(null);
  useEffect(()=>{
    if (insights.headlineId !== prevInsightId.current) {
      if (prevInsightId.current) recordMessageShown(prevInsightId.current);
      prevInsightId.current = insights.headlineId;
    }
  },[insights.headlineId]);

  // Quantità consigliata per un alimento specifico nel contesto del pasto che
  // si sta per registrare. Non memoizzata: è una funzione O(1) invocata per
  // ogni riga della lista alimenti, il costo è trascurabile.
  function suggestPortionFor(food, mealType) {
    return suggestPortion(food, mealType, { gKcal, totalKcal });
  }

  // Effetti di ricompensa: si attivano una sola volta per evento al giorno.
  useEffect(()=>{
    if (todayData.meals.length>0 && totalKcal<=gKcal && totalKcal>=gKcal*0.85 && !celebratedToday.goal) {
      setReward({icon:"🎯"});
      setCelebratedToday(p=>({...p,goal:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[totalKcal,gKcal]);

  useEffect(()=>{
    if (water>=targetWater && targetWater>0 && !celebratedToday.water) {
      setReward({icon:"💧"});
      setCelebratedToday(p=>({...p,water:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[water,targetWater]);

  useEffect(()=>{
    if (streak>0 && streak%7===0 && !celebratedToday["streak"+streak]) {
      setReward({icon:"🔥"});
      setCelebratedToday(p=>({...p,["streak"+streak]:true}));
      setTimeout(()=>setReward(null),1800);
    }
  },[streak]);

  // Food lists
  const categories=["Recenti","Preferiti","Tutti",...Object.keys(FOOD_DB)];
  function getPool(cat){
    if(cat==="Recenti") return recentFoods.slice(0,12);
    if(cat==="Preferiti") return ALL_FOODS.filter(f=>favorites.includes(f.name));
    if(cat==="Tutti") return ALL_FOODS;
    return FOOD_DB[cat]||[];
  }

  function toggleFavorite(name){
    setFavorites(prev => prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name]);
  }

  async function askFox(userMsg) {
    if(!userMsg.trim()||aiLoading) return;
    const userEntry = {role:"user", content:userMsg};
    setAiMessages(prev=>[...prev, userEntry]);
    setAiInput("");
    setAiLoading(true);

    const meals = todayData.meals.map(m=>`${m.name} (${m.kcal} kcal, P:${m.p}g C:${m.c}g G:${m.f}g)`).join(", ");
    const profile_str = profile.weight ? `Peso: ${profile.weight}kg, Altezza: ${profile.height}cm, Eta: ${profile.age}anni, Sesso: ${profile.sex}, Attivita: ${profile.activity}` : "Profilo non inserito";
    const systemPrompt = `Sei ${foxName}, una volpe simpatica e affettuosa che aiuta l'utente a mangiare meglio. Parli in italiano, in prima persona, con calore e un pizzico di umorismo da volpe. Sei concisa (max 3 frasi). Non sei un medico.

Dati oggi:
- Pasti: ${meals||"nessuno ancora"}
- Calorie: ${totalKcal}/${gKcal} kcal
- Proteine: ${Math.round(totalP)}g, Carboidrati: ${Math.round(totalC)}g, Grassi: ${Math.round(totalF)}g
- Acqua: ${water}/${targetWater} bicchieri
- Streak: ${streak} giorni
- Tuo stato: Fame ${Math.round(foxState.hunger)}%, Energia ${Math.round(foxState.energy)}%
- Profilo: ${profile_str}
- Obiettivo: ${GOALS[goalKey].label}

Rispondi alla domanda dell'utente tenendo conto di questi dati reali. Se non hai mangiato molto, incoraggialo. Se hai esagerato, dillo con gentilezza.`;

    try {
      const history = aiMessages.slice(-10).map(m=>({role:m.role,content:m.content}));
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:300,
          system:systemPrompt,
          messages:[...history,{role:"user",content:userMsg}]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Richiesta non riuscita");
      const reply = data.content?.[0]?.text || "Uhm... non riesco a rispondere ora!";
      setAiMessages(prev=>[...prev,{role:"assistant",content:reply}]);
      setBounce(true); setTimeout(()=>setBounce(false),600);
    } catch(err) {
      setAiMessages(prev=>[...prev,{role:"assistant",content:"Ops, ho avuto un problema! Riprova tra poco."}]);
    }
    setAiLoading(false);
  }

  function triggerBounce(label){
    setBounce(true); setFeedLabel(label);
    setTimeout(()=>setBounce(false),600);
    setTimeout(()=>setFeedLabel(""),2000);
  }

  function triggerReaction(type, message){
    setReaction({ type, message });
    setTimeout(()=>setReaction(null), 2500);
  }

  // Aggiunge un alimento al log di oggi e fa reagire la volpe. Non tocca
  // navigazione o stato dei form: quello resta responsabilità di App.jsx.
  function addFood(food, mealType){
    const effect=getFoodEffect(food);
    const waitedLong = hoursSinceLastFed != null && hoursSinceLastFed >= 5;
    const reactionType = waitedLong ? "relieved" : effect.reaction;
    const message = buildReactionCandidates({
      reactionType, foodName:food.name, dailyLog, mealType, waitedLong,
    });
    setFoxState(prev=>{
      const hunger    = Math.max(0,prev.hunger+effect.hungerDelta);
      const energy    = Math.min(100,prev.energy+effect.energyDelta);
      const happiness = Math.min(100,(prev.happiness??70)+effect.happinessDelta);
      const target    = computeTargetMoodIndex(hunger, energy, happiness);
      const moodIndex = stepMoodIndex(prev.moodIndex, target);
      return { ...prev, hunger, energy, happiness, lastFedAt:Date.now(), moodIndex };
    });
    triggerBounce(effect.label);
    triggerReaction(reactionType, message);
    setLicking(true);
    setTimeout(()=>setLicking(false), 900);
    const entry={...food,meal:mealType,time:new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})};
    setDailyLog(prev=>({...prev,[today]:{meals:[...(prev[today]?.meals||[]),entry]}}));
    setRecentFoods(prev=>[food,...prev.filter(f=>f.name!==food.name)].slice(0,20));
  }

  // Ritorna true/false in base al successo, così App.jsx sa se resettare il
  // form e navigare (stesso comportamento della v1.4, solo riorganizzato).
  function addCustomFood(fields, mealType){
    if(!fields.name||!fields.kcal) return false;
    addFood({name:fields.name,kcal:Number(fields.kcal),p:Number(fields.p)||0,c:Number(fields.c)||0,f:Number(fields.f)||0,type:"carb"}, mealType);
    return true;
  }

  function removeFood(idx){
    setDailyLog(prev=>{const meals=[...(prev[today]?.meals||[])];meals.splice(idx,1);return{...prev,[today]:{meals}};});
  }

  function saveRecipe(name, ingredients){
    if(!name||ingredients.length===0) return false;
    const totals = sumMacros(ingredients);
    setCustomRecipes(prev=>[...prev,{name,kcal:Math.round(totals.kcal),p:Math.round(totals.p),c:Math.round(totals.c),f:Math.round(totals.f),ingredients,type:"carb"}]);
    return true;
  }

  return {
    // profilo & setup
    setupDone, setSetupDone, foxName, setFoxName, goalKey, setGoalKey, profile, setProfile,
    // dati persistiti letti direttamente dalla UI
    dailyLog, favorites, customRecipes, water, setWater,
    // coach AI
    aiMessages, aiInput, setAiInput, aiLoading, askFox, chatEndRef,
    // stato volpe
    foxState, bounce, feedLabel, reaction, reward, licking,
    // derivazioni
    today, todayData, streak, stage, mood, contextualMessage,
    totalKcal, totalP, totalC, totalF, gKcal, targetWater, weekAvg,
    // motore di analisi nutrizionale (v1.6)
    insights, suggestPortion: suggestPortionFor,
    // alimenti
    categories, getPool, FOOD_DB, ALL_FOODS,
    // azioni
    addFood, addCustomFood, removeFood, saveRecipe, toggleFavorite,
  };
}

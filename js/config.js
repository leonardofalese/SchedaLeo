// ── SUPABASE ──────────────────────────────────────────────
const SUPABASE_URL = 'https://havaijnlwuejpcokwdxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdmFpam5sd3VlanBjb2t3ZHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTkxNTcsImV4cCI6MjA5MTczNTE1N30.n3xEILDp1s65WNIzYI9VAPVTXfz3nx0IOLS6JKZHlnA';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let syncTimeout = null;
let isRegistering = false; // flag per distinguere registrazione da login

// ── DATI DEFAULT ──────────────────────────────────────────
const GIORNI=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const GIORNI_SHORT=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const MEAL_KEYS=['colazione','pranzo','spuntini','cena'];
const MEAL_LABELS={colazione:'Colazione',pranzo:'Pranzo',spuntini:'Spuntini',cena:'Cena'};
const ICO={
  colazione:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
  pranzo:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  spuntini:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  cena:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
};
const DEFAULT_MEALS={
  times:{colazione:'07:30',pranzo:'13:00',spuntini:'16:30',cena:'20:00'},
  days:{
    0:{colazione:['150g latte intero','100g avena','15g cacao','1 frutto'],pranzo:['140g pasta con pomodoro','30g grana','2 scatolette tonno','200g zucchine'],cena:['180g salmone','100g pane','200g zucchine'],spuntini:['70g pane in cassetta','90g bresaola']},
    1:{colazione:['100g latte intero','90g avena','15g cacao','150g greco'],pranzo:['250g macinato manzo magro','120g riso basmati','250g zucchine','15g burro'],cena:['140g pasta integrale','250g petto di pollo','200g carote','20g grana','10g olio'],spuntini:['1 pacchetto Galbusera protein']},
    2:{colazione:['150g greco','70g biscotti secchi','1 frutto'],pranzo:['140g pasta integrale','1 busta salmone affumicato','200g zucchine','10g olio'],cena:['200g bistecca vitello','130g pane','200g verdure a scelta','10g olio'],spuntini:['3 fette pane in cassetta','40g miele','20g frutta secca']},
    3:{colazione:['150g latte intero','70g avena','150g greco','1 frutto'],pranzo:['200g petto di pollo','350g patate','15g olio'],cena:['140g pasta integrale al pomodoro','2 scatolette tonno no olio','200g zucchine','10g olio'],spuntini:['30g cioccolato fondente']},
    4:{colazione:['250g latte intero',"80g cereali Kellogg's fondente"],pranzo:['110g riso basmati','220g macinato magro','250g zucchine','10g olio'],cena:['3 uova','300g patate','150g carote'],spuntini:['150g banana','20g cioccolato']},
    5:{colazione:['150g latte intero','80g avena','20g cioccolato fondente'],pranzo:['140g pasta con pomodoro','20g grana','2 scatolette tonno','200g zucchine'],cena:['180g salmone','100g pane','200g zucchine'],spuntini:['70g pane in cassetta','90g bresaola']},
    6:{colazione:['Giorno libero'],pranzo:['Libero'],cena:['Libero'],spuntini:['Libero']}
  }
};
const DEFAULT_SHOP=[
  {cat:'Proteine',items:[{name:'Tonno in scatoletta',qty:'8 scatolette'},{name:'Salmone fresco',qty:'360g'},{name:'Salmone affumicato',qty:'1 busta'},{name:'Petto di pollo',qty:'450g'},{name:'Macinato manzo magro',qty:'470g'},{name:'Bistecca di vitello',qty:'200g'},{name:'Bresaola',qty:'180g'},{name:'Uova',qty:'3 pz'},{name:'Galbusera protein',qty:'1 pacco'}]},
  {cat:'Carboidrati & Cereali',items:[{name:'Pasta normale',qty:'280g'},{name:'Pasta integrale',qty:'420g'},{name:'Riso basmati',qty:'230g'},{name:'Avena',qty:'460g'},{name:'Pane',qty:'400g'},{name:'Pane in cassetta',qty:'210g'},{name:'Biscotti secchi',qty:'70g'},{name:'Patate',qty:'650g'},{name:"Cereali Kellogg's",qty:'80g'}]},
  {cat:'Latticini',items:[{name:'Latte intero',qty:'1,2 L'},{name:'Yogurt greco',qty:'450g'},{name:'Grana Padano',qty:'90g'},{name:'Burro',qty:'15g'}]},
  {cat:'Verdure & Frutta',items:[{name:'Zucchine',qty:'2 kg'},{name:'Carote',qty:'350g'},{name:'Verdure miste',qty:'200g'},{name:'Frutta fresca',qty:'4-5 pz'},{name:'Banana',qty:'1 pz'}]},
  {cat:'Condimenti',items:[{name:'Olio EVO',qty:'80g'},{name:'Passata di pomodoro',qty:'q.b.'},{name:'Miele',qty:'40g'},{name:'Frutta secca',qty:'20g'},{name:'Cacao amaro',qty:'30g'},{name:'Cioccolato fondente',qty:'70g'}]}
];
// ── DATABASE CALORICO (kcal per 100g, fonte USDA/INRAN) ───
// Ordinato dal più specifico al più generico (importante per il lookup)
const KCAL_DB = {
  // ── Latticini ──────────────────────────────────────────
  'latte intero': 61, 'latte scremato': 36, 'latte parzialmente scremato': 47, 'latte': 61,
  'yogurt greco 0%': 57, 'yogurt greco magro': 57, 'yogurt greco': 97, 'greco': 97,
  'yogurt bianco': 63, 'yogurt': 63,
  'ricotta': 174, 'ricotta di mucca': 174,
  'grana padano': 392, 'parmigiano reggiano': 392, 'parmigiano': 392, 'grana': 392,
  'mozzarella light': 165, 'mozzarella': 254,
  'fiocchi di latte': 105,
  'burro': 717,
  'panna': 337,
  // ── Proteine animali ───────────────────────────────────
  'uova intere': 155, 'uova': 155, 'uovo': 155, 'albume': 52, 'tuorlo': 322,
  'petto di pollo': 110, 'pollo arrosto': 165, 'pollo': 110,
  'tacchino': 107, 'petto di tacchino': 107,
  'macinato manzo magro': 178, 'macinato manzo': 248, 'macinato magro': 178, 'macinato': 248,
  'bistecca di manzo': 217, 'manzo': 217,
  'bistecca vitello': 108, 'vitello': 108,
  'lonza maiale': 143, 'maiale': 143,
  'salmone affumicato': 172, 'salmone fresco': 142, 'salmone': 142,
  'tonno sott\'olio': 198, 'tonno in scatoletta': 103, 'tonno': 103,
  'merluzzo': 82, 'branzino': 97, 'orata': 109, 'pesce spada': 121,
  'gamberetti': 99, 'gamberoni': 99,
  'bresaola': 151, 'bresaola della valtellina': 151,
  'prosciutto cotto': 136, 'prosciutto crudo': 269, 'prosciutto': 136,
  'speck': 219, 'pancetta': 337, 'mortadella': 311,
  'wurstel': 265,
  // ── Legumi ─────────────────────────────────────────────
  'ceci cotti': 164, 'ceci': 164,
  'lenticchie cotte': 116, 'lenticchie': 116,
  'fagioli cotti': 130, 'fagioli': 130,
  'edamame': 121,
  // ── Carboidrati ────────────────────────────────────────
  'pasta integrale cotta': 140, 'pasta integrale': 340,
  'pasta cotta': 131, 'pasta': 350,
  'riso basmati cotto': 130, 'riso basmati': 356,
  'riso integrale cotto': 111, 'riso integrale': 362,
  'riso cotto': 130, 'riso': 360,
  'pane integrale': 241, 'pane in cassetta': 268, 'pane': 265,
  'focaccia': 295,
  'fette biscottate integrali': 372, 'fette biscottate': 410,
  'gallette di riso': 382, 'gallette di mais': 375, 'gallette': 382,
  'crackers integrali': 395, 'crackers': 430,
  'avena istantanea': 375, 'fiocchi di avena': 379, 'avena': 379,
  'farina avena': 389, 'farina integrale': 333, 'farina': 346,
  'orzo': 354, 'farro': 335, 'quinoa cotta': 120, 'quinoa': 368,
  'patate dolci': 86, 'patate': 77,
  'biscotti proteici': 380, 'biscotti secchi': 438, 'biscotti': 450,
  'cornflakes': 378, 'cereali proteici': 370, 'cereali': 375,
  'galbusera protein': 362,
  'tortillas': 304, 'pizza bianca': 271,
  // ── Verdure ────────────────────────────────────────────
  'zucchine': 17, 'melanzane': 25, 'peperoni': 31,
  'carote': 41, 'barbabietola': 43,
  'spinaci': 23, 'bietola': 20,
  'broccoli': 34, 'cavolfiore': 25, 'cavolo': 27,
  'insalata': 15, 'lattuga': 14, 'rucola': 25,
  'pomodori': 18, 'pomodorini': 20,
  'cetrioli': 12, 'sedano': 16,
  'cipolle': 40, 'aglio': 149,
  'asparagi': 20, 'fagiolini': 31,
  'funghi': 27, 'funghi champignon': 27,
  'verdure': 25,
  // ── Frutta ─────────────────────────────────────────────
  'banana': 89, 'mela': 52, 'pera': 57, 'arancia': 47,
  'mandarino': 53, 'clementina': 47,
  'kiwi': 61, 'fragole': 33, 'mirtilli': 57,
  'ananas': 50, 'melone': 34, 'anguria': 30,
  'uva': 67, 'pesche': 39, 'albicocche': 48,
  'avocado': 160,
  'frutto': 55, 'frutta': 55,
  // ── Grassi & Condimenti ────────────────────────────────
  'olio evo': 884, 'olio di oliva': 884, 'olio di semi': 884, 'olio': 884,
  'miele': 304, 'marmellata': 260, 'nutella': 539,
  'maionese': 680, 'ketchup': 112, 'salsa di soia': 53,
  // ── Cioccolato & Dolci ─────────────────────────────────
  'cioccolato fondente 85%': 598, 'cioccolato fondente 70%': 572,
  'cioccolato fondente': 545, 'cioccolato al latte': 535, 'cioccolato': 535,
  'cacao amaro': 354, 'cacao': 354,
  // ── Frutta secca & Semi ────────────────────────────────
  'mandorle': 579, 'noci': 654, 'nocciole': 628, 'anacardi': 553,
  'pistacchi': 560, 'pinoli': 673, 'semi di chia': 486,
  'semi di lino': 534, 'semi di zucca': 559,
  'arachidi': 567, 'burro di arachidi': 588,
  'frutta secca': 600,
  // ── Integratori & Prodotti fitness ─────────────────────
  'whey protein': 370, 'proteine in polvere': 370,
  'barretta proteica': 380, 'barretta': 380,
};

const DEFAULT_GYM = {
  giorni: {
    0:{nome:'',esercizi:[]},1:{nome:'',esercizi:[]},2:{nome:'',esercizi:[]},
    3:{nome:'',esercizi:[]},4:{nome:'',esercizi:[]},5:{nome:'',esercizi:[]},6:{nome:'',esercizi:[]}
  }
};

// Chiavi KCAL_DB ordinate per lunghezza decrescente (più specifico vince)
const KCAL_DB_SORTED = Object.entries(KCAL_DB).sort((a, b) => b[0].length - a[0].length);

// Pesi medi per unità "pz" (grammi)
const PZ_WEIGHTS = {
  'uova': 60, 'uovo': 60,
  'banana': 120, 'mela': 160, 'pera': 150, 'arancia': 170,
  'mandarino': 80, 'kiwi': 80, 'pesche': 130, 'frutto': 150, 'frutta': 150,
  'biscotti': 10, 'gallette': 10, 'crackers': 8,
};

// Pesi reali per prodotti confezionati (pacco/pacchetto), in grammi
const PACCO_WEIGHTS = {
  'galbusera protein': 32,
  'galbusera': 32,
  'barretta proteica': 45,
  'barretta': 45,
};

// Stopword solo connettive — NON aggettivi come magro/cotto che servono per il match
const STOPWORDS = /\b(con|al|alla|allo|agli|alle|di|del|della|dello|in|no|senza|e)\b/g;

function _dbLookup(str) {
  for (const [key, val] of KCAL_DB_SORTED) {
    if (str.includes(key)) return val;
  }
  return 0;
}

// Calcola kcal da stringa alimento es. "150g latte intero", "2 uova", "3 fette pane"
function calcKcalFromFood(foodStr) {
  if (!foodStr || foodStr === 'Giorno libero' || foodStr === 'Libero') return 0;

  // Kcal esplicite: "500 kcal"
  const explicitKcal = foodStr.match(/(\d+(?:\.\d+)?)\s*kcal/i);
  if (explicitKcal) return parseFloat(explicitKcal[1]);

  const str = foodStr.toLowerCase().trim();

  // Estrai quantità e unità
  const qtyMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|pz|fett[ae]|scatolett[ae]|bust[ae]|pacco|pacchetto|porzione)?(?:\s|$)/i);
  if (!qtyMatch) return 0;

  let qty = parseFloat(qtyMatch[1].replace(',', '.'));
  const unit = (qtyMatch[2] || 'g').toLowerCase();

  // foodRaw: parte descrittiva con aggettivi (magro, cotto…) — usata per match specifici
  // foodClean: stessa parte senza stopword connettive
  const foodRaw   = str.slice(qtyMatch[0].length).trim();
  const foodClean = foodRaw.replace(STOPWORDS, ' ').replace(/\s+/g, ' ').trim();

  // Lookup: prima prova con testo completo (cattura "macinato manzo magro"),
  // poi senza stopword, poi sull'intera stringa, fallback 150
  const kcalPer100 = _dbLookup(foodRaw) || _dbLookup(foodClean) || _dbLookup(str) || 150;

  // Converti unità in grammi
  if (unit === 'kg') qty *= 1000;
  else if (unit === 'l') qty *= 1000;
  else if (unit === 'ml') { /* 1 ml ≈ 1g */ }
  else if (unit === 'pz') {
    let gPerPz = 50;
    for (const [food, w] of Object.entries(PZ_WEIGHTS)) {
      if (foodRaw.includes(food) || str.includes(food)) { gPerPz = w; break; }
    }
    qty *= gPerPz;
  }
  else if (unit === 'fetta' || unit === 'fette') {
    const isBiscuit = foodRaw.includes('biscott') || foodRaw.includes('gallette') || foodRaw.includes('biscottate');
    qty *= isBiscuit ? 10 : 35;
  }
  else if (unit === 'scatoletta' || unit === 'scatolette') {
    qty *= (foodRaw.includes('tonno') || str.includes('tonno')) ? 80 : 120;
  }
  else if (unit === 'busta' || unit === 'buste') {
    qty *= 100;
  }
  else if (unit === 'pacco' || unit === 'pacchetto') {
    // Cerca peso specifico per prodotto noto, altrimenti 100g
    let gPerPacco = 100;
    for (const [prod, w] of Object.entries(PACCO_WEIGHTS)) {
      if (foodRaw.includes(prod) || str.includes(prod)) { gPerPacco = w; break; }
    }
    qty *= gPerPacco;
  }
  else if (unit === 'porzione') {
    qty *= 150;
  }

  return Math.round((qty * kcalPer100) / 100);
}

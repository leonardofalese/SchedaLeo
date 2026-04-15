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

// Pesi medi per unità "pz" (grammi — porzione edibile, senza guscio/buccia/nocciolo)
const PZ_WEIGHTS = {
  'uova': 50, 'uovo': 50,           // uovo L sgusciato (~50g edibile)
  'banana': 95,                      // media senza buccia
  'mela': 140, 'pera': 140,         // media al netto del torsolo
  'arancia': 130,                    // media senza buccia
  'mandarino': 60, 'kiwi': 70,      // senza buccia/pelle
  'pesche': 115,                     // senza nocciolo
  'frutto': 120, 'frutta': 120,
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

// ── SINONIMI & ALIAS ─────────────────────────────────────
// Mappa alias → chiave canonica del DB: riduce fallback a 150 kcal per varianti di scrittura
const ALIASES = {
  // Wurstel / varianti tedesche
  'wurst': 'wurstel', 'würstel': 'wurstel', 'würstl': 'wurstel', 'frankfurter': 'wurstel', 'hot dog': 'wurstel',
  // Macinato
  'carne macinata': 'macinato manzo', 'carne trita': 'macinato manzo',
  'macinata': 'macinato', 'tritata': 'macinato',
  // Pollo / tacchino
  'petto pollo': 'petto di pollo', 'fesa tacchino': 'petto di tacchino',
  'fesa di tacchino': 'petto di tacchino',
  // Salumi
  'prosciutto di parma': 'prosciutto crudo', 'prosciutto san daniele': 'prosciutto crudo',
  'coppa': 'prosciutto crudo', 'culatello': 'prosciutto crudo',
  // Yogurt
  'greek': 'yogurt greco', 'skyr': 'yogurt greco 0%', 'quark': 'yogurt greco 0%',
  // Formaggi
  'mozzarella fiordilatte': 'mozzarella', 'provola': 'mozzarella', 'scamorza': 'mozzarella',
  'feta': 'mozzarella light', 'emmental': 'grana',
  'philadelphia': 'fiocchi di latte', 'formaggio spalmabile': 'fiocchi di latte', 'cream cheese': 'fiocchi di latte',
  // Avena / cereali
  'fiocchi avena': 'fiocchi di avena', 'porridge': 'avena', 'oatmeal': 'avena',
  // Riso
  'riso bianco': 'riso', 'riso parboiled': 'riso', 'riso venere': 'riso integrale', 'riso nero': 'riso integrale',
  'farro perlato': 'farro',
  // Olio
  'olio extravergine di oliva': 'olio evo', 'olio extravergine': 'olio evo', 'evoo': 'olio evo',
  'olio oliva': 'olio evo',
  // Pomodoro / passata
  'passata di pomodoro': 'pomodori', 'passata': 'pomodori', 'pomodoro': 'pomodori',
  'sugo di pomodoro': 'pomodori', 'pelati': 'pomodori',
  // Legumi
  'ceci in scatoletta': 'ceci cotti', 'fagioli in scatoletta': 'fagioli cotti',
  'lenticchie in scatoletta': 'lenticchie cotte', 'lenticchie rosse': 'lenticchie',
  // Tonno / pesce
  'tonno al naturale': 'tonno in scatoletta', 'tonno in acqua': 'tonno in scatoletta',
  // Cioccolato
  'extra fondente': 'cioccolato fondente 85%', 'fondente 90%': 'cioccolato fondente 85%',
  'fondente 80%': 'cioccolato fondente 70%',
  // Frutta secca
  'noci di cajù': 'anacardi', 'cajù': 'anacardi', 'noci pecan': 'noci', 'noci brasiliane': 'noci',
  // Proteine
  'whey': 'whey protein', 'proteine whey': 'whey protein',
  // Olio — abbreviazioni comuni
  'evo': 'olio evo', 'olio d\'oliva': 'olio evo', 'evoo': 'olio evo',
  // Yogurt brand / varianti
  'fage': 'yogurt greco 0%', 'fage 0%': 'yogurt greco 0%', 'fage total': 'yogurt greco',
  'yogurt 0%': 'yogurt greco 0%', 'yogurt magro': 'yogurt bianco',
  // Carne — varianti cottura / nomi alternativi
  'filetto di manzo': 'bistecca di manzo', 'filetto': 'bistecca di manzo',
  'hamburger': 'macinato manzo', 'burger': 'macinato manzo',
  'polpette': 'macinato manzo',
  'pollo alla piastra': 'petto di pollo', 'pollo al vapore': 'petto di pollo',
  'pollo al forno': 'pollo arrosto',
  'tacchino affettato': 'petto di tacchino', 'arrosto tacchino': 'petto di tacchino',
  // Pesce
  'salmone al forno': 'salmone fresco', 'salmone alla piastra': 'salmone fresco',
  'tonno sgocciolato': 'tonno in scatoletta',
  // Formaggi aggiuntivi
  'mozzarella bufala': 'mozzarella', 'mozzarella di bufala': 'mozzarella',
  // Insalata
  'insalata mista': 'insalata', 'mix insalata': 'insalata', 'insalata verde': 'insalata',
  // Riso varianti
  'riso jasmine': 'riso', 'riso thai': 'riso', 'riso arborio': 'riso', 'riso carnaroli': 'riso',
  // Verdure generiche
  'verdure grigliate': 'verdure', 'verdure al forno': 'verdure', 'verdure miste': 'verdure',
};
const ALIASES_SORTED = Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length);

function _aliasNormalize(str) {
  let s = str;
  for (const [alias, canonical] of ALIASES_SORTED) {
    if (s.includes(alias)) return s.replace(alias, canonical);
  }
  return s;
}

// ── MACRO DATABASE (P/C/G per 100g · fonte USDA/INRAN) ────
const MACRO_DB = {
  // Latticini
  'latte intero':{'p':3.2,'c':4.7,'g':3.6},'latte scremato':{'p':3.4,'c':4.9,'g':0.1},
  'latte parzialmente scremato':{'p':3.3,'c':4.7,'g':1.5},'latte':{'p':3.2,'c':4.7,'g':3.6},
  'yogurt greco 0%':{'p':10,'c':3.6,'g':0.1},'yogurt greco magro':{'p':10,'c':3.6,'g':0.1},
  'yogurt greco':{'p':9,'c':3.6,'g':5.0},'greco':{'p':9,'c':3.6,'g':5.0},
  'yogurt bianco':{'p':3.5,'c':4.7,'g':3.3},'yogurt':{'p':3.5,'c':4.7,'g':3.3},
  'ricotta':{'p':11,'c':3.5,'g':13},'ricotta di mucca':{'p':11,'c':3.5,'g':13},
  'grana padano':{'p':33,'c':0,'g':28},'parmigiano reggiano':{'p':33,'c':0,'g':28},
  'parmigiano':{'p':33,'c':0,'g':28},'grana':{'p':33,'c':0,'g':28},
  'mozzarella light':{'p':18,'c':1.4,'g':9},'mozzarella':{'p':18,'c':1.4,'g':20},
  'fiocchi di latte':{'p':11,'c':3.8,'g':4.3},
  'burro':{'p':0.7,'c':0,'g':81},'panna':{'p':2.3,'c':3,'g':35},
  // Uova
  'uova intere':{'p':13,'c':1.1,'g':11},'uova':{'p':13,'c':1.1,'g':11},'uovo':{'p':13,'c':1.1,'g':11},
  'albume':{'p':11,'c':0.7,'g':0.2},'tuorlo':{'p':16,'c':0.6,'g':27},
  // Carni
  'petto di pollo':{'p':23,'c':0,'g':1.2},'pollo arrosto':{'p':27,'c':0,'g':7},'pollo':{'p':23,'c':0,'g':1.2},
  'petto di tacchino':{'p':22,'c':0,'g':1},'tacchino':{'p':22,'c':0,'g':1},
  'macinato manzo magro':{'p':20,'c':0,'g':9},'macinato manzo':{'p':17,'c':0,'g':20},
  'macinato magro':{'p':20,'c':0,'g':9},'macinato':{'p':17,'c':0,'g':20},
  'bistecca di manzo':{'p':22,'c':0,'g':15},'manzo':{'p':22,'c':0,'g':15},
  'bistecca vitello':{'p':22,'c':0,'g':2},'vitello':{'p':22,'c':0,'g':2},
  'lonza maiale':{'p':20,'c':0,'g':5},'maiale':{'p':20,'c':0,'g':5},
  // Pesce
  'salmone affumicato':{'p':18,'c':0,'g':12},'salmone fresco':{'p':20,'c':0,'g':8},'salmone':{'p':20,'c':0,'g':8},
  'tonno sott\'olio':{'p':21,'c':0,'g':12},'tonno in scatoletta':{'p':22,'c':0,'g':1},'tonno':{'p':22,'c':0,'g':1},
  'merluzzo':{'p':18,'c':0,'g':0.7},'branzino':{'p':18,'c':0,'g':3.5},
  'orata':{'p':18,'c':0,'g':4.5},'pesce spada':{'p':20,'c':0,'g':5.5},
  'gamberetti':{'p':20,'c':0,'g':1.5},'gamberoni':{'p':20,'c':0,'g':1.5},
  // Salumi
  'bresaola della valtellina':{'p':33,'c':0,'g':1.8},'bresaola':{'p':33,'c':0,'g':1.8},
  'prosciutto cotto':{'p':19,'c':0,'g':7},'prosciutto crudo':{'p':25,'c':0,'g':21},'prosciutto':{'p':19,'c':0,'g':7},
  'speck':{'p':24,'c':0,'g':14},'pancetta':{'p':14,'c':0,'g':30},
  'mortadella':{'p':14,'c':0,'g':26},'wurstel':{'p':12,'c':1.5,'g':23},
  // Legumi
  'ceci cotti':{'p':8.9,'c':27,'g':2.6},'ceci':{'p':8.9,'c':27,'g':2.6},
  'lenticchie cotte':{'p':9,'c':20,'g':0.4},'lenticchie':{'p':9,'c':20,'g':0.4},
  'fagioli cotti':{'p':8,'c':22,'g':0.5},'fagioli':{'p':8,'c':22,'g':0.5},
  'edamame':{'p':11,'c':10,'g':5},
  // Carboidrati
  'pasta integrale cotta':{'p':5,'c':25,'g':0.9},'pasta integrale':{'p':13.5,'c':67,'g':2.5},
  'pasta cotta':{'p':5,'c':25,'g':0.8},'pasta':{'p':13,'c':72,'g':1.5},
  'riso basmati cotto':{'p':2.7,'c':28,'g':0.3},'riso basmati':{'p':7,'c':79,'g':0.7},
  'riso integrale cotto':{'p':2.6,'c':23,'g':0.9},'riso integrale':{'p':7.5,'c':76,'g':2.9},
  'riso cotto':{'p':2.7,'c':28,'g':0.3},'riso':{'p':7,'c':79,'g':0.7},
  'pane integrale':{'p':8,'c':46,'g':2},'pane in cassetta':{'p':9,'c':48,'g':3.5},'pane':{'p':9,'c':50,'g':2},
  'fette biscottate integrali':{'p':9,'c':72,'g':3},'fette biscottate':{'p':9,'c':79,'g':3},
  'gallette di riso':{'p':8,'c':81,'g':1.5},'gallette di mais':{'p':7.5,'c':80,'g':1},'gallette':{'p':8,'c':81,'g':1.5},
  'crackers integrali':{'p':9,'c':74,'g':5},'crackers':{'p':8,'c':76,'g':8.5},
  'fiocchi di avena':{'p':13,'c':66,'g':7},'avena istantanea':{'p':12,'c':66,'g':6},'avena':{'p':13,'c':66,'g':7},
  'patate dolci':{'p':1.6,'c':20,'g':0.1},'patate':{'p':2,'c':16,'g':0.1},
  'quinoa cotta':{'p':4.4,'c':21,'g':1.9},'quinoa':{'p':14,'c':72,'g':6},
  'orzo':{'p':10,'c':73,'g':2.1},'farro':{'p':14,'c':67,'g':2.5},
  'biscotti proteici':{'p':20,'c':50,'g':7},'biscotti secchi':{'p':6.5,'c':75,'g':9.5},'biscotti':{'p':6,'c':76,'g':12},
  'cornflakes':{'p':7,'c':84,'g':0.9},'cereali proteici':{'p':20,'c':55,'g':5},'cereali':{'p':7,'c':78,'g':3},
  'galbusera protein':{'p':15,'c':60,'g':8},'tortillas':{'p':7.5,'c':53,'g':6},
  'farina integrale':{'p':12,'c':70,'g':2.5},'farina avena':{'p':14.5,'c':70,'g':7},'farina':{'p':10,'c':74,'g':1.4},
  // Verdure
  'zucchine':{'p':1.2,'c':3.1,'g':0.3},'carote':{'p':0.9,'c':9.6,'g':0.2},'broccoli':{'p':2.8,'c':7,'g':0.4},
  'spinaci':{'p':2.9,'c':3.6,'g':0.4},'pomodori':{'p':0.9,'c':3.9,'g':0.2},'pomodorini':{'p':0.9,'c':3.9,'g':0.2},
  'peperoni':{'p':1,'c':6,'g':0.3},'melanzane':{'p':1,'c':5.7,'g':0.2},
  'insalata':{'p':1.3,'c':2,'g':0.2},'lattuga':{'p':1.3,'c':2,'g':0.2},'rucola':{'p':2.6,'c':3.7,'g':0.4},
  'funghi champignon':{'p':2.5,'c':3.3,'g':0.5},'funghi':{'p':2.5,'c':3.3,'g':0.5},
  'cetrioli':{'p':0.7,'c':2.2,'g':0.1},'asparagi':{'p':2.5,'c':3.7,'g':0.2},
  'cipolle':{'p':1.1,'c':9.3,'g':0.1},'barbabietola':{'p':1.7,'c':9.6,'g':0.1},
  'fagiolini':{'p':1.8,'c':6,'g':0.2},'verdure':{'p':1.5,'c':3.5,'g':0.2},
  // Frutta
  'banana':{'p':1.1,'c':23,'g':0.3},'mela':{'p':0.3,'c':14,'g':0.2},'pera':{'p':0.4,'c':15,'g':0.1},
  'arancia':{'p':0.9,'c':12,'g':0.1},'kiwi':{'p':1.1,'c':14.7,'g':0.5},
  'fragole':{'p':0.7,'c':8,'g':0.3},'mirtilli':{'p':0.7,'c':14.5,'g':0.3},
  'avocado':{'p':2,'c':8.5,'g':15},'ananas':{'p':0.5,'c':13,'g':0.1},
  'uva':{'p':0.7,'c':18,'g':0.2},'pesche':{'p':0.9,'c':9.5,'g':0.1},
  'frutto':{'p':0.7,'c':13,'g':0.2},'frutta':{'p':0.7,'c':13,'g':0.2},
  // Grassi & condimenti
  'olio evo':{'p':0,'c':0,'g':100},'olio di oliva':{'p':0,'c':0,'g':100},
  'olio di semi':{'p':0,'c':0,'g':100},'olio':{'p':0,'c':0,'g':100},
  'burro di arachidi':{'p':25,'c':20,'g':50},'miele':{'p':0.3,'c':82,'g':0},
  'marmellata':{'p':0.4,'c':65,'g':0.1},'nutella':{'p':6,'c':57,'g':31},'maionese':{'p':1.5,'c':2.5,'g':75},
  // Cioccolato
  'cioccolato fondente 85%':{'p':9,'c':20,'g':49},'cioccolato fondente 70%':{'p':7.8,'c':30,'g':43},
  'cioccolato fondente':{'p':5.5,'c':47,'g':32},'cioccolato al latte':{'p':7.7,'c':56,'g':31},
  'cioccolato':{'p':7.7,'c':56,'g':31},'cacao amaro':{'p':20,'c':55,'g':11},'cacao':{'p':20,'c':55,'g':11},
  // Frutta secca
  'mandorle':{'p':21,'c':22,'g':50},'noci':{'p':15,'c':14,'g':65},'nocciole':{'p':15,'c':17,'g':61},
  'anacardi':{'p':18,'c':30,'g':44},'pistacchi':{'p':20,'c':28,'g':45},
  'arachidi':{'p':26,'c':16,'g':49},'semi di chia':{'p':17,'c':42,'g':31},
  'frutta secca':{'p':15,'c':20,'g':55},
  // Integratori
  'whey protein':{'p':75,'c':10,'g':5},'proteine in polvere':{'p':75,'c':10,'g':5},
  'barretta proteica':{'p':25,'c':40,'g':8},'barretta':{'p':25,'c':40,'g':8},
};
const MACRO_DB_SORTED = Object.entries(MACRO_DB).sort((a,b) => b[0].length - a[0].length);

function _dbLookup(str) {
  for (const [key, val] of KCAL_DB_SORTED) {
    if (str.includes(key)) return val;
  }
  return 0;
}
function _macroLookup(str) {
  for (const [key, val] of MACRO_DB_SORTED) {
    if (str.includes(key)) return val;
  }
  return null;
}

// Soft lookup: se nessun match esatto, riprova rimuovendo parole sconosciute dalla fine
// Es. "riso scottato" → fallisce → riprova "riso" → match
function _dbLookupSoft(str) {
  if (!str) return 0;
  const exact = _dbLookup(str);
  if (exact) return exact;
  const words = str.trim().split(/\s+/);
  for (let i = words.length - 1; i >= 1; i--) {
    const hit = _dbLookup(words.slice(0, i).join(' '));
    if (hit) return hit;
  }
  return 0;
}
function _macroLookupSoft(str) {
  if (!str) return null;
  const exact = _macroLookup(str);
  if (exact) return exact;
  const words = str.trim().split(/\s+/);
  for (let i = words.length - 1; i >= 1; i--) {
    const hit = _macroLookup(words.slice(0, i).join(' '));
    if (hit) return hit;
  }
  return null;
}

// Kcal da macros: unica fonte di verità quando disponibili
function _kcalFromMacros(m) { return Math.round(m.p * 4 + m.c * 4 + m.g * 9); }

// Helper condiviso: estrae grammi, foodRaw, foodClean da una stringa alimento
function _parseFoodGrams(foodStr) {
  const str = foodStr.toLowerCase().trim();
  const qtyMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|pz|fett[ae]|scatolett[ae]|bust[ae]|pacco|pacchetto|porzione)?(?:\s|$)/i);
  if (!qtyMatch) return null;
  let qty = parseFloat(qtyMatch[1].replace(',', '.'));
  const unit = (qtyMatch[2] || 'g').toLowerCase();
  const foodRaw   = str.slice(qtyMatch[0].length).trim();
  const foodClean = foodRaw.replace(STOPWORDS, ' ').replace(/\s+/g, ' ').trim();
  if (unit === 'kg') qty *= 1000;
  else if (unit === 'l') {
    qty *= 1000;
    // Densità olio se in litri (raro ma possibile)
    if (foodRaw.includes('olio') || str.includes('olio')) qty = Math.round(qty * 0.92 * 10) / 10;
  }
  else if (unit === 'ml') {
    // Correzione densità per gli oli: 1 ml ≈ 0.92 g (olio d'oliva / EVO)
    if (foodRaw.includes('olio') || str.includes('olio')) qty = Math.round(qty * 0.92 * 10) / 10;
    // Latticini e altri liquidi ≈ 1 g/ml — nessuna correzione
  }
  else if (unit === 'pz') {
    let gPerPz = 50;
    for (const [food, w] of Object.entries(PZ_WEIGHTS)) {
      if (foodRaw.includes(food) || str.includes(food)) { gPerPz = w; break; }
    }
    qty *= gPerPz;
  }
  else if (unit === 'fetta' || unit === 'fette') {
    qty *= (foodRaw.includes('biscott') || foodRaw.includes('gallette') || foodRaw.includes('biscottate')) ? 10 : 35;
  }
  else if (unit === 'scatoletta' || unit === 'scatolette') {
    qty *= (foodRaw.includes('tonno') || str.includes('tonno')) ? 80 : 120;
  }
  else if (unit === 'busta' || unit === 'buste') qty *= 100;
  else if (unit === 'pacco' || unit === 'pacchetto') {
    let gPerPacco = 100;
    for (const [prod, w] of Object.entries(PACCO_WEIGHTS)) {
      if (foodRaw.includes(prod) || str.includes(prod)) { gPerPacco = w; break; }
    }
    qty *= gPerPacco;
  }
  else if (unit === 'porzione') qty *= 150;
  const foodAliased = _aliasNormalize(foodClean);
  return { grams: qty, foodRaw, foodClean, foodAliased, str };
}

// Calcola kcal da stringa alimento es. "150g latte intero", "2 uova", "3 fette pane"
// Priorità: 1) valore esplicito (200kcal)  2) macro→formula P×4+C×4+G×9  3) KCAL_DB  4) fallback 150
function calcKcalFromFood(foodStr) {
  if (!foodStr || foodStr === 'Giorno libero' || foodStr === 'Libero') return 0;
  const explicit = foodStr.match(/(\d+(?:\.\d+)?)\s*kcal/i);
  if (explicit) return parseFloat(explicit[1]);
  const p = _parseFoodGrams(foodStr);
  if (!p) return 0;
  // Macros disponibili → kcal calcolate da formula (più coerente con display macros)
  const macros = _macroLookupSoft(p.foodRaw) || _macroLookupSoft(p.foodClean) || _macroLookupSoft(p.foodAliased) || _macroLookupSoft(p.str);
  if (macros) return Math.round((p.grams * _kcalFromMacros(macros)) / 100);
  // Fallback: KCAL_DB con soft lookup (rimuove aggettivi sconosciuti), poi 150
  const kcalPer100 = _dbLookupSoft(p.foodRaw) || _dbLookupSoft(p.foodClean) || _dbLookupSoft(p.foodAliased) || _dbLookupSoft(p.str) || 150;
  return Math.round((p.grams * kcalPer100) / 100);
}

// Calcola macronutrienti da stringa alimento → { kcal, p, c, g }
// kcal è sempre derivata da P×4 + C×4 + G×9 quando i macros sono disponibili
function calcMacrosFromFood(foodStr) {
  if (!foodStr || foodStr === 'Giorno libero' || foodStr === 'Libero') return {kcal:0,p:0,c:0,g:0};
  const explicit = foodStr.match(/(\d+(?:\.\d+)?)\s*kcal/i);
  if (explicit) return {kcal:parseFloat(explicit[1]),p:0,c:0,g:0};
  const parsed = _parseFoodGrams(foodStr);
  if (!parsed) return {kcal:0,p:0,c:0,g:0};
  const macros = _macroLookupSoft(parsed.foodRaw) || _macroLookupSoft(parsed.foodClean) || _macroLookupSoft(parsed.foodAliased) || _macroLookupSoft(parsed.str);
  const kcalPer100 = macros
    ? _kcalFromMacros(macros)
    : (_dbLookupSoft(parsed.foodRaw) || _dbLookupSoft(parsed.foodClean) || _dbLookupSoft(parsed.foodAliased) || _dbLookupSoft(parsed.str) || 150);
  const kcal = Math.round((parsed.grams * kcalPer100) / 100);
  if (!macros) return {kcal, p:0, c:0, g:0};
  const f = parsed.grams / 100;
  return {
    kcal,
    p: Math.round(macros.p * f * 10) / 10,
    c: Math.round(macros.c * f * 10) / 10,
    g: Math.round(macros.g * f * 10) / 10,
  };
}

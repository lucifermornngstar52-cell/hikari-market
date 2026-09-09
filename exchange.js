// ===== HikariStock — биржа акций =====
(function(){
const STOCKS = [
  { t:'HKOS', name:'HikariOS',        e:'◐',  base:850,   vol:0.045, desc:'Твой собственный маркетплейс. Стартап — цена может и взлететь, и упасть.' },
  { t:'PB',   name:'PenkovBank',      e:'🏦', base:1250,  vol:0.020, desc:'Банк без единого филиала, весь — код. Стабильно и с кешбэком.' },
  { t:'PC',   name:'PenkovCasino',    e:'🎲', base:340,   vol:0.055, desc:'Самое волатильное удовольствие демо-мира. Не для слабонервных.' },
  { t:'KSPI', name:'Kaspi.kz',        e:'💳', base:36500, vol:0.015, desc:'Суперапп Казахстана. Дивидендный чемпион с банком, магазином и доставкой.' },
  { t:'HLYK', name:'Halyk Bank',      e:'🏛', base:9200,  vol:0.018, desc:'Крупнейший банк страны. Скучный, надёжный, растёт.' },
  { t:'KMGZ', name:'KazMunayGas',     e:'🛢', base:14800, vol:0.022, desc:'Нефтяной гигант. Живёт в ритме барреля.' },
  { t:'AIRA', name:'Air Astana',      e:'✈️', base:2300,  vol:0.025, desc:'Свежее IPO. Небо — не предел, а коридор роста.' }
];
const fmt = n => new Intl.NumberFormat('ru-RU').format(Math.round(n));
const getAcct = () => JSON.parse(localStorage.getItem('pb_account') || 'null');
const saveAcct = a => localStorage.setItem('pb_account', JSON.stringify(a));
const getHold = () => JSON.parse(localStorage.getItem('hik_stocks') || '{}');
const saveHold = h => localStorage.setItem('hik_stocks', JSON.stringify(h));

// состояние цен: храним, чтобы портфель был осмысленным между сессиями
let st = { prices: {}, open: {}, hist: {} };
function loadState(){
  try { st = JSON.parse(localStorage.getItem('hik_stock_state') || 'null') || st; } catch(e){}
  const now = Date.now();
  STOCKS.forEach(s => {
    if (!st.prices[s.t]) st.prices[s.t] = s.base * (1 + (Math.random() - .5) * s.vol * 2);
    if (!st.open[s.t] || now - (st.openTs || 0) > 86400000) { st.open[s.t] = st.prices[s.t]; st.openTs = now; }
    if (!st.hist[s.t]) st.hist[s.t] = mkHist(st.prices[s.t]);
  });
}
function mkHist(p){
  const h = [];
  let x = p * (1 - (Math.random() - .45) * .06);
  for (let i = 0; i < 24; i++) { x *= 1 + (Math.random() - .5) * .018; h.push(x); }
  h.push(p);
  return h;
}
function saveState(){ localStorage.setItem('hik_stock_state', JSON.stringify(st)); }
function drift(){
  STOCKS.forEach(s => {
    const move = (Math.random() - .5) * 2 * s.vol * .35;
    st.prices[s.t] = Math.max(1, st.prices[s.t] * (1 + move));
    st.hist[s.t].push(st.prices[s.t]);
    if (st.hist[s.t].length > 25) st.hist[s.t].shift();
  });
  saveState();
}
function chg(t){ return (st.prices[t] - st.open[t]) / st.open[t] * 100; }

function sparkSVG(t){
  const up = chg(t) >= 0;
  const h = st.hist[t];
  const mn = Math.min(...h), mx = Math.max(...h), sp = (mx - mn) || 1;
  const pts = h.map((v, i) => (i / (h.length - 1) * 100).toFixed(1) + ',' + (30 - (v - mn) / sp * 26 + 2).toFixed(1)).join(' ');
  return '<svg class="spark ' + (up ? 'up' : 'down') + '" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="' + pts + '"/></svg>';
}

function portValue(){
  const h = getHold();
  return Object.entries(h).reduce((s, [t, o]) => s + (st.prices[t] || 0) * o.qty, 0);
}
function portPL(){
  const h = getHold();
  return Object.entries(h).reduce((s, [t, o]) => s + ((st.prices[t] || 0) - o.avg) * o.qty, 0);
}

function render(){
  const a = getAcct();
  document.getElementById('exNoAcct').style.display = a ? 'none' : 'block';
  document.getElementById('exBalance').style.display = a ? 'flex' : 'none';
  if (a) {
    document.getElementById('exBalVal').textContent = fmt(a.balance) + ' ₸';
    document.getElementById('exPortVal').textContent = fmt(portValue()) + ' ₸';
    const pl = portPL();
    const plEl = document.getElementById('exPLVal');
    plEl.textContent = (pl >= 0 ? '+' : '') + fmt(pl) + ' ₸';
    plEl.style.color = pl >= 0 ? '#34d399' : '#f87171';
  }
  const h = getHold();
  document.getElementById('stocksGrid').innerHTML = STOCKS.map(s => {
    const c = chg(s.t), up = c >= 0;
    const own = h[s.t];
    const hold = own
      ? '<div class="stock-hold">💼 В портфеле: <b>' + own.qty + ' шт</b> · ср. ' + fmt(own.avg) + ' ₸ · P/L <b class="' + (((st.prices[s.t] - own.avg) * own.qty >= 0) ? 'pl-up' : 'pl-down') + '">' + (((st.prices[s.t] - own.avg) * own.qty >= 0 ? '+' : '') + fmt((st.prices[s.t] - own.avg) * own.qty)) + ' ₸</b></div>'
      : '<div class="stock-hold" style="opacity:.55">💼 Пока не куплено</div>';
    return '<div class="stock-card">' +
      '<div class="stock-head"><span class="stock-ico">' + s.e + '</span><div><b>' + s.t + '</b><span class="stock-name">' + s.name + '</span></div>' +
      '<span class="stock-chg ' + (up ? 'up' : 'down') + '">' + (up ? '+' : '') + c.toFixed(2) + '%</span></div>' +
      '<div class="stock-price">' + fmt(st.prices[s.t]) + ' ₸</div>' +
      sparkSVG(s.t) +
      '<p class="stock-desc">' + s.desc + '</p>' + hold +
      '<div class="stock-actions">' +
      '<input type="number" id="qty-' + s.t + '" value="1" min="1">' +
      '<button class="stock-btn buy" onclick="window.buyStock(\'' + s.t + '\')">Купить</button>' +
      '<button class="stock-btn sell" onclick="window.sellStock(\'' + s.t + '\')">Продать</button>' +
      '</div></div>';
  }).join('');
}

window.buyStock = function(t){
  const s = STOCKS.find(x => x.t === t); if (!s) return;
  const a = getAcct();
  if (!a) { alert('Для торговли нужен демо-счёт PenkovBank 🏦'); return; }
  const qty = Math.floor(+document.getElementById('qty-' + t).value);
  if (!qty || qty <= 0) { alert('Введи количество акций 🙂'); return; }
  const cost = qty * st.prices[t];
  if (cost > a.balance) { alert('Не хватает демо-тенге: нужно ' + fmt(cost) + ' ₸, на счету ' + fmt(a.balance) + ' ₸'); return; }
  a.balance -= cost;
  a.history.push({ op: '📈 Куплены акции ' + t + ' (' + s.name + '): ' + qty + ' шт', sum: -cost, date: Date.now() });
  saveAcct(a);
  const h = getHold();
  const o = h[t] || { qty: 0, avg: 0 };
  o.avg = (o.avg * o.qty + st.prices[t] * qty) / (o.qty + qty);
  o.qty += qty;
  h[t] = o; saveHold(h);
  render();
  alert('Куплено ' + qty + ' шт ' + t + ' за ' + fmt(cost) + ' ₸ 📈');
};

window.sellStock = function(t){
  const s = STOCKS.find(x => x.t === t); if (!s) return;
  const a = getAcct(); if (!a) { alert('Нужен счёт PenkovBank 🏦'); return; }
  const h = getHold(); const o = h[t];
  if (!o || o.qty <= 0) { alert('У тебя нет акций ' + t + ' 🙂'); return; }
  const qty = Math.min(o.qty, Math.floor(+document.getElementById('qty-' + t).value) || o.qty);
  if (qty <= 0) { alert('Введи количество 🙂'); return; }
  const gain = qty * st.prices[t];
  a.balance += gain;
  a.history.push({ op: '📉 Проданы акции ' + t + ' (' + s.name + '): ' + qty + ' шт', sum: gain, date: Date.now() });
  saveAcct(a);
  o.qty -= qty;
  if (o.qty <= 0) delete h[t]; else h[t] = o;
  saveHold(h);
  render();
  alert('Продано ' + qty + ' шт ' + t + ' за ' + fmt(gain) + ' ₸ ' + (st.prices[t] >= o.avg ? '📈' : '📉'));
};

loadState();
render();
setInterval(() => { drift(); try { render(); } catch(e) {} }, 5000);
})();

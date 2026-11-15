// В фильтрах формат написан кириллической «А», в каталоге — латинской «A».
// Приводим к одному виду, иначе фильтр по формату никогда ничего не находит.
const norm = s => String(s).replace(/\u0410/g, 'A');

const prices = window.CATALOG.map(x => x.price);
const PRICE_MIN = Math.floor(Math.min(...prices));
const PRICE_MAX = Math.ceil(Math.max(...prices));

const emptyFilters = () => ({ cats: [], formats: [], pMin: null, pMax: PRICE_MAX, minRun: null, q: '' });

const qtyInit = {};
window.CATALOG.forEach(g => { qtyInit[g.article] = g.stepper || 1; });

new Vue({
  el: '#app',
  data: {
    filters: window.FILTERS, goods: window.CATALOG,
    f: emptyFilters(),
    priceMin: PRICE_MIN, priceMax: PRICE_MAX,
    sort: 0, fav: {}, qty: qtyInit,
    sorts: [null, 'price-asc', 'price-desc'],
  },
  computed: {
    sortLabel() { return ['популярности', 'цена ↑', 'цена ↓'][this.sort]; },
    shown() {
      const f = this.f;
      const q = (f.q || '').toLowerCase();
      let g = this.goods.filter(x =>
        (!f.cats.length || f.cats.includes(x.cat)) &&
        (!f.formats.length || f.formats.map(norm).includes(norm(x.format))) &&
        (!f.minRun || x.minRun <= f.minRun) &&           // «минимальный тираж не больше N»
        (!q || x.name.toLowerCase().includes(q)) &&
        (f.pMin == null || f.pMin === '' || x.price >= f.pMin) &&
        (f.pMax == null || f.pMax === '' || x.price <= f.pMax));
      if (this.sorts[this.sort] === 'price-asc') g = [...g].sort((a, b) => a.price - b.price);
      if (this.sorts[this.sort] === 'price-desc') g = [...g].sort((a, b) => b.price - a.price);
      return g;
    },
  },
  methods: {
    countCat(c) { return this.goods.filter(x => x.cat === c).length; },
    countFmt(s) { return this.goods.filter(x => norm(x.format) === norm(s)).length; },
    cycleSort() { this.sort = (this.sort + 1) % 3; },
    clear() { this.f = emptyFilters(); },
    toggleFav(a) { this.$set(this.fav, a, !this.fav[a]); },
    chQty(g, d) {
      const q = Math.max(1, (this.qty[g.article] || 1) + d);
      this.$set(this.qty, g.article, q);
      if (d > 0) this.add(g.article, q);
    },
    add(article, quantity) {
      fetch('/api/addToCart', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article, quantity: quantity || 1 }),
      })
        .then(r => { if (!r.ok) throw 0; this.notif('Добавлено в корзину ♥'); })
        .catch(() => this.notif('Войдите, чтобы добавить в корзину', 'error'));
    },
    notif(m, t) {
      const c = document.getElementById('notifications'), n = document.createElement('div');
      n.className = 'notification ' + (t || 'success'); n.innerText = m; c.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    },
  },
});

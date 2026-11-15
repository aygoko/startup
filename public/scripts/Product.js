new Vue({
  el: '#app',
  data: { g: {}, base: 'Прозрачная', tier: null, backing: true, recs: [], fav: {} },
  created() {
    const art = new URLSearchParams(location.search).get('article') || 'XQK728J9';
    this.g = window.CATALOG.find(x => x.article === art) || window.CATALOG[2];
    this.tier = this.g.options ? this.g.options.tiers[0] : null;
    this.recs = window.CATALOG.filter(x => x.article !== this.g.article).slice(0, 4);
    document.title = this.g.name + ' — Коллекты от Софы';
  },
  computed: {
    total() {
      if (!this.g.options) return this.g.price;
      let t = this.tier.q * this.tier.p;
      // подложка считается на весь тираж, а не на фиксированные 100 шт
      if (this.backing) t += this.tier.q * this.g.options.backing.p;
      return Math.round(t);
    },
  },
  methods: {
    // ссылки в каталоге записаны как «t.me/...» без https:// — браузер считал их относительными
    link(u) { return /^https?:\/\//.test(u) ? u : 'https://' + u; },
    toggleFav(a) { this.$set(this.fav, a, !this.fav[a]); },
    send(article, quantity, okMsg) {
      fetch('/api/addToCart', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article, quantity }),
      })
        .then(r => { if (!r.ok) throw 0; this.notif(okMsg); })
        .catch(() => this.notif('Войдите, чтобы купить', 'error'));
    },
    add() { this.send(this.g.article, this.tier ? this.tier.q : 1, 'Добавлено в корзину ♥'); },
    addRec(r) { this.send(r.article, r.minRun || 1, 'Добавлено в корзину ♥'); },
    notif(m, t) {
      const c = document.getElementById('notifications'), n = document.createElement('div');
      n.className = 'notification ' + (t || 'success'); n.innerText = m; c.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    },
  },
});
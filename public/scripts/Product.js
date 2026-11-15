new Vue({
  el:'#app',
  data:{ g:{}, base:'Прозрачная', tier:null, backing:true, recs:[] },
  created(){
    const art=new URLSearchParams(location.search).get('article')||'XQK728J9';
    this.g = window.CATALOG.find(x=>x.article===art) || window.CATALOG[2];
    this.tier = this.g.options ? this.g.options.tiers[0] : null;
    this.recs = window.CATALOG.filter(x=>x.article!==this.g.article).slice(0,4);
  },
  computed:{
    total(){
      if(!this.g.options) return this.g.price;
      let t=this.tier.q*this.tier.p;
      if(this.backing) t+=this.g.options.backing.q*this.g.options.backing.p;
      return Math.round(t);
    }
  },
  methods:{
    add(){
      fetch('/api/addToCart',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({article:this.g.article, quantity:this.tier?this.tier.q:1})})
        .then(r=>{ if(!r.ok) throw 0; this.notif('Добавлено в корзину ♥'); })
        .catch(()=>this.notif('Войдите, чтобы купить','error'));
    },
    notif(m,t){
      const c=document.getElementById('notifications'),n=document.createElement('div');
      n.className='notification '+(t||'success'); n.innerText=m; c.appendChild(n);
      setTimeout(()=>n.remove(),3000);
    }
  }
});
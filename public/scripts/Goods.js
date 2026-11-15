new Vue({
  el:'#app',
  data:{ filters:window.FILTERS, goods:window.CATALOG,
    f:{cats:[],formats:[],pMin:null,pMax:1000,minRun:null,q:''},
    sort:0, fav:{},
    sorts:[null,'price-asc','price-desc'] },
  computed:{
    sortLabel(){ return ['популярности','цена ↑','цена ↓'][this.sort]; },
    shown(){
      let g=this.goods.filter(x=>
        (!this.f.cats.length || this.f.cats.includes(x.cat)) &&
        (!this.f.formats.length || this.f.formats.includes(x.format)) &&
        (!this.f.minRun || x.minRun>=this.f.minRun) &&
        (!this.f.q || x.name.toLowerCase().includes(this.f.q.toLowerCase())) &&
        (this.f.pMin==null || x.price>=this.f.pMin) && x.price<=this.f.pMax);
      if(this.sorts[this.sort]==='price-asc') g=[...g].sort((a,b)=>a.price-b.price);
      if(this.sorts[this.sort]==='price-desc') g=[...g].sort((a,b)=>b.price-a.price);
      return g;
    }
  },
  methods:{
    cycleSort(){ this.sort=(this.sort+1)%3; },
    clear(){ this.f={cats:[],formats:[],pMin:null,pMax:1000,minRun:null,q:''}; },
    toggleFav(a){ this.$set(this.fav,a,!this.fav[a]); },
    add(article){
      fetch('/api/addToCart',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({article,quantity:1})})
        .then(r=>{ if(!r.ok) throw 0; })
        .catch(()=>{});
    }
  }
});
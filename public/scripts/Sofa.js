document.addEventListener('DOMContentLoaded', () => {
  // календарь декабря (как в макете: 1 — ПН)
  const dow=['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'], cal=document.getElementById('calendar');
  if(cal){
    let html='';
    for(let d=1; d<=31; d++){
      const hot = (d===5||d===8) ? ' hot':'';
      html+=`<div class="cell${hot}"><div class="dow">${dow[(d-1)%7]}</div>${d}
        ${d===5?'<div class="note">⭐ Дедлайн сдачи макетов</div>':''}
        ${d===8?'<div class="note">♥ Дедлайн оплаты</div>':''}</div>`;
    }
    for(let i=0;i<2;i++) html+='<div class="cell" style="background:transparent"></div>';
    html+='<div class="dog">🐶</div>';
    cal.innerHTML=html;
  }
});

new Vue({
  el:'#app',
  data:{
    homeGoods: window.CATALOG.slice(0,8),
    qty:{}, fav:{},
    isMouseDownOnBackdrop:false, isUserModalOpen:false, userType:'buyer',
    isLogInModalOpen:false, isPasswordVisible:false, isPassword2Visible:false,
    isPasswordLoginVisible:false, isRecoveryModalOpen:false,
    activeDocModal:null, isCookieBannerVisible:false,
  },
  mounted(){
    window.CATALOG.forEach(g=>{ this.$set(this.qty,g.article,g.stepper||1); });
    if(!localStorage.getItem('sofa_cookies_accepted')) this.isCookieBannerVisible=true;
    if(location.hash==='#login') this.openLogInModal();
  },
  methods:{
    toggleFav(a){ this.$set(this.fav,a,!this.fav[a]); },
    chQty(g,d){
      const q=Math.max(1,(this.qty[g.article]||1)+d);
      this.$set(this.qty,g.article,q);
      if(d>0) this.add(g.article,q);
    },
    add(article,q){
      // интеграция с корзиной: POST /api/addToCart {article, quantity}
      fetch('/api/addToCart',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({article, quantity:q||this.qty[article]||1})})
        .then(r=>{ if(!r.ok) throw 0; this.showNotification('Добавлено в корзину ♥','success'); })
        .catch(()=>this.showNotification('Войдите, чтобы добавить в корзину','error'));
    },
    showNotification(m,t){
      const c=document.getElementById('notifications');
      const n=document.createElement('div'); n.className='notification '+t; n.innerText=m; c.appendChild(n);
      setTimeout(()=>n.remove(),3000);
    },
    closeSidebar(){}, handleMouseDown(e){ if(e.target===e.currentTarget) this.isMouseDownOnBackdrop=true; },
    handleMouseUp(e){ if(this.isMouseDownOnBackdrop&&e.target===e.currentTarget){
      if(this.activeDocModal!==null) this.activeDocModal=null;
      else if(this.isUserModalOpen) this.isUserModalOpen=false;
      else if(this.isLogInModalOpen) this.isLogInModalOpen=false;
      else if(this.isRecoveryModalOpen) this.isRecoveryModalOpen=false; }
      this.isMouseDownOnBackdrop=false; },
    openDocModal(t){ this.activeDocModal=t; }, closeDocModal(){ this.activeDocModal=null; },
    acceptCookies(){ localStorage.setItem('sofa_cookies_accepted','true'); this.isCookieBannerVisible=false; },
    openUserModal(){ this.isLogInModalOpen=false; this.isUserModalOpen=true; }, closeUserModal(){ this.isUserModalOpen=false; },
    selectUserType(t){ this.userType=t; },
    togglePasswordVisibility(){ this.isPasswordVisible=!this.isPasswordVisible; },
    togglePassword2Visibility(){ this.isPassword2Visible=!this.isPassword2Visible; },
    togglePasswordLoginVisibility(){ this.isPasswordLoginVisible=!this.isPasswordLoginVisible; },
    openLogInModal(){ this.closeUserModal(); this.isLogInModalOpen=true; }, closeLogInModal(){ this.isLogInModalOpen=false; },
    openRecoveryModal(){ this.closeLogInModal(); this.isRecoveryModalOpen=true; }, closeRecoveryModal(){ this.isRecoveryModalOpen=false; },
    submitUserForm(){ /* оставь из старого Sofa.js (/SignUpUser) */ },
    submitLogInForm(){ /* оставь из старого Sofa.js (/LogIn) */ },
    submitRecoveryForm(){ /* оставь из старого Sofa.js (/Recovery) */ },
  }
});
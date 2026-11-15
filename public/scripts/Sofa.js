/* ============================================================
   Эндпоинты авторизации. Если в server.go они называются иначе —
   поменяйте их ТОЛЬКО здесь.
   ============================================================ */
const API = {
  signUp: '/api/SignUpUser',
  logIn: '/api/LogIn',
  recovery: '/api/Recovery',
  authenticate: '/api/authenticate',
  addToCart: '/api/addToCart',
};
const PROFILE_PAGE = 'User.html';

/* Календарь дедлайнов (month: 0 = январь, 11 = декабрь) */
const CAL = { year: 2026, month: 11, layoutDay: 5, paymentDay: 8 };

function renderCalendar() {
  const cal = document.getElementById('calendar');
  if (!cal) return;
  const dow = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
  const first = new Date(CAL.year, CAL.month, 1);
  const offset = (first.getDay() + 6) % 7; // сколько пустых ячеек до 1-го числа (неделя с ПН)
  const days = new Date(CAL.year, CAL.month + 1, 0).getDate();

  const title = document.getElementById('calMonth');
  if (title) title.textContent = first.toLocaleString('ru', { month: 'long' }).toUpperCase();

  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="cell" style="background:transparent"></div>';
  for (let d = 1; d <= days; d++) {
    const isLayout = d === CAL.layoutDay, isPay = d === CAL.paymentDay;
    html += `<div class="cell${isLayout || isPay ? ' hot' : ''}">
      <div class="dow">${dow[(offset + d - 1) % 7]}</div>${d}
      ${isLayout ? '<div class="note">⭐ Дедлайн сдачи макетов</div>' : ''}
      ${isPay ? '<div class="note">♥ Дедлайн оплаты</div>' : ''}</div>`;
  }
  html += '<div class="dog">🐶</div>';
  cal.innerHTML = html;
}
document.addEventListener('DOMContentLoaded', renderCalendar);

const val = id => (document.getElementById(id) || {}).value || '';

const qtyInit = {};
window.CATALOG.forEach(g => { qtyInit[g.article] = g.stepper || 1; });

new Vue({
  el: '#app',
  data: {
    homeGoods: window.CATALOG.slice(0, 8),
    qty: qtyInit, fav: {},
    isAuth: false, sidebarOpen: false,
    isMouseDownOnBackdrop: false, isUserModalOpen: false, userType: 'buyer',
    isLogInModalOpen: false, isPasswordVisible: false, isPassword2Visible: false,
    isPasswordLoginVisible: false, isRecoveryModalOpen: false,
    activeDocModal: null, isCookieBannerVisible: false,
  },
  mounted() {
    try {
      if (!localStorage.getItem('sofa_cookies_accepted')) this.isCookieBannerVisible = true;
    } catch (e) { this.isCookieBannerVisible = true; }
    if (location.hash === '#login') this.openLogInModal();

    // уже вошёл? тогда вместо «Войти» показываем «Профиль»
    fetch(API.authenticate, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { this.isAuth = !!(d && d.success); })
      .catch(() => {});
  },
  methods: {
    toggleFav(a) { this.$set(this.fav, a, !this.fav[a]); },
    chQty(g, d) {
      const q = Math.max(1, (this.qty[g.article] || 1) + d);
      this.$set(this.qty, g.article, q);
      if (d > 0) this.add(g.article, q);
    },
    add(article, q) {
      fetch(API.addToCart, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article, quantity: q || this.qty[article] || 1 }),
      })
        .then(r => { if (!r.ok) throw 0; this.showNotification('Добавлено в корзину ♥', 'success'); })
        .catch(() => this.showNotification('Войдите, чтобы добавить в корзину', 'error'));
    },
    showNotification(m, t) {
      const c = document.getElementById('notifications');
      const n = document.createElement('div');
      n.className = 'notification ' + (t || 'success'); n.innerText = m; c.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    },

    /* --- общий POST: возвращает {ok, status, text, json} --- */
    post(url, body) {
      return fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.text().then(text => {
        let json = null; try { json = JSON.parse(text); } catch (e) {}
        return { ok: r.ok, status: r.status, text, json };
      }));
    },
    errorText(res, fallback) {
      const t = res.text || '';
      if (/already exists/i.test(t)) return 'Пользователь с таким логином или почтой уже существует.';
      if (/banned/i.test(t)) return 'Аккаунт заблокирован.';
      if (res.status === 401 || /unauthor|invalid|incorrect|wrong/i.test(t)) return 'Неверный логин или пароль.';
      if (res.status === 409) return 'Пользователь с такими данными уже существует.';
      if (res.status === 400) return 'Проверьте введённые данные.';
      if (res.status >= 500) return 'Ошибка сервера. Попробуйте позже.';
      return fallback;
    },

    /* --- сайдбар и модалки --- */
    closeSidebar() { this.sidebarOpen = false; },
    handleMouseDown(e) { if (e.target === e.currentTarget) this.isMouseDownOnBackdrop = true; },
    handleMouseUp(e) {
      if (this.isMouseDownOnBackdrop && e.target === e.currentTarget) {
        if (this.activeDocModal !== null) this.activeDocModal = null;
        else if (this.isUserModalOpen) this.isUserModalOpen = false;
        else if (this.isLogInModalOpen) this.isLogInModalOpen = false;
        else if (this.isRecoveryModalOpen) this.isRecoveryModalOpen = false;
      }
      this.isMouseDownOnBackdrop = false;
    },
    openDocModal(t) { this.activeDocModal = t; }, closeDocModal() { this.activeDocModal = null; },
    acceptCookies() {
      try { localStorage.setItem('sofa_cookies_accepted', 'true'); } catch (e) {}
      this.isCookieBannerVisible = false;
    },
    openUserModal() { this.isLogInModalOpen = false; this.isUserModalOpen = true; }, closeUserModal() { this.isUserModalOpen = false; },
    selectUserType(t) {
      this.userType = t;
      const b = document.getElementById('buyerButton'), m = document.getElementById('merchantButton');
      if (b && m) { b.classList.toggle('selected', t === 'buyer'); m.classList.toggle('selected', t === 'merchant'); }
    },
    togglePasswordVisibility() { this.isPasswordVisible = !this.isPasswordVisible; },
    togglePassword2Visibility() { this.isPassword2Visible = !this.isPassword2Visible; },
    togglePasswordLoginVisibility() { this.isPasswordLoginVisible = !this.isPasswordLoginVisible; },
    openLogInModal() { this.closeUserModal(); this.isRecoveryModalOpen = false; this.isLogInModalOpen = true; }, closeLogInModal() { this.isLogInModalOpen = false; },
    openRecoveryModal() { this.closeLogInModal(); this.isRecoveryModalOpen = true; }, closeRecoveryModal() { this.isRecoveryModalOpen = false; },

    /* --- формы --- */
    submitUserForm() {
      const body = { login: val('user-login').trim(), email: val('user-email').trim(), password: val('user-password') };
      if (body.password.length < 8) return this.showNotification('Пароль должен быть не короче 8 знаков.', 'error');
      if (body.password !== val('user-password-repeat')) return this.showNotification('Пароли не совпадают!', 'error');
      if (this.userType === 'merchant') {
        body.nickname = val('author-nickname').trim();
        body.vk = val('author-vk').trim();
      }
      this.post(API.signUp, body)
        .then(res => {
          if (!res.ok) return this.showNotification(this.errorText(res, 'Не удалось зарегистрироваться.'), 'error');
          this.showNotification('Регистрация прошла успешно!', 'success');
          this.openLogInModal();
        })
        .catch(() => this.showNotification('Нет связи с сервером.', 'error'));
    },
    submitLogInForm() {
      const id = val('auth-email-login-nickname').trim();
      this.post(API.logIn, { login: id, email: id, password: val('auth-password') })
        .then(res => {
          if (!res.ok) return this.showNotification(this.errorText(res, 'Не удалось войти.'), 'error');
          this.isAuth = true;
          window.location.href = PROFILE_PAGE;
        })
        .catch(() => this.showNotification('Нет связи с сервером.', 'error'));
    },
    submitRecoveryForm() {
      this.post(API.recovery, { email: val('RecoveryEmail').trim() })
        .then(res => {
          if (!res.ok) return this.showNotification(this.errorText(res, 'Не удалось отправить письмо.'), 'error');
          this.showNotification('Если такая почта есть в системе, мы отправили ссылку.', 'success');
          this.closeRecoveryModal();
        })
        .catch(() => this.showNotification('Нет связи с сервером.', 'error'));
    },
  },
});
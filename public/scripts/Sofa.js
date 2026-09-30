document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    // Мобильный гамбургер
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', function(event) {
            if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Глобальный перехватчик ошибок
    window.addEventListener('error', function(event) {
        console.warn('⚠️ Глобальная ошибка:', event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.warn('⚠️ Ошибка промиса:', event.reason);
        event.preventDefault();
    });

    // Обработка токена регистрации из URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        fetch('/api/checkToken', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token })
        })
        .then(res => res.json())
        .then(data => {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (data && data.success) {
                console.log("✅ Почта успешно подтверждена");
            }
        })
        .catch(err => {
            console.warn("❌ Ошибка подтверждения токена:", err);
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
});

// ==========================================================
// VUE ПРИЛОЖЕНИЕ
// ==========================================================
new Vue({
    el: '#app',
    data: {
        goods: [],
        circulationItems: [
            {
                image: "assets/картхолдер.png",
                name: "Картхолдеры",
                stock: 45,
                oldPrice: 150,
                newPrice: 120,
            },
            {
                image: "assets/наклейки.png",
                name: "Объёмные наклейки",
                stock: 32,
                oldPrice: 80,
                newPrice: 64,
            },
            {
                image: "assets/стенд.png",
                name: "Стенды с блёстками",
                stock: 32,
                oldPrice: 80,
                newPrice: 64,
            },
            {
                image: "assets/биндер.png",
                name: "Биндеры",
                stock: 32,
                oldPrice: 80,
                newPrice: 64,
            },
        ],
        isMouseDownOnBackdrop: false,
        isUserModalOpen: false,
        userType: 'buyer',
        isLogInModalOpen: false,
        isPasswordVisible: false,
        isPassword2Visible: false,
        isPasswordLoginVisible: false,
        isRecoveryModalOpen: false,
        
        // Модальное окно правовых документов ИП и Cookie
        activeDocModal: null, // null | 'privacy' | 'terms' | 'cookies'
        isCookieBannerVisible: false,
    },
    mounted() {
        this.fetchGoods();
        this.initSlider();

        // Проверяем согласие на Cookies в localStorage
        if (!localStorage.getItem('sofa_cookies_accepted')) {
            this.isCookieBannerVisible = true;
        }
    },
    methods: {
        closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
        },
        fetchGoods() {
            fetch('/sofa/getgoods')
            .then(res => {
                if (res.ok) return res.json();
                return [];
            })
            .then(data => {
                this.goods = data;
            })
            .catch(() => {});
        },
        showNotification(message, type) {
            const container = document.getElementById('notifications');
            if (!container) return;
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerText = message;
            container.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        },
        handleMouseDown(event) {
            if (event.target === event.currentTarget) {
                this.isMouseDownOnBackdrop = true;
            }
        },
        handleMouseUp(event) {
            if (this.isMouseDownOnBackdrop && event.target === event.currentTarget) {
                if (this.activeDocModal !== null) {
                    this.closeDocModal();
                } else if (this.isUserModalOpen) {
                    this.closeUserModal();
                } else if (this.isLogInModalOpen) {
                    this.closeLogInModal();
                } else if (this.isRecoveryModalOpen) {
                    this.closeRecoveryModal();
                }
            }
            this.isMouseDownOnBackdrop = false;
        },
        openDocModal(type) {
            this.activeDocModal = type;
            this.closeSidebar();
        },
        closeDocModal() {
            this.activeDocModal = null;
        },
        acceptCookies() {
            localStorage.setItem('sofa_cookies_accepted', 'true');
            this.isCookieBannerVisible = false;
        },
        openUserModal() {  
            this.closeSidebar();
            this.isLogInModalOpen = false;
            this.isUserModalOpen = true;
        },
        closeUserModal(){
            this.isUserModalOpen = false;
        },
        selectUserType(type) {
            this.userType = type;
            const merchantButton = document.getElementById("merchantButton");
            const buyerButton = document.getElementById("buyerButton");
            if (type === 'buyer') {
                if (buyerButton) buyerButton.classList.add("selected");
                if (merchantButton) merchantButton.classList.remove("selected");
            } else {
                if (merchantButton) merchantButton.classList.add("selected");
                if (buyerButton) buyerButton.classList.remove("selected");
            }
        },
        togglePasswordVisibility() { this.isPasswordVisible = !this.isPasswordVisible; },
        togglePassword2Visibility() { this.isPassword2Visible = !this.isPassword2Visible; },
        togglePasswordLoginVisibility() { this.isPasswordLoginVisible = !this.isPasswordLoginVisible; },
        
        openLogInModal() {
            this.closeSidebar();
            this.closeUserModal();
            this.isLogInModalOpen = true;
        },
        closeLogInModal(){
            this.isLogInModalOpen = false;
        },
        openRecoveryModal(){
            this.closeLogInModal();
            this.isRecoveryModalOpen = true;
        },
        closeRecoveryModal(){
            this.isRecoveryModalOpen = false;
        },
        submitUserForm() {
            const login = document.getElementById('user-login').value;
            const email = document.getElementById('user-email').value;
            const password = document.getElementById('user-password').value;
            const password_repeat = document.getElementById('user-password-repeat').value;
            let authorNickname = '';
            let AuthorVk = '';
            
            if (this.userType === 'merchant') {
                authorNickname = document.getElementById('author-nickname').value || '';
                AuthorVk = document.getElementById('author-vk').value || '';
            }

            if (password !== password_repeat) {
                this.showNotification('Пароли не совпадают!', 'error');
                return;
            }
        
            fetch('/SignUpUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Login: login,
                    Email: email,
                    Nickname: authorNickname || '',
                    VK: AuthorVk || '',
                    Password: password,
                }),                
            })
            .then(response => {
                if (!response.ok) {
                    this.showNotification('Ошибка регистрации. Проверьте введенные данные.', 'error');
                } else {
                    this.showNotification('Письмо с подтверждением отправлено на почту!', 'success');
                    this.closeUserModal();
                }
            })
            .catch(() => {
                this.showNotification('Ошибка соединения с сервером.', 'error');
            });
        },
        submitLogInForm() {
            const login = document.getElementById('auth-email-login-nickname').value;
            const password = document.getElementById('auth-password').value;
        
            fetch('/LogIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: login,
                    password: password,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    this.showNotification('Неверный логин или пароль.', 'error');
                } else {
                    this.showNotification('Вход выполнен!', 'success');
                    window.location.href = '/public/User.html';
                }
            })
            .catch(() => {
                this.showNotification('Ошибка сети при авторизации.', 'error');
            });
        },
        submitRecoveryForm() {
            const email = document.getElementById('RecoveryEmail').value;
            fetch('/Recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email }),
            })
            .then(response => {
                if (response.ok) {
                    this.showNotification('Инструкция отправлена на почту!', 'success');
                    this.closeRecoveryModal();
                } else {
                    this.showNotification('Пользователь с такой почтой не найден.', 'error');
                }
            })
            .catch(() => {
                this.showNotification('Ошибка сети.', 'error');
            });
        },
        initSlider() {
            const track = document.getElementById('sliderTrack');
            const cards = document.querySelectorAll('.testimonial-card');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if (!track || !cards.length || !prevBtn || !nextBtn) return;

            let currentIndex = 0;
            const totalCards = cards.length;

            function updateSlider() {
                const moveAmount = 100 * currentIndex;
                track.style.transform = `translateX(-${moveAmount}%)`;
                cards.forEach((card, index) => {
                    card.classList.toggle('active', index === currentIndex);
                });
            }

            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
                updateSlider();
            });

            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalCards - 1;
                updateSlider();
            });
        }
    }
});
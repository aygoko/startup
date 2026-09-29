// ====================================================================
// ВАЖНО: Замени этот IP на реальный IP-адрес твоего VPS сервера!
// ====================================================================
const API_URL = 'http://147.45.147.149:8080'; 

document.addEventListener('DOMContentLoaded', function() {
    const dropdownMenuToggle = document.getElementById('DropdownMenu');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    window.addEventListener('error', function(event) {
        console.warn('⚠️ Перехвачена глобальная ошибка:', event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.warn('⚠️ Перехвачена ошибка промиса:', event.reason);
        event.preventDefault();
    });

    if (dropdownMenuToggle && dropdownMenu) {
        let isCursorOnMenu = false;
        let isCursorOnButton = false;
        let closeTimeout;

        const bufferZone = document.createElement('div');
        bufferZone.style.position = 'absolute';
        bufferZone.style.width = '100%';
        bufferZone.style.height = '10px';
        bufferZone.style.bottom = '-10px';
        bufferZone.style.zIndex = '1000';
        dropdownMenuToggle.parentNode.insertBefore(bufferZone, dropdownMenu);

        dropdownMenuToggle.addEventListener('click', function(event) {
            event.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });

        dropdownMenuToggle.addEventListener('mouseenter', () => isCursorOnButton = true);
        dropdownMenuToggle.addEventListener('mouseleave', () => isCursorOnButton = false);
        bufferZone.addEventListener('mouseenter', () => isCursorOnButton = true);
        bufferZone.addEventListener('mouseleave', () => isCursorOnButton = false);
        dropdownMenu.addEventListener('mouseenter', () => isCursorOnMenu = true);
        dropdownMenu.addEventListener('mouseleave', () => isCursorOnMenu = false);

        document.addEventListener('mousemove', function() {
            clearTimeout(closeTimeout);
            if (!isCursorOnButton && !isCursorOnMenu && dropdownMenu.style.display === 'block') {
                closeTimeout = setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 25);
            }
        });

        document.addEventListener('click', function(event) {
            if (!dropdownMenu.contains(event.target) && 
                !dropdownMenuToggle.contains(event.target) && 
                !bufferZone.contains(event.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
    }

    const safeJsonParse = async (response) => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                return { success: false };
            }
            throw new Error(`HTTP ошибка: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return { success: false };
    };

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        // ИСПРАВЛЕНО: добавлен API_URL
        fetch(`${API_URL}/api/checkToken`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ token: token })
        })
        .then(safeJsonParse)
        .then(data => {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (data && data.success) {
                console.log("✅ Токен успешно подтвержден");
            } else {
                console.warn("⚠️ Токен просрочен или недействителен.");
            }
        })
        .catch(error => {
            console.warn("❌ Ошибка при проверке токена:", error);
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
});

// ==========================================================
// ИНИЦИАЛИЗАЦИЯ VUE
// ==========================================================
new Vue({
    el: '#app',
    data: {
        goods: [],
        circulationItems: [
            { image: "assets/картхолдер.png", name: "Картхолдеры", stock: 45, oldPrice: 150, newPrice: 120 },
            { image: "assets/наклейки.png", name: "Объёмные наклейки", stock: 32, oldPrice: 80, newPrice: 64 },
            { image: "assets/стенд.png", name: "Стенды с блёстками", stock: 32, oldPrice: 80, newPrice: 64 },
            { image: "assets/биндер.png", name: "Биндеры", stock: 32, oldPrice: 80, newPrice: 64 },
        ],
        isMouseDownOnModal: false,
        isMouseDownOnBackdrop: false,
        isUserModalOpen: false,
        userType: 'buyer',
        isLogInModalOpen: false,
        isPasswordVisible: false,
        isPassword2Visible: false,
        isPasswordLoginVisible: false,
        isRecoveryModalOpen: false,
        isAgreementModalOpen: false,
    },
    mounted() {
        this.fetchGoods();
    },
    methods: {
        fetchGoods() {
            // ИСПРАВЛЕНО: добавлен API_URL
            fetch(`${API_URL}/sofa/getgoods`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Ошибка: ${response.status} ${response.statusText} - ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                this.goods = data;
            })
            .catch(error => {
                console.error('Ошибка загрузки товаров:', error);
            });
        },          
        showNotification(message, type) {
            const container = document.getElementById('notifications');
            if (!container) return;
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerText = message;
            container.appendChild(notification);
            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
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
                if (this.isUserModalOpen) {
                    if(this.isAgreementModalOpen) {
                        this.closeAgreementModal();
                    } else {
                        this.closeUserModal();
                    }
                } else if (this.isLogInModalOpen) {
                    if(this.isRecoveryModalOpen) {
                        this.closeRecoveryModal();
                    } else {
                        this.closeLogInModal();
                    }
                }
            }
            this.isMouseDownOnBackdrop = false;
        },
        openAgreementModal() {
            this.isAgreementModalOpen = true;
        },
        closeAgreementModal(){
            this.isAgreementModalOpen = false;
        },
        openUserModal() {  
            this.isUserModalOpen = true;
        },
        selectUserType(type) {
            this.userType = type;
            const merchantButton = document.getElementById("merchantButton");
            const buyerButton = document.getElementById("buyerButton");
            if (type === 'buyer') {
                if(buyerButton) buyerButton.classList.add("selected");
                if(merchantButton) merchantButton.classList.remove("selected");
            }
            if (type === 'merchant') {
                if(merchantButton) merchantButton.classList.add("selected");
                if(buyerButton) buyerButton.classList.remove("selected");
            }
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
        
            // ИСПРАВЛЕНО: API_URL, credentials: 'include', и СТРОЧНЫЕ буквы в JSON!
            fetch(`${API_URL}/SignUpUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', 
                body: JSON.stringify({
                    login: login,        // Было Login
                    email: email,        // Было Email
                    password: password,  // Было Password
                    nickname: authorNickname || '',
                    vk: AuthorVk || '',
                }),                
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        if (text.includes('password is too weak') || text.includes('WeakPassword')) {
                            return this.showNotification('Пароль слишком слабый (мин. 8 символов, заглавная, строчная, цифра).', 'error');
                        } else if (text.includes('user already exists') || text.includes('UserAlreadyExists')) {
                            return this.showNotification('Пользователь с таким email или логином уже существует.', 'error');
                        } else if (text.includes('nickname already exists')) {
                            return this.showNotification('Этот никнейм уже занят.', 'error');
                        } else {
                            return this.showNotification(`Ошибка: ${text}`, 'error');
                        }
                    });
                } else {
                    this.showNotification('Подтвердите аккаунт в своем почтовом ящике!', 'success');
                    this.closeUserModal();
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка сети. Проверьте подключение.', 'error');
            });
        },
        closeUserModal(){
            this.isUserModalOpen = false;
        },
        openLogInModal() {
            this.closeUserModal();
            this.isLogInModalOpen = true;
            const signUpLogin = document.getElementById('user-login');
            const signUpEmail = document.getElementById('user-email');
            const signUpPassword = document.getElementById('user-password');
            const signUpPassword2 = document.getElementById('user-password-repeat');
        
            if (signUpLogin) signUpLogin.value = '';
            if (signUpEmail) signUpEmail.value = '';
            if (signUpPassword) signUpPassword.value = '';
            if (signUpPassword2) signUpPassword2.value = '';
        },
        submitLogInForm() {
            const login = document.getElementById('auth-email-login-nickname').value;
            const password = document.getElementById('auth-password').value;
        
            // ИСПРАВЛЕНО: API_URL и credentials: 'include'
            fetch(`${API_URL}/LogIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    login: login,
                    password: password,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        if (text.includes('UserNotFound') || text.includes('InvalidCredentials')) {
                            return this.showNotification('Неверный логин или пароль.', 'error');
                        } else if (text.includes('UserHasToken')) {
                            return this.showNotification('Аккаунт не подтвержден. Проверьте почту.', 'error');
                        } else if (text.includes('UserIsBanned')) {
                            return this.showNotification('Пользователь забанен.', 'error');
                        } else {
                            return this.showNotification(`Ошибка: ${text}`, 'error');
                        }
                    });
                } else {
                    this.showNotification('Вход выполнен успешно!', 'success');
                    window.location.href = '/public/User.html'; // Или `${API_URL}/public/User.html`
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка сети при входе.', 'error');
            });
        },
        closeLogInModal(){
            this.isLogInModalOpen = false;
        },
        openRecoveryModal(){
            this.isRecoveryModalOpen = true;
        },
        submitRecoveryForm(){
            const email = document.getElementById('RecoveryEmail').value;
            // ИСПРАВЛЕНО: API_URL и credentials: 'include'
            fetch(`${API_URL}/Recovery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        if (text.includes('UserNotFound')) {
                            return this.showNotification('Пользователь с такой почтой не найден.', 'error');
                        } else {
                            return this.showNotification(`Ошибка: ${text}`, 'error');
                        }
                    });
                } else {
                    this.showNotification('Письмо отправлено на почту!', 'success');
                    this.closeRecoveryModal();
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка сети.', 'error');
            });
        },
        closeRecoveryModal(){
            this.isRecoveryModalOpen = false;
        },
        togglePasswordVisibility() {
            this.isPasswordVisible = !this.isPasswordVisible;
        },
        togglePassword2Visibility() {
            this.isPassword2Visible = !this.isPassword2Visible;
        },
        togglePasswordLoginVisibility() {
            this.isPasswordLoginVisible = !this.isPasswordLoginVisible;
        },
    },
    watch: {
        isUserModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal');
                if (modal) modal.style.visibility = newValue ? 'visible' : 'hidden'; 
            });
        },
        isLogInModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal');
                if (modal) modal.style.visibility = newValue ? 'visible' : 'hidden'; 
            });
        },
        isRecoveryModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal-recovery');
                if (modal) modal.style.visibility = newValue ? 'visible' : 'hidden'; 
            });
        },
        isAgreementModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal-agreement');
                if (modal) modal.style.visibility = newValue ? 'visible' : 'hidden'; 
            });
        }
    }
});
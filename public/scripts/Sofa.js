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

    // Глобальный перехватчик необработанных ошибок
    window.addEventListener('error', function(event) {
        console.warn('⚠️ Перехвачена глобальная ошибка:', event.error);
    });

    // Перехватчик ошибок промисов
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

    // Безопасная проверка авторизации
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
        fetch('/api/checkToken', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
// ИНИЦИАЛИЗАЦИЯ VUE (ЭТО ТО, ЧЕГО НЕ ХВАТАЛО!)
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
            fetch('/sofa/getgoods')
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
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerText = message;

            document.getElementById('notifications').appendChild(notification);
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
                buyerButton.classList.add("selected");
                merchantButton.classList.remove("selected");
            }
            if (type === 'merchant') {
                merchantButton.classList.add("selected");
                buyerButton.classList.remove("selected");
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
                    return response.text().then(text => {
                        if (text.includes('PasswordIsTooWeak')) {
                            return this.showNotification('Пароль слишком слабый.', 'error');
                        } else if (text.includes('UserAlreadyExistsWithEmailAndNoToken')) {
                            return this.showNotification('Пользователь с таким email уже существует.', 'error');
                        } else if (text.includes('UserAlreadyExistsWithEmailAndHasToken')) {
                            return this.showNotification('На эту почту уже отправлена ссылка на подтверждение.', 'error');
                        } else if (text.includes('UserAlreadyExistsWithLogin')) {
                            return this.showNotification('Это имя пользователя уже занято.', 'error');
                        } else if (text.includes('NicknameAlreadyExists')) {
                            return this.showNotification('Этот никнейм уже занят.', 'error');
                        } else if (text.includes('AuthorVkAlreadyExists')) {
                            return this.showNotification('Эта ссылка на VK уже занята.', 'error');
                        } else if (text.includes('UserAlreadySignUp')) {
                            return this.showNotification('Пользователь уже зарегистрирован на сайте.', 'error');
                        } else if (text.includes('Badrequest')) {
                            return this.showNotification('Ошибка базы данных. Попробуйте позже.', 'error');
                        } else if (text.includes('InternalServerError')) {
                            return this.showNotification('Ошибка сервера. Попробуйте позже.', 'error');
                        } else {
                            return this.showNotification('Неизвестная ошибка. Попробуйте снова.', 'error');
                        }
                    });
                } else {
                    this.showNotification('Подтвердите аккаунт в своем почтовом ящике!', 'success');
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка регистрации. Попробуйте еще раз.', 'error');
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
                    return response.text().then(text => {
                        if (text.includes('UserNotFound')) {
                            return this.showNotification('Пользователь не найден.', 'error');
                        } else if (text.includes('UserHasToken')) {
                            return this.showNotification('Аккаунт на подтверждении.', 'error');
                        } else if (text.includes('UserHasRecoveryToken')) {
                            return this.showNotification('Аккаунт на восстановлении.', 'error');
                        } else if (text.includes('UserIsBanned')) {
                            return this.showNotification('Пользователь забанен.', 'error');
                        } else if (text.includes('InvalidCredentials')) {
                            return this.showNotification('Неверный пароль.', 'error');
                        } else if (text.includes('InternalServerError')) {
                            return this.showNotification('Ошибка сервера!', 'error');
                        } else if (text.includes('Bad request')) {
                            return this.showNotification('Плохое соединение!', 'error');
                        } else {
                            return this.showNotification('Неизвестная ошибка. Попробуйте снова.', 'error');
                        }
                    });
                } else {
                    this.showNotification('Вход выполнен успешно!', 'success');
                    window.location.href = '/public/User.html';
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка входа. Попробуйте еще раз.', 'error');
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
            fetch('/Recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        if (text.includes('UserNotFound')) {
                            return this.showNotification('Пользователь не найден.', 'error');
                        } else if (text.includes('UserIsBanned')) {
                            return this.showNotification('Пользователь забанен.', 'error');
                        } else if (text.includes('UserHasToken')) {
                            return this.showNotification('Аккаунт на подтверждении, проверьте почту.', 'error');
                        } else if (text.includes('UserHasRecoveryToken')) {
                            return this.showNotification('Аккаунт на восстановлении, проверьте почту.', 'error');
                        } else if (text.includes('InternalServerError')) {
                            return this.showNotification('Ошибка сервера!', 'error');
                        } else if (text.includes('Bad request')) {
                            return this.showNotification('Плохое соединение!', 'error');
                        } else {
                            return this.showNotification('Неизвестная ошибка. Попробуйте снова.', 'error');
                        }
                    });
                } else {
                    this.showNotification('Письмо с ссылкой на восстановление пароля отправлено!.', 'success');
                    this.closeRecoveryModal();
                }
            })
            .catch((error) => {
                console.error('Ошибка:', error);
                this.showNotification('Ошибка входа. Попробуйте еще раз.', 'error');
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
                if (modal) {
                    modal.style.visibility = newValue ? 'visible' : 'hidden'; 
                }
            });
        },
        isLogInModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal');
                if (modal) {
                    modal.style.visibility = newValue ? 'visible' : 'hidden'; 
                }
            });
        },
        isRecoveryModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal-recovery');
                if (modal) {
                    modal.style.visibility = newValue ? 'visible' : 'hidden'; 
                }
            });
        },
        isAgreementModalOpen(newValue) {
            this.$nextTick(() => {
                const modal = document.querySelector('.modal-agreement');
                if (modal) {
                    modal.style.visibility = newValue ? 'visible' : 'hidden'; 
                }
            });
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('sliderTrack');
    const cards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!track || !cards.length || !prevBtn || !nextBtn) return; // Защита от ошибок, если элементов нет

    let currentIndex = 0;
    const totalCards = cards.length;

    function updateSlider() {
        const cardWidth = cards[0].offsetWidth;
        const gap = 30; 
        const moveAmount = (cardWidth + gap) * currentIndex;
        
        track.style.transform = `translateX(-${moveAmount}px)`;

        cards.forEach((card, index) => {
            if (index === currentIndex) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    nextBtn.addEventListener('click', () => {
        if (currentIndex < totalCards - 1) {
            currentIndex++;
        } else {
            currentIndex = 0;
        }
        updateSlider();
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = totalCards - 1;
        }
        updateSlider();
    });

    updateSlider();
    window.addEventListener('resize', updateSlider);
});
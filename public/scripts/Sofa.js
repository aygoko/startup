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

    // Глобальный перехватчик необработанных ошибок, чтобы страница не "падала" молча
    window.addEventListener('error', function(event) {
        console.warn('⚠️ Перехвачена глобальная ошибка (возможно, из-за расширения браузера):', event.error);
    });

    // Перехватчик ошибок промисов (например, неудачных fetch)
    window.addEventListener('unhandledrejection', function(event) {
        console.warn('⚠️ Перехвачена ошибка промиса (сетевой запрос заблокирован):', event.reason);
        event.preventDefault(); // Предотвращаем вывод красной ошибки в консоль и остановку скриптов
    });

    if (dropdownMenuToggle && dropdownMenu) {
        let isCursorOnMenu = false;
        let isCursorOnButton = false;
        let closeTimeout;

        // Создаем буферный элемент (программно)
        const bufferZone = document.createElement('div');
        bufferZone.style.position = 'absolute';
        bufferZone.style.width = '100%';
        bufferZone.style.height = '10px'; // Высота буферной зоны
        bufferZone.style.bottom = '-10px'; // Располагаем под кнопкой
        bufferZone.style.zIndex = '1000';
        dropdownMenuToggle.parentNode.insertBefore(bufferZone, dropdownMenu);

        // Открытие/закрытие меню
        dropdownMenuToggle.addEventListener('click', function(event) {
            event.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });

        // Отслеживание позиции курсора
        dropdownMenuToggle.addEventListener('mouseenter', () => isCursorOnButton = true);
        dropdownMenuToggle.addEventListener('mouseleave', () => isCursorOnButton = false);
        bufferZone.addEventListener('mouseenter', () => isCursorOnButton = true);
        bufferZone.addEventListener('mouseleave', () => isCursorOnButton = false);
        dropdownMenu.addEventListener('mouseenter', () => isCursorOnMenu = true);
        dropdownMenu.addEventListener('mouseleave', () => isCursorOnMenu = false);

        // Проверка положения курсора
        document.addEventListener('mousemove', function() {
            clearTimeout(closeTimeout);
            
            if (!isCursorOnButton && !isCursorOnMenu && dropdownMenu.style.display === 'block') {
                closeTimeout = setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 25); // Задержка перед закрытием
            }
        });

        // Закрытие при клике вне области
        document.addEventListener('click', function(event) {
            if (!dropdownMenu.contains(event.target) && 
                !dropdownMenuToggle.contains(event.target) && 
                !bufferZone.contains(event.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
    }

    // ==========================================================
    // БЕЗОПАСНАЯ ПРОВЕРКА АВТОРИЗАЦИИ (Исправленная версия)
    // ==========================================================
    
    // Вспомогательная функция: безопасно читает JSON, даже если пришла ошибка 401/403 или HTML
    const safeJsonParse = async (response) => {
        if (!response.ok) {
            // 401 и 403 для нас не фатальные ошибки, это просто значит "пользователь не вошел"
            if (response.status === 401 || response.status === 403) {
                return { success: false };
            }
            throw new Error(`HTTP ошибка: ${response.status}`);
        }
        // Проверяем, что сервер действительно вернул JSON, а не HTML страницу ошибки
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        return { success: false }; // Если пришел не JSON, считаем что авторизации нет
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
            // В ЛЮБОМ случае очищаем URL от ?token=..., чтобы избежать цикла перезагрузок
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (data && data.success) {
                console.log("✅ Токен успешно подтвержден");
                // Можно добавить вызов уведомления Vue здесь, если нужно
            } else {
                console.warn("⚠️ Токен просрочен или недействителен.");
            }
        })
        .catch(error => {
            console.warn("❌ Ошибка при проверке токена (игнорируем, чтобы не ломать страницу):", error);
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    } 
    // else {
    //     fetch('/api/checkCookie')
    //     .then(safeJsonParse)
    //     .then(data => {
    //         if (data && data.success) {
    //             // Только если УСПЕШНО авторизован, делаем редирект
    //             window.location.href = "/public/User.html";
    //         } else {
    //             // Если 401 или success=false, мы просто остаемся на Sofa.html. 
    //             // Никаких редиректов, никаких ошибок. Vue спокойно отрисует страницу.
    //             console.log("ℹ️ Пользователь не авторизован, показываем главную страницу");
    //         }
    //     })
    //     .catch(error => {
    //         console.warn("❌ Ошибка проверки сессии (игнорируем, остаемся на главной):", error);
    //     });
    // }
});
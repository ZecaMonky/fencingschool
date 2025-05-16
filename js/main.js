document.addEventListener('DOMContentLoaded', function() {
    // Обработка кнопки "Записаться" в хедере
    const headerBtn = document.querySelector('.header .btn--primary');
    headerBtn.addEventListener('click', function() {
        const contactSection = document.getElementById('contact');
        contactSection.scrollIntoView({ behavior: 'smooth' });
    });

    // Обработка кнопок "Подробнее"
    const styleCards = document.querySelectorAll('.style-card');
    
    styleCards.forEach(card => {
        const btn = card.querySelector('.btn--secondary');
        if (btn) {
            btn.addEventListener('click', function() {
                const styleName = card.querySelector('.style-card__title').textContent;
                // Здесь можно добавить логику перехода на страницу с подробной информацией
                console.log(`Запрошена подробная информация о стиле: ${styleName}`);
            });
        }
    });

    // --- БУРГЕР-МЕНЮ ---
    const burgerBtn = document.getElementById('burgerBtn');
    const navList = document.getElementById('navList');
    if (burgerBtn && navList) {
        burgerBtn.addEventListener('click', function() {
            navList.classList.toggle('open');
            document.body.style.overflow = navList.classList.contains('open') ? 'hidden' : '';
        });
        // При клике по ссылке в меню на мобиле — закрывать меню
        navList.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 900) {
                    navList.classList.remove('open');
                    document.body.style.overflow = '';
                }
            });
        });
    }
});

// Функция для выхода из системы
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Ошибка при выходе из системы');
        }
    } catch (error) {
        console.error('Ошибка при выходе из системы:', error);
    }
}

window.showToast = function(message, type = 'info', timeout = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.className = 'toast ' + type;
    }, timeout);
}; 
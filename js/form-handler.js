document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('contactForm');
    const dateInput = document.getElementById('scheduleDate');
    const timeSelect = document.getElementById('scheduleTime');
    
    // Проверяем наличие формы и необходимых элементов
    if (!form || !dateInput || !timeSelect) {
        console.error('Не найдены необходимые элементы формы');
        return;
    }

    // Устанавливаем минимальную дату (сегодня)
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    dateInput.min = minDate;
    
    // Устанавливаем максимальную дату (через 2 недели)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    dateInput.max = maxDate.toISOString().split('T')[0];

    if (!form) {
        console.error('Форма не найдена');
        return;
    }

    // Маска для телефона
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let x = e.target.value.replace(/\D/g, '')
                           .match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '+7 (' + x[2] + ') ' + (x[3] ? x[3] + '-' : '') + x[4];
    });

    // Загружаем доступные дни
    try {
        const response = await fetch('/api/schedule/days');
        const days = await response.json();
        
        dateInput.innerHTML = `
            <option value="">Выберите день</option>
            ${days.map(day => `<option value="${day}">${day}</option>`).join('')}
        `;
    } catch (error) {
        console.error('Ошибка при загрузке дней:', error);
    }

    // После выбора даты подгружаем времена
    dateInput.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        if (!selectedDate) {
            timeSelect.innerHTML = '<option value="">Выберите время</option>';
            timeSelect.disabled = true;
            return;
        }
        try {
            const response = await fetch(`/api/schedule/times/${selectedDate}`);
            const times = await response.json();
            timeSelect.innerHTML = '<option value="">Выберите время</option>';
            if (Array.isArray(times) && times.length > 0) {
                times.forEach(item => {
                    const time = item.time || item;
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeSelect.appendChild(option);
                });
                timeSelect.disabled = false;
            } else {
                timeSelect.innerHTML = '<option value="">Нет доступного времени</option>';
                timeSelect.disabled = true;
            }
        } catch (error) {
            console.error('Ошибка при загрузке времени:', error);
            timeSelect.innerHTML = '<option value="">Ошибка загрузки времени</option>';
            timeSelect.disabled = true;
        }
    });

    // Обработка отправки формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Сначала проверяем авторизацию
            const authResponse = await fetch('/api/check-auth', {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            
            if (!authData.isAuthenticated) {
                window.location.href = '/login';
                return;
            }

            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                schedule_date: formData.get('scheduleDate'),
                schedule_time: formData.get('scheduleTime'),
                message: formData.get('message')
            };

            // Преобразуем дату в формат YYYY-MM-DD
            if (data.schedule_date) {
                const date = new Date(data.schedule_date);
                data.schedule_date = date.toISOString().split('T')[0];
            }

            console.log('Отправляемые данные:', data);

            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Ответ сервера:', result);

            if (result.success) {
                showToast('Спасибо! Ваша заявка успешно отправлена.', 'success');
                form.reset();
            } else {
                throw new Error(result.error || 'Произошла ошибка при отправке формы');
            }

        } catch (error) {
            console.error('Ошибка:', error);
            if (error.message.includes('<!DOCTYPE')) {
                window.location.href = '/login';
                return;
            }
            showToast('Произошла ошибка при отправке формы. Пожалуйста, попробуйте позже.', 'error');
        }
    });

    // Изначально отключаем выбор времени
    timeSelect.disabled = true;

    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message form-message--${type}`;
        messageDiv.textContent = message;
        
        // Удаляем предыдущее сообщение, если оно есть
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        form.appendChild(messageDiv);
        
        // Удаляем сообщение через 5 секунд
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}); 
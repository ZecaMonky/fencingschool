document.addEventListener('DOMContentLoaded', async () => {
    const applicationsList = document.getElementById('applicationsList');

    async function loadUserApplications() {
        try {
            // Загружаем информацию о пользователе
            const userResponse = await fetch('/api/user/info');
            const userData = await userResponse.json();
            
            if (userData && userData.username) {
                const username = document.querySelector('.username');
                username.textContent = userData.username;
            }

            // Загружаем записи пользователя
            const response = await fetch('/api/applications/user');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const applications = await response.json();
            console.log('Полученные записи в профиле:', applications);

            if (!Array.isArray(applications) || applications.length === 0) {
                applicationsList.innerHTML = '<p class="no-applications">У вас пока нет записей на тренировки</p>';
                return;
            }

            applicationsList.innerHTML = applications.map(app => `
                <div class="application-item">
                    <h3>Запись на тренировку</h3>
                    <div class="application-info">
                        <p>Имя: ${app.name}</p>
                        <p>Телефон: ${app.phone}</p>
                        <p>Email: ${app.email}</p>
                        <p>Дата: ${app.schedule_date || 'Не указана'}</p>
                        <p>Время: ${app.schedule_time || 'Не указано'}</p>
                        ${app.message ? `<p>Сообщение: ${app.message}</p>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            applicationsList.innerHTML = '<p class="error-message">Произошла ошибка при загрузке данных</p>';
        }
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': 'В обработке',
            'approved': 'Подтверждено',
            'rejected': 'Отклонено',
            'completed': 'Завершено'
        };
        return statusMap[status] || 'В обработке';
    }

    // Загружаем данные при загрузке страницы
    loadUserApplications();
});

document.addEventListener('DOMContentLoaded', function() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const profileForm = document.getElementById('profileForm');
    const messageDiv = document.getElementById('message');

    // Показать форму редактирования
    editProfileBtn.addEventListener('click', function() {
        profileForm.classList.add('active');
        editProfileBtn.style.display = 'none';
    });

    // Скрыть форму редактирования
    cancelEditBtn.addEventListener('click', function() {
        profileForm.classList.remove('active');
        editProfileBtn.style.display = 'block';
        profileForm.reset();
        messageDiv.className = '';
        messageDiv.textContent = '';
    });

    // Обработка отправки формы
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newUsername = document.getElementById('newUsername').value;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Валидация логина
        if (newUsername && (!/^([A-Za-z0-9_]{4,})$/.test(newUsername) || !newUsername.includes('_'))) {
            showMessage('Имя пользователя должно быть не короче 4 символов, содержать только латиницу, цифры и обязательно символ _', 'error');
            return;
        }
        // Валидация пароля (если меняется)
        if (newPassword) {
            if (newPassword.length < 8 ||
                !/[A-Za-z]/.test(newPassword) ||
                !/[0-9]/.test(newPassword) ||
                (!/[^A-Za-z0-9]/.test(newPassword.replace('_','')) && !newPassword.includes('_'))
            ) {
                showMessage('Пароль должен быть не короче 8 символов, содержать буквы, цифры и хотя бы один спецсимвол (например, _)!', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showMessage('Новые пароли не совпадают', 'error');
                return;
            }
        }

        try {
            const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUsername,
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Профиль успешно обновлен', 'success');
                // Обновляем отображаемое имя пользователя
                document.querySelector('.profile-username').textContent = newUsername;
                // Скрываем форму через 2 секунды
                setTimeout(() => {
                    profileForm.classList.remove('active');
                    editProfileBtn.style.display = 'block';
                    profileForm.reset();
                }, 2000);
            } else {
                showMessage(data.error || 'Ошибка при обновлении профиля', 'error');
            }
        } catch (error) {
            showMessage('Ошибка при обновлении профиля', 'error');
        }
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }
}); 
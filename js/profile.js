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
                        <p>Дата: ${app.scheduleDate || 'Не указана'}</p>
                        <p>Время: ${app.scheduleTime || 'Не указано'}</p>
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
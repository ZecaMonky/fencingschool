document.addEventListener('DOMContentLoaded', async () => {
    // Сначала проверяем права администратора
    try {
        const authResponse = await fetch('/api/check-auth');
        const authData = await authResponse.json();
        
        if (!authData.isAdmin) {
            window.location.href = '/login';
            return;
        }
        
        loadApplications();
        loadGallery();
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
        window.location.href = '/login';
    }
});

async function loadApplications() {
    try {
        console.log('Начало загрузки записей');
        const response = await fetch('/api/applications', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const applications = await response.json();
        console.log('Полученные записи в админке:', applications);
        
        const applicationsList = document.getElementById('applicationsList');
        if (!applicationsList) {
            console.error('Элемент applicationsList не найден!');
            return;
        }
        
        if (!Array.isArray(applications) || applications.length === 0) {
            applicationsList.innerHTML = '<p>Нет записей</p>';
            return;
        }

        applicationsList.innerHTML = applications.map(app => `
            <div class="application-item">
                <h3>${app.name || 'Без имени'}</h3>
                <div class="application-info">
                    <p>Телефон: ${app.phone || 'Не указан'}</p>
                    <p>Email: ${app.email || 'Не указан'}</p>
                    <p>Дата: ${app.schedule_date || 'Не указана'}</p>
                    <p>Время: ${app.schedule_time || 'Не указано'}</p>
                    <p>Сообщение: ${app.message || 'Нет сообщения'}</p>
                    <p>Статус: ${getStatusText(app.status)}</p>
                </div>
                <div class="application-actions">
                    <button onclick="deleteApplication(${app.id})" class="btn btn--danger">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке записей:', error);
        const applicationsList = document.getElementById('applicationsList');
        if (applicationsList) {
            applicationsList.innerHTML = '<p class="error-message">Ошибка при загрузке записей</p>';
        }
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

async function deleteApplication(id) {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
    }

    try {
        const response = await fetch(`/api/applications/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await loadApplications(); // Перезагружаем список после удаления
    } catch (error) {
        console.error('Ошибка при удалении записи:', error);
        alert('Ошибка при удалении записи');
    }
}

// Функция загрузки тренеров
async function loadTrainers() {
    console.log('Начало загрузки тренеров...');
    
    try {
        const response = await fetch('/api/trainers');
        console.log('Ответ от сервера:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const trainers = await response.json();
        console.log('Полученные данные тренеров:', trainers);
        
        const trainersList = document.getElementById('trainersList');
        if (!trainersList) {
            console.error('Элемент trainersList не найден!');
            return;
        }
        
        if (trainers.length === 0) {
            trainersList.innerHTML = '<p class="no-trainers">Тренеры пока не добавлены</p>';
            return;
        }
        
        trainersList.innerHTML = trainers.map(trainer => `
            <div class="trainer-item">
                <div class="photo-container">
                    ${trainer.image_url 
                        ? `<img src="${trainer.image_url}" alt="${trainer.name}">`
                        : '<div class="trainer-no-image">Нет фото</div>'
                    }
                </div>
                <div class="trainer-info">
                    <h3>${trainer.name}</h3>
                    <p>${trainer.description}</p>
                </div>
                <div class="trainer-actions">
                    <button class="delete-btn" onclick="deleteTrainer(${trainer.id})">Удалить</button>
                </div>
            </div>
        `).join('');
        
        console.log('Тренеры успешно отрендерены');
    } catch (error) {
        console.error('Ошибка при загрузке тренеров:', error);
        const trainersList = document.getElementById('trainersList');
        if (trainersList) {
            trainersList.innerHTML = '<p class="error-message">Ошибка при загрузке тренеров</p>';
        }
    }
}

// Функция удаления тренера
async function deleteTrainer(id) {
    if (!confirm('Вы уверены, что хотите удалить этого тренера?')) {
        return;
    }

    try {
        const response = await fetch(`/api/trainers/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTrainers(); // Перезагружаем список после удаления
            console.log('Тренер успешно удален'); // Отладочный лог
        } else {
            const data = await response.json();
            alert(data.error || 'Ошибка при удалении тренера');
        }
    } catch (error) {
        console.error('Ошибка при удалении тренера:', error);
        alert('Ошибка при удалении тренера');
    }
}

// Обработчик формы добавления тренера
document.getElementById('trainerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Отправка формы...');

    const formData = new FormData(e.target);
    
    // Проверяем данные перед отправкой
    console.log('Данные формы:');
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }

    try {
        const response = await fetch('/api/trainers', {
            method: 'POST',
            body: formData
        });

        console.log('Статус ответа:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при добавлении тренера');
        }

        const result = await response.json();
        console.log('Тренер успешно добавлен');
        
        // Очищаем форму
        e.target.reset();
        
        // Перезагружаем список тренеров
        await loadTrainers();
    } catch (error) {
        console.error('Ошибка при добавлении тренера:', error);
        alert('Ошибка при добавлении тренера: ' + error.message);
    }
});

// Делаем функции доступными глобально
window.deleteTrainer = deleteTrainer;

// Функция загрузки галереи
async function loadGallery() {
    try {
        const response = await fetch('/api/gallery');
        const galleryItems = await response.json();
        
        const galleryList = document.getElementById('galleryList');
        if (!galleryList) {
            console.error('Элемент galleryList не найден!');
            return;
        }
        
        galleryList.innerHTML = galleryItems.map(item => `
            <div class="media-item">
                ${item.type === 'image' 
                    ? `<div class="photo-container"><img src="${item.url}" alt="${item.title}"></div>`
                    : `<video src="${item.url}" controls></video>`
                }
                <div class="media-info">
                    <h3>${item.title}</h3>
                    <p>${item.description || ''}</p>
                </div>
                <div class="media-actions">
                    <button onclick="deleteGalleryItem(${item.id})" class="delete-btn">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке галереи:', error);
        const galleryList = document.getElementById('galleryList');
        if (galleryList) {
            galleryList.innerHTML = '<p class="error-message">Ошибка при загрузке галереи</p>';
        }
    }
}

// Функция удаления элемента галереи
async function deleteGalleryItem(id) {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) {
        return;
    }

    try {
        console.log('Попытка удаления элемента с ID:', id);
        const response = await fetch(`/api/gallery/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        console.log('Элемент успешно удален');
        await loadGallery(); // Перезагружаем галерею после удаления
    } catch (error) {
        console.error('Ошибка при удалении элемента:', error);
        alert(`Ошибка при удалении элемента: ${error.message}`);
    }
}

// Обработчик формы добавления в галерею
document.getElementById('galleryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Отправка формы галереи...');
    
    const formData = new FormData(e.target);
    
    // Проверим данные формы
    for (let [key, value] of formData.entries()) {
        console.log(key, value);
    }
    
    try {
        const response = await fetch('/api/gallery/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Результат загрузки:', result);
        
        if (result.success) {
            e.target.reset();
            await loadGallery();
        }
    } catch (error) {
        console.error('Ошибка при добавлении элемента:', error);
        alert('Ошибка при добавлении элемента');
    }
});

// Делаем функции доступными глобально
window.deleteGalleryItem = deleteGalleryItem;

// Функция загрузки пользователей
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        const usersList = document.getElementById('usersList');
        
        if (!usersList) {
            console.error('Элемент usersList не найден!');
            return;
        }
        
        if (!Array.isArray(users) || users.length === 0) {
            usersList.innerHTML = '<p>Нет пользователей</p>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${user.username}</h3>
                    <p>ID: ${user.id}</p>
                </div>
                <div class="user-actions">
                    <button 
                        onclick="toggleUserRole(${user.id}, ${!user.is_admin})"
                        class="role-toggle ${user.is_admin ? 'admin' : 'user'}"
                    >
                        ${user.is_admin ? 'Администратор' : 'Пользователь'}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        alert('Ошибка при загрузке пользователей');
    }
}

// Функция изменения роли пользователя
async function toggleUserRole(userId, isAdmin) {
    try {
        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isAdmin }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await loadUsers();
    } catch (error) {
        console.error('Ошибка при изменении роли пользователя:', error);
        alert('Ошибка при изменении роли пользователя');
    }
}

// Добавляем обработчик переключения секций
document.addEventListener('DOMContentLoaded', () => {
    const sections = {
        applications: document.getElementById('applicationsSection'),
        trainers: document.getElementById('trainersSection'),
        gallery: document.getElementById('gallerySection'),
        users: document.getElementById('usersSection')
    };

    // Показываем секцию заявок по умолчанию
    sections.applications.style.display = 'block';

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sectionName = this.dataset.section;
            
            // Убираем активный класс у всех кнопок
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            // Добавляем активный класс текущей кнопке
            this.classList.add('active');
            
            // Скрываем все секции
            Object.values(sections).forEach(section => {
                if (section) section.style.display = 'none';
            });
            
            // Показываем выбранную секцию
            if (sections[sectionName]) {
                sections[sectionName].style.display = 'block';
                
                // Загружаем данные для соответствующей секции
                if (sectionName === 'applications') {
                    loadApplications();
                } else if (sectionName === 'trainers') {
                    loadTrainers();
                } else if (sectionName === 'gallery') {
                    loadGallery();
                } else if (sectionName === 'users') {
                    loadUsers();
                }
            }
        });
    });

    // Активируем первую кнопку по умолчанию
    document.querySelector('.nav-btn').classList.add('active');
});
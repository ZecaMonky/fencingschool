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
        loadPages();
        loadMainBlocks();
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
                    : item.url.includes('youtube.com') || item.url.includes('youtu.be')
                        ? `<div class="video-container"><iframe width="100%" height="100%" style="position:absolute;top:0;left:0;" src="${item.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}" frameborder="0" allowfullscreen></iframe></div>`
                        : item.url.includes('rutube.ru')
                            ? `<div class="video-container"><iframe width="100%" height="100%" style="position:absolute;top:0;left:0;" src="${item.url.replace('/video/', '/play/embed/').replace(/\/$/, '')}" frameborder="0" allowfullscreen></iframe></div>`
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
        users: document.getElementById('usersSection'),
        pages: document.getElementById('pagesSection'),
        mainblocks: document.getElementById('mainBlocksSection')
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
                } else if (sectionName === 'pages') {
                    loadPages();
                } else if (sectionName === 'mainblocks') {
                    loadMainBlocks();
                }
            }
        });
    });

    // Активируем первую кнопку по умолчанию
    document.querySelector('.nav-btn').classList.add('active');
});

// ====== СТРАНИЦЫ (CMS) ======

// Инициализация TinyMCE для поля контента страницы
if (typeof tinymce !== 'undefined') {
    tinymce.init({
        selector: '#pageContent',
        height: 300,
        menubar: false,
        plugins: 'link image lists code',
        toolbar: 'undo redo | bold italic underline | bullist numlist | link image | code',
        language: 'ru',
        branding: false
    });
}

async function loadPages() {
    try {
        const response = await fetch('/api/pages', { credentials: 'include' });
        if (!response.ok) throw new Error('Ошибка загрузки страниц');
        const pages = await response.json();
        const pagesList = document.getElementById('pagesList');
        if (!pagesList) return;
        if (!Array.isArray(pages) || pages.length === 0) {
            pagesList.innerHTML = '<p>Нет страниц</p>';
            return;
        }
        pagesList.innerHTML = pages.map(page => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${page.title} <span style="color:#888;font-size:0.9em;">(${page.slug})</span></h3>
                    <p>Обновлено: ${page.updated_at ? new Date(page.updated_at).toLocaleString() : ''}</p>
                </div>
                <div class="user-actions">
                    <button onclick="editPage('${page.slug}')" class="role-toggle admin">Редактировать</button>
                    <button onclick="deletePage('${page.slug}')" class="role-toggle user">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке страниц:', error);
        const pagesList = document.getElementById('pagesList');
        if (pagesList) pagesList.innerHTML = '<p class="error-message">Ошибка при загрузке страниц</p>';
    }
}

// Редактирование страницы
window.editPage = async function(slug) {
    try {
        const response = await fetch(`/api/pages/${slug}`);
        if (!response.ok) throw new Error('Ошибка загрузки страницы');
        const page = await response.json();
        const slugSelect = document.getElementById('pageSlugSelect');
        const slugInput = document.getElementById('pageSlug');
        if (slugSelect && slugInput) {
            if (["about","contact","main"].includes(page.slug)) {
                slugSelect.value = page.slug;
                slugInput.style.display = 'none';
                slugInput.value = page.slug;
            } else {
                slugSelect.value = 'custom';
                slugInput.style.display = '';
                slugInput.value = page.slug;
            }
        }
        document.getElementById('pageTitle').value = page.title;
        if (tinymce.get('pageContent')) {
            tinymce.get('pageContent').setContent(page.content || '');
        } else {
            document.getElementById('pageContent').value = page.content || '';
        }
    } catch (error) {
        alert('Ошибка при загрузке страницы');
    }
};

// Удаление страницы
window.deletePage = async function(slug) {
    if (!confirm('Удалить страницу?')) return;
    try {
        const response = await fetch(`/api/pages/${slug}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        await loadPages();
    } catch (error) {
        alert('Ошибка при удалении страницы');
    }
};

// Сброс формы
const resetPageFormBtn = document.getElementById('resetPageForm');
if (resetPageFormBtn) {
    resetPageFormBtn.addEventListener('click', function() {
        document.getElementById('pageForm').reset();
        if (tinymce.get('pageContent')) tinymce.get('pageContent').setContent('');
    });
}

// Сохранение страницы
const pageForm = document.getElementById('pageForm');
if (pageForm) {
    pageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const slugSelect = document.getElementById('pageSlugSelect');
        const slugInput = document.getElementById('pageSlug');
        let slug = '';
        if (slugSelect.value === 'custom') {
            slug = slugInput.value.trim();
        } else {
            slug = slugSelect.value;
        }
        const title = document.getElementById('pageTitle').value.trim();
        const content = tinymce.get('pageContent') ? tinymce.get('pageContent').getContent() : document.getElementById('pageContent').value;
        try {
            const response = await fetch('/api/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, title, content }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                alert('Страница сохранена');
                pageForm.reset();
                if (tinymce.get('pageContent')) tinymce.get('pageContent').setContent('');
                // Сбросить select и input
                if (slugSelect) slugSelect.value = 'about';
                if (slugInput) slugInput.value = 'about';
                if (slugInput) slugInput.style.display = 'none';
                await loadPages();
            } else {
                alert(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            alert('Ошибка при сохранении страницы');
        }
    });
}

// ====== БЛОКИ ГЛАВНОЙ (main blocks) ======

// Инициализация TinyMCE для блока главной
if (typeof tinymce !== 'undefined') {
    tinymce.init({
        selector: '#mainBlockContent',
        height: 250,
        menubar: false,
        plugins: 'link image lists code',
        toolbar: 'undo redo | bold italic underline | bullist numlist | link image | code',
        language: 'ru',
        branding: false
    });
}

async function loadMainBlocks() {
    try {
        const response = await fetch('/api/main-blocks', { credentials: 'include' });
        if (!response.ok) throw new Error('Ошибка загрузки блоков');
        const blocks = await response.json();
        const mainBlocksList = document.getElementById('mainBlocksList');
        if (!mainBlocksList) return;
        if (!Array.isArray(blocks) || blocks.length === 0) {
            mainBlocksList.innerHTML = '<p>Нет блоков</p>';
            return;
        }
        mainBlocksList.innerHTML = blocks.map(block => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${block.title} <span style="color:#888;font-size:0.9em;">(${block.block_type})</span></h3>
                    <p>Позиция: ${block.position} | ${block.visible ? 'Видим' : 'Скрыт'}</p>
                </div>
                <div class="user-actions">
                    <button onclick="editMainBlock(${block.id})" class="role-toggle admin">Редактировать</button>
                    <button onclick="deleteMainBlock(${block.id})" class="role-toggle user">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке блоков:', error);
        const mainBlocksList = document.getElementById('mainBlocksList');
        if (mainBlocksList) mainBlocksList.innerHTML = '<p class="error-message">Ошибка при загрузке блоков</p>';
    }
}

// Редактирование блока
window.editMainBlock = async function(id) {
    try {
        const response = await fetch(`/api/main-blocks/${id}`);
        if (!response.ok) throw new Error('Ошибка загрузки блока');
        const block = await response.json();
        document.getElementById('mainBlockId').value = block.id;
        document.getElementById('mainBlockType').value = block.block_type;
        document.getElementById('mainBlockTitle').value = block.title;
        document.getElementById('mainBlockPosition').value = block.position;
        document.getElementById('mainBlockVisible').checked = !!block.visible;
        if (tinymce.get('mainBlockContent')) {
            tinymce.get('mainBlockContent').setContent(block.content || '');
        } else {
            document.getElementById('mainBlockContent').value = block.content || '';
        }
    } catch (error) {
        alert('Ошибка при загрузке блока');
    }
};

// Удаление блока
window.deleteMainBlock = async function(id) {
    if (!confirm('Удалить блок?')) return;
    try {
        const response = await fetch(`/api/main-blocks/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        await loadMainBlocks();
    } catch (error) {
        alert('Ошибка при удалении блока');
    }
};

// Сохранение блока главной
const mainBlockForm = document.getElementById('mainBlockForm');
if (mainBlockForm) {
    mainBlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('mainBlockId').value;
        const blockType = document.getElementById('mainBlockType').value;
        const title = document.getElementById('mainBlockTitle').value.trim();
        const content = tinymce.get('mainBlockContent') ? tinymce.get('mainBlockContent').getContent() : document.getElementById('mainBlockContent').value;
        const position = parseInt(document.getElementById('mainBlockPosition').value) || 0;
        const visible = document.getElementById('mainBlockVisible').checked;

        try {
            const response = await fetch('/api/main-blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, block_type: blockType, title, content, position, visible }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                alert('Блок сохранен');
                mainBlockForm.reset();
                if (tinymce.get('mainBlockContent')) tinymce.get('mainBlockContent').setContent('');
                document.getElementById('mainBlockId').value = '';
                await loadMainBlocks();
            } else {
                alert(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            alert('Ошибка при сохранении блока');
        }
    });
}

// Сброс формы блока
const resetMainBlockFormBtn = document.getElementById('resetMainBlockForm');
if (resetMainBlockFormBtn) {
    resetMainBlockFormBtn.addEventListener('click', function() {
        document.getElementById('mainBlockForm').reset();
        if (tinymce.get('mainBlockContent')) tinymce.get('mainBlockContent').setContent('');
        document.getElementById('mainBlockId').value = '';
    });
}
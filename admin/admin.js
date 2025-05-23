// --- Универсальный showToast для админки ---
if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type = 'info', timeout = 3500) {
        let toast = document.getElementById('toast');
        if (!toast) {
            // Если нет #toast, создаём его
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        clearTimeout(window._toastTimeout);
        window._toastTimeout = setTimeout(() => {
            toast.className = 'toast ' + type;
        }, timeout);
    };
}

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
        showToast('Ошибка при удалении записи');
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
            showToast(data.error || 'Ошибка при удалении тренера');
        }
    } catch (error) {
        console.error('Ошибка при удалении тренера:', error);
        showToast('Ошибка при удалении тренера');
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
        showToast('Ошибка при добавлении тренера: ' + error.message);
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
        showToast(`Ошибка при удалении элемента: ${error.message}`);
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
        showToast('Ошибка при добавлении элемента');
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
        showToast('Ошибка при загрузке пользователей');
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
        showToast('Ошибка при изменении роли пользователя');
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
        mainblocks: document.getElementById('mainBlocksSection'),
        pageblocks: document.getElementById('pageBlocksSection')
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
                } else if (sectionName === 'pageblocks') {
                    loadPageBlocks(currentPageSlug);
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
                    ${page.slug !== 'main' ? `<button onclick="showPageBlocks('${page.slug}')" class="role-toggle admin">Управление блоками</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке страниц:', error);
        const pagesList = document.getElementById('pagesList');
        if (pagesList) pagesList.innerHTML = '<p class="error-message">Ошибка при загрузке страниц</p>';
    }
}

window.showPageBlocks = function(slug) {
    // Скрываем все секции
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    // Показываем секцию управления блоками страницы
    document.getElementById('pageBlocksSection').style.display = 'block';
    // Сбрасываем форму блока страницы и явно подставляем slug
    const pageBlockForm = document.getElementById('pageBlockForm');
    if (pageBlockForm) {
        pageBlockForm.reset();
        document.getElementById('pageBlockId').value = '';
        document.getElementById('pageBlockPageSlug').value = slug;
    }
    // Загружаем блоки для выбранной страницы
    loadPageBlocks(slug);
};

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
        showToast('Ошибка при загрузке страницы');
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
        showToast('Ошибка при удалении страницы');
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
                showToast('Страница сохранена');
                pageForm.reset();
                if (tinymce.get('pageContent')) tinymce.get('pageContent').setContent('');
                // Сбросить select и input
                if (slugSelect) slugSelect.value = 'about';
                if (slugInput) slugInput.value = 'about';
                if (slugInput) slugInput.style.display = 'none';
                await loadPages();
            } else {
                showToast(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            showToast('Ошибка при сохранении страницы');
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
                    <p>Позиция: <input type="number" min="0" value="${block.position}" style="width:60px;" onchange="updateBlockPosition(${block.id}, this.value)"></p>
                    <p>${block.visible ? 'Видим' : 'Скрыт'}</p>
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
        
        // Загружаем изображения блока
        await loadBlockImages(block.id);
    } catch (error) {
        showToast('Ошибка при загрузке блока');
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
        showToast('Ошибка при удалении блока');
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
                showToast('Блок сохранен');
                mainBlockForm.reset();
                if (tinymce.get('mainBlockContent')) tinymce.get('mainBlockContent').setContent('');
                document.getElementById('mainBlockId').value = '';
                // Переключаемся на вкладку "Главная" и обновляем список
                document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
                document.getElementById('mainBlocksSection').style.display = 'block';
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.nav-btn[data-section="mainblocks"]').classList.add('active');
                await loadMainBlocks();
                // Фокус на список
                const list = document.getElementById('mainBlocksList');
                if (list) list.scrollIntoView({behavior: 'smooth'});
            } else {
                showToast(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            showToast('Ошибка при сохранении блока');
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

// Функция загрузки изображений блока
async function loadBlockImages(blockId) {
    try {
        const response = await fetch(`/api/main-blocks/${blockId}/images`);
        if (!response.ok) throw new Error('Ошибка загрузки изображений');
        const images = await response.json();
        
        const imagesContainer = document.getElementById('blockImagesContainer');
        if (!imagesContainer) return;
        
        if (!Array.isArray(images) || images.length === 0) {
            imagesContainer.innerHTML = '<p>Нет изображений</p>';
            return;
        }
        
        imagesContainer.innerHTML = images.map(image => `
            <div class="block-image-item">
                <div class="photo-container">
                    <img src="${image.url}" alt="${image.alt || ''}">
                </div>
                <div class="image-actions">
                    <button onclick="deleteBlockImage(${image.id})" class="delete-btn">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке изображений блока:', error);
        const imagesContainer = document.getElementById('blockImagesContainer');
        if (imagesContainer) {
            imagesContainer.innerHTML = '<p class="error-message">Ошибка при загрузке изображений</p>';
        }
    }
}

// Функция удаления изображения блока
async function deleteBlockImage(imageId) {
    if (!confirm('Удалить изображение?')) return;
    
    try {
        const response = await fetch(`/api/main-blocks/images/${imageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Ошибка удаления');
        
        const blockId = document.getElementById('mainBlockId').value;
        await loadBlockImages(blockId);
    } catch (error) {
        console.error('Ошибка при удалении изображения:', error);
        showToast('Ошибка при удалении изображения');
    }
}

// Обработчик формы загрузки изображения блока
document.getElementById('blockImageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const blockId = document.getElementById('mainBlockId').value;
    
    if (!blockId) {
        showToast('Сначала выберите или создайте блок');
        return;
    }
    
    formData.append('block_id', blockId);
    
    try {
        const response = await fetch('/api/main-blocks/upload-image', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const result = await response.json();
        if (result.success) {
            e.target.reset();
            await loadBlockImages(blockId);
        }
    } catch (error) {
        console.error('Ошибка при загрузке изображения:', error);
        showToast('Ошибка при загрузке изображения');
    }
});

// Делаем функции доступными глобально
window.deleteBlockImage = deleteBlockImage;

// Функция для обновления позиции блока
window.updateBlockPosition = async function(blockId, newPosition) {
    try {
        const response = await fetch(`/api/main-blocks/${blockId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: Number(newPosition) }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            await loadMainBlocks();
        } else {
            showToast(data.error || 'Ошибка при обновлении позиции');
        }
    } catch (error) {
        showToast('Ошибка при обновлении позиции');
    }
}

// ====== БЛОКИ СТРАНИЦЫ (CMS) ======
let currentPageSlug = null;

async function loadPageBlocks(pageSlug) {
    currentPageSlug = pageSlug;
    document.getElementById('pageBlocksTitle').textContent = pageSlug;
    document.getElementById('pageBlockPageSlug').value = pageSlug;
    try {
        const response = await fetch(`/api/page-blocks/${pageSlug}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Ошибка загрузки блоков страницы');
        const blocks = await response.json();
        const pageBlocksList = document.getElementById('pageBlocksList');
        if (!pageBlocksList) return;
        if (!Array.isArray(blocks) || blocks.length === 0) {
            pageBlocksList.innerHTML = '<p>Нет блоков</p>';
            return;
        }
        pageBlocksList.innerHTML = blocks.map(block => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${block.title} <span style="color:#888;font-size:0.9em;">(${block.block_type})</span></h3>
                    <p>Позиция: <input type="number" min="0" value="${block.position}" style="width:60px;" onchange="updatePageBlockPosition(${block.id}, this.value)"></p>
                    <p>${block.visible ? 'Видим' : 'Скрыт'}</p>
                </div>
                <div class="user-actions">
                    <button onclick="editPageBlock(${block.id})" class="role-toggle admin">Редактировать</button>
                    <button onclick="deletePageBlock(${block.id})" class="role-toggle user">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        const pageBlocksList = document.getElementById('pageBlocksList');
        if (pageBlocksList) pageBlocksList.innerHTML = '<p class="error-message">Ошибка при загрузке блоков</p>';
    }
}

window.loadPageBlocks = loadPageBlocks;

window.editPageBlock = async function(id) {
    try {
        const response = await fetch(`/api/page-blocks/block/${id}`);
        if (!response.ok) throw new Error('Ошибка загрузки блока');
        const block = await response.json();
        document.getElementById('pageBlockId').value = block.id;
        document.getElementById('pageBlockPageSlug').value = block.page_slug;
        document.getElementById('pageBlockType').value = block.block_type;
        document.getElementById('pageBlockTitleInput').value = block.title;
        document.getElementById('pageBlockPosition').value = block.position;
        document.getElementById('pageBlockVisible').checked = !!block.visible;
        document.getElementById('pageBlockContent').value = block.content || '';
        // Загружаем изображения для блока
        await loadPageBlockImages(block.id);
    } catch (error) {
        showToast('Ошибка при загрузке блока');
    }
};

window.deletePageBlock = async function(id) {
    if (!confirm('Удалить блок?')) return;
    try {
        const response = await fetch(`/api/page-blocks/block/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        await loadPageBlocks(currentPageSlug);
    } catch (error) {
        showToast('Ошибка при удалении блока');
    }
};

window.updatePageBlockPosition = async function(blockId, newPosition) {
    try {
        const response = await fetch(`/api/page-blocks/block/${blockId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: Number(newPosition) }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            await loadPageBlocks(currentPageSlug);
        } else {
            showToast(data.error || 'Ошибка при обновлении позиции');
        }
    } catch (error) {
        showToast('Ошибка при обновлении позиции');
    }
};

const pageBlockForm = document.getElementById('pageBlockForm');
if (pageBlockForm) {
    pageBlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pageBlockId').value;
        const page_slug = document.getElementById('pageBlockPageSlug').value;
        const blockType = document.getElementById('pageBlockType').value;
        const title = document.getElementById('pageBlockTitleInput').value.trim();
        const content = document.getElementById('pageBlockContent').value;
        const position = parseInt(document.getElementById('pageBlockPosition').value) || 0;
        const visible = document.getElementById('pageBlockVisible').checked;
        try {
            const response = await fetch('/api/page-blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, page_slug, block_type: blockType, title, content, position, visible }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                showToast('Блок сохранен');
                pageBlockForm.reset();
                document.getElementById('pageBlockId').value = '';
                // Переключаемся на вкладку "Блоки страницы" и обновляем список
                document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
                document.getElementById('pageBlocksSection').style.display = 'block';
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                // Находим nav-btn для pageblocks (может быть не всегда, fallback не критичен)
                const btn = document.querySelector('.nav-btn[data-section="pageblocks"]');
                if (btn) btn.classList.add('active');
                await loadPageBlocks(page_slug);
                // Фокус на список
                const list = document.getElementById('pageBlocksList');
                if (list) list.scrollIntoView({behavior: 'smooth'});
            } else {
                showToast(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            showToast('Ошибка при сохранении блока');
        }
    });
}

const resetPageBlockFormBtn = document.getElementById('resetPageBlockForm');
if (resetPageBlockFormBtn) {
    resetPageBlockFormBtn.addEventListener('click', function() {
        document.getElementById('pageBlockForm').reset();
        document.getElementById('pageBlockId').value = '';
    });
}

// ====== ИЗОБРАЖЕНИЯ ДЛЯ БЛОКОВ СТРАНИЦЫ (CMS) ======
async function loadPageBlockImages(blockId) {
    try {
        const response = await fetch(`/api/page-blocks/${blockId}/images`, { credentials: 'include' });
        if (!response.ok) throw new Error('Ошибка загрузки изображений');
        const images = await response.json();
        const imagesContainer = document.getElementById('pageBlockImagesContainer');
        if (!imagesContainer) return;
        if (!Array.isArray(images) || images.length === 0) {
            imagesContainer.innerHTML = '<p>Нет изображений</p>';
            return;
        }
        imagesContainer.innerHTML = images.map(image => `
            <div class="block-image-item">
                <div class="photo-container">
                    <img src="${image.url}" alt="${image.alt || ''}">
                </div>
                <div class="image-actions">
                    <button onclick="deletePageBlockImage(${image.id})" class="delete-btn">Удалить</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        const imagesContainer = document.getElementById('pageBlockImagesContainer');
        if (imagesContainer) {
            imagesContainer.innerHTML = '<p class="error-message">Ошибка при загрузке изображений</p>';
        }
    }
}

async function deletePageBlockImage(imageId) {
    if (!confirm('Удалить изображение?')) return;
    try {
        const response = await fetch(`/api/page-blocks/images/${imageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        const blockId = document.getElementById('pageBlockId').value;
        await loadPageBlockImages(blockId);
    } catch (error) {
        showToast('Ошибка при удалении изображения');
    }
}

document.getElementById('pageBlockImageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const blockId = document.getElementById('pageBlockId').value;
    if (!blockId) {
        showToast('Сначала выберите или создайте блок');
        return;
    }
    formData.append('block_id', blockId);
    try {
        const response = await fetch('/api/page-blocks/upload-image', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Ошибка загрузки');
        const result = await response.json();
        if (result.success) {
            e.target.reset();
            await loadPageBlockImages(blockId);
        }
    } catch (error) {
        showToast('Ошибка при загрузке изображения');
    }
});

// Показывать мини-карту только для блока типа 'map'
document.addEventListener('DOMContentLoaded', function() {
    const typeSelect = document.getElementById('mainBlockType');
    const mapGroup = document.getElementById('mainBlockMapGroup');
    let mapDiv = document.getElementById('mainBlockMap');
    const coordsInput = document.getElementById('mainBlockCoords');
    const contentTextarea = document.getElementById('mainBlockContent');
    const addressInput = document.getElementById('mainBlockAddress');
    const phoneInput = document.getElementById('mainBlockPhone');
    let leafletMap = null;
    let marker = null;
    function updateMapVisibility() {
        if (typeSelect.value === 'map') {
            mapGroup.style.display = '';
            setTimeout(() => {
                // Полностью пересоздаём div для карты
                mapDiv = document.getElementById('mainBlockMap');
                const parent = mapDiv.parentNode;
                const newDiv = document.createElement('div');
                newDiv.id = 'mainBlockMap';
                newDiv.style.height = '300px';
                newDiv.style.borderRadius = '10px';
                newDiv.style.marginBottom = '10px';
                parent.replaceChild(newDiv, mapDiv);
                mapDiv = newDiv;
                // Теперь инициализируем карту
                leafletMap = L.map('mainBlockMap').setView([55.751244, 37.618423], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(leafletMap);
                marker = L.marker([55.751244, 37.618423], {draggable:true}).addTo(leafletMap);
                leafletMap.on('click', function(e) {
                    marker.setLatLng(e.latlng);
                    coordsInput.value = JSON.stringify([e.latlng.lat, e.latlng.lng]);
                    contentTextarea.value = coordsInput.value;
                });
                marker.on('dragend', function(e) {
                    const pos = marker.getLatLng();
                    coordsInput.value = JSON.stringify([pos.lat, pos.lng]);
                    contentTextarea.value = coordsInput.value;
                });
                // Если в content уже есть координаты, адрес, телефон — показать их
                try {
                    const val = contentTextarea.value;
                    const obj = JSON.parse(val);
                    if (obj && typeof obj === 'object') {
                        if (Array.isArray(obj.coords) && obj.coords.length === 2) {
                            marker.setLatLng(obj.coords);
                            leafletMap.setView(obj.coords, 13);
                            coordsInput.value = JSON.stringify(obj.coords);
                        } else if (Array.isArray(obj) && obj.length === 2) {
                            marker.setLatLng(obj);
                            leafletMap.setView(obj, 13);
                            coordsInput.value = JSON.stringify(obj);
                        }
                        if (obj.address) addressInput.value = obj.address;
                        if (obj.phone) phoneInput.value = obj.phone;
                    }
                } catch(e) {}
            }, 200);
        } else {
            mapGroup.style.display = 'none';
            if (leafletMap) {
                leafletMap.remove();
                leafletMap = null;
            }
        }
    }
    if (typeSelect && mapGroup && mapDiv && coordsInput) {
        typeSelect.addEventListener('change', updateMapVisibility);
        updateMapVisibility();
    }
    // При отправке формы, если выбран map, сохранять координаты в content
    const mainBlockForm = document.getElementById('mainBlockForm');
    if (mainBlockForm) {
        mainBlockForm.addEventListener('submit', function(e) {
            if (typeSelect.value === 'map') {
                let coords = [55.751244, 37.618423];
                try {
                    coords = coordsInput.value ? JSON.parse(coordsInput.value) : coords;
                } catch(e) {}
                const address = addressInput.value.trim();
                const phone = phoneInput.value.trim();
                contentTextarea.value = JSON.stringify({coords, address, phone});
            }
        });
    }
});
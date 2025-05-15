// Компоненты для блоков главной страницы

// Текстовый блок
function createTextBlock(block) {
    return `
        <section class="main-block text-block" data-block-id="${block.id}">
            <div class="block-position">${block.position}</div>
            <div class="container">
                <h2 class="block-title">${block.title}</h2>
                <div class="block-content">
                    ${block.content}
                </div>
            </div>
        </section>
    `;
}

// Блок с изображением
function createImageBlock(block) {
    const image = block.images && block.images.length > 0 ? block.images[0] : null;
    return `
        <section class="main-block image-block" data-block-id="${block.id}">
            <div class="block-position">${block.position}</div>
            <div class="container">
                <h2 class="block-title">${block.title}</h2>
                <div class="block-content">
                    ${block.content}
                </div>
                <div class="block-image">
                    ${image ? `<img src="${image.url}" alt="${image.alt || block.title}">` : ''}
                </div>
            </div>
        </section>
    `;
}

// Галерея
function createGalleryBlock(block) {
    return `
        <section class="main-block gallery-block" data-block-id="${block.id}">
            <div class="block-position">${block.position}</div>
            <div class="container">
                <h2 class="block-title">${block.title}</h2>
                <div class="gallery-grid">
                    ${block.images ? block.images.map(image => `
                        <div class="gallery-item">
                            <img src="${image.url}" alt="${image.alt || ''}">
                        </div>
                    `).join('') : ''}
                </div>
            </div>
        </section>
    `;
}

// Слайдер
function createSliderBlock(block) {
    return `
        <section class="main-block slider-block" data-block-id="${block.id}">
            <div class="block-position">${block.position}</div>
            <div class="container">
                <h2 class="block-title">${block.title}</h2>
                <div class="slider-container">
                    <div class="slider-wrapper">
                        ${block.images ? block.images.map(image => `
                            <div class="slider-slide">
                                <img src="${image.url}" alt="${image.alt || ''}">
                            </div>
                        `).join('') : ''}
                    </div>
                    <button class="slider-prev">←</button>
                    <button class="slider-next">→</button>
                </div>
            </div>
        </section>
    `;
}

// Сетка
function createGridBlock(block) {
    return `
        <section class="main-block grid-block" data-block-id="${block.id}">
            <div class="block-position">${block.position}</div>
            <div class="container">
                <h2 class="block-title">${block.title}</h2>
                <div class="grid-container">
                    ${block.images ? block.images.map(image => `
                        <div class="grid-item">
                            <img src="${image.url}" alt="${image.alt || ''}">
                            ${image.alt ? `<p class="grid-caption">${image.alt}</p>` : ''}
                        </div>
                    `).join('') : ''}
                </div>
            </div>
        </section>
    `;
}

// Функция для инициализации всех блоков
async function initializeMainBlocks() {
    try {
        const response = await fetch('/api/main-blocks');
        const blocks = await response.json();
        
        const mainBlocksContainer = document.getElementById('mainBlocks');
        if (!mainBlocksContainer) return;

        // Сортируем блоки по позиции
        blocks.sort((a, b) => a.position - b.position);

        // Для каждого блока загружаем его изображения
        for (const block of blocks) {
            if (block.visible) {
                if (["gallery", "slider", "grid", "image"].includes(block.block_type)) {
                    const imagesResponse = await fetch(`/api/main-blocks/${block.id}/images`);
                    block.images = await imagesResponse.json();
                }
            }
        }

        // Рендерим блоки
        mainBlocksContainer.innerHTML = blocks
            .filter(block => block.visible)
            .map(block => {
                switch (block.block_type) {
                    case 'text':
                        return createTextBlock(block);
                    case 'image':
                        return createImageBlock(block);
                    case 'gallery':
                        return createGalleryBlock(block);
                    case 'slider':
                        return createSliderBlock(block);
                    case 'grid':
                        return createGridBlock(block);
                    default:
                        return '';
                }
            })
            .join('');

        // Инициализируем слайдеры
        initializeSliders();

        // Подставляем времена для формы записи
        updateScheduleTimes(blocks);
        // Подставляем карту, если есть блок типа 'map'
        updateMapBlock(blocks);
        // Подставляем адрес и телефон под картой
        updateMapAddressPhone(blocks);
    } catch (error) {
        console.error('Ошибка при загрузке блоков:', error);
    }
}

// Функция для инициализации слайдеров
function initializeSliders() {
    document.querySelectorAll('.slider-block').forEach(sliderBlock => {
        const wrapper = sliderBlock.querySelector('.slider-wrapper');
        const slides = wrapper.querySelectorAll('.slider-slide');
        const prevBtn = sliderBlock.querySelector('.slider-prev');
        const nextBtn = sliderBlock.querySelector('.slider-next');
        let currentSlide = 0;

        // Устанавливаем начальное положение
        updateSlider();

        // Обработчики кнопок
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateSlider();
        });

        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % slides.length;
            updateSlider();
        });

        function updateSlider() {
            wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
    });
}

// Функция для подстановки времён в форму записи
function updateScheduleTimes(blocks) {
    // Находим первый видимый блок расписания
    const scheduleBlock = blocks.find(b => b.block_type === 'schedule' && b.visible);
    const select = document.getElementById('scheduleTime');
    if (!select) {
        console.error('Элемент scheduleTime не найден');
        return;
    }
    if (!scheduleBlock) {
        // Если нет видимого блока расписания, показываем сообщение для администратора
        select.innerHTML = '<option value="">Нет доступного расписания (проверьте блоки в админке)</option>';
        select.disabled = true;
        return;
    }

    let times = [];
    try {
        // Если content пустой, используем []
        let content = scheduleBlock.content;
        if (!content || !content.trim()) content = '[]';
        times = JSON.parse(content);
        if (!Array.isArray(times)) {
            console.error('Содержимое блока расписания не является массивом');
            select.innerHTML = '<option value="">Ошибка: расписание не массив</option>';
            select.disabled = true;
            return;
        }
    } catch (e) {
        console.error('Ошибка при парсинге времён из блока расписания:', e);
        select.innerHTML = '<option value="">Ошибка: расписание невалидно</option>';
        select.disabled = true;
        return;
    }

    // Очищаем текущие опции
    select.innerHTML = '<option value="">Выберите время</option>';
    select.disabled = false;
    // Добавляем новые опции из блока расписания
    if (times.length > 0) {
        times.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            select.appendChild(option);
        });
    } else {
        select.innerHTML = '<option value="">Нет доступных времён</option>';
        select.disabled = true;
    }
}

// Функция для подстановки карты на главную
function updateMapBlock(blocks) {
    const mapBlock = blocks.find(b => b.block_type === 'map' && b.visible);
    if (!mapBlock) return;
    let coords = [55.751244, 37.618423];
    try {
        const arr = JSON.parse(mapBlock.content);
        if (Array.isArray(arr) && arr.length === 2) coords = arr;
    } catch (e) {}
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        // Очищаем div
        mapDiv.innerHTML = '';
        // Инициализируем карту
        const leafletMap = L.map('map').setView(coords, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap);
        L.marker(coords).addTo(leafletMap).bindPopup('Школа фехтования').openPopup();
    }
}

// Функция для вывода адреса и телефона под картой
function updateMapAddressPhone(blocks) {
    const mapBlock = blocks.find(b => b.block_type === 'map' && b.visible);
    if (!mapBlock) return;
    let address = '', phone = '';
    try {
        const obj = JSON.parse(mapBlock.content);
        if (obj && typeof obj === 'object') {
            address = obj.address || '';
            phone = obj.phone || '';
        }
    } catch (e) {}
    const addressDiv = document.querySelector('.address-info');
    if (addressDiv) {
        addressDiv.innerHTML =
            (address ? `<p>Адрес: ${address}</p>` : '') +
            (phone ? `<p>Телефон: ${phone}</p>` : '');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeMainBlocks); 
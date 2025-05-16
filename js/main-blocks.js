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

// Универсальная функция для загрузки изображений блока (главная или страница)
async function loadBlockImagesUniversal(block, isMain) {
    if (["gallery", "slider", "grid", "image"].includes(block.block_type)) {
        const url = isMain
            ? `/api/main-blocks/${block.id}/images`
            : `/api/page-blocks/${block.id}/images`;
        const imagesResponse = await fetch(url);
        block.images = await imagesResponse.json();
    }
}

// Функция для инициализации блоков обычной страницы (CMS)
async function initializePageBlocks(pageSlug) {
    try {
        const response = await fetch(`/api/page-blocks/${pageSlug}`);
        const blocks = await response.json();
        const pageBlocksContainer = document.getElementById('pageBlocks');
        if (!pageBlocksContainer) return;
        blocks.sort((a, b) => a.position - b.position);
        // Для каждого блока загружаем его изображения
        for (const block of blocks) {
            if (block.visible) {
                await loadBlockImagesUniversal(block, false);
            }
        }
        // Рендерим блоки
        pageBlocksContainer.innerHTML = blocks
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
        initializeSliders && initializeSliders();
    } catch (error) {
        console.error('Ошибка при загрузке блоков страницы:', error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeMainBlocks); 
document.addEventListener('DOMContentLoaded', async () => {
    const trainersGrid = document.getElementById('trainersGrid');
    
    try {
        const response = await fetch('/api/trainers');
        const trainers = await response.json();
        
        if (trainers.length === 0) {
            trainersGrid.innerHTML = '<p class="no-trainers">Тренеры пока не добавлены</p>';
            return;
        }
        
        trainersGrid.innerHTML = trainers.map(trainer => `
            <div class="trainer-card">
                <div class="trainer-card__image-container">
                    ${trainer.image_path 
                        ? `<img src="${trainer.image_path}" alt="${trainer.name}" class="trainer-card__image">`
                        : '<div class="trainer-card__placeholder">Нет фото</div>'
                    }
                </div>
                <div class="trainer-card__content">
                    <h3 class="trainer-card__name">${trainer.name}</h3>
                    <p class="trainer-card__description">${trainer.description}</p>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработку ошибок загрузки изображений
        document.querySelectorAll('.trainer-card__image').forEach(img => {
            img.onerror = function() {
                this.parentElement.innerHTML = '<div class="trainer-card__placeholder">Ошибка загрузки фото</div>';
            };
        });
        
        console.log('Тренеры загружены:', trainers); // Для отладки
    } catch (error) {
        console.error('Ошибка при загрузке тренеров:', error);
        trainersGrid.innerHTML = '<p class="error-message">Ошибка при загрузке тренеров</p>';
    }
}); 
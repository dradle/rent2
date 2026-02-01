// Настройки
const CONFIG = {
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev/',
    SHEET_NAME: 'Client1'
};

// Загрузка данных
async function loadClientData() {
    try {
        console.log('🚴 Загружаем данные арендатора...');
        
        const url = `${CONFIG.WORKER_URL}/?sheetName=${CONFIG.SHEET_NAME}`;
        console.log('📡 URL запроса:', url);
        
        const response = await fetch(url);
        console.log('✅ Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`Сервер вернул ошибку: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Получены данные:', data);
        
        // Отображаем данные
        displayData(data);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        showError(error.message);
    }
}

// Отображение данных
function displayData(data) {
    const content = document.getElementById('content');
    
    // Получаем данные клиента
    let clientData = data;
    if (data.success && data.data) {
        clientData = data.data;
    }
    
    // Форматируем данные
    const formattedData = {
        name: clientData.client || clientData.name || 'Арендатор',
        bike: clientData.bike || 'Велосипед',
        tariff: clientData.tariff || '0',
        comment: clientData.comment || '',
        debt: parseFloat(clientData.debt || 0),
        lastPayment: clientData.lastPayment,
        nextPayment: clientData.nextPayment,
        // Форматируем даты если нужно
        lastPaymentFormatted: formatPaymentDate(clientData.lastPayment),
        nextPaymentFormatted: formatNextPaymentDate(clientData.nextPayment)
    };
    
    console.log('🎨 Отображаю данные:', formattedData);
    
    // Генерируем HTML
    let html = `
        <!-- Карточка клиента -->
        <div class="card client-card">
            <div class="card-header">
                <h2><i class="fas fa-user-circle"></i> Ваш профиль</h2>
                <div class="status-badge ${formattedData.debt > 0 ? 'status-overdue' : 'status-active'}">
                    <i class="fas ${formattedData.debt > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                    ${formattedData.debt > 0 ? 'Есть задолженность' : 'Активен'}
                </div>
            </div>
            
            <div class="card-body">
                <div class="profile-section">
                    <div class="profile-icon">
                        <i class="fas fa-bicycle"></i>
                    </div>
                    <div class="profile-info">
                        <h3>${formattedData.name}</h3>
                        <div class="profile-details">
                            <div class="detail">
                                <span class="detail-label"><i class="fas fa-bike"></i> Велосипед:</span>
                                <span class="detail-value">${formattedData.bike}</span>
                            </div>
                            <div class="detail">
                                <span class="detail-label"><i class="fas fa-tag"></i> Тариф:</span>
                                <span class="detail-value highlight">${formattedData.tariff} zł/неделю</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Финансовая информация -->
        <div class="card finance-card ${formattedData.debt > 0 ? 'card-warning' : 'card-success'}">
            <div class="card-header">
                <h2><i class="fas fa-wallet"></i> Финансы</h2>
            </div>
            
            <div class="card-body">
                <div class="finance-grid">
    `;
    
    // Последний платеж
    if (formattedData.lastPayment) {
        const amount = formattedData.lastPayment.amount || formattedData.lastPayment;
        const date = formattedData.lastPayment.date || formattedData.lastPaymentFormatted || 'дата не указана';
        
        html += `
            <div class="finance-item">
                <div class="finance-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="finance-content">
                    <div class="finance-label">Последний платеж</div>
                    <div class="finance-value">${amount}zł</div>
                    <div class="finance-date">${date}</div>
                </div>
            </div>
        `;
    }
    
    // Следующий платеж
    if (formattedData.nextPayment) {
        html += `
            <div class="finance-item">
                <div class="finance-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="finance-content">
                    <div class="finance-label">Следующий платеж</div>
                    <div class="finance-value upcoming">${formattedData.nextPayment}</div>
                    <div class="finance-note">Через 7 дней от последней оплаты</div>
                </div>
            </div>
        `;
    }
    
    // Задолженность (если есть)
    if (formattedData.debt > 0) {
        html += `
            <div class="finance-item debt-item">
                <div class="finance-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="finance-content">
                    <div class="finance-label">Задолженность</div>
                    <div class="finance-value debt-value">${formattedData.debt}zł</div>
                    <div class="finance-note">Пожалуйста, оплатите как можно скорее</div>
                </div>
                <button class="pay-button">
                    <i class="fas fa-credit-card"></i> Оплатить
                </button>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    // Комментарий (если есть)
    if (formattedData.comment && formattedData.comment.trim() !== '') {
        html += `
            <div class="card message-card">
                <div class="card-header">
                    <h2><i class="fas fa-comment-dots"></i> Сообщение от BikeRent</h2>
                </div>
                
                <div class="card-body">
                    <div class="message-content">
                        <div class="message-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="message-text">
                            ${formattedData.comment}
                        </div>
                    </div>
                    <div class="message-time">
                        <i class="fas fa-clock"></i> Актуально на ${new Date().toLocaleDateString('ru-RU')}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Дополнительная информация
    html += `
        <div class="card info-card">
            <div class="card-header">
                <h2><i class="fas fa-info-circle"></i> Полезная информация</h2>
            </div>
            
            <div class="card-body">
                <div class="info-grid">
                    <div class="info-item">
                        <i class="fas fa-tools"></i>
                        <h4>Техническая поддержка</h4>
                        <p>Бесплатный ремонт в течение 24 часов</p>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-shield-alt"></i>
                        <h4>Страхование</h4>
                        <p>Велосипед застрахован от кражи и повреждений</p>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-exchange-alt"></i>
                        <h4>Замена</h4>
                        <p>Бесплатная замена велосипеда при поломке</p>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-headset"></i>
                        <h4>Поддержка 24/7</h4>
                        <p>Круглосуточная телефонная поддержка</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    
    // Добавляем обработчик для кнопки оплаты
    if (formattedData.debt > 0) {
        const payButton = document.querySelector('.pay-button');
        if (payButton) {
            payButton.addEventListener('click', function() {
                alert('Оплата временно недоступна. Пожалуйста, свяжитесь с поддержкой по телефону +48 123 456 789');
            });
        }
    }
}

// Форматирование даты платежа
function formatPaymentDate(paymentData) {
    if (!paymentData) return '';
    
    if (typeof paymentData === 'object' && paymentData.date) {
        return paymentData.date;
    }
    
    if (typeof paymentData === 'string') {
        // Пытаемся разобрать дату из строки
        const dateMatch = paymentData.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
        if (dateMatch) {
            const [, day, month, year] = dateMatch;
            return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        }
    }
    
    return paymentData;
}

// Форматирование даты следующего платежа
function formatNextPaymentDate(nextPayment) {
    if (!nextPayment) return '';
    
    // Если дата в формате строки
    if (typeof nextPayment === 'string') {
        const dateMatch = nextPayment.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
        if (dateMatch) {
            const [, day, month, year] = dateMatch;
            return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
        }
        return nextPayment;
    }
    
    return nextPayment;
}

// Показать ошибку
function showError(message) {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card error-card">
            <div class="card-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</h2>
            </div>
            
            <div class="card-body">
                <div class="error-content">
                    <div class="error-icon">
                        <i class="fas fa-wifi-slash"></i>
                    </div>
                    <div class="error-details">
                        <h3>Не удалось загрузить данные</h3>
                        <p>${message}</p>
                        <div class="error-actions">
                            <button class="btn-primary" onclick="loadClientData()">
                                <i class="fas fa-redo"></i> Попробовать снова
                            </button>
                            <button class="btn-secondary" onclick="window.location.reload()">
                                <i class="fas fa-sync-alt"></i> Обновить страницу
                            </button>
                        </div>
                        <div class="error-help">
                            <p><i class="fas fa-phone"></i> Техподдержка: +48 123 456 789</p>
                            <p><i class="fas fa-envelope"></i> Email: support@bikerent.pl</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Показываем красивую загрузку 1 секунду, потом загружаем данные
    setTimeout(loadClientData, 1000);
});
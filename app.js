// Настройки - ЗАМЕНИТЕ ЭТИ ДАННЫЕ!
const CONFIG = {
    // URL вашего Cloudflare Worker
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev/',
    
    // ID вашей Google таблицы (из URL таблицы)
    SPREADSHEET_ID: '1V-RQSTaL2ehF1QubKqySGKVZHvJT9hjn-hshSy7-mwQ',
    
    // Имя листа для клиента
    SHEET_NAME: 'Client1'
};

// Загружаем данные при открытии страницы
document.addEventListener('DOMContentLoaded', loadClientData);

async function loadClientData() {
    try {
        // Формируем URL для запроса к Worker
        const url = `${CONFIG.WORKER_URL}/?sheetId=${CONFIG.SPREADSHEET_ID}&sheetName=${CONFIG.SHEET_NAME}`;
        
        // Запрашиваем данные
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные');
        }
        
        const data = await response.json();
        
        // Обрабатываем данные
        processData(data);
        
    } catch (error) {
        // Показываем ошибку
        document.getElementById('content').innerHTML = `
            <div class="block-2 has-debt">
                <div class="payment-info">
                    <div class="payment-item">Ошибка загрузки данных: ${error.message}</div>
                    <div class="payment-item">Пожалуйста, обновите страницу или проверьте настройки</div>
                </div>
            </div>
        `;
        console.error('Ошибка:', error);
    }
}

function processData(data) {
    // Получаем данные из таблицы
    const values = data.values || [];
    
    if (values.length < 2) {
        showError('В таблице недостаточно данных');
        return;
    }
    
    // Данные из второй строки (A2, B2, C2, D2, E2)
    const row = values[1];
    
    // Ищем последний платеж (последняя заполненная ячейка в столбце C)
    let lastPayment = null;
    let lastPaymentDate = null;
    
    for (let i = values.length - 1; i >= 1; i--) {
        if (values[i] && values[i][2]) {
            lastPayment = values[i][2]; // Столбец C
            lastPaymentDate = values[i][0] || ''; // Столбец A
            break;
        }
    }
    
    // Следующий платеж (дата последнего платежа + 7 дней)
    let nextPaymentDate = null;
    if (lastPaymentDate) {
        const lastDate = parseDate(lastPaymentDate);
        lastDate.setDate(lastDate.getDate() + 7);
        nextPaymentDate = formatDate(lastDate);
    }
    
    // Форматируем дату последнего платежа
    if (lastPaymentDate) {
        lastPaymentDate = formatDate(parseDate(lastPaymentDate));
    }
    
    // Создаем HTML страницы
    const html = `
        <!-- Блок 1: Информация клиента -->
        <div class="block-1">
            <div class="bike-emoji">🚲</div>
            <div class="client-info">
                <h2>${row[0] || 'Имя клиента'}</h2>
                <div class="details">
                    <div class="detail-item">
                        <span class="label">Велосипед:</span>
                        <span class="value">${row[1] || 'Название велосипеда'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Тариф:</span>
                        <span class="value">${row[2] || '0'} zł/неделю</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Блок 2: Платежи -->
        <div class="block-2 ${(parseFloat(row[4]) || 0) > 0 ? 'has-debt' : 'no-debt'}">
            <div class="payment-info">
                ${lastPayment ? `
                    <div class="payment-item">
                        <strong>Последний платеж:</strong> ${lastPayment}zł - ${lastPaymentDate}
                    </div>
                ` : ''}
                
                ${nextPaymentDate ? `
                    <div class="payment-item">
                        <strong>Следующий платеж:</strong> ${nextPaymentDate}
                    </div>
                ` : ''}
                
                ${(parseFloat(row[4]) || 0) > 0 ? `
                    <div class="debt-warning">
                        Задолженность: ${row[4]}zł
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Блок 3: Сообщение (только если есть) -->
        ${row[3] ? `
            <div class="block-3">
                <div class="message">
                    <h3>Сообщение от BikeRent</h3>
                    <div class="message-content">
                        ${row[3]}
                    </div>
                </div>
            </div>
        ` : ''}
    `;
    
    // Вставляем HTML на страницу
    document.getElementById('content').innerHTML = html;
}

// Вспомогательные функции для работы с датами
function formatDate(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
        return date || '';
    }
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
}

function parseDate(dateString) {
    if (!dateString) return new Date();
    
    // Пробуем разные форматы дат
    const formats = [
        /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
        /(\d{4})-(\d{2})-(\d{2})/,   // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/ // MM/DD/YYYY
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            const [, day, month, year] = match;
            return new Date(year, month - 1, day);
        }
    }
    
    return new Date(dateString);
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="block-2 has-debt">
            <div class="payment-info">
                <div class="payment-item">${message}</div>
            </div>
        </div>
    `;
}
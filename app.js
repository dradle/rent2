// Настройки
const CONFIG = {
    // URL вашего Cloudflare Worker (БЕЗ двойного слеша в конце!)
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev',
    
    // ID вашей Google таблицы
    SPREADSHEET_ID: '1V-RQSTaL2ehF1QubKqySGKVZHvJT9hjn-hshSy7-mwQ',
    
    // Имя листа для клиента
    SHEET_NAME: 'Client1'
};

// Загружаем данные при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    loadClientData();
    // Обновляем данные каждые 10 минут
    setInterval(loadClientData, 10 * 60 * 1000);
});

async function loadClientData() {
    try {
        // Показываем загрузку
        document.getElementById('content').innerHTML = '<div class="loading">Загрузка данных...</div>';
        
        // Добавляем временную метку для избежания кэширования
        const timestamp = new Date().getTime();
        
        // Формируем URL для запроса к Worker (убираем лишние слеши!)
        const baseUrl = CONFIG.WORKER_URL.replace(/\/+$/, ''); // Убираем слеш в конце если есть
        const url = `${baseUrl}/?sheetId=${CONFIG.SPREADSHEET_ID}&sheetName=${CONFIG.SHEET_NAME}&_=${timestamp}`;
        
        console.log('Запрашиваю данные из:', url);
        
        // ПРОСТОЙ запрос без специальных заголовков (чтобы избежать CORS preflight)
        const response = await fetch(url);
        
        console.log('Ответ получен, статус:', response.status);
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены данные:', data);
        
        // Обрабатываем данные
        processData(data);
        
    } catch (error) {
        // Показываем ошибку
        showError(`Не удалось загрузить данные: ${error.message}<br><br>Попробуйте:<br>1. Обновить страницу<br>2. Проверить интернет-соединение`);
        console.error('Полная ошибка:', error);
    }
}

function processData(data) {
    console.log('Обрабатываю данные формата:', Object.keys(data));
    
    // Формат 1: Google Sheets API v4 (values)
    if (data.values && Array.isArray(data.values)) {
        console.log('Формат: Google Sheets API v4');
        processValues(data.values);
        return;
    }
    
    // Формат 2: Google Visualization API (table)
    if (data.table && data.table.rows) {
        console.log('Формат: Google Visualization API');
        processTable(data.table.rows);
        return;
    }
    
    // Формат 3: Данные из Apps Script
    if (data.success && data.data) {
        console.log('Формат: Google Apps Script');
        processAppScriptData(data.data);
        return;
    }
    
    // Если данные в другом формате
    console.log('Неизвестный формат данных:', data);
    showError('Данные получены в неизвестном формате');
}

// Обработка формата Google Sheets API v4
function processValues(values) {
    console.log('Данные values:', values);
    
    if (values.length < 2) {
        showError('В таблице недостаточно данных. Проверьте строку A2');
        return;
    }
    
    // Данные из второй строки (индекс 1) - A2, B2, C2, D2, E2
    const row = values[1] || [];
    console.log('Данные строки 2:', row);
    
    // Ищем последний платеж
    let lastPayment = null;
    let lastPaymentDate = null;
    
    for (let i = values.length - 1; i >= 1; i--) {
        if (values[i] && values[i][2]) {
            lastPayment = values[i][2];
            lastPaymentDate = values[i][0] || '';
            break;
        }
    }
    
    createPage(
        row[0] || 'Имя клиента',
        row[1] || 'Велосипед',
        row[2] || '0',
        row[3] || '',
        row[4] || '0',
        lastPayment,
        lastPaymentDate
    );
}

// Обработка формата Google Visualization API
function processTable(rows) {
    console.log('Данные table:', rows);
    
    if (rows.length < 2) {
        showError('В таблице недостаточно данных');
        return;
    }
    
    const row = rows[1].c || [];
    
    const name = row[0] ? row[0].v : 'Имя клиента';
    const bike = row[1] ? row[1].v : 'Велосипед';
    const tariff = row[2] ? row[2].v : '0';
    const comment = row[3] ? row[3].v : '';
    const debt = row[4] ? row[4].v : '0';
    
    // Ищем последний платеж
    let lastPayment = null;
    let lastPaymentDate = null;
    
    for (let i = rows.length - 1; i >= 1; i--) {
        const paymentRow = rows[i].c || [];
        if (paymentRow[2] && paymentRow[2].v) {
            lastPayment = paymentRow[2].v;
            lastPaymentDate = paymentRow[0] ? (paymentRow[0].f || paymentRow[0].v) : '';
            break;
        }
    }
    
    createPage(name, bike, tariff, comment, debt, lastPayment, lastPaymentDate);
}

// Обработка формата Apps Script
function processAppScriptData(appScriptData) {
    console.log('Данные Apps Script:', appScriptData);
    
    createPage(
        appScriptData.client || appScriptData.name || 'Имя клиента',
        appScriptData.bike || 'Велосипед',
        appScriptData.tariff || '0',
        appScriptData.comment || '',
        appScriptData.debt || '0',
        appScriptData.lastPayment,
        appScriptData.lastPaymentDate
    );
}

// Создание страницы с данными
function createPage(name, bike, tariff, comment, debt, lastPayment, lastPaymentDate) {
    // Следующий платеж
    let nextPaymentDate = null;
    if (lastPaymentDate) {
        const lastDate = parseDate(lastPaymentDate);
        if (!isNaN(lastDate.getTime())) {
            lastDate.setDate(lastDate.getDate() + 7);
            nextPaymentDate = formatDate(lastDate);
        }
    }
    
    // Форматируем дату последнего платежа
    if (lastPaymentDate) {
        const formattedDate = formatDate(parseDate(lastPaymentDate));
        if (formattedDate) {
            lastPaymentDate = formattedDate;
        }
    }
    
    // Проверяем есть ли долг
    const hasDebt = (parseFloat(debt) || 0) > 0;
    
    // Создаем HTML
    const html = `
        <div class="block-1">
            <div class="bike-emoji">🚲</div>
            <div class="client-info">
                <h2>${name}</h2>
                <div class="details">
                    <div class="detail-item">
                        <span class="label">Велосипед:</span>
                        <span class="value">${bike}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Тариф:</span>
                        <span class="value">${tariff} zł/неделю</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="block-2 ${hasDebt ? 'has-debt' : 'no-debt'}">
            <div class="payment-info">
                ${lastPayment ? `
                    <div class="payment-item">
                        <strong>Последний платеж:</strong> ${lastPayment}zł - ${lastPaymentDate || ''}
                    </div>
                ` : ''}
                
                ${nextPaymentDate ? `
                    <div class="payment-item">
                        <strong>Следующий платеж:</strong> ${nextPaymentDate}
                    </div>
                ` : ''}
                
                ${hasDebt ? `
                    <div class="debt-warning">
                        Задолженность: ${debt}zł
                    </div>
                ` : `
                    <div class="payment-item">
                        <strong>Статус:</strong> Задолженностей нет ✓
                    </div>
                `}
            </div>
        </div>
        
        ${comment ? `
            <div class="block-3">
                <div class="message">
                    <h3>Сообщение от BikeRent</h3>
                    <div class="message-content">
                        ${comment}
                    </div>
                </div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('content').innerHTML = html;
}

// Вспомогательные функции для работы с датами
function formatDate(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) return '';
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
}

function parseDate(dateString) {
    if (!dateString) return new Date();
    
    // Пробуем DD.MM.YYYY
    const match = dateString.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
        const [, day, month, year] = match;
        return new Date(year, month - 1, day);
    }
    
    return new Date(dateString);
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="error">
            <h3>Ошибка</h3>
            <p style="text-align: left; margin: 15px 0; white-space: pre-line;">${message}</p>
            <button onclick="loadClientData()">Повторить</button>
        </div>
    `;
}
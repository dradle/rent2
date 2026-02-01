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
        
        console.log('Запрашиваю данные из:', url);
        
        // Запрашиваем данные
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
        showError(`Ошибка: ${error.message}<br><br>Проверьте:<br>1. Правильность URL Worker<br>2. Правильность ID таблицы<br>3. Что таблица доступна для Service Account`);
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
    showError('Данные получены в неизвестном формате. Проверьте настройки Worker.');
}

// Обработка формата Google Sheets API v4
function processValues(values) {
    console.log('Данные values:', values);
    
    if (values.length < 2) {
        showError('В таблице недостаточно строк данных. Нужна минимум вторая строка (A2, B2, C2, D2, E2)');
        return;
    }
    
    // Данные из второй строки (индекс 1)
    const row = values[1];
    console.log('Данные строки 2:', row);
    
    // Ищем последний платеж (последняя заполненная ячейка в столбце C, индекс 2)
    let lastPayment = null;
    let lastPaymentDate = null;
    
    for (let i = values.length - 1; i >= 1; i--) {
        if (values[i] && values[i][2]) {
            lastPayment = values[i][2]; // Столбец C (индекс 2)
            lastPaymentDate = values[i][0] || ''; // Столбец A (индекс 0)
            console.log(`Найден платеж в строке ${i}:`, lastPayment, lastPaymentDate);
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
        showError('В таблице недостаточно строк данных');
        return;
    }
    
    // Данные из второй строки (индекс 1)
    const row = rows[1].c || [];
    console.log('Данные строки 2:', row);
    
    // Получаем значения из ячеек
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
    console.log('Создаю страницу с данными:');
    console.log('Имя:', name);
    console.log('Велосипед:', bike);
    console.log('Тариф:', tariff);
    console.log('Комментарий:', comment);
    console.log('Задолженность:', debt);
    console.log('Последний платеж:', lastPayment);
    console.log('Дата последнего платежа:', lastPaymentDate);
    
    // Следующий платеж (дата последнего платежа + 7 дней)
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
        if (formattedDate && !formattedDate.includes('Invalid')) {
            lastPaymentDate = formattedDate;
        }
    }
    
    // Создаем HTML страницы
    const html = `
        <!-- Блок 1: Информация клиента -->
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
        
        <!-- Блок 2: Платежи -->
        <div class="block-2 ${(parseFloat(debt) || 0) > 0 ? 'has-debt' : 'no-debt'}">
            <div class="payment-info">
                ${lastPayment ? `
                    <div class="payment-item">
                        <strong>Последний платеж:</strong> ${lastPayment}zł - ${lastPaymentDate || 'дата не указана'}
                    </div>
                ` : ''}
                
                ${nextPaymentDate ? `
                    <div class="payment-item">
                        <strong>Следующий платеж:</strong> ${nextPaymentDate}
                    </div>
                ` : ''}
                
                ${(parseFloat(debt) || 0) > 0 ? `
                    <div class="debt-warning">
                        Задолженность: ${debt}zł
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Блок 3: Сообщение (только если есть) -->
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
    
    // Вставляем HTML на страницу
    document.getElementById('content').innerHTML = html;
}

// Вспомогательные функции для работы с датами
function formatDate(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
        return '';
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
            const [, p1, p2, p3] = match;
            // Определяем формат по группам
            if (format.source.includes('\\d{2}\\.\\d{2}\\.\\d{4}')) {
                // DD.MM.YYYY
                return new Date(p3, p2 - 1, p1);
            } else if (format.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
                // YYYY-MM-DD
                return new Date(p1, p2 - 1, p3);
            } else {
                // MM/DD/YYYY
                return new Date(p3, p1 - 1, p2);
            }
        }
    }
    
    // Пробуем стандартный парсинг
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    return new Date();
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="block-2 has-debt">
            <div class="payment-info">
                <div class="payment-item" style="white-space: pre-line;">${message}</div>
                <div class="payment-item">
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">
                        Обновить страницу
                    </button>
                </div>
            </div>
        </div>
    `;
}
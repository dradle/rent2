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
    console.log('Все данные таблицы:', values);
    
    if (values.length < 2) {
        showError('В таблице недостаточно данных. Проверьте строку A2');
        return;
    }
    
    // Данные из второй строки (индекс 1) - A2, B2, C2, D2, E2
    const row = values[1] || [];
    console.log('Данные строки 2 (клиент):', row);
    
    // Ищем последний платеж - последняя заполненная ячейка в столбце C
    // и соответствующая дата из столбца A
    let lastPayment = null;
    let lastPaymentDate = null;
    
    console.log('Ищу последний платеж в столбце C...');
    for (let i = values.length - 1; i >= 0; i--) {
        const currentRow = values[i] || [];
        // Проверяем столбец C (индекс 2) - там должны быть суммы платежей
        if (currentRow[2] && currentRow[2].toString().trim() !== '') {
            lastPayment = currentRow[2];
            lastPaymentDate = currentRow[0] || '';
            console.log(`Найден платеж в строке ${i + 1}: Сумма=${lastPayment}, Дата=${lastPaymentDate}`);
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
    
    for (let i = rows.length - 1; i >= 0; i--) {
        const paymentRow = rows[i].c || [];
        if (paymentRow[2] && paymentRow[2].v && paymentRow[2].v.toString().trim() !== '') {
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
    console.log('Создаю страницу с:');
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
            console.log('Следующий платеж:', nextPaymentDate);
        }
    }
    
    // Форматируем дату последнего платежа
    let formattedLastPaymentDate = '';
    if (lastPaymentDate) {
        formattedLastPaymentDate = formatDate(parseDate(lastPaymentDate));
        console.log('Форматированная дата:', formattedLastPaymentDate);
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
                        <strong>Последний платеж:</strong> ${lastPayment}zł - ${formattedLastPaymentDate || ''}
                    </div>
                ` : '<div class="payment-item">Нет данных о платежах</div>'}
                
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
        
        ${comment && comment.trim() !== '' ? `
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
    if (!dateString || dateString.toString().trim() === '') return new Date();
    
    const str = dateString.toString().trim();
    
    // Пробуем разные форматы дат
    const formats = [
        /(\d{2})\.(\d{2})\.(\d{4})/,     // DD.MM.YYYY
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // D.M.YYYY
        /(\d{4})-(\d{2})-(\d{2})/,       // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})\/(\d{2})\/(\d{2})/      // YYYY/MM/DD
    ];
    
    for (const format of formats) {
        const match = str.match(format);
        if (match) {
            const [, p1, p2, p3] = match;
            // Определяем формат по группам
            if (format.source.includes('\\d{4}-\\d{2}-\\d{2}') || 
                format.source.includes('\\d{4}\\/\\d{2}\\/\\d{2}')) {
                // YYYY-MM-DD или YYYY/MM/DD
                return new Date(p1, p2 - 1, p3);
            } else {
                // DD.MM.YYYY или D.M.YYYY или MM/DD/YYYY
                // Проверяем, если первое число > 12, то это день
                if (parseInt(p1) > 12) {
                    // DD.MM.YYYY
                    return new Date(p3, p2 - 1, p1);
                } else {
                    // MM/DD/YYYY или дата в американском формате
                    return new Date(p3, p1 - 1, p2);
                }
            }
        }
    }
    
    // Пробуем стандартный парсинг
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    console.warn('Не удалось распарсить дату:', str);
    return new Date();
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
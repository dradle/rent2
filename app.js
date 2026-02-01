// Настройки
const CONFIG = {
    // URL вашего Cloudflare Worker
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev',
    
    // ID вашей Google таблицы
    SPREADSHEET_ID: '1V-RQSTaL2ehF1QubKqySGKVZHvJT9hjn-hshSy7-mwQ',
    
    // Имя листа для клиента
    SHEET_NAME: 'Client1'
};

// Загружаем данные при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    loadClientData();
    setInterval(loadClientData, 10 * 60 * 1000);
});

async function loadClientData() {
    try {
        document.getElementById('content').innerHTML = '<div class="loading">Загрузка данных...</div>';
        
        const timestamp = new Date().getTime();
        const baseUrl = CONFIG.WORKER_URL.replace(/\/+$/, '');
        const url = `${baseUrl}/?sheetId=${CONFIG.SPREADSHEET_ID}&sheetName=${CONFIG.SHEET_NAME}&_=${timestamp}`;
        
        console.log('Запрашиваю данные из:', url);
        
        const response = await fetch(url);
        
        console.log('Ответ получен, статус:', response.status);
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены данные от Worker:', data);
        
        processData(data);
        
    } catch (error) {
        showError(`Не удалось загрузить данные: ${error.message}`);
        console.error('Полная ошибка:', error);
    }
}

function processData(data) {
    console.log('Обрабатываю данные формата:', Object.keys(data));
    console.log('Содержимое data:', data);
    
    // Формат 1: Google Apps Script (ваш формат!)
    if (data.success && data.data) {
        console.log('Формат: Google Apps Script');
        processAppScriptData(data.data);
        return;
    }
    
    // Формат 2: Google Sheets API v4 (values)
    if (data.values && Array.isArray(data.values)) {
        console.log('Формат: Google Sheets API v4');
        processValues(data.values);
        return;
    }
    
    // Формат 3: Google Visualization API (table)
    if (data.table && data.table.rows) {
        console.log('Формат: Google Visualization API');
        processTable(data.table.rows);
        return;
    }
    
    console.log('Неизвестный формат данных:', data);
    showError('Данные получены в неизвестном формате');
}

// Обработка формата Google Apps Script
function processAppScriptData(appScriptData) {
    console.log('Данные Apps Script:', appScriptData);
    
    // Извлекаем данные из структуры Apps Script
    const name = appScriptData.client || 'Имя клиента';
    const bike = appScriptData.bike || 'Велосипед';
    const tariff = appScriptData.tariff || '0';
    const comment = appScriptData.comment || '';
    const debt = appScriptData.debt || '0';
    
    // Обрабатываем lastPayment
    let lastPayment = null;
    let lastPaymentDate = null;
    
    if (appScriptData.lastPayment) {
        // Если lastPayment - объект с amount и date
        if (typeof appScriptData.lastPayment === 'object') {
            lastPayment = appScriptData.lastPayment.amount;
            lastPaymentDate = appScriptData.lastPayment.date;
        } 
        // Если lastPayment - просто значение
        else if (appScriptData.lastPayment) {
            lastPayment = appScriptData.lastPayment;
        }
    }
    
    // Если есть отдельное поле lastPaymentDate
    if (appScriptData.lastPaymentDate && !lastPaymentDate) {
        lastPaymentDate = appScriptData.lastPaymentDate;
    }
    
    console.log('Извлеченные данные:');
    console.log('- Имя:', name);
    console.log('- Велосипед:', bike);
    console.log('- Тариф:', tariff);
    console.log('- Комментарий:', comment);
    console.log('- Задолженность:', debt);
    console.log('- Последний платеж:', lastPayment);
    console.log('- Дата платежа:', lastPaymentDate);
    
    createPage(name, bike, tariff, comment, debt, lastPayment, lastPaymentDate);
}

// Обработка формата Google Sheets API v4
function processValues(values) {
    console.log('Все строки таблицы:');
    values.forEach((row, index) => {
        console.log(`Строка ${index}:`, row);
    });
    
    if (values.length < 2) {
        showError('В таблице недостаточно данных. Проверьте строку A2');
        return;
    }
    
    // Данные клиента из второй строки (A2, B2, C2, D2, E2)
    const clientRow = values[1] || [];
    console.log('Данные клиента (строка 2/A2):', clientRow);
    
    // Ищем последний платеж
    let lastPayment = null;
    let lastPaymentDate = null;
    let lastPaymentRowIndex = -1;
    
    console.log('Ищу последний платеж в столбце C...');
    
    for (let i = values.length - 1; i >= 1; i--) {
        const currentRow = values[i] || [];
        if (currentRow[2] !== undefined && currentRow[2] !== null && currentRow[2] !== '') {
            lastPayment = currentRow[2];
            lastPaymentDate = currentRow[0] || '';
            lastPaymentRowIndex = i;
            console.log(`Найден платеж в строке ${i + 1} (A${i + 1}/C${i + 1}):`, {
                сумма: lastPayment,
                дата: lastPaymentDate,
                вся_строка: currentRow
            });
            break;
        }
    }
    
    if (lastPaymentRowIndex === -1) {
        console.log('Платежи не найдены в столбце C');
    }
    
    createPage(
        clientRow[0] || 'Имя клиента',
        clientRow[1] || 'Велосипед',
        clientRow[2] || '0',
        clientRow[3] || '',
        clientRow[4] || '0',
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
        if (paymentRow[2] && paymentRow[2].v && paymentRow[2].v.toString().trim() !== '') {
            lastPayment = paymentRow[2].v;
            lastPaymentDate = paymentRow[0] ? (paymentRow[0].f || paymentRow[0].v) : '';
            break;
        }
    }
    
    createPage(name, bike, tariff, comment, debt, lastPayment, lastPaymentDate);
}

// Создание страницы с данными
function createPage(name, bike, tariff, comment, debt, lastPayment, lastPaymentDate) {
    console.log('Формирую страницу с данными:');
    console.log('- Имя клиента:', name);
    console.log('- Велосипед:', bike);
    console.log('- Тариф:', tariff);
    console.log('- Комментарий:', comment);
    console.log('- Задолженность:', debt);
    console.log('- Последний платеж (сумма):', lastPayment);
    console.log('- Дата последнего платежа:', lastPaymentDate);
    
    // Следующий платеж
    let nextPaymentDate = null;
    if (lastPaymentDate) {
        const lastDate = parseDate(lastPaymentDate);
        if (!isNaN(lastDate.getTime())) {
            lastDate.setDate(lastDate.getDate() + 7);
            nextPaymentDate = formatDate(lastDate);
            console.log('- Следующий платеж (расчет):', nextPaymentDate);
        }
    }
    
    // Форматируем дату
    let formattedLastPaymentDate = '';
    if (lastPaymentDate) {
        formattedLastPaymentDate = formatDate(parseDate(lastPaymentDate));
        console.log('- Форматированная дата:', formattedLastPaymentDate);
    }
    
    // Проверяем задолженность
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
                        <strong>Последний платеж:</strong> ${lastPayment}zł - ${formattedLastPaymentDate || lastPaymentDate || ''}
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
    
    // Основной формат: DD.MM.YYYY
    const match = str.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
    if (match) {
        const [, day, month, year] = match;
        return new Date(year, month - 1, day);
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
// Конфигурация
const CONFIG = {
    // URL вашего Cloudflare Worker
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev/',
    
    // ID вашей Google таблицы (из URL: https://docs.google.com/spreadsheets/d/ЭТО_ID_ТАБЛИЦЫ/edit)
    SPREADSHEET_ID: '1V-RQSTaL2ehF1QubKqySGKVZHvJT9hjn-hshSy7-mwQ',
    
    // Имя листа (sheet) для клиента - можно менять для разных клиентов
    SHEET_NAME: 'Client1' // Например: Client1, Client2, Client3
};

// Основная функция загрузки данных
async function loadClientData() {
    try {
        const contentDiv = document.getElementById('content');
        
        // Формируем URL для запроса
        const url = new URL(CONFIG.WORKER_URL);
        url.searchParams.append('sheetId', CONFIG.SPREADSHEET_ID);
        url.searchParams.append('sheetName', CONFIG.SHEET_NAME);
        
        // Делаем запрос через Cloudflare Worker
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Обрабатываем данные
        processSheetData(data);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    }
}

// Обработка данных из Google Sheets
function processSheetData(data) {
    if (!data.table || !data.table.rows) {
        showError('Данные не найдены');
        return;
    }
    
    const rows = data.table.rows;
    
    // Получаем основные данные из второй строки (индекс 0)
    const clientData = rows[0]?.c || []; // A2, B2, C2, D2, E2
    
    // Ищем последний платеж (последняя заполненная ячейка в столбце C)
    let lastPayment = null;
    let lastPaymentDate = null;
    
    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i]?.c || [];
        if (row[2]?.v) { // Столбец C
            lastPayment = row[2].v; // Сумма платежа
            lastPaymentDate = row[0]?.v ? formatDate(row[0].v) : null; // Дата из столбца A
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
    
    // Задолженность
    const debt = clientData[4]?.v || 0; // Ячейка E2
    
    // Комментарий
    const comment = clientData[3]?.v || null; // Ячейка D2
    
    // Отображаем данные
    renderPage({
        name: clientData[0]?.v || 'Клиент',
        bike: clientData[1]?.v || 'Велосипед',
        tariff: clientData[2]?.v || '0',
        lastPayment,
        lastPaymentDate,
        nextPaymentDate,
        debt,
        comment
    });
}

// Отображение страницы
function renderPage(data) {
    const contentDiv = document.getElementById('content');
    
    let html = `
        <!-- Блок 1: Информация о клиенте -->
        <div class="block block-1">
            <div class="bike-emoji">🚲</div>
            <div class="client-info">
                <h2>${data.name}</h2>
                <div class="details">
                    <div class="detail-item">
                        <span class="label">Велосипед:</span>
                        <span class="value">${data.bike}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Тариф:</span>
                        <span class="value">${data.tariff} zł/неделю</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Блок 2: Платежи -->
        <div class="block block-2 ${data.debt > 0 ? 'overdue' : ''}">
            <div class="payment-info">
    `;
    
    if (data.lastPayment && data.lastPaymentDate) {
        html += `
            <div class="payment-item">
                <span class="label">Последний платеж:</span>
                <span class="value">${data.lastPayment}zł - ${data.lastPaymentDate}</span>
            </div>
        `;
    }
    
    if (data.nextPaymentDate) {
        html += `
            <div class="payment-item">
                <span class="label">Следующий платеж:</span>
                <span class="value">${data.nextPaymentDate}</span>
            </div>
        `;
    }
    
    if (data.debt > 0) {
        html += `
            <div class="debt">
                Задолженность: ${data.debt}zł
            </div>
        `;
    }
    
    html += `</div></div>`;
    
    // Блок 3: Комментарий (если есть)
    if (data.comment) {
        html += `
            <div class="block block-3">
                <div class="message">
                    <h3>Сообщение от BikeRent</h3>
                    <div class="message-content">
                        ${data.comment}
                    </div>
                </div>
            </div>
        `;
    }
    
    contentDiv.innerHTML = html;
}

// Показать ошибку
function showError(message) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = `
        <div class="block" style="background: #f8d7da; color: #721c24; text-align: center; padding: 40px;">
            <h3 style="color: #721c24; margin-bottom: 20px;">Ошибка</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                margin-top: 20px;
                padding: 10px 30px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">
                Обновить страницу
            </button>
        </div>
    `;
}

// Форматирование даты
function formatDate(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Проверяем, валидна ли дата
    if (isNaN(d.getTime())) {
        return 'Неизвестная дата';
    }
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
}

// Парсинг даты из формата DD.MM.YYYY
function parseDate(dateString) {
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
}

// Запускаем загрузку данных при загрузке страницы
document.addEventListener('DOMContentLoaded', loadClientData);
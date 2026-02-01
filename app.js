// Конфигурация
const CONFIG = {
    // URL вашего Cloudflare Worker
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev/',
    
    // Имя листа по умолчанию
    DEFAULT_SHEET: 'Client1'
};

// Основная функция загрузки данных
async function loadClientData() {
    try {
        const contentDiv = document.getElementById('content');
        
        // Формируем URL для запроса
        const url = `${CONFIG.WORKER_URL}/?sheetName=${CONFIG.DEFAULT_SHEET}`;
        
        console.log('Загружаю данные из:', url);
        
        // Делаем запрос через Cloudflare Worker
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены данные:', data);
        
        // Сохраняем для отладки
        localStorage.setItem('lastWorkerResponse', JSON.stringify(data));
        
        // Обрабатываем данные
        processSheetData(data);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        localStorage.setItem('lastError', error.message);
        showError(`Не удалось загрузить данные: ${error.message}`);
    }
}

// Обработка данных из Google Sheets
function processSheetData(data) {
    console.log('Обрабатываю данные:', data);
    
    // Проверяем разные форматы ответа
    
    // Формат 1: Данные из Google Apps Script (наш случай)
    if (data.success && data.data) {
        console.log('Формат: Google Apps Script');
        const clientData = data.data;
        
        renderPage({
            name: clientData.client || 'Клиент',
            bike: clientData.bike || 'Велосипед',
            tariff: clientData.tariff || '0',
            comment: clientData.comment || '',
            debt: parseFloat(clientData.debt || 0),
            lastPayment: clientData.lastPayment,
            nextPayment: clientData.nextPayment
        });
        return;
    }
    
    // Формат 2: Прямой доступ к Google Sheets
    if (data.table && data.table.rows) {
        console.log('Формат: Google Sheets API');
        const rows = data.table.rows;
        
        if (rows.length < 2) {
            showError('В таблице недостаточно данных');
            return;
        }
        
        // Данные из второй строки (A2, B2, C2, D2, E2)
        const rowData = rows[1].c || [];
        
        // Ищем последний платеж (последняя заполненная ячейка в столбце C)
        let lastPayment = null;
        let lastPaymentDate = null;
        
        for (let i = rows.length - 1; i >= 0; i--) {
            const row = rows[i]?.c || [];
            if (row[2]?.v) {
                lastPayment = row[2].v;
                lastPaymentDate = row[0]?.f || row[0]?.v || '';
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
        
        renderPage({
            name: rowData[0]?.v || 'Клиент',
            bike: rowData[1]?.v || 'Велосипед',
            tariff: rowData[2]?.v || '0',
            comment: rowData[3]?.v || '',
            debt: parseFloat(rowData[4]?.v || 0),
            lastPayment: lastPayment,
            lastPaymentDate: lastPaymentDate,
            nextPaymentDate: nextPaymentDate
        });
        return;
    }
    
    // Формат 3: Google Sheets API v4
    if (data.values && Array.isArray(data.values)) {
        console.log('Формат: Google Sheets API v4');
        const values = data.values;
        
        if (values.length < 2) {
            showError('В таблице недостаточно строк');
            return;
        }
        
        // Вторая строка (индекс 1)
        const rowData = values[1];
        
        renderPage({
            name: rowData[0] || 'Клиент',
            bike: rowData[1] || 'Велосипед',
            tariff: rowData[2] || '0',
            comment: rowData[3] || '',
            debt: parseFloat(rowData[4] || 0)
        });
        return;
    }
    
    // Если данные в другом формате
    console.log('Неизвестный формат данных:', data);
    showError('Данные не найдены или в неправильном формате');
}

// Отображение страницы
function renderPage(data) {
    console.log('Отображаю данные:', data);
    
    const contentDiv = document.getElementById('content');
    
    // Блок 1: Информация о клиенте
    let html = `
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
    
    // Последний платеж
    if (data.lastPayment && data.lastPaymentDate) {
        html += `
            <div class="payment-item">
                <span class="label">Последний платеж:</span>
                <span class="value">${data.lastPayment.amount || data.lastPayment}zł - ${data.lastPayment.date || data.lastPaymentDate}</span>
            </div>
        `;
    } else if (data.lastPayment) {
        html += `
            <div class="payment-item">
                <span class="label">Последний платеж:</span>
                <span class="value">${data.lastPayment}zł</span>
            </div>
        `;
    }
    
    // Следующий платеж
    if (data.nextPayment || data.nextPaymentDate) {
        html += `
            <div class="payment-item">
                <span class="label">Следующий платеж:</span>
                <span class="value">${data.nextPayment || data.nextPaymentDate}</span>
            </div>
        `;
    }
    
    // Задолженность
    if (data.debt > 0) {
        html += `
            <div class="debt">
                Задолженность: ${data.debt}zł
            </div>
        `;
    }
    
    html += `</div></div>`;
    
    // Блок 3: Комментарий (если есть)
    if (data.comment && data.comment.trim() !== '') {
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
    
    // Получаем данные из localStorage для отладки
    const lastData = localStorage.getItem('lastWorkerResponse');
    const lastError = localStorage.getItem('lastError');
    
    contentDiv.innerHTML = `
        <div class="block" style="background: #fff3cd; color: #856404; padding: 30px; border-radius: 10px;">
            <h3 style="color: #856404; margin-bottom: 20px;">⚠️ ${message}</h3>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; font-family: monospace; font-size: 14px;">
                <strong>Данные для отладки:</strong><br><br>
                
                <button onclick="showRawData()" style="
                    padding: 8px 15px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-bottom: 10px;
                ">
                    Показать сырые данные
                </button>
                
                <div id="debugData" style="display: none; background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
                    <strong>Последний ответ Worker:</strong><br>
                    <pre style="overflow: auto; max-height: 200px;">
${lastData ? JSON.stringify(JSON.parse(lastData), null, 2).substring(0, 1000) : 'Нет данных'}
                    </pre><br>
                    
                    <strong>Ошибка:</strong><br>
                    ${lastError || 'Нет информации об ошибке'}
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="location.reload()" style="
                    padding: 10px 25px;
                    background: #ffc107;
                    color: #856404;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                ">
                    Обновить страницу
                </button>
                
                <button onclick="testWithMockData()" style="
                    padding: 10px 25px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">
                    Загрузить тестовые данные
                </button>
                
                <button onclick="checkWorkerConnection()" style="
                    padding: 10px 25px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">
                    Проверить Worker
                </button>
            </div>
        </div>
    `;
}

// Вспомогательные функции
function formatDate(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
        return 'Неизвестная дата';
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

// Функции для отладки
function showRawData() {
    const debugDiv = document.getElementById('debugData');
    if (debugDiv) {
        debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
    }
}

function testWithMockData() {
    const mockData = {
        success: true,
        data: {
            client: "Иван Иванов",
            bike: "Trek FX 2",
            tariff: "180",
            comment: "Тестовый комментарий. Всё работает!",
            debt: "0",
            lastPayment: { amount: "180", date: "30.01.2024" },
            nextPayment: "06.02.2024"
        }
    };
    
    console.log('Использую тестовые данные:', mockData);
    processSheetData(mockData);
}

async function checkWorkerConnection() {
    try {
        const response = await fetch(CONFIG.WORKER_URL + '/?sheetName=Client1');
        const data = await response.json();
        
        alert(`Worker работает! Статус: ${response.status}\n\nДанные: ${JSON.stringify(data).substring(0, 200)}...`);
        
        // Сохраняем и обрабатываем
        localStorage.setItem('lastWorkerResponse', JSON.stringify(data));
        processSheetData(data);
        
    } catch (error) {
        alert(`Ошибка соединения с Worker: ${error.message}`);
    }
}

// Загружаем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', loadClientData);
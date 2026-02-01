// Настройки
const CONFIG = {
    WORKER_URL: 'https://bikerent-proxy.ddradle.workers.dev/',
    SHEET_NAME: 'Client1'
};

// Загрузка данных
async function loadClientData() {
    try {
        console.log('Начинаю загрузку данных...');
        
        const url = `${CONFIG.WORKER_URL}/?sheetName=${CONFIG.SHEET_NAME}`;
        console.log('URL запроса:', url);
        
        const response = await fetch(url);
        console.log('Статус ответа:', response.status);
        
        const data = await response.json();
        console.log('Получены данные:', data);
        
        // Отображаем данные
        displayData(data);
        
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('content').innerHTML = `
            <div class="error">
                <h3>Ошибка загрузки</h3>
                <p>${error.message}</p>
                <button onclick="loadClientData()">Повторить</button>
                <button onclick="showTestData()">Показать тестовые данные</button>
            </div>
        `;
    }
}

// Отображение данных
function displayData(data) {
    const content = document.getElementById('content');
    
    // Если это формат Google Apps Script
    let clientData = data;
    if (data.success && data.data) {
        clientData = data.data;
    }
    
    // Блок 1: Информация клиента
    let html = `
        <div class="block block-1">
            <div class="bike-emoji">🚲</div>
            <div class="client-info">
                <h2>${clientData.client || clientData.name || 'Клиент'}</h2>
                <div class="details">
                    <div class="detail-item">
                        <span class="label">Велосипед:</span>
                        <span class="value">${clientData.bike || 'Trek FX 2'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Тариф:</span>
                        <span class="value">${clientData.tariff || '180'} zł/неделю</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="block block-2 ${(clientData.debt || 0) > 0 ? 'overdue' : ''}">
            <div class="payment-info">
    `;
    
    // Последний платеж
    if (clientData.lastPayment) {
        html += `
            <div class="payment-item">
                <span class="label">Последний платеж:</span>
                <span class="value">${clientData.lastPayment.amount || '180'}zł - ${clientData.lastPayment.date || '30.01.2024'}</span>
            </div>
        `;
    }
    
    // Следующий платеж
    if (clientData.nextPayment) {
        html += `
            <div class="payment-item">
                <span class="label">Следующий платеж:</span>
                <span class="value">${clientData.nextPayment}</span>
            </div>
        `;
    }
    
    // Задолженность
    if (clientData.debt > 0) {
        html += `
            <div class="debt">
                Задолженность: ${clientData.debt}zł
            </div>
        `;
    }
    
    html += '</div></div>';
    
    // Комментарий
    if (clientData.comment) {
        html += `
            <div class="block block-3">
                <div class="message">
                    <h3>Сообщение от BikeRent</h3>
                    <div class="message-content">
                        ${clientData.comment}
                    </div>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// Тестовые данные
function showTestData() {
    const testData = {
        success: true,
        data: {
            client: "Иван Иванов",
            bike: "Trek FX 2",
            tariff: "180",
            comment: "Привет! Это тестовые данные. Настройте Worker для реальных данных.",
            debt: "0",
            lastPayment: { amount: "180", date: "30.01.2024" },
            nextPayment: "06.02.2024"
        }
    };
    displayData(testData);
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Сначала покажем тестовые данные
    showTestData();
    
    // Потом попробуем загрузить реальные
    setTimeout(loadClientData, 1000);
});
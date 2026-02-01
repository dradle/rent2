// Cloudflare Worker для доступа к Google Sheets
// Разместите этот код в Cloudflare Workers Dashboard

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // Разрешаем запросы с вашего сайта GitHub Pages
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Для предварительных запросов OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Получаем параметры из URL
    const url = new URL(request.url)
    const sheetId = url.searchParams.get('sheetId')
    const sheetName = url.searchParams.get('sheetName')
    
    if (!sheetId || !sheetName) {
      return new Response(JSON.stringify({ error: 'Не указаны sheetId или sheetName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ваш Service Account JSON (замените этими данными)
    const serviceAccount = {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "your-private-key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\nВАШ_КЛЮЧ_ЗДЕСЬ\n-----END PRIVATE KEY-----\n",
      "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
      "client_id": "your-client-id",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
    }

    // Получаем JWT токен
    const jwtToken = await getGoogleAccessToken(serviceAccount)
    
    // Формируем URL для Google Sheets API
    const range = `${sheetName}!A2:F100` // Берем данные со 2 строки
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`
    
    // Делаем запрос к Google Sheets
    const response = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Возвращаем данные
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      }
    })
  }
}

// Функция для получения JWT токена
async function getGoogleAccessToken(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now
  }
  
  // Кодируем header и payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  
  // Подписываем (в реальном коде нужна библиотека для подписи)
  // Здесь используем упрощенный вариант - Cloudflare Workers поддерживают Web Crypto API
  const signature = await signWithPrivateKey(signatureInput, serviceAccount.private_key)
  
  const jwt = `${signatureInput}.${signature}`
  
  // Обмениваем JWT на access token
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  
  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// Вспомогательные функции
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function signWithPrivateKey(data, privateKey) {
  // Упрощенная версия - в реальности используйте библиотеку для подписи
  // Для тестирования можно временно использовать мок
  return 'test-signature'
}
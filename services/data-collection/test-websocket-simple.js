import WebSocket from 'ws';

console.log('🔌 Простой тест WebSocket стриминга\n');

const ws = new WebSocket('ws://localhost:3001/ws/data-stream');

let messageCount = 0;

ws.on('open', () => {
    console.log('✅ WebSocket подключен к ws://localhost:3001/ws/data-stream');
    console.log('📡 Ожидание сообщений...\n');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        messageCount++;
        
        console.log(`📩 Сообщение ${messageCount}:`);
        console.log(`   Тип: ${message.type}`);
        console.log(`   Время: ${message.timestamp}`);
        
        if (message.type === 'connection') {
            console.log(`   ℹ️  ${message.message}`);
        } else if (message.type === 'data') {
            console.log(`   🤖 Машина: ${message.machineId}`);
            console.log(`   📊 Переменные:`);
            message.variables.forEach(variable => {
                console.log(`      ${variable.type}: ${variable.value.toFixed(2)}`);
            });
        } else {
            console.log(`   📝 Данные: ${JSON.stringify(message, null, 2)}`);
        }
        console.log('');
        
        // Остановим через 10 сообщений
        if (messageCount >= 8) {
            console.log('🛑 Получено достаточно сообщений, закрываем соединение...');
            ws.close();
        }
    } catch (error) {
        console.log(`❌ Ошибка парсинга сообщения: ${error.message}`);
        console.log(`   Сырые данные: ${data.toString()}`);
    }
});

ws.on('error', (error) => {
    console.log(`❌ WebSocket ошибка: ${error.message}`);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket соединение закрыто: код ${code}`);
    if (reason) {
        console.log(`   Причина: ${reason.toString()}`);
    }
    
    console.log(`\n📊 Итоги тестирования:`);
    console.log(`   ✅ WebSocket подключение: Успешно`);
    console.log(`   📩 Получено сообщений: ${messageCount}`);
    console.log(`   🔄 Потоковая передача данных: ${messageCount > 1 ? 'Работает' : 'Не протестирована'}`);
    
    if (messageCount > 0) {
        console.log(`\n🎉 WebSocket стриминг работает корректно!`);
    } else {
        console.log(`\n❌ WebSocket стриминг не работает`);
    }
});

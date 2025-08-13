#!/usr/bin/env node

/**
 * Тестовый клиент для WebSocket стриминга данных
 * Использование: node test-websocket-client.js
 */

import WebSocket from 'ws';

class TestWebSocketClient {
  constructor(url = 'ws://localhost:3001/ws/data-stream') {
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageCount = 0;
  }

  connect() {
    console.log(`🔌 Подключение к WebSocket: ${this.url}`);
    
    this.ws = new WebSocket(this.url);
    
    this.ws.on('open', () => {
      console.log('✅ WebSocket подключен');
      this.isConnected = true;
      this.startDemo();
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Ошибка парсинга сообщения:', error);
      }
    });
    
    this.ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket закрыт: ${code} - ${reason}`);
      this.isConnected = false;
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error.message);
    });
  }

  handleMessage(message) {
    this.messageCount++;
    
    switch (message.type) {
      case 'ping':
        console.log('🏓 Получен ping:', message.payload?.message);
        this.sendPong();
        break;
        
      case 'subscribe':
        if (message.payload?.success) {
          console.log(`✅ Подписка создана: ${message.subscriptionId}`);
          this.subscriptions.set(message.subscriptionId, Date.now());
        } else {
          console.log(`❌ Ошибка подписки: ${message.payload?.message}`);
        }
        break;
        
      case 'data':
        this.handleDataMessage(message);
        break;
        
      case 'error':
        console.log(`❌ Получена ошибка: ${message.payload?.error}`);
        break;
        
      default:
        console.log(`📩 Неизвестное сообщение: ${message.type}`, message);
    }
  }

  handleDataMessage(message) {
    const { dataPoints, count, timeRange, realtime } = message.payload;
    const subscriptionId = message.subscriptionId;
    
    if (realtime) {
      console.log(`📊 Realtime данные: ${count} точек`);
    } else {
      console.log(`📊 Данные по подписке ${subscriptionId}: ${count} точек`);
    }
    
    if (dataPoints && dataPoints.length > 0) {
      // Показываем первые несколько точек для примера
      const samplesToShow = Math.min(3, dataPoints.length);
      console.log('   Примеры данных:');
      
      for (let i = 0; i < samplesToShow; i++) {
        const dp = dataPoints[i];
        console.log(`     ${dp.variableType}${dp.variableAddress}: ${dp.value} (${dp.quality}) @ ${new Date(dp.timestamp).toISOString()}`);
      }
      
      if (dataPoints.length > samplesToShow) {
        console.log(`     ... и еще ${dataPoints.length - samplesToShow} точек`);
      }
    }
    
    if (timeRange) {
      console.log(`   Временной диапазон: ${new Date(timeRange.startTime).toISOString()} - ${new Date(timeRange.endTime).toISOString()}`);
    }
  }

  sendMessage(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.log('❌ WebSocket не подключен');
      return false;
    }
  }

  sendPong() {
    return this.sendMessage({
      type: 'pong',
      timestamp: new Date(),
    });
  }

  subscribe(machineId, variableType = null, variableAddress = null, interval = 5000) {
    const subscriptionId = `test_sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const subscription = {
      type: 'subscribe',
      subscriptionId,
      payload: {
        machineId,
        variableType,
        variableAddress,
        interval,
      },
      timestamp: new Date(),
    };
    
    console.log(`📝 Создание подписки: машина=${machineId}, тип=${variableType || 'любой'}, адрес=${variableAddress || 'любой'}, интервал=${interval}ms`);
    
    return this.sendMessage(subscription) ? subscriptionId : null;
  }

  unsubscribe(subscriptionId) {
    const message = {
      type: 'unsubscribe',
      subscriptionId,
      timestamp: new Date(),
    };
    
    console.log(`🗑️ Отмена подписки: ${subscriptionId}`);
    this.subscriptions.delete(subscriptionId);
    
    return this.sendMessage(message);
  }

  async startDemo() {
    console.log('\n🚀 Начинаем демонстрацию WebSocket функционала\n');
    
    // Ждем немного после подключения
    await this.sleep(1000);
    
    // Подписка на все данные машины pmac-001
    const sub1 = this.subscribe('pmac-001', null, null, 3000);
    
    // Ждем 10 секунд
    await this.sleep(10000);
    
    // Подписка на конкретную переменную
    const sub2 = this.subscribe('pmac-001', 'P', 100, 2000);
    
    // Ждем еще 10 секунд
    await this.sleep(10000);
    
    // Отменяем первую подписку
    if (sub1) {
      this.unsubscribe(sub1);
    }
    
    // Ждем еще 5 секунд
    await this.sleep(5000);
    
    // Подписка только на I переменные
    const sub3 = this.subscribe('pmac-001', 'I', null, 1000);
    
    // Ждем и отменяем все подписки
    await this.sleep(10000);
    
    console.log('\n📊 Статистика:');
    console.log(`   Всего получено сообщений: ${this.messageCount}`);
    console.log(`   Активных подписок: ${this.subscriptions.size}`);
    
    // Отменяем все оставшиеся подписки
    for (const [subId] of this.subscriptions) {
      this.unsubscribe(subId);
    }
    
    await this.sleep(2000);
    
    console.log('\n🏁 Демонстрация завершена. Закрываем подключение...');
    this.disconnect();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Запуск клиента
const client = new TestWebSocketClient();

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал прерывания. Закрываем подключение...');
  client.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения. Закрываем подключение...');
  client.disconnect();
  process.exit(0);
});

// Подключаемся
client.connect();

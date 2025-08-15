// Простой тест основных компонентов
console.log('🧪 Тест основных компонентов Knowledge Base Service...');

async function testBasic() {
  try {
    console.log('1. Проверка process и console...');
    console.log('✅ process и console работают');
    
    console.log('2. Проверка fs...');
    const fs = await import('fs');
    console.log('✅ fs модуль импортирован');
    
    console.log('3. Проверка path...');
    const path = await import('path');
    console.log('✅ path модуль импортирован');
    
    console.log('4. Проверка текущей директории...');
    console.log('Текущая директория:', process.cwd());
    console.log('✅ директория определена');
    
    console.log('5. Проверка переменных окружения...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('✅ переменные окружения доступны');
    
    console.log('\n🎉 Базовые компоненты работают!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBasic();

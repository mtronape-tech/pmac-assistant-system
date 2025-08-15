// Тест импортов Knowledge Base Service
console.log('🧪 Тестирование импортов Knowledge Base Service...');

async function testImports() {
  try {
    console.log('1. Проверка config...');
    const config = await import('./src/config/index');
    console.log('✅ config импортирован');
    
    console.log('2. Проверка logger...');
    const logger = await import('./src/utils/logger');
    console.log('✅ logger импортирован');
    
    console.log('3. Проверка WeaviateService...');
    const WeaviateService = await import('./src/services/weaviate-service');
    console.log('✅ WeaviateService импортирован');
    
    console.log('4. Проверка AIService...');
    const AIService = await import('./src/services/openai-service');
    console.log('✅ AIService импортирован');
    
    console.log('5. Проверка KnowledgeController...');
    const KnowledgeController = await import('./src/controllers/knowledge-controller');
    console.log('✅ KnowledgeController импортирован');
    
    console.log('\n🎉 Все модули успешно импортированы!');
    
  } catch (error) {
    console.error('❌ Ошибка при импорте:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImports();

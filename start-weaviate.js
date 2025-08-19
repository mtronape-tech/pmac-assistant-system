const { EmbeddedDB } = require('weaviate-ts-embedded');

async function startWeaviate() {
  try {
    console.log('🚀 Запуск встроенного Weaviate...');
    
         const weaviateInstance = new EmbeddedDB({
       port: 8080,
       host: 'localhost',
       dataPath: './weaviate-data'
     });

         await weaviateInstance.start();
    
    console.log('✅ Weaviate запущен на http://localhost:8080');
    console.log('📁 Данные сохраняются в ./weaviate-data');
    console.log('🔄 Для остановки нажмите Ctrl+C');
    
    // Graceful shutdown
         process.on('SIGINT', async () => {
       console.log('\n🛑 Остановка Weaviate...');
       await weaviateInstance.stop();
       console.log('✅ Weaviate остановлен');
       process.exit(0);
     });
    
         process.on('SIGTERM', async () => {
       console.log('\n🛑 Остановка Weaviate...');
       await weaviateInstance.stop();
       console.log('✅ Weaviate остановлен');
       process.exit(0);
     });
    
  } catch (error) {
    console.error('❌ Ошибка запуска Weaviate:', error);
    process.exit(1);
  }
}

startWeaviate();

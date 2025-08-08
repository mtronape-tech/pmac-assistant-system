import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function testMCPServer() {
  console.log("Тестирование MCP сервера PMAC Assistant...");

  try {
    // Создаем клиент
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    });

    // Подключаемся к серверу
    const transport = new StreamableHTTPClientTransport(
      new URL("http://localhost:3001")
    );

    await client.connect(transport);
    console.log("✅ Подключение к MCP серверу установлено");

    // Получаем список инструментов
    const tools = await client.listTools();
    console.log(`📋 Доступно инструментов: ${tools.tools.length}`);
    
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Тестируем чтение переменной PMAC
    console.log("\n🔧 Тестирование чтения переменной PMAC...");
    const readResult = await client.callTool({
      name: "read_pmac_variable",
      arguments: {
        variableType: "P",
        address: 1,
        machineId: "test-machine"
      }
    });
    console.log("Результат:", readResult.content[0].text);

    // Тестируем получение статуса PMAC
    console.log("\n📊 Тестирование получения статуса PMAC...");
    const statusResult = await client.callTool({
      name: "get_pmac_status",
      arguments: {
        machineId: "test-machine"
      }
    });
    console.log("Статус PMAC получен");

    // Тестируем анализ трендов
    console.log("\n📈 Тестирование анализа трендов...");
    const trendResult = await client.callTool({
      name: "analyze_trends",
      arguments: {
        variableType: "P",
        address: 1,
        hours: 1,
        machineId: "test-machine"
      }
    });
    console.log("Анализ трендов:", trendResult.content[0].text);

    // Тестируем генерацию рекомендаций
    console.log("\n💡 Тестирование генерации рекомендаций...");
    const recResult = await client.callTool({
      name: "generate_recommendations",
      arguments: {
        machineId: "test-machine",
        focus: "performance",
        hours: 1
      }
    });
    console.log("Рекомендации:", recResult.content[0].text);

    console.log("\n✅ Все тесты выполнены успешно!");

  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  }
}

// Запускаем тест
testMCPServer().catch(console.error);

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const configPath = getConfigPath();
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Простой парсер INI файла
    const config: any = {};
    let currentSection = '';
    
    configContent.split('\n').forEach(line => {
      line = line.trim();
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        config[currentSection] = {};
      } else if (line.includes('=') && currentSection) {
        const [key, value] = line.split('=', 2);
        config[currentSection][key.trim()] = value.trim();
      }
    });

    return NextResponse.json({
      openRouter: {
        apiKey: config.OpenRouter?.api_key || '',
        baseUrl: config.OpenRouter?.base_url || ''
      }
    });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configPath = getConfigPath();
    
    // Читаем текущую конфигурацию
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const lines = configContent.split('\n');
    
    // Обновляем API ключ
    if (body.openRouter?.apiKey) {
      let openRouterSectionFound = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '[OpenRouter]') {
          openRouterSectionFound = true;
        } else if (line.startsWith('[') && line !== '[OpenRouter]') {
          // Если встретили другую секцию, значит секция OpenRouter закончилась
          if (openRouterSectionFound) {
            break;
          }
        } else if (openRouterSectionFound && line.startsWith('api_key=')) {
          // Обновляем существующий API ключ
          lines[i] = `api_key=${body.openRouter.apiKey}`;
          break;
        }
      }
      
      // Если секция OpenRouter не найдена или ключ не найден, добавляем
      if (!openRouterSectionFound) {
        lines.push('');
        lines.push('[OpenRouter]');
        lines.push(`api_key=${body.openRouter.apiKey}`);
      }
    }
    
    // Записываем обновленную конфигурацию
    fs.writeFileSync(configPath, lines.join('\n'), 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

function getConfigPath(): string {
  // Путь к конфигурационному файлу (от корня проекта RAG)
  const configPath = path.join(process.cwd(), '../../../services/knowledge-base/config.ini');
  console.log('Ищем config.ini по пути:', configPath);
  console.log('Текущая рабочая директория:', process.cwd());
  
  // Попробуем несколько вариантов путей
  let configPathFinal = configPath;
  if (!fs.existsSync(configPath)) {
    console.log('Первый путь не найден, пробуем альтернативы...');
    
    // Альтернативный путь
    const altPath = path.join(process.cwd(), '../../services/knowledge-base/config.ini');
    console.log('Пробуем альтернативный путь:', altPath);
    
    if (fs.existsSync(altPath)) {
      configPathFinal = altPath;
      console.log('Альтернативный путь найден');
    } else {
      console.log('Альтернативный путь тоже не найден');
      
      // Еще один вариант
      const altPath2 = path.join(process.cwd(), '../services/knowledge-base/config.ini');
      console.log('Пробуем третий путь:', altPath2);
      
      if (fs.existsSync(altPath2)) {
        configPathFinal = altPath2;
        console.log('Третий путь найден');
      } else {
        console.log('Все пути не найдены');
        throw new Error('Config file not found');
      }
    }
  }
  
  console.log('Используем путь:', configPathFinal);
  return configPathFinal;
}

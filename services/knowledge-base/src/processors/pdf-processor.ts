import { readFile, stat } from 'fs/promises';
import pdfParse from 'pdf-parse';
import { BaseDocumentProcessor } from './document-processor.js';
import { logger } from '../utils/logger.js';

export class PDFProcessor extends BaseDocumentProcessor {
  protected supportedTypes = ['application/pdf'];

  canProcess(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async extractText(filePath: string): Promise<string> {
    try {
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer, {
        // Используем только поддерживаемые опции
        max: 0, // 0 означает обработать все страницы
      });
      
      let text = this.fixEncoding(data.text || '');
      text = this.cleanupPDFText(text);
      
      // Дополнительная обработка для технических документов
      text = this.enhanceTextForTechnical(text);
      
      return text;
    } catch (error) {
      logger.error(`Ошибка извлечения текста из PDF ${filePath}:`, error);
      throw error;
    }
  }

  async extractMetadata(filePath: string): Promise<any> {
    try {
      const stats = await stat(filePath);
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer);
      
      // Проверяем и исправляем кодировку метаданных PDF
      const pdfInfo = data.info || {};
      const title = this.fixEncoding(pdfInfo.Title || '');
      const author = this.fixEncoding(pdfInfo.Author || '');
      const subject = this.fixEncoding(pdfInfo.Subject || '');
      
      return {
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        pageCount: data.numpages,
        pdfInfo: {
          ...pdfInfo,
          Title: title,
          Author: author,
          Subject: subject
        },
        wordCount: this.countWords(data.text),
        characterCount: data.text.length,
        language: this.detectLanguage(data.text),
        hasImages: this.hasImages(data),
        hasMetadata: Boolean(data.metadata),
        version: data.version || 'unknown',
      };
    } catch (error) {
      logger.error(`Ошибка извлечения метаданных из PDF ${filePath}:`, error);
      throw error;
    }
  }

  private cleanupPDFText(text: string): string {
    if (!text) return '';
    
    return text
      // Убираем излишние переносы строк и пробелы
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      // Убираем артефакты OCR, но сохраняем русские символы
      .replace(/[^\w\s\-.,!?;:()\[\]{}"`'«»""''№%а-яёА-ЯЁ]/g, ' ')
      // Убираем повторяющиеся символы
      .replace(/(.)\1{5,}/g, '$1')
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectLanguage(text: string): string {
    // Простое определение языка для PDF
    const sample = text.substring(0, 1000).toLowerCase();
    
    const russianPattern = /[а-яё]/g;
    const englishPattern = /[a-z]/g;
    
    const russianMatches = (sample.match(russianPattern) || []).length;
    const englishMatches = (sample.match(englishPattern) || []).length;
    
    if (russianMatches > englishMatches) {
      return 'ru';
    } else if (englishMatches > russianMatches) {
      return 'en';
    } else {
      return 'mixed';
    }
  }

  private hasImages(data: any): boolean {
    // Проверяем наличие изображений в PDF
    // Это упрощенная проверка, в реальности нужен более сложный анализ
    return Boolean(data.text.includes('Figure') || 
                   data.text.includes('Рисунок') || 
                   data.text.includes('Схема') ||
                   data.text.includes('Диаграмма'));
  }

  private enhanceTextForTechnical(text: string): string {
    if (!text) return '';
    
    // Улучшения для технических документов PMAC
    return text
      // Нормализуем технические термины
      .replace(/P\s*-\s*variable/gi, 'P-variable')
      .replace(/M\s*-\s*variable/gi, 'M-variable')
      .replace(/I\s*\+\s*\+/gi, 'I++')
      .replace(/PMAC/gi, 'PMAC')
      // Сохраняем структуру кода и формул
      .replace(/(\w+)\s*=\s*(\w+)/g, '$1=$2')
      // Улучшаем разделение секций
      .replace(/\n([A-Z][A-Z\s]{5,})\n/g, '\n\n$1\n\n')
      // Сохраняем списки и нумерацию
      .replace(/(\d+\.\s+)/g, '\n$1')
      // Нормализуем технические символы
      .replace(/(\d+)\s*([a-zA-Z]+)/g, '$1$2')
      .replace(/([a-zA-Z])\s*(\d+)/g, '$1$2');
  }

  // Исправление кодировки для метаданных PDF
  private fixEncoding(text: string): string {
    if (!text) return '';
    
    try {
      // Проверяем, есть ли признаки неправильной кодировки
      const hasEncodingIssues = text.includes('Ð') || text.includes('Ñ') || 
                                text.includes('Đ') || text.includes('Ñ') ||
                                text.includes('Ð') || text.includes('Ñ');
      
      if (!hasEncodingIssues) {
        return text; // Кодировка уже правильная
      }
      
      logger.info('Обнаружены проблемы с кодировкой, исправляем...');
      
      // Попытка 1: Прямое преобразование через Buffer
      try {
        const buffer = Buffer.from(text, 'binary');
        const decoded = buffer.toString('utf8');
        if (!decoded.includes('Ð') && !decoded.includes('Ñ')) {
          logger.info('Кодировка исправлена через Buffer');
          return decoded;
        }
      } catch (e) {
        logger.warn('Ошибка Buffer преобразования:', e);
      }
      
      // Попытка 2: Через iconv-lite если доступен
      try {
        const iconv = require('iconv-lite');
        const decoded = iconv.decode(Buffer.from(text, 'binary'), 'win1251');
        if (!decoded.includes('Ð') && !decoded.includes('Ñ')) {
          logger.info('Кодировка исправлена через iconv-lite');
          return decoded;
        }
      } catch (e) {
        logger.warn('iconv-lite недоступен или не работает');
      }
      
      // Попытка 3: Ручная замена известных символов Windows-1251
      let fixed = text;
      
      // Заменяем символы Windows-1251 на UTF-8 (используем массив для избежания дублирования)
      const charMap = [
        ['Ð', 'А'], ['Ñ', 'Б'], ['Ð', 'В'], ['Ñ', 'Г'], ['Ñ', 'Д'],
        ['Đ', 'Е'], ['Ñ', 'Ж'], ['Ñ', 'З'], ['Đ', 'И'], ['Ñ', 'Й'],
        ['Đ', 'К'], ['Ñ', 'Л'], ['Ñ', 'М'], ['Ñ', 'Н'], ['Đ', 'О'],
        ['Ñ', 'П'], ['Đ', 'Р'], ['Ñ', 'С'], ['Ñ', 'Т'], ['Đ', 'У'],
        ['Đ', 'Ф'], ['Ñ', 'Х'], ['Ñ', 'Ц'], ['Ñ', 'Ч'], ['Ñ', 'Ш'],
        ['Ñ', 'Щ'], ['Đ', 'Ъ'], ['Ñ', 'Ы'], ['Đ', 'Ь'], ['Đ', 'Э'],
        ['Đ', 'Ю'], ['Đ', 'Я'],
        ['Đ', 'а'], ['Ñ', 'б'], ['Ð', 'в'], ['Ñ', 'г'], ['Ñ', 'д'],
        ['Đ', 'е'], ['Ñ', 'ж'], ['Ñ', 'з'], ['Đ', 'и'], ['Ñ', 'й'],
        ['Đ', 'к'], ['Ñ', 'л'], ['Ñ', 'м'], ['Ñ', 'н'], ['Đ', 'о'],
        ['Ñ', 'п'], ['Đ', 'р'], ['Ñ', 'с'], ['Ñ', 'т'], ['Đ', 'у'],
        ['Đ', 'ф'], ['Ñ', 'х'], ['Ñ', 'ц'], ['Ñ', 'ч'], ['Ñ', 'ш'],
        ['Ñ', 'щ'], ['Đ', 'ъ'], ['Ñ', 'ы'], ['Đ', 'ь'], ['Đ', 'э'],
        ['Đ', 'ю'], ['Đ', 'я']
      ];
      
      for (const [win1251, utf8] of charMap) {
        fixed = fixed.replace(new RegExp(win1251, 'g'), utf8);
      }
      
      // Дополнительные замены для часто встречающихся проблем
      const additionalFixes = [
        ['Ð¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÐµÐ»Ñ', 'пользователь'],
        ['Ð¿Ñ€Ð¾Ð³Ñ€Ð°Ð¼Ð¼Ñ‹', 'программы'],
        ['Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ñ', 'инструкция'],
        ['Ð¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ', 'пользования'],
        ['Ð¿Ñ€Ð¾Ð³Ñ€Ð°Ð¼Ð¼Ñ‹', 'программы'],
        ['Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ñ', 'инструкция'],
        ['Ð¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÐµÐ»Ñ', 'пользователь'],
        ['Ð¿Ñ€Ð¾Ð³Ñ€Ð°Ð¼Ð¼Ñ‹', 'программы'],
        ['Ð¸Ð½ÑÑ‚Ñ€ÑƒÐºÑ†Ð¸Ñ', 'инструкция'],
        ['Ð¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ', 'пользования']
      ];
      
      for (const [wrong, correct] of additionalFixes) {
        fixed = fixed.replace(new RegExp(wrong, 'gi'), correct);
      }
      
      logger.info('Кодировка исправлена ручной заменой');
      return fixed;
      
    } catch (error) {
      logger.warn('Ошибка исправления кодировки:', error);
      return text; // Возвращаем исходный текст при ошибке
    }
  }
}

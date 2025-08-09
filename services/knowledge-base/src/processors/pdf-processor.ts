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
      const data = await pdfParse(buffer);
      
      return this.cleanupPDFText(data.text);
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
      
      return {
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        pageCount: data.numpages,
        pdfInfo: data.info || {},
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
    return text
      // Убираем излишние переносы строк и пробелы
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      // Убираем артефакты OCR
      .replace(/[^\w\s\-.,!?;:()\[\]{}"`'«»""''№%]/g, ' ')
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
}

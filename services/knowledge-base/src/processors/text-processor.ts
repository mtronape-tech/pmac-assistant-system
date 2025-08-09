import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { BaseDocumentProcessor } from './document-processor.js';
import { logger } from '../utils/logger.js';

export class TextProcessor extends BaseDocumentProcessor {
  protected supportedTypes = ['text/plain', 'text/markdown', 'application/text'];

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType) || 
           mimeType.startsWith('text/');
  }

  async extractText(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.cleanupText(content);
    } catch (error) {
      logger.error(`Ошибка чтения текстового файла ${filePath}:`, error);
      throw error;
    }
  }

  async extractMetadata(filePath: string): Promise<any> {
    try {
      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf-8');
      
      return {
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        encoding: 'utf-8',
        lineCount: content.split('\n').length,
        wordCount: this.countWords(content),
        characterCount: content.length,
        language: this.detectLanguage(content),
        hasMarkdown: this.hasMarkdownSyntax(content),
      };
    } catch (error) {
      logger.error(`Ошибка извлечения метаданных из ${filePath}:`, error);
      throw error;
    }
  }

  private cleanupText(text: string): string {
    // Убираем лишние пробелы и переносы строк
    return text
      .replace(/\r\n/g, '\n') // Нормализуем переносы строк
      .replace(/\n{3,}/g, '\n\n') // Убираем излишние переносы
      .replace(/[ \t]+/g, ' ') // Убираем лишние пробелы
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectLanguage(text: string): string {
    // Простое определение языка на основе характерных слов
    const russianWords = ['и', 'в', 'на', 'с', 'по', 'для', 'от', 'к', 'до', 'из', 'при', 'над', 'под', 'за', 'через'];
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up'];
    
    const words = text.toLowerCase().split(/\s+/);
    
    const russianMatches = russianWords.filter(word => words.includes(word)).length;
    const englishMatches = englishWords.filter(word => words.includes(word)).length;
    
    if (russianMatches > englishMatches) {
      return 'ru';
    } else if (englishMatches > russianMatches) {
      return 'en';
    } else {
      return 'unknown';
    }
  }

  private hasMarkdownSyntax(text: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/, // Заголовки
      /\*\*.*?\*\*/, // Жирный текст
      /\*.*?\*/, // Курсив
      /\[.*?\]\(.*?\)/, // Ссылки
      /```.*?```/s, // Блоки кода
      /`.*?`/, // Инлайн код
      /^\*\s|^-\s|^\+\s/m, // Списки
      /^\d+\.\s/m, // Нумерованные списки
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  }
}

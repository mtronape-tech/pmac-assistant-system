import { readFile, stat } from 'fs/promises';
import * as cheerio from 'cheerio';
import { BaseDocumentProcessor } from './document-processor.js';
import { logger } from '../utils/logger.js';

export class HTMLProcessor extends BaseDocumentProcessor {
  protected supportedTypes = ['text/html', 'application/xhtml+xml'];

  canProcess(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  async extractText(filePath: string): Promise<string> {
    try {
      const html = await readFile(filePath, 'utf-8');
      const $ = cheerio.load(html);
      
      // Убираем ненужные элементы
      $('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation').remove();
      
      // Извлекаем основной контент
      const mainContent = this.extractMainContent($);
      
      return this.cleanupHTMLText(mainContent);
    } catch (error) {
      logger.error(`Ошибка извлечения текста из HTML ${filePath}:`, error);
      throw error;
    }
  }

  async extractMetadata(filePath: string): Promise<any> {
    try {
      const stats = await stat(filePath);
      const html = await readFile(filePath, 'utf-8');
      const $ = cheerio.load(html);
      
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content') || '';
      const author = $('meta[name="author"]').attr('content') || '';
      const language = $('html').attr('lang') || this.detectLanguage($.text());
      
      const headings = this.extractHeadings($);
      const links = this.extractLinks($);
      const images = this.extractImages($);
      
      return {
        fileSize: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        title,
        description,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        author,
        language,
        headings,
        linkCount: links.length,
        imageCount: images.length,
        hasTable: $('table').length > 0,
        hasForm: $('form').length > 0,
        wordCount: this.countWords($.text()),
        characterCount: $.text().length,
      };
    } catch (error) {
      logger.error(`Ошибка извлечения метаданных из HTML ${filePath}:`, error);
      throw error;
    }
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Пытаемся найти основной контент
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 0) {
        return element.text();
      }
    }

    // Если ничего не найдено, берем весь текст body
    return $('body').text();
  }

  private cleanupHTMLText(text: string): string {
    return text
      // Нормализуем пробелы и переносы
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      // Убираем HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .trim();
  }

  private extractHeadings($: cheerio.CheerioAPI): Array<{level: number, text: string}> {
    const headings: Array<{level: number, text: string}> = [];
    
    for (let i = 1; i <= 6; i++) {
      $(`h${i}`).each((_, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          headings.push({ level: i, text });
        }
      });
    }
    
    return headings;
  }

  private extractLinks($: cheerio.CheerioAPI): Array<{text: string, href: string}> {
    const links: Array<{text: string, href: string}> = [];
    
    $('a[href]').each((_, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href') || '';
      
      if (text && href && !href.startsWith('#')) {
        links.push({ text, href });
      }
    });
    
    return links;
  }

  private extractImages($: cheerio.CheerioAPI): Array<{alt: string, src: string}> {
    const images: Array<{alt: string, src: string}> = [];
    
    $('img[src]').each((_, elem) => {
      const alt = $(elem).attr('alt') || '';
      const src = $(elem).attr('src') || '';
      
      if (src) {
        images.push({ alt, src });
      }
    });
    
    return images;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectLanguage(text: string): string {
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
      return 'unknown';
    }
  }
}

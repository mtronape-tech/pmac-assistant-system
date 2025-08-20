import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  AIResponse, 
  SearchResult 
} from '../types/knowledge-types.js';

export class AIService {
  private client: OpenAI | null = null;
  private provider: 'openai' | 'openrouter';
  private model: string = '';
  private embeddingModel: string = '';
  private maxTokens: number = 4000;

  constructor() {
    this.provider = config.ai.provider;
    
    try {
      if (this.provider === 'openrouter') {
        if (!config.ai.openrouter.apiKey) {
          logger.warn('OpenRouter API ключ не настроен, AI функции будут отключены');
          this.client = null as any;
        } else {
          this.client = new OpenAI({
            apiKey: config.ai.openrouter.apiKey,
            baseURL: config.ai.openrouter.baseUrl,
            defaultHeaders: {
              'HTTP-Referer': 'http://localhost:3005',
              'X-Title': 'PMAC Assistant Knowledge Base',
            },
          });
          
          this.model = config.ai.openrouter.model;
          this.embeddingModel = config.ai.openrouter.embeddingModel;
          this.maxTokens = config.ai.openrouter.maxTokens;
          
          logger.info(`Инициализирован AIService с провайдером OpenRouter, модель: ${this.model}`);
        }
      } else {
        if (!config.ai.openai.apiKey) {
          logger.warn('OpenAI API ключ не настроен, AI функции будут отключены');
          this.client = null as any;
        } else {
          this.client = new OpenAI({
            apiKey: config.ai.openai.apiKey,
          });
          
          this.model = config.ai.openai.model;
          this.embeddingModel = config.ai.openai.embeddingModel;
          this.maxTokens = config.ai.openai.maxTokens;
          
          logger.info(`Инициализирован AIService с провайдером OpenAI, модель: ${this.model}`);
        }
      }
    } catch (error) {
      logger.warn('Ошибка инициализации AI сервиса, AI функции будут отключены:', error);
      this.client = null as any;
    }
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован, используем локальный эмбеддинг');
        return {
          embedding: this.generateLocalEmbedding(request.text, 1536),
          tokensUsed: 0,
          model: request.model || this.embeddingModel,
        };
      }

      const response = await this.client.embeddings.create({
        model: request.model || this.embeddingModel,
        input: request.text,
      });

      // Проверяем, что response.data существует и не пустой
      if (!response.data || response.data.length === 0) {
        logger.warn('Пустой ответ от AI сервиса, используем локальный эмбеддинг');
        return {
          embedding: this.generateLocalEmbedding(request.text, 1536),
          tokensUsed: 0,
          model: request.model || this.embeddingModel,
        };
      }

      const embedding = response.data[0].embedding;
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.debug(`Сгенерирован эмбеддинг для текста длиной ${request.text.length} символов, использовано ${tokensUsed} токенов (${this.provider})`);

      return {
        embedding,
        tokensUsed,
        model: request.model || this.embeddingModel,
      };
    } catch (error) {
      logger.error('Ошибка генерации эмбеддинга:', error);
      // Возвращаем локальный эмбеддинг при ошибке
      return {
        embedding: this.generateLocalEmbedding(request.text, 1536),
        tokensUsed: 0,
        model: request.model || this.embeddingModel,
      };
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован, используем локальные эмбеддинги');
        return texts.map(t => ({
          embedding: this.generateLocalEmbedding(t, 1536),
          tokensUsed: 0,
          model: this.embeddingModel,
        }));
      }
      
      const batchSize = 100; // OpenAI ограничение
      const results: EmbeddingResponse[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.client.embeddings.create({
          model: this.embeddingModel,
          input: batch,
        });

        let batchResults: EmbeddingResponse[];
        if (!response.data || response.data.length === 0) {
          logger.warn('Пустой ответ от AI сервиса для батча, используем локальные эмбеддинги');
          batchResults = batch.map(text => ({
            embedding: this.generateLocalEmbedding(text, 1536),
            tokensUsed: 0,
            model: this.embeddingModel,
          }));
        } else {
          batchResults = response.data.map((item, index) => ({
            embedding: item.embedding,
            tokensUsed: Math.floor((response.usage?.total_tokens || 0) / batch.length),
            model: this.embeddingModel,
          }));
        }

        results.push(...batchResults);
      }

      logger.debug(`Сгенерированы эмбеддинги для ${texts.length} текстов`);
      return results;
    } catch (error) {
      logger.error('Ошибка генерации пакетных эмбеддингов:', error);
      // Возвращаем пустые эмбеддинги при ошибке
      return texts.map(() => ({
        embedding: new Array(1536).fill(0),
        tokensUsed: 0,
        model: this.embeddingModel,
      }));
    }
  }

  async generateAIResponse(query: string, searchResults: SearchResult[]): Promise<AIResponse> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован, возвращаем базовый ответ');
        return {
          answer: `Извините, AI сервис временно недоступен. Ваш вопрос: "${query}". Пожалуйста, попробуйте позже.`,
          sources: searchResults,
          confidence: 0.1,
          reasoning: 'AI сервис не инициализирован',
          followUpQuestions: [],
        };
      }
      
      // Подготавливаем контекст из результатов поиска
      const context = this.prepareContext(searchResults);
      
      const systemPrompt = `Вы - ИИ-ассистент для работы с системами управления Turbo PMAC.
Ваша задача - отвечать на вопросы пользователей, используя предоставленную документацию.

Правила:
1. Отвечайте только на основе предоставленного контекста
2. Если информации недостаточно, честно скажите об этом
3. Всегда указывайте источники информации
4. Отвечайте на русском языке
5. Будьте конкретными и технически точными
6. Если вопрос касается безопасности, всегда подчеркивайте важность соблюдения мер предосторожности

Контекст из документации:
${context}`;

      const userPrompt = `Вопрос пользователя: ${query}

Пожалуйста, дайте подробный и точный ответ на основе предоставленной документации.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.3, // Более консервативная температура для технических ответов
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const answer = response.choices[0]?.message?.content || 'Извините, не удалось сгенерировать ответ.';
      
      // Оцениваем уверенность на основе количества и качества источников
      const confidence = this.calculateConfidence(searchResults, answer);
      
      // Генерируем объяснение рассуждений
      const reasoning = this.generateReasoning(searchResults, answer);
      
      // Генерируем дополнительные вопросы
      const followUpQuestions = await this.generateFollowUpQuestions(query, answer);

      return {
        answer,
        sources: searchResults,
        confidence,
        reasoning,
        followUpQuestions,
      };
    } catch (error) {
      logger.error('Ошибка генерации AI ответа:', error);
      throw error;
    }
  }

  private prepareContext(searchResults: SearchResult[]): string {
    return searchResults
      .slice(0, 5) // Берем топ-5 результатов
      .map((result, index) => {
        const source = (result.document as any).filename || result.document.title;
        const content = result.chunk?.content || '';
        return `[Источник ${index + 1}: ${source}]\n${content}\n`;
      })
      .join('\n---\n');
  }

  private calculateConfidence(searchResults: SearchResult[], answer: string): number {
    if (searchResults.length === 0) return 0.1;
    
    // Базовая уверенность на основе количества источников
    let confidence = Math.min(searchResults.length / 3, 1) * 0.6;
    
    // Добавляем уверенность на основе качества совпадений
    const avgScore = searchResults.reduce((sum, result) => sum + result.score, 0) / searchResults.length;
    confidence += avgScore * 0.3;
    
    // Добавляем уверенность на основе длины ответа
    const answerLength = answer.length;
    if (answerLength > 100 && answerLength < 2000) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95); // Максимум 95% уверенности
  }

  private generateReasoning(searchResults: SearchResult[], answer: string): string {
    const sourceCount = searchResults.length;
    const avgScore = searchResults.reduce((sum, result) => sum + result.score, 0) / searchResults.length;
    
    let reasoning = `Ответ основан на анализе ${sourceCount} релевантных документов `;
    reasoning += `со средним показателем релевантности ${(avgScore * 100).toFixed(1)}%. `;
    
    if (sourceCount >= 3 && avgScore > 0.7) {
      reasoning += 'Информация подтверждается несколькими источниками, что повышает надежность ответа.';
    } else if (sourceCount >= 2) {
      reasoning += 'Информация найдена в нескольких источниках, ответ достаточно надежен.';
    } else {
      reasoning += 'Информация основана на ограниченном количестве источников, рекомендуется дополнительная проверка.';
    }
    
    return reasoning;
  }

  private async generateFollowUpQuestions(originalQuery: string, answer: string): Promise<string[]> {
    try {
      const prompt = `На основе вопроса "${originalQuery}" и ответа "${answer.substring(0, 500)}..." 
предложите 3 кратких связанных вопроса, которые пользователь может захотеть задать далее. 
Вопросы должны быть конкретными и касаться PMAC систем. Отвечайте только вопросами, по одному на строке.`;

      if (!this.client) {
        logger.warn('AI клиент не инициализирован, возвращаем базовые вопросы');
        return [
          'Как настроить PMAC контроллер?',
          'Какие переменные наиболее важны для настройки?',
          'Как выполнить процедуру homing?'
        ];
      }
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt },
        ],
      });

      const questions = response.choices[0]?.message?.content
        ?.split('\n')
        .filter(q => q.trim().length > 0 && q.includes('?'))
        .map(q => q.trim().replace(/^\d+\.\s*/, ''))
        .slice(0, 3) || [];

      return questions;
    } catch (error) {
      logger.warn('Не удалось сгенерировать дополнительные вопросы:', error);
      return [];
    }
  }

  async summarizeDocument(content: string, title: string): Promise<string> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован, возвращаем базовое резюме');
        return `Документ "${title}" содержит информацию о PMAC системах. AI сервис временно недоступен для создания подробного резюме.`;
      }
      
      const prompt = `Создайте краткое резюме следующего технического документа о PMAC системах.
Резюме должно быть информативным и содержать ключевые моменты.

Название документа: ${title}

Содержимое:
${content.substring(0, 8000)}${content.length > 8000 ? '...' : ''}

Резюме (на русском языке):`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          { role: 'user', content: prompt },
        ],
      });

      return response.choices[0]?.message?.content || 'Не удалось создать резюме документа.';
    } catch (error) {
      logger.error('Ошибка создания резюме документа:', error);
      return `Документ "${title}" содержит информацию о PMAC системах. Ошибка AI сервиса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }

  // Локальный детерминированный эмбеддинг (хеш + позиционное кодирование)
  private generateLocalEmbedding(text: string, dimension: number): number[] {
    const vec = new Array(dimension).fill(0);
    if (!text || text.length === 0) return vec;
    const norm = (code: number) => (code % 997) / 997; // простая нормализация
    const len = Math.min(text.length, 5000); // ограничим вклад текста
    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);
      const idx1 = (i * 31 + code) % dimension;
      const idx2 = (i * 131 + code * 7) % dimension;
      vec[idx1] += norm(code);
      vec[idx2] += norm(code * (1 + (i % 7)));
    }
    // L2-нормализация
    const l2 = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    for (let i = 0; i < dimension; i++) vec[i] = vec[i] / l2;
    return vec;
  }

  async extractKeywords(content: string): Promise<string[]> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован, возвращаем базовые ключевые слова');
        return ['pmac', 'контроллер', 'настройка', 'система', 'движение', 'ось', 'энкодер', 'двигатель'];
      }
      
      const prompt = `Извлеките 10-15 ключевых слов и фраз из следующего технического текста о PMAC системах.
Возвращайте только ключевые слова, разделенные запятыми.

Текст:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

Ключевые слова:`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 200,
        temperature: 0.2,
        messages: [
          { role: 'user', content: prompt },
        ],
      });

      const keywords = response.choices[0]?.message?.content
        ?.split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 2)
        .slice(0, 15) || [];

      return keywords;
    } catch (error) {
      logger.warn('Не удалось извлечь ключевые слова:', error);
      return ['pmac', 'контроллер', 'настройка', 'система', 'движение', 'ось', 'энкодер', 'двигатель'];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        logger.warn('AI клиент не инициализирован - проверьте API ключи в .env файле');
        return false;
      }

      logger.info(`Проверка подключения к ${this.provider} с моделью ${this.model}`);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Test' },
        ],
      });

      logger.info(`✅ ${this.provider} подключение успешно`);
      return response.choices.length > 0;
    } catch (error: any) {
      // Более подробная диагностика ошибок
      if (error.status === 403) {
        if (error.message?.includes('unsupported_country_region_territory')) {
          logger.error(`❌ ${this.provider}: Ваша страна/регион не поддерживается. Рекомендуется использовать OpenAI или VPN.`);
        } else {
          logger.error(`❌ ${this.provider}: Доступ запрещен. Проверьте API ключ или квоты.`);
        }
      } else if (error.status === 401) {
        logger.error(`❌ ${this.provider}: Неверный API ключ. Проверьте OPENAI_API_KEY или OPENROUTER_API_KEY в .env файле.`);
      } else if (error.status === 429) {
        logger.error(`❌ ${this.provider}: Превышен лимит запросов. Попробуйте позже.`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error(`❌ ${this.provider}: Проблемы с подключением к интернету.`);
      } else {
        logger.error(`❌ ${this.provider} ошибка:`, {
          status: error.status,
          code: error.code,
          message: error.message,
          provider: this.provider,
          model: this.model,
        });
      }
      
      // Предложения по решению
      logger.info('💡 Возможные решения:');
      logger.info('1. Проверьте API ключ в файле services/knowledge-base/.env');
      logger.info('2. Смените AI_PROVIDER с openrouter на openai в .env');
      logger.info('3. См. AI_SETUP_GUIDE.md для подробной настройки');
      
      return false;
    }
  }
}

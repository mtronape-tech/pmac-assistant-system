/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message: string;
  includeContext?: boolean;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    const body: ChatRequest = await request.json();
    
    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Сообщение не может быть пустым'
      }, { status: 400 });
    }

    // Отправляем запрос к Knowledge Base AI endpoint
    const knowledgeBaseUrl = process.env.KNOWLEDGE_BASE_URL || 'http://localhost:3005';
    
    try {
      const aiResponse = await fetch(`${knowledgeBaseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: body.message,
          maxSources: 5,
          includeReasoning: true,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`Knowledge Base API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      
      if (!aiData.success) {
        throw new Error(aiData.error || 'AI service error');
      }

      return NextResponse.json({
        success: true,
        response: aiData.data.answer,
        sources: aiData.data.sources,
        confidence: aiData.data.confidence,
        followUpQuestions: aiData.data.followUpQuestions,
      });

    } catch (knowledgeError) {
      console.error('Knowledge Base error:', knowledgeError);
      
      // Fallback: попробуем обратиться к PMAC Control для базовой информации
      try {
        const pmacControlUrl = process.env.PMAC_CONTROL_URL || 'http://localhost:3001';
        
        // Проверяем, касается ли вопрос статуса PMAC
        if (body.message.toLowerCase().includes('статус') || 
            body.message.toLowerCase().includes('pmac') ||
            body.message.toLowerCase().includes('контроллер')) {
          
          const statusResponse = await fetch(`${pmacControlUrl}/pmac/status`);
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            return NextResponse.json({
              success: true,
              response: `Статус PMAC контроллера:\n\n${JSON.stringify(statusData.data, null, 2)}\n\nПримечание: AI сервис временно недоступен, показана базовая информация о статусе.`,
              sources: [],
              confidence: 0.7,
              followUpQuestions: [
                'Покажи переменные P-типа',
                'Как настроить ось контроллера?',
                'Проверь данные от контроллера'
              ],
            });
          }
        }
        
        // Базовый fallback ответ
        return NextResponse.json({
          success: true,
          response: `Извините, AI сервис временно недоступен. Ваш вопрос: "${body.message}"\n\nВы можете попробовать:\n• Проверить статус PMAC контроллера на странице управления\n• Посмотреть аналитику данных\n• Обратиться к документации в базе знаний\n\nПопробуйте повторить запрос позже.`,
          sources: [],
          confidence: 0.3,
          followUpQuestions: [
            'Покажи статус PMAC контроллера',
            'Открыть страницу управления PMAC',
            'Перейти к аналитике данных'
          ],
        });
        
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        
        return NextResponse.json({
          success: true,
          response: `AI сервис временно недоступен. Ваш вопрос записан: "${body.message}"\n\nПопробуйте позже или обратитесь к документации напрямую.`,
          sources: [],
          confidence: 0.1,
          followUpQuestions: [],
        });
      }
    }

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

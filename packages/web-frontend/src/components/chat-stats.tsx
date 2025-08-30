import { MessageSquare, User, Bot, Clock, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
}

interface ChatStatsProps {
  messages: Message[];
}

export function ChatStats({ messages }: ChatStatsProps) {
  const userMessages = messages.filter(m => m.role === 'user');
  const aiMessages = messages.filter(m => m.role === 'assistant');
  const totalMessages = messages.length;
  
  // Вычисляем среднюю уверенность AI
  const aiMessagesWithConfidence = aiMessages.filter(m => m.confidence !== undefined);
  const averageConfidence = aiMessagesWithConfidence.length > 0 
    ? aiMessagesWithConfidence.reduce((sum, m) => sum + (m.confidence || 0), 0) / aiMessagesWithConfidence.length
    : 0;

  // Вычисляем активность по времени
  const now = new Date();
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const recentMessages = messages.filter(m => m.timestamp > lastHour);
  const recentActivity = recentMessages.length;

  // Вычисляем среднюю длину сообщений
  const averageMessageLength = totalMessages > 0 
    ? messages.reduce((sum, m) => sum + m.content.length, 0) / totalMessages
    : 0;

  // Статистика по источникам
  const messagesWithSources = aiMessages.filter(m => m.sources && m.sources.length > 0);
  const totalSources = messagesWithSources.reduce((sum, m) => sum + (m.sources?.length || 0), 0);
  const averageSources = messagesWithSources.length > 0 ? totalSources / messagesWithSources.length : 0;

  return (
    <div className="space-y-6">
      {/* Основная статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <MessageSquare className="w-5 h-5 text-slate-600" />
            <span>Статистика чата</span>
          </CardTitle>
          <CardDescription>
            Обзор активности и качества ответов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Основные метрики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalMessages}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Всего сообщений
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userMessages.length}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Ваши вопросы
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {aiMessages.length}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Ответы AI
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {recentActivity}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                За час
              </div>
            </div>
          </div>

          {/* Прогресс бары */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Соотношение сообщений</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {totalMessages > 0 ? Math.round((userMessages.length / totalMessages) * 100) : 0}% / {totalMessages > 0 ? Math.round((aiMessages.length / totalMessages) * 100) : 0}%
                </span>
              </div>
              <div className="flex space-x-1">
                <div 
                  className="h-2 bg-blue-500 rounded-l-full" 
                  style={{ width: `${totalMessages > 0 ? (userMessages.length / totalMessages) * 100 : 0}%` }}
                ></div>
                <div 
                  className="h-2 bg-green-500 rounded-r-full" 
                  style={{ width: `${totalMessages > 0 ? (aiMessages.length / totalMessages) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Средняя уверенность AI</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {Math.round(averageConfidence * 100)}%
                </span>
              </div>
              <Progress value={averageConfidence * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Детальная статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Детальные метрики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Средняя длина сообщения</span>
                <Badge variant="outline">
                  {Math.round(averageMessageLength)} символов
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Сообщения с источниками</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  {messagesWithSources.length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Среднее количество источников</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  {Math.round(averageSources * 10) / 10}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Активность (час)</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                  {recentActivity} сообщений
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Качество ответов</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                  {averageConfidence > 0.8 ? 'Отличное' : averageConfidence > 0.6 ? 'Хорошее' : 'Требует улучшения'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Время ответа</span>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300">
                  ~2-5 сек
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Активность по времени */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Activity className="w-5 h-5 text-slate-600" />
            <span>Активность</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Последний час</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {recentActivity} сообщений
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Сегодня</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {messages.filter(m => {
                    const today = new Date();
                    const messageDate = new Date(m.timestamp);
                    return messageDate.toDateString() === today.toDateString();
                  }).length} сообщений
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Общая активность</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {totalMessages > 0 ? 'Высокая' : 'Низкая'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

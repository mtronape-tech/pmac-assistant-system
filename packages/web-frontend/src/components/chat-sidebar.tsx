import { Sparkles, MessageSquare, Bot, TrendingUp, FileText, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ChatStats } from "./chat-stats";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
}

interface ChatSidebarProps {
  messages: Message[];
  onQuickQuestion: (question: string) => void;
}

export function ChatSidebar({ messages, onQuickQuestion }: ChatSidebarProps) {
  const userMessages = messages.filter(m => m.role === 'user').length;
  const aiMessages = messages.filter(m => m.role === 'assistant').length;

  const quickQuestions = [
    {
      title: "Статус контроллера",
      description: "Проверить состояние PMAC",
      question: "Покажи статус PMAC контроллера",
      icon: "🔍"
    },
    {
      title: "Настройка переменных",
      description: "Помощь с P-переменными",
      question: "Помоги настроить P-переменные",
      icon: "⚙️"
    },
    {
      title: "Анализ данных",
      description: "Анализ движения осей",
      question: "Анализ данных движения",
      icon: "📊"
    },
    {
      title: "Диагностика",
      description: "Поиск и устранение проблем",
      question: "Помоги с диагностикой PMAC",
      icon: "🔧"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>Быстрые запросы</span>
          </CardTitle>
          <CardDescription>
            Популярные вопросы для быстрого старта
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickQuestions.map((item, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => onQuickQuestion(item.question)}
              className="w-full justify-start h-auto p-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {item.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* AI Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Bot className="w-5 h-5 text-green-600" />
            <span>Статус AI</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              AI Assistant активен
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Готов к работе с PMAC контроллером
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Knowledge Base</span>
              <Badge variant="secondary" className="text-xs">Подключена</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">PMAC API</span>
              <Badge variant="secondary" className="text-xs">Доступен</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Контекст</span>
              <Badge variant="secondary" className="text-xs">Активен</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Недавние темы</CardTitle>
          <CardDescription>
            Популярные вопросы и темы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "PMAC контроллер",
            "P-переменные",
            "Движение осей",
            "Диагностика",
            "Настройка"
          ].map((topic, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="text-sm text-slate-600 dark:text-slate-400">{topic}</span>
              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Краткая статистика</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {messages.length}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Всего сообщений
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {userMessages}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Ваши вопросы
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Пользователь</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                {userMessages}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">AI</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                {aiMessages}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

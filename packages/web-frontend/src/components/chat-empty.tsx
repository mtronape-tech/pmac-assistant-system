import { MessageSquare, Bot, Sparkles, FileText, Settings, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface ChatEmptyProps {
  onQuickStart: (question: string) => void;
}

export function ChatEmpty({ onQuickStart }: ChatEmptyProps) {
  const quickStartQuestions = [
    {
      title: "Статус PMAC",
      description: "Проверить состояние контроллера",
      question: "Покажи статус PMAC контроллера",
      icon: "🔍",
      color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    },
    {
      title: "Настройка переменных",
      description: "Помощь с P-переменными",
      question: "Помоги настроить P-переменные",
      icon: "⚙️",
      color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    },
    {
      title: "Анализ данных",
      description: "Анализ движения осей",
      question: "Анализ данных движения",
      icon: "📊",
      color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
    },
    {
      title: "Диагностика",
      description: "Поиск и устранение проблем",
      question: "Помоги с диагностикой PMAC",
      icon: "🔧",
      color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
      {/* Welcome Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Добро пожаловать в AI Чат
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Ваш интеллектуальный помощник для работы с PMAC контроллером
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Card className="text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">База знаний</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Доступ к технической документации и справочным материалам
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">Настройка</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Помощь с настройкой параметров и переменных контроллера
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base">Диагностика</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Анализ данных и диагностика проблем в работе системы
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-base">Консультации</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Ответы на технические вопросы и консультации по PMAC
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Быстрый старт
          </h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Выберите один из популярных вопросов или задайте свой
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          {quickStartQuestions.map((item, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => onQuickStart(item.question)}
              className={`h-auto p-4 text-left justify-start ${item.color} hover:scale-105 transition-transform`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
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
        </div>
      </div>

      {/* Tips */}
      <Card className="max-w-2xl">
        <CardContent className="p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI анализирует ваш вопрос и ищет релевантную информацию</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Использует базу знаний PMAC для точных ответов</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Предлагает дополнительные вопросы для углубления</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

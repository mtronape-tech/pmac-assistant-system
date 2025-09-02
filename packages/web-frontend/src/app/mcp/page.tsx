import { Bot, MessageSquare, Settings, Zap, BookOpen } from "lucide-react";
import Link from "next/link";
import SettingsButton from "../../components/SettingsButton";

export default function MCPServerPage() {
  const features = [
    {
      title: "AI Интеграция",
      description: "Подключение к различным AI моделям через OpenRouter API",
      icon: Bot,
      color: "blue"
    },
    {
      title: "Model Context Protocol",
      description: "Стандартизированный протокол для взаимодействия с AI",
      icon: MessageSquare,
      color: "green"
    },
    {
      title: "Оптимизация токенов",
      description: "Эффективное использование AI ресурсов и кэширование",
      icon: Zap,
      color: "purple"
    },
    {
      title: "Мониторинг",
      description: "Отслеживание состояния и производительности AI сервисов",
      icon: Settings,
      color: "orange"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-3 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Zap className="w-5 h-5" />
                <span className="font-medium">PMAC Assistant</span>
              </Link>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  MCP Server
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>MCP Server работает</span>
              </div>
              <SettingsButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            MCP Server
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Центральный сервер для интеграции с AI моделями через Model Context Protocol
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Статус сервера
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Активен</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">Статус</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3000</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Порт</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">OpenRouter</div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">AI Провайдер</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${getColorClasses(feature.color)}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/chat"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Открыть чат с AI
              </span>
            </Link>
            <Link
              href="/knowledge"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Knowledge Base
              </span>
            </Link>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            API Endpoints
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  GET /health
                </span>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Проверка состояния
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  POST /mcp
                </span>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                MCP протокол
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

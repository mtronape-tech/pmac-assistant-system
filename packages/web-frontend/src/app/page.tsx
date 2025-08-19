import Link from "next/link";
import { 
  Bot, 
  Database, 
  BarChart3, 
  Settings, 
  BookOpen, 
  Activity,
  Zap,
  Shield
} from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "MCP Server",
      description: "AI интеграция через Model Context Protocol",
      icon: Bot,
      href: "/mcp",
      status: "online",
      port: 3000
    },
    {
      title: "PMAC Control",
      description: "Управление переменными PMAC контроллера",
      icon: Settings,
      href: "/pmac-control",
      status: "online",
      port: 3001
    },
    {
      title: "Knowledge Base",
      description: "База знаний и векторный поиск",
      icon: BookOpen,
      href: "/knowledge",
      status: "online",
      port: 3002
    },
    {
      title: "Analytics",
      description: "Анализ данных и построение графиков",
      icon: BarChart3,
      href: "/analytics",
      status: "online",
      port: 3003
    },
    {
      title: "Data Collection",
      description: "Сбор данных в реальном времени",
      icon: Activity,
      href: "/data-collection",
      status: "online",
      port: 3008
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  PMAC Assistant System
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Интеллектуальный помощник для наладчиков станков с ЧПУ
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Все сервисы работают</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Добро пожаловать в PMAC Assistant System
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Интеллектуальная система для управления, анализа и оптимизации станков с ЧПУ на базе контроллера Turbo PMAC
          </p>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-500" />
            Статус системы
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div key={module.title} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  module.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {module.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  :{module.port}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Link
                key={module.title}
                href={module.href}
                className="group block"
              >
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                      <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Порт: {module.port}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        module.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {module.status === 'online' ? 'Работает' : 'Остановлен'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/chat"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Чат с AI
              </span>
            </Link>
            <Link
              href="/knowledge"
              className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300 font-medium">
                База знаний
              </span>
            </Link>
            <Link
              href="/pmac-control"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Управление PMAC
              </span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Аналитика
              </span>
            </Link>
            <Link
              href="/data-collection"
              className="flex items-center space-x-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                Data Collection
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>PMAC Assistant System v1.0.0</p>
            <p className="mt-1">Интеллектуальный помощник для наладчиков станков с ЧПУ</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

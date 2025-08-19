import { Settings, Zap, Gauge, Activity, ArrowUpDown, Eye, Edit3, Code } from "lucide-react";
import Link from "next/link";

export default function PMACControlPage() {
  const variableTypes = [
    {
      name: "P-переменные",
      description: "Параметры программы и настройки",
      count: 40955,
      icon: Settings,
      color: "blue"
    },
    {
      name: "Q-переменные",
      description: "Переменные координат и позиций",
      count: 1000,
      icon: Gauge,
      color: "green"
    },
    {
      name: "I-переменные",
      description: "Входные переменные и датчики",
      count: 500,
      icon: Activity,
      color: "purple"
    },
    {
      name: "M-переменные",
      description: "Переменные движения и осей",
      count: 200,
      icon: ArrowUpDown,
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
                <Settings className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  PMAC Control
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Подключен к симулятору</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            PMAC Control
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Управление переменными и параметрами PMAC контроллера в реальном времени
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Статус подключения
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Подключен</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">Статус</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Simulation</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Режим</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">8</div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Оси</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">3001</div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">Порт</div>
            </div>
          </div>
        </div>

        {/* Variable Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {variableTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <div
                key={type.name}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${getColorClasses(type.color)}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {type.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {type.description}
                    </p>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Количество: {type.count.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/pmac-control/variables"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Просмотр переменных
              </span>
            </Link>
            <Link
              href="/pmac-control/editor"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Edit3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Редактор переменных
              </span>
            </Link>
            <Link
              href="/pmac-control/monitoring"
              className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Мониторинг
              </span>
            </Link>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Информация о системе
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">Контроллер</h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>Модель: Turbo PMAC</div>
                <div>Режим: Симуляция</div>
                <div>Версия прошивки: 2.0.0</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">Подключение</h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>Тип: TCP/IP</div>
                <div>Хост: localhost</div>
                <div>Порт: 3001</div>
                <div>Статус: Активно</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Settings, Zap, Database, Activity, ArrowUpDown, Eye, TrendingUp, Clock, AlertTriangle, Wifi, WifiOff, BarChart3, Download, Upload, Play, Pause, RotateCcw } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface DataCollectionStats {
  totalRecords: number;
  recordsPerSecond: number;
  activeConnections: number;
  qualityScore: number;
  lastUpdate: string;
  status: "active" | "paused" | "error";
}

interface QualityMetrics {
  dataQuality: number;
  errorRate: number;
  latency: number;
  missingData: number;
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface WebSocketStats {
  connectedClients: number;
  messagesPerSecond: number;
  subscriptions: number;
  uptime: string;
}

export default function DataCollectionPage() {
  const [stats, setStats] = useState<DataCollectionStats>({
    totalRecords: 0,
    recordsPerSecond: 0,
    activeConnections: 1,
    qualityScore: 98.5,
    lastUpdate: new Date().toLocaleTimeString(),
    status: "active"
  });

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    dataQuality: 98.5,
    errorRate: 1.2,
    latency: 0.8,
    missingData: 0.3,
    alerts: [
      {
        id: "1",
        severity: "low",
        message: "Незначительное увеличение задержки данных",
        timestamp: "2024-01-15 14:30:00",
        acknowledged: false
      },
      {
        id: "2",
        severity: "medium",
        message: "Повышенный уровень ошибок чтения переменных",
        timestamp: "2024-01-15 14:25:00",
        acknowledged: true
      }
    ]
  });

  const [wsStats, setWsStats] = useState<WebSocketStats>({
    connectedClients: 3,
    messagesPerSecond: 45,
    subscriptions: 12,
    uptime: "2h 15m"
  });

  const [isCollecting, setIsCollecting] = useState(true);

  // Генерация тестовых данных
  useEffect(() => {
    const updateStats = () => {
      setStats(prev => ({
        ...prev,
        totalRecords: prev.totalRecords + Math.floor(Math.random() * 100),
        recordsPerSecond: Math.floor(Math.random() * 50) + 20,
        lastUpdate: new Date().toLocaleTimeString()
      }));

      setWsStats(prev => ({
        ...prev,
        messagesPerSecond: Math.floor(Math.random() * 30) + 30,
        connectedClients: Math.max(1, prev.connectedClients + Math.floor(Math.random() * 3) - 1)
      }));
    };

    const interval = setInterval(updateStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400";
      case "paused":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Activity className="w-4 h-4" />;
      case "paused":
        return <Pause className="w-4 h-4" />;
      case "error":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const handleToggleCollection = () => {
    setIsCollecting(!isCollecting);
    setStats(prev => ({
      ...prev,
      status: !isCollecting ? "active" : "paused"
    }));
  };

  const handleRestart = () => {
    // Здесь будет логика перезапуска
    alert("Перезапуск сбора данных...");
  };

  const qualityData = [
    { name: "Качественные данные", value: qualityMetrics.dataQuality, color: "#10b981" },
    { name: "Ошибки", value: qualityMetrics.errorRate, color: "#ef4444" },
    { name: "Пропуски", value: qualityMetrics.missingData, color: "#f59e0b" }
  ];

  const performanceData = [
    { time: "00:00", records: 25, quality: 98 },
    { time: "04:00", records: 35, quality: 97 },
    { time: "08:00", records: 45, quality: 99 },
    { time: "12:00", records: 40, quality: 98 },
    { time: "16:00", records: 50, quality: 96 },
    { time: "20:00", records: 30, quality: 98 }
  ];

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
                <Database className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Data Collection
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className={`w-2 h-2 rounded-full ${stats.status === 'active' ? 'bg-green-500' : stats.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className="capitalize">{stats.status}</span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Обновлено: {stats.lastUpdate}
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
            Data Collection
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Сбор, мониторинг и управление данными PMAC контроллера в реальном времени
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Управление сбором данных
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleCollection}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  isCollecting 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isCollecting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isCollecting ? 'Остановить' : 'Запустить'}</span>
              </button>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Перезапуск</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">Всего записей</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.recordsPerSecond}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Записей/сек</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.activeConnections}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Активные соединения</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.qualityScore}%
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">Качество данных</div>
            </div>
          </div>
        </div>

        {/* WebSocket Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            WebSocket Streaming
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {wsStats.connectedClients}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Подключенные клиенты
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {wsStats.messagesPerSecond}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Сообщений/сек
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {wsStats.subscriptions}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Подписки
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {wsStats.uptime}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Время работы
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Качество данных
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {qualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f1f5f9"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-slate-300">Задержка</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {qualityMetrics.latency} сек
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-slate-300">Ошибки</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {qualityMetrics.errorRate}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Производительность
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#f1f5f9"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="records" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Записи/мин"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="quality" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Качество %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Алерты и уведомления
            </h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {qualityMetrics.alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {alert.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {alert.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!alert.acknowledged && (
                      <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        Подтвердить
                      </button>
                    )}
                    <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                      Подробнее
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/analytics"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Аналитика
              </span>
            </Link>
            <Link
              href="/pmac-control/monitoring"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Мониторинг PMAC
              </span>
            </Link>
            <button className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
              <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Экспорт данных
              </span>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors">
              <Upload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-700 dark:text-orange-300 font-medium">
                Импорт данных
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

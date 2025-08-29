"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, Activity, Gauge, Calendar, Filter, Download, Zap } from "lucide-react";
import Link from "next/link";
import SettingsButton from "../../components/SettingsButton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("24h");
  const [selectedMetric, setSelectedMetric] = useState("position");
  const [isCollecting, setIsCollecting] = useState(true);
  const [collectionStatus, setCollectionStatus] = useState("active");

  // Данные для графиков
  const positionData = [
    { time: "00:00", X: 0, Y: 0, Z: 0 },
    { time: "04:00", X: 25, Y: 15, Z: 10 },
    { time: "08:00", X: 50, Y: 30, Z: 20 },
    { time: "12:00", X: 75, Y: 45, Z: 30 },
    { time: "16:00", X: 100, Y: 60, Z: 40 },
    { time: "20:00", X: 125, Y: 75, Z: 50 },
    { time: "24:00", X: 150, Y: 90, Z: 60 }
  ];

  const velocityData = [
    { time: "00:00", X: 0, Y: 0, Z: 0 },
    { time: "04:00", X: 15, Y: 10, Z: 5 },
    { time: "08:00", X: 25, Y: 20, Z: 15 },
    { time: "12:00", X: 35, Y: 30, Z: 25 },
    { time: "16:00", X: 45, Y: 40, Z: 35 },
    { time: "20:00", X: 55, Y: 50, Z: 45 },
    { time: "24:00", X: 65, Y: 60, Z: 55 }
  ];

  const errorData = [
    { name: "Позиционирование", value: 35, color: "#ef4444" },
    { name: "Скорость", value: 25, color: "#f59e0b" },
    { name: "Ускорение", value: 20, color: "#3b82f6" },
    { name: "Другие", value: 20, color: "#8b5cf6" }
  ];

  const performanceData = [
    { metric: "Точность", value: 98.5, target: 99.0 },
    { metric: "Скорость", value: 95.2, target: 96.0 },
    { metric: "Надежность", value: 99.8, target: 99.5 },
    { metric: "Эффективность", value: 92.1, target: 94.0 }
  ];

  // Данные тока для осей
  const currentData = [
    { time: "00:00", X: 2.1, Y: 1.8, Z: 1.5 },
    { time: "04:00", X: 3.2, Y: 2.9, Z: 2.1 },
    { time: "08:00", X: 4.5, Y: 3.8, Z: 2.8 },
    { time: "12:00", X: 5.2, Y: 4.1, Z: 3.2 },
    { time: "16:00", X: 4.8, Y: 3.9, Z: 2.9 },
    { time: "20:00", X: 3.1, Y: 2.5, Z: 1.9 },
    { time: "24:00", X: 2.5, Y: 2.0, Z: 1.6 }
  ];

  // Данные ошибок слежения
  const trackingErrorData = [
    { time: "00:00", X: 0.02, Y: 0.015, Z: 0.01 },
    { time: "04:00", X: 0.05, Y: 0.03, Z: 0.025 },
    { time: "08:00", X: 0.08, Y: 0.06, Z: 0.04 },
    { time: "12:00", X: 0.12, Y: 0.09, Z: 0.07 },
    { time: "16:00", X: 0.15, Y: 0.11, Z: 0.08 },
    { time: "20:00", X: 0.09, Y: 0.07, Z: 0.05 },
    { time: "24:00", X: 0.06, Y: 0.04, Z: 0.03 }
  ];

  // Данные переменных PMAC
  const pmacVariablesData = [
    { time: "00:00", P1: 100, P2: 50, P3: 0.001, Q1: 0, Q2: 0 },
    { time: "04:00", P1: 120, P2: 60, P3: 0.001, Q1: 25, Q2: 15 },
    { time: "08:00", P1: 150, P2: 75, P3: 0.002, Q1: 50, Q2: 30 },
    { time: "12:00", P1: 180, P2: 90, P3: 0.003, Q1: 75, Q2: 45 },
    { time: "16:00", P1: 160, P2: 80, P3: 0.002, Q1: 100, Q2: 60 },
    { time: "20:00", P1: 110, P2: 55, P3: 0.001, Q1: 125, Q2: 75 },
    { time: "24:00", P1: 95, P2: 48, P3: 0.001, Q1: 150, Q2: 90 }
  ];

  const getChartData = () => {
    switch (selectedMetric) {
      case "position":
        return positionData;
      case "velocity":
        return velocityData;
      case "current":
        return currentData;
      case "tracking_error":
        return trackingErrorData;
      case "pmac_variables":
        return pmacVariablesData;
      default:
        return positionData;
    }
  };

  const getMetricTitle = () => {
    switch (selectedMetric) {
      case "position":
        return "Позиция осей";
      case "velocity":
        return "Скорость осей";
      case "current":
        return "Показания тока";
      case "tracking_error":
        return "Ошибки слежения";
      case "pmac_variables":
        return "Переменные PMAC";
      default:
        return "Позиция осей";
    }
  };

  const getMetricUnit = () => {
    switch (selectedMetric) {
      case "position":
        return "mm";
      case "velocity":
        return "mm/s";
      case "current":
        return "A";
      case "tracking_error":
        return "mm";
      case "pmac_variables":
        return "";
      default:
        return "";
    }
  };

  const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"];

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
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Аналитика
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Данные обновляются</span>
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
            Аналитика PMAC
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Мониторинг и анализ данных движения осей, производительности и диагностики контроллера
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1h">Последний час</option>
                  <option value="24h">Последние 24 часа</option>
                  <option value="7d">Последняя неделя</option>
                  <option value="30d">Последний месяц</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="position">Позиция</option>
                  <option value="velocity">Скорость</option>
                  <option value="current">Показания тока</option>
                  <option value="tracking_error">Ошибки слежения</option>
                  <option value="pmac_variables">Переменные PMAC</option>
                </select>
              </div>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Экспорт</span>
            </button>
          </div>
        </div>

        {/* Data Collection Control */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Управление сбором данных
            </h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className={`w-2 h-2 rounded-full ${collectionStatus === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="capitalize">{collectionStatus === 'active' ? 'Сбор активен' : 'Сбор приостановлен'}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">24,567</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">Записей собрано</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">45</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Переменных отслеживается</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">98.5%</div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Качество данных</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">2.3s</div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">Средняя задержка</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedMetric === "current" ? "Ток оси X" : 
                   selectedMetric === "tracking_error" ? "Ошибка слежения X" :
                   selectedMetric === "pmac_variables" ? "Переменная P1" : "Позиция X"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedMetric === "current" ? "4.5 A" :
                   selectedMetric === "tracking_error" ? "0.08 mm" :
                   selectedMetric === "pmac_variables" ? "150" : "150.0 mm"}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Gauge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedMetric === "current" ? "Ток оси Y" : 
                   selectedMetric === "tracking_error" ? "Ошибка слежения Y" :
                   selectedMetric === "pmac_variables" ? "Переменная P2" : "Скорость Y"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedMetric === "current" ? "3.8 A" :
                   selectedMetric === "tracking_error" ? "0.06 mm" :
                   selectedMetric === "pmac_variables" ? "75" : "65.0 mm/s"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedMetric === "current" ? "Ток оси Z" : 
                   selectedMetric === "tracking_error" ? "Ошибка слежения Z" :
                   selectedMetric === "pmac_variables" ? "Переменная P3" : "Активность осей"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedMetric === "current" ? "2.8 A" :
                   selectedMetric === "tracking_error" ? "0.04 mm" :
                   selectedMetric === "pmac_variables" ? "0.002" : "3/8"}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {selectedMetric === "current" ? "Средний ток" : 
                   selectedMetric === "tracking_error" ? "Макс. ошибка" :
                   selectedMetric === "pmac_variables" ? "Переменная Q1" : "Ошибки за день"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedMetric === "current" ? "3.7 A" :
                   selectedMetric === "tracking_error" ? "0.15 mm" :
                   selectedMetric === "pmac_variables" ? "75" : "2"}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {getMetricTitle()} - {selectedPeriod === "24h" ? "24 часа" : selectedPeriod}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
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
                {selectedMetric === "pmac_variables" ? (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="P1" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="P1 (Скорость)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="P2" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="P2 (Ускорение)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="P3" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="P3 (Точность)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Q1" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Q1 (Позиция X)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Q2" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Q2 (Позиция Y)"
                    />
                  </>
                ) : (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="X" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Ось X"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Y" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Ось Y"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Z" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Ось Z"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance and Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Metrics */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Показатели производительности
            </h3>
            <div className="space-y-4">
              {performanceData.map((item) => (
                <div key={item.metric} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {item.metric}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(item.value / item.target) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Распределение ошибок
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {errorData.map((entry, index) => (
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
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/pmac-control"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Управление PMAC
              </span>
            </Link>
            <Link
              href="/chat"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Анализ с AI
              </span>
            </Link>
            <button className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
              <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Экспорт отчета
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

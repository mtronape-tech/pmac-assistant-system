"use client";

import { useState, useEffect } from "react";
import { Settings, Zap, Gauge, Activity, ArrowUpDown, Eye, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface MonitoringData {
  timestamp: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  temperature: number;
  status: string;
}

export default function PMACMonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Генерация тестовых данных
  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const newData: MonitoringData = {
        timestamp: now.toLocaleTimeString(),
        positionX: Math.random() * 200 - 100,
        positionY: Math.random() * 200 - 100,
        positionZ: Math.random() * 200 - 100,
        velocityX: Math.random() * 50,
        velocityY: Math.random() * 50,
        velocityZ: Math.random() * 50,
        temperature: 25 + Math.random() * 10,
        status: Math.random() > 0.1 ? "Активен" : "Ошибка"
      };

      setMonitoringData(prev => {
        const updated = [...prev, newData];
        if (updated.length > 20) {
          return updated.slice(-20);
        }
        return updated;
      });
      setLastUpdate(now);
    };

    const interval = setInterval(generateData, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentData = monitoringData[monitoringData.length - 1] || {
    positionX: 0, positionY: 0, positionZ: 0,
    velocityX: 0, velocityY: 0, velocityZ: 0,
    temperature: 25, status: "Нет данных"
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Активен":
        return "text-green-600 dark:text-green-400";
      case "Ошибка":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Активен":
        return <Activity className="w-4 h-4" />;
      case "Ошибка":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
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
              <Link
                href="/pmac-control"
                className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>PMAC Control</span>
              </Link>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Мониторинг
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Подключен' : 'Отключен'}</span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Обновлено: {lastUpdate.toLocaleTimeString()}
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
            Мониторинг PMAC
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Мониторинг состояния контроллера в реальном времени
          </p>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Статус контроллера</p>
                <p className={`text-2xl font-bold ${getStatusColor(currentData.status)}`}>
                  {currentData.status}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                {getStatusIcon(currentData.status)}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Температура</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {currentData.temperature.toFixed(1)}°C
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Скорость X</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {currentData.velocityX.toFixed(1)} mm/s
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Позиция X</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {currentData.positionX.toFixed(1)} mm
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Gauge className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Position Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Позиции осей
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monitoringData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="timestamp" 
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
                  dataKey="positionX" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Ось X"
                />
                <Line 
                  type="monotone" 
                  dataKey="positionY" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Ось Y"
                />
                <Line 
                  type="monotone" 
                  dataKey="positionZ" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Ось Z"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Скорости осей
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monitoringData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="timestamp" 
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
                <Bar 
                  dataKey="velocityX" 
                  fill="#3b82f6" 
                  name="Скорость X"
                />
                <Bar 
                  dataKey="velocityY" 
                  fill="#10b981" 
                  name="Скорость Y"
                />
                <Bar 
                  dataKey="velocityZ" 
                  fill="#8b5cf6" 
                  name="Скорость Z"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Детальные данные
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Позиция X
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Позиция Y
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Позиция Z
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Скорость X
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Температура
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {monitoringData.slice(-10).reverse().map((data, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.positionX.toFixed(1)} mm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.positionY.toFixed(1)} mm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.positionZ.toFixed(1)} mm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.velocityX.toFixed(1)} mm/s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {data.temperature.toFixed(1)}°C
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                        {getStatusIcon(data.status)}
                        <span className="ml-1">{data.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/pmac-control"
              className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Управление PMAC
              </span>
            </Link>
            <Link
              href="/pmac-control/variables"
              className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Gauge className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Переменные
              </span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Аналитика
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, Settings, Gauge, Activity, ArrowUpDown, Edit3, Save, X, Eye, Zap, Code, FileText, Download, Upload } from "lucide-react";
import Link from "next/link";

interface PMACVariable {
  id: string;
  name: string;
  type: "P" | "Q" | "I" | "M";
  value: number;
  description: string;
  unit: string;
  min: number;
  max: number;
  category: string;
  isEditing?: boolean;
  originalValue?: number;
}

export default function PMACEditorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [variables, setVariables] = useState<PMACVariable[]>([
    {
      id: "1",
      name: "P1",
      type: "P",
      value: 100.0,
      description: "Скорость движения по оси X",
      unit: "mm/s",
      min: 0,
      max: 1000,
      category: "Движение"
    },
    {
      id: "2",
      name: "P2",
      type: "P",
      value: 50.0,
      description: "Ускорение по оси X",
      unit: "mm/s²",
      min: 0,
      max: 500,
      category: "Движение"
    },
    {
      id: "3",
      name: "P3",
      type: "P",
      value: 0.001,
      description: "Точность позиционирования",
      unit: "mm",
      min: 0.0001,
      max: 0.01,
      category: "Точность"
    },
    {
      id: "4",
      name: "Q1",
      type: "Q",
      value: 150.0,
      description: "Текущая позиция по оси X",
      unit: "mm",
      min: -1000,
      max: 1000,
      category: "Позиция"
    },
    {
      id: "5",
      name: "Q2",
      type: "Q",
      value: 75.0,
      description: "Текущая позиция по оси Y",
      unit: "mm",
      min: -1000,
      max: 1000,
      category: "Позиция"
    },
    {
      id: "6",
      name: "I1",
      type: "I",
      value: 1,
      description: "Статус движения по оси X",
      unit: "",
      min: 0,
      max: 1,
      category: "Статус"
    },
    {
      id: "7",
      name: "M1",
      type: "M",
      value: 0,
      description: "Режим движения",
      unit: "",
      min: 0,
      max: 3,
      category: "Режим"
    }
  ]);

  const filteredVariables = variables.filter(variable => {
    const matchesSearch = variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         variable.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || variable.type === selectedType;
    const matchesCategory = selectedCategory === "all" || variable.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "P":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "Q":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "I":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      case "M":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "P":
        return Settings;
      case "Q":
        return Gauge;
      case "I":
        return Activity;
      case "M":
        return ArrowUpDown;
      default:
        return Settings;
    }
  };

  const handleEdit = (id: string) => {
    setVariables(prev => prev.map(v => 
      v.id === id 
        ? { ...v, isEditing: true, originalValue: v.value }
        : v
    ));
  };

  const handleSave = (id: string) => {
    setVariables(prev => prev.map(v => 
      v.id === id 
        ? { ...v, isEditing: false, originalValue: undefined }
        : v
    ));
  };

  const handleCancel = (id: string) => {
    setVariables(prev => prev.map(v => 
      v.id === id 
        ? { ...v, isEditing: false, value: v.originalValue || v.value, originalValue: undefined }
        : v
    ));
  };

  const handleValueChange = (id: string, newValue: number) => {
    setVariables(prev => prev.map(v => 
      v.id === id ? { ...v, value: newValue } : v
    ));
  };

  const handleBulkEdit = () => {
    // Здесь будет логика массового редактирования
    alert("Функция массового редактирования будет добавлена позже");
  };

  const handleExport = () => {
    // Здесь будет логика экспорта
    alert("Функция экспорта будет добавлена позже");
  };

  const handleImport = () => {
    // Здесь будет логика импорта
    alert("Функция импорта будет добавлена позже");
  };

  const categories = Array.from(new Set(variables.map(v => v.category)));

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
                <Code className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Редактор переменных
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
            Редактор переменных PMAC
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Расширенное редактирование и управление переменными контроллера
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск переменных..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Все типы</option>
                <option value="P">P-переменные</option>
                <option value="Q">Q-переменные</option>
                <option value="I">I-переменные</option>
                <option value="M">M-переменные</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Все категории</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={handleBulkEdit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Массовое редактирование</span>
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт</span>
          </button>
          <button
            onClick={handleImport}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Импорт</span>
          </button>
        </div>

        {/* Variables Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Переменная
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Значение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Диапазон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredVariables.map((variable) => {
                  const IconComponent = getTypeIcon(variable.type);
                  return (
                    <tr key={variable.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getTypeColor(variable.type)}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {variable.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {variable.type}-переменная
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {variable.description}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {variable.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                          {variable.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {variable.isEditing ? (
                          <input
                            type="number"
                            value={variable.value}
                            onChange={(e) => handleValueChange(variable.id, parseFloat(e.target.value) || 0)}
                            min={variable.min}
                            max={variable.max}
                            step="0.1"
                            className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {variable.value}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {variable.min} - {variable.max}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {variable.isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(variable.id)}
                                className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                title="Сохранить"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancel(variable.id)}
                                className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                title="Отменить"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEdit(variable.id)}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              title="Редактировать"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredVariables.length === 0 && (
          <div className="text-center py-12">
            <Code className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Переменные не найдены
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}

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
                Просмотр переменных
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
      </main>
    </div>
  );
}

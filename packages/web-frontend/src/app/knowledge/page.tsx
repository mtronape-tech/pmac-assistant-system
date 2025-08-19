"use client";

import { useState } from "react";
import { Search, BookOpen, FileText, Upload, Filter, Download, Eye, Zap } from "lucide-react";
import Link from "next/link";

interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "txt" | "html";
  size: string;
  uploadedAt: string;
  tags: string[];
  description: string;
}

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const documents: Document[] = [
    {
      id: "1",
      title: "Руководство по настройке PMAC контроллера",
      type: "pdf",
      size: "2.5 MB",
      uploadedAt: "2024-01-15",
      tags: ["pmac", "настройка", "руководство"],
      description: "Подробное руководство по настройке и конфигурации Turbo PMAC контроллера"
    },
    {
      id: "2",
      title: "Справочник по P-переменным",
      type: "pdf",
      size: "1.8 MB",
      uploadedAt: "2024-01-10",
      tags: ["переменные", "p-переменные", "справочник"],
      description: "Полный справочник по P-переменным и их использованию"
    },
    {
      id: "3",
      title: "Примеры программ движения",
      type: "txt",
      size: "156 KB",
      uploadedAt: "2024-01-08",
      tags: ["программы", "движение", "примеры"],
      description: "Коллекция примеров программ для различных типов движения"
    },
    {
      id: "4",
      title: "Диагностика ошибок PMAC",
      type: "html",
      size: "890 KB",
      uploadedAt: "2024-01-05",
      tags: ["диагностика", "ошибки", "устранение"],
      description: "Руководство по диагностике и устранению ошибок"
    }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "doc":
        return "📝";
      case "txt":
        return "📃";
      case "html":
        return "🌐";
      default:
        return "📄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      case "doc":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "txt":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "html":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400";
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
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  База знаний
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Weaviate подключен</span>
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
            База знаний
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Централизованное хранилище документации, руководств и справочных материалов по PMAC контроллерам
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по документам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Все типы</option>
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="txt">TXT</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Загрузить</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{documents.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Всего документов</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">2</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">PDF документы</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">1</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">HTML страницы</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">5.3 MB</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">Общий размер</div>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${getTypeColor(doc.type)}`}>
                    <span className="text-lg">{getTypeIcon(doc.type)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.size} • {doc.uploadedAt}
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {doc.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors">
                  Открыть
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Документы не найдены
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Попробуйте изменить параметры поиска или загрузить новые документы
            </p>
          </div>
        )}

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
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Задать вопрос AI
              </span>
            </Link>
            <button className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Загрузить документ
              </span>
            </button>
            <Link
              href="/mcp"
              className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-medium">
                Семантический поиск
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

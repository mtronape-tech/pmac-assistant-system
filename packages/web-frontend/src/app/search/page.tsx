"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  FileText, 
  Brain, 
  Filter, 
  ArrowRight,
  Star,
  Clock,
  Tag,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Zap
} from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
  documentId: string;
  filename: string;
  category: string;
  author?: string;
  chunkOrder: number;
  tokensCount: number;
  highlights: string[];
  metadata?: {
    pageNumber?: number;
    section?: string;
  };
}

interface AISearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  processingTime: number;
  suggestions: string[];
  aiSummary?: string;
  relatedTopics?: string[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minScore, setMinScore] = useState(0.5);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResults([]);
    setAiSummary("");
    setSuggestions([]);
    
    try {
      const startTime = Date.now();
      
      if (searchMode === 'semantic') {
        // AI-поиск
        const response = await fetch('http://localhost:3005/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query,
            includeContext: true,
            category: selectedCategory !== "all" ? selectedCategory : undefined
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiSummary(data.data.answer);
          setSuggestions(data.data.followUpQuestions || []);
          
          // Преобразуем sources в results
          const searchResults: SearchResult[] = (data.data.sources || []).map((source: any, index: number) => ({
            id: `result_${index}`,
            title: source.title || source.filename || 'Документ',
            content: source.content || source.text || '',
            relevanceScore: source.score || data.data.confidence || 0.8,
            documentId: source.documentId || source.id || '',
            filename: source.filename || 'unknown.pdf',
            category: source.category || 'documentation',
            author: source.author,
            chunkOrder: source.chunkOrder || 0,
            tokensCount: source.tokensCount || 0,
            highlights: source.highlights || [],
            metadata: source.metadata || {}
          }));
          
          setResults(searchResults);
        }
      } else {
        // Обычный поиск по ключевым словам
        const response = await fetch('http://localhost:3005/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 20,
            threshold: minScore,
            filters: selectedCategory !== "all" ? { category: selectedCategory } : undefined
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.data.results || []);
          setSuggestions(data.data.suggestions || []);
        }
      }
      
      setProcessingTime(Date.now() - startTime);
      
    } catch (error) {
      console.error('Search error:', error);
      // Mock результаты для демонстрации
      setResults([
        {
          id: "mock_1",
          title: "PMAC Programming Guide",
          content: "PMAC controllers support advanced motion control programming using I++ language. The P-variables control various parameters...",
          relevanceScore: 0.95,
          documentId: "doc_1",
          filename: "pmac_programming.pdf",
          category: "documentation",
          author: "PMAC Technical Team",
          chunkOrder: 1,
          tokensCount: 245,
          highlights: ["P-variables", "motion control", "I++ language"],
          metadata: { pageNumber: 15, section: "Programming Basics" }
        }
      ]);
      setSuggestions(["Как настроить P-переменные?", "Что такое I++ язык?", "Примеры программирования PMAC"]);
      setProcessingTime(150);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  AI Поиск
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Интеллектуальный поиск по документам
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/knowledge"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Документы
              </Link>
              <Link 
                href="/chat"
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                AI Чат
              </Link>
              <Link 
                href="/"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Главная
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Interface */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Введите ваш вопрос или ключевые слова..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Search Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              {/* Search Mode */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('semantic')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    searchMode === 'semantic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  AI Поиск
                </button>
                <button
                  onClick={() => setSearchMode('keyword')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    searchMode === 'keyword'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-1" />
                  Ключевые слова
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">Все категории</option>
                <option value="documentation">Документация</option>
                <option value="tutorial">Руководства</option>
                <option value="troubleshooting">Устранение неполадок</option>
              </select>

              {/* Relevance Score */}
              {searchMode === 'keyword' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Релевантность:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{(minScore * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <>
                  <Clock className="w-4 h-4 inline mr-2 animate-spin" />
                  Поиск...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 inline mr-2" />
                  Найти
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  AI Ответ
                </h3>
                <div className="text-slate-700 dark:text-slate-300 prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{aiSummary}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Результаты поиска ({results.length})
              </h2>
              {processingTime > 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Время поиска: {processingTime}мс
                </span>
              )}
            </div>

            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                          {result.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {result.filename}
                          </span>
                          {result.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {result.author}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {result.category}
                          </span>
                          {result.metadata?.pageNumber && (
                            <span>Стр. {result.metadata.pageNumber}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(result.relevanceScore)}`}>
                          {(result.relevanceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300 mb-4">
                      {expandedResults.has(result.id) ? (
                        <div className="prose prose-sm max-w-none">
                          {highlightText(result.content, result.highlights)}
                        </div>
                      ) : (
                        <p className="line-clamp-3">
                          {highlightText(result.content.substring(0, 300) + '...', result.highlights)}
                        </p>
                      )}
                    </div>

                    {result.highlights.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Ключевые термины:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.highlights.map((highlight, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-full"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleExpanded(result.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {expandedResults.has(result.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Развернуть
                          </>
                        )}
                      </button>
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                          <BookOpen className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Связанные вопросы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch();
                  }}
                  className="text-left p-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 inline mr-2 text-slate-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Результаты не найдены
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Попробуйте изменить запрос или использовать другие ключевые слова
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setSearchMode(searchMode === 'semantic' ? 'keyword' : 'semantic')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Переключить на {searchMode === 'semantic' ? 'поиск по ключевым словам' : 'AI поиск'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

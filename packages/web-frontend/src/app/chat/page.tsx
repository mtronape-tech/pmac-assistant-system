"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Settings, Zap, FileText, HelpCircle, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize welcome message on client side only
  useEffect(() => {
    setIsMounted(true);
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Привет! Я AI помощник для работы с PMAC контроллером. Интегрирован с базой знаний и инструментами управления.\n\n✨ Возможности:\n• Ответы на технические вопросы\n• Анализ данных контроллера\n• Помощь с настройкой переменных\n• Поиск в документации\n• Диагностика проблем\n\nЧем могу помочь?",
        timestamp: new Date(),
        confidence: 1.0,
        followUpQuestions: [
          "Покажи статус PMAC контроллера",
          "Как настроить P-переменные?",
          "Анализ данных движения"
        ]
      }
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    const messageText = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Отправляем запрос к нашему AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          includeContext: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API error');
      }
      
              const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        sources: data.sources,
        confidence: data.confidence,
        followUpQuestions: data.followUpQuestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
              const errorMessage: Message = {
          id: `error-${Date.now()}`,
        role: "assistant",
        content: "Извините, произошла ошибка при обработке вашего запроса. Проверьте подключение к AI сервису и попробуйте еще раз.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Prevent hydration mismatch by waiting for client-side mount
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Загрузка...</div>
      </div>
    );
  }

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
                  AI Чат
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>AI Assistant активен</span>
              </div>
              <Link
                href="/mcp"
                className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Настройки</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Confidence indicator for AI messages */}
                    {message.role === "assistant" && message.confidence !== undefined && (
                      <div className="mt-2 flex items-center space-x-2">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs opacity-70">
                          Уверенность: {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {/* Sources for AI messages */}
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-600 rounded text-xs">
                        <div className="flex items-center space-x-1 mb-1">
                          <FileText className="w-3 h-3" />
                          <span className="font-medium">Источники ({message.sources.length}):</span>
                        </div>
                        <div className="space-y-1">
                          {message.sources.slice(0, 3).map((source, idx) => (
                            <div key={idx} className="text-slate-600 dark:text-slate-300 truncate">
                              • {source.document?.title || `Документ ${idx + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Follow-up questions */}
                    {message.role === "assistant" && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs">
                        <div className="flex items-center space-x-1 mb-1">
                          <HelpCircle className="w-3 h-3" />
                          <span className="font-medium">Похожие вопросы:</span>
                        </div>
                        <div className="space-y-1">
                          {message.followUpQuestions.slice(0, 2).map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => setInputValue(question)}
                              className="block text-left text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                            >
                              • {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        AI думает...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите ваше сообщение..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Отправить</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Нажмите Enter для отправки, Shift+Enter для новой строки
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Быстрые запросы
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setInputValue("Покажи статус PMAC контроллера")}
              className="text-left p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <div className="font-medium text-blue-700 dark:text-blue-300">
                Статус контроллера
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Проверить состояние PMAC
              </div>
            </button>
            <button
              onClick={() => setInputValue("Помоги настроить P-переменные")}
              className="text-left p-3 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <div className="font-medium text-green-700 dark:text-green-300">
                Настройка переменных
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Помощь с P-переменными
              </div>
            </button>
            <button
              onClick={() => setInputValue("Анализ данных движения")}
              className="text-left p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <div className="font-medium text-purple-700 dark:text-purple-300">
                Анализ данных
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Анализ движения осей
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

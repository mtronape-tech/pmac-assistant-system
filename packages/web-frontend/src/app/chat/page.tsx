"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Settings, Zap } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Привет! Я AI помощник для работы с PMAC контроллером. Могу помочь с настройкой переменных, анализом данных и решением проблем. Чем могу помочь?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Здесь будет интеграция с MCP сервером
      // Пока используем имитацию ответа
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Получил ваше сообщение: "${inputValue}". Это имитация ответа от MCP сервера. В реальной реализации здесь будет интеграция с AI моделью через Model Context Protocol.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.",
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
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>MCP Server подключен</span>
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

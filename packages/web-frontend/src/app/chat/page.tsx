"use client"

import { useState, useRef, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Send, Bot, User, Clock, FileText } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: any[]
  confidence?: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

     // Initialize welcome message on client side only
   useEffect(() => {
     setIsMounted(true)
     
     // Загружаем сохраненные сообщения из localStorage
     const savedMessages = localStorage.getItem('chat-messages')
     if (savedMessages) {
       try {
         const parsed = JSON.parse(savedMessages)
         // Преобразуем строки дат обратно в объекты Date
         const messagesWithDates = parsed.map((msg: any) => ({
           ...msg,
           timestamp: new Date(msg.timestamp)
         }))
         setMessages(messagesWithDates)
       } catch (error) {
         console.error('Error parsing saved messages:', error)
         // Если ошибка парсинга, показываем приветственное сообщение
         setMessages([
           {
             id: "1",
             role: "assistant",
             content: "Привет! Я AI помощник для работы с PMAC контроллером. Интегрирован с базой знаний и инструментами управления.\n\n✨ Возможности:\n• Ответы на технические вопросы\n• Анализ данных контроллера\n• Помощь с настройкой переменных\n• Поиск в документации\n• Диагностика проблем\n\nЧем могу помочь?",
             timestamp: new Date(),
             confidence: 1.0
           }
         ])
       }
     } else {
       // Если нет сохраненных сообщений, показываем приветственное
       setMessages([
         {
           id: "1",
           role: "assistant",
           content: "Привет! Я AI помощник для работы с PMAC контроллером. Интегрирован с базой знаний и инструментами управления.\n\n✨ Возможности:\n• Ответы на технические вопросы\n• Анализ данных контроллера\n• Помощь с настройкой переменных\n• Поиск в документации\n• Диагностика проблем\n\nЧем могу помочь?",
           timestamp: new Date(),
           confidence: 1.0
         }
       ])
     }
   }, [])

     useEffect(() => {
     scrollToBottom()
   }, [messages])

   // Сохраняем сообщения в localStorage при каждом изменении
   useEffect(() => {
     if (isMounted && messages.length > 0) {
       localStorage.setItem('chat-messages', JSON.stringify(messages))
     }
   }, [messages, isMounted])

   // Очищаем localStorage при размонтировании компонента (если нужно)
   useEffect(() => {
     return () => {
       // Можно добавить логику очистки при необходимости
     }
   }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date()
    }

    const messageText = inputValue
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

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
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'API error')
      }
      
             const assistantMessage: Message = {
         id: `assistant-${Date.now()}`,
         role: "assistant",
         content: data.response,
         timestamp: new Date(),
         sources: data.sources,
         confidence: data.confidence,
       }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Извините, произошла ошибка при обработке вашего запроса. Проверьте подключение к AI сервису и попробуйте еще раз.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }



  // Проверяем, есть ли сообщения кроме приветственного
  const hasUserMessages = messages.some(m => m.role === 'user')

  // Prevent hydration mismatch by waiting for client-side mount
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader 
          pageTitle="AI Chat Assistant"
          newChatButton={{
            onClick: () => {
              setMessages([
                {
                  id: "1",
                  role: "assistant",
                  content: "Привет! Я AI помощник для работы с PMAC контроллером. Интегрирован с базой знаний и инструментами управления.\n\n✨ Возможности:\n• Ответы на технические вопросы\n• Анализ данных контроллера\n• Помощь с настройке переменных\n• Поиск в документации\n• Диагностика проблем\n\nЧем могу помочь?",
                  timestamp: new Date(),
                  confidence: 1.0
                }
              ])
              localStorage.removeItem('chat-messages')
            }
          }}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
                             {/* Chat Interface */}
               <div className="px-2 lg:px-4 flex-1">
                                  <Card className="h-full flex flex-col">
                   <CardContent className="flex-1 flex flex-col p-0">
                                          {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                       {messages.map((message) => (
                         <div
                           key={message.id}
                           className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                         >
                           <div
                             className={`flex items-start space-x-3 max-w-[85%] ${
                               message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                             }`}
                           >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === "user" ? "bg-blue-600" : "bg-green-600"
                            }`}>
                              {message.role === "user" ? (
                                <User className="w-4 h-4 text-white" />
                              ) : (
                                <Bot className="w-6 h-6 text-white" />
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div
                                className={`px-4 py-3 rounded-lg ${
                                  message.role === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                              </div>
                              
                              {/* Message metadata */}
                              <div className={`flex items-center space-x-3 text-xs text-muted-foreground ${
                                message.role === "user" ? "justify-end" : "justify-start"
                              }`}>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{message.timestamp.toLocaleTimeString('ru-RU', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}</span>
                                </div>
                                
                                {/* Confidence indicator for AI messages */}
                                {message.role === "assistant" && message.confidence !== undefined && (
                                  <div className="flex items-center space-x-1">
                                    <span>Уверенность: {Math.round(message.confidence * 100)}%</span>
                                  </div>
                                )}
                              </div>
                              
                              
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-lg bg-muted">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-muted-foreground">
                                  AI думает...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Show empty state if no user messages */}
                      {!hasUserMessages && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Bot className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Добро пожаловать в AI Чат</h3>
                            <p className="text-muted-foreground">Ваш интеллектуальный помощник для работы с PMAC контроллером</p>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                                                                                   {/* Input Area */}
                      <div className="border-t px-4 py-4">
                       <div className="flex space-x-3">
                         <div className="flex-1">
                           <Input
                             value={inputValue}
                             onChange={(e) => setInputValue(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === "Enter" && !e.shiftKey) {
                                 e.preventDefault()
                                 handleSendMessage()
                               }
                             }}
                             placeholder="Введите ваше сообщение..."
                             className="h-12"
                             disabled={isLoading}
                           />
                         </div>
                         <Button
                           onClick={handleSendMessage}
                           disabled={!inputValue.trim() || isLoading}
                           size="lg"
                           className="h-12 px-6"
                         >
                           <Send className="w-4 h-4 mr-2" />
                           Отправить
                         </Button>
                       </div>
                       <div className="mt-2 text-xs text-muted-foreground text-center">
                         Нажмите Enter для отправки, Shift+Enter для новой строки
                       </div>
                     </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

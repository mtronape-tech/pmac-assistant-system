"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { MessageSquare, TrendingUp, Activity, BarChart3, Brain, User, Bot, ArrowLeft } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import Link from "next/link"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: any[]
  confidence?: number
  followUpQuestions?: string[]
}

export default function ChatStatsPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Загружаем сообщения из localStorage или другого источника
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
      }
    }
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка статистики...</div>
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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Welcome Section */}
              <div className="px-4 lg:px-6">
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/chat">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Назад к чату
                      </Link>
                    </Button>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Статистика AI Чата</h1>
                  <p className="text-muted-foreground">
                    Детальный анализ активности и качества ответов AI помощника
                  </p>
                </div>
              </div>
              
              {/* Summary Cards */}
              <div className="px-4 lg:px-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Activity Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="w-5 h-5" />
                        <span>Активность по времени</span>
                      </CardTitle>
                      <CardDescription>Анализ активности в чате</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Последний час</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">
                              {messages.filter(m => {
                                const now = new Date()
                                const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
                                return m.timestamp > lastHour
                              }).length} сообщений
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Сегодня</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">
                              {messages.filter(m => {
                                const today = new Date()
                                const messageDate = new Date(m.timestamp)
                                return messageDate.toDateString() === today.toDateString()
                              }).length} сообщений
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Общая активность</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="font-medium">
                              {messages.length > 0 ? 'Высокая' : 'Низкая'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quality Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>Метрики качества</span>
                      </CardTitle>
                      <CardDescription>Показатели эффективности AI</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Сообщения с источниками</span>
                          <Badge variant="outline">
                            {messages.filter(m => m.role === 'assistant' && m.sources && m.sources.length > 0).length}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Средняя длина сообщения</span>
                          <Badge variant="outline">
                            {messages.length > 0 ? Math.round(messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length) : 0} символов
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Время ответа</span>
                          <Badge variant="outline">
                            ~2-5 сек
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Additional Insights */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Дополнительные инсайты</CardTitle>
                    <CardDescription>
                      Полезная информация для улучшения качества чата
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">
                          💡 Рекомендации
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Задавайте конкретные вопросы для лучших ответов</li>
                          <li>• Используйте технические термины PMAC</li>
                          <li>• Указывайте контекст проблемы</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          🔍 Популярные темы
                        </h4>
                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <div>• Настройка P-переменных</div>
                          <div>• Диагностика движения осей</div>
                          <div>• Конфигурация контроллера</div>
                        </div>
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

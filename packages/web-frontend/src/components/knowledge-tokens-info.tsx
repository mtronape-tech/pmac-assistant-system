"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconBrain, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface TokensInfo {
  totalCredits: number
  totalUsage: number
  todayUsage?: number
}

export function KnowledgeTokensInfo() {
  const [tokensInfo, setTokensInfo] = useState<TokensInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTokensInfo = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Получаем API ключ из настроек приложения
      const configResponse = await fetch('/api/config')
      let apiKey = ''
      
      if (configResponse.ok) {
        const config = await configResponse.json()
        console.log('Config response:', config) // Отладочная информация
        // Проверяем оба варианта названия поля
        apiKey = config.openRouter?.apiKey || config.openrouter_api_key || ''
        console.log('Extracted API key:', apiKey ? '***' : 'not found') // Отладочная информация
      }
      
      // Fallback к localStorage
      if (!apiKey) {
        apiKey = localStorage.getItem('openrouter_api_key') || ''
      }
      
      if (!apiKey) {
        setError('API ключ не найден. Проверьте настройки в config.ini. Убедитесь, что сервис knowledge-base запущен.')
        return
      }

      const response = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTokensInfo({
          totalCredits: data.data.total_credits,
          totalUsage: data.data.total_usage,
          todayUsage: 0 // OpenRouter API не предоставляет данные по дням, можно добавить локальное отслеживание
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(`Ошибка при получении данных о токенах: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error loading tokens info:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Ошибка подключения к API конфигурации')
      } else {
        setError('Ошибка подключения к OpenRouter')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTokensInfo()
  }, [])

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  const creditsToTokens = (credits: number) => {
    // 1 кредит = примерно 1000 токенов в OpenRouter
    return Math.round(credits * 1000)
  }

  const getUsagePercentage = () => {
    if (!tokensInfo || tokensInfo.totalCredits === 0) return 0
    return Math.round((tokensInfo.totalUsage / tokensInfo.totalCredits) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-100 text-green-800'
    if (percentage < 80) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getPlanType = () => {
    if (!tokensInfo) return 'unknown'
    return tokensInfo.totalCredits > 0 ? 'paid' : 'free'
  }

  const getPlanBadge = () => {
    const plan = getPlanType()
    if (plan === 'paid') {
      return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>
    } else if (plan === 'free') {
      return <Badge className="bg-gray-100 text-gray-800">Free</Badge>
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBrain className="h-5 w-5" />
            Использование токенов
            {getPlanBadge()}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTokensInfo}
            disabled={loading}
          >
            <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
            {error}
          </div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Загрузка данных...</div>
        ) : tokensInfo ? (
          <div className="space-y-3">
            {/* Общее использование в токенах */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Всего использовано:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatTokens(creditsToTokens(tokensInfo.totalUsage))}</span>
                <span className="text-xs text-muted-foreground">
                  {tokensInfo.totalCredits > 0 ? `/ ${formatTokens(creditsToTokens(tokensInfo.totalCredits))}` : 'токенов'}
                </span>
              </div>
            </div>

            {/* Процент использования (только для платных планов) */}
            {tokensInfo.totalCredits > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Процент использования:</span>
                <Badge className={getUsageColor(getUsagePercentage())}>
                  {getUsagePercentage()}%
                </Badge>
              </div>
            )}

            {/* Прогресс бар (только для платных планов) */}
            {tokensInfo.totalCredits > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getUsagePercentage() < 50 ? 'bg-green-500' : 
                    getUsagePercentage() < 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                />
              </div>
            )}

            {/* Сегодняшнее использование (если доступно) */}
            {tokensInfo.todayUsage !== undefined && tokensInfo.todayUsage > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Сегодня:</span>
                <span className="font-mono text-sm">{formatTokens(creditsToTokens(tokensInfo.todayUsage))}</span>
              </div>
            )}

            {/* Информация о лимитах */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>• Данные в токенах (1 кредит ≈ 1000 токенов)</p>
              <p>• Лимиты обновляются в реальном времени</p>
              <p>• Данные предоставляются OpenRouter API</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Нет данных</div>
        )}
      </CardContent>
    </Card>
  )
}

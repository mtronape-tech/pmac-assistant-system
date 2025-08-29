"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconBrain, IconDatabase, IconFileText, IconUpload } from "@tabler/icons-react"

interface KnowledgeStats {
  totalDocuments: number
  totalSize: string
  categories: {
    documentation: number
    tutorial: number
    troubleshooting: number
  }
  processingJobs: number
}

interface KnowledgeStatsCardsProps {
  stats: KnowledgeStats | null
}

export function KnowledgeStatsCards({ stats }: KnowledgeStatsCardsProps) {
  const defaultStats = {
    totalDocuments: 0,
    totalSize: "0 MB",
    categories: {
      documentation: 0,
      tutorial: 0,
      troubleshooting: 0
    },
    processingJobs: 0
  }

  const currentStats = stats || defaultStats

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Всего документов</CardTitle>
          <IconFileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentStats.totalDocuments}</div>
          <p className="text-xs text-muted-foreground">
            Загружено в базу знаний
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Общий размер</CardTitle>
          <IconDatabase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentStats.totalSize}</div>
          <p className="text-xs text-muted-foreground">
            Используемое хранилище
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">В обработке</CardTitle>
          <IconUpload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentStats.processingJobs}</div>
          <p className="text-xs text-muted-foreground">
            Активных задач AI
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Категории</CardTitle>
          <IconBrain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.values(currentStats.categories).reduce((a, b) => a + b, 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Различных типов документов
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

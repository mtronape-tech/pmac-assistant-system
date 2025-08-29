"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { KnowledgeStatsCards } from "@/components/knowledge-stats-cards"
import { KnowledgeUploadCard } from "@/components/knowledge-upload-card"
import { KnowledgeDocumentsTable } from "@/components/knowledge-documents-table"
import { KnowledgeTokensInfo } from "@/components/knowledge-tokens-info"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

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

export default function KnowledgePage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])

  // Убираем автообновление статистики - обновляем только при загрузке страницы и после загрузки документов

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const apiResponse = await response.json()
        const apiData = apiResponse.data
        
        setStats({
          totalDocuments: apiData.documents?.totalDocuments || 0,
          totalSize: apiData.documents?.totalStorageSize ? 
            `${(apiData.documents.totalStorageSize / 1024 / 1024).toFixed(2)} MB` : "0 MB",
          categories: apiData.documents?.documentsByCategory || {
            documentation: 0,
            tutorial: 0,
            troubleshooting: 0
          },
          processingJobs: apiData.processing?.activeJobs || 0
        })
      } else {
        setStats({
          totalDocuments: 0,
          totalSize: "0 MB",
          categories: {
            documentation: 0,
            tutorial: 0,
            troubleshooting: 0
          },
          processingJobs: 0
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({
        totalDocuments: 0,
        totalSize: "0 MB",
        categories: {
          documentation: 0,
          tutorial: 0,
          troubleshooting: 0
        },
        processingJobs: 0
      })
    }
  }

  const handleUploadComplete = () => {
    // Небольшая задержка для обработки документа на сервере
    setTimeout(() => {
      // Обновляем статистику и список документов
      setRefreshTrigger(prev => prev + 1)
      // Также обновляем статистику
      loadStats()
    }, 1000)
  }

  const handleRefresh = () => {
    // Обновляем статистику и список документов
    setRefreshTrigger(prev => prev + 1)
    loadStats()
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
                  <h1 className="text-3xl font-bold tracking-tight">База знаний</h1>
                  <p className="text-muted-foreground">
                    Управление документами и AI-обработка для вашей системы PMAC. Загружайте, анализируйте и ищите документы.
                  </p>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="px-4 lg:px-6">
                <KnowledgeStatsCards stats={stats} />
              </div>
              
              {/* Upload and System Info Section */}
              <div className="px-4 lg:px-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Загрузка документов</h2>
                  <p className="text-muted-foreground">Загрузите документы для AI-обработки и добавления в базу знаний.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Загрузка файлов */}
                  <KnowledgeUploadCard onUploadComplete={handleUploadComplete} />
                  
                  {/* Информация о системе и токенах */}
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                      <h3 className="text-lg font-semibold mb-4">О системе</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Версия:</span>
                          <span>1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AI модель:</span>
                          <span>Z.AI GLM-4.5-Air</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Статус:</span>
                          <span className="text-green-600">Активна</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Последнее обновление:</span>
                          <span>{new Date().toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <KnowledgeTokensInfo />
                  </div>
                </div>
              </div>
              
              {/* Documents Table Section */}
              <div className="px-4 lg:px-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Документы в базе знаний</h2>
                  <p className="text-muted-foreground">Управление загруженными документами и их AI-обработкой.</p>
                </div>
                <KnowledgeDocumentsTable onRefresh={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
"use client"

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { DrivesDiagnosticsTable } from "@/components/drives-diagnostics-table"
import { DrivesChart } from "@/components/drives-chart"
import { ServicesTable } from "@/components/services-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface DriveStatus {
  id: number
  name: string
  axis: string
  converterState: 'OK' | 'ERROR'
  operationPermission: boolean
  fanOn: boolean
  dynamicBraking: boolean
  error: boolean
  state: 'O' | 'L' | 'H' | '1'
  trackingStatus: 'Ось в слежении' | 'Нет питания' | 'Подано питание' | 'Ошибка'
  current: number
  temperature: number
  lastUpdated: Date
}

// Пример данных для таблицы сервисов
const dashboardData = [
  {
    id: 1,
    service: "Knowledge Base",
    status: "Running",
    port: 3005,
    health: "Healthy",
    uptime: "2h 15m",
  },
  {
    id: 2,
    service: "PMAC Control",
    status: "Running",
    port: 3001,
    health: "Healthy",
    uptime: "2h 15m",
  },
  {
    id: 3,
    service: "Data Collection",
    status: "Running",
    port: 3001,
    health: "Healthy",
    uptime: "2h 15m",
  },
  {
    id: 4,
    service: "Analytics",
    status: "Running",
    port: 3003,
    health: "Healthy",
    uptime: "2h 15m",
  },
  {
    id: 5,
    service: "MCP Server",
    status: "Running",
    port: 3002,
    health: "Healthy",
    uptime: "2h 15m",
  },
  {
    id: 6,
    service: "Web Frontend",
    status: "Running",
    port: 3000,
    health: "Healthy",
    uptime: "2h 15m",
  },
]

export default function HomePage() {
  const [drives, setDrives] = useState<DriveStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDrives = async () => {
      try {
        const response = await fetch('http://localhost:3001/pmac/drives')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDrives(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch drives:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDrives()
    
    // Обновляем данные каждые 2 секунды
    const interval = setInterval(fetchDrives, 2000)
    
    return () => clearInterval(interval)
  }, [])

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
        <SiteHeader pageTitle="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6">
              {/* Welcome Section */}
              <div className="px-4 lg:px-6">
                {/* Заголовок уже отображается в SiteHeader */}
              </div>
              
              {/* Status Cards */}
              <SectionCards />
              
              {/* Drives Diagnostics Section */}
              <div className="px-4 lg:px-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Drives Diagnostics</h2>
                  <p className="text-muted-foreground">Real-time monitoring of motor temperature and current consumption for all axes.</p>
                </div>
                <div className="grid gap-6">
                  <DrivesDiagnosticsTable drives={drives} />
                  <DrivesChart drives={drives} />
                </div>
              </div>
              
              {/* Services Table */}
              <div className="px-4 lg:px-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Service Status</h2>
                  <p className="text-muted-foreground">Overview of all running services and their current status.</p>
                </div>
                <ServicesTable data={dashboardData} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

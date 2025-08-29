"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import styles from './drives-diagnostics-table.module.css'

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

interface DrivesDiagnosticsTableProps {
  drives: DriveStatus[]
}

export function DrivesDiagnosticsTable({ drives }: DrivesDiagnosticsTableProps) {
  const [currentDrives, setCurrentDrives] = useState<DriveStatus[]>(drives)

  useEffect(() => {
    setCurrentDrives(drives)
  }, [drives])

  const getStateColor = (state: string) => {
    switch (state) {
      case 'O':
        return 'bg-green-100 text-green-800'
      case 'L':
        return 'bg-yellow-100 text-yellow-800'
      case 'H':
        return 'bg-blue-100 text-blue-800'
      case '1':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrackingStatusColor = (status: string) => {
    switch (status) {
      case 'Ось в слежении':
        return 'bg-green-100 text-green-800'
      case 'Нет питания':
        return 'bg-yellow-100 text-yellow-800'
      case 'Подано питание':
        return 'bg-blue-100 text-blue-800'
      case 'Ошибка':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBooleanStatus = (value: boolean) => {
    return value ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Да</Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">Нет</Badge>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Диагностика приводов</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles.drivesTable}>
          {/* Заголовок таблицы */}
          <div className={styles.drivesHeader}>
            <div className="font-semibold text-foreground">Параметр</div>
            {currentDrives.map((drive) => (
              <div key={drive.id} className="text-center font-semibold text-foreground">
                {drive.name}
              </div>
            ))}
          </div>
          
          {/* Строки данных */}
          <div className="space-y-3">
            {/* Состояние преобразователя */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Состояние преобразоват</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  <Badge 
                    variant={drive.converterState === 'OK' ? 'default' : 'destructive'}
                    className={drive.converterState === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {drive.converterState}
                  </Badge>
                </div>
              ))}
            </div>
            
            {/* Разрешение работы */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Разрешение работы</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  {getBooleanStatus(drive.operationPermission)}
                </div>
              ))}
            </div>
            
            {/* Вентилятор включен */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Вентилятор включен</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  {getBooleanStatus(drive.fanOn)}
                </div>
              ))}
            </div>
            
            {/* Динамическое торможение */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Динамическое торможение</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  {getBooleanStatus(drive.dynamicBraking)}
                </div>
              ))}
            </div>
            
            {/* Ошибка */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Ошибка</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  {getBooleanStatus(drive.error)}
                </div>
              ))}
            </div>
            
            {/* Состояние */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Состояние</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  <Badge className={getStateColor(drive.state)}>
                    {drive.state}
                  </Badge>
                </div>
              ))}
            </div>
            
            {/* Ось в слежении */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Ось в слежении</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCell}>
                  <Badge className={getTrackingStatusColor(drive.trackingStatus)}>
                    {drive.trackingStatus}
                  </Badge>
                </div>
              ))}
            </div>
            
            {/* Ток */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Ток (А)</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCellMono}>
                  {drive.current.toFixed(2)}
                </div>
              ))}
            </div>
            
            {/* Температура */}
            <div className={styles.drivesRow}>
              <div className={styles.parameterCell}>Температура (°C)</div>
              {currentDrives.map((drive) => (
                <div key={drive.id} className={styles.dataCellMono}>
                  {drive.temperature.toFixed(1)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

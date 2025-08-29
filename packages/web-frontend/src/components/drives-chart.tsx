"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

interface DrivesChartProps {
  drives: DriveStatus[]
}

export function DrivesChart({ drives }: DrivesChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const data = drives.map(drive => ({
      name: drive.name,
      current: drive.current,
      temperature: drive.temperature,
      currentPercentage: Math.round((drive.current / 10) * 100),
      temperaturePercentage: Math.round(((drive.temperature - 20) / 25) * 100)
    }))
    setChartData(data)
  }, [drives])

  const formatTooltip = (value: number, name: string, props: any) => {
    const drive = drives.find(d => d.name === props.payload.name)
    if (!drive) return [value, name]
    
    const unit = name === 'current' ? 'A' : '°C'
    return [
      `${value.toFixed(2)} ${unit}`,
      `${drive.name} (${drive.axis})`
    ]
  }

  return (
    <Card className="w-full">
             <CardHeader>
         <CardTitle className="text-lg font-semibold">
           График тока и температуры приводов
         </CardTitle>
       </CardHeader>
      <CardContent>
                 <div className="h-[400px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis 
                 dataKey="name" 
                 angle={-45}
                 textAnchor="end"
                 height={80}
                 interval={0}
               />
               <YAxis 
                 yAxisId="current"
                 domain={[0, 10]}
                 label={{ value: 'Ток (А)', angle: -90, position: 'insideLeft' }}
               />
               <YAxis 
                 yAxisId="temperature"
                 orientation="right"
                 domain={[20, 45]}
                 label={{ value: 'Температура (°C)', angle: 90, position: 'insideRight' }}
               />
               <Tooltip formatter={formatTooltip} />
               <Bar 
                 dataKey="current" 
                 fill="#3b82f6"
                 radius={[4, 4, 0, 0]}
                 yAxisId="current"
               />
               <Bar 
                 dataKey="temperature" 
                 fill="#f59e0b"
                 radius={[4, 4, 0, 0]}
                 yAxisId="temperature"
               />
             </BarChart>
           </ResponsiveContainer>
         </div>
        
                 {/* Процентные значения над столбцами */}
         <div className="mt-4 grid grid-cols-8 gap-2">
           {chartData.map((item, index) => (
             <div key={index} className="text-center">
               <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                 {item.currentPercentage}% (ток)
               </div>
               <div className="text-xs text-blue-500 dark:text-blue-300 font-mono">
                 {item.current.toFixed(2)}A
               </div>
               <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mt-1">
                 {item.temperaturePercentage}% (темп)
               </div>
               <div className="text-xs text-orange-500 dark:text-orange-300 font-mono">
                 {item.temperature.toFixed(1)}°C
               </div>
             </div>
           ))}
         </div>
      </CardContent>
    </Card>
  )
}

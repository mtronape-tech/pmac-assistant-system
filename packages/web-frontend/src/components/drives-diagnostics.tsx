"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Фейковые данные для диагностики приводов
const drivesData = [
  { time: "00:00", motor1_temp: 45, motor1_current: 25, motor2_temp: 42, motor2_current: 30, motor3_temp: 48, motor3_current: 35 },
  { time: "02:00", motor1_temp: 47, motor1_current: 28, motor2_temp: 44, motor2_current: 32, motor3_temp: 50, motor3_current: 38 },
  { time: "04:00", motor1_temp: 49, motor1_current: 32, motor2_temp: 46, motor2_current: 35, motor3_temp: 52, motor3_current: 42 },
  { time: "06:00", motor1_temp: 51, motor1_current: 35, motor2_temp: 48, motor2_current: 38, motor3_temp: 54, motor3_current: 45 },
  { time: "08:00", motor1_temp: 53, motor1_current: 38, motor2_temp: 50, motor2_current: 40, motor3_temp: 56, motor3_current: 48 },
  { time: "10:00", motor1_temp: 55, motor1_current: 42, motor2_temp: 52, motor2_current: 43, motor3_temp: 58, motor3_current: 52 },
  { time: "12:00", motor1_temp: 57, motor1_current: 45, motor2_temp: 54, motor2_current: 46, motor3_temp: 60, motor3_current: 55 },
  { time: "14:00", motor1_temp: 59, motor1_current: 48, motor2_temp: 56, motor2_current: 49, motor3_temp: 62, motor3_current: 58 },
  { time: "16:00", motor1_temp: 61, motor1_current: 52, motor2_temp: 58, motor2_current: 52, motor3_temp: 64, motor3_current: 62 },
  { time: "18:00", motor1_temp: 63, motor1_current: 55, motor2_temp: 60, motor2_current: 55, motor3_temp: 66, motor3_current: 65 },
  { time: "20:00", motor1_temp: 65, motor1_current: 58, motor2_temp: 62, motor2_current: 58, motor3_temp: 68, motor3_current: 68 },
  { time: "22:00", motor1_temp: 67, motor1_current: 62, motor2_temp: 64, motor2_current: 61, motor3_temp: 70, motor3_current: 72 },
]

export function DrivesDiagnostics() {
  const [selectedMetric, setSelectedMetric] = React.useState<"temperature" | "current">("temperature")

  const getChartData = () => {
    if (selectedMetric === "temperature") {
      return drivesData.map(item => ({
        time: item.time,
        "Motor 1": item.motor1_temp,
        "Motor 2": item.motor2_temp,
        "Motor 3": item.motor3_temp,
      }))
    } else {
      return drivesData.map(item => ({
        time: item.time,
        "Motor 1": item.motor1_current,
        "Motor 2": item.motor2_current,
        "Motor 3": item.motor3_current,
      }))
    }
  }

  const getYAxisDomain = () => {
    if (selectedMetric === "temperature") {
      return [0, 100] // 0-100°C
    } else {
      return [0, 200] // 0-200A
    }
  }

  const getYAxisLabel = () => {
    return selectedMetric === "temperature" ? "Temperature (°C)" : "Current (A)"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Drives Diagnostics</CardTitle>
            <CardDescription>
              Real-time monitoring of motor temperature and current consumption
            </CardDescription>
          </div>
          <Select value={selectedMetric} onValueChange={(value: "temperature" | "current") => setSelectedMetric(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temperature">Temperature (°C)</SelectItem>
              <SelectItem value="current">Current (A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={getYAxisDomain()}
              label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{`Time: ${label}`}</p>
                      {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }}>
                          {`${entry.name}: ${entry.value}${selectedMetric === "temperature" ? "°C" : "A"}`}
                        </p>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="Motor 1"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Motor 2"
              stackId="1"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Motor 3"
              stackId="1"
              stroke="#ffc658"
              fill="#ffc658"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Статус приводов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Motor 1 (X-Axis)</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor1_temp}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor1_current}A</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600">Normal</span>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Motor 2 (Y-Axis)</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor2_temp}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor2_current}A</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600">Normal</span>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Motor 3 (Z-Axis)</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor3_temp}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-mono">{drivesData[drivesData.length - 1].motor3_current}A</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-yellow-600">Warning</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

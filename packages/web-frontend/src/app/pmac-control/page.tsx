"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Settings, Zap, Gauge, Activity, ArrowUpDown, Eye, Edit3, Code, RefreshCw, Power } from "lucide-react"
import Link from "next/link"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PMACControlPage() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    ip: "192.168.10.212",
    port: 1025,
    device: "Test",
    type: "Главное устройство"
  })

  // Моковые данные для демонстрации
  const coordinateSystems = [
    {
      id: 1,
      name: "КС 1",
      axes: [
        {
          id: 1,
          name: "Ось X",
          motors: [
            { id: 1, name: "Мотор 1", position: 0.0, speed: 0.0, trackingError: 0.0, status: "active" },
            { id: 2, name: "Мотор 2", position: 0.0, speed: 0.0, trackingError: 0.0, status: "active" },
            { id: 3, name: "Виртуальный", position: 0.0, speed: 0.0, trackingError: 0.0, status: "virtual" }
          ]
        },
        {
          id: 2,
          name: "Ось Y", 
          motors: [
            { id: 4, name: "Мотор 4", position: 0.0, speed: 0.0, trackingError: 0.0, status: "active" },
            { id: 5, name: "Мотор 5", position: 0.0, speed: 0.0, trackingError: 0.0, status: "active" },
            { id: 6, name: "Виртуальный", position: 0.0, speed: 0.0, trackingError: 0.0, status: "virtual" }
          ]
        }
      ]
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case "inactive":
        return <div className="w-3 h-3 bg-red-500 rounded-full" />
      case "virtual":
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Активен"
      case "inactive":
        return "Неактивен"
      case "virtual":
        return "Виртуальный"
      default:
        return "Неизвестно"
    }
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
        <SiteHeader pageTitle="PMAC Control" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-0 md:gap-0">
            <div className="flex flex-col gap-0 pt-4 pb-4 md:gap-0 md:pt-6 md:pb-6">
              
              {/* Connection Status and Global Controls */}
              <div className="px-4 lg:px-6">
                <Card className="rounded-b-none">
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm">
                            {connectionStatus.connected ? 'Подключено' : 'Отключено'} от {connectionStatus.ip}|{connectionStatus.port}|{connectionStatus.device}| ({connectionStatus.type})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-2">
                          <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Симулятор
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full sm:w-auto hover:bg-muted hover:text-muted-foreground transition-colors"
                        onClick={() => {
                          // Логика переподключения
                          console.log('Переподключение...')
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Переподключиться
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Tabs Interface */}
              <div className="px-4 lg:px-6">
                <Tabs defaultValue="position" className="w-full">
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="bg-muted p-1 inline-block min-w-full">
                      <TabsList className="flex w-max min-w-full gap-1 p-1 bg-transparent border-0">
                        <TabsTrigger value="overview" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Просмотр</TabsTrigger>
                        <TabsTrigger value="i-variables" className="text-xs sm:text-sm whitespace-nowrap rounded-none">I переменные</TabsTrigger>
                        <TabsTrigger value="p-variables" className="text-xs sm:text-sm whitespace-nowrap rounded-none">P переменные</TabsTrigger>
                        <TabsTrigger value="q-variables" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Q переменные</TabsTrigger>
                        <TabsTrigger value="m-variables" className="text-xs sm:text-sm whitespace-nowrap rounded-none">M переменные</TabsTrigger>
                        <TabsTrigger value="position" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Позиция</TabsTrigger>
                        <TabsTrigger value="motor-status" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Статус моторов</TabsTrigger>
                        <TabsTrigger value="coord-sys" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Коорд. сис.</TabsTrigger>
                        <TabsTrigger value="global-status" className="text-xs sm:text-sm whitespace-nowrap rounded-none">Глобальный статус</TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  {/* Позиция - основной контент как на скрине */}
                  <TabsContent value="position">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Позиция моторов</CardTitle>
                        <CardDescription>Текущие позиции, скорости и ошибки слежения для всех моторов</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Мотор</TableHead>
                              <TableHead>Позиция</TableHead>
                              <TableHead>Скорость</TableHead>
                              <TableHead>Ошибка слежения</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {coordinateSystems[0].axes.flatMap(axis => 
                              axis.motors.map(motor => (
                                <TableRow key={motor.id}>
                                  <TableCell className="font-medium flex items-center gap-2">
                                    {getStatusIcon(motor.status)}
                                    # {motor.id}
                                  </TableCell>
                                  <TableCell>{motor.position} имп</TableCell>
                                  <TableCell>{motor.speed} имп/мс</TableCell>
                                  <TableCell>{motor.trackingError} имп</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* I переменные */}
                  <TabsContent value="i-variables">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>I переменные</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="bg-blue-50 dark:bg-blue-950/20">I переменная</TableHead>
                              <TableHead>Описание</TableHead>
                              <TableHead>Значение</TableHead>
                              <TableHead>По умолчанию</TableHead>
                              <TableHead>Диапазон</TableHead>
                              <TableHead>Единицы измерения</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I0</TableCell>
                              <TableCell>Serial Card ...</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...15</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I1</TableCell>
                              <TableCell>Serial Port Mode</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0...3</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I2</TableCell>
                              <TableCell>Control Panel P...</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I3</TableCell>
                              <TableCell>Handshake ...</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I4</TableCell>
                              <TableCell>Communication...</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I5</TableCell>
                              <TableCell>PLC Program ...</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I6</TableCell>
                              <TableCell>Error Reporting ...</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I7</TableCell>
                              <TableCell>Phase Cycle ...</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell>Phase clock...</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I8</TableCell>
                              <TableCell>Real Time ...</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell>Servo Interrupt...</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I9</TableCell>
                              <TableCell>Full/Abbrev....</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I10</TableCell>
                              <TableCell>Motor Status ...</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I11</TableCell>
                              <TableCell>Axis Config...</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I12</TableCell>
                              <TableCell>Safety Limits...</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I13</TableCell>
                              <TableCell>Emergency Stop...</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I14</TableCell>
                              <TableCell>System Mode...</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>3</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">I15</TableCell>
                              <TableCell>Debug Level...</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0...255</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* P переменные */}
                  <TabsContent value="p-variables">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>P переменные</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="bg-blue-50 dark:bg-blue-950/20">P переменная</TableHead>
                              <TableHead>Описание</TableHead>
                              <TableHead>Значение</TableHead>
                              <TableHead>По умолчанию</TableHead>
                              <TableHead>Диапазон</TableHead>
                              <TableHead>Единицы измерения</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">P1</TableCell>
                              <TableCell>Скорость по умолчанию</TableCell>
                              <TableCell>1000.0</TableCell>
                              <TableCell>1000.0</TableCell>
                              <TableCell>0...10000</TableCell>
                              <TableCell>имп/мс</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">P2</TableCell>
                              <TableCell>Ускорение по умолчанию</TableCell>
                              <TableCell>500.0</TableCell>
                              <TableCell>500.0</TableCell>
                              <TableCell>0...5000</TableCell>
                              <TableCell>имп/мс²</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">P3</TableCell>
                              <TableCell>Торможение по умолчанию</TableCell>
                              <TableCell>500.0</TableCell>
                              <TableCell>500.0</TableCell>
                              <TableCell>0...5000</TableCell>
                              <TableCell>имп/мс²</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Q переменные */}
                  <TabsContent value="q-variables">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Q переменные</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="bg-blue-50 dark:bg-blue-950/20">Q переменная</TableHead>
                              <TableHead>Описание</TableHead>
                              <TableHead>Значение</TableHead>
                              <TableHead>По умолчанию</TableHead>
                              <TableHead>Диапазон</TableHead>
                              <TableHead>Единицы измерения</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">Q1</TableCell>
                              <TableCell>Координата X</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>-1000...1000</TableCell>
                              <TableCell>мм</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">Q2</TableCell>
                              <TableCell>Координата Y</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>-1000...1000</TableCell>
                              <TableCell>мм</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">Q3</TableCell>
                              <TableCell>Координата Z</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>0.0</TableCell>
                              <TableCell>-500...500</TableCell>
                              <TableCell>мм</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* M переменные */}
                  <TabsContent value="m-variables">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>M переменные</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="bg-blue-50 dark:bg-blue-950/20">M переменная</TableHead>
                              <TableHead>Описание</TableHead>
                              <TableHead>Значение</TableHead>
                              <TableHead>По умолчанию</TableHead>
                              <TableHead>Диапазон</TableHead>
                              <TableHead>Единицы измерения</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">M1</TableCell>
                              <TableCell>Флаг движения по оси X</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...1</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">M2</TableCell>
                              <TableCell>Флаг движения по оси Y</TableCell>
                              <TableCell>1</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...1</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-blue-50 dark:bg-blue-950/20">M3</TableCell>
                              <TableCell>Флаг движения по оси Z</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>0...1</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Статус моторов */}
                  <TabsContent value="motor-status">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Статус моторов</CardTitle>
                        <CardDescription>Детальная информация о состоянии всех моторов</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Мотор</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Температура</TableHead>
                              <TableHead>Ток</TableHead>
                              <TableHead>Ошибки</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {coordinateSystems[0].axes.flatMap(axis => 
                              axis.motors.map(motor => (
                                <TableRow key={motor.id}>
                                  <TableCell className="font-medium">#{motor.id}</TableCell>
                                  <TableCell>
                                    <Badge variant={motor.status === 'active' ? 'default' : 'secondary'}>
                                      {getStatusText(motor.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>45°C</TableCell>
                                  <TableCell>2.1A</TableCell>
                                  <TableCell>-</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Координатные системы */}
                  <TabsContent value="coord-sys">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Координатные системы</CardTitle>
                        <CardDescription>Структура координатных систем, осей и моторов</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {coordinateSystems.map(cs => (
                          <div key={cs.id} className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">{cs.name}</h3>
                            <div className="space-y-3">
                              {cs.axes.map(axis => (
                                <div key={axis.id} className="border rounded-lg p-4">
                                  <h4 className="font-medium mb-2">{axis.name}</h4>
                                  <div className="grid grid-cols-3 gap-4">
                                    {axis.motors.map(motor => (
                                      <div key={motor.id} className="text-sm">
                                        <div className="font-medium">#{motor.id}</div>
                                        <div className="text-muted-foreground">{getStatusText(motor.status)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Глобальный статус */}
                  <TabsContent value="global-status">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Глобальный статус системы</CardTitle>
                        <CardDescription>Общая информация о состоянии PMAC контроллера</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-medium mb-3">Система</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Статус:</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Работает
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Режим:</span>
                                <span>Симуляция</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Версия прошивки:</span>
                                <span>2.0.0</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-medium mb-3">Подключение</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Тип:</span>
                                <span>TCP/IP</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Хост:</span>
                                <span>{connectionStatus.ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Порт:</span>
                                <span>{connectionStatus.port}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Статус:</span>
                                <Badge variant="outline" className={connectionStatus.connected ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                                  {connectionStatus.connected ? "Активно" : "Неактивно"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Просмотр */}
                  <TabsContent value="overview">
                    <Card className="rounded-t-none">
                      <CardHeader>
                        <CardTitle>Общий обзор</CardTitle>
                        <CardDescription>Сводная информация по всем системам</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {coordinateSystems.length}
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Координатных систем</div>
                          </div>
                          
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {coordinateSystems.reduce((acc, cs) => acc + cs.axes.length, 0)}
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400 mt-1">Оси</div>
                          </div>
                          
                          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {coordinateSystems.reduce((acc, cs) => acc + cs.axes.reduce((acc2, axis) => acc2 + axis.motors.length, 0), 0)}
                            </div>
                            <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Моторов</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

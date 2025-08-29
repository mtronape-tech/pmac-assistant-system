"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { KnowledgeDocumentEditModal } from "./knowledge-document-edit-modal"

import { 
  IconSearch, 
  IconDownload, 
  IconTrash, 
  IconTag,
  IconClock,
  IconUser,
  IconFileText,
  IconRefresh
} from "@tabler/icons-react"

interface Document {
  id: string
  title: string
  filename?: string
  fileSize: number
  uploadDate: string
  author?: string
  category?: string
  tags?: string[]
  status: 'processing' | 'completed' | 'error'
  type: string
  description?: string
  processingProgress?: number
  processingStep?: string
  processingJobId?: string
  estimatedTimeRemaining?: string
}

interface KnowledgeDocumentsTableProps {
  onRefresh?: () => void
}

export function KnowledgeDocumentsTable({ onRefresh }: KnowledgeDocumentsTableProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [searchQuery, selectedCategory])

  // Добавляем эффект для обновления при изменении onRefresh
  useEffect(() => {
    loadDocuments()
  }, [onRefresh])

  // Функция для получения понятного названия этапа
  const getStepDisplayName = (stepName: string): string => {
    // Проверяем, есть ли детальная информация о прогрессе эмбеддингов
    if (stepName.startsWith('metadata_extraction_')) {
      const progress = stepName.split('_')[2];
      return `Эмбеддинги (${progress}%)`;
    }
    
    // Проверяем, содержит ли stepName идентификатор этапа
    if (stepName.includes('text_extraction')) return 'Извлечение текста'
    if (stepName.includes('text_chunking')) return 'Разбиение'
    if (stepName.includes('metadata_extraction')) return 'Эмбеддинги'
    if (stepName.includes('quality_assessment')) return 'Оценка'
    
    // Если не нашли совпадение, возвращаем исходное название
    return stepName
  }

  // Функция для получения номера этапа
  const getStepNumber = (stepName: string): number => {
    // Проверяем, содержит ли stepName идентификатор этапа
    if (stepName.includes('text_extraction')) return 1
    if (stepName.includes('text_chunking')) return 2
    if (stepName.includes('metadata_extraction')) return 3
    if (stepName.includes('quality_assessment')) return 4
    
    // Если не нашли совпадение, возвращаем 0
    return 0
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== "all") params.append('category', selectedCategory)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        const docs = data.data.documents || []
        
        setDocuments(docs)
      } else {
        // Fallback к mock данным
        setDocuments([
          {
            id: "doc_1",
            title: "PMAC User Manual",
            filename: "pmac-manual.pdf",
            fileSize: 2048576,
            uploadDate: "2025-01-19T10:00:00Z",
            author: "PMAC Team",
            category: "documentation",
            tags: ["manual", "user-guide", "pmac"],
            status: "completed",
            type: "pdf",
            description: "Полное руководство пользователя PMAC контроллера"
          },
          {
            id: "doc_2",
            title: "Troubleshooting Guide",
            filename: "troubleshooting.docx",
            fileSize: 1048576,
            uploadDate: "2025-01-18T15:30:00Z",
            author: "Support Team",
            category: "troubleshooting",
            tags: ["guide", "support", "errors"],
            status: "completed",
            type: "docx",
            description: "Руководство по устранению неполадок"
          }
        ])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, processingStep?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Завершено</Badge>
      case 'processing':
        if (processingStep) {
          const stepName = getStepDisplayName(processingStep)
          const stepNumber = getStepNumber(processingStep)
          return <Badge className="bg-yellow-100 text-yellow-800">{stepName} ({stepNumber} из 4)</Badge>
        }
        return <Badge className="bg-yellow-100 text-yellow-800">В обработке</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Ошибка</Badge>
      default:
        return <Badge variant="secondary">Неизвестно</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'documentation':
        return <Badge className="bg-blue-100 text-blue-800">Документация</Badge>
      case 'tutorial':
        return <Badge className="bg-purple-100 text-purple-800">Учебник</Badge>
      case 'troubleshooting':
        return <Badge className="bg-orange-100 text-orange-800">Устранение неполадок</Badge>
      default:
        return <Badge variant="secondary">{category}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleUpdateDocument = async (documentId: string, updates: Partial<Document>) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        // Обновляем документ в локальном состоянии
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId ? { ...doc, ...updates } : doc
        ))
        // Обновляем статистику
        onRefresh?.()
      } else {
        alert('Ошибка при обновлении документа')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Ошибка при обновлении документа')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) return

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
        // Обновляем статистику после удаления документа
        onRefresh?.()
      } else {
        alert('Ошибка при удалении документа')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Ошибка при удалении документа')
    }
  }

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'document'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Ошибка при скачивании документа')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Ошибка при скачивании документа')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDocuments()
    setRefreshing(false)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconFileText className="h-5 w-5" />
            Документы в базе знаний
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Обновить"
          >
            <IconRefresh className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Фильтры и поиск */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по документам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="documentation">Документация</SelectItem>
              <SelectItem value="tutorial">Учебник</SelectItem>
              <SelectItem value="troubleshooting">Устранение неполадок</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Таблица документов */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Документ</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Размер</TableHead>
                <TableHead>Дата загрузки</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Загрузка документов...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Документы не найдены
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        {doc.filename && (
                          <div className="text-sm text-muted-foreground">{doc.filename}</div>
                        )}
                        {doc.description && (
                          <div className="text-sm text-muted-foreground mt-1">{doc.description}</div>
                        )}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <IconTag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.category ? getCategoryBadge(doc.category) : '-'}
                    </TableCell>
                                         <TableCell>
                       {getStatusBadge(doc.status, doc.processingStep)}
                     </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <IconClock className="h-3 w-3" />
                        {formatDate(doc.uploadDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.author ? (
                        <div className="flex items-center gap-1">
                          <IconUser className="h-3 w-3" />
                          {doc.author}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                                         <TableCell>
                       <div className="flex gap-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDownload(doc.id, doc.filename || doc.title)}
                           title="Скачать"
                         >
                           <IconDownload className="h-4 w-4" />
                         </Button>
                         <KnowledgeDocumentEditModal
                           document={doc}
                           onSave={handleUpdateDocument}
                           onDelete={handleDelete}
                         />
                       </div>
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Информация о количестве */}
        <div className="text-sm text-muted-foreground text-center">
          Найдено документов: {documents.length}
        </div>
      </CardContent>
    </Card>
  )
}

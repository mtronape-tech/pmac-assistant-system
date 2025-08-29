"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconEdit } from "@tabler/icons-react"

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
}

interface KnowledgeDocumentEditModalProps {
  document: Document
  onSave: (documentId: string, updates: Partial<Document>) => Promise<void>
  onDelete: (documentId: string) => Promise<void>
}

export function KnowledgeDocumentEditModal({ 
  document, 
  onSave, 
  onDelete 
}: KnowledgeDocumentEditModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: document.title || '',
    author: document.author || '',
    category: document.category || 'documentation',
    description: document.description || '',
    tags: document.tags?.join(', ') || ''
  })

  const handleSave = async () => {
    try {
      setIsLoading(true)
      const updates = {
        title: formData.title,
        author: formData.author,
        category: formData.category,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
      
      await onSave(document.id, updates)
      setIsOpen(false)
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Ошибка при сохранении документа')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) return
    
    try {
      setIsLoading(true)
      await onDelete(document.id)
      setIsOpen(false)
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Ошибка при удалении документа')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Редактировать">
          <IconEdit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать документ</DialogTitle>
          <DialogDescription>
            Измените информацию о документе. Нажмите "Сохранить" когда закончите.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Введите название документа"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="author">Автор</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Введите автора документа"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="category">Категория</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentation">Документация</SelectItem>
                <SelectItem value="tutorial">Учебник</SelectItem>
                <SelectItem value="troubleshooting">Устранение неполадок</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Введите описание документа"
              rows={3}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="tags">Теги (через запятую)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="тег1, тег2, тег3"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div><strong>Файл:</strong> {document.filename}</div>
            <div><strong>Размер:</strong> {formatFileSize(document.fileSize)}</div>
            <div><strong>Статус:</strong> {getStatusText(document.status)}</div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isLoading}
          >
            Удалить
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Отмена
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed':
      return 'Завершено'
    case 'processing':
      return 'В обработке'
    case 'error':
      return 'Ошибка'
    default:
      return status
  }
}

"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { IconUpload, IconFile, IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"

interface KnowledgeUploadCardProps {
  onUploadComplete?: () => void
}

export function KnowledgeUploadCard({ onUploadComplete }: KnowledgeUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentFileName, setCurrentFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentXHR = useRef<XMLHttpRequest | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'txt':
        return '📄'
      case 'md':
        return '📝'
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️'
      default:
        return '📁'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFileWithProgress = (file: File, fileIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      currentXHR.current = xhr
      const formData = new FormData()
      formData.append('file', file)

      // Отслеживаем прогресс загрузки
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const fileProgress = (event.loaded / event.total) * 100
          const totalProgress = ((fileIndex + fileProgress / 100) / selectedFiles.length) * 100
          setUploadProgress(totalProgress)
        }
      })

      // Обработка завершения загрузки
      xhr.addEventListener('load', () => {
        currentXHR.current = null
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            console.log('Upload successful:', result)
            resolve()
          } catch (error) {
            reject(new Error(`Ошибка парсинга ответа для ${file.name}`))
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText} для ${file.name}`))
        }
      })

      // Обработка ошибок
      xhr.addEventListener('error', () => {
        currentXHR.current = null
        reject(new Error(`Ошибка сети при загрузке ${file.name}`))
      })

      xhr.addEventListener('abort', () => {
        currentXHR.current = null
        reject(new Error(`Загрузка ${file.name} была отменена`))
      })

      // Отправляем запрос
              xhr.open('POST', '/api/documents/upload')
      xhr.send(formData)
    })
  }

  const cancelUpload = () => {
    if (currentXHR.current) {
      currentXHR.current.abort()
      currentXHR.current = null
    }
    setIsUploading(false)
    setUploadProgress(0)
    setUploadStatus("Загрузка отменена")
    setCurrentFileIndex(0)
    setCurrentFileName("")
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus("Начинаем загрузку...")

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setCurrentFileIndex(i + 1)
        setCurrentFileName(file.name)
        setUploadStatus(`Загружаем ${file.name}...`)
        
        await uploadFileWithProgress(file, i)
      }

      setUploadStatus("Загрузка завершена успешно!")
      setSelectedFiles([])
      onUploadComplete?.()
      
      // Сброс через 3 секунды
      setTimeout(() => {
        setUploadStatus("")
        setUploadProgress(0)
      }, 3000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUpload className="h-5 w-5" />
          Загрузка документов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Выбор файлов */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <IconFile className="h-4 w-4 mr-2" />
            Выбрать файлы
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
          />
        </div>

        {/* Выбранные файлы */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Выбранные файлы:</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                                 <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFileIcon(file.name)}</span>
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                                             <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Прогресс загрузки */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{uploadStatus}</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            {currentFileIndex > 0 && (
              <div className="text-xs text-muted-foreground">
                Файл {currentFileIndex} из {selectedFiles.length}: {currentFileName}
              </div>
            )}
          </div>
        )}

        {/* Статус */}
        {uploadStatus && !isUploading && (
                   <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
           <p className="text-sm text-green-800 dark:text-green-200">{uploadStatus}</p>
         </div>
        )}

        {/* Кнопки загрузки/отмены */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <IconUpload className="h-4 w-4 mr-2 animate-pulse" />
                Загружаем...
              </>
            ) : (
              <>
                <IconUpload className="h-4 w-4 mr-2" />
                Загрузить {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </>
            )}
          </Button>
          {isUploading && (
            <Button
              variant="outline"
              onClick={cancelUpload}
              className="px-4"
            >
              <IconX className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Информация о поддерживаемых форматах */}
                 <div className="text-xs text-muted-foreground">
           <p>Поддерживаемые форматы: PDF, DOC, DOCX, TXT, MD, JPG, PNG</p>
           <p>Максимальный размер файла: 50 MB</p>
         </div>
      </CardContent>
    </Card>
  )
}

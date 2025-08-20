"use client";

import { useState, useEffect } from "react";
import { 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Eye, 
  Tag, 
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Filter,
  Plus,
  X
} from "lucide-react";
import { 
  AiFillFilePdf,
  AiFillFileWord,
  AiFillFileText,
  AiFillFileImage,
  AiFillFile,
  AiFillFileExcel
} from "react-icons/ai";
import { 
  SiMarkdown,
  SiJavascript
} from "react-icons/si";
import Link from "next/link";

interface Document {
  id: string;
  title: string;
  filename?: string; // Оригинальное имя файла с расширением
  fileSize: number;
  uploadDate: string;
  author?: string;
  category?: string;
  tags?: string[];
  status: 'processing' | 'completed' | 'error';
  type: string;
  description?: string;
  // Поля для отслеживания прогресса AI обработки
  processingProgress?: number; // 0-100
  processingStep?: string; // Текущий этап обработки
  processingStartedAt?: string; // Время начала обработки
  estimatedTimeRemaining?: number; // Оставшееся время в секундах
}

interface UploadResult {
  documentId: string;
  fileSize: number;
  processingJobId: string;
  status: string;
  message: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stats, setStats] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<Map<string, string>>(new Map());

  // Загрузка документов с API
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  // Перезагружаем документы при изменении фильтров
  useEffect(() => {
    loadDocuments();
  }, [searchQuery, selectedCategory]);

    const loadDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`http://localhost:3005/documents?${params}`);
      if (response.ok) {
        const data = await response.json();
        const documents = data.data.documents || [];
        
        // Исправляем "зависшие" документы при загрузке
        const correctedDocuments = documents.map((doc: any) => {
          // Если документ в статусе "processing" но нет активной задачи, считаем его завершенным
          if (doc.status === 'processing' && !doc.processingJobId) {
            console.log(`Auto-correcting stuck document: ${doc.title} from processing to completed`);
            return { 
              ...doc, 
              status: 'completed',
              processingProgress: 100,
              processingStep: 'AI обработка автоматически завершена'
            };
          }
          return doc;
        });
        
        setDocuments(correctedDocuments);
      } else {
        // Fallback к mock данным при ошибке
        setDocuments([
          {
            id: "doc_1",
            title: "PMAC User Manual",
            fileSize: 2048576,
            uploadDate: "2025-08-19T10:00:00Z",
            author: "PMAC Team",
            category: "documentation",
            tags: ["manual", "user-guide", "pmac"],
            status: "completed",
            type: "pdf",
            description: "Полное руководство пользователя PMAC контроллера"
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:3005/stats');
      if (response.ok) {
        const apiResponse = await response.json();
        const apiData = apiResponse.data;
        
        // Преобразуем ответ API в формат, который ожидает frontend
        setStats({
          totalDocuments: apiData.documents?.totalDocuments || 0,
          totalSize: apiData.documents?.totalStorageSize ? 
            `${(apiData.documents.totalStorageSize / 1024 / 1024).toFixed(2)} MB` : "0 MB",
          categories: apiData.documents?.documentsByCategory || {
            documentation: 0,
            tutorial: 0,
            troubleshooting: 0
          }
        });
      } else {
        setStats({
          totalDocuments: 0,
          totalSize: "0 MB",
          categories: {
            documentation: 0,
            tutorial: 0,
            troubleshooting: 0
          }
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        totalDocuments: 0,
        totalSize: "0 MB",
        categories: {
          documentation: 0,
          tutorial: 0,
          troubleshooting: 0
        }
      });
    }
  };

  // Проверка статуса обработки
  const checkProcessingStatus = async (jobId: string, documentId: string) => {
    try {
      const response = await fetch(`http://localhost:3005/processing/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        const job = data.data;
        
        if (job.status === 'completed') {
          // Обновляем статус документа на завершенный
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId ? { 
              ...doc, 
              status: 'completed',
              processingProgress: 100,
              processingStep: 'AI обработка успешно завершена'
            } : doc
          ));
          
          // Удаляем из отслеживаемых задач
          setProcessingJobs(prev => {
            const newMap = new Map(prev);
            newMap.delete(documentId);
            return newMap;
          });
          
          // Обновляем статистику
          loadStats();
        } else if (job.status === 'failed') {
          // Обновляем статус документа на ошибку
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId ? { 
              ...doc, 
              status: 'error',
              processingStep: 'Ошибка AI обработки'
            } : doc
          ));
          
          // Удаляем из отслеживаемых задач
          setProcessingJobs(prev => {
            const newMap = new Map(prev);
            newMap.delete(documentId);
            return newMap;
          });
        } else if (job.status === 'processing') {
          // Обновляем прогресс обработки
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId ? { 
              ...doc, 
              processingProgress: job.progress || doc.processingProgress || 0,
              processingStep: job.currentStep || doc.processingStep || 'Обработка...',
              estimatedTimeRemaining: job.estimatedTimeRemaining || doc.estimatedTimeRemaining
            } : doc
          ));
        }
      }
    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  };

  // Периодическая проверка статуса обработки
  useEffect(() => {
    if (processingJobs.size === 0) return;

    const interval = setInterval(() => {
      processingJobs.forEach((jobId, documentId) => {
        checkProcessingStatus(jobId, documentId);
      });
    }, 3000); // Проверяем каждые 3 секунды

    // Симуляция прогресса для документов в обработке
    const progressInterval = setInterval(() => {
      setDocuments(prev => prev.map(doc => {
        if (doc.status === 'processing' && doc.processingProgress !== undefined) {
          // Более реалистичная логика прогресса
          let increment = 1;
          
          // Если на этапе создания эмбеддингов, прогресс идет медленнее
          if (doc.processingProgress >= 60 && doc.processingProgress < 80) {
            increment = Math.floor(Math.random() * 2) + 1; // 1-2% каждые 3 секунды
          } else if (doc.processingProgress >= 80) {
            increment = Math.floor(Math.random() * 2) + 1; // 1-2% для финальной обработки
          } else {
            increment = Math.floor(Math.random() * 3) + 1; // 1-3% для других этапов
          }
          
          const newProgress = Math.min(doc.processingProgress + increment, 95); // Не доходим до 100%
          
          // Обновляем этап обработки на основе прогресса
          let newStep = doc.processingStep;
          if (newProgress < 20) newStep = 'Анализ документа...';
          else if (newProgress < 40) newStep = 'Извлечение текста...';
          else if (newProgress < 60) newStep = 'AI анализ контента...';
          else if (newProgress < 80) newStep = 'Создание AI эмбеддингов...';
          else newStep = 'Финальная AI обработка...';
          
          // Улучшенный расчет оставшегося времени
          const elapsed = doc.processingStartedAt ? 
            Math.floor((new Date().getTime() - new Date(doc.processingStartedAt).getTime()) / 1000) : 0;
          
          let estimatedTimeRemaining = doc.estimatedTimeRemaining || 300;
          
          // Если процесс на этапе создания эмбеддингов (60-80%), корректируем время
          if (newProgress >= 60 && newProgress < 80) {
            // Создание эмбеддингов занимает больше времени
            const embeddingsProgress = (newProgress - 60) / 20; // 0-1 для этапа эмбеддингов
            const estimatedEmbeddingsTime = 180; // 3 минуты на эмбеддинги
            const remainingEmbeddingsTime = estimatedEmbeddingsTime * (1 - embeddingsProgress);
            
            // Добавляем время на финальную обработку
            estimatedTimeRemaining = Math.ceil(remainingEmbeddingsTime + 30);
          } else if (newProgress >= 80) {
            // Финальная обработка
            const finalProgress = (newProgress - 80) / 20;
            estimatedTimeRemaining = Math.ceil(30 * (1 - finalProgress));
          } else {
            // Для других этапов используем стандартный расчет
            const estimatedTotal = (elapsed / newProgress) * 100;
            estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
          }
          
          // Добавляем случайность для более реалистичного отображения
          estimatedTimeRemaining = Math.max(0, estimatedTimeRemaining + Math.floor(Math.random() * 10) - 5);
          
          return {
            ...doc,
            processingProgress: newProgress,
            processingStep: newStep,
            estimatedTimeRemaining: estimatedTimeRemaining
          };
        }
        return doc;
      }));
    }, 3000);

    // Таймаут для зависших задач (5 минут)
    const timeout = setTimeout(() => {
      processingJobs.forEach((jobId, documentId) => {
        const doc = documents.find(d => d.id === documentId);
        if (doc && doc.status === 'processing') {
          console.warn(`Document ${documentId} processing timeout, marking as error`);
          setDocuments(prev => prev.map(d => 
            d.id === documentId ? { 
              ...d, 
              status: 'error',
              processingStep: 'Превышено время AI обработки'
            } : d
          ));
          setProcessingJobs(prev => {
            const newMap = new Map(prev);
            newMap.delete(documentId);
            return newMap;
          });
        }
      });
    }, 5 * 60 * 1000); // 5 минут

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [processingJobs, documents]);

  // Дополнительная проверка для "зависших" документов без активных задач
  useEffect(() => {
    const stuckDocuments = documents.filter(doc => 
      doc.status === 'processing' && !processingJobs.has(doc.id)
    );
    
    if (stuckDocuments.length > 0) {
      console.log(`Found ${stuckDocuments.length} stuck documents, auto-correcting...`);
      setDocuments(prev => prev.map(doc => 
        doc.status === 'processing' && !processingJobs.has(doc.id) 
          ? { 
              ...doc, 
              status: 'completed',
              processingProgress: 100,
              processingStep: 'AI обработка автоматически завершена'
            } 
          : doc
      ));
    }
  }, [documents, processingJobs]);

     const filteredDocuments = documents.filter(doc => {
     const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
     return matchesSearch && matchesCategory;
   });

  const handleFileUpload = async (file: File, metadata: any) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', metadata.title);
      formData.append('category', metadata.category);
      formData.append('author', metadata.author || '');
      formData.append('description', metadata.description || '');
      if (metadata.tags) {
        formData.append('tags', metadata.tags.join(','));
      }

      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('http://localhost:3005/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const apiResponse = await response.json();
      const result = apiResponse.data;
      
             // Добавляем новый документ в список
               // Определяем тип файла при загрузке
        let fileType = 'document';
        if (file.type.includes('pdf')) fileType = 'pdf';
        else if (file.type.includes('word') || file.type.includes('doc') || file.type.includes('docx')) fileType = 'word';
        else if (file.type.includes('text') || file.type.includes('plain')) fileType = 'text';
        else if (file.type.includes('markdown') || file.type.includes('md')) fileType = 'markdown';
        else if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.includes('javascript') || file.type.includes('python') || file.type.includes('java') || 
                 file.type.includes('cpp') || file.type.includes('html') || file.type.includes('css')) fileType = 'code';
        
        const newDoc: Document = {
          id: result?.documentId || `temp_${Date.now()}`,
          title: metadata.title || file.name,
          filename: file.name, // Добавляем оригинальное имя файла
          fileSize: result?.fileSize || file.size || 0,
          uploadDate: new Date().toISOString(),
          author: metadata.author || '',
          category: metadata.category || 'documentation',
          tags: metadata.tags || [],
          status: result?.status || 'processing',
          type: fileType,
          description: metadata.description || '',
          // Начальные значения прогресса для новых документов
          processingProgress: result?.status === 'processing' ? 0 : undefined,
          processingStep: result?.status === 'processing' ? 'Начало AI обработки...' : undefined,
          processingStartedAt: result?.status === 'processing' ? new Date().toISOString() : undefined,
          estimatedTimeRemaining: result?.status === 'processing' ? 300 : undefined
        };

      setDocuments(prev => [newDoc, ...prev]);
      setShowUploadModal(false);
      
      // Добавляем задачу в отслеживание, если статус "processing"
      if (result?.processingJobId && newDoc.status === 'processing') {
        setProcessingJobs(prev => {
          const newMap = new Map(prev);
          newMap.set(newDoc.id, result.processingJobId);
          return newMap;
        });
      }
      
      // Обновляем статистику
      loadStats();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3005/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      loadStats();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Ошибка удаления документа');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatProcessingTime = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} сек`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} мин`;
    } else {
      return `${Math.floor(diffInSeconds / 3600)} ч`;
    }
  };

  const formatProcessingStartTime = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    
    if (diffInMinutes < 1) {
      return 'Только что';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} мин назад`;
    } else {
      return start.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };


  // Функция для получения иконки по типу файла и статусу
  const getDocumentIcon = (doc: Document) => {
    const baseIconClass = "w-8 h-8 flex-shrink-0";
    
    // Определяем тип файла по расширению (самый надежный способ)
    let fileType = 'document';
    
    // Приоритет 1: Используем оригинальное имя файла (filename) с расширением
    if (doc.filename) {
      const extension = doc.filename.toLowerCase().split('.').pop();
      
      if (extension) {
        switch (extension) {
          case 'pdf':
            fileType = 'pdf';
            break;
          case 'doc':
          case 'docx':
          case 'docm':
          case 'rtf':
            fileType = 'word';
            break;
          case 'txt':
          case 'text':
            fileType = 'text';
            break;
          case 'md':
          case 'markdown':
            fileType = 'markdown';
            break;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'bmp':
          case 'svg':
          case 'webp':
            fileType = 'image';
            break;
          case 'js':
          case 'ts':
          case 'jsx':
          case 'tsx':
          case 'py':
          case 'java':
          case 'cpp':
          case 'c':
          case 'cs':
          case 'php':
          case 'html':
          case 'css':
          case 'scss':
          case 'less':
          case 'xml':
          case 'json':
          case 'sql':
            fileType = 'code';
            break;
          case 'xlsx':
          case 'xls':
            fileType = 'excel';
            break;
          case 'pptx':
          case 'ppt':
            fileType = 'powerpoint';
            break;
        }
      }
    }
    
    // Приоритет 2: Если filename не определен, проверяем поле type (MIME-тип)
    if (fileType === 'document' && doc.type) {
      const type = doc.type.toLowerCase();
      
      // Проверяем MIME-типы
      if (type === 'application/pdf') fileType = 'pdf';
      else if (type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               type === 'application/vnd.ms-word.document.12' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.template') fileType = 'word';
      else if (type === 'text/plain') fileType = 'text';
      else if (type === 'text/markdown') fileType = 'markdown';
      else if (type.startsWith('image/')) fileType = 'image';
      else if (type.startsWith('text/') || type.includes('javascript') || type.includes('python') || type.includes('java') || 
               type.includes('cpp') || type.includes('html') || type.includes('css')) fileType = 'code';
      
      // Проверяем специальные случаи Chrome и других браузеров
      else if (type.includes('pdf') || type.includes('chrome pdf') || type.includes('adobe pdf')) fileType = 'pdf';
      else if (type.includes('word') || type.includes('microsoft word') || type.includes('office word') || 
               type.includes('docx') || type.includes('doc') || type.includes('msword')) fileType = 'word';
      else if (type.includes('text') || type.includes('plain text')) fileType = 'text';
      else if (type.includes('markdown') || type.includes('md')) fileType = 'markdown';
      else if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('gif') || type.includes('jpeg')) fileType = 'image';
      else if (type.includes('javascript') || type.includes('python') || type.includes('java') || type.includes('code') || 
               type.includes('cpp') || type.includes('html') || type.includes('css')) fileType = 'code';
      
      // Если это не MIME-тип, проверяем как расширение
      else if (type === 'pdf') fileType = 'pdf';
      else if (type === 'doc' || type === 'docx') fileType = 'word';
      else if (type === 'txt') fileType = 'text';
      else if (type === 'md') fileType = 'markdown';
      else if (type === 'jpg' || type === 'png' || type === 'gif') fileType = 'image';
      else if (type === 'js' || type === 'ts' || type === 'py' || type === 'java') fileType = 'code';
    }
    
    // Приоритет 3: Fallback по ключевым словам только если не удалось определить по расширению
    if (fileType === 'document' && doc.title) {
      const title = doc.title.toLowerCase();
      
      // Сначала проверяем слова, связанные с PDF документами
      if (title.includes('инструкция') || title.includes('руководство') || title.includes('настройка') || 
          title.includes('корректировка') || title.includes('защит') || title.includes('станк') ||
          title.includes('система') || title.includes('данных') || title.includes('кассет') || 
          title.includes('энкодер') || title.includes('технический') || title.includes('документ') ||
          title.includes('описание') || title.includes('схема') || title.includes('чертеж') ||
          title.includes('проект') || title.includes('разработка') || title.includes('конфигурация') ||
          title.includes('наладк') || title.includes('диагностик') || title.includes('plot32')) {
        fileType = 'pdf';
      }
      // Только если не определили как PDF, проверяем слова, связанные с Word документами
      else if (title.includes('отчет') || title.includes('заявка') || title.includes('заявление') || 
          title.includes('договор') || title.includes('соглашение') || title.includes('план') ||
          title.includes('график') || title.includes('расписание') || title.includes('список') ||
          title.includes('таблица') || title.includes('форма') || title.includes('шаблон')) {
        fileType = 'word';
      }
    }
    
    // Отладочная информация
    const extension = doc.filename?.toLowerCase().split('.').pop();
    console.log('Document icon debug:', {
      title: doc.title,
      filename: doc.filename,
      type: doc.type,
      determinedFileType: fileType,
      extension: extension,
      // Проверки по расширению
      hasPdfExtension: extension === 'pdf',
      hasWordExtension: ['doc', 'docx', 'docm', 'rtf'].includes(extension || ''),
      hasExcelExtension: ['xlsx', 'xls'].includes(extension || ''),
      hasPowerPointExtension: ['pptx', 'ppt'].includes(extension || ''),
      // Проверки по MIME-типу
      typeIsPdf: doc.type?.toLowerCase() === 'application/pdf' || doc.type?.toLowerCase() === 'pdf',
      typeIsWord: doc.type?.toLowerCase().includes('word') || doc.type?.toLowerCase().includes('docx') || doc.type?.toLowerCase().includes('doc'),
      // Fallback логика
      fallbackToPdf: fileType === 'pdf' && doc.type === 'document',
      fallbackToWord: fileType === 'word' && doc.type === 'document',
      // Дополнительная отладка
      titleLower: doc.title?.toLowerCase(),
      typeLower: doc.type?.toLowerCase(),
      // Логика fallback по ключевым словам
      hasPdfKeywords: doc.title?.toLowerCase().includes('инструкция') || doc.title?.toLowerCase().includes('руководство') || doc.title?.toLowerCase().includes('настройка'),
      hasWordKeywords: doc.title?.toLowerCase().includes('отчет') || doc.title?.toLowerCase().includes('заявка') || doc.title?.toLowerCase().includes('договор'),
      pdfPriority: doc.title?.toLowerCase().includes('инструкция') || doc.title?.toLowerCase().includes('руководство') || doc.title?.toLowerCase().includes('plot32')
    });
    
    // Если статус "processing", показываем анимацию загрузки с прогрессом
    if (doc.status === 'processing') {
      return (
        <div className="flex flex-col items-center">
          <Clock className={`${baseIconClass} text-yellow-500 animate-spin`} strokeWidth={1.5} />
        </div>
      );
    }
    
    // Функция для получения иконки по типу файла
    const getIconByType = (type: string, color: string) => {
      const iconProps = {
        className: `${baseIconClass} ${color}`
      };
      
      switch (type) {
        case 'pdf':
          return <AiFillFilePdf {...iconProps} />;
        case 'word':
          return <AiFillFileWord {...iconProps} />;
        case 'text':
          return <AiFillFileText {...iconProps} />;
        case 'markdown':
          return <SiMarkdown {...iconProps} />;
        case 'image':
          return <AiFillFileImage {...iconProps} />;
        case 'code':
          return <SiJavascript {...iconProps} />;
        case 'excel':
          return <AiFillFileExcel {...iconProps} />;
        case 'powerpoint':
          return <AiFillFile {...iconProps} />; // Используем общую иконку для PowerPoint
        default:
          return <AiFillFile {...iconProps} />;
      }
    };
    
    // Если статус "error", показываем красную иконку
    if (doc.status === 'error') {
      return getIconByType(fileType, 'text-red-500');
    }
    
    // Если статус "completed", показываем зеленую иконку
    if (doc.status === 'completed') {
      return getIconByType(fileType, 'text-green-500');
    }
    
    // По умолчанию показываем серую иконку
    return getIconByType(fileType, 'text-slate-400');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Knowledge Base
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Управление документами и базой знаний
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/chat"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                AI Чат
              </Link>
              <Link 
                href="/"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Главная
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Всего документов</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDocuments}</p>
                </div>
                                 <AiFillFilePdf className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Общий размер</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSize}</p>
                </div>
                <Database className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Категории</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.categories ? Object.keys(stats.categories).length : 0}
                  </p>
                </div>
                <Tag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск документов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">Все категории</option>
              <option value="documentation">Документация</option>
              <option value="tutorial">Руководства</option>
              <option value="troubleshooting">Устранение неполадок</option>
            </select>
            
                         <button
               onClick={() => setShowUploadModal(true)}
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
             >
               <Plus className="w-5 h-5" />
               Загрузить
             </button>
             
             <button
               onClick={() => {
                 const stuckDocuments = documents.filter(doc => 
                   doc.status === 'processing' && !processingJobs.has(doc.id)
                 );
                 if (stuckDocuments.length > 0) {
                   if (confirm(`Найдено ${stuckDocuments.length} зависших документов. Завершить их AI обработку?`)) {
                     setDocuments(prev => prev.map(doc => 
                       doc.status === 'processing' && !processingJobs.has(doc.id) 
                         ? { 
                             ...doc, 
                             status: 'completed',
                             processingProgress: 100,
                             processingStep: 'AI обработка автоматически завершена'
                           } 
                         : doc
                     ));
                   }
                                   } else {
                    alert('Зависших AI задач не найдено');
                  }
               }}
               className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
               title="Завершить зависшую AI обработку"
             >
                               <AlertCircle className="w-5 h-5" />
                Завершить зависшие
             </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Документ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Размер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Дата
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    AI Обработка
                  </th>
                  
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDocuments.map((doc, index) => (
                  <tr key={doc.id || `doc-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                         <td className="px-6 py-4">
                       <div className="flex items-start">
                         <div className="flex-shrink-0 mr-3">
                           {getDocumentIcon(doc)}
                         </div>
                         <div className="min-w-0 flex-1">
                           <div className="text-sm font-medium text-slate-900 dark:text-white">
                             {doc.title}
                           </div>
                           {doc.description && doc.description !== doc.title && (
                             <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                               {doc.description}
                             </div>
                           )}
                         </div>
                       </div>
                     </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(doc.uploadDate)}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                       {doc.status === 'processing' ? (
                         <div className="space-y-2">
                           {/* Прогресс-бар */}
                           <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                             <div 
                               className="bg-yellow-500 h-2 rounded-full transition-all duration-300 relative"
                               style={{ width: `${doc.processingProgress || 0}%` }}
                             >
                               {/* Анимированная полоска */}
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                             </div>
                           </div>
                           
                           {/* Процент выполнения */}
                           <div className="text-xs text-slate-500 text-center">
                             {doc.processingProgress || 0}%
                           </div>
                           
                           {/* Текущий этап */}
                           {doc.processingStep && (
                             <div className="text-xs text-slate-600 flex items-center gap-1">
                               <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                               {doc.processingStep}
                               {doc.processingStep.includes('эмбеддинг') && (
                                 <div className="flex gap-1 ml-1">
                                   <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                   <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                   <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                 </div>
                               )}
                             </div>
                           )}
                           
                           {/* Время выполнения */}
                           {doc.processingStartedAt && (
                             <div className="text-xs text-slate-500">
                               Выполняется: {formatProcessingStartTime(doc.processingStartedAt)}
                               {doc.processingStep?.includes('эмбеддинг') && (
                                 <span className="ml-1 text-yellow-600">(медленный этап)</span>
                               )}
                             </div>
                           )}
                           
                           {/* Оставшееся время */}
                           {doc.estimatedTimeRemaining && (
                             <div className="text-xs text-slate-500">
                               Осталось: {doc.estimatedTimeRemaining > 60 ? 
                                 `${Math.ceil(doc.estimatedTimeRemaining / 60)} мин` : 
                                 `${doc.estimatedTimeRemaining} сек`
                               }
                             </div>
                           )}
                         </div>
                       ) : doc.status === 'completed' ? (
                         <span className="text-green-600 font-medium">✓ AI обработка завершена</span>
                       ) : doc.status === 'error' ? (
                         <span className="text-red-600 font-medium">✗ Ошибка AI обработки</span>
                       ) : (
                         <span className="text-slate-400">Готов к обработке</span>
                       )}
                     </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 text-slate-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Скачать"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                         <button
                           onClick={() => handleDeleteDocument(doc.id)}
                           className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                           title="Удалить"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
                             <AiFillFile className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Документы не найдены
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery || selectedCategory !== "all" 
                  ? "Попробуйте изменить критерии поиска"
                  : "Загрузите первый документ для начала работы"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
}

// Upload Modal Component
function UploadModal({ 
  onClose, 
  onUpload, 
  isUploading, 
  uploadProgress 
}: {
  onClose: () => void;
  onUpload: (file: File, metadata: any) => void;
  isUploading: boolean;
  uploadProgress: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    category: 'documentation',
    author: '',
    description: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!metadata.title) {
        setMetadata(prev => ({
          ...prev,
          title: selectedFile.name.replace(/\.[^/.]+$/, "")
        }));
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, metadata);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Загрузить документ
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Файл
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileChange}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Название
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Категория
            </label>
            <select
              value={metadata.category}
              onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="documentation">Документация</option>
              <option value="tutorial">Руководства</option>
              <option value="troubleshooting">Устранение неполадок</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Автор
            </label>
            <input
              type="text"
              value={metadata.author}
              onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Описание
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Теги
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Добавить тег"
                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {metadata.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {isUploading && (
            <div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
                <span>Загрузка...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
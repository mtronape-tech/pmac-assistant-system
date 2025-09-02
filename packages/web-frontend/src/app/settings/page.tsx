"use client";

import { useState, useEffect } from "react";
import { Globe, Bot, Save, RotateCcw, Eye, EyeOff, X, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface AISettings {
  model: string;
  provider: string;
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}

interface GeneralSettings {
  language: string;
  theme: string;
  notifications: boolean;
  autoSave: boolean;
  connectionTimeout: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  provider?: string;
}

interface OpenRouterProvider {
  name: string;
  slug: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  status_page_url: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    language: 'ru',
    theme: 'auto',
    notifications: true,
    autoSave: true,
    connectionTimeout: 30
  });

  const [aiSettings, setAISettings] = useState<AISettings>({
    model: 'z-ai/glm-4.5-air:free',
    provider: 'Z.AI',
    apiKey: '',
    temperature: 0.7,
    systemPrompt: 'Ты - помощник по программированию PMAC контроллеров. Отвечай кратко и по делу. Используй технический язык.'
  });

  const [originalApiKey, setOriginalApiKey] = useState<string>('');
  const [apiKeyChanged, setApiKeyChanged] = useState<boolean>(false);

  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [availableProviders, setAvailableProviders] = useState<OpenRouterProvider[]>([]);

  useEffect(() => {
    console.log('=== useEffect: Загружаем настройки ===');
    loadSettings();
    loadOpenRouterData();
  }, []);

  // Дополнительный useEffect для отладки
  useEffect(() => {
    console.log('=== aiSettings изменился ===');
    console.log('Текущий API ключ:', aiSettings.apiKey);
    console.log('Оригинальный API ключ:', originalApiKey);
    console.log('API ключ изменен:', apiKeyChanged);
  }, [aiSettings.apiKey, originalApiKey, apiKeyChanged]);

  // Дополнительный useEffect для установки провайдера после загрузки моделей
  useEffect(() => {
    if (availableModels.length > 0 && aiSettings.model) {
      const provider = detectProviderFromModel(aiSettings.model);
      if (provider !== aiSettings.provider) {
        setAISettings(prev => ({ ...prev, provider }));
      }
    }
  }, [availableModels, aiSettings.model]);

  const loadSettings = async () => {
    try {
      console.log('=== Начало загрузки настроек ===');
      console.log('Текущее состояние aiSettings перед загрузкой:', aiSettings);
      
      // Загружаем настройки из localStorage
      const savedGeneral = localStorage.getItem('generalSettings');
      const savedAI = localStorage.getItem('aiSettings');
      
      console.log('Сохраненные общие настройки:', savedGeneral);
      console.log('Сохраненные AI настройки:', savedAI);
      
      if (savedGeneral) {
        setGeneralSettings(JSON.parse(savedGeneral));
      }
             if (savedAI) {
         const parsedAI = JSON.parse(savedAI);
         console.log('Парсированные AI настройки:', parsedAI);
         
         // Если в localStorage сохранен пустой API ключ, очищаем его
         if (parsedAI.apiKey === '') {
           console.log('В localStorage найден пустой API ключ, очищаем...');
           localStorage.removeItem('aiSettings');
           console.log('localStorage очищен');
         } else {
           setAISettings(parsedAI);
         }
       }

      // Загружаем API ключ из конфигурации
      try {
        console.log('Загружаем API ключ из /api/config...');
        const response = await fetch('/api/config');
        console.log('Ответ от /api/config:', response.status, response.statusText);
        
        if (response.ok) {
          const config = await response.json();
          console.log('Полученная конфигурация:', config);
          
                     if (config.openRouter?.apiKey) {
             console.log('API ключ найден, устанавливаем...');
             console.log('API ключ (первые 10 символов):', config.openRouter.apiKey.substring(0, 10) + '...');
             
             // Принудительно устанавливаем API ключ из конфигурации
             setAISettings(prev => {
               const newSettings = { ...prev, apiKey: config.openRouter.apiKey };
               console.log('Новые настройки AI:', newSettings);
               return newSettings;
             });
             
             setOriginalApiKey(config.openRouter.apiKey);
             console.log('API ключ установлен в состояние');
           } else {
             console.log('API ключ не найден в конфигурации');
             console.log('Структура config:', JSON.stringify(config, null, 2));
           }
        } else {
          console.error('Ошибка загрузки конфигурации:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Ошибка при загрузке API ключа:', error);
      }
      
             console.log('=== Завершение загрузки настроек ===');
       console.log('Финальное состояние aiSettings:', aiSettings);
       console.log('API ключ в aiSettings:', aiSettings.apiKey);
       console.log('API ключ в originalApiKey:', originalApiKey);
       
       // Дополнительная проверка через setTimeout
       setTimeout(() => {
         console.log('=== Проверка через 100ms ===');
         console.log('aiSettings.apiKey:', aiSettings.apiKey);
         console.log('originalApiKey:', originalApiKey);
       }, 100);
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const loadOpenRouterData = async () => {
    await Promise.all([
      loadModels(),
      loadProviders()
    ]);
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((model: any) => {
          // Определяем провайдера по модели
          let provider = 'Unknown';
          if (model.id.includes('openai/')) provider = 'OpenAI';
          else if (model.id.includes('anthropic/')) provider = 'Anthropic';
          else if (model.id.includes('meta-llama/')) provider = 'Meta';
          else if (model.id.includes('mistralai/')) provider = 'Mistral AI';
          else if (model.id.includes('z-ai/')) provider = 'Z.AI';
          else if (model.id.includes('google/')) provider = 'Google';
          else if (model.id.includes('cohere/')) provider = 'Cohere';
          else {
            // Попытка определить провайдера по первой части ID
            const parts = model.id.split('/');
            if (parts.length > 1) {
              provider = parts[0].replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            }
          }

          return {
            id: model.id,
            name: model.name,
            description: model.description || 'Описание недоступно',
            context_length: model.context_length || 0,
            pricing: {
              prompt: model.pricing?.prompt || '0',
              completion: model.pricing?.completion || '0'
            },
            provider: provider
          };
        }) || [];
        
        // Сортируем модели по популярности (бесплатные сначала)
        const sortedModels = models.sort((a: OpenRouterModel, b: OpenRouterModel) => {
          const aFree = a.id.includes(':free');
          const bFree = b.id.includes(':free');
          if (aFree && !bFree) return -1;
          if (!aFree && bFree) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setAvailableModels(sortedModels);
      }
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error);
      // Fallback к базовому списку
      setAvailableModels([
        { id: 'z-ai/glm-4.5-air:free', name: 'Z.AI GLM-4.5 Air (Free)', description: 'Быстрая и точная модель', context_length: 8192, pricing: { prompt: '0', completion: '0' }, provider: 'Z.AI' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)', description: 'Хорошая производительность', context_length: 8192, pricing: { prompt: '0', completion: '0' }, provider: 'Mistral AI' },
        { id: 'anthropic/claude-3-haiku:free', name: 'Claude 3 Haiku (Free)', description: 'Быстрые ответы', context_length: 200000, pricing: { prompt: '0', completion: '0' }, provider: 'Anthropic' }
      ]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/providers');
      if (response.ok) {
        const data = await response.json();
        const providers = data.data?.map((provider: any) => ({
          name: provider.name,
          slug: provider.slug,
          privacy_policy_url: provider.privacy_policy_url,
          terms_of_service_url: provider.terms_of_service_url,
          status_page_url: provider.status_page_url
        })) || [];
        
        setAvailableProviders(providers);
      }
    } catch (error) {
      console.error('Ошибка загрузки провайдеров:', error);
      // Fallback к базовому списку
      setAvailableProviders([
        { name: 'OpenAI', slug: 'openai', privacy_policy_url: '', terms_of_service_url: '', status_page_url: '' },
        { name: 'Anthropic', slug: 'anthropic', privacy_policy_url: '', terms_of_service_url: '', status_page_url: '' },
        { name: 'Mistral AI', slug: 'mistralai', privacy_policy_url: '', terms_of_service_url: '', status_page_url: '' }
      ]);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Сохраняем в localStorage
      localStorage.setItem('generalSettings', JSON.stringify(generalSettings));
      localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
      
      // Сохраняем API ключ в конфигурацию, если он изменился
      if (aiSettings.apiKey) {
        try {
          const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              openRouter: {
                apiKey: aiSettings.apiKey
              }
            })
          });
          
          if (!response.ok) {
            console.warn('Не удалось сохранить API ключ в конфигурацию');
          } else {
            console.log('API ключ успешно сохранен в конфигурацию');
          }
        } catch (error) {
          console.warn('Ошибка сохранения API ключа в конфигурацию:', error);
        }
      }
      
      setSaveStatus('saved');
      setApiKeyChanged(false);
      setOriginalApiKey(aiSettings.apiKey);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
      setGeneralSettings({
        language: 'ru',
        theme: 'auto',
        notifications: true,
        autoSave: true,
        connectionTimeout: 30
      });
      setAISettings({
        model: 'z-ai/glm-4.5-air:free',
        provider: 'Z.AI',
        apiKey: '',
        temperature: 0.7,
        systemPrompt: 'Ты - помощник по программированию PMAC контроллеров. Отвечай кратко и по делу. Используй технический язык.'
      });
    }
  };

  const testAIConnection = async () => {
    if (!aiSettings.apiKey) {
      setTestResult({
        success: false,
        message: 'API ключ не указан',
        details: 'Введите API ключ OpenRouter для тестирования соединения'
      });
      setShowTestModal(true);
      return;
    }
    
    setIsTesting(true);
    setShowTestModal(true);
    setTestResult(null);
    
    try {
      console.log('Начинаем тест соединения с OpenRouter...');
      console.log('Модель:', aiSettings.model);
      console.log('API ключ:', aiSettings.apiKey.substring(0, 10) + '...');
      
      const requestBody = {
        model: aiSettings.model,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "Test successful" if you can see this.'
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false // Явно отключаем streaming для теста
      };
      
      console.log('Отправляем запрос:', JSON.stringify(requestBody, null, 2));
      
      // Реальный тест соединения с OpenRouter
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiSettings.apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'PMAC Assistant',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Получен ответ:', response.status, response.statusText);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const data = await response.json();
          console.log('Данные ответа:', JSON.stringify(data, null, 2));
          
          const messageContent = data.choices?.[0]?.message?.content;
          const usage = data.usage;
          
          setTestResult({
            success: true,
            message: 'Соединение с AI успешно установлено!',
            details: `Модель: ${aiSettings.model}\nПровайдер: ${aiSettings.provider || 'Не указан'}\nСтатус: Активен\nОтвет: ${messageContent || 'Получен ответ'}\n\nИспользование токенов:\n- Входные: ${usage?.prompt_tokens || 0}\n- Выходные: ${usage?.completion_tokens || 0}\n- Всего: ${usage?.total_tokens || 0}`
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Ошибка API:', errorData);
          
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          if (errorData.error?.message) {
            errorMessage += `\n\nДетали ошибки:\n${errorData.error.message}`;
          }
          if (errorData.error?.type) {
            errorMessage += `\nТип ошибки: ${errorData.error.type}`;
          }
          if (errorData.error?.code) {
            errorMessage += `\nКод ошибки: ${errorData.error.code}`;
          }
          
          // Если основная модель недоступна, попробуем альтернативную
          if (response.status === 404 && aiSettings.model.includes('z-ai')) {
            console.log('Пробуем альтернативную модель...');
            try {
              const altResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${aiSettings.apiKey}`,
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'PMAC Assistant',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  ...requestBody,
                  model: 'mistralai/mistral-7b-instruct:free'
                }),
                signal: controller.signal
              });
              
              if (altResponse.ok) {
                const altData = await altResponse.json();
                const altMessageContent = altData.choices?.[0]?.message?.content;
                
                setTestResult({
                  success: true,
                  message: 'Соединение с AI установлено через альтернативную модель!',
                  details: `Основная модель ${aiSettings.model} недоступна.\nАльтернативная модель: mistralai/mistral-7b-instruct:free\nПровайдер: Mistral AI\nСтатус: Активен\nОтвет: ${altMessageContent || 'Получен ответ'}`
                });
                return;
              }
            } catch (altError) {
              console.log('Альтернативная модель тоже не сработала:', altError);
            }
          }
          
          setTestResult({
            success: false,
            message: 'Ошибка соединения с AI',
            details: errorMessage
          });
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setTestResult({
            success: false,
            message: 'Таймаут соединения',
            details: 'Запрос не был выполнен в течение 30 секунд. Возможно, модель перегружена или есть проблемы с сетью.'
          });
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Ошибка при тестировании:', error);
      setTestResult({
        success: false,
        message: 'Ошибка соединения с AI',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const detectProviderFromModel = (modelId: string): string => {
    if (modelId.includes('openai/')) return 'OpenAI';
    if (modelId.includes('anthropic/')) return 'Anthropic';
    if (modelId.includes('meta-llama/')) return 'Meta';
    if (modelId.includes('mistralai/')) return 'Mistral AI';
    if (modelId.includes('z-ai/')) return 'Z.AI';
    if (modelId.includes('google/')) return 'Google';
    if (modelId.includes('cohere/')) return 'Cohere';
    
    // Попытка определить провайдера по первой части ID
    const parts = modelId.split('/');
    if (parts.length > 1) {
      return parts[0].replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    
    return 'Unknown';
  };

  const handleModelSelect = (modelId: string) => {
    const selectedModel = availableModels.find(model => model.id === modelId);
    setAISettings({
      ...aiSettings, 
      model: modelId,
      provider: selectedModel?.provider || detectProviderFromModel(modelId)
    });
  };

  const handleModelInputChange = (modelId: string) => {
    setAISettings({
      ...aiSettings, 
      model: modelId,
      provider: detectProviderFromModel(modelId)
    });
  };

  const handleApiKeyChange = (apiKey: string) => {
    setAISettings({ ...aiSettings, apiKey });
    setApiKeyChanged(apiKey !== originalApiKey);
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader pageTitle="Settings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 pt-4 pb-4 md:gap-6 md:pt-6 md:pb-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={resetSettings}
                    className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-muted hover:text-muted-foreground transition-colors px-3 py-2 rounded-md border"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Сбросить</span>
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('aiSettings');
                      window.location.reload();
                    }}
                    className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-muted hover:text-muted-foreground transition-colors px-3 py-2 rounded-md border"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Перезагрузить</span>
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Сохранить</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                {/* Save Status */}
                {saveStatus === 'saved' && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      <span>Настройки успешно сохранены</span>
                    </div>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                      <AlertCircle className="w-4 h-4" />
                      <span>Ошибка сохранения настроек</span>
                    </div>
                  </div>
                )}
                {/* Tabs-like controls on left replaced by simple buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`px-3 py-2 rounded-md border text-sm ${activeTab === 'general' ? 'bg-muted' : ''}`}
                  >
                    <Globe className="w-4 h-4 inline mr-2" />Общие
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-3 py-2 rounded-md border text-sm ${activeTab === 'ai' ? 'bg-muted' : ''}`}
                  >
                    <Bot className="w-4 h-4 inline mr-2" />ИИ
                  </button>
                </div>
                {/* Main Content */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Общие настройки</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Language */}
                        <div>
                          <Label className="mb-2 block">Язык интерфейса</Label>
                          <Select value={generalSettings.language} onValueChange={(val) => setGeneralSettings({...generalSettings, language: val})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите язык" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ru">Русский</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Theme */}
                        <div>
                          <Label className="mb-2 block">Тема</Label>
                          <Select value={generalSettings.theme} onValueChange={(val) => setGeneralSettings({...generalSettings, theme: val})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тему" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Светлая</SelectItem>
                              <SelectItem value="dark">Тёмная</SelectItem>
                              <SelectItem value="auto">Авто</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Notifications */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Уведомления</Label>
                            <p className="text-sm text-muted-foreground">Показывать уведомления о событиях</p>
                          </div>
                          <Switch checked={generalSettings.notifications} onCheckedChange={(val) => setGeneralSettings({...generalSettings, notifications: val})} />
                        </div>
                        {/* Auto Save */}
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Автосохранение</Label>
                            <p className="text-sm text-muted-foreground">Автоматически сохранять изменения</p>
                          </div>
                          <Switch checked={generalSettings.autoSave} onCheckedChange={(val) => setGeneralSettings({...generalSettings, autoSave: val})} />
                        </div>
                        {/* Connection Timeout */}
                        <div>
                          <Label className="mb-2 block">Таймаут соединения (секунды)</Label>
                          <Input type="number" min={5} max={120} value={generalSettings.connectionTimeout} onChange={(e) => setGeneralSettings({...generalSettings, connectionTimeout: parseInt(e.target.value)})} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Настройки ИИ</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Provider */}
                        <div>
                          <Label className="mb-2 block">Провайдер AI</Label>
                          <Input value={aiSettings.provider} readOnly className="cursor-not-allowed bg-muted" />
                          <p className="mt-1 text-sm text-muted-foreground">Провайдер определяется автоматически при выборе модели</p>
                        </div>
                        {/* Model Input */}
                        <div>
                          <Label className="mb-2 block">Модель AI (введите вручную)</Label>
                          <Input value={aiSettings.model} onChange={(e) => handleModelInputChange(e.target.value)} placeholder="z-ai/glm-4.5-air:free" />
                        </div>
                        {/* Model Select */}
                        <div>
                          <Label className="mb-2 block">Или выберите из списка доступных моделей OpenRouter</Label>
                          <div className="flex items-center space-x-2">
                            <Select onValueChange={(val) => handleModelSelect(val)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Выберите модель..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>{model.name} - {model.context_length.toLocaleString()} токенов</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button onClick={loadModels} disabled={isLoadingModels} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50" title="Обновить список моделей">
                              {isLoadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">Выберите модель для автоматического заполнения поля выше. Данные загружаются с OpenRouter API</p>
                        </div>
                        {/* API Key */}
                        <div>
                          <Label className="mb-2 block">API ключ OpenRouter</Label>
                          <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                            <div>Текущий ключ: {aiSettings.apiKey ? `${aiSettings.apiKey.substring(0, 10)}...` : 'Не установлен'}</div>
                            <div>Оригинальный ключ: {originalApiKey ? `${originalApiKey.substring(0, 10)}...` : 'Не установлен'}</div>
                            <div>Изменен: {apiKeyChanged ? 'Да' : 'Нет'}</div>
                          </div>
                          <div className="relative">
                            <Input type={showApiKey ? "text" : "password"} value={aiSettings.apiKey} onChange={(e) => handleApiKeyChange(e.target.value)} placeholder="sk-or-v1-..." className={`pr-10 ${apiKeyChanged ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' : ''}`} />
                            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">API ключ автоматически загружается из конфигурации. При нажатии "Сохранить" новый ключ будет сохранен в конфигурацию.</p>
                          {apiKeyChanged && (
                            <p className="mt-1 text-sm text-orange-600 dark:text-orange-400 flex items-center"><span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>API ключ изменен - нажмите "Сохранить" для применения</p>
                          )}
                          <button onClick={testAIConnection} disabled={!aiSettings.apiKey || isTesting} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">{isTesting ? 'Тестирование...' : 'Тест соединения'}</button>
                        </div>
                        {/* Temperature */}
                        <div>
                          <Label className="mb-2 block">Температура (креативность): {aiSettings.temperature}</Label>
                          <input type="range" min="0" max="2" step="0.1" value={aiSettings.temperature} onChange={(e) => setAISettings({...aiSettings, temperature: parseFloat(e.target.value)})} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Точный (0)</span><span>Сбалансированный (1)</span><span>Креативный (2)</span></div>
                        </div>
                        {/* System Prompt */}
                        <div>
                          <Label className="mb-2 block">Системная директива</Label>
                          <Textarea value={aiSettings.systemPrompt} onChange={(e) => setAISettings({...aiSettings, systemPrompt: e.target.value})} rows={4} placeholder="Введите системную директиву для модели..." />
                          <p className="mt-1 text-sm text-muted-foreground">Эта директива будет отправляться модели перед каждым запросом</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

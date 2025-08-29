"use client";

import { useState, useEffect } from "react";
import { Settings, Globe, Bot, Save, RotateCcw, Eye, EyeOff, Zap, MessageSquare, Code, Database, Shield, X, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-3 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Zap className="w-5 h-5" />
                <span className="font-medium">PMAC Assistant</span>
              </Link>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Настройки
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
                             <button
                 onClick={resetSettings}
                 className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
               >
                 <RotateCcw className="w-4 h-4" />
                 <span>Сбросить</span>
               </button>
               <button
                 onClick={() => {
                   localStorage.removeItem('aiSettings');
                   window.location.reload();
                 }}
                 className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
               >
                 <RefreshCw className="w-4 h-4" />
                 <span>Перезагрузить</span>
               </button>
              <button
                onClick={saveSettings}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              Настройки
            </h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'general'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span>Общие</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Bot className="w-5 h-5" />
                <span>ИИ</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
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

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Общие настройки
                </h3>
                
                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Язык интерфейса
                    </label>
                    <select
                      value={generalSettings.language}
                      onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Тема
                    </label>
                    <select
                      value={generalSettings.theme}
                      onChange={(e) => setGeneralSettings({...generalSettings, theme: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="light">Светлая</option>
                      <option value="dark">Темная</option>
                      <option value="auto">Авто</option>
                    </select>
                  </div>

                  {/* Notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Уведомления
                      </label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Показывать уведомления о событиях
                      </p>
                    </div>
                    <button
                      onClick={() => setGeneralSettings({...generalSettings, notifications: !generalSettings.notifications})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        generalSettings.notifications ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        generalSettings.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Auto Save */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Автосохранение
                      </label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Автоматически сохранять изменения
                      </p>
                    </div>
                    <button
                      onClick={() => setGeneralSettings({...generalSettings, autoSave: !generalSettings.autoSave})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        generalSettings.autoSave ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        generalSettings.autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Connection Timeout */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Таймаут соединения (секунды)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={generalSettings.connectionTimeout}
                      onChange={(e) => setGeneralSettings({...generalSettings, connectionTimeout: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  Настройки ИИ
                </h3>
                
                <div className="space-y-6">
                  {/* Provider (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Провайдер AI
                    </label>
                    <input
                      type="text"
                      value={aiSettings.provider}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white cursor-not-allowed"
                    />
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Провайдер определяется автоматически при выборе модели
                    </p>
                  </div>

                  {/* Model Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Модель AI (введите вручную)
                    </label>
                    <input
                      type="text"
                      value={aiSettings.model}
                      onChange={(e) => handleModelInputChange(e.target.value)}
                      placeholder="z-ai/glm-4.5-air:free"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Model Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Или выберите из списка доступных моделей OpenRouter
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        onChange={(e) => handleModelSelect(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Выберите модель...</option>
                        {availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} - {model.context_length.toLocaleString()} токенов
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={loadModels}
                        disabled={isLoadingModels}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                        title="Обновить список моделей"
                      >
                        {isLoadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Выберите модель для автоматического заполнения поля выше. Данные загружаются с OpenRouter API
                    </p>
                  </div>

                                     {/* API Key */}
                   <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                       API ключ OpenRouter
                     </label>
                     {/* Отладочная информация */}
                     <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                       <div>Текущий ключ: {aiSettings.apiKey ? `${aiSettings.apiKey.substring(0, 10)}...` : 'Не установлен'}</div>
                       <div>Оригинальный ключ: {originalApiKey ? `${originalApiKey.substring(0, 10)}...` : 'Не установлен'}</div>
                       <div>Изменен: {apiKeyChanged ? 'Да' : 'Нет'}</div>
                     </div>
                    <div className="relative">
                                             <input
                         type={showApiKey ? "text" : "password"}
                         value={aiSettings.apiKey}
                         onChange={(e) => handleApiKeyChange(e.target.value)}
                         placeholder="sk-or-v1-..."
                         className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                           apiKeyChanged 
                             ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                             : 'border-slate-300 dark:border-slate-600'
                         }`}
                       />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                                         <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                       API ключ автоматически загружается из конфигурации. При нажатии "Сохранить" новый ключ будет сохранен в конфигурацию.
                     </p>
                     {apiKeyChanged && (
                       <p className="mt-1 text-sm text-orange-600 dark:text-orange-400 flex items-center">
                         <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                         API ключ изменен - нажмите "Сохранить" для применения
                       </p>
                     )}
                    <button
                      onClick={testAIConnection}
                      disabled={!aiSettings.apiKey || isTesting}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isTesting ? 'Тестирование...' : 'Тест соединения'}
                    </button>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Температура (креативность): {aiSettings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={aiSettings.temperature}
                      onChange={(e) => setAISettings({...aiSettings, temperature: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>Точный (0)</span>
                      <span>Сбалансированный (1)</span>
                      <span>Креативный (2)</span>
                    </div>
                  </div>



                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Системная директива
                    </label>
                    <textarea
                      value={aiSettings.systemPrompt}
                      onChange={(e) => setAISettings({...aiSettings, systemPrompt: e.target.value})}
                      rows={4}
                      placeholder="Введите системную директиву для модели..."
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Эта директива будет отправляться модели перед каждым запросом
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Тест соединения с AI
                </h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {isTesting && (
                <div className="flex items-center space-x-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-slate-700 dark:text-slate-300">Тестирование соединения...</span>
                </div>
              )}
              
              {testResult && !isTesting && (
                <div className="space-y-4">
                  <div className={`flex items-center space-x-3 p-4 rounded-lg ${
                    testResult.success 
                      ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' 
                      : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        {testResult.message}
                      </p>
                      {testResult.details && (
                        <p className={`text-sm mt-1 ${
                          testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>
                          {testResult.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

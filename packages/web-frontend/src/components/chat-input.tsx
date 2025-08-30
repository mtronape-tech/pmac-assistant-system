import { Send, Paperclip, Mic, Smile } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  isLoading, 
  placeholder = "Введите ваше сообщение..." 
}: ChatInputProps) {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend();
  };

  return (
    <TooltipProvider>
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        <div className="space-y-3">
          {/* Input Area */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="min-h-[60px] resize-none border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 pr-20"
                disabled={isLoading}
              />
              
              {/* Character count */}
              <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                {value.length}/2000
              </div>
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!value.trim() || isLoading}
              size="lg"
              className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed min-w-[120px]"
            >
              <Send className="w-4 h-4 mr-2" />
              Отправить
            </Button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Прикрепить файл</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Голосовое сообщение</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Эмодзи</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Нажмите Enter для отправки, Shift+Enter для новой строки
            </div>
          </div>

          {/* Quick Tips */}
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
            💡 Попробуйте: "Покажи статус PMAC", "Помоги настроить переменные", "Анализ данных движения"
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

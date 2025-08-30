import { Loader2, Bot, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";

interface ChatLoadingProps {
  message?: string;
}

export function ChatLoading({ message = "AI думает..." }: ChatLoadingProps) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-green-600 text-white">
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {message}
              </span>
            </div>
          </div>
          
          {/* Loading animation */}
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              Обрабатываю запрос...
            </span>
          </div>
          
          {/* Processing steps */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-blue-700 dark:text-blue-300">Анализирую вопрос</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-600 dark:text-blue-400">Ищу в базе знаний</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className="text-slate-500 dark:text-slate-400">Формирую ответ</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

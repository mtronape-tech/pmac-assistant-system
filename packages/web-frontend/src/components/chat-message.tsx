import { MessageSquare, User, Bot, Clock, TrendingUp, FileText, HelpCircle, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
  followUpQuestions?: string[];
}

interface ChatMessageProps {
  message: Message;
  onQuestionClick: (question: string) => void;
}

export function ChatMessage({ message, onQuestionClick }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex items-start space-x-3 max-w-[85%] ${
          isUser ? "flex-row-reverse space-x-reverse" : ""
        }`}
      >
        <Avatar className="w-8 h-8">
          {isUser ? (
            <>
              <AvatarImage src="/user-avatar.png" />
              <AvatarFallback className="bg-blue-600 text-white">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarImage src="/bot-avatar.png" />
              <AvatarFallback className="bg-green-600 text-white">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </>
          )}
        </Avatar>
        
        <div className="space-y-2">
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          
          {/* Message metadata */}
          <div className={`flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 ${
            isUser ? "justify-end" : "justify-start"
          }`}>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.timestamp)}</span>
            </div>
            
            {/* Confidence indicator for AI messages */}
            {!isUser && message.confidence !== undefined && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Уверенность: {Math.round(message.confidence * 100)}%</span>
              </div>
            )}
          </div>
          
          {/* Sources for AI messages */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Источники ({message.sources.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {message.sources.slice(0, 3).map((source, idx) => (
                    <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      • {source.document?.title || `Документ ${idx + 1}`}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Follow-up questions */}
          {!isUser && message.followUpQuestions && message.followUpQuestions.length > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Похожие вопросы
                  </span>
                </div>
                <div className="space-y-1">
                  {message.followUpQuestions.slice(0, 2).map((question, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      onClick={() => onQuestionClick(question)}
                      className="h-auto p-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 justify-start"
                    >
                      <ChevronRight className="w-3 h-3 mr-1" />
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

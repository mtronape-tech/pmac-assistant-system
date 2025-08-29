import Link from "next/link";
import { Settings } from "lucide-react";

interface SettingsButtonProps {
  className?: string;
}

export default function SettingsButton({ className = "" }: SettingsButtonProps) {
  return (
    <Link
      href="/settings"
      className={`flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors ${className}`}
    >
      <Settings className="w-4 h-4" />
      <span>Настройки</span>
    </Link>
  );
}

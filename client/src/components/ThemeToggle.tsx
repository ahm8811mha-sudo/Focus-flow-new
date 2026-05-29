import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  if (!toggleTheme) return null;

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'system':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'dark':
        return 'الوضع الليلي';
      case 'light':
        return 'الوضع الفاتح';
      case 'system':
        return 'تلقائي';
      default:
        return 'تبديل الوضع';
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={getLabel()}
      className="rounded-full"
    >
      {getIcon()}
    </Button>
  );
}

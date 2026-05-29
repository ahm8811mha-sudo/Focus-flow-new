import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  interval?: number;
  onSave?: () => Promise<void>;
  enabled?: boolean;
}

/**
 * Hook for auto-saving data at regular intervals
 * Silently saves data without showing notifications
 */
export function useAutoSave({
  interval = 30000, // 30 seconds
  onSave,
  enabled = true,
}: AutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (!enabled || !onSave || isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      await onSave();
      console.log('Auto-saved at', new Date().toLocaleTimeString('ar-SA'));
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled, onSave]);

  useEffect(() => {
    if (!enabled) return;

    timeoutRef.current = setInterval(save, interval);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [enabled, interval, save]);

  return { save };
}

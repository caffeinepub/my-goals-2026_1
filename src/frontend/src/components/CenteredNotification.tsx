import { useEffect } from 'react';

interface CenteredNotificationProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function CenteredNotification({
  message,
  visible,
  onDismiss,
  duration = 3000,
}: CenteredNotificationProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className="bg-foreground text-background px-6 py-4 rounded-lg shadow-2xl font-lora-italic text-center max-w-md mx-4 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
        role="alert"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}

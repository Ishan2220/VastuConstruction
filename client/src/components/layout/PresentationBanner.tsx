import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function PresentationBanner() {
  const { presentation, endPresentation } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!presentation?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(presentation.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        endPresentation(); // Auto end if expired on client
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [presentation, endPresentation]);

  if (!presentation) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between bg-amber-500 px-4 py-2 text-white shadow-md">
      <div className="flex items-center space-x-4">
        <AlertTriangle className="h-6 w-6 animate-pulse text-amber-900" />
        <div>
          <h3 className="font-bold text-amber-900 uppercase tracking-wider">
            ⚠️ PRESENTATION MODE — VASTU CONSTRUCTION ERP
          </h3>
          <p className="text-sm font-medium text-amber-800">
            Reason: {presentation.reason}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 rounded-md bg-amber-600 px-3 py-1 text-amber-50">
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold tracking-widest">{timeLeft}</span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="font-bold shadow-sm"
          onClick={() => endPresentation()}
        >
          End Presentation Session
        </Button>
      </div>
    </div>
  );
}

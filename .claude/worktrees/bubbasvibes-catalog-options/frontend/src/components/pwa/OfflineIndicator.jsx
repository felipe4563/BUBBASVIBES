import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setWasOffline(true); setShowBack(false); };
    const goOnline  = () => {
      setOffline(false);
      if (wasOffline) {
        setShowBack(true);
        setTimeout(() => setShowBack(false), 3000);
      }
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, [wasOffline]);

  if (!offline && !showBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium
        transition-all duration-500
        ${offline
          ? 'bg-red-600 text-white'
          : 'bg-green-600 text-white'
        }
      `}
    >
      {offline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          Sin conexión — las acciones se reanudarán cuando vuelva la red
        </>
      ) : (
        <>
          <span className="w-4 h-4 shrink-0 text-lg leading-none">✓</span>
          Conexión restaurada
        </>
      )}
    </div>
  );
}

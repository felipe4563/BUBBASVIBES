import { X, Download } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export default function InstallPrompt() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[9998] bg-white dark:bg-[#1E1208] border border-amber-200 dark:border-amber-900/40 rounded-2xl shadow-xl p-4 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Download className="w-5 h-5 text-amber-600 dark:text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Instalar aplicación
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Accede más rápido y trabaja sin conexión
        </p>
        <button
          onClick={install}
          className="mt-2.5 text-xs font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          Instalar ahora
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

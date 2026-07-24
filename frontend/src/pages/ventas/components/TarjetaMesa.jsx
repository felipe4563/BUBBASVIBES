import { Users } from 'lucide-react';

const ESTADO_CONFIG = {
  disponible: {
    label: 'Disponible',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    border: 'border-green-400 dark:border-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    punto: 'bg-green-500',
  },
  ocupada: {
    label: 'Ocupada',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    border: 'border-red-400 dark:border-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
    punto: 'bg-red-500',
  },
  reservada: {
    label: 'Reservada',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    border: 'border-amber-400 dark:border-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    punto: 'bg-amber-500',
  },
};

export default function TarjetaMesa({ mesa, pedido, onClick, clickable, seleccionada = false }) {
  const cfg = ESTADO_CONFIG[mesa.estado] ?? ESTADO_CONFIG.disponible;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`
        w-full text-left rounded-xl border-2 p-4 transition-all duration-150
        ${cfg.border} ${cfg.bg}
        ${seleccionada ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
        ${clickable
          ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
          : 'cursor-default opacity-70'
        }
      `}
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">
          {mesa.nombre}
        </span>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Info */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Users className="w-3.5 h-3.5" />
        <span>{mesa.asientos} asientos</span>
      </div>

      {/* Área */}
      {mesa.area && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
          {mesa.area.nombre}
        </p>
      )}

      {/* Orden activa */}
      {pedido && (
        <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Orden #{pedido.id}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {pedido.detalles?.length ?? 0} ítem(s) · Bs {parseFloat(pedido.total ?? 0).toFixed(2)}
          </p>
        </div>
      )}
    </button>
  );
}

import { Search } from 'lucide-react';

export const bs       = (n) => `Bs ${parseFloat(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
export const fecha    = (d) => d ? new Date(d).toLocaleDateString('es-BO') : '-';
export const fechaHora = (d) => d ? new Date(d).toLocaleString('es-BO') : '-';
export const hoy      = () => new Date().toISOString().slice(0, 10);
export const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

// ── Badge de tipo ────────────────────────────────────────────
export function BadgeTipo({ tipo }) {
  const mapa = {
    entrada:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    salida:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    venta:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    compra:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    ajuste:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ingreso:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    egreso:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    pendiente:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    recibido:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    completado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    efectivo:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    qr:         'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${mapa[tipo] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
      {tipo}
    </span>
  );
}

// ── Filtro de fechas ─────────────────────────────────────────
export function FiltroFechas({ desde, hasta, setDesde, setHasta, onBuscar, cargando }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <button onClick={onBuscar} disabled={cargando}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
        <Search className="w-4 h-4" /> Buscar
      </button>
    </div>
  );
}

// ── Tarjeta de estadística ───────────────────────────────────
const COLORES = {
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',  bar: 'bg-violet-500',  icon: 'text-violet-600 dark:text-violet-400',  text: 'text-violet-700 dark:text-violet-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500', icon: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',       bar: 'bg-rose-500',    icon: 'text-rose-600 dark:text-rose-400',       text: 'text-rose-700 dark:text-rose-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       bar: 'bg-blue-500',    icon: 'text-blue-600 dark:text-blue-400',       text: 'text-blue-700 dark:text-blue-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     bar: 'bg-amber-500',   icon: 'text-amber-600 dark:text-amber-400',    text: 'text-amber-700 dark:text-amber-300' },
};

export function StatCard({ label, valor, color, Icono, idx }) {
  const c = COLORES[color] || COLORES.violet;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ${c.bg} border border-white/60 dark:border-gray-700/50 animate-[rpFadeUp_0.4s_ease_forwards] opacity-0`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${c.bar}`} />
      <div className="flex items-center gap-3 mb-1">
        <Icono className={`w-4 h-4 ${c.icon}`} />
        <span className={`text-xs font-medium ${c.text}`}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{valor}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
export function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse mt-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  );
}

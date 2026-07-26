import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getVentas } from '../api/ventas';
import { getEstadoCajas } from '../api/caja';
import { TrendingUp, ShoppingBag, Wallet, XCircle, CalendarDays } from 'lucide-react';

/* ─── Paleta de colores ───────────────────────────────────────── */
const PALETA = ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#14b8a6','#f97316','#8b5cf6'];

const COLORES_METODO = {
  efectivo:      '#10b981',
  qr:            '#6366f1',
  transferencia: '#f59e0b',
  otro:          '#94a3b8',
};

const MESES      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const AÑOS       = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

/* ─── Helpers ─────────────────────────────────────────────────── */
const tiene = (u, mod, acc) => u?.permisos?.includes(`${mod}.${acc}`);

const fmt = v =>
  `Bs ${parseFloat(v ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Fecha en formato YYYY-MM-DD / YYYY-MM usando la hora LOCAL del navegador,
// no UTC. `.toISOString()` siempre da la fecha en UTC — en Bolivia (UTC-4)
// eso hace que una venta hecha entre las 20:00 y medianoche caiga en el día
// siguiente al comparar, mostrando ventas de "anoche" como si fueran de "hoy".
const fechaLocalYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaLocalYM = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/* ─── Tooltips ────────────────────────────────────────────────── */
function TooltipVentas({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl px-3.5 py-2.5 text-xs min-w-[110px]">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5 border-b border-gray-100 dark:border-gray-700 pb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="flex items-center gap-1.5 mt-0.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-medium">{p.dataKey === 'total' ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function TooltipPie({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 capitalize mb-0.5">{name}</p>
      <p className="text-gray-500 dark:text-gray-400">{fmt(value)}</p>
      <p className="font-bold" style={{ color: payload[0].payload.fill }}>{(percent * 100).toFixed(1)}%</p>
    </div>
  );
}

function TooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      <p className="font-medium" style={{ color: payload[0].fill ?? payload[0].color }}>
        {payload[0].value} unidades
      </p>
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────── */
const CARD_PALETTE = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-500/10',    icon: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500',    val: 'text-blue-700 dark:text-blue-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', val: 'text-emerald-700 dark:text-emerald-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10',  icon: 'text-amber-600 dark:text-amber-400',  bar: 'bg-amber-500',   val: 'text-amber-700 dark:text-amber-300' },
  red:     { bg: 'bg-red-50 dark:bg-red-500/10',      icon: 'text-red-500 dark:text-red-400',      bar: 'bg-red-500',     val: 'text-red-700 dark:text-red-300' },
};

function StatCard({ icono: Icono, titulo, valor, sub, color, cargando, delay = 0 }) {
  const c = CARD_PALETTE[color];
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
      style={{ animation: `dashFadeUp 0.5s ease both`, animationDelay: `${delay}ms` }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${c.bar}`} />
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${c.bg}`}>
        <Icono className={`w-4 h-4 sm:w-5 sm:h-5 ${c.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{titulo}</p>
        {cargando
          ? <div className="h-7 w-24 mt-1 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
          : <p className={`text-xl sm:text-2xl font-bold leading-tight mt-0.5 ${c.val}`}>{valor}</p>
        }
        {sub && !cargando && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Chart Card ──────────────────────────────────────────────── */
function ChartCard({ titulo, accent = '#6366f1', children, delay = 0 }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 shadow-sm"
      style={{ animation: `dashFadeUp 0.5s ease both`, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─── Legend personalizada para pie ──────────────────────────── */
function LeyendaPie({ payload }) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map(e => (
        <li key={e.value} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 capitalize">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
          {e.value}
        </li>
      ))}
    </ul>
  );
}

/* ─── Hook tamaño pantalla ────────────────────────────────────── */
function useScreenSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { isXs: width < 480, isSm: width < 640, isMd: width < 768 };
}

/* ─── Dashboard ───────────────────────────────────────────────── */
export default function Dashboard() {
  const { usuario } = useAuthStore();
  const { modo }    = useThemeStore();
  const isDark      = modo === 'dark';
  const { isXs, isSm, isMd } = useScreenSize();

  const gridColor  = isDark ? '#1f2937' : '#f9fafb';
  const tickColor  = isDark ? '#9ca3af' : '#6b7280';
  const tickSize   = isSm ? 9 : 11;
  const yAxisW     = isSm ? 38 : 50;
  const yAxisWProd = isXs ? 70 : isSm ? 80 : 95;
  const yAxisWNum  = isSm ? 22 : 28;

  const puedeVerVentas = tiene(usuario, 'ventas', 'ver');
  const puedeVerCaja   = tiene(usuario, 'caja', 'ver');

  const hoy = new Date();
  const [tipo,   setTipo]   = useState('mes');
  const [diaVal, setDiaVal] = useState(fechaLocalYMD(hoy));
  const [mesVal, setMesVal] = useState(fechaLocalYM(hoy));
  const [añoVal, setAñoVal] = useState(String(hoy.getFullYear()));

  /* ─── queries ───────────────────────────────────────────────── */
  const { data: ventas = [], isLoading: cvVentas } = useQuery({
    queryKey: ['ventas-dashboard'],
    queryFn: getVentas,
    enabled: puedeVerVentas,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ['caja-estado', usuario?.sucursal_activa?.id],
    queryFn: () => getEstadoCajas(usuario?.sucursal_activa?.id),
    enabled: puedeVerCaja && !!usuario?.sucursal_activa?.id,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // agrega las sesiones abiertas de todas las cajas de la sucursal para el widget del dashboard
  const cajaActiva = useMemo(() => {
    const abiertas = cajas.map(c => c.sesion_abierta).filter(Boolean);
    if (abiertas.length === 0) return null;
    return {
      total_ventas: abiertas.reduce((sum, s) => sum + parseFloat(s.total_ventas ?? 0), 0),
      total_gastos: abiertas.reduce((sum, s) => sum + parseFloat(s.total_gastos ?? 0), 0),
    };
  }, [cajas]);

  /* ─── filtrado ──────────────────────────────────────────────── */
  const ventasFiltradas = useMemo(() =>
    ventas.filter(v => {
      if (v.estado !== 'completado') return false;
      const d = new Date(v.creado_en);
      if (tipo === 'dia') return fechaLocalYMD(d) === diaVal;
      if (tipo === 'mes') {
        const [y, m] = mesVal.split('-').map(Number);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      }
      return d.getFullYear() === Number(añoVal);
    }),
  [ventas, tipo, diaVal, mesVal, añoVal]);

  const canceladasFiltradas = useMemo(() =>
    ventas.filter(v => {
      if (v.estado !== 'cancelado') return false;
      const d = new Date(v.creado_en);
      if (tipo === 'dia') return fechaLocalYMD(d) === diaVal;
      if (tipo === 'mes') {
        const [y, m] = mesVal.split('-').map(Number);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      }
      return d.getFullYear() === Number(añoVal);
    }),
  [ventas, tipo, diaVal, mesVal, añoVal]);

  /* ─── métricas ──────────────────────────────────────────────── */
  const totalPeriodo = ventasFiltradas.reduce((s, v) => s + parseFloat(v.total ?? 0), 0);

  /* ─── datosArea ─────────────────────────────────────────────── */
  const datosArea = useMemo(() => {
    if (tipo === 'dia') {
      return Array.from({ length: 18 }, (_, i) => {
        const hora = i + 6;
        const vH = ventasFiltradas.filter(v => new Date(v.creado_en).getHours() === hora);
        return { label: `${String(hora).padStart(2, '0')}:00`, total: vH.reduce((s, v) => s + parseFloat(v.total ?? 0), 0), pedidos: vH.length };
      });
    }
    if (tipo === 'mes') {
      const [y, m] = mesVal.split('-').map(Number);
      const dias = new Date(y, m, 0).getDate();
      return Array.from({ length: dias }, (_, i) => {
        const dia = i + 1;
        const vD = ventasFiltradas.filter(v => new Date(v.creado_en).getDate() === dia);
        return { label: String(dia), total: vD.reduce((s, v) => s + parseFloat(v.total ?? 0), 0), pedidos: vD.length };
      });
    }
    return MESES.map((mes, i) => {
      const vM = ventasFiltradas.filter(v => new Date(v.creado_en).getMonth() === i);
      return { label: mes, total: vM.reduce((s, v) => s + parseFloat(v.total ?? 0), 0), pedidos: vM.length };
    });
  }, [ventasFiltradas, tipo, mesVal]);

  /* ─── datosMetodo ───────────────────────────────────────────── */
  const datosMetodo = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach(v => {
      const m = v.metodo_pago ?? 'otro';
      map[m] = (map[m] ?? 0) + parseFloat(v.total ?? 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ventasFiltradas]);

  /* ─── topProductos ──────────────────────────────────────────── */
  const topProductos = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach(v => {
      (v.detalles ?? []).forEach(d => {
        const nombre = d.producto?.nombre ?? 'Otro';
        map[nombre] = (map[nombre] ?? 0) + (d.cantidad ?? 1);
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nombre, cantidad], i) => ({ nombre, cantidad, fill: PALETA[i % PALETA.length] }));
  }, [ventasFiltradas]);

  /* ─── datosPedidos (cobrados vs cancelados) ─────────────────── */
  const datosPedidos = useMemo(() => {
    if (tipo === 'dia') {
      return Array.from({ length: 18 }, (_, i) => {
        const hora = i + 6;
        const match = v => new Date(v.creado_en).getHours() === hora && fechaLocalYMD(new Date(v.creado_en)) === diaVal;
        return {
          label: `${String(hora).padStart(2, '0')}h`,
          cobrados:   ventas.filter(v => v.estado === 'completado' && match(v)).length,
          cancelados: ventas.filter(v => v.estado === 'cancelado'  && match(v)).length,
        };
      });
    }
    if (tipo === 'mes') {
      const [y, m] = mesVal.split('-').map(Number);
      const dias = new Date(y, m, 0).getDate();
      return Array.from({ length: dias }, (_, i) => {
        const dia = i + 1;
        const match = v => new Date(v.creado_en).getDate() === dia && new Date(v.creado_en).getFullYear() === y && new Date(v.creado_en).getMonth() === m - 1;
        return {
          label: String(dia),
          cobrados:   ventas.filter(v => v.estado === 'completado' && match(v)).length,
          cancelados: ventas.filter(v => v.estado === 'cancelado'  && match(v)).length,
        };
      });
    }
    return MESES.map((mes, i) => ({
      label: mes,
      cobrados:   ventas.filter(v => v.estado === 'completado' && new Date(v.creado_en).getMonth() === i && new Date(v.creado_en).getFullYear() === Number(añoVal)).length,
      cancelados: ventas.filter(v => v.estado === 'cancelado'  && new Date(v.creado_en).getMonth() === i && new Date(v.creado_en).getFullYear() === Number(añoVal)).length,
    }));
  }, [ventas, tipo, diaVal, mesVal, añoVal]);

  /* ─── etiqueta período ──────────────────────────────────────── */
  const labelPeriodo = useMemo(() => {
    if (tipo === 'dia') return new Date(diaVal + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (tipo === 'mes') { const [y, m] = mesVal.split('-').map(Number); return `${MESES_FULL[m - 1]} ${y}`; }
    return `Año ${añoVal}`;
  }, [tipo, diaVal, mesVal, añoVal]);

  const haySuficientesDatos = ventasFiltradas.length > 0 || canceladasFiltradas.length > 0;

  /* ─── render ────────────────────────────────────────────────── */
  return (
    <>
      {/* Keyframes de animación */}
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">

        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
            animation: 'dashFadeIn 0.4s ease both',
          }}
        >
          {/* decoración fondo */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 bg-white" />
          <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full opacity-10 bg-white" />

          <p className="text-indigo-200 text-xs sm:text-sm relative capitalize">
            {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 relative">
            {saludo()}, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-indigo-300 text-xs sm:text-sm mt-0.5 relative">{usuario?.rol?.nombre ?? 'Panel principal'}</p>
        </div>

        {/* ── Filtros ─────────────────────────────────────────── */}
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3 sm:p-4 shadow-sm"
          style={{ animation: 'dashFadeUp 0.4s ease both', animationDelay: '80ms' }}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* tabs */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1">
                {[['dia', 'Día'], ['mes', 'Mes'], ['año', 'Año']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setTipo(val)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      tipo === val
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {/* selector fecha */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {tipo === 'dia' && (
                  <input type="date" value={diaVal} max={fechaLocalYMD(hoy)}
                    onChange={e => setDiaVal(e.target.value)}
                    className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
                {tipo === 'mes' && (
                  <input type="month" value={mesVal} max={fechaLocalYM(hoy)}
                    onChange={e => setMesVal(e.target.value)}
                    className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
                {tipo === 'año' && (
                  <select value={añoVal} onChange={e => setAñoVal(e.target.value)}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {AÑOS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </div>
            </div>

            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize font-medium">{labelPeriodo}</span>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────── */}
        {puedeVerVentas && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icono={TrendingUp} titulo="Ingresos del período" valor={fmt(totalPeriodo)}
              sub={`${ventasFiltradas.length} venta${ventasFiltradas.length !== 1 ? 's' : ''}`}
              color="blue" cargando={cvVentas} delay={100}
            />
            <StatCard
              icono={Wallet}
              titulo={puedeVerCaja ? 'Caja activa' : 'Período'}
              valor={puedeVerCaja ? (cajaActiva ? fmt(cajaActiva.total_ventas) : '—') : `${ventasFiltradas.length}`}
              sub={puedeVerCaja ? (cajaActiva ? `Gastos: ${fmt(cajaActiva.total_gastos)}` : 'Sin sesión') : 'Ventas completadas'}
              color="amber" cargando={cvVentas} delay={220}
            />
            <StatCard icono={XCircle} titulo="Canceladas" valor={canceladasFiltradas.length}
              sub={canceladasFiltradas.length > 0 ? 'En el período' : 'Sin cancelaciones'}
              color="red" cargando={cvVentas} delay={280}
            />
          </div>
        )}

        {/* ── Sin datos ────────────────────────────────────────── */}
        {!cvVentas && puedeVerVentas && !haySuficientesDatos && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 shadow-sm"
            style={{ animation: 'dashFadeUp 0.4s ease both', animationDelay: '200ms' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 opacity-40" />
            </div>
            <p className="text-sm font-medium">Sin ventas en el período seleccionado</p>
            <p className="text-xs capitalize">{labelPeriodo}</p>
          </div>
        )}

        {/* ── Gráfico Ingresos (AreaChart) ─────────────────────── */}
        {puedeVerVentas && haySuficientesDatos && (
          <ChartCard titulo={`Ingresos — ${labelPeriodo}`} accent="#6366f1" delay={340}>
            {cvVentas ? (
              <div className="h-56 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ) : (
              <div className="h-44 sm:h-56 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosArea} margin={{ top: 10, right: isSm ? 4 : 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: tickSize, fill: tickColor }}
                      tickLine={false} axisLine={false}
                      interval={tipo === 'dia' ? (isSm ? 3 : 1) : tipo === 'mes' ? (isSm ? 6 : 3) : 0}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: tickSize, fill: tickColor }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => v === 0 ? '' : `${v}`}
                      width={yAxisW}
                    />
                    {!isSm && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: tickSize, fill: tickColor }}
                        tickLine={false} axisLine={false}
                        allowDecimals={false}
                        width={yAxisWNum}
                      />
                    )}
                    <Tooltip content={<TooltipVentas />} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize: isSm ? 10 : 12, color: tickColor }}>{v === 'total' ? 'Ingresos (Bs)' : 'Pedidos'}</span>}
                    />
                    <Area yAxisId="left"  type="monotone" dataKey="total"   name="total"
                      stroke="#6366f1" strokeWidth={2.5} fill="url(#gradIngresos)"
                      dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                      isAnimationActive animationDuration={900} animationEasing="ease-out"
                    />
                    <Area yAxisId={isSm ? 'left' : 'right'} type="monotone" dataKey="pedidos" name="pedidos"
                      stroke="#10b981" strokeWidth={2} fill="url(#gradPedidos)"
                      dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      isAnimationActive animationDuration={900} animationEasing="ease-out" animationBegin={200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        )}

        {/* ── Fila: Métodos de pago + Top productos ────────────── */}
        {puedeVerVentas && ventasFiltradas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Métodos de pago */}
            <ChartCard titulo="Métodos de pago" accent="#f59e0b" delay={440}>
              {datosMetodo.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Sin datos de pagos</p>
              ) : (
                <div className="h-44 sm:h-56 md:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosMetodo}
                        cx="50%" cy="45%"
                        innerRadius={isXs ? 40 : isSm ? 50 : 60}
                        outerRadius={isXs ? 65 : isSm ? 75 : 90}
                        paddingAngle={4}
                        dataKey="value"
                        isAnimationActive animationDuration={800} animationEasing="ease-out"
                        strokeWidth={0}
                      >
                        {datosMetodo.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={COLORES_METODO[entry.name] ?? PALETA[i % PALETA.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<TooltipPie />} />
                      <Legend content={<LeyendaPie />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            {/* Top productos */}
            <ChartCard titulo="Productos más vendidos" accent="#ec4899" delay={500}>
              {topProductos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Sin datos de productos</p>
              ) : (
                <div className="h-44 sm:h-56 md:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductos}
                      layout="vertical"
                      margin={{ top: 0, right: isSm ? 8 : 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: tickSize, fill: tickColor }}
                        tickLine={false} axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category" dataKey="nombre"
                        tick={{ fontSize: tickSize, fill: tickColor }}
                        tickLine={false} axisLine={false}
                        width={yAxisWProd}
                        tickFormatter={v => {
                          const max = isXs ? 9 : isSm ? 11 : 13;
                          return v.length > max ? v.slice(0, max - 1) + '…' : v;
                        }}
                      />
                      <Tooltip content={<TooltipBar />} />
                      <Bar
                        dataKey="cantidad" name="Unidades"
                        radius={[0, 5, 5, 0]} maxBarSize={22}
                        isAnimationActive animationDuration={800} animationEasing="ease-out"
                      >
                        {topProductos.map((entry, i) => (
                          <Cell key={entry.nombre} fill={PALETA[i % PALETA.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {/* ── Cobrados vs Cancelados ───────────────────────────── */}
        {puedeVerVentas && haySuficientesDatos && (
          <ChartCard titulo="Pedidos cobrados vs cancelados" accent="#10b981" delay={560}>
            <div className="h-40 sm:h-52 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosPedidos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={3} barCategoryGap="30%">
                  <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: tickSize, fill: tickColor }}
                    tickLine={false} axisLine={false}
                    interval={tipo === 'dia' ? (isSm ? 3 : 1) : tipo === 'mes' ? (isSm ? 6 : 3) : 0}
                  />
                  <YAxis
                    tick={{ fontSize: tickSize, fill: tickColor }}
                    tickLine={false} axisLine={false}
                    allowDecimals={false} width={yAxisWNum}
                  />
                  <Tooltip content={<TooltipVentas />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={v => (
                      <span style={{ fontSize: isSm ? 10 : 12, color: tickColor }}>
                        {v === 'cobrados' ? 'Cobrados' : 'Cancelados'}
                      </span>
                    )}
                  />
                  <Bar dataKey="cobrados"   name="cobrados"   fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20}
                    isAnimationActive animationDuration={800} animationEasing="ease-out"
                  />
                  <Bar dataKey="cancelados" name="cancelados" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20}
                    isAnimationActive animationDuration={800} animationEasing="ease-out" animationBegin={150}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* sin permiso */}
        {!puedeVerVentas && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Sin permiso para ver estadísticas de ventas.</p>
          </div>
        )}
      </div>
    </>
  );
}

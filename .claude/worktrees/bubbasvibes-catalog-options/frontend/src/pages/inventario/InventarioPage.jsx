import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermisos } from '../../hooks/usePermisos';
import { getInventario, registrarEntrada, registrarSalida, registrarAjuste } from '../../api/inventario';
import { getProductos } from '../../api/productos';
import { useAuthStore } from '../../store/authStore';
import { getSucursales } from '../../api/sucursales';
import {
  Boxes, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal,
  Search, X, ChevronDown, ChevronUp, PackageOpen, AlertTriangle,
} from 'lucide-react';

/* ─── helpers ─── */
const fmt = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0 });
const fmtFecha = (s) => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const BADGE_TIPO = {
  entrada: { bg: 'bg-emerald-100 text-emerald-700', label: 'Entrada', Icono: ArrowDownCircle },
  salida:  { bg: 'bg-rose-100 text-rose-700',      label: 'Salida',  Icono: ArrowUpCircle },
  venta:   { bg: 'bg-blue-100 text-blue-700',      label: 'Venta',   Icono: ArrowUpCircle },
  compra:  { bg: 'bg-violet-100 text-violet-700',  label: 'Compra',  Icono: ArrowDownCircle },
  ajuste:  { bg: 'bg-amber-100 text-amber-700',    label: 'Ajuste',  Icono: SlidersHorizontal },
};

function BadgeTipo({ tipo }) {
  const t = BADGE_TIPO[tipo] ?? { bg: 'bg-gray-100 text-gray-600', label: tipo, Icono: Boxes };
  const { bg, label, Icono } = t;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      <Icono className="w-3 h-3" />{label}
    </span>
  );
}

/* ─── modal movimiento ─── */
function ModalMovimiento({ productos, accesoTodas, sucursales, onClose, onGuardar }) {
  const [tipo, setTipo] = useState('entrada');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [nota, setNota] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [error, setError] = useState('');

  const accentColor = tipo === 'entrada' ? 'emerald' : tipo === 'salida' ? 'rose' : 'amber';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!productoId || !cantidad || Number(cantidad) <= 0) {
      setError('Producto y cantidad son requeridos');
      return;
    }
    if (accesoTodas && !sucursalId) {
      setError('Elegí la sucursal destino');
      return;
    }
    setError('');
    onGuardar({
      tipo,
      producto_id: Number(productoId),
      cantidad: Number(cantidad),
      nota,
      ...(accesoTodas ? { sucursal_id: Number(sucursalId) } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* header */}
        <div className={`px-6 py-4 rounded-t-2xl bg-${accentColor}-600 flex items-center justify-between`}>
          <h2 className="text-white font-semibold text-base">
            {tipo === 'entrada' ? 'Registrar Entrada' : tipo === 'salida' ? 'Registrar Salida' : 'Ajuste de Stock'}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Tipo de movimiento
            </label>
            <div className="flex gap-2">
              {[
                { v: 'entrada', label: 'Entrada', color: 'emerald' },
                { v: 'salida',  label: 'Salida',  color: 'rose' },
                { v: 'ajuste',  label: 'Ajuste',  color: 'amber' },
              ].map(({ v, label, color }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTipo(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    tipo === v
                      ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-400`
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* sucursal destino (solo acceso-todas) */}
          {accesoTodas && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Sucursal destino
              </label>
              <select
                value={sucursalId}
                onChange={e => setSucursalId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar sucursal...</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}

          {/* producto */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Producto
            </label>
            <select
              value={productoId}
              onChange={e => setProductoId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar producto...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (stock actual: {p.stock ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* cantidad + nota */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                {tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
              </label>
              <input
                type="number"
                min="0"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Motivo..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-rose-600 text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />{error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors bg-${accentColor}-600 hover:bg-${accentColor}-700`}
            >
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── tarjeta móvil ─── */
function RegistroCard({ reg, idx }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      style={{ animation: 'invFadeUp .35s ease both', animationDelay: `${idx * 30}ms` }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setAbierto(v => !v)}
      >
        <div className="flex items-center gap-3">
          <BadgeTipo tipo={reg.tipo} />
          <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
            {reg.producto?.nombre ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${
            reg.tipo === 'entrada' || reg.tipo === 'compra' ? 'text-emerald-600' :
            reg.tipo === 'salida'  || reg.tipo === 'venta'  ? 'text-rose-600' : 'text-amber-600'
          }`}>
            {reg.tipo === 'entrada' || reg.tipo === 'compra' ? '+' :
             reg.tipo === 'ajuste' ? '→' : '-'}{fmt(reg.cantidad)}
          </span>
          {abierto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {abierto && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500">Stock anterior:</span> <span className="font-medium text-gray-900 dark:text-white">{fmt(reg.stock_anterior)}</span></div>
          <div><span className="text-gray-500">Stock nuevo:</span> <span className="font-medium text-gray-900 dark:text-white">{fmt(reg.stock_nuevo)}</span></div>
          <div><span className="text-gray-500">Usuario:</span> <span className="font-medium text-gray-900 dark:text-white">{reg.usuario?.nombre ?? '—'}</span></div>
          <div><span className="text-gray-500">Fecha:</span> <span className="font-medium text-gray-900 dark:text-white">{fmtFecha(reg.creado_en)}</span></div>
          {reg.nota && <div className="col-span-2"><span className="text-gray-500">Nota:</span> <span className="font-medium text-gray-900 dark:text-white">{reg.nota}</span></div>}
        </div>
      )}
    </div>
  );
}

/* ─── página principal ─── */
export default function InventarioPage() {
  const { tienePermiso } = usePermisos();
  const qc = useQueryClient();

  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: getSucursales,
    enabled: accesoTodas,
  });

  const puedoVer     = tienePermiso('inventario', 'ver');
  const puedoEntrada = tienePermiso('inventario', 'entrada');
  const puedoSalida  = tienePermiso('inventario', 'salida');
  const puedoAjustar = tienePermiso('inventario', 'ajustar');
  const puedoRegistrar = puedoEntrada || puedoSalida || puedoAjustar;

  const [buscar, setBuscar] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);

  const mostrarToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['inventario'],
    queryFn: getInventario,
    enabled: puedoVer,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: getProductos,
    enabled: puedoRegistrar,
  });

  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos]);

  const mutMovimiento = useMutation({
    mutationFn: ({ tipo, ...datos }) => {
      if (tipo === 'entrada') return registrarEntrada(datos);
      if (tipo === 'salida')  return registrarSalida(datos);
      return registrarAjuste(datos);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      setModal(false);
      mostrarToast('Movimiento registrado');
    },
    onError: (err) => mostrarToast(err?.response?.data?.mensaje ?? 'Error al registrar', false),
  });

  const registrosFiltrados = useMemo(() => {
    let r = registros;
    if (filtroTipo !== 'todos') r = r.filter(x => x.tipo === filtroTipo);
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      r = r.filter(x =>
        x.producto?.nombre?.toLowerCase().includes(q) ||
        x.usuario?.nombre?.toLowerCase().includes(q) ||
        x.nota?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [registros, filtroTipo, buscar]);

  // resumen stock actual por producto
  const productosConStock = useMemo(() =>
    productosActivos
      .filter(p => p.stock !== null && p.stock !== undefined)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
      .slice(0, 5),
    [productosActivos]
  );

  const bajoStock = productosConStock.filter(p => (p.stock ?? 0) <= 5);

  if (!puedoVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Boxes className="w-12 h-12" />
        <p className="text-sm">Sin acceso al inventario</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes invFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn   { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}
          style={{ animation: 'toastIn .25s ease both' }}
        >
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {modal && (
        <ModalMovimiento
          productos={productosActivos}
          accesoTodas={accesoTodas}
          sucursales={sucursales}
          onClose={() => setModal(false)}
          onGuardar={(datos) => mutMovimiento.mutate(datos)}
        />
      )}

      <div className="space-y-6">
        {/* header */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -right-16 w-48 h-48 bg-white/5 rounded-full" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Inventario</h1>
              <p className="text-emerald-100 text-sm mt-0.5">Control de stock y movimientos</p>
            </div>
            {puedoRegistrar && (
              <button
                onClick={() => setModal(true)}
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:scale-[1.02]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Registrar movimiento
              </button>
            )}
          </div>
        </div>

        {/* alertas stock bajo */}
        {bajoStock.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {bajoStock.length} producto{bajoStock.length > 1 ? 's' : ''} con stock bajo (≤ 5)
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                {bajoStock.map(p => `${p.nombre} (${p.stock ?? 0})`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por producto, usuario o nota..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {['todos', 'entrada', 'salida', 'ajuste', 'venta', 'compra'].map(t => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filtroTipo === t
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {/* contenido */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <PackageOpen className="w-12 h-12 opacity-40" />
            <p className="text-sm">Sin movimientos{filtroTipo !== 'todos' ? ' con ese filtro' : ''}</p>
            {puedoRegistrar && (
              <button
                onClick={() => setModal(true)}
                className="text-emerald-600 text-sm font-medium hover:underline"
              >
                Registrar primer movimiento
              </button>
            )}
          </div>
        ) : (
          <>
            {/* mobile */}
            <div className="sm:hidden space-y-2">
              {registrosFiltrados.map((reg, i) => (
                <RegistroCard key={reg.id} reg={reg} idx={i} />
              ))}
            </div>

            {/* desktop tabla */}
            <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ant.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nuevo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {registrosFiltrados.map((reg, i) => (
                    <tr
                      key={reg.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      style={{ animation: 'invFadeUp .3s ease both', animationDelay: `${i * 20}ms` }}
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {fmtFecha(reg.creado_en)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {reg.producto?.nombre ?? '—'}
                      </td>
                      <td className="px-4 py-3"><BadgeTipo tipo={reg.tipo} /></td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        reg.tipo === 'entrada' || reg.tipo === 'compra' ? 'text-emerald-600' :
                        reg.tipo === 'ajuste' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {reg.tipo === 'entrada' || reg.tipo === 'compra' ? '+' :
                         reg.tipo === 'ajuste' ? '→' : '-'}{fmt(reg.cantidad)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{fmt(reg.stock_anterior)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(reg.stock_nuevo)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{reg.usuario?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{reg.nota ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {registrosFiltrados.length} movimiento{registrosFiltrados.length !== 1 ? 's' : ''}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

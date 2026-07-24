import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Truck, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { getReporteCompras } from '../../../api/reportes';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { exportarPDF } from '../utils/exportarPDF';
import { FiltroFechas, StatCard, BadgeTipo, Skeleton, bs, fecha, fechaHora, hoy, inicioMes } from '../shared';

export default function TabCompras({ empresa, logo, direccion, telefono }) {
  const { usuario } = useAuth();
  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const [filtroSucursal, setFiltroSucursal] = useState('todas');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [params, setParams] = useState({ desde: inicioMes(), hasta: hoy() });

  const { data = [], isLoading } = useQuery({
    queryKey: ['reporte-compras', params],
    queryFn: () => getReporteCompras(params),
  });

  const sucursales = useMemo(() => {
    const unicos = new Map();
    data.forEach(c => { if (c.sucursal?.id) unicos.set(c.sucursal.id, c.sucursal.nombre); });
    return Array.from(unicos.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [data]);

  const filtrado = useMemo(() => {
    let base = filtroEstado === 'todos' ? data : data.filter(c => c.estado === filtroEstado);
    if (accesoTodas && filtroSucursal !== 'todas') {
      base = base.filter(c => String(c.sucursal?.id) === filtroSucursal);
    }
    return base;
  }, [data, filtroEstado, filtroSucursal, accesoTodas]);

  const resumenSucursales = useMemo(() => {
    if (!accesoTodas) return [];
    const mapa = new Map();
    filtrado.forEach(c => {
      const id = c.sucursal?.id;
      if (id == null) return;
      if (!mapa.has(id)) mapa.set(id, { id, nombre: c.sucursal.nombre, count: 0, total: 0 });
      const s = mapa.get(id);
      s.count += 1;
      s.total += parseFloat(c.total || 0);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [filtrado, accesoTodas]);

  const stats = useMemo(() => {
    const total     = data.reduce((s, c) => s + parseFloat(c.total || 0), 0);
    const pendiente = data.filter(c => c.estado === 'pendiente').reduce((s, c) => s + parseFloat(c.total || 0), 0);
    const recibido  = data.filter(c => c.estado === 'recibido').reduce((s, c) => s + parseFloat(c.total || 0), 0);
    return { count: data.length, total, pendiente, recibido };
  }, [data]);

  const exportar = () => exportarPDF({
    titulo:        'Reporte de Compras',
    subtitulo:     `${fecha(params.desde)} — ${fecha(params.hasta)}`,
    empresa, logo, direccion, telefono,
    generadoPor:   usuario?.nombre,
    columnas:      ['Fecha', 'Proveedor', 'Estado', 'Registrado por', 'Total', 'Notas'],
    filas:         filtrado.map(c => [
      fechaHora(c.creado_en),
      c.proveedor?.nombre || '-',
      c.estado,
      c.usuario?.nombre || '-',
      bs(c.total),
      c.notas || '-',
    ]),
    totales: [
      { label: 'N° Compras',  valor: stats.count },
      { label: 'Total',       valor: bs(stats.total) },
      { label: 'Pendiente',   valor: bs(stats.pendiente) },
      { label: 'Recibido',    valor: bs(stats.recibido) },
    ],
    nombreArchivo: `reporte-compras-${params.desde}-${params.hasta}.pdf`,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <FiltroFechas desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta}
            onBuscar={() => setParams({ desde, hasta })} cargando={isLoading} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="recibido">Recibido</option>
            </select>
          </div>
          {accesoTodas && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sucursal</label>
              <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="todas">Todas</option>
                {sucursales.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button onClick={exportar} disabled={!filtrado.length}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="N° Compras"  valor={stats.count}            color="violet"  Icono={Truck}       idx={0} />
        <StatCard label="Total"       valor={bs(stats.total)}        color="blue"    Icono={DollarSign}  idx={1} />
        <StatCard label="Pendiente"   valor={bs(stats.pendiente)}    color="amber"   Icono={ShoppingCart} idx={2} />
        <StatCard label="Recibido"    valor={bs(stats.recibido)}     color="emerald" Icono={TrendingUp}  idx={3} />
      </div>

      {accesoTodas && resumenSucursales.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-violet-50 dark:bg-violet-900/20 border-b border-gray-200 dark:border-gray-700/50">
                {['Sucursal', 'N° Compras', 'Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {resumenSucursales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{s.count}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{bs(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading ? <Skeleton /> : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/50">
                {[...(accesoTodas ? ['Sucursal'] : []), 'Fecha', 'Proveedor', 'Estado', 'Registrado por', 'Total', 'Notas'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {filtrado.length === 0 ? (
                <tr><td colSpan={accesoTodas ? 7 : 6} className="text-center py-10 text-gray-400 dark:text-gray-500">Sin resultados</td></tr>
              ) : filtrado.map((c, i) => (
                <tr key={c.id}
                  className="bg-white dark:bg-gray-900 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors animate-[rpFadeUp_0.3s_ease_forwards] opacity-0"
                  style={{ animationDelay: `${i * 20}ms` }}>
                  {accesoTodas && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.sucursal?.nombre || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fechaHora(c.creado_en)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.proveedor?.nombre || '-'}</td>
                  <td className="px-4 py-3"><BadgeTipo tipo={c.estado} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.usuario?.nombre || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{bs(c.total)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.notas || '-'}</td>
                </tr>
              ))}
            </tbody>
            {filtrado.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-200 dark:border-violet-700/40">
                  <td colSpan={accesoTodas ? 5 : 4} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 text-sm">TOTAL</td>
                  <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                    {bs(filtrado.reduce((s, c) => s + parseFloat(c.total || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ShoppingCart, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';
import { getReporteVentas } from '../../../api/reportes';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { exportarPDF } from '../utils/exportarPDF';
import { FiltroFechas, StatCard, BadgeTipo, Skeleton, bs, fecha, fechaHora, hoy, inicioMes } from '../shared';

export default function TabVentas({ empresa, logo, direccion, telefono }) {
  const { usuario } = useAuth();
  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const [filtroSucursal, setFiltroSucursal] = useState('todas');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [filtroCajero, setFiltroCajero] = useState('todos');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('todos');
  const [params, setParams] = useState({ desde: inicioMes(), hasta: hoy() });

  const { data = [], isLoading } = useQuery({
    queryKey: ['reporte-ventas', params],
    queryFn: () => getReporteVentas(params),
  });

  const cajeros = useMemo(() => {
    const unicos = new Map();
    data.forEach(v => {
      if (v.usuario?.id) unicos.set(v.usuario.id, v.usuario.nombre);
    });
    return Array.from(unicos.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [data]);

  const sucursales = useMemo(() => {
    const unicos = new Map();
    data.forEach(v => { if (v.sucursal?.id) unicos.set(v.sucursal.id, v.sucursal.nombre); });
    return Array.from(unicos.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [data]);

  const filtrado = useMemo(() => {
    let base = filtroCajero === 'todos' ? data : data.filter(v => String(v.usuario?.id) === filtroCajero);
    if (accesoTodas && filtroSucursal !== 'todas') {
      base = base.filter(v => String(v.sucursal?.id) === filtroSucursal);
    }
    if (filtroMetodoPago !== 'todos') {
      base = base.filter(v => (v.metodo_pago || 'efectivo') === filtroMetodoPago);
    }
    return base;
  }, [data, filtroCajero, filtroSucursal, filtroMetodoPago, accesoTodas]);

  const stats = useMemo(() => {
    const total    = filtrado.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const efectivo = filtrado.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const qr       = filtrado.filter(v => v.metodo_pago !== 'efectivo').reduce((s, v) => s + parseFloat(v.total || 0), 0);
    return { count: filtrado.length, total, efectivo, qr };
  }, [filtrado]);

  const resumenSucursales = useMemo(() => {
    if (!accesoTodas) return [];
    const mapa = new Map();
    filtrado.forEach(v => {
      const id = v.sucursal?.id;
      if (id == null) return;
      if (!mapa.has(id)) mapa.set(id, { id, nombre: v.sucursal.nombre, count: 0, total: 0, efectivo: 0, qr: 0 });
      const s = mapa.get(id);
      s.count += 1;
      s.total += parseFloat(v.total || 0);
      if (v.metodo_pago === 'efectivo') s.efectivo += parseFloat(v.total || 0);
      else s.qr += parseFloat(v.total || 0);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [filtrado, accesoTodas]);

  const cajeroLabel = filtroCajero === 'todos'
    ? 'Todos los cajeros'
    : cajeros.find(c => String(c.id) === filtroCajero)?.nombre || 'Cajero';

  const metodoPagoLabel = filtroMetodoPago === 'todos'
    ? 'Todos los métodos'
    : filtroMetodoPago === 'efectivo' ? 'Efectivo' : 'QR / Transferencia';

  const exportar = () => exportarPDF({
    titulo:        'Reporte de Ventas',
    subtitulo:     `${fecha(params.desde)} — ${fecha(params.hasta)} · ${cajeroLabel} · ${metodoPagoLabel}`,
    empresa, logo, direccion, telefono,
    generadoPor:   usuario?.nombre,
    columnas:      ['Fecha', 'Mesa', 'Cliente', 'Cajero', 'Método de pago', 'Total'],
    filas:         filtrado.map(v => [
      fechaHora(v.creado_en),
      v.mesa?.nombre || '-',
      v.nombre_cliente || v.cliente?.nombre || 'Público General',
      v.usuario?.nombre || '-',
      v.metodo_pago || '-',
      bs(v.total),
    ]),
    totales: [
      { label: 'N° Ventas',          valor: stats.count },
      { label: 'Total Ingresos',     valor: bs(stats.total) },
      { label: 'Efectivo',           valor: bs(stats.efectivo) },
      { label: 'QR / Transferencia', valor: bs(stats.qr) },
    ],
    nombreArchivo: `reporte-ventas-${params.desde}-${params.hasta}${filtroCajero !== 'todos' ? `-${cajeroLabel}` : ''}${filtroMetodoPago !== 'todos' ? `-${filtroMetodoPago}` : ''}.pdf`,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <FiltroFechas desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta}
            onBuscar={() => setParams({ desde, hasta })} cargando={isLoading} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cajero</label>
            <select value={filtroCajero} onChange={e => setFiltroCajero(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="todos">Todos</option>
              {cajeros.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Método de pago</label>
            <select value={filtroMetodoPago} onChange={e => setFiltroMetodoPago(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="qr">QR / Transferencia</option>
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
        <StatCard label="N° Ventas"          valor={stats.count}        color="violet"  Icono={ShoppingCart} idx={0} />
        <StatCard label="Total Ingresos"     valor={bs(stats.total)}    color="emerald" Icono={TrendingUp}   idx={1} />
        <StatCard label="Efectivo"           valor={bs(stats.efectivo)} color="blue"    Icono={DollarSign}   idx={2} />
        <StatCard label="QR / Transferencia" valor={bs(stats.qr)}       color="amber"   Icono={BarChart2}    idx={3} />
      </div>

      {accesoTodas && resumenSucursales.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-violet-50 dark:bg-violet-900/20 border-b border-gray-200 dark:border-gray-700/50">
                {['Sucursal', 'N° Ventas', 'Total', 'Efectivo', 'QR'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {resumenSucursales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{s.count}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{bs(s.total)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{bs(s.efectivo)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{bs(s.qr)}</td>
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
                {[...(accesoTodas ? ['Sucursal'] : []), 'Fecha', 'Mesa', 'Cliente', 'Cajero', 'Método', 'Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {filtrado.length === 0 ? (
                <tr><td colSpan={accesoTodas ? 7 : 6} className="text-center py-10 text-gray-400 dark:text-gray-500">Sin resultados para el período</td></tr>
              ) : filtrado.map((v, i) => (
                <tr key={v.id}
                  className="bg-white dark:bg-gray-900 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors animate-[rpFadeUp_0.3s_ease_forwards] opacity-0"
                  style={{ animationDelay: `${i * 20}ms` }}>
                  {accesoTodas && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.sucursal?.nombre || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fechaHora(v.creado_en)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.mesa?.nombre || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.nombre_cliente || v.cliente?.nombre || 'Público General'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.usuario?.nombre || '-'}</td>
                  <td className="px-4 py-3"><BadgeTipo tipo={v.metodo_pago || 'efectivo'} /></td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{bs(v.total)}</td>
                </tr>
              ))}
            </tbody>
            {filtrado.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-200 dark:border-violet-700/40">
                  <td colSpan={accesoTodas ? 6 : 5} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 text-sm">TOTAL</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{bs(stats.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, ArrowUpCircle, ArrowDownCircle, BarChart2 } from 'lucide-react';
import { getReporteInventario } from '../../../api/reportes';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { exportarPDF } from '../utils/exportarPDF';
import { FiltroFechas, StatCard, BadgeTipo, Skeleton, bs, fecha, fechaHora, hoy, inicioMes } from '../shared';

const TIPOS = ['todos', 'entrada', 'salida', 'venta', 'compra', 'ajuste'];

export default function TabInventario({ empresa, logo, direccion, telefono }) {
  const { usuario } = useAuth();
  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const [filtroSucursal, setFiltroSucursal] = useState('todas');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [params, setParams] = useState({ desde: inicioMes(), hasta: hoy() });

  const { data = [], isLoading } = useQuery({
    queryKey: ['reporte-inventario', params],
    queryFn: () => getReporteInventario(params),
  });

  const sucursales = useMemo(() => {
    const unicos = new Map();
    data.forEach(r => { if (r.sucursal?.id) unicos.set(r.sucursal.id, r.sucursal.nombre); });
    return Array.from(unicos.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [data]);

  const filtrado = useMemo(() => {
    let base = filtroTipo === 'todos' ? data : data.filter(r => r.tipo === filtroTipo);
    if (accesoTodas && filtroSucursal !== 'todas') {
      base = base.filter(r => String(r.sucursal?.id) === filtroSucursal);
    }
    return base;
  }, [data, filtroTipo, filtroSucursal, accesoTodas]);

  const resumenSucursales = useMemo(() => {
    if (!accesoTodas) return [];
    const mapa = new Map();
    filtrado.forEach(r => {
      const id = r.sucursal?.id;
      if (id == null) return;
      if (!mapa.has(id)) mapa.set(id, { id, nombre: r.sucursal.nombre, total: 0, entradas: 0, salidas: 0, ajustes: 0 });
      const s = mapa.get(id);
      s.total += 1;
      if (['entrada', 'compra'].includes(r.tipo)) s.entradas += r.cantidad;
      else if (['salida', 'venta'].includes(r.tipo)) s.salidas += r.cantidad;
      else if (r.tipo === 'ajuste') s.ajustes += 1;
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [filtrado, accesoTodas]);

  const stats = useMemo(() => {
    const entradas = data.filter(r => ['entrada', 'compra'].includes(r.tipo)).reduce((s, r) => s + r.cantidad, 0);
    const salidas  = data.filter(r => ['salida', 'venta'].includes(r.tipo)).reduce((s, r) => s + r.cantidad, 0);
    const ajustes  = data.filter(r => r.tipo === 'ajuste').length;
    return { total: data.length, entradas, salidas, ajustes };
  }, [data]);

  const exportar = () => exportarPDF({
    titulo:        'Reporte de Inventario',
    subtitulo:     `${fecha(params.desde)} — ${fecha(params.hasta)}${filtroTipo !== 'todos' ? ` · ${filtroTipo}` : ''}`,
    empresa, logo, direccion, telefono,
    generadoPor:   usuario?.nombre,
    columnas:      ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Ant.', 'Stock Nuevo', 'Usuario', 'Nota'],
    filas:         filtrado.map(r => [
      fechaHora(r.creado_en),
      r.producto?.nombre || '-',
      r.tipo,
      r.cantidad,
      r.stock_anterior ?? '-',
      r.stock_nuevo ?? '-',
      r.usuario?.nombre || '-',
      r.nota || '-',
    ]),
    totales: [
      { label: 'Total movimientos',   valor: stats.total },
      { label: 'Unidades ingresadas', valor: stats.entradas },
      { label: 'Unidades egresadas',  valor: stats.salidas },
      { label: 'Ajustes',            valor: stats.ajustes },
    ],
    nombreArchivo: `reporte-inventario-${params.desde}-${params.hasta}.pdf`,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <FiltroFechas desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta}
            onBuscar={() => setParams({ desde, hasta })} cargando={isLoading} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
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
        <StatCard label="Total movimientos"   valor={stats.total}    color="violet"  Icono={Package}        idx={0} />
        <StatCard label="Unidades ingresadas" valor={stats.entradas} color="emerald" Icono={ArrowUpCircle}  idx={1} />
        <StatCard label="Unidades egresadas"  valor={stats.salidas}  color="rose"    Icono={ArrowDownCircle} idx={2} />
        <StatCard label="Ajustes"             valor={stats.ajustes}  color="amber"   Icono={BarChart2}      idx={3} />
      </div>

      {accesoTodas && resumenSucursales.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-violet-50 dark:bg-violet-900/20 border-b border-gray-200 dark:border-gray-700/50">
                {['Sucursal', 'N° Movimientos', 'Entradas', 'Salidas', 'Ajustes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {resumenSucursales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{s.total}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{s.entradas}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{s.salidas}</td>
                  <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{s.ajustes}</td>
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
                {[...(accesoTodas ? ['Sucursal'] : []), 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Ant.', 'Stock Nuevo', 'Usuario', 'Nota'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {filtrado.length === 0 ? (
                <tr><td colSpan={accesoTodas ? 9 : 8} className="text-center py-10 text-gray-400 dark:text-gray-500">Sin resultados</td></tr>
              ) : filtrado.map((r, i) => (
                <tr key={r.id}
                  className="bg-white dark:bg-gray-900 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors animate-[rpFadeUp_0.3s_ease_forwards] opacity-0"
                  style={{ animationDelay: `${i * 20}ms` }}>
                  {accesoTodas && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.sucursal?.nombre || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fechaHora(r.creado_en)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.producto?.nombre || '-'}</td>
                  <td className="px-4 py-3"><BadgeTipo tipo={r.tipo} /></td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.cantidad}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.stock_anterior ?? '-'}</td>
                  <td className="px-4 py-3 font-medium text-violet-600 dark:text-violet-400">{r.stock_nuevo ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.usuario?.nombre || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{r.nota || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BookOpen, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getReporteCaja } from '../../../api/reportes';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { exportarPDF } from '../utils/exportarPDF';
import { FiltroFechas, StatCard, BadgeTipo, Skeleton, bs, fecha, fechaHora, hoy, inicioMes } from '../shared';

export default function TabCaja({ empresa, logo, direccion, telefono }) {
  const { usuario } = useAuth();
  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const [filtroSucursal, setFiltroSucursal] = useState('todas');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(hoy());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [params, setParams] = useState({ desde: inicioMes(), hasta: hoy() });

  const { data = [], isLoading } = useQuery({
    queryKey: ['reporte-caja', params],
    queryFn: () => getReporteCaja(params),
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
      if (!mapa.has(id)) mapa.set(id, { id, nombre: r.sucursal.nombre, ingresos: 0, egresos: 0 });
      const s = mapa.get(id);
      if (r.tipo === 'ingreso') s.ingresos += parseFloat(r.monto || 0);
      else s.egresos += parseFloat(r.monto || 0);
    });
    return Array.from(mapa.values())
      .map(s => ({ ...s, neto: s.ingresos - s.egresos }))
      .sort((a, b) => b.neto - a.neto);
  }, [filtrado, accesoTodas]);

  const stats = useMemo(() => {
    const ingresos = data.filter(r => r.tipo === 'ingreso').reduce((s, r) => s + parseFloat(r.monto || 0), 0);
    const egresos  = data.filter(r => r.tipo === 'egreso').reduce((s, r) => s + parseFloat(r.monto || 0), 0);
    return { total: data.length, ingresos, egresos, balance: ingresos - egresos };
  }, [data]);

  const exportar = () => exportarPDF({
    titulo:        'Reporte de Caja / Libro Caja',
    subtitulo:     `${fecha(params.desde)} — ${fecha(params.hasta)}`,
    empresa, logo, direccion, telefono,
    generadoPor:   usuario?.nombre,
    columnas:      ['Fecha', 'Tipo', 'Concepto', 'Método de pago', 'Usuario', 'Monto'],
    filas:         filtrado.map(r => [
      fechaHora(r.creado_en),
      r.tipo,
      r.concepto || '-',
      r.metodo_pago || '-',
      r.usuario?.nombre || '-',
      bs(r.monto),
    ]),
    totales: [
      { label: 'Total registros', valor: stats.total },
      { label: 'Total ingresos',  valor: bs(stats.ingresos) },
      { label: 'Total egresos',   valor: bs(stats.egresos) },
      { label: 'Balance',         valor: bs(stats.balance) },
    ],
    nombreArchivo: `reporte-caja-${params.desde}-${params.hasta}.pdf`,
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
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
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
        <StatCard label="Registros"      valor={stats.total}           color="violet"                             Icono={BookOpen}    idx={0} />
        <StatCard label="Total Ingresos" valor={bs(stats.ingresos)}    color="emerald"                            Icono={TrendingUp}  idx={1} />
        <StatCard label="Total Egresos"  valor={bs(stats.egresos)}     color="rose"                               Icono={TrendingDown} idx={2} />
        <StatCard label="Balance"        valor={bs(stats.balance)}     color={stats.balance >= 0 ? 'blue' : 'rose'} Icono={DollarSign} idx={3} />
      </div>

      {accesoTodas && resumenSucursales.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-violet-50 dark:bg-violet-900/20 border-b border-gray-200 dark:border-gray-700/50">
                {['Sucursal', 'Ingresos', 'Egresos', 'Neto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {resumenSucursales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.nombre}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{bs(s.ingresos)}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{bs(s.egresos)}</td>
                  <td className={`px-4 py-3 font-bold ${s.neto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{bs(s.neto)}</td>
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
                {[...(accesoTodas ? ['Sucursal'] : []), 'Fecha', 'Tipo', 'Concepto', 'Método', 'Usuario', 'Monto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {filtrado.length === 0 ? (
                <tr><td colSpan={accesoTodas ? 7 : 6} className="text-center py-10 text-gray-400 dark:text-gray-500">Sin resultados</td></tr>
              ) : filtrado.map((r, i) => (
                <tr key={r.id}
                  className="bg-white dark:bg-gray-900 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors animate-[rpFadeUp_0.3s_ease_forwards] opacity-0"
                  style={{ animationDelay: `${i * 20}ms` }}>
                  {accesoTodas && (
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.sucursal?.nombre || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fechaHora(r.creado_en)}</td>
                  <td className="px-4 py-3"><BadgeTipo tipo={r.tipo} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{r.concepto || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">{r.metodo_pago || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.usuario?.nombre || '-'}</td>
                  <td className={`px-4 py-3 font-semibold ${r.tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {r.tipo === 'egreso' ? '-' : ''}{bs(r.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtrado.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-violet-200 dark:border-violet-700/40">
                  <td colSpan={accesoTodas ? 6 : 5} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 text-sm">BALANCE</td>
                  <td className={`px-4 py-3 font-bold ${stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {bs(stats.balance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

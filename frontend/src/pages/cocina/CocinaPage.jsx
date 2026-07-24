import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ChefHat, Clock, RefreshCw, ShoppingBag } from 'lucide-react';
import { getCocinaOrders, marcarListo } from '../../api/ventas';
import { usePermisos } from '../../hooks/usePermisos';
import socket from '../../socket';

function tiempoTranscurrido(fecha) {
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins === 1) return '1 min';
  return `${mins} min`;
}

export default function CocinaPage() {
  const { tienePermiso } = usePermisos();
  const puedeVer = tienePermiso('cocina', 'ver');
  const qc = useQueryClient();

  const { data: pedidos = [], isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['cocina'],
    queryFn: getCocinaOrders,
    enabled: puedeVer,
  });

  useEffect(() => {
    function onActualizar() {
      qc.invalidateQueries({ queryKey: ['cocina'] });
    }
    socket.on('restaurante:actualizar', onActualizar);
    return () => socket.off('restaurante:actualizar', onActualizar);
  }, [qc]);

  const marcar = useMutation({
    mutationFn: (id) => marcarListo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cocina'] }),
  });

  if (!puedeVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
        <AlertCircle className="w-10 h-10" />
        <p className="font-medium">No tienes permiso para ver esta pantalla</p>
      </div>
    );
  }

  const pendientesMesa   = pedidos.filter(p => p.estado === 'pendiente' && p.tipo !== 'llevar');
  const listosMesa       = pedidos.filter(p => p.estado === 'listo'     && p.tipo !== 'llevar');
  const pendientesLlevar = pedidos.filter(p => p.estado === 'pendiente' && p.tipo === 'llevar');
  const listosLlevar     = pedidos.filter(p => p.estado === 'listo'     && p.tipo === 'llevar');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cocina</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Actualizado: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-BO') : '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Cargando pedidos...</span>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-300 dark:text-gray-600">
          <ChefHat className="w-14 h-14" />
          <p className="font-medium text-gray-500 dark:text-gray-400">Sin pedidos activos</p>
          <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── SECCIÓN MESAS ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mesas</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Nuevos</h3>
                  <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendientesMesa.length}
                  </span>
                </div>
                {pendientesMesa.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                    Sin pedidos nuevos
                  </div>
                ) : (
                  pendientesMesa.map(p => (
                    <PedidoCard key={p.id} pedido={p} onListo={() => marcar.mutate(p.id)} cargando={marcar.isPending && marcar.variables === p.id} />
                  ))
                )}
              </section>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Listo para servir</h3>
                  <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {listosMesa.length}
                  </span>
                </div>
                {listosMesa.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                    Ninguno listo aún
                  </div>
                ) : (
                  listosMesa.map(p => <PedidoCard key={p.id} pedido={p} />)
                )}
              </section>
            </div>
          </div>

          {/* ── SECCIÓN PARA LLEVAR ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-orange-500 uppercase tracking-wider">Para llevar</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Nuevos</h3>
                  <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendientesLlevar.length}
                  </span>
                </div>
                {pendientesLlevar.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                    Sin pedidos para llevar
                  </div>
                ) : (
                  pendientesLlevar.map(p => (
                    <PedidoCard key={p.id} pedido={p} onListo={() => marcar.mutate(p.id)} cargando={marcar.isPending && marcar.variables === p.id} esLlevar />
                  ))
                )}
              </section>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Listo para entregar</h3>
                  <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {listosLlevar.length}
                  </span>
                </div>
                {listosLlevar.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                    Ninguno listo aún
                  </div>
                ) : (
                  listosLlevar.map(p => <PedidoCard key={p.id} pedido={p} esLlevar />)
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PedidoCard({ pedido, onListo, cargando, esLlevar }) {
  const esNuevo = pedido.estado === 'pendiente';

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${
      esNuevo
        ? 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800/50 shadow-sm'
        : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
    }`}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {esLlevar ? (
              <>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-base">
                  #{String(pedido.numero_llevar ?? pedido.id).padStart(3, '0')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white text-base">
                  {pedido.nombre_cliente}
                </span>
              </>
            ) : (
              <span className="font-bold text-gray-900 dark:text-white text-base">
                {pedido.mesa?.nombre}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">#{pedido.id}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            {tiempoTranscurrido(pedido.creado_en)}
          </div>
        </div>
        {!esNuevo && (
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {(pedido.detalles ?? []).map(d => (
          <li key={d.id} className="flex items-center gap-3">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              esNuevo
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}>
              {d.cantidad}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {d.producto?.nombre}
            </span>
            {d.nota && (
              <span className="text-xs text-gray-400 italic ml-auto truncate max-w-[120px]">{d.nota}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Notas del pedido */}
      {pedido.notas && (
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 italic">
          Nota: {pedido.notas}
        </p>
      )}

      {/* Botón marcar listo */}
      {esNuevo && onListo && (
        <button
          onClick={onListo}
          disabled={cargando}
          className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {cargando ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Marcando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Marcar como listo</>
          )}
        </button>
      )}
    </div>
  );
}

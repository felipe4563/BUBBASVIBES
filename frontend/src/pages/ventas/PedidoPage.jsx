import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, RefreshCw, Plus, Minus, Trash2, ShoppingCart,
  Package, CreditCard, XCircle, AlertCircle, CheckCircle2, ChefHat,
} from 'lucide-react';
import { getVenta, agregarItem, actualizarItem, eliminarItem, cobrarVenta, cancelarVenta } from '../../api/ventas';
import { getProductos } from '../../api/productos';
import { getCategorias } from '../../api/categorias';
import { getConfiguracion, BASE_URL } from '../../api/configuracion';
import { useAuth } from '../../hooks/useAuth';
import { usePermisos } from '../../hooks/usePermisos';
import Modal from '../../components/ui/Modal';
import ModalPagoQr from './components/ModalPagoQr';
import { imprimirTicketVenta }  from '../../utils/ticketVenta';

const API_BASE = BASE_URL;

export default function PedidoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const { tienePermiso } = usePermisos();

  const puedeCobrar  = tienePermiso('ventas', 'cobrar');
  const puedeCancelar = tienePermiso('ventas', 'cancelar');
  const puedeCrear   = tienePermiso('ventas', 'crear');

  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [modalCobrar, setModalCobrar] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [tabMobile, setTabMobile] = useState('productos'); // 'productos' | 'orden'
  const [notaEditando, setNotaEditando] = useState(null); // item.id o null
  const [textoNota, setTextoNota] = useState('');

  // Pedido
  const { data: pedido, isLoading: cargandoPedido } = useQuery({
    queryKey: ['venta', id],
    queryFn: () => getVenta(id),
    refetchInterval: 15_000,
  });

  // Categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  });

  // Productos (por categoría si hay filtro)
  const { data: productos = [], isLoading: cargandoProductos } = useQuery({
    queryKey: ['productos-pos', categoriaActiva],
    queryFn: () => getProductos({ solo_vendibles: true, solo_disponibles: true, order_by: 'mas_vendido', ...(categoriaActiva ? { categoria_id: categoriaActiva } : {}) }),
  });

  // Mapa producto_id → item del pedido
  const itemsPorProducto = useMemo(() => {
    return (pedido?.detalles ?? []).reduce((acc, d) => {
      acc[d.producto_id] = d;
      return acc;
    }, {});
  }, [pedido]);

  const { data: config = {} } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
    staleTime: 60_000,
  });

  const total = parseFloat(pedido?.total ?? 0);
  const esPendiente = pedido?.estado === 'pendiente';
  const esListo     = pedido?.estado === 'listo';
  const puedeOperar = esPendiente || esListo;

  // Mutaciones
  const agregar = useMutation({
    mutationFn: ({ producto_id }) => agregarItem(id, { producto_id, cantidad: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venta', id] }),
  });

  const actualizar = useMutation({
    mutationFn: ({ item_id, cantidad }) => actualizarItem(id, item_id, { cantidad }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venta', id] }),
  });

  const guardarNota = useMutation({
    mutationFn: ({ item_id, nota }) => actualizarItem(id, item_id, { nota }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venta', id] });
      setNotaEditando(null);
    },
  });

  const quitar = useMutation({
    mutationFn: (item_id) => eliminarItem(id, item_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['venta', id] }),
  });

  function handleProducto(prod) {
    if (!puedeCrear || !esPendiente) return;
    const existente = itemsPorProducto[prod.id];
    if (existente) {
      actualizar.mutate({ item_id: existente.id, cantidad: existente.cantidad + 1 });
    } else {
      agregar.mutate({ producto_id: prod.id });
    }
  }

  function incrementar(item) {
    actualizar.mutate({ item_id: item.id, cantidad: item.cantidad + 1 });
  }

  function decrementar(item) {
    if (item.cantidad <= 1) {
      quitar.mutate(item.id);
    } else {
      actualizar.mutate({ item_id: item.id, cantidad: item.cantidad - 1 });
    }
  }

  if (cargandoPedido) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>Cargando orden...</span>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400">
        <AlertCircle className="w-10 h-10" />
        <p className="font-medium">Pedido no encontrado</p>
        <button onClick={() => navigate('/ventas')} className="text-sm underline">Volver</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Barra acción fija en móvil (visible al seleccionar productos) ── */}
      {puedeOperar && tabMobile === 'productos' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Total */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                Bs {total.toFixed(2)}
              </p>
            </div>
            {/* Cancelar */}
            {puedeCancelar && esPendiente && (
              <button
                onClick={() => setModalCancelar(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
            )}
            {/* Cobrar */}
            {puedeCobrar && (
              <button
                onClick={() => setModalCobrar(true)}
                disabled={(pedido.detalles?.length ?? 0) === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                Cobrar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/ventas')}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 dark:text-gray-100 truncate">
              {pedido.tipo === 'llevar'
                ? `Para llevar #${String(pedido.numero_llevar ?? pedido.id).padStart(3, '0')} — ${pedido.nombre_cliente}`
                : `${pedido.mesa?.nombre} — Orden #${pedido.id}`}
            </h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              pedido.estado === 'pendiente'   ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              pedido.estado === 'listo'       ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              pedido.estado === 'completado'  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {pedido.estado === 'listo' ? '✓ Listo' : pedido.estado}
            </span>
          </div>
        </div>

        {/* Tabs mobile */}
        <div className="flex md:hidden gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setTabMobile('productos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tabMobile === 'productos'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Menú
          </button>
          <button
            onClick={() => setTabMobile('orden')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tabMobile === 'orden'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Orden
            {(pedido.detalles?.length ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {pedido.detalles.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 gap-4 overflow-hidden pt-4">
        {/* ── Panel izquierdo: productos ──────────────────────────── */}
        <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${tabMobile === 'orden' ? 'hidden md:flex' : 'flex'}`}>
          {/* Filtro categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !categoriaActiva
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoriaActiva === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          <div className="flex-1 overflow-y-auto mt-3 pb-20 md:pb-0">
            {cargandoProductos ? (
              <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
              </div>
            ) : productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400 dark:text-gray-600">
                <Package className="w-8 h-8" />
                <p className="text-sm">No hay productos en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
                {productos.map(prod => {
                  const enOrden = itemsPorProducto[prod.id];
                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleProducto(prod)}
                      disabled={!puedeCrear || !esPendiente}
                      className={`relative flex flex-col rounded-xl border transition-all text-left overflow-hidden ${
                        !puedeCrear || !esPendiente
                          ? 'opacity-50 cursor-not-allowed'
                          : enOrden
                          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                      }`}
                    >
                      {/* Imagen */}
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {prod.imagen ? (
                          <img
                            src={`${API_BASE}${prod.imagen}`}
                            alt={prod.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight line-clamp-2">{prod.nombre}</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                          Bs {parseFloat(prod.precio).toFixed(2)}
                        </p>
                      </div>
                      {/* Badge cantidad */}
                      {enOrden && (
                        <span className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                          {enOrden.cantidad}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: orden ────────────────────────────────── */}
        <aside className={`flex flex-col w-full md:w-[300px] lg:w-[340px] xl:w-[380px] shrink-0 overflow-hidden ${tabMobile === 'productos' ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">

            {/* Cabecera panel */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Orden</span>
              </div>
              {(pedido.detalles?.length ?? 0) > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                  {pedido.detalles.length} ítem{pedido.detalles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Lista items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {(!pedido.detalles || pedido.detalles.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-300 dark:text-gray-600">
                  <ShoppingCart className="w-10 h-10" />
                  <p className="text-sm">Sin productos todavía</p>
                </div>
              ) : (
                pedido.detalles.map(item => (
                  <div key={item.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {item.producto?.nombre}
                        </p>
                        <p className="text-xs text-gray-400">
                          Bs {parseFloat(item.precio).toFixed(2)} c/u
                        </p>
                      </div>
                      {esPendiente && puedeCrear ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => decrementar(item)}
                            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => incrementar(item)}
                            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 shrink-0">×{item.cantidad}</span>
                      )}
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 w-14 text-right shrink-0">
                        Bs {(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                      </p>
                      {esPendiente && puedeCrear && (
                        <button
                          onClick={() => quitar.mutate(item.id)}
                          className="shrink-0 p-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Nota por item */}
                    {esPendiente && puedeCrear ? (
                      notaEditando === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={textoNota}
                            onChange={e => setTextoNota(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') guardarNota.mutate({ item_id: item.id, nota: textoNota });
                              if (e.key === 'Escape') setNotaEditando(null);
                            }}
                            placeholder="Ej: sin cebolla, bien cocido..."
                            className="flex-1 text-xs border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => guardarNota.mutate({ item_id: item.id, nota: textoNota })}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setNotaEditando(null)}
                            className="text-xs text-gray-400 px-1 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : item.nota ? (
                        <button
                          onClick={() => { setNotaEditando(item.id); setTextoNota(item.nota); }}
                          className="text-xs text-amber-600 dark:text-amber-400 italic text-left hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                        >
                          Nota: {item.nota}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setNotaEditando(item.id); setTextoNota(''); }}
                          className="text-xs text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                        >
                          + agregar nota
                        </button>
                      )
                    ) : item.nota ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 italic">Nota: {item.nota}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {/* ── Total y acciones ── */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">

              {/* Total */}
              <div className="px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/40">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  Bs {total.toFixed(2)}
                </span>
              </div>

              {/* Banner listo para servir */}
              {esListo && (
                <div className="mx-3 mb-2 flex items-center gap-2 justify-center py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold">
                  <ChefHat className="w-4 h-4" /> ¡Listo para servir!
                </div>
              )}

              {/* Botones de acción */}
              {puedeOperar && (
                <div className="p-3 space-y-2">
                  {puedeCobrar && (
                    <button
                      onClick={() => setModalCobrar(true)}
                      disabled={(pedido.detalles?.length ?? 0) === 0}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold text-base transition-colors shadow-sm"
                    >
                      <CreditCard className="w-5 h-5" /> Cobrar
                    </button>
                  )}
                  {puedeCancelar && esPendiente && (
                    <button
                      onClick={() => setModalCancelar(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Cancelar orden
                    </button>
                  )}
                </div>
              )}

              {!puedeOperar && (
                <div className={`mx-3 mb-3 flex items-center gap-2 justify-center py-2.5 rounded-xl text-sm font-medium ${
                  pedido.estado === 'completado'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  Orden {pedido.estado}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal cobrar */}
      {modalCobrar && (
        <ModalCobrar
          total={total}
          pedidoId={id}
          pedido={pedido}
          config={config}
          onClose={() => setModalCobrar(false)}
          onExito={() => {
            qc.invalidateQueries({ queryKey: ['mesas'] });
            qc.invalidateQueries({ queryKey: ['ventas'] });
            navigate('/ventas');
          }}
        />
      )}

      {/* Modal cancelar */}
      {modalCancelar && (
        <ModalCancelar
          pedidoId={id}
          onClose={() => setModalCancelar(false)}
          onExito={() => {
            setModalCancelar(false);
            qc.invalidateQueries({ queryKey: ['venta', id] });
            qc.invalidateQueries({ queryKey: ['mesas'] });
            qc.invalidateQueries({ queryKey: ['ventas'] });
            navigate('/ventas');
          }}
        />
      )}
    </div>
  );
}

/* ─── Modal Cobrar ──────────────────────────────────────────────────────── */

function ModalCobrar({ total, pedidoId, pedido, config, onClose, onExito }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [error, setError] = useState(null);
  const [pagoQr, setPagoQr] = useState(null);

  const cobrar = useMutation({
    mutationFn: () => cobrarVenta(pedidoId, { metodo_pago: metodo, monto_recibido: total }),
    onSuccess: (resultado) => {
      if (resultado.pago_qr) {
        setPagoQr(resultado.pago_qr);
      } else {
        onExito();
      }
    },
    onError: (err) => setError(err?.response?.data?.mensaje ?? 'Error al cobrar'),
  });

  if (pagoQr) {
    return (
      <ModalPagoQr
        pedidoId={pedidoId}
        pagoQr={pagoQr}
        onClose={onClose}
        onCompletado={() => onExito()}
        onReintentar={() => cobrar.mutate()}
      />
    );
  }

  return (
    <Modal titulo="Cobrar orden" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-5">
        {/* Total */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total a cobrar</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">Bs {total.toFixed(2)}</p>
        </div>

        {/* Método de pago */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'efectivo', label: 'Efectivo' },
              { id: 'qr',       label: 'QR / Transferencia' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { setMetodo(m.id); setError(null); }}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  metodo === m.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => cobrar.mutate()}
            disabled={cobrar.isPending}
            className="px-5 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {cobrar.isPending ? 'Procesando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Modal Cancelar ────────────────────────────────────────────────────── */

function ModalCancelar({ pedidoId, onClose, onExito }) {
  const [error, setError] = useState(null);

  const cancelar = useMutation({
    mutationFn: () => cancelarVenta(pedidoId),
    onSuccess: onExito,
    onError: (err) => setError(err?.response?.data?.mensaje ?? 'Error al cancelar'),
  });

  return (
    <Modal titulo="Cancelar orden" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          ¿Estás seguro de que deseas cancelar esta orden? La mesa quedará disponible.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            No, mantener
          </button>
          <button
            onClick={() => cancelar.mutate()}
            disabled={cancelar.isPending}
            className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
          >
            {cancelar.isPending ? 'Cancelando...' : 'Sí, cancelar orden'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

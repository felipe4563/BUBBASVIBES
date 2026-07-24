import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, AlertCircle, Package, ShoppingCart, ShoppingBag,
  Plus, Minus, Trash2, CreditCard, Wallet, ChevronRight, LayoutGrid,
} from 'lucide-react';
import { getMesas } from '../../api/mesas';
import { getVentas, crearVentaCompleta, cobrarVenta } from '../../api/ventas';
import { getEstadoCajas } from '../../api/caja';
import { getProductos } from '../../api/productos';
import { getCategorias } from '../../api/categorias';
import { BASE_URL } from '../../api/configuracion';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuth } from '../../hooks/useAuth';
import ModalLlevar from './components/ModalLlevar';
import ModalMesas from './components/ModalMesas';
import CategoriasBar from './components/CategoriasBar';
import ModalPagoQr from './components/ModalPagoQr';
import SelectorOpcionModal from './components/SelectorOpcionModal';
import Modal from '../../components/ui/Modal';
import socket from '../../socket';

export default function VentasPage() {
  const { tienePermiso } = usePermisos();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const puedeVer    = tienePermiso('ventas', 'ver');
  const puedeCrear  = tienePermiso('ventas', 'crear');
  const puedeCobrar = tienePermiso('ventas', 'cobrar');

  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [carrito, setCarrito] = useState([]); // [{producto_id, nombre, precio, cantidad, nota}]
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null); // id o null
  const [modoLlevar, setModoLlevar] = useState(null); // nombre_cliente o null
  const [modalLlevar, setModalLlevar] = useState(false);
  const [modalMesas, setModalMesas] = useState(false);
  const [modalCobrar, setModalCobrar] = useState(false);
  const [tabMobile, setTabMobile] = useState('productos'); // 'productos' | 'orden'
  const [selectorOpcion, setSelectorOpcion] = useState(null); // producto con grupo_opciones, o null

  const { data: mesas = [], isLoading: cargandoMesas } = useQuery({
    queryKey: ['mesas'],
    queryFn: getMesas,
    enabled: puedeVer,
  });

  const { data: cajasEstado = [], isLoading: cargandoCaja } = useQuery({
    queryKey: ['caja-estado', usuario?.sucursal_activa?.id],
    queryFn: () => getEstadoCajas(usuario?.sucursal_activa?.id),
    refetchInterval: 60_000,
    enabled: puedeVer && !!usuario?.sucursal_activa?.id,
  });

  // sesión abierta del usuario actual (no la primera que aparezca en la sucursal), usada como caja operativa de la venta
  const cajaActiva = cajasEstado.map(c => c.sesion_abierta).find(s => s?.usuario_id === usuario?.id) ?? null;

  const { data: pedidosActivos = [] } = useQuery({
    queryKey: ['ventas', 'activos'],
    queryFn: () => getVentas({ estado: 'pendiente,listo' }),
    enabled: puedeVer,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  });

  const { data: productos = [], isLoading: cargandoProductos } = useQuery({
    queryKey: ['productos-pos', categoriaActiva],
    queryFn: () => getProductos({ solo_vendibles: true, solo_disponibles: true, order_by: 'mas_vendido', ...(categoriaActiva ? { categoria_id: categoriaActiva } : {}) }),
  });

  useEffect(() => {
    function onActualizar() {
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
    }
    socket.on('restaurante:actualizar', onActualizar);
    return () => socket.off('restaurante:actualizar', onActualizar);
  }, [queryClient]);

  const pedidoPorMesa = pedidosActivos.reduce((acc, p) => {
    if (p.mesa_id) acc[p.mesa_id] = p;
    return acc;
  }, {});

  const cantidadPorProducto = useMemo(() => {
    return carrito.reduce((acc, it) => { acc[it.producto_id] = (acc[it.producto_id] ?? 0) + it.cantidad; return acc; }, {});
  }, [carrito]);

  const total = carrito.reduce((sum, it) => sum + it.cantidad * it.precio, 0);
  const totalItems = carrito.reduce((sum, it) => sum + it.cantidad, 0);
  const puedeCobrarAhora = totalItems > 0 && (mesaSeleccionada != null || modoLlevar != null);

  function agregarAlCarrito(prod, nota) {
    setCarrito((prev) => {
      const existente = prev.find((it) => it.producto_id === prod.id && it.nota === nota);
      if (existente) {
        return prev.map((it) => it === existente ? { ...it, cantidad: it.cantidad + 1 } : it);
      }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio: parseFloat(prod.precio), cantidad: 1, nota }];
    });
  }

  function handleProducto(prod) {
    if (!puedeCrear) return;
    if (prod.grupo_opciones) {
      setSelectorOpcion(prod);
      return;
    }
    agregarAlCarrito(prod, null);
  }

  function elegirOpcion(nota) {
    agregarAlCarrito(selectorOpcion, nota);
    setSelectorOpcion(null);
  }

  function incrementar(producto_id, nota) {
    setCarrito((prev) => prev.map((it) => it.producto_id === producto_id && it.nota === nota ? { ...it, cantidad: it.cantidad + 1 } : it));
  }

  function decrementar(producto_id, nota) {
    setCarrito((prev) => {
      const item = prev.find((it) => it.producto_id === producto_id && it.nota === nota);
      if (item.cantidad <= 1) return prev.filter((it) => it !== item);
      return prev.map((it) => it === item ? { ...it, cantidad: it.cantidad - 1 } : it);
    });
  }

  function quitar(producto_id, nota) {
    setCarrito((prev) => prev.filter((it) => !(it.producto_id === producto_id && it.nota === nota)));
  }

  function handleClickMesaDisponible(mesa) {
    setModoLlevar(null);
    setMesaSeleccionada((prev) => prev === mesa.id ? null : mesa.id);
  }

  function handleClickMesaOcupada(mesa) {
    const pedido = pedidoPorMesa[mesa.id];
    if (pedido) navigate(`/ventas/pedido/${pedido.id}`);
  }

  function limpiarTodo() {
    setCarrito([]);
    setMesaSeleccionada(null);
    setModoLlevar(null);
  }

  const mesaActual = mesas.find((m) => m.id === mesaSeleccionada);
  const mesasOcupadas = mesas.filter((m) => m.estado === 'ocupada' && pedidoPorMesa[m.id]);

  if (!puedeVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
        <AlertCircle className="w-10 h-10" />
        <p className="text-sm font-medium">No tienes permiso para ver ventas</p>
      </div>
    );
  }

  if (!cargandoCaja && !cajaActiva) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-amber-600 dark:text-amber-400">
        <Wallet className="w-10 h-10" />
        <p className="text-sm font-medium">No hay caja abierta</p>
        <button onClick={() => navigate('/caja')} className="text-sm underline flex items-center gap-1">
          Ir a Caja <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h1 className="font-bold text-gray-800 dark:text-gray-100">Ventas</h1>
        <div className="flex md:hidden gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setTabMobile('productos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tabMobile === 'productos' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
          >
            Menú
          </button>
          <button
            onClick={() => setTabMobile('orden')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tabMobile === 'orden' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
          >
            Orden
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden pt-4">
        {/* Panel izquierdo: productos */}
        <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${tabMobile === 'orden' ? 'hidden md:flex' : 'flex'}`}>
          <CategoriasBar
            categorias={categorias}
            categoriaActiva={categoriaActiva}
            onSeleccionar={setCategoriaActiva}
          />

          <div className="flex-1 overflow-y-auto mt-2 pb-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {productos.map((prod) => {
                  const cantidadEnCarrito = cantidadPorProducto[prod.id];
                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleProducto(prod)}
                      disabled={!puedeCrear}
                      className={`relative flex flex-col rounded-xl border transition-all text-left overflow-hidden ${
                        !puedeCrear
                          ? 'opacity-50 cursor-not-allowed'
                          : cantidadEnCarrito
                          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                      }`}
                    >
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {prod.imagen ? (
                          <img src={`${BASE_URL}${prod.imagen}`} alt={prod.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight line-clamp-2">{prod.nombre}</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">Bs {parseFloat(prod.precio).toFixed(2)}</p>
                      </div>
                      {cantidadEnCarrito && (
                        <span className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                          {cantidadEnCarrito}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: orden + mesas + cobro */}
        <aside className={`flex flex-col w-full md:w-[320px] lg:w-[360px] xl:w-[400px] shrink-0 overflow-y-auto gap-4 ${tabMobile === 'productos' ? 'hidden md:flex' : 'flex'}`}>

          {/* Carrito */}
          <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Orden</span>
              </div>
              {carrito.length > 0 && (
                <button onClick={limpiarTodo} className="text-xs text-red-500 hover:text-red-600">Vaciar</button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-300 dark:text-gray-600">
                  <ShoppingCart className="w-8 h-8" />
                  <p className="text-xs">Toca un producto para agregarlo</p>
                </div>
              ) : (
                carrito.map((it) => (
                  <div key={`${it.producto_id}|${it.nota ?? ''}`} className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{it.nombre}</p>
                      {it.nota && <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{it.nota}</p>}
                      <p className="text-xs text-gray-400">Bs {it.precio.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => decrementar(it.producto_id, it.nota)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-gray-800 dark:text-gray-100">{it.cantidad}</span>
                      <button onClick={() => incrementar(it.producto_id, it.nota)} className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => quitar(it.producto_id, it.nota)} className="shrink-0 p-1 text-gray-300 dark:text-gray-600 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Bs {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Mesa / para llevar */}
          <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Mesa</span>
              <button
                onClick={() => setModalLlevar(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  modoLlevar ? 'bg-orange-500 text-white' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {modoLlevar ? `Llevar: ${modoLlevar}` : 'Para llevar'}
              </button>
            </div>

            <div className="p-3 flex flex-col gap-3">
              <button
                onClick={() => setModalMesas(true)}
                disabled={cargandoMesas}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-colors ${
                  mesaActual
                    ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <LayoutGrid className={`w-4.5 h-4.5 shrink-0 ${mesaActual ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                <span className="flex-1 min-w-0">
                  {mesaActual ? (
                    <>
                      <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{mesaActual.nombre}</span>
                      <span className="block text-xs text-gray-400">{mesaActual.area?.nombre ?? 'Sin área'} · {mesaActual.asientos} asientos</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {cargandoMesas ? 'Cargando mesas...' : 'Elegir mesa'}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
              </button>

              {mesasOcupadas.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Mesas ocupadas ({mesasOcupadas.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {mesasOcupadas.map((mesa) => (
                      <button
                        key={mesa.id}
                        onClick={() => handleClickMesaOcupada(mesa)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {mesa.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cobrar */}
          {puedeCobrar && (
            <button
              onClick={() => setModalCobrar(true)}
              disabled={!puedeCobrarAhora}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold text-base transition-colors shadow-sm shrink-0"
            >
              <CreditCard className="w-5 h-5" /> Cobrar
            </button>
          )}
        </aside>
      </div>

      {modalLlevar && (
        <ModalLlevar
          cargando={false}
          onClose={() => setModalLlevar(false)}
          onConfirmar={(nombre) => {
            setMesaSeleccionada(null);
            setModoLlevar(nombre || 'Cliente');
            setModalLlevar(false);
          }}
        />
      )}

      {modalMesas && (
        <ModalMesas
          mesas={mesas}
          pedidoPorMesa={pedidoPorMesa}
          mesaSeleccionada={mesaSeleccionada}
          onSeleccionar={(mesa) => handleClickMesaDisponible(mesa)}
          onClose={() => setModalMesas(false)}
        />
      )}

      {modalCobrar && (
        <ModalCobrar
          total={total}
          carrito={carrito}
          tipo={modoLlevar ? 'llevar' : 'mesa'}
          mesaId={mesaSeleccionada}
          nombreCliente={modoLlevar}
          sesionCajaId={cajaActiva?.id}
          onClose={() => setModalCobrar(false)}
          onExito={() => {
            limpiarTodo();
            setModalCobrar(false);
            queryClient.invalidateQueries({ queryKey: ['mesas'] });
            queryClient.invalidateQueries({ queryKey: ['ventas'] });
          }}
        />
      )}

      {selectorOpcion && (
        <SelectorOpcionModal
          producto={selectorOpcion}
          onElegir={elegirOpcion}
          onClose={() => setSelectorOpcion(null)}
        />
      )}
    </div>
  );
}

/* ─── Modal Cobrar ──────────────────────────────────────────────────────── */

function ModalCobrar({ total, carrito, tipo, mesaId, nombreCliente, sesionCajaId, onClose, onExito }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [error, setError] = useState(null);
  const [pagoQrEstado, setPagoQrEstado] = useState(null); // { pedidoId, pagoQr } | null

  const iniciar = useMutation({
    mutationFn: () => crearVentaCompleta({
      tipo,
      mesa_id: tipo === 'mesa' ? mesaId : undefined,
      nombre_cliente: nombreCliente ?? undefined,
      items: carrito.map((it) => ({ producto_id: it.producto_id, cantidad: it.cantidad, nota: it.nota })),
      metodo_pago: metodo,
      monto_recibido: total,
      sesion_caja_id: sesionCajaId,
    }),
    onSuccess: (resultado) => {
      if (resultado.pago_qr) {
        setPagoQrEstado({ pedidoId: resultado.pedido.id, pagoQr: resultado.pago_qr });
      } else {
        onExito();
      }
    },
    onError: (err) => setError(err?.response?.data?.mensaje ?? 'Error al cobrar'),
  });

  const reintentar = useMutation({
    mutationFn: () => cobrarVenta(pagoQrEstado.pedidoId, { metodo_pago: 'qr', monto_recibido: total }),
    onSuccess: (resultado) => setPagoQrEstado({ pedidoId: resultado.pedido.id, pagoQr: resultado.pago_qr }),
    onError: (err) => setError(err?.response?.data?.mensaje ?? 'Error al generar el QR'),
  });

  if (pagoQrEstado) {
    return (
      <ModalPagoQr
        pedidoId={pagoQrEstado.pedidoId}
        pagoQr={pagoQrEstado.pagoQr}
        onClose={onClose}
        onCompletado={() => onExito()}
        onReintentar={() => reintentar.mutate()}
      />
    );
  }

  return (
    <Modal titulo="Cobrar orden" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-5">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total a cobrar</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">Bs {total.toFixed(2)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: 'efectivo', label: 'Efectivo' }, { id: 'qr', label: 'QR / Transferencia' }].map((m) => (
              <button
                key={m.id}
                onClick={() => { setMetodo(m.id); setError(null); }}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  metodo === m.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => iniciar.mutate()}
            disabled={iniciar.isPending}
            className="px-5 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {iniciar.isPending ? 'Procesando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

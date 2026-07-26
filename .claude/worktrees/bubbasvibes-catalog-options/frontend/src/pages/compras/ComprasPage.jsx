import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermisos } from '../../hooks/usePermisos';
import {
  getProveedores, crearProveedor, actualizarProveedor, desactivarProveedor,
  getCompras, crearCompra, recibirCompra,
} from '../../api/compras';
import { getProductos } from '../../api/productos';
import {
  Truck, Plus, Search, X, ChevronDown, ChevronUp, CheckCircle2,
  Clock, PackageCheck, Trash2, Edit2, Users, ShoppingCart, AlertTriangle,
} from 'lucide-react';

/* ─── helpers ─── */
const fmtBs = (n) => `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
const fmtFecha = (s) => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function BadgeEstado({ estado }) {
  if (estado === 'recibido') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-3 h-3" />Recibido
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" />Pendiente
    </span>
  );
}

/* ─── modal proveedor ─── */
function ModalProveedor({ proveedor, onClose, onGuardar }) {
  const [form, setForm] = useState({
    nombre:    proveedor?.nombre    ?? '',
    contacto:  proveedor?.contacto  ?? '',
    telefono:  proveedor?.telefono  ?? '',
    email:     proveedor?.email     ?? '',
    direccion: proveedor?.direccion ?? '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setError('');
    onGuardar(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 rounded-t-2xl bg-violet-600 flex items-center justify-between">
          <h2 className="text-white font-semibold">{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {[
            { k: 'nombre',    label: 'Nombre *',   placeholder: 'Nombre del proveedor' },
            { k: 'contacto',  label: 'Contacto',   placeholder: 'Persona de contacto' },
            { k: 'telefono',  label: 'Teléfono',   placeholder: '+591...' },
            { k: 'email',     label: 'Email',       placeholder: 'correo@ejemplo.com' },
            { k: 'direccion', label: 'Dirección',  placeholder: 'Dirección' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</label>
              <input
                value={form[k]}
                onChange={set(k)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          ))}
          {error && <p className="text-rose-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── modal nueva compra ─── */
const ITEM_VACIO = { producto_id: '', cantidad: 1, costo_unitario: '' };

function ModalCompra({ proveedores, productos, onClose, onGuardar }) {
  const [proveedorId, setProveedorId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ ...ITEM_VACIO }]);
  const [error, setError] = useState('');

  const setItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(prev => [...prev, { ...ITEM_VACIO }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const total = useMemo(() =>
    items.reduce((s, it) => s + (parseFloat(it.costo_unitario || 0) * parseInt(it.cantidad || 0)), 0),
    [items]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!proveedorId) { setError('Selecciona un proveedor'); return; }
    const validos = items.filter(it => it.producto_id && it.cantidad > 0 && parseFloat(it.costo_unitario) > 0);
    if (!validos.length) { setError('Agrega al menos un ítem válido'); return; }
    setError('');
    onGuardar({
      proveedor_id: Number(proveedorId),
      notas,
      items: validos.map(it => ({
        producto_id: Number(it.producto_id),
        cantidad: Number(it.cantidad),
        costo_unitario: parseFloat(it.costo_unitario),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 rounded-t-2xl bg-indigo-600 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-white font-semibold">Nueva Compra</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* proveedor + notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Proveedor *</label>
              <select
                value={proveedorId}
                onChange={e => setProveedorId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Notas</label>
              <input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Observaciones..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ítems</label>
              <button type="button" onClick={addItem} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={it.producto_id}
                      onChange={e => setItem(i, 'producto_id', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Producto...</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="1" placeholder="Ctd."
                      value={it.cantidad}
                      onChange={e => setItem(i, 'cantidad', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="0" step="0.01" placeholder="Costo Bs"
                      value={it.costo_unitario}
                      onChange={e => setItem(i, 'costo_unitario', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* total */}
          <div className="flex justify-end">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-5 py-3 text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total estimado</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{fmtBs(total)}</p>
            </div>
          </div>

          {error && <p className="text-rose-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">Crear Compra</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── fila/detalle compra ─── */
function CompraRow({ compra, idx, puedoRecibir, onRecibir }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
        style={{ animation: 'cmpFadeUp .3s ease both', animationDelay: `${idx * 20}ms` }}
        onClick={() => setAbierto(v => !v)}
      >
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtFecha(compra.creado_en)}</td>
        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{compra.id}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{compra.proveedor?.nombre ?? '—'}</td>
        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{compra.detalles?.length ?? 0}</td>
        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-right">{fmtBs(compra.total)}</td>
        <td className="px-4 py-3"><BadgeEstado estado={compra.estado} /></td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
            {puedoRecibir && compra.estado === 'pendiente' && (
              <button
                onClick={() => onRecibir(compra.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                <PackageCheck className="w-3.5 h-3.5" />Recibir
              </button>
            )}
            <button onClick={() => setAbierto(v => !v)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {abierto && compra.detalles?.length > 0 && (
        <tr className="bg-gray-50 dark:bg-gray-700/20">
          <td colSpan={7} className="px-6 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500">
                  <th className="text-left pb-1.5 font-medium">Producto</th>
                  <th className="text-right pb-1.5 font-medium">Cantidad</th>
                  <th className="text-right pb-1.5 font-medium">Costo Unit.</th>
                  <th className="text-right pb-1.5 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {compra.detalles.map(d => (
                  <tr key={d.id}>
                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{d.producto?.nombre ?? '—'}</td>
                    <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{d.cantidad}</td>
                    <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{fmtBs(d.costo_unitario)}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-900 dark:text-white">{fmtBs(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {compra.notas && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">Nota: {compra.notas}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── tarjeta compra móvil ─── */
function CompraCard({ compra, idx, puedoRecibir, onRecibir }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      style={{ animation: 'cmpFadeUp .35s ease both', animationDelay: `${idx * 30}ms` }}
    >
      <button className="w-full px-4 py-3 text-left" onClick={() => setAbierto(v => !v)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">#{compra.id} — {compra.proveedor?.nombre ?? '—'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fmtFecha(compra.creado_en)}</p>
          </div>
          <div className="flex items-center gap-2">
            <BadgeEstado estado={compra.estado} />
            {abierto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{compra.detalles?.length ?? 0} ítem{(compra.detalles?.length ?? 0) !== 1 ? 's' : ''}</span>
          <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{fmtBs(compra.total)}</span>
        </div>
      </button>
      {abierto && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
          {compra.detalles?.map(d => (
            <div key={d.id} className="flex justify-between text-xs">
              <span className="text-gray-700 dark:text-gray-300">{d.producto?.nombre ?? '—'} × {d.cantidad}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{fmtBs(d.subtotal)}</span>
            </div>
          ))}
          {compra.notas && <p className="text-xs text-gray-500 italic">Nota: {compra.notas}</p>}
          {puedoRecibir && compra.estado === 'pendiente' && (
            <button
              onClick={() => onRecibir(compra.id)}
              className="w-full mt-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <PackageCheck className="w-3.5 h-3.5" />Marcar como Recibido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── tab proveedores ─── */
function TabProveedores({ proveedores, puedoCrear, puedoEditar, onCrear, onEditar, onEliminar }) {
  const [buscar, setBuscar] = useState('');
  const filtrados = useMemo(() =>
    proveedores.filter(p => p.nombre.toLowerCase().includes(buscar.toLowerCase())),
    [proveedores, buscar]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {puedoCrear && (
          <button onClick={onCrear} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />Nuevo
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <Users className="w-10 h-10 opacity-40" />
            <p className="text-sm">Sin proveedores</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Nombre', 'Contacto', 'Teléfono', 'Email', 'Dirección', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtrados.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  style={{ animation: 'cmpFadeUp .3s ease both', animationDelay: `${i * 20}ms` }}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.contacto ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.direccion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {puedoEditar && (
                        <>
                          <button onClick={() => onEditar(p)} className="text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onEliminar(p.id)} className="text-gray-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── página principal ─── */
export default function ComprasPage() {
  const { tienePermiso } = usePermisos();
  const qc = useQueryClient();

  const puedoVer     = tienePermiso('compras', 'ver');
  const puedoCrear   = tienePermiso('compras', 'crear');
  const puedoRecibir = tienePermiso('compras', 'recibir');
  const puedoEditarProv = tienePermiso('proveedores', 'editar');
  const puedoCrearProv  = tienePermiso('proveedores', 'crear');

  const [tab, setTab] = useState('compras'); // 'compras' | 'proveedores'
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalCompra, setModalCompra] = useState(false);
  const [modalProv, setModalProv] = useState(null); // null | 'nuevo' | proveedor
  const [toast, setToast] = useState(null);

  const mostrarToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: compras = [], isLoading: loadingCompras } = useQuery({
    queryKey: ['compras'],
    queryFn: getCompras,
    enabled: puedoVer,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: getProveedores,
    enabled: puedoVer,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: getProductos,
    enabled: puedoCrear,
  });

  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos]);

  const mutCrearCompra = useMutation({
    mutationFn: crearCompra,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); setModalCompra(false); mostrarToast('Compra creada'); },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error al crear compra', false),
  });

  const mutRecibir = useMutation({
    mutationFn: recibirCompra,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); qc.invalidateQueries({ queryKey: ['inventario'] }); qc.invalidateQueries({ queryKey: ['productos'] }); mostrarToast('Compra recibida — stock actualizado'); },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error al recibir compra', false),
  });

  const mutCrearProv = useMutation({
    mutationFn: crearProveedor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setModalProv(null); mostrarToast('Proveedor creado'); },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error', false),
  });

  const mutEditarProv = useMutation({
    mutationFn: ({ id, datos }) => actualizarProveedor(id, datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setModalProv(null); mostrarToast('Proveedor actualizado'); },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error', false),
  });

  const mutEliminarProv = useMutation({
    mutationFn: desactivarProveedor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); mostrarToast('Proveedor desactivado'); },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error', false),
  });

  const comprasFiltradas = useMemo(() => {
    let c = compras;
    if (filtroEstado !== 'todos') c = c.filter(x => x.estado === filtroEstado);
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      c = c.filter(x =>
        String(x.id).includes(q) ||
        x.proveedor?.nombre?.toLowerCase().includes(q) ||
        x.notas?.toLowerCase().includes(q)
      );
    }
    return c;
  }, [compras, filtroEstado, buscar]);

  // resumen
  const totalPendiente = useMemo(() => compras.filter(c => c.estado === 'pendiente').reduce((s, c) => s + parseFloat(c.total ?? 0), 0), [compras]);
  const totalRecibido  = useMemo(() => compras.filter(c => c.estado === 'recibido').reduce((s, c) => s + parseFloat(c.total ?? 0), 0), [compras]);

  const handleGuardarProv = useCallback((datos) => {
    if (modalProv === 'nuevo') mutCrearProv.mutate(datos);
    else mutEditarProv.mutate({ id: modalProv.id, datos });
  }, [modalProv, mutCrearProv, mutEditarProv]);

  if (!puedoVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Truck className="w-12 h-12" />
        <p className="text-sm">Sin acceso al módulo de compras</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cmpFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
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

      {modalCompra && (
        <ModalCompra
          proveedores={proveedores}
          productos={productosActivos}
          onClose={() => setModalCompra(false)}
          onGuardar={(d) => mutCrearCompra.mutate(d)}
        />
      )}

      {modalProv && (
        <ModalProveedor
          proveedor={modalProv === 'nuevo' ? null : modalProv}
          onClose={() => setModalProv(null)}
          onGuardar={handleGuardarProv}
        />
      )}

      <div className="space-y-6">
        {/* header */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -right-16 w-48 h-48 bg-white/5 rounded-full" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Compras</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Órdenes de compra y proveedores</p>
            </div>
            {puedoCrear && (
              <button
                onClick={() => setModalCompra(true)}
                className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                Nueva Compra
              </button>
            )}
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total compras', value: compras.length, sub: 'registros', color: 'indigo', delay: 100 },
            { label: 'Pendiente', value: fmtBs(totalPendiente), sub: `${compras.filter(c=>c.estado==='pendiente').length} compras`, color: 'amber', delay: 160 },
            { label: 'Recibido', value: fmtBs(totalRecibido), sub: `${compras.filter(c=>c.estado==='recibido').length} compras`, color: 'emerald', delay: 220 },
          ].map(({ label, value, sub, color, delay }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 relative overflow-hidden"
              style={{ animation: 'cmpFadeUp .4s ease both', animationDelay: `${delay}ms` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-${color}-500`} />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {[
            { v: 'compras',     label: 'Compras',    Icono: ShoppingCart },
            { v: 'proveedores', label: 'Proveedores', Icono: Users },
          ].map(({ v, label, Icono }) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === v
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icono className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* tab compras */}
        {tab === 'compras' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={buscar}
                  onChange={e => setBuscar(e.target.value)}
                  placeholder="Buscar por # o proveedor..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {[
                  { v: 'todos',    label: 'Todas' },
                  { v: 'pendiente', label: 'Pendientes' },
                  { v: 'recibido', label: 'Recibidas' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setFiltroEstado(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filtroEstado === v
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loadingCompras ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : comprasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <ShoppingCart className="w-12 h-12 opacity-40" />
                <p className="text-sm">Sin compras{filtroEstado !== 'todos' ? ' con ese filtro' : ''}</p>
                {puedoCrear && (
                  <button onClick={() => setModalCompra(true)} className="text-indigo-600 text-sm font-medium hover:underline">
                    Crear primera compra
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* mobile */}
                <div className="sm:hidden space-y-2">
                  {comprasFiltradas.map((c, i) => (
                    <CompraCard key={c.id} compra={c} idx={i} puedoRecibir={puedoRecibir} onRecibir={(id) => mutRecibir.mutate(id)} />
                  ))}
                </div>
                {/* desktop */}
                <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        {['Fecha', '#', 'Proveedor', 'Ítems', 'Total', 'Estado', ''].map(h => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${h === 'Total' ? 'text-right' : h === 'Ítems' ? 'text-center' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {comprasFiltradas.map((c, i) => (
                        <CompraRow key={c.id} compra={c} idx={i} puedoRecibir={puedoRecibir} onRecibir={(id) => mutRecibir.mutate(id)} />
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    {comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* tab proveedores */}
        {tab === 'proveedores' && (
          <TabProveedores
            proveedores={proveedores}
            puedoCrear={puedoCrearProv}
            puedoEditar={puedoEditarProv}
            onCrear={() => setModalProv('nuevo')}
            onEditar={(p) => setModalProv(p)}
            onEliminar={(id) => mutEliminarProv.mutate(id)}
          />
        )}
      </div>
    </>
  );
}

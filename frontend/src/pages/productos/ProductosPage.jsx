import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, Tag, ListChecks, ChevronUp, ChevronDown, AlertCircle, RefreshCw, ImagePlus, X } from 'lucide-react';
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } from '../../api/categorias';
import { getProductos, crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto } from '../../api/productos';
import { getGruposOpciones, crearGrupoOpciones, actualizarGrupoOpciones, eliminarGrupoOpciones } from '../../api/gruposOpciones';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';
import { getSucursales } from '../../api/sucursales';
import Modal from '../../components/ui/Modal';
import { BASE_URL } from '../../api/configuracion';

const API_BASE = BASE_URL;

const TABS = [
  { id: 'categorias', label: 'Categorías', Icono: Tag },
  { id: 'productos',  label: 'Productos',  Icono: Package },
  { id: 'opciones',   label: 'Opciones',   Icono: ListChecks },
];

export default function ProductosPage() {
  const { tienePermiso } = usePermisos();
  const puedeVer    = tienePermiso('productos', 'ver');
  const puedeCrear  = tienePermiso('productos', 'crear');
  const puedeEditar = tienePermiso('productos', 'editar');
  const puedeEliminar = tienePermiso('productos', 'eliminar');
  const [tab, setTab] = useState('categorias');

  if (!puedeVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
        <AlertCircle className="w-10 h-10" />
        <p className="font-medium">No tienes permiso para ver productos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Productos</h1>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, Icono }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icono className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'categorias' && <TabCategorias puedeCrear={puedeCrear} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />}
      {tab === 'productos'  && <TabProductos  puedeCrear={puedeCrear} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />}
      {tab === 'opciones' && <TabOpciones puedeCrear={puedeCrear} puedeEditar={puedeEditar} puedeEliminar={puedeEliminar} />}
    </div>
  );
}

/* ─── Tab Categorías ─────────────────────────────────────────────────────── */

function TabCategorias({ puedeCrear, puedeEditar, puedeEliminar }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const { data: categorias = [], isLoading } = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });

  const guardar = useMutation({
    mutationFn: ({ cat, datos }) => cat ? actualizarCategoria(cat.id, datos) : crearCategoria(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setModal(null); },
  });

  const eliminar = useMutation({
    mutationFn: (id) => eliminarCategoria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setConfirmEliminar(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{categorias.length} categoría(s)</p>
        {puedeCrear && (
          <button
            onClick={() => setModal({ modo: 'crear' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {categorias.map(cat => (
          <div
            key={cat.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{cat.nombre}</p>
                <p className="text-xs text-gray-400">{cat.activo ? 'Activa' : 'Inactiva'}</p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {puedeEditar && (
                <button
                  onClick={() => setModal({ modo: 'editar', cat })}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {puedeEliminar && (
                <button
                  onClick={() => setConfirmEliminar(cat)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && categorias.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600">
          <Tag className="w-8 h-8" />
          <p className="text-sm">No hay categorías. Crea la primera.</p>
        </div>
      )}

      {modal && (
        <FormCategoriaModal
          cat={modal.cat}
          onClose={() => setModal(null)}
          onGuardar={(datos) => guardar.mutate({ cat: modal.cat, datos })}
          guardando={guardar.isPending}
          error={guardar.error?.response?.data?.mensaje}
        />
      )}

      {confirmEliminar && (
        <Modal titulo="Eliminar Categoría" onClose={() => setConfirmEliminar(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ¿Eliminar <strong>{confirmEliminar.nombre}</strong>? Solo si no tiene productos asignados.
          </p>
          {eliminar.error && (
            <p className="text-sm text-red-600 mb-3">{eliminar.error?.response?.data?.mensaje ?? 'Error al eliminar'}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmEliminar(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => eliminar.mutate(confirmEliminar.id)}
              disabled={eliminar.isPending}
              className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
            >
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormCategoriaModal({ cat, onClose, onGuardar, guardando, error }) {
  const [nombre, setNombre] = useState(cat?.nombre ?? '');
  return (
    <Modal titulo={cat ? 'Editar Categoría' : 'Nueva Categoría'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre</label>
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Platos Principales, Bebidas, Postres"
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onGuardar({ nombre })}
            disabled={guardando || !nombre.trim()}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Tab Productos ──────────────────────────────────────────────────────── */

function TabProductos({ puedeCrear, puedeEditar, puedeEliminar }) {
  const accesoTodas = useAuthStore((s) => s.usuario?.sucursal_activa?.id == null);
  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: getSucursales,
    enabled: accesoTodas,
  });
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const { data: gruposOpciones = [] } = useQuery({ queryKey: ['grupos-opciones'], queryFn: getGruposOpciones });
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos', filtroCategoria],
    queryFn: () => getProductos(filtroCategoria ? { categoria_id: filtroCategoria } : {}),
  });

  const guardar = useMutation({
    mutationFn: ({ prod, datos }) => prod ? actualizarProducto(prod.id, datos) : crearProducto(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setModal(null); },
  });

  const eliminar = useMutation({
    mutationFn: (id) => eliminarProducto(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setConfirmEliminar(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {puedeCrear && (
          <button
            onClick={() => setModal({ modo: 'crear' })}
            disabled={categorias.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            title={categorias.length === 0 ? 'Primero crea una categoría' : ''}
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      )}

      {!isLoading && productos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600">
          <Package className="w-8 h-8" />
          <p className="text-sm">
            {categorias.length === 0 ? 'Primero crea una categoría.' : 'No hay productos. Crea el primero.'}
          </p>
        </div>
      )}

      {productos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Precio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Stock</th>
                {(puedeEditar || puedeEliminar) && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {productos.map(prod => (
                <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {prod.imagen ? (
                        <img
                          src={`${API_BASE}${prod.imagen}`}
                          alt={prod.nombre}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{prod.nombre}</p>
                        {prod.codigo && <p className="text-xs text-gray-400">{prod.codigo}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {prod.categoria?.nombre ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                    Bs {parseFloat(prod.precio).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {prod.stock === null
                      ? '∞'
                      : accesoTodas && prod.stock_por_sucursal?.length
                        ? (
                          <div className="flex flex-col gap-0.5 text-xs">
                            {prod.stock_por_sucursal.map(s => (
                              <span key={s.sucursal_id}>{s.nombre}: {s.stock}</span>
                            ))}
                          </div>
                        )
                        : prod.stock
                    }
                  </td>
                  {(puedeEditar || puedeEliminar) && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {puedeEditar && (
                          <button
                            onClick={() => setModal({ modo: 'editar', prod })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button
                            onClick={() => setConfirmEliminar(prod)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <FormProductoModal
          prod={modal.prod}
          categorias={categorias}
          gruposOpciones={gruposOpciones}
          accesoTodas={accesoTodas}
          sucursales={sucursales}
          onClose={() => setModal(null)}
          onGuardar={(datos) => guardar.mutate({ prod: modal.prod, datos })}
          guardando={guardar.isPending}
          error={guardar.error?.response?.data?.mensaje}
        />
      )}

      {confirmEliminar && (
        <Modal titulo="Eliminar Producto" onClose={() => setConfirmEliminar(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ¿Eliminar <strong>{confirmEliminar.nombre}</strong>? El producto se desactivará.
          </p>
          {eliminar.error && (
            <p className="text-sm text-red-600 mb-3">{eliminar.error?.response?.data?.mensaje ?? 'Error al eliminar'}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmEliminar(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => eliminar.mutate(confirmEliminar.id)}
              disabled={eliminar.isPending}
              className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
            >
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormProductoModal({ prod, categorias, gruposOpciones, accesoTodas, sucursales, onClose, onGuardar, guardando, error }) {
  const [form, setForm] = useState({
    categoria_id: prod?.categoria_id ?? (categorias[0]?.id ?? ''),
    grupo_opciones_id: prod?.grupo_opciones?.id ?? '',
    nombre:       prod?.nombre ?? '',
    precio:       prod?.precio ?? '',
    stock:        prod?.stock ?? '',
    sucursal_id:  '',
    es_vendible:  prod?.es_vendible ?? true,
    imagen:       prod?.imagen ?? null,
  });
  const [preview, setPreview] = useState(prod?.imagen ? `${API_BASE}${prod.imagen}` : null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [errImg, setErrImg] = useState(null);
  const inputFileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrImg(null);
    setSubiendoImg(true);
    try {
      const url = await subirImagenProducto(archivo);
      set('imagen', url);
      setPreview(`${API_BASE}${url}`);
    } catch (err) {
      setErrImg(err?.response?.data?.mensaje ?? 'Error al subir la imagen');
    } finally {
      setSubiendoImg(false);
    }
  }

  function quitarImagen() {
    set('imagen', null);
    setPreview(null);
    if (inputFileRef.current) inputFileRef.current.value = '';
  }

  function handleGuardar() {
    const datos = {
      categoria_id: parseInt(form.categoria_id),
      grupo_opciones_id: form.grupo_opciones_id ? parseInt(form.grupo_opciones_id) : null,
      nombre: form.nombre,
      precio: parseFloat(form.precio),
      es_vendible: form.es_vendible,
      imagen: form.imagen,
    };
    // El stock solo se define al crear el producto; en edición se maneja
    // exclusivamente vía ajustes de inventario (ajustarStockSucursal).
    if (!prod) {
      datos.stock = form.stock !== '' ? parseInt(form.stock) : null;
      if (accesoTodas && datos.stock !== null) {
        datos.sucursal_id = parseInt(form.sucursal_id);
      }
    }
    onGuardar(datos);
  }

  return (
    <Modal titulo={prod ? 'Editar Producto' : 'Nuevo Producto'} onClose={onClose} ancho="max-w-lg">
      <div className="space-y-4">

        {/* Imagen */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Imagen del producto</label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-700/50">
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              )}
            </div>
            <div className="flex flex-col gap-2 justify-center min-w-0">
              <input
                ref={inputFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleArchivo}
                className="hidden"
                id="img-producto"
              />
              <label
                htmlFor="img-producto"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  subiendoImg
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                }`}
              >
                {subiendoImg ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Subiendo...</>
                ) : (
                  <><ImagePlus className="w-4 h-4" /> {preview ? 'Cambiar imagen' : 'Subir imagen'}</>
                )}
              </label>
              {preview && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-4 h-4" /> Quitar imagen
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG, WEBP · Máx 5 MB</p>
              {errImg && <p className="text-xs text-red-600">{errImg}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input
              autoFocus
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Nombre del producto"
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Categoría *</label>
            <select
              value={form.categoria_id}
              onChange={e => set('categoria_id', e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Grupo de opciones</label>
            <select
              value={form.grupo_opciones_id}
              onChange={e => set('grupo_opciones_id', e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Ninguno</option>
              {gruposOpciones.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Precio (Bs) *</label>
            <input
              type="number" min="1.01" step="0.01"
              value={form.precio}
              onChange={e => set('precio', e.target.value)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {form.precio !== '' && !(parseFloat(form.precio) > 1) && (
              <p className="text-xs text-red-600 mt-1">El precio debe ser mayor a 1</p>
            )}
          </div>
          {!prod && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Stock inicial</label>
              <input
                type="number" min="0"
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                placeholder="Opcional"
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {accesoTodas && form.stock !== '' && (
                <select
                  value={form.sucursal_id}
                  onChange={e => set('sucursal_id', e.target.value)}
                  className="w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sucursal para el stock inicial...</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.es_vendible}
            onChange={e => set('es_vendible', e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Aparece en el menú de ventas</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={
              guardando || subiendoImg || !form.nombre.trim() || !(parseFloat(form.precio) > 1) || !form.categoria_id ||
              (!prod && accesoTodas && form.stock !== '' && !form.sucursal_id)
            }
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Tab Opciones ───────────────────────────────────────────────────────── */

function TabOpciones({ puedeCrear, puedeEditar, puedeEliminar }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const { data: grupos = [], isLoading } = useQuery({ queryKey: ['grupos-opciones'], queryFn: getGruposOpciones });

  const guardar = useMutation({
    mutationFn: ({ grupo, datos }) => grupo ? actualizarGrupoOpciones(grupo.id, datos) : crearGrupoOpciones(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos-opciones'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      setModal(null);
    },
  });

  const eliminar = useMutation({
    mutationFn: (id) => eliminarGrupoOpciones(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos-opciones'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      setConfirmEliminar(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{grupos.length} grupo(s) de opciones</p>
        {puedeCrear && (
          <button
            onClick={() => setModal({ modo: 'crear' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Grupo
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {grupos.map(grupo => (
          <div key={grupo.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{grupo.nombre}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {grupo.opciones.map(o => o.nombre).join(' · ') || 'Sin opciones'}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {puedeEditar && (
                  <button onClick={() => setModal({ modo: 'editar', grupo })} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {puedeEliminar && (
                  <button onClick={() => setConfirmEliminar(grupo)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && grupos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600">
          <ListChecks className="w-8 h-8" />
          <p className="text-sm">No hay grupos de opciones. Crea el primero.</p>
        </div>
      )}

      {modal && (
        <FormGrupoOpcionesModal
          grupo={modal.grupo}
          onClose={() => setModal(null)}
          onGuardar={(datos) => guardar.mutate({ grupo: modal.grupo, datos })}
          guardando={guardar.isPending}
          error={guardar.error?.response?.data?.mensaje}
        />
      )}

      {confirmEliminar && (
        <Modal titulo="Eliminar Grupo de Opciones" onClose={() => setConfirmEliminar(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ¿Eliminar <strong>{confirmEliminar.nombre}</strong>? Los productos que lo tengan asignado quedarán sin grupo de opciones.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmEliminar(null)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => eliminar.mutate(confirmEliminar.id)}
              disabled={eliminar.isPending}
              className="px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
            >
              {eliminar.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormGrupoOpcionesModal({ grupo, onClose, onGuardar, guardando, error }) {
  const [nombre, setNombre] = useState(grupo?.nombre ?? '');
  const [opciones, setOpciones] = useState(
    grupo?.opciones?.length ? grupo.opciones.map(o => ({ nombre: o.nombre })) : [{ nombre: '' }]
  );

  function setOpcionNombre(i, valor) {
    setOpciones(prev => prev.map((o, idx) => idx === i ? { nombre: valor } : o));
  }

  function agregarOpcion() {
    setOpciones(prev => [...prev, { nombre: '' }]);
  }

  function quitarOpcion(i) {
    setOpciones(prev => prev.filter((_, idx) => idx !== i));
  }

  function moverOpcion(i, direccion) {
    setOpciones(prev => {
      const destino = i + direccion;
      if (destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[destino]] = [copia[destino], copia[i]];
      return copia;
    });
  }

  function handleGuardar() {
    const opcionesValidas = opciones
      .map(o => o.nombre.trim())
      .filter(Boolean)
      .map((nombre, orden) => ({ nombre, orden }));
    onGuardar({ nombre, opciones: opcionesValidas });
  }

  const nombreValido = nombre.trim().length > 0;
  const hayOpcionValida = opciones.some(o => o.nombre.trim().length > 0);

  return (
    <Modal titulo={grupo ? 'Editar Grupo de Opciones' : 'Nuevo Grupo de Opciones'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre del grupo</label>
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Término de cocción, Sabor"
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Opciones</label>
          <div className="space-y-2">
            {opciones.map((o, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={o.nombre}
                  onChange={e => setOpcionNombre(i, e.target.value)}
                  placeholder={`Opción ${i + 1}`}
                  className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button type="button" onClick={() => moverOpcion(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moverOpcion(i, 1)} disabled={i === opciones.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => quitarOpcion(i)} disabled={opciones.length === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={agregarOpcion} className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <Plus className="w-4 h-4" /> Agregar opción
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !nombreValido || !hayOpcionValida}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

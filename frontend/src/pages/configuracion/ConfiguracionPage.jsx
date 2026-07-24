import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2, Grid3x3, Users, AlertCircle, RefreshCw, ChefHat, CheckCircle2, Store, Upload, X } from 'lucide-react';
import { getAreas, crearArea, actualizarArea, eliminarArea } from '../../api/areas';
import { getMesas, crearMesa, actualizarMesa, eliminarMesa } from '../../api/mesas';
import { getConfiguracion, actualizarConfiguracion, subirLogo, logoSrc } from '../../api/configuracion';
import { usePermisos } from '../../hooks/usePermisos';
import Modal from '../../components/ui/Modal';

const TABS = [
  { id: 'negocio', label: 'Negocio',     Icono: Store },
  { id: 'areas',   label: 'Áreas',       Icono: Building2 },
  { id: 'mesas',   label: 'Mesas',       Icono: Grid3x3 },
  { id: 'flujo',   label: 'Flujo Cocina',Icono: ChefHat },
];

export default function ConfiguracionPage() {
  const { tienePermiso } = usePermisos();
  const puedeVer    = tienePermiso('configuracion', 'ver');
  const puedeEditar = tienePermiso('configuracion', 'editar');
  const [tab, setTab] = useState('negocio');

  if (!puedeVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
        <AlertCircle className="w-10 h-10" />
        <p className="font-medium">No tienes permiso para ver la configuración</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Configuración</h1>

      {/* Tabs */}
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

      {tab === 'negocio' && <TabNegocio puedeEditar={puedeEditar} />}
      {tab === 'areas'   && <TabAreas   puedeEditar={puedeEditar} />}
      {tab === 'mesas'   && <TabMesas   puedeEditar={puedeEditar} />}
      {tab === 'flujo'   && <TabFlujo   puedeEditar={puedeEditar} />}
    </div>
  );
}

/* ─── Tab Negocio ────────────────────────────────────────────────────────── */

const ZONAS_HORARIAS = [
  'America/La_Paz',
  'America/Lima',
  'America/Bogota',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Caracas',
  'America/Guayaquil',
  'America/Asuncion',
  'America/Montevideo',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/Madrid',
];

function TabNegocio({ puedeEditar }) {
  const qc = useQueryClient();
  const logoRef = useRef(null);
  const [guardado, setGuardado] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState('');

  const { data: config = {}, isLoading } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
  });

  const [form, setForm] = useState(null);

  // Sincronizar form con config cuando carga por primera vez
  if (!isLoading && form === null) {
    setForm({
      nombre_negocio: config.nombre_negocio ?? '',
      direccion:      config.direccion      ?? '',
      telefono:       config.telefono       ?? '',
      moneda:         config.moneda         ?? 'Bs',
      simbolo_moneda: config.simbolo_moneda ?? 'Bs.',
      zona_horaria:   config.zona_horaria   ?? 'America/La_Paz',
      pie_ticket:     config.pie_ticket     ?? '¡Gracias por su preferencia!',
      logo:           config.logo           ?? '',
    });
  }

  const guardar = useMutation({
    mutationFn: (datos) => actualizarConfiguracion(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    },
  });

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorLogo('');
    setSubiendoLogo(true);
    try {
      const url = await subirLogo(file);
      set('logo', url);
    } catch {
      setErrorLogo('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setSubiendoLogo(false);
      e.target.value = '';
    }
  }

  if (isLoading || form === null) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-8">
        <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
      </div>
    );
  }

  const campo = (label, key, opts = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {opts.textarea ? (
        <textarea
          rows={2}
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          disabled={!puedeEditar}
          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none disabled:opacity-60"
        />
      ) : (
        <input
          type={opts.type ?? 'text'}
          value={form[key]}
          onChange={e => set(key, e.target.value)}
          disabled={!puedeEditar}
          placeholder={opts.placeholder}
          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Logo del negocio
        </label>
        <div className="flex items-start gap-4">
          {form.logo ? (
            <div className="relative shrink-0">
              <img
                src={logoSrc(form.logo)}
                alt="Logo"
                className="w-24 h-24 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
              />
              {puedeEditar && (
                <button
                  onClick={() => set('logo', '')}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
              {subiendoLogo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Store className="w-8 h-8" />}
            </div>
          )}
          {puedeEditar && (
            <div className="space-y-1.5">
              <button
                onClick={() => logoRef.current?.click()}
                disabled={subiendoLogo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {subiendoLogo ? 'Subiendo...' : form.logo ? 'Cambiar logo' : 'Subir logo'}
              </button>
              <p className="text-xs text-gray-400">PNG, JPG o WebP · máx. 5MB · se usa en tickets y PDF.</p>
              {errorLogo && <p className="text-xs text-red-500">{errorLogo}</p>}
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
            </div>
          )}
        </div>
      </div>

      {/* Datos del negocio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {campo('Nombre del negocio', 'nombre_negocio', { placeholder: 'Mi Restaurante' })}
        {campo('Teléfono', 'telefono', { placeholder: '+591 7X XXX XXX', type: 'tel' })}
      </div>

      {campo('Dirección', 'direccion', { placeholder: 'Calle, Nro., Ciudad' })}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {campo('Moneda', 'moneda', { placeholder: 'Bolivianos' })}
        {campo('Símbolo', 'simbolo_moneda', { placeholder: 'Bs.' })}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Zona horaria
        </label>
        <select
          value={form.zona_horaria}
          onChange={e => set('zona_horaria', e.target.value)}
          disabled={!puedeEditar}
          className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {ZONAS_HORARIAS.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>

      {campo('Pie de ticket', 'pie_ticket', { textarea: true, placeholder: '¡Gracias por su preferencia!' })}

      {puedeEditar && (
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => guardar.mutate(form)}
            disabled={guardar.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {guardar.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {guardado && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Guardado correctamente
            </div>
          )}
        </div>
      )}

      {!puedeEditar && (
        <p className="text-xs text-gray-400">No tienes permiso para editar la configuración.</p>
      )}
    </div>
  );
}

/* ─── Tab Flujo Cocina ───────────────────────────────────────────────────── */

function TabFlujo({ puedeEditar }) {
  const qc = useQueryClient();
  const [guardado, setGuardado] = useState(false);

  const { data: config = {}, isLoading } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
  });

  const flujoActual = config.flujo_cocina ?? 'digital';

  const guardar = useMutation({
    mutationFn: (flujo) => actualizarConfiguracion({ flujo_cocina: flujo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    },
  });

  const opciones = [
    {
      id: 'digital',
      titulo: 'Vista digital de cocina',
      descripcion: 'Los pedidos aparecen en la pantalla /cocina. La cocina marca "listo" desde la pantalla y el mesero ve la notificación en el pedido.',
      icono: '🖥️',
    },
    {
      id: 'fisico',
      titulo: 'Ticket físico impreso',
      descripcion: 'Al guardar el pedido aparece un botón para imprimir el ticket de cocina. El flujo es el mismo que antes: papel → cocina → servir.',
      icono: '🖨️',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-8">
        <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Elige cómo se comunica la sala con la cocina al registrar un pedido.
      </p>

      <div className="space-y-3">
        {opciones.map(op => (
          <button
            key={op.id}
            onClick={() => puedeEditar && guardar.mutate(op.id)}
            disabled={!puedeEditar || guardar.isPending}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              flujoActual === op.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            } ${!puedeEditar ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{op.icono}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{op.titulo}</p>
                  {flujoActual === op.id && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">Activo</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{op.descripcion}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {guardado && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" /> Configuración guardada
        </div>
      )}

      {!puedeEditar && (
        <p className="text-xs text-gray-400">No tienes permiso para cambiar esta configuración.</p>
      )}
    </div>
  );
}

/* ─── Tab Áreas ─────────────────────────────────────────────────────────── */

function TabAreas({ puedeEditar }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { modo: 'crear'|'editar', area? }
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const { data: areas = [], isLoading } = useQuery({ queryKey: ['areas'], queryFn: getAreas });

  const guardar = useMutation({
    mutationFn: ({ area, datos }) =>
      area ? actualizarArea(area.id, datos) : crearArea(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setModal(null); },
  });

  const eliminar = useMutation({
    mutationFn: (id) => eliminarArea(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setConfirmEliminar(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{areas.length} área(s) registrada(s)</p>
        {puedeEditar && (
          <button
            onClick={() => setModal({ modo: 'crear' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Área
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {areas.map(area => (
          <div
            key={area.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{area.nombre}</p>
                <p className="text-xs text-gray-400">{area.mesas?.length ?? 0} mesa(s)</p>
              </div>
            </div>
            {puedeEditar && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setModal({ modo: 'editar', area })}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmEliminar(area)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isLoading && areas.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600">
          <Building2 className="w-8 h-8" />
          <p className="text-sm">No hay áreas. Crea la primera.</p>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <FormAreaModal
          area={modal.area}
          onClose={() => setModal(null)}
          onGuardar={(datos) => guardar.mutate({ area: modal.area, datos })}
          guardando={guardar.isPending}
          error={guardar.error?.response?.data?.mensaje}
        />
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <Modal titulo="Eliminar Área" onClose={() => setConfirmEliminar(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ¿Eliminar el área <strong>{confirmEliminar.nombre}</strong>? Solo se puede si no tiene mesas asignadas.
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

function FormAreaModal({ area, onClose, onGuardar, guardando, error }) {
  const [nombre, setNombre] = useState(area?.nombre ?? '');
  return (
    <Modal titulo={area ? 'Editar Área' : 'Nueva Área'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Nombre del área
          </label>
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Salón Principal, Terraza, Bar"
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

/* ─── Tab Mesas ──────────────────────────────────────────────────────────── */

const ESTADOS_MESA = ['disponible', 'reservada'];

function TabMesas({ puedeEditar }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [filtroArea, setFiltroArea] = useState('');

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: getAreas });
  const { data: mesas = [], isLoading } = useQuery({ queryKey: ['mesas'], queryFn: () => getMesas() });

  const mesasFiltradas = filtroArea
    ? mesas.filter(m => String(m.area_id) === filtroArea)
    : mesas;

  const guardar = useMutation({
    mutationFn: ({ mesa, datos }) =>
      mesa ? actualizarMesa(mesa.id, datos) : crearMesa(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesas'] }); setModal(null); },
  });

  const eliminar = useMutation({
    mutationFn: (id) => eliminarMesa(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesas'] }); setConfirmEliminar(null); },
  });

  // Agrupar por área si no hay filtro
  const porArea = mesasFiltradas.reduce((acc, m) => {
    const key = m.area?.nombre ?? 'Sin área';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filtroArea}
          onChange={e => setFiltroArea(e.target.value)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        {puedeEditar && (
          <button
            onClick={() => setModal({ modo: 'crear' })}
            disabled={areas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            title={areas.length === 0 ? 'Primero crea un área' : ''}
          >
            <Plus className="w-4 h-4" /> Nueva Mesa
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Cargando...</span>
        </div>
      )}

      {!isLoading && mesasFiltradas.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 dark:text-gray-600">
          <Grid3x3 className="w-8 h-8" />
          <p className="text-sm">
            {areas.length === 0 ? 'Primero crea un área en la pestaña Áreas.' : 'No hay mesas. Crea la primera.'}
          </p>
        </div>
      )}

      {Object.entries(porArea).map(([areaNombre, mesasGrupo]) => (
        <section key={areaNombre}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{areaNombre}</h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Asientos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                  {puedeEditar && <th className="px-4 py-3 w-20" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {mesasGrupo.map(mesa => (
                  <tr key={mesa.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{mesa.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{mesa.asientos}</span>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={mesa.estado} />
                    </td>
                    {puedeEditar && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setModal({ modo: 'editar', mesa })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmEliminar(mesa)}
                            disabled={mesa.estado === 'ocupada'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Modal crear/editar mesa */}
      {modal && (
        <FormMesaModal
          mesa={modal.mesa}
          areas={areas}
          onClose={() => setModal(null)}
          onGuardar={(datos) => guardar.mutate({ mesa: modal.mesa, datos })}
          guardando={guardar.isPending}
          error={guardar.error?.response?.data?.mensaje}
        />
      )}

      {/* Confirmar eliminar */}
      {confirmEliminar && (
        <Modal titulo="Eliminar Mesa" onClose={() => setConfirmEliminar(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ¿Eliminar la mesa <strong>{confirmEliminar.nombre}</strong>?
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

function FormMesaModal({ mesa, areas, onClose, onGuardar, guardando, error }) {
  const [form, setForm] = useState({
    area_id: mesa?.area_id ?? (areas[0]?.id ?? ''),
    nombre: mesa?.nombre ?? '',
    asientos: mesa?.asientos ?? 4,
    estado: mesa?.estado ?? 'disponible',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal titulo={mesa ? 'Editar Mesa' : 'Nueva Mesa'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Área</label>
          <select
            value={form.area_id}
            onChange={e => set('area_id', e.target.value)}
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre</label>
          <input
            autoFocus
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: Mesa 1, Barra 2, VIP"
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Asientos</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.asientos}
            onChange={e => set('asientos', parseInt(e.target.value) || 1)}
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        {mesa && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Estado</label>
            <select
              value={form.estado}
              onChange={e => set('estado', e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ESTADOS_MESA.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(form)}
            disabled={guardando || !form.nombre.trim() || !form.area_id}
            className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EstadoBadge({ estado }) {
  const cfg = {
    disponible: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ocupada:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    reservada:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }[estado] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg}`}>
      {estado}
    </span>
  );
}

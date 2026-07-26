import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermisos } from '../../hooks/usePermisos';
import { getClientes, crearCliente, actualizarCliente } from '../../api/clientes';
import {
  Users, Plus, Search, X, Edit2, Phone, Mail, MapPin,
  CreditCard, UserCircle, AlertTriangle,
} from 'lucide-react';

/* ─── helpers ─── */
const fmtFecha = (s) =>
  s ? new Date(s).toLocaleDateString('es-BO', { dateStyle: 'medium' }) : '—';

const TIPOS_DOC = ['CI', 'NIT', 'Pasaporte', 'RUC', 'Otro'];

/* ─── avatar inicial ─── */
function Avatar({ nombre, size = 'md' }) {
  const colores = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-blue-500', 'bg-teal-500'];
  const idx = (nombre?.charCodeAt(0) ?? 0) % colores.length;
  const cls = size === 'lg' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-sm';
  return (
    <div className={`${cls} ${colores[idx]} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {nombre?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  );
}

/* ─── modal crear/editar ─── */
function ModalCliente({ cliente, onClose, onGuardar, loading }) {
  const [form, setForm] = useState({
    nombre:           cliente?.nombre           ?? '',
    tipo_documento:   cliente?.tipo_documento   ?? 'CI',
    numero_documento: cliente?.numero_documento ?? '',
    email:            cliente?.email            ?? '',
    telefono:         cliente?.telefono         ?? '',
    direccion:        cliente?.direccion        ?? '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setError('');
    onGuardar(form);
  };

  const esEdicion = !!cliente;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* header */}
        <div
          className="px-6 py-4 rounded-t-2xl flex items-center justify-between"
          style={{ background: esEdicion
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
        >
          <div className="flex items-center gap-3">
            {esEdicion
              ? <Edit2 className="w-5 h-5 text-white" />
              : <Plus className="w-5 h-5 text-white" />}
            <h2 className="text-white font-semibold">
              {esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Nombre completo *
            </label>
            <input
              value={form.nombre}
              onChange={set('nombre')}
              placeholder="Ej: Juan Pérez"
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* documento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Tipo doc.
              </label>
              <select
                value={form.tipo_documento}
                onChange={set('tipo_documento')}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                N° documento
              </label>
              <input
                value={form.numero_documento}
                onChange={set('numero_documento')}
                placeholder="12345678"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* contacto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Teléfono
              </label>
              <input
                value={form.telefono}
                onChange={set('telefono')}
                placeholder="+591 7XXXXXXX"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* dirección */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Dirección
            </label>
            <input
              value={form.direccion}
              onChange={set('direccion')}
              placeholder="Av. Principal #123..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-rose-600 text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />{error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {loading ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── tarjeta cliente móvil ─── */
function ClienteCard({ cliente, idx, puedoEditar, onEditar }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4"
      style={{ animation: 'cliFadeUp .35s ease both', animationDelay: `${idx * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar nombre={cliente.nombre} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cliente.nombre}</p>
            {cliente.numero_documento && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <CreditCard className="w-3 h-3" />
                {cliente.tipo_documento} {cliente.numero_documento}
              </p>
            )}
          </div>
        </div>
        {puedoEditar && (
          <button
            onClick={() => onEditar(cliente)}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
        {cliente.telefono && (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{cliente.telefono}</span>
          </div>
        )}
        {cliente.email && (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{cliente.email}</span>
          </div>
        )}
        {cliente.direccion && (
          <div className="col-span-2 flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{cliente.direccion}</span>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Registrado el {fmtFecha(cliente.creado_en)}
      </div>
    </div>
  );
}

/* ─── página principal ─── */
export default function ClientesPage() {
  const { tienePermiso } = usePermisos();
  const qc = useQueryClient();

  const puedoVer    = tienePermiso('clientes', 'ver');
  const puedoCrear  = tienePermiso('clientes', 'crear');
  const puedoEditar = tienePermiso('clientes', 'editar');

  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null); // null | 'nuevo' | cliente
  const [toast, setToast] = useState(null);

  const mostrarToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes,
    enabled: puedoVer,
  });

  const mutCrear = useMutation({
    mutationFn: crearCliente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setModal(null);
      mostrarToast('Cliente creado');
    },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error al crear cliente', false),
  });

  const mutEditar = useMutation({
    mutationFn: ({ id, datos }) => actualizarCliente(id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setModal(null);
      mostrarToast('Cliente actualizado');
    },
    onError: (e) => mostrarToast(e?.response?.data?.mensaje ?? 'Error al actualizar', false),
  });

  const handleGuardar = (datos) => {
    if (modal === 'nuevo') mutCrear.mutate(datos);
    else mutEditar.mutate({ id: modal.id, datos });
  };

  const clientesFiltrados = useMemo(() => {
    if (!buscar.trim()) return clientes;
    const q = buscar.toLowerCase();
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.numero_documento?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [clientes, buscar]);

  if (!puedoVer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Users className="w-12 h-12" />
        <p className="text-sm">Sin acceso al módulo de clientes</p>
      </div>
    );
  }

  const isMutLoading = mutCrear.isPending || mutEditar.isPending;

  return (
    <>
      <style>{`
        @keyframes cliFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
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

      {modal && (
        <ModalCliente
          cliente={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardar={handleGuardar}
          loading={isMutLoading}
        />
      )}

      <div className="space-y-6">
        {/* header */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -right-16 w-48 h-48 bg-white/5 rounded-full" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Clientes</h1>
              <p className="text-blue-100 text-sm mt-0.5">Directorio de clientes registrados</p>
            </div>
            {puedoCrear && (
              <button
                onClick={() => setModal('nuevo')}
                className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            )}
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total clientes',
              value: clientes.length,
              sub: 'registrados',
              color: 'indigo',
              delay: 100,
            },
            {
              label: 'Con documento',
              value: clientes.filter(c => c.numero_documento).length,
              sub: 'identificados',
              color: 'blue',
              delay: 160,
            },
            {
              label: 'Con contacto',
              value: clientes.filter(c => c.telefono || c.email).length,
              sub: 'con tel. o email',
              color: 'violet',
              delay: 220,
            },
          ].map(({ label, value, sub, color, delay }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 relative overflow-hidden"
              style={{ animation: 'cliFadeUp .4s ease both', animationDelay: `${delay}ms` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-${color}-500`} />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, documento, teléfono o email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {buscar && (
            <button
              onClick={() => setBuscar('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* contenido */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <UserCircle className="w-12 h-12 opacity-40" />
            <p className="text-sm">
              {buscar ? 'Sin resultados para esa búsqueda' : 'Sin clientes registrados'}
            </p>
            {puedoCrear && !buscar && (
              <button
                onClick={() => setModal('nuevo')}
                className="text-indigo-600 text-sm font-medium hover:underline"
              >
                Registrar primer cliente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* mobile: cards */}
            <div className="sm:hidden space-y-3">
              {clientesFiltrados.map((c, i) => (
                <ClienteCard key={c.id} cliente={c} idx={i} puedoEditar={puedoEditar} onEditar={setModal} />
              ))}
            </div>

            {/* desktop: tabla */}
            <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dirección</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registrado</th>
                    {puedoEditar && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {clientesFiltrados.map((c, i) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      style={{ animation: 'cliFadeUp .3s ease both', animationDelay: `${i * 20}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nombre={c.nombre} />
                          <span className="font-medium text-gray-900 dark:text-white">{c.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.numero_documento ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">{c.tipo_documento}</span>
                            {c.numero_documento}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.telefono ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />{c.telefono}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.email ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />{c.email}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.direccion ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{c.direccion}</span>
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtFecha(c.creado_en)}
                      </td>
                      {puedoEditar && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setModal(c)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
                {buscar && ` encontrado${clientesFiltrados.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

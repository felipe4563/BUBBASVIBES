import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, actualizarSucursalesUsuario } from '../../api/usuarios';
import { getRoles } from '../../api/roles';
import { getSucursales } from '../../api/sucursales';
import { useAuthStore } from '../../store/authStore';
import { UserPlus, Pencil, UserX, UserCheck, X, Eye, EyeOff, Shield, ChevronDown, ChevronUp } from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────── */
const tienePermiso = (usuario, modulo, accion) =>
  usuario?.permisos?.includes(`${modulo}.${accion}`);

const CAMPOS_INICIALES = { nombre: '', email: '', contrasena: '', rol_id: '', activo: 1 };

/* ─── Badge de estado ─────────────────────────────────────────── */
function BadgeEstado({ activo }) {
  return activo
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Activo</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Inactivo</span>;
}

/* ─── Modal crear / editar ────────────────────────────────────── */
function ModalUsuario({ usuario, roles, sucursalesCatalogo, onClose, onGuardar, onGuardarSucursales, guardandoSucursales }) {
  const esNuevo = !usuario;
  const [form, setForm] = useState(
    usuario
      ? { nombre: usuario.nombre, email: usuario.email, contrasena: '', rol_id: usuario.rol?.id ?? '', activo: usuario.activo }
      : CAMPOS_INICIALES
  );
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState('');
  const [sucursalIds, setSucursalIds] = useState(
    new Set((usuario?.sucursales ?? []).map(s => s.id))
  );
  const [accesoTodas, setAccesoTodas] = useState(!!usuario?.acceso_todas_sucursales);

  const toggleSucursal = (id) => {
    setSucursalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim() || !form.email.trim() || !form.rol_id) {
      setError('Nombre, email y rol son obligatorios.');
      return;
    }
    if (esNuevo && !form.contrasena.trim()) {
      setError('La contraseña es obligatoria para usuarios nuevos.');
      return;
    }
    const datos = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol_id: Number(form.rol_id),
      activo: Number(form.activo),
    };
    if (form.contrasena.trim()) datos.contrasena = form.contrasena.trim();
    onGuardar(datos);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="juan@restaurante.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* contraseña */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña {!esNuevo && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
            </label>
            <div className="relative">
              <input
                type={mostrarPass ? 'text' : 'password'}
                value={form.contrasena}
                onChange={e => set('contrasena', e.target.value)}
                placeholder={esNuevo ? 'Contraseña' : '••••••••'}
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setMostrarPass(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* rol */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
            <select
              value={form.rol_id}
              onChange={e => set('rol_id', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar rol…</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>

          {/* estado (solo edición) */}
          {!esNuevo && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Estado</label>
              <button
                type="button"
                onClick={() => set('activo', form.activo ? 0 : 1)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{form.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          )}

          {!esNuevo && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Sucursales</label>

              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accesoTodas}
                  onChange={e => setAccesoTodas(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-600"
                />
                Acceso a todas las sucursales
              </label>

              {!accesoTodas && (
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-600 p-2">
                  {sucursalesCatalogo.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sucursalIds.has(s.id)}
                        onChange={() => toggleSucursal(s.id)}
                        className="w-3.5 h-3.5 rounded accent-blue-600"
                      />
                      {s.nombre}
                    </label>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={guardandoSucursales}
                onClick={() => onGuardarSucursales({ sucursal_ids: [...sucursalIds], acceso_todas_sucursales: accesoTodas })}
                className="w-full py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardandoSucursales ? 'Guardando...' : 'Guardar sucursales'}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
              {esNuevo ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal confirmar desactivar ──────────────────────────────── */
function ModalConfirmar({ usuario, onClose, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/30">
            <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Desactivar usuario</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Esta acción no borra el usuario</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
          ¿Desactivar a <span className="font-medium">{usuario.nombre}</span>? No podrá iniciar sesión hasta que sea reactivado.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button onClick={onConfirmar}
            className="flex-1 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">
            Desactivar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card mobile ─────────────────────────────────────────────── */
function UsuarioCard({ u, puedoEditar, puedoEliminar, onEditar, onDesactivar, onActivar }) {
  const [expand, setExpand] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm select-none">
          {u.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nombre}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
        </div>
        <BadgeEstado activo={u.activo} />
        <button onClick={() => setExpand(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          {expand ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expand && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Shield className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{u.rol?.nombre ?? '—'}</span>
          </div>
          <div className="flex gap-2">
            {puedoEditar && (
              <button onClick={() => onEditar(u)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
            {puedoEliminar && (
              u.activo
                ? <button onClick={() => onDesactivar(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <UserX className="w-3 h-3" /> Desactivar
                  </button>
                : <button onClick={() => onActivar(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                    <UserCheck className="w-3 h-3" /> Activar
                  </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────── */
export default function UsuariosPage() {
  const { usuario } = useAuthStore();
  const qc = useQueryClient();

  const puedoVer     = tienePermiso(usuario, 'usuarios', 'ver');
  const puedoCrear   = tienePermiso(usuario, 'usuarios', 'crear');
  const puedoEditar  = tienePermiso(usuario, 'usuarios', 'editar');
  const puedoEliminar = tienePermiso(usuario, 'usuarios', 'eliminar');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: getUsuarios,
    enabled: puedoVer,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: puedoCrear || puedoEditar,
    staleTime: 60_000,
  });

  const { data: sucursalesCatalogo = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: getSucursales,
    enabled: puedoEditar,
    staleTime: 60_000,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios'] });

  const mutCrear = useMutation({ mutationFn: crearUsuario, onSuccess: () => { invalidar(); setModal(null); } });
  const mutEditar = useMutation({ mutationFn: ({ id, datos }) => actualizarUsuario(id, datos), onSuccess: () => { invalidar(); setModal(null); } });
  const mutDesactivar = useMutation({ mutationFn: (id) => eliminarUsuario(id), onSuccess: () => { invalidar(); setConfirmar(null); } });
  const mutActivar = useMutation({ mutationFn: (id) => actualizarUsuario(id, { activo: 1 }), onSuccess: invalidar });
  const mutSucursales = useMutation({
    mutationFn: ({ id, datos }) => actualizarSucursalesUsuario(id, datos),
    onSuccess: invalidar,
  });

  const [modal, setModal] = useState(null);       // null | { usuario?: obj }
  const [confirmar, setConfirmar] = useState(null); // null | obj usuario
  const [buscar, setBuscar] = useState('');

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    u.email.toLowerCase().includes(buscar.toLowerCase()) ||
    (u.rol?.nombre ?? '').toLowerCase().includes(buscar.toLowerCase())
  );

  const guardarUsuario = (datos) => {
    if (modal?.usuario) {
      mutEditar.mutate({ id: modal.usuario.id, datos });
    } else {
      mutCrear.mutate(datos);
    }
  };

  const errorMutation = mutCrear.error?.response?.data?.mensaje
    || mutEditar.error?.response?.data?.mensaje
    || mutDesactivar.error?.response?.data?.mensaje
    || mutSucursales.error?.response?.data?.mensaje;

  if (!puedoVer) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-500 dark:text-gray-400">Sin permiso para ver usuarios.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        {puedoCrear && (
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </button>
        )}
      </div>

      {/* error global */}
      {errorMutation && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMutation}
        </div>
      )}

      {/* buscador */}
      <input
        type="text"
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
        placeholder="Buscar por nombre, email o rol…"
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* contenido */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-sm">{buscar ? 'Sin resultados para tu búsqueda.' : 'No hay usuarios registrados.'}</p>
        </div>
      ) : (
        <>
          {/* mobile: cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {filtrados.map(u => (
              <UsuarioCard
                key={u.id}
                u={u}
                puedoEditar={puedoEditar}
                puedoEliminar={puedoEliminar}
                onEditar={u => setModal({ usuario: u })}
                onDesactivar={u => setConfirmar(u)}
                onActivar={u => mutActivar.mutate(u.id)}
              />
            ))}
          </div>

          {/* sm+: tabla */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">Estado</th>
                  {(puedoEditar || puedoEliminar) && (
                    <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-xs">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtrados.map(u => (
                  <tr key={u.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-xs select-none flex-shrink-0">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        <Shield className="w-3 h-3" />
                        {u.rol?.nombre ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><BadgeEstado activo={u.activo} /></td>
                    {(puedoEditar || puedoEliminar) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {puedoEditar && (
                            <button onClick={() => setModal({ usuario: u })}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {puedoEliminar && (
                            u.activo
                              ? <button onClick={() => setConfirmar(u)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
                                  <UserX className="w-4 h-4" />
                                </button>
                              : <button onClick={() => mutActivar.mutate(u.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors">
                                  <UserCheck className="w-4 h-4" />
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
        </>
      )}

      {/* modales */}
      {modal !== null && (
        <ModalUsuario
          usuario={modal.usuario}
          roles={roles}
          sucursalesCatalogo={sucursalesCatalogo}
          onClose={() => setModal(null)}
          onGuardar={guardarUsuario}
          onGuardarSucursales={modal.usuario ? (datos) => mutSucursales.mutate({ id: modal.usuario.id, datos }) : undefined}
          guardandoSucursales={mutSucursales.isPending}
        />
      )}

      {confirmar && (
        <ModalConfirmar
          usuario={confirmar}
          onClose={() => setConfirmar(null)}
          onConfirmar={() => mutDesactivar.mutate(confirmar.id)}
        />
      )}
    </div>
  );
}

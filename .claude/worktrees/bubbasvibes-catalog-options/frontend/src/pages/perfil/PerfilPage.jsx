import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Lock, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { getPerfil, actualizarPerfil, cambiarContrasena } from '../../api/perfil';
import { useAuthStore } from '../../store/authStore';

function Alert({ tipo, mensaje }) {
  if (!mensaje) return null;
  const esError = tipo === 'error';
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
      esError
        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400'
        : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400'
    }`}>
      {esError
        ? <AlertCircle className="w-4 h-4 shrink-0" />
        : <CheckCircle2 className="w-4 h-4 shrink-0" />
      }
      {mensaje}
    </div>
  );
}

function PasswordInput({ label, value, onChange, name, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? '••••••••'}
          autoComplete="new-password"
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pr-11 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const updateUsuario = useAuthStore((s) => s.updateUsuario);
  const qc = useQueryClient();

  // Datos del perfil
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil'],
    queryFn: getPerfil,
    staleTime: 60_000,
  });

  // --- Sección datos personales ---
  const [form, setForm] = useState(null);
  const [alerta, setAlerta] = useState({ tipo: '', msg: '' });

  if (!isLoading && form === null && perfil) {
    setForm({ nombre: perfil.nombre ?? '', email: perfil.email ?? '' });
  }

  const mutDatos = useMutation({
    mutationFn: actualizarPerfil,
    onSuccess: (actualizado) => {
      updateUsuario({ nombre: actualizado.nombre, email: actualizado.email });
      qc.setQueryData(['perfil'], actualizado);
      setAlerta({ tipo: 'ok', msg: 'Datos actualizados correctamente' });
      setTimeout(() => setAlerta({ tipo: '', msg: '' }), 3000);
    },
    onError: (err) => {
      setAlerta({ tipo: 'error', msg: err.response?.data?.mensaje ?? 'Error al actualizar' });
    },
  });

  function handleDatos(e) {
    e.preventDefault();
    setAlerta({ tipo: '', msg: '' });
    mutDatos.mutate({ nombre: form.nombre, email: form.email });
  }

  // --- Sección cambio de contraseña ---
  const [pwd, setPwd] = useState({ contrasena_actual: '', nueva_contrasena: '', confirmar: '' });
  const [alertaPwd, setAlertaPwd] = useState({ tipo: '', msg: '' });

  const mutPwd = useMutation({
    mutationFn: cambiarContrasena,
    onSuccess: () => {
      setPwd({ contrasena_actual: '', nueva_contrasena: '', confirmar: '' });
      setAlertaPwd({ tipo: 'ok', msg: 'Contraseña cambiada correctamente' });
      setTimeout(() => setAlertaPwd({ tipo: '', msg: '' }), 3000);
    },
    onError: (err) => {
      setAlertaPwd({ tipo: 'error', msg: err.response?.data?.mensaje ?? 'Error al cambiar contraseña' });
    },
  });

  function handlePwd(e) {
    e.preventDefault();
    setAlertaPwd({ tipo: '', msg: '' });
    if (pwd.nueva_contrasena !== pwd.confirmar) {
      setAlertaPwd({ tipo: 'error', msg: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (pwd.nueva_contrasena.length < 6) {
      setAlertaPwd({ tipo: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    mutPwd.mutate({ contrasena_actual: pwd.contrasena_actual, nueva_contrasena: pwd.nueva_contrasena });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {perfil?.rol?.nombre ?? '—'}
        </p>
      </div>

      {/* Datos personales */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Datos personales</h2>
        </div>

        <form onSubmit={handleDatos} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Nombre</label>
            <input
              type="text"
              value={form?.nombre ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              placeholder="Tu nombre completo"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Correo electrónico</label>
            <input
              type="email"
              value={form?.email ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="correo@ejemplo.com"
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
            />
          </div>

          <Alert tipo={alerta.tipo} mensaje={alerta.msg} />

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={mutDatos.isPending}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {mutDatos.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cambiar contraseña</h2>
        </div>

        <form onSubmit={handlePwd} className="space-y-4">
          <PasswordInput
            label="Contraseña actual"
            name="contrasena_actual"
            value={pwd.contrasena_actual}
            onChange={(e) => setPwd((p) => ({ ...p, contrasena_actual: e.target.value }))}
          />
          <PasswordInput
            label="Nueva contraseña"
            name="nueva_contrasena"
            value={pwd.nueva_contrasena}
            onChange={(e) => setPwd((p) => ({ ...p, nueva_contrasena: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            name="confirmar"
            value={pwd.confirmar}
            onChange={(e) => setPwd((p) => ({ ...p, confirmar: e.target.value }))}
          />

          <Alert tipo={alertaPwd.tipo} mensaje={alertaPwd.msg} />

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={mutPwd.isPending || !pwd.contrasena_actual || !pwd.nueva_contrasena || !pwd.confirmar}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {mutPwd.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

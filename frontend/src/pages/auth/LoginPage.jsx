import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, UtensilsCrossed } from 'lucide-react';
import api from '../../api/cliente';
import { useAuthStore } from '../../store/authStore';
import { getConfiguracionPublica, logoSrc } from '../../api/configuracion';

// Signature element: ornamental plate/menu medallion around the logo
function Medallion({ logo, nombre }) {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg
        className="absolute inset-0 w-full h-full text-amber-500/40 dark:text-amber-500/25"
        viewBox="0 0 96 96"
        aria-hidden
      >
        {/* Outer solid ring */}
        <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Inner dashed ring */}
        <circle cx="48" cy="48" r="37" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 5" />
        {/* Diamond ornaments at compass points (N/E/S/W) */}
        <polygon points="48,1 51,4 48,7 45,4"     fill="currentColor" />
        <polygon points="92,45 95,48 92,51 89,48" fill="currentColor" />
        <polygon points="48,89 51,92 48,95 45,92" fill="currentColor" />
        <polygon points="4,45 7,48 4,51 1,48"     fill="currentColor" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[62px] h-[62px] rounded-full flex items-center justify-center overflow-hidden bg-amber-50 dark:bg-[#2A1A0C] border-2 border-amber-200/80 dark:border-amber-800/40">
          {logo
            ? <img src={logo} alt={nombre} className="w-full h-full object-contain p-1" />
            : <UtensilsCrossed className="w-7 h-7 text-amber-600 dark:text-amber-500" />
          }
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail]                       = useState('');
  const [contrasena, setContrasena]             = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError]                       = useState('');
  const [cargando, setCargando]                 = useState(false);
  const [paso, setPaso]                         = useState('credenciales'); // 'credenciales' | 'sucursal'
  const [preToken, setPreToken]                 = useState(null);
  const [sucursales, setSucursales]             = useState([]);
  const setAuth   = useAuthStore((s) => s.setAuth);
  const navigate  = useNavigate();

  // Load display font for restaurant name
  useEffect(() => {
    const link = Object.assign(document.createElement('link'), {
      rel:  'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap',
    });
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const { data: branding = {} } = useQuery({
    queryKey: ['configuracion-publica'],
    queryFn:  getConfiguracionPublica,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const nombreNegocio = branding.nombre_negocio || 'Mi Restaurante';
  const logo          = logoSrc(branding.logo);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email, contrasena });
      if (data.datos.requiere_sucursal) {
        setPreToken(data.datos.pre_token);
        setSucursales(data.datos.sucursales);
        setPaso('sucursal');
      } else {
        setAuth(data.datos);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  async function handleElegirSucursal(sucursalId) {
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login/sucursal', { pre_token: preToken, sucursal_id: sucursalId });
      setAuth(data.datos);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al seleccionar la sucursal');
      setPaso('credenciales');
    } finally {
      setCargando(false);
    }
  }

  function volverACredenciales() {
    setPaso('credenciales');
    setPreToken(null);
    setSucursales([]);
    setError('');
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAF8F4] dark:bg-[#130D07] transition-colors duration-300 overflow-hidden">

      {/* Subtle warm dot-grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(200,136,58,0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Ambient glow centered behind card */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,136,58,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">

        {/* Medallion + business name */}
        <div className="text-center mb-7 space-y-4">
          <Medallion logo={logo} nombre={nombreNegocio} />
          <div>
            <h1
              className="text-[1.65rem] leading-snug text-[#1C1208] dark:text-[#F5EDD8] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}
            >
              {nombreNegocio}
            </h1>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#C0AE9A] dark:text-[#5A4A38] mt-1.5">
              Sistema de Gestión
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/90 dark:bg-[#1E1208]/90 backdrop-blur-sm rounded-2xl border border-[#EAE0D4] dark:border-[#352212] shadow-[0_8px_40px_rgba(0,0,0,0.07)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] p-8">

          <p className="text-sm text-center text-[#9A8878] dark:text-[#5A4A38] mb-7 -mt-1">
            Inicia sesión para continuar
          </p>

          {paso === 'credenciales' ? (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8A896] dark:text-[#5A4A38]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="correo@restaurante.com"
                  className="w-full bg-[#FDFAF7] dark:bg-[#160F08] border border-[#E2D9CE] dark:border-[#3A2412] rounded-xl px-4 py-3 text-sm text-[#1C1208] dark:text-[#F0E8D8] placeholder-[#CCC0B4] dark:placeholder-[#4A3A2E] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-600 transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8A896] dark:text-[#5A4A38]">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-[#FDFAF7] dark:bg-[#160F08] border border-[#E2D9CE] dark:border-[#3A2412] rounded-xl px-4 py-3 pr-12 text-sm text-[#1C1208] dark:text-[#F0E8D8] placeholder-[#CCC0B4] dark:placeholder-[#4A3A2E] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena((v) => !v)}
                    tabIndex={-1}
                    aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#CCC0B4] dark:text-[#4A3A2E] hover:text-amber-500 dark:hover:text-amber-500 transition-colors"
                  >
                    {mostrarContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={cargando}
                className="w-full mt-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-amber-600/20"
              >
                {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-[#9A8878] dark:text-[#5A4A38] -mt-1 mb-2">
                Elige con qué sucursal quieres trabajar
              </p>

              {sucursales.map((s) => (
                <button
                  key={s.id ?? 'todas'}
                  type="button"
                  disabled={cargando}
                  onClick={() => handleElegirSucursal(s.id)}
                  className="w-full text-left bg-[#FDFAF7] dark:bg-[#160F08] border border-[#E2D9CE] dark:border-[#3A2412] rounded-xl px-4 py-3 text-sm text-[#1C1208] dark:text-[#F0E8D8] hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition disabled:opacity-60"
                >
                  {s.nombre}
                </button>
              ))}

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={volverACredenciales}
                className="w-full mt-1 text-sm text-[#9A8878] dark:text-[#5A4A38] hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
              >
                ← Volver
              </button>
            </div>
          )}
        </div>

        {/* Desarrollado por CodeWave */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CCC0B4] dark:text-[#3A2E22]">
            Desarrollado por
          </p>
          <img src="/logo-light.png" alt="CodeWave" className="h-6 object-contain dark:hidden opacity-60" />
          <img src="/logo-dark.png"  alt="CodeWave" className="h-6 object-contain hidden dark:block opacity-60" />
        </div>

      </div>
    </div>
  );
}

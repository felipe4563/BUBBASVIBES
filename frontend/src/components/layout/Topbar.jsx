import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import api from '../../api/cliente';

export default function Topbar({ onToggleSidebar }) {
  const { usuario, logout } = useAuth();
  const { modo, toggleModo } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignorar errores de red al cerrar sesión
    }
    logout();
    navigate('/login');
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 transition-colors">
      {/* Botón hamburguesa — todos los tamaños */}
      <button
        onClick={onToggleSidebar}
        title="Menú"
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Controles derecha */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleModo}
          title={modo === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {modo === 'dark'
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />

        <Link
          to="/perfil"
          className="text-right px-1 group cursor-pointer"
          title="Ver mi perfil"
        >
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 leading-tight transition-colors">{usuario?.nombre}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
            {usuario?.rol}
            {usuario?.rol && usuario?.sucursal_activa && ' · '}
            {usuario?.sucursal_activa?.nombre}
          </p>
        </Link>

        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

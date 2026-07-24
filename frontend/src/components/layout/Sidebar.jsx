import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePermisos } from '../../hooks/usePermisos';
import { getConfiguracion, logoSrc } from '../../api/configuracion';
import {
  LayoutDashboard, UtensilsCrossed, Wallet, BookOpen,
  Package, Boxes, Truck, Users, UserCog, Shield, Settings, X,
  BarChart2, ChefHat, ChevronLeft, Building2, Landmark,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',     Icono: LayoutDashboard, siempre: true },
  { to: '/ventas',       label: 'Ventas / POS',  Icono: UtensilsCrossed, modulo: 'ventas',        accion: 'ver' },
  { to: '/cocina',       label: 'Cocina',        Icono: ChefHat,         modulo: 'cocina',        accion: 'ver' },
  { to: '/caja',         label: 'Caja',          Icono: Wallet,          modulo: 'caja',          accion: 'ver' },
  { to: '/libro-caja',   label: 'Libro Caja',    Icono: BookOpen,        modulo: 'libro_caja',    accion: 'ver' },
  { to: '/productos',    label: 'Productos',     Icono: Package,         modulo: 'inventario',    accion: 'ver' },
  { to: '/inventario',   label: 'Inventario',    Icono: Boxes,           modulo: 'inventario',    accion: 'ajustar' },
  { to: '/compras',      label: 'Compras',       Icono: Truck,           modulo: 'compras',       accion: 'ver' },
  { to: '/clientes',     label: 'Clientes',      Icono: Users,           modulo: 'ventas',        accion: 'ver' },
  { to: '/reportes',     label: 'Reportes',      Icono: BarChart2,       modulo: 'reportes',      accion: 'ver' },
  { to: '/usuarios',     label: 'Usuarios',      Icono: UserCog,         modulo: 'usuarios',      accion: 'ver' },
  { to: '/roles',        label: 'Roles',         Icono: Shield,          modulo: 'roles',         accion: 'ver' },
  { to: '/sucursales',   label: 'Sucursales',    Icono: Building2,       modulo: 'sucursales',    accion: 'ver' },
  { to: '/cajas',        label: 'Cajas',         Icono: Landmark,        modulo: 'cajas',         accion: 'ver' },
  { to: '/configuracion',label: 'Configuración', Icono: Settings,        modulo: 'configuracion', accion: 'ver' },
];

export default function Sidebar({ visible, onCerrar, colapsado, onToggleColapsado }) {
  const { tienePermiso } = usePermisos();
  const { data: config = {} } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
    staleTime: 60_000,
  });
  const nombreNegocio = config.nombre_negocio || 'Restaurante';
  const logo = logoSrc(config.logo);

  const itemsVisibles = NAV_ITEMS.filter(
    (item) => item.siempre || tienePermiso(item.modulo, item.accion)
  );

  // En tablet/desktop: ancho dinámico según estado
  // visible=false → w-0 (oculto completamente)
  // visible=true, tablet → w-14 (solo iconos)
  // visible=true, desktop, colapsado → w-14
  // visible=true, desktop, expandido → w-60
  const anchoDesktop = !visible
    ? 'md:w-0 md:overflow-hidden md:border-r-0'
    : colapsado
      ? 'md:w-14 lg:w-14'
      : 'md:w-14 lg:w-60';

  // Labels: visibles en móvil (overlay) y en desktop expandido
  const labelClass = colapsado
    ? 'md:hidden'                // móvil: sí, tablet: no, desktop colapsado: no
    : 'md:hidden lg:inline';    // móvil: sí, tablet: no, desktop expandido: sí

  // Alineación del nav item
  const itemAlign = colapsado
    ? 'justify-start px-3 md:justify-center md:px-0'
    : 'justify-start px-3 md:justify-center md:px-0 lg:justify-start lg:px-3';

  return (
    <>
      {/* Backdrop — solo móvil cuando está visible */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onCerrar}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-700/60
          transition-all duration-300 ease-in-out
          w-64 shrink-0
          ${visible ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:z-auto
          ${anchoDesktop}
        `}
      >
        {/* Header */}
        <div className={`
          flex items-center py-4 min-h-[60px]
          border-b border-gray-200 dark:border-gray-700/60
          justify-between px-4
          md:justify-center md:px-0
          ${colapsado ? 'lg:justify-center lg:px-0' : 'lg:justify-between lg:px-5'}
        `}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden bg-blue-600 flex items-center justify-center">
              {logo
                ? <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                : <UtensilsCrossed className="w-4 h-4 text-white" />
              }
            </div>
            <div className={`min-w-0 md:hidden ${colapsado ? 'lg:hidden' : 'lg:block'}`}>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{nombreNegocio}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Sistema de Gestión</p>
            </div>
          </div>

          {/* X — solo en móvil */}
          <button
            onClick={onCerrar}
            className="md:hidden p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {itemsVisibles.map(({ to, label, Icono }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onCerrar}
              title={label}
              className={({ isActive }) => `
                flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${itemAlign}
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Icono className="w-[18px] h-[18px] shrink-0" />
              <span className={`truncate ${labelClass}`}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* CodeWave credit — solo cuando hay espacio para texto */}
        <div className={`shrink-0 flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-200 dark:border-gray-700/60 ${colapsado ? 'md:hidden' : 'md:hidden lg:flex'}`}>
          <span className="text-[9px] text-gray-400 dark:text-gray-600 font-medium whitespace-nowrap">by</span>
          <img src="/logo-light.png" alt="CodeWave" className="h-4 object-contain dark:hidden opacity-50" />
          <img src="/logo-dark.png"  alt="CodeWave" className="h-4 object-contain hidden dark:block opacity-50" />
        </div>

        {/* Toggle colapsar — solo desktop */}
        <button
          onClick={onToggleColapsado}
          title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          className="hidden lg:flex items-center justify-center h-11 border-t border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${colapsado ? 'rotate-180' : ''}`} />
        </button>
      </aside>
    </>
  );
}

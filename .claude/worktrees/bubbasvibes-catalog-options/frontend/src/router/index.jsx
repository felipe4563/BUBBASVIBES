import { createBrowserRouter, Navigate } from 'react-router-dom';
import RutaProtegida from './RutaProtegida';
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/auth/LoginPage';
import Dashboard from '../pages/Dashboard';
import VentasPage from '../pages/ventas/VentasPage';
import PedidoPage from '../pages/ventas/PedidoPage';
import ConfiguracionPage from '../pages/configuracion/ConfiguracionPage';
import ProductosPage from '../pages/productos/ProductosPage';
import CajaPage from '../pages/caja/CajaPage';
import RolesPage from '../pages/roles/RolesPage';
import SucursalesPage from '../pages/sucursales/SucursalesPage';
import CajasPage from '../pages/cajas/CajasPage';
import UsuariosPage from '../pages/usuarios/UsuariosPage';
import LibroCajaPage from '../pages/libro-caja/LibroCajaPage';
import InventarioPage from '../pages/inventario/InventarioPage';
import ComprasPage from '../pages/compras/ComprasPage';
import ClientesPage from '../pages/clientes/ClientesPage';
import ReportesPage from '../pages/reportes/ReportesPage';
import CocinaPage from '../pages/cocina/CocinaPage';
import PerfilPage from '../pages/perfil/PerfilPage';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RutaProtegida />,
      children: [
        {
          element: <Layout />,
          children: [
            { path: '/',                  element: <Dashboard /> },
            { path: '/ventas',            element: <VentasPage /> },
            { path: '/ventas/pedido/:id', element: <PedidoPage /> },
            { path: '/productos',         element: <ProductosPage /> },
            { path: '/configuracion',     element: <ConfiguracionPage /> },
            { path: '/caja',             element: <CajaPage /> },
            { path: '/roles',            element: <RolesPage /> },
            { path: '/sucursales',       element: <SucursalesPage /> },
            { path: '/cajas',            element: <CajasPage /> },
            { path: '/usuarios',         element: <UsuariosPage /> },
            { path: '/libro-caja',       element: <LibroCajaPage /> },
            { path: '/inventario',       element: <InventarioPage /> },
            { path: '/compras',          element: <ComprasPage /> },
            { path: '/clientes',         element: <ClientesPage /> },
            { path: '/reportes',         element: <ReportesPage /> },
            { path: '/cocina',           element: <CocinaPage /> },
            { path: '/perfil',           element: <PerfilPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

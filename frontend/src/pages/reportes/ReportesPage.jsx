import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, FileText, Package, Truck, BookOpen } from 'lucide-react';
import { getConfiguracion, logoSrc } from '../../api/configuracion';
import { usePermisos } from '../../hooks/usePermisos';
import TabVentas     from './tabs/TabVentas';
import TabInventario from './tabs/TabInventario';
import TabCompras    from './tabs/TabCompras';
import TabCaja       from './tabs/TabCaja';

const TABS = [
  { id: 'ventas',     label: 'Ventas',     Icono: FileText, Comp: TabVentas },
  { id: 'inventario', label: 'Inventario', Icono: Package,  Comp: TabInventario },
  { id: 'compras',    label: 'Compras',    Icono: Truck,    Comp: TabCompras },
  { id: 'caja',       label: 'Caja',       Icono: BookOpen, Comp: TabCaja },
];

export default function ReportesPage() {
  const { tienePermiso } = usePermisos();
  const [tab, setTab] = useState('ventas');

  const { data: config = {} } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
    staleTime: 5 * 60 * 1000,
  });

  const empresaInfo = {
    empresa:   config.nombre_negocio || 'RESTAURANTE',
    logo:      logoSrc(config.logo),
    direccion: config.direccion,
    telefono:  config.telefono,
  };

  if (!tienePermiso('reportes', 'ver')) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No tienes permiso para ver reportes.
      </div>
    );
  }

  const TabActivo = TABS.find(t => t.id === tab)?.Comp || null;

  return (
    <>
      <style>{`
        @keyframes rpFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 p-6 text-white shadow-xl">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -right-12 w-44 h-44 bg-white/5 rounded-full" />
          <div className="absolute top-4 right-24 w-10 h-10 bg-white/10 rounded-full" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reportes</h1>
              <p className="text-violet-200 text-sm">Filtra, analiza y exporta datos del negocio</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700/50 overflow-x-auto">
            {TABS.map(({ id, label, Icono }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap flex-1 justify-center ${
                  tab === id
                    ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}>
                <Icono className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {TabActivo && <TabActivo {...empresaInfo} />}
          </div>
        </div>
      </div>
    </>
  );
}

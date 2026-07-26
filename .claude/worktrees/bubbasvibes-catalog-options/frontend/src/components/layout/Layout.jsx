import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const [sidebarVisible, setSidebarVisible]     = useState(true);
  const [sidebarColapsado, setSidebarColapsado] = useState(
    () => localStorage.getItem('sidebar-colapsado') === 'true'
  );

  function toggleColapsado() {
    setSidebarColapsado(v => {
      localStorage.setItem('sidebar-colapsado', String(!v));
      return !v;
    });
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden transition-colors">
      <Sidebar
        visible={sidebarVisible}
        onCerrar={() => setSidebarVisible(false)}
        colapsado={sidebarColapsado}
        onToggleColapsado={toggleColapsado}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setSidebarVisible(v => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}

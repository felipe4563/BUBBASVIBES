import { useState } from 'react';
import Modal from '../../../components/ui/Modal';

export default function ModalLlevar({ onClose, onConfirmar, cargando }) {
  const [nombre, setNombre] = useState('');
  return (
    <Modal titulo="Nuevo pedido para llevar" onClose={onClose} ancho="max-w-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Nombre del cliente
          </label>
          <input
            type="text"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && nombre.trim() && onConfirmar(nombre.trim())}
            placeholder="Ej: Juan, Mesa exterior..."
            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(nombre.trim() || 'Cliente')}
            disabled={cargando}
            className="px-5 py-2 rounded-xl text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {cargando ? 'Creando...' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

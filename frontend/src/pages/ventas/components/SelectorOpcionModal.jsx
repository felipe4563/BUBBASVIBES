import Modal from '../../../components/ui/Modal';

export default function SelectorOpcionModal({ producto, onElegir, onClose }) {
  const grupo = producto.grupo_opciones;

  return (
    <Modal titulo={`${producto.nombre} — ${grupo.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {grupo.opciones.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => onElegir(opcion.nombre)}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            >
              {opcion.nombre}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onElegir(null)}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Agregar sin especificar
        </button>
      </div>
    </Modal>
  );
}

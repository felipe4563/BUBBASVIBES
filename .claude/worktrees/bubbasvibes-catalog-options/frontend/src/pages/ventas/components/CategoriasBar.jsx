export default function CategoriasBar({ categorias, categoriaActiva, onSeleccionar }) {
  const items = [{ id: null, nombre: 'Todos' }, ...categorias];

  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      {items.map((cat) => {
        const activa = categoriaActiva === cat.id;
        return (
          <button
            key={cat.id ?? 'todos'}
            type="button"
            onClick={() => onSeleccionar(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 ${
              activa
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {cat.nombre}
          </button>
        );
      })}
    </div>
  );
}

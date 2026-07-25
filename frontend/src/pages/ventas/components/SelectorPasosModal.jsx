import { useEffect, useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';

function pasoVisible(paso, seleccionPorGrupo) {
  if (!paso.disparado_por_opcion_id) return true;
  return Object.values(seleccionPorGrupo).some((s) => s.opcion_id === paso.disparado_por_opcion_id);
}

export default function SelectorPasosModal({ producto, onConfirmar, onClose }) {
  // seleccionPorGrupo: { [grupo_opciones_id]: { opcion_id, nombre_grupo, nombre_opcion, precio_delta } }
  const [seleccionPorGrupo, setSeleccionPorGrupo] = useState({});
  const [indice, setIndice] = useState(0);

  const pasosVisibles = useMemo(
    () => (producto.pasos || []).filter((p) => pasoVisible(p, seleccionPorGrupo)),
    [producto.pasos, seleccionPorGrupo]
  );

  const paso = pasosVisibles[indice];
  const esUltimo = indice === pasosVisibles.length - 1;
  const seleccionActual = paso ? seleccionPorGrupo[paso.grupo_opciones.id] : null;

  const precioTotal = parseFloat(producto.precio) + pasosVisibles.reduce((s, p) => {
    const sel = seleccionPorGrupo[p.grupo_opciones.id];
    return s + (sel ? parseFloat(sel.precio_delta || 0) : 0);
  }, 0);

  function elegir(opcion) {
    setSeleccionPorGrupo((prev) => ({
      ...prev,
      [paso.grupo_opciones.id]: {
        grupo_opciones_id: paso.grupo_opciones.id,
        opcion_id: opcion.id,
        nombre_grupo: paso.grupo_opciones.nombre,
        nombre_opcion: opcion.nombre,
        precio_delta: opcion.precio_delta,
      },
    }));
  }

  function siguiente() {
    if (esUltimo) {
      onConfirmar(pasosVisibles.map((p) => seleccionPorGrupo[p.grupo_opciones.id]).filter(Boolean));
      return;
    }
    setIndice((i) => i + 1);
  }

  // Defensivo: si pasosVisibles se encoge entre renders (p. ej. dos pasos
  // comparten el mismo disparador y uno deja de ser válido), indice puede
  // quedar apuntando fuera de rango. Lo recortamos antes de que el efecto de
  // abajo lo confunda con "no quedan pasos" y descarte las selecciones.
  useEffect(() => {
    if (pasosVisibles.length > 0 && indice >= pasosVisibles.length) {
      setIndice(pasosVisibles.length - 1);
    }
  }, [pasosVisibles.length, indice]);

  useEffect(() => {
    if (!paso) onConfirmar([]);
  }, [paso, onConfirmar]);

  if (!paso) {
    // Producto sin pasos (no debería abrirse este modal en ese caso, pero por seguridad):
    return null;
  }

  return (
    <Modal titulo={`${producto.nombre} — ${paso.grupo_opciones.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400">Paso {indice + 1} de {pasosVisibles.length}</p>

        <div className="flex flex-wrap gap-2">
          {paso.grupo_opciones.opciones.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => elegir(opcion)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                seleccionActual?.opcion_id === opcion.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              {opcion.nombre}{parseFloat(opcion.precio_delta) > 0 ? ` (+${opcion.precio_delta})` : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bs {precioTotal.toFixed(2)}</p>
          <div className="flex gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setIndice((i) => i - 1)}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={siguiente}
              disabled={paso.obligatorio && !seleccionActual}
              className="px-5 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {esUltimo ? 'Agregar al carrito' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Manda el ticket directo al agente de impresión instalado en ESTA PC
// (http://127.0.0.1, nunca sale a Internet). Es el camino principal de
// impresión: no depende de que el agente tenga el socket.io conectado al
// servidor. El backend igual emite el mismo evento por socket como respaldo
// (por si el agente está en otra PC, o si esta falla), y el propio agente
// deduplica para no imprimir el mismo pedido dos veces.
const PUERTO_AGENTE_LOCAL = 4321;
const TIMEOUT_MS = 1500;

function postConTimeout(url, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

export function imprimirLocal(datosImpresion) {
  if (!datosImpresion) return;
  const base = `http://127.0.0.1:${PUERTO_AGENTE_LOCAL}`;
  if (datosImpresion.caja) {
    postConTimeout(`${base}/imprimir/caja`, datosImpresion.caja).catch(() => {
      // Sin agente local en esta PC: no pasa nada, el socket.io del backend
      // ya mandó el mismo ticket como respaldo.
    });
  }
  if (datosImpresion.cocina) {
    postConTimeout(`${base}/imprimir/cocina`, datosImpresion.cocina).catch(() => {});
  }
}

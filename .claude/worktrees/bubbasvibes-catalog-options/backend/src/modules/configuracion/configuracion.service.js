const { Configuracion } = require('../../models');

async function obtenerTodo() {
  const configs = await Configuracion.findAll({ order: [['clave', 'ASC']] });
  return configs.reduce((obj, c) => {
    obj[c.clave] = c.valor;
    return obj;
  }, {});
}

async function obtenerPublica() {
  // Campos necesarios para cobrar (QR de pago) e imprimir tickets con la marca del
  // negocio, sin exigir el permiso "configuracion.ver" (que es admin-only).
  const claves = ['nombre_negocio', 'logo', 'direccion', 'telefono', 'simbolo_moneda', 'qr_pago'];
  const configs = await Configuracion.findAll({ where: { clave: claves } });
  return configs.reduce((obj, c) => {
    obj[c.clave] = c.valor;
    return obj;
  }, {});
}

async function actualizar(pares) {
  const claves = Object.keys(pares);
  for (const clave of claves) {
    await Configuracion.upsert({ clave, valor: pares[clave] });
  }
  return obtenerTodo();
}

module.exports = { obtenerTodo, obtenerPublica, actualizar };

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

const MIME_POR_EXTENSION = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
};

// Manifest de PWA generado en caliente: si el negocio subió un logo, ese
// logo se usa como ícono de instalación en vez del ícono genérico del sistema.
async function obtenerManifest({ backendOrigin, frontendOrigin }) {
  const configs = await Configuracion.findAll({ where: { clave: ['nombre_negocio', 'logo'] } });
  const cfg = configs.reduce((obj, c) => { obj[c.clave] = c.valor; return obj; }, {});

  const nombre = cfg.nombre_negocio || 'Sistema Restaurante';
  const extension = cfg.logo ? cfg.logo.split('.').pop().toLowerCase() : 'svg';
  const iconSrc = cfg.logo ? `${backendOrigin}${cfg.logo}` : `${frontendOrigin}/icons/icon.svg`;
  const iconType = MIME_POR_EXTENSION[extension] || 'image/png';

  return {
    name: nombre,
    short_name: nombre.length > 24 ? `${nombre.slice(0, 24)}…` : nombre,
    description: 'Sistema de gestión integral para restaurantes',
    theme_color: '#d97706',
    background_color: '#130D07',
    display: 'standalone',
    start_url: '/',
    orientation: 'portrait-primary',
    lang: 'es',
    categories: ['business', 'food'],
    icons: [
      { src: iconSrc, sizes: 'any', type: iconType, purpose: 'any' },
    ],
  };
}

module.exports = { obtenerTodo, obtenerPublica, actualizar, obtenerManifest };

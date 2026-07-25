// backend/database/seeds/seed-bubbasvibes.js
// Reemplaza el catálogo de "Solo Carnes Tropicales" por el de Bubbas Vibes.
// No toca usuarios, roles, sucursales, cajas, áreas ni mesas.
require('dotenv').config();
const {
  sequelize, Categoria, Producto, GrupoOpciones, Opcion, ProductoGrupoOpciones,
  Configuracion, DetallePedido, DetallePedidoOpciones, Pedido, Compra, DetalleCompra, RegistroInventario,
} = require('../../src/models');

const IMG = (nombre) => `/uploads/${nombre}`;

async function limpiarCatalogoAnterior() {
  // Se limpian también pedidos/compras/movimientos de inventario porque
  // referencian productos por FK sin ON DELETE CASCADE (o CASCADE en cadena
  // desde pedidos) — son datos de prueba de "Solo Carnes Tropicales", no
  // historial real de Bubbas Vibes. No se tocan sesiones de caja/libro_caja/
  // usuarios/roles/sucursales/áreas/mesas.
  // MySQL/InnoDB no soporta TRUNCATE ... CASCADE (a diferencia de Postgres) —
  // se desactivan las FK checks temporalmente para poder truncar en cualquier
  // orden sin toparse con ER_TRUNCATE_ILLEGAL_FK.
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await DetalleCompra.destroy({ where: {}, truncate: true });
  await Compra.destroy({ where: {}, truncate: true });
  await RegistroInventario.destroy({ where: {}, truncate: true });
  await DetallePedidoOpciones.destroy({ where: {}, truncate: true });
  await DetallePedido.destroy({ where: {}, truncate: true });
  await Pedido.destroy({ where: {}, truncate: true });
  await ProductoGrupoOpciones.destroy({ where: {}, truncate: true });
  await Producto.destroy({ where: {}, truncate: true });
  await Opcion.destroy({ where: {}, truncate: true });
  await GrupoOpciones.destroy({ where: {}, truncate: true });
  await Categoria.destroy({ where: {}, truncate: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function crearGrupo(nombre, opciones) {
  const grupo = await GrupoOpciones.create({ nombre });
  const creadas = await Opcion.bulkCreate(
    opciones.map((o, i) => ({ grupo_opciones_id: grupo.id, nombre: o.nombre, orden: i, precio_delta: o.precio_delta ?? 0 })),
    { returning: true }
  );
  const porNombre = {};
  creadas.forEach((o) => { porNombre[o.nombre] = o; });
  return { grupo, opciones: porNombre };
}

async function asignarPasos(producto_id, pasos) {
  await ProductoGrupoOpciones.bulkCreate(
    pasos.map((p, i) => ({
      producto_id,
      grupo_opciones_id: p.grupo_opciones_id,
      orden: i,
      obligatorio: p.obligatorio ?? true,
      disparado_por_opcion_id: p.disparado_por_opcion_id || null,
    }))
  );
}

async function seed() {
  await limpiarCatalogoAnterior();

  // --- Categorías ---
  const catBubbleTea = await Categoria.create({ nombre: 'Bubble Tea', imagen: IMG('bubbasvibes-bubble-tea.jpeg') });
  const catSodas = await Categoria.create({ nombre: 'Sodas Italianas', imagen: IMG('bubbasvibes-sodas-italianas.jpeg') });
  const catFrappes = await Categoria.create({ nombre: 'Frappes', imagen: IMG('bubbasvibes-frappes.jpeg') });
  const catLatte = await Categoria.create({ nombre: 'Ice Coffee Latte', imagen: IMG('bubbasvibes-ice-coffee-latte.jpeg') });
  const catInfusiones = await Categoria.create({ nombre: 'Infusiones', imagen: IMG('bubbasvibes-infusiones-waffles.jpeg') });
  const catWaffles = await Categoria.create({ nombre: 'Waffles', imagen: IMG('bubbasvibes-infusiones-waffles.jpeg') });

  // --- Grupos de opciones reutilizables ---
  const saborBubbleTea = await crearGrupo('Sabor Bubble Tea', [
    { nombre: 'Arandanitos' }, { nombre: 'Isla Exótica' }, { nombre: 'Oreo' },
    { nombre: 'Euphoria' }, { nombre: 'Shrek' }, { nombre: 'Sol de Verano' }, { nombre: 'Chocolate' },
  ]);
  const base = await crearGrupo('Base', [{ nombre: 'Leche' }, { nombre: 'Agua' }]);
  const estilo = await crearGrupo('Estilo', [{ nombre: 'Frapeado' }, { nombre: 'Líquido' }]);
  const hierbaBuenaSiNo = await crearGrupo('Hierba buena', [{ nombre: 'Sí' }, { nombre: 'No' }]);
  const saborPerlas = await crearGrupo('Sabor de perlas explosivas', [
    { nombre: 'Chirimoya' }, { nombre: 'Cereza' }, { nombre: 'Algodón de Azúcar' },
    { nombre: 'Açaí' }, { nombre: 'Maracuyá' }, { nombre: 'Sandía' },
  ]);
  const tamanoBubbleTea = await crearGrupo('Tamaño', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 8 }, // placeholder, editable desde Productos
  ]);
  const saborSoda = await crearGrupo('Sabor Soda Italiana', [
    { nombre: 'Maracuyá' }, { nombre: 'Frutilla' }, { nombre: 'Tumbo' }, { nombre: 'Guayaba' },
    { nombre: 'Sandía' }, { nombre: 'Jamaica' }, { nombre: 'Uva' }, { nombre: 'Durazno' },
  ]);
  const hierbaMenta = await crearGrupo('Hierba buena o menta', [{ nombre: 'Hierba buena' }, { nombre: 'Menta' }]);
  const tamanoSoda = await crearGrupo('Tamaño Soda', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande (lata)', precio_delta: 8 },
  ]);
  const saborFrappe = await crearGrupo('Sabor Frappe', [
    { nombre: 'Frutilla' }, { nombre: 'Chicle' }, { nombre: 'Mocca' }, { nombre: 'Oreo' }, { nombre: 'Chocolate' },
  ]);
  const tamanoFrappe = await crearGrupo('Tamaño Frappe', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 5 },
  ]);
  const agregarPerlas = await crearGrupo('¿Añadir perlas explosivas?', [
    { nombre: 'Sí', precio_delta: 6 }, { nombre: 'No', precio_delta: 0 },
  ]);
  const tamanoLatte = await crearGrupo('Tamaño Latte', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 5 },
  ]);

  // --- Productos ---
  const bubbleTea = await Producto.create({ categoria_id: catBubbleTea.id, nombre: 'Bubble Tea', precio: 20 });
  await asignarPasos(bubbleTea.id, [
    { grupo_opciones_id: saborBubbleTea.grupo.id },
    { grupo_opciones_id: base.grupo.id },
    { grupo_opciones_id: estilo.grupo.id },
    { grupo_opciones_id: hierbaBuenaSiNo.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id },
    { grupo_opciones_id: tamanoBubbleTea.grupo.id },
  ]);

  const sodaItaliana = await Producto.create({ categoria_id: catSodas.id, nombre: 'Soda Italiana', precio: 20 });
  await asignarPasos(sodaItaliana.id, [
    { grupo_opciones_id: saborSoda.grupo.id },
    { grupo_opciones_id: hierbaMenta.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id },
    { grupo_opciones_id: tamanoSoda.grupo.id },
  ]);

  const frappe = await Producto.create({ categoria_id: catFrappes.id, nombre: 'Frappe', precio: 23 });
  await asignarPasos(frappe.id, [
    { grupo_opciones_id: saborFrappe.grupo.id },
    { grupo_opciones_id: tamanoFrappe.grupo.id },
    { grupo_opciones_id: agregarPerlas.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id, disparado_por_opcion_id: agregarPerlas.opciones['Sí'].id },
  ]);

  const saboresLatte = ['Coco', 'Maracuyá', 'Frutilla', 'Banana'];
  for (const sabor of saboresLatte) {
    const producto = await Producto.create({ categoria_id: catLatte.id, nombre: `Ice Coffee Latte de ${sabor}`, precio: 20 });
    await asignarPasos(producto.id, [{ grupo_opciones_id: tamanoLatte.grupo.id }]);
  }

  const infusiones = ['Manzanilla', 'Té Negro', 'Té Verde', 'Anís', 'Trimate', 'Cedrón'];
  for (const nombre of infusiones) {
    await Producto.create({ categoria_id: catInfusiones.id, nombre, precio: 7 });
  }

  await Producto.create({ categoria_id: catWaffles.id, nombre: 'Waffle Simple', precio: 18 });
  await Producto.create({ categoria_id: catWaffles.id, nombre: 'Waffle Completo', precio: 25 });

  // --- Branding ---
  await Configuracion.upsert({ clave: 'nombre_negocio', valor: 'Bubbas Vibes' });
  await Configuracion.upsert({ clave: 'logo', valor: IMG('bubbasvibes-logo.jpeg') });

  console.log('Catálogo Bubbas Vibes creado correctamente.');
}

seed()
  .then(() => sequelize.close())
  .catch((err) => { console.error(err); process.exit(1); });

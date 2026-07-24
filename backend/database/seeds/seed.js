require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Rol, Permiso, Usuario, Sucursal, Area, SesionCaja, Pedido, Compra, RegistroInventario, Producto, ProductoStockSucursal, Caja } = require('../../src/models');

const PERMISOS = [
  { modulo: 'ventas', accion: 'ver', descripcion: 'Ver pedidos' },
  { modulo: 'ventas', accion: 'crear', descripcion: 'Crear pedidos' },
  { modulo: 'ventas', accion: 'cancelar', descripcion: 'Cancelar pedidos' },
  { modulo: 'ventas', accion: 'cobrar', descripcion: 'Cobrar pedidos' },
  { modulo: 'usuarios', accion: 'ver', descripcion: 'Ver usuarios' },
  { modulo: 'usuarios', accion: 'crear', descripcion: 'Crear usuarios' },
  { modulo: 'usuarios', accion: 'editar', descripcion: 'Editar usuarios' },
  { modulo: 'usuarios', accion: 'eliminar', descripcion: 'Eliminar usuarios' },
  { modulo: 'inventario', accion: 'ver', descripcion: 'Ver inventario' },
  { modulo: 'inventario', accion: 'ajustar', descripcion: 'Ajustar stock' },
  { modulo: 'inventario', accion: 'entrada', descripcion: 'Registrar entrada' },
  { modulo: 'inventario', accion: 'salida', descripcion: 'Registrar salida' },
  { modulo: 'caja', accion: 'abrir', descripcion: 'Abrir caja' },
  { modulo: 'caja', accion: 'cerrar', descripcion: 'Cerrar caja' },
  { modulo: 'caja', accion: 'ver', descripcion: 'Ver sesiones de caja' },
  { modulo: 'libro_caja', accion: 'ver', descripcion: 'Ver libro caja' },
  { modulo: 'libro_caja', accion: 'crear', descripcion: 'Registrar en libro caja' },
  { modulo: 'compras', accion: 'ver', descripcion: 'Ver compras' },
  { modulo: 'compras', accion: 'crear', descripcion: 'Crear compras' },
  { modulo: 'compras', accion: 'recibir', descripcion: 'Marcar compra como recibida' },
  { modulo: 'compras', accion: 'editar', descripcion: 'Editar compras' },
  { modulo: 'proveedores', accion: 'ver', descripcion: 'Ver proveedores' },
  { modulo: 'proveedores', accion: 'crear', descripcion: 'Crear proveedores' },
  { modulo: 'proveedores', accion: 'editar', descripcion: 'Editar proveedores' },
  { modulo: 'productos', accion: 'ver', descripcion: 'Ver productos' },
  { modulo: 'productos', accion: 'crear', descripcion: 'Crear productos' },
  { modulo: 'productos', accion: 'editar', descripcion: 'Editar productos' },
  { modulo: 'productos', accion: 'eliminar', descripcion: 'Eliminar productos' },
  { modulo: 'clientes', accion: 'ver', descripcion: 'Ver clientes' },
  { modulo: 'clientes', accion: 'crear', descripcion: 'Crear clientes' },
  { modulo: 'clientes', accion: 'editar', descripcion: 'Editar clientes' },
  { modulo: 'configuracion', accion: 'ver', descripcion: 'Ver configuración' },
  { modulo: 'configuracion', accion: 'editar', descripcion: 'Editar configuración' },
  { modulo: 'roles', accion: 'ver', descripcion: 'Ver roles' },
  { modulo: 'roles', accion: 'crear', descripcion: 'Crear roles' },
  { modulo: 'roles', accion: 'editar', descripcion: 'Editar roles' },
  { modulo: 'roles', accion: 'eliminar', descripcion: 'Eliminar roles' },
  { modulo: 'reportes', accion: 'ver', descripcion: 'Ver reportes' },
  { modulo: 'cocina', accion: 'ver', descripcion: 'Ver pantalla de cocina' },
  { modulo: 'sucursales', accion: 'ver', descripcion: 'Ver sucursales' },
  { modulo: 'sucursales', accion: 'crear', descripcion: 'Crear sucursales' },
  { modulo: 'sucursales', accion: 'editar', descripcion: 'Editar sucursales' },
  { modulo: 'sucursales', accion: 'eliminar', descripcion: 'Eliminar sucursales' },
  { modulo: 'cajas', accion: 'ver', descripcion: 'Ver cajas' },
  { modulo: 'cajas', accion: 'crear', descripcion: 'Crear cajas' },
  { modulo: 'cajas', accion: 'editar', descripcion: 'Editar cajas' },
  { modulo: 'cajas', accion: 'eliminar', descripcion: 'Eliminar cajas' },
];

async function seed() {
  await sequelize.authenticate();

  // Insertar permisos
  const permisos = await Promise.all(
    PERMISOS.map(p => Permiso.findOrCreate({ where: { modulo: p.modulo, accion: p.accion }, defaults: p }))
  );
  const permisosCreados = permisos.map(([p]) => p);

  // Rol Administrador — todos los permisos
  const [admin] = await Rol.findOrCreate({ where: { nombre: 'Administrador' }, defaults: { descripcion: 'Acceso total' } });
  await admin.setPermisos(permisosCreados);

  // Rol Cajero
  const [cajero] = await Rol.findOrCreate({ where: { nombre: 'Cajero' }, defaults: { descripcion: 'Ventas, caja y clientes' } });
  const permisosCajero = permisosCreados.filter(p =>
    ['ventas', 'caja', 'libro_caja', 'clientes'].includes(p.modulo)
  );
  await cajero.setPermisos(permisosCajero);

  // Rol Mozo
  const [mozo] = await Rol.findOrCreate({ where: { nombre: 'Mozo' }, defaults: { descripcion: 'Toma de pedidos' } });
  const permisosMozo = permisosCreados.filter(p =>
    (p.modulo === 'ventas' && ['ver', 'crear'].includes(p.accion)) ||
    (p.modulo === 'cocina' && p.accion === 'ver')
  );
  await mozo.setPermisos(permisosMozo);

  // Permiso cocina.ver para Cajero también
  const cajeroActual = await cajero.getPermisos();
  const cocinaVer = permisosCreados.find(p => p.modulo === 'cocina' && p.accion === 'ver');
  if (cocinaVer) await cajero.addPermiso(cocinaVer);

  // Usuario admin
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('ADVERTENCIA: Usando contraseña por defecto "admin123". Cambiar ADMIN_PASSWORD en .env para producción.');
  }
  const hash = await bcrypt.hash(adminPass, 12);
  await Usuario.findOrCreate({
    where: { email: 'admin@restaurante.com' },
    defaults: { rol_id: admin.id, nombre: 'Administrador', contrasena: hash },
  });

  // Sucursal por defecto — migra instalaciones existentes a una sola sucursal
  const [principal] = await Sucursal.findOrCreate({
    where: { nombre: 'Sucursal Principal' },
    defaults: { activo: 1 },
  });
  const usuariosExistentes = await Usuario.findAll();
  for (const u of usuariosExistentes) {
    const yaAsignado = await u.hasSucursal(principal);
    if (!yaAsignado) await u.addSucursal(principal);
  }

  // Backfill operativo Fase 2 — todo lo existente queda en la Sucursal Principal
  await sequelize.query('UPDATE areas SET sucursal_id = ? WHERE sucursal_id IS NULL OR sucursal_id = 0', { replacements: [principal.id] });
  await sequelize.query('UPDATE sesiones_caja SET sucursal_id = ? WHERE sucursal_id IS NULL OR sucursal_id = 0', { replacements: [principal.id] });
  await sequelize.query('UPDATE pedidos SET sucursal_id = ? WHERE sucursal_id IS NULL OR sucursal_id = 0', { replacements: [principal.id] });
  await sequelize.query('UPDATE compras SET sucursal_id = ? WHERE sucursal_id IS NULL OR sucursal_id = 0', { replacements: [principal.id] });
  await sequelize.query('UPDATE registros_inventario SET sucursal_id = ? WHERE sucursal_id IS NULL OR sucursal_id = 0', { replacements: [principal.id] });

  // Backfill Fase 6 — una Caja Principal por cada sucursal existente
  const sucursalesExistentes = await Sucursal.findAll();
  for (const s of sucursalesExistentes) {
    const [cajaPrincipal] = await Caja.findOrCreate({
      where: { sucursal_id: s.id, nombre: 'Caja Principal' },
      defaults: { activo: 1 },
    });
    await sequelize.query(
      'UPDATE sesiones_caja SET caja_id = ? WHERE sucursal_id = ? AND caja_id IS NULL',
      { replacements: [cajaPrincipal.id, s.id] }
    );
  }

  const productosConStock = await Producto.findAll({ where: { stock: { [require('sequelize').Op.ne]: null } } });
  for (const p of productosConStock) {
    await ProductoStockSucursal.findOrCreate({
      where: { producto_id: p.id, sucursal_id: principal.id },
      defaults: { stock: p.stock },
    });
  }

  // Configuraciones base
  const { sequelize: db } = require('../../src/models');
  await db.query(`
    INSERT IGNORE INTO configuraciones (clave, valor) VALUES
      ('nombre_negocio', 'Mi Restaurante'),
      ('direccion', ''),
      ('telefono', ''),
      ('moneda', 'Bs'),
      ('simbolo_moneda', 'Bs.'),
      ('zona_horaria', 'America/La_Paz'),
      ('pie_ticket', '¡Gracias por su preferencia!'),
      ('logo', NULL),
      ('flujo_cocina', 'digital')
  `);

  await db.query(`ALTER TABLE pedidos MODIFY COLUMN estado ENUM('pendiente','listo','completado','cancelado') NOT NULL DEFAULT 'pendiente'`);

  console.log('Seed completado');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });

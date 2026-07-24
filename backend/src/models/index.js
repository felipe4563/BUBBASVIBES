const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RolesPermisos = sequelize.define('roles_permisos', {
  rol_id: { type: DataTypes.INTEGER.UNSIGNED },
  permiso_id: { type: DataTypes.INTEGER.UNSIGNED },
}, { tableName: 'roles_permisos', timestamps: false });

const UsuariosSucursales = sequelize.define('usuarios_sucursales', {
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED },
}, { tableName: 'usuarios_sucursales', timestamps: false });

const Rol = require('./Rol');
const Permiso = require('./Permiso');
const Usuario = require('./Usuario');
const Area = require('./Area');
const Mesa = require('./Mesa');
const Categoria = require('./Categoria');
const Producto = require('./Producto');
const GrupoOpciones = require('./GrupoOpciones');
const Opcion = require('./Opcion');
const Cliente = require('./Cliente');
const SesionCaja = require('./SesionCaja');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');
const DetalleArqueo = require('./DetalleArqueo');
const Gasto = require('./Gasto');
const LibroCaja = require('./LibroCaja');
const Proveedor = require('./Proveedor');
const Compra = require('./Compra');
const DetalleCompra = require('./DetalleCompra');
const RegistroInventario = require('./RegistroInventario');
const Configuracion = require('./Configuracion');
const Reservacion = require('./Reservacion');
const Sucursal = require('./Sucursal');
const ProductoStockSucursal = require('./ProductoStockSucursal');
const Caja = require('./Caja');
const PagoQr = require('./PagoQr');

// Roles y Permisos
Rol.belongsToMany(Permiso, { through: RolesPermisos, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
Permiso.belongsToMany(Rol, { through: RolesPermisos, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });

// Usuario
Usuario.belongsTo(Rol, { foreignKey: 'rol_id', as: 'rol' });
Rol.hasMany(Usuario, { foreignKey: 'rol_id', as: 'usuarios' });

// Sucursales
// NOTE: 'as' is passed as { singular, plural } instead of a plain string because
// Sequelize's English inflection library mis-singularizes 'sucursales' as
// 'sucursale' (not 'sucursal'), which would otherwise produce hasSucursale/
// addSucursale instead of the hasSucursal/addSucursal mixins this codebase relies on.
Usuario.belongsToMany(Sucursal, { through: UsuariosSucursales, foreignKey: 'usuario_id', otherKey: 'sucursal_id', as: { singular: 'sucursal', plural: 'sucursales' } });
Sucursal.belongsToMany(Usuario, { through: UsuariosSucursales, foreignKey: 'sucursal_id', otherKey: 'usuario_id', as: 'usuarios' });

// Mesas
Mesa.belongsTo(Area, { foreignKey: 'area_id', as: 'area' });
Area.hasMany(Mesa, { foreignKey: 'area_id', as: 'mesas' });

// Productos
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

// Opciones de producto
GrupoOpciones.hasMany(Opcion, { foreignKey: 'grupo_opciones_id', as: 'opciones' });
Opcion.belongsTo(GrupoOpciones, { foreignKey: 'grupo_opciones_id', as: 'grupo' });
Producto.belongsTo(GrupoOpciones, { foreignKey: 'grupo_opciones_id', as: 'grupo_opciones' });
GrupoOpciones.hasMany(Producto, { foreignKey: 'grupo_opciones_id', as: 'productos' });

// Pedidos
Pedido.belongsTo(Mesa, { foreignKey: 'mesa_id', as: 'mesa' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Pedido.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Pedido.belongsTo(SesionCaja, { foreignKey: 'sesion_caja_id', as: 'sesion_caja' });
Pedido.hasMany(DetallePedido, { foreignKey: 'pedido_id', as: 'detalles' });
DetallePedido.belongsTo(Pedido, { foreignKey: 'pedido_id' });
DetallePedido.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// SesionCaja
SesionCaja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
SesionCaja.hasMany(Pedido, { foreignKey: 'sesion_caja_id', as: 'pedidos' });

// Caja
SesionCaja.hasMany(DetalleArqueo, { foreignKey: 'sesion_caja_id', as: 'detalle_arqueo' });
DetalleArqueo.belongsTo(SesionCaja, { foreignKey: 'sesion_caja_id' });

SesionCaja.hasMany(Gasto, { foreignKey: 'sesion_caja_id', as: 'gastos' });
Gasto.belongsTo(SesionCaja, { foreignKey: 'sesion_caja_id' });
Gasto.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

SesionCaja.hasMany(LibroCaja, { foreignKey: 'sesion_caja_id', as: 'libro_caja' });
LibroCaja.belongsTo(SesionCaja, { foreignKey: 'sesion_caja_id', as: 'sesion_caja' });
LibroCaja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Compras
Proveedor.hasMany(Compra, { foreignKey: 'proveedor_id', as: 'compras' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Compra.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Compra.hasMany(DetalleCompra, { foreignKey: 'compra_id', as: 'detalles' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'compra_id' });
DetalleCompra.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Inventario
RegistroInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
RegistroInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Producto.hasMany(RegistroInventario, { foreignKey: 'producto_id', as: 'movimientos' });

// Reservaciones
Reservacion.belongsTo(Mesa, { foreignKey: 'mesa_id', as: 'mesa' });
Mesa.hasMany(Reservacion, { foreignKey: 'mesa_id', as: 'reservaciones' });

// Sucursal_id operativo (Fase 2)
Area.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
SesionCaja.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Pedido.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Compra.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
RegistroInventario.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });

// Stock por sucursal
Producto.hasMany(ProductoStockSucursal, { foreignKey: 'producto_id', as: 'stock_sucursales' });
ProductoStockSucursal.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
ProductoStockSucursal.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });

// Cajas físicas (Fase 6)
Caja.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Sucursal.hasMany(Caja, { foreignKey: 'sucursal_id', as: 'cajas' });
Caja.hasMany(SesionCaja, { foreignKey: 'caja_id', as: 'sesiones' });
SesionCaja.belongsTo(Caja, { foreignKey: 'caja_id', as: 'caja' });

// Pagos QR (CodePay)
Pedido.hasMany(PagoQr, { foreignKey: 'pedido_id', as: 'pagosQr' });
PagoQr.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });
PagoQr.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });

module.exports = {
  sequelize,
  Rol, Permiso, Usuario,
  Area, Mesa,
  Categoria, Producto,
  GrupoOpciones, Opcion,
  Cliente,
  SesionCaja, Pedido, DetallePedido,
  DetalleArqueo, Gasto, LibroCaja,
  Proveedor, Compra, DetalleCompra,
  RegistroInventario,
  Configuracion,
  Reservacion,
  Sucursal,
  ProductoStockSucursal,
  Caja,
  PagoQr,
};

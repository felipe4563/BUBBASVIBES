const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  mesa_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  cliente_id: { type: DataTypes.INTEGER.UNSIGNED },
  sesion_caja_id: { type: DataTypes.INTEGER.UNSIGNED },
  tipo: { type: DataTypes.ENUM('mesa', 'llevar'), defaultValue: 'mesa' },
  numero_llevar: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  estado: { type: DataTypes.ENUM('pendiente','listo','pendiente_pago','completado','cancelado'), defaultValue: 'pendiente' },
  tipo_documento: { type: DataTypes.STRING(50), defaultValue: 'Ticket' },
  nombre_cliente: { type: DataTypes.STRING(255), defaultValue: 'Público General' },
  documento_cliente: { type: DataTypes.STRING(50) },
  total: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  descuento: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  propina: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  metodo_pago: { type: DataTypes.ENUM('efectivo','qr'), defaultValue: 'efectivo' },
  monto_recibido: { type: DataTypes.DECIMAL(10,2) },
  cambio: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  notas: { type: DataTypes.TEXT },
}, {
  tableName: 'pedidos',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Pedido;

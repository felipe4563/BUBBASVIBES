const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PagoQr = sequelize.define('PagoQr', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  pedido_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  order_id: { type: DataTypes.STRING(25), allowNull: false, unique: true },
  tx_id: { type: DataTypes.STRING(100) },
  estado: { type: DataTypes.ENUM('pendiente', 'completado', 'fallido', 'expirado', 'cancelado'), defaultValue: 'pendiente' },
  estado_previo: { type: DataTypes.STRING(20), allowNull: false },
  moneda: { type: DataTypes.STRING(3), defaultValue: 'BOB' },
  monto_neto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  comision: { type: DataTypes.DECIMAL(10, 2) },
  monto_total: { type: DataTypes.DECIMAL(10, 2) },
  qr_code: { type: DataTypes.TEXT('medium') },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  datos_webhook: { type: DataTypes.JSON },
}, {
  tableName: 'pagos_qr',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = PagoQr;

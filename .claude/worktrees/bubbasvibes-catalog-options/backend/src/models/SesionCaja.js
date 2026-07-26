const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SesionCaja = sequelize.define('SesionCaja', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  caja_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  monto_apertura: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  monto_cierre: { type: DataTypes.DECIMAL(10,2) },
  total_ventas: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total_gastos: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  diferencia: { type: DataTypes.DECIMAL(10,2) },
  abierto_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  cerrado_en: { type: DataTypes.DATE },
  estado: { type: DataTypes.ENUM('abierta','cerrada'), defaultValue: 'abierta' },
}, {
  tableName: 'sesiones_caja',
  timestamps: false,
});

module.exports = SesionCaja;

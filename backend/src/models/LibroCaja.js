const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LibroCaja = sequelize.define('LibroCaja', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sesion_caja_id: { type: DataTypes.INTEGER.UNSIGNED },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  tipo: { type: DataTypes.ENUM('ingreso', 'egreso'), allowNull: false },
  concepto: { type: DataTypes.STRING(255), allowNull: false },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  metodo_pago: { type: DataTypes.ENUM('efectivo', 'qr'), defaultValue: 'efectivo' },
  referencia_id: { type: DataTypes.INTEGER.UNSIGNED },
}, { tableName: 'libro_caja', createdAt: 'creado_en', updatedAt: 'actualizado_en' });

module.exports = LibroCaja;

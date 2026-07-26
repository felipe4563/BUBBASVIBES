const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetalleArqueo = sequelize.define('DetalleArqueo', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sesion_caja_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  denominacion: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, { tableName: 'detalle_arqueo', timestamps: false });

module.exports = DetalleArqueo;

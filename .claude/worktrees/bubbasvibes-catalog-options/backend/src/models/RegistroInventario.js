const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RegistroInventario = sequelize.define('RegistroInventario', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  tipo: { type: DataTypes.ENUM('entrada', 'salida', 'venta', 'compra', 'ajuste'), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  stock_anterior: { type: DataTypes.INTEGER },
  stock_nuevo: { type: DataTypes.INTEGER },
  nota: { type: DataTypes.STRING(255) },
}, { tableName: 'registros_inventario', createdAt: 'creado_en', updatedAt: 'actualizado_en' });

module.exports = RegistroInventario;

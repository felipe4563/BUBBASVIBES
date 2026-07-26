const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductoStockSucursal = sequelize.define('ProductoStockSucursal', {
  producto_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'producto_stock_sucursal',
  timestamps: true,
  createdAt: false,
  updatedAt: 'actualizado_en',
});

module.exports = ProductoStockSucursal;

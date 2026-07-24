const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Producto = sequelize.define('Producto', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  categoria_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  codigo_barras: { type: DataTypes.STRING(255), unique: true },
  codigo: { type: DataTypes.STRING(100) },
  precio: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  costo: { type: DataTypes.DECIMAL(10,2) },
  stock: { type: DataTypes.INTEGER },
  es_vendible: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  imagen: { type: DataTypes.STRING(255) },
  activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, {
  tableName: 'productos',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Producto;

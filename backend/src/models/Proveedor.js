const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Proveedor = sequelize.define('Proveedor', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  contacto: { type: DataTypes.STRING(255) },
  telefono: { type: DataTypes.STRING(50) },
  email: { type: DataTypes.STRING(255) },
  direccion: { type: DataTypes.STRING(255) },
  activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, { tableName: 'proveedores', createdAt: 'creado_en', updatedAt: 'actualizado_en' });

module.exports = Proveedor;

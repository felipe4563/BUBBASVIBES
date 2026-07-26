const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sucursal = sequelize.define('Sucursal', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  direccion: { type: DataTypes.STRING(255) },
  telefono: { type: DataTypes.STRING(50) },
  activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, {
  tableName: 'sucursales',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Sucursal;

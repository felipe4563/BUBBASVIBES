const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Opcion = sequelize.define('Opcion', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'opciones',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Opcion;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permiso = sequelize.define('Permiso', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  modulo: { type: DataTypes.STRING(50), allowNull: false },
  accion: { type: DataTypes.STRING(50), allowNull: false },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: 'permisos',
  timestamps: false,
});

module.exports = Permiso;

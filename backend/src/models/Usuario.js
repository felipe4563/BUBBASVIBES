const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  rol_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  acceso_todas_sucursales: { type: DataTypes.TINYINT(1), defaultValue: 0 },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  contrasena: { type: DataTypes.STRING(255), allowNull: false },
  activo: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  token_recordar: { type: DataTypes.STRING(255) },
}, {
  tableName: 'usuarios',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Usuario;

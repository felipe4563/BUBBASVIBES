const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: 'roles',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Rol;

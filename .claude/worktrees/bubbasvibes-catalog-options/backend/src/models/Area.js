const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Area = sequelize.define('Area', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sucursal_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
}, {
  tableName: 'areas',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Area;

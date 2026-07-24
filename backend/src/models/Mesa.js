const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mesa = sequelize.define('Mesa', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  area_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  asientos: { type: DataTypes.INTEGER, defaultValue: 4 },
  estado: { type: DataTypes.ENUM('disponible','ocupada','reservada'), defaultValue: 'disponible' },
  pos_x: { type: DataTypes.INTEGER, defaultValue: 0 },
  pos_y: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'mesas',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Mesa;

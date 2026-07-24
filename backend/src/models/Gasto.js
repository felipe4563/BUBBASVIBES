const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Gasto = sequelize.define('Gasto', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sesion_caja_id: { type: DataTypes.INTEGER.UNSIGNED },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  descripcion: { type: DataTypes.STRING(255), allowNull: false },
  monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'gastos', createdAt: 'creado_en', updatedAt: 'actualizado_en' });

module.exports = Gasto;

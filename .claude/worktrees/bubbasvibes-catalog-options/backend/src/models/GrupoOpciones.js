const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GrupoOpciones = sequelize.define('GrupoOpciones', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
}, {
  tableName: 'grupos_opciones',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = GrupoOpciones;

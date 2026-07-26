const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductoGrupoOpciones = sequelize.define('ProductoGrupoOpciones', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  obligatorio: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  disparado_por_opcion_id: { type: DataTypes.INTEGER.UNSIGNED },
}, {
  tableName: 'producto_grupos_opciones',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = ProductoGrupoOpciones;

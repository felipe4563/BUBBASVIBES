const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetallePedidoOpciones = sequelize.define('DetallePedidoOpciones', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  detalle_pedido_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  opcion_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre_grupo: { type: DataTypes.STRING(100), allowNull: false },
  nombre_opcion: { type: DataTypes.STRING(100), allowNull: false },
  precio_delta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, {
  tableName: 'detalle_pedido_opciones',
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = DetallePedidoOpciones;

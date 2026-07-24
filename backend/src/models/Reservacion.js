const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservacion = sequelize.define('Reservacion', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombre_cliente: { type: DataTypes.STRING(255), allowNull: false },
  telefono: { type: DataTypes.STRING(50) },
  hora_reserva: { type: DataTypes.DATE, allowNull: false },
  personas: { type: DataTypes.INTEGER, allowNull: false },
  mesa_id: { type: DataTypes.INTEGER.UNSIGNED },
  nota: { type: DataTypes.TEXT },
  estado: { type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'), defaultValue: 'pendiente' },
}, { tableName: 'reservaciones', createdAt: 'creado_en', updatedAt: 'actualizado_en' });

module.exports = Reservacion;

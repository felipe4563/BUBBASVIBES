const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '-04:00',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    // Sin esto, Sequelize usa el default (max: 5) para TODA la app — en hora
    // pico, con varias cajas cobrando a la vez, las conexiones se agotan y
    // las peticiones (incluida la que dispara la impresión) quedan en cola
    // esperando, sin liberarse solas.
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: 0,
      acquire: 30000, // ms que una petición espera por una conexión libre antes de fallar (en vez de colgarse indefinidamente)
      idle: 10000,    // ms que una conexión puede estar libre antes de cerrarse
    },
    define: {
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      underscored: true,
    },
  }
);

module.exports = sequelize;

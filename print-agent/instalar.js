// Ejecutar como Administrador: node instalar.js
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'Restaurante - Agente Impresion',
  description: 'Agente de impresion termica automatica (caja + cocina)',
  script: path.join(__dirname, 'index.js'),
  wait: 2,
  grow: 0.5,
});

svc.on('install',  () => { svc.start(); console.log('✓ Servicio instalado e iniciado'); });
svc.on('alreadyinstalled', () => console.log('! Ya estaba instalado'));
svc.on('error',    (err) => console.error('✗ Error:', err));

svc.install();

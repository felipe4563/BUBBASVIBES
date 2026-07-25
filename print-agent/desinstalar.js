// Ejecutar como Administrador: node desinstalar.js
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'Restaurante - Agente Impresion',
  script: path.join(__dirname, 'index.js'),
});

svc.on('uninstall', () => console.log('✓ Servicio desinstalado'));
svc.on('error',     (err) => console.error('✗ Error:', err));

svc.uninstall();

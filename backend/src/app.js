require('dotenv').config({ quiet: true });
const express = require('express');
const path = require('path');
const cors = require('cors');
const manejarErrores = require('./middlewares/errores');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const authRoutes = require('./modules/auth/auth.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const sucursalesRoutes = require('./modules/sucursales/sucursales.routes');
const cajasRoutes = require('./modules/cajas/cajas.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const mesasRoutes = require('./modules/mesas/mesas.routes');
const areasRoutes = require('./modules/mesas/areas.routes');
const productosRoutes = require('./modules/productos/productos.routes');
const categoriasRoutes = require('./modules/productos/categorias.routes');
const gruposOpcionesRoutes = require('./modules/productos/grupos-opciones.routes');
const clientesRoutes = require('./modules/clientes/clientes.routes');
const cajaRoutes = require('./modules/caja/caja.routes');
const ventasRoutes = require('./modules/ventas/ventas.routes');
const libroCajaRoutes = require('./modules/libro_caja/libro_caja.routes');
const comprasRoutes = require('./modules/compras/compras.routes');
const proveedoresRoutes = require('./modules/compras/proveedores.routes');
const inventarioRoutes = require('./modules/inventario/inventario.routes');
const configuracionRoutes = require('./modules/configuracion/configuracion.routes');
const reservacionesRoutes = require('./modules/reservaciones/reservaciones.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const perfilRoutes = require('./modules/perfil/perfil.routes');
const codepayWebhookRoutes = require('./webhooks/codepay.webhook.routes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/v1/salud', (_req, res) => {
  res.json({ ok: true, datos: 'API restaurante funcionando' });
});

app.use('/webhooks', codepayWebhookRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/sucursales', sucursalesRoutes);
app.use('/api/v1/cajas', cajasRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);
app.use('/api/v1/mesas', mesasRoutes);
app.use('/api/v1/areas', areasRoutes);
app.use('/api/v1/productos', productosRoutes);
app.use('/api/v1/categorias', categoriasRoutes);
app.use('/api/v1/grupos-opciones', gruposOpcionesRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/caja', cajaRoutes);
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/libro-caja', libroCajaRoutes);
app.use('/api/v1/compras', comprasRoutes);
app.use('/api/v1/proveedores', proveedoresRoutes);
app.use('/api/v1/inventario', inventarioRoutes);
app.use('/api/v1/configuracion', configuracionRoutes);
app.use('/api/v1/reservaciones', reservacionesRoutes);
app.use('/api/v1/reportes', reportesRoutes);
app.use('/api/v1/perfil', perfilRoutes);
app.use('/api/v1/uploads', uploadsRoutes);

app.use(manejarErrores);

module.exports = app;

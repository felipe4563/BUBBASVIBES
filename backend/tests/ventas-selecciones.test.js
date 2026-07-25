const request = require('supertest');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
const {
  Sucursal, Area, Mesa, Categoria, Producto, GrupoOpciones, Opcion, ProductoGrupoOpciones,
  Usuario, Rol, SesionCaja, Pedido, LibroCaja, Caja, DetallePedidoOpciones,
} = require('../src/models');

describe('Ventas — selecciones con precio_delta', () => {
  let sucursalId, usuarioId, token, cajaId, sesionId, mesaId, productoId, grupoTamId, opMedId, opGrandeId;

  beforeAll(async () => {
    const sucursal = await Sucursal.create({ nombre: 'Sucursal Selecciones Test' });
    sucursalId = sucursal.id;
    const area = await Area.create({ nombre: 'Area Selecciones Test', sucursal_id: sucursalId });
    const mesa = await Mesa.create({ area_id: area.id, nombre: 'Mesa Selecciones Test' });
    mesaId = mesa.id;

    const categoria = await Categoria.create({ nombre: 'Categoria Selecciones Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Bubble Tea Selecciones Test', precio: 20 });
    productoId = producto.id;

    const grupoTam = await GrupoOpciones.create({ nombre: 'Tamaño Selecciones Test' });
    grupoTamId = grupoTam.id;
    const opMed = await Opcion.create({ grupo_opciones_id: grupoTamId, nombre: 'Mediano', orden: 1, precio_delta: 0 });
    opMedId = opMed.id;
    const opGrande = await Opcion.create({ grupo_opciones_id: grupoTamId, nombre: 'Grande', orden: 2, precio_delta: 8 });
    opGrandeId = opGrande.id;

    await ProductoGrupoOpciones.create({ producto_id: productoId, grupo_opciones_id: grupoTamId, orden: 1, obligatorio: true });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'Selecciones Test', email: 'selecciones-test@restaurante.com', contrasena: hash });
    await usuario.addSucursal(sucursal);
    usuarioId = usuario.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'selecciones-test@restaurante.com', contrasena: 'clave123' });
    token = login.body.datos.token;

    const caja = await Caja.create({ sucursal_id: sucursalId, nombre: 'Caja Selecciones Test' });
    cajaId = caja.id;
    const sesion = await SesionCaja.create({ usuario_id: usuarioId, sucursal_id: sucursalId, caja_id: cajaId, monto_apertura: 0 });
    sesionId = sesion.id;
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { usuario_id: usuarioId } });
    await LibroCaja.destroy({ where: { usuario_id: usuarioId } });
    await SesionCaja.destroy({ where: { id: sesionId } });
    await Caja.destroy({ where: { id: cajaId } });
    await ProductoGrupoOpciones.destroy({ where: { producto_id: productoId } });
    await Opcion.destroy({ where: { grupo_opciones_id: grupoTamId } });
    await GrupoOpciones.destroy({ where: { id: grupoTamId } });
    await Producto.destroy({ where: { id: productoId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Mesa.destroy({ where: { id: mesaId } });
    await Area.destroy({ where: { sucursal_id: sucursalId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
  });

  it('calcula el precio final sumando el precio_delta de la opción elegida', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'llevar', metodo_pago: 'efectivo', monto_recibido: 28, sesion_caja_id: sesionId,
        items: [{ producto_id: productoId, cantidad: 1, selecciones: [{ grupo_opciones_id: grupoTamId, opcion_id: opGrandeId }] }],
      });

    expect(res.status).toBe(201);
    expect(res.body.datos.total).toBe('28.00');
    const detalleId = res.body.datos.detalles[0].id;
    const opciones = await DetallePedidoOpciones.findAll({ where: { detalle_pedido_id: detalleId } });
    expect(opciones).toHaveLength(1);
    expect(opciones[0].nombre_opcion).toBe('Grande');
    expect(parseFloat(opciones[0].precio_delta)).toBe(8);
  });

  it('rechaza el pedido si falta una selección obligatoria', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'llevar', metodo_pago: 'efectivo', monto_recibido: 20, sesion_caja_id: sesionId,
        items: [{ producto_id: productoId, cantidad: 1, selecciones: [] }],
      });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toMatch(/Tamaño Selecciones Test/);
  });

  it('ignora una selección con grupo_opciones_id que no corresponde a ningún paso del producto', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'llevar', metodo_pago: 'efectivo', monto_recibido: 28, sesion_caja_id: sesionId,
        items: [{
          producto_id: productoId,
          cantidad: 1,
          selecciones: [
            { grupo_opciones_id: grupoTamId, opcion_id: opGrandeId },
            { grupo_opciones_id: 999999, opcion_id: 888888 },
          ],
        }],
      });

    expect(res.status).toBe(201);
    expect(res.body.datos.total).toBe('28.00');
    const detalleId = res.body.datos.detalles[0].id;
    const opciones = await DetallePedidoOpciones.findAll({ where: { detalle_pedido_id: detalleId } });
    expect(opciones).toHaveLength(1);
    expect(opciones[0].nombre_opcion).toBe('Grande');
  });
});

const request = require('supertest');
const app = require('../src/app');

describe('Productos API', () => {
  it('GET /api/v1/productos sin token → 401', async () => {
    const res = await request(app).get('/api/v1/productos');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/categorias sin token → 401', async () => {
    const res = await request(app).get('/api/v1/categorias');
    expect(res.status).toBe(401);
  });
});

const bcrypt = require('bcryptjs');
const { Sucursal, ProductoStockSucursal, Categoria, Usuario, Rol, Producto, GrupoOpciones, Opcion } = require('../src/models');

describe('Stock de productos por sucursal', () => {
  let adminToken, categoriaId, sucursalPrincipalId;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;
    const principal = await Sucursal.findOne({ where: { nombre: 'Sucursal Principal' } });
    sucursalPrincipalId = principal.id;

    const catRes = await request(app)
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Categoria Stock Productos Test' });
    categoriaId = catRes.body.datos.id;
  });

  it('crear un producto con stock inicial lo asigna a la sucursal activa del creador', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Stock Inicial Test', precio: 12, stock: 30 });

    expect(res.status).toBe(201);

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: res.body.datos.id, sucursal_id: sucursalPrincipalId } });
    expect(fila.stock).toBe(30);
  });

  it('el listado muestra el stock de la sucursal activa del usuario que consulta', async () => {
    const res = await request(app)
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const creado = res.body.datos.find(p => p.nombre === 'Producto Stock Inicial Test');
    expect(creado.stock).toBe(30);
  });

  it('PUT /api/v1/productos/:id no crashea para un producto con stock (regresión)', async () => {
    const crearRes = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Editar Stock Test', precio: 15, stock: 10 });

    expect(crearRes.status).toBe(201);

    const res = await request(app)
      .put(`/api/v1/productos/${crearRes.body.datos.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Producto Editado Test' });

    expect(res.status).toBe(200);
  });
});

describe('Productos — stock inicial con acceso a todas las sucursales', () => {
  let categoriaId, sucursalX, usuarioTodasId, tokenTodas;

  beforeAll(async () => {
    const categoria = await Categoria.create({ nombre: 'Categoria Stock Inicial Todas Test' });
    categoriaId = categoria.id;
    sucursalX = await Sucursal.create({ nombre: 'Sucursal Stock Inicial Todas X' });

    const rolAdmin = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const hash = await bcrypt.hash('clave123', 10);
    const todas = await Usuario.create({
      rol_id: rolAdmin.id, nombre: 'Productos Acceso Todas Test', email: 'productos-todas-test@restaurante.com',
      contrasena: hash, acceso_todas_sucursales: 1,
    });
    usuarioTodasId = todas.id;
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'productos-todas-test@restaurante.com', contrasena: 'clave123' });
    const elegido = await request(app).post('/api/v1/auth/login/sucursal').send({ pre_token: login.body.datos.pre_token, sucursal_id: null });
    tokenTodas = elegido.body.datos.token;
  });

  afterAll(async () => {
    await Producto.destroy({ where: { categoria_id: categoriaId } });
    await Categoria.destroy({ where: { id: categoriaId } });
    await Usuario.destroy({ where: { id: usuarioTodasId } });
    await Sucursal.destroy({ where: { id: sucursalX.id } });
  });

  it('acceso-todas creando producto con stock y sin sucursal_id → 400', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Sin Sucursal Test', precio: 10, stock: 20 });
    expect(res.status).toBe(400);
  });

  it('acceso-todas creando producto con stock y sucursal_id válido → asigna el stock ahí', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Con Sucursal Test', precio: 10, stock: 20, sucursal_id: sucursalX.id });
    expect(res.status).toBe(201);

    const stock = await ProductoStockSucursal.findOne({ where: { producto_id: res.body.datos.id, sucursal_id: sucursalX.id } });
    expect(stock.stock).toBe(20);
  });

  it('acceso-todas creando producto sin stock no requiere sucursal_id', async () => {
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Sin Stock Inicial Test', precio: 10 });
    expect(res.status).toBe(201);
  });

  it('acceso-todas creando producto con stock y sucursal_id inexistente → 404 y no crea el producto', async () => {
    const antes = await Producto.count({ where: { categoria_id: categoriaId } });
    const res = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${tokenTodas}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Sucursal Inexistente Test', precio: 10, stock: 20, sucursal_id: 999999 });
    expect(res.status).toBe(404);

    const despues = await Producto.count({ where: { categoria_id: categoriaId } });
    expect(despues).toBe(antes); // no quedó huérfano
  });
});

describe('Productos — grupo de opciones', () => {
  let categoriaId, grupoId, adminToken;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;

    const categoria = await Categoria.create({ nombre: 'Categoria Grupo Opciones Productos Test' });
    categoriaId = categoria.id;

    const grupo = await GrupoOpciones.create({ nombre: 'Término Productos Test' });
    await Opcion.create({ grupo_opciones_id: grupo.id, nombre: 'Jugoso', orden: 1 });
    grupoId = grupo.id;
  });

  afterAll(async () => {
    await Producto.destroy({ where: { categoria_id: categoriaId } });
    await Categoria.destroy({ where: { id: categoriaId } });
    await Opcion.destroy({ where: { grupo_opciones_id: grupoId } });
    await GrupoOpciones.destroy({ where: { id: grupoId } });
  });

  it('crea un producto con grupo_opciones_id y lo devuelve con sus opciones', async () => {
    const crear = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoria_id: categoriaId, nombre: 'Picaña Test', precio: 85, grupo_opciones_id: grupoId });

    expect(crear.status).toBe(201);
    expect(crear.body.datos.grupo_opciones.nombre).toBe('Término Productos Test');
    expect(crear.body.datos.grupo_opciones.opciones.map(o => o.nombre)).toEqual(['Jugoso']);
  });

  it('GET /productos incluye grupo_opciones cuando está asignado', async () => {
    const res = await request(app).get('/api/v1/productos').set('Authorization', `Bearer ${adminToken}`);
    const creado = res.body.datos.find(p => p.nombre === 'Picaña Test');
    expect(creado.grupo_opciones.id).toBe(grupoId);
  });

  it('un producto sin grupo asignado devuelve grupo_opciones null', async () => {
    const crear = await request(app)
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoria_id: categoriaId, nombre: 'Producto Sin Grupo Test', precio: 20 });

    expect(crear.body.datos.grupo_opciones).toBeNull();
  });
});

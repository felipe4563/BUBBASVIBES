const request = require('supertest');
const app = require('../src/app');
const { GrupoOpciones, Opcion, Producto, Categoria } = require('../src/models');

describe('Grupos de opciones API', () => {
  let adminToken;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@restaurante.com', contrasena: process.env.ADMIN_PASSWORD || 'admin123' });
    adminToken = login.body.datos.token;
  });

  it('GET /api/v1/grupos-opciones sin token → 401', async () => {
    const res = await request(app).get('/api/v1/grupos-opciones');
    expect(res.status).toBe(401);
  });

  it('crea un grupo con sus opciones', async () => {
    const res = await request(app)
      .post('/api/v1/grupos-opciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Término de cocción Test', opciones: [{ nombre: 'Jugoso', orden: 1 }, { nombre: 'Término medio', orden: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.datos.opciones.map(o => o.nombre)).toEqual(['Jugoso', 'Término medio']);

    await Opcion.destroy({ where: { grupo_opciones_id: res.body.datos.id } });
    await GrupoOpciones.destroy({ where: { id: res.body.datos.id } });
  });

  it('rechaza crear sin nombre', async () => {
    const res = await request(app)
      .post('/api/v1/grupos-opciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ opciones: [] });
    expect(res.status).toBe(400);
  });

  it('editar reemplaza por completo la lista de opciones', async () => {
    const crear = await request(app)
      .post('/api/v1/grupos-opciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sabor Test', opciones: [{ nombre: 'Copoazú', orden: 1 }] });
    const id = crear.body.datos.id;

    const editar = await request(app)
      .put(`/api/v1/grupos-opciones/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sabor Test', opciones: [{ nombre: 'Limonada', orden: 1 }, { nombre: 'Maracuyá', orden: 2 }] });

    expect(editar.status).toBe(200);
    expect(editar.body.datos.opciones.map(o => o.nombre)).toEqual(['Limonada', 'Maracuyá']);

    await Opcion.destroy({ where: { grupo_opciones_id: id } });
    await GrupoOpciones.destroy({ where: { id } });
  });

  it('eliminar un grupo asignado a un producto lo desasigna en vez de fallar', async () => {
    const categoria = await Categoria.create({ nombre: 'Categoria Grupos Opciones Test' });
    const crear = await request(app)
      .post('/api/v1/grupos-opciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Grupo A Eliminar Test', opciones: [{ nombre: 'Opción 1', orden: 1 }] });
    const grupoId = crear.body.datos.id;

    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Con Grupo Test', precio: 10, grupo_opciones_id: grupoId });

    const eliminar = await request(app)
      .delete(`/api/v1/grupos-opciones/${grupoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eliminar.status).toBe(200);

    const productoRecargado = await Producto.findByPk(producto.id);
    expect(productoRecargado.grupo_opciones_id).toBeNull();

    await producto.destroy();
    await categoria.destroy();
  });
});

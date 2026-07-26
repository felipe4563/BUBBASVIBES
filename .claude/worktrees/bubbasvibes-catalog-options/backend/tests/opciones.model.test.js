const { GrupoOpciones, Opcion, Producto, Categoria, ProductoGrupoOpciones } = require('../src/models');

describe('Modelos GrupoOpciones y Opcion', () => {
  let categoriaId;

  beforeAll(async () => {
    const cat = await Categoria.create({ nombre: 'Categoria Opciones Model Test' });
    categoriaId = cat.id;
  });

  afterAll(async () => {
    await Producto.destroy({ where: { categoria_id: categoriaId } });
    await Categoria.destroy({ where: { id: categoriaId } });
  });

  it('crea un grupo de opciones con sus opciones asociadas, incluyendo precio_delta', async () => {
    const grupo = await GrupoOpciones.create({ nombre: 'Término de cocción Model Test' });
    await Opcion.bulkCreate([
      { grupo_opciones_id: grupo.id, nombre: 'Jugoso', orden: 1, precio_delta: 0 },
      { grupo_opciones_id: grupo.id, nombre: 'Término medio', orden: 2, precio_delta: 0 },
    ]);

    const recargado = await GrupoOpciones.findByPk(grupo.id, { include: [{ model: Opcion, as: 'opciones' }] });
    expect(recargado.opciones).toHaveLength(2);

    await Opcion.destroy({ where: { grupo_opciones_id: grupo.id } });
    await grupo.destroy();
  });

  it('un producto puede tener varios pasos (grupos de opciones), y al borrar un grupo se borra el paso', async () => {
    const grupo = await GrupoOpciones.create({ nombre: 'Sabor Model Test' });
    const producto = await Producto.create({ categoria_id: categoriaId, nombre: 'Jugo Model Test', precio: 10 });
    await ProductoGrupoOpciones.create({ producto_id: producto.id, grupo_opciones_id: grupo.id, orden: 1 });

    const recargado = await Producto.findByPk(producto.id, {
      include: [{ model: ProductoGrupoOpciones, as: 'pasos', include: [{ model: GrupoOpciones, as: 'grupo_opciones' }] }],
    });
    expect(recargado.pasos).toHaveLength(1);
    expect(recargado.pasos[0].grupo_opciones.nombre).toBe('Sabor Model Test');

    await grupo.destroy(); // ON DELETE CASCADE en producto_grupos_opciones
    const pasosRestantes = await ProductoGrupoOpciones.findAll({ where: { producto_id: producto.id } });
    expect(pasosRestantes).toHaveLength(0);

    await producto.destroy();
  });
});

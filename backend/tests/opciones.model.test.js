const { GrupoOpciones, Opcion, Producto, Categoria } = require('../src/models');

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

  it('crea un grupo de opciones con sus opciones asociadas', async () => {
    const grupo = await GrupoOpciones.create({ nombre: 'Término de cocción Model Test' });
    await Opcion.bulkCreate([
      { grupo_opciones_id: grupo.id, nombre: 'Jugoso', orden: 1 },
      { grupo_opciones_id: grupo.id, nombre: 'Término medio', orden: 2 },
    ]);

    const recargado = await GrupoOpciones.findByPk(grupo.id, { include: [{ model: Opcion, as: 'opciones' }] });
    expect(recargado.opciones).toHaveLength(2);

    await Opcion.destroy({ where: { grupo_opciones_id: grupo.id } });
    await grupo.destroy();
  });

  it('un producto puede asignarse a un grupo de opciones, y al borrar el grupo queda sin asignar', async () => {
    const grupo = await GrupoOpciones.create({ nombre: 'Sabor Model Test' });
    const producto = await Producto.create({ categoria_id: categoriaId, nombre: 'Jugo Model Test', precio: 10, grupo_opciones_id: grupo.id });

    const recargado = await Producto.findByPk(producto.id, { include: [{ model: GrupoOpciones, as: 'grupo_opciones' }] });
    expect(recargado.grupo_opciones.nombre).toBe('Sabor Model Test');

    await grupo.destroy(); // ON DELETE SET NULL — no debe fallar por el producto asignado
    const productoRecargado = await Producto.findByPk(producto.id);
    expect(productoRecargado.grupo_opciones_id).toBeNull();
  });
});

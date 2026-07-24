// backend/tests/stock.service.test.js
require('dotenv').config();
const { Producto, Categoria, Sucursal, ProductoStockSucursal, Usuario } = require('../src/models');
const { ajustarStockSucursal } = require('../src/modules/inventario/stock.service');

let categoria, producto, sucursalA, sucursalB, admin;

beforeAll(async () => {
  categoria = await Categoria.create({ nombre: 'Categoria Stock Test' });
  producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Stock Test', precio: 10, stock: 0 });
  sucursalA = await Sucursal.create({ nombre: 'Sucursal Stock Test A' });
  sucursalB = await Sucursal.create({ nombre: 'Sucursal Stock Test B' });
  admin = await Usuario.findOne({ where: { email: 'admin@restaurante.com' } });
});

afterAll(async () => {
  await ProductoStockSucursal.destroy({ where: { producto_id: producto.id } });
  await Producto.destroy({ where: { id: producto.id } });
  await Categoria.destroy({ where: { id: categoria.id } });
  await Sucursal.destroy({ where: { id: [sucursalA.id, sucursalB.id] } });
});

describe('ajustarStockSucursal', () => {
  it('crea la fila de stock por sucursal en la primera entrada y suma', async () => {
    const r = await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalA.id, tipo: 'entrada', cantidad: 10, usuario_id: admin.id, nota: 'test' });
    expect(r.stock_anterior).toBe(0);
    expect(r.stock_nuevo).toBe(10);

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalA.id } });
    expect(fila.stock).toBe(10);
  });

  it('las sucursales no comparten stock entre sí', async () => {
    await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalB.id, tipo: 'entrada', cantidad: 15, usuario_id: admin.id });

    const filaA = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalA.id } });
    const filaB = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalB.id } });
    expect(filaA.stock).toBe(10);
    expect(filaB.stock).toBe(15);
  });

  it('una venta en A descuenta solo de A y no toca B', async () => {
    await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalA.id, tipo: 'venta', cantidad: 3, usuario_id: admin.id });

    const filaA = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalA.id } });
    const filaB = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalB.id } });
    expect(filaA.stock).toBe(7);
    expect(filaB.stock).toBe(15);
  });

  it('rechaza una venta/salida sin stock suficiente en esa sucursal', async () => {
    await expect(
      ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalA.id, tipo: 'salida', cantidad: 999, usuario_id: admin.id })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('recalcula productos.stock como la suma de todas las sucursales', async () => {
    const p = await Producto.findByPk(producto.id);
    expect(p.stock).toBe(22); // 7 (A) + 15 (B)
  });

  it('un ajuste fija el valor absoluto de esa sucursal', async () => {
    await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalA.id, tipo: 'ajuste', cantidad: 50, usuario_id: admin.id });
    const filaA = await ProductoStockSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalA.id } });
    expect(filaA.stock).toBe(50);
  });
});

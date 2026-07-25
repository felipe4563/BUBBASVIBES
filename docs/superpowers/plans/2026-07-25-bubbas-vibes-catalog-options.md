# Bubbas Vibes: catálogo, opciones paso a paso y tickets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the POS (backend Node/Express/Sequelize + frontend React/Vite) from "Solo Carnes Tropicales" to "Bubbas Vibes": multi-step product options with price deltas, structured cart/ticket data, redesigned cliente/cocina tickets with logo, manual-only printing, a static QR payment flow with manual confirmation (CodePay removed), and the full Bubbas Vibes catalog seeded.

**Architecture:** A product can now have several ordered "pasos" (steps), each pointing at a reusable `grupos_opciones`/`opciones` pair; an option can carry a `precio_delta` and a step can be conditionally triggered by an earlier choice (`disparado_por_opcion_id`). The backend validates selections and computes price server-side, and persists a structured snapshot (`detalle_pedido_opciones`) per order line so tickets/reports never depend on free-text notes. Printing moves from automatic (backend socket + frontend auto-POST to the local print-agent) to a manual button that renders the existing browser-based HTML tickets. CodePay is removed; QR payment becomes a static image (configurable) with a manual "confirm" step, functionally identical to the cash path.

**Tech Stack:** Node/Express, Sequelize (MariaDB), Jest + Supertest (backend tests), React 18 + Vite, TanStack Query, Zustand, Tailwind (`darkMode: 'class'`). No frontend test runner exists — frontend tasks are verified via `npm run build` + manual browser check.

## Global Constraints

- Precio de producto: debe ser `>= 1` (validación existente en `productos.controller.js:61-63`, no se cambia).
- Todos los `grupos_opciones`/`opciones` son de selección única (radio) — no se agrega un campo de tipo múltiple.
- No se toca el código de `print-agent/` ni sus instaladores; solo se deja de invocar automáticamente desde el backend/frontend.
- No se implementa verificación automática de pago QR (ni webhook, ni polling): la confirmación es 100% manual.
- No se tocan mesas/áreas, caja, inventario (lógica), ni reportes más allá de leer `detalle_pedido_opciones` si corresponde.
- Sucursal, usuario admin, roles y permisos existentes se mantienen (no se renombran por este plan).
- El ticket impreso se mantiene monocromo (papel térmico); el tema dark/light solo aplica a la UI en pantalla.

---

## Part 1 — Database schema & models

### Task 1: Migración — pasos de opciones (precio_delta, producto_grupos_opciones)

**Files:**
- Create: `backend/database/migrations/017_producto_pasos_opciones.sql`

**Interfaces:**
- Produces: tabla `opciones.precio_delta` (DECIMAL 10,2, default 0); tabla `producto_grupos_opciones` (`id, producto_id, grupo_opciones_id, orden, obligatorio, disparado_por_opcion_id, creado_en, actualizado_en`); se elimina `productos.grupo_opciones_id` y su FK.

- [ ] **Step 1: Escribir la migración**

```sql
-- backend/database/migrations/017_producto_pasos_opciones.sql

ALTER TABLE opciones
  ADD COLUMN precio_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER orden;

CREATE TABLE IF NOT EXISTS producto_grupos_opciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  grupo_opciones_id INT UNSIGNED NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  obligatorio TINYINT(1) NOT NULL DEFAULT 1,
  disparado_por_opcion_id INT UNSIGNED NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (grupo_opciones_id) REFERENCES grupos_opciones(id) ON DELETE CASCADE,
  FOREIGN KEY (disparado_por_opcion_id) REFERENCES opciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE productos
  DROP FOREIGN KEY productos_ibfk_2,
  DROP COLUMN grupo_opciones_id;
```

- [ ] **Step 2: Aplicar la migración en la base de desarrollo/test**

Run: `mysql -u root bd_scarnestropicales < backend/database/migrations/017_producto_pasos_opciones.sql` (ajusta el nombre de la base según tu `.env` local; si usas una base de test separada, aplícala ahí también).
Expected: sin errores; `DESCRIBE opciones;` muestra `precio_delta`; `SHOW TABLES LIKE 'producto_grupos_opciones';` devuelve una fila; `DESCRIBE productos;` ya no muestra `grupo_opciones_id`.

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/017_producto_pasos_opciones.sql
git commit -m "Migración: pasos de opciones por producto con precio_delta"
```

---

### Task 2: Migración — detalle_pedido_opciones

**Files:**
- Create: `backend/database/migrations/018_detalle_pedido_opciones.sql`

**Interfaces:**
- Produces: tabla `detalle_pedido_opciones` (`id, detalle_pedido_id, grupo_opciones_id, opcion_id, nombre_grupo, nombre_opcion, precio_delta, creado_en`).

- [ ] **Step 1: Escribir la migración**

```sql
-- backend/database/migrations/018_detalle_pedido_opciones.sql

CREATE TABLE IF NOT EXISTS detalle_pedido_opciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id INT UNSIGNED NOT NULL,
  grupo_opciones_id INT UNSIGNED NOT NULL,
  opcion_id INT UNSIGNED NOT NULL,
  nombre_grupo VARCHAR(100) NOT NULL,
  nombre_opcion VARCHAR(100) NOT NULL,
  precio_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Aplicar la migración**

Run: `mysql -u root bd_scarnestropicales < backend/database/migrations/018_detalle_pedido_opciones.sql`
Expected: sin errores; `SHOW TABLES LIKE 'detalle_pedido_opciones';` devuelve una fila.

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/018_detalle_pedido_opciones.sql
git commit -m "Migración: snapshot estructurado de opciones por línea de pedido"
```

---

### Task 3: Migración — quitar pagos_qr y limpiar variables CODEPAY

**Files:**
- Create: `backend/database/migrations/019_quitar_pagos_qr.sql`
- Modify: `backend/.env.example`
- Modify: `backend/.env.production.example`

**Interfaces:**
- Produces: tabla `pagos_qr` eliminada.

- [ ] **Step 1: Escribir la migración**

```sql
-- backend/database/migrations/019_quitar_pagos_qr.sql

DROP TABLE IF EXISTS pagos_qr;
```

- [ ] **Step 2: Aplicar la migración**

Run: `mysql -u root bd_scarnestropicales < backend/database/migrations/019_quitar_pagos_qr.sql`
Expected: sin errores; `SHOW TABLES LIKE 'pagos_qr';` no devuelve filas.

- [ ] **Step 3: Quitar variables CODEPAY_* de los .env.example**

En `backend/.env.example`, eliminar estas líneas (las últimas 7 del archivo):
```
CODEPAY_SANDBOX=true
CODEPAY_API_URL=https://payapi.codewave.com.bo/api
CODEPAY_PUBLIC_KEY=
CODEPAY_SECRET_KEY=
CODEPAY_NOTIFICATION_SECRET=
CODEPAY_SANDBOX_PUBLIC_KEY=
CODEPAY_SANDBOX_SECRET_KEY=
```
Hacer lo mismo en `backend/.env.production.example` (buscar y quitar las mismas 7 claves si están presentes).

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/019_quitar_pagos_qr.sql backend/.env.example backend/.env.production.example
git commit -m "Migración: quitar pagos_qr y variables CODEPAY (reemplazado por QR estático manual)"
```

---

### Task 4: Modelos Sequelize — precio_delta, ProductoGrupoOpciones, DetallePedidoOpciones, quitar PagoQr

**Files:**
- Modify: `backend/src/models/Opcion.js`
- Modify: `backend/src/models/Producto.js`
- Create: `backend/src/models/ProductoGrupoOpciones.js`
- Create: `backend/src/models/DetallePedidoOpciones.js`
- Delete: `backend/src/models/PagoQr.js`
- Modify: `backend/src/models/index.js`
- Test: `backend/tests/opciones.model.test.js` (reescrito — ver Task 10)

**Interfaces:**
- Consumes: tablas creadas en Tasks 1-3.
- Produces: `Opcion.precio_delta` (number); `ProductoGrupoOpciones` (Sequelize model, campos `producto_id, grupo_opciones_id, orden, obligatorio, disparado_por_opcion_id`); `DetallePedidoOpciones` (campos `detalle_pedido_id, grupo_opciones_id, opcion_id, nombre_grupo, nombre_opcion, precio_delta`); asociaciones `Producto.hasMany(ProductoGrupoOpciones, {as:'pasos'})`, `ProductoGrupoOpciones.belongsTo(GrupoOpciones, {as:'grupo_opciones'})`, `ProductoGrupoOpciones.belongsTo(Opcion, {as:'disparado_por', foreignKey:'disparado_por_opcion_id'})`, `DetallePedido.hasMany(DetallePedidoOpciones, {as:'opciones'})`. Exportado desde `models/index.js`: `ProductoGrupoOpciones`, `DetallePedidoOpciones` (y ya no `PagoQr`).

- [ ] **Step 1: Actualizar `Opcion.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Opcion = sequelize.define('Opcion', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  precio_delta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, {
  tableName: 'opciones',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = Opcion;
```

- [ ] **Step 2: Quitar `grupo_opciones_id` de `Producto.js`**

En `backend/src/models/Producto.js:7`, eliminar la línea:
```js
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED },
```

- [ ] **Step 3: Crear `ProductoGrupoOpciones.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductoGrupoOpciones = sequelize.define('ProductoGrupoOpciones', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  obligatorio: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  disparado_por_opcion_id: { type: DataTypes.INTEGER.UNSIGNED },
}, {
  tableName: 'producto_grupos_opciones',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
});

module.exports = ProductoGrupoOpciones;
```

- [ ] **Step 4: Crear `DetallePedidoOpciones.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetallePedidoOpciones = sequelize.define('DetallePedidoOpciones', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  detalle_pedido_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  grupo_opciones_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  opcion_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  nombre_grupo: { type: DataTypes.STRING(100), allowNull: false },
  nombre_opcion: { type: DataTypes.STRING(100), allowNull: false },
  precio_delta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
}, {
  tableName: 'detalle_pedido_opciones',
  createdAt: 'creado_en',
  updatedAt: false,
});

module.exports = DetallePedidoOpciones;
```

- [ ] **Step 5: Eliminar `PagoQr.js`**

```bash
git rm backend/src/models/PagoQr.js
```

- [ ] **Step 6: Actualizar `models/index.js`**

Reemplazar el bloque de requires (líneas 20-39) quitando `const PagoQr = require('./PagoQr');` y agregando los dos modelos nuevos:
```js
const Producto = require('./Producto');
const GrupoOpciones = require('./GrupoOpciones');
const Opcion = require('./Opcion');
const ProductoGrupoOpciones = require('./ProductoGrupoOpciones');
const Cliente = require('./Cliente');
const SesionCaja = require('./SesionCaja');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');
const DetallePedidoOpciones = require('./DetallePedidoOpciones');
```
(el resto de requires entre `DetalleArqueo` y `Caja` quedan igual; se quita solo la línea de `PagoQr`).

Reemplazar el bloque de asociaciones "Opciones de producto" (líneas 65-69):
```js
// Opciones de producto
GrupoOpciones.hasMany(Opcion, { foreignKey: 'grupo_opciones_id', as: 'opciones' });
Opcion.belongsTo(GrupoOpciones, { foreignKey: 'grupo_opciones_id', as: 'grupo' });

Producto.hasMany(ProductoGrupoOpciones, { foreignKey: 'producto_id', as: 'pasos' });
ProductoGrupoOpciones.belongsTo(Producto, { foreignKey: 'producto_id' });
ProductoGrupoOpciones.belongsTo(GrupoOpciones, { foreignKey: 'grupo_opciones_id', as: 'grupo_opciones' });
ProductoGrupoOpciones.belongsTo(Opcion, { foreignKey: 'disparado_por_opcion_id', as: 'disparado_por' });
GrupoOpciones.hasMany(ProductoGrupoOpciones, { foreignKey: 'grupo_opciones_id', as: 'pasos_producto' });
```

Agregar, junto al bloque "Pedidos" (después de la línea 78 `DetallePedido.belongsTo(Producto, ...)`):
```js
DetallePedido.hasMany(DetallePedidoOpciones, { foreignKey: 'detalle_pedido_id', as: 'opciones' });
DetallePedidoOpciones.belongsTo(DetallePedido, { foreignKey: 'detalle_pedido_id' });
```

Quitar el bloque "Pagos QR (CodePay)" (líneas 131-134):
```js
// Pagos QR (CodePay)
Pedido.hasMany(PagoQr, { foreignKey: 'pedido_id', as: 'pagosQr' });
PagoQr.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });
PagoQr.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
```

En el `module.exports` final, quitar `PagoQr,` y agregar `ProductoGrupoOpciones, DetallePedidoOpciones,`:
```js
module.exports = {
  sequelize,
  Rol, Permiso, Usuario,
  Area, Mesa,
  Categoria, Producto,
  GrupoOpciones, Opcion, ProductoGrupoOpciones,
  Cliente,
  SesionCaja, Pedido, DetallePedido, DetallePedidoOpciones,
  DetalleArqueo, Gasto, LibroCaja,
  Proveedor, Compra, DetalleCompra,
  RegistroInventario,
  Configuracion,
  Reservacion,
  Sucursal,
  ProductoStockSucursal,
  Caja,
};
```

- [ ] **Step 7: Verificar que el servidor arranca sin errores de asociación**

Run: `cd backend && node -e "require('./src/models'); console.log('OK modelos')"`
Expected: imprime `OK modelos` sin excepciones (Sequelize valida las asociaciones al cargarlas).

- [ ] **Step 8: Commit**

```bash
git add backend/src/models
git commit -m "Modelos: precio_delta en Opcion, ProductoGrupoOpciones, DetallePedidoOpciones, quitar PagoQr"
```

---

## Part 2 — Backend: pasos por producto y precio_delta en opciones

### Task 5: `productos.service.js` — pasos por producto + precio_delta

**Files:**
- Modify: `backend/src/modules/productos/productos.service.js`
- Test: `backend/tests/productos.test.js` (casos nuevos agregados en Task 10)

**Interfaces:**
- Consumes: `ProductoGrupoOpciones`, `Opcion` (con `precio_delta`) de `../../models`.
- Produces: `crearProducto(datos, alcance)` y `actualizarProducto(id, datos, alcance)` aceptan `datos.pasos = [{ grupo_opciones_id, orden, obligatorio, disparado_por_opcion_id }]` en vez de `grupo_opciones_id`; `obtenerProducto`/`listarProductos` devuelven cada producto con `producto.pasos` (array ordenado, cada uno con `grupo_opciones.opciones` incluyendo `precio_delta`); `crearGrupoOpciones`/`actualizarGrupoOpciones` aceptan `opciones[].precio_delta`.

- [ ] **Step 1: Actualizar el import y agregar el helper de reemplazo de pasos**

En `backend/src/modules/productos/productos.service.js:1`, cambiar:
```js
const { Categoria, Producto, Sucursal, GrupoOpciones, Opcion } = require('../../models');
```
por:
```js
const { Categoria, Producto, Sucursal, GrupoOpciones, Opcion, ProductoGrupoOpciones } = require('../../models');
```

Agregar, después de `eliminarGrupoOpciones` (tras la línea 88), un helper nuevo:
```js
async function _reemplazarPasos(producto_id, pasos = [], transaction) {
  await ProductoGrupoOpciones.destroy({ where: { producto_id }, transaction });
  if (!pasos.length) return;
  await ProductoGrupoOpciones.bulkCreate(
    pasos.map((p, i) => ({
      producto_id,
      grupo_opciones_id: p.grupo_opciones_id,
      orden: p.orden ?? i,
      obligatorio: p.obligatorio ?? true,
      disparado_por_opcion_id: p.disparado_por_opcion_id || null,
    })),
    { transaction }
  );
}

const INCLUDE_PASOS = {
  model: ProductoGrupoOpciones,
  as: 'pasos',
  separate: true,
  order: [['orden', 'ASC']],
  include: [
    { model: GrupoOpciones, as: 'grupo_opciones', attributes: ['id', 'nombre'],
      include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }] },
  ],
};

function _ordenarOpcionesDePasos(producto) {
  for (const paso of producto.pasos || []) {
    paso.grupo_opciones.opciones.sort((a, b) => a.orden - b.orden);
  }
  return producto;
}
```

- [ ] **Step 2: Agregar `precio_delta` al crear/editar grupos de opciones**

En `crearGrupoOpciones` (línea 54-65), cambiar el `bulkCreate`:
```js
async function crearGrupoOpciones({ nombre, opciones = [] }) {
  return sequelize.transaction(async (t) => {
    const grupo = await GrupoOpciones.create({ nombre }, { transaction: t });
    if (opciones.length) {
      await Opcion.bulkCreate(
        opciones.map((o, i) => ({ grupo_opciones_id: grupo.id, nombre: o.nombre, orden: o.orden ?? i, precio_delta: o.precio_delta ?? 0 })),
        { transaction: t }
      );
    }
    return _conOpciones(grupo.id, t);
  });
}
```
Y en `actualizarGrupoOpciones` (línea 67-81), igual en su `bulkCreate`:
```js
      await Opcion.bulkCreate(
        opciones.map((o, i) => ({ grupo_opciones_id: id, nombre: o.nombre, orden: o.orden ?? i, precio_delta: o.precio_delta ?? 0 })),
        { transaction: t }
      );
```
Y en `listarGruposOpciones`/`_conOpciones` (líneas 39-52), agregar `precio_delta` a los `attributes` de `Opcion`:
```js
async function listarGruposOpciones() {
  return GrupoOpciones.findAll({
    include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }],
    order: [['nombre', 'ASC'], [{ model: Opcion, as: 'opciones' }, 'orden', 'ASC']],
  });
}

async function _conOpciones(id, transaction) {
  return GrupoOpciones.findByPk(id, {
    include: [{ model: Opcion, as: 'opciones', attributes: ['id', 'nombre', 'orden', 'precio_delta'] }],
    order: [[{ model: Opcion, as: 'opciones' }, 'orden', 'ASC']],
    transaction,
  });
}
```

- [ ] **Step 3: Reemplazar el `include` de `GrupoOpciones` por `INCLUDE_PASOS` en listar/obtener producto**

Reemplazar `listarProductos` (líneas 92-121):
```js
async function listarProductos({ categoria_id, solo_vendibles, solo_disponibles, order_by, incluir_inactivos } = {}, alcance) {
  const where = {};
  if (!(incluir_inactivos === 'true' || incluir_inactivos === true)) where.activo = 1;
  if (categoria_id) where.categoria_id = categoria_id;
  if (solo_vendibles === 'true' || solo_vendibles === true) where.es_vendible = 1;

  const order = order_by === 'mas_vendido'
    ? [
        [sequelize.literal('(SELECT COALESCE(SUM(cantidad), 0) FROM detalle_pedidos WHERE producto_id = `Producto`.`id`)'), 'DESC'],
        ['nombre', 'ASC'],
      ]
    : [['nombre', 'ASC']];

  const productos = await Producto.findAll({
    where,
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      INCLUDE_PASOS,
    ],
    order,
  });
  productos.forEach(_ordenarOpcionesDePasos);

  const conStock = await mezclarStockPorSucursal(productos, alcance);

  if (solo_disponibles === 'true' || solo_disponibles === true) {
    return conStock.filter((p) => p.stock === null || p.stock > 0);
  }
  return conStock;
}
```
Reemplazar `obtenerProducto` (líneas 123-134):
```js
async function obtenerProducto(id, alcance) {
  const p = await Producto.findByPk(id, {
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      INCLUDE_PASOS,
    ],
  });
  if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  _ordenarOpcionesDePasos(p);
  const [conStock] = await mezclarStockPorSucursal([p], alcance);
  return conStock;
}
```

- [ ] **Step 4: Aceptar `pasos` en `crearProducto`/`actualizarProducto`**

Reemplazar `crearProducto` (líneas 136-158):
```js
async function crearProducto({ categoria_id, nombre, codigo_barras, codigo, precio, costo, stock, sucursal_id, es_vendible, imagen, pasos }, alcance) {
  let sucursalDestino;
  const conStock = stock !== undefined && stock !== null;

  if (conStock) {
    sucursalDestino = alcance.acceso_todas ? sucursal_id : alcance.sucursal_id;
    if (alcance.acceso_todas && !sucursalDestino) {
      throw Object.assign(new Error('sucursal_id es requerido para asignar stock inicial'), { status: 400 });
    }
    if (alcance.acceso_todas) {
      const existe = await Sucursal.findByPk(sucursalDestino);
      if (!existe) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
    }
  }

  const producto = await sequelize.transaction(async (t) => {
    const p = await Producto.create({ categoria_id, nombre, codigo_barras, codigo, precio, costo, stock: conStock ? 0 : null, es_vendible, imagen }, { transaction: t });
    await _reemplazarPasos(p.id, pasos, t);
    return p;
  });

  if (conStock) {
    await ajustarStockSucursal({ producto_id: producto.id, sucursal_id: sucursalDestino, tipo: 'ajuste', cantidad: stock, usuario_id: alcance.usuario_id, nota: 'Stock inicial' });
  }

  return obtenerProducto(producto.id, alcance);
}
```
Reemplazar `actualizarProducto` (líneas 160-166):
```js
async function actualizarProducto(id, datos, alcance) {
  const { stock, pasos, ...resto } = datos; // stock nunca se edita aquí — solo vía ajustarStockSucursal
  const p = await Producto.findByPk(id);
  if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  await sequelize.transaction(async (t) => {
    await p.update(resto, { transaction: t });
    if (pasos !== undefined) await _reemplazarPasos(id, pasos, t);
  });
  return obtenerProducto(id, alcance);
}
```

- [ ] **Step 5: Correr los tests existentes de productos**

Run: `cd backend && npx jest tests/productos.test.js -v`
Expected: FAIL en los casos que todavía usan `grupo_opciones_id` directo sobre `Producto.create` (se corrigen en Task 10, que reescribe esos tests). Confirma que el fallo es por esa causa (columna inexistente), no por otro error.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/productos/productos.service.js
git commit -m "productos.service: pasos ordenados por producto y precio_delta en opciones"
```

---

## Part 3 — Backend: selección de pasos en ventas, precio calculado, y quitar CodePay

### Task 6: `ventas.service.js` — validar/calcular selecciones y snapshot estructurado

**Files:**
- Modify: `backend/src/modules/ventas/ventas.service.js`
- Modify: `backend/src/modules/ventas/ventas.controller.js`
- Test: `backend/tests/ventas.test.js` (casos nuevos en Task 10)

**Interfaces:**
- Consumes: `ProductoGrupoOpciones`, `DetallePedidoOpciones` de `../../models`.
- Produces: `agregarItem(pedido_id, { producto_id, cantidad, nota, selecciones }, alcance)` y `crearCompleta({..., items: [{producto_id, cantidad, nota, selecciones}], ...})` donde `selecciones = [{ grupo_opciones_id, opcion_id }]`; el precio final se calcula en el backend (nunca se confía en un precio del cliente); cada línea de pedido queda con sus `DetallePedidoOpciones` (snapshot); `INCLUDE_PEDIDO_COMPLETO` incluye `detalle.opciones`.

- [ ] **Step 1: Actualizar imports y agregar el validador/calculador de precio**

En `backend/src/modules/ventas/ventas.service.js:1-7`, cambiar:
```js
const { Op } = require('sequelize');
const {
  Pedido, DetallePedido, Mesa, Producto, Cliente, SesionCaja, LibroCaja, Configuracion, PagoQr, sequelize,
} = require('../../models');
const { emitir } = require('../../socket');
const { ajustarStockSucursal } = require('../inventario/stock.service');
const codepayClient = require('../../integrations/codepay/codepay.client');
```
por:
```js
const { Op } = require('sequelize');
const {
  Pedido, DetallePedido, DetallePedidoOpciones, Mesa, Producto, ProductoGrupoOpciones, GrupoOpciones, Opcion,
  Cliente, SesionCaja, LibroCaja, Configuracion, sequelize,
} = require('../../models');
const { emitir } = require('../../socket');
const { ajustarStockSucursal } = require('../inventario/stock.service');
```

Agregar, después de `_rangoDiaBolivia` (tras la línea 17), la función de validación/cálculo:
```js
/**
 * Valida las selecciones enviadas para un producto contra sus pasos
 * configurados y devuelve el precio final (base + deltas) junto con el
 * snapshot a persistir en detalle_pedido_opciones. Nunca confía en un precio
 * mandado por el cliente.
 */
async function _validarYCalcularSelecciones(producto, selecciones = []) {
  const pasos = await ProductoGrupoOpciones.findAll({
    where: { producto_id: producto.id },
    include: [{ model: GrupoOpciones, as: 'grupo_opciones', include: [{ model: Opcion, as: 'opciones' }] }],
    order: [['orden', 'ASC']],
  });

  const opcionIdPorGrupo = new Map();
  for (const sel of selecciones) opcionIdPorGrupo.set(sel.grupo_opciones_id, sel.opcion_id);
  const opcionesElegidasIds = new Set(selecciones.map((s) => s.opcion_id));

  let precio = parseFloat(producto.precio);
  const detalleOpciones = [];

  for (const paso of pasos) {
    const disparada = !paso.disparado_por_opcion_id || opcionesElegidasIds.has(paso.disparado_por_opcion_id);
    if (!disparada) continue;

    const opcionId = opcionIdPorGrupo.get(paso.grupo_opciones_id);
    if (!opcionId) {
      if (paso.obligatorio) {
        throw Object.assign(new Error(`Falta seleccionar una opción de "${paso.grupo_opciones.nombre}"`), { status: 400 });
      }
      continue;
    }

    const opcion = paso.grupo_opciones.opciones.find((o) => o.id === opcionId);
    if (!opcion) {
      throw Object.assign(new Error(`La opción elegida no pertenece a "${paso.grupo_opciones.nombre}"`), { status: 400 });
    }

    precio += parseFloat(opcion.precio_delta);
    detalleOpciones.push({
      grupo_opciones_id: paso.grupo_opciones_id,
      opcion_id: opcion.id,
      nombre_grupo: paso.grupo_opciones.nombre,
      nombre_opcion: opcion.nombre,
      precio_delta: opcion.precio_delta,
    });
  }

  return { precio, detalleOpciones };
}

async function _crearDetalleConOpciones({ pedido_id, producto_id, cantidad, precio, nota, detalleOpciones }, transaction) {
  const detalle = await DetallePedido.create({ pedido_id, producto_id, cantidad, precio, nota }, { transaction });
  if (detalleOpciones.length) {
    await DetallePedidoOpciones.bulkCreate(
      detalleOpciones.map((o) => ({ ...o, detalle_pedido_id: detalle.id })),
      { transaction }
    );
  }
  return detalle;
}
```

- [ ] **Step 2: Incluir `detalle.opciones` en `INCLUDE_PEDIDO_COMPLETO`**

Reemplazar (líneas 19-26):
```js
const INCLUDE_PEDIDO_COMPLETO = [
  { model: Mesa, as: 'mesa', attributes: ['id', 'nombre', 'estado'] },
  { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'numero_documento'] },
  {
    model: DetallePedido, as: 'detalles',
    include: [
      { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'precio'] },
      { model: DetallePedidoOpciones, as: 'opciones' },
    ],
  },
];
```

- [ ] **Step 3: Usar el precio calculado en `crearCompleta`**

Reemplazar el bloque de validación de productos y cálculo de total en `crearCompleta` (líneas 317-323 y 335-336):
```js
  const productos = [];
  for (const item of items) {
    const producto = await Producto.findByPk(item.producto_id);
    if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    if (!producto.activo || !producto.es_vendible) throw Object.assign(new Error('Producto no disponible'), { status: 409 });
    const { precio, detalleOpciones } = await _validarYCalcularSelecciones(producto, item.selecciones);
    productos.push({ item, producto, precio, detalleOpciones });
  }
```
```js
  const total = productos.reduce((sum, { item, precio }) => sum + item.cantidad * precio, 0);
```
Y en la creación de detalles dentro de la transacción (líneas 357-363):
```js
    const detalles = [];
    for (const { item, precio, detalleOpciones } of productos) {
      await _crearDetalleConOpciones({
        pedido_id: pedido.id, producto_id: item.producto_id, cantidad: item.cantidad, precio, nota: item.nota, detalleOpciones,
      }, t);
      detalles.push({ producto_id: item.producto_id, cantidad: item.cantidad });
    }
```

- [ ] **Step 4: Usar el precio calculado en `agregarItem`**

Reemplazar `agregarItem` (líneas 385-406):
```js
async function agregarItem(pedido_id, { producto_id, cantidad = 1, nota, selecciones }, alcance) {
  const pedido = await Pedido.findByPk(pedido_id);
  if (!pedido) throw Object.assign(new Error('Pedido no encontrado'), { status: 404 });
  _verificarAlcance(pedido, alcance);
  if (pedido.estado !== 'pendiente') throw Object.assign(new Error('El pedido no está pendiente'), { status: 409 });

  const producto = await Producto.findByPk(producto_id);
  if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  if (!producto.activo || !producto.es_vendible) throw Object.assign(new Error('Producto no disponible'), { status: 409 });

  const { precio, detalleOpciones } = await _validarYCalcularSelecciones(producto, selecciones);
  const item = await _crearDetalleConOpciones({ pedido_id, producto_id, cantidad, precio, nota, detalleOpciones });

  await _recalcularTotal(pedido_id);
  emitir('restaurante:actualizar', { tipo: 'pedido_items' });
  return item;
}
```

- [ ] **Step 5: Pasar `selecciones` desde el controller**

En `backend/src/modules/ventas/ventas.controller.js:37-43`, reemplazar `agregarItem`:
```js
async function agregarItem(req, res, next) {
  try {
    const { producto_id, cantidad, nota, selecciones } = req.body;
    if (!producto_id) return res.status(400).json({ ok: false, mensaje: 'producto_id es requerido' });
    res.status(201).json({ ok: true, datos: await svc.agregarItem(req.params.id, { producto_id, cantidad, nota, selecciones }, _alcance(req)) });
  } catch (err) { next(err); }
}
```
(`crearCompleta` y `crear` ya pasan `req.body` completo tal cual, así que `items[].selecciones` llega sin cambios adicionales en el controller.)

- [ ] **Step 6: Escribir un test de integración para el cálculo de precio**

Crear `backend/tests/ventas-selecciones.test.js`:
```js
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
});
```

- [ ] **Step 7: Correr el test nuevo**

Run: `cd backend && npx jest tests/ventas-selecciones.test.js -v`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/ventas/ventas.service.js backend/src/modules/ventas/ventas.controller.js backend/tests/ventas-selecciones.test.js
git commit -m "ventas: calcular precio server-side desde selecciones y guardar snapshot estructurado"
```

---

### Task 7: Quitar CodePay — pago QR estático manual

**Files:**
- Modify: `backend/src/modules/ventas/ventas.service.js`
- Modify: `backend/src/modules/ventas/ventas.controller.js`
- Modify: `backend/src/modules/ventas/ventas.routes.js`
- Modify: `backend/src/app.js`
- Delete: `backend/src/webhooks/codepay.webhook.routes.js`
- Delete: `backend/src/integrations/codepay/codepay.client.js`

**Interfaces:**
- Consumes: nada de CodePay/PagoQr.
- Produces: `cobrar()` y `crearCompleta()` tratan `metodo_pago: 'qr'` igual que `'efectivo'` (finalización síncrona, sin monto mínimo porque se asume el monto exacto), sin crear ningún registro de transacción externa. Ya no se exportan `consultarEstadoPagoQr`, `cancelarPagoQr`, `procesarWebhookPagoQr`.

- [ ] **Step 1: Quitar las funciones de CodePay de `ventas.service.js`**

Eliminar por completo estas funciones (líneas 175-301 del archivo original): `iniciarPagoQr`, `_revertirPagoQr`, `_confirmarPagoQr`, `consultarEstadoPagoQr`, `cancelarPagoQr`, `procesarWebhookPagoQr`.

- [ ] **Step 2: Simplificar el pago QR en `crearCompleta`**

Reemplazar el bloque de validación de monto y el manejo de `metodo_pago === 'qr'` (líneas 338-345 y 372-377 del original):
```js
  if (!['efectivo', 'qr'].includes(metodo_pago)) {
    throw Object.assign(new Error("metodo_pago debe ser 'efectivo' o 'qr'"), { status: 400 });
  }
  if (metodo_pago === 'qr') {
    monto_recibido = monto_neto; // QR estático: se asume el monto exacto, confirmado a mano por el cajero
  } else if (!monto_recibido || parseFloat(monto_recibido) < monto_neto) {
    throw Object.assign(new Error('Monto recibido insuficiente'), { status: 400 });
  }

  const numero_llevar = tipo === 'llevar' ? await _siguienteNumeroLlevar() : null;
```
(quitar la línea `const estadoInicial = metodo_pago === 'qr' ? 'pendiente' : 'completado';` y usar `estado: 'completado'` directo en el `Pedido.create` de la transacción; quitar también el bloque `if (metodo_pago !== 'qr') { await _finalizarVenta(...) }` y llamar a `_finalizarVenta` siempre sin condición).

Al final de la función, reemplazar el `if (metodo_pago === 'qr') {...}` que devolvía `{ pedido, pago_qr }` — ya no existe esa rama; la función simplemente sigue con:
```js
  const creado = await obtener(pedidoId);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, sucursal_id);
  return creado;
```

- [ ] **Step 3: Simplificar el pago QR en `cobrar`**

Reemplazar en `cobrar` (líneas 442-459 del original):
```js
  const monto_neto = parseFloat(pedido.total) - parseFloat(descuento) + parseFloat(propina);

  if (!['efectivo', 'qr'].includes(metodo_pago)) {
    throw Object.assign(new Error("metodo_pago debe ser 'efectivo' o 'qr'"), { status: 400 });
  }
  if (metodo_pago === 'qr') {
    monto_recibido = monto_neto;
  } else if (!monto_recibido || parseFloat(monto_recibido) < monto_neto) {
    throw Object.assign(new Error('Monto recibido insuficiente'), { status: 400 });
  }

  const detalles = pedido.detalles.map((d) => ({ producto_id: d.producto_id, cantidad: d.cantidad }));
  await sequelize.transaction((t) => _finalizarVenta({ pedido, detalles, metodo_pago, monto_recibido, descuento, propina, usuario_id }, t));

  const cobrado = await obtener(pedido_id);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, pedido.sucursal_id);
  return cobrado;
```

- [ ] **Step 4: Quitar los endpoints de pago QR del controller y las rutas**

En `backend/src/modules/ventas/ventas.controller.js`, quitar `estadoPagoQr` y `cancelarPagoQr` (líneas 78-86), y quitarlos del `module.exports` (línea 88).

En `backend/src/modules/ventas/ventas.routes.js`, quitar estas dos líneas:
```js
router.get('/:id/pago-qr/estado', verificarPermiso('ventas', 'cobrar'), ctrl.estadoPagoQr);
router.post('/:id/pago-qr/cancelar', verificarPermiso('ventas', 'cobrar'), ctrl.cancelarPagoQr);
```

- [ ] **Step 5: Quitar el webhook de CodePay**

```bash
git rm backend/src/webhooks/codepay.webhook.routes.js
git rm backend/src/integrations/codepay/codepay.client.js
rmdir backend/src/webhooks backend/src/integrations/codepay 2>/dev/null || true
```

En `backend/src/app.js`, quitar la línea 28 (`const codepayWebhookRoutes = require('./webhooks/codepay.webhook.routes');`) y la línea 45 (`app.use('/webhooks', codepayWebhookRoutes);`).

- [ ] **Step 6: Correr el test nuevo de Task 6 y el resto de la suite de ventas**

Run: `cd backend && npx jest tests/ventas-selecciones.test.js tests/ventas.test.js -v`
Expected: `ventas-selecciones.test.js` PASS; `ventas.test.js` fallará en el describe `Ventas — cobro con QR (CodePay)` porque depende del mock de `codepay.client` que ya no existe — se reescribe en Task 10, este fallo es esperado en este punto.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/ventas backend/src/app.js
git commit -m "ventas: quitar integración CodePay, pago QR pasa a confirmación manual síncrona"
```

---

### Task 8: Desactivar impresión automática (backend)

**Files:**
- Modify: `backend/src/modules/ventas/ventas.service.js`

**Interfaces:**
- Produces: `cobrar()` y `crearCompleta()` ya no llaman a `_emitirImpresion` ni devuelven `datos_impresion`. `_emitirImpresion` queda definida (sin invocar) para no tocar el contrato del `print-agent` por si se reactiva luego.

- [ ] **Step 1: Quitar la llamada a `_emitirImpresion` en `crearCompleta`**

Donde antes decía (tras los cambios de Task 7):
```js
  const creado = await obtener(pedidoId);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, sucursal_id);
  const datos_impresion = await _emitirImpresion(creado, metodo_pago, parseFloat(monto_recibido || monto_neto) - monto_neto, sucursal_id);
  return { ...creado.toJSON(), datos_impresion };
```
dejar:
```js
  const creado = await obtener(pedidoId);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, sucursal_id);
  return creado;
```

- [ ] **Step 2: Quitar la llamada a `_emitirImpresion` en `cobrar`**

Donde antes decía:
```js
  const cobrado = await obtener(pedido_id);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, pedido.sucursal_id);
  const datos_impresion = await _emitirImpresion(cobrado, metodo_pago, parseFloat(monto_recibido) - monto_neto, pedido.sucursal_id);
  return { ...cobrado.toJSON(), datos_impresion };
```
dejar:
```js
  const cobrado = await obtener(pedido_id);
  emitir('restaurante:actualizar', { tipo: 'pedido_cobrado' }, pedido.sucursal_id);
  return cobrado;
```

- [ ] **Step 3: Verificar que `_emitirImpresion` sigue definida pero sin llamadas activas**

Run: `cd backend && grep -n "_emitirImpresion" src/modules/ventas/ventas.service.js`
Expected: solo aparece la definición de la función (`async function _emitirImpresion(...)`), ninguna línea que la invoque.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/ventas/ventas.service.js
git commit -m "ventas: dejar de invocar la impresión automática (queda disponible sin activarse)"
```

---

## Part 4 — Seed del catálogo Bubbas Vibes

### Task 9: Catálogo Bubbas Vibes (imágenes, categorías, grupos, productos, logo)

**Files:**
- Create: `backend/database/seeds/seed-bubbasvibes.js`
- Modify: `backend/package.json` (nuevo script)
- (copiar archivos) `bd/img/*.jpeg` → `backend/uploads/`

**Interfaces:**
- Produces: script ejecutable `npm run seed:bubbasvibes` (desde `backend/`) que limpia el catálogo anterior y crea las 6 categorías, los grupos/opciones reutilizables, los 15 productos con sus pasos, y configura el logo del negocio.

- [ ] **Step 1: Copiar las imágenes del menú a `backend/uploads/`**

```bash
cd "c:\Users\ASUS\OneDrive\Escritorio\TODO\SISTEMAS\CODECULINARY"
cp bd/img/logo.jpeg backend/uploads/bubbasvibes-logo.jpeg
cp bd/img/receta1.jpeg backend/uploads/bubbasvibes-bubble-tea.jpeg
cp bd/img/receta2.jpeg backend/uploads/bubbasvibes-sodas-italianas.jpeg
cp bd/img/receta3.jpeg backend/uploads/bubbasvibes-frappes.jpeg
cp bd/img/receta4.jpeg backend/uploads/bubbasvibes-ice-coffee-latte.jpeg
cp bd/img/receta5.jpeg backend/uploads/bubbasvibes-infusiones-waffles.jpeg
```

- [ ] **Step 2: Escribir el script de seed**

```js
// backend/database/seeds/seed-bubbasvibes.js
// Reemplaza el catálogo de "Solo Carnes Tropicales" por el de Bubbas Vibes.
// No toca usuarios, roles, sucursales, cajas, áreas ni mesas.
require('dotenv').config();
const {
  sequelize, Categoria, Producto, GrupoOpciones, Opcion, ProductoGrupoOpciones,
  Configuracion, DetallePedido, DetallePedidoOpciones, Pedido, Compra, DetalleCompra, RegistroInventario,
} = require('../../src/models');

const IMG = (nombre) => `/uploads/${nombre}`;

async function limpiarCatalogoAnterior() {
  // Se limpian también pedidos/compras/movimientos de inventario porque
  // referencian productos por FK sin ON DELETE CASCADE (o CASCADE en cadena
  // desde pedidos) — son datos de prueba de "Solo Carnes Tropicales", no
  // historial real de Bubbas Vibes. No se tocan sesiones de caja/libro_caja/
  // usuarios/roles/sucursales/áreas/mesas.
  await DetalleCompra.destroy({ where: {}, truncate: true, cascade: true });
  await Compra.destroy({ where: {}, truncate: true, cascade: true });
  await RegistroInventario.destroy({ where: {}, truncate: true, cascade: true });
  await DetallePedidoOpciones.destroy({ where: {}, truncate: true, cascade: true });
  await DetallePedido.destroy({ where: {}, truncate: true, cascade: true });
  await Pedido.destroy({ where: {}, truncate: true, cascade: true });
  await ProductoGrupoOpciones.destroy({ where: {}, truncate: true, cascade: true });
  await Producto.destroy({ where: {}, truncate: true, cascade: true });
  await Opcion.destroy({ where: {}, truncate: true, cascade: true });
  await GrupoOpciones.destroy({ where: {}, truncate: true, cascade: true });
  await Categoria.destroy({ where: {}, truncate: true, cascade: true });
}

async function crearGrupo(nombre, opciones) {
  const grupo = await GrupoOpciones.create({ nombre });
  const creadas = await Opcion.bulkCreate(
    opciones.map((o, i) => ({ grupo_opciones_id: grupo.id, nombre: o.nombre, orden: i, precio_delta: o.precio_delta ?? 0 })),
    { returning: true }
  );
  const porNombre = {};
  creadas.forEach((o) => { porNombre[o.nombre] = o; });
  return { grupo, opciones: porNombre };
}

async function asignarPasos(producto_id, pasos) {
  await ProductoGrupoOpciones.bulkCreate(
    pasos.map((p, i) => ({
      producto_id,
      grupo_opciones_id: p.grupo_opciones_id,
      orden: i,
      obligatorio: p.obligatorio ?? true,
      disparado_por_opcion_id: p.disparado_por_opcion_id || null,
    }))
  );
}

async function seed() {
  await limpiarCatalogoAnterior();

  // --- Categorías ---
  const catBubbleTea = await Categoria.create({ nombre: 'Bubble Tea', imagen: IMG('bubbasvibes-bubble-tea.jpeg') });
  const catSodas = await Categoria.create({ nombre: 'Sodas Italianas', imagen: IMG('bubbasvibes-sodas-italianas.jpeg') });
  const catFrappes = await Categoria.create({ nombre: 'Frappes', imagen: IMG('bubbasvibes-frappes.jpeg') });
  const catLatte = await Categoria.create({ nombre: 'Ice Coffee Latte', imagen: IMG('bubbasvibes-ice-coffee-latte.jpeg') });
  const catInfusiones = await Categoria.create({ nombre: 'Infusiones', imagen: IMG('bubbasvibes-infusiones-waffles.jpeg') });
  const catWaffles = await Categoria.create({ nombre: 'Waffles', imagen: IMG('bubbasvibes-infusiones-waffles.jpeg') });

  // --- Grupos de opciones reutilizables ---
  const saborBubbleTea = await crearGrupo('Sabor Bubble Tea', [
    { nombre: 'Arandanitos' }, { nombre: 'Isla Exótica' }, { nombre: 'Oreo' },
    { nombre: 'Euphoria' }, { nombre: 'Shrek' }, { nombre: 'Sol de Verano' }, { nombre: 'Chocolate' },
  ]);
  const base = await crearGrupo('Base', [{ nombre: 'Leche' }, { nombre: 'Agua' }]);
  const estilo = await crearGrupo('Estilo', [{ nombre: 'Frapeado' }, { nombre: 'Líquido' }]);
  const hierbaBuenaSiNo = await crearGrupo('Hierba buena', [{ nombre: 'Sí' }, { nombre: 'No' }]);
  const saborPerlas = await crearGrupo('Sabor de perlas explosivas', [
    { nombre: 'Chirimoya' }, { nombre: 'Cereza' }, { nombre: 'Algodón de Azúcar' },
    { nombre: 'Açaí' }, { nombre: 'Maracuyá' }, { nombre: 'Sandía' },
  ]);
  const tamanoBubbleTea = await crearGrupo('Tamaño', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 8 }, // placeholder, editable desde Productos
  ]);
  const saborSoda = await crearGrupo('Sabor Soda Italiana', [
    { nombre: 'Maracuyá' }, { nombre: 'Frutilla' }, { nombre: 'Tumbo' }, { nombre: 'Guayaba' },
    { nombre: 'Sandía' }, { nombre: 'Jamaica' }, { nombre: 'Uva' }, { nombre: 'Durazno' },
  ]);
  const hierbaMenta = await crearGrupo('Hierba buena o menta', [{ nombre: 'Hierba buena' }, { nombre: 'Menta' }]);
  const tamanoSoda = await crearGrupo('Tamaño Soda', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande (lata)', precio_delta: 8 },
  ]);
  const saborFrappe = await crearGrupo('Sabor Frappe', [
    { nombre: 'Frutilla' }, { nombre: 'Chicle' }, { nombre: 'Mocca' }, { nombre: 'Oreo' }, { nombre: 'Chocolate' },
  ]);
  const tamanoFrappe = await crearGrupo('Tamaño Frappe', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 5 },
  ]);
  const agregarPerlas = await crearGrupo('¿Añadir perlas explosivas?', [
    { nombre: 'Sí', precio_delta: 6 }, { nombre: 'No', precio_delta: 0 },
  ]);
  const tamanoLatte = await crearGrupo('Tamaño Latte', [
    { nombre: 'Mediano', precio_delta: 0 }, { nombre: 'Grande', precio_delta: 5 },
  ]);

  // --- Productos ---
  const bubbleTea = await Producto.create({ categoria_id: catBubbleTea.id, nombre: 'Bubble Tea', precio: 20 });
  await asignarPasos(bubbleTea.id, [
    { grupo_opciones_id: saborBubbleTea.grupo.id },
    { grupo_opciones_id: base.grupo.id },
    { grupo_opciones_id: estilo.grupo.id },
    { grupo_opciones_id: hierbaBuenaSiNo.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id },
    { grupo_opciones_id: tamanoBubbleTea.grupo.id },
  ]);

  const sodaItaliana = await Producto.create({ categoria_id: catSodas.id, nombre: 'Soda Italiana', precio: 20 });
  await asignarPasos(sodaItaliana.id, [
    { grupo_opciones_id: saborSoda.grupo.id },
    { grupo_opciones_id: hierbaMenta.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id },
    { grupo_opciones_id: tamanoSoda.grupo.id },
  ]);

  const frappe = await Producto.create({ categoria_id: catFrappes.id, nombre: 'Frappe', precio: 23 });
  await asignarPasos(frappe.id, [
    { grupo_opciones_id: saborFrappe.grupo.id },
    { grupo_opciones_id: tamanoFrappe.grupo.id },
    { grupo_opciones_id: agregarPerlas.grupo.id },
    { grupo_opciones_id: saborPerlas.grupo.id, disparado_por_opcion_id: agregarPerlas.opciones['Sí'].id },
  ]);

  const saboresLatte = ['Coco', 'Maracuyá', 'Frutilla', 'Banana'];
  for (const sabor of saboresLatte) {
    const producto = await Producto.create({ categoria_id: catLatte.id, nombre: `Ice Coffee Latte de ${sabor}`, precio: 20 });
    await asignarPasos(producto.id, [{ grupo_opciones_id: tamanoLatte.grupo.id }]);
  }

  const infusiones = ['Manzanilla', 'Té Negro', 'Té Verde', 'Anís', 'Trimate', 'Cedrón'];
  for (const nombre of infusiones) {
    await Producto.create({ categoria_id: catInfusiones.id, nombre, precio: 7 });
  }

  await Producto.create({ categoria_id: catWaffles.id, nombre: 'Waffle Simple', precio: 18 });
  await Producto.create({ categoria_id: catWaffles.id, nombre: 'Waffle Completo', precio: 25 });

  // --- Branding ---
  await Configuracion.upsert({ clave: 'nombre_negocio', valor: 'Bubbas Vibes' });
  await Configuracion.upsert({ clave: 'logo', valor: IMG('bubbasvibes-logo.jpeg') });

  console.log('Catálogo Bubbas Vibes creado correctamente.');
}

seed()
  .then(() => sequelize.close())
  .catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Agregar el script `npm run seed:bubbasvibes`**

En `backend/package.json`, dentro de `"scripts"` (junto al `"seed": "node database/seeds/seed.js"` existente), agregar:
```json
    "seed:bubbasvibes": "node database/seeds/seed-bubbasvibes.js"
```

- [ ] **Step 4: Ejecutar el seed contra la base de desarrollo y verificar**

Run: `cd backend && npm run seed:bubbasvibes`
Expected: imprime `Catálogo Bubbas Vibes creado correctamente.` sin errores.

Run (verificación manual rápida): `cd backend && node -e "require('./src/models').Producto.findAll({include:[{association:'pasos', include:[{association:'grupo_opciones', include:['opciones']}]}]}).then(p => console.log(p.length, 'productos')).then(()=>process.exit())"`
Expected: imprime `15 productos`.

- [ ] **Step 5: Commit**

```bash
git add backend/database/seeds/seed-bubbasvibes.js backend/package.json backend/uploads/bubbasvibes-*.jpeg
git commit -m "Seed: catálogo completo de Bubbas Vibes (categorías, pasos, productos, logo)"
```

---

## Part 5 — Limpieza de tests obsoletos (backend)

### Task 10: Reescribir/eliminar tests afectados por los cambios de esquema

**Files:**
- Delete: `backend/tests/codepay.client.test.js`
- Delete: `backend/tests/webhooks-codepay.test.js`
- Delete: `backend/tests/pagos_qr.model.test.js`
- Modify: `backend/tests/opciones.model.test.js`
- Modify: `backend/tests/productos.test.js`
- Modify: `backend/tests/ventas.test.js`

**Interfaces:**
- Produces: suite verde sin referencias a CodePay/PagoQr/`grupo_opciones_id` singular.

- [ ] **Step 1: Eliminar los tests de CodePay/PagoQr**

```bash
git rm backend/tests/codepay.client.test.js backend/tests/webhooks-codepay.test.js backend/tests/pagos_qr.model.test.js
```

- [ ] **Step 2: Reescribir `opciones.model.test.js`**

Reemplazar el segundo `it` (líneas 30-40 del original, que asignaba `grupo_opciones_id` directo a un producto) por uno que usa `ProductoGrupoOpciones`:

```js
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
```

- [ ] **Step 3: Corregir `productos.test.js`**

Buscar en `backend/tests/productos.test.js` cualquier `Producto.create({..., grupo_opciones_id: ...})` o payload de API con `grupo_opciones_id`, y reemplazarlo por la creación de un `ProductoGrupoOpciones` aparte (mismo patrón que en `grupos-opciones.test.js`, ver Step 4) o por un `pasos: [{ grupo_opciones_id }]` en el payload si el test es contra el endpoint HTTP `POST /api/v1/productos`.

Run: `cd backend && grep -n "grupo_opciones_id" tests/productos.test.js`
Expected: localizar cada ocurrencia y ajustarla como arriba antes de continuar.

- [ ] **Step 4: Corregir `grupos-opciones.test.js`**

En `backend/tests/grupos-opciones.test.js:58-78` (test `'eliminar un grupo asignado a un producto lo desasigna en vez de fallar'`), reemplazar:
```js
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Con Grupo Test', precio: 10, grupo_opciones_id: grupoId });

    const eliminar = await request(app)
      .delete(`/api/v1/grupos-opciones/${grupoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eliminar.status).toBe(200);

    const productoRecargado = await Producto.findByPk(producto.id);
    expect(productoRecargado.grupo_opciones_id).toBeNull();
```
por (usando `ProductoGrupoOpciones` en vez de la columna eliminada, y ajustando el nombre del test/aserción a lo que realmente pasa ahora — el grupo se borra igual, y el paso queda eliminado en cascada en vez de "desasignado"):
```js
    const { ProductoGrupoOpciones } = require('../src/models');
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto Con Grupo Test', precio: 10 });
    await ProductoGrupoOpciones.create({ producto_id: producto.id, grupo_opciones_id: grupoId, orden: 1 });

    const eliminar = await request(app)
      .delete(`/api/v1/grupos-opciones/${grupoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eliminar.status).toBe(200);

    const pasos = await ProductoGrupoOpciones.findAll({ where: { producto_id: producto.id } });
    expect(pasos).toHaveLength(0);
```
También renombrar el `it` de `'eliminar un grupo asignado a un producto lo desasigna en vez de fallar'` a `'eliminar un grupo asignado a un producto borra el paso en cascada en vez de fallar'`.

Nota: como `eliminarGrupoOpciones` en `productos.service.js` (Task 5, no modificada en este task) hace `await Producto.update({ grupo_opciones_id: null }, ...)`, esa línea ya no aplica (la columna no existe) — debe quitarse de `productos.service.js`. Volver a `backend/src/modules/productos/productos.service.js` y en `eliminarGrupoOpciones` (línea 83-88) quitar la línea `await Producto.update({ grupo_opciones_id: null }, { where: { grupo_opciones_id: id } });` (el `ON DELETE CASCADE` de `producto_grupos_opciones` ya se encarga de limpiar los pasos).

- [ ] **Step 5: Reescribir el describe de pago QR en `ventas.test.js`**

Reemplazar todo el bloque desde `const codepayClientMock = ...` (línea 163) hasta el final del archivo (línea 396) por:
```js
describe('Ventas — cobro con QR estático (manual)', () => {
  let sucursalId, areaId, mesaId, usuarioId, cajaId, sesionId, productoId, token;

  beforeAll(async () => {
    const sucursal = await Sucursal.create({ nombre: 'Sucursal QR Estático Ventas Test' });
    sucursalId = sucursal.id;
    const area = await Area.create({ nombre: 'Area QR Estático Ventas Test', sucursal_id: sucursalId });
    areaId = area.id;
    const mesa = await Mesa.create({ area_id: areaId, nombre: 'Mesa QR Estático Ventas Test' });
    mesaId = mesa.id;
    const categoria = await Categoria.create({ nombre: 'Categoria QR Estático Ventas Test' });
    const producto = await Producto.create({ categoria_id: categoria.id, nombre: 'Producto QR Estático Ventas Test', precio: 5, stock: 0 });
    productoId = producto.id;
    await ProductoStockSucursal.create({ producto_id: productoId, sucursal_id: sucursalId, stock: 10 });

    const rol = await Rol.findOne({ where: { nombre: 'Cajero' } });
    const hash = await bcrypt.hash('clave123', 10);
    const usuario = await Usuario.create({ rol_id: rol.id, nombre: 'QR Estático Ventas Test', email: 'qr-estatico-ventas-test@restaurante.com', contrasena: hash });
    usuarioId = usuario.id;
    await usuario.addSucursal(sucursal);

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'qr-estatico-ventas-test@restaurante.com', contrasena: 'clave123' });
    token = login.body.datos.token;

    const caja = await Caja.create({ sucursal_id: sucursalId, nombre: 'Caja QR Estático Ventas Test' });
    cajaId = caja.id;
    const sesion = await SesionCaja.create({ usuario_id: usuarioId, sucursal_id: sucursalId, caja_id: cajaId, monto_apertura: 0 });
    sesionId = sesion.id;
  });

  afterAll(async () => {
    await Pedido.destroy({ where: { usuario_id: usuarioId } });
    await LibroCaja.destroy({ where: { usuario_id: usuarioId } });
    await SesionCaja.destroy({ where: { id: sesionId } });
    await Caja.destroy({ where: { id: cajaId } });
    await ProductoStockSucursal.destroy({ where: { producto_id: productoId } });
    await Producto.destroy({ where: { id: productoId } });
    await Usuario.destroy({ where: { id: usuarioId } });
    await Mesa.destroy({ where: { id: mesaId } });
    await Area.destroy({ where: { id: areaId } });
    await Sucursal.destroy({ where: { id: sucursalId } });
  });

  it('metodo_pago=qr completa la venta de inmediato (sin registro externo), descuenta stock y registra el ingreso', async () => {
    const res = await request(app)
      .post('/api/v1/ventas/completa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'llevar', metodo_pago: 'qr', sesion_caja_id: sesionId,
        items: [{ producto_id: productoId, cantidad: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.datos.estado).toBe('completado');
    expect(res.body.datos.metodo_pago).toBe('qr');

    const fila = await ProductoStockSucursal.findOne({ where: { producto_id: productoId, sucursal_id: sucursalId } });
    expect(fila.stock).toBe(8); // 10 - 2

    const entradasLibro = await LibroCaja.count({ where: { referencia_id: res.body.datos.id } });
    expect(entradasLibro).toBe(1);
  });

  it('cobrar un pedido pendiente con metodo_pago=qr también completa de inmediato', async () => {
    const creado = await request(app)
      .post('/api/v1/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({ mesa_id: mesaId, tipo: 'mesa', sesion_caja_id: sesionId });
    const pedidoId = creado.body.datos.id;

    await request(app)
      .post(`/api/v1/ventas/${pedidoId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: productoId, cantidad: 1 });

    const res = await request(app)
      .post(`/api/v1/ventas/${pedidoId}/cobrar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metodo_pago: 'qr' });

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('completado');
  });
});
```
Y quitar `PagoQr` del `require('../src/models')` en la línea 22 del archivo.

- [ ] **Step 6: Correr toda la suite de backend**

Run: `cd backend && npx jest --runInBand`
Expected: todos los tests PASS (0 failed).

- [ ] **Step 7: Commit**

```bash
git add backend/tests
git commit -m "tests: quitar suites de CodePay/PagoQr, adaptar a pasos multi-grupo y QR estático"
```

---

## Part 6 — Frontend: API clients

### Task 11: Actualizar clientes API (productos, grupos de opciones, configuración) y quitar el de pagos QR

**Files:**
- Modify: `frontend/src/api/productos.js`
- Modify: `frontend/src/api/gruposOpciones.js`
- Modify: `frontend/src/api/configuracion.js`
- Delete: `frontend/src/api/pagosQr.js`

**Interfaces:**
- Produces: `crearProducto`/`actualizarProducto` (ya existentes) siguen enviando el body tal cual (incluyendo ahora `pasos` en vez de `grupo_opciones_id` — no requiere cambios de firma, solo lo arma quien llama, ver Task 19); `subirQrPago(file)` nuevo export en `configuracion.js`.

- [ ] **Step 1: Revisar `frontend/src/api/productos.js` y `gruposOpciones.js`**

Run: `cat frontend/src/api/productos.js frontend/src/api/gruposOpciones.js`
Como ambos módulos ya son wrappers finos (`api.post('/productos', datos)`, etc. — igual que `ventas.js` en el reporte de exploración), no requieren cambios de código: el `datos` que reciben ya viaja tal cual al backend, y el nuevo shape (`pasos` en vez de `grupo_opciones_id`, `precio_delta` en cada opción) lo arma el componente que los llama (Task 19). Confirmar esto leyendo ambos archivos completos antes de continuar — si alguno transforma el payload (por ejemplo, whitelist de campos), ajustarlo para incluir `pasos`/`precio_delta`.

- [ ] **Step 2: Agregar `subirQrPago` en `configuracion.js`**

En `frontend/src/api/configuracion.js`, después de `subirLogo` (línea 17-21), agregar:
```js
export const subirQrPago = (file) => {
  const form = new FormData();
  form.append('imagen', file);
  return api.post('/uploads/imagen', form).then((r) => r.data.datos.url);
};
```

- [ ] **Step 3: Eliminar el cliente API de pagos QR**

```bash
git rm frontend/src/api/pagosQr.js
```

- [ ] **Step 4: Verificar que el build no rompe por el import eliminado**

Run: `cd frontend && grep -rn "api/pagosQr" src/`
Expected: sin resultados una vez completada la Task 15 (que quita el único uso en `ModalPagoQr.jsx`, el cual se elimina); si en este punto todavía aparecen resultados, es porque Task 15 no se ha hecho aún — normal en este orden, se resuelve ahí.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/configuracion.js
git rm --cached frontend/src/api/pagosQr.js 2>/dev/null || true
git commit -m "api: subirQrPago para el QR estático de pago; quitar cliente de pagosQr"
```

---

## Part 7 — Frontend: wizard de selección paso a paso

### Task 12: Nuevo componente `SelectorPasosModal.jsx`

**Files:**
- Create: `frontend/src/pages/ventas/components/SelectorPasosModal.jsx`
- Delete: `frontend/src/pages/ventas/components/SelectorOpcionModal.jsx`

**Interfaces:**
- Consumes: `producto.pasos` (array ordenado, cada uno `{ id, obligatorio, disparado_por_opcion_id, grupo_opciones: { id, nombre, opciones: [{id, nombre, precio_delta}] } }`) tal como lo entrega el backend tras Task 5.
- Produces: `<SelectorPasosModal producto={prod} onConfirmar={(selecciones) => ...} onClose={...} />` donde `onConfirmar` recibe `selecciones = [{ grupo_opciones_id, opcion_id, nombre_grupo, nombre_opcion, precio_delta }]` (solo los pasos realmente mostrados/elegidos).

- [ ] **Step 1: Eliminar el componente anterior**

```bash
git rm frontend/src/pages/ventas/components/SelectorOpcionModal.jsx
```

- [ ] **Step 2: Crear el wizard**

```jsx
import { useMemo, useState } from 'react';
import Modal from '../../../components/ui/Modal';

function pasoVisible(paso, seleccionPorGrupo) {
  if (!paso.disparado_por_opcion_id) return true;
  return Object.values(seleccionPorGrupo).some((s) => s.opcion_id === paso.disparado_por_opcion_id);
}

export default function SelectorPasosModal({ producto, onConfirmar, onClose }) {
  // seleccionPorGrupo: { [grupo_opciones_id]: { opcion_id, nombre_grupo, nombre_opcion, precio_delta } }
  const [seleccionPorGrupo, setSeleccionPorGrupo] = useState({});
  const [indice, setIndice] = useState(0);

  const pasosVisibles = useMemo(
    () => (producto.pasos || []).filter((p) => pasoVisible(p, seleccionPorGrupo)),
    [producto.pasos, seleccionPorGrupo]
  );

  const paso = pasosVisibles[indice];
  const esUltimo = indice === pasosVisibles.length - 1;
  const seleccionActual = paso ? seleccionPorGrupo[paso.grupo_opciones.id] : null;

  const precioTotal = parseFloat(producto.precio) + Object.values(seleccionPorGrupo).reduce((s, o) => s + parseFloat(o.precio_delta || 0), 0);

  function elegir(opcion) {
    setSeleccionPorGrupo((prev) => ({
      ...prev,
      [paso.grupo_opciones.id]: {
        grupo_opciones_id: paso.grupo_opciones.id,
        opcion_id: opcion.id,
        nombre_grupo: paso.grupo_opciones.nombre,
        nombre_opcion: opcion.nombre,
        precio_delta: opcion.precio_delta,
      },
    }));
  }

  function siguiente() {
    if (esUltimo) {
      onConfirmar(pasosVisibles.map((p) => seleccionPorGrupo[p.grupo_opciones.id]).filter(Boolean));
      return;
    }
    setIndice((i) => i + 1);
  }

  if (!paso) {
    // Producto sin pasos (no debería abrirse este modal en ese caso, pero por seguridad):
    onConfirmar([]);
    return null;
  }

  return (
    <Modal titulo={`${producto.nombre} — ${paso.grupo_opciones.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400">Paso {indice + 1} de {pasosVisibles.length}</p>

        <div className="flex flex-wrap gap-2">
          {paso.grupo_opciones.opciones.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => elegir(opcion)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                seleccionActual?.opcion_id === opcion.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              {opcion.nombre}{parseFloat(opcion.precio_delta) > 0 ? ` (+${opcion.precio_delta})` : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bs {precioTotal.toFixed(2)}</p>
          <div className="flex gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setIndice((i) => i - 1)}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={siguiente}
              disabled={paso.obligatorio && !seleccionActual}
              className="px-5 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {esUltimo ? 'Agregar al carrito' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Verificar el build**

Run: `cd frontend && npm run build`
Expected: build falla mencionando que `SelectorOpcionModal` no existe (todavía es importado desde `VentasPage.jsx`) — esperado en este punto, se corrige en Task 13.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ventas/components/SelectorPasosModal.jsx
git rm --cached frontend/src/pages/ventas/components/SelectorOpcionModal.jsx 2>/dev/null || true
git commit -m "frontend: wizard de selección paso a paso (SelectorPasosModal)"
```

---

### Task 13: `VentasPage.jsx` — integrar el wizard, selecciones en el carrito, imprimir manual

**Files:**
- Modify: `frontend/src/pages/ventas/VentasPage.jsx`

**Interfaces:**
- Consumes: `SelectorPasosModal` (Task 12), `imprimirTicketVenta`/`imprimirTicketCocina` (Task 16/17), `getConfiguracion` (`../../api/configuracion`).
- Produces: carrito con forma `{producto_id, nombre, precio, cantidad, nota, selecciones}`; payload de checkout con `items[].selecciones = [{grupo_opciones_id, opcion_id}]`; ya no llama a `imprimirLocal` automáticamente.

- [ ] **Step 1: Cambiar imports**

Reemplazar (líneas 13, 16, 20-21):
```js
import { BASE_URL, getConfiguracion } from '../../api/configuracion';
```
```js
import ModalPagoQr from './components/ModalPagoQr';
import SelectorOpcionModal from './components/SelectorOpcionModal';
```
por:
```js
import SelectorPasosModal from './components/SelectorPasosModal';
import { imprimirTicketVenta } from '../../utils/ticketVenta';
import { imprimirTicketCocina } from '../../utils/ticketCocina';
```
(quitar el import de `imprimirLocal` en la línea 16 y el de `ModalPagoQr` en la línea 20; ya no se usan).

- [ ] **Step 2: Cambiar `handleProducto`/`elegirOpcion`/`agregarAlCarrito`**

Reemplazar (líneas 99-121):
```js
  function agregarAlCarrito(prod, { selecciones = [], nota = null } = {}) {
    const precio = parseFloat(prod.precio) + selecciones.reduce((s, o) => s + parseFloat(o.precio_delta || 0), 0);
    const clave = JSON.stringify(selecciones.map((s) => s.opcion_id).sort());
    setCarrito((prev) => {
      const existente = prev.find((it) => it.producto_id === prod.id && JSON.stringify(it.selecciones.map((s) => s.opcion_id).sort()) === clave && it.nota === nota);
      if (existente) {
        return prev.map((it) => it === existente ? { ...it, cantidad: it.cantidad + 1 } : it);
      }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, precio, cantidad: 1, nota, selecciones }];
    });
  }

  function handleProducto(prod) {
    if (!puedeCrear) return;
    if (prod.pasos && prod.pasos.length > 0) {
      setSelectorOpcion(prod);
      return;
    }
    agregarAlCarrito(prod);
  }

  function confirmarSelecciones(selecciones) {
    agregarAlCarrito(selectorOpcion, { selecciones });
    setSelectorOpcion(null);
  }
```
(el estado `selectorOpcion` de la línea 43 se mantiene igual, solo cambia quién lo consume; renombrar su setter no es necesario).

- [ ] **Step 3: Actualizar el render del modal**

Reemplazar (líneas 433-439):
```jsx
      {selectorOpcion && (
        <SelectorPasosModal
          producto={selectorOpcion}
          onConfirmar={confirmarSelecciones}
          onClose={() => setSelectorOpcion(null)}
        />
      )}
```

- [ ] **Step 4: Actualizar el payload de checkout**

Reemplazar (línea 456):
```js
      items: carrito.map((it) => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        nota: it.nota,
        selecciones: it.selecciones.map((s) => ({ grupo_opciones_id: s.grupo_opciones_id, opcion_id: s.opcion_id })),
      })),
```

- [ ] **Step 5: Quitar la impresión automática y agregar impresión manual en `ModalCobrar`**

Reemplazar el `onSuccess` de la mutación `iniciar` (líneas 461-468):
```js
    onSuccess: (resultado) => {
      setVentaCompletada(resultado);
    },
```
Agregar el estado `ventaCompletada` junto a `metodo`/`error`/`pagoQrEstado` (línea 447-449) — y puede quitarse `pagoQrEstado` (ya no hay flujo de polling QR):
```js
  const [metodo, setMetodo] = useState('efectivo');
  const [error, setError] = useState(null);
  const [ventaCompletada, setVentaCompletada] = useState(null);
```

Buscar la sección de `Configuracion` para el negocio (usada en tickets) — agregar, dentro de `ModalCobrar`, la carga de config:
```js
  const { data: config = {} } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion });
```
(requiere `import { getConfiguracion } from '../../api/configuracion';` junto a los demás imports de la Task 1).

Al final del render de `ModalCobrar`, antes del cierre del componente, agregar el estado de éxito (reemplazando el `return (...)` del formulario cuando `ventaCompletada` existe):
```jsx
  if (ventaCompletada) {
    return (
      <Modal titulo="Venta completada" onClose={onExito} ancho="max-w-sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">Venta registrada correctamente.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                imprimirTicketVenta(ventaCompletada, { metodo_pago: metodo, cambio: 0 }, config);
                imprimirTicketCocina(ventaCompletada, config);
              }}
              className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              Imprimir
            </button>
            <button
              onClick={onExito}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }
```
Y, para el pago QR (ya no hay polling): dentro del selector de método de pago, cuando `metodo === 'qr'`, mostrar la imagen estática configurada entre el selector y el botón de confirmar:
```jsx
        {metodo === 'qr' && (
          config.qr_pago
            ? <img src={`${BASE_URL}${config.qr_pago}`} alt="QR de pago" className="mx-auto w-48 h-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700" />
            : <p className="text-xs text-amber-600 dark:text-amber-400 text-center">No hay un QR de pago configurado (ve a Configuración → Pagos).</p>
        )}
```
(requiere que `BASE_URL` siga importado desde `../../api/configuracion`, ya lo estaba en la línea 13 original).

- [ ] **Step 6: Verificar el build**

Run: `cd frontend && npm run build`
Expected: build exitoso (0 errores). Si falla por `ModalPagoQr` u otro import residual, revisar que no quede ninguna referencia a `ModalPagoQr`/`pagoQrEstado` en el archivo.

- [ ] **Step 7: Verificación manual en el navegador**

Levantar `npm run dev` en `frontend/` y `npm run dev` en `backend/`, iniciar sesión, ir a Ventas, elegir un producto con pasos (ej. Bubble Tea tras el seed de Task 9), completar el wizard paso a paso, confirmar que el precio del carrito refleja el tamaño elegido, cobrar en efectivo y en QR (verificando que aparece la imagen estática si está configurada), y pulsar "Imprimir" para confirmar que abre las dos ventanas de ticket.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/ventas/VentasPage.jsx
git commit -m "VentasPage: wizard de pasos, selecciones en el carrito, impresión manual, QR estático"
```

---

### Task 14: `PedidoPage.jsx` — mismos cambios (pasos, QR estático, impresión manual)

**Files:**
- Modify: `frontend/src/pages/ventas/PedidoPage.jsx`
- Delete: `frontend/src/pages/ventas/components/ModalPagoQr.jsx`

**Interfaces:**
- Consumes: `SelectorPasosModal`, `imprimirTicketVenta`, `imprimirTicketCocina` (igual que Task 13).
- Produces: agregar ítems a un pedido existente ahora abre el wizard si el producto tiene pasos; `ModalCobrar` de esta página pierde el flujo de polling QR y gana impresión manual, igual que en `VentasPage`.

- [ ] **Step 1: Eliminar `ModalPagoQr.jsx`**

```bash
git rm frontend/src/pages/ventas/components/ModalPagoQr.jsx
```

- [ ] **Step 2: Ajustar imports**

Quitar (línea 16): `import ModalPagoQr from './components/ModalPagoQr';`
Quitar (línea 17, import muerto ya detectado en la exploración previa): `import { imprimirTicketVenta }  from '../../utils/ticketVenta';` y reemplazar por los dos imports correctos que sí se usarán:
```js
import { imprimirTicketVenta } from '../../utils/ticketVenta';
import { imprimirTicketCocina } from '../../utils/ticketCocina';
import SelectorPasosModal from './components/SelectorPasosModal';
```
Quitar también el import de `imprimirLocal` (línea 13).

- [ ] **Step 3: Buscar dónde se agregan ítems al pedido (equivalente a `handleProducto` de VentasPage) y aplicar el mismo patrón del wizard**

Run: `cd frontend && grep -n "agregarItem\|handleProducto\|setSelectorOpcion" src/pages/ventas/PedidoPage.jsx`
Localizar la función que llama a `agregarItem(pedidoId, {...})` al elegir un producto de la grilla dentro del pedido. Aplicar el mismo cambio que en Task 13 Step 2: si `prod.pasos?.length`, abrir `SelectorPasosModal` y, al confirmar, llamar `agregarItem(pedidoId, { producto_id: prod.id, cantidad: 1, selecciones: selecciones.map(s => ({grupo_opciones_id: s.grupo_opciones_id, opcion_id: s.opcion_id})) })`; si no tiene pasos, llamar `agregarItem` directo con `selecciones: []`.

- [ ] **Step 4: Reemplazar `ModalCobrar` — quitar polling QR, agregar QR estático + impresión manual**

Reemplazar el cuerpo de `ModalCobrar` (líneas 543-625) siguiendo exactamente el mismo patrón de Task 13 Step 5: quitar `pagoQr`/`setPagoQr` y el render condicional de `<ModalPagoQr .../>` (líneas 561-571); agregar `ventaCompletada`/`setVentaCompletada`, la carga de `config` vía `useQuery(['configuracion'], getConfiguracion)` (ya se recibe `config` como prop en este componente según el reporte de exploración — usar esa prop directamente en vez de una query nueva, ya que `PedidoPage` ya la obtiene y se la pasa), el bloque de imagen QR estática cuando `metodo === 'qr'`, y el panel final de éxito con los botones "Imprimir"/"Cerrar":
```jsx
  const cobrar = useMutation({
    mutationFn: () => cobrarVenta(pedidoId, { metodo_pago: metodo, monto_recibido: total }),
    onSuccess: (resultado) => setVentaCompletada(resultado),
    onError: (err) => setError(err?.response?.data?.mensaje ?? 'Error al cobrar'),
  });

  if (ventaCompletada) {
    return (
      <Modal titulo="Venta completada" onClose={onExito} ancho="max-w-sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">Venta registrada correctamente.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                imprimirTicketVenta(ventaCompletada, { metodo_pago: metodo, cambio: 0 }, config);
                imprimirTicketCocina(ventaCompletada, config);
              }}
              className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              Imprimir
            </button>
            <button onClick={onExito} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }
```
Y dentro del bloque de método de pago (tras el `.map` de botones `efectivo`/`qr`, antes de `{error && ...}`), agregar el mismo bloque de imagen QR estática de Task 13 (usando `BASE_URL` desde `../../api/configuracion`, ya importado en este archivo según el reporte de exploración).

- [ ] **Step 5: Verificar el build**

Run: `cd frontend && npm run build`
Expected: 0 errores.

- [ ] **Step 6: Verificación manual**

Abrir un pedido de mesa existente, agregar un producto con pasos (verifica el wizard), cobrarlo con QR (verifica que se muestra el QR estático si está configurado, o el mensaje de aviso si no), confirmar cobro, y probar el botón "Imprimir".

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ventas/PedidoPage.jsx
git rm --cached frontend/src/pages/ventas/components/ModalPagoQr.jsx 2>/dev/null || true
git commit -m "PedidoPage: wizard de pasos, QR estático sin polling, impresión manual"
```

---

## Part 8 — Tickets rediseñados con logo

### Task 15: `ticketVenta.js` — logo + opciones por línea

**Files:**
- Modify: `frontend/src/utils/ticketVenta.js`

**Interfaces:**
- Consumes: `pedido.detalles[].opciones` (array `{nombre_grupo, nombre_opcion}` que ya llega en la respuesta del backend tras Task 6); `config.logo` (string, path relativo tipo `/uploads/...`).
- Produces: mismo export `imprimirTicketVenta(pedido, pago, config)`, encabezado con imagen de logo, cada línea de producto muestra sus opciones elegidas debajo del nombre.

- [ ] **Step 1: Leer el archivo completo antes de editar**

Run: `cat frontend/src/utils/ticketVenta.js`

- [ ] **Step 2: Agregar el logo al encabezado del HTML del ticket**

Localizar el bloque de encabezado (donde hoy se imprime `config.nombre_negocio` en texto grande, cerca del inicio del template HTML) y anteponer una imagen, usando `BASE_URL` reconstruido igual que en `api/configuracion.js` (`import.meta.env.VITE_API_URL` sin el sufijo `/api/v1`):
```js
const BASE_URL_TICKET = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');
```
En el HTML del encabezado, antes del `<h1>`/nombre del negocio, agregar:
```html
${config.logo ? `<img src="${BASE_URL_TICKET}${config.logo}" style="max-width:120px;max-height:70px;display:block;margin:0 auto 4px;filter:grayscale(1) contrast(1.3);" />` : ''}
```

- [ ] **Step 3: Mostrar las opciones elegidas debajo de cada línea de producto**

Localizar el `.map` que construye `filas` a partir de `pedido.detalles` (donde hoy se arma el texto de cada línea, incluyendo el nombre del producto). Debajo del nombre del producto, agregar una línea por cada elemento de `detalle.opciones`:
```js
const filas = pedido.detalles.map((d) => {
  const opcionesTexto = (d.opciones || [])
    .map((o) => `<div style="font-size:10px;color:#555;padding-left:8px;">- ${o.nombre_opcion}</div>`)
    .join('');
  // ... (mantener el resto de la construcción de la fila igual que antes, insertando `opcionesTexto`
  //      inmediatamente después del nombre del producto, antes del precio/cantidad)
});
```
(Ajustar la interpolación exacta al layout HTML real del archivo — el punto clave es: nombre del producto, luego `opcionesTexto`, luego cantidad/precio, tal como ya se arma `nota` si existiera; si el archivo ya mostraba `d.nota` en algún lado, dejarlo tal cual, aparte de las opciones).

- [ ] **Step 4: Verificar el build**

Run: `cd frontend && npm run build`
Expected: 0 errores.

- [ ] **Step 5: Verificación manual**

Desde el flujo de Task 13/14, imprimir un ticket de cliente con un producto que tenga varias opciones elegidas (ej. Bubble Tea completo) y confirmar visualmente en la vista previa de impresión del navegador que aparece el logo arriba y cada paso elegido debajo del producto.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/ticketVenta.js
git commit -m "ticketVenta: logo en encabezado y opciones elegidas por línea de producto"
```

---

### Task 16: `ticketCocina.js` — logo + opciones por línea

**Files:**
- Modify: `frontend/src/utils/ticketCocina.js`

**Interfaces:**
- Igual que Task 15, aplicado a `imprimirTicketCocina(pedido, config)`.

- [ ] **Step 1: Leer el archivo completo antes de editar**

Run: `cat frontend/src/utils/ticketCocina.js`

- [ ] **Step 2: Agregar el logo al encabezado**

Mismo cambio que Task 15 Step 2 (misma constante `BASE_URL_TICKET`, mismo `<img>` en el encabezado, antes del nombre del negocio/`★ ${nombre} ★`).

- [ ] **Step 3: Mostrar las opciones elegidas junto al `nota` existente por línea**

Localizar donde hoy se renderiza `d.nota` por cada línea de producto (el reporte de exploración lo ubica alrededor de la construcción de `filas`, con `d.nota` visible en el ticket). Justo antes o después de esa nota, agregar el mismo bloque de opciones que en Task 15:
```js
const opcionesTexto = (d.opciones || [])
  .map((o) => `<div style="font-size:11px;font-weight:600;padding-left:8px;">- ${o.nombre_opcion}</div>`)
  .join('');
```
e insertarlo junto al nombre del producto (en negrita, ya que en cocina es la información más importante — lo que hay que preparar). La `nota` general del pedido (`pedido.notas`) se mantiene como está.

- [ ] **Step 4: Verificar el build**

Run: `cd frontend && npm run build`
Expected: 0 errores.

- [ ] **Step 5: Verificación manual**

Igual que Task 15 Step 5, pero revisando el ticket de cocina: debe verse claramente qué preparar (ej. "Bubble Tea" con "Arandanitos / Leche / Frapeado / Con hierba buena / Perlas: Maracuyá / Grande" listados debajo).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/ticketCocina.js
git commit -m "ticketCocina: logo en encabezado y opciones elegidas por línea de producto"
```

---

## Part 9 — Configuración: QR de pago estático

### Task 17: `ConfiguracionPage.jsx` — campo para subir el QR de pago

**Files:**
- Modify: `frontend/src/pages/configuracion/ConfiguracionPage.jsx`

**Interfaces:**
- Consumes: `subirQrPago` (Task 11), `actualizarConfiguracion`, `getConfiguracion`, `logoSrc` (todos de `../../api/configuracion`).
- Produces: nueva pestaña "Pagos" (o campo dentro de una existente) que sube una imagen y la guarda bajo la clave `qr_pago`.

- [ ] **Step 1: Agregar la pestaña "Pagos"**

En el arreglo `TABS` (líneas 10-15), agregar:
```js
const TABS = [
  { id: 'negocio', label: 'Negocio' },
  { id: 'areas', label: 'Áreas' },
  { id: 'mesas', label: 'Mesas' },
  { id: 'flujo', label: 'Flujo de cocina' },
  { id: 'pagos', label: 'Pagos' },
];
```
Y en el render condicional de tabs (cerca de la línea 58), agregar:
```jsx
{tab === 'pagos' && <TabPagos />}
```

- [ ] **Step 2: Crear el componente `TabPagos`**

Siguiendo el mismo patrón que el manejo del logo en `TabNegocio` (líneas 121-135 y 173-216 del reporte de exploración: `useQuery`, `useMutation` de guardar, `useRef` + input file oculto), agregar en el mismo archivo (junto a `TabNegocio`/`TabFlujo`):
```jsx
function TabPagos() {
  const qc = useQueryClient();
  const qrRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorQr, setErrorQr] = useState(null);
  const [guardado, setGuardado] = useState(false);

  const { data: config = {}, isLoading } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion });

  const guardar = useMutation({
    mutationFn: (datos) => actualizarConfiguracion(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    },
  });

  async function handleQr(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendo(true);
    setErrorQr(null);
    try {
      const url = await subirQrPago(file);
      guardar.mutate({ qr_pago: url });
    } catch {
      setErrorQr('No se pudo subir la imagen');
    } finally {
      setSubiendo(false);
      if (qrRef.current) qrRef.current.value = '';
    }
  }

  function quitarQr() {
    guardar.mutate({ qr_pago: '' });
  }

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">QR de pago (estático)</p>
        <p className="text-xs text-gray-400 mb-3">Esta imagen se muestra en el POS cuando el cajero elige "QR / Transferencia". La confirmación del pago es manual.</p>

        {config.qr_pago ? (
          <div className="flex items-center gap-3">
            <img src={logoSrc(config.qr_pago)} alt="QR de pago" className="w-32 h-32 object-contain rounded-xl border border-gray-200 dark:border-gray-700" />
            <button onClick={quitarQr} className="text-sm text-red-500 hover:text-red-600">Quitar</button>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400">
            Sin imagen
          </div>
        )}

        <input ref={qrRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleQr} className="hidden" />
        <button
          onClick={() => qrRef.current?.click()}
          disabled={subiendo}
          className="mt-3 px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {subiendo ? 'Subiendo...' : (config.qr_pago ? 'Cambiar imagen' : 'Subir imagen')}
        </button>
        {errorQr && <p className="text-sm text-red-600 mt-2">{errorQr}</p>}
        {guardado && <p className="text-sm text-green-600 mt-2">Guardado correctamente</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Ajustar los imports del archivo**

Confirmar que `subirQrPago`, `logoSrc` están importados junto a `getConfiguracion`/`actualizarConfiguracion` en la parte superior del archivo:
```js
import { getConfiguracion, actualizarConfiguracion, subirLogo, subirQrPago, logoSrc } from '../../api/configuracion';
```

- [ ] **Step 4: Verificar el build**

Run: `cd frontend && npm run build`
Expected: 0 errores.

- [ ] **Step 5: Verificación manual**

Ir a Configuración → pestaña "Pagos", subir una imagen de QR, confirmar que se guarda y se previsualiza; luego ir a Ventas, elegir método QR y confirmar que esa misma imagen aparece (Task 13/14).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/configuracion/ConfiguracionPage.jsx
git commit -m "Configuración: nueva pestaña Pagos para subir el QR estático"
```

---

## Part 10 — Admin de productos: pasos multi-grupo y precio_delta

### Task 18: `ProductosPage.jsx` — gestión de pasos por producto y precio_delta en opciones

**Files:**
- Modify: `frontend/src/pages/productos/ProductosPage.jsx`

**Interfaces:**
- Consumes: `getGruposOpciones` (ya existente), grupos con `opciones[].precio_delta` (Task 5/11).
- Produces: `FormProductoModal` reemplaza el `<select>` único de `grupo_opciones_id` por una lista ordenable de pasos (`{ grupo_opciones_id, obligatorio, disparado_por_opcion_id }`); `FormGrupoOpcionesModal` agrega un campo numérico `precio_delta` por opción.

- [ ] **Step 1: Cambiar el estado inicial de `FormProductoModal`**

Reemplazar (línea 435, dentro del `useState` inicial del form):
```js
      grupo_opciones_id: prod?.grupo_opciones?.id ?? '',
```
por:
```js
      pasos: prod?.pasos?.map((p) => ({
        grupo_opciones_id: p.grupo_opciones.id,
        obligatorio: !!p.obligatorio,
        disparado_por_opcion_id: p.disparado_por_opcion_id || '',
      })) ?? [],
```

- [ ] **Step 2: Agregar helpers para editar la lista de pasos**

Junto a las demás funciones del componente (cerca de `handleArchivo`/`quitarImagen`, antes de `handleGuardar`), agregar:
```js
  function agregarPaso() {
    setForm((f) => ({ ...f, pasos: [...f.pasos, { grupo_opciones_id: '', obligatorio: true, disparado_por_opcion_id: '' }] }));
  }
  function actualizarPaso(i, cambios) {
    setForm((f) => ({ ...f, pasos: f.pasos.map((p, idx) => idx === i ? { ...p, ...cambios } : p) }));
  }
  function quitarPaso(i) {
    setForm((f) => ({ ...f, pasos: f.pasos.filter((_, idx) => idx !== i) }));
  }
  function moverPaso(i, delta) {
    setForm((f) => {
      const pasos = [...f.pasos];
      const j = i + delta;
      if (j < 0 || j >= pasos.length) return f;
      [pasos[i], pasos[j]] = [pasos[j], pasos[i]];
      return { ...f, pasos };
    });
  }
```

- [ ] **Step 3: Actualizar `handleGuardar` para enviar `pasos` en vez de `grupo_opciones_id`**

Reemplazar (líneas 473-479):
```js
    const datos = {
      categoria_id: parseInt(form.categoria_id),
      nombre: form.nombre,
      precio: parseFloat(form.precio),
      es_vendible: form.es_vendible,
      imagen: form.imagen,
      pasos: form.pasos
        .filter((p) => p.grupo_opciones_id)
        .map((p, i) => ({
          grupo_opciones_id: parseInt(p.grupo_opciones_id),
          orden: i,
          obligatorio: p.obligatorio,
          disparado_por_opcion_id: p.disparado_por_opcion_id ? parseInt(p.disparado_por_opcion_id) : null,
        })),
    };
```

- [ ] **Step 4: Reemplazar el `<select>` único por la lista de pasos en el JSX**

Reemplazar el bloque completo (líneas 566-576, el `<div className="col-span-2">` del "Grupo de opciones"):
```jsx
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pasos de selección</label>
              <button type="button" onClick={agregarPaso} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">+ Agregar paso</button>
            </div>
            <div className="space-y-2">
              {form.pasos.map((paso, i) => {
                const grupoElegido = gruposOpciones.find((g) => String(g.id) === String(paso.grupo_opciones_id));
                const opcionesDisparo = form.pasos
                  .slice(0, i)
                  .map((p) => gruposOpciones.find((g) => String(g.id) === String(p.grupo_opciones_id)))
                  .filter(Boolean)
                  .flatMap((g) => g.opciones.map((o) => ({ ...o, grupoNombre: g.nombre })));

                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2">
                    <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
                    <select
                      value={paso.grupo_opciones_id}
                      onChange={(e) => actualizarPaso(i, { grupo_opciones_id: e.target.value })}
                      className="flex-1 min-w-[10rem] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100"
                    >
                      <option value="">Elegir grupo...</option>
                      {gruposOpciones.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <input type="checkbox" checked={paso.obligatorio} onChange={(e) => actualizarPaso(i, { obligatorio: e.target.checked })} />
                      Obligatorio
                    </label>
                    <select
                      value={paso.disparado_por_opcion_id}
                      onChange={(e) => actualizarPaso(i, { disparado_por_opcion_id: e.target.value })}
                      className="flex-1 min-w-[10rem] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100"
                      title="Mostrar este paso solo si se eligió esta opción en un paso anterior"
                    >
                      <option value="">Mostrar siempre</option>
                      {opcionesDisparo.map((o) => <option key={o.id} value={o.id}>{o.grupoNombre}: {o.nombre}</option>)}
                    </select>
                    <button type="button" onClick={() => moverPaso(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moverPaso(i, 1)} disabled={i === form.pasos.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => quitarPaso(i)} className="text-red-400 hover:text-red-600">✕</button>
                    {grupoElegido && <span className="text-[10px] text-gray-400 w-full">{grupoElegido.opciones.length} opciones</span>}
                  </div>
                );
              })}
              {form.pasos.length === 0 && <p className="text-xs text-gray-400">Sin pasos — el producto se agrega directo al carrito.</p>}
            </div>
          </div>
```

- [ ] **Step 5: Agregar `precio_delta` a cada opción en `FormGrupoOpcionesModal`**

En el estado `opciones` (líneas 761-764), cambiar la forma de cada elemento de `{ nombre }` a `{ nombre, precio_delta }`, inicializando desde el grupo existente si se está editando (seguir el patrón ya usado para `nombre`). En `handleGuardar` (líneas 788-793):
```js
  function handleGuardar() {
    const opcionesValidas = opciones
      .filter((o) => o.nombre.trim())
      .map((o, orden) => ({ nombre: o.nombre.trim(), orden, precio_delta: parseFloat(o.precio_delta) || 0 }));
    onGuardar({ nombre, opciones: opcionesValidas });
  }
```
Y en el JSX donde se renderiza cada opción (input de texto para `nombre`), agregar un segundo input numérico al lado:
```jsx
<input
  type="number"
  step="0.01"
  value={opcion.precio_delta ?? 0}
  onChange={(e) => actualizarOpcion(i, { precio_delta: e.target.value })}
  className="w-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
  placeholder="+Bs"
/>
```
(usar/crear el helper `actualizarOpcion(i, cambios)` análogo a `moverOpcion`/`quitarOpcion` ya existentes, aplicando el mismo patrón de actualización inmutable del array `opciones`).

- [ ] **Step 6: Verificar el build**

Run: `cd frontend && npm run build`
Expected: 0 errores.

- [ ] **Step 7: Verificación manual**

Ir a Productos → editar "Bubble Tea" (creado por el seed de Task 9): confirmar que se ven los 6 pasos en orden, con el grupo "Sabor de perlas explosivas" mostrando "Mostrar siempre" y el grupo condicional del Frappe mostrando el disparador correcto al editar "Frappe". Editar el precio_delta de "Grande" en el grupo "Tamaño" y confirmar en Ventas que el precio del wizard cambia.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/productos/ProductosPage.jsx
git commit -m "ProductosPage: admin de pasos multi-grupo por producto y precio_delta por opción"
```

---

## Self-Review

**Cobertura del spec:**
- Modelo de datos (precio_delta, producto_grupos_opciones, detalle_pedido_opciones, quitar grupo_opciones_id) → Tasks 1, 2, 4.
- Backend: validar/calcular selecciones, snapshot, quitar CodePay, quitar auto-impresión → Tasks 5, 6, 7, 8.
- Catálogo Bubbas Vibes completo (6 categorías, 15 productos, pasos condicionales del Frappe) → Task 9.
- Wizard de selección paso a paso en POS → Tasks 12, 13, 14.
- Tickets rediseñados con logo y opciones por línea (cliente y cocina) → Tasks 15, 16.
- Impresión manual (botón, sin auto-print) → Tasks 13, 14.
- Pago QR estático con confirmación manual, sin CodePay → Tasks 7, 13, 14, 17.
- Admin de pasos multi-grupo y precio_delta por producto/opción → Task 18.
- Limpieza de tests obsoletos → Task 10.
- Tema dark/light: no se introduce ningún componente nuevo sin clases `dark:` (Tasks 12, 13, 14, 17, 18 siguen el patrón Tailwind existente).

**Sin placeholders:** todas las migraciones, modelos, funciones de servicio, componentes y tests incluyen código completo y real (menús, precios placeholder explícitamente marcados como tales en Task 9, sin "TODO"/"implementar después").

**Consistencia de tipos/nombres:** `selecciones` siempre `{grupo_opciones_id, opcion_id}` de entrada y `{grupo_opciones_id, opcion_id, nombre_grupo, nombre_opcion, precio_delta}` de vuelta/snapshot, usado igual en `ventas.service.js` (Task 6), `SelectorPasosModal.jsx` (Task 12), `VentasPage.jsx`/`PedidoPage.jsx` (Tasks 13-14). `producto.pasos[].grupo_opciones.opciones[].precio_delta` usado igual en `productos.service.js` (Task 5), el wizard (Task 12), y el admin (Task 18).

---

Plan completo y guardado en `docs/superpowers/plans/2026-07-25-bubbas-vibes-catalog-options.md`.

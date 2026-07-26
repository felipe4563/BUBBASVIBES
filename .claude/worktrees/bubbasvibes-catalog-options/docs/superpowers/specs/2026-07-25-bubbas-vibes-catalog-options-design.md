# Bubbas Vibes: catálogo, opciones paso a paso y tickets cliente/cocina

## Contexto

El sistema (backend Node/Express + Sequelize + frontend React/Vite + MariaDB) fue
construido para "Solo Carnes Tropicales" y ahora se reutiliza para una tienda de bubble
tea/frappes/sodas italianas llamada **Bubbas Vibes**. El menú viene dado por 5 imágenes de
recetas (`bd/img/receta1.jpeg` a `receta5.jpeg`) y un logo (`bd/img/logo.jpeg`).

Hoy el modelo de opciones de producto es limitado: `productos.grupo_opciones_id` permite
**un solo** grupo de opciones por producto, de selección simple, y la opción elegida se
guarda solo como texto libre en `detalle_pedidos.nota` (sin vínculo estructurado a la
opción ni al precio). El menú de Bubbas Vibes necesita selección **en varios pasos
encadenados** (sabor → base → estilo → extra → sabor de extra), donde algunos pasos
cambian el precio (tamaño, perlas explosivas) y algunos pasos solo aparecen según lo
elegido antes (el paso "sabor de perlas" en Frappes solo aparece si se contestó "sí" a
"¿añadir perlas explosivas?").

Además, la impresión de tickets hoy es automática por dos vías: el backend
(`ventas.service.js` → socket `print:caja`/`print:cocina` hacia el `print-agent`) y el
frontend (`PedidoPage.jsx` → POST directo a `http://127.0.0.1:4321` tras cobrar, vía
`impresionLocal.js`). Se decidió pasar a impresión **manual** (botón en el POS), sin tocar
el código del `print-agent` (queda instalado y disponible, solo se deja de invocar
automáticamente).

Decisiones ya tomadas con el usuario (no reabrir):
- Bubble Tea sí tendrá paso de tamaño Mediano/Grande, igual que Sodas/Frappes/Latte;
  el precio exacto se deja como placeholder y se edita luego desde el panel de Productos.
- Se desactiva el auto-print (backend y frontend); se agrega botón manual. El
  `print-agent` no se borra ni se modifica.
- Se quita la integración CodePay (QR dinámico + webhook automático). El pago QR pasa a
  ser un QR **estático** (una sola imagen, subida desde Configuración) con confirmación
  **manual** por el cajero (botón "Marcar como pagado"), sin tabla `pagos_qr` ni llamadas
  a servicios externos.
- Se reemplaza el catálogo (`categorias`, `productos`, `grupos_opciones`, `opciones`)
  completo por el de Bubbas Vibes. Sucursal, usuario admin, roles y permisos se
  mantienen sin cambios (renombrables luego a mano si se quiere).
- El tema dark/light existente (Tailwind `darkMode: 'class'`, `useThemeStore`) se
  mantiene y se aplica a todos los componentes nuevos. El ticket impreso (papel
  térmico) se mantiene en blanco/negro sin importar el tema de la app.

## Catálogo (fuente: recetas 1-5)

1. **Bubble Tea** — paso 1 sabor (Arandanitos, Isla Exótica, Oreo, Euphoria, Shrek, Sol
   de Verano, Chocolate) → paso 2 base (Leche/Agua) → paso 3 estilo (Frapeado/Líquido) →
   paso 4 hierba buena (Sí/No) → paso 5 sabor de perlas explosivas (Chirimoya, Cereza,
   Algodón de Azúcar, Açaí, Maracuyá, Sandía) → paso 6 tamaño (Mediano/Grande, precio
   placeholder).
2. **Sodas Italianas** — paso 1 sabor (Maracuyá, Frutilla, Tumbo, Guayaba, Sandía,
   Jamaica, Uva, Durazno) → paso 2 hierba buena/menta → paso 3 sabor de perlas (Sandía,
   Chirimoya, Cereza, Algodón de Azúcar, Maracuyá, Açaí) → paso 4 tamaño (Mediano 20Bs /
   Grande-lata 28Bs).
3. **Frappes** — paso 1 sabor (Frutilla, Chicle, Mocca, Oreo, Chocolate) → paso 2 tamaño
   (Mediano 23Bs / Grande 28Bs) → paso 3 ¿añadir perlas explosivas? (Sí +6Bs / No) →
   paso 4 (condicional, solo si "Sí") sabor de perlas (Maracuyá, Sandía, Cereza,
   Chirimoya, Algodón de Azúcar, Açaí).
4. **Ice Coffee Latte** — 4 productos separados (Coco, Maracuyá, Frutilla, Banana), cada
   uno con paso único de tamaño (Mediano 20Bs / Grande 25Bs).
5. **Infusiones** — 6 productos de precio fijo 7Bs, sin pasos (Manzanilla, Té Negro, Té
   Verde, Anís, Trimate, Cedrón).
6. **Waffles** — 2 productos de precio fijo, sin pasos (Waffle Simple 18Bs, Waffle
   Completo 25Bs).

Imágenes: `logo.jpeg` se usa como logo de marca (login y sidebar, reemplazando el actual
asset de logo del frontend). `receta1.jpeg`..`receta4.jpeg` se usan como imagen de
portada (`categorias.imagen`) de Bubble Tea, Sodas Italianas, Frappes e Ice Coffee Latte
respectivamente. `receta5.jpeg` se usa como imagen de portada compartida por Infusiones y
Waffles (contiene ambas secciones).

## Modelo de datos

Migración nueva sobre `bd_solocarnestropicales.sql` (ejecutada como script de migración,
no editando el dump base):

- `ALTER TABLE opciones ADD COLUMN precio_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00;`
  — cuánto suma/resta esta opción al precio base del producto (ej. tamaño Grande +8.00,
  perlas explosivas +6.00, resto 0.00).
- Nueva tabla `producto_grupos_opciones`: reemplaza `productos.grupo_opciones_id`.
  - `id`, `producto_id` (FK productos, cascade), `grupo_opciones_id` (FK grupos_opciones,
    cascade), `orden` (int, posición del paso dentro del producto), `obligatorio`
    (tinyint, default 1), `disparado_por_opcion_id` (FK nullable a `opciones.id`): si no
    es null, este paso solo se muestra/exige cuando esa opción específica fue elegida en
    un paso anterior del mismo producto. Único caso real hoy: paso "sabor de perlas" en
    Frappes disparado por la opción "Sí" del paso "¿añadir perlas?".
  - Se elimina la columna `productos.grupo_opciones_id` y su FK (migración de datos:
    cualquier asociación existente se migra a esta tabla con `orden=1` antes de borrar la
    columna vieja; en este proyecto no hay datos que conservar porque se reemplaza el
    catálogo completo, así que se crea directamente sin necesidad de migrar datos).
- Nueva tabla `detalle_pedido_opciones`: snapshot estructurado de qué se eligió en cada
  línea de pedido.
  - `id`, `detalle_pedido_id` (FK detalle_pedidos, cascade), `grupo_opciones_id`,
    `opcion_id`, `nombre_grupo` (varchar, copia del nombre al momento de la venta),
    `nombre_opcion` (varchar, copia), `precio_delta` (decimal, copia). Los snapshots
    evitan que reportes/tickets históricos cambien si luego se edita el catálogo.
  - `detalle_pedidos.nota` se conserva tal cual, pero pasa a usarse solo para
    observaciones libres adicionales (ej. "sin hielo"), no para registrar la opción
    elegida.

Todos los `grupos_opciones`/`opciones` son de selección única (radio, no checkbox) — no
se agrega columna de tipo múltiple porque ninguna receta lo requiere.

## Backend

- `backend/src/models`: nuevo modelo `ProductoGrupoOpciones` y `DetallePedidoOpciones`;
  `Opcion` gana `precio_delta`; se quita `grupo_opciones_id` de `Producto` y su
  asociación directa, reemplazada por asociación many-to-many/hasMany vía
  `ProductoGrupoOpciones` (con `include` ordenado por `orden`).
- `backend/src/modules/productos`: 
  - Endpoint para leer un producto con sus pasos ordenados y, por cada grupo, sus
    opciones (incluyendo `precio_delta`) — usado por el wizard del POS.
  - Endpoints CRUD para gestionar `producto_grupos_opciones` (asignar/reordenar/quitar
    un grupo de opciones a un producto, marcar obligatorio, fijar
    `disparado_por_opcion_id`) — usados por la pantalla de admin de Productos.
- `backend/src/modules/ventas/ventas.service.js`:
  - Al agregar un item al pedido, el payload pasa de `{producto_id, cantidad, nota}` a
    `{producto_id, cantidad, nota, selecciones: [{producto_grupo_opciones_id, opcion_id}]}`.
  - El servicio valida server-side: cada paso obligatorio no-condicional (o condicional
    ya disparado) tiene una selección; cada `opcion_id` pertenece al `grupo_opciones_id`
    correcto para ese producto. Calcula `precio = producto.precio + Σ opciones.precio_delta`
    (nunca confía en un precio mandado por el cliente). Crea el `DetallePedido` con ese
    precio y luego crea las filas `DetallePedidoOpciones` (snapshot).
  - Se elimina la llamada automática a `_emitirImpresion()` en el flujo de cobro/cierre
    de pedido (o se deja la función sin invocar desde ningún punto automático). El
    `print-agent` y los eventos socket `print:caja`/`print:cocina` siguen existiendo en
    el código por si se reactivan después, pero no se disparan solos.
  - Nuevo endpoint (o reuso de uno existente) que devuelve los datos de impresión
    (cliente + cocina) de un pedido bajo demanda, para que el frontend lo pida al
    presionar "Imprimir".

## Frontend

- **Wizard de selección** (`frontend/src/pages/ventas/components/`): nuevo componente
  que reemplaza `SelectorOpcionModal.jsx`. Muestra los pasos del producto uno a la vez
  (pills de selección única, como en las recetas), botones Atrás/Siguiente, precio
  corriendo visible, y salta automáticamente los pasos condicionales no disparados. Al
  terminar, entrega `{selecciones: [...], nota}` al carrito en vez de un string de nota.
  Usa las clases `dark:` existentes para respetar el tema activo.
- **Admin de Productos** (`frontend/src/pages/productos/...`): se agrega gestión de
  pasos por producto — lista ordenable de grupos de opciones asignados, checkbox
  obligatorio, selector de "disparado por" (opcional, eligiendo una opción de un paso
  anterior del mismo producto). Se agrega campo `precio_delta` al editar cada opción
  dentro de un grupo.
- **Tickets — rediseño** (`frontend/src/utils/ticketVenta.js`, `ticketCocina.js`): se
  rediseñan ambos, no solo se ajusta el contenido:
  - Encabezado nuevo con `logo.jpeg` como imagen (renderizada en blanco/negro/escala de
    grises para imprimirse bien en térmica 70mm), reemplazando el encabezado de texto
    actual.
  - Cada línea de producto deja de listar `nota` como texto plano y en su lugar itera
    `detalle.opciones` (nombre_grupo + nombre_opcion), mostrando **exactamente lo que el
    cliente pidió** paso a paso debajo del nombre del producto (ej. "Bubble Tea –
    Arandanitos / Leche / Frapeado / Con hierba buena / Perlas: Maracuyá"), tanto en el
    ticket de **cliente** (para que confirme su pedido) como en el de **cocina** (para
    que lo preparen correctamente) — esa es justamente la razón de ser de la estructura
    de pasos: que quede registrado y visible qué se seleccionó en cada paso.
  - `nota` (observación libre) se sigue mostrando aparte si existe.
  - El resto del formato monoespaciado 70mm (dos copias en el ticket de cliente, etc.)
    se mantiene, pero se ajusta el layout del encabezado/pie para acomodar el logo y
    quede visualmente coherente con la marca Bubbas Vibes.
- **Botón "Imprimir" manual**: se agrega en la pantalla de venta/pedido (donde hoy se
  llamaba automáticamente a `imprimirLocal`), que al presionarlo abre las dos ventanas de
  impresión (cliente y cocina) usando los builders rediseñados. Se quita la llamada
  automática post-cobro en `PedidoPage.jsx`.
- **Branding**: se reemplaza el logo actual por `logo.jpeg` en login/sidebar y en el
  encabezado de los tickets (el asset se copia a `frontend/src/assets/` o
  `frontend/public/` según cómo esté implementado hoy).

## Pago QR estático (reemplazo de CodePay)

- **Backend**: se elimina la integración CodePay (`backend/src/integrations/codepay/`,
  `backend/src/webhooks/codepay.webhook.routes.js`) y la tabla/modelo `pagos_qr`
  (`PagoQr`). El campo `pedidos.metodo_pago` mantiene los valores `efectivo`/`qr`, pero
  para `qr` ya no se crea ningún registro de transacción — el pedido pasa a
  `pendiente_pago` → `completado` mediante confirmación manual del cajero (no hay estado
  intermedio de "esperando webhook").
- Nueva entrada en `configuraciones` (clave `qr_pago_imagen`, valor = ruta del archivo
  subido) para guardar la imagen del QR estático. Se reutiliza el mecanismo de subida de
  archivos ya existente (`backend/src/middlewares/upload.js`, carpeta `backend/uploads`).
- **Frontend — Configuración**: se agrega un campo de subida/reemplazo de imagen ("QR de
  pago") en la pantalla de Configuración, que llama al mismo endpoint de configuraciones
  ya existente.
- **Frontend — POS/cobro**: al elegir método de pago QR, se muestra la imagen fija
  configurada (sin generar nada por pedido) junto a un botón **"Marcar como pagado"** que
  el cajero presiona tras verificar manualmente el pago (por su cuenta, fuera del
  sistema — notificación bancaria, comprobante, etc.). Ese botón dispara el mismo cierre
  de pedido que hoy hace el pago en efectivo, marcando `metodo_pago='qr'`.
- Variables de entorno `CODEPAY_*` y el cliente HTTP de CodePay se eliminan de
  `backend/.env.example`/`.env.production.example` y del código.

## Seed de catálogo

Script SQL (o seed Node reusando los modelos) que, tras la migración de esquema:
1. Limpia `categorias`, `productos`, `grupos_opciones`, `opciones`,
   `producto_grupos_opciones` (las tablas de catálogo, no usuarios/roles/sucursales).
2. Inserta las 6 categorías con sus imágenes de portada.
3. Inserta los grupos de opciones reutilizables (Sabor Bubble Tea, Base, Estilo, Hierba
   buena Sí/No, Sabor de perlas, Sabor Soda, Hierba/Menta, ¿Añadir perlas?, Sabor Frappe,
   Tamaño Bubble Tea, Tamaño Soda, Tamaño Frappe, Tamaño Latte) con sus opciones y
   `precio_delta` donde aplique.
4. Inserta los productos de cada categoría con precio base y sus pasos
   (`producto_grupos_opciones`) en el orden descrito arriba, incluyendo el
   `disparado_por_opcion_id` del paso condicional de Frappes.
5. Inserta Infusiones y Waffles como productos sin pasos, precio fijo.

## Fuera de alcance

- No se tocan mesas/áreas, caja, inventario, ni reportes más allá de que ahora lean
  `detalle_pedido_opciones` si necesitan detalle del pedido.
- No se implementa ninguna forma de verificación automática de pago QR (ni webhook, ni
  polling a un banco/billetera): la confirmación es 100% manual por el cajero.
- No se borra ni modifica el código del `print-agent` ni sus instaladores.
- No se define aún el precio real de Bubble Tea (queda placeholder, editable desde el
  panel de Productos).

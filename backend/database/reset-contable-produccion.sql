-- Reseteo de todo lo transaccional/contable a cero en producción.
-- NO toca: catálogo (productos, categorías, grupos de opciones), stock
-- actual (producto_stock_sucursal, productos.stock), usuarios, roles,
-- sucursales, cajas (los registros físicos), proveedores, clientes,
-- configuraciones, áreas, mesas (solo se les resetea el estado).
--
-- ¡HACER BACKUP ANTES DE CORRER ESTO! Es irreversible.
--   mysqldump -u <user> -p <db_name> > backup_antes_de_reset_$(date +%Y%m%d_%H%M).sql
--
-- Uso:
--   mysql -u <user> -p <db_name> < backend/database/reset-contable-produccion.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Ventas / pedidos
TRUNCATE TABLE detalle_pedidos;
TRUNCATE TABLE pagos_qr;
TRUNCATE TABLE pedidos;

-- Caja / contabilidad
TRUNCATE TABLE detalle_arqueo;
TRUNCATE TABLE gastos;
TRUNCATE TABLE libro_caja;
TRUNCATE TABLE sesiones_caja;

-- Compras a proveedores
TRUNCATE TABLE detalle_compras;
TRUNCATE TABLE compras;

-- Historial de movimientos de inventario (NO toca el stock actual)
TRUNCATE TABLE registros_inventario;

SET FOREIGN_KEY_CHECKS = 1;

-- Sin pedidos, ninguna mesa debería seguir marcada como ocupada/reservada.
UPDATE mesas SET estado = 'disponible' WHERE estado <> 'disponible';

-- Verificación: todo en 0 salvo mesas (que sigue teniendo sus filas, solo
-- resetea el estado) y todo lo que no se tocó (productos, stock, etc).
SELECT 'detalle_pedidos' t, COUNT(*) n FROM detalle_pedidos
UNION ALL SELECT 'pagos_qr', COUNT(*) FROM pagos_qr
UNION ALL SELECT 'pedidos', COUNT(*) FROM pedidos
UNION ALL SELECT 'detalle_arqueo', COUNT(*) FROM detalle_arqueo
UNION ALL SELECT 'gastos', COUNT(*) FROM gastos
UNION ALL SELECT 'libro_caja', COUNT(*) FROM libro_caja
UNION ALL SELECT 'sesiones_caja', COUNT(*) FROM sesiones_caja
UNION ALL SELECT 'detalle_compras', COUNT(*) FROM detalle_compras
UNION ALL SELECT 'compras', COUNT(*) FROM compras
UNION ALL SELECT 'registros_inventario', COUNT(*) FROM registros_inventario
UNION ALL SELECT 'mesas_no_disponibles', COUNT(*) FROM mesas WHERE estado <> 'disponible';

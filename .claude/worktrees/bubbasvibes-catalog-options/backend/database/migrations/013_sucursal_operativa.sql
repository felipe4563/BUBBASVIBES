ALTER TABLE areas
  ADD COLUMN sucursal_id INT UNSIGNED NOT NULL AFTER id,
  ADD FOREIGN KEY (sucursal_id) REFERENCES sucursales(id);

ALTER TABLE sesiones_caja
  ADD COLUMN sucursal_id INT UNSIGNED NOT NULL AFTER usuario_id,
  ADD FOREIGN KEY (sucursal_id) REFERENCES sucursales(id);

ALTER TABLE pedidos
  ADD COLUMN sucursal_id INT UNSIGNED NOT NULL AFTER id,
  ADD FOREIGN KEY (sucursal_id) REFERENCES sucursales(id);

ALTER TABLE compras
  ADD COLUMN sucursal_id INT UNSIGNED NOT NULL AFTER id,
  ADD FOREIGN KEY (sucursal_id) REFERENCES sucursales(id);

ALTER TABLE registros_inventario
  ADD COLUMN sucursal_id INT UNSIGNED NOT NULL AFTER producto_id,
  ADD FOREIGN KEY (sucursal_id) REFERENCES sucursales(id);

CREATE TABLE IF NOT EXISTS producto_stock_sucursal (
  producto_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (producto_id, sucursal_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

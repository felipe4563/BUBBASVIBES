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

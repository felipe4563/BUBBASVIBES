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

CREATE TABLE IF NOT EXISTS sesiones_caja (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  monto_apertura DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  monto_cierre DECIMAL(10,2),
  total_ventas DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_gastos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  diferencia DECIMAL(10,2),
  abierto_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cerrado_en TIMESTAMP,
  estado ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

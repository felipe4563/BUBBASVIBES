CREATE TABLE IF NOT EXISTS pagos_qr (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  sucursal_id INT UNSIGNED NOT NULL,
  order_id VARCHAR(25) NOT NULL UNIQUE,
  tx_id VARCHAR(100) NULL,
  estado ENUM('pendiente','completado','fallido','expirado','cancelado') NOT NULL DEFAULT 'pendiente',
  estado_previo VARCHAR(20) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'BOB',
  monto_neto DECIMAL(10,2) NOT NULL,
  comision DECIMAL(10,2) NULL,
  monto_total DECIMAL(10,2) NULL,
  qr_code MEDIUMTEXT NULL,
  expires_at DATETIME NOT NULL,
  datos_webhook JSON NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM('pendiente','listo','pendiente_pago','completado','cancelado') NOT NULL DEFAULT 'pendiente';

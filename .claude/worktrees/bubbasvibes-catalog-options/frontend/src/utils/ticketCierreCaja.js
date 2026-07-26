export function imprimirTicketCierreCaja(reporte, config = {}) {
  const nombre  = config.nombre_negocio ?? 'Restaurante';
  const simbolo = config.simbolo_moneda ?? 'Bs.';

  const { sesion, ventas_por_metodo = [], productos_vendidos = [], efectivo_esperado } = reporte;

  const apertura    = parseFloat(sesion.monto_apertura);
  const totalVentas = parseFloat(sesion.total_ventas);
  const totalGastos = parseFloat(sesion.total_gastos);
  const cierre      = parseFloat(sesion.monto_cierre ?? 0);
  const diferencia  = parseFloat(sesion.diferencia ?? 0);

  const totalEfectivo = ventas_por_metodo.find(v => v.metodo_pago === 'efectivo');
  const totalQR       = ventas_por_metodo.find(v => v.metodo_pago === 'qr');

  const fmtHora = (f) => f
    ? new Date(f).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const filas = productos_vendidos.map(p => `
    <tr class="fila-prod">
      <td class="col-prod"><span class="prod-nombre">${p.nombre}</span></td>
      <td class="col-cant">${p.total_cantidad}</td>
      <td class="col-sub">${parseFloat(p.total).toFixed(2)}</td>
    </tr>`).join('');

  const gastos = sesion.gastos ?? [];
  const filasGastos = gastos.map(g => `
    <tr class="fila-prod">
      <td class="col-gasto-desc"><span class="prod-nombre">${g.descripcion}</span></td>
      <td class="col-gasto-monto">${parseFloat(g.monto).toFixed(2)}</td>
    </tr>`).join('');

  const difColor = Math.abs(diferencia) < 0.01 ? '#16a34a' : diferencia > 0 ? '#2563eb' : '#dc2626';
  const difLabel = Math.abs(diferencia) < 0.01 ? 'CUADRADO' : diferencia > 0 ? `+${simbolo} ${diferencia.toFixed(2)}` : `${simbolo} ${diferencia.toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'IBM Plex Mono', 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.3;
      width: 248px;
      margin: 0 auto;
      padding: 4px 4px 16px;
      color: #000;
      background: #fff;
    }

    .header        { text-align: center; padding-bottom: 3px; }
    .header-nombre { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .header-sub    { font-size: 9px; color: #444; margin-top: 1px; }

    .sep   { border: none; border-top: 1px solid #000;  margin: 3px 0; }
    .sdash { border: none; border-top: 1px dashed #666; margin: 3px 0; }

    .titulo-bloque {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      padding: 3px 0;
      color: #333;
    }

    .info-row {
      display: flex; justify-content: space-between;
      font-size: 9.5px; padding: 1px 0;
    }
    .info-label { color: #555; }
    .info-valor { font-weight: 700; }

    .sec-title {
      font-size: 8px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase;
      color: #555; margin-bottom: 2px;
    }

    table { width: 100%; border-collapse: collapse; }

    thead th {
      font-size: 8px; letter-spacing: 1px;
      text-transform: uppercase; color: #666;
      padding: 2px 0; border-bottom: 1px solid #000;
    }

    .fila-prod td {
      padding: 2px 0; vertical-align: top;
      border-bottom: 1px dashed #bbb;
    }

    .col-prod  { width: 56%; }
    .col-cant  { width: 14%; text-align: center; font-weight: 700; font-size: 14px; }
    .col-sub   { width: 30%; text-align: right; font-weight: 700; font-size: 10px; }

    .col-gasto-desc  { width: 70%; }
    .col-gasto-monto { width: 30%; text-align: right; font-weight: 700; font-size: 10px; }

    .prod-nombre { font-weight: 700; font-size: 11px; line-height: 1.3; }

    .resumen-bloque { margin-top: 4px; }
    .resumen-row {
      display: flex; justify-content: space-between;
      padding: 1px 0; font-size: 9.5px;
    }
    .resumen-row.total-ventas {
      font-size: 13px; font-weight: 700;
      border-top: 2px solid #000;
      margin-top: 2px; padding-top: 3px;
    }

    .diferencia-box {
      text-align: center;
      padding: 4px;
      border: 2px solid;
      border-radius: 3px;
      margin-top: 4px;
      font-weight: 700;
      font-size: 13px;
    }

    .footer {
      margin-top: 8px; text-align: center;
      font-size: 8px; color: #888;
      letter-spacing: 2px; text-transform: uppercase;
    }

    @media print {
      @page { size: 70mm auto; margin: 2mm 3mm; }
      body  { width: 100%; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-nombre">${nombre}</div>
  </div>

  <hr class="sep"/>

  <div class="titulo-bloque">— Cierre de Caja —</div>

  <hr class="sep"/>

  <div style="margin: 2px 0 4px">
    <div class="info-row"><span class="info-label">Cajero</span><span class="info-valor">${sesion.usuario?.nombre ?? '—'}</span></div>
    <div class="info-row"><span class="info-label">Apertura</span><span class="info-valor">${fmtHora(sesion.abierto_en)}</span></div>
    <div class="info-row"><span class="info-label">Cierre</span><span class="info-valor">${fmtHora(sesion.cerrado_en)}</span></div>
  </div>

  <hr class="sep"/>

  <div class="sec-title">Productos vendidos</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th>Cant</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${filas.length ? filas : '<tr><td colspan="3" style="text-align:center;padding:4px;color:#888">Sin ventas</td></tr>'}</tbody>
  </table>

  ${gastos.length > 0 ? `
  <hr class="sep"/>
  <div class="sec-title">Gastos del turno</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Descripción</th>
        <th style="text-align:right">Monto</th>
      </tr>
    </thead>
    <tbody>${filasGastos}</tbody>
  </table>
  <div style="display:flex;justify-content:space-between;font-size:9.5px;font-weight:700;border-top:1px solid #000;margin-top:2px;padding-top:2px">
    <span>Total gastos</span>
    <span>${simbolo} ${totalGastos.toFixed(2)}</span>
  </div>` : ''}

  <div class="resumen-bloque">
    ${totalEfectivo ? `
    <div class="resumen-row">
      <span>Efectivo (${totalEfectivo.cantidad} órd.)</span>
      <span>${simbolo} ${parseFloat(totalEfectivo.total).toFixed(2)}</span>
    </div>` : ''}
    ${totalQR ? `
    <div class="resumen-row">
      <span>QR / Transf. (${totalQR.cantidad} órd.)</span>
      <span>${simbolo} ${parseFloat(totalQR.total).toFixed(2)}</span>
    </div>` : ''}
    <div class="resumen-row total-ventas">
      <span>TOTAL VENTAS</span>
      <span>${simbolo} ${totalVentas.toFixed(2)}</span>
    </div>
  </div>

  <hr class="sdash"/>

  <div style="margin: 2px 0">
    <div class="resumen-row">
      <span>Apertura</span>
      <span>${simbolo} ${apertura.toFixed(2)}</span>
    </div>
    <div class="resumen-row">
      <span>+ Efectivo ventas</span>
      <span>${simbolo} ${parseFloat(totalEfectivo?.total ?? 0).toFixed(2)}</span>
    </div>
    <div class="resumen-row">
      <span>- Gastos</span>
      <span>${simbolo} ${totalGastos.toFixed(2)}</span>
    </div>
    <div class="resumen-row" style="font-weight:700; border-top:1px solid #000; margin-top:2px; padding-top:2px">
      <span>Esperado en caja</span>
      <span>${simbolo} ${(efectivo_esperado ?? 0).toFixed(2)}</span>
    </div>
    <div class="resumen-row">
      <span>Contado físico</span>
      <span>${simbolo} ${cierre.toFixed(2)}</span>
    </div>
  </div>

  <div class="diferencia-box" style="color:${difColor}; border-color:${difColor}">
    ${Math.abs(diferencia) < 0.01 ? '✓ CUADRADO' : `DIFERENCIA: ${diferencia >= 0 ? '+' : ''}${simbolo} ${diferencia.toFixed(2)}`}
  </div>

  <hr class="sdash"/>
  <div class="footer">— resumen de turno —</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=700');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
}

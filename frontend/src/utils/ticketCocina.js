export function imprimirTicketCocina(pedido, config = {}) {
  const nombre  = config.nombre_negocio ?? 'COCINA';
  const dir     = config.direccion      ?? '';
  const tel     = config.telefono       ?? '';
  const simbolo = config.simbolo_moneda ?? 'Bs.';

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  const esLlevar = pedido.tipo === 'llevar';
  const nOrden   = String(esLlevar ? (pedido.numero_llevar ?? pedido.id) : pedido.id).padStart(3, '0');

  const detalles = pedido.detalles ?? [];
  const total    = detalles.reduce((s, d) => s + parseFloat(d.precio) * d.cantidad, 0);

  const filas = detalles.map(d => {
    const subtotal = (parseFloat(d.precio) * d.cantidad).toFixed(2);
    return `
    <tr class="fila-prod">
      <td class="col-prod">
        <span class="prod-nombre">${d.producto?.nombre ?? ''}</span>
        ${d.nota ? `<br><span class="prod-nota">» ${d.nota}</span>` : ''}
      </td>
      <td class="col-cant">${d.cantidad}</td>
      <td class="col-precio">${parseFloat(d.precio).toFixed(2)}</td>
      <td class="col-sub">${subtotal}</td>
    </tr>`;
  }).join('');

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

    /* ── Header ── */
    .header        { text-align: center; padding-bottom: 3px; }
    .header-nombre { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .header-sub    { font-size: 9px; color: #444; margin-top: 1px; }

    /* ── Separadores ── */
    .sep  { border: none; border-top: 1px solid #000;    margin: 3px 0; }
    .sdash{ border: none; border-top: 1px dashed #666;   margin: 3px 0; }
    .sdouble { border-top: 3px double #000; margin: 4px 0; }

    /* ── Badge tipo de orden ── */
    .badge {
      text-align: center;
      text-transform: uppercase;
      padding: 3px 0;
      margin: 3px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .badge-tipo {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #555;
    }
    .badge-numero {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.2;
    }
    .badge.llevar {
      border-style: dashed;
    }
    .badge.llevar .badge-tipo { color: #333; }

    /* ── Info orden ── */
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      padding: 1px 0;
    }
    .info-label { color: #555; }
    .info-valor { font-weight: 700; }

    /* ── Tabla productos ── */
    .sec-title {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 2px;
    }

    table { width: 100%; border-collapse: collapse; }

    thead th {
      font-size: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #666;
      padding: 2px 0;
      border-bottom: 1px solid #000;
    }

    .fila-prod td {
      padding: 3px 0;
      vertical-align: top;
      border-bottom: 1px dashed #bbb;
    }

    .col-prod  { width: 44%; }
    .col-cant  { width: 10%; text-align: center; font-weight: 700; font-size: 16px; }
    .col-precio{ width: 22%; text-align: right; font-size: 9.5px; color: #444; }
    .col-sub   { width: 24%; text-align: right; font-weight: 700; }

    .prod-nombre { font-weight: 700; font-size: 13px; line-height: 1.3; }
    .prod-nota   { font-size: 8.5px; font-style: italic; color: #444; }

    /* ── Total ── */
    .total-bloque { margin-top: 3px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 1px 0;
      font-size: 10px;
    }
    .total-row.principal {
      font-size: 13px;
      font-weight: 700;
      margin-top: 2px;
      padding-top: 3px;
      border-top: 2px solid #000;
    }

    /* ── Nota general ── */
    .nota-general {
      padding: 3px 5px;
      border: 1px dashed #000;
      font-size: 10px;
      margin: 3px 0;
    }
    .nota-general-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 1px;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 6px;
      text-align: center;
      font-size: 8px;
      color: #999;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    @media print {
      @page { size: 70mm auto; margin: 2mm 3mm; }
      body  { width: 100%; padding: 0; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-nombre">★ ${nombre} ★</div>
    ${dir ? `<div class="header-sub">${dir}</div>` : ''}
    ${tel ? `<div class="header-sub">Tel: ${tel}</div>` : ''}
  </div>

  <hr class="sep"/>

  <!-- Tipo de orden -->
  <div class="badge ${esLlevar ? 'llevar' : ''}">
    ${esLlevar
      ? `<div class="badge-tipo">— Para Llevar —</div>
         <div class="badge-numero"># ${nOrden}</div>`
      : `<div class="badge-tipo">— Orden de Mesa —</div>
         <div class="badge-numero">${pedido.mesa?.nombre ?? '—'} &nbsp;·&nbsp; # ${nOrden}</div>`}
  </div>

  <!-- Info -->
  <div style="margin: 2px 0 4px">
    ${esLlevar
      ? `<div class="info-row"><span class="info-label">Cliente</span><span class="info-valor">${pedido.nombre_cliente ?? '—'}</span></div>`
      : ''}
    <div class="info-row"><span class="info-label">Fecha</span><span class="info-valor">${fecha}</span></div>
    <div class="info-row"><span class="info-label">Hora</span> <span class="info-valor">${hora}</span></div>
  </div>

  <hr class="sep"/>

  <!-- Productos -->
  <div class="sec-title">Detalle de productos</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th>Cant</th>
        <th style="text-align:right">P.Unit</th>
        <th style="text-align:right">Sub</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <!-- Total -->
  <div class="total-bloque">
    <div class="total-row principal">
      <span>TOTAL</span>
      <span>${simbolo} ${total.toFixed(2)}</span>
    </div>
  </div>

  ${pedido.notas ? `
  <hr class="sdash"/>
  <div class="nota-general">
    <div class="nota-general-label">Nota general</div>
    ${pedido.notas}
  </div>` : ''}

  <hr class="sdash"/>
  <div class="footer">— ticket de cocina —</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=650');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
}

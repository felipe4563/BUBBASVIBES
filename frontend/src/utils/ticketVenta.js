export function imprimirTicketVenta(pedido, pago, config = {}) {
  const nombre  = config.nombre_negocio  ?? 'Restaurante';
  const dir     = config.direccion       ?? '';
  const tel     = config.telefono        ?? '';
  const simbolo = config.simbolo_moneda  ?? 'Bs.';

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  const esLlevar = pedido.tipo === 'llevar';
  const nOrden   = String(esLlevar ? (pedido.numero_llevar ?? pedido.id) : pedido.id).padStart(3, '0');

  const detalles = pedido.detalles ?? [];
  const total    = pago.total ?? detalles.reduce((s, d) => s + parseFloat(d.precio) * d.cantidad, 0);

  const filas = detalles.map(d => {
    const subtotal = (parseFloat(d.precio) * d.cantidad).toFixed(2);
    return `
    <tr class="fila-prod">
      <td class="col-prod"><span class="prod-nombre">${d.producto?.nombre ?? ''}</span></td>
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

    .header        { text-align: center; padding-bottom: 3px; }
    .header-nombre { font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .header-sub    { font-size: 9px; color: #444; margin-top: 1px; }

    .sep    { border: none; border-top: 1px solid #000;  margin: 3px 0; }
    .sdash  { border: none; border-top: 1px dashed #666; margin: 3px 0; }

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
    .badge.llevar { border-style: dashed; }
    .badge.llevar .badge-tipo { color: #333; }

    .info-row {
      display: flex; justify-content: space-between;
      font-size: 10px; padding: 1px 0;
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
      padding: 3px 0; vertical-align: top;
      border-bottom: 1px dashed #bbb;
    }

    .col-prod  { width: 46%; }
    .col-cant  { width: 10%; text-align: center; font-weight: 700; font-size: 16px; }
    .col-precio{ width: 20%; text-align: right; font-size: 9.5px; color: #444; }
    .col-sub   { width: 24%; text-align: right; font-weight: 700; }

    .prod-nombre { font-weight: 700; font-size: 14px; line-height: 1.3; }

    .total-bloque { margin-top: 3px; }
    .total-row {
      display: flex; justify-content: space-between;
      padding: 1px 0; font-size: 10px;
    }
    .total-row.principal {
      font-size: 14px; font-weight: 700;
      margin-top: 2px; padding-top: 3px;
      border-top: 2px solid #000;
    }

    .footer {
      margin-top: 8px; text-align: center;
      font-size: 9px; color: #555;
      letter-spacing: 1px;
    }
    .footer-gracias {
      font-size: 10px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase;
      margin-bottom: 2px;
    }

    .copia { page-break-after: always; }

    @media print {
      @page { size: 70mm auto; margin: 2mm 3mm; }
      body  { width: 100%; padding: 0; }
    }
  </style>
</head>
<body>

${['', ''].map((_, i) => `
  <div class="${i === 0 ? 'copia' : ''}">

  <div class="header">
    <div class="header-nombre">${nombre}</div>
    ${dir ? `<div class="header-sub">${dir}</div>` : ''}
    ${tel ? `<div class="header-sub">Tel: ${tel}</div>` : ''}
  </div>

  <hr class="sep"/>

  <div class="badge ${esLlevar ? 'llevar' : ''}">
    ${esLlevar
      ? `<div class="badge-tipo">— Para Llevar —</div>
         <div class="badge-numero">${pedido.nombre_cliente ?? '—'} &nbsp;·&nbsp; # ${nOrden}</div>`
      : `<div class="badge-tipo">— Orden de Mesa —</div>
         <div class="badge-numero">${pedido.mesa?.nombre ?? '—'} &nbsp;·&nbsp; # ${nOrden}</div>`}
  </div>

  <div style="margin: 2px 0 4px">
    <div class="info-row"><span class="info-label">Fecha</span><span class="info-valor">${fecha}</span></div>
    <div class="info-row"><span class="info-label">Hora</span> <span class="info-valor">${hora}</span></div>
  </div>

  <hr class="sep"/>

  <div class="sec-title">Detalle</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th>Cnt</th>
        <th style="text-align:right">P.U</th>
        <th style="text-align:right">Sub</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="total-bloque">
    <div class="total-row principal">
      <span>TOTAL</span>
      <span>${simbolo} ${parseFloat(total).toFixed(2)}</span>
    </div>
  </div>

  <hr class="sdash"/>

  <div class="footer">
    <div class="footer-gracias">¡Gracias por su visita!</div>
    <div>${nombre}</div>
  </div>

  </div>
`).join('')}

</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=680');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
}

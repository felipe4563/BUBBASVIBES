import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Carga el logo (cualquier formato soportado por <img>: jpg/png/webp) y lo
// normaliza a PNG vía canvas, para que jsPDF pueda insertarlo sin problemas
// de formato. Si falla (sin logo, CORS, red), se resuelve null y el PDF se
// arma igual, solo sin membrete gráfico.
function cargarLogo(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * @param {object} opts
 * @param {string}   opts.titulo        - Nombre del reporte
 * @param {string}  [opts.subtitulo]    - Período u otro subtexto
 * @param {string[]} opts.columnas      - Cabeceras de la tabla
 * @param {any[][]}  opts.filas         - Filas de datos
 * @param {{label:string,valor:string|number}[]} [opts.totales] - Tarjetas resumen
 * @param {string}  [opts.nombreArchivo]
 * @param {string}  [opts.empresa]      - Nombre del negocio (de config)
 * @param {string}  [opts.logo]         - URL absoluta del logo (de config)
 * @param {string}  [opts.direccion]    - Dirección del negocio (de config)
 * @param {string}  [opts.telefono]     - Teléfono del negocio (de config)
 * @param {string}  [opts.generadoPor]  - Nombre del usuario que genera el PDF
 */
export async function exportarPDF({
  titulo, subtitulo, columnas, filas, totales, nombreArchivo,
  empresa, logo, direccion, telefono, generadoPor,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const M = 14; // margen
  const nombreEmpresa = (empresa || 'RESTAURANTE').toUpperCase();
  const ahora = new Date().toLocaleString('es-BO');

  const GRIS_OSCURO = [55, 55, 60];
  const GRIS_TEXTO  = [90, 90, 95];
  const GRIS_CLARO  = [235, 235, 238];
  const GRIS_LINEA  = [200, 200, 205];
  const ACENTO      = [90, 60, 160];

  const logoInfo = await cargarLogo(logo);

  // ── Membrete ──────────────────────────────────────────────────────────
  let xTexto = M;
  if (logoInfo) {
    const altoLogo = 16;
    const anchoLogo = altoLogo * (logoInfo.w / logoInfo.h);
    doc.addImage(logoInfo.dataUrl, 'PNG', M, 8, anchoLogo, altoLogo);
    xTexto = M + anchoLogo + 5;
  }

  doc.setTextColor(...GRIS_OSCURO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(nombreEmpresa, xTexto, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS_TEXTO);
  const lineaContacto = [direccion, telefono ? `Tel. ${telefono}` : null].filter(Boolean).join('   ·   ');
  if (lineaContacto) doc.text(lineaContacto, xTexto, 19);

  // Metadatos (derecha)
  doc.setFontSize(8);
  doc.text(`Generado: ${ahora}`, W - M, 11, { align: 'right' });
  if (generadoPor) doc.text(`Por: ${generadoPor}`, W - M, 16, { align: 'right' });

  doc.setDrawColor(...ACENTO);
  doc.setLineWidth(0.8);
  doc.line(M, 26, W - M, 26);

  // ── Título del reporte ────────────────────────────────────────────────
  doc.setTextColor(...GRIS_OSCURO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titulo, M, 35);

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(subtitulo, M, 41);
  }

  let y = subtitulo ? 48 : 43;

  // ── Tarjetas resumen ───────────────────────────────────────────────────
  if (totales && totales.length > 0) {
    const gap = 4;
    const colW = (W - 2 * M - gap * (totales.length - 1)) / totales.length;
    const altoTarjeta = 16;
    totales.forEach((item, i) => {
      const x = M + i * (colW + gap);
      doc.setDrawColor(...GRIS_LINEA);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, colW, altoTarjeta, 1.5, 1.5, 'S');
      doc.setFillColor(...ACENTO);
      doc.roundedRect(x, y, 1.5, altoTarjeta, 1.5, 1.5, 'F');
      doc.setTextColor(...GRIS_TEXTO);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, x + 5, y + 6.5);
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRIS_OSCURO);
      doc.text(String(item.valor), x + 5, y + 13);
    });
    y += altoTarjeta + 8;
  }

  // ── Tabla ───────────────────────────────────────────────────────────────
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: y,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: GRIS_OSCURO, lineColor: GRIS_LINEA, lineWidth: 0.15 },
    headStyles: { fillColor: GRIS_OSCURO, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    margin: { left: M, right: M },
  });

  // ── Pie de página ─────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRIS_LINEA);
    doc.setLineWidth(0.2);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS_TEXTO);
    doc.setFont('helvetica', 'normal');
    doc.text(nombreEmpresa, M, H - 7);
    doc.text('Documento generado por el sistema', W / 2, H - 7, { align: 'center' });
    doc.text(`Página ${i} de ${pages}`, W - M, H - 7, { align: 'right' });
  }

  doc.save(nombreArchivo || 'reporte.pdf');
}

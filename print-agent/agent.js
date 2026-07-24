const { io }           = require('socket.io-client');
const { execFileSync } = require('child_process');
const { writeFileSync, unlinkSync, readFileSync, existsSync } = require('fs');
const path             = require('path');
const os               = require('os');

// En producción (pkg) lee config junto al .exe; en dev, junto al script
const CONFIG_DIR = process.pkg
  ? path.dirname(process.execPath)
  : path.join(path.dirname(process.argv[1]));

// ── Instancia única: evita que corran dos agentes al mismo tiempo ─────────────
const LOCK_FILE = path.join(CONFIG_DIR, 'agente.lock');

function yaCorriendо() {
  if (!existsSync(LOCK_FILE)) return false;
  try {
    const pid = parseInt(readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (isNaN(pid)) return false;
    // En Windows, tasklist devuelve la línea solo si el proceso existe
    execFileSync('tasklist', ['/FI', 'PID eq ' + pid, '/NH'], { stdio: 'pipe' });
    const out = require('child_process').execSync('tasklist /FI "PID eq ' + pid + '" /NH', { encoding: 'utf8' });
    return out.includes(String(pid));
  } catch { return false; }
}

if (yaCorriendо()) {
  console.error('Ya hay un agente corriendo. Saliendo para evitar duplicados.');
  process.exit(0);
}

writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
process.on('exit',    function() { try { unlinkSync(LOCK_FILE); } catch {} });
process.on('SIGINT',  function() { process.exit(0); });
process.on('SIGTERM', function() { process.exit(0); });

// ─────────────────────────────────────────────────────────────────────────────

let config;
try {
  config = JSON.parse(readFileSync(path.join(CONFIG_DIR, 'config.json'), 'utf8'));
} catch {
  console.error('ERROR: No se encontró config.json en', CONFIG_DIR);
  console.error('Corre el instalador primero (sin --service).');
  process.exit(1);
}

console.log('=== Agente de impresión térmica ===');
console.log(`Servidor : ${config.servidor}`);
console.log(`Caja     : ${config.impresora_caja}`);
console.log(`Cocina   : ${config.impresora_cocina}`);
console.log('===================================');

const socket = io(config.servidor, {
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionAttempts: Infinity,
});

socket.on('connect', () => {
  console.log(`[${ts()}] ✓ Conectado (id: ${socket.id})`);
  if (config.sucursal_id) {
    socket.emit('unirse_sucursal', config.sucursal_id);
    console.log(`[${ts()}] → Unido a la sala de la sucursal ${config.sucursal_id}`);
  } else {
    console.log(`[${ts()}] ⚠ config.json no tiene sucursal_id — este agente NO recibirá ningún evento de impresión hasta que se configure`);
  }
});
socket.on('disconnect',    () => console.log(`[${ts()}] ✗ Desconectado — reintentando...`));
socket.on('connect_error', (e) => console.log(`[${ts()}] ✗ Error: ${e.message}`));

socket.on('print:caja', function(datos) {
  var pid = datos.pedido ? datos.pedido.id : '?';
  console.log('[' + ts() + '] >> print:caja  Pedido #' + pid);
  try {
    printRaw(config.impresora_caja, buildCaja(datos));
    console.log('[' + ts() + '] OK Caja impreso');
  } catch (err) {
    console.error('[' + ts() + '] ERROR caja: ' + err.message);
  }
});

socket.on('print:cocina', function(datos) {
  var pid = datos.pedido ? datos.pedido.id : '?';
  console.log('[' + ts() + '] >> print:cocina Pedido #' + pid);
  try {
    printRaw(config.impresora_cocina, buildCocina(datos));
    console.log('[' + ts() + '] OK Cocina impreso');
  } catch (err) {
    console.error('[' + ts() + '] ERROR cocina: ' + err.message);
  }
});

// ── ESC/POS ──────────────────────────────────────────────────────────────────

const COLS = 48;

const CP850 = {
  'á':0xA0,'é':0x82,'í':0xA1,'ó':0xA2,'ú':0xA3,
  'Á':0xB5,'É':0x90,'Í':0xD6,'Ó':0xE0,'Ú':0xE9,
  'ñ':0xA4,'Ñ':0xA5,'ü':0x81,'Ü':0x9A,
  '¡':0xAD,'¿':0xA8,'°':0xF8,'·':0xFA,
  '★':0x2A,'—':0x2D,
};

class Esc {
  constructor() { this.b = []; }
  raw(bytes)  { this.b.push(...bytes); return this; }
  init()      { return this.raw([0x1B, 0x40]); }
  charset()   { return this.raw([0x1B, 0x74, 0x02]); }
  cut()       { return this.raw([0x1D, 0x56, 0x41, 0x05]); }
  lf(n = 1)  { for (let i = 0; i < n; i++) this.b.push(0x0A); return this; }
  left()      { return this.raw([0x1B, 0x61, 0x00]); }
  center()    { return this.raw([0x1B, 0x61, 0x01]); }
  right()     { return this.raw([0x1B, 0x61, 0x02]); }
  bold(on)    { return this.raw([0x1B, 0x45, on ? 1 : 0]); }
  normal()    { return this.raw([0x1D, 0x21, 0x00]); }
  dbl()       { return this.raw([0x1D, 0x21, 0x11]); }
  dblH()      { return this.raw([0x1D, 0x21, 0x01]); }
  dblW()      { return this.raw([0x1D, 0x21, 0x10]); }
  text(s) {
    var str = String(s != null ? s : '');
    for (var ci = 0; ci < str.length; ci++) {
      var ch   = str[ci];
      var code = ch.charCodeAt(0);
      this.b.push(CP850[ch] != null ? CP850[ch] : (code < 128 ? code : 0x3F));
    }
    return this;
  }
  line(s)  { return this.text(s != null ? s : '').lf(); }
  rule(c)  { var ch = c || '-'; return this.line(ch.repeat(COLS)); }
  cols(left, right) {
    var r  = String(right != null ? right : '');
    var l  = String(left  != null ? left  : '');
    const lw = COLS - r.length;
    const lp = l.length > lw ? l.substring(0, lw - 1) + '.' : l.padEnd(lw);
    return this.line(lp + r);
  }
  build() { return Buffer.from(this.b); }
}

function buildCaja(data) {
  var pedido      = data.pedido;
  var metodo_pago = data.metodo_pago;
  var cfg         = data.config || {};
  var esLlevar    = pedido.tipo === 'llevar';
  var nLevar      = pedido.numero_llevar != null ? pedido.numero_llevar : pedido.id;
  var nOrden      = String(data.numero_orden_diario != null ? data.numero_orden_diario : (esLlevar ? nLevar : pedido.id)).padStart(3, '0');
  var ahora       = new Date();
  var fecha       = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  var hora        = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  var sym         = cfg.simbolo_moneda || 'Bs.';
  var nombre      = cfg.nombre_negocio || 'RESTAURANTE';
  var total       = parseFloat(pedido.total);

  var t = new Esc();
  t.init().charset();

  // ── Encabezado ────────────────────────────────────────────────────────────
  t.rule('=');
  t.center().bold(true).line(nombre.toUpperCase()).bold(false);
  var direccionTel = [cfg.direccion, cfg.telefono ? 'Tel: ' + cfg.telefono : null].filter(Boolean).join(' - ');
  if (direccionTel) t.center().line(direccionTel);
  t.rule('=');

  // ── Tipo de comprobante + N° de orden ────────────────────────────────────
  t.left().bold(true).cols('NOTA DE VENTA', 'Nro. ' + nOrden).bold(false);
  t.rule('-');

  // ── Fecha / Hora / Mesa /Llevar ──────────────────────────────────────────
  t.left().cols('Fecha: ' + fecha, hora);
  if (esLlevar) {
    t.left().line('PARA LLEVAR — ' + (pedido.nombre_cliente || 'Cliente'));
  } else {
    var mesaNombre = (pedido.mesa && pedido.mesa.nombre) ? pedido.mesa.nombre : '---';
    t.left().line(mesaNombre.toUpperCase());
  }
  t.rule('-');

  // ── Items ─────────────────────────────────────────────────────────────────
  t.left().line('Cant  Descripcion                      Importe');
  t.rule('-');
  var detalles = pedido.detalles || [];
  for (var i = 0; i < detalles.length; i++) {
    var d    = detalles[i];
    var prod = String((d.producto && d.producto.nombre) ? d.producto.nombre : '').toUpperCase();
    var qty  = d.cantidad;
    var pu   = parseFloat(d.precio).toFixed(2);
    var sub  = (parseFloat(d.precio) * qty).toFixed(2);
    t.left().cols('  ' + qty + '   ' + prod, sub);
    if (qty > 1) t.left().line('        (' + sym + ' ' + pu + ' c/u)');
    if (d.nota) t.left().bold(true).line('      >> ' + d.nota).bold(false);
  }
  t.rule('-');

  // ── Total ─────────────────────────────────────────────────────────────────
  t.left().bold(true).cols('TOTAL ' + sym, total.toFixed(2)).bold(false);
  t.rule('=');

  // ── Método de pago ────────────────────────────────────────────────────────
  t.left().line('Forma de pago: ' + (metodo_pago === 'efectivo' ? 'Efectivo' : 'QR / Transferencia'));
  t.rule('-');

  // ── Pie ───────────────────────────────────────────────────────────────────
  t.lf(1).center().line('Gracias por su preferencia').center().line(nombre).lf(3).cut();
  return t.build();
}

function buildCocina(data) {
  var pedido   = data.pedido;
  var cfg      = data.config || {};
  var t        = new Esc();
  var esLlevar = pedido.tipo === 'llevar';
  var nLevar   = pedido.numero_llevar != null ? pedido.numero_llevar : pedido.id;
  var nOrden   = String(data.numero_orden_diario != null ? data.numero_orden_diario : (esLlevar ? nLevar : pedido.id)).padStart(3, '0');
  var ahora    = new Date();
  var hora     = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  var sym      = cfg.simbolo_moneda || 'Bs.';

  t.init().charset();

  // ── Encabezado cocina (visualmente diferente a caja: usa # y dblW) ────────
  t.rule('#');
  t.center().bold(true).dblW().line('COCINA').normal().bold(false);
  t.rule('#');

  // ── Tipo de orden + identificación ────────────────────────────────────────
  if (esLlevar) {
    t.center().dbl().bold(true).line('PARA LLEVAR').normal().bold(false);
    t.center().dbl().bold(true).line('# ' + nOrden).normal().bold(false);
  } else {
    var mesaNombre2 = (pedido.mesa && pedido.mesa.nombre) ? pedido.mesa.nombre : '---';
    t.center().dbl().bold(true).line(mesaNombre2.toUpperCase()).normal().bold(false);
    t.center().dbl().bold(true).line('# ' + nOrden).normal().bold(false);
  }
  t.rule('#');

  // ── Info ──────────────────────────────────────────────────────────────────
  if (esLlevar) t.left().bold(true).dblH().line('Cliente: ' + (pedido.nombre_cliente || '-')).normal().bold(false);
  t.left().line('Hora: ' + hora);
  t.rule('#');

  // ── Items ─────────────────────────────────────────────────────────────────
  var detalles2 = pedido.detalles || [];
  for (var j = 0; j < detalles2.length; j++) {
    var d2    = detalles2[j];
    var prod2 = String((d2.producto && d2.producto.nombre) ? d2.producto.nombre : '').toUpperCase();
    var qty2  = d2.cantidad;
    var pu2   = parseFloat(d2.precio).toFixed(2);
    var sub2  = (parseFloat(d2.precio) * qty2).toFixed(2);
    t.left().dbl().bold(true).line(qty2 + '  ' + prod2).normal().bold(false);
    t.left().line('     ' + sym + ' ' + pu2 + ' c/u       Sub: ' + sym + ' ' + sub2);
    if (d2.nota) t.left().bold(true).dblH().line(' >> ' + d2.nota).normal().bold(false);
    t.rule('-');
  }
  t.rule('#');

  // ── Notas del pedido (grande y visible) ───────────────────────────────────
  if (pedido.notas) {
    t.center().bold(true).line('!! NOTA ESPECIAL !!').bold(false);
    t.left().bold(true).dblH().line(pedido.notas).normal().bold(false);
    t.rule('#');
  }

  t.center().line('-- ticket de cocina --').lf(3).cut();
  return t.build();
}

// ── Impresión raw via PowerShell Win32 ───────────────────────────────────────

const PS_RAWPRINT = `Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv",EntryPoint="OpenPrinterA",SetLastError=true,CharSet=CharSet.Ansi,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter,out IntPtr hPrinter,IntPtr pd);
    [DllImport("winspool.Drv",EntryPoint="ClosePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv",EntryPoint="StartDocPrinterA",SetLastError=true,CharSet=CharSet.Ansi,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter,Int32 level,[In,MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv",EntryPoint="EndDocPrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv",EntryPoint="StartPagePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv",EntryPoint="EndPagePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv",EntryPoint="WritePrinter",SetLastError=true,ExactSpelling=true,CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter,IntPtr pBytes,Int32 dwCount,out Int32 dwWritten);
    public static bool Send(string name, byte[] bytes) {
        IntPtr hPrinter; int written;
        IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pBytes, bytes.Length);
        bool ok = false;
        if (OpenPrinter(name, out hPrinter, IntPtr.Zero)) {
            DOCINFOA di = new DOCINFOA();
            di.pDocName  = "ESCPOS";
            di.pDataType = "RAW";
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    ok = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pBytes);
        return ok;
    }
}
'@
`;

function printRaw(printerName, buffer) {
  const id     = Date.now();
  const tmpBin = path.join(os.tmpdir(), `ticket_${id}.bin`);
  const tmpPs  = path.join(os.tmpdir(), `print_${id}.ps1`);

  writeFileSync(tmpBin, buffer);

  const ps1 = PS_RAWPRINT +
    `$bytes = [System.IO.File]::ReadAllBytes("${tmpBin.replace(/\\/g, '\\\\')}")\n` +
    `$ok    = [RawPrint]::Send("${printerName}", $bytes)\n` +
    `if (-not $ok) { Write-Error "Impresora no respondio: ${printerName}"; exit 1 }\n`;

  writeFileSync(tmpPs, ps1, { encoding: 'utf8' });

  try {
    execFileSync('powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPs],
      { timeout: 15000 });
  } finally {
    try { unlinkSync(tmpBin); } catch {}
    try { unlinkSync(tmpPs);  } catch {}
  }
}

function ts() {
  return new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

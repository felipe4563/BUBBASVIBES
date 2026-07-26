// Generador de comandos ESC/POS crudos para impresoras térmicas por Bluetooth
// clásico (perfil SPP), que la Web Bluetooth API no puede controlar (solo
// soporta BLE/GATT). Se usa junto a RawBT (rawbt://), que mantiene el enlace
// SPP con la impresora y evita el diálogo de impresión del sistema en Android.

const ESC = 0x1B;
const GS  = 0x1D;

// Tabla CP858 (Latin-1 + euro) para los acentos y símbolos que aparecen en
// los tickets. ESC t 19 selecciona esta página de códigos en la impresora
// antes de mandar el texto, así los bytes >127 se interpretan igual.
const CP858 = {
  'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
  'Á': 0xB5, 'É': 0x90, 'Í': 0xD6, 'Ó': 0xE0, 'Ú': 0xE9,
  'ñ': 0xA4, 'Ñ': 0xA5,
  'ü': 0x81, 'Ü': 0x9A,
  '¿': 0xA8, '¡': 0xAD,
  '°': 0xF8, '€': 0xD5, '·': 0xFA,
};

function codificarCp858(texto) {
  const bytes = [];
  for (const ch of String(texto)) {
    const code = ch.codePointAt(0);
    bytes.push(code < 128 ? code : (CP858[ch] ?? 0x3F));
  }
  return bytes;
}

export class ComandosEscPos {
  constructor() { this.bytes = []; }

  push(...b) { this.bytes.push(...b); return this; }
  texto(str) { return this.push(...codificarCp858(str)); }
  linea(str = '') { return this.texto(str).push(0x0A); }

  init() { return this.push(ESC, 0x40, ESC, 0x74, 19); }
  alinear(n) { return this.push(ESC, 0x61, n); } // 0 izquierda, 1 centro, 2 derecha
  negrita(on) { return this.push(ESC, 0x45, on ? 1 : 0); }
  tamano(anchoX2, altoX2) {
    const n = (anchoX2 ? 0x10 : 0) | (altoX2 ? 0x01 : 0);
    return this.push(GS, 0x21, n);
  }
  feed(n = 1) { return this.push(ESC, 0x64, n); }
  cortar() { return this.push(GS, 0x56, 0x42, 0x00); } // corte parcial con avance

  toBase64() {
    let binary = '';
    for (const b of this.bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
}

export function esAndroid() {
  return /Android/i.test(navigator.userAgent);
}

// Abre RawBT con los bytes ya en base64: RawBT imprime directo a la
// impresora emparejada, sin ningún diálogo del sistema.
export function imprimirConRawBT(comandos) {
  window.location.href = `rawbt:base64,${comandos.toBase64()}`;
}

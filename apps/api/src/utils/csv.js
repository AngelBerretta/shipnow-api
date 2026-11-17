// Separador ";" y BOM: es lo que Excel en español (es-AR) abre bien con doble clic.
const SEPARATOR = ';';

function cell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Anti inyección de fórmulas (Excel/Sheets): un texto que empieza con = + - @ se neutraliza.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** `columns` = [[encabezado, clave], ...]; `rows` = objetos planos. */
export function toCsv(columns, rows) {
  const lines = [
    columns.map(([header]) => cell(header)).join(SEPARATOR),
    ...rows.map((row) => columns.map(([, key]) => cell(row[key])).join(SEPARATOR)),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
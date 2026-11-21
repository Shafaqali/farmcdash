/** Embed a high-resolution QR label as a JPEG in a single-page PDF. */
export function qrPdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  const encode = (value: string) => new TextEncoder().encode(value);
  const parts: Uint8Array[] = [];
  let length = 0;
  const offsets = [0];
  const append = (bytes: Uint8Array) => { parts.push(bytes); length += bytes.length; };
  const object = (id: number, value: string) => { offsets[id] = length; append(encode(`${id} 0 obj\n${value}\nendobj\n`)); };
  append(encode("%PDF-1.4\n"));
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  const pageWidth = 360, pageHeight = pageWidth * height / width;
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Label 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  append(encode(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`));
  append(jpeg); append(encode("\nendstream\nendobj\n"));
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Label Do\nQ\n`;
  object(5, `<< /Length ${encode(content).length} >>\nstream\n${content}endstream`);
  const xref = length;
  append(encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  const result = new Uint8Array(length);
  let position = 0;
  for (const bytes of parts) { result.set(bytes, position); position += bytes.length; }
  return result;
}

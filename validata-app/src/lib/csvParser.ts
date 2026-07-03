export function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let row: string[] = [''];
  lines.push(row);
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      row = [''];
      lines.push(row);
    } else {
      row[row.length - 1] += c;
    }
  }
  const parsed = lines.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (parsed.length <= 1) return [];
  const headers = parsed[0].map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  return parsed.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ? r[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    return obj;
  });
}

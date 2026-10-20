import * as XLSX from "xlsx";

const money = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9,-]/g, "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

function monthHeader(value: unknown): { month: number; year?: number } | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return { month: value.getUTCMonth() + 1, year: value.getUTCFullYear() };
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 2000 && value <= 2100) return null;
    const date = XLSX.SSF.parse_date_code(value);
    return date?.y && date.m ? { month: date.m, year: date.y } : null;
  }
  const raw = String(value ?? "").trim().toLowerCase();
  if (/total|jumlah|tahunan|yearly|annual/.test(raw)) return null;
  const match = raw.match(/\b(jan(?:uari|uary)?|feb(?:ruari|ruary)?|mar(?:et|ch)?|apr(?:il)?|mei|may|jun(?:i|e)?|jul(?:i|y)?|agu(?:stus)?|ags|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|des(?:ember)?|dec(?:ember)?)\b/i);
  if (!match) return null;
  const prefix = match[1].slice(0, 3);
  const month = ({ jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, ags: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 } as Record<string, number>)[prefix];
  const year = raw.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const shortYear = raw.match(/(?:^|\D)(\d{2})(?:\D|$)/)?.[1];
  return { month, year: year ? Number(year) : shortYear ? 2000 + Number(shortYear) : undefined };
}

export function forecastFromWorkbook(book: XLSX.WorkBook, now = new Date()) {
  const sheetName = book.SheetNames.find(name => name.toUpperCase().replace(/[^A-Z0-9]/g, "") === "FORECASTWIP");
  const sheet = sheetName ? book.Sheets[sheetName] : undefined;
  if (!sheet?.["!ref"]) return [];
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric", month: "numeric" }).formatToParts(now);
  const currentYear = Number(parts.find(part => part.type === "year")?.value);
  const currentMonth = Number(parts.find(part => part.type === "month")?.value);
  const start = currentYear * 12 + currentMonth - 1;
  const cell = (row: number, column: number) => sheet[XLSX.utils.encode_cell({ r: row - 1, c: column })]?.v;
  const columns: Array<{ column: number; month: number; year?: number }> = [];
  const lastColumn = XLSX.utils.decode_range(sheet["!ref"]).e.c;
  for (let column = 2; column <= lastColumn; column++) {
    const first = cell(1, column), second = cell(2, column);
    if ([first, second].some(value => /total|jumlah|tahunan|yearly|annual/i.test(String(value ?? "")))) continue;
    const header = monthHeader(second) || monthHeader(first);
    if (header) {
      const yearCell = typeof first === "number" && first >= 2000 && first <= 2100 ? first : String(first ?? "").match(/\b(?:19|20)\d{2}\b/)?.[0];
      columns.push({ column, ...header, year: header.year ?? (yearCell ? Number(yearCell) : undefined) });
    }
  }
  if (!columns.length) return [];
  let anchor = columns.findIndex(column => column.year !== undefined);
  if (anchor < 0) {
    anchor = columns.findIndex(column => column.month === currentMonth);
    if (anchor < 0) anchor = columns.reduce((best, column, index) => (column.month - currentMonth + 12) % 12 < (columns[best].month - currentMonth + 12) % 12 ? index : best, 0);
    columns[anchor].year = currentYear + (columns[anchor].month < currentMonth ? 1 : 0);
  }
  for (let i = anchor + 1; i < columns.length; i++) columns[i].year ??= columns[i - 1].year! + (columns[i].month < columns[i - 1].month ? 1 : 0);
  for (let i = anchor - 1; i >= 0; i--) columns[i].year ??= columns[i + 1].year! - (columns[i].month > columns[i + 1].month ? 1 : 0);
  const seen = new Set<number>();
  return columns.flatMap(({ column, year, month }) => {
    const key = year! * 12 + month - 1;
    if (key < start || key >= start + 6 || seen.has(key)) return [];
    seen.add(key);
    const label = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year!, month - 1, 1))).replace(".", "").toUpperCase();
    return [{ year: year!, month, label, production: money(cell(3, column)) + money(cell(4, column)), spk: money(cell(5, column)), approval: money(cell(6, column)) }];
  }).sort((a, b) => a.year - b.year || a.month - b.month);
}

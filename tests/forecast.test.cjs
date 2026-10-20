const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const XLSX = require("xlsx");

const file = path.resolve(__dirname, "../app/api/cron/sync/forecast.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleUnderTest = new Module(file, module);
moduleUnderTest.filename = file;
moduleUnderTest.paths = module.paths;
moduleUnderTest._compile(compiled, file);
const { forecastFromWorkbook } = moduleUnderTest.exports;
const now = new Date("2026-10-19T12:00:00Z");
function workbook(headers) {
  const sheet = XLSX.utils.aoa_to_sheet([
    [null, null, ...headers],
    [],
    [null, null, ...headers.map((_, i) => (i + 1) * 100)],
    [null, null, ...headers.map((_, i) => i + 1)],
    [null, null, ...headers.map((_, i) => (i + 1) * 10)],
    [null, null, ...headers.map((_, i) => (i + 1) * 1000)],
  ]);
  return { SheetNames: ["FORECAST WIP"], Sheets: { "FORECAST WIP": sheet } };
}
for (const headers of [
  ["Okt 2026", "Nov 2026", "Des 2026", "Jan 2027", "Feb 2027", "Mar 2027"],
  ["Okt 2026", "Nov 2026", "Des 2026", "Total 2026", "Jan 2027", "Feb 2027", "Mar 2027"],
]) {
  const result = forecastFromWorkbook(workbook(headers), now);
  assert.deepEqual(result.map(x => x.label), ["OKT 2026", "NOV 2026", "DES 2026", "JAN 2027", "FEB 2027", "MAR 2027"]);
  assert.deepEqual([result[0].production, result[0].spk, result[0].approval], [101, 10, 1000]);
  const januaryIndex = headers.findIndex(x => x === "Jan 2027") + 1;
  assert.deepEqual([result[3].production, result[3].spk, result[3].approval], [januaryIndex * 101, januaryIndex * 10, januaryIndex * 1000]);
}
const historic = forecastFromWorkbook(workbook(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar"]), now);
assert.deepEqual(historic.map(x => x.label), ["OKT 2026", "NOV 2026", "DES 2026", "JAN 2027", "FEB 2027", "MAR 2027"]);
const missing = forecastFromWorkbook(workbook(["Okt", "Nov", "Des", "", "Jan", "Feb", "Mar"]), now);
assert.equal(missing.length, 6);
assert.equal(new Set(missing.map(x => x.label)).size, 6);
console.log("Forecast tests passed");

// Gagalkan CI bila ada tes yang dilewati (skip/todo). Tes yang dilewati bukan bukti lulus.
// Pemakaian: node scripts/check-no-skips.mjs <berkas-hasil-vitest.json>
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Pemakaian: check-no-skips.mjs <hasil.json>');
  process.exit(2);
}
const r = JSON.parse(readFileSync(file, 'utf8'));
const skipped = (r.numPendingTests ?? 0) + (r.numTodoTests ?? 0);
console.log(`Tes: ${r.numTotalTests} total, ${r.numPassedTests} lulus, ${skipped} dilewati`);
if (!r.numTotalTests) {
  console.error('Tidak ada tes yang dijalankan.');
  process.exit(1);
}
if (skipped > 0) {
  console.error('Ada tes yang dilewati. Itu dianggap gagal.');
  process.exit(1);
}

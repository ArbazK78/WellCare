const raw = "2026-06-19T19:44:00.000Z";
const [hStr, mStr] = raw.split(':');
const h = parseInt(hStr, 10);
const m = parseInt(mStr, 10);
const period = h >= 12 ? 'PM' : 'AM';
const h12 = h % 12 === 0 ? 12 : h % 12;
console.log(`${h12}:${String(m).padStart(2, '0')} ${period}`);

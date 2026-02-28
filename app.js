const salaryInput    = document.getElementById('salary');
const currencySelect = document.getElementById('currency');
const priceInput     = document.getElementById('price');
const itemInput      = document.getElementById('item-name');
const addBtn         = document.getElementById('add-btn');
const errorMsg       = document.getElementById('error-msg');
const periodHint     = document.getElementById('period-hint');
const hoursPerWeekInput = document.getElementById('hours-per-week');
const liveResult     = document.getElementById('live-result');
const lrName         = document.getElementById('lr-name');
const lrTime         = document.getElementById('lr-time');
const receiptSection = document.getElementById('receipt-section');
const receiptItems   = document.getElementById('receipt-items');
const receiptTotalEl = document.getElementById('receipt-total-time');
const receiptBreak   = document.getElementById('receipt-breakdown');
const itemCountEl    = document.getElementById('item-count');
const clearBtn       = document.getElementById('clear-btn');

// ── Constants ──────────────────────────────────────────────

const DEFAULT_HOURS_PER_WEEK = 40;

function getHoursPerWeek() {
  const v = parseFloat(hoursPerWeekInput.value);
  return v && v > 0 ? v : DEFAULT_HOURS_PER_WEEK;
}

// Derive all period multipliers from the current weekly hours setting
function getHoursPerPeriod() {
  const w = getHoursPerWeek();
  return {
    hourly:  1,
    daily:   w / 5,
    weekly:  w,
    monthly: w * 52 / 12,
    yearly:  w * 52,
  };
}

function buildHints() {
  const w  = getHoursPerWeek();
  const mo = (w * 52 / 12).toFixed(1);
  const yr = (w * 52).toLocaleString();
  return {
    hourly:  'Using your exact hourly rate',
    daily:   `Assumes ${(w / 5).toFixed(1)} working hours/day`,
    weekly:  `Assumes ${w} working hours/week`,
    monthly: `Assumes ${mo} working hours/month (${w}h/wk)`,
    yearly:  `Assumes ${yr} working hours/year (${w}h/wk)`,
  };
}

function updatePeriodHint() {
  periodHint.textContent = buildHints()[currentPeriod];
}

// ── State ──────────────────────────────────────────────────

let currentPeriod = 'monthly';
let cart = [];

// ── Helpers ────────────────────────────────────────────────

function getHourlyRate() {
  const s = parseFloat(salaryInput.value);
  return s && s > 0 ? s / getHoursPerPeriod()[currentPeriod] : null;
}

/**
 * Converts a total number of seconds into a human-friendly
 * working-time string, e.g. "1mo 2wk 3d 4h 5m 6s".
 * Uses working units derived from the current hours-per-week setting.
 */
function formatTime(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  if (totalSeconds <= 0) return '0s';

  const w    = getHoursPerWeek();
  const WK_S = 3600 * w;
  const D_S  = 3600 * (w / 5);
  const MO_S = WK_S * 52 / 12;

  const mo = Math.floor(totalSeconds / MO_S);
  let rem   = totalSeconds % MO_S;
  const wk  = Math.floor(rem / WK_S);
  rem        = rem % WK_S;
  const d   = Math.floor(rem / D_S);
  rem        = rem % D_S;
  const h   = Math.floor(rem / 3600);
  rem        = rem % 3600;
  const m   = Math.floor(rem / 60);
  const s   = rem % 60;

  const parts = [];
  if (mo) parts.push(`${mo}mo`);
  if (wk) parts.push(`${wk}wk`);
  if (d)  parts.push(`${d}d`);
  if (h)  parts.push(`${h}h`);
  if (m || parts.length === 0) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── UI Updates ─────────────────────────────────────────────

function updateLivePreview() {
  const rate  = getHourlyRate();
  const price = parseFloat(priceInput.value);

  if (!rate || !price || price <= 0) {
    liveResult.classList.remove('visible');
    return;
  }

  const hours = price / rate;
  const name  = itemInput.value.trim() || 'this item';
  lrName.textContent = `"${name}"`;
  lrTime.textContent = formatTime(hours * 3600);
  liveResult.classList.add('visible');
}

function renderReceipt() {
  if (cart.length === 0) {
    receiptSection.classList.remove('visible');
    return;
  }

  const rate = getHourlyRate();
  receiptSection.classList.add('visible');
  receiptItems.innerHTML = '';

  let totalHours = 0;

  cart.forEach((item, i) => {
    // Recalculate from current rate if available, else fall back to snapshot
    const hours = rate ? item.price / rate : item.hoursSnapshot;
    totalHours += hours;

    const row = document.createElement('div');
    row.className = 'receipt-item';
    row.innerHTML = `
      <span class="ri-name">${escHtml(item.name)}</span>
      <span class="ri-time">${formatTime(hours * 3600)}</span>
      <button class="ri-remove" title="Remove" data-i="${i}">×</button>
    `;
    receiptItems.appendChild(row);
  });

  receiptTotalEl.textContent = formatTime(totalHours * 3600);
  itemCountEl.textContent    = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;

  const w       = getHoursPerWeek();
  const totalH  = totalHours.toFixed(1);
  const totalD  = (totalHours / (w / 5)).toFixed(1);
  const totalWk = (totalHours / w).toFixed(2);
  const totalMo = (totalHours / (w * 52 / 12)).toFixed(2);

  receiptBreak.innerHTML =
    `<span>${totalH}</span> hrs &nbsp;·&nbsp; ` +
    `<span>${totalD}</span> days &nbsp;·&nbsp; ` +
    `<span>${totalWk}</span> weeks &nbsp;·&nbsp; ` +
    `<span>${totalMo}</span> months`;

  // Attach remove handlers after rendering
  receiptItems.querySelectorAll('.ri-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.i), 1);
      renderReceipt();
    });
  });
}

// ── Actions ────────────────────────────────────────────────

function addItem() {
  const rate  = getHourlyRate();
  const price = parseFloat(priceInput.value);

  if (!rate || !price || price <= 0) {
    errorMsg.classList.add('visible');
    setTimeout(() => errorMsg.classList.remove('visible'), 3000);
    return;
  }

  errorMsg.classList.remove('visible');

  cart.push({
    name:          itemInput.value.trim() || 'Unnamed item',
    price,
    hoursSnapshot: price / rate,
  });

  priceInput.value = '';
  itemInput.value  = '';
  liveResult.classList.remove('visible');

  renderReceipt();
  itemInput.focus();
}

// ── Event Listeners ────────────────────────────────────────

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    updatePeriodHint();
    updateLivePreview();
    renderReceipt();
  });
});

addBtn.addEventListener('click', addItem);
priceInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
itemInput.addEventListener('keydown',  e => { if (e.key === 'Enter') addItem(); });
clearBtn.addEventListener('click', () => { cart = []; renderReceipt(); });

// Live preview updates
[salaryInput, priceInput, itemInput].forEach(el =>
  el.addEventListener('input', updateLivePreview)
);

// Receipt recalculates when salary, currency, or hours/week changes
salaryInput.addEventListener('input', renderReceipt);
currencySelect.addEventListener('change', renderReceipt);

// Hours-per-week affects hints, live preview, and receipt
hoursPerWeekInput.addEventListener('input', () => {
  updatePeriodHint();
  updateLivePreview();
  renderReceipt();
});

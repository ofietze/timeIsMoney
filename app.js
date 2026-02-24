const salaryInput    = document.getElementById('salary');
const currencySelect = document.getElementById('currency');
const priceInput     = document.getElementById('price');
const itemInput      = document.getElementById('item-name');
const addBtn         = document.getElementById('add-btn');
const errorMsg       = document.getElementById('error-msg');
const periodHint     = document.getElementById('period-hint');
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

const HINTS = {
  hourly:  'Using your exact hourly rate',
  daily:   'Assumes 8 working hours/day',
  weekly:  'Assumes 40 working hours/week',
  monthly: 'Assumes 160 working hours/month (40h/wk)',
  yearly:  'Assumes 2,080 working hours/year (52 × 40h)',
};

const HOURS_PER_PERIOD = {
  hourly: 1,
  daily: 8,
  weekly: 40,
  monthly: 160,
  yearly: 2080,
};

// Working-time unit sizes in seconds
const MO_S = 3600 * 160;
const WK_S = 3600 * 40;
const D_S  = 3600 * 8;

// ── State ──────────────────────────────────────────────────

let currentPeriod = 'monthly';
let cart = [];

// ── Helpers ────────────────────────────────────────────────

function getHourlyRate() {
  const s = parseFloat(salaryInput.value);
  return s && s > 0 ? s / HOURS_PER_PERIOD[currentPeriod] : null;
}

/**
 * Converts a total number of seconds into a human-friendly
 * working-time string, e.g. "1mo 2wk 3d 4h 5m 6s".
 * Uses working units: month = 160h, week = 40h, day = 8h.
 */
function formatTime(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  if (totalSeconds <= 0) return '0s';

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
  lrName.textContent = `${name}`;
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

  const totalH  = totalHours.toFixed(1);
  const totalD  = (totalHours / 8).toFixed(1);
  const totalWk = (totalHours / 40).toFixed(2);
  const totalMo = (totalHours / 160).toFixed(2);

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
    periodHint.textContent = HINTS[currentPeriod];
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

// Receipt recalculates when salary or currency changes
salaryInput.addEventListener('input', renderReceipt);
currencySelect.addEventListener('change', renderReceipt);

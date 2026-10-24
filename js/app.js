// app.js — Waste Disposal Record of L V Spices
// Automated generation from 2026-04-01 to 2026-10-19 with full manual edit/add & Excel export

const STORAGE_KEY = 'lv_waste_disposal_records_v1';
const MONTH_NAMES = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_MAP = {
  'APRIL': '2026-04',
  'MAY': '2026-05',
  'JUNE': '2026-06',
  'JULY': '2026-07',
  'AUG': '2026-08',
  'SEP': '2026-09',
  'OCT': '2026-10',
  'NOV': '2026-11',
  'DEC': '2026-12'
};

function getCurrentMonthKey() {
  const m = new Date().getMonth();
  const keys = ['JAN', 'FEB', 'MAR', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const cur = keys[m];
  return MONTH_NAMES.includes(cur) ? cur : 'OCT';
}

let activeMonth = getCurrentMonthKey();
let records = [];
let editingId = null;

// ── UNIT 11 / UNIT 12 TOGGLE ──────────────────────────────────────────────────
const UNIT_STORAGE_KEY = 'lv_waste_active_unit';
let activeUnit = localStorage.getItem(UNIT_STORAGE_KEY) || 'Unit 11';

window.setActiveUnit = function(unit) {
  activeUnit = unit;
  localStorage.setItem(UNIT_STORAGE_KEY, unit);
  // Update toggle buttons
  document.getElementById('unit-btn-11')?.classList.toggle('active', unit === 'Unit 11');
  document.getElementById('unit-btn-12')?.classList.toggle('active', unit === 'Unit 12');
  // Update hero pill
  const heroLbl = document.getElementById('hero-unit-lbl');
  if (heroLbl) heroLbl.textContent = unit;
  // Re-render table so time column updates
  renderTable();
};

function initUnitToggle() {
  setActiveUnit(activeUnit);
}

// Quantities matching client image: 200 GMS, 100 GMS, 260 GMS, 055 GMS, 150 gms, 120 GMS, 125 GMS, 195 GMS, etc.
const SAMPLE_QUANTITIES = [
  '200 GMS', '100 GMS', '260 GMS', '055 GMS', '150 gms', '120 GMS',
  '125 GMS', '195 GMS', '200 GMS', '050 GMS', '125 GMS', '100 GMS',
  '175 GMS', '245 GMS', '150 GMS', '180 GMS', '110 GMS', '220 GMS'
];

const SAMPLE_TIMES = [
  '8:55 AM', '8:57 AM', '9:10 AM', '9:05 AM', '09.00 AM', '09.00 AM',
  '09.05 AM', '08.50 AM', '09.00 AM', '09.10 AM', '09.15 AM', '09.20 AM',
  '09.10 AM', '08.55 AM', '09.10 AM', '08.45 AM', '08.52 AM'
];

// Add N minutes to a time string like '8:55 AM' or '09.05 AM'
function addMinutesToTime(timeStr, mins) {
  if (!timeStr || timeStr === 'SUNDAY') return timeStr;
  // Normalize: replace . with : and parse
  const normalized = timeStr.replace(/\./g, ':').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  let h = parseInt(match[1]);
  let m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  // Convert to 24h
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  // Add minutes
  const total = h * 60 + m + mins;
  let nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  const np = nh < 12 ? 'AM' : 'PM';
  if (nh > 12) nh -= 12;
  if (nh === 0) nh = 12;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')} ${np}`;
}

// Generate dataset starting from 1st April 2026 up to today
function generateHistoricalRecords() {
  const generated = [];
  const start = new Date(2026, 3, 1); // April 1, 2026
  const end = new Date(); // Always today

  let cur = new Date(start);
  let id = 1;

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const displayDate = `${d}/${m}/${y}`;
    const dayOfWeek = cur.getDay(); // 0 is Sunday

    if (dayOfWeek === 0) {
      generated.push({
        id: id++,
        date: dateStr,
        displayDate: displayDate,
        wasteType: 'SUNDAY',
        quantity: 'SUNDAY',
        collectedBy: 'SUNDAY',
        time: 'SUNDAY',
        verifiedBy: 'SUNDAY',
        remarks: 'SUNDAY',
        isSunday: true
      });
    } else {
      const qty = SAMPLE_QUANTITIES[(id * 7) % SAMPLE_QUANTITIES.length];
      const time = SAMPLE_TIMES[(id * 5) % SAMPLE_TIMES.length];

      generated.push({
        id: id++,
        date: dateStr,
        displayDate: displayDate,
        wasteType: 'SPICE POWDER & WASTE PAPER',
        quantity: qty,
        collectedBy: 'BMC CLEANING WORKERS',
        time: time,
        verifiedBy: 'RAJESH',
        remarks: 'CLEANED',
        isSunday: false
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  return generated;
}

// Extend existing records up to today — fills any missing days without losing edits
function extendRecordsToToday(existing) {
  if (!existing.length) return existing;

  // Find last date in stored records
  const lastDateStr = existing
    .filter(r => r.date && r.date !== 'SUNDAY')
    .map(r => r.date)
    .sort()
    .pop();

  if (!lastDateStr) return existing;

  const lastDate = new Date(lastDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  if (lastDate >= today) return existing; // already up to date

  // Build set of existing dates for fast lookup
  const existingDates = new Set(existing.map(r => r.date));

  const toAdd = [];
  let cur = new Date(lastDate);
  cur.setDate(cur.getDate() + 1); // start from day after last

  let nextId = Math.max(...existing.map(r => r.id || 0)) + 1;

  while (cur <= today) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const displayDate = `${d}/${m}/${y}`;
    const dayOfWeek = cur.getDay();

    if (!existingDates.has(dateStr)) {
      if (dayOfWeek === 0) {
        toAdd.push({
          id: nextId++,
          date: dateStr,
          displayDate: displayDate,
          wasteType: 'SUNDAY',
          quantity: 'SUNDAY',
          collectedBy: 'SUNDAY',
          time: 'SUNDAY',
          verifiedBy: 'SUNDAY',
          remarks: 'SUNDAY',
          isSunday: true
        });
      } else {
        const qty = SAMPLE_QUANTITIES[(nextId * 7) % SAMPLE_QUANTITIES.length];
        const time = SAMPLE_TIMES[(nextId * 5) % SAMPLE_TIMES.length];
        toAdd.push({
          id: nextId++,
          date: dateStr,
          displayDate: displayDate,
          wasteType: 'SPICE POWDER & WASTE PAPER',
          quantity: qty,
          collectedBy: 'BMC CLEANING WORKERS',
          time: time,
          verifiedBy: 'RAJESH',
          remarks: 'CLEANED',
          isSunday: false
        });
      }
    }

    cur.setDate(cur.getDate() + 1);
  }

  if (toAdd.length > 0) {
    console.log(`[WasteDisposal] Auto-extending: +${toAdd.length} new days up to today`);
    return [...existing, ...toAdd];
  }
  return existing;
}

function initData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      let parsed = JSON.parse(stored);
      // Always extend to today — fills missing days since last load
      records = extendRecordsToToday(parsed);
      if (records.length !== parsed.length) {
        saveToStorage(); // persist new days
      }
    } catch (e) {
      records = generateHistoricalRecords();
      saveToStorage();
    }
  } else {
    records = generateHistoricalRecords();
    saveToStorage();
  }

  renderMonthTabs();
  renderTable();
  updateKPIs();
  initUnitToggle();
}


function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function renderMonthTabs() {
  const container = document.getElementById('month-tabs');
  if (!container) return;

  container.innerHTML = MONTH_NAMES.map(m => `
    <button class="month-tab-btn ${m === activeMonth ? 'active' : ''}" onclick="selectMonth('${m}')">
      ${m} 2026
    </button>
  `).join('');
}

window.selectMonth = function(month) {
  activeMonth = month;
  renderMonthTabs();
  renderTable();
  updateKPIs();
};

function renderTable() {
  const tbody = document.getElementById('waste-tbody');
  if (!tbody) return;

  const monthPrefix = MONTH_MAP[activeMonth] || '2026-10';
  const monthRecords = records.filter(item => item.date.startsWith(monthPrefix));

  if (monthRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748B;">No waste disposal entries recorded for ${activeMonth} 2026</td></tr>`;
    return;
  }

  tbody.innerHTML = monthRecords.map((item, idx) => {
    if (item.isSunday || item.wasteType === 'SUNDAY') {
      return `
        <tr class="row-sunday">
          <td style="text-align:center; font-weight:700;">${item.displayDate}</td>
          <td style="text-align:center;"><span class="sunday-badge">SUNDAY</span></td>
          <td style="text-align:center;">SUNDAY</td>
          <td style="text-align:center;">SUNDAY</td>
          <td style="text-align:center;">SUNDAY</td>
          <td style="text-align:center;">SUNDAY</td>
          <td style="text-align:center;">SUNDAY</td>
          <td style="text-align:center;">
            <button class="action-icon-btn" onclick="openEditModal(${item.id})" title="Edit Row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </td>
        </tr>
      `;
    }

    return `
      <tr>
        <td style="font-weight:700; color:#334155; white-space:nowrap;">${item.displayDate}</td>
        <td style="font-weight:700; color:var(--text-main);">${escapeHtml(item.wasteType)}</td>
        <td style="white-space:nowrap;"><span class="qty-badge">${escapeHtml(item.quantity)}</span></td>
        <td class="collector-tag">${escapeHtml(item.collectedBy)}</td>
        <td style="font-weight:600; color:#2563EB; font-family:monospace; font-size:12px;">${escapeHtml(activeUnit === 'Unit 12' ? addMinutesToTime(item.time, 15) : item.time)}</td>
        <td style="font-weight:800; color:#0F172A;">${escapeHtml(item.verifiedBy)}</td>
        <td><span class="status-badge cleaned">${escapeHtml(item.remarks)}</span></td>
        <td style="text-align:center;">
          <button class="action-icon-btn" onclick="openEditModal(${item.id})" title="Edit Row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateKPIs() {
  const monthPrefix = MONTH_MAP[activeMonth] || '2026-10';
  const monthRecords = records.filter(item => item.date.startsWith(monthPrefix));

  const totalDays = monthRecords.length;
  const workingDays = monthRecords.filter(item => !item.isSunday && item.wasteType !== 'SUNDAY').length;
  const sundays = totalDays - workingDays;
  const allWorkingCount = records.filter(item => !item.isSunday && item.wasteType !== 'SUNDAY').length;

  document.getElementById('kpi-working-days').textContent = workingDays;
  document.getElementById('kpi-sundays').textContent = sundays;
  document.getElementById('kpi-total-disposals').textContent = allWorkingCount;
  document.getElementById('kpi-compliance').textContent = '100% CLEANED';
  document.getElementById('current-cycle-lbl').textContent = `${activeMonth} 2026`;
}

// ──────────────────────────────────────────────────────────────────────────────
// MODAL: ADD / EDIT
// ──────────────────────────────────────────────────────────────────────────────
window.openAddModal = function() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Waste Disposal Entry';
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('m-date').value = today;
  document.getElementById('m-waste-type').value = 'SPICE POWDER & WASTE PAPER';
  document.getElementById('m-quantity').value = '150 GMS';
  document.getElementById('m-collector').value = 'BMC CLEANING WORKERS';
  document.getElementById('m-time').value = '09:00 AM';
  document.getElementById('m-verified').value = 'RAJESH';
  document.getElementById('m-remarks').value = 'CLEANED';

  document.getElementById('edit-modal').style.display = 'flex';
};

window.openEditModal = function(id) {
  const item = records.find(r => r.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('modal-title').textContent = `Edit Waste Disposal Record (${item.displayDate})`;

  document.getElementById('m-date').value = item.date;
  document.getElementById('m-waste-type').value = item.wasteType;
  document.getElementById('m-quantity').value = item.quantity;
  document.getElementById('m-collector').value = item.collectedBy;
  document.getElementById('m-time').value = item.time;
  document.getElementById('m-verified').value = item.verifiedBy;
  document.getElementById('m-remarks').value = item.remarks;

  document.getElementById('edit-modal').style.display = 'flex';
};

window.closeModal = function() {
  document.getElementById('edit-modal').style.display = 'none';
};

window.saveRecord = function() {
  const dateVal = document.getElementById('m-date').value;
  const wasteTypeVal = document.getElementById('m-waste-type').value.trim() || 'SPICE POWDER & WASTE PAPER';
  const qtyVal = document.getElementById('m-quantity').value.trim() || '150 GMS';
  const collectorVal = document.getElementById('m-collector').value.trim() || 'BMC CLEANING WORKERS';
  const timeVal = document.getElementById('m-time').value.trim() || '09:00 AM';
  const verifiedVal = document.getElementById('m-verified').value.trim() || 'RAJESH';
  const remarksVal = document.getElementById('m-remarks').value.trim() || 'CLEANED';

  if (!dateVal) {
    alert("Please select a date.");
    return;
  }

  const parts = dateVal.split('-');
  const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  const isSunday = wasteTypeVal.toUpperCase() === 'SUNDAY';

  if (editingId) {
    const idx = records.findIndex(r => r.id === editingId);
    if (idx !== -1) {
      records[idx] = {
        ...records[idx],
        date: dateVal,
        displayDate: displayDate,
        wasteType: wasteTypeVal,
        quantity: qtyVal,
        collectedBy: collectorVal,
        time: timeVal,
        verifiedBy: verifiedVal,
        remarks: remarksVal,
        isSunday: isSunday
      };
      showToast("Waste disposal record updated successfully!");
    }
  } else {
    const newRecord = {
      id: Date.now(),
      date: dateVal,
      displayDate: displayDate,
      wasteType: wasteTypeVal,
      quantity: qtyVal,
      collectedBy: collectorVal,
      time: timeVal,
      verifiedBy: verifiedVal,
      remarks: remarksVal,
      isSunday: isSunday
    };
    records.push(newRecord);
    records.sort((a, b) => a.date.localeCompare(b.date));
    showToast("New waste disposal record added!");
  }

  saveToStorage();
  closeModal();
  renderTable();
  updateKPIs();
};

// ──────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT (EXACTLY MATCHING CLIENT IMAGE COLUMNS & TITLE)
// ──────────────────────────────────────────────────────────────────────────────
window.exportToExcel = function() {
  if (typeof XLSX === 'undefined') {
    alert("Excel generator library loading, please try again in a few moments.");
    return;
  }

  const wb = XLSX.utils.book_new();

  MONTH_NAMES.forEach(m => {
    const monthPrefix = MONTH_MAP[m];
    const monthRecords = records.filter(item => item.date.startsWith(monthPrefix));

    const sheetRows = [
      ["WASTE DISPOSAL RECORD OF  L V SPICES"],
      [], // blank row
      ["Date", "TYPE OF WASTE", "QUNATITY", "DISPOSAL COLLECTED BY", "DISPOSAL TIME", "VARIFIED BY", "REMARKS"]
    ];

    monthRecords.forEach(item => {
      sheetRows.push([
        item.displayDate,
        item.wasteType,
        item.quantity,
        item.collectedBy,
        activeUnit === 'Unit 12' ? addMinutesToTime(item.time, 15) : item.time,
        item.verifiedBy,
        item.remarks
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 32 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, m);
  });

  XLSX.writeFile(wb, `LV_Spices_Waste_Disposal_Record_2026.xlsx`);
  showToast("Waste Disposal Excel downloaded successfully!");
};

window.printLog = function() {
  // Get filtered records for active month
  const monthPrefix = MONTH_MAP[activeMonth] || '2026-10';
  const monthRecords = records.filter(r => r.date && r.date.startsWith(monthPrefix));

  // Build table rows HTML
  const rowsHtml = monthRecords.map(r => {
    if (r.isSunday) {
      return `<tr class="sun">
        <td>${escapeHtml(r.displayDate)}</td>
        <td colspan="6" style="text-align:center;font-style:italic;color:#888;">SUNDAY — REST DAY</td>
      </tr>`;
    }
    const timeDisplay = activeUnit === 'Unit 12' ? addMinutesToTime(r.time, 15) : r.time;
    return `<tr>
      <td>${escapeHtml(r.displayDate)}</td>
      <td>${escapeHtml(r.wasteType)}</td>
      <td style="text-align:center;">${escapeHtml(r.quantity)}</td>
      <td>${escapeHtml(r.collectedBy)}</td>
      <td style="text-align:center;">${escapeHtml(timeDisplay)}</td>
      <td style="text-align:center;">${escapeHtml(r.verifiedBy)}</td>
      <td style="text-align:center;"><span class="badge">${escapeHtml(r.remarks)}</span></td>
    </tr>`;
  }).join('');

  const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>LV Spices — Waste Disposal Record</title>
<style>
  /* @page margin:0 suppresses browser's default date/URL headers & footers */
  @page { size: A4 portrait; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  /* body padding replaces the @page margins so content still has breathing room */
  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #000; background: #fff;
    padding: 11mm 10mm 11mm 10mm; width: 210mm; }

  /* Header */
  .header { border: 2px solid #000; padding: 8pt 10pt; margin-bottom: 6pt; }
  .header h1 { font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5pt; }
  .header p  { font-size: 8.5pt; color: #444; margin-top: 3pt; }
  .pills { display: flex; flex-wrap: wrap; gap: 5pt; margin-top: 6pt; }
  .pill { border: 1px solid #555; padding: 1.5pt 6pt; font-size: 8pt; border-radius: 3pt; }
  .pill b { color: #B91C1C; }

  /* Table */
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5pt; }
  thead { display: table-header-group; }
  th {
    background: #1a1a1a;
    color: #fff;
    padding: 5pt 4pt;
    border: 0.75pt solid #000;
    font-size: 8pt;
    font-weight: 700;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
  }
  td {
    padding: 4pt 4pt;
    border: 0.5pt solid #999;
    font-size: 8pt;
    vertical-align: middle;
    overflow: hidden;
    word-break: break-word;
  }
  tr.sun td { background: #f0f0f0; color: #777; font-style: italic; }
  tr:nth-child(even):not(.sun) td { background: #fafafa; }
  .badge { background: #d4edda; color: #155724; border: 0.5pt solid #155724; padding: 0 4pt; border-radius: 2pt; font-size: 7.5pt; font-weight: 700; white-space: nowrap; }

  /* Column widths — 190mm usable (210mm - 20mm body padding)
     DATE 22mm | TYPE 41mm | QTY 19mm | COLLECTED 46mm | TIME 21mm | VERIFIED 21mm | REMARKS 20mm = 190mm */
  col.c1 { width: 22mm; }
  col.c2 { width: 41mm; }
  col.c3 { width: 19mm; }
  col.c4 { width: 46mm; }
  col.c5 { width: 21mm; }
  col.c6 { width: 21mm; }
  col.c7 { width: 20mm; }
</style>
</head>
<body>
<div class="header">
  <h1>Waste Disposal Record of L V Spices</h1>
  <p>Daily Packaging Waste &amp; Residual Spice Powder Handover Log to Municipal BMC Cleaning Staff</p>
  <div class="pills">
    <span class="pill">🗑️ Waste Type: <b>Spice Powder &amp; Waste Paper</b></span>
    <span class="pill">🚛 Collector: <b>BMC Cleaning Workers</b></span>
    <span class="pill">✅ Verifier: <b>Bhimlal Sharma</b></span>
    <span class="pill">📅 Cycle: <b>${activeMonth} 2026</b></span>
    <span class="pill">🏭 Unit: <b>${escapeHtml(activeUnit)}</b></span>
  </div>
</div>

<table>
  <colgroup>
    <col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/>
    <col class="c5"/><col class="c6"/><col class="c7"/>
  </colgroup>
  <thead>
    <tr>
      <th>DATE</th>
      <th>TYPE OF WASTE</th>
      <th>QUANTITY</th>
      <th>DISPOSAL COLLECTED BY</th>
      <th>DISPOSAL TIME</th>
      <th>VERIFIED BY</th>
      <th>REMARKS</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
<script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 800); };<\/script>
</body>
</html>`;

  const pw = window.open('', '_blank', 'width=794,height=1123');
  if (pw) {
    pw.document.write(printHtml);
    pw.document.close();
  } else {
    // Fallback if popup blocked
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 100);
  }
};



function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  const existing = document.querySelector('.toast-box');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-box';
  toast.innerHTML = `✓ ${escapeHtml(msg)}`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  initData();
});

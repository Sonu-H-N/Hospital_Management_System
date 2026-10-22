// ============================================================
//  MediCore HMS — Reports Page Logic (API-backed)
// ============================================================

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

const PALETTE = ['#00d4aa','#ff5e7e','#ffb547','#a78bfa','#4da6ff','#f97316','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];

function drawPie(canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth; canvas.width = W; canvas.height = 200;
  const cx = W / 2, cy = 100, r = 75, ir = 45;
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let angle = -Math.PI / 2;
  values.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, ir, 0, Math.PI * 2);
    ctx.fillStyle = '#141926';
    ctx.fill();
    angle += slice;
  });
  ctx.fillStyle = '#e8eaf2';
  ctx.font = 'bold 20px DM Serif Display';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(values.reduce((a, b) => a + b, 0), cx, cy);
  ctx.font = '10px DM Sans';
  ctx.fillStyle = '#8890a8';
  ctx.fillText('total', cx, cy + 16);
}

function drawBar(canvasId, labels, values, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth; canvas.width = W;
  const H = canvas.height;
  const pad = { t:10, r:10, b:30, l:10 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const max = Math.max(...values, 0) * 1.1 || 1;
  const bw = cw / labels.length * 0.6;
  const gap = cw / labels.length;
  ctx.clearRect(0, 0, W, H);
  values.forEach((v, i) => {
    const x = pad.l + gap * i + (gap - bw) / 2;
    const bh = (v / max) * ch;
    const y = pad.t + ch - bh;
    const grad = ctx.createLinearGradient(0, y, 0, pad.t + ch);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '33');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, Math.max(bh, 0), 4);
    ctx.fill();
    ctx.fillStyle = '#8890a8';
    ctx.font = '10px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(String(labels[i]).slice(0, 6), x + bw / 2, pad.t + ch + 16);
    ctx.fillStyle = '#e8eaf2';
    ctx.fillText(v, x + bw / 2, y - 4);
  });
}

function buildLegend(containerId, labels, values, colors) {
  const el = document.getElementById(containerId);
  el.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i % colors.length]}"></div>
      ${escapeHtml(l)} (${values[i]})
    </div>`).join('');
}

async function load() {
  try {
    const d = await api.get('/reports/analytics');

    const kpis = [
      { label: 'Patients', val: d.kpis.patients, color: 'var(--accent-teal)' },
      { label: 'Doctors', val: d.kpis.doctors, color: 'var(--accent-violet)' },
      { label: 'Appointments', val: d.kpis.appointments, color: 'var(--accent-amber)' },
      { label: 'Bills', val: d.kpis.bills, color: 'var(--accent-rose)' },
      { label: 'Medicines', val: d.kpis.medicines, color: 'var(--accent-blue)' },
      { label: 'Revenue', val: '₹' + Math.round(d.kpis.revenue / 1000) + 'K', color: 'var(--accent-teal)' },
    ];
    document.getElementById('kpiStrip').innerHTML = kpis.map(k => `
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-family:var(--font-display);font-size:22px;color:${k.color}">${k.val}</div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;margin-top:3px">${k.label}</div>
      </div>`).join('');

    if (d.statusBreakdown.length) {
      const labels = d.statusBreakdown.map(x => x.label), values = d.statusBreakdown.map(x => x.value);
      setTimeout(() => { drawPie('statusChart', labels, values, PALETTE); buildLegend('statusLegend', labels, values, PALETTE); }, 80);
    } else {
      document.getElementById('statusLegend').innerHTML = `<span style="color:var(--text-muted);font-size:12px">No patient data yet</span>`;
    }

    if (d.deptBreakdown.length) {
      const labels = d.deptBreakdown.map(x => x.label), values = d.deptBreakdown.map(x => x.value);
      setTimeout(() => { drawPie('deptChart', labels, values, PALETTE.slice(3)); buildLegend('deptLegend', labels, values, PALETTE.slice(3)); }, 120);
    } else {
      document.getElementById('deptLegend').innerHTML = `<span style="color:var(--text-muted);font-size:12px">No patient data yet</span>`;
    }

    if (d.apptTypeBreakdown.length) {
      const labels = d.apptTypeBreakdown.map(x => x.label), values = d.apptTypeBreakdown.map(x => x.value);
      setTimeout(() => drawBar('apptChart', labels, values, '#a78bfa'), 160);
    }

    document.getElementById('bTotalRev').textContent = formatCurrency(d.billing.paid);
    document.getElementById('bPending').textContent = formatCurrency(d.billing.unpaid);
    document.getElementById('bCount').textContent = d.billing.count;
    setTimeout(() => drawBar('billingChart', ['Paid', 'Unpaid'], [d.billing.paid / 1000, d.billing.unpaid / 1000], '#00d4aa'), 200);

    const typeColors = { General:'#00d4aa', ICU:'#ff5e7e', Maternity:'#a78bfa', Pediatric:'#ffb547', Specialty:'#4da6ff', Private:'#f97316' };
    document.getElementById('wardReport').innerHTML = d.wards.length ? d.wards.map(w => {
      const pct = Math.round((w.occupied / w.capacity) * 100);
      const c = typeColors[w.type] || '#00d4aa';
      return `<div style="background:var(--bg-secondary);border-radius:var(--radius-sm);padding:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div>
            <div style="font-size:13px;font-weight:600">${escapeHtml(w.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${w.type} · Floor ${w.floor}</div>
          </div>
          <div style="font-size:18px;font-weight:700;font-family:var(--font-display);color:${c}">${pct}%</div>
        </div>
        <div style="background:var(--bg-primary);border-radius:99px;height:6px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${c};border-radius:99px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-muted)">
          <span>${w.occupied} occupied</span><span>${w.capacity - w.occupied} free</span>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state" style="grid-column:1/-1"><p>No wards configured yet</p></div>`;

    window.__reportsData = d;
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

window.addEventListener('resize', () => { if (window.__reportsData) load(); });

load();

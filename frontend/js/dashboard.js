// ============================================================
//  MediCore HMS — Dashboard Logic (API-backed)
// ============================================================

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showNotif() { document.getElementById('notifPanel').classList.toggle('open'); }
function hideNotif() { document.getElementById('notifPanel').classList.remove('open'); }

let dashboardData = null;

async function loadDashboard() {
  try {
    dashboardData = await api.get('/dashboard/summary');
    renderStats();
    renderAppointments();
    renderRecentPatients();
    renderDeptBars();
    renderNotifications();
    setTimeout(drawChart, 50);
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function renderStats() {
  const d = dashboardData;
  document.getElementById('totalPatients').textContent = d.totalPatients.toLocaleString('en-IN');
  document.getElementById('activeDoctors').textContent = d.activeDoctors;
  document.getElementById('todayAppts').textContent = d.todayAppts.total;
  document.getElementById('occupiedBeds').textContent = d.beds.occupied;

  document.getElementById('apptsChange').textContent =
    d.todayAppts.cancelled > 0 ? `↓ ${d.todayAppts.cancelled} cancelled` : 'All confirmed';
  document.getElementById('occupancyChange').textContent = `${d.beds.occupancyPct}% occupancy`;
  document.getElementById('doctorsChange').textContent = 'On duty today';
  document.getElementById('patientsChange').textContent = 'All-time records';
}

function renderAppointments() {
  const el = document.getElementById('apptList');
  const appts = dashboardData.recentAppointments;

  if (!appts.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📅</div><strong>No appointments today</strong><p>Book one from Quick Actions.</p></div>`;
    return;
  }

  el.innerHTML = appts.map(a => `
    <div class="appt-item">
      <div class="appt-time">${a.appt_time}</div>
      <div class="appt-avatar" style="background:${avatarColor(a.patient)}22;color:${avatarColor(a.patient)}">
        ${initials(a.patient)}
      </div>
      <div class="appt-info">
        <div class="appt-name">${escapeHtml(a.patient)}</div>
        <div class="appt-doctor">${escapeHtml(a.doctor)} · ${escapeHtml(a.dept)}</div>
      </div>
      <span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span>
    </div>
  `).join('');
}

function renderRecentPatients() {
  const el = document.getElementById('recentPatients');
  const patients = dashboardData.recentPatients;

  if (!patients.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🧑‍⚕️</div><strong>No patients yet</strong><p>Add your first patient record.</p></div>`;
    return;
  }

  el.innerHTML = patients.map(p => `
    <div class="patient-row">
      <div class="avatar" style="background:${avatarColor(p.name)}22;color:${avatarColor(p.name)}">
        ${initials(p.name)}
      </div>
      <div class="patient-info">
        <div class="patient-name">${escapeHtml(p.name)}</div>
        <div class="patient-id">${p.id} · ${escapeHtml(p.dept)}</div>
      </div>
      <span class="badge-status badge-${p.status.toLowerCase()}">${p.status}</span>
    </div>
  `).join('');
}

function renderDeptBars() {
  const el = document.getElementById('deptBars');
  const colors = ['var(--accent-teal)','var(--accent-rose)','var(--accent-amber)','var(--accent-violet)','var(--accent-blue)','#f97316'];
  const depts = dashboardData.deptLoad;

  if (!depts.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🏥</div><p>No department data yet</p></div>`;
    return;
  }

  el.innerHTML = depts.map((d, i) => `
    <div class="dept-item">
      <div class="dept-header">
        <span class="dept-name">${escapeHtml(d.name)}</span>
        <span class="dept-pct">${d.count} patient${d.count !== 1 ? 's' : ''}</span>
      </div>
      <div class="dept-bar-bg">
        <div class="dept-bar-fill" style="width:${d.pct}%;background:${colors[i % colors.length]}"></div>
      </div>
    </div>
  `).join('');
}

function renderNotifications() {
  // Real, derived notifications: critical patients + low-stock medicines,
  // instead of the original's hardcoded examples.
  api.get('/patients', { status: 'Critical', pageSize: 5 }).then(res => {
    api.get('/pharmacy', { stock: 'low' }).then(meds => {
      const items = [];
      res.data.forEach(p => items.push({ urgent: true, text: `🚨 ${escapeHtml(p.name)} (${p.id}) — Critical status` }));
      meds.data.slice(0, 5).forEach(m => items.push({ urgent: false, text: `💊 Pharmacy stock low: ${escapeHtml(m.name)} (${m.stock} left)` }));

      const list = document.getElementById('notifList');
      const badge = document.getElementById('notifBadge');
      badge.textContent = items.length;
      badge.style.display = items.length ? 'inline-block' : 'none';

      list.innerHTML = items.length
        ? items.map(i => `<div class="notif-item ${i.urgent ? 'urgent' : ''}">${i.text}</div>`).join('')
        : `<div class="notif-item">✓ All clear — no urgent alerts</div>`;
    });
  });
}

// ── Revenue Chart (pure canvas, drawn from real bill data) ───────────
function drawChart() {
  const canvas = document.getElementById('revenueChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  canvas.width = W;
  canvas.height = 180;

  const monthly = dashboardData.monthlyRevenue; // [{month:'2026-03', revenue: N}, ...]
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const vals = monthly.map(m => m.revenue / 100000); // in Lakhs
  const labels = monthly.map(m => months[Number(m.month.split('-')[1]) - 1]);

  ctx.clearRect(0, 0, W, canvas.height);

  if (!vals.length) {
    ctx.fillStyle = '#4a5370';
    ctx.font = '13px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('No paid bills yet this year', W / 2, 90);
    return;
  }

  const pad = { t:16, r:16, b:32, l:44 };
  const cw = W - pad.l - pad.r;
  const ch = canvas.height - pad.t - pad.b;
  const max = Math.max(...vals, 0.1) * 1.15;

  ctx.strokeStyle = '#1e2840';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ch - (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
    ctx.fillStyle = '#4a5370'; ctx.font = '10px DM Sans'; ctx.textAlign = 'right';
    ctx.fillText('₹' + ((max / 4) * i).toFixed(1) + 'L', pad.l - 6, y + 3);
  }

  const step = vals.length > 1 ? cw / (vals.length - 1) : 0;
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(0,212,170,0.25)');
  grad.addColorStop(1, 'rgba(0,212,170,0.01)');

  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = pad.l + step * i;
    const y = pad.t + ch - (v / max) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + step * (vals.length - 1), pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#00d4aa';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  vals.forEach((v, i) => {
    const x = pad.l + step * i;
    const y = pad.t + ch - (v / max) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  vals.forEach((v, i) => {
    const x = pad.l + step * i;
    const y = pad.t + ch - (v / max) * ch;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4aa'; ctx.fill();
    ctx.fillStyle = '#8890a8'; ctx.font = '10px DM Sans'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x, pad.t + ch + 20);
  });
}

loadDashboard();
window.addEventListener('resize', () => { if (dashboardData) drawChart(); });

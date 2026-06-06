// ============================================================
//  MediCore HMS — Dashboard Logic
// ============================================================

// Date display
document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

// Sidebar toggle
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Notifications
function showNotif() {
  document.getElementById('notifPanel').classList.toggle('open');
}
function hideNotif() {
  document.getElementById('notifPanel').classList.remove('open');
}

// ── Appointments list ──────────────────────────────────────
function renderAppointments() {
  const appts = HMS.getAppointments().slice(0, 6);
  const colors = ['#00d4aa','#ff5e7e','#ffb547','#a78bfa','#4da6ff','#f97316'];
  const el = document.getElementById('apptList');
  el.innerHTML = appts.map((a, i) => `
    <div class="appt-item">
      <div class="appt-time">${a.time}</div>
      <div class="appt-avatar" style="background:${HMS.avatarColor(a.patient)}22;color:${HMS.avatarColor(a.patient)}">
        ${HMS.initials(a.patient)}
      </div>
      <div class="appt-info">
        <div class="appt-name">${a.patient}</div>
        <div class="appt-doctor">${a.doctor} · ${a.dept}</div>
      </div>
      <span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span>
    </div>
  `).join('');
}

// ── Recent Patients ────────────────────────────────────────
function renderRecentPatients() {
  const patients = HMS.getPatients().slice(0, 5);
  const el = document.getElementById('recentPatients');
  el.innerHTML = patients.map(p => `
    <div class="patient-row">
      <div class="avatar" style="background:${HMS.avatarColor(p.name)}22;color:${HMS.avatarColor(p.name)}">
        ${HMS.initials(p.name)}
      </div>
      <div class="patient-info">
        <div class="patient-name">${p.name}</div>
        <div class="patient-id">${p.id} · ${p.dept}</div>
      </div>
      <span class="badge-status badge-${p.status.toLowerCase()}">${p.status}</span>
    </div>
  `).join('');
}

// ── Department Bars ────────────────────────────────────────
function renderDeptBars() {
  const depts = [
    { name:'Cardiology',    pct:82, color:'var(--accent-rose)' },
    { name:'Neurology',     pct:67, color:'var(--accent-violet)' },
    { name:'Orthopedics',   pct:55, color:'var(--accent-amber)' },
    { name:'Oncology',      pct:90, color:'var(--accent-teal)' },
    { name:'Pediatrics',    pct:43, color:'var(--accent-blue)' },
    { name:'Gynecology',    pct:71, color:'#f97316' },
  ];
  const el = document.getElementById('deptBars');
  el.innerHTML = depts.map(d => `
    <div class="dept-item">
      <div class="dept-header">
        <span class="dept-name">${d.name}</span>
        <span class="dept-pct">${d.pct}%</span>
      </div>
      <div class="dept-bar-bg">
        <div class="dept-bar-fill" style="width:${d.pct}%;background:${d.color}"></div>
      </div>
    </div>
  `).join('');
}

// ── Revenue Chart (pure canvas) ───────────────────────────
function drawChart() {
  const canvas = document.getElementById('revenueChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  canvas.width = W;
  canvas.height = 180;

  const data2026 = [18.2, 21.4, 19.8, 24.1, 22.7, 28.5, 26.3, 30.1, 27.9, 32.4, 29.8, 35.2];
  const data2025 = [14.1, 16.8, 15.3, 18.9, 17.4, 20.2, 19.6, 22.8, 21.3, 24.7, 23.1, 28.4];
  const yr = document.getElementById('chartYear').value;
  const vals = yr === '2026' ? data2026 : data2025;
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];

  const pad = { t:16, r:16, b:32, l:40 };
  const cw = W - pad.l - pad.r;
  const ch = canvas.height - pad.t - pad.b;
  const max = Math.max(...vals) * 1.1;

  ctx.clearRect(0, 0, W, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#1e2840';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ch - (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y);
    ctx.stroke();
    ctx.fillStyle = '#4a5370';
    ctx.font = '10px DM Sans';
    ctx.textAlign = 'right';
    ctx.fillText('₹' + ((max / 4) * i).toFixed(0) + 'L', pad.l - 6, y + 3);
  }

  // Area fill
  const step = cw / (vals.length - 1);
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(0,212,170,0.25)');
  grad.addColorStop(1, 'rgba(0,212,170,0.01)');

  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = pad.l + step * i;
    const y = pad.t + ch - (v / max) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cw, pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
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

  // Dots + labels
  vals.forEach((v, i) => {
    const x = pad.l + step * i;
    const y = pad.t + ch - (v / max) * ch;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
    ctx.fillStyle = '#8890a8';
    ctx.font = '10px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(months[i], x, pad.t + ch + 20);
  });
}

// Init
renderAppointments();
renderRecentPatients();
renderDeptBars();
setTimeout(drawChart, 100);
window.addEventListener('resize', drawChart);

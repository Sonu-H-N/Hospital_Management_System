// ============================================================
//  MediCore HMS — Wards Page Logic (API-backed)
// ============================================================

let editId = null;
let wardsCache = [];

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

const typeColors = {
  General: 'var(--accent-teal)', ICU: 'var(--accent-rose)', Maternity: 'var(--accent-violet)',
  Pediatric: 'var(--accent-amber)', Specialty: 'var(--accent-blue)', Private: '#f97316',
};

function updateSummary(wards) {
  const total = wards.reduce((s, w) => s + w.capacity, 0);
  const occ = wards.reduce((s, w) => s + w.occupied, 0);
  document.getElementById('totalBeds').textContent = total;
  document.getElementById('occupiedBeds').textContent = occ;
  document.getElementById('availBeds').textContent = total - occ;
  document.getElementById('occRate').textContent = total ? Math.round((occ / total) * 100) + '%' : '0%';
}

async function render() {
  const grid = document.getElementById('wardGrid');
  grid.innerHTML = `<div class="skeleton-row" style="grid-column:1/-1"></div>`;

  try {
    const res = await api.get('/wards');
    wardsCache = res.data;
    updateSummary(wardsCache);

    const tf = document.getElementById('typeFilter').value;
    const wards = wardsCache.filter(w => !tf || w.type === tf);

    if (!wards.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🏥</div><strong>No wards found</strong><p>Try a different filter, or add a new ward.</p></div>`;
      return;
    }

    grid.innerHTML = wards.map((w, i) => {
      const pct = Math.round((w.occupied / w.capacity) * 100);
      const color = typeColors[w.type] || 'var(--accent-teal)';
      const avail = w.capacity - w.occupied;

      let beds = '';
      for (let b = 1; b <= Math.min(w.capacity, 20); b++) {
        const isOcc = b <= w.occupied;
        beds += `<div class="bed-cell ${isOcc ? 'bed-occupied' : 'bed-free'}" title="${isOcc ? 'Occupied' : 'Available'}">${b}</div>`;
      }
      if (w.capacity > 20) beds += `<div class="bed-cell" style="background:var(--bg-secondary);color:var(--text-muted);font-size:8px">+${w.capacity - 20}</div>`;

      return `<div class="ward-card" style="animation-delay:${i * 0.05}s">
        <div class="ward-top">
          <div>
            <div class="ward-name">${escapeHtml(w.name)}</div>
            <div class="ward-type">${w.type} · Floor ${w.floor}</div>
          </div>
          <span class="badge-status" style="background:${color}22;color:${color}">${w.id}</span>
        </div>
        <div class="occ-bar-bg"><div class="occ-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="ward-nums">
          <div>Occupied <span>${w.occupied}</span></div>
          <div>Available <span>${avail}</span></div>
          <div>Total <span>${w.capacity}</span></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-top:4px">${pct}% occupancy</div>
        <div class="bed-grid">${beds}</div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn btn-sm btn-secondary" style="flex:1" onclick="editWard('${w.id}')">Edit Ward</button>
          ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="deleteWard('${w.id}')">Del</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div>`;
  }
}

function openModal() {
  editId = null;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'Add Ward';
  ['fName', 'fCap', 'fOcc', 'fFloor'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fType').value = 'General';
  document.getElementById('modalOverlay').classList.add('open');
}

function editWard(id) {
  const w = wardsCache.find(x => x.id === id);
  if (!w) return;
  editId = id;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'Edit Ward';
  document.getElementById('fName').value = w.name;
  document.getElementById('fType').value = w.type;
  document.getElementById('fCap').value = w.capacity;
  document.getElementById('fOcc').value = w.occupied;
  document.getElementById('fFloor').value = w.floor;
  document.getElementById('modalOverlay').classList.add('open');
}

async function saveWard() {
  applyFieldErrors([]);
  const payload = {
    name: document.getElementById('fName').value.trim(),
    type: document.getElementById('fType').value,
    capacity: parseInt(document.getElementById('fCap').value) || 0,
    occupied: parseInt(document.getElementById('fOcc').value) || 0,
    floor: parseInt(document.getElementById('fFloor').value) || 1,
  };

  try {
    if (editId) {
      await api.put(`/wards/${editId}`, payload);
      showToast('Ward updated');
    } else {
      await api.post('/wards', payload);
      showToast('Ward added');
    }
    closeModal();
    render();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  }
}

async function deleteWard(id) {
  const ok = await confirmDialog({
    title: 'Delete this ward?',
    message: `${id} will be permanently removed.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  try {
    await api.del(`/wards/${id}`);
    showToast('Ward deleted');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

render();

// ============================================================
//  MediCore HMS — Doctors Page Logic (API-backed)
// ============================================================

let editId = null;

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderDoctors, 300);
});
document.getElementById('statusFilter').addEventListener('change', renderDoctors);

async function renderDoctors() {
  const grid = document.getElementById('doctorGrid');
  grid.innerHTML = `<div class="skeleton-row" style="grid-column:1/-1"></div>`;

  try {
    const res = await api.get('/doctors', {
      q: document.getElementById('searchInput').value.trim() || undefined,
      status: document.getElementById('statusFilter').value || undefined,
    });

    if (!res.data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🩺</div><strong>No doctors found</strong><p>Try adjusting your search.</p></div>`;
      return;
    }

    grid.innerHTML = res.data.map((d, i) => {
      const c = avatarColor(d.name);
      const canManage = isAdmin();
      return `
      <div class="doctor-card" style="animation-delay:${i*0.05}s">
        <div class="doc-avatar" style="background:${c}22;color:${c}">${initials(d.name)}</div>
        <div class="doc-name">${escapeHtml(d.name)}</div>
        <div class="doc-spec">${escapeHtml(d.specialization)} · ${escapeHtml(d.dept)}</div>
        <span class="badge-status ${d.status==='Active'?'badge-active':'badge-pending'}" style="margin-bottom:14px;display:inline-block">${d.status}</span>
        <div class="doc-stats">
          <div class="doc-stat"><div class="doc-stat-val" style="color:${c}">${d.experience}</div><div class="doc-stat-label">Yrs Exp</div></div>
          <div class="doc-stat"><div class="doc-stat-val">${d.patients}</div><div class="doc-stat-label">Patients</div></div>
          <div class="doc-stat"><div class="doc-stat-val">₹${d.fee}</div><div class="doc-stat-label">Fee</div></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">${escapeHtml(d.schedule || '—')}</div>
        ${canManage ? `
          <div class="doc-actions">
            <button class="btn btn-sm btn-secondary" onclick="editDoctor('${d.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDoctor('${d.id}')">Delete</button>
          </div>` : ''}
      </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div>`;
  }
}

function openModal() {
  editId = null;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'Add New Doctor';
  ['fName','fSpec','fPhone','fEmail','fFee','fSchedule','fExp'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fStatus').value = 'Active';
  document.getElementById('modalOverlay').classList.add('open');
}

function editDoctor(id) {
  api.get('/doctors', {}).then(res => {
    const d = res.data.find(x => x.id === id);
    if (!d) return;
    editId = id;
    applyFieldErrors([]);
    document.getElementById('modalTitle').textContent = 'Edit Doctor';
    document.getElementById('fName').value = d.name;
    document.getElementById('fSpec').value = d.specialization;
    document.getElementById('fDept').value = d.dept;
    document.getElementById('fExp').value = d.experience;
    document.getElementById('fPhone').value = d.phone || '';
    document.getElementById('fEmail').value = d.email || '';
    document.getElementById('fFee').value = d.fee;
    document.getElementById('fSchedule').value = d.schedule || '';
    document.getElementById('fStatus').value = d.status;
    document.getElementById('modalOverlay').classList.add('open');
  }).catch(err => showToast(apiErrorMessage(err), 'error'));
}

async function saveDoctor() {
  applyFieldErrors([]);
  const payload = {
    name: document.getElementById('fName').value.trim(),
    specialization: document.getElementById('fSpec').value.trim(),
    dept: document.getElementById('fDept').value,
    experience: parseInt(document.getElementById('fExp').value) || 0,
    phone: document.getElementById('fPhone').value.trim() || undefined,
    email: document.getElementById('fEmail').value.trim() || undefined,
    fee: parseFloat(document.getElementById('fFee').value) || 0,
    schedule: document.getElementById('fSchedule').value.trim() || undefined,
    status: document.getElementById('fStatus').value,
  };

  try {
    if (editId) {
      await api.put(`/doctors/${editId}`, payload);
      showToast('Doctor updated');
    } else {
      await api.post('/doctors', payload);
      showToast('Doctor added');
    }
    closeModal();
    renderDoctors();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  }
}

async function deleteDoctor(id) {
  const ok = await confirmDialog({
    title: 'Delete this doctor record?',
    message: `${id} will be removed from the roster. Patients previously assigned to them will become unassigned.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  try {
    await api.del(`/doctors/${id}`);
    showToast('Doctor deleted');
    renderDoctors();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

renderDoctors();

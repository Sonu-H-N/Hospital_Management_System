// ============================================================
//  MediCore HMS — Patients Page Logic (API-backed)
// ============================================================

let editId = null;
let currentPage = 1;
const perPage = 8;
let doctorsCache = [];

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

async function loadDoctorsForForm() {
  if (doctorsCache.length) return doctorsCache;
  const res = await api.get('/doctors');
  doctorsCache = res.data;
  return doctorsCache;
}

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { currentPage = 1; renderTable(); }, 300);
});

function filterPatients() { currentPage = 1; renderTable(); }

async function renderTable() {
  const tbody = document.getElementById('patientTableBody');
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-row"></div></td></tr>`.repeat(3);

  try {
    const res = await api.get('/patients', {
      page: currentPage,
      pageSize: perPage,
      q: document.getElementById('searchInput').value.trim() || undefined,
      status: document.getElementById('statusFilter').value || undefined,
      dept: document.getElementById('deptFilter').value || undefined,
    });

    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🧑‍⚕️</div><strong>No patients found</strong><p>Try adjusting your filters, or add a new patient.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = res.data.map(p => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="background:${avatarColor(p.name)}22;color:${avatarColor(p.name)}">${initials(p.name)}</div>
              <span>${escapeHtml(p.name)}</span>
            </div>
          </td>
          <td style="color:var(--text-muted);font-size:12px">${p.id}</td>
          <td>${p.age} / ${p.gender}</td>
          <td><span style="color:var(--accent-rose);font-weight:600">${p.blood_group || '—'}</span></td>
          <td>${escapeHtml(p.dept)}</td>
          <td style="font-size:12.5px;color:var(--text-secondary)">${escapeHtml(p.doctor || '—')}</td>
          <td style="font-size:12.5px;color:var(--text-muted)">${formatDate(p.admitted_on)}</td>
          <td><span class="badge-status badge-${p.status.toLowerCase()}">${p.status}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-secondary" onclick="viewPatient('${p.id}')">View</button>
              <button class="btn btn-sm btn-secondary" onclick="editPatient('${p.id}')">Edit</button>
              ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="deletePatient('${p.id}')">Del</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderPagination(res.pagination);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div></td></tr>`;
  }
}

function renderPagination(p) {
  const el = document.getElementById('pagination');
  el.innerHTML = '';
  if (p.totalPages <= 1) return;

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `Page ${p.page} of ${p.totalPages} (${p.total} total)`;
  el.appendChild(info);

  for (let i = 1; i <= p.totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm ' + (i === p.page ? 'btn-primary' : 'btn-secondary');
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    el.appendChild(btn);
  }
}

async function openAddModal() {
  editId = null;
  document.getElementById('modalTitle').textContent = 'Add New Patient';
  applyFieldErrors([]);
  ['fName','fAge','fPhone'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fGender').value = 'Male';
  document.getElementById('fBlood').value = 'A+';
  document.getElementById('fStatus').value = 'Active';
  await populateDoctorSelect();
  document.getElementById('modalOverlay').classList.add('open');
}

async function populateDoctorSelect(selectedId) {
  const doctors = await loadDoctorsForForm();
  const sel = document.getElementById('fDoctor');
  sel.innerHTML = '<option value="">— Unassigned —</option>' +
    doctors.map(d => `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('');
}

async function editPatient(id) {
  try {
    const { data: p } = await api.get(`/patients/${id}`);
    editId = id;
    applyFieldErrors([]);
    document.getElementById('modalTitle').textContent = 'Edit Patient';
    document.getElementById('fName').value = p.name;
    document.getElementById('fAge').value = p.age;
    document.getElementById('fGender').value = p.gender;
    document.getElementById('fBlood').value = p.blood_group || 'A+';
    document.getElementById('fPhone').value = p.phone || '';
    document.getElementById('fDept').value = p.dept;
    document.getElementById('fStatus').value = p.status;
    document.getElementById('fDate').value = p.admitted_on;
    await populateDoctorSelect(p.doctor_id);
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function savePatient() {
  applyFieldErrors([]);
  const btn = document.querySelector('#modalOverlay .btn-primary');
  const payload = {
    name: document.getElementById('fName').value.trim(),
    age: parseInt(document.getElementById('fAge').value) || 0,
    gender: document.getElementById('fGender').value,
    blood_group: document.getElementById('fBlood').value,
    phone: document.getElementById('fPhone').value.trim() || undefined,
    dept: document.getElementById('fDept').value,
    doctor_id: document.getElementById('fDoctor').value || undefined,
    status: document.getElementById('fStatus').value,
    admitted_on: document.getElementById('fDate').value || undefined,
  };

  btn.disabled = true;
  try {
    if (editId) {
      await api.put(`/patients/${editId}`, payload);
      showToast('Patient updated successfully');
    } else {
      await api.post('/patients', payload);
      showToast('Patient added successfully');
    }
    closeModal();
    renderTable();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deletePatient(id) {
  const ok = await confirmDialog({
    title: 'Delete this patient record?',
    message: `Patient ${id} and their history will be permanently removed. This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  try {
    await api.del(`/patients/${id}`);
    showToast('Patient deleted');
    renderTable();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function viewPatient(id) {
  try {
    const { data: p } = await api.get(`/patients/${id}`);
    const c = avatarColor(p.name);
    document.getElementById('viewContent').innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <div class="avatar" style="width:56px;height:56px;font-size:18px;background:${c}22;color:${c}">${initials(p.name)}</div>
        <div>
          <div style="font-size:20px;font-weight:600">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${p.id} · ${escapeHtml(p.dept)}</div>
        </div>
        <span class="badge-status badge-${p.status.toLowerCase()}" style="margin-left:auto">${p.status}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${[
          ['Age', p.age + ' years'],
          ['Gender', p.gender],
          ['Blood Group', p.blood_group || '—'],
          ['Phone', p.phone || '—'],
          ['Admitted', formatDate(p.admitted_on)],
          ['Doctor', p.doctor || 'Unassigned'],
        ].map(([k,v]) => `
          <div style="background:var(--bg-secondary);border-radius:8px;padding:12px">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${k}</div>
            <div style="font-size:14px;font-weight:500">${escapeHtml(String(v))}</div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('viewOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

if (new URLSearchParams(location.search).get('action') === 'new') openAddModal();

renderTable();

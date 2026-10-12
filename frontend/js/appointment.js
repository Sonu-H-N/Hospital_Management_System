// ============================================================
//  MediCore HMS — Appointments Page Logic (API-backed)
// ============================================================

let editId = null;
let patientsCache = [];
let doctorsCache = [];

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(render, 300);
});
document.getElementById('statusFilter').addEventListener('change', render);
document.getElementById('dateFilter').addEventListener('change', render);

async function render() {
  const tbody = document.getElementById('apptBody');
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-row"></div></td></tr>`.repeat(3);

  try {
    const res = await api.get('/appointments', {
      q: document.getElementById('searchInput').value.trim() || undefined,
      status: document.getElementById('statusFilter').value || undefined,
      date: document.getElementById('dateFilter').value || undefined,
    });

    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">📅</div><strong>No appointments found</strong><p>Try adjusting your filters, or book a new one.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(a => `
      <tr>
        <td style="color:var(--text-muted);font-size:12px">${a.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar" style="width:28px;height:28px;font-size:10px;background:${avatarColor(a.patient)}22;color:${avatarColor(a.patient)}">${initials(a.patient)}</div>
            ${escapeHtml(a.patient)}
          </div>
        </td>
        <td style="font-size:13px">${escapeHtml(a.doctor)}</td>
        <td style="font-size:12.5px;color:var(--text-muted)">${escapeHtml(a.dept)}</td>
        <td>${formatDate(a.appt_date)}</td>
        <td style="color:var(--accent-teal);font-weight:600">${a.appt_time}</td>
        <td><span style="font-size:12px;color:var(--text-secondary)">${a.type}</span></td>
        <td><span class="badge-status badge-${a.status.toLowerCase()}">${a.status}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="editAppt('${a.id}')">Edit</button>
            ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="deleteAppt('${a.id}')">Del</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div></td></tr>`;
  }
}

async function loadDropdownData() {
  if (!patientsCache.length) {
    const res = await api.get('/patients', { pageSize: 200 });
    patientsCache = res.data;
  }
  if (!doctorsCache.length) {
    const res = await api.get('/doctors');
    doctorsCache = res.data;
  }
}

function populateDropdowns() {
  document.getElementById('fPatient').innerHTML = patientsCache.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  document.getElementById('fDoctor').innerHTML = doctorsCache.map(d => `<option value="${d.id}" data-dept="${escapeHtml(d.dept)}">${escapeHtml(d.name)}</option>`).join('');
  autoDept();
}

function autoDept() {
  const sel = document.getElementById('fDoctor');
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('fDept').value = opt ? opt.dataset.dept : '';
}

async function openModal() {
  editId = null;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'Book Appointment';
  await loadDropdownData();
  populateDropdowns();
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fTime').value = '09:00';
  document.getElementById('fType').value = 'Consultation';
  document.getElementById('fStatus').value = 'Confirmed';
  document.getElementById('fNotes').value = '';
  document.getElementById('modalOverlay').classList.add('open');
}

async function editAppt(id) {
  try {
    await loadDropdownData();
    const res = await api.get('/appointments', {});
    const a = res.data.find(x => x.id === id);
    if (!a) return;
    editId = id;
    applyFieldErrors([]);
    document.getElementById('modalTitle').textContent = 'Edit Appointment';
    populateDropdowns();
    document.getElementById('fPatient').value = a.patient_id;
    document.getElementById('fDoctor').value = a.doctor_id;
    document.getElementById('fDate').value = a.appt_date;
    document.getElementById('fTime').value = a.appt_time;
    document.getElementById('fType').value = a.type;
    document.getElementById('fStatus').value = a.status;
    document.getElementById('fNotes').value = a.notes || '';
    document.getElementById('fDept').value = a.dept;
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function save() {
  applyFieldErrors([]);
  const payload = {
    patient_id: document.getElementById('fPatient').value,
    doctor_id: document.getElementById('fDoctor').value,
    dept: document.getElementById('fDept').value,
    appt_date: document.getElementById('fDate').value,
    appt_time: document.getElementById('fTime').value,
    type: document.getElementById('fType').value,
    status: document.getElementById('fStatus').value,
    notes: document.getElementById('fNotes').value.trim() || undefined,
  };

  try {
    if (editId) {
      await api.put(`/appointments/${editId}`, payload);
      showToast('Appointment updated');
    } else {
      await api.post('/appointments', payload);
      showToast('Appointment booked');
    }
    closeModal();
    render();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  }
}

async function deleteAppt(id) {
  const ok = await confirmDialog({
    title: 'Cancel this appointment?',
    message: `${id} will be permanently removed from the schedule.`,
    confirmLabel: 'Remove',
  });
  if (!ok) return;

  try {
    await api.del(`/appointments/${id}`);
    showToast('Appointment removed');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

if (new URLSearchParams(location.search).get('action') === 'new') openModal();
render();

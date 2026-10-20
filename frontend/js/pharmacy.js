// ============================================================
//  MediCore HMS — Pharmacy Page Logic (API-backed)
// ============================================================

let editId = null;
let activeMedId = null;
let patientsCache = [];

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(render, 300);
});

async function render() {
  const tbody = document.getElementById('medBody');
  tbody.innerHTML = `<tr><td colspan="9"><div class="skeleton-row"></div></td></tr>`.repeat(3);

  try {
    const res = await api.get('/pharmacy', {
      q: document.getElementById('searchInput').value.trim() || undefined,
      stock: document.getElementById('stockFilter').value || undefined,
    });

    let meds = res.data;
    const cat = document.getElementById('catFilter').value;
    if (cat) meds = meds.filter(m => m.category === cat);

    updateSummary(meds);

    if (!meds.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">💊</div><strong>No medicines found</strong><p>Try adjusting your filters, or add a new medicine.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = meds.map(m => {
      const low = m.stock <= m.min_stock;
      return `
        <tr>
          <td style="font-weight:500">${escapeHtml(m.name)}</td>
          <td style="color:var(--text-muted);font-size:12px">${m.id}</td>
          <td style="font-size:12.5px;color:var(--text-secondary)">${escapeHtml(m.category)}</td>
          <td style="font-weight:600;color:${low ? 'var(--accent-rose)' : 'var(--text-primary)'}">${m.stock}</td>
          <td style="color:var(--text-muted)">${m.min_stock}</td>
          <td>${formatCurrency(m.price)}</td>
          <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(m.unit)}</td>
          <td><span class="badge-status ${low ? 'badge-critical' : 'badge-active'}">${low ? 'Low Stock' : 'In Stock'}</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary" onclick="openDispense('${m.id}')">Dispense</button>
              <button class="btn btn-sm btn-secondary" onclick="openRestock('${m.id}')">Restock</button>
              <button class="btn btn-sm btn-secondary" onclick="editMed('${m.id}')">Edit</button>
              ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="deleteMed('${m.id}')">Del</button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div></td></tr>`;
  }
}

function updateSummary(meds) {
  document.getElementById('totalMeds').textContent = meds.length;
  document.getElementById('lowStock').textContent = meds.filter(m => m.stock <= m.min_stock).length;
  document.getElementById('totalCats').textContent = new Set(meds.map(m => m.category)).size;
  document.getElementById('invValue').textContent = formatCurrency(meds.reduce((s, m) => s + m.stock * m.price, 0));
}

function openModal() {
  editId = null;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'Add Medicine';
  ['fName','fStock','fMinStock','fPrice'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCat').value = 'Antibiotic';
  document.getElementById('fUnit').value = 'Strip';
  document.getElementById('modalOverlay').classList.add('open');
}

async function editMed(id) {
  try {
    const res = await api.get('/pharmacy', {});
    const m = res.data.find(x => x.id === id);
    if (!m) return;
    editId = id;
    applyFieldErrors([]);
    document.getElementById('modalTitle').textContent = 'Edit Medicine';
    document.getElementById('fName').value = m.name;
    document.getElementById('fCat').value = m.category;
    document.getElementById('fStock').value = m.stock;
    document.getElementById('fMinStock').value = m.min_stock;
    document.getElementById('fPrice').value = m.price;
    document.getElementById('fUnit').value = m.unit;
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function saveMed() {
  applyFieldErrors([]);
  const payload = {
    name: document.getElementById('fName').value.trim(),
    category: document.getElementById('fCat').value,
    stock: parseInt(document.getElementById('fStock').value) || 0,
    min_stock: parseInt(document.getElementById('fMinStock').value) || 0,
    price: parseFloat(document.getElementById('fPrice').value) || 0,
    unit: document.getElementById('fUnit').value,
  };

  try {
    if (editId) {
      await api.put(`/pharmacy/${editId}`, payload);
      showToast('Medicine updated');
    } else {
      await api.post('/pharmacy', payload);
      showToast('Medicine added');
    }
    closeModal();
    render();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  }
}

async function deleteMed(id) {
  const ok = await confirmDialog({
    title: 'Remove this medicine?',
    message: `${id} will be permanently removed from inventory.`,
    confirmLabel: 'Remove',
  });
  if (!ok) return;

  try {
    await api.del(`/pharmacy/${id}`);
    showToast('Medicine removed');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function loadPatients() {
  if (!patientsCache.length) {
    const res = await api.get('/patients', { pageSize: 200 });
    patientsCache = res.data;
  }
  return patientsCache;
}

async function openDispense(id) {
  const res = await api.get('/pharmacy', {});
  const m = res.data.find(x => x.id === id);
  if (!m) return;
  activeMedId = id;
  document.getElementById('dMedName').value = m.name;
  document.getElementById('dStock').value = m.stock + ' ' + m.unit + '(s) available';
  document.getElementById('dQty').value = '';
  const patients = await loadPatients();
  document.getElementById('dPatient').innerHTML = '<option value="">— Not linked to a patient —</option>' +
    patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  document.getElementById('dispenseOverlay').classList.add('open');
}

async function confirmDispense() {
  const qty = parseInt(document.getElementById('dQty').value);
  if (!qty || qty < 1) { showToast('Enter a valid quantity', 'error'); return; }

  try {
    await api.patch(`/pharmacy/${activeMedId}/dispense`, { quantity: qty });
    showToast(`Dispensed ${qty} unit(s)`);
    document.getElementById('dispenseOverlay').classList.remove('open');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function openRestock(id) {
  const res = await api.get('/pharmacy', {});
  const m = res.data.find(x => x.id === id);
  if (!m) return;
  activeMedId = id;
  document.getElementById('rMedName').value = m.name;
  document.getElementById('rStock').value = m.stock + ' ' + m.unit + '(s) in stock';
  document.getElementById('rQty').value = '';
  document.getElementById('restockOverlay').classList.add('open');
}

async function confirmRestock() {
  const qty = parseInt(document.getElementById('rQty').value);
  if (!qty || qty < 1) { showToast('Enter a valid quantity', 'error'); return; }

  try {
    await api.patch(`/pharmacy/${activeMedId}/restock`, { quantity: qty });
    showToast(`Added ${qty} unit(s) to stock`);
    document.getElementById('restockOverlay').classList.remove('open');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

render();

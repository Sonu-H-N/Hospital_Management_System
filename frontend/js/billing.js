// ============================================================
//  MediCore HMS — Billing Page Logic (API-backed)
// ============================================================

let editId = null;
let patientsCache = [];

document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function calcTotal() {
  const rows = document.querySelectorAll('.bill-item-row');
  let total = 0;
  rows.forEach(r => { total += parseFloat(r.querySelector('.item-fee').value) || 0; });
  document.getElementById('billTotal').textContent = formatCurrency(total);
}

function addItem(name = '', fee = '') {
  const row = document.createElement('div');
  row.className = 'bill-item-row';
  row.innerHTML = `
    <input class="form-control item-name" placeholder="Item name" value="${escapeHtml(name)}" oninput="calcTotal()"/>
    <input class="form-control item-fee" type="number" placeholder="₹" value="${fee}" oninput="calcTotal()"/>
    <button onclick="this.parentElement.remove();calcTotal()" style="background:var(--accent-rose-dim);border:none;border-radius:6px;color:var(--accent-rose);width:32px;height:36px;cursor:pointer;font-size:14px">✕</button>
  `;
  document.getElementById('billItems').appendChild(row);
  calcTotal();
}

function getBillTotal(bill) { return bill.items.reduce((s, i) => s + i.fee, 0); }

let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(render, 300);
});
document.getElementById('paidFilter').addEventListener('change', render);

async function render() {
  const tbody = document.getElementById('billBody');
  tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton-row"></div></td></tr>`.repeat(3);

  try {
    const paidVal = document.getElementById('paidFilter').value;
    const res = await api.get('/billing', {
      q: document.getElementById('searchInput').value.trim() || undefined,
      paid: paidVal === '' ? undefined : (paidVal === 'paid' ? 'true' : 'false'),
    });

    updateSummary(res.data);

    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">🧾</div><strong>No bills found</strong><p>Try adjusting your filters, or create a new bill.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(b => {
      const total = getBillTotal(b);
      return `
        <tr>
          <td style="color:var(--text-muted);font-size:12px">${b.id}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="avatar" style="width:28px;height:28px;font-size:10px;background:${avatarColor(b.patient)}22;color:${avatarColor(b.patient)}">${initials(b.patient)}</div>
            ${escapeHtml(b.patient)}</div></td>
          <td>${formatDate(b.bill_date)}</td>
          <td style="font-size:12px;color:var(--text-muted)">${b.items.length} item${b.items.length !== 1 ? 's' : ''}</td>
          <td style="font-weight:600;color:var(--accent-teal)">${formatCurrency(total)}</td>
          <td><span class="badge-status ${b.paid ? 'badge-active' : 'badge-pending'}">${b.paid ? 'Paid' : 'Pending'}</span></td>
          <td style="font-size:12px;color:var(--text-muted)">${b.pay_mode || '—'}</td>
          <td><div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="viewInvoice('${b.id}')">Invoice</button>
            <button class="btn btn-sm btn-secondary" onclick="editBill('${b.id}')">Edit</button>
            ${isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="deleteBill('${b.id}')">Del</button>` : ''}
          </div></td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">⚠️</div><p>${apiErrorMessage(err)}</p></div></td></tr>`;
  }
}

function updateSummary(bills) {
  const paid = bills.filter(b => b.paid).reduce((s, b) => s + getBillTotal(b), 0);
  const unpaid = bills.filter(b => !b.paid).reduce((s, b) => s + getBillTotal(b), 0);
  document.getElementById('totalRev').textContent = formatCurrency(paid);
  document.getElementById('pendingRev').textContent = formatCurrency(unpaid);
  document.getElementById('totalBills').textContent = bills.length;
}

async function loadPatients() {
  if (!patientsCache.length) {
    const res = await api.get('/patients', { pageSize: 200 });
    patientsCache = res.data;
  }
  return patientsCache;
}

async function openModal() {
  editId = null;
  applyFieldErrors([]);
  document.getElementById('modalTitle').textContent = 'New Bill';
  const patients = await loadPatients();
  document.getElementById('fPatient').innerHTML = patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('billItems').innerHTML = '';
  document.getElementById('fPaid').value = 'false';
  document.getElementById('fPayMode').value = '';
  addItem('Consultation', '');
  calcTotal();
  document.getElementById('modalOverlay').classList.add('open');
}

async function editBill(id) {
  try {
    const res = await api.get('/billing', {});
    const b = res.data.find(x => x.id === id);
    if (!b) return;
    editId = id;
    applyFieldErrors([]);
    const patients = await loadPatients();
    document.getElementById('modalTitle').textContent = 'Edit Bill';
    document.getElementById('fPatient').innerHTML = patients.map(p => `<option value="${p.id}" ${p.id === b.patient_id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
    document.getElementById('fDate').value = b.bill_date;
    document.getElementById('billItems').innerHTML = '';
    b.items.forEach(i => addItem(i.name, i.fee));
    document.getElementById('fPaid').value = String(b.paid);
    document.getElementById('fPayMode').value = b.pay_mode || '';
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function saveBill() {
  applyFieldErrors([]);
  const rows = document.querySelectorAll('.bill-item-row');
  const items = Array.from(rows)
    .map(r => ({ name: r.querySelector('.item-name').value.trim(), fee: parseFloat(r.querySelector('.item-fee').value) || 0 }))
    .filter(i => i.name);

  if (!items.length) { showToast('Add at least one item', 'error'); return; }

  const paid = document.getElementById('fPaid').value === 'true';
  const payload = {
    patient_id: document.getElementById('fPatient').value,
    bill_date: document.getElementById('fDate').value,
    items, paid,
    pay_mode: paid ? document.getElementById('fPayMode').value || undefined : undefined,
  };

  try {
    if (editId) {
      await api.put(`/billing/${editId}`, payload);
      showToast('Bill updated');
    } else {
      await api.post('/billing', payload);
      showToast('Bill created');
    }
    closeModal();
    render();
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    showToast(apiErrorMessage(err), 'error');
  }
}

async function deleteBill(id) {
  const ok = await confirmDialog({
    title: 'Delete this bill?',
    message: `${id} will be permanently removed.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  try {
    await api.del(`/billing/${id}`);
    showToast('Bill deleted');
    render();
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

async function viewInvoice(id) {
  try {
    const res = await api.get('/billing', {});
    const b = res.data.find(x => x.id === id);
    if (!b) return;
    const total = getBillTotal(b);
    document.getElementById('invoiceContent').innerHTML = `
      <div class="inv-header">
        <div>
          <div class="inv-title">INVOICE</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${b.id}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600;font-size:15px">MediCore Hospital</div>
          <div style="font-size:12px;color:var(--text-muted)">Bengaluru, Karnataka</div>
          <div style="font-size:12px;color:var(--text-muted)">GSTIN: 29ABCDE1234F1Z5</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:4px">Billed To</div>
          <div style="font-weight:600">${escapeHtml(b.patient)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${b.patient_id}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:4px">Invoice Date</div>
          <div style="font-weight:600">${formatDate(b.bill_date)}</div>
          <span class="badge-status ${b.paid ? 'badge-active' : 'badge-pending'}" style="margin-top:6px;display:inline-block">${b.paid ? 'PAID' : 'PENDING'}</span>
        </div>
      </div>
      <table class="inv-table">
        <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${b.items.map((item, i) => `<tr><td style="color:var(--text-muted)">${i+1}</td><td>${escapeHtml(item.name)}</td><td style="text-align:right;font-weight:500">${formatCurrency(item.fee)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="inv-total">Total: ${formatCurrency(total)}</div>
      ${b.paid ? `<div style="font-size:12px;color:var(--text-muted);text-align:right;margin-top:4px">Paid via ${b.pay_mode || '—'}</div>` : ''}
    `;
    document.getElementById('invoiceOverlay').classList.add('open');
  } catch (err) {
    showToast(apiErrorMessage(err), 'error');
  }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

if (new URLSearchParams(location.search).get('action') === 'new') openModal();
render();

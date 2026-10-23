// ui.js — shared formatting, toast, and modal helpers (global, non-module
// to match the rest of this codebase's plain-script convention).

function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = (type === "success" ? "✓ " : type === "error" ? "✕ " : "") + msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/** Promise-based confirm dialog for destructive actions — replaces window.confirm(). */
function confirmDialog({ title = "Are you sure?", message = "", confirmLabel = "Confirm" } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal" style="width:400px">
        <div class="modal-header"><h3>${title}</h3></div>
        <p style="color:var(--text-secondary);font-size:13.5px;margin-bottom:22px">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-act="cancel">Cancel</button>
          <button class="btn btn-danger" data-act="confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const cleanup = result => { overlay.remove(); resolve(result); };
    overlay.addEventListener("click", e => {
      if (e.target === overlay) cleanup(false);
      const act = e.target.dataset?.act;
      if (act === "confirm") cleanup(true);
      if (act === "cancel") cleanup(false);
    });
  });
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(n) {
  return "₹ " + Number(n || 0).toLocaleString("en-IN");
}

function avatarColor(name) {
  const colors = ["#00d4aa", "#ff5e7e", "#ffb547", "#a78bfa", "#4da6ff", "#f97316", "#06b6d4", "#8b5cf6"];
  let h = 0;
  for (const c of (name || "")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}

function initials(name) {
  return (name || "??").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/** Applies field-level error messages returned by the API's validation details. */
function applyFieldErrors(details = []) {
  document.querySelectorAll(".field-error").forEach(el => (el.textContent = ""));
  details.forEach(({ field, message }) => {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = message;
  });
}

function apiErrorMessage(err) {
  return err && err.message ? err.message : "Something went wrong. Please try again.";
}

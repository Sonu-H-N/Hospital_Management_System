// auth-guard.js — included (after config.js + api.js) on every protected
// page. Redirects to login if there's no session, fills in the sidebar
// user chip, hides Admin-only controls for other roles, and wires logout.

(function () {
  if (!isLoggedIn()) {
    const inPagesDir = location.pathname.includes("/pages/");
    window.location.href = inPagesDir ? "../login.html" : "login.html";
    return;
  }

  const user = getUser();

  document.addEventListener("DOMContentLoaded", () => {
    const nameEl = document.querySelector(".sidebar-user .user-name");
    const roleEl = document.querySelector(".sidebar-user .user-role");
    const avatarEl = document.querySelector(".sidebar-user .user-avatar");
    if (user) {
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role;
      if (avatarEl) avatarEl.textContent = initials(user.name);
    }

    // Hide elements marked admin-only (e.g. delete buttons, doctor roster
    // edit controls) for any role other than Admin.
    if (!user || user.role !== "Admin") {
      document.querySelectorAll("[data-admin-only]").forEach(el => el.remove());
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearSession();
        const inPagesDir = location.pathname.includes("/pages/");
        window.location.href = inPagesDir ? "../login.html" : "login.html";
      });
    }
  });
})();

function isAdmin() {
  const u = getUser();
  return u && u.role === "Admin";
}

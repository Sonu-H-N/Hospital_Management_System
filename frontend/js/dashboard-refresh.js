// Refresh dashboard data on demand without navigating away.
const refreshButton = document.getElementById('dashboardRefresh');

refreshButton.addEventListener('click', async () => {
  if (refreshButton.disabled) return;

  refreshButton.disabled = true;
  refreshButton.setAttribute('aria-busy', 'true');
  refreshButton.textContent = '↻ Refreshing…';

  try {
    await loadDashboard();
  } finally {
    refreshButton.disabled = false;
    refreshButton.removeAttribute('aria-busy');
    refreshButton.textContent = '↻ Refresh';
  }
});

// config.js — loaded first on every page so window.__API_BASE__ is set
// before api.js evaluates. Change the localhost port if your backend
// runs elsewhere.
window.__API_BASE__ = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4100/api"
  : `${window.location.origin}/api`;

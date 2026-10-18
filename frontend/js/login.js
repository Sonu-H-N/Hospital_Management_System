if (isLoggedIn()) window.location.href = "index.html";

const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.classList.remove("show");
  applyFieldErrors([]);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  try {
    const { token, user } = await api.post("/auth/login", { email, password });
    setSession(token, user);
    window.location.href = "index.html";
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    formError.textContent = apiErrorMessage(err);
    formError.classList.add("show");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});

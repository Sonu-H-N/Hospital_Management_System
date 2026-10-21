if (isLoggedIn()) window.location.href = "index.html";

const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.classList.remove("show");
  applyFieldErrors([]);

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const role = document.getElementById("role").value;
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  try {
    const { token, user } = await api.post("/auth/register", { name, email, role, password });
    setSession(token, user);
    window.location.href = "index.html";
  } catch (err) {
    if (err.details) applyFieldErrors(err.details);
    formError.textContent = apiErrorMessage(err);
    formError.classList.add("show");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});

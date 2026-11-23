// Shared, authenticated staff assistant. Conversation stays in memory only.
(function () {
  const history = [];
  let busy = false;

  const launcher = document.createElement("button");
  launcher.className = "assistant-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open MediCore Assistant");
  launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<span aria-hidden="true">✦</span><span class="assistant-launcher-label">Ask AI</span>';

  const panel = document.createElement("section");
  panel.className = "assistant-panel";
  panel.setAttribute("aria-label", "MediCore Assistant chat");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="assistant-header">
      <div class="assistant-brand"><span class="assistant-mark" aria-hidden="true">✦</span><div><strong>MediCore Assistant</strong><small>Staff help · AI generated</small></div></div>
      <button class="assistant-close" type="button" aria-label="Close assistant">×</button>
    </header>
    <div class="assistant-notice">Administrative help only. Do not share patient information. Not for medical advice or emergencies.</div>
    <div class="assistant-messages" role="log" aria-live="polite" aria-relevant="additions text">
      <div class="assistant-message assistant-message-bot">Hi! I can help with general questions about using MediCore. What would you like to know?</div>
    </div>
    <div class="assistant-suggestions" aria-label="Suggested questions">
      <button type="button">How do I book an appointment?</button>
      <button type="button">Where can I see low-stock medicines?</button>
    </div>
    <form class="assistant-form">
      <label class="assistant-sr-only" for="assistant-input">Message the assistant</label>
      <textarea id="assistant-input" rows="1" maxlength="2000" placeholder="Ask a general app question…" required></textarea>
      <button class="assistant-send" type="submit" aria-label="Send message">➤</button>
    </form>
    <div class="assistant-status" role="status"></div>`;

  document.body.append(launcher, panel);

  const messagesEl = panel.querySelector(".assistant-messages");
  const form = panel.querySelector(".assistant-form");
  const input = panel.querySelector("#assistant-input");
  const sendButton = panel.querySelector(".assistant-send");
  const status = panel.querySelector(".assistant-status");

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close MediCore Assistant" : "Open MediCore Assistant");
    if (open) input.focus();
  }

  function addMessage(text, kind) {
    const bubble = document.createElement("div");
    bubble.className = `assistant-message assistant-message-${kind}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    input.disabled = value;
    panel.classList.toggle("assistant-busy", value);
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  panel.querySelector(".assistant-close").addEventListener("click", () => setOpen(false));

  panel.querySelectorAll(".assistant-suggestions button").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.textContent;
      form.requestSubmit();
    });
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;

    history.push({ role: "user", content: text });
    addMessage(text, "user");
    input.value = "";
    status.textContent = "";
    setBusy(true);
    const loading = addMessage("Thinking…", "bot");
    loading.classList.add("assistant-typing");

    try {
      const result = await api.post("/chatbot", { messages: history.slice(-12) });
      loading.remove();
      const reply = typeof result?.reply === "string" ? result.reply : "I couldn't provide a response. Please try again.";
      history.push({ role: "assistant", content: reply });
      addMessage(reply, "bot");
    } catch (error) {
      loading.remove();
      // Keep the failed question out of the next conversation request.
      history.pop();
      status.textContent = error.message || "The assistant is unavailable. Please try again.";
    } finally {
      setBusy(false);
      input.focus();
    }
  });
})();

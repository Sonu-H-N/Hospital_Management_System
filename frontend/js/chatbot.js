// Shared, authenticated staff assistant. Conversation stays in memory only.
(function () {
  const history = [];
  let busy = false;

  const languages = {
    en: {
      name: "English", launcher: "Ask AI", open: "Open MediCore Assistant", closeAssistant: "Close MediCore Assistant",
      title: "MediCore Assistant", subtitle: "Staff help · AI generated",
      notice: "Administrative help only. Do not share patient information. Not for medical advice or emergencies.",
      greeting: "Hi! I can help with general questions about using MediCore. What would you like to know?",
      suggestions: ["How do I book an appointment?", "Where can I see low-stock medicines?"],
      inputLabel: "Message the assistant", placeholder: "Ask a general app question…", send: "Send message",
      thinking: "Thinking…", fallback: "I couldn't provide a response. Please try again.", error: "The assistant is unavailable. Please try again.", languageLabel: "Response language"
    },
    hi: {
      name: "हिन्दी", launcher: "AI से पूछें", open: "MediCore सहायक खोलें", closeAssistant: "MediCore सहायक बंद करें",
      title: "MediCore सहायक", subtitle: "स्टाफ सहायता · AI द्वारा निर्मित",
      notice: "केवल प्रशासनिक सहायता। मरीज की जानकारी साझा न करें। चिकित्सा सलाह या आपातकालीन स्थिति के लिए नहीं।",
      greeting: "नमस्ते! मैं MediCore का उपयोग करने से जुड़े सामान्य सवालों में मदद कर सकता हूँ। आप क्या जानना चाहेंगे?",
      suggestions: ["अपॉइंटमेंट कैसे बुक करें?", "कम स्टॉक वाली दवाएँ कहाँ देखें?"],
      inputLabel: "सहायक को संदेश भेजें", placeholder: "ऐप के बारे में सामान्य सवाल पूछें…", send: "संदेश भेजें",
      thinking: "सोच रहा हूँ…", fallback: "मैं जवाब नहीं दे पाया। कृपया फिर कोशिश करें।", error: "सहायक अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।", languageLabel: "जवाब की भाषा"
    },
    kn: {
      name: "ಕನ್ನಡ", launcher: "AI ಕೇಳಿ", open: "MediCore ಸಹಾಯಕ ತೆರೆಯಿರಿ", closeAssistant: "MediCore ಸಹಾಯಕ ಮುಚ್ಚಿ",
      title: "MediCore ಸಹಾಯಕ", subtitle: "ಸಿಬ್ಬಂದಿ ಸಹಾಯ · AI ರಚಿಸಿದ",
      notice: "ಆಡಳಿತಾತ್ಮಕ ಸಹಾಯ ಮಾತ್ರ. ರೋಗಿಯ ಮಾಹಿತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ವೈದ್ಯಕೀಯ ಸಲಹೆ ಅಥವಾ ತುರ್ತು ಪರಿಸ್ಥಿತಿಗಳಿಗೆ ಅಲ್ಲ.",
      greeting: "ನಮಸ್ಕಾರ! MediCore ಬಳಸುವ ಕುರಿತು ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನು ಸಹಾಯ ಮಾಡಬಹುದು. ನಿಮಗೆ ಏನು ತಿಳಿಯಬೇಕು?",
      suggestions: ["ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ಹೇಗೆ ಬುಕ್ ಮಾಡುವುದು?", "ಕಡಿಮೆ ಸ್ಟಾಕ್ ಔಷಧಿಗಳನ್ನು ಎಲ್ಲಿ ನೋಡಬಹುದು?"],
      inputLabel: "ಸಹಾಯಕರಿಗೆ ಸಂದೇಶ", placeholder: "ಆ್ಯಪ್ ಕುರಿತು ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆ ಕೇಳಿ…", send: "ಸಂದೇಶ ಕಳುಹಿಸಿ",
      thinking: "ಯೋಚಿಸುತ್ತಿದೆ…", fallback: "ಉತ್ತರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", error: "ಸಹಾಯಕ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", languageLabel: "ಉತ್ತರದ ಭಾಷೆ"
    },
    es: {
      name: "Español", launcher: "Preguntar a IA", open: "Abrir el asistente de MediCore", closeAssistant: "Cerrar el asistente de MediCore",
      title: "Asistente de MediCore", subtitle: "Ayuda al personal · Generado por IA",
      notice: "Solo ayuda administrativa. No compartas información de pacientes. No ofrece consejos médicos ni atiende emergencias.",
      greeting: "¡Hola! Puedo ayudarte con preguntas generales sobre el uso de MediCore. ¿Qué te gustaría saber?",
      suggestions: ["¿Cómo reservo una cita?", "¿Dónde puedo ver los medicamentos con poco stock?"],
      inputLabel: "Enviar un mensaje al asistente", placeholder: "Pregunta algo general sobre la aplicación…", send: "Enviar mensaje",
      thinking: "Pensando…", fallback: "No pude responder. Inténtalo de nuevo.", error: "El asistente no está disponible. Inténtalo de nuevo.", languageLabel: "Idioma de respuesta"
    },
    fr: {
      name: "Français", launcher: "Demander à l’IA", open: "Ouvrir l’assistant MediCore", closeAssistant: "Fermer l’assistant MediCore",
      title: "Assistant MediCore", subtitle: "Aide au personnel · Généré par l’IA",
      notice: "Aide administrative uniquement. Ne partagez pas d’informations sur les patients. Pas de conseil médical ni d’assistance d’urgence.",
      greeting: "Bonjour ! Je peux répondre aux questions générales sur l’utilisation de MediCore. Que souhaitez-vous savoir ?",
      suggestions: ["Comment prendre un rendez-vous ?", "Où voir les médicaments en stock faible ?"],
      inputLabel: "Écrire à l’assistant", placeholder: "Posez une question générale sur l’application…", send: "Envoyer le message",
      thinking: "Réflexion en cours…", fallback: "Je n’ai pas pu répondre. Veuillez réessayer.", error: "L’assistant est indisponible. Veuillez réessayer.", languageLabel: "Langue de réponse"
    }
  };

  let language = localStorage.getItem("medicore-assistant-language") || "en";
  if (!languages[language]) language = "en";

  const launcher = document.createElement("button");
  launcher.className = "assistant-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", languages[language].open);
  launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<span aria-hidden="true">✦</span><span class="assistant-launcher-label"></span>';

  const panel = document.createElement("section");
  panel.className = "assistant-panel";
  panel.setAttribute("aria-label", "MediCore Assistant chat");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="assistant-header">
      <div class="assistant-brand"><span class="assistant-mark" aria-hidden="true">✦</span><div><strong class="assistant-title"></strong><small class="assistant-subtitle"></small></div></div>
      <div class="assistant-header-actions">
        <label class="assistant-language-label" for="assistant-language"></label>
        <select class="assistant-language" id="assistant-language" aria-label="Response language">
          ${Object.entries(languages).map(([code, value]) => `<option value="${code}">${value.name}</option>`).join("")}
        </select>
        <button class="assistant-close" type="button" aria-label="Close assistant">×</button>
      </div>
    </header>
    <div class="assistant-notice"></div>
    <div class="assistant-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
    <div class="assistant-suggestions" aria-label="Suggested questions"></div>
    <form class="assistant-form">
      <label class="assistant-sr-only" for="assistant-input"></label>
      <textarea id="assistant-input" rows="1" maxlength="2000" required></textarea>
      <button class="assistant-send" type="submit" aria-label="Send message">➤</button>
    </form>
    <div class="assistant-status" role="status"></div>`;

  document.body.append(launcher, panel);

  const messagesEl = panel.querySelector(".assistant-messages");
  const form = panel.querySelector(".assistant-form");
  const input = panel.querySelector("#assistant-input");
  const sendButton = panel.querySelector(".assistant-send");
  const status = panel.querySelector(".assistant-status");
  const languageSelect = panel.querySelector("#assistant-language");

  function renderLanguage() {
    const text = languages[language];
    launcher.querySelector(".assistant-launcher-label").textContent = text.launcher;
    launcher.setAttribute("aria-label", panel.hidden ? text.open : text.closeAssistant);
    panel.querySelector(".assistant-title").textContent = text.title;
    panel.querySelector(".assistant-subtitle").textContent = text.subtitle;
    panel.querySelector(".assistant-language-label").textContent = text.languageLabel;
    languageSelect.setAttribute("aria-label", text.languageLabel);
    panel.querySelector(".assistant-close").setAttribute("aria-label", text.closeAssistant);
    panel.querySelector(".assistant-notice").textContent = text.notice;
    panel.querySelector(".assistant-sr-only").textContent = text.inputLabel;
    input.placeholder = text.placeholder;
    sendButton.setAttribute("aria-label", text.send);
    const suggestions = panel.querySelector(".assistant-suggestions");
    suggestions.setAttribute("aria-label", text.languageLabel);
    suggestions.replaceChildren(...text.suggestions.map(question => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", () => {
        input.value = question;
        form.requestSubmit();
      });
      return button;
    }));
    if (!messagesEl.childElementCount) addMessage(text.greeting, "bot");
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? languages[language].closeAssistant : languages[language].open);
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
    languageSelect.disabled = value;
    panel.classList.toggle("assistant-busy", value);
  }

  languageSelect.value = language;
  renderLanguage();
  languageSelect.addEventListener("change", () => {
    language = languageSelect.value;
    localStorage.setItem("medicore-assistant-language", language);
    renderLanguage();
  });

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  panel.querySelector(".assistant-close").addEventListener("click", () => setOpen(false));

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
    const loading = addMessage(languages[language].thinking, "bot");
    loading.classList.add("assistant-typing");

    try {
      const messages = history.slice(-12).map(message => ({ ...message }));
      const languageName = languages[language].name;
      messages[messages.length - 1].content += `\n\nPlease respond in ${languageName}. Keep the response concise and follow the assistant's existing safety instructions.`;
      const result = await api.post("/chatbot", { messages });
      loading.remove();
      const reply = typeof result?.reply === "string" ? result.reply : languages[language].fallback;
      history.push({ role: "assistant", content: reply });
      addMessage(reply, "bot");
    } catch (error) {
      loading.remove();
      // Keep the failed question out of the next conversation request.
      history.pop();
      status.textContent = error.message || languages[language].error;
    } finally {
      setBusy(false);
      input.focus();
    }
  });
})();

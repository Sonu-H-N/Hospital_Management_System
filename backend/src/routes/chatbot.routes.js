const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Chat limit reached. Please try again in a few minutes." },
});

router.use(requireAuth);
router.use(chatLimiter);

router.post("/", async (req, res) => {
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
    return res.status(400).json({ error: "Send between 1 and 12 recent messages." });
  }

  const validMessages = messages.every(message =>
    message &&
    ["user", "assistant"].includes(message.role) &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 2000
  );
  if (!validMessages || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Chat messages are invalid or too long." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "The assistant is not configured yet. Ask an administrator to add OPENAI_API_KEY." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: "You are MediCore Assistant, a concise helper for hospital staff using the MediCore Hospital Management System. Help with navigating the app and general, non-clinical administrative workflows. You do not have access to hospital records. Never claim to look up or change patient, appointment, billing, inventory, or staff data. Do not provide diagnoses, medical advice, treatment recommendations, medication dosing, or clinical triage; direct clinical questions to a qualified clinician and emergencies to local emergency services immediately. Remind users not to share patient names, identifiers, health records, or other confidential information. If asked something outside these boundaries, say so briefly and offer safe administrative help. Be clear that your responses can be inaccurate and must be verified."
          },
          ...messages.map(({ role, content }) => ({ role, content: content.trim() })),
        ],
      }),
    });

    if (!response.ok) {
      // Do not expose provider response bodies, which may contain sensitive details.
      console.error(`Chat provider returned HTTP ${response.status}`);
      return res.status(502).json({ error: "The assistant could not respond right now. Please try again." });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "The assistant returned an empty response. Please try again." });
    return res.json({ reply });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The assistant took too long to respond. Please try again." });
    }
    console.error("Chat provider request failed:", error.message);
    return res.status(502).json({ error: "The assistant could not respond right now. Please try again." });
  } finally {
    clearTimeout(timeout);
  }
});

module.exports = router;

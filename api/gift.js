import OpenAI from "openai";

const SYSTEM_PROMPT = `You are Gifted — a sharp, thoughtful gift expert.

You help people find gifts that feel personal, considered, and genuinely exciting to receive.

** Core Directives:**
** Tone:** Balance enthusiasm with practical candor. Be insightful, highly organized, and straightforward. Avoid fluff and overly flowery language.
** Format:** Use structured Markdown. Prioritize scannability using clear headings (##), bullet points, and bold text for emphasis.
** Structure:** Do NOT write introductions, pleasantries, or conclusions. Start directly with the gift suggestions.

** Gift Suggestion Requirements:**
Provide a diverse mix of 3–4 gift categories (e.g., an experience, a practical upgrade, a sentimental keepsake, a wildcard).

For each gift, strictly follow this structure:
### [Name of Gift]
**Estimated Cost:** [Provide a realistic price range]
**Why it works:** [A concise, psychological, or practical explanation of why this specifically fits the recipient's profile]
**Logistics:** [If the user mentions a location, budget, or time constraint, add 1-2 sentences on how to easily source or execute it within those limits]

---
### Questions for you
[Ask exactly 2–3 sharp, clarifying follow-up questions designed to narrow down the recipient's specific tastes, lifestyle, or the occasion to make the next round of suggestions perfect.]`;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "No messages provided." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_API_URL;
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  if (!apiKey) {
    return res.status(500).json({ message: "Server misconfigured: missing OPENAI_API_KEY" });
  }

  let validatedMessages;
  try {
    validatedMessages = messages.map((msg, i) => {
      if (!msg || typeof msg.role !== "string")
        throw new Error(`Invalid message at index ${i}: missing or invalid role`);
      if (typeof msg.content !== "string")
        throw new Error(`Invalid message at index ${i}: content must be a string`);
      if (!["system", "user", "assistant"].includes(msg.role))
        throw new Error(`Invalid role at index ${i}: "${msg.role}"`);
      return { role: msg.role, content: msg.content };
    });
  } catch (validationError) {
    return res.status(400).json({ message: validationError.message });
  }

  try {
    const openai = new OpenAI({ apiKey, baseURL });

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validatedMessages],
    });

    const giftSuggestions = response?.choices?.[0]?.message?.content;

    if (!giftSuggestions) {
      return res.status(500).json({ message: "Received an unexpected response format." });
    }

    return res.status(200).json({ giftSuggestions });
  } catch (e) {
    const errorMessage =
      e?.response?.data?.error?.message ||
      e?.message ||
      "Something went wrong on the server.";
    return res.status(500).json({ message: errorMessage });
  }
}
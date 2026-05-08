import fs from "node:fs";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_AI_API_KEY;
const openaiBaseUrl = process.env.OPENAI_API_URL || process.env.VITE_AI_API_URL;
const openaiModel = process.env.OPENAI_MODEL || process.env.VITE_AI_MODEL;

if (!openaiApiKey) console.error("Missing API key. Set OPENAI_API_KEY or VITE_AI_API_KEY in .env");
if (!openaiModel) console.error("Missing model. Set OPENAI_MODEL or VITE_AI_MODEL in .env");

const openai = new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl });

const LOG_PATH = new URL("./server-error.log", import.meta.url).pathname;

function logServerError(error) {
    const entry = `[${new Date().toISOString()}] ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}\n`;
    fs.appendFileSync(LOG_PATH, entry, "utf8");
}

const SYSTEM_PROMPT = `You are Gifted — a sharp, thoughtful gift expert.

You help people find gifts that feel personal, considered, and genuinely exciting to receive.
Your output must be in structured Markdown.
Do not write introductions or conclusions.
Start directly with the gift suggestions.

Each gift must:
- Have a clear heading
- Include a short, specific explanation of why it works for this person

If the user mentions a location, situation, budget, or time constraint,
adapt the ideas accordingly and add a brief section under each gift
on how to get it given those constraints.

After the gift ideas, include a section titled "Questions for you"
with 2–3 sharp clarifying questions that would make the next round
of suggestions even better.`;

app.post("/api/gift", async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "No messages provided." });
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
        console.error("Payload validation error:", validationError.message);
        return res.status(400).json({ message: validationError.message });
    }

    if (!openaiApiKey || !openaiModel) {
        const missing = [
            !openaiApiKey && "OPENAI_API_KEY",
            !openaiModel && "OPENAI_MODEL",
        ].filter(Boolean);
        return res.status(500).json({ message: `Server misconfigured: missing ${missing.join(", ")}` });
    }

    try {
        const response = await openai.chat.completions.create({
            model: openaiModel,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validatedMessages],
        });

        const giftSuggestions = response?.choices?.[0]?.message?.content;
        if (!giftSuggestions) {
            console.error("Unexpected OpenAI response:", response);
            return res.status(500).json({ message: "Received an unexpected response format." });
        }

        res.json({ giftSuggestions });
    } catch (e) {
        console.error("OpenAI request failed:", e);
        logServerError(e);
        const errorMessage =
            e?.response?.data?.error?.message ||
            e?.message ||
            "Something went wrong on the server.";
        res.status(500).json({ message: errorMessage });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gifted server running at http://localhost:${PORT}`));
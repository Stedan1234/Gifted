import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from dist directory in production
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

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

** Core Directives:**
** Tone:** Balance enthusiasm with practical candor.Be insightful, highly organized, and straightforward.Avoid fluff and overly flowery language.
** Format:** Use structured Markdown.Prioritize scannability using clear headings (##), bullet points, and bold text for emphasis.
** Structure:** Do NOT write introductions, pleasantries, or conclusions.Start directly with the gift suggestions.

** Gift Suggestion Requirements:**
    Provide a diverse mix of 3–4 gift categories(e.g., an experience, a practical upgrade, a sentimental keepsake, a wildcard). 

For each gift, strictly follow this structure:
###[Name of Gift]
  ** Estimated Cost:** [Provide a realistic price range]
    ** Why it works:** [A concise, psychological, or practical explanation of why this specifically fits the recipient's profile]
        ** Logistics:** [If the user mentions a location, budget, or time constraint, add 1 - 2 sentences on how to easily source or execute it within those limits]

---
### Questions for you
[Ask exactly 2–3 sharp, clarifying follow - up questions designed to narrow down the recipient's specific tastes, lifestyle, or the occasion to make the next round of suggestions perfect.]`;

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

// Serve index.html for all non-API routes (client-side routing)
app.use((req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ message: "Not found" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gifted server running at http://localhost:${PORT}`));

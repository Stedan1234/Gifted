import { marked } from "marked";
import DOMPurify from "dompurify";
import { autoResizeTextarea, setLoading, showStream, toggleTheme } from "./utils.js";

// UI elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContent = document.getElementById("output-content");
const themeToggle = document.getElementById("theme-toggle");

// Maintain conversation history on the client
const conversationHistory = [];

function start() {
    // Auto-resize textarea as user types
    userInput.addEventListener("input", () => autoResizeTextarea(userInput));

    // Enter to send, Shift+Enter for newline
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleGiftRequest();
        }
    });

    // Theme toggle
    themeToggle.addEventListener("click", toggleTheme);

    // Focus textarea on load
    userInput.focus();
}

function appendMessage(role, html) {
    const bubble = document.createElement("div");
    bubble.className = `message ${role}`;
    bubble.innerHTML = html;
    outputContent.appendChild(bubble);

    // Small delay so the animation plays after append
    requestAnimationFrame(() => {
        bubble.scrollIntoView({ behavior: "smooth", block: "end" });
    });
}

async function handleGiftRequest() {
    const userPrompt = userInput.value.trim();
    if (!userPrompt) return;

    // Show chat area and append user bubble immediately
    showStream();
    appendMessage("user", DOMPurify.sanitize(`<p>${userPrompt}</p>`));

    // Clear and shrink textarea
    userInput.value = "";
    userInput.style.height = "auto";

    // Enter loading state
    setLoading(true);

    // Add to history
    conversationHistory.push({ role: "user", content: userPrompt });

    try {
        const response = await fetch("/api/gift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: conversationHistory }),
        });

        const contentType = response.headers.get("content-type") || "";
        let data = {};
        if (contentType.includes("application/json")) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(data.message || `Server Error: ${response.status}`);
        }

        const giftSuggestions = data.giftSuggestions;

        // Add to history only if valid
        if (typeof giftSuggestions === "string" && giftSuggestions.trim()) {
            conversationHistory.push({ role: "assistant", content: giftSuggestions });
        }

        // Render assistant bubble
        const safeHTML = DOMPurify.sanitize(marked.parse(String(giftSuggestions)));
        appendMessage("assistant", safeHTML);

    } catch (error) {
        console.error(error);
        appendMessage(
            "assistant",
            "<p>Something went wrong on my end — please try again in a moment.</p>"
        );
    } finally {
        setLoading(false);
        userInput.focus();
    }
}

start();
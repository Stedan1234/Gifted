/**
 * Auto-resize textarea to fit content
 */
export function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

/**
 * Toggle loading state for the request lifecycle.
 * Loading: animates mascot (shake + spinning bow), updates label.
 * Done: compacts mascot, restores label.
 */
export function setLoading(isLoading) {
    const mascotSvg = document.getElementById("mascot-svg");
    const mascotLabel = document.getElementById("mascot-label");
    const mascotContainer = document.getElementById("mascot-container");
    const userInput = document.getElementById("user-input");
    const giftForm = document.getElementById("gift-form");

    if (isLoading) {
        userInput.style.height = "auto";
        giftForm.style.pointerEvents = "none";
        mascotSvg.classList.add("is-loading");
        if (mascotLabel) mascotLabel.textContent = "Finding the perfect gift…";
    } else {
        giftForm.style.pointerEvents = "";
        mascotSvg.classList.remove("is-loading");
        mascotContainer.classList.add("compact");
        if (mascotLabel) mascotLabel.textContent = "Your personal gift expert";
    }
}

/**
 * Show the output container (for immediate streaming feedback)
 */
export function showStream() {
    const outputContainer = document.getElementById("output-container");
    outputContainer.classList.remove("hidden");
    // Trigger reflow so transition fires
    void outputContainer.offsetHeight;
    outputContainer.classList.add("visible");
}

/**
 * Toggle dark/light theme on <html>
 */
export function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}
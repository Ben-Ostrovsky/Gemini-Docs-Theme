(function () {
  const STEALTH_CLASS = "gsd-stealth";
  let active = false;
  let shortcutEnabled = true;
  let overlay = null;
  let messagesEl = null;
  let inputEl = null;
  let titleEl = null;
  let modelLabelEl = null;
  let tempLabelEl = null;
  let syncInterval = null;
  let lastHash = "";
  let lastUrl = "";

  function hasExtensionContext() {
    return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
  }

  function safeStorageSet(value) {
    if (!hasExtensionContext()) return;
    try {
      chrome.storage.local.set(value);
    } catch (_e) {
      // Ignore when extension context is invalidated after reload/update.
    }
  }

  function safeStorageGet(keys, cb) {
    if (!hasExtensionContext()) return;
    try {
      chrome.storage.local.get(keys, cb);
    } catch (_e) {
      // Ignore when extension context is invalidated after reload/update.
    }
  }

  /* ====== Overlay construction ====== */

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.id = "gsd-overlay";
    overlay.className = "gsd-overlay";
    overlay.innerHTML = `
      <div class="gsd-header">
        <div class="gsd-header-left">
          <button class="gsd-logo-btn" title="Docs home" aria-label="Docs home">
            <svg class="gsd-logo" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path fill="#1a73e8" d="M6 2.5h8l4 4v14A1.5 1.5 0 0 1 16.5 22h-10A1.5 1.5 0 0 1 5 20.5V4A1.5 1.5 0 0 1 6.5 2.5z"/>
              <path fill="#8ab4f8" d="M14 2.5v3A1.5 1.5 0 0 0 15.5 7h3z"/>
              <path fill="#fff" d="M8 10h8v1.2H8zm0 2.6h8v1.2H8zm0 2.6h5.6v1.2H8z"/>
              <path fill="#34a853" d="M15.9 16.3l2.3 2.3-3.7 1.4 1.4-3.7z"/>
            </svg>
          </button>
          <div class="gsd-doc-title" title="Current chat">Loading…</div>
        </div>

        <div class="gsd-header-right">
          <button class="gsd-btn gsd-btn-new" title="New chat">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#444">
              <path d="M12 4v16m-8-8h16" stroke="#444" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>
            <span>New</span>
          </button>
          <button class="gsd-btn gsd-btn-chats" title="Browse chats">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#444">
              <path d="M12 3a9 9 0 00-9 9h2a7 7 0 117 7v2a9 9 0 000-18z"/>
              <path d="M11 8v5l4 2 .8-1.3-3.3-2V8z"/>
            </svg>
            <span>Chats</span>
          </button>
          <button class="gsd-btn gsd-btn-model" title="Change model">
            <span class="gsd-model-label">Model</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#444">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          <button class="gsd-btn gsd-btn-temp" title="Toggle temporary chat">
            <span class="gsd-temp-label">Temporary: Off</span>
          </button>
        </div>
      </div>

      <div class="gsd-panel gsd-chats-panel" role="listbox" aria-label="Chats">
        <div class="gsd-panel-head">
          <div class="gsd-panel-title">Recent chats</div>
        </div>
        <div class="gsd-panel-body gsd-chats-list"></div>
      </div>

      <div class="gsd-panel gsd-model-panel" role="listbox" aria-label="Models">
        <div class="gsd-panel-head">
          <div class="gsd-panel-title">Choose a model</div>
        </div>
        <div class="gsd-panel-body gsd-model-list"></div>
      </div>

      <div class="gsd-workspace">
        <div class="gsd-page">
          <div class="gsd-messages"></div>
          <div class="gsd-input-row">
            <div class="gsd-input"
                 contenteditable="true"
                 spellcheck="true"
                 data-placeholder="Type here and press Enter to send..."></div>
            <div class="gsd-sending" aria-hidden="true">Sending…</div>
          </div>
        </div>
      </div>

      <div class="gsd-home" role="region" aria-label="Docs home">
        <div class="gsd-home-top">
          <div class="gsd-home-top-row">
            <div class="gsd-home-top-title">Start a new chat</div>
          </div>
          <div class="gsd-home-templates">
            <button class="gsd-home-blank" title="Blank">
              <div class="gsd-home-blank-card">
                <div class="gsd-home-blank-plus">+</div>
              </div>
              <div class="gsd-home-blank-label">Blank</div>
            </button>
          </div>
        </div>

        <div class="gsd-home-list-section">
          <div class="gsd-home-list-header">
            <div class="gsd-home-list-title">Recent chats</div>
            <div class="gsd-home-search-wrap">
              <svg class="gsd-home-search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="#5f6368" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
              </svg>
              <input
                class="gsd-home-search"
                type="text"
                placeholder="Search chats"
                aria-label="Search chats"
              />
            </div>
          </div>
          <div class="gsd-home-list"></div>
          <div class="gsd-home-empty" hidden>No chats found.</div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    messagesEl = overlay.querySelector(".gsd-messages");
    inputEl = overlay.querySelector(".gsd-input");
    titleEl = overlay.querySelector(".gsd-doc-title");
    modelLabelEl = overlay.querySelector(".gsd-model-label");
    tempLabelEl = overlay.querySelector(".gsd-temp-label");

    wireInput();
    wireHeaderButtons();
    wireHome();
  }

  function wireHeaderButtons() {
    overlay.querySelector(".gsd-logo-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      closePanels();
      showHome();
    });
    overlay.querySelector(".gsd-btn-new").addEventListener("click", () => {
      closePanels();
      hideHome();
      triggerNewChat();
    });
    overlay.querySelector(".gsd-btn-chats").addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel("gsd-chats-panel", openChatsPanel);
    });
    overlay.querySelector(".gsd-btn-model").addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel("gsd-model-panel", openModelPanel);
    });
    overlay.querySelector(".gsd-btn-temp").addEventListener("click", async () => {
      closePanels();
      const ok = await toggleTemporaryChat();
      if (!ok) {
        appendEphemeralError("Couldn't find Gemini's temporary chat toggle.");
      }
      syncTemporaryLabel();
    });

    // Clicking outside closes panels
    overlay.addEventListener("click", (e) => {
      if (!e.target.closest(".gsd-panel") && !e.target.closest(".gsd-btn")) {
        closePanels();
      }
    });
  }

  function togglePanel(panelClass, opener) {
    const panel = overlay.querySelector("." + panelClass);
    if (panel.classList.contains("open")) {
      panel.classList.remove("open");
    } else {
      closePanels();
      panel.classList.add("open");
      opener();
    }
  }

  function closePanels() {
    overlay.querySelectorAll(".gsd-panel.open").forEach((p) => p.classList.remove("open"));
  }

  /* ====== Input wiring (send to Gemini) ====== */

  function wireInput() {
    inputEl.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = inputEl.innerText.replace(/\u00A0/g, " ").trim();
        if (!text) return;
        inputEl.innerText = "";
        showSending(true);
        const ok = await sendToGemini(text);
        showSending(false);
        if (!ok) {
          appendEphemeralError("Couldn't find Gemini's input. Try refreshing the page.");
        }
      }
    });
  }

  function showSending(v) {
    overlay?.querySelector(".gsd-sending")?.classList.toggle("visible", v);
  }

  function appendEphemeralError(text) {
    const e = document.createElement("div");
    e.className = "gsd-error";
    e.textContent = text;
    messagesEl.appendChild(e);
    setTimeout(() => e.remove(), 4000);
  }

  function findRealInput() {
    return (
      document.querySelector('rich-textarea .ql-editor[contenteditable="true"]') ||
      document.querySelector('.ql-editor[contenteditable="true"]') ||
      document.querySelector('div[role="textbox"][contenteditable="true"]') ||
      document.querySelector("textarea")
    );
  }

  function findSendButton() {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      if (btn.disabled) continue;
      const label = (btn.getAttribute("aria-label") || "").toLowerCase();
      if (
        label.includes("send message") ||
        label.includes("submit") ||
        label.includes("send prompt") ||
        (label.includes("send") && !label.includes("feedback"))
      ) {
        return btn;
      }
    }
    return null;
  }

  async function sendToGemini(text) {
    const real = findRealInput();
    if (!real) return false;

    real.focus();

    if (real.tagName === "TEXTAREA") {
      real.value = text;
      real.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(real);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false);
      document.execCommand("insertText", false, text);
      real.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    }

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const btn = findSendButton();
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  /* ====== New chat ====== */

  function findNewChatButton() {
    const candidates = document.querySelectorAll(
      'button, a, [role="button"]'
    );
    for (const el of candidates) {
      const label = (
        (el.getAttribute("aria-label") || "") +
        " " +
        (el.getAttribute("data-test-id") || "") +
        " " +
        (el.textContent || "")
      ).toLowerCase();
      if (
        (label.includes("new chat") ||
          label.includes("new conversation") ||
          label.includes("start new chat")) &&
        !label.includes("history")
      ) {
        return el;
      }
    }
    return null;
  }

  function triggerNewChat() {
    const btn = findNewChatButton();
    if (btn) btn.click();
  }

  /* ====== Chat history browser ====== */

  function readChats() {
    const seen = new Set();
    const chats = [];

    const candidates = document.querySelectorAll(
      "conversations-list [role='button'], conversations-list a, conversations-list button, [data-test-id='conversation'], a[href*='/app/c_']"
    );

    candidates.forEach((el) => {
      // Skip items nested inside another candidate
      if (el.closest && Array.from(candidates).some((p) => p !== el && p.contains(el))) return;
      const text = (el.textContent || "").trim().replace(/\s+/g, " ");
      if (!text || text.length > 120) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      chats.push({ text, el });
    });

    return chats;
  }

  function openChatsPanel() {
    const list = overlay.querySelector(".gsd-chats-list");
    list.innerHTML = "";
    const chats = readChats();
    if (chats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gsd-panel-empty";
      empty.textContent = "No recent chats found. Open the Gemini sidebar once, then try again.";
      list.appendChild(empty);
      return;
    }

    chats.forEach((chat) => {
      const item = document.createElement("div");
      item.className = "gsd-panel-item";
      item.textContent = chat.text;
      item.addEventListener("click", () => {
        closePanels();
        chat.el.click();
      });
      list.appendChild(item);
    });
  }

  /* ====== Docs-style home ======
   *
   * Lightweight landing view that mirrors the Docs home: a single "Blank"
   * card to start a new chat, a local search filter, and a list of Gemini's
   * recent chats. We only surface data Gemini actually provides — no fake
   * timestamps, owners, or template cards.
   */

  let homeActive = false;

  function findGeminiSearchChatsButton() {
    const candidates = document.querySelectorAll('button, [role="button"], a');
    for (const el of candidates) {
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const testId = (el.getAttribute("data-test-id") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();
      if (
        aria === "search chats" ||
        aria === "search conversations" ||
        aria === "find conversations" ||
        testId.includes("search-chat") ||
        testId.includes("search-conversation") ||
        title === "search chats" ||
        title === "search conversations"
      ) {
        return el;
      }
      // Gemini sometimes uses a generic "Search" aria-label on the sidebar search icon
      if (
        (aria === "search" || title === "search") &&
        (el.closest("nav, sidebar, [class*='sidebar'], [class*='nav']") ||
          el.closest("[class*='sidenav'], [class*='side-nav'], [class*='drawer']"))
      ) {
        return el;
      }
    }
    return null;
  }

  function showHome() {
    if (!overlay) return;
    homeActive = true;
    overlay.classList.add("gsd-home-active");
    renderHome();
    if (titleEl) titleEl.textContent = "Docs";
    const search = overlay.querySelector(".gsd-home-search");
    if (search) {
      search.value = "";
      setTimeout(() => search.focus(), 0);
    }
    // Drive the underlying Gemini page to its search-chats view so that
    // toggling stealth off lands there rather than in a specific open chat.
    const searchBtn = findGeminiSearchChatsButton();
    if (searchBtn) searchBtn.click();
  }

  function hideHome() {
    if (!overlay) return;
    homeActive = false;
    overlay.classList.remove("gsd-home-active");
    // Let syncTitle repopulate the real chat title on the next tick.
    syncTitle();
  }

  function renderHome(filter) {
    const listEl = overlay.querySelector(".gsd-home-list");
    const emptyEl = overlay.querySelector(".gsd-home-empty");
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";

    const q = (filter || "").trim().toLowerCase();
    const chats = readChats().filter((c) =>
      q ? c.text.toLowerCase().includes(q) : true
    );

    if (chats.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = q
        ? "No chats match your search."
        : "No recent chats found. Open the Gemini sidebar once, then try again.";
      return;
    }
    emptyEl.hidden = true;

    chats.forEach((chat) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "gsd-home-row";
      row.innerHTML = `
        <svg class="gsd-home-row-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path fill="#1a73e8" d="M6 2.5h8l4 4v14A1.5 1.5 0 0 1 16.5 22h-10A1.5 1.5 0 0 1 5 20.5V4A1.5 1.5 0 0 1 6.5 2.5z"/>
          <path fill="#8ab4f8" d="M14 2.5v3A1.5 1.5 0 0 0 15.5 7h3z"/>
          <path fill="#fff" d="M8 10h8v1.2H8zm0 2.6h8v1.2H8zm0 2.6h5.6v1.2H8z"/>
        </svg>
        <div class="gsd-home-row-title"></div>
      `;
      row.querySelector(".gsd-home-row-title").textContent = chat.text;
      row.addEventListener("click", () => {
        hideHome();
        chat.el.click();
      });
      listEl.appendChild(row);
    });
  }

  function wireHome() {
    const blank = overlay.querySelector(".gsd-home-blank");
    if (blank) {
      blank.addEventListener("click", () => {
        hideHome();
        triggerNewChat();
      });
    }
    const search = overlay.querySelector(".gsd-home-search");
    if (search) {
      search.addEventListener("input", () => renderHome(search.value));
      search.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          search.value = "";
          renderHome("");
        }
      });
    }
  }

  /* ====== Model picker ====== */

  function findModelButton() {
    const candidates = document.querySelectorAll(
      'button, [role="button"]'
    );
    for (const el of candidates) {
      const label = (
        (el.getAttribute("aria-label") || "") +
        " " +
        (el.getAttribute("data-test-id") || "")
      ).toLowerCase();
      if (
        label.includes("model") ||
        label.includes("mode switcher") ||
        label.includes("bard-mode")
      ) {
        return el;
      }
    }
    // Fallback — bard-mode-switcher custom element
    const m = document.querySelector("bard-mode-switcher button");
    if (m) return m;
    return null;
  }

  function readCurrentModelName() {
    const btn = findModelButton();
    if (!btn) return null;
    const text = (btn.textContent || "").trim().replace(/\s+/g, " ");
    return text || null;
  }

  async function openModelPanel() {
    const list = overlay.querySelector(".gsd-model-list");
    list.innerHTML = "<div class='gsd-panel-empty'>Loading models…</div>";

    const btn = findModelButton();
    if (!btn) {
      list.innerHTML = "<div class='gsd-panel-empty'>Model picker not available.</div>";
      return;
    }

    // Open Gemini's menu (invisible behind our overlay) and scrape options.
    btn.click();
    await new Promise((r) => setTimeout(r, 250));

    const menuItems = document.querySelectorAll(
      ".cdk-overlay-container [role='menuitem'], .cdk-overlay-container [role='menuitemradio'], button[mat-menu-item], .mat-mdc-menu-item"
    );

    const options = [];
    const seen = new Set();
    menuItems.forEach((item) => {
      const raw = (item.innerText || item.textContent || "").trim();
      const lines = raw
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const display =
        lines.length > 1
          ? `${lines[0]} - ${lines.slice(1).join(" ")}`
          : raw.replace(/\s+/g, " ");
      const text = raw.replace(/\s+/g, " ");
      if (!text || text.length > 120 || seen.has(text)) return;
      seen.add(text);
      options.push({ text, display, el: item });
    });

    if (options.length === 0) {
      list.innerHTML = "<div class='gsd-panel-empty'>No models found.</div>";
      // Close Gemini's menu
      document.body.click();
      return;
    }

    list.innerHTML = "";
    options.forEach((opt) => {
      const item = document.createElement("div");
      item.className = "gsd-panel-item";
      item.textContent = opt.display || opt.text;
      item.addEventListener("click", () => {
        closePanels();
        // Re-click Gemini's button to open menu again, then click matching option
        const btn2 = findModelButton();
        if (!btn2) return;
        btn2.click();
        setTimeout(() => {
          const items2 = document.querySelectorAll(
            ".cdk-overlay-container [role='menuitem'], .cdk-overlay-container [role='menuitemradio'], button[mat-menu-item], .mat-mdc-menu-item"
          );
          for (const it of items2) {
            const t = (it.textContent || "").trim().replace(/\s+/g, " ");
            if (t === opt.text) {
              it.click();
              return;
            }
          }
        }, 150);
      });
      list.appendChild(item);
    });

    // Close Gemini's menu now that we've scraped it (click outside).
    setTimeout(() => {
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();
      else document.body.click();
    }, 50);
  }

  /* ====== Temporary chat ====== */

  /**
   * Strictly match only controls that are provably the "temporary chat" toggle.
   * We match on aria-label / data-test-id content, never on class names or
   * textContent, because Gemini reuses those words casually.
   */
  function matchesTemporaryChat(el) {
    const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
    const testId = (el.getAttribute?.("data-test-id") || "").toLowerCase();
    if (
      aria === "temporary chat" ||
      aria.startsWith("turn on temporary chat") ||
      aria.startsWith("turn off temporary chat") ||
      aria.includes("temporary chat")
    ) {
      return true;
    }
    if (testId.includes("temporary-chat") || testId.includes("temp-chat")) {
      return true;
    }
    return false;
  }

  function findTemporaryChatControl() {
    const candidates = document.querySelectorAll(
      "button, [role='button'], [role='switch'], [role='menuitem'], [role='menuitemcheckbox']"
    );
    for (const el of candidates) {
      if (matchesTemporaryChat(el)) return el;
    }
    return null;
  }

  /**
   * Some builds hide the temporary-chat toggle behind an overflow/kebab menu
   * in the top bar. Try each candidate menu button, open it, and check if a
   * temporary-chat item appears.
   */
  async function findTemporaryChatControlDeep() {
    const direct = findTemporaryChatControl();
    if (direct) return direct;

    const menuButtons = Array.from(
      document.querySelectorAll("button, [role='button']")
    ).filter((el) => {
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const testId = (el.getAttribute("data-test-id") || "").toLowerCase();
      return (
        aria.includes("more options") ||
        aria.includes("more actions") ||
        aria.includes("menu") ||
        aria.includes("overflow") ||
        testId.includes("more") ||
        testId.includes("menu")
      );
    });

    for (const menuBtn of menuButtons) {
      menuBtn.click();
      await new Promise((r) => setTimeout(r, 150));
      const found = findTemporaryChatControl();
      if (found) return found;
      // Close the menu so we don't leak open overlays.
      const backdrop = document.querySelector(".cdk-overlay-backdrop");
      if (backdrop) backdrop.click();
      else menuBtn.click();
      await new Promise((r) => setTimeout(r, 80));
    }
    return null;
  }

  /**
   * Read temporary-chat on/off strictly from ARIA. If undetermined, return
   * null so the caller can fall back to whatever we last believed.
   */
  function readTemporaryChatState(el) {
    if (!el) return null;

    const ariaPressed = (el.getAttribute("aria-pressed") || "").toLowerCase();
    const ariaChecked = (el.getAttribute("aria-checked") || "").toLowerCase();
    if (ariaPressed === "true" || ariaChecked === "true") return true;
    if (ariaPressed === "false" || ariaChecked === "false") return false;

    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    // Gemini flips the aria-label based on current state.
    if (aria.includes("turn off temporary chat")) return true;
    if (aria.includes("turn on temporary chat")) return false;

    return null;
  }

  // Local belief about temporary-chat state. Starts Off and flips on user clicks.
  let tempChatOn = false;

  async function toggleTemporaryChat() {
    const el = await findTemporaryChatControlDeep();
    if (!el) return false;
    const before = readTemporaryChatState(el);
    el.click();
    await new Promise((r) => setTimeout(r, 180));

    // Prefer the authoritative state from aria after the click.
    const after = readTemporaryChatState(findTemporaryChatControl());
    if (after !== null) {
      tempChatOn = after;
    } else if (before !== null) {
      tempChatOn = !before;
    } else {
      tempChatOn = !tempChatOn;
    }
    return true;
  }

  /**
   * Only show the Temporary toggle when we're on a fresh/new chat and Gemini
   * actually exposes the control (matching Gemini's real UI: the option
   * disappears once a conversation is underway or when viewing history).
   */
  function syncTemporaryLabel(turnCount) {
    const btn = overlay?.querySelector(".gsd-btn-temp");
    if (!btn || !tempLabelEl) return;

    const direct = findTemporaryChatControl();
    const inExistingChat =
      (typeof turnCount === "number" && turnCount > 0) ||
      /\/app\/c_/i.test(location.pathname + location.search);
    const shouldShow = !inExistingChat && !!direct;

    btn.style.display = shouldShow ? "" : "none";

    if (!shouldShow) {
      // Force Off state so the label/visual doesn't linger.
      tempChatOn = false;
      btn.classList.remove("is-on");
      if (tempLabelEl.textContent !== "Temporary: Off") {
        tempLabelEl.textContent = "Temporary: Off";
      }
      return;
    }

    const aria = readTemporaryChatState(direct);
    if (aria !== null) tempChatOn = aria;

    const next = `Temporary: ${tempChatOn ? "On" : "Off"}`;
    if (tempLabelEl.textContent !== next) tempLabelEl.textContent = next;
    btn.classList.toggle("is-on", tempChatOn);
  }

  /* ====== Mirror Gemini conversation into our doc ====== */

  function isVisibleNode(el) {
    if (!el) return false;
    if (el.offsetParent !== null) return true;
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return true;
    // Still hidden — but some Gemini containers use position:fixed so fall
    // back to checking whether any ancestor has display:none/visibility:hidden.
    let cur = el;
    while (cur && cur !== document.body) {
      const cs = getComputedStyle(cur);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      cur = cur.parentElement;
    }
    return true;
  }

  function collectTurns() {
    let nodes = Array.from(document.querySelectorAll("user-query, model-response"));

    if (nodes.length === 0) {
      const all = Array.from(
        document.querySelectorAll("[class*='user-query'], [class*='model-response']")
      );
      nodes = all.filter((n) => !all.some((o) => o !== n && o.contains(n)));
    } else {
      nodes = nodes.filter((n) => !nodes.some((o) => o !== n && o.contains(n)));
    }

    // Drop nodes that aren't visible. Gemini keeps stale user-query /
    // model-response elements from previous chats attached but hidden after
    // a "New chat" click, which would otherwise bleed into the doc view.
    nodes = nodes.filter(isVisibleNode);

    const turns = [];
    nodes.forEach((node) => {
      const tag = node.tagName.toLowerCase();
      const cls = (node.className || "").toString().toLowerCase();
      const isUser = tag === "user-query" || cls.includes("user-query");

      const clone = node.cloneNode(true);

      // Convert math FIRST, while KaTeX's mathml/annotation subtree is still
      // intact. If we strip [aria-hidden='true'] first, we risk removing the
      // wrapper that holds the LaTeX source.
      convertMathToLatex(clone);

      clone
        .querySelectorAll(
          ".visually-hidden, .sr-only, .cdk-visually-hidden"
        )
        .forEach((el) => el.remove());

      // Remove aria-hidden elements EXCEPT any we've marked as preserved math.
      clone.querySelectorAll("[aria-hidden='true']").forEach((el) => {
        if (el.hasAttribute("data-gsd-math")) return;
        if (el.closest("[data-gsd-math]")) return;
        el.remove();
      });

      const contentEl =
        clone.querySelector(
          "message-content, [class*='markdown'], [class*='query-text'], [class*='query-content']"
        ) || clone;

      const html = contentEl.innerHTML || "";
      let text = (contentEl.textContent || "").trim();
      text = text.replace(/^(You said|Gemini said|Bard said|Model response)\s*[:\s]*/i, "").trim();
      if (!text) return;
      turns.push({ role: isUser ? "user" : "model", html, text });
    });
    return turns;
  }

  /**
   * Handle math elements in Gemini's response clone.
   * Primary strategy: extract LaTeX source and replace with "$...$" text.
   * Fallback strategy: if we can't find the source, mark the element so the
   * sanitizer and CSS leave its classes/styles intact, preserving whatever
   * rendering Gemini produced.
   */
  function convertMathToLatex(root) {
    // Attributes Gemini (and other renderers) use to carry the raw LaTeX
    // source. If present, the value IS the source — do not gate on heuristics.
    const SOURCE_ATTRS = [
      "data-math",
      "data-latex",
      "data-tex",
      "data-math-content",
      "data-source",
      "source",
      "latex",
      "tex",
      "alttext"
    ];

    const getSource = (el) => {
      if (el.getAttribute) {
        for (const a of SOURCE_ATTRS) {
          const v = el.getAttribute(a);
          if (v && v.trim()) return v.trim();
        }
      }

      const ann = el.querySelector?.(
        "annotation[encoding*='tex' i], annotation[encoding='application/x-tex']"
      );
      if (ann && ann.textContent && ann.textContent.trim()) {
        return ann.textContent.trim();
      }

      const tag = el.tagName?.toLowerCase() || "";
      if (tag === "math-renderer" || tag === "math-formula") {
        const t = (el.textContent || "").trim();
        if (t && t.length < 2000) return t;
      }

      return null;
    };

    const isBlock = (el) => {
      if (
        el.matches?.(
          ".katex-display, .math-display, .math-block, math-block, [display='block']"
        )
      )
        return true;
      if (el.closest?.(".katex-display, .math-display, .math-block, math-block"))
        return true;
      if (el.getAttribute?.("display") === "block") return true;
      return false;
    };

    const selector = [
      ".math-inline",
      ".math-block",
      ".math-display",
      ".katex",
      ".katex-display",
      "mjx-container",
      "math",
      "math-renderer",
      "math-formula",
      "math-block",
      "math-inline",
      "[class*='MathJax']",
      "[class*='mjx-']",
      "[data-math]",
      "[data-latex]",
      "[data-tex]"
    ].join(", ");

    const all = Array.from(root.querySelectorAll(selector));
    const outermost = all.filter(
      (el) => !all.some((o) => o !== el && o.contains(el))
    );

    outermost.forEach((el) => {
      const src = getSource(el);

      if (src) {
        const block = isBlock(el);
        const wrap = block ? "$$" : "$";
        const target = el.closest(".katex-display, .math-display") || el;

        if (block) {
          const p = document.createElement("p");
          p.textContent = wrap + src + wrap;
          target.replaceWith(p);
        } else {
          target.replaceWith(document.createTextNode(wrap + src + wrap));
        }
      } else {
        // Preserve the visual rendering so something shows up.
        el.setAttribute("data-gsd-math", "1");
        el.querySelectorAll("*").forEach((c) =>
          c.setAttribute("data-gsd-math", "1")
        );
      }
    });
  }

  function hashTurns(turns) {
    return turns.map((t) => `${t.role}:${t.text.length}:${t.text.slice(-40)}`).join("|");
  }

  function renderTurns(turns) {
    messagesEl.innerHTML = "";
    if (turns.length === 0) {
      paginate();
      return;
    }

    turns.forEach((turn) => {
      const body = document.createElement("div");
      body.className = `gsd-msg gsd-msg-${turn.role}`;
      if (turn.role === "model") {
        body.innerHTML = turn.html;
        sanitizeClone(body);
      } else {
        body.textContent = turn.text;
      }
      messagesEl.appendChild(body);
    });
    paginate();
  }

  /* ====== Pagination ======
   *
   * Walk each "paragraph-level" block inside the doc and, if it straddles
   * a page boundary, push it onto the next page with margin-top. Also
   * reserves the bottom margin of each virtual page so content respects the
   * 96px bottom page margin Docs uses.
   */
  const PAGE_HEIGHT = 1056;
  const GAP_HEIGHT = 20;
  const PAGE_CYCLE = PAGE_HEIGHT + GAP_HEIGHT; // 1076
  const BOTTOM_MARGIN = 96;

  function paginate() {
    if (!overlay) return;
    const page = overlay.querySelector(".gsd-page");
    if (!page) return;

    const blocks = [];
    messagesEl.querySelectorAll(".gsd-msg").forEach((msg) => {
      // Prefer inner block-level elements (paragraphs, list items, etc.).
      const inner = msg.querySelectorAll(
        "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, table"
      );
      if (inner.length > 0) {
        inner.forEach((el) => blocks.push(el));
      } else {
        blocks.push(msg);
      }
    });
    const inputRow = overlay.querySelector(".gsd-input-row");
    if (inputRow) blocks.push(inputRow);

    // Reset any prior pagination pushes before re-measuring.
    blocks.forEach((el) => {
      el.style.removeProperty("margin-top");
    });

    const pageRect = page.getBoundingClientRect();
    const pageTopPadding = 96;
    const USABLE = PAGE_HEIGHT - pageTopPadding - BOTTOM_MARGIN;

    blocks.forEach((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top - pageRect.top;
      const height = r.height;
      if (height <= 0) return;

      // Blocks larger than a full page content area cannot be kept intact.
      if (height > USABLE) return;

      const offset = top - pageTopPadding;
      const cycleIdx = Math.floor(offset / PAGE_CYCLE);
      const posOnPage = offset - cycleIdx * PAGE_CYCLE;
      const bottomOnPage = posOnPage + height;

      if (posOnPage < 0 || bottomOnPage > USABLE) {
        // Push to start of the next virtual page's content area.
        const nextCycleStart = (cycleIdx + 1) * PAGE_CYCLE;
        const targetTop = pageTopPadding + nextCycleStart;
        const push = targetTop - top;
        if (push > 0) {
          // Use setProperty with !important so CSS `margin: 0 !important` on
          // message descendants cannot silently kill the pagination push.
          el.style.setProperty("margin-top", push + "px", "important");
        }
      }
    });
  }

  function sanitizeClone(root) {
    root
      .querySelectorAll(
        "button, [class*='action'], [class*='copy'], [class*='feedback'], [class*='thumb']"
      )
      .forEach((el) => el.remove());

    root
      .querySelectorAll(
        ".visually-hidden, .sr-only, .cdk-visually-hidden, [aria-hidden='true']"
      )
      .forEach((el) => el.remove());

    root.querySelectorAll("*").forEach((el) => {
      if (el.hasAttribute("data-gsd-math")) return;
      el.removeAttribute("style");
      el.removeAttribute("class");
    });
  }

  function syncMessages() {
    if (!active) return;
    // If the URL changed (new chat, different chat, back to landing), force a
    // clean re-render so stale turns from the previous chat never linger.
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastHash = "__force__";
      if (messagesEl) messagesEl.innerHTML = "";
    }
    const turns = collectTurns();
    const h = hashTurns(turns);
    if (h !== lastHash) {
      lastHash = h;
      renderTurns(turns);
    }
    syncTitle();
    syncModelLabel();
    syncTemporaryLabel(turns.length);
  }

  /* ====== Title sync ====== */

  function syncTitle() {
    const raw = document.title || "";
    let chat = raw
      .replace(/\s*[-—–|]\s*(Google\s+Gemini|Gemini|Docs).*$/i, "")
      .trim();
    if (!chat || /^(gemini|google gemini|new chat)$/i.test(chat)) chat = "Untitled";
    if (titleEl && !homeActive && titleEl.textContent !== chat) {
      titleEl.textContent = chat;
    }

    const desiredTab = chat + " - Docs";
    if (document.title !== desiredTab) document.title = desiredTab;
  }

  function syncModelLabel() {
    if (!modelLabelEl) return;
    const name = readCurrentModelName();
    if (name && modelLabelEl.textContent !== name) {
      modelLabelEl.textContent = name;
    }
  }

  /* ====== Scroll sync ======
   *
   * Lightest-weight approach: on toggle only, map scroll *ratio* between
   * Gemini's scroll container and our workspace. No listeners, no intervals,
   * no per-frame work. Gemini defaults to the bottom of the chat, so first
   * enable naturally lands at the bottom of the doc too (ratio ≈ 1).
   */

  function findGeminiScrollContainer() {
    const anchor =
      document.querySelector("user-query, model-response") ||
      document.querySelector("chat-window, chat-window-content");
    let el = anchor;
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      const oy = cs.overflowY;
      if (
        (oy === "auto" || oy === "scroll") &&
        el.scrollHeight - el.clientHeight > 4
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function getScrollRatio(el) {
    if (!el) return 1;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return 1;
    return Math.max(0, Math.min(1, el.scrollTop / max));
  }

  function applyScrollRatio(el, ratio) {
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    el.scrollTop = Math.round(max * ratio);
  }

  /* ====== Enable / disable ====== */

  function enable() {
    active = true;
    const geminiScroll = findGeminiScrollContainer();
    const geminiRatio = getScrollRatio(geminiScroll);

    if (!overlay) buildOverlay();
    document.documentElement.classList.add(STEALTH_CLASS);
    // Reset all sync state so we always render from scratch when re-entering
    // stealth mode. Otherwise stale turns from the previous session persist.
    lastHash = "__force__";
    lastUrl = "";
    if (messagesEl) messagesEl.innerHTML = "";

    // If the user navigated to a specific chat while stealth was off, dismiss
    // docs home so we show that chat rather than the stale home view.
    if (/\/app\/c_/i.test(location.pathname + location.search) && homeActive) {
      homeActive = false;
      overlay.classList.remove("gsd-home-active");
    }

    syncMessages();
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncMessages, 700);
    safeStorageSet({ gsdActive: true });

    // Apply after layout + pagination settle so scrollHeight is correct.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ws = overlay?.querySelector(".gsd-workspace");
        applyScrollRatio(ws, geminiRatio);
      });
    });
  }

  function disable() {
    active = false;
    const ws = overlay?.querySelector(".gsd-workspace");
    const wsRatio = getScrollRatio(ws);

    document.documentElement.classList.remove(STEALTH_CLASS);
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    safeStorageSet({ gsdActive: false });

    requestAnimationFrame(() => {
      applyScrollRatio(findGeminiScrollContainer(), wsRatio);
    });
  }

  function toggle() {
    if (active) disable();
    else enable();
  }

  /* ====== Hotkey, messages, init ====== */

  document.addEventListener("keydown", (e) => {
    if (!shortcutEnabled) return;
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyG") {
      e.preventDefault();
      toggle();
    }
  });

  if (hasExtensionContext()) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.action === "gsd-toggle") {
        toggle();
        sendResponse({ ok: true, active });
      } else if (msg.action === "gsd-set") {
        if (msg.value) enable();
        else disable();
        sendResponse({ ok: true, active });
      } else if (msg.action === "gsd-shortcut") {
        shortcutEnabled = !!msg.value;
        sendResponse({ ok: true, shortcutEnabled });
      } else if (msg.action === "gsd-status") {
        sendResponse({ active, shortcutEnabled });
      }
      return true;
    });
  }

  function init() {
    safeStorageGet(
      ["gsdActive", "gsdShortcutEnabled"],
      (data) => {
        shortcutEnabled = data.gsdShortcutEnabled !== false;
        if (data.gsdActive) enable();
      }
    );
  }

  if (document.head) init();
  else document.addEventListener("DOMContentLoaded", init);
})();

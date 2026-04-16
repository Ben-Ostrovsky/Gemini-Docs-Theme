(function () {
  const STEALTH_CLASS = "gsd-stealth";
  let active = false;
  let headerEl = null;
  let toolbarEl = null;
  let originalTitle = "";

  function buildHeader() {
    const el = document.createElement("div");
    el.className = "gsd-bar gsd-header";
    el.innerHTML = `
      <div class="gsd-header-left">
        <svg class="gsd-logo" viewBox="0 0 24 24" width="28" height="28">
          <path fill="#4285F4" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z"/>
          <path fill="#A1C2FA" d="M14 2l6 6h-4a2 2 0 01-2-2V2z"/>
          <path fill="#fff" d="M7 13h10v1.5H7zm0 3h7v1.5H7z"/>
        </svg>
        <div class="gsd-title-block">
          <span class="gsd-doc-title" contenteditable="true" spellcheck="false">Untitled document</span>
          <div class="gsd-menu-row">
            <span class="gsd-menu-item">File</span>
            <span class="gsd-menu-item">Edit</span>
            <span class="gsd-menu-item">View</span>
            <span class="gsd-menu-item">Insert</span>
            <span class="gsd-menu-item">Format</span>
            <span class="gsd-menu-item">Tools</span>
            <span class="gsd-menu-item">Extensions</span>
            <span class="gsd-menu-item">Help</span>
          </div>
        </div>
      </div>
      <div class="gsd-header-right">
        <div class="gsd-header-icon" title="Last edit was seconds ago">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#5f6368"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.1.8-1.3-4.5-2.7V7z"/></svg>
        </div>
        <div class="gsd-header-icon" title="Comments">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#5f6368"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
        </div>
        <div class="gsd-header-icon" title="Video call">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#5f6368"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </div>
        <button class="gsd-share-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" style="margin-right:6px"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
          Share
        </button>
        <div class="gsd-avatar"></div>
      </div>`;
    return el;
  }

  function buildToolbar() {
    const el = document.createElement("div");
    el.className = "gsd-bar gsd-toolbar";
    el.innerHTML = `
      <div class="gsd-tb-group">
        <button class="gsd-tb-btn" title="Undo"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.6-3.6A8 8 0 0120.4 16l2.1-.8A10.5 10.5 0 0012.5 8z"/></svg></button>
        <button class="gsd-tb-btn" title="Redo"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M18.4 10.6C16.55 9 14.15 8 11.5 8A10.5 10.5 0 001.5 15.2l2.1.8a8 8 0 0112-3.6L12 16h9V7l-3.6 3.6z"/></svg></button>
        <button class="gsd-tb-btn" title="Print"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg></button>
        <button class="gsd-tb-btn" title="Spell check"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M12.45 16h2.09L9.43 3H7.57L2.46 16h2.09l1.12-3h5.64l1.14 3zm-6.02-5L8.5 5.48 10.57 11H6.43zm15.16.59l-8.09 8.09L9.83 16l-1.41 1.41 5.09 5.09L23 13l-1.41-1.41z"/></svg></button>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <select class="gsd-tb-select gsd-tb-zoom"><option>100%</option></select>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <select class="gsd-tb-select gsd-tb-style"><option>Normal text</option></select>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <select class="gsd-tb-select gsd-tb-font"><option>Arial</option></select>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <button class="gsd-tb-btn gsd-tb-size-btn">−</button>
        <input class="gsd-tb-fontsize" value="11" readonly>
        <button class="gsd-tb-btn gsd-tb-size-btn">+</button>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <button class="gsd-tb-btn gsd-tb-fmt" title="Bold"><b>B</b></button>
        <button class="gsd-tb-btn gsd-tb-fmt" title="Italic"><i>I</i></button>
        <button class="gsd-tb-btn gsd-tb-fmt" title="Underline"><u>U</u></button>
        <button class="gsd-tb-btn gsd-tb-fmt" title="Text color"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#444" d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z"/><rect y="19" width="24" height="4" rx="0" fill="#000"/></svg></button>
        <button class="gsd-tb-btn gsd-tb-fmt" title="Highlight color"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#444" d="M2 20h20v4H2zm3.49-3.49l1.42-1.42L4.92 13.1l7.07-7.07 1.98 1.98L5.49 16.51zM15.07 2.93l3.01 3.01c.39.39.39 1.02 0 1.41l-9.19 9.19-4.43-4.43 9.19-9.19a1 1 0 011.42.01z"/><rect y="21" width="24" height="3" rx="0" fill="#FBBC04"/></svg></button>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <button class="gsd-tb-btn" title="Insert link"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></button>
        <button class="gsd-tb-btn" title="Add comment"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg></button>
        <button class="gsd-tb-btn" title="Insert image"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></button>
      </div>
      <div class="gsd-tb-sep"></div>
      <div class="gsd-tb-group">
        <button class="gsd-tb-btn" title="Align left"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg></button>
        <button class="gsd-tb-btn" title="Line spacing"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M6 7h2.5L5 3.5 1.5 7H4v10H1.5L5 20.5 8.5 17H6V7zm4-2v2h12V5H10zm0 14h12v-2H10v2zm0-6h12v-2H10v2z"/></svg></button>
        <button class="gsd-tb-btn" title="Checklist"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M22 7h-9v2h9V7zm0 4h-9v2h9v-2zm0 4h-9v2h9v-2zM5.54 11L2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z"/></svg></button>
        <button class="gsd-tb-btn" title="Bulleted list"><svg viewBox="0 0 24 24" width="16" height="16" fill="#444"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg></button>
      </div>`;
    return el;
  }

  function enable() {
    active = true;
    document.documentElement.classList.add(STEALTH_CLASS);
    if (!headerEl) {
      headerEl = buildHeader();
      toolbarEl = buildToolbar();
    }
    document.documentElement.appendChild(headerEl);
    document.documentElement.appendChild(toolbarEl);
    originalTitle = document.title;
    document.title = "Untitled document - Google Docs";
    chrome.storage.local.set({ gsdActive: true });
  }

  function disable() {
    active = false;
    document.documentElement.classList.remove(STEALTH_CLASS);
    headerEl?.remove();
    toolbarEl?.remove();
    if (originalTitle) document.title = originalTitle;
    chrome.storage.local.set({ gsdActive: false });
  }

  function toggle() {
    if (active) disable();
    else enable();
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyG") {
      e.preventDefault();
      toggle();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "gsd-toggle") toggle();
  });

  const titleObs = new MutationObserver(() => {
    if (active && !document.title.includes("Google Docs")) {
      document.title = "Untitled document - Google Docs";
    }
  });

  function init() {
    titleObs.observe(
      document.querySelector("title") || document.head,
      { childList: true, subtree: true, characterData: true }
    );
    chrome.storage.local.get("gsdActive", (data) => {
      if (data.gsdActive) enable();
    });
  }

  if (document.head) init();
  else document.addEventListener("DOMContentLoaded", init);
})();

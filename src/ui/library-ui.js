import { decorById } from "../content/catalog.mjs";
import { libraryStories } from "../content/library.mjs";
import { escapeHtml } from "./html.js";
import { asset } from "../platform/assets.js";
import { itemFrames } from "../content/item-frame-meta.mjs";

function initLibraryUi(app2) {
  let currentBook = null;
  function cover(id) {
    const item = decorById[id];
    const style = `background-image:url("${asset(itemFrames[id].path)}");background-size:100% 100%;background-position:0 0;`;
    return `<span class="reader-cover" style="${escapeHtml(style)}" role="img" aria-label="${escapeHtml(item.name)} cover"></span>`;
  }
  function openBook(id) {
    if (!Object.hasOwn(libraryStories, id) || !app2.state.house.owned.includes(id)) return false;
    currentBook = id;
    renderPage(app2.state.house.reading[id] || 0);
    return true;
  }
  function renderPage(index) {
    const id = currentBook, story2 = libraryStories[id];
    if (!story2 || !app2.actions.rememberBookPage(id, index)) return;
    app2.save();
    const page = story2.pages[index], item = decorById[id];
    app2.showModal(`<section class="book-reader" data-reading-book="${id}">
            <header class="reader-heading">${cover(id)}<div><div class="modal-subtitle">OUR HAUNTED LIBRARY</div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(story2.subtitle)}</p></div></header>
            <article class="reader-page" aria-label="Page ${index + 1} of ${story2.pages.length}"><div class="reader-page-number">${String(index + 1).padStart(2, "0")}</div><h3>${escapeHtml(page.heading)}</h3>${page.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}${index === story2.pages.length - 1 ? '<span class="reader-end">✦ The end ✦</span>' : ""}</article>
            <nav class="reader-controls" aria-label="Book pages"><button class="secondary" id="book-previous" ${index === 0 ? "disabled" : ""}>← Previous</button><span id="book-page-count" role="status">${index + 1} / ${story2.pages.length}</span><button class="primary" id="book-next" ${index === story2.pages.length - 1 ? "disabled" : ""}>Next →</button></nav>
            <button class="reader-return secondary" id="return-to-library">Return to my collection</button>
        </section>`);
    const go = (next, target) => {
      renderPage(next);
      const control = app2.$(target);
      (control.disabled ? app2.$("return-to-library") : control).focus?.();
    };
    app2.$("book-previous").onclick = () => go(index - 1, "book-previous");
    app2.$("book-next").onclick = () => go(index + 1, "book-next");
    app2.$("return-to-library").onclick = openCollection;
  }
  function openCollection() {
    const books2 = app2.state.house.owned.filter((id) => Object.hasOwn(libraryStories, id));
    app2.showModal(`<section class="library-menu"><div class="modal-subtitle">ONE MORE CHAPTER BEFORE BED</div><h2>Our haunted library.</h2><p>Every book you own has a story. Your place is saved when you turn a page.</p><div class="library-grid">${books2.map((id) => {
        const item = decorById[id], page = app2.state.house.reading[id];
        return `<button class="library-book" data-open-book="${id}">${cover(id)}<span>${escapeHtml(item.name)}<small>${Number.isInteger(page) ? `Continue · page ${page + 1}` : "Open this story"}</small></span></button>`;
      }).join("") || "<p>Find a story in the decor shop.</p>"}</div><button class="secondary reader-return" id="close-library">Close library</button></section>`);
    for (const button of document.querySelectorAll("[data-open-book]")) button.onclick = () => openBook(button.dataset.openBook);
    app2.$("close-library").onclick = () => {
      app2.closeModal();
      app2.features.home.render();
      app2.$(app2.features.home.panel === "shop" ? "decor-tab" : "home-library").focus?.();
    };
  }
  app2.$("home-library").onclick = openCollection;
  return { open: openBook, openCollection };
}

export { initLibraryUi };

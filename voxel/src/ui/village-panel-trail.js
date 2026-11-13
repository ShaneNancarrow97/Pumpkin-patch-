// Menu history belongs to this visit, never to a saved farm. Views are copied
// so a later refresh cannot change the position kept for the previous page.
export const villagePanelKey = (kind, id) => JSON.stringify([kind, id ?? null]);
export const villagePanelSection = kind => ({ resident: "people", almanac: "journal", stall: "upgrades" })[kind] ?? kind;
const copy = value => value == null ? null : JSON.parse(JSON.stringify(value));

export function createVillagePanelTrail() {
  let pages = [];
  const views = new Map();
  const key = page => villagePanelKey(page.kind, page.id);
  const remember = view => { if (pages.length && view) views.set(key(pages.at(-1)), copy(view)); };
  return {
    open(kind, id, { root = false, replace = false, view } = {}) {
      remember(view);
      const next = { kind, id }, same = pages.length && key(pages.at(-1)) === key(next);
      if (root) pages = [];
      else if (replace && !same) pages.pop();
      if (!same || !pages.length) pages.push(next);
      // A route stays small even after a long session of cross-links.
      if (pages.length > 10) pages.splice(1, pages.length - 10);
      return { ...pages.at(-1) };
    },
    back(view) { remember(view); if (pages.length < 2) return null; pages.pop(); return { ...pages.at(-1) }; },
    remember,
    view() { return pages.length ? copy(views.get(key(pages.at(-1)))) : null; },
    dismiss() { pages = []; },
    reset() { pages = []; views.clear(); },
    get depth() { return pages.length; },
    get parent() { return pages.length > 1 ? { ...pages.at(-2) } : null; },
  };
}

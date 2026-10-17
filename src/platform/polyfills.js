// Helpers newer than some supported browsers: Object.hasOwn needs Safari 15.4
// and Chrome 93; replaceChildren needs Safari 14 and Chrome 86.
if (!Object.hasOwn) {
  Object.defineProperty(Object, "hasOwn", {
    value: (object, key) => Object.prototype.hasOwnProperty.call(object, key),
    configurable: true,
    writable: true
  });
}
for (const type of [globalThis.Element, globalThis.DocumentFragment, globalThis.Document]) {
  if (type && !type.prototype.replaceChildren) {
    Object.defineProperty(type.prototype, "replaceChildren", {
      value: function(...nodes) {
        while (this.firstChild) this.removeChild(this.firstChild);
        this.append(...nodes);
      },
      configurable: true,
      writable: true
    });
  }
}

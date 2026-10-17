function createNotifications($) {
  let timer;
  function clear() {
    clearTimeout(timer);
    $("toast").classList.remove("show");
    const feedback = $("menu-feedback");
    if (feedback) feedback.hidden = true;
  }
  function show(message) {
    clear();
    $("toast").textContent = message;
    const wardrobe = $("modal").open ? $("modal-content").querySelector(".costume-note") : null;
    const feedback = $("modal").open ? $("menu-feedback") : null;
    if (wardrobe) {
      wardrobe.setAttribute("role", "status");
      wardrobe.textContent = message;
    } else if (feedback) {
      feedback.textContent = message;
      feedback.hidden = false;
    } else {
      $("toast").classList.add("show");
    }
    timer = setTimeout(clear, 2800);
  }
  return { show, clear };
}

export { createNotifications };

function layout(width, height, rows) {
  const sockets = [], lips = [];
  rows.forEach(([x, base, bookHeight, count3, slope = 0], row) => {
    const bookWidth = bookHeight * 0.175, gap = 2.5;
    for (let col = 0; col < count3; col++) {
      const left = x + col * (bookWidth + gap);
      sockets.push({
        id: `row-${row + 1}-slot-${col + 1}`,
        accepts: "book-spine",
        row,
        x: left / width,
        y: (base + (left - x) * slope) / height,
        width: bookWidth / width,
        height: bookHeight / height
      });
    }
    const end = x + count3 * (bookWidth + gap);
    lips.push({
      left: (x - 2) / width,
      right: (end + 2) / width,
      y: base / height,
      endY: (base + (end - x) * slope) / height,
      thickness: 3 / height
    });
  });
  return { version: 1, sockets, lips };
}
var shelfLayouts = {
  f11: layout(208, 306, [[43, 118, 44, 2], [43, 169, 39, 2], [43, 219, 39, 2], [43, 269, 39, 2]]),
  f12: layout(258, 310, [[62, 118, 34, 2], [58, 160, 34, 3], [58, 209, 38, 3], [58, 254, 34, 2]]),
  f13: layout(322, 247, [[92, 108, 42, 2, -0.06], [92, 173, 49, 2, -0.06]]),
  f14: layout(357, 272, [[82, 84, 28, 4, -0.025], [82, 143, 37, 4, -0.025], [82, 206, 46, 4, -0.025]])
};

export { shelfLayouts };

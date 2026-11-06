// Shuffle bags play each song once per round, including across track endings.
// A new round starts with a different song from the one that just finished.
export function createMusicQueue(ids, random = Math.random) {
  let bag = [];
  return {
    reset() { bag = []; },
    next(current, shuffle = true) {
      if (!ids.length) return null;
      if (!shuffle) return ids[(ids.indexOf(current) + 1) % ids.length];
      if (!bag.length) {
        bag = [...ids];
        for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      }
      if (bag[0] === current && bag.length > 1) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      return bag.shift();
    },
  };
}

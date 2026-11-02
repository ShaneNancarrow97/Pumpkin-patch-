// Presentation only: consumes the lab's public view, never calls a rule or edits it.
const list = value => Array.isArray(value) ? value : [];
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const action = (id, label, disabled = false) => ({ id, label, disabled });

/**
 * Derive the evening desk's hierarchy from createLab().view().
 *
 * serviceState(view, selectedThemeId, { worldPaused = false } = {}) returns:
 * { themeId, stage, status, title, nextStep, active, complete, claimed, pending,
 *   objectives: { completed, required, display, retained },
 *   primaryAction: { id, label, disabled } | null,
 *   completion: { title, body, tone } | null }
 *
 * `complete`/`claimed` describe permanent theme history. An active repeat attempt
 * still shows its own actual progress. Inactive completed evenings retain the
 * earned 3/3 summary, but this helper never manufactures individual goal values.
 * Optional worldPaused comes from the caller's existing world state; the public
 * lab view intentionally does not expose that flag. No input references escape.
 */
export function serviceState(view, selectedThemeId, { worldPaused = false } = {}) {
 const festival = view?.festival;
 const theme = list(festival?.themes).find(item => item?.id === selectedThemeId);
 const current = festival?.active;
 const active = !!current && current.themeId === selectedThemeId;
 const claimed = !!theme && (theme.claimed === true || list(festival?.ownedRewards).some(item => item?.themeId === selectedThemeId));
 const rewardPending = !!theme && list(festival?.pendingRewards).some(item => item?.themeId === selectedThemeId);
 const complete = !!theme && (theme.completed === true || rewardPending || claimed);
 const required = active && count(current.requiredGoals) > 0 ? count(current.requiredGoals) : 3;
 const actualCompleted = active ? count(current.completedGoals) : 0;
 const completed = active ? Math.min(required, actualCompleted) : complete ? required : 0;
 const pending = count((view?.outbox ?? festival?.outbox)?.pending);
 const result = {
  themeId: theme?.id ?? null, stage: 'idle', status: 'Choose your evening',
  title: 'Your evening awaits', nextStep: '', active, complete, claimed, pending,
  objectives: { completed, required, display: `${completed} / ${required}`, retained: !active && complete },
  primaryAction: null, completion: null
 };
 if (!theme) return { ...result, stage: 'unknown', status: 'No evening selected', title: 'Choose an evening', nextStep: 'Choose a known evening to begin.' };
 if (current && !active) return { ...result, stage: 'another-evening', status: 'Another evening is active', nextStep: 'Finish or end the current evening before preparing this one.' };
 if (!active && complete) {
  const recorded = claimed || !rewardPending;
  return { ...result, stage: claimed ? 'claimed' : rewardPending ? 'reward-ready' : 'completed', status: claimed ? 'Keepsake recorded' : 'Evening complete', title: claimed ? 'A night to remember' : 'An evening well hosted',
   nextStep: rewardPending && !claimed ? 'Record your once-only keepsake entitlement.' : 'Choose another evening, or host this one again without earning a second keepsake.',
   primaryAction: rewardPending && !claimed ? action('claim', 'Record keepsake') : action('prepare', 'Host again'),
   completion: { title: claimed ? 'Keepsake recorded' : 'Three goals achieved', body: recorded ? 'This keepsake stays recorded when you host again.' : 'Record a once-only keepsake for this evening.', tone: claimed ? 'recorded' : 'earned' }
  };
 }
 if (!active) {
  const unlocked = theme.readiness?.unlocked !== false;
  const missing = list(theme.readiness?.missing).find(item => typeof item?.label === 'string')?.label;
  return { ...result, status: unlocked ? 'Choose your evening' : 'Later evening', nextStep: !unlocked ? missing ?? 'Reach this evening’s required patch level.' : 'Prepare the private venue, then open for service.', primaryAction: action('prepare', 'Prepare evening', !unlocked) };
 }
 if (worldPaused) return { ...result, stage: 'world-paused', status: 'Private world paused', title: 'Everything is held safely', nextStep: 'Resume the private world before continuing service or delivering outcomes.' };
 if (current.phase === 'paused') return { ...result, stage: 'paused', status: 'Service paused', title: 'Take a quiet moment', nextStep: pending ? `${pending} confirmed outcome${pending === 1 ? ' remains' : 's remain'} held. Resume service before delivery.` : 'Resume when you are ready. No offline time or penalty is added.', primaryAction: action('resume', 'Resume service') };
 if (current.phase === 'preparing') {
  const ready = theme.readiness?.ready === true;
  const missing = list(theme.readiness?.missing).find(item => typeof item?.label === 'string')?.label;
  return { ...result, stage: 'preparing', status: 'Untimed preparation', title: 'Set the evening in motion', nextStep: ready ? 'Open the evening when you are ready. Preparation has no deadline.' : missing ?? 'Complete the listed preparation requirements before opening.', primaryAction: action('start', 'Open for the evening', !ready) };
 }
 if (current.phase !== 'running') return { ...result, stage: 'unavailable', status: 'Service unavailable', nextStep: 'Inspect the current private session before continuing.' };
 if (pending) return { ...result, stage: 'awaiting-delivery', status: 'Confirmed outcomes waiting', title: 'Your service is recorded', nextStep: `Deliver ${pending} confirmed outcome${pending === 1 ? '' : 's'} to update the evening’s goals. This never charges a guest again.`, primaryAction: action('flush', 'Deliver outcomes') };
 if (actualCompleted >= required) return { ...result, stage: 'ready-to-finish', status: 'Three goals complete', title: 'An evening worth remembering', nextStep: 'Finish whenever you are ready to record this evening and earn its keepsake entitlement.', primaryAction: action('end', 'Finish evening') };
 const remaining = required - completed;
 return { ...result, stage: 'hosting', status: 'Open for the evening', title: 'Tonight’s service', nextStep: `Complete ${remaining} more goal${remaining === 1 ? '' : 's'} through real service operations. There is no deadline.` };
}

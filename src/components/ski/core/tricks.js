import { PHYS } from "./constants.js";

/**
 * Spin (left/right) and flip (up/down) while airborne,
 * friendly trick names, and coarse landing tiers.
 */

export function resetTrickAccum() {
  return { spinDeg: 0, flipDeg: 0 };
}

export function accumulateTricks(acc, input, dt) {
  const next = { spinDeg: acc.spinDeg, flipDeg: acc.flipDeg };
  if (input.left) next.spinDeg -= PHYS.SPIN_RATE * dt;
  if (input.right) next.spinDeg += PHYS.SPIN_RATE * dt;
  if (input.up) next.flipDeg += PHYS.FLIP_RATE * dt;
  if (input.down) next.flipDeg -= PHYS.FLIP_RATE * dt;
  return next;
}

function normDeg(d) {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

/**
 * Gnarshmallow-ish labels from combined rotation (no scoring).
 */
export function trickNameFromAccum({ spinDeg, flipDeg }) {
  const s = Math.abs(normDeg(spinDeg));
  const f = Math.abs(normDeg(flipDeg));
  const spins = Math.round(s / 360);
  const flips = Math.round(f / 360);

  if (spins >= 1 && flips >= 1) {
    const spinLabel = spins === 1 ? "360" : `${spins * 360}`;
    const flipLabel = flips === 1 ? "Backflip" : `${flips}x Flip`;
    return `${spinLabel} + ${flipLabel}`;
  }
  if (spins >= 1) return spins === 1 ? "360 Spin" : `${spins * 360} Spin`;
  if (flips >= 1) return flips === 1 ? "Backflip" : `${flips}x Flip`;
  if (s > 120 || f > 120) return "Cork";
  if (s > 55 || f > 55) return "Shifty";
  if (s > 20 || f > 20) return "Style";
  return "Straight Air";
}

/**
 * @param {number} impactVy downward vertical speed magnitude at touchdown
 * @returns {'clean'|'harsh'|'slam'}
 */
export function landingTier(impactVy, soft, hard) {
  if (impactVy >= hard) return "slam";
  if (impactVy >= soft) return "harsh";
  return "clean";
}

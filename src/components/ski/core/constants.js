/** World units; y increases downhill. */
export const WORLD = {
  /** Lateral pan margin before camera follows horizontally */
  CAMERA_DEADZONE_X: 85,
  /** Extra padding so course edges are not clipped */
  CAMERA_EDGE_PAD: 40,
};

export const PHYS = {
  /** Base acceleration along the fall line (downhill) */
  DOWNHILL_ACCEL: 38,
  /** Ground friction (per second toward a floor speed) */
  GROUND_DRAG: 0.35,
  MIN_SPEED: 52,
  MAX_SPEED: 320,
  /** Heading change (rad/s) while steering on snow */
  STEER_RATE: 1.35,
  MAX_HEADING: 0.55,
  /** Gravity while airborne (world units / s²) */
  GRAVITY: 720,
  /** Default launch from kickers */
  KICK_IMPULSE: 260,
  /** Radius used for tree overlap */
  RIDER_HIT_R: 14,
  /** Vertical speed magnitudes considered harsh on landing */
  LAND_SOFT_VY: 220,
  LAND_HARD_VY: 380,
  /** Fall recovery duration (seconds) */
  FALLEN_DURATION: 1.35,
  /** Speed retained after a tumble */
  FALLEN_SPEED_MUL: 0.28,
  /** Spin / flip input rates while airborne (degrees / s) */
  SPIN_RATE: 420,
  FLIP_RATE: 380,
};

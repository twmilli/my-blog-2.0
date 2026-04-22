<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  type GameState = "idle" | "playing" | "crashed";
  type AirSource = "kicker" | "rail" | "knuckle" | null;

  type BaseFeature = { id: number; x: number; y: number };

  type KickerFeature = BaseFeature & {
    type: "kicker";
    w: number;
    rampLen: number;
    power: number;
    angle?: number;
    variant?: "railApproach";
    pairedKnuckleId?: number;
    pairedRailId?: number;
  };

  type KnuckleFeature = BaseFeature & {
    type: "knuckle";
    w: number;
    topLen: number;
    outSlope: number;
    lipHeight: number;
    pairedKickerId: number;
  };

  type RailFeature = BaseFeature & {
    type: "rail";
    len: number;
    angle: number;
    height: number;
    pairedKickerId: number;
  };

  type TreeFeature = BaseFeature & {
    type: "tree";
    size: number;
  };

  type Feature =
    | KickerFeature
    | KnuckleFeature
    | RailFeature
    | TreeFeature;

  type Skier = {
    x: number;
    heading: number;
    speed: number;
    targetSpeed: number;
    brakeAnim: number;
    inAir: boolean;
    altitude: number;
    vz: number;
    airStartY: number;
    airHeading: number;
    airSource: AirSource;
    onFeature: number | null;
    yawDeg: number;
    yawSpeed: number;
    yawSpun: number;
    switch: boolean;
    switchTakeoff: boolean;
    grindSpun?: number;
    grindFeet?: number;
  };

  type TrailPoint = { x: number; y: number; h: number };

  type TrackedKey =
    | "ArrowLeft"
    | "ArrowRight"
    | "ArrowUp"
    | "ArrowDown"
    | " "
    | "Enter";

  const CANVAS_WIDTH = 440;
  const CANVAS_HEIGHT = 560;
  const SKIER_SCREEN_Y = Math.round(CANVAS_HEIGHT * 0.3);
  const SLOPE_HALF = 150;
  const RAIL_HEIGHT = 6;
  /** Rail-local ±x bound: same value for grind stay vs air catch so pops cannot instantly re-lock. */
  const RAIL_LATERAL_HALF_WIDTH = 6;

  const TAU = Math.PI * 2;

  /** World-space axis-aligned box for spawn overlap (world x / downhill y). */
  type WorldRect = { minX: number; minY: number; maxX: number; maxY: number };

  // --- Spawn / overlap (tune after playtest; comments summarize intent) ----
  // SPAWN_MAX_FEATURES: hard cap so the features array and canvas stay light.
  // SPAWN_AABB_PAD: min gap between *unrelated* feature bounds (prevents stack).
  // SPAWN_BACKOFF: when a bundle is rejected, push that type's next spawn Y
  //   forward so we don't busy-loop; schedulers also advance at cap.
  // Parallel coins: each bundle type rolls SPAWN_P_* independently when due
  // (no shared weighted lottery). Tree/cluster still use REST_* × TREE_SPAWN_WEIGHT_MULT
  // for their marginal probabilities vs jump/rail.
  // Playtest (Cursor browser, localhost:3000): no stacked unrelated props at
  // default sliders; nudged pad/backoff so dense checks reject a bit less often.
  const SPAWN_MAX_FEATURES = 95;
  const SPAWN_AABB_PAD = 12;
  const SPAWN_BACKOFF = 50;
  const SPAWN_LOOP_CAP = 36;
  const REST_TREE_FRACTION = 27 / 48;
  const REST_CLUSTER_FRACTION = 21 / 48;
  /** Scales tree/cluster marginal spawn probabilities vs jump/rail. */
  const TREE_SPAWN_WEIGHT_MULT = 0.4;

  let canvas!: HTMLCanvasElement;
  let wrapEl!: HTMLDivElement;
  let ctx!: CanvasRenderingContext2D;
  let raf: number | undefined;
  let lastTs = 0;
  let dpr = 1;

  // idle | playing | crashed
  let state: GameState = "idle";
  let lastTrick = "";
  let trickTimer = 0;

  // Marginal Bernoulli probabilities when a type is due (next*Y in window).
  const SPAWN_JUMP_WEIGHT = 38;
  const SPAWN_RAIL_WEIGHT = 14;
  const railBoundForSpawn = Math.min(
    SPAWN_RAIL_WEIGHT,
    100 - SPAWN_JUMP_WEIGHT,
  );
  const restWeightForSpawn =
    Math.max(0, 100 - SPAWN_JUMP_WEIGHT - railBoundForSpawn) / 100;
  const SPAWN_P_JUMP = SPAWN_JUMP_WEIGHT / 100;
  const SPAWN_P_RAIL = railBoundForSpawn / 100;
  const SPAWN_P_TREE =
    restWeightForSpawn * REST_TREE_FRACTION * TREE_SPAWN_WEIGHT_MULT;
  const SPAWN_P_CLUSTER =
    restWeightForSpawn * REST_CLUSTER_FRACTION * TREE_SPAWN_WEIGHT_MULT;

  let skier: Skier;
  let worldY: number;
  let features: Feature[];
  /** Per bundle type: world Y where the next *proposal* of that type may start. */
  let nextJumpY: number;
  let nextRailY: number;
  let nextTreeY: number;
  let nextClusterY: number;
  let trail: TrailPoint[];
  let wallSpikes: unknown[];

  const keys = {} as Partial<Record<TrackedKey, boolean>>;

  const clamp = (v: number, lo: number, hi: number): number =>
    v < lo ? lo : v > hi ? hi : v;
  const approach = (v: number, t: number, rate: number, dt: number): number =>
    v + (t - v) * Math.min(1, rate * dt);
  const rand = (min: number, max: number): number =>
    min + Math.random() * (max - min);
  const mod = (v: number, m: number): number => ((v % m) + m) % m;

  function localToWorld(
    cx: number,
    cy: number,
    ang: number,
    lx: number,
    ly: number,
  ): { x: number; y: number } {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
  }

  function worldAabbFromCorners(pts: { x: number; y: number }[]): WorldRect {
    let minX = pts[0].x;
    let maxX = pts[0].x;
    let minY = pts[0].y;
    let maxY = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  function unionWorldRects(a: WorldRect, b: WorldRect): WorldRect {
    return {
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
    };
  }

  /** True if outer edges overlap when each rect is inflated by pad. */
  function worldRectsOverlapPadded(a: WorldRect, b: WorldRect, pad: number): boolean {
    return !(
      a.maxX + pad < b.minX - pad ||
      a.minX - pad > b.maxX + pad ||
      a.maxY + pad < b.minY - pad ||
      a.minY - pad > b.maxY + pad
    );
  }

  function worldAabbKicker(f: KickerFeature): WorldRect {
    const a = f.angle || 0;
    const halfW = f.w / 2;
    const rampLen = f.rampLen;
    const front =
      f.variant === "railApproach" ? 6 + 4 : 10 + 4;
    const localCorners: { lx: number; ly: number }[] = [
      { lx: -halfW, ly: 0 },
      { lx: halfW, ly: 0 },
      { lx: halfW * 0.88, ly: -rampLen - 2 },
      { lx: -halfW * 0.88, ly: -rampLen - 2 },
      { lx: -halfW, ly: front },
      { lx: halfW, ly: front },
    ];
    const pts = localCorners.map((p) =>
      localToWorld(f.x, f.y, a, p.lx, p.ly),
    );
    return worldAabbFromCorners(pts);
  }

  function worldAabbKnuckle(f: KnuckleFeature): WorldRect {
    const halfW = f.w / 2;
    const halfLen = f.topLen / 2;
    const topHalfW = halfW * 0.9;
    const yUp = f.y - halfLen - f.lipHeight;
    const yDown = f.y + halfLen + f.outSlope + 4;
    return {
      minX: f.x - topHalfW - 2,
      minY: yUp,
      maxX: f.x + topHalfW + 2,
      maxY: yDown,
    };
  }

  function worldAabbRail(f: RailFeature): WorldRect {
    const a = f.angle || 0;
    const halfLen = f.len / 2;
    const across = 9;
    const c1 = localToWorld(f.x, f.y, a, -across, -halfLen);
    const c2 = localToWorld(f.x, f.y, a, across, -halfLen);
    const c3 = localToWorld(f.x, f.y, a, across, halfLen);
    const c4 = localToWorld(f.x, f.y, a, -across, halfLen);
    return worldAabbFromCorners([c1, c2, c3, c4]);
  }

  function worldAabbTree(f: TreeFeature): WorldRect {
    const s = f.size || 20;
    const r = s * 0.95;
    return {
      minX: f.x - r,
      minY: f.y - r * 0.9,
      maxX: f.x + r,
      maxY: f.y + r * 0.9,
    };
  }

  function worldAabbForFeature(f: Feature): WorldRect {
    if (f.type === "kicker") return worldAabbKicker(f);
    if (f.type === "knuckle") return worldAabbKnuckle(f);
    if (f.type === "rail") return worldAabbRail(f);
    return worldAabbTree(f);
  }

  function bundleConflicts(
    u: WorldRect,
    list: readonly Feature[],
  ): boolean {
    for (const f of list) {
      if (worldRectsOverlapPadded(u, worldAabbForFeature(f), SPAWN_AABB_PAD)) {
        return true;
      }
    }
    return false;
  }

  type BundleKind = "jump" | "rail" | "tree" | "cluster";

  function resetGame(): void {
    skier = {
      x: 0,
      heading: 0,
      speed: 80,
      targetSpeed: 80,

      // Brake state (hockey stop on ArrowUp)
      brakeAnim: 0, // 0 = normal, 1 = skis horizontal

      inAir: false,
      altitude: 0,
      vz: 0,
      airStartY: 0,
      airHeading: 0,
      // Whether we popped from a rail (affects naming)
      airSource: null, // 'kicker' | 'rail' | null
      onFeature: null, // currently grinding this feature id

      // Yaw (in-plane spin count) — NOT drawn as body rotation; shown via ring
      yawDeg: 0,
      yawSpeed: 0,
      yawSpun: 0,

      // Switch stance
      switch: false,
      switchTakeoff: false,
    };
    worldY = 0;
    features = [];
    nextJumpY = 200;
    nextRailY = 280;
    nextTreeY = 180;
    nextClusterY = 340;
    trail = [];
    wallSpikes = [];
    lastTrick = "";
    trickTimer = 0;
    state = "playing";
    lastTs = performance.now();
    spawnFeatures();
    primeWallSpikes();
    if (raf !== undefined) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    if (wrapEl) wrapEl.focus();
  }

  // --- Feature generation --------------------------------------------------

  let _featureId = 0;

  function spawnFeatures(): void {
    const ahead = worldY + CANVAS_HEIGHT * 2.2;
    let it = 0;
    while (it < SPAWN_LOOP_CAP) {
      it++;
      if (features.length >= SPAWN_MAX_FEATURES) {
        if (nextJumpY < ahead) nextJumpY += SPAWN_BACKOFF;
        if (nextRailY < ahead) nextRailY += SPAWN_BACKOFF;
        if (nextTreeY < ahead) nextTreeY += SPAWN_BACKOFF;
        if (nextClusterY < ahead) nextClusterY += SPAWN_BACKOFF;
        break;
      }

      const dueJump = nextJumpY < ahead;
      const dueRail = nextRailY < ahead;
      const dueTree = nextTreeY < ahead;
      const dueCluster = nextClusterY < ahead;
      if (!dueJump && !dueRail && !dueTree && !dueCluster) break;

      type Roll = { kind: BundleKind; baseY: number };
      const wins: Roll[] = [];
      if (dueJump) {
        if (Math.random() < SPAWN_P_JUMP) wins.push({ kind: "jump", baseY: nextJumpY });
        else nextJumpY += rand(12, 28);
      }
      if (dueRail) {
        if (Math.random() < SPAWN_P_RAIL) wins.push({ kind: "rail", baseY: nextRailY });
        else nextRailY += rand(12, 28);
      }
      if (dueTree) {
        if (Math.random() < SPAWN_P_TREE) wins.push({ kind: "tree", baseY: nextTreeY });
        else nextTreeY += rand(12, 28);
      }
      if (dueCluster) {
        if (Math.random() < SPAWN_P_CLUSTER)
          wins.push({ kind: "cluster", baseY: nextClusterY });
        else nextClusterY += rand(12, 28);
      }

      wins.sort((a, b) => a.baseY - b.baseY);

      for (const roll of wins) {
        if (features.length >= SPAWN_MAX_FEATURES) break;
        const { kind, baseY } = roll;

        if (kind === "jump") {
        const kickerId = ++_featureId;
        const gap = rand(120, 140);
        const topLen = 150;
        const outSlope = 36;
        const cx = rand(-SLOPE_HALF + 40, SLOPE_HALF - 40);
        const w = rand(54, 72);
        const rampLen = rand(30, 40);
        const power = rand(175, 200);
        const k1: KickerFeature = {
          id: kickerId,
          type: "kicker",
          x: cx,
          y: baseY,
          w,
          rampLen,
          power,
          pairedKnuckleId: kickerId + 1,
        };
        const k2: KnuckleFeature = {
          id: ++_featureId,
          type: "knuckle",
          x: cx,
          y: baseY + gap + topLen / 2,
          w: rand(84, 104),
          topLen,
          outSlope,
          lipHeight: 10,
          pairedKickerId: kickerId,
        };
        const u = unionWorldRects(
          worldAabbKicker(k1),
          worldAabbKnuckle(k2),
        );
        if (features.length + 2 > SPAWN_MAX_FEATURES) {
          _featureId -= 2;
          nextJumpY += SPAWN_BACKOFF;
        } else if (bundleConflicts(u, features)) {
          _featureId -= 2;
          nextJumpY += SPAWN_BACKOFF;
        } else {
          features = [...features, k1, k2];
          nextJumpY =
            baseY + gap + topLen + outSlope + rand(180, 240);
        }
      } else if (kind === "rail") {
        const railKickerId = ++_featureId;
        const railId = railKickerId + 1;
        const gap = rand(18, 26);
        const len = rand(70, 110);
        const angle = rand(-0.28, 0.28);
        const cx = rand(-SLOPE_HALF + 40, SLOPE_HALF - 40);
        const railCenterX = cx;
        const railCenterY = baseY + gap + len / 2;
        const kickerOffset = len / 2 + gap;
        const k1: KickerFeature = {
          id: railKickerId,
          type: "kicker",
          variant: "railApproach",
          x: railCenterX + Math.sin(angle) * kickerOffset,
          y: railCenterY - Math.cos(angle) * kickerOffset,
          angle,
          w: rand(38, 50),
          rampLen: rand(22, 30),
          power: rand(75, 100),
          pairedRailId: railId,
        };
        const r1: RailFeature = {
          id: ++_featureId,
          type: "rail",
          x: railCenterX,
          y: railCenterY,
          len,
          angle,
          height: RAIL_HEIGHT,
          pairedKickerId: railKickerId,
        };
        const u = unionWorldRects(
          worldAabbKicker(k1),
          worldAabbRail(r1),
        );
        if (features.length + 2 > SPAWN_MAX_FEATURES) {
          _featureId -= 2;
          nextRailY += SPAWN_BACKOFF;
        } else if (bundleConflicts(u, features)) {
          _featureId -= 2;
          nextRailY += SPAWN_BACKOFF;
        } else {
          features = [...features, k1, r1];
          nextRailY = baseY + gap + len + rand(130, 200);
        }
      } else if (kind === "tree") {
        let done = false;
        for (let att = 0; att < 3 && !done; att++) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const tr: TreeFeature = {
            id: 0,
            type: "tree",
            x: side * rand(70, SLOPE_HALF - 4),
            y: baseY,
            size: rand(18, 26),
          };
          const u = worldAabbTree(tr);
          if (
            features.length + 1 > SPAWN_MAX_FEATURES ||
            bundleConflicts(u, features)
          ) {
            continue;
          }
          tr.id = ++_featureId;
          features = [...features, tr];
          nextTreeY = baseY + rand(30, 70);
          done = true;
        }
        if (!done) nextTreeY += SPAWN_BACKOFF;
      } else {
        let done = false;
        for (let att = 0; att < 3 && !done; att++) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const trs: TreeFeature[] = [];
          let uGroup: WorldRect | null = null;
          for (let i = 0; i < 5; i++) {
            const tr: TreeFeature = {
              id: 0,
              type: "tree",
              x: side * rand(70, SLOPE_HALF - 4) + rand(-6, 6),
              y: baseY + i * rand(16, 28),
              size: rand(16, 26),
            };
            const u = worldAabbTree(tr);
            uGroup = uGroup ? unionWorldRects(uGroup, u) : { ...u };
            trs.push(tr);
          }
          if (!uGroup) continue;
          if (features.length + 5 > SPAWN_MAX_FEATURES || bundleConflicts(uGroup, features)) {
            continue;
          }
          for (const t of trs) {
            t.id = ++_featureId;
          }
          features = [...features, ...trs];
          let yMax = baseY;
          for (const t of trs) {
            if (t.y > yMax) yMax = t.y;
          }
          nextClusterY = yMax + 140;
          done = true;
        }
        if (!done) nextClusterY += SPAWN_BACKOFF;
      }
      }
    }
    features = features.filter(
      (f) => f.y > worldY - 400 && f.y < worldY + CANVAS_HEIGHT * 2.6,
    );
  }

  // Walls are now drawn as a continuous shaded strip with a small jagged
  // inner edge — see drawPisteWalls. No per-spike data needed.
  function primeWallSpikes(): void {}
  function maintainWallSpikes(): void {}

  // --- Update loop ---------------------------------------------------------

  function update(dt: number): void {
    if (state !== "playing") return;

    const steer = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);

    if (skier.inAir) {
      // ---- AIR ----------------------------------------------------------
      // Yaw — rotates the body in-plane (i.e. a 360 spin). Accel + max
      // speed are doubled from the original tuning so left/right taps
      // spin the skier about twice as fast.
      skier.yawSpeed += steer * 1240 * dt;
      skier.yawSpeed = clamp(skier.yawSpeed, -1360, 1360);
      skier.yawSpeed *= Math.pow(0.985, dt * 60);
      skier.yawDeg += skier.yawSpeed * dt;
      skier.yawSpun += Math.abs(skier.yawSpeed) * dt;

      // Ballistic arc — lower gravity + lower initial vz means jumps feel
      // more like a glide than a catapult.
      skier.vz -= 210 * dt;
      skier.altitude += skier.vz * dt;

      // Locked trajectory — you commit to the takeoff direction.
      skier.x += Math.sin(skier.airHeading) * skier.speed * dt;
      worldY += Math.cos(skier.airHeading) * skier.speed * dt;

      if (tryMountRailFromAir()) {
        // Mounted a rail — skip the ground-landing check this frame.
      } else if (skier.altitude <= 0) {
        landFromAir();
      }
    } else if (skier.onFeature) {
      // ---- GRINDING on a rail ------------------------------------------
      const f = features.find((ft) => ft.id === skier.onFeature);
      if (!f || f.type !== "rail") {
        skier.onFeature = null;
      } else {
        // Yaw spins like the air — left/right rotates the skier in-plane
        // while the preserved incoming path keeps carrying them forward.
        skier.yawSpeed += steer * 1240 * dt;
        skier.yawSpeed = clamp(skier.yawSpeed, -1360, 1360);
        skier.yawSpeed *= Math.pow(0.985, dt * 60);
        skier.yawDeg += skier.yawSpeed * dt;
        skier.yawSpun += Math.abs(skier.yawSpeed) * dt;

        // Grinding preserves the incoming line exactly — the rail does not
        // get to bend the skier's path. If that line drifts off the bar,
        // the skier simply pops out rather than snapping back on.
        const travelHeading = skier.heading;
        const stepX = Math.sin(travelHeading) * skier.speed * dt;
        const stepY = Math.cos(travelHeading) * skier.speed * dt;
        skier.x += stepX;
        worldY += stepY;

        skier.grindSpun = (skier.grindSpun || 0) + dt;

        const railAngle = f.angle || 0;
        const ox = skier.x - f.x;
        const oy = worldY - f.y;
        const localDx = ox * Math.cos(-railAngle) - oy * Math.sin(-railAngle);
        const localDy = ox * Math.sin(-railAngle) + oy * Math.cos(-railAngle);

        // Leave the grind as soon as the preserved path exits the rail's
        // usable footprint, either by running off the end or sliding off
        // the side.
        if (
          Math.abs(localDx) > RAIL_LATERAL_HALF_WIDTH ||
          localDy < -f.len / 2 ||
          localDy > f.len / 2
        ) {
          skier.inAir = true;
          // Speed-scaled pop off the end — stronger than before but still
          // well below the rail-approach kicker (launch uses ~95–120 + speed*0.05).
          skier.vz = 45 + skier.speed * 0.27;
          skier.altitude = 0;
          skier.airStartY = worldY;
          skier.airHeading = travelHeading;
          skier.airSource = f.type;
          skier.switchTakeoff = skier.switch;
          skier.grindFeet = Math.round(Math.max(0, localDy + f.len / 2) / 6);
          skier.onFeature = null;
        }
      }
    } else {
      // ---- GROUND ------------------------------------------------------
      // Heading: pivot and HOLD (no auto re-straighten).
      skier.heading += steer * 1.25 * dt;
      skier.heading = clamp(skier.heading, -1.1, 1.1);

      // Brake state — ArrowUp is a hockey stop.
      const braking = keys.ArrowUp;
      skier.brakeAnim = approach(skier.brakeAnim, braking ? 1 : 0, 6, dt);

      if (braking) {
        // Aggressive friction; speed decays fast to zero.
        skier.speed = Math.max(0, skier.speed - 170 * dt);
      } else if (keys.ArrowDown) {
        skier.targetSpeed = 130;
        skier.speed = approach(skier.speed, skier.targetSpeed, 1.1, dt);
      } else {
        skier.targetSpeed = 80;
        skier.speed = approach(skier.speed, skier.targetSpeed, 1.0, dt);
      }

      // Motion.
      skier.x += Math.sin(skier.heading) * skier.speed * dt;
      worldY += Math.cos(skier.heading) * skier.speed * dt;
    }

    // Off-piste recovery. If the skier goes past the piste lip we actively
    // pull the heading back inward — strongly enough that it can out-muscle
    // any lingering outward input. (This only affects off-piste — on the
    // piste, heading HOLDS as you asked.)
    if (!skier.inAir) {
      const offPiste = Math.abs(skier.x) - (SLOPE_HALF - 4);
      if (offPiste > 0) {
        skier.speed = Math.max(22, skier.speed - 40 * dt);
        const inward = skier.x > 0 ? -1 : 1;
        // Stronger pull the further you are off-piste.
        const intensity = Math.min(1, offPiste / 40);
        const target = inward * (0.35 + 0.45 * intensity);
        const diff = target - skier.heading;
        skier.heading += clamp(diff, -1.5, 1.5) * Math.min(1, 2.4 * dt);
      }
    }

    // Hard canvas clamp — with a wall catch so you can never get pinned.
    const halfW = CANVAS_WIDTH / 2 - 20;
    if (skier.x < -halfW) {
      skier.x = -halfW;
      // Force heading positive (rightward) at a firm rate if still pushing left.
      if (skier.heading < 0.2)
        skier.heading = Math.min(0.2, skier.heading + 4 * dt);
      // Keep some speed so you can actually escape.
      skier.speed = Math.max(skier.speed, 35);
    }
    if (skier.x > halfW) {
      skier.x = halfW;
      if (skier.heading > -0.2)
        skier.heading = Math.max(-0.2, skier.heading - 4 * dt);
      skier.speed = Math.max(skier.speed, 35);
    }

    spawnFeatures();
    maintainWallSpikes();

    // Feature interactions.
    if (!skier.inAir && !skier.onFeature) {
      handleFeatureEntry();
    }

    // Trail.
    if (!skier.inAir) {
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(last.x - skier.x, last.y - worldY) > 3) {
        trail.push({ x: skier.x, y: worldY, h: skier.heading });
      }
      if (trail.length > 500) trail.splice(0, trail.length - 500);
    }

    trickTimer = Math.max(0, trickTimer - dt);
  }

  function crashFromAir(): void {
    skier.altitude = 0;
    skier.inAir = false;
    skier.vz = 0;
    skier.onFeature = null;
    skier.yawSpeed = 0;
    skier.yawDeg = 0;
    skier.yawSpun = 0;
    skier.airSource = null;
    skier.switchTakeoff = false;
    skier.grindSpun = 0;
    skier.grindFeet = 0;
    state = "crashed";
    lastTrick = sketchyLandingName();
    trickTimer = 4;
  }

  function mountRailFromAir(f: RailFeature): boolean {
    skier.altitude = 6;
    skier.inAir = false;
    skier.vz = 0;
    skier.onFeature = f.id;
    skier.heading = skier.airHeading;
    // Rail catches preserve yaw so the skier can land sideways and keep
    // spinning. The catch does not nudge x/y or re-aim the trajectory.
    skier.grindFeet = 0;
    skier.grindSpun = 0;
    return true;
  }

  // Rails can be caught once the skier is actually descending and close to
  // the bar. Unlike a snow landing, a rail catch preserves yaw so you can
  // lock in sideways or keep spinning while the rail constrains travel.
  function tryMountRailFromAir(): boolean {
    for (const f of features) {
      if (f.type !== "rail") continue;
      const ox = skier.x - f.x;
      const oy = worldY - f.y;
      const cos = Math.cos(-(f.angle || 0));
      const sin = Math.sin(-(f.angle || 0));
      const localDx = ox * cos - oy * sin;
      const localDy = ox * sin + oy * cos;
      const descending = skier.vz <= 0;
      const catchHeight = 6 + (f.height || 0);
      if (!descending || skier.altitude >= catchHeight) continue;
      if (
        Math.abs(localDx) < RAIL_LATERAL_HALF_WIDTH &&
        Math.abs(localDy) < f.len / 2
      ) {
        return mountRailFromAir(f);
      }
    }
    return false;
  }

  function handleFeatureEntry(): void {
    for (const f of features) {
      const dx = f.x - skier.x;

      if (f.type === "kicker") {
        // Hit-zone is expressed in the kicker's local frame so an angled
        // kicker keeps its footprint aligned with the ramp — the uphill
        // face stays uphill along the kicker's axis, not along world y.
        // localDy increases as the skier moves downhill along that axis,
        // so the trigger window is (−10 uphill of the lip, +8 downhill
        // of it), matching the original axis-aligned tolerance.
        const angle = f.angle || 0;
        const ox = skier.x - f.x;
        const oy = worldY - f.y;
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const localDx = ox * cos - oy * sin;
        const localDy = ox * sin + oy * cos;
        if (Math.abs(localDy) > 28) continue;
        const halfW = f.w / 2;
        if (Math.abs(localDx) < halfW && localDy > -10 && localDy < 8) {
          launch(f, f.power);
          skier.airSource = "kicker";
          return;
        }
      } else if (f.type === "knuckle") {
        // The knuckle's uphill lip is a mini-kicker. If the skier rolls
        // into it at ground level (they skipped the main jump or came up
        // short) they get a small pop. Landings from the paired kicker
        // touch down past the lip so they won't retrigger this.
        const halfW = f.w / 2;
        const uphillEdge = f.y - f.topLen / 2;
        const dy = uphillEdge - worldY;
        if (Math.abs(dx) < halfW && dy > -8 && dy < 10) {
          skier.inAir = true;
          skier.vz = 55 + skier.speed * 0.12;
          skier.altitude = 0;
          skier.airStartY = worldY;
          skier.airHeading = skier.heading;
          skier.airSource = "knuckle";
          return;
        }
      } else if (f.type === "rail") {
        // Ground contact with a rail is a bump — no magical mount. You
        // have to be airborne (off the paired kicker) to actually grind.
        const angle = f.angle || 0;
        const ox = skier.x - f.x;
        const oy = worldY - f.y;
        const localDx = ox * Math.cos(-angle) - oy * Math.sin(-angle);
        const localDy = ox * Math.sin(-angle) + oy * Math.cos(-angle);
        if (Math.abs(localDx) < 4 && Math.abs(localDy) < f.len / 2 + 2) {
          skier.speed = Math.max(35, skier.speed - 55);
          // Nudge the skier to whichever side of the bar they hit from so
          // they don't retrigger the same bump next frame.
          const side = localDx >= 0 ? 1 : -1;
          const offX = side * 6;
          skier.x += offX * Math.cos(angle);
          worldY += offX * Math.sin(angle);
        }
      } else if (f.type === "tree") {
        const dy = f.y - worldY;
        if (Math.abs(dy) > 30) continue;
        const r = (f.size || 20) * 0.45;
        if (Math.abs(dx) < r && Math.abs(dy) < r) {
          // Soft speed tax. Deliberately NO heading change — bumping the
          // heading snowballed into the skier getting stuck off-piste.
          skier.speed = Math.max(45, skier.speed - 22);
        }
      }
    }
  }

  function launch(f: KickerFeature, power: number): void {
    skier.inAir = true;
    // Minimal speed contribution keeps airtime stable across the normal
    // speed range so the paired knuckle lands the skier reliably.
    skier.vz = power + skier.speed * 0.05;
    skier.airStartY = worldY;
    // Angled kickers (non–rail-approach) redirect takeoff onto the ramp
    // axis. Rail-approach lips preserve approach heading like normal
    // kickers so the arc is not snapped to the rail angle (you may miss).
    // Canvas y-down: rail angle +a pairs with takeoff heading −a when
    // redirecting.
    skier.airHeading =
      f.variant === "railApproach"
        ? skier.heading
        : f.angle != null
          ? -f.angle
          : skier.heading;
    skier.switchTakeoff = skier.switch;
  }

  function landFromAir(): void {
    skier.altitude = 0;

    const yawResMod = mod(skier.yawDeg, 180);
    const yawAligned = yawResMod < 45 || yawResMod > 135;

    const yawRounded = Math.round(Math.abs(skier.yawDeg) / 90) * 90;
    const airFeet = Math.round((worldY - skier.airStartY) / 6);

    if (yawAligned) {
      const grindFeet = skier.grindFeet || 0;
      const halfTurns = Math.round(skier.yawDeg / 180);
      if (halfTurns % 2 !== 0) skier.switch = !skier.switch;
      lastTrick = nameTrick(
        yawRounded,
        airFeet,
        skier.airSource,
        grindFeet,
        skier.switchTakeoff,
      );
      trickTimer = 2.8;
    } else {
      state = "crashed";
      lastTrick = sketchyLandingName();
      trickTimer = 4;
    }

    skier.inAir = false;
    skier.yawSpeed = 0;
    skier.yawDeg = 0;
    skier.yawSpun = 0;
    skier.airSource = null;
    skier.switchTakeoff = false;
    skier.grindSpun = 0;
    skier.grindFeet = 0;
  }

  // --- Trick naming --------------------------------------------------------

  function nameTrick(
    yawDeg: number,
    feet: number,
    source: AirSource,
    grindFeet: number,
    isSwitch: boolean,
  ): string {
    const parts = [];
    if (source === "rail" && grindFeet > 0)
      parts.push(`rail slide ${grindFeet}ft`);
    if (yawDeg >= 180) parts.push(`${yawDeg}°`);
    if (parts.length === 0) {
      if (isSwitch) return feet >= 12 ? `zero spin · ${feet} ft` : "zero spin";
      if (feet >= 12) return `${feet} ft air`;
      return "clean landing";
    }
    const name = `${parts.join(" + ")} · ${feet} ft`;
    return isSwitch ? `switch ${name}` : name;
  }

  function sketchyLandingName(): string {
    const opts = [
      "Yard sale!",
      "Tomahawk.",
      "Washed the landing.",
      "Caught an edge.",
      "Ate it.",
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // --- Drawing -------------------------------------------------------------

  function toScreenY(worldPointY: number): number {
    return SKIER_SCREEN_Y + (worldPointY - worldY);
  }

  function drawBackground(): void {
    ctx.fillStyle = "#fdfdfd";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawWallSpikes();
  }

  function drawWallSpikes(): void {
    // Two off-piste strips (left + right), each with a jagged inner edge
    // that scrolls with worldY. The strip is bounded by the canvas edge on
    // the outside and a zigzag between SLOPE_HALF+3 and SLOPE_HALF-4 on the
    // inside, so tips barely encroach into the piste.
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, 0);

    const baseInset = 3; // base of each tooth sits this far outside SLOPE_HALF
    const tipInset = 4; // tip protrudes this far INSIDE SLOPE_HALF
    const toothH = 26;

    for (const side of [-1, 1]) {
      const outerEdge = side * (CANVAS_WIDTH / 2 + 4);
      const baseX = side * (SLOPE_HALF + baseInset);
      const tipX = side * (SLOPE_HALF - tipInset);

      ctx.beginPath();
      ctx.moveTo(outerEdge, -6);
      ctx.lineTo(outerEdge, CANVAS_HEIGHT + 6);

      // Traverse back up the inner edge with a zigzag.
      const offset = mod(worldY, toothH);
      let y = CANVAS_HEIGHT + 6;
      ctx.lineTo(baseX, y);
      y = Math.ceil((CANVAS_HEIGHT + 6) / toothH) * toothH - offset;
      while (y > -6) {
        ctx.lineTo(tipX, y - toothH / 2);
        ctx.lineTo(baseX, y - toothH);
        y -= toothH;
      }
      // Top-left (or top-right) corner of the strip.
      ctx.lineTo(outerEdge, -6);
      ctx.closePath();

      ctx.fillStyle = "#e2e2e2";
      ctx.fill();

      // Crisp inner edge.
      ctx.strokeStyle = "rgba(160, 160, 160, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      let firstStroke = true;
      {
        const offset2 = mod(worldY, toothH);
        let yy = Math.ceil((CANVAS_HEIGHT + 6) / toothH) * toothH - offset2;
        ctx.moveTo(baseX, CANVAS_HEIGHT + 6);
        while (yy > -6) {
          ctx.lineTo(tipX, yy - toothH / 2);
          ctx.lineTo(baseX, yy - toothH);
          yy -= toothH;
          firstStroke = false;
        }
        if (firstStroke) ctx.lineTo(baseX, -6);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTrail(): void {
    if (trail.length < 2) return;
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, 0);
    ctx.strokeStyle = "rgba(110, 110, 110, 0.3)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    for (const side of [-2, 2]) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const sy = toScreenY(p.y);
        if (sy < -20) continue;
        if (sy > CANVAS_HEIGHT + 20) break;
        const perpX = Math.cos(p.h || 0) * side;
        const perpY = -Math.sin(p.h || 0) * side;
        const x = p.x + perpX;
        const y = sy + perpY;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (started) ctx.stroke();
    }
    ctx.restore();
  }

  // --- Features (constant size, no depth scaling) -------------------------

  function drawKicker(f: KickerFeature): void {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);
    ctx.rotate(f.angle || 0);

    const halfW = f.w / 2;
    const rampLen = f.rampLen;
    // Rail-approach kickers are physically smaller, so scale the front
    // cliff proportionally. Regular kickers keep the original 10.
    const frontDepth = f.variant === "railApproach" ? 6 : 10;

    // Shadow on downhill side.
    ctx.fillStyle = "rgba(60, 60, 60, 0.1)";
    ctx.beginPath();
    ctx.moveTo(-halfW + 3, frontDepth);
    ctx.lineTo(halfW + 3, frontDepth);
    ctx.lineTo(halfW + 8, frontDepth + 5);
    ctx.lineTo(-halfW + 8, frontDepth + 5);
    ctx.closePath();
    ctx.fill();

    // Front face (small cliff drop below lip).
    ctx.fillStyle = "#bfbfbf";
    ctx.fillRect(-halfW, 0, halfW * 2, frontDepth);

    // Top face (slightly tapered toward uphill).
    ctx.fillStyle = "#ededed";
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW * 0.88, -rampLen);
    ctx.lineTo(-halfW * 0.88, -rampLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 160, 160, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lip highlight.
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  }

  function drawKnuckle(f: KnuckleFeature): void {
    // The knuckle is a tapered snow mound: a short lip-face on the uphill
    // side (the "knuckle" the skier lands on top of), a flat top that is
    // the actual landing zone, and a long gentle output slope fading back
    // to piste on the downhill side.
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);

    const halfW = f.w / 2;
    const halfLen = f.topLen / 2;
    const outSlope = f.outSlope;
    const lipHeight = f.lipHeight;
    const topHalfW = halfW * 0.9;

    // Shadow cast downhill of the output slope.
    ctx.fillStyle = "rgba(60, 60, 60, 0.12)";
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.55 + 4, halfLen + outSlope);
    ctx.lineTo(halfW * 0.55 + 4, halfLen + outSlope);
    ctx.lineTo(halfW * 0.4 + 10, halfLen + outSlope + 6);
    ctx.lineTo(-halfW * 0.4 + 10, halfLen + outSlope + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.moveTo(-halfW, halfLen);
    ctx.lineTo(halfW, halfLen);
    ctx.lineTo(halfW * 0.55, halfLen + outSlope);
    ctx.lineTo(-halfW * 0.55, halfLen + outSlope);
    ctx.closePath();
    ctx.fill();

    // Uphill face — the short cliff that rises from the piste up to the
    // landing zone. Drawn above the top face in screen-y so the skier
    // sees it approaching.
    ctx.fillStyle = "#bfbfbf";
    ctx.beginPath();
    ctx.moveTo(-topHalfW, -halfLen - lipHeight);
    ctx.lineTo(topHalfW, -halfLen - lipHeight);
    ctx.lineTo(halfW, -halfLen);
    ctx.lineTo(-halfW, -halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    ctx.fill();

    // Top face (the landing zone). Taper slightly toward the uphill lip.
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.moveTo(-topHalfW, -halfLen);
    ctx.lineTo(topHalfW, -halfLen);
    ctx.lineTo(halfW, halfLen);
    ctx.lineTo(-halfW, halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 160, 160, 0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crisp lip on the uphill edge — this is the "knuckle" the skier
    // should land just past.
    ctx.beginPath();
    ctx.moveTo(-topHalfW, -halfLen);
    ctx.lineTo(topHalfW, -halfLen);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }

  function drawRail(f: RailFeature): void {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);

    const halfLen = f.len / 2;
    const barHalfW = 2.4;

    // Rotate for diagonal rails. The approach hump is now rendered by the
    // paired rail-approach kicker (see drawKicker).
    ctx.rotate(f.angle || 0);

    // Shadow under the rail (downhill side).
    ctx.fillStyle = "rgba(60, 60, 60, 0.18)";
    ctx.beginPath();
    ctx.ellipse(4, 0, 8, halfLen, 0, 0, TAU);
    ctx.fill();

    // Bar — dark underside first, then bright orange top.
    ctx.fillStyle = "#6a1f13";
    ctx.fillRect(-barHalfW, -halfLen, barHalfW * 2, f.len);

    ctx.fillStyle = "#e86633";
    ctx.fillRect(-barHalfW, -halfLen, barHalfW * 2 - 0.8, f.len);

    // Highlight strip.
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(-barHalfW, -halfLen, 0.9, f.len);

    ctx.restore();
  }

  function drawTree(f: TreeFeature): void {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);
    const s = f.size || 20;

    // Shadow.
    ctx.fillStyle = "rgba(60, 60, 60, 0.14)";
    ctx.beginPath();
    ctx.ellipse(s * 0.25, s * 0.85, s * 0.95, s * 0.3, 0, 0, TAU);
    ctx.fill();

    // Snow base.
    ctx.fillStyle = "#f2f2f2";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.7, s * 1.05, s * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(190, 190, 190, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Three tiers with jagged bottoms, then a little trunk / shadow at base.
    const tiers = [
      { cy: s * 0.55, hw: s * 0.9, dh: s * 0.85 },
      { cy: -s * 0.05, hw: s * 0.72, dh: s * 0.8 },
      { cy: -s * 0.65, hw: s * 0.52, dh: s * 0.85 },
    ];

    for (let ti = 0; ti < tiers.length; ti++) {
      const t = tiers[ti];
      const baseY = t.cy;
      const apexY = baseY - t.dh;
      // Body
      ctx.fillStyle = ti === tiers.length - 1 ? "#306849" : "#2a5c40";
      ctx.beginPath();
      const segs = 7;
      ctx.moveTo(-t.hw, baseY);
      for (let i = 1; i <= segs; i++) {
        const x = -t.hw + (2 * t.hw * i) / segs;
        const y = i % 2 === 0 ? baseY : baseY - s * 0.17;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(0, apexY);
      ctx.closePath();
      ctx.fill();

      // Right light face
      ctx.fillStyle = "rgba(120, 165, 125, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, apexY);
      ctx.lineTo(t.hw, baseY);
      ctx.lineTo(t.hw * 0.2, baseY);
      ctx.closePath();
      ctx.fill();

      // Small trunk/shadow accent at base of each tier (faint brown dot)
      if (ti === 0) {
        ctx.fillStyle = "rgba(170, 110, 70, 0.7)";
        ctx.beginPath();
        ctx.ellipse(0, baseY + s * 0.15, s * 0.2, s * 0.08, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Skier ---------------------------------------------------------------

  function drawSkier(): void {
    const screenX = CANVAS_WIDTH / 2 + skier.x;
    const screenY = SKIER_SCREEN_Y - skier.altitude;

    // Air shadow under the skier (hugs the piste).
    if (skier.inAir) {
      ctx.save();
      const alt = skier.altitude;
      const t = clamp(1 - alt / 140, 0.35, 1);
      ctx.fillStyle = `rgba(50, 50, 50, ${0.24 * t})`;
      ctx.beginPath();
      ctx.ellipse(
        CANVAS_WIDTH / 2 + skier.x,
        SKIER_SCREEN_Y + 3,
        7 * t,
        2.4 * t,
        0,
        0,
        TAU,
      );
      ctx.fill();
      ctx.restore();
    }

    // Shared geometry setup. In the air the torso keeps facing the travel
    // direction while the skis spin underneath. On rails, yaw rotates the
    // whole skier around the preserved travel line so sideways locks and
    // continuing spins read clearly without the rail re-aiming the skier.
    const bodyRotBase = skier.inAir ? skier.airHeading : skier.heading;
    const brakeAdd = !skier.inAir ? skier.brakeAnim * (Math.PI / 2) : 0;
    const yawRad =
      skier.inAir || skier.onFeature ? (skier.yawDeg * Math.PI) / 180 : 0;
    const bodyYaw = skier.onFeature ? yawRad : 0;
    const bodyRot = bodyRotBase + bodyYaw;
    const skiRot = skier.inAir ? bodyRotBase + yawRad : bodyRot;

    // Switch stance: short tail in the direction of travel. While airborne
    // we read from `switchTakeoff` so a switch takeoff starts reversed and
    // a 180° spin cancels it (yaw crosses π for a forward landing).
    const stanceSwitch = skier.inAir
      ? skier.switchTakeoff
      : skier.onFeature
        ? false
        : skier.switch;
    const jacket = "#2f62a6";
    const jacketEdge = "#1b3f76";
    const ski = "#d2523f";
    const head = "#e3b187";

    // Skis — rotated by bodyRot + yaw so they sweep around during a 360.
    // Each ski extends both ahead of and behind the skier's pivot (tip
    // forward, tail back) so that when the skier spins 180° they can
    // still see skis on both sides of the body — i.e. they can ride
    // switch. At yaw = 0 the tail sits behind/inside the torso (drawn
    // before the body, so it's hidden by the body fill); at yaw = 180°
    // the rotated tail pokes out in front of the body and the rotated
    // tip pokes out behind, reading as a clean switch stance.
    //
    // When riding switch on the ground we add π to the ski rotation only,
    // so the long "tip" end points uphill and the short "tail" end sits
    // in the direction of travel — the same asymmetry a spinning skier
    // has as yaw crosses 180°. The body transform stays unchanged.
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(-skiRot + brakeAdd + (stanceSwitch ? Math.PI : 0));
    ctx.fillStyle = ski;
    const skiTail = -6.5; // behind the pivot (into the torso at yaw=0)
    const skiTip = 8.7; //  ahead of the pivot
    const skiLen = skiTip - skiTail;
    ctx.fillRect(-3.1, skiTail, 1.5, skiLen);
    ctx.fillRect(1.6, skiTail, 1.5, skiLen);
    ctx.restore();

    // Body + head — on snow this stays aligned with travel. On rails we
    // include yaw so the whole skier can face across or away from the rail.
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(-bodyRot + brakeAdd);

    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(3, -6);
    ctx.lineTo(2.4, 2);
    ctx.lineTo(-2.4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = jacketEdge;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(0, -7.5, 1.9, 0, TAU);
    ctx.fill();

    ctx.restore();

    // Brake snow puff — flares out when you hockey-stop.
    if (!skier.inAir && skier.brakeAnim > 0.3 && skier.speed > 8) {
      ctx.save();
      ctx.translate(screenX, screenY + 6);
      ctx.fillStyle = "rgba(235, 235, 235, 0.85)";
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.25;
        const r = 3 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 6 - 2 + i, 1.5, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHud(): void {
    ctx.save();
    ctx.fillStyle = "rgba(50, 50, 50, 0.85)";
    ctx.font = '600 14px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.restore();

    if (trickTimer > 0 && lastTrick) {
      const a = clamp(trickTimer / 1.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(50, 50, 50, 0.9)";
      ctx.font = '28px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(lastTrick, CANVAS_WIDTH / 2, 44);
      ctx.restore();
    }
  }

  function draw(): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawTrail();

    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, 0);
    const sorted = features
      .slice()
      .sort((a, b) => toScreenY(a.y) - toScreenY(b.y));
    for (const f of sorted) {
      const sy = toScreenY(f.y);
      if (sy < -160 || sy > CANVAS_HEIGHT + 160) continue;
      if (f.type === "kicker") drawKicker(f);
      else if (f.type === "knuckle") drawKnuckle(f);
      else if (f.type === "rail") drawRail(f);
      else if (f.type === "tree") drawTree(f);
    }
    ctx.restore();

    drawSkier();
    drawHud();
  }

  function drawIdle(): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
  }

  function loop(ts: number): void {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    if (state === "playing" || state === "crashed") {
      raf = requestAnimationFrame(loop);
    }
  }

  // --- Input ---------------------------------------------------------------

  const trackedKeys = new Set<TrackedKey>([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    " ",
    "Enter",
  ]);

  function handleKey(e: KeyboardEvent): void {
    if (!trackedKeys.has(e.key as TrackedKey)) return;
    if (
      !wrapEl.contains(document.activeElement) &&
      document.activeElement !== wrapEl
    )
      return;
    e.preventDefault();

    if (e.key === "Enter" || e.key === " ") {
      if (state !== "playing") resetGame();
      return;
    }
    keys[e.key as TrackedKey] = true;
  }

  function handleKeyUp(e: KeyboardEvent): void {
    if (!trackedKeys.has(e.key as TrackedKey)) return;
    keys[e.key as TrackedKey] = false;
  }

  function setupCanvas(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const c = canvas.getContext("2d");
    if (!c) throw new Error("2D canvas context unavailable");
    ctx = c;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  onMount(() => {
    setupCanvas();
    drawIdle();
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
  });

  onDestroy(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", handleKey);
    window.removeEventListener("keyup", handleKeyUp);
    if (raf) cancelAnimationFrame(raf);
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap"
  />
</svelte:head>

<div
  class="ski"
  bind:this={wrapEl}
  tabindex="0"
  on:click={() => wrapEl.focus()}
>
  <div class="stage">
    <canvas bind:this={canvas} aria-label="Skiing game"></canvas>

    {#if state === "idle"}
      <div class="overlay">
        <button class="pill drop-in" type="button" on:click={resetGame}>
          <span class="drop-in__snow" aria-hidden="true">
            <span class="drop-in__layer drop-in__layer--1"></span>
            <span class="drop-in__layer drop-in__layer--2"></span>
            <span class="drop-in__layer drop-in__layer--3"></span>
          </span>
          <span class="drop-in__label">Drop in</span>
        </button>
      </div>
    {:else if state === "crashed"}
      <div class="overlay">
        <button class="pill drop-in" type="button" on:click={resetGame}>
          <span class="drop-in__snow" aria-hidden="true">
            <span class="drop-in__layer drop-in__layer--1"></span>
            <span class="drop-in__layer drop-in__layer--2"></span>
            <span class="drop-in__layer drop-in__layer--3"></span>
          </span>
          <span class="drop-in__label">Drop in</span>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .ski {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    isolation: isolate;
    color: #1b1615;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    outline: none;
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    aspect-ratio: 440 / 560;
    image-rendering: -webkit-optimize-contrast;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 1.2rem;
    text-align: center;
    background: rgba(250, 250, 250, 0.78);
    backdrop-filter: blur(4px) saturate(130%);
    -webkit-backdrop-filter: blur(4px) saturate(130%);
    color: #1b1615;
  }
  /* .pill from global.css: padding, radius, type. Border/shadow toggled off here. */
  .drop-in {
    --drop-in-surface: rgba(92, 90, 87, 0.66);
    --drop-in-surface-hover: rgba(79, 77, 74, 0.8);
    position: relative;
    z-index: 0;
    align-self: center;
    overflow: hidden;
    isolation: isolate;
    border: none;
    box-shadow: none;
    /* omit box-shadow from transition (see global .pill:hover) */
    transition:
      transform var(--dur-2) var(--ease-out-soft),
      background var(--dur-2) var(--ease-out-soft),
      color var(--dur-2) var(--ease-out-soft);
    background: var(--drop-in-surface);
    backdrop-filter: blur(12px) saturate(130%);
    -webkit-backdrop-filter: blur(12px) saturate(130%);
    /* .pill is built for var(--text); this surface needs a light label */
    color: #f2f0ec;
  }

  .drop-in__label {
    position: relative;
    z-index: 2;
  }

  .drop-in__snow {
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    pointer-events: none;
    overflow: hidden;
  }

  .drop-in__layer {
    position: absolute;
    inset: -20% -10% -5%;
    width: 120%;
    height: 140%;
    will-change: transform;
  }

  .drop-in__layer--1 {
    background-image: radial-gradient(
        circle 1.2px at 8% 12%,
        rgba(255, 255, 255, 0.95) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.5px at 22% 8%,
        rgba(255, 255, 255, 0.85) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1px at 38% 20%,
        rgba(255, 255, 255, 0.75) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.3px at 55% 4%,
        rgba(255, 255, 255, 0.9) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.1px at 72% 16%,
        rgba(255, 255, 255, 0.8) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.4px at 88% 10%,
        rgba(255, 255, 255, 0.88) 0%,
        transparent 100%
      );
    opacity: 0.65;
    animation: btn-snow-fall-1 7s linear infinite;
  }

  .drop-in__layer--2 {
    background-image: radial-gradient(
        circle 0.9px at 12% 30%,
        rgba(255, 255, 255, 0.7) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.2px at 35% 22%,
        rgba(255, 255, 255, 0.85) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1px at 58% 18%,
        rgba(255, 255, 255, 0.65) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 1.1px at 78% 28%,
        rgba(255, 255, 255, 0.78) 0%,
        transparent 100%
      );
    opacity: 0.5;
    filter: blur(0.2px);
    animation: btn-snow-fall-2 5.2s linear infinite;
  }

  .drop-in__layer--3 {
    background-image: radial-gradient(
        circle 0.7px at 18% 5%,
        rgba(200, 230, 255, 0.65) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 0.8px at 50% 12%,
        rgba(255, 255, 255, 0.6) 0%,
        transparent 100%
      ),
      radial-gradient(
        circle 0.6px at 80% 8%,
        rgba(220, 240, 255, 0.7) 0%,
        transparent 100%
      );
    opacity: 0.45;
    animation: btn-snow-fall-3 4.1s linear infinite;
  }

  @keyframes btn-snow-fall-1 {
    from {
      transform: translate3d(0, -8%, 0);
    }
    to {
      transform: translate3d(2px, 42%, 0);
    }
  }
  @keyframes btn-snow-fall-2 {
    from {
      transform: translate3d(1px, -4%, 0);
    }
    to {
      transform: translate3d(-3px, 45%, 0);
    }
  }
  @keyframes btn-snow-fall-3 {
    from {
      transform: translate3d(-1px, -2%, 0) scale(0.95);
    }
    to {
      transform: translate3d(1px, 50%, 0) scale(1.02);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drop-in__layer--1,
    .drop-in__layer--2,
    .drop-in__layer--3 {
      animation: none;
    }
  }

  :global(.pill.drop-in:hover) {
    background: var(--drop-in-surface-hover);
    color: #f2f0ec;
    border: none;
    box-shadow: none;
  }
</style>

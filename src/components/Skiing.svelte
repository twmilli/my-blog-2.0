<script>
  import { onMount, onDestroy } from "svelte";

  const W = 440;
  const H = 560;
  const SKIER_SCREEN_Y = Math.round(H * 0.3);
  const SLOPE_HALF = 150;

  const TAU = Math.PI * 2;
  const RAD2DEG = 180 / Math.PI;

  let canvas;
  let wrapEl;
  let ctx;
  let raf;
  let lastTs = 0;
  let dpr = 1;

  // idle | playing | crashed
  let state = "idle";
  let lastTrick = "";
  let trickTimer = 0;

  let skier;
  let worldY;
  let features;
  let nextFeatureY;
  let trail;
  let wallSpikes; // procedural wall spikes

  const keys = {};

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const approach = (v, t, rate, dt) => v + (t - v) * Math.min(1, rate * dt);
  const rand = (min, max) => min + Math.random() * (max - min);
  const mod = (v, m) => ((v % m) + m) % m;

  function resetGame() {
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

      // Pitch (flip)
      pitchDeg: 0,
      pitchSpeed: 0,
      pitchSpun: 0,
      pitchDir: 0,

      // Switch stance
      switch: false,
      switchTakeoff: false,
    };
    worldY = 0;
    features = [];
    nextFeatureY = 220;
    trail = [];
    wallSpikes = [];
    lastTrick = "";
    trickTimer = 0;
    state = "playing";
    lastTs = performance.now();
    spawnFeatures();
    primeWallSpikes();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    if (wrapEl) wrapEl.focus();
  }

  // --- Feature generation --------------------------------------------------

  let _featureId = 0;

  function spawnFeatures() {
    const ahead = worldY + H * 2.2;
    while (nextFeatureY < ahead) {
      const roll = Math.random();
      const cx = rand(-SLOPE_HALF + 40, SLOPE_HALF - 40);
      if (roll < 0.38) {
        // Kicker + paired knuckle landing zone. The kicker is the launch
        // ramp only; the knuckle is a separate mound placed so the
        // ballistic arc reliably lands on its top face.
        const kickerId = ++_featureId;
        const gap = rand(120, 140);
        const topLen = 150;
        const outSlope = 36;
        features.push({
          id: kickerId,
          type: "kicker",
          x: cx,
          y: nextFeatureY,
          w: rand(54, 72),
          rampLen: rand(30, 40),
          power: rand(175, 200),
          pairedKnuckleId: kickerId + 1,
        });
        features.push({
          id: ++_featureId,
          type: "knuckle",
          x: cx,
          y: nextFeatureY + gap + topLen / 2,
          w: rand(84, 104),
          topLen,
          outSlope,
          lipHeight: 10,
          pairedKickerId: kickerId,
        });
        nextFeatureY += gap + topLen + outSlope + rand(180, 240);
      } else if (roll < 0.52) {
        // Rail — always paired with a small approach kicker. The kicker is
        // a real kicker under the hood (shares physics with the big
        // kicker + knuckle pair) but is tiny and low-powered so the
        // ballistic arc lands the skier on the rail rather than over it.
        const railKickerId = ++_featureId;
        const railId = railKickerId + 1;
        const gap = rand(18, 26);
        const len = rand(70, 110);
        const angle = rand(-0.28, 0.28);
        features.push({
          id: railKickerId,
          type: "kicker",
          variant: "railApproach",
          x: cx,
          y: nextFeatureY,
          w: rand(38, 50),
          rampLen: rand(22, 30),
          power: rand(95, 120),
          pairedRailId: railId,
        });
        features.push({
          id: ++_featureId,
          type: "rail",
          x: cx,
          y: nextFeatureY + gap + len / 2,
          len,
          angle,
          height: 6,
          pairedKickerId: railKickerId,
        });
        nextFeatureY += gap + len + rand(130, 200);
      } else if (roll < 0.7) {
        // Tree: side only
        const side = Math.random() < 0.5 ? -1 : 1;
        features.push({
          id: ++_featureId,
          type: "tree",
          x: side * rand(70, SLOPE_HALF - 4),
          y: nextFeatureY,
          size: rand(18, 26),
        });
        nextFeatureY += rand(30, 70);
      } else if (roll < 0.86) {
        // Gate (orange pole)
        const pair = Math.random() < 0.45;
        features.push({
          id: ++_featureId,
          type: "gate",
          x: cx,
          y: nextFeatureY,
        });
        if (pair) {
          features.push({
            id: ++_featureId,
            type: "gate",
            x: cx + (cx > 0 ? -rand(24, 38) : rand(24, 38)),
            y: nextFeatureY + rand(-4, 4),
          });
        }
        nextFeatureY += rand(70, 130);
      } else {
        // Tree cluster
        const side = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < 5; i++) {
          features.push({
            id: ++_featureId,
            type: "tree",
            x: side * rand(70, SLOPE_HALF - 4) + rand(-6, 6),
            y: nextFeatureY + i * rand(16, 28),
            size: rand(16, 26),
          });
        }
        nextFeatureY += 140;
      }
    }
    features = features.filter(
      (f) => f.y > worldY - 400 && f.y < worldY + H * 2.6,
    );
  }

  // Walls are now drawn as a continuous shaded strip with a small jagged
  // inner edge — see drawPisteWalls. No per-spike data needed.
  function primeWallSpikes() {}
  function maintainWallSpikes() {}

  // --- Update loop ---------------------------------------------------------

  function update(dt) {
    if (state !== "playing") return;

    const steer =
      (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    const pitchIn =
      (keys.ArrowUp ? 1 : 0) + (keys.ArrowDown ? -1 : 0);

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

      // Pitch (flip)
      skier.pitchSpeed += pitchIn * 720 * dt;
      skier.pitchSpeed = clamp(skier.pitchSpeed, -720, 720);
      skier.pitchSpeed *= Math.pow(0.985, dt * 60);
      skier.pitchDeg += skier.pitchSpeed * dt;
      skier.pitchSpun += Math.abs(skier.pitchSpeed) * dt;
      if (pitchIn !== 0) skier.pitchDir = pitchIn;
      else if (skier.pitchSpeed !== 0 && skier.pitchDir === 0)
        skier.pitchDir = Math.sign(skier.pitchSpeed);

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
      if (!f) {
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
        const localDx =
          ox * Math.cos(-railAngle) - oy * Math.sin(-railAngle);
        const localDy =
          ox * Math.sin(-railAngle) + oy * Math.cos(-railAngle);

        // Leave the grind as soon as the preserved path exits the rail's
        // usable footprint, either by running off the end or sliding off
        // the side.
        if (
          Math.abs(localDx) > 5 ||
          localDy < -f.len / 2 ||
          localDy > f.len / 2
        ) {
          skier.inAir = true;
          // Small speed-scaled pop off the end — a gentle ollie rather
          // than a real jump.
          skier.vz = 18 + skier.speed * 0.22;
          skier.altitude = 0;
          skier.airStartY = worldY;
          skier.airHeading = travelHeading;
          skier.airSource = f.type;
          skier.pitchDir = 0;
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
    const halfW = W / 2 - 20;
    if (skier.x < -halfW) {
      skier.x = -halfW;
      // Force heading positive (rightward) at a firm rate if still pushing left.
      if (skier.heading < 0.2) skier.heading = Math.min(0.2, skier.heading + 4 * dt);
      // Keep some speed so you can actually escape.
      skier.speed = Math.max(skier.speed, 35);
    }
    if (skier.x > halfW) {
      skier.x = halfW;
      if (skier.heading > -0.2) skier.heading = Math.max(-0.2, skier.heading - 4 * dt);
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

  function crashFromAir() {
    skier.altitude = 0;
    skier.inAir = false;
    skier.vz = 0;
    skier.onFeature = null;
    skier.yawSpeed = 0;
    skier.yawDeg = 0;
    skier.yawSpun = 0;
    skier.pitchSpeed = 0;
    skier.pitchDeg = 0;
    skier.pitchSpun = 0;
    skier.pitchDir = 0;
    skier.airSource = null;
    skier.switchTakeoff = false;
    skier.grindSpun = 0;
    skier.grindFeet = 0;
    state = "crashed";
    lastTrick = sketchyLandingName();
    trickTimer = 4;
  }

  function mountRailFromAir(f) {
    const pitchResMod = mod(skier.pitchDeg, 180);
    const pitchAligned = pitchResMod < 45 || pitchResMod > 135;

    if (!pitchAligned) {
      crashFromAir();
      return true;
    }

    skier.altitude = 0;
    skier.inAir = false;
    skier.vz = 0;
    skier.onFeature = f.id;
    skier.heading = skier.airHeading;
    // Rail catches preserve yaw so the skier can land sideways and keep
    // spinning, but pitching has to settle immediately onto the feature.
    // Importantly, the catch does not nudge x/y or re-aim the trajectory.
    skier.pitchSpeed = 0;
    skier.pitchDeg = 0;
    skier.pitchSpun = 0;
    skier.pitchDir = 0;
    skier.grindFeet = 0;
    skier.grindSpun = 0;
    return true;
  }

  // Rails can be caught once the skier is actually descending and close to
  // the bar. Unlike a snow landing, a rail catch preserves yaw so you can
  // lock in sideways or keep spinning while the rail constrains travel.
  function tryMountRailFromAir() {
    for (const f of features) {
      if (f.type !== "rail") continue;
      const ox = skier.x - f.x;
      const oy = worldY - f.y;
      const cos = Math.cos(-(f.angle || 0));
      const sin = Math.sin(-(f.angle || 0));
      const localDx = ox * cos - oy * sin;
      const localDy = ox * sin + oy * cos;
      const descending = skier.vz <= 0;
      const catchHeight = 14 + (f.height || 0);
      if (!descending || skier.altitude > catchHeight) continue;
      if (Math.abs(localDx) < 5 && Math.abs(localDy) < f.len / 2) {
        return mountRailFromAir(f);
      }
    }
    return false;
  }

  function handleFeatureEntry() {
    for (const f of features) {
      const dx = f.x - skier.x;

      if (f.type === "kicker") {
        const dy = f.y - worldY;
        if (Math.abs(dy) > 28) continue;
        const halfW = f.w / 2;
        if (Math.abs(dx) < halfW && dy > -8 && dy < 10) {
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
          skier.pitchDir = 0;
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
      } else if (f.type === "gate") {
        const dy = f.y - worldY;
        if (Math.abs(dy) > 20) continue;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          skier.speed = Math.max(60, skier.speed - 4);
        }
      }
    }
  }

  function launch(f, power) {
    skier.inAir = true;
    // Minimal speed contribution keeps airtime stable across the normal
    // speed range so the paired knuckle lands the skier reliably.
    skier.vz = power + skier.speed * 0.05;
    skier.airStartY = worldY;
    skier.airHeading = skier.heading;
    skier.pitchDir = 0;
    skier.switchTakeoff = skier.switch;
  }

  function landFromAir() {
    skier.altitude = 0;

    const yawResMod = mod(skier.yawDeg, 180);
    const pitchResMod = mod(skier.pitchDeg, 180);
    const yawAligned = yawResMod < 45 || yawResMod > 135;
    const pitchAligned = pitchResMod < 45 || pitchResMod > 135;

    const yawRounded = Math.round(Math.abs(skier.yawDeg) / 90) * 90;
    const pitchRoundedAbs = Math.round(skier.pitchSpun / 180) * 180;
    const airFeet = Math.round((worldY - skier.airStartY) / 6);

    if (yawAligned && pitchAligned) {
      const grindFeet = skier.grindFeet || 0;
      const halfTurns = Math.round(skier.yawDeg / 180);
      if (halfTurns % 2 !== 0) skier.switch = !skier.switch;
      lastTrick = nameTrick(
        yawRounded,
        pitchRoundedAbs,
        skier.pitchDir,
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
    skier.pitchSpeed = 0;
    skier.pitchDeg = 0;
    skier.pitchSpun = 0;
    skier.pitchDir = 0;
    skier.airSource = null;
    skier.switchTakeoff = false;
    skier.grindSpun = 0;
    skier.grindFeet = 0;
  }

  // --- Trick naming --------------------------------------------------------

  function flipName(deg, dir) {
    const base = dir > 0 ? "frontflip" : "backflip";
    if (deg >= 900) return `quintuple ${base}`;
    if (deg >= 720) return `quadruple ${base}`;
    if (deg >= 540) return `triple ${base}`;
    if (deg >= 360) return `double ${base}`;
    if (deg >= 180) return base;
    return "";
  }

  function nameTrick(yawDeg, pitchDeg, pitchDir, feet, source, grindFeet, isSwitch) {
    const parts = [];
    if (source === "rail" && grindFeet > 0) parts.push(`rail slide ${grindFeet}ft`);
    if (yawDeg >= 180) parts.push(`${yawDeg}°`);
    const fn = flipName(pitchDeg, pitchDir || 1);
    if (fn) parts.push(fn);
    if (parts.length === 0) {
      if (isSwitch) return feet >= 12 ? `zero spin · ${feet} ft` : "zero spin";
      if (feet >= 12) return `${feet} ft air`;
      return "clean landing";
    }
    const name = `${parts.join(" + ")} · ${feet} ft`;
    return isSwitch ? `switch ${name}` : name;
  }

  function sketchyLandingName() {
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

  function toScreenY(worldPointY) {
    return SKIER_SCREEN_Y + (worldPointY - worldY);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#eef2f1");
    g.addColorStop(SKIER_SCREEN_Y / H, "#fdfefe");
    g.addColorStop(1, "#f4f7f6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawWallSpikes();

    // Top fade (behind the skier dissolves into the sky).
    const top = ctx.createLinearGradient(0, 0, 0, 140);
    top.addColorStop(0, "rgba(234,240,239,0.9)");
    top.addColorStop(1, "rgba(234,240,239,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 140);

    // Bottom haze (distant horizon).
    const bot = ctx.createLinearGradient(0, H * 0.75, 0, H);
    bot.addColorStop(0, "rgba(255,255,255,0)");
    bot.addColorStop(1, "rgba(255,255,255,0.5)");
    ctx.fillStyle = bot;
    ctx.fillRect(0, H * 0.75, W, H * 0.25);
  }

  function drawWallSpikes() {
    // Two off-piste strips (left + right), each with a jagged inner edge
    // that scrolls with worldY. The strip is bounded by the canvas edge on
    // the outside and a zigzag between SLOPE_HALF+3 and SLOPE_HALF-4 on the
    // inside, so tips barely encroach into the piste.
    ctx.save();
    ctx.translate(W / 2, 0);

    const baseInset = 3; // base of each tooth sits this far outside SLOPE_HALF
    const tipInset = 4; // tip protrudes this far INSIDE SLOPE_HALF
    const toothH = 26;

    for (const side of [-1, 1]) {
      const outerEdge = side * (W / 2 + 4);
      const baseX = side * (SLOPE_HALF + baseInset);
      const tipX = side * (SLOPE_HALF - tipInset);

      ctx.beginPath();
      ctx.moveTo(outerEdge, -6);
      ctx.lineTo(outerEdge, H + 6);

      // Traverse back up the inner edge with a zigzag.
      const offset = mod(worldY, toothH);
      let y = H + 6;
      ctx.lineTo(baseX, y);
      y = Math.ceil((H + 6) / toothH) * toothH - offset;
      while (y > -6) {
        ctx.lineTo(tipX, y - toothH / 2);
        ctx.lineTo(baseX, y - toothH);
        y -= toothH;
      }
      // Top-left (or top-right) corner of the strip.
      ctx.lineTo(outerEdge, -6);
      ctx.closePath();

      // Fill — subtle gradient from the canvas edge to the piste lip.
      const g = ctx.createLinearGradient(outerEdge, 0, tipX, 0);
      g.addColorStop(0, "#d7dfdd");
      g.addColorStop(0.75, "#dfe6e4");
      g.addColorStop(1, "#e9eeec");
      ctx.fillStyle = g;
      ctx.fill();

      // Crisp inner edge.
      ctx.strokeStyle = "rgba(150, 168, 166, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      let firstStroke = true;
      {
        const offset2 = mod(worldY, toothH);
        let yy = Math.ceil((H + 6) / toothH) * toothH - offset2;
        ctx.moveTo(baseX, H + 6);
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

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.translate(W / 2, 0);
    ctx.strokeStyle = "rgba(100, 120, 120, 0.3)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    for (const side of [-2, 2]) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const sy = toScreenY(p.y);
        if (sy < -20) continue;
        if (sy > H + 20) break;
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

  function drawKicker(f) {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);

    const halfW = f.w / 2;
    const rampLen = f.rampLen;
    // Rail-approach kickers are physically smaller, so scale the front
    // cliff proportionally. Regular kickers keep the original 10.
    const frontDepth = f.variant === "railApproach" ? 6 : 10;

    // Shadow on downhill side.
    ctx.fillStyle = "rgba(58, 76, 80, 0.1)";
    ctx.beginPath();
    ctx.moveTo(-halfW + 3, frontDepth);
    ctx.lineTo(halfW + 3, frontDepth);
    ctx.lineTo(halfW + 8, frontDepth + 5);
    ctx.lineTo(-halfW + 8, frontDepth + 5);
    ctx.closePath();
    ctx.fill();

    // Front face (small cliff drop below lip).
    ctx.fillStyle = "#b7c6c3";
    ctx.fillRect(-halfW, 0, halfW * 2, frontDepth);

    // Top face (slightly tapered toward uphill).
    ctx.fillStyle = "#edf1f0";
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW * 0.88, -rampLen);
    ctx.lineTo(-halfW * 0.88, -rampLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 168, 166, 0.65)";
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

  function drawKnuckle(f) {
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
    ctx.fillStyle = "rgba(58, 76, 80, 0.12)";
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.55 + 4, halfLen + outSlope);
    ctx.lineTo(halfW * 0.55 + 4, halfLen + outSlope);
    ctx.lineTo(halfW * 0.4 + 10, halfLen + outSlope + 6);
    ctx.lineTo(-halfW * 0.4 + 10, halfLen + outSlope + 6);
    ctx.closePath();
    ctx.fill();

    // Output slope — soft gradient fading into the snow.
    const outGrad = ctx.createLinearGradient(0, halfLen, 0, halfLen + outSlope);
    outGrad.addColorStop(0, "#dde4e2");
    outGrad.addColorStop(1, "rgba(239, 243, 242, 0)");
    ctx.fillStyle = outGrad;
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
    ctx.fillStyle = "#b7c6c3";
    ctx.beginPath();
    ctx.moveTo(-topHalfW, -halfLen - lipHeight);
    ctx.lineTo(topHalfW, -halfLen - lipHeight);
    ctx.lineTo(halfW, -halfLen);
    ctx.lineTo(-halfW, -halfLen);
    ctx.closePath();
    ctx.fill();
    const faceGrad = ctx.createLinearGradient(
      0,
      -halfLen - lipHeight,
      0,
      -halfLen,
    );
    faceGrad.addColorStop(0, "rgba(0,0,0,0.04)");
    faceGrad.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Top face (the landing zone). Taper slightly toward the uphill lip.
    ctx.fillStyle = "#eff3f2";
    ctx.beginPath();
    ctx.moveTo(-topHalfW, -halfLen);
    ctx.lineTo(topHalfW, -halfLen);
    ctx.lineTo(halfW, halfLen);
    ctx.lineTo(-halfW, halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 168, 166, 0.55)";
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

  function drawRail(f) {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);

    const halfLen = f.len / 2;
    const barHalfW = 2.4;

    // Rotate for diagonal rails. The approach hump is now rendered by the
    // paired rail-approach kicker (see drawKicker).
    ctx.rotate(f.angle || 0);

    // Shadow under the rail (downhill side).
    ctx.fillStyle = "rgba(58, 76, 80, 0.18)";
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

  function drawTree(f) {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);
    const s = f.size || 20;

    // Shadow.
    ctx.fillStyle = "rgba(58, 76, 80, 0.14)";
    ctx.beginPath();
    ctx.ellipse(s * 0.25, s * 0.85, s * 0.95, s * 0.3, 0, 0, TAU);
    ctx.fill();

    // Snow base.
    ctx.fillStyle = "#f1f5f4";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.7, s * 1.05, s * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 200, 198, 0.6)";
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

  function drawGate(f) {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);
    ctx.fillStyle = "rgba(58, 76, 80, 0.22)";
    ctx.beginPath();
    ctx.ellipse(1.5, 1, 2.4, 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e16a2d";
    ctx.fillRect(-1, -11, 2, 12);
    ctx.fillStyle = "#f58c4a";
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(5, -9.5);
    ctx.lineTo(0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Skier ---------------------------------------------------------------

  function drawSkier() {
    const screenX = W / 2 + skier.x;
    const screenY = SKIER_SCREEN_Y - skier.altitude;

    // Air shadow under the skier (hugs the piste).
    if (skier.inAir) {
      ctx.save();
      const alt = skier.altitude;
      const t = clamp(1 - alt / 140, 0.35, 1);
      ctx.fillStyle = `rgba(40, 54, 58, ${0.24 * t})`;
      ctx.beginPath();
      ctx.ellipse(
        W / 2 + skier.x,
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
    const pitchRad = (skier.pitchDeg / RAD2DEG) || 0;
    const yawRad =
      skier.inAir || skier.onFeature ? (skier.yawDeg * Math.PI) / 180 : 0;
    const bodyYaw = skier.onFeature ? yawRad : 0;
    const bodyRot = bodyRotBase + bodyYaw;
    const skiRot = skier.inAir ? bodyRotBase + yawRad : bodyRot;
    const pitchCos = skier.inAir ? Math.cos(pitchRad) : 1;
    const pitchSin = skier.inAir ? Math.sin(pitchRad) : 0;
    const tuckAmount = Math.abs(pitchSin); // 0..1
    const scaleX = 1 - 0.62 * tuckAmount;
    const scaleY = pitchCos || 0.001;

    const showBack = skier.inAir && pitchCos < 0;
    // Switch stance applies the same "short tail in the direction of
    // travel" ski flip in both air and ground. While airborne we read
    // from `switchTakeoff` so that a switch takeoff starts with the
    // flip and a 180° spin naturally cancels it (yaw rotates through
    // π and the skis end up regular for a forward landing).
    const stanceSwitch = skier.inAir
      ? skier.switchTakeoff
      : skier.onFeature
        ? false
        : skier.switch;
    const jacket = showBack ? "#173468" : "#2f62a6";
    const jacketEdge = showBack ? "#0f2546" : "#1b3f76";
    const ski = showBack ? "#a0392b" : "#d2523f";
    const head = showBack ? "#b68966" : "#e3b187";

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
    ctx.scale(scaleX, scaleY);
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
    ctx.scale(scaleX, scaleY);

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
      ctx.fillStyle = "rgba(230, 240, 238, 0.85)";
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

  function drawHud() {
    ctx.save();
    ctx.fillStyle = "rgba(40, 54, 58, 0.85)";
    ctx.font =
      '600 14px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.restore();

    if (trickTimer > 0 && lastTrick) {
      const a = clamp(trickTimer / 1.2, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(40, 54, 58, 0.9)";
      ctx.font =
        '28px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(lastTrick, W / 2, 44);
      ctx.restore();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawTrail();

    ctx.save();
    ctx.translate(W / 2, 0);
    const sorted = features.slice().sort((a, b) => toScreenY(a.y) - toScreenY(b.y));
    for (const f of sorted) {
      const sy = toScreenY(f.y);
      if (sy < -160 || sy > H + 160) continue;
      if (f.type === "kicker") drawKicker(f);
      else if (f.type === "knuckle") drawKnuckle(f);
      else if (f.type === "rail") drawRail(f);
      else if (f.type === "tree") drawTree(f);
      else if (f.type === "gate") drawGate(f);
    }
    ctx.restore();

    drawSkier();
    drawHud();
  }

  function drawIdle() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    if (state === "playing" || state === "crashed") {
      raf = requestAnimationFrame(loop);
    }
  }

  // --- Input ---------------------------------------------------------------

  const trackedKeys = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    " ",
    "Enter",
  ]);

  function handleKey(e) {
    if (!trackedKeys.has(e.key)) return;
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
    keys[e.key] = true;
  }

  function handleKeyUp(e) {
    if (!trackedKeys.has(e.key)) return;
    keys[e.key] = false;
  }

  function setupCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx = canvas.getContext("2d");
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

<div class="ski" bind:this={wrapEl} tabindex="0" on:click={() => wrapEl.focus()}>
  <div class="stage">
    <canvas bind:this={canvas} aria-label="Skiing game"></canvas>

    {#if state === "idle"}
      <div class="overlay">
        <button class="btn" on:click={resetGame}>Drop in</button>
      </div>
    {:else if state === "crashed"}
      <div class="overlay">
        <button class="btn" on:click={resetGame}>Drop in</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .ski {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    min-height: 520px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    isolation: isolate;
    padding: 1.25rem;
    color: #1b1615;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    outline: none;
  }

  .ski:focus-visible {
    border-color: rgba(47, 125, 92, 0.55);
    box-shadow:
      var(--shadow-md),
      0 0 0 3px rgba(47, 125, 92, 0.18);
  }

  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: #fafbfa;
    border: 1px solid rgba(180, 195, 192, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    display: block;
    width: 100%;
    height: auto;
    max-height: 100%;
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
    background: rgba(250, 251, 250, 0.78);
    backdrop-filter: blur(4px) saturate(130%);
    -webkit-backdrop-filter: blur(4px) saturate(130%);
    color: #1b1615;
  }
  .btn {
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem 1.1rem;
    border-radius: 999px;
    background: #28363a;
    color: #fdfbf6;
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 0.92rem;
    text-decoration: none;
    border: 1px solid #28363a;
    box-shadow: 0 6px 16px rgba(40, 54, 58, 0.18);
    cursor: pointer;
    transition:
      transform var(--dur-2) var(--ease-out-soft),
      box-shadow var(--dur-2) var(--ease-out-soft),
      background var(--dur-2) var(--ease-out-soft);
  }
  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(40, 54, 58, 0.24);
    background: #1e2a2d;
  }
</style>

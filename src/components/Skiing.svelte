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
  let distance = 0;
  let best = 0;
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
      // Whether we popped from a box/rail (affects naming)
      airSource: null, // 'kicker' | 'box' | 'rail' | null
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
    };
    worldY = 0;
    distance = 0;
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
      if (roll < 0.22) {
        // Kicker — the classic launch ramp
        features.push({
          id: ++_featureId,
          type: "kicker",
          x: cx,
          y: nextFeatureY,
          w: rand(60, 90),
          rampLen: rand(34, 48),
          power: rand(85, 130),
        });
        nextFeatureY += rand(180, 280);
      } else if (roll < 0.38) {
        // Box — flat-topped, approach ramp on uphill side
        const len = rand(52, 82);
        features.push({
          id: ++_featureId,
          type: "box",
          x: cx,
          y: nextFeatureY,
          w: rand(56, 76),
          len,
          rampLen: rand(22, 34),
          height: rand(14, 22),
        });
        nextFeatureY += len + rand(150, 230);
      } else if (roll < 0.52) {
        // Rail — orange bar, small approach hump
        const len = rand(70, 110);
        const angle = rand(-0.28, 0.28);
        features.push({
          id: ++_featureId,
          type: "rail",
          x: cx,
          y: nextFeatureY,
          len,
          angle,
          rampLen: 16,
          height: 6,
        });
        nextFeatureY += len + rand(130, 200);
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
      // Yaw (ring indicator, body does NOT rotate).
      skier.yawSpeed += steer * 620 * dt;
      skier.yawSpeed = clamp(skier.yawSpeed, -680, 680);
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

      if (skier.altitude <= 0) {
        landFromAir();
      }
    } else if (skier.onFeature) {
      // ---- GRINDING on a rail/box top ----------------------------------
      const f = features.find((ft) => ft.id === skier.onFeature);
      if (!f) {
        skier.onFeature = null;
      } else {
        // Allow mild steering while grinding so you can bail cleanly.
        skier.heading += steer * 0.5 * dt;
        skier.heading = clamp(skier.heading, -1.1, 1.1);

        const endY = f.y + (f.len || 30) / 2;
        const startY = f.y - (f.len || 30) / 2;
        skier.x += Math.sin(skier.heading) * skier.speed * dt;
        worldY += Math.cos(skier.heading) * skier.speed * dt;
        skier.grindSpun = (skier.grindSpun || 0) + dt;
        if (worldY > endY) {
          skier.inAir = true;
          skier.vz = 32 + skier.speed * 0.12;
          skier.airStartY = worldY;
          skier.airHeading = skier.heading;
          skier.airSource = f.type;
          skier.pitchDir = 0;
          skier.grindFeet = Math.round(
            Math.max(0, (worldY - startY)) / 6,
          );
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

    distance = Math.round(worldY / 6);
    if (distance > best) best = distance;

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
      } else if (f.type === "box") {
        // Lock on while the skier is anywhere along the approach ramp.
        const halfW = f.w / 2;
        const rampTop = f.y - f.len / 2 - f.rampLen; // uphill edge of ramp
        const rampBase = f.y - f.len / 2; // base of ramp = top-of-box entry
        if (
          Math.abs(dx) < halfW &&
          worldY > rampTop - 4 &&
          worldY < rampBase + 6
        ) {
          skier.onFeature = f.id;
          skier.grindSpun = 0;
          skier.grindFeet = 0;
          return;
        }
      } else if (f.type === "rail") {
        const rampTop = f.y - f.len / 2 - f.rampLen;
        const rampBase = f.y - f.len / 2;
        if (
          Math.abs(dx) < 14 &&
          worldY > rampTop - 4 &&
          worldY < rampBase + 4
        ) {
          skier.onFeature = f.id;
          skier.grindSpun = 0;
          skier.grindFeet = 0;
          return;
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
    skier.vz = power + skier.speed * 0.18;
    skier.airStartY = worldY;
    skier.airHeading = skier.heading;
    skier.pitchDir = 0;
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
      lastTrick = nameTrick(
        yawRounded,
        pitchRoundedAbs,
        skier.pitchDir,
        airFeet,
        skier.airSource,
        grindFeet,
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

  function nameTrick(yawDeg, pitchDeg, pitchDir, feet, source, grindFeet) {
    const parts = [];
    if (source === "box" && grindFeet > 0) parts.push(`box slide ${grindFeet}ft`);
    if (source === "rail" && grindFeet > 0) parts.push(`rail slide ${grindFeet}ft`);
    if (yawDeg >= 180) parts.push(`${yawDeg}°`);
    const fn = flipName(pitchDeg, pitchDir || 1);
    if (fn) parts.push(fn);
    if (parts.length === 0) {
      if (feet >= 12) return `${feet} ft air`;
      return "clean landing";
    }
    return `${parts.join(" + ")} · ${feet} ft`;
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
    const frontDepth = 10;

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

  function drawBox(f) {
    const sy = toScreenY(f.y);
    ctx.save();
    ctx.translate(f.x, sy);

    const halfW = f.w / 2;
    const halfLen = f.len / 2;
    const rampLen = f.rampLen;
    const height = f.height; // visible front face height

    // Shadow cast downhill.
    ctx.fillStyle = "rgba(58, 76, 80, 0.13)";
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, halfLen + height);
    ctx.lineTo(halfW + 4, halfLen + height);
    ctx.lineTo(halfW + 10, halfLen + height + 6);
    ctx.lineTo(-halfW + 10, halfLen + height + 6);
    ctx.closePath();
    ctx.fill();

    // Approach ramp (uphill side — drawn at top of the box graphic).
    ctx.fillStyle = "#dfe7e5";
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.85, -halfLen - rampLen);
    ctx.lineTo(halfW * 0.85, -halfLen - rampLen);
    ctx.lineTo(halfW, -halfLen);
    ctx.lineTo(-halfW, -halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 168, 166, 0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Front face (downhill cliff).
    ctx.fillStyle = "#b7c6c3";
    ctx.beginPath();
    ctx.moveTo(-halfW, halfLen);
    ctx.lineTo(halfW, halfLen);
    ctx.lineTo(halfW, halfLen + height);
    ctx.lineTo(-halfW, halfLen + height);
    ctx.closePath();
    ctx.fill();
    const fg = ctx.createLinearGradient(0, halfLen, 0, halfLen + height);
    fg.addColorStop(0, "rgba(255,255,255,0.28)");
    fg.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = fg;
    ctx.fillRect(-halfW, halfLen, halfW * 2, height);

    // Top face.
    ctx.fillStyle = "#eff3f2";
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfLen);
    ctx.lineTo(halfW, -halfLen);
    ctx.lineTo(halfW, halfLen);
    ctx.lineTo(-halfW, halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 168, 166, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crisp lip on downhill edge.
    ctx.beginPath();
    ctx.moveTo(-halfW, halfLen);
    ctx.lineTo(halfW, halfLen);
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
    const rampLen = f.rampLen;
    const barHalfW = 2.4;

    // Small approach hump on uphill side.
    ctx.fillStyle = "#e1e8e7";
    ctx.beginPath();
    ctx.moveTo(-6, -halfLen - rampLen);
    ctx.lineTo(6, -halfLen - rampLen);
    ctx.lineTo(9, -halfLen);
    ctx.lineTo(-9, -halfLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150, 168, 166, 0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Rotate for diagonal rails.
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

    // Spin ring — THE visual feedback for yaw rotation. Body itself no longer
    // tumbles.
    if (skier.inAir && Math.abs(skier.yawSpeed) > 20) {
      const ringR = 15;
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.strokeStyle = "rgba(225, 106, 45, 0.6)";
      ctx.lineWidth = 1.6;
      const dir = Math.sign(skier.yawSpeed) || 1;
      const yawRad = skier.yawDeg * (Math.PI / 180);
      const sweep = clamp(Math.abs(yawRad) % TAU, 0.3, TAU * 0.92);
      ctx.beginPath();
      if (dir > 0) {
        ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + sweep);
      } else {
        ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 - sweep, true);
      }
      ctx.stroke();
      const tipA = -Math.PI / 2 + dir * sweep;
      ctx.fillStyle = "rgba(225, 106, 45, 0.9)";
      ctx.beginPath();
      ctx.arc(Math.cos(tipA) * ringR, Math.sin(tipA) * ringR, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(screenX, screenY);

    // Body orientation = motion direction. In air we commit to takeoff
    // heading and do NOT rotate from yaw (the ring shows the spin). On the
    // ground we pivot with heading, plus extra 90° when braking so skis go
    // perpendicular for a hockey stop.
    const baseRot = skier.inAir ? skier.airHeading : skier.heading;
    const brakeAdd = !skier.inAir ? skier.brakeAnim * (Math.PI / 2) : 0;
    ctx.rotate(-baseRot + brakeAdd);

    // Flip squish — X pulls in strongly at mid-flip so it reads as a tuck.
    const pitchRad = (skier.pitchDeg / RAD2DEG) || 0;
    const pitchCos = skier.inAir ? Math.cos(pitchRad) : 1;
    const pitchSin = skier.inAir ? Math.sin(pitchRad) : 0;
    const tuckAmount = Math.abs(pitchSin); // 0..1
    const scaleX = 1 - 0.62 * tuckAmount;
    const scaleY = pitchCos || 0.001;
    ctx.scale(scaleX, scaleY);

    const showBack = skier.inAir && pitchCos < 0;
    const jacket = showBack ? "#173468" : "#2f62a6";
    const jacketEdge = showBack ? "#0f2546" : "#1b3f76";
    const ski = showBack ? "#a0392b" : "#d2523f";
    const head = showBack ? "#b68966" : "#e3b187";

    // Skis.
    ctx.fillStyle = ski;
    ctx.fillRect(-3.1, 1.2, 1.5, 7.5);
    ctx.fillRect(1.6, 1.2, 1.5, 7.5);

    // Body.
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

    // Head.
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
    ctx.fillText(`${distance} ft`, 14, 12);
    ctx.textAlign = "right";
    ctx.fillText(`best ${best} ft`, W - 14, 12);
    ctx.restore();

    if (skier && skier.inAir) {
      const yawAbs = Math.round(Math.abs(skier.yawDeg) / 10) * 10;
      const pitchAbs = Math.round(skier.pitchSpun / 10) * 10;
      const airFt = Math.round((worldY - skier.airStartY) / 6);
      const screenX = W / 2 + skier.x + 18;
      const screenY = SKIER_SCREEN_Y - skier.altitude - 14;
      ctx.save();
      ctx.fillStyle = "rgba(40, 54, 58, 0.85)";
      ctx.font =
        '20px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const lines = [];
      if (yawAbs >= 180 && pitchAbs >= 180) {
        lines.push(`${yawAbs}° + ${flipLiveName(pitchAbs, skier.pitchDir)}`);
      } else if (yawAbs >= 180) {
        lines.push(`${yawAbs}°`);
      } else if (pitchAbs >= 180) {
        lines.push(flipLiveName(pitchAbs, skier.pitchDir));
      }
      lines.push(`${airFt} ft`);
      for (let i = lines.length - 1; i >= 0; i--) {
        ctx.fillText(lines[i], screenX, screenY - (lines.length - 1 - i) * 22);
      }
      ctx.restore();
    }

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

  function flipLiveName(deg, dir) {
    const base = dir > 0 ? "frontflip" : "backflip";
    if (deg >= 720) return `quadruple ${base}`;
    if (deg >= 540) return `triple ${base}`;
    if (deg >= 360) return `double ${base}`;
    if (deg >= 180) return base;
    return "";
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
      else if (f.type === "box") drawBox(f);
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
    ctx.save();
    ctx.fillStyle = "rgba(40, 54, 58, 0.85)";
    ctx.textAlign = "center";
    ctx.font =
      '46px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
    ctx.fillText("gnar", W / 2, H / 2 - 24);
    ctx.font =
      '18px "Caveat", "Comic Sans MS", "Segoe Script", cursive';
    ctx.fillStyle = "rgba(40, 54, 58, 0.65)";
    ctx.fillText("press start — arrows to ski, spin, flip", W / 2, H / 2 + 10);
    ctx.restore();
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
  <span class="eyebrow">Play — gnar</span>

  <div class="stage">
    <canvas bind:this={canvas} aria-label="Skiing game"></canvas>

    {#if state === "idle"}
      <div class="overlay">
        <h3>gnar</h3>
        <p>A little top-down ski run. Carve, send it, spin, flip.</p>
        <button class="btn" on:click={resetGame}>Drop in</button>
        <p class="hint">
          ← → pivot / spin in air · ↑ brake (hockey stop) / frontflip in air ·
          ↓ tuck / backflip in air · Enter to retry
        </p>
      </div>
    {:else if state === "crashed"}
      <div class="overlay">
        <h3>{lastTrick || "Crashed"}</h3>
        <p>You rode <strong>{distance} ft</strong>.</p>
        <button class="btn" on:click={resetGame}>Drop in again</button>
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
    background:
      radial-gradient(
        900px 600px at 50% -10%,
        rgba(210, 230, 225, 0.8) 0%,
        rgba(210, 230, 225, 0) 60%
      ),
      linear-gradient(180deg, #f2f6f5 0%, #e6ecea 100%);
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

  .eyebrow {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(27, 22, 21, 0.55);
    position: relative;
    z-index: 1;
  }

  .stage {
    margin-top: 1rem;
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
  .overlay h3 {
    font-family: "Caveat", var(--font-serif), cursive;
    font-weight: 700;
    font-size: clamp(2rem, 3vw, 2.6rem);
    letter-spacing: -0.01em;
    margin: 0;
    color: #28363a;
  }
  .overlay p {
    font-family: var(--font-sans);
    font-size: 0.95rem;
    margin: 0;
    color: rgba(40, 54, 58, 0.8);
    max-width: 34ch;
  }
  .overlay .hint {
    font-size: 0.78rem;
    color: rgba(40, 54, 58, 0.6);
    max-width: 36ch;
    line-height: 1.55;
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

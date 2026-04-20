<script>
  import { onMount, onDestroy } from "svelte";

  const COLS = 10;
  const ROWS = 20;

  // Warm palette — matches the hero gradient (peach → pink → lilac).
  const PIECES = {
    I: {
      color: "#ffd79a",
      shape: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    },
    O: {
      color: "#ffb88a",
      shape: [
        [1, 1],
        [1, 1],
      ],
    },
    T: {
      color: "#ff9a8a",
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
    S: {
      color: "#ffb0c6",
      shape: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
    },
    Z: {
      color: "#ff7fa6",
      shape: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
    },
    J: {
      color: "#d49bff",
      shape: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
    L: {
      color: "#ffa56b",
      shape: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
    },
  };
  const KEYS = Object.keys(PIECES);

  let board = createBoard();
  let current = null; // { shape, color, row, col }
  let next = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let state = "idle"; // idle | playing | paused | over
  let tickMs = 700;
  let timer = null;
  let wrapEl;

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function randomPiece() {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)];
    const p = PIECES[key];
    return {
      shape: p.shape.map((row) => row.slice()),
      color: p.color,
      row: 0,
      col: Math.floor((COLS - p.shape[0].length) / 2),
    };
  }

  function rotate(shape) {
    const n = shape.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        out[c][n - 1 - r] = shape[r][c];
      }
    }
    return out;
  }

  function collides(piece, board, dr = 0, dc = 0, shape = piece.shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nr = piece.row + r + dr;
        const nc = piece.col + c + dc;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
        if (nr >= 0 && board[nr][nc]) return true;
      }
    }
    return false;
  }

  function merge(piece, board) {
    const next = board.map((row) => row.slice());
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const nr = piece.row + r;
          const nc = piece.col + c;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            next[nr][nc] = piece.color;
          }
        }
      }
    }
    return next;
  }

  function clearLines(board) {
    let cleared = 0;
    const kept = board.filter((row) => {
      const full = row.every((cell) => cell !== null);
      if (full) cleared++;
      return !full;
    });
    while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
    return { board: kept, cleared };
  }

  function lockAndSpawn() {
    board = merge(current, board);
    const result = clearLines(board);
    board = result.board;
    if (result.cleared > 0) {
      const points = [0, 40, 100, 300, 1200][result.cleared] * level;
      score += points;
      lines += result.cleared;
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        tickMs = Math.max(90, 700 - (level - 1) * 60);
        restartTimer();
      }
    }
    current = next;
    next = randomPiece();
    if (collides(current, board)) {
      state = "over";
      stopTimer();
    }
  }

  function step() {
    if (state !== "playing") return;
    if (!collides(current, board, 1, 0)) {
      current = { ...current, row: current.row + 1 };
    } else {
      lockAndSpawn();
    }
  }

  function move(dc) {
    if (state !== "playing") return;
    if (!collides(current, board, 0, dc)) {
      current = { ...current, col: current.col + dc };
    }
  }

  function softDrop() {
    if (state !== "playing") return;
    if (!collides(current, board, 1, 0)) {
      current = { ...current, row: current.row + 1 };
      score += 1;
    } else {
      lockAndSpawn();
    }
  }

  function hardDrop() {
    if (state !== "playing") return;
    let drop = 0;
    while (!collides(current, board, drop + 1, 0)) drop++;
    if (drop > 0) current = { ...current, row: current.row + drop };
    score += drop * 2;
    lockAndSpawn();
  }

  function rotateCurrent() {
    if (state !== "playing") return;
    const rotated = rotate(current.shape);
    // Simple wall-kick: try offsets -1, +1, -2, +2.
    for (const dc of [0, -1, 1, -2, 2]) {
      if (!collides(current, board, 0, dc, rotated)) {
        current = { ...current, shape: rotated, col: current.col + dc };
        return;
      }
    }
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(step, tickMs);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function restartTimer() {
    if (state === "playing") startTimer();
  }

  function startGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    tickMs = 700;
    current = randomPiece();
    next = randomPiece();
    state = "playing";
    startTimer();
    // Focus the game so keys work immediately.
    if (wrapEl) wrapEl.focus();
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      stopTimer();
    } else if (state === "paused") {
      state = "playing";
      startTimer();
    }
  }

  function handleKey(e) {
    if (state === "idle" || state === "over") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      togglePause();
      return;
    }
    if (state !== "playing") return;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        move(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        move(1);
        break;
      case "ArrowDown":
        e.preventDefault();
        softDrop();
        break;
      case "ArrowUp":
      case "x":
      case "X":
        e.preventDefault();
        rotateCurrent();
        break;
      case " ":
        e.preventDefault();
        hardDrop();
        break;
    }
  }

  // Render grid = board with current piece overlaid.
  $: display = (() => {
    const g = board.map((row) => row.slice());
    if (current && (state === "playing" || state === "paused")) {
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            const nr = current.row + r;
            const nc = current.col + c;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              g[nr][nc] = current.color;
            }
          }
        }
      }
    }
    return g;
  })();

  $: nextCells = (() => {
    if (!next) return null;
    const size = 4;
    const g = Array.from({ length: size }, () => Array(size).fill(null));
    const shape = next.shape;
    const offR = Math.floor((size - shape.length) / 2);
    const offC = Math.floor((size - shape[0].length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) g[r + offR][c + offC] = next.color;
      }
    }
    return g;
  })();

  onMount(() => {
    window.addEventListener("keydown", handleKey);
  });
  onDestroy(() => {
    window.removeEventListener("keydown", handleKey);
    stopTimer();
  });
</script>

<div class="tetris" bind:this={wrapEl} tabindex="0">
  <span class="eyebrow">Play — Tetris</span>

  <div class="stage">
    <div
      class="board"
      style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);"
    >
      {#each display as row, r}
        {#each row as cell, c}
          <div
            class="cell"
            class:filled={cell !== null}
            style={cell ? `--c:${cell};` : ""}
          ></div>
        {/each}
      {/each}

      {#if state === "idle"}
        <div class="overlay">
          <h3>Tetris</h3>
          <p>Warm up with some falling blocks.</p>
          <button class="btn" on:click={startGame}>Start game</button>
          <p class="hint">
            ← → move · ↑ rotate · ↓ soft drop · space hard drop · P pause
          </p>
        </div>
      {:else if state === "paused"}
        <div class="overlay">
          <h3>Paused</h3>
          <button class="btn" on:click={togglePause}>Resume</button>
          <p class="hint">Press P to resume</p>
        </div>
      {:else if state === "over"}
        <div class="overlay">
          <h3>Game over</h3>
          <p>Score <strong>{score}</strong> · Lines {lines}</p>
          <button class="btn" on:click={startGame}>Play again</button>
        </div>
      {/if}
    </div>

    <aside class="side">
      <div class="stat">
        <span class="label">Score</span>
        <span class="val">{score}</span>
      </div>
      <div class="stat">
        <span class="label">Lines</span>
        <span class="val">{lines}</span>
      </div>
      <div class="stat">
        <span class="label">Level</span>
        <span class="val">{level}</span>
      </div>

      <div class="next">
        <span class="label">Next</span>
        <div class="next-grid">
          {#if nextCells}
            {#each nextCells as row}
              {#each row as cell}
                <div
                  class="cell mini"
                  class:filled={cell !== null}
                  style={cell ? `--c:${cell};` : ""}
                ></div>
              {/each}
            {/each}
          {/if}
        </div>
      </div>

      {#if state === "playing"}
        <button class="btn ghost" on:click={togglePause}>Pause</button>
      {:else if state === "paused"}
        <button class="btn ghost" on:click={togglePause}>Resume</button>
      {/if}
    </aside>
  </div>
</div>

<style>
  .tetris {
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
        1200px 800px at 120% -20%,
        #ffb08a 0%,
        rgba(255, 176, 138, 0) 55%
      ),
      radial-gradient(
        900px 700px at -10% 110%,
        #d49bff 0%,
        rgba(212, 155, 255, 0) 55%
      ),
      radial-gradient(
        1000px 700px at 50% 50%,
        #ffd79a 0%,
        rgba(255, 215, 154, 0) 60%
      ),
      linear-gradient(160deg, #ffb88a 0%, #ff7fa6 40%, #7b69ff 85%);
    display: flex;
    flex-direction: column;
    outline: none;
  }

  .tetris::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      600px 400px at 30% 30%,
      rgba(255, 255, 255, 0.35) 0%,
      rgba(255, 255, 255, 0) 60%
    );
    pointer-events: none;
    mix-blend-mode: soft-light;
  }

  .eyebrow {
    font-family: var(--font-sans);
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(27, 22, 21, 0.7);
    position: relative;
    z-index: 1;
  }

  .stage {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: 1fr 110px;
    gap: 0.9rem;
    flex: 1;
    min-height: 0;
    position: relative;
    z-index: 1;
  }

  .board {
    position: relative;
    display: grid;
    aspect-ratio: 10 / 20;
    width: 100%;
    max-height: 100%;
    margin: 0 auto;
    padding: 6px;
    border-radius: var(--radius-md);
    background: rgba(27, 22, 21, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: inset 0 2px 20px rgba(27, 22, 21, 0.25);
    gap: 2px;
  }

  .cell {
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.05);
  }

  .cell.filled {
    background: var(--c);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.45),
      inset 0 -2px 0 rgba(0, 0, 0, 0.18),
      0 1px 2px rgba(0, 0, 0, 0.18);
  }

  .cell.mini {
    border-radius: 2px;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    padding: 0.55rem 0.7rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.32);
    border: 1px solid rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .label {
    font-family: var(--font-sans);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(27, 22, 21, 0.65);
  }
  .val {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 1.2rem;
    color: #1b1615;
    line-height: 1.1;
  }

  .next {
    padding: 0.55rem 0.7rem 0.7rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.32);
    border: 1px solid rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .next-grid {
    margin-top: 0.4rem;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 2px;
    aspect-ratio: 1 / 1;
  }

  .btn {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem 1rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.88);
    color: #1b1615;
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 0.92rem;
    text-decoration: none;
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 6px 16px rgba(27, 22, 21, 0.12);
    cursor: pointer;
    transition:
      transform var(--dur-2) var(--ease-out-soft),
      box-shadow var(--dur-2) var(--ease-out-soft),
      background var(--dur-2) var(--ease-out-soft);
  }
  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(27, 22, 21, 0.18);
    background: #fff;
  }
  .btn.ghost {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.55);
    box-shadow: none;
    font-size: 0.85rem;
    padding: 0.5rem 0.85rem;
  }
  .btn.ghost:hover {
    background: rgba(255, 255, 255, 0.55);
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
    background: rgba(27, 22, 21, 0.35);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    color: #fdfbf6;
    border-radius: var(--radius-md);
  }
  .overlay h3 {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: clamp(1.6rem, 2.4vw, 2.1rem);
    letter-spacing: -0.02em;
    margin: 0;
    color: #fdfbf6;
  }
  .overlay p {
    font-family: var(--font-sans);
    font-size: 0.95rem;
    margin: 0;
    color: rgba(253, 251, 246, 0.88);
  }
  .overlay .hint {
    font-size: 0.78rem;
    color: rgba(253, 251, 246, 0.72);
    max-width: 28ch;
    line-height: 1.5;
  }
  .overlay .btn {
    align-self: center;
  }

  @media (max-width: 520px) {
    .stage {
      grid-template-columns: 1fr 92px;
    }
  }
</style>

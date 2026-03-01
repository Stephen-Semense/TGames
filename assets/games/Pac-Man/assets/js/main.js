let board;
let rowCount = 21;
let columnCount = 19;
const tileSize = 32;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

let selectedDifficulty = null;
let gameRunning = false;
let countdownActive = false;
let score = 0;
let lives = 3;
let frameCount = 0;
let level = 1;
let baseDifficulty = null;
let isMobile = false;

let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickMaxDistance = 35;

// Reduced speeds for better mobile control
const difficulties = {
  easy: {
    ghostSpeed: 0.6,
    ghostCount: 2,
    frightenedTime: 8000,
    scatterTime: 10000,
    chaseTime: 15000,
  },
  normal: {
    ghostSpeed: 0.8,
    ghostCount: 3,
    frightenedTime: 6000,
    scatterTime: 7000,
    chaseTime: 20000,
  },
  hard: {
    ghostSpeed: 1.0,
    ghostCount: 4,
    frightenedTime: 4000,
    scatterTime: 5000,
    chaseTime: 25000,
  },
};

let currentDifficulty = null;
let maze = [];

let pacman = {
  tileX: 9,
  tileY: 15,
  pixelX: 9 * tileSize + tileSize / 2,
  pixelY: 15 * tileSize + tileSize / 2,
  dir: { x: 0, y: 0 },
  nextDir: { x: 0, y: 0 },
  isMoving: false,
  moveSpeed: 2.5,
  mouthOpen: 0,
  mouthSpeed: 0.2,
};

let ghosts = [];
let dots = [];
let powerPellets = [];
let particles = [];

const ghostTypes = [
  { name: "blinky", color: "#ff0000", scatterX: 17, scatterY: 1 },
  { name: "pinky", color: "#ffb8ff", scatterX: 1, scatterY: 1 },
  { name: "inky", color: "#00ffff", scatterX: 17, scatterY: 19 },
  { name: "clyde", color: "#ffb852", scatterX: 1, scatterY: 19 },
];

let currentMode = "scatter";
let modeTimer = 0;
let frightenedTimer = 0;
let currentWave = 0;

window.onload = function () {
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  isMobile = window.innerWidth <= 768;

  if (isMobile) {
    setupMobile();
    pacman.moveSpeed = 2;
  }
  setupJoystick();
};

function setupMobile() {
  window.addEventListener("resize", resizeCanvasMobile);
}

function resizeCanvasMobile() {
  if (window.innerWidth > 768) return;
  const maxWidth = window.innerWidth - 20;
  const maxHeight = window.innerHeight * 0.5;
  let scale = Math.min(maxWidth / boardWidth, maxHeight / boardHeight, 1);
  board.style.width = boardWidth * scale + "px";
  board.style.height = boardHeight * scale + "px";
}

function setupJoystick() {
  const joystickContainer = document.getElementById("joystick-container");
  const joystickStick = document.getElementById("joystickStick");

  const handleStart = (e) => {
    e.preventDefault();
    if (!gameRunning || countdownActive) return;
    joystickActive = true;
    const rect = joystickContainer.getBoundingClientRect();
    joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joystickStick.classList.add("active");
    handleMove(e);
  };

  const handleMove = (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let deltaX = clientX - joystickCenter.x;
    let deltaY = clientY - joystickCenter.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > joystickMaxDistance) {
      const ratio = joystickMaxDistance / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }

    joystickStick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

    const threshold = 10;
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        pacman.nextDir = { x: deltaX > 0 ? 1 : -1, y: 0 };
      } else {
        pacman.nextDir = { x: 0, y: deltaY > 0 ? 1 : -1 };
      }
    }
  };

  const handleEnd = (e) => {
    e.preventDefault();
    joystickActive = false;
    joystickStick.style.transform = "translate(-50%, -50%)";
    joystickStick.classList.remove("active");
  };

  joystickContainer.addEventListener("touchstart", handleStart, {
    passive: false,
  });
  joystickContainer.addEventListener("touchmove", handleMove, {
    passive: false,
  });
  joystickContainer.addEventListener("touchend", handleEnd);
  joystickContainer.addEventListener("touchcancel", handleEnd);
  joystickContainer.addEventListener("mousedown", handleStart);
  joystickContainer.addEventListener("mousemove", handleMove);
  joystickContainer.addEventListener("mouseup", handleEnd);
  joystickContainer.addEventListener("mouseleave", handleEnd);
}

function selectDifficulty(diff) {
  selectedDifficulty = diff;
  baseDifficulty = JSON.parse(JSON.stringify(difficulties[diff]));
  currentDifficulty = JSON.parse(JSON.stringify(difficulties[diff]));
  document
    .querySelectorAll(".diff-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document.querySelector("." + diff).classList.add("selected");
  document.getElementById("playBtn").disabled = false;
}

function startGame() {
  if (!selectedDifficulty) return;
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("gameContainer").style.display = "flex";
  if (isMobile) resizeCanvasMobile();
  initGame();
  startCountdown();
}

function startCountdown() {
  countdownActive = true;
  let count = 3;
  const countdownEl = document.getElementById("countdown");
  countdownEl.style.display = "block";
  countdownEl.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else if (count === 0) {
      countdownEl.textContent = "GO!";
    } else {
      clearInterval(interval);
      countdownEl.style.display = "none";
      countdownActive = false;
      gameRunning = true;
      gameLoop();
    }
  }, 1000);
}

function floodFill(startR, startC, mazeCopy, visited) {
  let stack = [[startR, startC]];
  visited[startR][startC] = true;
  let reachable = 1;

  while (stack.length > 0) {
    let [r, c] = stack.pop();
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (let [dr, dc] of dirs) {
      let nr = r + dr,
        nc = c + dc;
      if (
        nr >= 0 &&
        nr < rowCount &&
        nc >= 0 &&
        nc < columnCount &&
        !visited[nr][nc] &&
        mazeCopy[nr][nc] !== 1
      ) {
        visited[nr][nc] = true;
        stack.push([nr, nc]);
        reachable++;
      }
    }
  }
  return reachable;
}

function isMazeValid(mazeCopy) {
  let visited = Array(rowCount)
    .fill()
    .map(() => Array(columnCount).fill(false));
  let reachable = floodFill(15, 9, mazeCopy, visited);
  let totalEmpty = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {
      if (mazeCopy[r][c] !== 1) totalEmpty++;
    }
  }
  return reachable === totalEmpty;
}

function ensureCriticalPaths() {
  const spawnArea = [
    [15, 9],
    [15, 8],
    [15, 10],
    [14, 9],
    [14, 8],
    [14, 10],
    [16, 9],
    [16, 8],
    [16, 10],
  ];
  for (let [r, c] of spawnArea) {
    if (r >= 0 && r < rowCount && c >= 0 && c < columnCount) maze[r][c] = 0;
  }
  maze[9][9] = 2;
  maze[8][9] = 0;
  maze[7][9] = 0;
  maze[10][0] = 2;
  maze[10][columnCount - 1] = 2;
  maze[10][1] = 0;
  maze[10][columnCount - 2] = 0;

  const corners = [
    [1, 1],
    [1, 17],
    [19, 1],
    [19, 17],
  ];
  for (let [r, c] of corners) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        let nr = r + dr,
          nc = c + dc;
        if (
          nr >= 0 &&
          nr < rowCount &&
          nc >= 0 &&
          nc < columnCount &&
          maze[nr][nc] !== 1
        ) {
          maze[nr][nc] = 0;
        }
      }
    }
  }
}

function generateMaze() {
  let attempts = 0;
  let maxAttempts = 100;
  let validMaze = false;

  while (!validMaze && attempts < maxAttempts) {
    maze = [];
    for (let r = 0; r < rowCount; r++) {
      maze[r] = [];
      for (let c = 0; c < columnCount; c++) {
        if (r === 0 || r === rowCount - 1 || c === 0 || c === columnCount - 1) {
          maze[r][c] = 1;
        } else {
          maze[r][c] = 0;
        }
      }
    }

    const wallCount = Math.floor(rowCount * columnCount * 0.18);
    let wallsPlaced = 0;

    while (wallsPlaced < wallCount) {
      let r = Math.floor(Math.random() * (rowCount - 2)) + 1;
      let c = Math.floor(Math.random() * (columnCount - 2)) + 1;

      if (
        (r >= 13 && r <= 17 && c >= 7 && c <= 11) ||
        (r >= 7 && r <= 12 && c >= 7 && c <= 11) ||
        (r === 10 && (c <= 3 || c >= columnCount - 4)) ||
        maze[r][c] === 1
      )
        continue;

      let neighbors = 0;
      if (maze[r - 1][c] === 1) neighbors++;
      if (maze[r + 1][c] === 1) neighbors++;
      if (maze[r][c - 1] === 1) neighbors++;
      if (maze[r][c + 1] === 1) neighbors++;

      if (neighbors >= 3) continue;
      maze[r][c] = 1;
      wallsPlaced++;
    }

    for (let r = 9; r <= 11; r++) {
      for (let c = 8; c <= 10; c++) {
        if (r === 9 && c === 9) maze[r][c] = 2;
        else if (r === 10 && (c === 8 || c === 10)) maze[r][c] = 4;
        else if (r === 11 && c === 9) maze[r][c] = 4;
        else if (r >= 9 && r <= 11 && c >= 8 && c <= 10) maze[r][c] = 2;
      }
    }

    ensureCriticalPaths();
    if (isMazeValid(maze)) validMaze = true;
    attempts++;
  }

  if (!validMaze) createGuaranteedValidMaze();

  const corners = [
    [1, 1],
    [1, 17],
    [19, 1],
    [19, 17],
  ];
  corners.forEach(([r, c]) => {
    if (maze[r][c] === 0) maze[r][c] = 3;
  });
}

function createGuaranteedValidMaze() {
  maze = [];
  for (let r = 0; r < rowCount; r++) {
    maze[r] = [];
    for (let c = 0; c < columnCount; c++) {
      maze[r][c] =
        r === 0 || r === rowCount - 1 || c === 0 || c === columnCount - 1
          ? 1
          : 0;
    }
  }

  const safeWalls = [
    [3, 3],
    [3, 15],
    [17, 3],
    [17, 15],
    [5, 5],
    [5, 13],
    [15, 5],
    [15, 13],
    [7, 7],
    [7, 11],
    [13, 7],
    [13, 11],
  ];
  for (let [r, c] of safeWalls) {
    if (Math.random() > 0.3) maze[r][c] = 1;
  }

  for (let r = 9; r <= 11; r++) {
    for (let c = 8; c <= 10; c++) {
      if (r === 9 && c === 9) maze[r][c] = 2;
      else if (r === 10 && (c === 8 || c === 10)) maze[r][c] = 4;
      else if (r === 11 && c === 9) maze[r][c] = 4;
      else if (r >= 9 && r <= 11 && c >= 8 && c <= 10) maze[r][c] = 2;
    }
  }
  ensureCriticalPaths();
}

function initGame() {
  generateMaze();

  if (level === 1) {
    score = 0;
    lives = 3;
  }

  currentMode = "scatter";
  modeTimer = 0;
  frightenedTimer = 0;
  currentWave = 0;
  updateScore();
  updateLives();
  updateLevel();

  document.getElementById("gameOverModal").style.display = "none";
  document.getElementById("victoryModal").style.display = "none";

  dots = [];
  powerPellets = [];
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {
      if (maze[r][c] === 0) {
        dots.push({
          x: c * tileSize + tileSize / 2,
          y: r * tileSize + tileSize / 2,
          tileX: c,
          tileY: r,
          eaten: false,
        });
      } else if (maze[r][c] === 3) {
        powerPellets.push({
          x: c * tileSize + tileSize / 2,
          y: r * tileSize + tileSize / 2,
          tileX: c,
          tileY: r,
          eaten: false,
        });
      }
    }
  }

  pacman.tileX = 9;
  pacman.tileY = 15;
  pacman.pixelX = 9 * tileSize + tileSize / 2;
  pacman.pixelY = 15 * tileSize + tileSize / 2;
  pacman.dir = { x: 0, y: 0 };
  pacman.nextDir = { x: 0, y: 0 };
  pacman.isMoving = false;

  if (isMobile) {
    pacman.moveSpeed = 2;
  } else {
    pacman.moveSpeed = 2.5;
  }

  let spawnClear = false;
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  for (let [dr, dc] of dirs) {
    let nr = 15 + dr,
      nc = 9 + dc;
    if (
      nr >= 0 &&
      nr < rowCount &&
      nc >= 0 &&
      nc < columnCount &&
      maze[nr][nc] !== 1
    ) {
      spawnClear = true;
      break;
    }
  }

  if (!spawnClear) {
    generateMaze();
    initGame();
    return;
  }

  let ghostCount = Math.min(
    baseDifficulty.ghostCount + Math.floor((level - 1) / 2),
    4,
  );
  let speedMultiplier = 1 + Math.min((level - 1) * 0.05, 0.3);

  ghosts = [];
  const startPositions = [
    { x: 9, y: 9 },
    { x: 8, y: 10 },
    { x: 9, y: 10 },
    { x: 10, y: 10 },
  ];

  for (let i = 0; i < ghostCount; i++) {
    let ghostSpeed = baseDifficulty.ghostSpeed * speedMultiplier;
    if (isMobile) {
      ghostSpeed *= 0.7;
    }

    ghosts.push({
      tileX: startPositions[i].x,
      tileY: startPositions[i].y,
      pixelX: startPositions[i].x * tileSize + tileSize / 2,
      pixelY: startPositions[i].y * tileSize + tileSize / 2,
      dir: { x: 0, y: -1 },
      nextDir: { x: 0, y: -1 },
      type: i % 4,
      mode: "scatter",
      frightened: false,
      eaten: false,
      speed: ghostSpeed,
      inHouse: i > 0,
      releaseTimer: i * 2000,
      isMoving: false,
    });
  }
}

function backToMenu() {
  gameRunning = false;
  countdownActive = false;
  document.getElementById("gameContainer").style.display = "none";
  document.getElementById("landingPage").style.display = "flex";
  document.getElementById("playBtn").disabled = true;
  document
    .querySelectorAll(".diff-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  selectedDifficulty = null;
  baseDifficulty = null;
  level = 1;
}

function backToMenuFromModal() {
  document.getElementById("gameOverModal").style.display = "none";
  document.getElementById("victoryModal").style.display = "none";
  backToMenu();
}

function retryGame() {
  document.getElementById("gameOverModal").style.display = "none";
  level = 1;
  score = 0;
  if (baseDifficulty)
    currentDifficulty = JSON.parse(JSON.stringify(baseDifficulty));
  initGame();
  startCountdown();
}

function nextLevel() {
  document.getElementById("victoryModal").style.display = "none";
  level++;
  const countdownEl = document.getElementById("countdown");
  countdownEl.style.display = "block";
  countdownEl.textContent = "LEVEL " + level;
  countdownEl.style.fontSize = "60px";

  setTimeout(() => {
    countdownEl.style.fontSize = "120px";
    initGame();
    startCountdown();
  }, 1500);
}

function showGameOver() {
  gameRunning = false;
  document.getElementById("finalScoreGameOver").textContent =
    "SCORE: " + score + " | LEVEL: " + level;
  document.getElementById("gameOverModal").style.display = "flex";
}

function showVictory() {
  gameRunning = false;
  document.getElementById("finalScoreVictory").textContent =
    "SCORE: " + score + " | LEVEL: " + level;
  document.getElementById("victoryModal").style.display = "flex";
}

document.addEventListener("keydown", function (e) {
  if (!gameRunning || countdownActive) return;
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      pacman.nextDir = { x: 0, y: -1 };
      break;
    case "ArrowDown":
    case "s":
    case "S":
      pacman.nextDir = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      pacman.nextDir = { x: -1, y: 0 };
      break;
    case "ArrowRight":
    case "d":
    case "D":
      pacman.nextDir = { x: 1, y: 0 };
      break;
  }
});

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  frameCount++;

  if (frightenedTimer > 0) {
    frightenedTimer -= 16;
    if (frightenedTimer <= 0) endFrightenedMode();
  } else {
    modeTimer += 16;
    let scatterTime = currentDifficulty.scatterTime;
    let chaseTime = currentDifficulty.chaseTime;
    let currentDuration = currentMode === "scatter" ? scatterTime : chaseTime;

    if (modeTimer >= currentDuration) {
      modeTimer = 0;
      currentMode = currentMode === "scatter" ? "chase" : "scatter";
      if (currentMode === "scatter") currentWave++;
      ghosts.forEach((g) => {
        if (!g.eaten && !g.frightened) {
          g.dir.x *= -1;
          g.dir.y *= -1;
        }
      });
    }
  }

  updatePacman();
  ghosts.forEach((g) => updateGhost(g));

  particles = particles.filter((p) => {
    p.life--;
    p.x += p.vx;
    p.y += p.vy;
    return p.life > 0;
  });

  if (dots.every((d) => d.eaten) && powerPellets.every((p) => p.eaten)) {
    showVictory();
    return;
  }
}

function updatePacman() {
  if (!pacman.isMoving) {
    if (pacman.nextDir.x !== 0 || pacman.nextDir.y !== 0) {
      let nextTileX = pacman.tileX + pacman.nextDir.x;
      let nextTileY = pacman.tileY + pacman.nextDir.y;

      if (
        nextTileX >= 0 &&
        nextTileX < columnCount &&
        nextTileY >= 0 &&
        nextTileY < rowCount &&
        maze[nextTileY][nextTileX] !== 1
      ) {
        pacman.dir = { ...pacman.nextDir };
        pacman.isMoving = true;
      } else if (pacman.dir.x !== 0 || pacman.dir.y !== 0) {
        nextTileX = pacman.tileX + pacman.dir.x;
        nextTileY = pacman.tileY + pacman.dir.y;
        if (
          nextTileX >= 0 &&
          nextTileX < columnCount &&
          nextTileY >= 0 &&
          nextTileY < rowCount &&
          maze[nextTileY][nextTileX] !== 1
        ) {
          pacman.isMoving = true;
        }
      }
    } else if (pacman.dir.x !== 0 || pacman.dir.y !== 0) {
      let nextTileX = pacman.tileX + pacman.dir.x;
      let nextTileY = pacman.tileY + pacman.dir.y;
      if (
        nextTileX >= 0 &&
        nextTileX < columnCount &&
        nextTileY >= 0 &&
        nextTileY < rowCount &&
        maze[nextTileY][nextTileX] !== 1
      ) {
        pacman.isMoving = true;
      }
    }
  }

  if (pacman.isMoving) {
    let targetPixelX = (pacman.tileX + pacman.dir.x) * tileSize + tileSize / 2;
    let targetPixelY = (pacman.tileY + pacman.dir.y) * tileSize + tileSize / 2;

    if (pacman.pixelX < targetPixelX) pacman.pixelX += pacman.moveSpeed;
    else if (pacman.pixelX > targetPixelX) pacman.pixelX -= pacman.moveSpeed;

    if (pacman.pixelY < targetPixelY) pacman.pixelY += pacman.moveSpeed;
    else if (pacman.pixelY > targetPixelY) pacman.pixelY -= pacman.moveSpeed;

    let distX = Math.abs(pacman.pixelX - targetPixelX);
    let distY = Math.abs(pacman.pixelY - targetPixelY);

    if (distX < pacman.moveSpeed && distY < pacman.moveSpeed) {
      pacman.pixelX = targetPixelX;
      pacman.pixelY = targetPixelY;
      pacman.tileX += pacman.dir.x;
      pacman.tileY += pacman.dir.y;
      pacman.isMoving = false;

      if (pacman.tileX < 0) {
        pacman.tileX = columnCount - 1;
        pacman.pixelX = pacman.tileX * tileSize + tileSize / 2;
      } else if (pacman.tileX >= columnCount) {
        pacman.tileX = 0;
        pacman.pixelX = tileSize / 2;
      }

      eatAtTile(pacman.tileX, pacman.tileY);
    }
  }

  pacman.mouthOpen += pacman.mouthSpeed;
  if (pacman.mouthOpen > 1 || pacman.mouthOpen < 0) pacman.mouthSpeed *= -1;
}

function eatAtTile(tileX, tileY) {
  for (let dot of dots) {
    if (!dot.eaten && dot.tileX === tileX && dot.tileY === tileY) {
      dot.eaten = true;
      score += 10;
      updateScore();
      break;
    }
  }

  for (let pellet of powerPellets) {
    if (!pellet.eaten && pellet.tileX === tileX && pellet.tileY === tileY) {
      pellet.eaten = true;
      score += 50;
      startFrightenedMode();
      updateScore();
      break;
    }
  }
}

function updateGhost(g) {
  if (g.inHouse) {
    g.releaseTimer -= 16;
    if (g.releaseTimer <= 0) {
      g.pixelY -= g.speed;
      if (g.pixelY <= 9 * tileSize + tileSize / 2) {
        g.inHouse = false;
        g.tileY = 9;
        g.pixelY = 9 * tileSize + tileSize / 2;
        g.pixelX = 9 * tileSize + tileSize / 2;
        g.tileX = 9;
      }
    }
    return;
  }

  if (g.eaten) {
    g.mode = "spawn";
  } else if (g.frightened) {
    g.mode = "frightened";
  } else {
    g.mode = currentMode;
  }

  if (!g.isMoving) {
    let target = getGhostTarget(g);
    let possibleDirs = getPossibleDirections(g);

    if (possibleDirs.length > 0) {
      if (g.mode === "frightened") {
        g.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      } else {
        let bestDir = possibleDirs[0];
        let bestDist = Infinity;

        possibleDirs.forEach((dir) => {
          let nextX = (g.tileX + dir.x) * tileSize + tileSize / 2;
          let nextY = (g.tileY + dir.y) * tileSize + tileSize / 2;
          let dist = Math.sqrt(
            (nextX - target.x) ** 2 + (nextY - target.y) ** 2,
          );

          if (
            dist < bestDist ||
            (dist === bestDist && getDirPriority(dir) < getDirPriority(bestDir))
          ) {
            bestDist = dist;
            bestDir = dir;
          }
        });

        g.dir = bestDir;
      }
      g.isMoving = true;
    }
  }

  if (g.isMoving) {
    let speed = g.frightened ? g.speed * 0.5 : g.eaten ? g.speed * 2 : g.speed;
    let targetPixelX = (g.tileX + g.dir.x) * tileSize + tileSize / 2;
    let targetPixelY = (g.tileY + g.dir.y) * tileSize + tileSize / 2;

    if (g.pixelX < targetPixelX) g.pixelX += speed;
    else if (g.pixelX > targetPixelX) g.pixelX -= speed;

    if (g.pixelY < targetPixelY) g.pixelY += speed;
    else if (g.pixelY > targetPixelY) g.pixelY -= speed;

    let distX = Math.abs(g.pixelX - targetPixelX);
    let distY = Math.abs(g.pixelY - targetPixelY);

    if (distX < speed && distY < speed) {
      g.pixelX = targetPixelX;
      g.pixelY = targetPixelY;
      g.tileX += g.dir.x;
      g.tileY += g.dir.y;
      g.isMoving = false;

      if (g.tileX < 0) {
        g.tileX = columnCount - 1;
        g.pixelX = g.tileX * tileSize + tileSize / 2;
      } else if (g.tileX >= columnCount) {
        g.tileX = 0;
        g.pixelX = tileSize / 2;
      }
    }
  }

  let dist = Math.sqrt(
    (g.pixelX - pacman.pixelX) ** 2 + (g.pixelY - pacman.pixelY) ** 2,
  );
  if (dist < 20) {
    if (g.frightened && !g.eaten) {
      g.eaten = true;
      g.frightened = false;
      score += 200;
      updateScore();
      createParticles(g.pixelX, g.pixelY, ghostTypes[g.type].color);
    } else if (!g.eaten) {
      loseLife();
    }
  }

  if (g.eaten && g.tileX === 9 && g.tileY === 10) {
    g.eaten = false;
    g.inHouse = true;
    g.releaseTimer = 1000;
  }
}

function getGhostTarget(g) {
  let type = ghostTypes[g.type];
  if (g.mode === "spawn")
    return { x: 9 * tileSize + tileSize / 2, y: 10 * tileSize + tileSize / 2 };
  if (g.mode === "scatter" || g.mode === "frightened")
    return { x: type.scatterX * tileSize, y: type.scatterY * tileSize };

  switch (type.name) {
    case "blinky":
      return { x: pacman.pixelX, y: pacman.pixelY };
    case "pinky":
      let offsetX = pacman.dir.x * 4 * tileSize;
      let offsetY = pacman.dir.y * 4 * tileSize;
      if (pacman.dir.y === -1) offsetX = -4 * tileSize;
      return { x: pacman.pixelX + offsetX, y: pacman.pixelY + offsetY };
    case "inky":
      let blinky = ghosts[0];
      let pivotX = pacman.pixelX + pacman.dir.x * 2 * tileSize;
      let pivotY = pacman.pixelY + pacman.dir.y * 2 * tileSize;
      if (pacman.dir.y === -1) pivotX -= 2 * tileSize;
      return {
        x: pivotX + (pivotX - blinky.pixelX),
        y: pivotY + (pivotY - blinky.pixelY),
      };
    case "clyde":
      let dist = Math.sqrt(
        (g.pixelX - pacman.pixelX) ** 2 + (g.pixelY - pacman.pixelY) ** 2,
      );
      if (dist > 8 * tileSize) return { x: pacman.pixelX, y: pacman.pixelY };
      else return { x: type.scatterX * tileSize, y: type.scatterY * tileSize };
  }
  return { x: pacman.pixelX, y: pacman.pixelY };
}

function getPossibleDirections(g) {
  let dirs = [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];
  return dirs.filter((dir) => {
    if (g.mode !== "frightened" && dir.x === -g.dir.x && dir.y === -g.dir.y)
      return false;
    let nextTileX = g.tileX + dir.x;
    let nextTileY = g.tileY + dir.y;
    if (nextTileX < 0 || nextTileX >= columnCount) return true;
    if (nextTileY < 0 || nextTileY >= rowCount) return false;
    return maze[nextTileY][nextTileX] !== 1;
  });
}

function getDirPriority(dir) {
  if (dir.y === -1) return 0;
  if (dir.x === -1) return 1;
  if (dir.y === 1) return 2;
  return 3;
}

function startFrightenedMode() {
  frightenedTimer = currentDifficulty.frightenedTime;
  ghosts.forEach((g) => {
    if (!g.eaten && !g.inHouse) {
      g.frightened = true;
      g.dir.x *= -1;
      g.dir.y *= -1;
    }
  });
}

function endFrightenedMode() {
  ghosts.forEach((g) => (g.frightened = false));
}

function loseLife() {
  lives--;
  updateLives();
  createParticles(pacman.pixelX, pacman.pixelY, "#ffff00");

  if (lives <= 0) {
    showGameOver();
  } else {
    setTimeout(() => {
      pacman.tileX = 9;
      pacman.tileY = 15;
      pacman.pixelX = 9 * tileSize + tileSize / 2;
      pacman.pixelY = 15 * tileSize + tileSize / 2;
      pacman.dir = { x: 0, y: 0 };
      pacman.nextDir = { x: 0, y: 0 };
      pacman.isMoving = false;

      ghosts.forEach((g, i) => {
        g.tileX = [9, 8, 9, 10][i];
        g.tileY = [9, 10, 10, 10][i];
        g.pixelX = g.tileX * tileSize + tileSize / 2;
        g.pixelY = g.tileY * tileSize + tileSize / 2;
        g.dir = { x: 0, y: -1 };
        g.inHouse = i > 0;
        g.releaseTimer = i * 2000;
        g.isMoving = false;
      });
    }, 1000);
  }
}

function createParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      color: color,
    });
  }
}

function updateScore() {
  document.getElementById("score").textContent = "SCORE: " + score;
}

function updateLives() {
  document.getElementById("lives").textContent = "LIVES: " + "❤️".repeat(lives);
}

function updateLevel() {
  document.getElementById("level-display").textContent = "LEVEL: " + level;
}

function draw() {
  context.fillStyle = "black";
  context.fillRect(0, 0, boardWidth, boardHeight);

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {
      if (maze[r][c] === 1) {
        context.fillStyle = "#2121de";
        context.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        context.strokeStyle = "#0000aa";
        context.lineWidth = 2;
        context.strokeRect(c * tileSize, r * tileSize, tileSize, tileSize);
      }
    }
  }

  context.fillStyle = "#ffb897";
  dots.forEach((dot) => {
    if (!dot.eaten) {
      context.beginPath();
      context.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
      context.fill();
    }
  });

  let pulse = Math.sin(frameCount * 0.1) * 2 + 6;
  powerPellets.forEach((pellet) => {
    if (!pellet.eaten) {
      context.beginPath();
      context.arc(pellet.x, pellet.y, pulse, 0, Math.PI * 2);
      context.fill();
    }
  });

  context.save();
  context.translate(pacman.pixelX, pacman.pixelY);
  let angle = 0;
  if (pacman.dir.x === 1) angle = 0;
  else if (pacman.dir.x === -1) angle = Math.PI;
  else if (pacman.dir.y === -1) angle = -Math.PI / 2;
  else if (pacman.dir.y === 1) angle = Math.PI / 2;
  context.rotate(angle);
  context.fillStyle = "#ffff00";
  context.beginPath();
  let mouthAngle = pacman.mouthOpen * 0.3;
  context.arc(0, 0, 13, mouthAngle, Math.PI * 2 - mouthAngle);
  context.lineTo(0, 0);
  context.fill();
  context.restore();

  ghosts.forEach((g) => {
    if (g.inHouse) return;
    let color = ghostTypes[g.type].color;
    if (g.frightened)
      color = Math.floor(frameCount / 10) % 2 === 0 ? "#2121de" : "#ffffff";
    else if (g.eaten) color = "#222";

    context.fillStyle = color;
    context.beginPath();
    context.arc(g.pixelX, g.pixelY - 4, 12, Math.PI, 0);
    context.lineTo(g.pixelX + 12, g.pixelY + 12);
    for (let i = 1; i <= 3; i++) {
      context.lineTo(g.pixelX + 12 - i * 8, g.pixelY + 8 + (i % 2) * 4);
    }
    context.lineTo(g.pixelX - 12, g.pixelY + 12);
    context.fill();

    if (!g.frightened || g.eaten) {
      context.fillStyle = "white";
      context.beginPath();
      context.arc(g.pixelX - 4, g.pixelY - 6, 4, 0, Math.PI * 2);
      context.arc(g.pixelX + 4, g.pixelY - 6, 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = g.eaten ? "#555" : "blue";
      let lookX = pacman.pixelX > g.pixelX ? 1 : -1;
      let lookY = pacman.pixelY > g.pixelY ? 1 : -1;
      context.beginPath();
      context.arc(
        g.pixelX - 4 + lookX * 2,
        g.pixelY - 6 + lookY * 2,
        2,
        0,
        Math.PI * 2,
      );
      context.arc(
        g.pixelX + 4 + lookX * 2,
        g.pixelY - 6 + lookY * 2,
        2,
        0,
        Math.PI * 2,
      );
      context.fill();
    } else {
      context.fillStyle = "#ffb897";
      context.beginPath();
      context.arc(g.pixelX - 4, g.pixelY - 4, 2, 0, Math.PI * 2);
      context.arc(g.pixelX + 4, g.pixelY - 4, 2, 0, Math.PI * 2);
      context.fill();
    }
  });

  particles.forEach((p) => {
    context.fillStyle = p.color;
    context.globalAlpha = p.life / 30;
    context.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  context.globalAlpha = 1;
}

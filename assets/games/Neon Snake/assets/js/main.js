const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 20;
let tileCount;
let canvasSize;

function setCanvasSize() {
  const isMobile = window.innerWidth <= 1024;
  const maxWidth = Math.min(window.innerWidth - 40, 600);

  if (isMobile) {
    canvasSize = Math.min(maxWidth, window.innerHeight - 280);
  } else {
    canvasSize = Math.min(maxWidth, window.innerHeight - 180, 600);
  }

  canvas.width = canvasSize;
  canvas.height = canvasSize;
  tileCount = Math.floor(canvasSize / gridSize);
}

setCanvasSize();
window.addEventListener("resize", () => {
  setCanvasSize();
  if (gameRunning) draw();
});

let snake = [];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem("neonSnakeHighScore") || 0;
let gameRunning = false;
let gameLoop;
let particles = [];

const GAME_SPEED = 180;

const dpad = document.getElementById("dpad");
const dpadButtons = document.querySelectorAll(".dpad-btn");
const controls = document.getElementById("controls");
const menuBtn = document.getElementById("menuBtn");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOver");

function updateControlText() {
  const controlText = document.getElementById("controlText");
  if (window.innerWidth <= 1024) {
    controlText.innerHTML = "Use the D-Pad below<br>Wrap around the screen!";
  } else {
    controlText.innerHTML =
      "Use WASD or Arrow Keys to Move<br>Wrap around the screen!";
  }
}
updateControlText();
window.addEventListener("resize", updateControlText);

document.getElementById("highScoreVal").textContent = highScore;

function init() {
  const startX = Math.floor(tileCount / 2);
  const startY = Math.floor(tileCount / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  dx = 1;
  dy = 0;
  score = 0;
  particles = [];
  spawnFood();
  updateScore();
}

function spawnFood() {
  do {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (
    snake.some((segment) => segment.x === food.x && segment.y === food.y)
  );
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x * gridSize + gridSize / 2,
      y: y * gridSize + gridSize / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      color: color,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawArrow(head, next) {
  const centerX = head.x * gridSize + gridSize / 2;
  const centerY = head.y * gridSize + gridSize / 2;
  const size = gridSize / 3;

  ctx.save();
  ctx.translate(centerX, centerY);

  let angle = 0;
  if (dx === 1) angle = 0;
  else if (dx === -1) angle = Math.PI;
  else if (dy === -1) angle = -Math.PI / 2;
  else if (dy === 1) angle = Math.PI / 2;

  ctx.rotate(angle);

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size / 2, -size / 2);
  ctx.lineTo(-size / 2, size / 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.fillStyle = "rgba(10, 10, 10, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(0, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(canvas.width, i * gridSize);
    ctx.stroke();
  }

  const foodX = food.x * gridSize;
  const foodY = food.y * gridSize;
  ctx.fillStyle = "#ff00ff";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff00ff";
  ctx.fillRect(foodX + 2, foodY + 2, gridSize - 4, gridSize - 4);

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.fillRect(foodX + 6, foodY + 6, gridSize - 12, gridSize - 12);

  snake.forEach((segment, index) => {
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;

    if (index === 0) {
      ctx.fillStyle = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00ffff";
      ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      drawArrow(segment, snake[1]);
    } else {
      const alpha = 1 - (index / snake.length) * 0.5;
      ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00aaff";
      ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
    }
  });

  drawParticles();
  ctx.shadowBlur = 0;
}

function update() {
  if (!gameRunning) return;

  let nextX = snake[0].x + dx;
  let nextY = snake[0].y + dy;

  if (nextX < 0) {
    nextX = tileCount - 1;
  } else if (nextX >= tileCount) {
    nextX = 0;
  }

  if (nextY < 0) {
    nextY = tileCount - 1;
  } else if (nextY >= tileCount) {
    nextY = 0;
  }

  const head = { x: nextX, y: nextY };

  if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    createExplosion(food.x, food.y, "#ff00ff");
    spawnFood();
    updateScore();
  } else {
    snake.pop();
  }

  updateParticles();
}

function updateScore() {
  document.getElementById("score").textContent = score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("neonSnakeHighScore", highScore);
    document.getElementById("highScoreVal").textContent = highScore;
  }
}

function gameOver() {
  gameRunning = false;
  clearInterval(gameLoop);
  document.getElementById("finalScore").textContent = score;
  gameOverScreen.style.display = "block";
  menuBtn.style.display = "none";

  if (window.innerWidth <= 1024) {
    dpad.style.display = "none";
  } else {
    controls.style.display = "none";
  }
}

function goToMenu() {
  gameRunning = false;
  clearInterval(gameLoop);

  menuBtn.style.display = "none";
  gameOverScreen.style.display = "none";
  dpad.style.display = "none";
  controls.style.display = "none";

  startScreen.style.display = "block";

  score = 0;
  document.getElementById("score").textContent = "0";
}

function startCountdown() {
  const countdownEl = document.getElementById("countdown");
  startScreen.style.display = "none";

  let count = 3;
  countdownEl.style.display = "block";
  countdownEl.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      countdownEl.style.animation = "none";
      setTimeout(() => {
        countdownEl.style.animation = "countPulse 0.8s ease-out";
      }, 10);
    } else if (count === 0) {
      countdownEl.textContent = "GO!";
      countdownEl.style.color = "#00ff00";
      countdownEl.style.textShadow = "0 0 50px #00ff00, 0 0 100px #00ff00";
    } else {
      clearInterval(countInterval);
      countdownEl.style.display = "none";
      countdownEl.style.color = "#00ffff";
      countdownEl.style.textShadow = "0 0 50px #00ffff, 0 0 100px #ff00ff";
      beginGame();
    }
  }, 1000);
}

function beginGame() {
  init();
  gameRunning = true;

  menuBtn.style.display = "block";

  if (window.innerWidth <= 1024) {
    dpad.style.display = "block";
  } else {
    controls.style.display = "block";
  }

  gameLoop = setInterval(() => {
    update();
    draw();
  }, GAME_SPEED);
}

function startGame() {
  gameOverScreen.style.display = "none";
  startCountdown();
}

function handleDpadPress(direction) {
  if (!gameRunning) return;

  switch (direction) {
    case "up":
      if (dy !== 1) {
        dx = 0;
        dy = -1;
      }
      break;
    case "down":
      if (dy !== -1) {
        dx = 0;
        dy = 1;
      }
      break;
    case "left":
      if (dx !== 1) {
        dx = -1;
        dy = 0;
      }
      break;
    case "right":
      if (dx !== -1) {
        dx = 1;
        dy = 0;
      }
      break;
  }
}

dpadButtons.forEach((btn) => {
  const direction = btn.getAttribute("data-dir");

  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      btn.classList.add("active");
      handleDpadPress(direction);
    },
    { passive: false },
  );

  btn.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      btn.classList.remove("active");
    },
    { passive: false },
  );

  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    btn.classList.add("active");
    handleDpadPress(direction);
  });

  btn.addEventListener("mouseup", () => {
    btn.classList.remove("active");
  });

  btn.addEventListener("mouseleave", () => {
    btn.classList.remove("active");
  });
});

document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      if (dy !== 1) {
        dx = 0;
        dy = -1;
      }
      break;
    case "ArrowDown":
    case "s":
    case "S":
      if (dy !== -1) {
        dx = 0;
        dy = 1;
      }
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      if (dx !== 1) {
        dx = -1;
        dy = 0;
      }
      break;
    case "ArrowRight":
    case "d":
    case "D":
      if (dx !== -1) {
        dx = 1;
        dy = 0;
      }
      break;
  }
});

document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", startGame);
menuBtn.addEventListener("click", goToMenu);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

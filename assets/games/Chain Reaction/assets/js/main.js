const AVAILABLE_COLORS = [
  { hex: "#FF006E", name: "Pink" },
  { hex: "#FB5607", name: "Orange" },
  { hex: "#FFBE0B", name: "Yellow" },
  { hex: "#8338EC", name: "Purple" },
  { hex: "#3A86FF", name: "Blue" },
  { hex: "#06FFB4", name: "Cyan" },
  { hex: "#FF4365", name: "Red" },
  { hex: "#72FF00", name: "Green" },
  { hex: "#FF9F1C", name: "Amber" },
  { hex: "#C77DFF", name: "Lavender" },
  { hex: "#00F5FF", name: "Aqua" },
  { hex: "#FF006E", name: "Hot Pink" },
];

const GRID_ROWS = 9;
const GRID_COLS = 6;

let gameMode = "1vbot";
let numPlayers = 2;
let difficulty = "normal";
let currentPlayer = 0;
let grid = [];
let players = [];
let gameActive = false;
let isProcessing = false;
let botThinking = false;
let selectedColors = [];

function selectMode(mode) {
  gameMode = mode;
  document
    .querySelectorAll(".mode-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  const diffSection = document.getElementById("difficultySection");
  const playerSection = document.getElementById("playerCountSection");

  if (mode === "1vbot") {
    diffSection.style.display = "block";
    playerSection.style.display = "none";
    numPlayers = 2;
  } else {
    diffSection.style.display = "none";
    playerSection.style.display = "block";
    numPlayers = 0;
  }
  checkCanProceed();
}

function selectPlayers(count) {
  numPlayers = count;
  document.querySelectorAll(".player-btn").forEach((btn, idx) => {
    btn.classList.toggle("active", idx === count - 2);
  });
  checkCanProceed();
}

function selectDifficulty(diff) {
  difficulty = diff;
  document
    .querySelectorAll(".difficulty-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");
}

function checkCanProceed() {
  const canProceed = gameMode === "1vbot" || numPlayers >= 2;
  document.getElementById("startBtn").disabled = !canProceed;
}

function proceedToColorSelection() {
  document.getElementById("menuScreen").style.display = "none";
  document.getElementById("colorSelectScreen").style.display = "flex";
  generateColorSelection();
}

function generateColorSelection() {
  const container = document.getElementById("colorSelectionContainer");
  container.innerHTML = "";
  selectedColors = new Array(numPlayers).fill(null);

  for (let i = 0; i < numPlayers; i++) {
    const playerDiv = document.createElement("div");
    playerDiv.className = "player-color-select";

    const isBot = gameMode === "1vbot" && i === 1;
    const label = document.createElement("div");
    label.className = "player-label";
    label.textContent = isBot ? "Bot Color" : `Player ${i + 1} Color`;
    playerDiv.appendChild(label);

    const colorGrid = document.createElement("div");
    colorGrid.className = "color-grid";

    AVAILABLE_COLORS.forEach((color, idx) => {
      const colorOption = document.createElement("div");
      colorOption.className = "color-option";
      colorOption.style.backgroundColor = color.hex;
      colorOption.dataset.color = color.hex;
      colorOption.dataset.player = i;
      colorOption.onclick = () => selectColor(i, color.hex, colorOption);

      if (
        selectedColors.includes(color.hex) &&
        selectedColors.indexOf(color.hex) !== i
      ) {
        colorOption.classList.add("taken");
      }

      colorGrid.appendChild(colorOption);
    });

    playerDiv.appendChild(colorGrid);
    container.appendChild(playerDiv);
  }

  updateContinueButton();
}

function selectColor(playerIndex, colorHex, element) {
  const prevColor = selectedColors[playerIndex];
  if (prevColor) {
    document
      .querySelectorAll(`.color-option[data-player="${playerIndex}"]`)
      .forEach((el) => {
        el.classList.remove("selected");
        el.innerHTML = "";
      });
  }

  const takenBy = selectedColors.indexOf(colorHex);
  if (takenBy !== -1 && takenBy !== playerIndex) {
    return;
  }

  selectedColors[playerIndex] = colorHex;
  element.classList.add("selected");
  element.innerHTML = '<span class="check-mark">✓</span>';

  updateColorGrids();
  updateContinueButton();
}

function updateColorGrids() {
  document.querySelectorAll(".color-option").forEach((option) => {
    const color = option.dataset.color;
    const takenBy = selectedColors.indexOf(color);

    option.classList.remove("taken");
    if (takenBy !== -1 && takenBy !== parseInt(option.dataset.player)) {
      option.classList.add("taken");
    }
  });
}

function updateContinueButton() {
  const allSelected = selectedColors.every((color) => color !== null);
  document.getElementById("continueBtn").disabled = !allSelected;
}

function backToMenu() {
  document.getElementById("colorSelectScreen").style.display = "none";
  document.getElementById("menuScreen").style.display = "flex";
  selectedColors = [];
}

function startGame() {
  document.getElementById("colorSelectScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "flex";

  initializeGame();
}

function initializeGame() {
  players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      id: i,
      color: selectedColors[i],
      atoms: 0,
      alive: true,
      isBot: gameMode === "1vbot" && i === 1,
    });
  }

  currentPlayer = 0;
  gameActive = true;
  isProcessing = false;
  botThinking = false;

  createGrid();
  updatePlayerColors();
  updateTurnIndicator();

  if (players[currentPlayer].isBot) {
    setTimeout(botMove, 1000);
  }
}

function createGrid() {
  const container = document.getElementById("gridContainer");
  container.innerHTML = "";
  container.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;

  grid = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.onclick = () => handleCellClick(row, col);
      container.appendChild(cell);
      grid[row][col] = {
        element: cell,
        atoms: 0,
        player: -1,
      };
    }
  }
}

function updatePlayerColors() {
  const container = document.getElementById("playerColors");
  container.innerHTML = "";
  players.forEach((player, idx) => {
    const dot = document.createElement("div");
    dot.className = "color-dot";
    dot.style.backgroundColor = player.color;
    dot.style.opacity = player.alive ? "1" : "0.3";
    dot.title = `${player.isBot ? "Bot" : "Player " + (idx + 1)}`;
    container.appendChild(dot);
  });
}

function updateTurnIndicator() {
  const indicator = document.getElementById("turnIndicator");
  const player = players[currentPlayer];
  indicator.textContent = player.isBot
    ? "Bot Thinking..."
    : `Player ${currentPlayer + 1}'s Turn`;
  indicator.style.borderColor = player.color;
  indicator.style.color = player.color;
  indicator.style.boxShadow = `0 0 20px ${player.color}40`;
}

function handleCellClick(row, col) {
  if (!gameActive || isProcessing || botThinking) return;
  if (players[currentPlayer].isBot) return;

  const cell = grid[row][col];
  if (cell.player !== -1 && cell.player !== currentPlayer) return;

  makeMove(row, col);
}

function makeMove(row, col) {
  isProcessing = true;
  addAtom(row, col, currentPlayer);

  setTimeout(() => {
    checkWinCondition();
    if (gameActive) {
      nextTurn();
    }
    isProcessing = false;
  }, 300);
}

function addAtom(row, col, player) {
  const cell = grid[row][col];
  cell.atoms++;
  cell.player = player;
  renderCell(row, col);

  const criticalMass = getCriticalMass(row, col);
  if (cell.atoms >= criticalMass) {
    explode(row, col, player);
  }
}

function getCriticalMass(row, col) {
  let mass = 4;
  if (row === 0 || row === GRID_ROWS - 1) mass--;
  if (col === 0 || col === GRID_COLS - 1) mass--;
  return mass;
}

function explode(row, col, player) {
  const cell = grid[row][col];
  cell.atoms = 0;
  cell.player = -1;
  renderCell(row, col);

  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const explosions = [];

  directions.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (
      newRow >= 0 &&
      newRow < GRID_ROWS &&
      newCol >= 0 &&
      newCol < GRID_COLS
    ) {
      explosions.push([newRow, newCol]);
    }
  });

  explosions.forEach(([r, c], idx) => {
    setTimeout(() => {
      addAtom(r, c, player);
    }, idx * 50);
  });
}

function renderCell(row, col) {
  const cell = grid[row][col];
  cell.element.innerHTML = "";
  cell.element.style.borderColor =
    cell.player !== -1 ? players[cell.player].color : "transparent";

  for (let i = 0; i < cell.atoms; i++) {
    const atom = document.createElement("div");
    atom.className = "atom";
    atom.style.backgroundColor = players[cell.player].color;
    atom.style.color = players[cell.player].color;
    cell.element.appendChild(atom);
  }
}

function nextTurn() {
  do {
    currentPlayer = (currentPlayer + 1) % numPlayers;
  } while (!players[currentPlayer].alive);

  updateTurnIndicator();

  if (players[currentPlayer].isBot && gameActive) {
    botThinking = true;
    setTimeout(botMove, 800);
  }
}

function botMove() {
  if (!gameActive) return;

  const moves = getValidMoves();
  if (moves.length === 0) return;

  let selectedMove;

  switch (difficulty) {
    case "easy":
      selectedMove = moves[Math.floor(Math.random() * moves.length)];
      break;
    case "normal":
      selectedMove = getBestMove(moves, 2);
      break;
    case "hard":
      selectedMove = getBestMove(moves, 4);
      break;
  }

  botThinking = false;
  makeMove(selectedMove.row, selectedMove.col);
}

function getValidMoves() {
  const moves = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = grid[row][col];
      if (cell.player === -1 || cell.player === currentPlayer) {
        moves.push({ row, col, score: evaluateMove(row, col) });
      }
    }
  }
  return moves;
}

function evaluateMove(row, col) {
  let score = 0;
  const cell = grid[row][col];
  const criticalMass = getCriticalMass(row, col);

  if (cell.atoms === criticalMass - 1) score += 10;
  else if (cell.atoms > 0) score += 5;

  if (
    (row === 0 || row === GRID_ROWS - 1) &&
    (col === 0 || col === GRID_COLS - 1)
  )
    score += 3;
  else if (
    row === 0 ||
    row === GRID_ROWS - 1 ||
    col === 0 ||
    col === GRID_COLS - 1
  )
    score += 1;

  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  directions.forEach(([dr, dc]) => {
    const nr = row + dr,
      nc = col + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
      const neighbor = grid[nr][nc];
      if (neighbor.player !== -1 && neighbor.player !== currentPlayer) {
        if (neighbor.atoms >= getCriticalMass(nr, nc) - 1) score -= 5;
      }
    }
  });

  return score;
}

function getBestMove(moves, depth) {
  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((move) => {
    let score = move.score;

    const cell = grid[move.row][move.col];
    if (cell.atoms + 1 >= getCriticalMass(move.row, move.col)) {
      score += 15;
    }

    score += Math.random() * 3;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });

  return bestMove;
}

function checkWinCondition() {
  const alivePlayers = players.filter((p) => {
    let hasAtoms = false;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (grid[row][col].player === p.id) {
          hasAtoms = true;
          break;
        }
      }
      if (hasAtoms) break;
    }

    let totalAtoms = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        totalAtoms += grid[row][col].atoms;
      }
    }

    if (totalAtoms < numPlayers * 2) return true;

    p.alive = hasAtoms || totalAtoms < numPlayers * 2;
    return p.alive;
  });

  if (alivePlayers.length === 1) {
    endGame(alivePlayers[0]);
  } else if (alivePlayers.length === 0) {
    endGame(players[currentPlayer]);
  }

  updatePlayerColors();
}

function endGame(winner) {
  gameActive = false;
  const modal = document.getElementById("winnerModal");
  const text = document.getElementById("winnerText");
  const stats = document.getElementById("winnerStats");

  text.textContent = winner.isBot
    ? "Bot Wins!"
    : `Player ${winner.id + 1} Wins!`;
  text.style.color = winner.color;

  let totalAtoms = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      totalAtoms += grid[row][col].atoms;
    }
  }

  stats.innerHTML = `
        <div class="stat-box">Total Atoms: ${totalAtoms}</div>
        <div class="stat-box">Moves Made: ${countMoves()}</div>
    `;

  modal.style.display = "flex";
}

function countMoves() {
  let moves = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      moves += grid[row][col].atoms;
    }
  }
  return moves;
}

function closeWinnerModal() {
  document.getElementById("winnerModal").style.display = "none";
  resetGame();
}

function resetGame() {
  initializeGame();
}

function returnToMenu() {
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("menuScreen").style.display = "flex";
  document.getElementById("winnerModal").style.display = "none";

  numPlayers = gameMode === "1vbot" ? 2 : 0;
  selectedColors = [];
  document
    .querySelectorAll(".player-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById("startBtn").disabled = true;
}

document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".grid-container")) e.preventDefault();
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (gameActive) {
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          renderCell(row, col);
        }
      }
    }
  }, 250);
});

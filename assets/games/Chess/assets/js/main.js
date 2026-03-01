function createParticles() {
  const container = document.getElementById("particles");
  const count = window.innerWidth < 768 ? 20 : 50;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.animationDelay = Math.random() * 15 + "s";
    particle.style.animationDuration = 10 + Math.random() * 10 + "s";
    container.appendChild(particle);
  }
}
createParticles();

// Validation state
let validationState = {
  username: false,
  email: false,
  password: false,
  passwordMatch: false,
};

let currentUser = null;
const USERS_KEY = "chessmaster_users";
const CURRENT_USER_KEY = "chessmaster_current_user";

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function getUsers() {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Validation Functions
function validateUsername(username) {
  const errorEl = document.getElementById("regError");
  const users = getUsers();

  errorEl.classList.remove("show");

  if (username.length < 3 || username.length > 20) {
    showError("Username: 3-20 chars");
    validationState.username = false;
    updateRegisterButton();
    return false;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError("Letters, numbers, _ only");
    validationState.username = false;
    updateRegisterButton();
    return false;
  }

  if (users[username]) {
    showError("Username taken");
    validationState.username = false;
    updateRegisterButton();
    return false;
  }

  validationState.username = true;
  updateRegisterButton();
  return true;
}

function validateEmail(email) {
  const errorEl = document.getElementById("regError");
  errorEl.classList.remove("show");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    showError("Invalid email");
    validationState.email = false;
    updateRegisterButton();
    return false;
  }

  const users = getUsers();
  for (let username in users) {
    if (users[username].email === email) {
      showError("Email registered");
      validationState.email = false;
      updateRegisterButton();
      return false;
    }
  }

  validationState.email = true;
  updateRegisterButton();
  return true;
}

function checkPasswordStrength(password) {
  const username = document.getElementById("regUsername").value.toLowerCase();

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isUnique =
    password.toLowerCase() !== username && !password.includes(username);

  updateRequirement("req-length", hasLength);
  updateRequirement("req-upper", hasUpper);
  updateRequirement("req-lower", hasLower);
  updateRequirement("req-number", hasNumber);
  updateRequirement("req-special", hasSpecial);
  updateRequirement("req-unique", isUnique);

  let strength = 0;
  if (hasLength) strength++;
  if (hasUpper) strength++;
  if (hasLower) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  if (isUnique && password.length >= 12) strength++;

  const bar = document.getElementById("strengthBar");
  const text = document.getElementById("strengthText");

  bar.className = "password-strength-bar";

  if (password.length === 0) {
    text.textContent = "";
  } else if (strength <= 2) {
    bar.classList.add("strength-weak");
    text.textContent = "Weak";
    text.style.color = "#ff6b6b";
  } else if (strength <= 4) {
    bar.classList.add("strength-medium");
    text.textContent = "Medium";
    text.style.color = "#ffd93d";
  } else {
    bar.classList.add("strength-strong");
    text.textContent = "Strong";
    text.style.color = "#51cf66";
  }

  validationState.password =
    hasLength && hasUpper && hasLower && hasNumber && hasSpecial && isUnique;
  validatePasswordMatch();
  updateRegisterButton();
}

function updateRequirement(id, met) {
  const el = document.getElementById(id);
  if (met) el.classList.add("met");
  else el.classList.remove("met");
}

function validatePasswordMatch() {
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirmPassword").value;

  if (confirm && password !== confirm) {
    showError("Passwords mismatch");
    validationState.passwordMatch = false;
  } else if (confirm && password === confirm) {
    document.getElementById("regError").classList.remove("show");
    validationState.passwordMatch = true;
  } else {
    validationState.passwordMatch = false;
  }

  updateRegisterButton();
}

function updateRegisterButton() {
  const btn = document.getElementById("registerBtn");
  const allValid =
    validationState.username &&
    validationState.email &&
    validationState.password &&
    validationState.passwordMatch;
  btn.disabled = !allValid;
}

function showError(message) {
  const errorEl = document.getElementById("regError");
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function register() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const successEl = document.getElementById("regSuccess");

  if (
    !validationState.username ||
    !validationState.email ||
    !validationState.password ||
    !validationState.passwordMatch
  )
    return;

  const users = getUsers();

  users[username] = {
    username: username,
    email: email,
    password: hashPassword(password),
    wins: 0,
    losses: 0,
    draws: 0,
    score: 0,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  saveUsers(users);

  successEl.textContent = "Success! Login now.";
  successEl.classList.add("show");

  // Clear form
  document.getElementById("regUsername").value = "";
  document.getElementById("regEmail").value = "";
  document.getElementById("regPassword").value = "";
  document.getElementById("regConfirmPassword").value = "";
  document.getElementById("strengthBar").className = "password-strength-bar";
  document.getElementById("strengthText").textContent = "";

  [
    "req-length",
    "req-upper",
    "req-lower",
    "req-number",
    "req-special",
    "req-unique",
  ].forEach((id) => {
    document.getElementById(id).classList.remove("met");
  });

  validationState = {
    username: false,
    email: false,
    password: false,
    passwordMatch: false,
  };
  updateRegisterButton();

  setTimeout(() => {
    document.getElementById("loginUsername").value = username;
  }, 500);
}

function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");

  errorEl.classList.remove("show");

  if (!username || !password) {
    errorEl.textContent = "Enter credentials";
    errorEl.classList.add("show");
    return;
  }

  const users = getUsers();
  const user = users[username];

  if (!user) {
    errorEl.textContent = "User not found";
    errorEl.classList.add("show");
    return;
  }

  if (user.password !== hashPassword(password)) {
    errorEl.textContent = "Wrong password";
    errorEl.classList.add("show");
    return;
  }

  user.lastLogin = new Date().toISOString();
  users[username] = user;
  saveUsers(users);

  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  showWelcomeScreen();
}

function logout() {
  currentUser = null;
  localStorage.removeItem(CURRENT_USER_KEY);
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("authSection").style.display = "flex";
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").classList.remove("show");
}

function showWelcomeScreen() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("welcomeSection").style.display = "block";
  document.getElementById("currentUserName").textContent = currentUser.username;
  updateUserStats();
}

function updateUserStats() {
  if (!currentUser) return;
  document.getElementById("userWins").textContent = currentUser.wins;
  document.getElementById("userLosses").textContent = currentUser.losses;
  document.getElementById("userDraws").textContent = currentUser.draws;
  document.getElementById("userScore").textContent = currentUser.score;
}

function updateLeaderboard() {
  const users = getUsers();
  const userList = Object.values(users).sort((a, b) => b.score - a.score);
  const listEl = document.getElementById("leaderboardList");

  if (userList.length === 0) {
    listEl.innerHTML = '<div class="no-players">No warriors yet</div>';
    return;
  }

  listEl.innerHTML = userList
    .slice(0, 10)
    .map((user, index) => {
      const rankClass =
        index === 0
          ? "gold"
          : index === 1
            ? "silver"
            : index === 2
              ? "bronze"
              : "";
      const medal =
        index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

      return `
                    <div class="leaderboard-item">
                        <div class="rank ${rankClass}">${medal || index + 1}</div>
                        <div class="player-info">
                            <div class="player-name">${user.username}</div>
                            <div class="player-stats">${user.wins}W ${user.losses}L ${user.draws}D</div>
                        </div>
                        <div class="player-score">${user.score}</div>
                    </div>
                `;
    })
    .join("");
}

function updateCurrentUserStats(result) {
  if (!currentUser) return;

  const users = getUsers();
  const user = users[currentUser.username];

  if (result === "win") {
    user.wins++;
    user.score += 10;
  } else if (result === "loss") {
    user.losses++;
    user.score = Math.max(0, user.score - 5);
  } else if (result === "draw") {
    user.draws++;
    user.score += 2;
  }

  saveUsers(users);
  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  updateUserStats();
  updateLeaderboard();
}

function enterGame() {
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("mainMenu").style.display = "flex";
  updateLeaderboard();
}

function checkExistingSession() {
  const saved = localStorage.getItem(CURRENT_USER_KEY);
  if (saved) {
    currentUser = JSON.parse(saved);
    const users = getUsers();
    if (users[currentUser.username]) {
      currentUser = users[currentUser.username];
      showWelcomeScreen();
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }
}

// Chess Game Logic
const PIECES = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

let board = [];
let currentPlayer = "w";
let selectedPiece = null;
let validMoves = [];
let moveHistory = [];
let capturedPieces = { w: [], b: [] };
let isBotGame = false;
let playerColor = "w";
let botDepth = 3;
let isThinking = false;
let pendingPromotion = null;
let lastMove = null;
let kingPositions = { w: [7, 4], b: [0, 4] };
let gameResult = null;

// Calculate board size based on screen
function getBoardSize() {
  const wrapper = document.querySelector(".board-wrapper");
  if (wrapper) {
    return wrapper.clientWidth;
  }
  return Math.min(window.innerWidth * 0.95, window.innerHeight * 0.95, 800);
}

function initBoard() {
  board = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  ];
  currentPlayer = "w";
  selectedPiece = null;
  validMoves = [];
  moveHistory = [];
  capturedPieces = { w: [], b: [] };
  kingPositions = { w: [7, 4], b: [0, 4] };
  lastMove = null;
  gameResult = null;
  updateDisplay();
}

function showColorSelection() {
  document.getElementById("colorSelection").style.display = "flex";
}

function selectColor(color) {
  playerColor = color === "white" ? "w" : "b";
  document.getElementById("difficultySelector").style.display = "flex";
}

function startBotGame(depth) {
  botDepth = depth;
  isBotGame = true;
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameContainer").style.display = "flex";
  initBoard();
  renderBoard();

  if (playerColor === "b") {
    document.getElementById("statusMessage").textContent = "Thinking...";
    document.getElementById("statusMessage").classList.add("thinking");
    setTimeout(() => {
      makeBotMove();
      document.getElementById("statusMessage").classList.remove("thinking");
    }, 800);
  }
}

function startTwoPlayer() {
  isBotGame = false;
  playerColor = "w";
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameContainer").style.display = "flex";
  initBoard();
  renderBoard();
}

function backToMenu() {
  document.getElementById("gameContainer").style.display = "none";
  document.getElementById("mainMenu").style.display = "flex";
  document.getElementById("colorSelection").style.display = "none";
  document.getElementById("difficultySelector").style.display = "none";
  if (gameResult) {
    updateCurrentUserStats(gameResult);
  }
}

function resetGame() {
  if (gameResult) {
    updateCurrentUserStats(gameResult);
    gameResult = null;
  }
  initBoard();
  renderBoard();
  if (isBotGame && playerColor === "b") {
    setTimeout(() => makeBotMove(), 600);
  }
}

function renderBoard() {
  const boardEl = document.getElementById("chessboard");
  const size = getBoardSize();
  const squareSize = size / 8;

  boardEl.style.width = size + "px";
  boardEl.style.height = size + "px";
  boardEl.style.gridTemplateColumns = `repeat(8, ${squareSize}px)`;
  boardEl.style.gridTemplateRows = `repeat(8, ${squareSize}px)`;
  boardEl.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isLight = (row + col) % 2 === 0;
      square.className = `square ${isLight ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;

      // Coordinates on edge squares only
      if (col === 0) {
        const rank = document.createElement("span");
        rank.className = "coordinates coord-rank";
        rank.textContent = 8 - row;
        square.appendChild(rank);
      }
      if (row === 7) {
        const file = document.createElement("span");
        file.className = "coordinates coord-file";
        file.textContent = String.fromCharCode(97 + col);
        square.appendChild(file);
      }

      // Highlights
      if (lastMove) {
        if (
          (row === lastMove.from[0] && col === lastMove.from[1]) ||
          (row === lastMove.to[0] && col === lastMove.to[1])
        ) {
          square.classList.add("last-move");
        }
      }

      if (
        selectedPiece &&
        selectedPiece[0] === row &&
        selectedPiece[1] === col
      ) {
        square.classList.add("selected");
      }

      if (validMoves.some((m) => m[0] === row && m[1] === col)) {
        if (board[row][col]) {
          square.classList.add("valid-capture");
        } else {
          square.classList.add("valid-move");
        }
      }

      const piece = board[row][col];
      if (piece && piece[1] === "k" && piece[0] === currentPlayer) {
        if (isInCheck(currentPlayer)) {
          square.classList.add("check");
        }
      }

      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.className = `piece ${piece[0] === "w" ? "white" : "black"}`;
        pieceEl.textContent = PIECES[piece[0]][piece[1]];
        pieceEl.style.fontSize = squareSize * 0.8 + "px";

        // Touch events for mobile
        pieceEl.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            handleTouchStart(row, col);
          },
          { passive: false },
        );

        pieceEl.addEventListener("click", (e) => {
          e.stopPropagation();
          handleSquareClick(row, col);
        });

        square.appendChild(pieceEl);
      }

      // Touch and click handlers
      square.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          handleTouchStart(row, col);
        },
        { passive: false },
      );

      square.addEventListener("click", () => handleSquareClick(row, col));

      boardEl.appendChild(square);
    }
  }
}

// Touch handling for mobile
let touchStartPos = null;

function handleTouchStart(row, col) {
  if (isThinking) return;
  if (isBotGame && currentPlayer !== playerColor) return;

  const piece = board[row][col];

  if (selectedPiece) {
    if (validMoves.some((m) => m[0] === row && m[1] === col)) {
      makeMove(selectedPiece[0], selectedPiece[1], row, col);
      selectedPiece = null;
      validMoves = [];
    } else if (piece && piece[0] === currentPlayer) {
      selectedPiece = [row, col];
      validMoves = getValidMoves(row, col);
      renderBoard();
    } else {
      selectedPiece = null;
      validMoves = [];
      renderBoard();
    }
  } else if (piece && piece[0] === currentPlayer) {
    selectedPiece = [row, col];
    validMoves = getValidMoves(row, col);
    renderBoard();
  }
}

function handleSquareClick(row, col) {
  if (isThinking) return;
  if (isBotGame && currentPlayer !== playerColor) return;

  const piece = board[row][col];

  if (selectedPiece) {
    if (validMoves.some((m) => m[0] === row && m[1] === col)) {
      makeMove(selectedPiece[0], selectedPiece[1], row, col);
    } else if (piece && piece[0] === currentPlayer) {
      selectedPiece = [row, col];
      validMoves = getValidMoves(row, col);
      renderBoard();
    } else {
      selectedPiece = null;
      validMoves = [];
      renderBoard();
    }
  } else if (piece && piece[0] === currentPlayer) {
    selectedPiece = [row, col];
    validMoves = getValidMoves(row, col);
    renderBoard();
  }
}

function getValidMoves(row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const color = piece[0];
  const type = piece[1];
  const moves = [];

  switch (type) {
    case "p":
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      if (isValidPos(row + direction, col) && !board[row + direction][col]) {
        moves.push([row + direction, col]);
        if (row === startRow && !board[row + 2 * direction][col]) {
          moves.push([row + 2 * direction, col]);
        }
      }

      for (let dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isValidPos(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (target && target[0] !== color) {
            moves.push([newRow, newCol]);
          }
          if (
            lastMove &&
            lastMove.piece[1] === "p" &&
            Math.abs(lastMove.from[0] - lastMove.to[0]) === 2 &&
            lastMove.to[0] === row &&
            lastMove.to[1] === newCol
          ) {
            moves.push([newRow, newCol]);
          }
        }
      }
      break;

    case "n":
      const knightMoves = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (let [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPos(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target[0] !== color) {
            moves.push([newRow, newCol]);
          }
        }
      }
      break;

    case "b":
    case "r":
    case "q":
      const directions =
        type === "b"
          ? [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
            ]
          : type === "r"
            ? [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
              ]
            : [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
              ];
      for (let [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          const newRow = row + dr * i;
          const newCol = col + dc * i;
          if (!isValidPos(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push([newRow, newCol]);
          } else {
            if (target[0] !== color) moves.push([newRow, newCol]);
            break;
          }
        }
      }
      break;

    case "k":
      const kingMoves = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ];
      for (let [dr, dc] of kingMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPos(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target[0] !== color) {
            moves.push([newRow, newCol]);
          }
        }
      }

      if (!hasMoved(row, col) && !isInCheck(color)) {
        if (canCastle(row, col, 7)) moves.push([row, 6]);
        if (canCastle(row, col, 0)) moves.push([row, 2]);
      }
      break;
  }

  return moves.filter((move) => {
    const testBoard = copyBoard(board);
    testBoard[move[0]][move[1]] = testBoard[row][col];
    testBoard[row][col] = null;

    if (type === "p" && move[1] !== col && !board[move[0]][move[1]]) {
      testBoard[row][move[1]] = null;
    }

    const testKingPos = type === "k" ? move : kingPositions[color];
    return !isSquareAttacked(testKingPos[0], testKingPos[1], color, testBoard);
  });
}

function canCastle(kingRow, kingCol, rookCol) {
  const color = board[kingRow][kingCol][0];
  const rook = board[kingRow][rookCol];
  if (!rook || rook[1] !== "r" || rook[0] !== color) return false;
  if (hasMoved(kingRow, rookCol)) return false;

  const step = rookCol > kingCol ? 1 : -1;
  for (let col = kingCol + step; col !== rookCol; col += step) {
    if (board[kingRow][col]) return false;
    if (col !== kingCol + step && isSquareAttacked(kingRow, col, color, board))
      return false;
  }
  return true;
}

function hasMoved(row, col) {
  const piece = board[row][col];
  if (!piece) return true;

  for (let move of moveHistory) {
    if (move.from[0] === row && move.from[1] === col && move.piece === piece) {
      return true;
    }
    if (
      move.to[0] === row &&
      move.to[1] === col &&
      move.piece[1] === piece[1]
    ) {
      return true;
    }
  }
  return false;
}

function isValidPos(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isInCheck(color) {
  return isSquareAttacked(
    kingPositions[color][0],
    kingPositions[color][1],
    color,
    board,
  );
}

function isSquareAttacked(row, col, defendingColor, testBoard) {
  const attackingColor = defendingColor === "w" ? "b" : "w";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = testBoard[r][c];
      if (!piece || piece[0] !== attackingColor) continue;

      const type = piece[1];

      if (type === "p") {
        const direction = attackingColor === "w" ? -1 : 1;
        if (r + direction === row && Math.abs(c - col) === 1) return true;
        continue;
      }

      if (type === "n") {
        const dr = Math.abs(r - row);
        const dc = Math.abs(c - col);
        if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) return true;
        continue;
      }

      if (type === "b" || type === "r" || type === "q") {
        const dr = Math.sign(row - r);
        const dc = Math.sign(col - c);

        if (type === "b" && (dr === 0 || dc === 0)) continue;
        if (type === "r" && dr !== 0 && dc !== 0) continue;

        let currR = r + dr;
        let currC = c + dc;
        while (currR !== row || currC !== col) {
          if (!isValidPos(currR, currC)) break;
          if (testBoard[currR][currC]) break;
          currR += dr;
          currC += dc;
        }
        if (currR === row && currC === col) return true;
      }

      if (type === "k") {
        if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
      }
    }
  }
  return false;
}

function makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
  const piece = board[fromRow][fromCol];
  const captured = board[toRow][toCol];

  let enPassantCapture = null;
  if (piece[1] === "p" && toCol !== fromCol && !captured) {
    enPassantCapture = board[fromRow][toCol];
  }

  if (piece[1] === "p" && (toRow === 0 || toRow === 7)) {
    if (!promotionPiece) {
      pendingPromotion = { fromRow, fromCol, toRow, toCol };
      showPromotionModal(piece[0]);
      return;
    }
  }

  executeMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    captured,
    enPassantCapture,
    promotionPiece,
  );
}

function showPromotionModal(color) {
  const modal = document.getElementById("promotionModal");
  const content = document.getElementById("promotionOptions");
  content.innerHTML = "";

  const pieces = ["q", "r", "b", "n"];
  const symbols = PIECES[color];

  pieces.forEach((p) => {
    const div = document.createElement("div");
    div.className = "promotion-piece";
    div.textContent = symbols[p];
    div.onclick = () => handlePromotion(p);
    content.appendChild(div);
  });

  modal.style.display = "flex";
}

function handlePromotion(type) {
  document.getElementById("promotionModal").style.display = "none";
  if (pendingPromotion) {
    const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
    pendingPromotion = null;
    makeMove(fromRow, fromCol, toRow, toCol, type);
  }
}

function executeMove(
  fromRow,
  fromCol,
  toRow,
  toCol,
  captured,
  enPassantCapture,
  promotionPiece,
) {
  const piece = board[fromRow][fromCol];

  const move = {
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece: piece,
    captured: captured || enPassantCapture,
    board: copyBoard(board),
    kingPositions: { ...kingPositions },
  };

  board[toRow][toCol] = promotionPiece ? piece[0] + promotionPiece : piece;
  board[fromRow][fromCol] = null;

  if (enPassantCapture) {
    board[fromRow][toCol] = null;
  }

  if (piece[1] === "k") {
    kingPositions[piece[0]] = [toRow, toCol];

    if (Math.abs(toCol - fromCol) === 2) {
      const rookFromCol = toCol > fromCol ? 7 : 0;
      const rookToCol = toCol > fromCol ? 5 : 3;
      board[toRow][rookToCol] = board[toRow][rookFromCol];
      board[toRow][rookFromCol] = null;
    }
  }

  if (captured || enPassantCapture) {
    capturedPieces[currentPlayer].push(captured || enPassantCapture);
  }

  moveHistory.push(move);
  lastMove = move;

  currentPlayer = currentPlayer === "w" ? "b" : "w";
  selectedPiece = null;
  validMoves = [];

  updateDisplay();
  renderBoard();

  if (isCheckmate(currentPlayer)) {
    const winner = currentPlayer === "w" ? "Black" : "White";
    document.getElementById("statusMessage").innerHTML =
      `<span style="color: #ff6b6b;">Checkmate!</span> ${winner} wins!`;

    if (isBotGame) {
      if (
        (winner === "White" && playerColor === "w") ||
        (winner === "Black" && playerColor === "b")
      ) {
        gameResult = "win";
      } else {
        gameResult = "loss";
      }
    }
    return;
  } else if (isStalemate(currentPlayer)) {
    document.getElementById("statusMessage").textContent = "Stalemate! Draw.";
    if (isBotGame) gameResult = "draw";
    return;
  } else if (isInCheck(currentPlayer)) {
    document.getElementById("statusMessage").innerHTML =
      '<span style="color: #ff6b6b;">Check!</span>';
  } else {
    document.getElementById("statusMessage").textContent = "";
  }

  if (
    isBotGame &&
    currentPlayer !== playerColor &&
    !isCheckmate(currentPlayer) &&
    !isStalemate(currentPlayer)
  ) {
    isThinking = true;
    document.getElementById("statusMessage").textContent = "Thinking...";
    document.getElementById("statusMessage").classList.add("thinking");

    setTimeout(() => {
      try {
        makeBotMove();
      } catch (e) {
        console.error("Bot error:", e);
      }
      document.getElementById("statusMessage").classList.remove("thinking");
      isThinking = false;
    }, 100);
  }
}

function undoMove() {
  if (moveHistory.length === 0) return;

  const movesToUndo = isBotGame && moveHistory.length >= 2 ? 2 : 1;

  for (let i = 0; i < movesToUndo && moveHistory.length > 0; i++) {
    const move = moveHistory.pop();
    board = move.board;
    kingPositions = move.kingPositions;
  }

  currentPlayer = moveHistory.length % 2 === 0 ? "w" : "b";
  selectedPiece = null;
  validMoves = [];
  gameResult = null;

  capturedPieces = { w: [], b: [] };
  for (let move of moveHistory) {
    if (move.captured) {
      const capturer = move.piece[0];
      capturedPieces[capturer].push(move.captured);
    }
  }

  updateDisplay();
  renderBoard();
}

function updateDisplay() {
  document.getElementById("turnIndicator").textContent =
    (currentPlayer === "w" ? "White" : "Black") + "'s Turn";

  const capturedWhite = document.getElementById("capturedWhite");
  const capturedBlack = document.getElementById("capturedBlack");

  capturedWhite.innerHTML = capturedPieces.b
    .map(
      (p) =>
        `<span class="piece white" style="font-size: clamp(12px, min(3vw, 3vh), 24px);">${PIECES["w"][p[1]]}</span>`,
    )
    .join("");

  capturedBlack.innerHTML = capturedPieces.w
    .map(
      (p) =>
        `<span class="piece black" style="font-size: clamp(12px, min(3vw, 3vh), 24px);">${PIECES["b"][p[1]]}</span>`,
    )
    .join("");
}

function makeBotMove() {
  const botColor = playerColor === "w" ? "b" : "w";
  const allMoves = getAllValidMoves(botColor);

  if (allMoves.length === 0) return;

  allMoves.sort(() => Math.random() - 0.5);

  let bestMove = null;
  let bestScore = -Infinity;

  for (let move of allMoves) {
    const score = evaluateMove(move, botDepth, -Infinity, Infinity, true);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove) {
    const piece = board[bestMove.from[0]][bestMove.from[1]];
    if (piece[1] === "p" && (bestMove.to[0] === 0 || bestMove.to[0] === 7)) {
      executeMove(
        bestMove.from[0],
        bestMove.from[1],
        bestMove.to[0],
        bestMove.to[1],
        null,
        null,
        "q",
      );
    } else {
      executeMove(
        bestMove.from[0],
        bestMove.from[1],
        bestMove.to[0],
        bestMove.to[1],
        bestMove.captured,
        null,
        null,
      );
    }
  }
}

function evaluateMove(move, depth, alpha, beta, isMaximizing) {
  const botColor = playerColor === "w" ? "b" : "w";
  const opponentColor = playerColor;

  const savedBoard = copyBoard(board);
  const savedKingPos = { ...kingPositions };
  const savedCurrentPlayer = currentPlayer;

  const piece = board[move.from[0]][move.from[1]];
  board[move.to[0]][move.to[1]] = piece;
  board[move.from[0]][move.from[1]] = null;

  if (piece[1] === "k") {
    kingPositions[piece[0]] = [move.to[0], move.to[1]];
  }

  currentPlayer = opponentColor;

  let score;
  if (depth <= 1) {
    score = evaluateBoard();
  } else {
    const opponentMoves = getAllValidMoves(opponentColor);
    if (opponentMoves.length === 0) {
      if (isInCheck(opponentColor)) {
        score = isMaximizing ? 100000 : -100000;
      } else {
        score = 0;
      }
    } else {
      if (isMaximizing) {
        let minScore = Infinity;
        for (let oppMove of opponentMoves) {
          const s = evaluateMove(oppMove, depth - 1, alpha, beta, false);
          minScore = Math.min(minScore, s);
          beta = Math.min(beta, s);
          if (beta <= alpha) break;
        }
        score = minScore;
      } else {
        let maxScore = -Infinity;
        for (let oppMove of opponentMoves) {
          const s = evaluateMove(oppMove, depth - 1, alpha, beta, true);
          maxScore = Math.max(maxScore, s);
          alpha = Math.max(alpha, s);
          if (beta <= alpha) break;
        }
        score = maxScore;
      }
    }
  }

  board = savedBoard;
  kingPositions = savedKingPos;
  currentPlayer = savedCurrentPlayer;

  return score;
}

function getAllValidMoves(color) {
  const moves = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece[0] === color) {
        const pieceMoves = getValidMoves(row, col);
        for (let move of pieceMoves) {
          const captured = board[move[0]][move[1]];
          moves.push({
            from: [row, col],
            to: move,
            piece: piece,
            captured: captured,
          });
        }
      }
    }
  }
  return moves;
}

function evaluateBoard() {
  let score = 0;
  const botColor = playerColor === "w" ? "b" : "w";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = PIECE_VALUES[piece[1]];

      if (piece[1] === "p") {
        const advance = piece[0] === "w" ? 6 - row : row - 1;
        value += advance * 10;
        if (col >= 3 && col <= 4) value += 20;
      }

      if (piece[1] === "n" || piece[1] === "b") {
        if ((piece[0] === "w" && row < 6) || (piece[0] === "b" && row > 1)) {
          value += 10;
        }
      }

      if (piece[0] === botColor) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  return score;
}

function isCheckmate(color) {
  if (!isInCheck(color)) return false;
  return getAllValidMoves(color).length === 0;
}

function isStalemate(color) {
  if (isInCheck(color)) return false;
  return getAllValidMoves(color).length === 0;
}

function copyBoard(b) {
  return b.map((row) => [...row]);
}

// Handle resize
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (document.getElementById("gameContainer").style.display === "flex") {
      renderBoard();
    }
  }, 100);
});

// Handle orientation change
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (document.getElementById("gameContainer").style.display === "flex") {
      renderBoard();
    }
  }, 100);
});

document.getElementById("promotionModal").addEventListener("click", (e) => {
  if (e.target.id === "promotionModal") {
    document.getElementById("promotionModal").style.display = "none";
    pendingPromotion = null;
  }
});

// Initialize
checkExistingSession();

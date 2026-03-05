// Particle System
function createParticles() {
  const container = document.getElementById("particles");
  if (!container) return;
  
  const count = window.innerWidth < 768 ? 30 : 70;
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = Math.random() * 100 + "%";
    particle.style.animationDelay = Math.random() * 20 + "s";
    particle.style.animationDuration = (15 + Math.random() * 15) + "s";
    
    // Random colors for particles
    const colors = [
      'rgba(255, 215, 0, 0.6)',
      'rgba(147, 112, 219, 0.5)',
      'rgba(0, 191, 255, 0.5)',
      'rgba(255, 100, 100, 0.4)'
    ];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
    
    container.appendChild(particle);
  }
}

// Game State
const PIECES = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
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

// Selection State
let gameState = {
  mode: null,
  color: null,
  difficulty: null
};

// Selection Functions
function selectMode(mode) {
  gameState.mode = mode;
  
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById(mode === 'bot' ? 'btnVsBot' : 'btnVsPlayer').classList.add('selected');
  
  const indicator = document.getElementById('modeIndicator');
  indicator.textContent = mode === 'bot' ? 'VS Bot selected' : '2 Players selected';
  indicator.classList.add('active');
  
  document.getElementById('colorSection').classList.add('show');
  
  if (mode === '2player') {
    selectColor('white');
    document.getElementById('difficultySection').style.display = 'none';
  } else {
    document.getElementById('difficultySection').style.display = 'block';
    if (gameState.color) {
      document.getElementById('difficultySection').classList.add('show');
    }
  }
  
  updateStartButton();
}

function selectColor(color) {
  gameState.color = color;
  playerColor = color === 'white' ? 'w' : 'b';
  
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('selected', 'white-side', 'black-side');
  });
  
  const btn = document.getElementById(color === 'white' ? 'btnWhite' : 'btnBlack');
  btn.classList.add('selected', color === 'white' ? 'white-side' : 'black-side');
  
  if (gameState.mode === 'bot') {
    document.getElementById('difficultySection').classList.add('show');
  }
  
  document.getElementById('startSection').classList.add('show');
  
  updateStartButton();
  updateSelectionSummary();
}

function selectDifficulty(depth) {
  gameState.difficulty = depth;
  botDepth = depth;
  
  document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('selected'));
  const btnId = depth === 2 ? 'btnEasy' : depth === 3 ? 'btnMedium' : 'btnHard';
  document.getElementById(btnId).classList.add('selected');
  
  updateStartButton();
  updateSelectionSummary();
}

function updateSelectionSummary() {
  const summary = document.getElementById('selectionSummary');
  if (!gameState.mode) {
    summary.textContent = '';
    return;
  }
  
  let text = '';
  if (gameState.mode === '2player') {
    text = '2 Players • Local match';
  } else if (gameState.mode === 'bot') {
    const diffText = gameState.difficulty === 2 ? 'Easy' : gameState.difficulty === 3 ? 'Medium' : 'Hard';
    const colorText = gameState.color ? (gameState.color === 'white' ? 'White' : 'Black') : '';
    text = `VS Bot • ${colorText || 'Select color'} • ${gameState.difficulty ? diffText : 'Select difficulty'}`;
  }
  
  summary.textContent = text;
}

function updateStartButton() {
  const btn = document.getElementById('btnStart');
  let canStart = false;
  
  if (gameState.mode === '2player') {
    canStart = gameState.color !== null;
  } else if (gameState.mode === 'bot') {
    canStart = gameState.color !== null && gameState.difficulty !== null;
  }
  
  btn.disabled = !canStart;
}

function startGame() {
  if (!gameState.mode) return;
  
  isBotGame = gameState.mode === 'bot';
  
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'flex';
  
  const badge = document.getElementById('gameModeBadge');
  badge.textContent = isBotGame ? `VS Bot (${gameState.difficulty === 2 ? 'Easy' : gameState.difficulty === 3 ? 'Medium' : 'Hard'})` : '2 Players';
  
  initBoard();
  renderBoard();
  
  if (isBotGame && playerColor === 'b') {
    document.getElementById('statusMessage').textContent = "Bot is thinking...";
    document.getElementById('statusMessage').classList.add('thinking');
    setTimeout(() => {
      makeBotMove();
      document.getElementById('statusMessage').classList.remove('thinking');
    }, 1000);
  }
}

// Board Functions
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
  updateDisplay();
}

function renderBoard() {
  const boardEl = document.getElementById("chessboard");
  if (!boardEl) return;
  
  boardEl.innerHTML = "";
  
  // Set explicit grid dimensions
  boardEl.style.display = 'grid';
  boardEl.style.gridTemplateColumns = `repeat(8, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(8, 1fr)`;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isLight = (row + col) % 2 === 0;
      square.className = `square ${isLight ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;

      // Coordinates
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
        if ((row === lastMove.from[0] && col === lastMove.from[1]) ||
            (row === lastMove.to[0] && col === lastMove.to[1])) {
          square.classList.add("last-move");
        }
      }

      if (selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col) {
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

        pieceEl.addEventListener("touchstart", (e) => {
          e.preventDefault();
          handleTouchStart(row, col);
        }, { passive: false });

        pieceEl.addEventListener("click", (e) => {
          e.stopPropagation();
          handleSquareClick(row, col);
        });

        square.appendChild(pieceEl);
      }

      square.addEventListener("touchstart", (e) => {
        e.preventDefault();
        handleTouchStart(row, col);
      }, { passive: false });

      square.addEventListener("click", () => handleSquareClick(row, col));

      boardEl.appendChild(square);
    }
  }
}

// Touch/Click Handling
function handleTouchStart(row, col) {
  if (isThinking) return;
  if (isBotGame && currentPlayer !== playerColor) return;
  handleInteraction(row, col);
}

function handleSquareClick(row, col) {
  if (isThinking) return;
  if (isBotGame && currentPlayer !== playerColor) return;
  handleInteraction(row, col);
}

function handleInteraction(row, col) {
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

// Move Logic
function getValidMoves(row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const color = piece[0];
  const type = piece[1];
  const moves = [];

  const addMove = (r, c) => {
    if (isValidPos(r, c)) {
      const target = board[r][c];
      if (!target || target[0] !== color) {
        moves.push([r, c]);
      }
    }
  };

  switch (type) {
    case "p":
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      if (!board[row + direction]?.[col]) {
        addMove(row + direction, col);
        if (row === startRow && !board[row + 2 * direction]?.[col]) {
          addMove(row + 2 * direction, col);
        }
      }

      [-1, 1].forEach(dc => {
        const newRow = row + direction;
        const newCol = col + dc;
        if (isValidPos(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (target && target[0] !== color) {
            moves.push([newRow, newCol]);
          }
          if (lastMove?.piece[1] === "p" && 
              Math.abs(lastMove.from[0] - lastMove.to[0]) === 2 &&
              lastMove.to[0] === row && lastMove.to[1] === newCol) {
            moves.push([newRow, newCol]);
          }
        }
      });
      break;

    case "n":
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
        addMove(row + dr, col + dc);
      });
      break;

    case "b":
    case "r":
    case "q":
      const directions = type === "b" ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
                        type === "r" ? [[-1,0],[1,0],[0,-1],[0,1]] :
                        [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      
      directions.forEach(([dr, dc]) => {
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
      });
      break;

    case "k":
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
        addMove(row + dr, col + dc);
      });

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
    if (col !== kingCol + step && isSquareAttacked(kingRow, col, color, board)) return false;
  }
  return true;
}

function hasMoved(row, col) {
  const piece = board[row][col];
  if (!piece) return true;

  return moveHistory.some(move => 
    (move.from[0] === row && move.from[1] === col && move.piece === piece) ||
    (move.to[0] === row && move.to[1] === col && move.piece[1] === piece[1])
  );
}

function isValidPos(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isInCheck(color) {
  return isSquareAttacked(kingPositions[color][0], kingPositions[color][1], color, board);
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

  executeMove(fromRow, fromCol, toRow, toCol, captured, enPassantCapture, promotionPiece);
}

function showPromotionModal(color) {
  const modal = document.getElementById("promotionModal");
  const content = document.getElementById("promotionOptions");
  content.innerHTML = "";

  ["q", "r", "b", "n"].forEach((p) => {
    const div = document.createElement("div");
    div.className = "promotion-piece";
    div.textContent = PIECES[color][p];
    div.onclick = () => {
      modal.style.display = "none";
      if (pendingPromotion) {
        const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
        pendingPromotion = null;
        makeMove(fromRow, fromCol, toRow, toCol, p);
      }
    };
    content.appendChild(div);
  });

  modal.style.display = "flex";
}

function executeMove(fromRow, fromCol, toRow, toCol, captured, enPassantCapture, promotionPiece) {
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
    document.getElementById('statusMessage').innerHTML = 
      `<span style="color: #ff6b6b; text-shadow: 0 0 20px rgba(255, 0, 0, 0.5);">Checkmate!</span> ${winner} wins! 🎉`;
    return;
  } else if (isStalemate(currentPlayer)) {
    document.getElementById('statusMessage').innerHTML = 
      `<span style="color: #9370db;">Stalemate!</span> It's a draw 🤝`;
    return;
  } else if (isInCheck(currentPlayer)) {
    document.getElementById('statusMessage').innerHTML = 
      '<span style="color: #ff6b6b; animation: pulse 0.5s infinite;">⚠️ Check!</span>';
  } else {
    document.getElementById('statusMessage').textContent = "";
  }

  if (isBotGame && currentPlayer !== playerColor) {
    isThinking = true;
    document.getElementById('statusMessage').textContent = "Bot is thinking...";
    document.getElementById('statusMessage').classList.add('thinking');
    
    setTimeout(() => {
      makeBotMove();
      document.getElementById('statusMessage').classList.remove('thinking');
      isThinking = false;
    }, 600);
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

  capturedPieces = { w: [], b: [] };
  moveHistory.forEach(move => {
    if (move.captured) {
      const capturer = move.piece[0];
      capturedPieces[capturer].push(move.captured);
    }
  });

  updateDisplay();
  renderBoard();
}

function updateDisplay() {
  document.getElementById('turnIndicator').textContent = 
    (currentPlayer === "w" ? "White" : "Black") + "'s Turn";

  const formatPieces = (pieces, color) => pieces.map(p => 
    `<span class="piece ${color}" style="font-size: clamp(14px, min(3.5vw, 3.5vh), 28px);">${PIECES[color][p[1]]}</span>`
  ).join("");

  document.getElementById('capturedWhite').innerHTML = formatPieces(capturedPieces.b, "white");
  document.getElementById('capturedBlack').innerHTML = formatPieces(capturedPieces.w, "black");
}

// Bot AI
function makeBotMove() {
  const botColor = playerColor === "w" ? "b" : "w";
  const allMoves = getAllValidMoves(botColor);
  
  if (allMoves.length === 0) return;

  allMoves.sort(() => Math.random() - 0.5);

  let bestMove = null;
  let bestScore = -Infinity;

  for (let move of allMoves.slice(0, Math.min(allMoves.length, 20))) {
    const score = evaluateMove(move, botDepth, -Infinity, Infinity, true);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove) {
    const piece = board[bestMove.from[0]][bestMove.from[1]];
    const isPromotion = piece[1] === "p" && (bestMove.to[0] === 0 || bestMove.to[0] === 7);
    executeMove(
      bestMove.from[0], bestMove.from[1],
      bestMove.to[0], bestMove.to[1],
      bestMove.captured, null,
      isPromotion ? "q" : null
    );
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
      score = isInCheck(opponentColor) ? (isMaximizing ? 100000 : -100000) : 0;
    } else {
      if (isMaximizing) {
        let minScore = Infinity;
        for (let oppMove of opponentMoves.slice(0, 10)) {
          const s = evaluateMove(oppMove, depth - 1, alpha, beta, false);
          minScore = Math.min(minScore, s);
          beta = Math.min(beta, s);
          if (beta <= alpha) break;
        }
        score = minScore;
      } else {
        let maxScore = -Infinity;
        for (let oppMove of opponentMoves.slice(0, 10)) {
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
        getValidMoves(row, col).forEach(move => {
          moves.push({
            from: [row, col],
            to: move,
            piece: piece,
            captured: board[move[0]][move[1]],
          });
        });
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
  return isInCheck(color) && getAllValidMoves(color).length === 0;
}

function isStalemate(color) {
  return !isInCheck(color) && getAllValidMoves(color).length === 0;
}

function copyBoard(b) {
  return b.map(row => [...row]);
}

// Menu Functions
function backToMenu() {
  document.getElementById('gameContainer').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
  
  gameState = { mode: null, color: null, difficulty: null };
  document.querySelectorAll('.mode-btn, .color-btn, .difficulty-btn').forEach(btn => {
    btn.classList.remove('selected', 'white-side', 'black-side');
  });
  document.getElementById('colorSection').classList.remove('show');
  document.getElementById('difficultySection').classList.remove('show');
  document.getElementById('startSection').classList.remove('show');
  document.getElementById('modeIndicator').textContent = 'Select a mode';
  document.getElementById('modeIndicator').classList.remove('active');
  updateSelectionSummary();
}

function resetGame() {
  initBoard();
  renderBoard();
  if (isBotGame && playerColor === 'b') {
    setTimeout(() => makeBotMove(), 800);
  }
}

// Event Listeners
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (document.getElementById('gameContainer').style.display === 'flex') {
      renderBoard();
    }
  }, 100);
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (document.getElementById('gameContainer').style.display === 'flex') {
      renderBoard();
    }
  }, 300);
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
});

document.getElementById('promotionModal').addEventListener('click', (e) => {
  if (e.target.id === 'promotionModal') {
    e.target.style.display = 'none';
    pendingPromotion = null;
  }
});

// Prevent zoom on double tap for mobile
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// Prevent context menu on long press for pieces
document.addEventListener('contextmenu', (e) => {
  if (e.target.classList.contains('piece')) {
    e.preventDefault();
  }
});

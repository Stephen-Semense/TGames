let board = [];
let currentPlayer = "white";
let selectedPiece = null;
let validMoves = [];
let capturedPieces = { white: 0, black: 0 };
let isGameOver = false;
let lastMove = null;
let mustCapture = false;
let captureChain = false;

// Game Mode
let gameMode = null;
let playerColor = null; // Player's chosen color
let difficulty = "medium";
let botColor = "black";
let isBotThinking = false;
let boardFlipped = false; // Whether board is visually flipped

// Initialize board - Filipino Dama setup (12 pieces, dark squares only)
function initBoard() {
  board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Place white pieces on dark squares of rows 0-2 (top of board)
  // Dark squares: (row + col) % 2 === 1
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { type: "white", isKing: false };
      }
    }
  }

  // Place black pieces on dark squares of rows 5-7 (bottom of board)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { type: "black", isKing: false };
      }
    }
  }
}

// Check if square is valid (dark square)
function isValidSquare(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8 && (row + col) % 2 === 1;
}

// Convert visual coordinates to board coordinates (handles board flipping)
function visualToBoard(visualRow, visualCol) {
  if (boardFlipped) {
    return { row: 7 - visualRow, col: 7 - visualCol };
  }
  return { row: visualRow, col: visualCol };
}

// Convert board coordinates to visual coordinates
function boardToVisual(boardRow, boardCol) {
  if (boardFlipped) {
    return { row: 7 - boardRow, col: 7 - boardCol };
  }
  return { row: boardRow, col: boardCol };
}

// Render board
function renderBoard() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  // Apply or remove flipped class based on player color
  if (boardFlipped) {
    boardEl.classList.add("flipped");
  } else {
    boardEl.classList.remove("flipped");
  }

  // Render in visual order (0-7), convert to board coordinates for logic
  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const { row, col } = visualToBoard(visualRow, visualCol);

      const square = document.createElement("div");
      const isDark = (visualRow + visualCol) % 2 === 1;
      square.className = `square ${isDark ? "dark" : "light"}`;
      square.dataset.visualRow = visualRow;
      square.dataset.visualCol = visualCol;
      square.dataset.row = row;
      square.dataset.col = col;

      // Only dark squares are playable
      if (!isDark) {
        boardEl.appendChild(square);
        continue;
      }

      // Highlight last move (convert board coords to visual)
      if (lastMove) {
        const fromVisual = boardToVisual(lastMove.from.row, lastMove.from.col);
        const toVisual = boardToVisual(lastMove.to.row, lastMove.to.col);
        if (
          (fromVisual.row === visualRow && fromVisual.col === visualCol) ||
          (toVisual.row === visualRow && toVisual.col === visualCol)
        ) {
          square.classList.add("last-move");
        }
      }

      // Highlight selected (convert board coords to visual)
      if (selectedPiece) {
        const selectedVisual = boardToVisual(
          selectedPiece.row,
          selectedPiece.col,
        );
        if (
          selectedVisual.row === visualRow &&
          selectedVisual.col === visualCol
        ) {
          square.classList.add("selected");
        }
      }

      // Highlight valid moves
      for (const move of validMoves) {
        const moveVisual = boardToVisual(move.row, move.col);
        if (moveVisual.row === visualRow && moveVisual.col === visualCol) {
          square.classList.add("valid-move");
          break;
        }
      }

      // Add piece
      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${piece.type} ${piece.isKing ? "king" : ""}`;

        // Scale up selected piece
        if (
          selectedPiece &&
          selectedPiece.row === row &&
          selectedPiece.col === col
        ) {
          pieceEl.style.transform = boardFlipped
            ? "scale(1.1) rotate(180deg)"
            : "scale(1.1)";
        }

        square.appendChild(pieceEl);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      boardEl.appendChild(square);
    }
  }
}

// Get valid moves for a piece - Filipino Dama rules
function getValidMoves(row, col, isCaptureChain = false) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const captures = [];

  // Diagonal directions - relative to piece color, not board orientation
  // White moves down the board (increasing row), Black moves up (decreasing row)
  const directions = piece.isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ] // King: all 4 diagonals
    : piece.type === "white"
      ? [
          [1, -1],
          [1, 1],
        ] // White: forward diagonals (down the board)
      : [
          [-1, -1],
          [-1, 1],
        ]; // Black: forward diagonals (up the board)

  for (const [dr, dc] of directions) {
    if (piece.isKing) {
      // King movement - flying king (any distance)
      let r = row + dr;
      let c = col + dc;

      // First check for captures (must prioritize)
      while (isValidSquare(r, c)) {
        if (board[r][c]) {
          if (board[r][c].type !== piece.type) {
            // Found opponent piece, check if we can capture
            let landR = r + dr;
            let landC = c + dc;

            // Find all landing squares after the captured piece
            while (isValidSquare(landR, landC) && !board[landR][landC]) {
              captures.push({
                row: landR,
                col: landC,
                captureRow: r,
                captureCol: c,
                isCapture: true,
              });
              landR += dr;
              landC += dc;
            }
          }
          break; // Blocked by any piece
        }
        r += dr;
        c += dc;
      }

      // Non-capture moves (only if not in capture chain)
      if (!isCaptureChain && captures.length === 0) {
        r = row + dr;
        c = col + dc;
        while (isValidSquare(r, c) && !board[r][c]) {
          moves.push({ row: r, col: c, isCapture: false });
          r += dr;
          c += dc;
        }
      }
    } else {
      // Regular piece - moves 1 square diagonally forward
      const newRow = row + dr;
      const newCol = col + dc;

      if (isValidSquare(newRow, newCol)) {
        if (!board[newRow][newCol] && !isCaptureChain) {
          moves.push({ row: newRow, col: newCol, isCapture: false });
        } else if (
          board[newRow][newCol] &&
          board[newRow][newCol].type !== piece.type
        ) {
          // Check capture - must land immediately after
          const jumpRow = newRow + dr;
          const jumpCol = newCol + dc;
          if (isValidSquare(jumpRow, jumpCol) && !board[jumpRow][jumpCol]) {
            captures.push({
              row: jumpRow,
              col: jumpCol,
              captureRow: newRow,
              captureCol: newCol,
              isCapture: true,
            });
          }
        }
      }
    }
  }

  return captures.length > 0 ? captures : moves;
}

// Check if any capture is available for current player (mandatory capture rule)
function checkMandatoryCapture() {
  let maxCaptures = 0;
  let captureMoves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === currentPlayer) {
        const moves = getValidMoves(row, col);
        const pieceCaptures = moves.filter((m) => m.isCapture);

        if (pieceCaptures.length > 0) {
          // Count total captures possible from this piece (including chains)
          const count = countMaxCaptures(row, col, pieceCaptures);
          if (count > maxCaptures) {
            maxCaptures = count;
            captureMoves = [{ from: { row, col }, moves: pieceCaptures }];
          } else if (count === maxCaptures && count > 0) {
            captureMoves.push({ from: { row, col }, moves: pieceCaptures });
          }
        }
      }
    }
  }

  return { mustCapture: maxCaptures > 0, maxCaptures, captureMoves };
}

// Count maximum captures possible from a position (simplified)
function countMaxCaptures(row, col, immediateCaptures) {
  let max = 0;

  for (const capture of immediateCaptures) {
    let count = 1; // This capture

    // Simulate and check for follow-up captures
    const nextCaptures = simulateCaptureAndCheck(row, col, capture);
    count += nextCaptures;

    if (count > max) max = count;
  }

  return max;
}

// Simulate capture and check for follow-ups
function simulateCaptureAndCheck(fromRow, fromCol, capture, piece) {
  // Simple simulation - in full implementation would recurse
  return 0;
}

// Handle square click
function handleSquareClick(row, col) {
  if (isGameOver || isBotThinking) return;

  // In PvB mode, prevent player from moving bot pieces
  if (gameMode === "pvb" && currentPlayer === botColor) return;

  const piece = board[row][col];

  // If selecting a piece
  if (piece && piece.type === currentPlayer && !captureChain) {
    const captureCheck = checkMandatoryCapture();
    const moves = getValidMoves(row, col);

    // Filter moves if capture is mandatory
    if (captureCheck.mustCapture) {
      const captureMoves = moves.filter((m) => m.isCapture);
      if (captureMoves.length === 0) {
        // This piece cannot capture, but others can
        showMessage("You must capture the maximum pieces!");
        return;
      }
      // Check if this piece can capture the maximum
      const thisMax = countMaxCaptures(row, col, captureMoves);
      if (thisMax < captureCheck.maxCaptures) {
        showMessage(`Must capture ${captureCheck.maxCaptures} piece(s)!`);
        return;
      }
      validMoves = captureMoves;
    } else {
      validMoves = moves;
    }

    selectedPiece = { row, col };
    renderBoard();
    return;
  }

  // If moving a piece
  if (selectedPiece) {
    const move = validMoves.find((m) => m.row === row && m.col === col);
    if (move) {
      executeMove(selectedPiece.row, selectedPiece.col, move);
    } else if (piece && piece.type === currentPlayer) {
      // Select different piece
      handleSquareClick(row, col);
    } else {
      // Deselect
      selectedPiece = null;
      validMoves = [];
      renderBoard();
    }
  }
}

// Execute move
function executeMove(fromRow, fromCol, move) {
  const piece = board[fromRow][fromCol];
  const wasKing = piece.isKing;

  board[move.row][move.col] = piece;
  board[fromRow][fromCol] = null;

  let captured = false;
  let becameKing = false;

  // Handle capture
  if (move.isCapture) {
    board[move.captureRow][move.captureCol] = null;
    capturedPieces[currentPlayer === "white" ? "black" : "white"]++;
    captured = true;

    // Animation
    const visualCapture = boardToVisual(move.captureRow, move.captureCol);
    const square = document.querySelector(
      `[data-visual-row="${visualCapture.row}"][data-visual-col="${visualCapture.col}"]`,
    );
    if (square) {
      const pieceEl = square.querySelector(".piece");
      if (pieceEl) pieceEl.classList.add("fade-out");
    }
  }

  // Check promotion (Crownhead Stop Rule - only if turn ends on last row)
  const promotionRow = piece.type === "white" ? 7 : 0;

  if (!wasKing && move.row === promotionRow) {
    // Only promote if this is the end of the turn (no more captures)
    // Check for additional captures first
    const additionalMoves = getValidMoves(move.row, move.col, true);
    const additionalCaptures = additionalMoves.filter((m) => m.isCapture);

    if (additionalCaptures.length === 0 || !captured) {
      // No more captures or didn't capture - promote now
      piece.isKing = true;
      becameKing = true;
    }
  }

  lastMove = {
    from: { row: fromRow, col: fromCol },
    to: { row: move.row, col: move.col },
  };

  // Check for additional captures (chained captures)
  if (captured) {
    const additionalMoves = getValidMoves(move.row, move.col, true);
    const additionalCaptures = additionalMoves.filter((m) => m.isCapture);

    if (additionalCaptures.length > 0) {
      // Continue capturing - don't end turn yet
      validMoves = additionalCaptures;
      selectedPiece = { row: move.row, col: move.col };
      captureChain = true;
      renderBoard();

      // If bot has chained capture, continue after delay
      if (gameMode === "pvb" && currentPlayer === botColor) {
        setTimeout(() => {
          // Select best follow-up capture
          const bestMove = selectBestCapture(
            additionalCaptures.map((m) => ({
              from: { row: move.row, col: move.col },
              move: m,
            })),
          );
          executeMove(move.row, move.col, bestMove.move);
        }, 800);
      }
      return;
    }

    // No more captures - check if we should have promoted
    if (!wasKing && move.row === promotionRow && !becameKing) {
      piece.isKing = true;
      becameKing = true;
    }
  }

  // End turn
  selectedPiece = null;
  validMoves = [];
  captureChain = false;
  currentPlayer = currentPlayer === "white" ? "black" : "white";

  updateUI();
  renderBoard();

  // Check game over
  if (!checkGameOver()) {
    // If PvB mode and it's bot's turn, trigger bot move
    if (gameMode === "pvb" && currentPlayer === botColor && !isGameOver) {
      isBotThinking = true;
      document.getElementById("thinkingIndicator").classList.add("active");

      const delay =
        difficulty === "easy" ? 500 : difficulty === "medium" ? 1000 : 1500;
      setTimeout(() => makeBotMove(), delay);
    }
  }
}

// Bot AI for Filipino Dama
function makeBotMove() {
  if (isGameOver) {
    isBotThinking = false;
    document.getElementById("thinkingIndicator").classList.remove("active");
    return;
  }

  const captureCheck = checkMandatoryCapture();
  let botMoves = [];

  // Get all valid moves considering mandatory capture
  if (captureCheck.mustCapture) {
    // Must capture - only consider pieces that can capture max pieces
    for (const { from, moves } of captureCheck.captureMoves) {
      const maxCaptures = countMaxCaptures(from.row, from.col, moves);
      if (maxCaptures === captureCheck.maxCaptures) {
        moves.forEach((move) => {
          botMoves.push({ from, move });
        });
      }
    }
  } else {
    // No captures required - get all moves
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === botColor) {
          const moves = getValidMoves(row, col);
          moves.forEach((move) => {
            botMoves.push({ from: { row, col }, move });
          });
        }
      }
    }
  }

  if (botMoves.length === 0) {
    isBotThinking = false;
    document.getElementById("thinkingIndicator").classList.remove("active");
    return;
  }

  let selectedMove;

  if (captureCheck.mustCapture) {
    // Must capture - pick best capture
    selectedMove = selectBestCapture(botMoves);
  } else {
    // Strategic move selection
    selectedMove = selectBestMove(botMoves);
  }

  executeMove(selectedMove.from.row, selectedMove.from.col, selectedMove.move);

  isBotThinking = false;
  document.getElementById("thinkingIndicator").classList.remove("active");
}

// Select best capture for bot
function selectBestCapture(captureMoves) {
  if (difficulty === "easy") {
    return captureMoves[Math.floor(Math.random() * captureMoves.length)];
  }

  let bestMove = captureMoves[0];
  let bestScore = -Infinity;

  captureMoves.forEach((moveData) => {
    let score = 10; // Base capture score

    // Bonus for capturing kings
    const capturedPiece =
      board[moveData.move.captureRow][moveData.move.captureCol];
    if (capturedPiece && capturedPiece.isKing) {
      score += 15;
    }

    // Bonus for promotion
    const piece = board[moveData.from.row][moveData.from.col];
    const promotionRow = piece.type === "white" ? 7 : 0;
    if (!piece.isKing && moveData.move.row === promotionRow) {
      score += 20;
    }

    // Simulate follow-up captures
    const followUpScore = simulateFollowUpCaptures(moveData);
    score += followUpScore;

    // Position evaluation for medium/hard
    if (difficulty !== "easy") {
      score += evaluatePosition(moveData);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = moveData;
    }
  });

  return bestMove;
}

// Select best non-capture move
function selectBestMove(moves) {
  if (difficulty === "easy") {
    // Prefer forward moves, random otherwise
    const forwardMoves = moves.filter((m) => {
      const piece = board[m.from.row][m.from.col];
      if (piece.type === "black") {
        return m.move.row < m.from.row; // Black moves up
      } else {
        return m.move.row > m.from.row; // White moves down
      }
    });

    if (forwardMoves.length > 0 && Math.random() > 0.3) {
      return forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((moveData) => {
    let score = 0;
    const piece = board[moveData.from.row][moveData.from.col];

    // Prefer forward movement
    if (piece.type === "black") {
      score += (moveData.from.row - moveData.move.row) * 3;
    } else {
      score += (moveData.move.row - moveData.from.row) * 3;
    }

    // Prefer center control
    const centerBonus = 4 - Math.abs(moveData.move.col - 3.5);
    score += centerBonus;

    // Avoid edges (hard difficulty)
    if (difficulty === "hard") {
      if (moveData.move.col === 0 || moveData.move.col === 7) {
        score -= 2;
      }

      // Check if move creates capture opportunities
      const threatScore = evaluateThreats(moveData);
      score += threatScore;

      // King safety
      const safetyScore = evaluateSafety(moveData);
      score += safetyScore;
    }

    // Bonus for becoming king
    const promotionRow = piece.type === "white" ? 7 : 0;
    if (!piece.isKing && moveData.move.row === promotionRow) {
      score += 25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = moveData;
    }
  });

  return bestMove;
}

// Evaluate follow-up captures
function simulateFollowUpCaptures(moveData) {
  // Simplified - would need full board simulation for accuracy
  return 0;
}

// Evaluate position after move
function evaluatePosition(moveData) {
  let score = 0;

  // Control of center files (c, d, e, f in algebraic notation = cols 2,3,4,5)
  if (moveData.move.col >= 2 && moveData.move.col <= 5) {
    score += 2;
  }

  return score;
}

// Evaluate threats created by move
function evaluateThreats(moveData) {
  // Check if this move enables future captures
  let score = 0;
  const piece = board[moveData.from.row][moveData.from.col];

  // Check adjacent opponent pieces that could be captured next turn
  const directions = piece.isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : piece.type === "white"
      ? [
          [1, -1],
          [1, 1],
        ]
      : [
          [-1, -1],
          [-1, 1],
        ];

  for (const [dr, dc] of directions) {
    const r = moveData.move.row + dr;
    const c = moveData.move.col + dc;
    if (isValidSquare(r, c) && board[r][c] && board[r][c].type !== piece.type) {
      score += 3; // Potential capture next turn
    }
  }

  return score;
}

// Evaluate king safety
function evaluateSafety(moveData) {
  let score = 0;
  const piece = board[moveData.from.row][moveData.from.col];

  // Check if move avoids immediate capture by opponent
  // Simplified - check if any opponent piece can capture this square
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const opponent = board[row][col];
      if (opponent && opponent.type !== piece.type) {
        const opponentMoves = getValidMoves(row, col);
        if (
          opponentMoves.some(
            (m) =>
              m.isCapture &&
              m.row === moveData.move.row &&
              m.col === moveData.move.col,
          )
        ) {
          score -= 5; // Moving into danger
        }
      }
    }
  }

  return score;
}

// Check if game is over
function checkGameOver() {
  let whitePieces = 0;
  let blackPieces = 0;
  let whiteMoves = 0;
  let blackMoves = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (piece.type === "white") {
          whitePieces++;
          const moves = getValidMoves(row, col);
          whiteMoves += moves.length;
        } else {
          blackPieces++;
          const moves = getValidMoves(row, col);
          blackMoves += moves.length;
        }
      }
    }
  }

  if (whitePieces === 0) {
    endGame("black", "by capturing all pieces");
    return true;
  } else if (blackPieces === 0) {
    endGame("white", "by capturing all pieces");
    return true;
  } else if (currentPlayer === "white" && whiteMoves === 0) {
    endGame("black", "by blocking all moves");
    return true;
  } else if (currentPlayer === "black" && blackMoves === 0) {
    endGame("white", "by blocking all moves");
    return true;
  }

  return false;
}

// End game
function endGame(winner, reason) {
  isGameOver = true;
  document.getElementById("winnerText").textContent =
    `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!`;
  document.getElementById("winnerReason").textContent = reason;
  document.getElementById("gameOverModal").classList.add("active");
}

// Update UI
function updateUI() {
  document.getElementById("turnIndicator").textContent =
    `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
  document.getElementById("playerWhite").style.opacity =
    currentPlayer === "white" ? "1" : "0.5";
  document.getElementById("playerBlack").style.opacity =
    currentPlayer === "black" ? "1" : "0.5";
  document.getElementById("capturedWhite").textContent = capturedPieces.white;
  document.getElementById("capturedBlack").textContent = capturedPieces.black;

  if (gameMode === "pvb") {
    document.getElementById("whiteName").textContent =
      playerColor === "white" ? "You" : "Bot";
    document.getElementById("blackName").textContent =
      playerColor === "black" ? "You" : "Bot";
  } else {
    document.getElementById("whiteName").textContent = "White";
    document.getElementById("blackName").textContent = "Black";
  }
}

// Show message
function showMessage(msg) {
  const status = document.getElementById("statusText");
  const original = status.textContent;
  status.textContent = msg;
  status.style.color = "#ffd700";
  setTimeout(() => {
    status.textContent = original;
    status.style.color = "#ccc";
  }, 2000);
}

// Select game mode
function selectMode(mode) {
  gameMode = mode;

  document
    .querySelectorAll(".mode-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document
    .getElementById(mode === "pvb" ? "btnPvB" : "btnPvP")
    .classList.add("selected");

  const colorSelection = document.getElementById("colorSelection");
  const diffSelection = document.getElementById("difficultySelection");

  if (mode === "pvb") {
    colorSelection.classList.add("active");
    diffSelection.classList.add("active");
    // Reset color selection
    playerColor = null;
    document
      .querySelectorAll(".color-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    document.getElementById("startBtn").classList.remove("active");
  } else {
    colorSelection.classList.remove("active");
    diffSelection.classList.remove("active");
    // In PvP, no color selection needed
    playerColor = null;
    document.getElementById("startBtn").classList.add("active");
  }
}

// Select color
function selectColor(color) {
  playerColor = color;

  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document
    .getElementById(color === "white" ? "btnWhite" : "btnBlack")
    .classList.add("selected");

  // Enable start button if color is selected
  if (playerColor) {
    document.getElementById("startBtn").classList.add("active");
  }
}

// Select difficulty
function selectDifficulty(level) {
  difficulty = level;
  document
    .querySelectorAll(".diff-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  event.target.classList.add("selected");
}

// Start game
function startGame() {
  if (!gameMode) return;
  if (gameMode === "pvb" && !playerColor) return;

  document.getElementById("landingPage").classList.add("hidden");
  setTimeout(() => {
    document.getElementById("gameContainer").classList.add("active");
    initGame();
  }, 300);
}

// Initialize game
function initGame() {
  initBoard();

  // In PvB mode, use selected player color
  if (gameMode === "pvb") {
    botColor = playerColor === "white" ? "black" : "white";

    // Flip board if player is black (so their pieces are at bottom)
    // When player is white: white pieces at bottom (rows 5-7), no flip needed
    // When player is black: black pieces should appear at bottom, so we flip
    boardFlipped = playerColor === "black";
  } else {
    // In PvP mode, no flipping, white at bottom (standard)
    playerColor = "white";
    boardFlipped = false;
  }

  currentPlayer = "white"; // White always starts
  selectedPiece = null;
  validMoves = [];
  capturedPieces = { white: 0, black: 0 };
  isGameOver = false;
  lastMove = null;
  captureChain = false;
  isBotThinking = false;

  updateUI();
  renderBoard();

  // If PvB and player is black, bot (white) moves first
  if (gameMode === "pvb" && playerColor === "black") {
    isBotThinking = true;
    document.getElementById("thinkingIndicator").classList.add("active");
    setTimeout(() => makeBotMove(), 1000);
  }
}

// Reset game
function resetGame() {
  // Close any open modals
  document.getElementById("gameOverModal").classList.remove("active");
  document.getElementById("menuModal").classList.remove("active");
  initGame();
}

// Show menu modal
function showMenuModal() {
  document.getElementById("menuModal").classList.add("active");
}

// Resume game from menu
function resumeGame() {
  document.getElementById("menuModal").classList.remove("active");
}

// Back to menu (landing page)
function backToMenu() {
  // Close all modals
  document.getElementById("gameOverModal").classList.remove("active");
  document.getElementById("menuModal").classList.remove("active");
  document.getElementById("rulesModal").classList.remove("active");

  // Hide game container
  document.getElementById("gameContainer").classList.remove("active");

  // Show landing page
  document.getElementById("landingPage").classList.remove("hidden");

  // Reset selections
  gameMode = null;
  playerColor = null;
  document
    .querySelectorAll(".mode-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document
    .querySelectorAll(".diff-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  document.getElementById("colorSelection").classList.remove("active");
  document.getElementById("difficultySelection").classList.remove("active");
  document.getElementById("startBtn").classList.remove("active");
}

// Show rules
function showRules() {
  document.getElementById("rulesModal").classList.add("active");
}

// Close rules
function closeRules() {
  document.getElementById("rulesModal").classList.remove("active");
}

// Close modal on outside click
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal && modal.id === "rulesModal") {
      closeRules();
    }
    if (e.target === modal && modal.id === "menuModal") {
      resumeGame();
    }
  });
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // If menu modal is open, close it
    if (document.getElementById("menuModal").classList.contains("active")) {
      resumeGame();
      return;
    }
    // If rules modal is open, close it
    if (document.getElementById("rulesModal").classList.contains("active")) {
      closeRules();
      return;
    }
    // If game over modal is open, go to menu
    if (document.getElementById("gameOverModal").classList.contains("active")) {
      backToMenu();
      return;
    }
    // If in game, show menu
    if (document.getElementById("gameContainer").classList.contains("active")) {
      showMenuModal();
    }
  }
  if (e.key === "r" || e.key === "R") {
    if (document.getElementById("gameContainer").classList.contains("active")) {
      resetGame();
    }
  }
  if (e.key === "m" || e.key === "M") {
    if (document.getElementById("gameContainer").classList.contains("active")) {
      showMenuModal();
    }
  }
});

// Handle resize
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (document.getElementById("gameContainer").classList.contains("active")) {
      renderBoard();
    }
  }, 100);
});

// Prevent zoom on double tap for mobile
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  false,
);

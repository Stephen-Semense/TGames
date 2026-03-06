// Game State
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let validMoves = [];
let capturedPieces = { white: 0, black: 0 };
let isGameOver = false;
let lastMove = null;
let mustCapture = false;
let captureChain = false;

// Game Mode
let gameMode = null;
let playerColor = null;
let difficulty = 'medium';
let botColor = 'black';
let isBotThinking = false;
let boardFlipped = false;

// Initialize board - Filipino Dama setup (12 pieces, dark squares only)
function initBoard() {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { type: 'white', isKing: false };
            }
        }
    }
    
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { type: 'black', isKing: false };
            }
        }
    }
}

function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8 && (row + col) % 2 === 1;
}

function visualToBoard(visualRow, visualCol) {
    if (boardFlipped) {
        return { row: 7 - visualRow, col: 7 - visualCol };
    }
    return { row: visualRow, col: visualCol };
}

function boardToVisual(boardRow, boardCol) {
    if (boardFlipped) {
        return { row: 7 - boardRow, col: 7 - boardCol };
    }
    return { row: boardRow, col: boardCol };
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    
    if (boardFlipped) {
        boardEl.classList.add('flipped');
    } else {
        boardEl.classList.remove('flipped');
    }
    
    for (let visualRow = 0; visualRow < 8; visualRow++) {
        for (let visualCol = 0; visualCol < 8; visualCol++) {
            const { row, col } = visualToBoard(visualRow, visualCol);
            
            const square = document.createElement('div');
            const isDark = (visualRow + visualCol) % 2 === 1;
            square.className = `square ${isDark ? 'dark' : 'light'}`;
            square.dataset.visualRow = visualRow;
            square.dataset.visualCol = visualCol;
            square.dataset.row = row;
            square.dataset.col = col;
            
            if (!isDark) {
                boardEl.appendChild(square);
                continue;
            }
            
            if (lastMove) {
                const fromVisual = boardToVisual(lastMove.from.row, lastMove.from.col);
                const toVisual = boardToVisual(lastMove.to.row, lastMove.to.col);
                if ((fromVisual.row === visualRow && fromVisual.col === visualCol) ||
                    (toVisual.row === visualRow && toVisual.col === visualCol)) {
                    square.classList.add('last-move');
                }
            }
            
            if (selectedPiece) {
                const selectedVisual = boardToVisual(selectedPiece.row, selectedPiece.col);
                if (selectedVisual.row === visualRow && selectedVisual.col === visualCol) {
                    square.classList.add('selected');
                }
            }
            
            for (const move of validMoves) {
                const moveVisual = boardToVisual(move.row, move.col);
                if (moveVisual.row === visualRow && moveVisual.col === visualCol) {
                    square.classList.add('valid-move');
                    break;
                }
            }
            
            const piece = board[row][col];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.type} ${piece.isKing ? 'king' : ''}`;
                
                if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                    pieceEl.style.transform = boardFlipped ? 'scale(1.1) rotate(180deg)' : 'scale(1.1)';
                }
                
                square.appendChild(pieceEl);
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            boardEl.appendChild(square);
        }
    }
}

function getValidMoves(row, col, isCaptureChain = false) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    const captures = [];
    
    const directions = piece.isKing ? 
        [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
        (piece.type === 'white' ? 
            [[1, -1], [1, 1]] :
            [[-1, -1], [-1, 1]]);
    
    for (const [dr, dc] of directions) {
        if (piece.isKing) {
            let r = row + dr;
            let c = col + dc;
            
            while (isValidSquare(r, c)) {
                if (board[r][c]) {
                    if (board[r][c].type !== piece.type) {
                        let landR = r + dr;
                        let landC = c + dc;
                        
                        while (isValidSquare(landR, landC) && !board[landR][landC]) {
                            captures.push({
                                row: landR,
                                col: landC,
                                captureRow: r,
                                captureCol: c,
                                isCapture: true
                            });
                            landR += dr;
                            landC += dc;
                        }
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
            
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
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (isValidSquare(newRow, newCol)) {
                if (!board[newRow][newCol] && !isCaptureChain) {
                    moves.push({ row: newRow, col: newCol, isCapture: false });
                } else if (board[newRow][newCol] && board[newRow][newCol].type !== piece.type) {
                    const jumpRow = newRow + dr;
                    const jumpCol = newCol + dc;
                    if (isValidSquare(jumpRow, jumpCol) && !board[jumpRow][jumpCol]) {
                        captures.push({
                            row: jumpRow,
                            col: jumpCol,
                            captureRow: newRow,
                            captureCol: newCol,
                            isCapture: true
                        });
                    }
                }
            }
        }
    }
    
    return captures.length > 0 ? captures : moves;
}

function checkMandatoryCapture() {
    let maxCaptures = 0;
    let captureMoves = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === currentPlayer) {
                const moves = getValidMoves(row, col);
                const pieceCaptures = moves.filter(m => m.isCapture);
                
                if (pieceCaptures.length > 0) {
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

function countMaxCaptures(row, col, immediateCaptures) {
    let max = 0;
    
    for (const capture of immediateCaptures) {
        let count = 1;
        const nextCaptures = simulateCaptureAndCheck(row, col, capture);
        count += nextCaptures;
        
        if (count > max) max = count;
    }
    
    return max;
}

function simulateCaptureAndCheck(fromRow, fromCol, capture, piece) {
    return 0;
}

function handleSquareClick(row, col) {
    if (isGameOver || isBotThinking) return;
    
    if (gameMode === 'pvb' && currentPlayer === botColor) return;
    
    const piece = board[row][col];
    
    if (piece && piece.type === currentPlayer && !captureChain) {
        const captureCheck = checkMandatoryCapture();
        const moves = getValidMoves(row, col);
        
        if (captureCheck.mustCapture) {
            const captureMoves = moves.filter(m => m.isCapture);
            if (captureMoves.length === 0) {
                showMessage('You must capture the maximum pieces!');
                return;
            }
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
    
    if (selectedPiece) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        if (move) {
            executeMove(selectedPiece.row, selectedPiece.col, move);
        } else if (piece && piece.type === currentPlayer) {
            handleSquareClick(row, col);
        } else {
            selectedPiece = null;
            validMoves = [];
            renderBoard();
        }
    }
}

function executeMove(fromRow, fromCol, move) {
    const piece = board[fromRow][fromCol];
    const wasKing = piece.isKing;
    
    board[move.row][move.col] = piece;
    board[fromRow][fromCol] = null;
    
    let captured = false;
    let becameKing = false;
    
    if (move.isCapture) {
        board[move.captureRow][move.captureCol] = null;
        capturedPieces[currentPlayer === 'white' ? 'black' : 'white']++;
        captured = true;
        
        const visualCapture = boardToVisual(move.captureRow, move.captureCol);
        const square = document.querySelector(`[data-visual-row="${visualCapture.row}"][data-visual-col="${visualCapture.col}"]`);
        if (square) {
            const pieceEl = square.querySelector('.piece');
            if (pieceEl) pieceEl.classList.add('fade-out');
        }
    }
    
    const promotionRow = piece.type === 'white' ? 7 : 0;
    
    if (!wasKing && move.row === promotionRow) {
        const additionalMoves = getValidMoves(move.row, move.col, true);
        const additionalCaptures = additionalMoves.filter(m => m.isCapture);
        
        if (additionalCaptures.length === 0 || !captured) {
            piece.isKing = true;
            becameKing = true;
        }
    }
    
    lastMove = { from: { row: fromRow, col: fromCol }, to: { row: move.row, col: move.col } };
    
    if (captured) {
        const additionalMoves = getValidMoves(move.row, move.col, true);
        const additionalCaptures = additionalMoves.filter(m => m.isCapture);
        
        if (additionalCaptures.length > 0) {
            validMoves = additionalCaptures;
            selectedPiece = { row: move.row, col: move.col };
            captureChain = true;
            renderBoard();
            
            if (gameMode === 'pvb' && currentPlayer === botColor) {
                setTimeout(() => {
                    const bestMove = selectBestCapture(additionalCaptures.map(m => ({ 
                        from: { row: move.row, col: move.col }, 
                        move: m 
                    })));
                    executeMove(move.row, move.col, bestMove.move);
                }, 800);
            }
            return;
        }
        
        if (!wasKing && move.row === promotionRow && !becameKing) {
            piece.isKing = true;
            becameKing = true;
        }
    }
    
    selectedPiece = null;
    validMoves = [];
    captureChain = false;
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    updateUI();
    renderBoard();
    
    if (!checkGameOver()) {
        if (gameMode === 'pvb' && currentPlayer === botColor && !isGameOver) {
            isBotThinking = true;
            document.getElementById('thinkingIndicator').classList.add('active');
            
            const delay = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 1000 : 1500;
            setTimeout(() => makeBotMove(), delay);
        }
    }
}

function makeBotMove() {
    if (isGameOver) {
        isBotThinking = false;
        document.getElementById('thinkingIndicator').classList.remove('active');
        return;
    }
    
    const captureCheck = checkMandatoryCapture();
    let botMoves = [];
    
    if (captureCheck.mustCapture) {
        for (const { from, moves } of captureCheck.captureMoves) {
            const maxCaptures = countMaxCaptures(from.row, from.col, moves);
            if (maxCaptures === captureCheck.maxCaptures) {
                moves.forEach(move => {
                    botMoves.push({ from, move });
                });
            }
        }
    } else {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === botColor) {
                    const moves = getValidMoves(row, col);
                    moves.forEach(move => {
                        botMoves.push({ from: { row, col }, move });
                    });
                }
            }
        }
    }
    
    if (botMoves.length === 0) {
        isBotThinking = false;
        document.getElementById('thinkingIndicator').classList.remove('active');
        return;
    }
    
    let selectedMove;
    
    if (captureCheck.mustCapture) {
        selectedMove = selectBestCapture(botMoves);
    } else {
        selectedMove = selectBestMove(botMoves);
    }
    
    executeMove(selectedMove.from.row, selectedMove.from.col, selectedMove.move);
    
    isBotThinking = false;
    document.getElementById('thinkingIndicator').classList.remove('active');
}

function selectBestCapture(captureMoves) {
    if (difficulty === 'easy') {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    
    let bestMove = captureMoves[0];
    let bestScore = -Infinity;
    
    captureMoves.forEach(moveData => {
        let score = 10;
        
        const capturedPiece = board[moveData.move.captureRow][moveData.move.captureCol];
        if (capturedPiece && capturedPiece.isKing) {
            score += 15;
        }
        
        const piece = board[moveData.from.row][moveData.from.col];
        const promotionRow = piece.type === 'white' ? 7 : 0;
        if (!piece.isKing && moveData.move.row === promotionRow) {
            score += 20;
        }
        
        const followUpScore = simulateFollowUpCaptures(moveData);
        score += followUpScore;
        
        if (difficulty !== 'easy') {
            score += evaluatePosition(moveData);
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = moveData;
        }
    });
    
    return bestMove;
}

function selectBestMove(moves) {
    if (difficulty === 'easy') {
        const forwardMoves = moves.filter(m => {
            const piece = board[m.from.row][m.from.col];
            if (piece.type === 'black') {
                return m.move.row < m.from.row;
            } else {
                return m.move.row > m.from.row;
            }
        });
        
        if (forwardMoves.length > 0 && Math.random() > 0.3) {
            return forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }
    
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    moves.forEach(moveData => {
        let score = 0;
        const piece = board[moveData.from.row][moveData.from.col];
        
        if (piece.type === 'black') {
            score += (moveData.from.row - moveData.move.row) * 3;
        } else {
            score += (moveData.move.row - moveData.from.row) * 3;
        }
        
        const centerBonus = 4 - Math.abs(moveData.move.col - 3.5);
        score += centerBonus;
        
        if (difficulty === 'hard') {
            if (moveData.move.col === 0 || moveData.move.col === 7) {
                score -= 2;
            }
            
            const threatScore = evaluateThreats(moveData);
            score += threatScore;
            
            const safetyScore = evaluateSafety(moveData);
            score += safetyScore;
        }
        
        const promotionRow = piece.type === 'white' ? 7 : 0;
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

function simulateFollowUpCaptures(moveData) {
    return 0;
}

function evaluatePosition(moveData) {
    let score = 0;
    
    if (moveData.move.col >= 2 && moveData.move.col <= 5) {
        score += 2;
    }
    
    return score;
}

function evaluateThreats(moveData) {
    let score = 0;
    const piece = board[moveData.from.row][moveData.from.col];
    
    const directions = piece.isKing ? 
        [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
        (piece.type === 'white' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);
    
    for (const [dr, dc] of directions) {
        const r = moveData.move.row + dr;
        const c = moveData.move.col + dc;
        if (isValidSquare(r, c) && board[r][c] && board[r][c].type !== piece.type) {
            score += 3;
        }
    }
    
    return score;
}

function evaluateSafety(moveData) {
    let score = 0;
    const piece = board[moveData.from.row][moveData.from.col];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const opponent = board[row][col];
            if (opponent && opponent.type !== piece.type) {
                const opponentMoves = getValidMoves(row, col);
                if (opponentMoves.some(m => m.isCapture && m.row === moveData.move.row && m.col === moveData.move.col)) {
                    score -= 5;
                }
            }
        }
    }
    
    return score;
}

function checkGameOver() {
    let whitePieces = 0;
    let blackPieces = 0;
    let whiteMoves = 0;
    let blackMoves = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                if (piece.type === 'white') {
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
        endGame('black', 'by capturing all pieces');
        return true;
    } else if (blackPieces === 0) {
        endGame('white', 'by capturing all pieces');
        return true;
    } else if (currentPlayer === 'white' && whiteMoves === 0) {
        endGame('black', 'by blocking all moves');
        return true;
    } else if (currentPlayer === 'black' && blackMoves === 0) {
        endGame('white', 'by blocking all moves');
        return true;
    }
    
    return false;
}

function endGame(winner, reason) {
    isGameOver = true;
    document.getElementById('winnerText').textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!`;
    document.getElementById('winnerReason').textContent = reason;
    document.getElementById('gameOverModal').classList.add('active');
}

function updateUI() {
    document.getElementById('turnIndicator').textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
    document.getElementById('playerWhite').style.opacity = currentPlayer === 'white' ? '1' : '0.5';
    document.getElementById('playerBlack').style.opacity = currentPlayer === 'black' ? '1' : '0.5';
    document.getElementById('capturedWhite').textContent = capturedPieces.white;
    document.getElementById('capturedBlack').textContent = capturedPieces.black;
    
    if (gameMode === 'pvb') {
        document.getElementById('whiteName').textContent = playerColor === 'white' ? 'You' : 'Bot';
        document.getElementById('blackName').textContent = playerColor === 'black' ? 'You' : 'Bot';
    } else {
        document.getElementById('whiteName').textContent = 'White';
        document.getElementById('blackName').textContent = 'Black';
    }
}

function showMessage(msg) {
    const status = document.getElementById('statusText');
    const original = status.textContent;
    status.textContent = msg;
    status.style.color = '#ffd700';
    setTimeout(() => {
        status.textContent = original;
        status.style.color = '#ccc';
    }, 2000);
}

function selectMode(mode) {
    gameMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(mode === 'pvb' ? 'btnPvB' : 'btnPvP').classList.add('selected');
    
    const colorSelection = document.getElementById('colorSelection');
    const diffSelection = document.getElementById('difficultySelection');
    
    if (mode === 'pvb') {
        colorSelection.classList.add('active');
        diffSelection.classList.add('active');
        playerColor = null;
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('startBtn').classList.remove('active');
    } else {
        colorSelection.classList.remove('active');
        diffSelection.classList.remove('active');
        playerColor = null;
        document.getElementById('startBtn').classList.add('active');
    }
}

function selectColor(color) {
    playerColor = color;
    
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(color === 'white' ? 'btnWhite' : 'btnBlack').classList.add('selected');
    
    if (playerColor) {
        document.getElementById('startBtn').classList.add('active');
    }
}

function selectDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

function startGame() {
    if (!gameMode) return;
    if (gameMode === 'pvb' && !playerColor) return;
    
    document.getElementById('landingPage').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('gameContainer').classList.add('active');
        initGame();
    }, 300);
}

function initGame() {
    initBoard();
    
    if (gameMode === 'pvb') {
        botColor = playerColor === 'white' ? 'black' : 'white';
        boardFlipped = (playerColor === 'black');
    } else {
        playerColor = 'white';
        boardFlipped = false;
    }
    
    currentPlayer = 'white';
    selectedPiece = null;
    validMoves = [];
    capturedPieces = { white: 0, black: 0 };
    isGameOver = false;
    lastMove = null;
    captureChain = false;
    isBotThinking = false;
    
    updateUI();
    renderBoard();
    
    if (gameMode === 'pvb' && playerColor === 'black') {
        isBotThinking = true;
        document.getElementById('thinkingIndicator').classList.add('active');
        setTimeout(() => makeBotMove(), 1000);
    }
}

function resetGame() {
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('menuModal').classList.remove('active');
    initGame();
}

function showMenuModal() {
    document.getElementById('menuModal').classList.add('active');
}

function resumeGame() {
    document.getElementById('menuModal').classList.remove('active');
}

function backToMenu() {
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('menuModal').classList.remove('active');
    document.getElementById('rulesModal').classList.remove('active');
    
    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('landingPage').classList.remove('hidden');
    
    gameMode = null;
    playerColor = null;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('colorSelection').classList.remove('active');
    document.getElementById('difficultySelection').classList.remove('active');
    document.getElementById('startBtn').classList.remove('active');
}

function showRules() {
    document.getElementById('rulesModal').classList.add('active');
}

function closeRules() {
    document.getElementById('rulesModal').classList.remove('active');
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal && modal.id === 'rulesModal') {
            closeRules();
        }
        if (e.target === modal && modal.id === 'menuModal') {
            resumeGame();
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('menuModal').classList.contains('active')) {
            resumeGame();
            return;
        }
        if (document.getElementById('rulesModal').classList.contains('active')) {
            closeRules();
            return;
        }
        if (document.getElementById('gameOverModal').classList.contains('active')) {
            backToMenu();
            return;
        }
        if (document.getElementById('gameContainer').classList.contains('active')) {
            showMenuModal();
        }
    }
    if (e.key === 'r' || e.key === 'R') {
        if (document.getElementById('gameContainer').classList.contains('active')) {
            resetGame();
        }
    }
    if (e.key === 'm' || e.key === 'M') {
        if (document.getElementById('gameContainer').classList.contains('active')) {
            showMenuModal();
        }
    }
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (document.getElementById('gameContainer').classList.contains('active')) {
            renderBoard();
        }
    }, 100);
});

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

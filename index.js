// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('gameBoard');
    const nextPieceSvg = document.getElementById('nextPiece');
    const gameOverDiv = document.getElementById('gameOver');

    let ROWS = 20;
    let COLS = 10;
    let BLOCK_SIZE = 25;
    let speed = 500;
    let board = [];
    let score = 0;
    let level = 1;
    let lines = 0;
    let currentPiece = null;
    let nextPiece = null;
    let gameLoop = null;
    let isPaused = false;
    let isGameOver = false;

    // SVG namespace
    const svgNS = "http://www.w3.org/2000/svg";

    const SHAPES = [
        [[1,1,1,1]], // I
        [[1,1],[1,1]], // O
        [[0,1,0],[1,1,1]], // T
        [[1,0,0],[1,1,1]], // L
        [[0,0,1],[1,1,1]], // J
        [[0,1,1],[1,1,0]], // S
        [[1,1,0],[0,1,1]]  // Z
    ];

    const COLORS = [
        '#00f0f0', '#f0f000', '#a000f0', '#f0a000',
        '#0000f0', '#00f000', '#f00000'
    ];

    class Piece {
        constructor(shape, color) {
            this.shape = shape;
            this.color = color;
            this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
            this.y = 0;
            this.svgGroup = null;
        }

        createSVG() {
            // Remove old SVG if exists
            if (this.svgGroup) {
                this.svgGroup.remove();
            }

            // Create new group for this piece
            this.svgGroup = document.createElementNS(svgNS, 'g');
            this.svgGroup.classList.add('tetris-block');

            for (let row = 0; row < this.shape.length; row++) {
                for (let col = 0; col < this.shape[row].length; col++) {
                    if (this.shape[row][col]) {
                        const rect = document.createElementNS(svgNS, 'rect');
                        rect.setAttribute('width', BLOCK_SIZE - 1);
                        rect.setAttribute('height', BLOCK_SIZE - 1);
                        rect.setAttribute('fill', this.color);
                        rect.setAttribute('data-row', row);
                        rect.setAttribute('data-col', col);
                        this.svgGroup.appendChild(rect);
                    }
                }
            }

            gameBoard.appendChild(this.svgGroup);
            this.updatePosition();
        }

        updatePosition() {
            if (!this.svgGroup) return;

            const rects = this.svgGroup.querySelectorAll('rect');
            rects.forEach(rect => {
                const row = parseInt(rect.getAttribute('data-row'));
                const col = parseInt(rect.getAttribute('data-col'));
                rect.setAttribute('x', (this.x + col) * BLOCK_SIZE);
                rect.setAttribute('y', (this.y + row) * BLOCK_SIZE);
            });
        }

        rotate() {
            const newShape = this.shape[0].map((_, i) => 
                this.shape.map(row => row[i]).reverse()
            );
            if (!this.collides(newShape)) {
                this.shape = newShape;
                this.createSVG();
            }
        }

        move(dx, dy) {
            this.x += dx;
            this.y += dy;
            if (this.collides()) {
                this.x -= dx;
                this.y -= dy;
                return false;
            }
            this.updatePosition();
            return true;
        }

        collides(shape = this.shape) {
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const newX = this.x + col;
                        const newY = this.y + row;
                        if (newX < 0 || newX >= COLS || newY >= ROWS || 
                            (newY >= 0 && board[newY][newX])) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        remove() {
            if (this.svgGroup) {
                this.svgGroup.remove();
                this.svgGroup = null;
            }
        }
    }

    function initBoard() {
        ROWS = parseInt(document.getElementById('rows').value);
        COLS = parseInt(document.getElementById('cols').value);
        speed = parseInt(document.getElementById('speed').value);
        
        gameBoard.setAttribute('width', COLS * BLOCK_SIZE);
        gameBoard.setAttribute('height', ROWS * BLOCK_SIZE);
        
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        
        // Clear the SVG
        gameBoard.innerHTML = '';
    }

    function createPiece() {
        const idx = Math.floor(Math.random() * SHAPES.length);
        return new Piece(SHAPES[idx], COLORS[idx]);
    }

    function drawBoard() {
        // Remove all locked blocks
        const lockedBlocks = gameBoard.querySelectorAll('.locked-block');
        lockedBlocks.forEach(block => block.remove());

        // Draw locked blocks
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col]) {
                    const rect = document.createElementNS(svgNS, 'rect');
                    rect.setAttribute('x', col * BLOCK_SIZE);
                    rect.setAttribute('y', row * BLOCK_SIZE);
                    rect.setAttribute('width', BLOCK_SIZE - 1);
                    rect.setAttribute('height', BLOCK_SIZE - 1);
                    rect.setAttribute('fill', board[row][col]);
                    rect.classList.add('locked-block');
                    gameBoard.appendChild(rect);
                }
            }
        }
    }

    function drawNextPiece() {
        nextPieceSvg.innerHTML = '';
        
        if (nextPiece) {
            const offsetX = (4 - nextPiece.shape[0].length) / 2;
            const offsetY = (4 - nextPiece.shape.length) / 2;
            
            for (let row = 0; row < nextPiece.shape.length; row++) {
                for (let col = 0; col < nextPiece.shape[row].length; col++) {
                    if (nextPiece.shape[row][col]) {
                        const rect = document.createElementNS(svgNS, 'rect');
                        rect.setAttribute('x', (col + offsetX) * BLOCK_SIZE);
                        rect.setAttribute('y', (row + offsetY) * BLOCK_SIZE);
                        rect.setAttribute('width', BLOCK_SIZE - 1);
                        rect.setAttribute('height', BLOCK_SIZE - 1);
                        rect.setAttribute('fill', nextPiece.color);
                        nextPieceSvg.appendChild(rect);
                    }
                }
            }
        }
    }

    function lockPiece() {
        // Check if piece spawned in collision (game over condition)
        if (currentPiece.collides()) {
            gameOver();
            return;
        }

        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    const boardY = currentPiece.y + row;
                    const boardX = currentPiece.x + col;
                    
                    // Double check bounds
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        board[boardY][boardX] = currentPiece.color;
                    }
                }
            }
        }
        
        currentPiece.remove();
        
        // Clear lines immediately and update board
        clearLinesImmediate();
        
        // Spawn next piece
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
        
        // Check if new piece can spawn
        if (currentPiece.collides()) {
            gameOver();
            return;
        }
        
        currentPiece.createSVG();
    }

    function clearLinesImmediate() {
        let linesCleared = 0;
        
        // Find and remove complete lines
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row].every(cell => cell !== 0)) {
                board.splice(row, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                row++; // Check the same row again since rows shifted down
            }
        }
        
        // Update score and stats
        if (linesCleared > 0) {
            lines += linesCleared;
            score += [0, 100, 300, 500, 800][linesCleared] * level;
            level = Math.floor(lines / 10) + 1;
            updateStats();
        }
        
        // Redraw the board immediately
        drawBoard();
    }

    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }

    function gameOver() {
        isGameOver = true;
        clearInterval(gameLoop);
        
        if (currentPiece) {
            currentPiece.remove();
        }
        
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalLines').textContent = lines;
        
        gameOverDiv.style.display = 'block';
    }

    function update() {
        if (isPaused || isGameOver) return;
        
        if (!currentPiece.move(0, 1)) {
            lockPiece();
        }
    }

    function startGame() {
        gameOverDiv.style.display = 'none';
        isGameOver = false;
        initBoard();
        score = 0;
        level = 1;
        lines = 0;
        isPaused = false;
        updateStats();
        
        currentPiece = createPiece();
        currentPiece.createSVG();
        nextPiece = createPiece();
        drawNextPiece();
        drawBoard();
        
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    }

    function togglePause() {
        isPaused = !isPaused;
    }

    // Event listeners
    document.getElementById('newGameBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('playAgainBtn').addEventListener('click', startGame);

    document.addEventListener('keydown', (e) => {
        if (!currentPiece || isPaused || isGameOver) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                currentPiece.move(-1, 0);
                e.preventDefault();
                break;
            case 'ArrowRight':
                currentPiece.move(1, 0);
                e.preventDefault();
                break;
            case 'ArrowDown':
                if (!currentPiece.move(0, 1)) {
                    lockPiece();
                }
                e.preventDefault();
                break;
            case 'ArrowUp':
                currentPiece.rotate();
                e.preventDefault();
                break;
            case ' ':
                while (currentPiece.move(0, 1)) {}
                lockPiece();
                e.preventDefault();
                break;
        }
    });

    // Start the game when page loads
    startGame();
});
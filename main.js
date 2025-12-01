// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');

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
        }

        draw(context = ctx, offsetX = 0, offsetY = 0) {
            context.fillStyle = this.color;
            for (let row = 0; row < this.shape.length; row++) {
                for (let col = 0; col < this.shape[row].length; col++) {
                    if (this.shape[row][col]) {
                        context.fillRect(
                            (this.x + col + offsetX) * BLOCK_SIZE,
                            (this.y + row + offsetY) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }

        rotate() {
            const newShape = this.shape[0].map((_, i) => 
                this.shape.map(row => row[i]).reverse()
            );
            if (!this.collides(newShape)) {
                this.shape = newShape;
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
    }

    function initBoard() {
        ROWS = parseInt(document.getElementById('rows').value);
        COLS = parseInt(document.getElementById('cols').value);
        speed = parseInt(document.getElementById('speed').value);
        
        canvas.width = COLS * BLOCK_SIZE;
        canvas.height = ROWS * BLOCK_SIZE;
        
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    }

    function createPiece() {
        const idx = Math.floor(Math.random() * SHAPES.length);
        return new Piece(SHAPES[idx], COLORS[idx]);
    }

    function drawBoard() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col]) {
                    ctx.fillStyle = board[row][col];
                    ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, 
                               BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
    }

    function drawNextPiece() {
        nextCtx.fillStyle = '#000';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        if (nextPiece) {
            const offsetX = (4 - nextPiece.shape[0].length) / 2;
            const offsetY = (4 - nextPiece.shape.length) / 2;
            nextCtx.fillStyle = nextPiece.color;
            
            for (let row = 0; row < nextPiece.shape.length; row++) {
                for (let col = 0; col < nextPiece.shape[row].length; col++) {
                    if (nextPiece.shape[row][col]) {
                        nextCtx.fillRect(
                            (col + offsetX) * BLOCK_SIZE,
                            (row + offsetY) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }
    }

    function lockPiece() {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    if (currentPiece.y + row < 0) {
                        gameOver();
                        return;
                    }
                    board[currentPiece.y + row][currentPiece.x + col] = currentPiece.color;
                }
            }
        }
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();
    }

    function clearLines() {
        let linesCleared = 0;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row].every(cell => cell !== 0)) {
                board.splice(row, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                row++;
            }
        }
        if (linesCleared > 0) {
            lines += linesCleared;
            score += [0, 100, 300, 500, 800][linesCleared] * level;
            level = Math.floor(lines / 10) + 1;
            updateStats();
        }
    }

    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }

    function gameOver() {
        clearInterval(gameLoop);
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalLines').textContent = lines;
        document.getElementById('gameOver').style.display = 'block';
    }

    function update() {
        if (isPaused) return;
        
        if (!currentPiece.move(0, 1)) {
            lockPiece();
        }
        draw();
    }

    function draw() {
        drawBoard();
        if (currentPiece) currentPiece.draw();
    }

    function startGame() {
        document.getElementById('gameOver').style.display = 'none';
        initBoard();
        score = 0;
        level = 1;
        lines = 0;
        isPaused = false;
        updateStats();
        
        currentPiece = createPiece();
        nextPiece = createPiece();
        drawNextPiece();
        
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
        draw();
    }

    function togglePause() {
        isPaused = !isPaused;
    }

    // Event listeners
    document.getElementById('newGameBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('playAgainBtn').addEventListener('click', startGame);

    document.addEventListener('keydown', (e) => {
        if (!currentPiece || isPaused) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                currentPiece.move(-1, 0);
                draw();
                e.preventDefault();
                break;
            case 'ArrowRight':
                currentPiece.move(1, 0);
                draw();
                e.preventDefault();
                break;
            case 'ArrowDown':
                if (!currentPiece.move(0, 1)) {
                    lockPiece();
                }
                draw();
                e.preventDefault();
                break;
            case 'ArrowUp':
                currentPiece.rotate();
                draw();
                e.preventDefault();
                break;
            case ' ':
                while (currentPiece.move(0, 1)) {}
                lockPiece();
                draw();
                e.preventDefault();
                break;
        }
    });

    // Start the game when page loads
    startGame();
});
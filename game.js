document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const sectionTitleEl = document.getElementById('section-title');
    const roundProgressEl = document.getElementById('round-progress');
    const objectiveEl = document.getElementById('objective');
    const scoreEl = document.getElementById('score');
    const hintBtn = document.getElementById('hint-btn');
    const submitBtn = document.getElementById('submit-btn');
    const feedbackMessageEl = document.getElementById('feedback-message');

    // Game State
    const gameState = {
        currentSection: 0,
        currentRound: 0,
        score: 0,
        guesses: [],
        actuals: [],
        hintTaken: false,
        objectives: [],
        currentDataset: [],
        scatterPlotYJitter: [],
        dragging: { isDragging: false, guessIndex: -1 },
        mouse: { x: 0, y: 0 },
        submitted: false,
    };

    // Game Sections
    const sections = [
        { title: 'Section 1: Mean vs Median', objectives: ['Mean', 'Median'] },
        { title: 'Section 2: Percentiles', objectives: ['P90', 'P95', 'P99'] },
        { title: 'Section 3: All-in-one', objectives: ['Mean', 'Median', 'P95'] },
    ];
    
    const objectiveColors = {
        'Mean': '#4CAF50',
        'Median': '#2196F3',
        'P90': '#FFC107',
        'P95': '#FF9800',
        'P99': '#f44336',
    };

    // --- Statistical Functions ---
    const calculateMean = (data) => data.reduce((a, b) => a + b, 0) / data.length;
    const calculateMedian = (data) => {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const calculatePercentile = (data, percentile) => {
        const sorted = [...data].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        if (Number.isInteger(index)) return sorted[index];
        const lower = Math.floor(index);
        const upper = lower + 1;
        return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
    };

    // --- Drawing Functions ---
    const padding = 50;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;

    function getScale(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min;
        return { min, max, range };
    }

    function toCanvasX(value, scale) {
        if (scale.range === 0) return padding + chartWidth / 2;
        return padding + ((value - scale.min) / scale.range) * chartWidth;
    }
    
    function fromCanvasX(x, scale) {
        return ((x - padding) / chartWidth) * scale.range + scale.min;
    }

    function drawHistogram(data, scale) {
        const binCount = 20;
        const bins = new Array(binCount).fill(0);
        const binWidth = scale.range / binCount;

        data.forEach(value => {
            let binIndex = Math.floor((value - scale.min) / binWidth);
            if (binIndex === binCount) binIndex--;
            bins[binIndex]++;
        });

        const maxCount = Math.max(...bins);
        ctx.fillStyle = '#e0e0e0';
        bins.forEach((count, i) => {
            const binX = toCanvasX(scale.min + i * binWidth, scale);
            const binCanvasWidth = toCanvasX(scale.min + (i + 1) * binWidth, scale) - binX;
            const binHeight = (count / maxCount) * chartHeight;
            ctx.fillRect(binX, canvas.height - padding - binHeight, binCanvasWidth, binHeight);
        });
    }

    function drawScatterPlot(data, scale) {
        ctx.fillStyle = '#546e7a';
        data.forEach((value, i) => {
            ctx.beginPath();
            ctx.arc(toCanvasX(value, scale), canvas.height - padding - 25 + gameState.scatterPlotYJitter[i], 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    function drawBoxPlot(data, scale) {
        const q1 = calculatePercentile(data, 25);
        const median = calculateMedian(data);
        const q3 = calculatePercentile(data, 75);
        const min = Math.min(...data);
        const max = Math.max(...data);

        const y = canvas.height - padding + 20;
        const height = 25;

        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(min, scale), y);
        ctx.lineTo(toCanvasX(q1, scale), y);
        ctx.moveTo(toCanvasX(q3, scale), y);
        ctx.lineTo(toCanvasX(max, scale), y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
        ctx.fillRect(toCanvasX(q1, scale), y - height / 2, toCanvasX(q3, scale) - toCanvasX(q1, scale), height);
        ctx.strokeRect(toCanvasX(q1, scale), y - height / 2, toCanvasX(q3, scale) - toCanvasX(q1, scale), height);
        
        ctx.beginPath();
        ctx.moveTo(toCanvasX(median, scale), y - height / 2);
        ctx.lineTo(toCanvasX(median, scale), y + height / 2);
        ctx.stroke();
        
        ctx.fillStyle = '#e67e22';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Box Plot Hint', canvas.width / 2, y + height);
    }

    function drawVerticalLine(value, color, label, scale, isDashed = false, yOffset = 0) {
        const x = toCanvasX(value, scale);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (isDashed) ctx.setLineDash([5, 5]);
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvas.height - padding);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, padding - 10 - yOffset);
    }
    
    function drawCursorLabel() {
        if (!gameState.submitted && gameState.guesses.length < gameState.objectives.length) {
            const objective = gameState.objectives[gameState.guesses.length];
            ctx.fillStyle = objectiveColors[objective];
            ctx.font = 'bold 12px Arial';
            ctx.fillText(objective, gameState.mouse.x + 20, gameState.mouse.y - 20);
        }
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = getScale(gameState.currentDataset);

        drawHistogram(gameState.currentDataset, scale);
        drawScatterPlot(gameState.currentDataset, scale);

        if (gameState.hintTaken) drawBoxPlot(gameState.currentDataset, scale);

        gameState.guesses.forEach((guess, i) => {
            const objective = gameState.objectives[i];
            drawVerticalLine(guess.value, objectiveColors[objective], `Your ${objective}`, scale, true, i * 20);
        });
        
        if (gameState.submitted) {
            gameState.actuals.forEach((actual, i) => {
                const objective = gameState.objectives[i];
                drawVerticalLine(actual.value, objectiveColors[objective], objective, scale, false, i * 20);
            });
        }
        
        drawCursorLabel();
    }

    // --- Game Logic Functions ---
    function startRound() {
        gameState.submitted = false;
        if (gameState.currentRound >= 10) {
            gameState.currentSection++;
            gameState.currentRound = 0;
            if (gameState.currentSection >= sections.length) {
                alert(`Game Over! Final Score: ${gameState.score}`);
                return;
            }
        }

        gameState.currentDataset = datasets[gameState.currentRound];
        gameState.scatterPlotYJitter = gameState.currentDataset.map(() => (Math.random() - 0.5) * 40);
        gameState.objectives = sections[gameState.currentSection].objectives;
        gameState.guesses = [];
        gameState.actuals = [];
        gameState.hintTaken = false;
        submitBtn.textContent = 'Submit Guess';
        submitBtn.disabled = true;
        hintBtn.disabled = false;
        feedbackMessageEl.textContent = '';

        calculateActuals();
        updateHUD();
        redrawCanvas();
    }

    function calculateActuals() {
        gameState.actuals = gameState.objectives.map(obj => {
            let value;
            if (obj === 'Mean') value = calculateMean(gameState.currentDataset);
            else if (obj === 'Median') value = calculateMedian(gameState.currentDataset);
            else if (obj.startsWith('P')) {
                const p = parseInt(obj.substring(1));
                value = calculatePercentile(gameState.currentDataset, p);
            }
            return { objective: obj, value };
        });
    }

    function handleMouseDown(event) {
        if (gameState.submitted) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const scale = getScale(gameState.currentDataset);

        for (let i = 0; i < gameState.guesses.length; i++) {
            const guessX = toCanvasX(gameState.guesses[i].value, scale);
            if (Math.abs(x - guessX) < 10) {
                gameState.dragging.isDragging = true;
                gameState.dragging.guessIndex = i;
                canvas.style.cursor = 'grabbing';
                return;
            }
        }
        
        if (gameState.guesses.length < gameState.objectives.length) {
            const guessedValue = fromCanvasX(x, scale);
            const objective = gameState.objectives[gameState.guesses.length];
            gameState.guesses.push({ objective, value: guessedValue });
            if (gameState.guesses.length === gameState.objectives.length) {
                submitBtn.disabled = false;
            }
            updateHUD();
            redrawCanvas();
        }
    }

    function handleMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        gameState.mouse.x = event.clientX - rect.left;
        gameState.mouse.y = event.clientY - rect.top;

        if (gameState.dragging.isDragging) {
            const scale = getScale(gameState.currentDataset);
            const newValue = fromCanvasX(gameState.mouse.x, scale);
            gameState.guesses[gameState.dragging.guessIndex].value = newValue;
        }
        
        let onGuessLine = false;
        if (!gameState.submitted) {
            for (let i = 0; i < gameState.guesses.length; i++) {
                const scale = getScale(gameState.currentDataset);
                const guessX = toCanvasX(gameState.guesses[i].value, scale);
                if (Math.abs(gameState.mouse.x - guessX) < 10) {
                    onGuessLine = true;
                    break;
                }
            }
        }
        canvas.style.cursor = gameState.dragging.isDragging ? 'grabbing' : onGuessLine ? 'grab' : 'crosshair';

        redrawCanvas();
    }

    function handleMouseUp() {
        gameState.dragging.isDragging = false;
        gameState.dragging.guessIndex = -1;
    }

    function showHint() {
        if (gameState.submitted) return;
        gameState.hintTaken = true;
        hintBtn.disabled = true;
        redrawCanvas();
    }

    function submitGuess() {
        if (gameState.submitted) { // "Next Round" clicked
            gameState.currentRound++;
            startRound();
            return;
        }

        gameState.submitted = true;
        let roundScore = 0;
        let feedbackText = '';
        const scale = getScale(gameState.currentDataset);
        const maxPossibleError = scale.range;

        gameState.guesses.forEach((guess, i) => {
            const actual = gameState.actuals[i].value;
            const error = Math.abs(guess.value - actual);
            const errorPercentage = error / maxPossibleError;
            let points = Math.max(0, 100 - errorPercentage * 100);
            if (gameState.hintTaken) points /= 2;
            points = Math.round(points);
            roundScore += points;
            
            feedbackText += ` ${gameState.objectives[i]}: Off by ${error.toFixed(1)} (+${points} pts).`;
        });

        gameState.score += roundScore;
        feedbackMessageEl.textContent = `Good!${feedbackText}`;
        feedbackMessageEl.style.color = roundScore > 100 ? '#4CAF50' : '#FFC107';

        submitBtn.textContent = 'Next Round';
        hintBtn.disabled = true;
        
        updateHUD();
        redrawCanvas();
    }

    function updateHUD() {
        const section = sections[gameState.currentSection];
        sectionTitleEl.textContent = section.title;
        roundProgressEl.textContent = `Round ${gameState.currentRound + 1}/10: Find`;
        scoreEl.textContent = gameState.score;

        if (!gameState.submitted) {
            if (gameState.guesses.length < gameState.objectives.length) {
                objectiveEl.textContent = gameState.objectives[gameState.guesses.length];
            } else {
                objectiveEl.textContent = 'all measures. Submit when ready.';
            }
        } else {
            objectiveEl.textContent = '';
        }
    }

    function init() {
        startRound();
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseout', () => {
            gameState.mouse.x = -100;
            redrawCanvas();
        });
        hintBtn.addEventListener('click', showHint);
        submitBtn.addEventListener('click', submitGuess);
    }

    init();
});
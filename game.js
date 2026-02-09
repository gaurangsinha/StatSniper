document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const chartContainer = document.getElementById('chart-container');
    const sectionTitleEl = document.getElementById('section-title');
    const roundProgressEl = document.getElementById('round-progress');
    const roundNumberEl = document.getElementById('round-number');
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
        dragging: { isDragging: false, guessIndex: -1, pointerId: null },
        mouse: { x: -100, y: -100 },
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

    const padding = 50;
    const getChartWidth = () => Math.max(10, canvas.width - 2 * padding);
    const getChartHeight = () => Math.max(10, canvas.height - 2 * padding);

    function resizeCanvas() {
        const containerWidth = chartContainer.clientWidth || 320;
        const targetWidth = containerWidth;
        const targetHeight = Math.max(260, Math.min(520, targetWidth * 0.55));
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.height = `${targetHeight}px`;
    }

    window.addEventListener('resize', () => {
        const previousWidth = canvas.width;
        resizeCanvas();
        if (canvas.width !== previousWidth) {
            redrawCanvas();
        } else {
            redrawCanvas();
        }
    });

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
        const upper = Math.min(sorted.length - 1, lower + 1);
        return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
    };

    // --- Drawing Helpers ---
    function getScale(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        return { min, max, range };
    }

    function toCanvasX(value, scale) {
        const width = getChartWidth();
        return padding + ((value - scale.min) / scale.range) * width;
    }
    
    function fromCanvasX(x, scale) {
        const width = getChartWidth();
        const percent = (x - padding) / width;
        const clampedPercent = Math.min(Math.max(percent, 0), 1);
        return scale.min + clampedPercent * scale.range;
    }

    function drawHistogram(data, scale) {
        const chartHeight = getChartHeight();
        const binCount = 20;
        const bins = new Array(binCount).fill(0);
        const binWidth = scale.range / binCount;

        data.forEach(value => {
            let binIndex = Math.floor((value - scale.min) / binWidth);
            if (binIndex < 0) binIndex = 0;
            if (binIndex >= binCount) binIndex = binCount - 1;
            bins[binIndex]++;
        });

        const maxCount = Math.max(...bins) || 1;
        ctx.fillStyle = '#e0e0e0';
        bins.forEach((count, i) => {
            const binX = toCanvasX(scale.min + i * binWidth, scale);
            const binCanvasWidth = toCanvasX(scale.min + (i + 1) * binWidth, scale) - binX;
            const binHeight = (count / maxCount) * chartHeight;
            ctx.fillRect(binX, canvas.height - padding - binHeight, binCanvasWidth, binHeight);
        });
    }

    function drawScatterPlot(data, scale) {
        const jitterAmplitude = Math.min(40, getChartHeight() * 0.25);
        const baseY = canvas.height - padding - Math.min(25, getChartHeight() * 0.15);
        ctx.fillStyle = '#546e7a';
        data.forEach((value, i) => {
            ctx.beginPath();
            const jitter = (gameState.scatterPlotYJitter[i] || 0) * jitterAmplitude;
            ctx.arc(toCanvasX(value, scale), baseY + jitter, 3, 0, 2 * Math.PI);
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
        const height = Math.min(25, getChartHeight() * 0.2);

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
            const labelX = Math.min(Math.max(gameState.mouse.x + 20, padding), canvas.width - padding);
            const labelY = Math.max(gameState.mouse.y - 20, padding / 2);
            ctx.fillText(objective, labelX, labelY);
        }
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!gameState.currentDataset.length) return;
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

        const datasetIndex = (gameState.currentSection * 10 + gameState.currentRound) % datasets.length;
        gameState.currentDataset = datasets[datasetIndex];
        gameState.scatterPlotYJitter = gameState.currentDataset.map(() => (Math.random() - 0.5));
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
                const p = parseInt(obj.substring(1), 10);
                value = calculatePercentile(gameState.currentDataset, p);
            }
            return { objective: obj, value };
        });
    }

    function getCanvasCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function handlePointerDown(event) {
        if (gameState.submitted) return;
        event.preventDefault();
        const { x } = getCanvasCoordinates(event);
        const scale = getScale(gameState.currentDataset);

        for (let i = 0; i < gameState.guesses.length; i++) {
            const guessX = toCanvasX(gameState.guesses[i].value, scale);
            if (Math.abs(x - guessX) < 10) {
                gameState.dragging.isDragging = true;
                gameState.dragging.guessIndex = i;
                gameState.dragging.pointerId = event.pointerId;
                canvas.setPointerCapture(event.pointerId);
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

    function handlePointerMove(event) {
        const coords = getCanvasCoordinates(event);
        gameState.mouse.x = coords.x;
        gameState.mouse.y = coords.y;

        const scale = getScale(gameState.currentDataset);
        if (gameState.dragging.isDragging) {
            const newValue = fromCanvasX(coords.x, scale);
            gameState.guesses[gameState.dragging.guessIndex].value = newValue;
        }
        
        let onGuessLine = false;
        if (!gameState.submitted) {
            for (let i = 0; i < gameState.guesses.length; i++) {
                const guessX = toCanvasX(gameState.guesses[i].value, scale);
                if (Math.abs(coords.x - guessX) < 10) {
                    onGuessLine = true;
                    break;
                }
            }
        }
        canvas.style.cursor = gameState.dragging.isDragging ? 'grabbing' : onGuessLine ? 'grab' : 'crosshair';

        redrawCanvas();
    }

    function handlePointerUp(event) {
        if (gameState.dragging.pointerId === event.pointerId) {
            gameState.dragging.isDragging = false;
            gameState.dragging.guessIndex = -1;
            gameState.dragging.pointerId = null;
            canvas.releasePointerCapture(event.pointerId);
        }
        canvas.style.cursor = 'crosshair';
    }

    function handlePointerLeave() {
        gameState.mouse.x = -100;
        gameState.mouse.y = -100;
        redrawCanvas();
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
        roundNumberEl.textContent = `${gameState.currentRound + 1}/10`;
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
        resizeCanvas();
        startRound();
        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerLeave);
        hintBtn.addEventListener('click', showHint);
        submitBtn.addEventListener('click', submitGuess);
    }

    init();
});

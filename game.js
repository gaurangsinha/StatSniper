document.addEventListener('DOMContentLoaded', () => {
    // ─── DOM References ─────────────────────────────────────────────────────
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const chartContainer = document.getElementById('chart-container');
    const sectionTitleEl = document.getElementById('section-title');
    const roundNumberEl = document.getElementById('round-number');
    const objectiveEl = document.getElementById('objective');
    const scoreEl = document.getElementById('score');
    const hintBtn = document.getElementById('hint-btn');
    const submitBtn = document.getElementById('submit-btn');
    const feedbackMsgEl = document.getElementById('feedback-message');
    const datasetLabelEl = document.getElementById('dataset-label');
    const progressFill = document.getElementById('progress-bar-fill');
    const comboIndicator = document.getElementById('combo-indicator');
    const comboCountEl = document.getElementById('combo-count');
    const roundStarsEl = document.getElementById('round-stars');
    const eduTipEl = document.getElementById('edu-tip');
    const onboardOverlay = document.getElementById('onboarding-overlay');
    const onboardStartBtn = document.getElementById('onboarding-start-btn');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const gameoverScoreEl = document.getElementById('gameover-score-value');
    const gameoverStarsEl = document.getElementById('gameover-stars');
    const gameoverBreakEl = document.getElementById('gameover-breakdown');
    const gameoverRestartBtn = document.getElementById('gameover-restart-btn');

    // ─── Constants ──────────────────────────────────────────────────────────
    const ROUNDS_PER_SECTION = 5;
    const COMBO_THRESHOLD = 75; // min score per-guess to keep combo
    const COMBO_BONUS_AT = 3;  // streak length to trigger bonus
    const COMBO_MULTIPLIER = 1.5;

    const sections = [
        { title: 'Section 1: Mean vs Median', objectives: ['Mean', 'Median'] },
        { title: 'Section 2: Percentiles', objectives: ['P90', 'P95', 'P99'] },
        { title: 'Section 3: Spread', objectives: ['StdDev'] },
        { title: 'Section 4: All-in-One', objectives: ['Mean', 'Median', 'P95'] },
    ];

    const totalRounds = sections.length * ROUNDS_PER_SECTION;

    const objectiveColors = {
        'Mean': '#34d399',
        'Median': '#60a5fa',
        'P90': '#fbbf24',
        'P95': '#f97316',
        'P99': '#f87171',
        'StdDev': '#a78bfa',
    };

    const objectiveLabels = {
        'Mean': 'Mean',
        'Median': 'Median',
        'P90': 'P90',
        'P95': 'P95',
        'P99': 'P99',
        'StdDev': '±1 Std Dev',
    };

    // ─── Game State ─────────────────────────────────────────────────────────
    const gameState = {
        currentSection: 0,
        currentRound: 0,
        score: 0,
        sectionScores: [0, 0, 0, 0],
        combo: 0,
        guesses: [],   // [{objective, value}]
        actuals: [],   // [{objective, value}]
        hintTaken: false,
        objectives: [],
        currentDataset: [],
        currentMeta: null, // {label, tip}
        scatterJitter: [],
        dragging: { active: false, idx: -1, pid: null },
        mouse: { x: -100, y: -100 },
        submitted: false,
        // For StdDev section — we need two guess lines (left & right of mean)
        stddevMode: false,
    };

    const padding = 50;
    const getChartW = () => Math.max(10, canvas.width - 2 * padding);
    const getChartH = () => Math.max(10, canvas.height - 2 * padding);

    // ─── Canvas Sizing ──────────────────────────────────────────────────────
    function resizeCanvas() {
        const w = chartContainer.clientWidth || 320;
        const h = Math.max(240, Math.min(480, w * 0.52));
        canvas.width = w;
        canvas.height = h;
        canvas.style.height = `${h}px`;
    }

    window.addEventListener('resize', () => { resizeCanvas(); redrawCanvas(); });

    // ─── Stats ──────────────────────────────────────────────────────────────
    const mean = d => d.reduce((a, b) => a + b, 0) / d.length;
    const median = d => { const s = [...d].sort((a, b) => a - b), m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const percentile = (d, p) => {
        const s = [...d].sort((a, b) => a - b), i = (p / 100) * (s.length - 1);
        if (Number.isInteger(i)) return s[i];
        const lo = Math.floor(i), hi = Math.min(s.length - 1, lo + 1);
        return s[lo] * (hi - i) + s[hi] * (i - lo);
    };
    const stddev = d => { const m = mean(d); return Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / d.length); };

    // ─── Scale & Coordinate Helpers ─────────────────────────────────────────
    function getScale(data) {
        const mn = Math.min(...data), mx = Math.max(...data);
        return { min: mn, max: mx, range: mx - mn || 1 };
    }
    function toX(v, sc) { return padding + ((v - sc.min) / sc.range) * getChartW(); }
    function fromX(x, sc) { return sc.min + Math.max(0, Math.min(1, (x - padding) / getChartW())) * sc.range; }

    // ─── Drawing ────────────────────────────────────────────────────────────
    function drawHistogram(data, sc) {
        const cH = getChartH(), bins = 20, bw = sc.range / bins;
        const counts = new Array(bins).fill(0);
        data.forEach(v => { let i = Math.floor((v - sc.min) / bw); counts[Math.max(0, Math.min(bins - 1, i))]++; });
        const mx = Math.max(...counts) || 1;
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        counts.forEach((c, i) => {
            const x1 = toX(sc.min + i * bw, sc), x2 = toX(sc.min + (i + 1) * bw, sc);
            const h = (c / mx) * cH;
            ctx.fillRect(x1, canvas.height - padding - h, x2 - x1, h);
        });
    }

    function drawScatter(data, sc) {
        const jAmp = Math.min(36, getChartH() * 0.22);
        const baseY = canvas.height - padding - Math.min(22, getChartH() * 0.13);
        ctx.fillStyle = '#78909c';
        data.forEach((v, i) => {
            ctx.beginPath();
            ctx.arc(toX(v, sc), baseY + (gameState.scatterJitter[i] || 0) * jAmp, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawBoxPlot(data, sc) {
        const q1 = percentile(data, 25), med = median(data), q3 = percentile(data, 75);
        const mn = Math.min(...data), mx = Math.max(...data);
        const y = canvas.height - padding + 18, h = Math.min(22, getChartH() * 0.18);
        ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toX(mn, sc), y); ctx.lineTo(toX(q1, sc), y);
        ctx.moveTo(toX(q3, sc), y); ctx.lineTo(toX(mx, sc), y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(230,126,34,0.15)';
        const bx = toX(q1, sc), bw2 = toX(q3, sc) - bx;
        ctx.fillRect(bx, y - h / 2, bw2, h);
        ctx.strokeRect(bx, y - h / 2, bw2, h);
        ctx.beginPath(); ctx.moveTo(toX(med, sc), y - h / 2); ctx.lineTo(toX(med, sc), y + h / 2); ctx.stroke();
        ctx.fillStyle = '#e67e22'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Box Plot Hint', canvas.width / 2, y + h + 2);
    }

    function drawXAxis(sc) {
        const ticks = 6;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i <= ticks; i++) {
            const v = sc.min + (sc.range * i / ticks);
            const x = toX(v, sc);
            // tick mark
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - padding);
            ctx.lineTo(x, canvas.height - padding + 5);
            ctx.stroke();
            // label
            let label;
            if (sc.range > 5000) label = (v / 1000).toFixed(0) + 'K';
            else if (sc.range > 500) label = Math.round(v).toString();
            else if (sc.range > 5) label = v.toFixed(0);
            else label = v.toFixed(1);
            ctx.fillText(label, x, canvas.height - padding + 16);
        }
    }

    function drawVertLine(value, color, label, sc, dashed = false, yOff = 0) {
        const x = toX(value, sc);
        ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (dashed) ctx.setLineDash([5, 4]);
        ctx.moveTo(x, padding); ctx.lineTo(x, canvas.height - padding);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = color; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(label, x, padding - 8 - yOff);
    }

    function drawStdDevShading(lo, hi, color, sc, alpha = 0.08) {
        const x1 = toX(lo, sc), x2 = toX(hi, sc);
        ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.fillRect(x1, padding, x2 - x1, getChartH());
    }

    function drawCursorLabel() {
        if (gameState.submitted) return;
        let nextObj;
        if (gameState.stddevMode) {
            if (gameState.guesses.length === 0) nextObj = '-1 SD';
            else if (gameState.guesses.length === 1) nextObj = '+1 SD';
            else return;
        } else {
            if (gameState.guesses.length >= gameState.objectives.length) return;
            nextObj = gameState.objectives[gameState.guesses.length];
        }
        const col = gameState.stddevMode ? objectiveColors['StdDev'] : objectiveColors[nextObj];
        ctx.fillStyle = col; ctx.font = 'bold 11px Inter, sans-serif';
        const lx = Math.min(Math.max(gameState.mouse.x + 16, padding), canvas.width - padding);
        const ly = Math.max(gameState.mouse.y - 16, padding / 2);
        ctx.fillText(nextObj, lx, ly);
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!gameState.currentDataset.length) return;
        const sc = getScale(gameState.currentDataset);

        drawHistogram(gameState.currentDataset, sc);
        drawScatter(gameState.currentDataset, sc);
        drawXAxis(sc);

        if (gameState.hintTaken) drawBoxPlot(gameState.currentDataset, sc);

        // Guess lines
        if (gameState.stddevMode) {
            // StdDev mode: two lines + shading
            if (gameState.guesses.length >= 2) {
                const lo = Math.min(gameState.guesses[0].value, gameState.guesses[1].value);
                const hi = Math.max(gameState.guesses[0].value, gameState.guesses[1].value);
                drawStdDevShading(lo, hi, 'rgb(167, 139, 250)', sc, 0.12);
            }
            gameState.guesses.forEach((g, i) => {
                drawVertLine(g.value, objectiveColors['StdDev'], i === 0 ? 'Your -1SD' : 'Your +1SD', sc, true, i * 18);
            });
        } else {
            gameState.guesses.forEach((g, i) => {
                drawVertLine(g.value, objectiveColors[g.objective], `Your ${g.objective}`, sc, true, i * 18);
            });
        }

        // Actual lines (after submit)
        if (gameState.submitted) {
            if (gameState.stddevMode) {
                const m = mean(gameState.currentDataset);
                const sd = stddev(gameState.currentDataset);
                drawStdDevShading(m - sd, m + sd, 'rgb(52, 211, 153)', sc, 0.10);
                drawVertLine(m - sd, objectiveColors['Mean'], '-1 SD', sc, false, 0);
                drawVertLine(m + sd, objectiveColors['Mean'], '+1 SD', sc, false, 18);
                drawVertLine(m, '#ffffff', 'Mean', sc, false, 36);
            } else {
                gameState.actuals.forEach((a, i) => {
                    drawVertLine(a.value, objectiveColors[a.objective], a.objective, sc, false, i * 18);
                });
            }
        }

        drawCursorLabel();
    }

    // ─── Game Logic ─────────────────────────────────────────────────────────
    function pickDataset() {
        const globalIdx = gameState.currentSection * ROUNDS_PER_SECTION + gameState.currentRound;
        const idx = globalIdx % datasets.length;
        return datasets[idx];
    }

    function startRound() {
        gameState.submitted = false;
        if (gameState.currentRound >= ROUNDS_PER_SECTION) {
            gameState.currentSection++;
            gameState.currentRound = 0;
            if (gameState.currentSection >= sections.length) {
                showGameOver();
                return;
            }
        }

        const ds = pickDataset();
        gameState.currentDataset = ds.data;
        gameState.currentMeta = { label: ds.label, tip: ds.tip };
        gameState.scatterJitter = ds.data.map(() => Math.random() - 0.5);

        const sec = sections[gameState.currentSection];
        gameState.objectives = sec.objectives;
        gameState.stddevMode = sec.objectives[0] === 'StdDev';
        gameState.guesses = [];
        gameState.actuals = [];
        gameState.hintTaken = false;

        submitBtn.textContent = 'Submit Guess';
        submitBtn.disabled = true;
        hintBtn.disabled = false;
        feedbackMsgEl.textContent = '';
        feedbackMsgEl.style.color = '';
        roundStarsEl.classList.add('hidden');
        roundStarsEl.textContent = '';
        eduTipEl.classList.add('hidden');
        eduTipEl.textContent = '';

        datasetLabelEl.textContent = gameState.currentMeta.label;

        calculateActuals();
        updateHUD();
        resizeCanvas();
        redrawCanvas();
    }

    function calculateActuals() {
        if (gameState.stddevMode) {
            const m = mean(gameState.currentDataset);
            const sd = stddev(gameState.currentDataset);
            gameState.actuals = [
                { objective: 'StdDev-lo', value: m - sd },
                { objective: 'StdDev-hi', value: m + sd },
            ];
        } else {
            gameState.actuals = gameState.objectives.map(obj => {
                let v;
                if (obj === 'Mean') v = mean(gameState.currentDataset);
                else if (obj === 'Median') v = median(gameState.currentDataset);
                else if (obj.startsWith('P')) v = percentile(gameState.currentDataset, parseInt(obj.substring(1), 10));
                return { objective: obj, value: v };
            });
        }
    }

    function getCoords(e) {
        const r = canvas.getBoundingClientRect();
        const scaleX = canvas.width / r.width;
        const scaleY = canvas.height / r.height;
        return {
            x: (e.clientX - r.left) * scaleX,
            y: (e.clientY - r.top) * scaleY,
        };
    }

    function maxGuesses() {
        return gameState.stddevMode ? 2 : gameState.objectives.length;
    }

    // ─── Pointer Events ─────────────────────────────────────────────────────
    function onPointerDown(e) {
        if (gameState.submitted) return;
        e.preventDefault();
        const { x } = getCoords(e);
        const sc = getScale(gameState.currentDataset);

        // Check drag on existing guess
        for (let i = 0; i < gameState.guesses.length; i++) {
            if (Math.abs(x - toX(gameState.guesses[i].value, sc)) < 14) {
                gameState.dragging = { active: true, idx: i, pid: e.pointerId };
                canvas.setPointerCapture(e.pointerId);
                canvas.style.cursor = 'grabbing';
                return;
            }
        }

        // Place new guess
        if (gameState.guesses.length < maxGuesses()) {
            const v = fromX(x, sc);
            const obj = gameState.stddevMode
                ? (gameState.guesses.length === 0 ? 'StdDev-lo' : 'StdDev-hi')
                : gameState.objectives[gameState.guesses.length];
            gameState.guesses.push({ objective: obj, value: v });
            if (gameState.guesses.length === maxGuesses()) submitBtn.disabled = false;
            updateHUD();
            redrawCanvas();
        }
    }

    function onPointerMove(e) {
        const c = getCoords(e);
        gameState.mouse.x = c.x; gameState.mouse.y = c.y;
        const sc = getScale(gameState.currentDataset);
        if (gameState.dragging.active) {
            gameState.guesses[gameState.dragging.idx].value = fromX(c.x, sc);
        }
        // Cursor hint
        let onLine = false;
        if (!gameState.submitted) {
            for (const g of gameState.guesses) {
                if (Math.abs(c.x - toX(g.value, sc)) < 14) { onLine = true; break; }
            }
        }
        canvas.style.cursor = gameState.dragging.active ? 'grabbing' : onLine ? 'grab' : 'crosshair';
        redrawCanvas();
    }

    function onPointerUp(e) {
        if (gameState.dragging.pid === e.pointerId) {
            gameState.dragging = { active: false, idx: -1, pid: null };
            canvas.releasePointerCapture(e.pointerId);
        }
        canvas.style.cursor = 'crosshair';
    }

    function onPointerLeave() {
        gameState.mouse = { x: -100, y: -100 };
        redrawCanvas();
    }

    // ─── Hint ───────────────────────────────────────────────────────────────
    function showHint() {
        if (gameState.submitted) return;
        gameState.hintTaken = true;
        hintBtn.disabled = true;
        redrawCanvas();
    }

    // ─── Submit / Next ──────────────────────────────────────────────────────
    function submitGuess() {
        if (gameState.submitted) {
            gameState.currentRound++;
            startRound();
            return;
        }

        gameState.submitted = true;
        const sc = getScale(gameState.currentDataset);
        const maxE = sc.range;
        let roundScore = 0;
        let parts = [];
        let allGood = true;

        if (gameState.stddevMode) {
            // Score based on how close each line is to actual ±1 SD
            gameState.guesses.forEach((g, i) => {
                const actual = gameState.actuals[i].value;
                const err = Math.abs(g.value - actual);
                const pct = err / maxE;
                let pts = Math.max(0, 100 - pct * 100);
                if (gameState.hintTaken) pts /= 2;
                pts = Math.round(pts);
                if (pts < COMBO_THRESHOLD) allGood = false;
                roundScore += pts;
                parts.push(`${i === 0 ? '-1SD' : '+1SD'}: off by ${err.toFixed(1)} (+${pts})`);
            });
        } else {
            gameState.guesses.forEach((g, i) => {
                const actual = gameState.actuals[i].value;
                const err = Math.abs(g.value - actual);
                const pct = err / maxE;
                let pts = Math.max(0, 100 - pct * 100);
                if (gameState.hintTaken) pts /= 2;
                pts = Math.round(pts);
                if (pts < COMBO_THRESHOLD) allGood = false;
                roundScore += pts;
                parts.push(`${g.objective}: off by ${err.toFixed(1)} (+${pts})`);
            });
        }

        // Combo
        if (allGood) {
            gameState.combo++;
            if (gameState.combo >= COMBO_BONUS_AT) {
                const bonus = Math.round(roundScore * (COMBO_MULTIPLIER - 1));
                roundScore += bonus;
                parts.push(`🔥 Streak ×${gameState.combo} bonus +${bonus}`);
            }
        } else {
            gameState.combo = 0;
        }

        gameState.score += roundScore;
        gameState.sectionScores[gameState.currentSection] += roundScore;

        // Stars
        const avgPts = roundScore / maxGuesses();
        const stars = avgPts >= 90 ? 3 : avgPts >= 60 ? 2 : 1;
        roundStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        roundStarsEl.classList.remove('hidden');

        feedbackMsgEl.textContent = parts.join('  ·  ');
        feedbackMsgEl.style.color = avgPts >= 70 ? '#34d399' : '#fbbf24';

        // Combo indicator
        if (gameState.combo >= 2) {
            comboCountEl.textContent = gameState.combo;
            comboIndicator.classList.remove('hidden');
            // Retrigger animation
            comboIndicator.style.animation = 'none';
            void comboIndicator.offsetHeight;
            comboIndicator.style.animation = '';
        } else {
            comboIndicator.classList.add('hidden');
        }

        // Educational tip
        if (gameState.currentMeta && gameState.currentMeta.tip) {
            eduTipEl.textContent = '💡 ' + gameState.currentMeta.tip;
            eduTipEl.classList.remove('hidden');
        }

        submitBtn.textContent = 'Next Round →';
        hintBtn.disabled = true;
        updateHUD();
        redrawCanvas();
    }

    // ─── HUD ────────────────────────────────────────────────────────────────
    function updateHUD() {
        const sec = sections[gameState.currentSection];
        sectionTitleEl.textContent = sec.title;
        roundNumberEl.textContent = `${gameState.currentRound + 1}/${ROUNDS_PER_SECTION}`;
        scoreEl.textContent = gameState.score;

        // Progress
        const done = gameState.currentSection * ROUNDS_PER_SECTION + gameState.currentRound;
        progressFill.style.width = `${(done / totalRounds) * 100}%`;

        if (!gameState.submitted) {
            if (gameState.stddevMode) {
                if (gameState.guesses.length === 0) objectiveEl.textContent = '-1 Std Dev (left side)';
                else if (gameState.guesses.length === 1) objectiveEl.textContent = '+1 Std Dev (right side)';
                else objectiveEl.textContent = 'both lines placed. Submit!';
            } else {
                if (gameState.guesses.length < gameState.objectives.length)
                    objectiveEl.textContent = gameState.objectives[gameState.guesses.length];
                else
                    objectiveEl.textContent = 'all placed — submit when ready!';
            }
        } else {
            objectiveEl.textContent = '';
        }
    }

    // ─── Game Over ──────────────────────────────────────────────────────────
    function showGameOver() {
        gameoverScoreEl.textContent = gameState.score;

        // Overall stars
        const maxPossible = totalRounds * 100; // rough max per guess
        const pct = gameState.score / maxPossible;
        const overallStars = pct >= 0.75 ? 3 : pct >= 0.45 ? 2 : 1;
        gameoverStarsEl.textContent = '⭐'.repeat(overallStars) + '☆'.repeat(3 - overallStars);

        // Section breakdown
        gameoverBreakEl.innerHTML = '';
        sections.forEach((sec, i) => {
            const row = document.createElement('div');
            row.innerHTML = `<span>${sec.title}</span><span>${gameState.sectionScores[i]} pts</span>`;
            gameoverBreakEl.appendChild(row);
        });

        gameoverOverlay.classList.remove('hidden');
    }

    // ─── Onboarding ─────────────────────────────────────────────────────────
    function maybeShowOnboarding() {
        if (localStorage.getItem('statsniper_onboarded')) return false;
        onboardOverlay.classList.remove('hidden');
        return true;
    }

    onboardStartBtn.addEventListener('click', () => {
        localStorage.setItem('statsniper_onboarded', '1');
        onboardOverlay.classList.add('hidden');
        startRound();
    });

    gameoverRestartBtn.addEventListener('click', () => {
        gameoverOverlay.classList.add('hidden');
        gameState.currentSection = 0;
        gameState.currentRound = 0;
        gameState.score = 0;
        gameState.sectionScores = [0, 0, 0, 0];
        gameState.combo = 0;
        comboIndicator.classList.add('hidden');
        startRound();
    });

    // ─── Init ───────────────────────────────────────────────────────────────
    function init() {
        resizeCanvas();

        canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        hintBtn.addEventListener('click', showHint);
        submitBtn.addEventListener('click', submitGuess);

        if (!maybeShowOnboarding()) {
            startRound();
        }
    }

    init();
});

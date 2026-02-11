// ─── Random Generation Helpers ──────────────────────────────────────────────

function randomNormal(mean = 0, stdDev = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * stdDev + mean;
}

function randomSkewed(mean, stdDev, skew, size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        let val = randomNormal(mean, stdDev);
        if (skew > 0) {
            val = mean + Math.abs(val - mean) * (Math.random() < 0.7 ? 1 : -1);
            if (Math.random() < skew * 0.4) val = mean + Math.abs(randomNormal(0, stdDev * 2));
        } else {
            val = mean - Math.abs(val - mean) * (Math.random() < 0.7 ? 1 : -1);
            if (Math.random() < Math.abs(skew) * 0.4) val = mean - Math.abs(randomNormal(0, stdDev * 2));
        }
        data.push(val);
    }
    return data;
}

function randomBimodal(mean1, stdDev1, mean2, stdDev2, size, ratio = 0.5) {
    const data = [];
    for (let i = 0; i < size; i++) {
        data.push(Math.random() < ratio ? randomNormal(mean1, stdDev1) : randomNormal(mean2, stdDev2));
    }
    return data;
}

function clampArray(arr, lo, hi) {
    return arr.map(v => Math.max(lo, Math.min(hi, Math.round(v * 10) / 10)));
}

// ─── Themed Dataset Definitions ─────────────────────────────────────────────
// Each entry: { label, tip, data }

const datasets = [
    // 1 ─ Right-skewed
    {
        label: '☕ Daily coffee orders at a campus café',
        tip: 'Right-skewed data pulls the mean above the median — a few huge rush-hour surges raise the average.',
        data: clampArray(randomSkewed(120, 40, 0.7, 180), 50, 400),
    },
    // 2 ─ Left-skewed
    {
        label: '📝 Student exam scores (out of 100)',
        tip: 'Exam scores often skew left — most students pass, but a few very low scores pull the mean down.',
        data: clampArray(randomSkewed(78, 12, -0.8, 200), 20, 100),
    },
    // 3 ─ Right-skewed with outliers
    {
        label: '🏙️ NYC apartment monthly rent ($)',
        tip: 'Housing markets are famous for right-skewed distributions — a handful of luxury units make the mean misleading.',
        data: clampArray([...Array.from({length: 170}, () => randomNormal(2800, 600)), 7200, 7800, 6500, 8000, 5900], 800, 8000),
    },
    // 4 ─ Normal
    {
        label: '🏃 Marathon finish times (minutes)',
        tip: 'Large-population athletic events tend toward a normal distribution because of the Central Limit Theorem.',
        data: clampArray(Array.from({length: 200}, () => randomNormal(280, 35)), 180, 400),
    },
    // 5 ─ Bimodal
    {
        label: '💰 Salaries at a tech startup ($K)',
        tip: 'Bimodal data has two peaks — here, engineers and sales staff form two separate clusters.',
        data: clampArray(randomBimodal(85, 12, 175, 25, 200, 0.55), 40, 250),
    },
    // 6 ─ Right-skewed
    {
        label: '🌐 Daily website page views',
        tip: 'Web traffic is notoriously right-skewed — viral days can be orders of magnitude above normal.',
        data: clampArray(randomSkewed(1200, 800, 0.9, 180), 100, 10000),
    },
    // 7 ─ Normal, tight
    {
        label: '🏀 Height of NBA players (inches)',
        tip: 'Professional athletes are pre-selected, so the distribution is normal but with unusually low variance.',
        data: clampArray(Array.from({length: 150}, () => randomNormal(78, 2.5)), 72, 84),
    },
    // 8 ─ Right-skewed
    {
        label: '🚗 Uber ride durations (minutes)',
        tip: 'Most rides are short, but airport or cross-town trips create a long right tail.',
        data: clampArray(randomSkewed(15, 8, 0.85, 200), 3, 90),
    },
    // 9 ─ Right-skewed with outliers
    {
        label: '🏡 Home prices in a suburb ($K)',
        tip: 'A few mansion-priced outliers can make the mean home price much higher than the median.',
        data: clampArray([...Array.from({length: 180}, () => randomNormal(420, 80)), 950, 1100, 1350, 880], 200, 1500),
    },
    // 10 ─ Bimodal
    {
        label: '🚶 Daily steps walked',
        tip: 'Steps data is often bimodal — sedentary office workers vs. active individuals form two clusters.',
        data: clampArray(randomBimodal(4000, 1500, 12000, 3000, 200, 0.45), 1000, 25000),
    },
    // 11 ─ Normal with outliers
    {
        label: '🍽️ Restaurant tip percentage',
        tip: 'Most tips cluster around 15–20%, but a handful of extremely generous (or zero) tips are outliers.',
        data: clampArray([...Array.from({length: 160}, () => randomNormal(18, 4)), 0, 0.5, 38, 40, 35], 0, 40),
    },
    // 12 ─ Heavily right-skewed
    {
        label: '📱 Twitter followers of micro-influencers',
        tip: 'Social media followings follow a power-law — most have few followers, some amass huge audiences.',
        data: clampArray(randomSkewed(2000, 3000, 0.95, 200), 100, 50000),
    },
    // 13 ─ Normal, tight
    {
        label: '🔋 Smartphone battery life (hours)',
        tip: 'Manufacturing consistency keeps battery life tightly normal — a great example of quality control.',
        data: clampArray(Array.from({length: 180}, () => randomNormal(10, 1.5)), 6, 14),
    },
    // 14 ─ Heavily right-skewed
    {
        label: '✈️ Flight delay durations (minutes)',
        tip: 'Most flights are roughly on time, but cascading delays create an extremely long right tail.',
        data: clampArray(randomSkewed(15, 25, 0.95, 200), -10, 300),
    },
    // 15 ─ Normal
    {
        label: '🌡️ City temperatures in July (°F)',
        tip: 'Daily temperatures in a single month are roughly normal, centered on the climate average.',
        data: clampArray(Array.from({length: 150}, () => randomNormal(85, 8)), 60, 110),
    },
    // 16 ─ Normal
    {
        label: '🎸 Age of attendees at a rock concert',
        tip: 'Concert-goer ages tend to cluster normally around the band\'s core fan demographic.',
        data: clampArray(Array.from({length: 200}, () => randomNormal(32, 8)), 16, 55),
    },
    // 17 ─ Right-skewed
    {
        label: '🛒 Online purchase amounts ($)',
        tip: 'E-commerce transactions skew right — most are small purchases, but big-ticket items raise the mean.',
        data: clampArray(randomSkewed(45, 30, 0.8, 200), 5, 500),
    },
    // 18 ─ Right-skewed
    {
        label: '🚌 Daily commute times (minutes)',
        tip: 'Commutes are right-skewed because there\'s a minimum (you can\'t commute in 0 min) but no real maximum.',
        data: clampArray(randomSkewed(28, 12, 0.7, 180), 5, 120),
    },
    // 19 ─ Right-skewed with outliers
    {
        label: '📺 YouTube video lengths (minutes)',
        tip: 'The majority of videos are short, but long-form content and livestream replays create outliers.',
        data: clampArray([...Array.from({length: 180}, () => randomNormal(8, 4)), 45, 52, 58, 48], 1, 60),
    },
    // 20 ─ Normal
    {
        label: '🎵 Spotify song durations (seconds)',
        tip: 'Pop songs converge on ~3.5 minutes due to radio formatting conventions — classic normal distribution.',
        data: clampArray(Array.from({length: 200}, () => randomNormal(210, 35)), 120, 360),
    },
    // 21 ─ Bimodal
    {
        label: '🧳 Luggage weight at the airport (lbs)',
        tip: 'Bimodal luggage weights reflect carry-on vs. checked bags — two distinct populations.',
        data: clampArray(randomBimodal(18, 3, 48, 8, 200, 0.4), 15, 70),
    },
    // 22 ─ Right-skewed
    {
        label: '📧 Emails received per day',
        tip: 'Email volume is right-skewed — most people get a moderate amount, managers get buried.',
        data: clampArray(randomSkewed(35, 20, 0.75, 180), 5, 200),
    },
    // 23 ─ Right-skewed
    {
        label: '🎮 Reaction time in a video game (ms)',
        tip: 'Reaction times have a hard floor (~150 ms) but a long right tail for distracted responses.',
        data: clampArray(randomSkewed(220, 60, 0.8, 200), 100, 800),
    },
    // 24 ─ Normal
    {
        label: '🍷 Wine quality ratings (1–100)',
        tip: 'Expert ratings tend to form a normal bell curve — most wines are "average" by definition.',
        data: clampArray(Array.from({length: 180}, () => randomNormal(80, 7)), 60, 100),
    },
    // 25 ─ Bimodal
    {
        label: '⚡ Monthly electricity bills ($)',
        tip: 'Bimodal electricity usage: mild spring/fall months vs. extreme summer AC or winter heating.',
        data: clampArray(randomBimodal(80, 20, 240, 40, 200, 0.5), 30, 350),
    },
    // 26 ─ Right-skewed with spikes
    {
        label: '⏱️ Mobile app load times (ms)',
        tip: 'P99 latency is crucial in software — one slow request in 100 can ruin user experience.',
        data: clampArray([...randomSkewed(300, 150, 0.85, 190), 2200, 2500, 2800, 1900, 2100, 1800, 2600, 2400, 2700, 2900], 50, 3000),
    },
    // 27 ─ Right-skewed
    {
        label: '🌧️ Monthly rainfall (mm)',
        tip: 'Rainfall is right-skewed in most climates — dry months are common, deluges are rare but extreme.',
        data: clampArray(randomSkewed(60, 40, 0.8, 180), 0, 300),
    },
    // 28 ─ Normal, tight
    {
        label: '🚘 Highway speeds (mph)',
        tip: 'Drivers self-regulate around the speed limit, creating a tight normal distribution.',
        data: clampArray(Array.from({length: 200}, () => randomNormal(68, 5)), 55, 85),
    },
    // 29 ─ Right-skewed
    {
        label: '💻 GitHub commits per week',
        tip: 'Open-source contributions follow a "long tail" — few devs contribute the majority of commits.',
        data: clampArray(randomSkewed(12, 10, 0.85, 180), 0, 100),
    },
    // 30 ─ Left-skewed
    {
        label: '⭐ Customer satisfaction scores (1–10)',
        tip: 'Satisfaction surveys tend to skew left (most are happy), which is why the median often exceeds the mean.',
        data: clampArray(randomSkewed(7.5, 1.5, -0.8, 200), 1, 10),
    },
];
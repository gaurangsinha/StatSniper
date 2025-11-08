// Helper function to generate a random number from a normal distribution
function randomNormal(mean = 0, stdDev = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random(); //Converting [0,1) to (0,1)
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * stdDev + mean;
}

// Helper function to generate skewed data
function randomSkewed(mean, stdDev, skew, size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        const val = randomNormal(mean, stdDev);
        const sign = skew > 0 ? 1 : -1;
        data.push(val + sign * Math.pow(Math.abs(val), 2) * skew);
    }
    // Normalize to a 0-150 range
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(d => 10 + (d - min) / (max - min) * 130);
}

// Helper function to generate bimodal data
function randomBimodal(mean1, stdDev1, mean2, stdDev2, size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        if (Math.random() < 0.5) {
            data.push(randomNormal(mean1, stdDev1));
        } else {
            data.push(randomNormal(mean2, stdDev2));
        }
    }
    return data;
}


const datasets = [
    // Dataset 1: Relatively Normal Distribution
    Array.from({ length: 150 }, () => randomNormal(75, 15)),
    // Dataset 2: Skewed to the Right
    randomSkewed(50, 20, 0.8, 200),
    // Dataset 3: Skewed to the Left
    randomSkewed(100, 20, -0.8, 180),
    // Dataset 4: Bimodal Distribution
    randomBimodal(50, 10, 100, 10, 200),
    // Dataset 5: Uniform Distribution
    Array.from({ length: 200 }, () => Math.random() * 150),
    // Dataset 6: Dataset with Outliers
    [...Array.from({ length: 120 }, () => randomNormal(50, 5)), 1, 149, 2, 148],
    // Dataset 7: Another Skewed Right
    randomSkewed(40, 15, 0.9, 150),
    // Dataset 8: Another Skewed Left
    randomSkewed(110, 15, -0.9, 160),
    // Dataset 9: Centered data with low variance
    Array.from({ length: 250 }, () => randomNormal(75, 5)),
    // Dataset 10: Spread out data (high variance)
    Array.from({ length: 100 }, () => randomNormal(75, 30))
].map(arr => arr.map(val => Math.max(0, Math.min(150, val)))); // Clamp values between 0 and 150
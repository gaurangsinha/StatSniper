# StatSniper
Stop guessing, start seeing. StatSniper is the game that trains your brain to understand data distributions intuitively. Master the concepts of mean, median, and percentiles (P90, P95, P99) to make smarter, faster judgments.

## 🎯 Game Concept: "Stat Sniper"
Stat Sniper is an educational statistics game where players test their intuitive understanding of statistical concepts. Players are presented with a data visualization and must accurately "snipe" (i.e., guess the position of) a specific statistical value, such as the median, mean and P90-P99.

###Game Structure
1. **Sections:** The game is divided into Sections, with each section focusing on a few statistical concept.
  - **Section 1 - Mean vs Median:** Here we try to instill a basic understanding of mean (average) vs median (P50).
  - **Section 2 - Pnn:** Here we try to install a basic understanding of P90, P95 and P99.
  - **Section 3:** - Here we test the player on all the statistical concepts we have introduced.
2. **Rounds:** Each section consists of a fixed number of Rounds. In each round, a new dataset and visualization are presented for the statistical concepts.

###🎮 Core Gameplay Loop (Per Round)
1. **Presentation:** The player is shown a data visualization and a task.
  - Task: The objective is clearly stated (e.g., "Find Median and Mean").
  - Visualization: The graph displays the data in two ways simultaneously:
    - A Density Plot (shown as a light grey histogram in the background) to visualize the distribution's shape.
    - A Data Point Plot (shown as a scatter plot of all individual dots) to show the exact location and quantity of each data point.
	- A box plot is shown under these two plots only when the player requests a hint.
	- X & Y axis are linear and have no markings.

2. **Interaction (Guessing):**
  - The player must place a "guess" marker on the graph by clicking on the desired location along the horizontal axis.
  - The player might be asked to click multiple times to guess all the tasks.
  - The game should clearly indicate the staitical concept being guessed by drawing a vertical line at the location picked by the user and by using a unique color & text.

3. **Feedback & Scoring:**
  - After the guess is submitted, the game reveals the "Actual Value" on the graph.
  - The player's Score is updated. The score is cumulative and is awarded based on the proximity of "Your Guess" to the "Actual Value"—the closer the guess, the more points earned.
  - If a hint is used to generate a guess only half the points should be awarded.

4. **Progression:** 
  - The game advances to the next round until the section is complete.
  - Each section has 10 rounds.

### 🖥️ Key UI & UX Elements
- **Main Graph Area:** The primary focus, displaying the density and data point plots.
- **Game Status HUD:**
  - **Title:** "Stat Sniper v1.0"
  - **Section Title:** e.g. "Section 1: Mean vs Median"
  - **Round Progress:** e.g. "Round 2/10"
  - **Objective:** e.g. "Find Mean & Median"
  - **Score:** e.g. "Score: 000"
- **Interactive Controls:**
  - **"Get Hint" Button:** A button that provides help at the cost of points (50% of actual points awarded), creating a risk/reward mechanic.
  - **"Submit Guess" Button:** Is only active when the player has guessed all the tasks requested.
- **Legend:** A clear legend at the bottom to identify the different visual elements:
  - Density
  - Data Points
  - Your Guess(es)
  - Actual Value(es)
  
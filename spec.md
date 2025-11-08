# StatSniper: Game Specification

**Document Version:** 1.0
**Date:** 2025-11-07

---

## 1. Introduction

### 1.1. Overview
This document provides a detailed specification for the educational statistics game, "Stat Sniper." The game is designed to be a fun and interactive tool for learning and mastering key statistical concepts. This document outlines the game's concept, features, requirements, and technical details.

### 1.2. Target Audience
Stat Sniper is intended for:
-   **Students:** High school and college students learning statistics.
-   **Data Professionals:** Analysts, data scientists, and researchers who want to sharpen their intuitive understanding of data distributions.
-   **Anyone interested in data literacy:** Individuals who want to improve their ability to interpret data visualizations.

---

## 2. Game Concept

Stat Sniper is an educational game where players test their intuitive understanding of statistical concepts. Players are presented with a data visualization and must accurately "snipe" (i.e., guess the position of) a specific statistical value, such as the median, mean, and various percentiles.

### 2.1. Game Structure
1.  **Sections:** The game is divided into three sections, each focusing on a different statistical concept.
    -   **Section 1: Mean vs Median:** Builds a foundational understanding of the difference between the mean (average) and the median (P50).
    -   **Section 2: Percentiles:** Introduces the concept of P90, P95, and P99 percentiles.
    -   **Section 3: All-in-one:** Tests the player on all the statistical concepts introduced in the previous sections.
2.  **Rounds:** Each section consists of 10 rounds. In each round, a new dataset and visualization are presented.

### 2.2. Core Gameplay Loop (Per Round)
1.  **Presentation:** The player is shown a data visualization and a task.
2.  **Interaction (Guessing):** The player places and adjusts guess markers on the chart.
3.  **Feedback & Scoring:** The game reveals the actual values and provides a score.
4.  **Progression:** The player moves to the next round.

---

## 3. Functional Requirements

### 3.1. Statistical Calculations
The game must accurately calculate the following statistical measures for a given dataset:
-   **Mean:** The arithmetic average of the data points.
-   **Median:** The middle value of the dataset (P50).
-   **Percentiles:** P90, P95, and P99.

### 3.2. Data Visualization
-   The game must render a chart containing:
    -   A **Density Plot** (histogram) to show the shape of the distribution.
    -   A **Scatter Plot** of all individual data points.
    -   A **Box Plot** as a hint, showing the minimum, first quartile (Q1), median, third quartile (Q3), and maximum.
-   The X & Y axes must be linear and have no markings.

### 3.3. User Interaction
-   Players must be able to place a guess by clicking on the chart.
-   Players must be able to adjust a guess by clicking and dragging the vertical guess line.
-   The game must clearly indicate which statistical measure is currently being guessed.

### 3.4. Scoring
-   The score for each guess is calculated based on the following formula:
    ```
    error = abs(guess - actual_value)
    max_error = max(dataset) - min(dataset)
    score_per_guess = max(0, 100 - (error / max_error) * 100)
    ```
-   If a hint is used, the total score for the round is halved.
-   The total score is cumulative across all rounds.

### 3.5. Game Flow
-   The "Submit Guess" button is disabled until all required guesses for the round are placed.
-   After submission, the button text changes to "Next Round."
-   The game proceeds to the next round only when the "Next Round" button is clicked.

---

## 4. Non-Functional Requirements

### 4.1. Technology Stack
-   The game must be built using only basic HTML, CSS, and JavaScript.
-   No external libraries or frameworks are to be used.

### 4.2. Performance
-   The game should load quickly and run smoothly in modern web browsers.
-   UI updates and chart redraws should be efficient to prevent lag, especially during drag interactions.

### 4.3. Usability
-   The interface should be clean, intuitive, and easy to understand for the target audience.
-   Visual feedback should be provided for all user interactions (e.g., cursor changes, button states).

---

## 5. Data Model

-   The game uses a predefined set of datasets stored in `datasets.js`.
-   The datasets are an array of arrays, where each inner array represents a round's data.
-   Each dataset contains at least 100 numerical data points.
-   The datasets include a variety of distributions (normal, skewed, bimodal) to provide a comprehensive learning experience.

---

## 6. UI Specification

### 6.1. Layout
-   The game is presented in a single, centered container on the page.
-   The layout consists of a header, a main content area (chart and legend), and a footer.

### 6.2. Header
-   Contains the game title, section title, and round progress/objective.

### 6.3. Main Content
-   **Chart Area:** Displays the canvas for the data visualization.
-   **Feedback Container:**
    -   **Legend:** Shows circular color-coded indicators for Density, Data Points, Your Guess, and Actual Value.
    -   **Feedback Message:** Displays the scoring feedback after a guess is submitted.

### 6.4. Footer
-   **Score:** Displays the cumulative score on the left.
-   **Controls:** Contains the "Get Hint" and "Submit/Next Round" buttons on the right.

### 6.5. Interactive Element States
-   **Buttons:** Have distinct styles for default, hover, and disabled states.
-   **Cursor:** Changes to indicate the current action (crosshair for guessing, grab for draggable lines, grabbing during drag).

---

## 7. Future Enhancements

-   **More Statistical Measures:** Add sections for standard deviation, variance, and other measures.
-   **Custom Datasets:** Allow users to import their own datasets to play with.
-   **Leaderboard:** A global leaderboard to encourage competition.
-   **User Accounts:** Allow users to save their progress and track their performance over time.
-   **Mobile Responsiveness:** Improve the layout and controls for a better experience on mobile devices.

---

## 8. Document History

| Version | Date       | Author        | Changes                                      |
|---------|------------|---------------|----------------------------------------------|
| 1.0     | 2025-11-07 | Gemini Agent  | Initial version of the specification document. |

#  CPU Scheduling Simulator
### Priority Scheduling vs SRTF &nbsp;|&nbsp; OS Project C1

---

## Team Members

| # | Name | Student ID |
|---|------|------------|
| 1 | Abdullah Wael | 20240589 |
| 2 | Marwan Ahmed | 20240918 |
| 3 | Philopater Elia | 20240697 |
| 4 | Dina Sayed | 20240341 |
| 5 | Shahd Khaled | 20240485 |
| 6 | Esraa Nasser | 20240128 |
| 7 | Aya Aboelhamd | [20240183] |

---

## Overview

A browser-based CPU scheduling simulator that runs **Preemptive Priority Scheduling** and **SRTF (Shortest Remaining Time First)** on the same workload simultaneously, then produces a side-by-side visual comparison with auto-generated analysis.

No backend. No frameworks. Pure HTML + CSS + Vanilla JavaScript.

---

## Requirements

- Any modern web browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- No installations required
- No internet connection required after cloning
- No build tools, no package managers, no dependencies

---

## Features

- **Dual-algorithm simulation** — Priority and SRTF run on the same input, results rendered in parallel
- **Visual Gantt charts** — Color-coded, scrollable, per-algorithm execution timeline
- **Full metrics table** — WT, TAT, RT, CT per process + averages for each algorithm
- **Comparison summary** — Side-by-side table with automatic winner detection per metric
- **Auto-generated conclusion** — Dynamic written analysis based on actual simulation output
- **Input validation** — Rejects all invalid entries with descriptive error messages
- **Quick-load scenarios** — Three preset workloads (A, B, C) matching the project rubric
- **Validation demo** — Scenario D panel to demonstrate all error cases interactively
- **Responsive layout** — Works on desktop and mobile

---

## Project Structure

```
project/
├── index.html          ← Full UI structure and layout
├── css/
│   └── style.css       ← Design tokens, components, Gantt chart styles
└── js/
    ├── logic.js        ← Pure scheduling algorithms (no DOM)
    └── script.js       ← DOM rendering, validation, event handling
```

- **`logic.js`** — Pure functions only, no DOM. Can be tested in isolation via browser console.
- **`script.js`** — UI layer only, calls `logic.js` functions, never re-implements algorithm logic.

---

## Build / Run Steps

No build step required.

```bash
git clone https://github.com/abdallah-wael-1/os-project.git
cd os-project
```

Then open `index.html` directly in any modern browser.

> If your browser blocks local file imports, use a local server:
> ```bash
> npx serve .
> # Then open http://localhost:3000
> ```

---

## Algorithms

### Priority Scheduling (Preemptive)

At every time unit, the CPU is given to the ready process with the **lowest priority number** (lower number = higher urgency). If a higher-priority process arrives while another is running, it immediately preempts it.

- **Tie-breaking rule:** Earlier arrival time → then lexicographically smaller PID.
- **Known issue:** Can cause **starvation** — a low-priority process may never run if high-priority processes keep arriving.

### SRTF — Shortest Remaining Time First (Preemptive)

At every time unit, the CPU goes to the ready process with the **shortest remaining burst time**. If a new arrival has less remaining time than the running process, it preempts immediately.

- **Tie-breaking rule:** Shorter remaining time → earlier arrival → smaller PID.
- **Proven property:** SRTF is theoretically optimal for minimizing average waiting time in a preemptive environment.

---

## Metrics

| Metric | Formula |
|--------|---------|
| Turnaround Time (TAT) | `Completion Time − Arrival Time` |
| Waiting Time (WT) | `TAT − Burst Time` |
| Response Time (RT) | `First CPU Time − Arrival Time` |

Averages are computed as the sum of each metric across all processes divided by the total number of processes.

---

## Test Scenarios

### Scenario A — Basic Mixed Workload

| PID | Arrival | Burst | Priority |
|-----|---------|-------|----------|
| P1  | 0       | 8     | 3        |
| P2  | 1       | 4     | 1        |
| P3  | 2       | 9     | 4        |
| P4  | 3       | 5     | 2        |

### Scenario B — Priority vs Burst Conflict

A high-priority process with a long burst competes against low-priority short processes.

| PID | Arrival | Burst | Priority |
|-----|---------|-------|----------|
| P1  | 0       | 15    | 1 ← highest priority |
| P2  | 1       | 2     | 5 ← lowest priority  |
| P3  | 2       | 3     | 5 ← lowest priority  |

**Priority:** P1 runs almost uninterrupted — its priority label wins every contest.  
**SRTF:** P2 and P3 preempt P1 immediately — their shorter burst times win instead.

### Scenario C — Starvation Risk

| PID | Arrival | Burst | Priority |
|-----|---------|-------|----------|
| P1  | 0       | 10    | 1        |
| P2  | 0       | 5     | 2        |
| P3  | 0       | 3     | 3        |
| P4  | 0       | 8     | 5 ← starvation risk |

### Scenario D — Validation Demo

Demonstrates all error cases via interactive buttons in the UI:

- Negative arrival time
- Burst time = 0
- Duplicate Process ID
- Non-numeric input in a numeric field
- Missing required fields
- Priority value out of range (must be 1–99)
- Running simulation with fewer than 2 processes

---

## Validation Rules

| Field | Rule |
|-------|------|
| Process ID | Unique. Letters, numbers, hyphens, underscores only. |
| Arrival Time | Number ≥ 0 |
| Burst Time | Number > 0 |
| Priority | Integer between 1 and 99 (1 = highest priority) |

All errors are displayed inline with a shake animation. The simulation will not run until all inputs are valid.

---

## Grading Checklist

| Criterion | Status |
|-----------|--------|
| Input panel with add/remove/clear 
| Process table before simulation 
| Gantt chart — Priority (separate)
| Gantt chart — SRTF (separate) 
| Results table — Priority (WT, TAT, RT + averages) 
| Results table — SRTF (WT, TAT, RT + averages) 
| Comparison summary (same workload, both algorithms) 
| Auto-generated conclusion and analysis 
| Input validation with clear error messages 
| Scenarios A, B, C quick-load 
| Scenario D validation demo
| Convention documented (lower number = higher priority)
| Tie-breaking rule documented and applied 
| Starvation risk discussed in conclusion 

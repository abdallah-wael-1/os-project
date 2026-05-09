/* ═══════════════════════════════════════════════════════════════════
   script.js — UI Layer
   ───────────────────────────────────────────────────────────────────
   THIS FILE:
     • Handles all DOM interaction, rendering, validation, and events.
     • Calls functions from logic.js — never implements algorithms here.
     • Structured in clearly separated blocks (search the ─── markers).

   DEPENDS ON:
     • logic.js loaded BEFORE this file  (see index.html script order)
     • DOM elements defined in index.html

   BLOCKS IN THIS FILE:
     1. Constants & State
     2. Preset Scenarios
     3. Color Assignment
     4. Validation
     5. Add / Remove / Clear Processes
     6. Render Process Table
     7. Status Bar Update
     8. Gantt Chart Rendering
     9. Results Table Rendering
    10. Metric Cards Rendering
    11. Comparison Table Rendering
    12. Conclusion Rendering
    13. Run Simulation (main orchestrator)
    14. Validation Demo (Scenario D)
    15. Event Listeners & Init
══════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────
   1. CONSTANTS & STATE
─────────────────────────────────────────────────────────────────── */

/* Global list of process objects. Each: { pid, at, bt, pri } */
let processes = [];

/* Maps pid → color index (assigned round-robin) */
let colorMap = {};

/* CSS class names for PID badges and Gantt bars */
const COLORS = ['p-c0','p-c1','p-c2','p-c3','p-c4','p-c5','p-c6','p-c7'];

/* Solid hex values matching the CSS classes above — used for Gantt bar backgrounds */
const COLOR_HEX = [
  '#00d4c8', /* cyan   */
  '#f5a623', /* amber  */
  '#3dd68c', /* green  */
  '#a78bfa', /* purple */
  '#f472b6', /* pink   */
  '#fbbf24', /* yellow */
  '#34d399', /* teal   */
  '#6366f1', /* indigo */
];

/* Width in pixels for each 1-unit time slot in Gantt charts */
const PX_PER_UNIT = 36;


/* ───────────────────────────────────────────────────────────────────
   2. PRESET SCENARIOS
   These match the required test cases from the project rubric.
─────────────────────────────────────────────────────────────────── */
const SCENARIOS = {
  /* Scenario A: basic mixed workload — different arrival + burst times */
  A: [
    { pid: 'P1', at: 0, bt: 8, pri: 3 },
    { pid: 'P2', at: 1, bt: 4, pri: 1 },
    { pid: 'P3', at: 2, bt: 9, pri: 4 },
    { pid: 'P4', at: 3, bt: 5, pri: 2 },
  ],
  /* Scenario B: conflict — high-priority long process vs low-priority short processes
     Priority: P1 runs almost uninterrupted (priority label wins)
     SRTF:     P2 and P3 preempt P1 immediately (shorter burst wins) */
  B: [
    { pid: 'P1', at: 0, bt: 15, pri: 1 },  /* highest priority, long burst  */
    { pid: 'P2', at: 1, bt: 2,  pri: 5 },  /* lowest priority,  short burst */
    { pid: 'P3', at: 2, bt: 3,  pri: 5 },  /* lowest priority,  short burst */
  ],
  /* Scenario C: starvation risk — P4 has very low priority and long burst */
  C: [
    { pid: 'P1', at: 0, bt: 10, pri: 1 },
    { pid: 'P2', at: 0, bt: 5,  pri: 2 },
    { pid: 'P3', at: 0, bt: 3,  pri: 3 },
    { pid: 'P4', at: 0, bt: 8,  pri: 5 },  /* starvation candidate */
  ],
};

/**
 * Load a preset scenario into the process list.
 * Clears any current processes first.
 */
function loadScenario(key) {
  processes = SCENARIOS[key].map(p => ({ ...p })); /* shallow copy each process */
  assignColors();
  renderProcessTable();
  document.getElementById('resultsSection').style.display = 'none';
  updateStatusBar();
  showError('');
}


/* ───────────────────────────────────────────────────────────────────
   3. COLOR ASSIGNMENT
   Assigns a color index to each PID, cycling through COLORS array.
─────────────────────────────────────────────────────────────────── */
function assignColors() {
  colorMap = {};
  processes.forEach((p, i) => {
    colorMap[p.pid] = i % COLORS.length;
  });
}


/* ───────────────────────────────────────────────────────────────────
   4. VALIDATION
─────────────────────────────────────────────────────────────────── */

/**
 * Validates a single process entry before adding it to the list.
 * Returns an error string, or null if valid.
 *
 * Rules:
 *   - All fields must be filled
 *   - PID: alphanumeric + hyphen/underscore only
 *   - Arrival Time: number ≥ 0
 *   - Burst Time: number > 0
 *   - Priority: integer 1–99
 *   - No duplicate PIDs
 */
function validateInput(pid, at, bt, pri) {
  /* Empty check */
  if (!pid || at === '' || bt === '' || pri === '') {
    return 'Please fill all fields (PID, Arrival Time, Burst Time, Priority)';
  }

  /* PID format */
  if (!/^[A-Za-z0-9_-]+$/.test(pid)) {
    return 'Invalid PID: use letters, numbers, hyphens, or underscores only';
  }

  /* Numeric format checks */
  if (!/^-?\d+(\.\d+)?$/.test(at))  return 'Invalid Arrival Time — must be a number';
  if (!/^-?\d+(\.\d+)?$/.test(bt))  return 'Invalid Burst Time — must be a number';
  if (!/^\d+$/.test(pri))           return 'Invalid Priority — must be a whole number';

  /* Range checks */
  const atN  = parseFloat(at);
  const btN  = parseFloat(bt);
  const priN = parseInt(pri, 10);

  if (atN < 0)             return 'Arrival Time cannot be negative';
  if (btN <= 0)            return 'Burst Time must be greater than zero';
  if (priN < 1 || priN > 99) return 'Priority must be between 1 and 99 (1 = highest)';

  /* Duplicate PID */
  if (processes.some(p => p.pid === pid)) {
    return `Duplicate Process ID: "${pid}" already exists in the process list`;
  }

  return null; /* no error */
}

/**
 * Show or hide an error message element.
 * @param {string} msg   - empty string to hide
 * @param {string} elId  - ID of the .error-msg element
 */
function showError(msg, elId = 'errorMsg') {
  const el = document.getElementById(elId);
  el.textContent = msg;
  if (msg) {
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}


/* ───────────────────────────────────────────────────────────────────
   5. ADD / REMOVE / CLEAR PROCESSES
─────────────────────────────────────────────────────────────────── */

/**
 * Read the form fields, validate, and push a new process to the list.
 * Called by the "+ Add" button and Enter key handler.
 */
function addProcess() {
  const pid = document.getElementById('inPid').value.trim().toUpperCase();
  const at  = document.getElementById('inAt').value.trim();
  const bt  = document.getElementById('inBt').value.trim();
  const pri = document.getElementById('inPri').value.trim();

  const error = validateInput(pid, at, bt, pri);
  if (error) {
    showError(error);
    return;
  }

  showError('');
  processes.push({ pid, at: parseFloat(at), bt: parseFloat(bt), pri: parseInt(pri, 10) });

  assignColors();
  renderProcessTable();

  /* Clear inputs and return focus to PID field */
  document.getElementById('inPid').value = '';
  document.getElementById('inAt').value  = '';
  document.getElementById('inBt').value  = '';
  document.getElementById('inPri').value = '';
  document.getElementById('inPid').focus();

  updateStatusBar();
}

/**
 * Remove a process by its index in the processes array.
 * Called by the ✕ button in each table row.
 */
function removeProcess(idx) {
  processes.splice(idx, 1);
  assignColors();
  renderProcessTable();
  updateStatusBar();
}

/**
 * Wipe the entire process list and reset the UI.
 */
function clearAll() {
  processes = [];
  colorMap  = {};
  renderProcessTable();
  document.getElementById('resultsSection').style.display = 'none';
  updateStatusBar();
  showError('');
}


/* ───────────────────────────────────────────────────────────────────
   6. RENDER PROCESS TABLE
   Rebuilds the tbody of the input-section process table.
─────────────────────────────────────────────────────────────────── */
function renderProcessTable() {
  const tbody = document.getElementById('procTableBody');
  document.getElementById('procCount').textContent =
    processes.length + ' process' + (processes.length !== 1 ? 'es' : '');

  if (!processes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="icon">◻</div>
            No processes yet. Add at least 2 to simulate.
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = processes.map((p, i) => {
    const colorClass = COLORS[colorMap[p.pid]];
    return `
      <tr>
        <td><span class="pid-badge ${colorClass}">${p.pid}</span></td>
        <td>${p.at}</td>
        <td>${p.bt}</td>
        <td>${p.pri}</td>
        <td style="text-align:right">
          <button class="btn btn-red"
                  style="padding:3px 10px; font-size:11px"
                  onclick="removeProcess(${i})">✕</button>
        </td>
      </tr>`;
  }).join('');
}


/* ───────────────────────────────────────────────────────────────────
   7. STATUS BAR UPDATE
   Updates the colored dot and text at the bottom of the input section.
─────────────────────────────────────────────────────────────────── */
function updateStatusBar() {
  const dot    = document.getElementById('inputStatusDot');
  const status = document.getElementById('inputStatus');

  if (processes.length === 0) {
    dot.style.background = 'var(--text3)';
    status.textContent   = 'Waiting for input';
  } else if (processes.length === 1) {
    dot.style.background = 'var(--amber)';
    status.textContent   = 'Need at least 1 more process';
  } else {
    dot.style.background = 'var(--green)';
    status.textContent   = `${processes.length} processes ready — click Run Simulation`;
  }
}


/* ───────────────────────────────────────────────────────────────────
   8. GANTT CHART RENDERING
─────────────────────────────────────────────────────────────────── */

/**
 * Compress the raw gantt array (one entry per time unit) into
 * contiguous segments for display.
 *
 * Input:  [{ t:0, pid:'P1' }, { t:1, pid:'P1' }, { t:2, pid:'P2' }]
 * Output: [{ pid:'P1', start:0, end:2 }, { pid:'P2', start:2, end:3 }]
 */
function compressGantt(gantt) {
  const segments = [];
  gantt.forEach(g => {
    const last = segments[segments.length - 1];
    if (last && last.pid === g.pid) {
      last.end = g.t + 1;  /* extend current segment */
    } else {
      segments.push({ pid: g.pid, start: g.t, end: g.t + 1 });
    }
  });
  return segments;
}

/**
 * Build and inject the Gantt chart HTML into the given container element.
 *
 * @param {Array}  gantt       - raw gantt array from runPriority / runSRTF
 * @param {string} containerId - id of the .gantt-container div in index.html
 */
function renderGantt(gantt, containerId) {
  const segments  = compressGantt(gantt);
  const totalTime = segments.length ? segments[segments.length - 1].end : 0;
  const container = document.getElementById(containerId);

  /* ── Bars row ── */
  let barsHtml = '';
  segments.forEach(seg => {
    const width = (seg.end - seg.start) * PX_PER_UNIT;
    const isIdle = seg.pid === 'IDLE';

    let barStyle = `width:${width}px`;
    if (!isIdle) {
      const hexColor = COLOR_HEX[colorMap[seg.pid] % COLOR_HEX.length];
      barStyle += `; background:${hexColor}33; color:${hexColor}; border: 1px solid ${hexColor}66`;
    }

    const cls   = isIdle ? 'gantt-bar idle' : 'gantt-bar';
    const title = `${seg.pid}: t=${seg.start} → t=${seg.end} (${seg.end - seg.start} unit${seg.end - seg.start !== 1 ? 's' : ''})`;
    barsHtml += `<div class="${cls}" style="${barStyle}" title="${title}">${seg.pid}</div>`;
  });

  /* ── Time markers row ── */
  let timesHtml = '';
  for (let t = 0; t <= totalTime; t++) {
    timesHtml += `<div class="gantt-time-mark" style="width:${PX_PER_UNIT}px">${t}</div>`;
  }

  container.innerHTML = `
    <div class="gantt-bars">${barsHtml}</div>
    <div class="gantt-times">${timesHtml}</div>
  `;
}


/* ───────────────────────────────────────────────────────────────────
   9. RESULTS TABLE RENDERING
   Builds the per-process metrics table and returns averages.
─────────────────────────────────────────────────────────────────── */

/**
 * Render the results table for one algorithm.
 *
 * @param {Array}  metrics  - output of computeMetrics() from logic.js
 * @param {string} tableId  - id of the <table> element to populate
 * @returns {{ avgWT, avgTAT, avgRT }}
 */
function renderResultsTable(metrics, tableId) {
  const avgs = computeAverages(metrics); /* from logic.js */

  const headerHtml = `
    <thead>
      <tr>
        <th>Process</th>
        <th>AT</th>
        <th>BT</th>
        <th>Priority</th>
        <th>CT</th>
        <th>TAT</th>
        <th>WT</th>
        <th>RT</th>
      </tr>
    </thead>`;

  const rowsHtml = metrics.map(m => {
    const colorClass = COLORS[colorMap[m.pid] % COLORS.length];
    return `
      <tr>
        <td><span class="pid-badge ${colorClass}">${m.pid}</span></td>
        <td>${m.at}</td>
        <td>${m.bt}</td>
        <td>${m.pri}</td>
        <td>${m.ct}</td>
        <td>${m.tat}</td>
        <td style="color:var(--cyan)">${m.wt}</td>
        <td style="color:var(--amber)">${m.rt}</td>
      </tr>`;
  }).join('');

  /* Average row — highlighted by CSS (.results-table tr:last-child) */
  const avgRowHtml = `
    <tr>
      <td colspan="5" style="text-align:right; font-size:11px; color:var(--text3)">
        AVERAGES →
      </td>
      <td>${avgs.avgTAT.toFixed(2)}</td>
      <td>${avgs.avgWT.toFixed(2)}</td>
      <td>${avgs.avgRT.toFixed(2)}</td>
    </tr>`;

  document.getElementById(tableId).innerHTML =
    headerHtml + '<tbody>' + rowsHtml + avgRowHtml + '</tbody>';

  return avgs;
}


/* ───────────────────────────────────────────────────────────────────
   10. METRIC CARDS RENDERING
   Four summary cards above each results table.
─────────────────────────────────────────────────────────────────── */

/**
 * @param {{ avgWT, avgTAT, avgRT }} avgs
 * @param {string} containerId  - id of the .grid4 div
 * @param {string} theme        - 'cyan' (Priority) or 'amber' (SRTF)
 */
function renderMetricCards(avgs, containerId, theme) {
  const c1 = theme === 'cyan' ? 'cyan'   : 'amber';
  const c2 = theme === 'cyan' ? 'amber'  : 'purple';
  const c3 = theme === 'cyan' ? 'green'  : 'cyan';

  document.getElementById(containerId).innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Avg Wait</div>
      <div class="metric-val ${c1}">${avgs.avgWT.toFixed(2)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg TAT</div>
      <div class="metric-val ${c2}">${avgs.avgTAT.toFixed(2)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg RT</div>
      <div class="metric-val ${c3}">${avgs.avgRT.toFixed(2)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Processes</div>
      <div class="metric-val purple">${processes.length}</div>
    </div>`;
}


/* ───────────────────────────────────────────────────────────────────
   11. COMPARISON TABLE RENDERING
─────────────────────────────────────────────────────────────────── */

/**
 * Build the winner badge HTML for a metric comparison.
 * lowerIsBetter = true for WT, TAT, RT.
 */
function _winnerBadge(pVal, sVal, lowerIsBetter = true) {
  if (pVal === sVal) {
    return '<span class="winner-badge" style="background:var(--surface);color:var(--text3)">Tie</span>';
  }
  const priorityWins = lowerIsBetter ? pVal < sVal : pVal > sVal;
  if (priorityWins) {
    return '<span class="winner-badge" style="background:var(--cyan-dim);color:var(--cyan)">Priority</span>';
  }
  return '<span class="winner-badge" style="background:var(--amber-dim);color:var(--amber)">SRTF</span>';
}

/**
 * @param {{ avgWT, avgTAT, avgRT }} pAvgs  - Priority averages
 * @param {{ avgWT, avgTAT, avgRT }} sAvgs  - SRTF averages
 */
function renderComparison(pAvgs, sAvgs) {
  document.getElementById('comparisonArea').innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th style="color:var(--text3)">Metric</th>
          <th>◆ Priority</th>
          <th>◆ SRTF</th>
          <th style="text-align:center">Winner</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Average Waiting Time</td>
          <td style="color:var(--cyan)">${pAvgs.avgWT.toFixed(2)} units</td>
          <td style="color:var(--amber)">${sAvgs.avgWT.toFixed(2)} units</td>
          <td style="text-align:center">${_winnerBadge(pAvgs.avgWT, sAvgs.avgWT)}</td>
        </tr>
        <tr>
          <td>Average Turnaround Time</td>
          <td style="color:var(--cyan)">${pAvgs.avgTAT.toFixed(2)} units</td>
          <td style="color:var(--amber)">${sAvgs.avgTAT.toFixed(2)} units</td>
          <td style="text-align:center">${_winnerBadge(pAvgs.avgTAT, sAvgs.avgTAT)}</td>
        </tr>
        <tr>
          <td>Average Response Time</td>
          <td style="color:var(--cyan)">${pAvgs.avgRT.toFixed(2)} units</td>
          <td style="color:var(--amber)">${sAvgs.avgRT.toFixed(2)} units</td>
          <td style="text-align:center">${_winnerBadge(pAvgs.avgRT, sAvgs.avgRT)}</td>
        </tr>
        <tr>
          <td>Fairness to urgent processes</td>
          <td style="color:var(--cyan)">High — enforces priority labels</td>
          <td style="color:var(--amber)">Depends on burst time</td>
          <td style="text-align:center">
            <span class="winner-badge" style="background:var(--cyan-dim);color:var(--cyan)">Priority</span>
          </td>
        </tr>
        <tr>
          <td>Optimal avg WT (theoretically proven)</td>
          <td style="color:var(--text3)">No</td>
          <td style="color:var(--amber)">Yes</td>
          <td style="text-align:center">
            <span class="winner-badge" style="background:var(--amber-dim);color:var(--amber)">SRTF</span>
          </td>
        </tr>
        <tr>
          <td>Starvation risk</td>
          <td style="color:var(--red)">Low-priority processes</td>
          <td style="color:var(--red)">Long-burst processes</td>
          <td style="text-align:center">
            <span class="winner-badge" style="background:var(--surface);color:var(--text3)">Both</span>
          </td>
        </tr>
      </tbody>
    </table>`;
}


/* ───────────────────────────────────────────────────────────────────
   12. CONCLUSION RENDERING
   Auto-generated analysis based on actual simulation results.
─────────────────────────────────────────────────────────────────── */

/**
 * @param {{ avgWT, avgTAT, avgRT }} pAvgs
 * @param {{ avgWT, avgTAT, avgRT }} sAvgs
 */
function renderConclusion(pAvgs, sAvgs) {
  function winner(pVal, sVal) {
    if (pVal < sVal) return 'Priority Scheduling';
    if (pVal > sVal) return 'SRTF';
    return 'both algorithms (tie)';
  }

  const wtWinner  = winner(pAvgs.avgWT,  sAvgs.avgWT);
  const tatWinner = winner(pAvgs.avgTAT, sAvgs.avgTAT);
  const rtWinner  = winner(pAvgs.avgRT,  sAvgs.avgRT);

  const overallWTWinner = sAvgs.avgWT  <= pAvgs.avgWT  ? 'SRTF' : 'Priority Scheduling';
  const overallRTWinner = pAvgs.avgRT  <= sAvgs.avgRT  ? 'Priority Scheduling' : 'SRTF';

  document.getElementById('conclusionArea').innerHTML = `
    <div class="conclusion-box">
      <strong>1. Performance Comparison</strong><br>
      <b>${wtWinner}</b> produced the lower average waiting time
      (Priority: ${pAvgs.avgWT.toFixed(2)}, SRTF: ${sAvgs.avgWT.toFixed(2)},
      difference: ${Math.abs(pAvgs.avgWT - sAvgs.avgWT).toFixed(2)} units).<br>
      <b>${tatWinner}</b> produced the lower average turnaround time
      (Priority: ${pAvgs.avgTAT.toFixed(2)}, SRTF: ${sAvgs.avgTAT.toFixed(2)}).<br>
      <b>${rtWinner}</b> produced the lower average response time
      (Priority: ${pAvgs.avgRT.toFixed(2)}, SRTF: ${sAvgs.avgRT.toFixed(2)}).
    </div>

    <div class="conclusion-box amber">
      <strong>2. Main Trade-off</strong><br>
      <b>Priority Scheduling</b> is <em>policy-driven</em>: it serves processes according to
      urgency labels, making it ideal for real-time systems where some tasks must always take
      precedence — regardless of their burst length. It does NOT optimize average waiting time.<br><br>
      <b>SRTF</b> is <em>length-driven</em>: it always picks the shortest remaining job, which is
      mathematically proven to minimize average waiting time in a preemptive setting. It is best
      for batch processing systems focused on throughput, but it completely ignores urgency.
    </div>

    <div class="conclusion-box green">
      <strong>3. Fairness Analysis</strong><br>
      <b>Priority Scheduling</b> can cause starvation for low-priority processes: if high-priority
      processes keep arriving, low-priority ones may wait indefinitely (visible in Scenario C with P4).<br><br>
      <b>SRTF</b> starves long-burst processes: short jobs continuously preempt them. P4 in
      Scenario C is also heavily delayed under SRTF — but for a different reason: its long burst
      time always makes it lose the selection contest.
    </div>

    <div class="conclusion-box purple">
      <strong>4. Recommendation for This Dataset</strong><br>
      • Use <b>Priority Scheduling</b> when tasks have defined urgency levels
        (e.g., real-time control, OS interrupt handling, medical monitoring).<br>
      • Use <b>SRTF</b> when minimizing average wait time and maximizing throughput matters
        and all jobs are treated as equally important.<br><br>
      For this specific workload: <b>${overallWTWinner}</b> had the lower average waiting time
      (${Math.min(pAvgs.avgWT, sAvgs.avgWT).toFixed(2)} units), while
      <b>${overallRTWinner}</b> had the lower average response time
      (${Math.min(pAvgs.avgRT, sAvgs.avgRT).toFixed(2)} units).
    </div>`;
}


/* ───────────────────────────────────────────────────────────────────
   13. RUN SIMULATION  (main orchestrator)
   Called by the "▶ Run Simulation" button.
   Calls logic.js functions → then calls render functions above.
─────────────────────────────────────────────────────────────────── */
function runSimulation() {
  if (processes.length < 2) {
    showError('Enter at least 2 processes before running the simulation');
    return;
  }
  showError('');

  const pResult = runPriority(processes);
  const sResult = runSRTF(processes);

  const pMetrics = computeMetrics(processes, pResult.ct, pResult.started);
  const sMetrics = computeMetrics(processes, sResult.ct, sResult.started);

  renderGantt(pResult.gantt, 'ganttPriority');
  renderGantt(sResult.gantt, 'ganttSRTF');

  const pAvgs = renderResultsTable(pMetrics, 'tablePriority');
  const sAvgs = renderResultsTable(sMetrics, 'tableSRTF');

  renderMetricCards(pAvgs, 'metricsPriority', 'cyan');
  renderMetricCards(sAvgs, 'metricsSRTF',     'amber');

  renderComparison(pAvgs, sAvgs);
  renderConclusion(pAvgs, sAvgs);

  const resultsSection = document.getElementById('resultsSection');
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  ['step1','step2','step3','step4','step5'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active');
    el.classList.add('done');
  });
}


/* ───────────────────────────────────────────────────────────────────
   14. VALIDATION DEMO  (Scenario D)
   Shows specific error messages without touching the main form.
─────────────────────────────────────────────────────────────────── */
const DEMO_ERRORS = {
  neg_at:    'Arrival Time cannot be negative — entered: AT = -1',
  zero_bt:   'Burst Time must be greater than zero — entered: BT = 0',
  dup_pid:   'Duplicate Process ID: "P1" already exists in the process list',
  letters:   'Invalid Burst Time — must be a number, not "abc"',
  missing:   'Please fill all fields — Priority value is required',
  bad_pri:   'Priority must be between 1 and 99 — entered: 150',
  few_procs: 'Enter at least 2 processes to run a meaningful comparison',
};

function demoError(type) {
  const el = document.getElementById('demoErrorMsg');
  el.textContent = '⚠ Validation Error: ' + DEMO_ERRORS[type];
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/* ───────────────────────────────────────────────────────────────────
   15. EVENT LISTENERS & INIT
─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  ['inPid', 'inAt', 'inBt', 'inPri'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addProcess();
    });
  });

  updateStatusBar();
});
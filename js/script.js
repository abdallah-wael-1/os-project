let processes = [];
let colorMap = {};

const COLORS = ['p-c0','p-c1','p-c2','p-c3','p-c4','p-c5','p-c6','p-c7'];

const COLOR_HEX = [
  '#00d4c8',
  '#f5a623',
  '#3dd68c',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#6366f1',
];

const PX_PER_UNIT = 36;


const SCENARIOS = {
  A: [
    { pid: 'P1', at: 0, bt: 8, pri: 3 },
    { pid: 'P2', at: 1, bt: 4, pri: 1 },
    { pid: 'P3', at: 2, bt: 9, pri: 4 },
    { pid: 'P4', at: 3, bt: 5, pri: 2 },
  ],
  B: [
    { pid: 'P1', at: 0, bt: 15, pri: 1 },
    { pid: 'P2', at: 1, bt: 2,  pri: 5 },
    { pid: 'P3', at: 2, bt: 3,  pri: 5 },
  ],
  C: [
    { pid: 'P1', at: 0, bt: 10, pri: 1 },
    { pid: 'P2', at: 0, bt: 5,  pri: 2 },
    { pid: 'P3', at: 0, bt: 3,  pri: 3 },
    { pid: 'P4', at: 0, bt: 8,  pri: 5 },
  ],
};

function loadScenario(key) {
  processes = SCENARIOS[key].map(p => ({ ...p }));
  assignColors();
  renderProcessTable();
  document.getElementById('resultsSection').style.display = 'none';
  updateStatusBar();
  showError('');
}


function assignColors() {
  colorMap = {};
  processes.forEach((p, i) => {
    colorMap[p.pid] = i % COLORS.length;
  });
}


function validateInput(pid, at, bt, pri) {
  if (!pid || at === '' || bt === '' || pri === '') {
    return 'Please fill all fields (PID, Arrival Time, Burst Time, Priority)';
  }

  if (!/^[A-Za-z0-9_-]+$/.test(pid)) {
    return 'Invalid PID: use letters, numbers, hyphens, or underscores only';
  }

  if (!/^-?\d+(\.\d+)?$/.test(at))  return 'Invalid Arrival Time — must be a number';
  if (!/^-?\d+(\.\d+)?$/.test(bt))  return 'Invalid Burst Time — must be a number';
  if (!/^\d+$/.test(pri))           return 'Invalid Priority — must be a whole number';

  const atN  = parseFloat(at);
  const btN  = parseFloat(bt);
  const priN = parseInt(pri, 10);

  if (atN < 0)             return 'Arrival Time cannot be negative';
  if (btN <= 0)            return 'Burst Time must be greater than zero';
  if (priN < 1 || priN > 99) return 'Priority must be between 1 and 99 (1 = highest)';

  if (processes.some(p => p.pid === pid)) {
    return `Duplicate Process ID: "${pid}" already exists in the process list`;
  }

  return null;
}

function showError(msg, elId = 'errorMsg') {
  const el = document.getElementById(elId);
  el.textContent = msg;
  if (msg) {
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}


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

  document.getElementById('inPid').value = '';
  document.getElementById('inAt').value  = '';
  document.getElementById('inBt').value  = '';
  document.getElementById('inPri').value = '';
  document.getElementById('inPid').focus();

  updateStatusBar();
}

function removeProcess(idx) {
  processes.splice(idx, 1);
  assignColors();
  renderProcessTable();
  updateStatusBar();
}

function clearAll() {
  processes = [];
  colorMap  = {};
  renderProcessTable();
  document.getElementById('resultsSection').style.display = 'none';
  updateStatusBar();
  showError('');
}


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


function compressGantt(gantt) {
  const segments = [];
  gantt.forEach(g => {
    const last = segments[segments.length - 1];
    if (last && last.pid === g.pid) {
      last.end = g.t + 1;
    } else {
      segments.push({ pid: g.pid, start: g.t, end: g.t + 1 });
    }
  });
  return segments;
}

function renderGantt(gantt, containerId) {
  const segments  = compressGantt(gantt);
  const totalTime = segments.length ? segments[segments.length - 1].end : 0;
  const container = document.getElementById(containerId);

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

  let timesHtml = '';
  for (let t = 0; t <= totalTime; t++) {
    timesHtml += `<div class="gantt-time-mark" style="width:${PX_PER_UNIT}px">${t}</div>`;
  }

  container.innerHTML = `
    <div class="gantt-bars">${barsHtml}</div>
    <div class="gantt-times">${timesHtml}</div>
  `;
}


function renderResultsTable(metrics, tableId) {
  const avgs = computeAverages(metrics);

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


document.addEventListener('DOMContentLoaded', () => {
  ['inPid', 'inAt', 'inBt', 'inPri'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addProcess();
    });
  });

  updateStatusBar();
});
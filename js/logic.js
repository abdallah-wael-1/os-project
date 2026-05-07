/* ═══════════════════════════════════════════════════════════════════
   logic.js — CPU Scheduling Algorithms
   ───────────────────────────────────────────────────────────────────
   THIS FILE:
     • Contains ONLY pure functions — no DOM, no document, no HTML.
     • Receives data in, returns results out.
     • Completely testable in isolation (paste in browser console).

   EXPORTS (global, consumed by script.js):
     • runPriority(procs)   → { gantt, ct, started }
     • runSRTF(procs)       → { gantt, ct, started }
     • computeMetrics(procs, ct, started) → metrics[]
     • computeAverages(metrics) → { avgWT, avgTAT, avgRT }

   INPUT FORMAT (each process object):
     { pid: string, at: number, bt: number, pri: number }
      pid  = process ID (unique)
      at   = arrival time  (≥ 0)
      bt   = burst time    (> 0)
      pri  = priority      (1 = highest, 99 = lowest)

   GANTT FORMAT (output):
     Array of { t: number, pid: string }
     One entry per time unit.
     pid = 'IDLE' when no process is ready.
══════════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────────
   HELPER — safe upper bound for simulation loop
   Prevents infinite loops on bad input.
─────────────────────────────────────────────────────────────────── */
function _maxTime(procs) {
  const totalBurst  = procs.reduce((sum, p) => sum + p.bt, 0);
  const maxArrival  = Math.max(...procs.map(p => p.at));
  return totalBurst + maxArrival + 10; /* +10 = safety buffer */
}


/* ───────────────────────────────────────────────────────────────────
   HELPER — tie-breaking comparator used by both algorithms
   When two processes are equally eligible, we pick:
     1. Lower priority number (Priority algo) or shorter remaining time (SRTF) — done by caller
     2. Earlier arrival time
     3. Lexicographically smaller PID (stable, deterministic)
─────────────────────────────────────────────────────────────────── */
function _tieBreak(a, b) {
  /* a and b are { i, p } objects where p is the original process */
  if (a.p.at !== b.p.at) return a.p.at - b.p.at;
  return a.p.pid.localeCompare(b.p.pid);
}


/* ═══════════════════════════════════════════════════════════════════
   ALGORITHM 1 — PRIORITY SCHEDULING  (Preemptive)
   ───────────────────────────────────────────────────────────────────
   How it works:
   • At each time unit, pick the READY process with the LOWEST
     priority number (lower number = higher urgency).
   • If a higher-priority process arrives mid-execution, the running
     process is immediately preempted.
   • Tie-breaking: earlier arrival → smaller PID.

   Parameters:
     procs — array of process objects (original, not mutated)

   Returns:
     gantt   — array of { t, pid }, one per time unit
     ct      — array of completion times, indexed by process index
     started — array of first-CPU times, indexed by process index
══════════════════════════════════════════════════════════════════ */
function runPriority(procs) {
  const n       = procs.length;
  const rem     = procs.map(p => p.bt);          /* remaining burst time per process */
  const started = new Array(n).fill(-1);          /* -1 = not yet started */
  const ct      = new Array(n).fill(0);           /* completion times */
  const gantt   = [];

  let time = 0;
  let done = 0;
  const limit = _maxTime(procs);

  while (done < n && time < limit) {

    /* Build ready queue: processes that have arrived and still have work left */
    const ready = procs
      .map((p, i) => ({ i, p }))
      .filter(({ i, p }) => p.at <= time && rem[i] > 0);

    /* CPU is idle — no process ready yet */
    if (ready.length === 0) {
      gantt.push({ t: time, pid: 'IDLE' });
      time++;
      continue;
    }

    /* Select process: lowest priority number wins */
    ready.sort((a, b) => {
      if (a.p.pri !== b.p.pri) return a.p.pri - b.p.pri;  /* main criterion */
      return _tieBreak(a, b);                               /* tie-break */
    });

    const sel = ready[0];

    /* Record first time this process gets the CPU */
    if (started[sel.i] === -1) started[sel.i] = time;

    /* Execute one time unit */
    gantt.push({ t: time, pid: sel.p.pid });
    rem[sel.i]--;
    time++;

    /* Process finished */
    if (rem[sel.i] === 0) {
      ct[sel.i] = time;
      done++;
    }
  }

  return { gantt, ct, started };
}


/* ═══════════════════════════════════════════════════════════════════
   ALGORITHM 2 — SRTF  (Shortest Remaining Time First)
   ───────────────────────────────────────────────────────────────────
   How it works:
   • At each time unit, pick the READY process with the SMALLEST
     remaining burst time.
   • If a new process arrives with less remaining time than the
     currently running process, preempt immediately.
   • Tie-breaking: smaller remaining time → earlier arrival → smaller PID.
   • Proven optimal for minimizing average waiting time.

   Parameters / Returns: same structure as runPriority.
══════════════════════════════════════════════════════════════════ */
function runSRTF(procs) {
  const n       = procs.length;
  const rem     = procs.map(p => p.bt);
  const started = new Array(n).fill(-1);
  const ct      = new Array(n).fill(0);
  const gantt   = [];

  let time = 0;
  let done = 0;
  const limit = _maxTime(procs);

  while (done < n && time < limit) {

    const ready = procs
      .map((p, i) => ({ i, p }))
      .filter(({ i, p }) => p.at <= time && rem[i] > 0);

    if (ready.length === 0) {
      gantt.push({ t: time, pid: 'IDLE' });
      time++;
      continue;
    }

    /* Select process: shortest remaining time wins */
    ready.sort((a, b) => {
      if (rem[a.i] !== rem[b.i]) return rem[a.i] - rem[b.i];  /* main criterion */
      return _tieBreak(a, b);                                   /* tie-break */
    });

    const sel = ready[0];

    if (started[sel.i] === -1) started[sel.i] = time;

    gantt.push({ t: time, pid: sel.p.pid });
    rem[sel.i]--;
    time++;

    if (rem[sel.i] === 0) {
      ct[sel.i] = time;
      done++;
    }
  }

  return { gantt, ct, started };
}


/* ═══════════════════════════════════════════════════════════════════
   METRICS — Per-process calculations
   ───────────────────────────────────────────────────────────────────
   Formulas:
     TAT = Completion Time − Arrival Time
     WT  = TAT − Burst Time
     RT  = First CPU Time − Arrival Time

   Parameters:
     procs   — original process array
     ct      — completion times from runPriority / runSRTF
     started — first CPU times from runPriority / runSRTF

   Returns:
     Array of { pid, at, bt, pri, ct, tat, wt, rt }
══════════════════════════════════════════════════════════════════ */
function computeMetrics(procs, ct, started) {
  return procs.map((p, i) => {
    const tat = ct[i] - p.at;
    const wt  = tat - p.bt;
    const rt  = started[i] - p.at;
    return { pid: p.pid, at: p.at, bt: p.bt, pri: p.pri, ct: ct[i], tat, wt, rt };
  });
}


/* ═══════════════════════════════════════════════════════════════════
   AVERAGES — Summary statistics
   ───────────────────────────────────────────────────────────────────
   Parameter:
     metrics — output of computeMetrics()

   Returns:
     { avgWT, avgTAT, avgRT }  — all as floating point numbers
══════════════════════════════════════════════════════════════════ */
function computeAverages(metrics) {
  const n      = metrics.length;
  const avgWT  = metrics.reduce((s, m) => s + m.wt,  0) / n;
  const avgTAT = metrics.reduce((s, m) => s + m.tat, 0) / n;
  const avgRT  = metrics.reduce((s, m) => s + m.rt,  0) / n;
  return { avgWT, avgTAT, avgRT };
}
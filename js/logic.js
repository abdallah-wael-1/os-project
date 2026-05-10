function _maxTime(procs) {
  const totalBurst = procs.reduce((sum, p) => sum + p.bt, 0);
  const maxArrival = Math.max(...procs.map(p => p.at));
  return totalBurst + maxArrival + 10;
}

function _tieBreak(a, b) {
  if (a.p.at !== b.p.at) return a.p.at - b.p.at;
  return a.p.pid.localeCompare(b.p.pid);
}

function runPriority(procs) {
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

    ready.sort((a, b) => {
      if (a.p.pri !== b.p.pri) return a.p.pri - b.p.pri;
      return _tieBreak(a, b);
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

    ready.sort((a, b) => {
      if (rem[a.i] !== rem[b.i]) return rem[a.i] - rem[b.i];
      return _tieBreak(a, b);
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

function computeMetrics(procs, ct, started) {
  return procs.map((p, i) => {
    const tat = ct[i] - p.at;
    const wt  = tat - p.bt;
    const rt  = started[i] - p.at;
    return { pid: p.pid, at: p.at, bt: p.bt, pri: p.pri, ct: ct[i], tat, wt, rt };
  });
}

function computeAverages(metrics) {
  const n      = metrics.length;
  const avgWT  = metrics.reduce((s, m) => s + m.wt,  0) / n;
  const avgTAT = metrics.reduce((s, m) => s + m.tat, 0) / n;
  const avgRT  = metrics.reduce((s, m) => s + m.rt,  0) / n;
  return { avgWT, avgTAT, avgRT };
}
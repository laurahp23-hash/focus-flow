const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const RING_CIRCUMFERENCE = 2 * Math.PI * 110;
const STORAGE_KEY = 'focusflow_state_v1';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const defaults = {
    mode: 'focus',
    remaining: DURATIONS.focus,
    running: false,
    focusCyclesCompleted: 0,
    tasks: [],
    activeTaskId: null,
    sessionsToday: 0,
    sessionsDate: todayStr(),
    streak: 0,
    lastActiveDay: null,
  };
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    const merged = { ...defaults, ...parsed };
    if (merged.sessionsDate !== todayStr()) {
      merged.sessionsToday = 0;
      merged.sessionsDate = todayStr();
    }
    merged.running = false;
    return merged;
  } catch {
    return defaults;
  }
}

let state = loadState();
let tickHandle = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const timeDisplay = document.getElementById('timeDisplay');
const ringProgress = document.getElementById('ringProgress');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const sessionsToday = document.getElementById('sessionsToday');
const streakCount = document.getElementById('streakCount');
const activeTaskLabel = document.getElementById('activeTaskLabel');
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const modeTabs = document.querySelectorAll('.mode-tab');

ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function render() {
  timeDisplay.textContent = formatTime(state.remaining);
  const total = DURATIONS[state.mode];
  const fraction = state.remaining / total;
  ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));

  document.body.className = state.mode === 'focus' ? '' : `mode-${state.mode}`;
  modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === state.mode));

  startPauseBtn.textContent = state.running ? 'Pausar' : 'Iniciar';
  sessionsToday.textContent = state.sessionsToday;
  streakCount.textContent = state.streak;

  const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
  activeTaskLabel.textContent = activeTask ? activeTask.text : 'Sin tarea activa';

  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';
  emptyState.style.display = state.tasks.length ? 'none' : 'block';

  state.tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.id === state.activeTaskId ? ' active' : '') + (task.done ? ' done' : '');

    const check = document.createElement('div');
    check.className = 'task-check' + (task.done ? ' checked' : '');
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      task.done = !task.done;
      saveState();
      render();
    });

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const pomos = document.createElement('span');
    pomos.className = 'task-pomos';
    pomos.textContent = task.pomos ? `🍅 ${task.pomos}` : '';

    const del = document.createElement('button');
    del.className = 'task-delete';
    del.textContent = '✕';
    del.title = 'Eliminar tarea';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      state.tasks = state.tasks.filter(t => t.id !== task.id);
      if (state.activeTaskId === task.id) state.activeTaskId = null;
      saveState();
      render();
    });

    li.addEventListener('click', () => {
      state.activeTaskId = task.id;
      saveState();
      render();
    });

    li.append(check, text, pomos, del);
    taskList.appendChild(li);
  });
}

function switchMode(mode, resetRunning = true) {
  state.mode = mode;
  state.remaining = DURATIONS[mode];
  if (resetRunning) state.running = false;
  stopTicking();
  saveState();
  render();
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // audio unavailable, ignore
  }
}

function notify(title, body) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

function registerStreak() {
  const today = todayStr();
  if (state.lastActiveDay === today) return;
  if (state.lastActiveDay) {
    const prev = new Date(state.lastActiveDay);
    const diffDays = Math.round((new Date(today) - prev) / 86400000);
    state.streak = diffDays === 1 ? state.streak + 1 : 1;
  } else {
    state.streak = 1;
  }
  state.lastActiveDay = today;
}

function handleSessionComplete() {
  beep();

  if (state.mode === 'focus') {
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (task) task.pomos = (task.pomos || 0) + 1;

    if (state.sessionsDate !== todayStr()) {
      state.sessionsToday = 0;
      state.sessionsDate = todayStr();
    }
    state.sessionsToday += 1;
    state.focusCyclesCompleted += 1;
    registerStreak();

    notify('¡Sesión de enfoque completa!', 'Hora de un descanso.');
    const nextMode = state.focusCyclesCompleted % 4 === 0 ? 'long' : 'short';
    switchMode(nextMode);
  } else {
    notify('Descanso terminado', 'Volvamos al enfoque.');
    switchMode('focus');
  }
}

function tick() {
  state.remaining -= 1;
  if (state.remaining <= 0) {
    handleSessionComplete();
    return;
  }
  render();
  saveState();
}

function startTicking() {
  if (tickHandle) return;
  tickHandle = setInterval(tick, 1000);
}

function stopTicking() {
  clearInterval(tickHandle);
  tickHandle = null;
}

startPauseBtn.addEventListener('click', () => {
  state.running = !state.running;
  if (state.running) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    startTicking();
  } else {
    stopTicking();
  }
  saveState();
  render();
});

resetBtn.addEventListener('click', () => {
  state.remaining = DURATIONS[state.mode];
  state.running = false;
  stopTicking();
  saveState();
  render();
});

skipBtn.addEventListener('click', () => {
  handleSessionComplete();
});

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  const task = { id: Date.now().toString(36), text, done: false, pomos: 0 };
  state.tasks.push(task);
  if (!state.activeTaskId) state.activeTaskId = task.id;
  taskInput.value = '';
  saveState();
  render();
});

render();

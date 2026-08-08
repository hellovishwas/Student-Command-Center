// ====== SUPABASE CONFIG (public-safe values — meant to be used from the browser) ======
const SUPABASE_URL = "https://mpwfjjvazjbzyquigoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LYKTDsiJupmWIczJABl4wQ_X52RD-9c";
const VAPID_PUBLIC_KEY = "BMRuSnA6JWGttNrL9VdDwX-nLsdec36XdDU3NqKtzRbyIVmHv6wJYotlKAvaEYWZxiAqpeuZL9YTUheTi1lqYTs";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== ICONS (inline SVG, no dependency) ======
const ICON_PATHS = {
  tasks: `<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>`,
  goals: `<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>`,
  sessions: `<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>`,
  progress: `<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>`,
  help: `<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
  bell: `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>`,
  trash: `<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,
  checkCircle: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
  circle: `<circle cx="12" cy="12" r="10"></circle>`,
  clipboard: `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>`,
  tag: `<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z"></path><circle cx="7.5" cy="7.5" r="1.2"></circle>`,
};
function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ""}</svg>`;
}

// ====== STATE (saved in this browser's localStorage) ======
const STORE_KEYS = { tasks: "scc_tasks", goals: "scc_goals", sessions: "scc_sessions" };

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}
function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let tasks = load(STORE_KEYS.tasks);
let goals = load(STORE_KEYS.goals);
let sessions = load(STORE_KEYS.sessions);
let active = "tasks";
let taskPriorityDraft = "Medium";
let taskGoalDraft = "";
const expandedGoals = new Set();

function persistAll() {
  persist(STORE_KEYS.tasks, tasks);
  persist(STORE_KEYS.goals, goals);
  persist(STORE_KEYS.sessions, sessions);
}

const TABS = [
  { key: "tasks", label: "Tasks", icon: "tasks" },
  { key: "goals", label: "Goals", icon: "goals" },
  { key: "sessions", label: "Sessions", icon: "sessions" },
  { key: "progress", label: "Progress", icon: "progress" },
  { key: "help", label: "Help", icon: "help" },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const priorityColor = (p) => (p === "High" ? "var(--red)" : p === "Medium" ? "var(--amber)" : "var(--teal)");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ====== REAL PUSH NOTIFICATIONS (via Supabase — no custom server needed) ======
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser doesn't support push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied.");

  const reg = await navigator.serviceWorker.register("sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return sub;
}

async function scheduleServerReminder(title, timeISO) {
  const sub = await ensurePushSubscription();
  const reminderId = crypto.randomUUID();
  const { error } = await supabase.from("reminders").insert({
    id: reminderId,
    subscription: sub.toJSON(),
    title,
    remind_at: timeISO,
  });
  if (error) throw new Error(error.message);
  return reminderId;
}

async function cancelServerReminder(reminderId) {
  if (!reminderId) return;
  try {
    await supabase.from("reminders").delete().eq("id", reminderId);
  } catch (e) {
    console.error("Failed to cancel reminder", e);
  }
}

// ====== TOAST ======
function showToast(msg) {
  const container = document.getElementById("toast-container");
  container.innerHTML = "";
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

// ====== NOTIFICATION BANNER ======
function renderNotifBanner() {
  const el = document.getElementById("notif-banner");
  if (!("Notification" in window)) {
    el.innerHTML = `<div class="banner">This browser doesn't support notifications.</div>`;
    return;
  }
  if (Notification.permission === "granted") {
    el.innerHTML = `<div class="banner">${icon("bell", 14)} Notifications enabled</div>`;
  } else if (Notification.permission === "denied") {
    el.innerHTML = `<div class="banner" style="color:var(--red)">Notifications blocked — enable them in your browser settings.</div>`;
  } else {
    el.innerHTML = `<div class="banner warn"><span>${icon("bell", 14)} Get notified about reminders</span><button id="enable-notif-btn">Enable</button></div>`;
    const btn = document.getElementById("enable-notif-btn");
    if (btn) {
      btn.onclick = async () => {
        try {
          await ensurePushSubscription();
          renderNotifBanner();
          showToast("Notifications enabled!");
        } catch (e) {
          showToast("Error: " + e.message);
        }
      };
    }
  }
}

// ====== TABS ======
function renderTabs() {
  const el = document.getElementById("tabs");
  el.innerHTML = "";
  TABS.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (active === t.key ? " active" : "");
    btn.innerHTML = `${icon(t.icon, 15)}<span>${t.label}</span>`;
    btn.onclick = () => {
      active = t.key;
      render();
    };
    el.appendChild(btn);
  });
}

// ====== TASKS ======
function renderTasks() {
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-header">${icon("tasks", 18)}<h2>Tasks</h2></div>
    <div class="form-card">
      <div class="form-grid">
        <div class="field" style="grid-column: span 2;">
          <label>Task</label>
          <input id="task-title" placeholder="e.g. Revise Chapter 3" />
        </div>
        <div class="field">
          <label>Subject</label>
          <input id="task-subject" placeholder="e.g. Physics" />
        </div>
        <div class="field">
          <label>${icon("bell", 12)} Remind me at <span class="hint">(optional)</span></label>
          <input id="task-reminder" type="datetime-local" />
        </div>
        <div class="field">
          <label>Goal <span class="hint">(optional)</span></label>
          <select id="task-goal">
            <option value="">No goal</option>
            ${goals.map((g) => `<option value="${g.id}">${escapeHtml(g.title)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Priority</label>
          <div class="priority-group" id="priority-group">
            <button type="button" data-p="Low">Low</button>
            <button type="button" data-p="Medium" class="active-medium">Medium</button>
            <button type="button" data-p="High">High</button>
          </div>
        </div>
        <button class="primary" id="task-add-btn">${icon("plus", 15)} Add Task</button>
      </div>
    </div>
    <div id="task-list"></div>
  `;

  taskPriorityDraft = "Medium";
  const priorityGroup = document.getElementById("priority-group");
  priorityGroup.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      taskPriorityDraft = b.dataset.p;
      priorityGroup.querySelectorAll("button").forEach((x) => {
        x.className = "";
      });
      b.className = `active-${taskPriorityDraft.toLowerCase()}`;
    };
  });

  document.getElementById("task-add-btn").onclick = async () => {
    const title = document.getElementById("task-title").value.trim();
    if (!title) return;
    const subject = document.getElementById("task-subject").value.trim();
    const reminder = document.getElementById("task-reminder").value || null;
    const priority = taskPriorityDraft;
    const goalId = document.getElementById("task-goal").value || null;

    const task = { id: uid(), title, subject, priority, reminder, goalId, notified: false, done: false };
    tasks.push(task);
    persistAll();
    render();

    if (reminder) {
      try {
        const reminderId = await scheduleServerReminder(title, new Date(reminder).toISOString());
        task.reminderId = reminderId;
        persistAll();
        showToast(`${icon("checkCircle", 14)} Saved`);
      } catch (e) {
        showToast("Save failed");
      }
    }
  };

  const listEl = document.getElementById("task-list");
  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="empty">${icon("clipboard", 28)}<span>No tasks yet — add one above.</span></div>`;
    return;
  }
  listEl.className = "list";
  listEl.innerHTML = tasks
    .map(
      (t) => `
    <div class="item">
      <button class="check-btn ${t.done ? "done" : ""}" data-toggle="${t.id}">${icon(t.done ? "checkCircle" : "circle", 19)}</button>
      <div style="flex:1; min-width:0;">
        <div class="title ${t.done ? "done" : ""}">${escapeHtml(t.title)}</div>
        <div class="item-meta">
          ${t.subject ? `<span class="tag" style="color:var(--muted)">${icon("tag", 11)} ${escapeHtml(t.subject)}</span>` : ""}
          <span class="tag" style="color:${priorityColor(t.priority)}">${t.priority}</span>
          ${t.reminder ? `<span class="tag" style="color:var(--amber)">${icon("bell", 11)} ${new Date(t.reminder).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>` : ""}
          ${t.goalId && goals.find((g) => g.id === t.goalId) ? `<span class="tag" style="color:var(--teal)">${icon("goals", 11)} ${escapeHtml(goals.find((g) => g.id === t.goalId).title)}</span>` : ""}
        </div>
      </div>
      <button class="icon-btn" data-del="${t.id}">${icon("trash", 16)}</button>
    </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-toggle]").forEach((elx) => {
    elx.onclick = async () => {
      const id = elx.getAttribute("data-toggle");
      const target = tasks.find((x) => x.id === id);
      const willBeDone = !!(target && !target.done);
      tasks = tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      persistAll();
      render();

      if (willBeDone && target && target.reminderId && !target.notified) {
        await cancelServerReminder(target.reminderId);
        showToast(`${icon("checkCircle", 14)} Saved`);
      }
    };
  });
  listEl.querySelectorAll("[data-del]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-del");
      const target = tasks.find((x) => x.id === id);
      tasks = tasks.filter((x) => x.id !== id);
      persistAll();
      render();

      if (target && target.reminderId && !target.notified) {
        cancelServerReminder(target.reminderId);
      }
    };
  });
}

// ====== GOALS ======
function renderGoals() {
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-header">${icon("goals", 18)}<h2>Goals</h2></div>
    <div class="form-card">
      <div class="form-grid">
        <div class="field" style="grid-column: 1 / -1;">
          <label>Goal</label>
          <input id="goal-title" placeholder="e.g. Finish Math syllabus this week" />
        </div>
        <button class="primary" id="goal-add-btn">${icon("plus", 15)} Add Goal</button>
      </div>
    </div>
    <div id="goal-list"></div>
  `;
  document.getElementById("goal-add-btn").onclick = () => {
    const title = document.getElementById("goal-title").value.trim();
    if (!title) return;
    goals.push({ id: uid(), title, done: false });
    persistAll();
    render();
  };

  const listEl = document.getElementById("goal-list");
  if (goals.length === 0) {
    listEl.innerHTML = `<div class="empty">${icon("goals", 28)}<span>No goals set yet.</span></div>`;
    return;
  }
  listEl.className = "list";
  listEl.innerHTML = goals
    .map((g) => {
      const goalTasks = tasks.filter((t) => t.goalId === g.id);
      const isOpen = expandedGoals.has(g.id);
      return `
    <div class="goal-card">
      <div class="item" style="border:none; background:transparent; padding:0 0 6px;">
        <button class="check-btn ${g.done ? "done" : ""}" data-toggle="${g.id}">${icon(g.done ? "checkCircle" : "circle", 19)}</button>
        <div class="title ${g.done ? "done" : ""}" style="flex:1">${escapeHtml(g.title)}</div>
        <span class="tag" style="color:var(--muted)">${goalTasks.length} task${goalTasks.length === 1 ? "" : "s"}</span>
        <button class="icon-btn" data-expand="${g.id}" style="color:var(--teal)">${isOpen ? "▾" : "▸"}</button>
        <button class="icon-btn" data-del="${g.id}">${icon("trash", 16)}</button>
      </div>
      ${
        isOpen
          ? `<div class="goal-tasks">
              ${
                goalTasks.length === 0
                  ? `<div class="empty" style="padding:16px;">${icon("clipboard", 20)}<span>No tasks under this goal yet.</span></div>`
                  : goalTasks
                      .map(
                        (t) => `
                <div class="item" style="background:var(--bg);">
                  <button class="check-btn ${t.done ? "done" : ""}" data-gtask-toggle="${t.id}">${icon(t.done ? "checkCircle" : "circle", 17)}</button>
                  <div class="title ${t.done ? "done" : ""}" style="flex:1; font-size:13.5px;">${escapeHtml(t.title)}</div>
                  <button class="icon-btn" data-gtask-del="${t.id}">${icon("trash", 15)}</button>
                </div>`
                      )
                      .join("")
              }
              <div class="row" style="margin-top:8px; gap:8px;">
                <input class="goal-task-input" data-goal-input="${g.id}" placeholder="Add a task to this goal" style="flex:1;" />
                <button class="primary" data-goal-add-task="${g.id}" style="padding:8px 14px; grid-column:auto;">${icon("plus", 14)}</button>
              </div>
            </div>`
          : ""
      }
    </div>`;
    })
    .join("");

  listEl.querySelectorAll("[data-toggle]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-toggle");
      goals = goals.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      persistAll();
      render();
    };
  });
  listEl.querySelectorAll("[data-expand]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-expand");
      if (expandedGoals.has(id)) expandedGoals.delete(id);
      else expandedGoals.add(id);
      render();
    };
  });
  listEl.querySelectorAll("[data-del]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-del");
      goals = goals.filter((x) => x.id !== id);
      // Tasks that belonged to this goal become independent — they are not deleted.
      tasks = tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t));
      persistAll();
      render();
    };
  });
  listEl.querySelectorAll("[data-gtask-toggle]").forEach((elx) => {
    elx.onclick = async () => {
      const id = elx.getAttribute("data-gtask-toggle");
      const target = tasks.find((x) => x.id === id);
      const willBeDone = !!(target && !target.done);
      tasks = tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
      persistAll();
      render();
      if (willBeDone && target && target.reminderId && !target.notified) {
        await cancelServerReminder(target.reminderId);
      }
    };
  });
  listEl.querySelectorAll("[data-gtask-del]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-gtask-del");
      const target = tasks.find((x) => x.id === id);
      tasks = tasks.filter((x) => x.id !== id);
      persistAll();
      render();
      if (target && target.reminderId && !target.notified) {
        cancelServerReminder(target.reminderId);
      }
    };
  });
  listEl.querySelectorAll("[data-goal-add-task]").forEach((elx) => {
    elx.onclick = () => {
      const goalId = elx.getAttribute("data-goal-add-task");
      const input = listEl.querySelector(`[data-goal-input="${goalId}"]`);
      const title = input.value.trim();
      if (!title) return;
      tasks.push({
        id: uid(),
        title,
        subject: "",
        priority: "Medium",
        reminder: null,
        goalId,
        notified: false,
        done: false,
      });
      persistAll();
      render();
    };
  });
}

// ====== SESSIONS ======
function renderSessions() {
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-header">${icon("sessions", 18)}<h2>Study Sessions</h2></div>
    <div class="form-card">
      <div class="form-grid">
        <div class="field">
          <label>Subject</label>
          <input id="s-subject" placeholder="e.g. Chemistry" />
        </div>
        <div class="field">
          <label>Minutes</label>
          <input id="s-minutes" type="number" min="1" placeholder="e.g. 45" />
        </div>
        <button class="primary" id="s-add-btn">${icon("plus", 15)} Log Session</button>
      </div>
    </div>
    <div id="s-list"></div>
  `;
  document.getElementById("s-add-btn").onclick = () => {
    const subject = document.getElementById("s-subject").value.trim();
    const minutes = Number(document.getElementById("s-minutes").value);
    if (!subject || !minutes || minutes <= 0) return;
    sessions.push({ id: uid(), subject, minutes });
    persistAll();
    render();
  };
  const listEl = document.getElementById("s-list");
  if (sessions.length === 0) {
    listEl.innerHTML = `<div class="empty">${icon("sessions", 28)}<span>No sessions logged yet.</span></div>`;
    return;
  }
  listEl.className = "list";
  listEl.innerHTML = sessions
    .map(
      (s) => `
    <div class="item">
      ${icon("sessions", 16)}
      <div style="flex:1">${escapeHtml(s.subject)}</div>
      <span class="tag" style="color:var(--muted)">${s.minutes} min</span>
      <button class="icon-btn" data-del="${s.id}">${icon("trash", 16)}</button>
    </div>`
    )
    .join("");
  listEl.querySelectorAll("[data-del]").forEach((elx) => {
    elx.onclick = () => {
      const id = elx.getAttribute("data-del");
      sessions = sessions.filter((x) => x.id !== id);
      persistAll();
      render();
    };
  });
}

// ====== PROGRESS ======
function renderProgress() {
  const panel = document.getElementById("panel");
  const tasksDone = tasks.filter((t) => t.done).length;
  const goalsDone = goals.filter((g) => g.done).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const tPct = tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0;
  const gPct = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0;
  panel.innerHTML = `
    <div class="panel-header">${icon("progress", 18)}<h2>Weekly Progress</h2></div>
    <div class="progress-block">
      <div class="progress-label"><span>Tasks completed</span><span>${tasks.length ? `${tasksDone}/${tasks.length} (${tPct}%)` : "No data yet"}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${tPct}%; background:var(--teal);"></div></div>
    </div>
    <div class="progress-block">
      <div class="progress-label"><span>Goals completed</span><span>${goals.length ? `${goalsDone}/${goals.length} (${gPct}%)` : "No data yet"}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${gPct}%; background:var(--amber);"></div></div>
    </div>
    <div class="item" style="margin-top: 8px;">
      ${icon("sessions", 16)}
      <span style="color:var(--muted); font-size: 14px;">Total study time logged</span>
      <span style="margin-left:auto; font-weight:600;">${totalMinutes} min</span>
    </div>
  `;
}

// ====== HELP ======
function renderHelp() {
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <div class="panel-header">${icon("help", 18)}<h2>Help</h2></div>
    <div class="help-row">
      <div class="h-title">Tasks</div>
      <div class="h-text">Add tasks with a subject and priority. Set "Remind me at" to a future date/time to get a real notification — even if you close this tab.</div>
    </div>
    <div class="help-row">
      <div class="h-title">Goals</div>
      <div class="h-text">Bigger weekly targets. Expand a goal to add and track tasks that belong to it — or keep tasks independent by not linking them to any goal.</div>
    </div>
    <div class="help-row">
      <div class="h-title">Study Sessions</div>
      <div class="h-text">Log how long you studied and what subject, to track your time.</div>
    </div>
    <div class="help-row">
      <div class="h-title">Weekly Progress</div>
      <div class="h-text">An automatic summary of completed tasks, goals, and total study time.</div>
    </div>
    <div class="help-row">
      <div class="h-title">Data & notifications</div>
      <div class="h-text">Your tasks, goals, and sessions are saved automatically in this browser. Reminders you set will notify you reliably, even if you close this tab.</div>
    </div>
  `;
}

// ====== MAIN RENDER ======
function render() {
  renderTabs();
  renderNotifBanner();
  if (active === "tasks") renderTasks();
  else if (active === "goals") renderGoals();
  else if (active === "sessions") renderSessions();
  else if (active === "progress") renderProgress();
  else if (active === "help") renderHelp();
}

render();

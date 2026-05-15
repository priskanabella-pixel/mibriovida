(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
let state = {
  name: "",
  goal: "bienestar",
  water: 0,
  steps: 0,
  rest: 0,
  mood: "",
  onboarded: false,
  score: 0,
  lastDate: null,
  goals: { water: 2, steps: 8e3, rest: 8 },
  myRoutine: [],
  streak: 0,
  totalProductsUsed: 0,
  dailyHistory: [],
  activityLog: [],
  dailyTips: [
    "Bebe agua antes de cada comida para mantener la hidratación.",
    "Una caminata de 10 minutos puede mejorar tu estado de ánimo.",
    "La consistencia es la clave del bienestar duradero.",
    "Escucha a tu cuerpo y descansa cuando lo necesites.",
    "Los suplementos naturales complementan, no reemplazan, una dieta saludable."
  ]
};
const products = [
  { id: "arkana", name: "BrioArkana", desc: "Defensas y vitalidad natural.", icon: "🛡️", category: "defensas" },
  { id: "gel", name: "BrioGel", desc: "Recuperación muscular.", icon: "🩹", category: "recuperacion" },
  { id: "melena", name: "Melena de León", desc: "Enfoque y claridad mental.", icon: "🧠", category: "mental" },
  { id: "ashwa", name: "Ashwagandha", desc: "Equilibrio y relajación.", icon: "🌙", category: "relajacion" },
  { id: "prana", name: "PRANA+", desc: "Bienestar renal.", icon: "💧", category: "renal" }
];
function showLoading() {
  document.getElementById("loading-screen").classList.remove("hidden");
  document.getElementById("loading-screen").classList.add("flex");
}
function hideLoading() {
  setTimeout(() => {
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("loading-screen").classList.remove("flex");
  }, 500);
}
function safeLocalStorage(key, value = null) {
  try {
    if (value === null) {
      return JSON.parse(localStorage.getItem(key) || "null");
    } else {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  } catch (e) {
    console.warn("LocalStorage error:", e);
    return null;
  }
}
function logActivity(type, message) {
  state.activityLog.unshift({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    message
  });
  if (state.activityLog.length > 50) state.activityLog.pop();
}
function handleAppClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  switch (action) {
    case "finish-onboarding":
      finishOnboarding();
      break;
    case "switch-tab":
      switchTab(trigger.dataset.tab);
      break;
    case "notifications":
      showNotifications();
      break;
    case "share-score":
      shareScore();
      break;
    case "increment-water":
      incrementWater(event);
      break;
    case "increment-steps":
      incrementSteps(event);
      break;
    case "support":
      getSupport(trigger.dataset.support);
      break;
    case "add-custom-routine":
      addCustomRoutine();
      break;
    case "export-data":
      exportData();
      break;
    case "show-reset":
      showResetModal();
      break;
    case "close-modal":
      closeModal();
      hideResetModal();
      break;
    case "reset-app":
      resetApp();
      break;
    case "toggle-routine":
      toggleRoutineItem(trigger.dataset.id);
      break;
    case "add-to-routine":
      addToRoutine(trigger.dataset.id);
      break;
  }
}
function handleAppChange(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === "set-routine-time") {
    setRoutineTime(trigger.dataset.id, trigger.value);
  }
}
function setRoutineTime(id, time) {
  const item = state.myRoutine.find((r) => r.id === id);
  if (!item) return;
  item.time = time;
  saveState();
}
function setupEventListeners() {
  document.body.addEventListener("click", handleAppClick);
  document.body.addEventListener("change", handleAppChange);
  document.getElementById("goal-water-input").addEventListener("change", updateGoals);
  document.getElementById("goal-steps-input").addEventListener("change", updateGoals);
}
document.addEventListener("DOMContentLoaded", () => {
  showLoading();
  setupEventListeners();
  setTimeout(() => {
    loadState();
    checkDailyReset();
    renderAll();
    hideLoading();
  }, 1e3);
});
function showOnboarding() {
  const onboarding = document.getElementById("onboarding");
  onboarding.classList.remove("hidden");
  onboarding.classList.add("flex");
}
function hideOnboarding() {
  const onboarding = document.getElementById("onboarding");
  onboarding.classList.add("hidden");
  onboarding.classList.remove("flex");
}
function loadState() {
  const saved = safeLocalStorage("briovida_pro_state_v2");
  if (saved && saved.onboarded) {
    state = { ...state, ...saved };
  } else {
    showOnboarding();
  }
}
function saveState() {
  safeLocalStorage("briovida_pro_state_v2", state);
  renderAll();
}
function checkDailyReset() {
  const now = (/* @__PURE__ */ new Date()).toLocaleDateString();
  if (state.lastDate !== now) {
    if (state.lastDate) {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (state.lastDate === yesterday.toLocaleDateString()) {
        state.streak++;
      } else {
        state.streak = 1;
      }
      state.dailyHistory.push({
        date: state.lastDate,
        water: state.water,
        steps: state.steps,
        score: state.score,
        completedRoutine: state.myRoutine.filter((item) => item.completed).length
      });
      if (state.dailyHistory.length > 14) state.dailyHistory.shift();
    } else {
      state.streak = 1;
    }
    state.lastDate = now;
    saveState();
  }
}
function finishOnboarding() {
  const nameInput = document.getElementById("setup-name");
  const name = nameInput.value.trim();
  const errorDiv = document.getElementById("name-error");
  if (!name) {
    errorDiv.classList.remove("hidden");
    nameInput.classList.add("error-shake");
    setTimeout(() => nameInput.classList.remove("error-shake"), 500);
    return;
  }
  errorDiv.classList.add("hidden");
  state.name = name;
  state.goal = document.getElementById("setup-goal").value;
  state.onboarded = true;
  state.lastDate = (/* @__PURE__ */ new Date()).toLocaleDateString();
  state.streak = 1;
  hideOnboarding();
  saveState();
  renderAll();
}
function switchTab(tabId) {
  const views = document.querySelectorAll(".tab-view");
  views.forEach((v) => v.classList.add("hidden"));
  document.getElementById(`${tabId}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach((l) => {
    l.classList.toggle("nav-active", l.dataset.tab === tabId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function incrementWater(event) {
  state.water = Math.min(5, state.water + 0.25);
  logActivity("water", `Agregado 0.25L, total ${state.water.toFixed(2)}L`);
  saveState();
  event.target.closest(".glass-card").classList.add("success-feedback");
  setTimeout(() => event.target.closest(".glass-card").classList.remove("success-feedback"), 600);
}
function incrementSteps(event) {
  state.steps = Math.min(5e4, state.steps + 500);
  logActivity("steps", `Agregados 500 pasos, total ${state.steps}`);
  saveState();
  event.target.closest(".glass-card").classList.add("success-feedback");
  setTimeout(() => event.target.closest(".glass-card").classList.remove("success-feedback"), 600);
}
function toggleRoutineItem(id) {
  const item = state.myRoutine.find((r) => r.id === id);
  if (item) {
    item.completed = !item.completed;
    if (item.completed) {
      state.totalProductsUsed++;
      logActivity("routine", `Completaste ${item.name}`);
    } else {
      logActivity("routine", `Reabasteciste ${item.name}`);
    }
    saveState();
  }
}
function addToRoutine(prodId) {
  if (state.myRoutine.find((r) => r.id === prodId)) {
    return showModal("🛡️", "Ya está en tu rutina", "Este producto ya forma parte de tus rituales diarios.");
  }
  const prod = products.find((p) => p.id === prodId);
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
        <div class="text-center space-y-6">
            <div class="w-16 h-16 brio-gradient rounded-full flex items-center justify-center text-white text-2xl mx-auto shadow-lg">
                ${prod.icon}
            </div>
            <div>
                <h3 class="text-2xl font-bold text-slate-800 tracking-tight">${prod.name}</h3>
                <p class="text-slate-500 text-sm mt-2">${prod.desc}</p>
            </div>
            <div class="space-y-3">
                <p class="text-sm font-bold text-slate-600 uppercase tracking-widest">¿Cuándo lo consumirás?</p>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="confirmAddRoutine('${prodId}', 'Mañana')" class="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-sm btn-press transition-all hover:bg-emerald-100">
                        🌅 Mañana
                    </button>
                    <button onclick="confirmAddRoutine('${prodId}', 'Tarde')" class="p-4 rounded-2xl border-2 border-blue-300 bg-blue-50 text-blue-700 font-bold text-sm btn-press transition-all hover:bg-blue-100">
                        ☀️ Tarde
                    </button>
                    <button onclick="confirmAddRoutine('${prodId}', 'Noche')" class="p-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-sm btn-press transition-all hover:bg-indigo-100">
                        🌙 Noche
                    </button>
                </div>
            </div>
        </div>
    `;
  openModal();
}
function addCustomRoutine() {
  const customName = prompt("Nombre de la rutina personalizada:");
  if (customName && customName.trim()) {
    state.myRoutine.push({
      id: "custom_" + Date.now(),
      name: customName.trim(),
      desc: "Rutina personalizada",
      icon: "⭐",
      completed: false,
      time: "Personalizado"
    });
    saveState();
    showModal("✨", "Rutina Añadida", "Tu rutina personalizada ha sido agregada.");
  }
}
function updateGoals() {
  const waterVal = parseFloat(document.getElementById("goal-water-input").value);
  const stepsVal = parseInt(document.getElementById("goal-steps-input").value);
  state.goals.water = Math.max(0.5, Math.min(5, waterVal || 2));
  state.goals.steps = Math.max(1e3, Math.min(5e4, stepsVal || 8e3));
  saveState();
}
function calculateBrioScore() {
  const waterP = Math.min(100, state.water / state.goals.water * 100);
  const stepsP = Math.min(100, state.steps / state.goals.steps * 100);
  const routineP = state.myRoutine.length > 0 ? state.myRoutine.filter((r) => r.completed).length / state.myRoutine.length * 100 : 100;
  const total = waterP * 0.35 + stepsP * 0.35 + routineP * 0.3;
  state.score = Math.round(total);
}
function getContinuousFeedback() {
  if (state.score >= 85) return "¡Excelente! Mantén este ritmo, tu bienestar se construye paso a paso.";
  if (state.score >= 65) return "Vas muy bien. Sigue con tus fórmulas y prioriza el agua hoy.";
  return "Tu progreso es real. Comienza por registrar un vaso más de agua y una rutina ligera.";
}
function renderAll() {
  calculateBrioScore();
  document.getElementById("current-date").textContent = (/* @__PURE__ */ new Date()).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  const nameDisplay = document.getElementById("user-name-display");
  nameDisplay.textContent = state.name || "Naturalista";
  nameDisplay.classList.toggle("opacity-60", !state.name);
  document.getElementById("brio-score-val").textContent = state.score;
  document.getElementById("status-percent").textContent = state.score + "%";
  const offset = 502.6 - state.score / 100 * 502.6;
  document.getElementById("score-ring").style.strokeDashoffset = offset;
  document.getElementById("water-val").textContent = state.water.toFixed(2);
  document.getElementById("water-goal-val").textContent = state.goals.water.toFixed(1);
  document.getElementById("steps-val").textContent = (state.steps / 1e3).toFixed(1) + "k";
  document.getElementById("steps-goal-val").textContent = (state.goals.steps / 1e3).toFixed(0) + "k";
  const tipIndex = (/* @__PURE__ */ new Date()).getDate() % state.dailyTips.length;
  document.getElementById("daily-status").textContent = getContinuousFeedback();
  document.getElementById("daily-tip").textContent = state.dailyTips[tipIndex];
  const routineList = document.getElementById("routine-list");
  routineList.innerHTML = state.myRoutine.length === 0 ? `<div class="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-medium">
                <i class="fas fa-plus-circle text-3xl mb-4 block text-slate-300"></i>
                Añade productos desde Fórmulas para armar tu rutina.
           </div>` : state.myRoutine.map((item) => `
                <div class="glass-card p-5 rounded-3xl flex flex-col gap-4 btn-press transition-all ${item.completed ? "opacity-60 bg-slate-50" : ""}">
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">${item.icon}</div>
                            <div>
                                <h4 class="font-bold text-slate-800">${item.name}</h4>
                                ${item.completed ? `<p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Completado</p>` : `<div class="space-y-1">
                                        <p class="text-[10px] uppercase tracking-widest text-slate-400">Consumir después de</p>
                                        <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">${item.time}</p>
                                    </div>`}
                            </div>
                        </div>
                        <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-emerald-300"}">
                            ${item.completed ? '<i class="fas fa-check text-xs"></i>' : ""}
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <select data-action="set-routine-time" data-id="${item.id}" class="w-full p-3 rounded-2xl bg-slate-100 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 focus-ring" ${item.completed ? "disabled" : ""}>
                            <option value="Mañana" ${item.time === "Mañana" ? "selected" : ""}>Mañana</option>
                            <option value="Tarde" ${item.time === "Tarde" ? "selected" : ""}>Tarde</option>
                            <option value="Noche" ${item.time === "Noche" ? "selected" : ""}>Noche</option>
                        </select>
                        <button data-action="toggle-routine" data-id="${item.id}" class="w-full py-3 rounded-2xl ${item.completed ? "bg-slate-300 text-slate-600" : "bg-emerald-500 text-white"} font-bold focus-ring">
                            ${item.completed ? "Completado" : "Marcar como hecho"}
                        </button>
                    </div>
                </div>
            `).join("");
  document.getElementById("formulas-catalog").innerHTML = products.map((p) => `
            <div class="glass-card p-6 rounded-[2.5rem] flex items-center justify-between hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-5">
                    <div class="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-3xl">${p.icon}</div>
                    <div>
                        <h4 class="font-bold text-slate-800">${p.name}</h4>
                        <p class="text-xs text-slate-500">${p.desc}</p>
                    </div>
                </div>
                <button data-action="add-to-routine" data-id="${p.id}" class="w-12 h-12 rounded-2xl brio-gradient text-white flex items-center justify-center shadow-lg btn-press focus-ring" aria-label="Añadir ${p.name} a rutina">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `).join("");
  document.getElementById("profile-initial").textContent = (state.name || "B").charAt(0).toUpperCase();
  document.getElementById("profile-name").textContent = state.name || "Naturalista";
  document.getElementById("profile-goal-display").textContent = `Enfoque: ${state.goal}`;
  document.getElementById("goal-water-input").value = state.goals.water;
  document.getElementById("goal-steps-input").value = state.goals.steps;
  document.getElementById("streak-count").textContent = state.streak;
  document.getElementById("total-products").textContent = state.totalProductsUsed;
}
function getSupport(type) {
  const library = {
    tired: { icon: "🥱", title: "Recupera tu Energía", body: "La fatiga puede ser falta de agua o movimiento. Bebe un vaso y camina 5 min. Melena de León apoya tu neurogénesis diaria." },
    stressed: { icon: "🤯", title: "Calma Natural", body: "Haz 4 respiraciones profundas. La Ashwagandha ayuda a regular el cortisol y el estrés de forma natural." },
    focus: { icon: "🧠", title: "Claridad Mental", body: "Evita distracciones por 20 min. Melena de León es ideal para claridad y enfoque mental profundo." },
    rest: { icon: "🌙", title: "Pausa Natural", body: "Escucha a tu cuerpo. Una pausa breve de 15 minutos puede resetear tu sistema nervioso." }
  };
  const item = library[type];
  showModal(item.icon, item.title, item.body);
}
function shareScore() {
  if (navigator.share) {
    navigator.share({
      title: "Mi Brio Score - BRIOVIDA",
      text: `Mi Brio Score hoy es ${state.score}% - ¡Descubre el bienestar natural con BRIOVIDA!`,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(`Mi Brio Score hoy es ${state.score}% - ¡Descubre el bienestar natural con BRIOVIDA! ${window.location.href}`);
    showModal("📋", "Copiado", "Tu Brio Score ha sido copiado al portapapeles.");
  }
}
function exportData() {
  const data = {
    ...state,
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    version: "2.0"
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `briovida-data-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showModal("📁", "Datos Exportados", "Tus datos han sido descargados exitosamente.");
}
function showNotifications() {
  showModal("🔔", "Notificaciones", "Funcionalidad de notificaciones próximamente disponible.");
}
function showModal(icon, title, body) {
  const content = document.getElementById("modal-content");
  content.innerHTML = `<div class="text-6xl mb-4">${icon}</div><h3 class="text-2xl font-bold text-slate-800">${title}</h3><p class="text-slate-500 text-sm leading-relaxed">${body}</p>`;
  document.getElementById("modal-container").classList.remove("hidden");
  document.getElementById("modal-container").classList.add("flex");
  setTimeout(() => document.getElementById("modal-box").classList.remove("scale-95", "opacity-0"), 10);
}
function closeModal() {
  document.getElementById("modal-box").classList.add("scale-95", "opacity-0");
  setTimeout(() => {
    document.getElementById("modal-container").classList.add("hidden");
    document.getElementById("modal-container").classList.remove("flex");
  }, 300);
}
function showResetModal() {
  document.getElementById("reset-modal").classList.remove("hidden");
  document.getElementById("reset-modal").classList.add("flex");
}
function hideResetModal() {
  document.getElementById("reset-modal").classList.add("hidden");
  document.getElementById("reset-modal").classList.remove("flex");
}
function resetApp() {
  safeLocalStorage("briovida_pro_state_v2", null);
  location.reload();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    hideResetModal();
  }
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
  });
}

/* Boss Fight - صفحة مستقلة تعمل بدون أي تعديل لملفاتك القديمة
   تخزين: localStorage
*/

const KEY = "seragZZ_bossFight_v1";

const $ = (id) => document.getElementById(id);

const els = {
  bossName: $("bossName"),
  bossHP: $("bossHP"),
  bossMode: $("bossMode"),
  createBoss: $("createBoss"),
  resetAll: $("resetAll"),

  noBoss: $("noBoss"),
  bossArea: $("bossArea"),

  bossTitle: $("bossTitle"),
  bossMeta: $("bossMeta"),
  bossStatus: $("bossStatus"),

  hpLeftText: $("hpLeftText"),
  hpTotalText: $("hpTotalText"),
  hpBar: $("hpBar"),

  timerText: $("timerText"),
  timerHint: $("timerHint"),

  startFocus: $("startFocus"),
  pauseFocus: $("pauseFocus"),
  finishFocus: $("finishFocus"),

  todayMinutes: $("todayMinutes"),
  sessionsDone: $("sessionsDone"),
  comboCount: $("comboCount"),
  criticalUsed: $("criticalUsed"),

  log: $("log"),
};

function todayKey() {
  // yyyy-mm-dd حسب توقيت الجهاز
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const st = JSON.parse(raw);
    return mergeWithDefaults(st);
  } catch {
    return defaultState();
  }
}

function save(st) {
  localStorage.setItem(KEY, JSON.stringify(st));
}

function defaultState() {
  return {
    boss: null, // {name, mode, hpTotal, hpLeft, createdAt}
    stats: {
      day: todayKey(),
      minutesToday: 0,
      sessionsDone: 0,
      comboCount: 0,
      criticalUsedToday: false,
    },
    log: [], // newest first
    session: {
      running: false,
      startedAt: null, // timestamp ms
      elapsedSec: 0,
      lastTickAt: null, // timestamp ms
    },
  };
}

function mergeWithDefaults(st) {
  const d = defaultState();
  // shallow merge
  const out = { ...d, ...st };
  out.stats = { ...d.stats, ...(st.stats || {}) };
  out.session = { ...d.session, ...(st.session || {}) };
  out.log = Array.isArray(st.log) ? st.log : [];
  // day rollover
  if (out.stats.day !== todayKey()) {
    out.stats.day = todayKey();
    out.stats.minutesToday = 0;
    out.stats.sessionsDone = 0;
    out.stats.comboCount = 0;
    out.stats.criticalUsedToday = false;
    // إذا كان شغّال من يوم قديم، وقّفه
    out.session.running = false;
    out.session.startedAt = null;
    out.session.elapsedSec = 0;
    out.session.lastTickAt = null;
  }
  return out;
}

let state = load();
let tickTimer = null;

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function modeLabel(mode) {
  if (mode === "weekly") return "أسبوعي";
  if (mode === "mini") return "سريع";
  return "يومي";
}

function pushLog(text) {
  state.log.unshift({ at: new Date().toISOString(), text });
  state.log = state.log.slice(0, 50);
  save(state);
}

function render() {
  // day rollover merge
  state = mergeWithDefaults(state);
  save(state);

  const hasBoss = !!state.boss;

  els.noBoss.classList.toggle("hidden", hasBoss);
  els.bossArea.classList.toggle("hidden", !hasBoss);

  if (!hasBoss) return;

  const b = state.boss;
  const hpLeft = clamp(b.hpLeft, 0, b.hpTotal);
  const pct = b.hpTotal > 0 ? (hpLeft / b.hpTotal) * 100 : 0;

  els.bossTitle.textContent = b.name;
  els.bossMeta.textContent = `النوع: ${modeLabel(b.mode)} • HP: ${b.hpTotal} دقيقة`;
  els.hpLeftText.textContent = String(hpLeft);
  els.hpTotalText.textContent = String(b.hpTotal);
  els.hpBar.style.width = `${pct}%`;

  // status
  let status = "جاهز";
  if (hpLeft <= 0) status = "تمت الهزيمة ✅";
  else if (state.session.running) status = "تركيز جاري…";
  els.bossStatus.textContent = status;

  // timer
  els.timerText.textContent = fmtTime(state.session.elapsedSec);
  els.startFocus.disabled = state.session.running || hpLeft <= 0;
  els.pauseFocus.disabled = !state.session.running;
  els.finishFocus.disabled = !state.session.running;

  // stats
  els.todayMinutes.textContent = String(state.stats.minutesToday);
  els.sessionsDone.textContent = String(state.stats.sessionsDone);
  els.comboCount.textContent = String(state.stats.comboCount);
  els.criticalUsed.textContent = state.stats.criticalUsedToday ? "نعم" : "لا";

  // log
  els.log.innerHTML = "";
  if (state.log.length === 0) {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = "لا يوجد سجل بعد.";
    els.log.appendChild(div);
  } else {
    state.log.slice(0, 20).forEach((it) => {
      const div = document.createElement("div");
      div.className = "item";
      const when = new Date(it.at);
      div.textContent = `${when.toLocaleString()} — ${it.text}`;
      els.log.appendChild(div);
    });
  }
}

function stopTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

function startTick() {
  stopTick();
  tickTimer = setInterval(() => {
    if (!state.session.running) return;

    // منع الغش: إذا التبويب مخفي، وقف
    if (document.hidden) {
      pauseSession("توقف تلقائيًا لأنك خرجت من التبويب.");
      return;
    }

    const now = Date.now();
    const last = state.session.lastTickAt ?? now;
    const deltaSec = (now - last) / 1000;
    state.session.lastTickAt = now;

    // زيادة وقت الجلسة
    state.session.elapsedSec += deltaSec;

    // تنزيل HP حسب الدقائق المكتملة فقط
    // نخصم HP عند إنهاء الجلسة (أدق وأسهل) — هون فقط نعرض الوقت
    save(state);
    render();
  }, 500);
}

function createOrReplaceBoss() {
  const name = (els.bossName.value || "").trim();
  const hp = Number(els.bossHP.value);
  const mode = els.bossMode.value;

  if (!name) {
    alert("اكتب اسم الزعيم.");
    return;
  }
  if (!Number.isFinite(hp) || hp < 10) {
    alert("HP لازم يكون رقم (على الأقل 10).");
    return;
  }

  state.boss = {
    name,
    mode,
    hpTotal: Math.floor(hp),
    hpLeft: Math.floor(hp),
    createdAt: new Date().toISOString(),
  };

  // وقف أي جلسة شغالة
  state.session.running = false;
  state.session.startedAt = null;
  state.session.elapsedSec = 0;
  state.session.lastTickAt = null;

  pushLog(`تم إنشاء زعيم: "${name}" بـ HP=${Math.floor(hp)} (${modeLabel(mode)}).`);
  save(state);
  render();
}

function resetAll() {
  if (!confirm("متأكد؟ سيتم مسح كل بيانات Boss Fight.")) return;
  localStorage.removeItem(KEY);
  state = load();
  stopTick();
  render();
}

function startSession() {
  if (!state.boss) return;
  if (state.boss.hpLeft <= 0) return;

  state.session.running = true;
  state.session.startedAt = Date.now();
  state.session.lastTickAt = Date.now();
  // لا نصفر elapsedSec إذا بدك تكمل نفس الجلسة بعد pause
  pushLog("بدأت جلسة تركيز.");
  save(state);
  startTick();
  render();
}

function pauseSession(reason = "إيقاف مؤقت.") {
  if (!state.session.running) return;
  state.session.running = false;
  state.session.lastTickAt = null;
  pushLog(reason);
  save(state);
  render();
}

function finishSession() {
  if (!state.session.running) return;
  if (!state.boss) return;

  // أوقف أولاً
  state.session.running = false;
  state.session.lastTickAt = null;

  const sec = Math.floor(state.session.elapsedSec);
  const minutes = Math.floor(sec / 60);

  if (minutes <= 0) {
    pushLog("تم إنهاء الجلسة (أقل من دقيقة — لم تُحسب ضربة).");
    state.session.elapsedSec = 0;
    save(state);
    render();
    return;
  }

  // الضربة الأساسية
  let dmg = minutes;

  // Combo: جلسة ≥ 25 دقيقة
  let comboBonus = 0;
  if (minutes >= 25) {
    comboBonus = 5;
    dmg += comboBonus;
    state.stats.comboCount += 1;
  }

  // Critical: أول جلسة مكتملة باليوم
  let critBonus = 0;
  if (!state.stats.criticalUsedToday) {
    critBonus = 10;
    dmg += critBonus;
    state.stats.criticalUsedToday = true;
  }

  // تطبيق الضرر على HP
  const before = state.boss.hpLeft;
  state.boss.hpLeft = clamp(state.boss.hpLeft - dmg, 0, state.boss.hpTotal);

  // إحصائيات اليوم
  state.stats.minutesToday += minutes;
  state.stats.sessionsDone += 1;

  const after = state.boss.hpLeft;

  pushLog(
    `جلسة ${minutes}د → ضرر ${dmg} (Combo +${comboBonus}, Crit +${critBonus}) | HP: ${before} → ${after}`
  );

  // إذا انتهى الزعيم
  if (state.boss.hpLeft <= 0) {
    pushLog(`🎉 مبروك! هزمت الزعيم "${state.boss.name}"!`);
    alert(`🎉 مبروك! هزمت الزعيم: ${state.boss.name}`);
  }

  // صفّر وقت الجلسة لجلسة جديدة
  state.session.elapsedSec = 0;
  state.session.startedAt = null;

  save(state);
  render();
}

document.addEventListener("visibilitychange", () => {
  // إذا كان في جلسة شغالة وخرج من التبويب: وقف
  if (document.hidden && state.session.running) {
    pauseSession("توقف تلقائيًا لأنك خرجت من التبويب.");
  }
});

els.createBoss.addEventListener("click", createOrReplaceBoss);
els.resetAll.addEventListener("click", resetAll);
els.startFocus.addEventListener("click", startSession);
els.pauseFocus.addEventListener("click", () => pauseSession("إيقاف مؤقت."));
els.finishFocus.addEventListener("click", finishSession);

// init
render();

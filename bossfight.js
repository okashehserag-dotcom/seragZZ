// Boss Fight module (integrated)
// يعتمد على وجود bossfight.html داخل DOM
(function () {
  const KEY = "seragZZ_bossFight_v2";

  const $ = (id) => document.getElementById(id);

  function todayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
  function modeLabel(m){
    return m === "weekly" ? "أسبوعي" : m === "mini" ? "سريع" : "يومي";
  }

  function defaults() {
    return {
      boss: null, // {name, mode, hpTotal, hpLeft}
      day: todayKey(),
      criticalUsed: false,
      log: [],
      session: { running:false, elapsed:0, last: null }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const st = JSON.parse(raw);
      const d = defaults();
      const out = { ...d, ...st };
      out.session = { ...d.session, ...(st.session || {}) };
      out.log = Array.isArray(st.log) ? st.log : [];
      // rollover
      if (out.day !== todayKey()) {
        out.day = todayKey();
        out.criticalUsed = false;
        out.session.running = false;
        out.session.elapsed = 0;
        out.session.last = null;
      }
      return out;
    } catch {
      return defaults();
    }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  let state = load();
  let timer = null;

  function pushLog(t){
    state.log.unshift({ at: new Date().toISOString(), t });
    state.log = state.log.slice(0, 30);
  }

  function sparks(x, y) {
    const arena = $("bfBoss").closest(".bf-arena");
    for (let i=0;i<10;i++){
      const s = document.createElement("div");
      s.className = "bf-spark";
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      const dx = (Math.random()*120 - 60).toFixed(0) + "px";
      const dy = (Math.random()*120 - 60).toFixed(0) + "px";
      s.style.setProperty("--dx", dx);
      s.style.setProperty("--dy", dy);
      arena.appendChild(s);
      setTimeout(()=> s.remove(), 650);
    }
  }

  function hitFX(dmg){
    const boss = $("bfBoss");
    boss.classList.remove("bf-hit");
    // force reflow
    void boss.offsetWidth;
    boss.classList.add("bf-hit");

    // sparks around boss center
    const rect = boss.getBoundingClientRect();
    const arenaRect = boss.closest(".bf-arena").getBoundingClientRect();
    const cx = rect.left - arenaRect.left + rect.width/2;
    const cy = rect.top - arenaRect.top + rect.height/2;
    sparks(cx, cy);

    // status blip
    const st = $("bfStatus");
    st.textContent = dmg >= 35 ? "Critical Hit!" : (dmg >= 25 ? "Combo!" : "Hit!");
    setTimeout(()=>renderStatus(), 800);
  }

  function renderStatus(){
    const st = $("bfStatus");
    if (!state.boss) { st.textContent = "جاهز"; return; }
    if (state.boss.hpLeft <= 0) st.textContent = "تمت الهزيمة ✅";
    else if (state.session.running) st.textContent = "تركيز جاري…";
    else st.textContent = "جاهز";
  }

  function render() {
    state = load();
    const has = !!state.boss;

    $("bfBossName").textContent = has ? `${state.boss.name} (${modeLabel(state.boss.mode)})` : "لا يوجد زعيم";
    $("bfHpLeft").textContent = has ? String(state.boss.hpLeft) : "0";
    $("bfHpTotal").textContent = has ? String(state.boss.hpTotal) : "0";

    const pct = has && state.boss.hpTotal ? (state.boss.hpLeft / state.boss.hpTotal) * 100 : 0;
    $("bfHpFill").style.width = `${clamp(pct,0,100)}%`;

    $("bfTimer").textContent = fmt(state.session.elapsed);

    $("bfStart").disabled = !has || state.session.running || state.boss.hpLeft <= 0;
    $("bfPause").disabled = !state.session.running;
    $("bfFinish").disabled = !state.session.running;

    // log
    const log = $("bfLog");
    log.innerHTML = "";
    if (!state.log.length){
      log.innerHTML = `<div class="bf-pill">لا يوجد سجل بعد</div>`;
    } else {
      state.log.slice(0, 12).forEach(it=>{
        const d = new Date(it.at);
        const div = document.createElement("div");
        div.className = "bf-pill";
        div.textContent = `${d.toLocaleString()} — ${it.t}`;
        log.appendChild(div);
      });
    }

    renderStatus();
    save();
  }

  function stopTimer(){
    if (timer) clearInterval(timer);
    timer = null;
  }
  function startTimer(){
    stopTimer();
    timer = setInterval(()=>{
      if (!state.session.running) return;

      // منع الغش: إذا خرجت من التبويب
      if (document.hidden) {
        pause("توقف تلقائيًا لأنك خرجت من التبويب.");
        return;
      }

      const now = Date.now();
      const last = state.session.last ?? now;
      const delta = (now - last) / 1000;
      state.session.last = now;
      state.session.elapsed += delta;

      save();
      render();
    }, 300);
  }

  function createBoss(){
    const name = ($("bfNewName").value || "").trim();
    const hp = Number($("bfNewHP").value);
    const mode = $("bfNewMode").value;

    if (!name) return alert("اكتب اسم الزعيم.");
    if (!Number.isFinite(hp) || hp < 10) return alert("HP لازم يكون رقم (≥ 10).");

    state.boss = { name, mode, hpTotal: Math.floor(hp), hpLeft: Math.floor(hp) };
    state.session.running = false;
    state.session.elapsed = 0;
    state.session.last = null;

    pushLog(`تم إنشاء زعيم "${name}" بـ HP=${Math.floor(hp)} (${modeLabel(mode)}).`);
    save();
    render();
  }

  function start(){
    if (!state.boss || state.boss.hpLeft<=0) return;
    state.session.running = true;
    state.session.last = Date.now();
    pushLog("بدأت جلسة تركيز.");
    save();
    startTimer();
    render();
  }

  function pause(msg="إيقاف."){
    if (!state.session.running) return;
    state.session.running = false;
    state.session.last = null;
    pushLog(msg);
    save();
    render();
  }

  function finish(){
    if (!state.session.running || !state.boss) return;

    state.session.running = false;
    state.session.last = null;

    const minutes = Math.floor(state.session.elapsed / 60);
    if (minutes <= 0){
      pushLog("انتهت الجلسة (أقل من دقيقة — لم تُحسب).");
      state.session.elapsed = 0;
      save();
      render();
      return;
    }

    let dmg = minutes;
    let combo = 0, crit = 0;

    if (minutes >= 25){ combo = 5; dmg += combo; }
    if (!state.criticalUsed){ crit = 10; dmg += crit; state.criticalUsed = true; }

    const before = state.boss.hpLeft;
    state.boss.hpLeft = clamp(state.boss.hpLeft - dmg, 0, state.boss.hpTotal);

    pushLog(`جلسة ${minutes}د → ضرر ${dmg} (Combo +${combo}, Crit +${crit}) | HP: ${before} → ${state.boss.hpLeft}`);
    hitFX(dmg);

    if (state.boss.hpLeft <= 0){
      pushLog(`🎉 هزمت الزعيم "${state.boss.name}"!`);
      setTimeout(()=>alert(`🎉 مبروك! هزمت الزعيم: ${state.boss.name}`), 150);
    }

    state.session.elapsed = 0;
    save();
    render();
  }

  function reset(){
    if (!confirm("متأكد؟ سيتم مسح بيانات Boss Fight.")) return;
    localStorage.removeItem(KEY);
    state = load();
    stopTimer();
    render();
  }

  // هذه دالة نناديها من app.js بعد ما يركّب bossfight.html داخل الصفحة
  window.initBossFight = function initBossFight(){
    // اربط الأحداث مرة واحدة
    $("bfCreate")?.addEventListener("click", createBoss);
    $("bfStart")?.addEventListener("click", start);
    $("bfPause")?.addEventListener("click", ()=>pause("إيقاف."));
    $("bfFinish")?.addEventListener("click", finish);
    $("bfReset")?.addEventListener("click", reset);

    document.addEventListener("visibilitychange", ()=>{
      if (document.hidden && state.session.running) pause("توقف تلقائيًا لأنك خرجت من التبويب.");
    });

    render();
  };
})();

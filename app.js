/* =========================================================
   سراج | Serag — Vanilla JS App
   - Bilingual AR/EN with RTL/LTR + Cairo/Inter
   - Dashboard navigation (sidebar + drawer + bottom nav)
   - Focus Mode
   - Sessions Timer (Pomodoro) + canvas ring + notes + insight
   - Finish Plan generator (day-by-day) + regenerate + rebalance + copy
   - Mistake Notebook + spaced repetition + export/import
   - Statistics + weekly chart + streak + distribution + reset
   ========================================================= */

(() => {
  "use strict";

  /* -----------------------------
     Helpers
  ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS = {
    lang: "serag_lang",
    settings: "serag_settings",
    stats: "serag_stats",
    daily: "serag_daily_minutes",
    timer: "serag_timer_state",
    plan: "serag_plan",
    planDone: "serag_plan_done",
    mistakes: "serag_mistakes",
    reviewedLog: "serag_reviewed_log", // for subject distribution from mistake reviews
  };

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const pad2 = (n) => String(n).padStart(2, "0");

  const todayISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  const isoToDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const addDaysISO = (iso, days) => {
    const d = isoToDate(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const daysBetween = (fromISO, toISO) => {
    const a = isoToDate(fromISO);
    const b = isoToDate(toISO);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  };

  const formatDateHuman = (iso, lang) => {
    const d = isoToDate(iso);
    const opts = { weekday: "short", month: "short", day: "numeric" };
    try {
      return new Intl.DateTimeFormat(lang === "ar" ? "ar-JO" : "en-US", opts).format(d);
    } catch {
      return iso;
    }
  };

  const safeJSON = (str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const loadLS = (k, fallback) => {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    return safeJSON(raw, fallback);
  };

  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  /* -----------------------------
     i18n strings
  ----------------------------- */
  const I18N = {
    ar: {
      appName: "سراج",
      appTagline: "رفيق التوجيهي — خطة ختمة + جلسات + دفتر أخطاء",
      tabHome: "الرئيسية",
      tabSessions: "جلسات",
      tabPlan: "خطة الختمة",
      tabStats: "الإحصائيات",
      tabMistakes: "دفتر الأخطاء",
      tabSettings: "الإعدادات",
      headerHint: "توجيهي 2009 — ركّز على ستريكك اليوم",
      offlineReady: "جاهز للعمل دون إنترنت (PWA)",
      noExamsNote: "بدون بنك أسئلة أو امتحانات — فقط تنظيم ومراجعة",
      editNote: "يمكن تعديل البنود بسهولة من ملف app.js",

      heroBadge: "نمط وزاري + مراجعة + تحليل أخطاء",
      heroTitle1: "سراج",
      heroTitle2: "رتّب ختمتك… واثبت على الستريك.",
      heroDesc:
        "تطبيق بسيط للتوجيهي 2009: جلسات تركيز، خطة ختمة يومية، دفتر أخطاء، وإحصائيات تساعدك تمشي بثبات.",
      ctaStartSession: "ابدأ جلسة",
      ctaOpenPlan: "افتح خطة الختمة",
      todaysFocus: "تركيز اليوم",
      fromPlan: "من خطة الختمة",
      miniSessions: "جلسات مكتملة",
      miniMinutes: "دقائق دراسة",
      miniPlan: "إنجاز الخطة",
      miniStreak: "ستريك",

      quickSessionsTitle: "جلسة تركيز",
      quickSessionsSub: "Pomodoro للتوجيهي",
      quickMistakesTitle: "دفتر الأخطاء",
      quickMistakesSub: "ثبت المفاهيم ونقاط الضعف",
      quickStatsTitle: "إحصائياتك",
      quickStatsSub: "ترند أسبوعي + تركيز",
      quickPlanTitle: "خطة الختمة",
      quickPlanSub: "توزيع يومي حتى الهدف",

      homeGuidanceTitle: "إرشاد سريع",
      homeGuidanceHint: "ثلاث خطوات بسيطة",
      step1Title: "ثبّت زمن الجلسة",
      step1Text: "ابدأ بـ 25 دقيقة + 5 راحة، وعدّلها حسب قدرتك.",
      step2Title: "اتبع خطة الختمة",
      step2Text: "كل يوم مهام واضحة + بلوك مراجعة/تحليل أخطاء.",
      step3Title: "سجّل أخطاءك",
      step3Text: "دفتر الأخطاء أهم من كثرة التكرار بدون فهم.",

      homeFocusModeTitle: "وضع التركيز",
      homeFocusModeHint: "أقل تشتيت، نفس الإنجاز",
      focusCalloutTitle: "إخفاء المشتتات أثناء الدراسة",
      focusCalloutDesc: "فعّل وضع التركيز من أعلى الشاشة خلال الجلسات أو أثناء تنفيذ مهام الخطة.",
      toggleFocus: "تبديل وضع التركيز",

      sessionsTitle: "جلسات التركيز",
      sessionsDesc: "جلسات بأسلوب بومودورو للتوجيهي — بتركيز نمط وزاري (تسمية فقط).",
      timeInsightLoading: "جاري حساب أفضل وقت دراسة…",
      modeStudy: "دراسة",
      modeBreak: "راحة",
      ministerialLabel: "تسمية: نمط وزاري للممارسة",
      timerHint: "جاهز — اضغط ابدأ",
      start: "ابدأ",
      pause: "إيقاف مؤقت",
      reset: "إعادة",
      next: "التالي",
      studyMinutes: "دقائق الدراسة",
      breakMinutes: "دقائق الراحة",
      studyHint: "10–90 دقيقة",
      breakHint: "3–30 دقيقة",
      autoSwitch: "تبديل تلقائي بين دراسة/راحة",

      sessionNotesTitle: "ملاحظات الجلسة",
      sessionNotesHint: "اكتب نقاط سريعة…",
      sessionNotesPh: "مثال: نقاط ضعف اليوم — قاعدة if only + تلخيص فتح عمورية",
      saveNotes: "حفظ",
      clear: "مسح",
      notesAutosave: "يتم الحفظ محليًا",
      mStudySessions: "جلسات دراسة مكتملة",
      mStudyMinutes: "مجموع دقائق الدراسة",
      mBreaks: "استراحات مكتملة",
      mBreakMinutes: "مجموع دقائق الراحة",
      alertsTitle: "تنبيه صوتي + بصري",
      alertsDesc: "عند انتهاء المؤقت راح يظهر تنبيه، وتقدر تكتم الصوت من أعلى.",

      planTitle: "خطة الختمة",
      planDesc: "توزيع يوم-بيوم حتى تاريخ الهدف، مع بلوك مراجعة/تحليل أخطاء بشكل منتظم.",
      copyPlan: "نسخ الخطة",
      regenPlan: "إعادة توليد",
      modeIntensive: "مكثفة (حتى 1 أيار)",
      modeBalanced: "متوازنة (حتى 15 أيار)",
      modeLight: "خفيفة (حتى 15 أيار)",
      splitTwo: "مهمتين/يوم",
      splitFour: "مادة لكل يوم (4)",
      lighterDay: "يوم أسبوعي أخف",
      reviewEvery: "بلوك مراجعة كل",
      days: "أيام",
      generate: "توليد الخطة",
      rebalance: "إعادة موازنة/يوم فائت",
      weakBoostTitle: "تعزيز نقاط الضعف",
      weakBoostHint: "اختَر 1–3 وسوم لكل مادة لزيادة تكرارها بالخطة.",
      planEmpty:
        "ما في خطة لسه. اختَر نمط الخطة ووزّعها ثم اضغط «توليد الخطة».",
      copied: "تم النسخ ✅",
      copyFailed: "تعذر النسخ — انسخ يدويًا.",
      confirmRegen: "إعادة توليد الخطة؟ سيتم الحفاظ على إنجاز المهام قدر الإمكان.",
      confirmRebalance:
        "إعادة موازنة من اليوم؟ سيتم توزيع المهام غير المنجزة دون حذف المنجز.",
      planDay: "اليوم",
      done: "تم",
      markDone: "تم إنجازها",
      undo: "تراجع",

      statsTitle: "الإحصائيات",
      statsDesc: "ملخص إنجازك: جلسات + خطة + دفتر أخطاء، مع ترند أسبوعي بسيط.",
      resetStats: "تصفير الإحصائيات",
      resetAll: "تصفير كل شيء",
      statsOverview: "نظرة عامة",
      liveUpdate: "يتحدّث مباشرة",
      sCompletedSessions: "جلسات مكتملة",
      sTotalMinutes: "مجموع دقائق الدراسة",
      sPlanCompletion: "إنجاز الخطة",
      sStreak: "الستريك الحالي",
      weeklyChartTitle: "آخر 7 أيام",
      weeklyChartHint: "دقائق الدراسة اليومية",
      subjectDistTitle: "توزيع المواد",
      trendLoading: "جاري حساب الترند…",
      consistencyLoading: "جاري حساب الاتساق…",
      focusScoreLoading: "جاري حساب نقاط التركيز…",
      confirmResetStats: "تأكيد: تصفير الإحصائيات فقط؟",
      confirmResetAll: "تأكيد: تصفير كل شيء (خطة + أخطاء + إحصائيات)؟",

      mistakesTitle: "دفتر الأخطاء",
      mistakesDesc:
        "سجّل أخطاءك أنت فقط — ثم راجعها بتكرار متباعد (1/3/7/14 يوم).",
      reviewToday: "مراجعة اليوم",
      exportJson: "تصدير JSON",
      importJson: "استيراد JSON",
      addMistakeTitle: "إضافة خطأ",
      addMistakeHint: "اختصره وخليه واضح",
      subject: "المادة",
      title: "العنوان",
      titleHint: "قصير (حتى 60 حرف)",
      whatWentWrong: "شو اللي غلط؟",
      correctConcept: "التصحيح/المفهوم الصحيح",
      fixAction: "إجراء تصحيح",
      tags: "وسوم (اختياري)",
      mastered: "متقن",
      add: "إضافة",
      libraryTitle: "مكتبتك",
      libraryHint: "بحث + فلترة",
      searchPh: "ابحث…",
      allSubjects: "كل المواد",
      subHistory: "تاريخ",
      subReligion: "دين",
      subEnglish: "إنجليزي",
      subArabic: "عربي",
      notQuestionBank: "هذا دفتر أخطاء شخصي — ليس بنك أسئلة، ولا يحتوي أسئلة.",
      reviewModalTitle: "مراجعة اليوم",
      close: "إغلاق",
      reviewNone: "لا يوجد أخطاء مستحقة للمراجعة اليوم 🎉",
      reviewed: "تمت المراجعة",
      nextReviewIn: "المراجعة القادمة بعد",

      settingsTitle: "الإعدادات",
      settingsDesc: "عدّل الزمن، الصوت، وضع التركيز، وأدوات النسخ الاحتياطي.",
      durationsTitle: "إعدادات الزمن",
      durationsHint: "تنطبق على المؤقت",
      save: "حفظ",
      soundOn: "الصوت مفعّل",
      focusDefault: "وضع التركيز افتراضيًا",
      appearanceTitle: "المظهر",
      appearanceHint: "لمسات لون (Accent)",
      backupTitle: "نسخ احتياطي",
      backupHint: "خطة + إحصائيات + أخطاء",
      exportAll: "تصدير كل البيانات",
      importAll: "استيراد",
      cacheHelp:
        "إذا صار تعارض بالكاش أثناء التطوير، احذف Service Worker من إعدادات المتصفح.",

      muteOn: "كتم الصوت",
      muteOff: "تشغيل الصوت",

      insightMorning: "ميولك: صباحي ☀️",
      insightEvening: "ميولك: مسائي 🌙",
      insightNeutral: "ميولك: متوازن 🕰️",

      // Timer notifications
      toastSaved: "تم الحفظ ✅",
      toastCleared: "تم المسح ✅",
      toastInvalid: "قيمة غير صالحة.",
      toastStudyDone: "انتهت جلسة الدراسة ✅",
      toastBreakDone: "انتهت الاستراحة ✅",

      // Plan tags
      typeLearn: "تعلم",
      typeRevise: "مراجعة",
      typePractice: "تطبيق",
      typeReview: "تحليل أخطاء",

      // Plan subject names
      subject_history: "تاريخ",
      subject_religion: "دين",
      subject_english: "إنجليزي",
      subject_arabic: "عربي",

      // Plan misc
      estMin: "دقيقة",
      goal: "الهدف",
      weeklyLight: "يوم خفيف",
      microReview: "بلوك مراجعة/تحليل أخطاء",
      boostReview: "تعزيز نقاط الضعف",
    },

    en: {
      appName: "Serag",
      appTagline: "Tawjihi companion — Finish plan + Sessions + Mistake notebook",
      tabHome: "Home",
      tabSessions: "Sessions Timer",
      tabPlan: "Finish Plan",
      tabStats: "Statistics",
      tabMistakes: "Mistake Notebook",
      tabSettings: "Settings",
      headerHint: "Tawjihi 2009 — keep your streak today",
      offlineReady: "Offline-ready (PWA)",
      noExamsNote: "No question bank or exams — organization & review only",
      editNote: "You can easily edit tasks from app.js",

      heroBadge: "Ministerial-style practice + review + error analysis",
      heroTitle1: "Serag",
      heroTitle2: "Finish plan… and protect your streak.",
      heroDesc:
        "A simple Tawjihi 2009 app: focus sessions, daily finish plan, mistake notebook, and statistics to keep you consistent.",
      ctaStartSession: "Start a session",
      ctaOpenPlan: "Open finish plan",
      todaysFocus: "Today’s Focus",
      fromPlan: "From Finish Plan",
      miniSessions: "Completed sessions",
      miniMinutes: "Study minutes",
      miniPlan: "Plan completion",
      miniStreak: "Streak",

      quickSessionsTitle: "Focus session",
      quickSessionsSub: "Tawjihi Pomodoro",
      quickMistakesTitle: "Mistake notebook",
      quickMistakesSub: "Lock concepts & weak points",
      quickStatsTitle: "Your stats",
      quickStatsSub: "Weekly trend + focus",
      quickPlanTitle: "Finish plan",
      quickPlanSub: "Daily schedule to target",

      homeGuidanceTitle: "Quick guidance",
      homeGuidanceHint: "3 simple steps",
      step1Title: "Set your session time",
      step1Text: "Start with 25m study + 5m break, then adjust.",
      step2Title: "Follow the finish plan",
      step2Text: "Daily tasks + review/error-analysis micro block.",
      step3Title: "Log your mistakes",
      step3Text: "A mistake notebook beats mindless repetition.",

      homeFocusModeTitle: "Focus Mode",
      homeFocusModeHint: "Less distraction, same progress",
      focusCalloutTitle: "Hide distractions while studying",
      focusCalloutDesc:
        "Enable Focus Mode from the top bar during sessions or while completing plan tasks.",
      toggleFocus: "Toggle Focus Mode",

      sessionsTitle: "Sessions Timer",
      sessionsDesc:
        "Pomodoro for Tawjihi — with “ministerial style” terminology (labels only).",
      timeInsightLoading: "Calculating your best study time…",
      modeStudy: "Study",
      modeBreak: "Break",
      ministerialLabel: "Label: Ministerial practice style",
      timerHint: "Ready — press Start",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      next: "Next",
      studyMinutes: "Study minutes",
      breakMinutes: "Break minutes",
      studyHint: "10–90 minutes",
      breakHint: "3–30 minutes",
      autoSwitch: "Auto-switch Study/Break",

      sessionNotesTitle: "Session Notes",
      sessionNotesHint: "Jot quick points…",
      sessionNotesPh: "Example: Weak spots — if only rule + summarize 'Amoriyah'",
      saveNotes: "Save",
      clear: "Clear",
      notesAutosave: "Saved locally",
      mStudySessions: "Completed study sessions",
      mStudyMinutes: "Total study minutes",
      mBreaks: "Completed breaks",
      mBreakMinutes: "Total break minutes",
      alertsTitle: "Sound + visual alert",
      alertsDesc: "When time ends, you’ll see an alert. Mute from the header.",

      planTitle: "Finish Plan",
      planDesc:
        "Day-by-day schedule to a target date, with regular review/error-analysis blocks.",
      copyPlan: "Copy plan",
      regenPlan: "Regenerate",
      modeIntensive: "Intensive (by May 1)",
      modeBalanced: "Balanced (by May 15)",
      modeLight: "Light (by May 15)",
      splitTwo: "2 tasks/day",
      splitFour: "1 per subject/day (4)",
      lighterDay: "Weekly lighter day",
      reviewEvery: "Review block every",
      days: "days",
      generate: "Generate plan",
      rebalance: "Rebalance / Missed day",
      weakBoostTitle: "Weak topics boost",
      weakBoostHint: "Pick 1–3 tags per subject to repeat more often in the plan.",
      planEmpty:
        "No plan yet. Choose a mode/split and click “Generate plan”.",
      copied: "Copied ✅",
      copyFailed: "Copy failed — please copy manually.",
      confirmRegen:
        "Regenerate plan? Completed tasks will be preserved where possible.",
      confirmRebalance:
        "Rebalance from today? Remaining tasks will be redistributed without deleting completed ones.",
      planDay: "Day",
      done: "Done",
      markDone: "Mark done",
      undo: "Undo",

      statsTitle: "Statistics",
      statsDesc:
        "Your progress summary: sessions + plan + mistakes, with a simple weekly trend.",
      resetStats: "Reset stats",
      resetAll: "Reset everything",
      statsOverview: "Overview",
      liveUpdate: "Live update",
      sCompletedSessions: "Completed sessions",
      sTotalMinutes: "Total study minutes",
      sPlanCompletion: "Plan completion",
      sStreak: "Current streak",
      weeklyChartTitle: "Last 7 days",
      weeklyChartHint: "Daily study minutes",
      subjectDistTitle: "Subject distribution",
      trendLoading: "Calculating trend…",
      consistencyLoading: "Calculating consistency…",
      focusScoreLoading: "Calculating focus score…",
      confirmResetStats: "Confirm: reset stats only?",
      confirmResetAll: "Confirm: reset everything (plan + mistakes + stats)?",

      mistakesTitle: "Mistake Notebook",
      mistakesDesc:
        "Your own mistakes only — then review using spaced repetition (1/3/7/14 days).",
      reviewToday: "Review today",
      exportJson: "Export JSON",
      importJson: "Import JSON",
      addMistakeTitle: "Add a mistake",
      addMistakeHint: "Keep it short and clear",
      subject: "Subject",
      title: "Title",
      titleHint: "Short (up to 60 chars)",
      whatWentWrong: "What went wrong?",
      correctConcept: "Correct concept/summary",
      fixAction: "Fix action",
      tags: "Tags (optional)",
      mastered: "Mastered",
      add: "Add",
      libraryTitle: "Your library",
      libraryHint: "Search + filter",
      searchPh: "Search…",
      allSubjects: "All subjects",
      subHistory: "History",
      subReligion: "Religion",
      subEnglish: "English",
      subArabic: "Arabic",
      notQuestionBank:
        "This is a personal mistake notebook — not a question bank, and contains no questions.",
      reviewModalTitle: "Today’s review",
      close: "Close",
      reviewNone: "No mistakes due today 🎉",
      reviewed: "Reviewed",
      nextReviewIn: "Next review in",

      settingsTitle: "Settings",
      settingsDesc: "Adjust time, sound, focus mode, and backup tools.",
      durationsTitle: "Durations",
      durationsHint: "Used by the timer",
      save: "Save",
      soundOn: "Sound enabled",
      focusDefault: "Focus Mode on by default",
      appearanceTitle: "Appearance",
      appearanceHint: "Accent variations",
      backupTitle: "Backup",
      backupHint: "Plan + stats + mistakes",
      exportAll: "Export all data",
      importAll: "Import",
      cacheHelp:
        "If cache conflicts during development, unregister the Service Worker in your browser settings.",

      muteOn: "Mute",
      muteOff: "Unmute",

      insightMorning: "You lean: Morning ☀️",
      insightEvening: "You lean: Evening 🌙",
      insightNeutral: "You lean: Balanced 🕰️",

      toastSaved: "Saved ✅",
      toastCleared: "Cleared ✅",
      toastInvalid: "Invalid value.",
      toastStudyDone: "Study finished ✅",
      toastBreakDone: "Break finished ✅",

      typeLearn: "Learn",
      typeRevise: "Revise",
      typePractice: "Practice",
      typeReview: "Review",

      subject_history: "History",
      subject_religion: "Religion",
      subject_english: "English",
      subject_arabic: "Arabic",

      estMin: "min",
      goal: "Goal",
      weeklyLight: "Light day",
      microReview: "Review / Error analysis block",
      boostReview: "Weak topics boost",
    },
  };

  /* -----------------------------
     REQUIRED TASKS JSON (editable)
  ----------------------------- */
  const checklistTasks = {
    history: [
      { id: "his-1", title_ar: "تأسيس الإمارة: الظروف والنشأة", title_en: "Emirate foundation: context & emergence", type: "Learn", estMin: 35, goal_ar: "فهم التسلسل والأسباب والنتائج", goal_en: "Understand sequence, causes & outcomes", tags: ["تأسيس الإمارة", "تسلسل"] },
      { id: "his-2", title_ar: "الاستقلال: المراحل والوثائق", title_en: "Independence: stages & documents", type: "Learn", estMin: 35, goal_ar: "تمييز المحطات الرئيسية وأهم القرارات", goal_en: "Identify key milestones and decisions", tags: ["الاستقلال", "وثائق"] },
      { id: "his-3", title_ar: "الحياة السياسية: الأحزاب والبرلمان", title_en: "Political life: parties & parliament", type: "Revise", estMin: 30, goal_ar: "تلخيص الفترات والتغيرات", goal_en: "Summarize periods and changes", tags: ["سياسية", "برلمان"] },
      { id: "his-4", title_ar: "الحياة الاقتصادية: الزراعة والصناعة والتجارة", title_en: "Economic life: agriculture, industry, trade", type: "Revise", estMin: 30, goal_ar: "ربط الأمثلة بالمفاهيم", goal_en: "Link examples to concepts", tags: ["اقتصادية", "أمثلة"] },
      { id: "his-5", title_ar: "الحياة الاجتماعية: السكان والتعليم والصحة", title_en: "Social life: population, education, health", type: "Revise", estMin: 30, goal_ar: "تحديد السمات والاتجاهات", goal_en: "Identify features and trends", tags: ["اجتماعية", "التعليم"] },
      { id: "his-6", title_ar: "التعليم في الأردن: تطور المراحل", title_en: "Education in Jordan: development stages", type: "Practice", estMin: 25, goal_ar: "خريطة ذهنية للمراحل", goal_en: "Mind-map the stages", tags: ["التعليم", "خريطة"] },
      { id: "his-7", title_ar: "القضية الفلسطينية: المراحل والمواقف الأردنية", title_en: "Palestinian cause: stages & Jordan’s positions", type: "Learn", estMin: 40, goal_ar: "فهم المصطلحات والتواريخ الأساسية", goal_en: "Grasp key terms and dates", tags: ["القضية الفلسطينية", "تواريخ"] },
      { id: "his-8", title_ar: "الوصاية الهاشمية: المفهوم والأهمية", title_en: "Hashemite custodianship: concept & importance", type: "Learn", estMin: 30, goal_ar: "شرح المفهوم بأمثلة مختصرة", goal_en: "Explain with short examples", tags: ["الوصاية الهاشمية", "مفهوم"] },
      { id: "his-9", title_ar: "مراجعة وحدة: تلخيص + بطاقات مصطلحات", title_en: "Unit review: summary + term cards", type: "Review", estMin: 30, goal_ar: "تثبيت المصطلحات وسبب/نتيجة", goal_en: "Lock terms and cause/effect", tags: ["مراجعة", "مصطلحات"] },
      { id: "his-10", title_ar: "تحليل أخطاء التاريخ: قائمة نقاط ضعف", title_en: "History error analysis: weak points list", type: "Review", estMin: 20, goal_ar: "تحديد 3 نقاط وتحسينها", goal_en: "Identify 3 weak points to fix", tags: ["تحليل أخطاء", "نقاط ضعف"] },
    ],

    religion: [
      { id: "rel-1", title_ar: "سورة البقرة: موضوعات ومحاور", title_en: "Al-Baqarah: themes & axes", type: "Learn", estMin: 40, goal_ar: "تقسيم المحاور مع شواهد", goal_en: "Split themes with evidence", tags: ["البقرة", "محاور"] },
      { id: "rel-2", title_ar: "سورة الأعراف: دروس وعبر", title_en: "Al-A'raf: lessons & insights", type: "Revise", estMin: 35, goal_ar: "ترتيب القصص واستخراج الدروس", goal_en: "Order stories and extract lessons", tags: ["الأعراف", "دروس"] },
      { id: "rel-3", title_ar: "سورة الفرقان: صفات عباد الرحمن", title_en: "Al-Furqan: traits of 'Ibad Al-Rahman", type: "Learn", estMin: 30, goal_ar: "تلخيص الصفات بنقاط", goal_en: "Summarize traits in bullets", tags: ["الفرقان", "صفات"] },
      { id: "rel-4", title_ar: "الطلاق: الأحكام والمقاصد", title_en: "Divorce: rulings & objectives", type: "Learn", estMin: 35, goal_ar: "فهم الشروط والحِكم", goal_en: "Understand conditions and wisdom", tags: ["الطلاق", "أحكام"] },
      { id: "rel-5", title_ar: "العدة: الأنواع والأسباب", title_en: "Iddah: types & reasons", type: "Revise", estMin: 25, goal_ar: "جدول مقارنة سريع", goal_en: "Quick comparison table", tags: ["العدة", "مقارنة"] },
      { id: "rel-6", title_ar: "الميراث: المبادئ العامة", title_en: "Inheritance: general principles", type: "Practice", estMin: 35, goal_ar: "تلخيص القواعد الأساسية", goal_en: "Summarize core rules", tags: ["الميراث", "قواعد"] },
      { id: "rel-7", title_ar: "الوسطية: المفهوم والتطبيق", title_en: "Moderation: concept & application", type: "Learn", estMin: 25, goal_ar: "أمثلة حياتية على الوسطية", goal_en: "Real-life examples", tags: ["الوسطية", "تطبيق"] },
      { id: "rel-8", title_ar: "حقوق الإنسان في الإسلام", title_en: "Human rights in Islam", type: "Revise", estMin: 30, goal_ar: "استخراج الحقوق مع دليل", goal_en: "Extract rights with evidence", tags: ["حقوق الإنسان", "دليل"] },
      { id: "rel-9", title_ar: "مراجعة وحدة: تطبيقات ومفاهيم", title_en: "Unit review: applications & concepts", type: "Review", estMin: 25, goal_ar: "ربط المفهوم بالتطبيق", goal_en: "Link concept to application", tags: ["مراجعة", "تطبيقات"] },
      { id: "rel-10", title_ar: "تحليل أخطاء الدين: نقاط تعثر", title_en: "Religion error analysis: stumbling points", type: "Review", estMin: 20, goal_ar: "تحديد سبب الخطأ وخطة إصلاح", goal_en: "Find cause + fix plan", tags: ["تحليل أخطاء", "نقاط ضعف"] },
    ],

    english: [
      { id: "eng-1", title_ar: "Modals: المعاني والاستخدام", title_en: "Modals: meaning & usage", type: "Learn", estMin: 30, goal_ar: "تمييز modal حسب السياق", goal_en: "Choose correct modal by context", tags: ["Modals", "Usage"] },
      { id: "eng-2", title_ar: "Articles: a/an/the/zero", title_en: "Articles: a/an/the/zero", type: "Revise", estMin: 25, goal_ar: "قواعد سريعة + أمثلة", goal_en: "Quick rules + examples", tags: ["Articles", "Rules"] },
      { id: "eng-3", title_ar: "Passive: الصياغة والتحويل", title_en: "Passive: form & transformation", type: "Practice", estMin: 35, goal_ar: "تحويل جمل مع زمنها", goal_en: "Transform sentences with tense", tags: ["Passive", "Tenses"] },
      { id: "eng-4", title_ar: "If clauses: الأنواع والاستخدام", title_en: "If clauses: types & usage", type: "Learn", estMin: 35, goal_ar: "خريطة مقارنة بين الأنواع", goal_en: "Comparison map of types", tags: ["If clauses", "Compare"] },
      { id: "eng-5", title_ar: "Wish / If only: الصيغ والمعاني", title_en: "Wish / If only: forms & meanings", type: "Revise", estMin: 25, goal_ar: "تمييز الزمن المقصود", goal_en: "Identify intended time reference", tags: ["Wish", "If only"] },
      { id: "eng-6", title_ar: "Reporting speech/verbs: التحويل", title_en: "Reported speech/verbs: transformation", type: "Practice", estMin: 40, goal_ar: "تثبيت تغيّر الأزمنة", goal_en: "Lock tense shifts", tags: ["Reported", "Verbs"] },
      { id: "eng-7", title_ar: "Reading topics: Skimming/Scanning", title_en: "Reading: skimming & scanning", type: "Practice", estMin: 25, goal_ar: "تقنية استخراج الفكرة بسرعة", goal_en: "Extract main idea quickly", tags: ["Reading", "Skills"] },
      { id: "eng-8", title_ar: "Writing: Report structure", title_en: "Writing: report structure", type: "Learn", estMin: 30, goal_ar: "بنية تقرير + ربط أفكار", goal_en: "Report structure + linking", tags: ["Writing", "Report"] },
      { id: "eng-9", title_ar: "Writing: For & Against article", title_en: "Writing: for-and-against article", type: "Practice", estMin: 35, goal_ar: "قالب مقدمة/جسم/خاتمة", goal_en: "Intro/body/conclusion template", tags: ["Writing", "For/Against"] },
      { id: "eng-10", title_ar: "Error analysis: أكثر أخطاء القواعد", title_en: "Error analysis: common grammar errors", type: "Review", estMin: 20, goal_ar: "قائمة 5 أخطاء وحلها", goal_en: "List 5 errors + fixes", tags: ["Error analysis", "Grammar"] },
    ],

    arabic: [
      { id: "arb-1", title_ar: "فتح عمورية: أفكار ومعاني", title_en: "Fath 'Amoriyah: ideas & meanings", type: "Learn", estMin: 35, goal_ar: "تلخيص الأفكار + الشواهد", goal_en: "Summarize ideas + evidence", tags: ["فتح عمورية", "أفكار"] },
      { id: "arb-2", title_ar: "الأسلحة والأطفال: الفكرة الرئيسة", title_en: "Weapons & children: main idea", type: "Revise", estMin: 30, goal_ar: "استخراج الفكرة + دعمها", goal_en: "Extract idea + support it", tags: ["الأسلحة والأطفال", "فكرة"] },
      { id: "arb-3", title_ar: "حروف الجر: المعاني والاستعمال", title_en: "Prepositions: meanings & usage", type: "Practice", estMin: 25, goal_ar: "قائمة أشهر الأخطاء", goal_en: "List common mistakes", tags: ["حروف الجر", "أخطاء"] },
      { id: "arb-4", title_ar: "اسم الفاعل/المفعول: الصياغة", title_en: "Active/Passive participles: formation", type: "Learn", estMin: 30, goal_ar: "تمييز الصياغة من الفعل", goal_en: "Derive forms correctly", tags: ["اسم الفاعل", "اسم المفعول"] },
      { id: "arb-5", title_ar: "البلاغة: تشبيه/استعارة/كناية", title_en: "Rhetoric: simile/metaphor/metonymy", type: "Revise", estMin: 35, goal_ar: "مقارنة سريعة بين الأنواع", goal_en: "Quick comparison of types", tags: ["بلاغة", "مقارنة"] },
      { id: "arb-6", title_ar: "العروض: البحور الأساسية", title_en: "Prosody: core meters", type: "Practice", estMin: 30, goal_ar: "تلخيص البحر وأوزانه", goal_en: "Summarize meter patterns", tags: ["عروض", "أوزان"] },
      { id: "arb-7", title_ar: "التعبير: مخطط فقرة قوية", title_en: "Writing: strong paragraph plan", type: "Practice", estMin: 25, goal_ar: "خطة مقدمة/أفكار/خاتمة", goal_en: "Intro/ideas/conclusion plan", tags: ["تعبير", "خطة"] },
      { id: "arb-8", title_ar: "قصة حقد النمر: أحداث وشخصيات", title_en: "Haqd Al-Nimr story: events & characters", type: "Learn", estMin: 30, goal_ar: "خريطة شخصيات وتسلسل", goal_en: "Character map + sequence", tags: ["حقد النمر", "شخصيات"] },
      { id: "arb-9", title_ar: "مراجعة وحدة: تلخيص + نقاط ضعف", title_en: "Unit review: summary + weak points", type: "Review", estMin: 30, goal_ar: "تثبيت قواعد ومفاهيم", goal_en: "Lock rules & concepts", tags: ["مراجعة", "نقاط ضعف"] },
      { id: "arb-10", title_ar: "تحليل أخطاء العربي: قائمة تصحيح", title_en: "Arabic error analysis: fix list", type: "Review", estMin: 20, goal_ar: "تحديد 3 أخطاء متكررة", goal_en: "Find 3 recurring errors", tags: ["تحليل أخطاء", "متكرر"] },
    ],
  };

  /* -----------------------------
     App State
  ----------------------------- */
  const defaultSettings = {
    studyMin: 25,
    breakMin: 5,
    autoSwitch: true,
    soundEnabled: true,
    focusDefault: false,
    lighterDay: false,
    reviewFreq: 3,
    accent: "iris",
    headerMuted: false, // override
  };

  const defaultStats = {
    completedStudySessions: 0,
    totalStudyMinutes: 0,
    completedBreaks: 0,
    totalBreakMinutes: 0,
    // derived: plan completion %, streak, best day, distribution, etc.
  };

  const state = {
    lang: "ar",
    settings: { ...defaultSettings },
    stats: { ...defaultStats },
    dailyMinutes: {}, // { 'YYYY-MM-DD': minutes }
    reviewedLog: {}, // { 'YYYY-MM-DD': {history:n, religion:n, english:n, arabic:n} }
    activeTab: "home",

    timer: {
      mode: "study", // 'study' | 'break'
      running: false,
      remainingSec: 25 * 60,
      totalSec: 25 * 60,
      lastStartTs: 0,
      // for insight:
      usageHours: loadLS("serag_usage_hours", Array(24).fill(0)),
    },

    plan: null,
    planDoneCore: {}, // { 'subject:taskId' : true } + boosts/reviews may be unique ids
    mistakes: [],
  };

  /* -----------------------------
     Elements
  ----------------------------- */
  const el = {
    // Drawer
    backdrop: $("#backdrop"),
    drawer: $("#drawer"),
    menuBtn: $("#menuBtn"),
    drawerClose: $("#drawerClose"),

    // Header
    pageTitle: $("#pageTitle"),
    langAR: $("#langAR"),
    langEN: $("#langEN"),
    muteBtn: $("#muteBtn"),
    focusBtn: $("#focusBtn"),
    focusCalloutBtn: $("#focusCalloutBtn"),

    // Tabs + nav
    tabPanels: $$("[data-tab-panel]"),
    navItems: $$("[data-tab]"),
    gotoBtns: $$("[data-goto]"),

    // Home
    todayFocus: $("#todayFocus"),
    miniSessions: $("#miniSessions"),
    miniMinutes: $("#miniMinutes"),
    miniPlan: $("#miniPlan"),
    miniStreak: $("#miniStreak"),

    // Sessions
    ring: $("#ring"),
    timerClock: $("#timerClock"),
    timerModeLabel: $("#timerModeLabel"),
    timerHint: $("#timerHint"),
    timerModePill: $("#timerModePill"),
    btnStart: $("#btnStart"),
    btnPause: $("#btnPause"),
    btnReset: $("#btnReset"),
    btnNext: $("#btnNext"),
    studyMin: $("#studyMin"),
    breakMin: $("#breakMin"),
    autoSwitch: $("#autoSwitch"),
    timerToast: $("#timerToast"),
    sessionNotes: $("#sessionNotes"),
    saveNotes: $("#saveNotes"),
    clearNotes: $("#clearNotes"),
    notesStatus: $("#notesStatus"),
    timeInsightChip: $("#timeInsightChip"),
    mStudySessions: $("#mStudySessions"),
    mStudyMinutes: $("#mStudyMinutes"),
    mBreaks: $("#mBreaks"),
    mBreakMinutes: $("#mBreakMinutes"),

    // Plan
    planList: $("#planList"),
    generatePlan: $("#generatePlan"),
    regenPlan: $("#regenPlan"),
    rebalancePlan: $("#rebalancePlan"),
    copyPlan: $("#copyPlan"),
    lighterDay: $("#lighterDay"),
    reviewFreq: $("#reviewFreq"),
    weakBoostGrid: $("#weakBoostGrid"),
    pillsMode: $$(".pill[data-mode]"),
    pillsSplit: $$(".pill[data-split]"),

    // Stats
    sCompletedSessions: $("#sCompletedSessions"),
    sTotalMinutes: $("#sTotalMinutes"),
    sPlanCompletion: $("#sPlanCompletion"),
    sStreak: $("#sStreak"),
    weeklyChart: $("#weeklyChart"),
    subjectBars: $("#subjectBars"),
    trendText: $("#trendText"),
    consistencyText: $("#consistencyText"),
    focusScoreText: $("#focusScoreText"),
    resetStats: $("#resetStats"),
    resetAll: $("#resetAll"),

    // Mistakes
    mistakeForm: $("#mistakeForm"),
    mSubject: $("#mSubject"),
    mTitle: $("#mTitle"),
    mWrong: $("#mWrong"),
    mCorrect: $("#mCorrect"),
    mFix: $("#mFix"),
    mTags: $("#mTags"),
    mMastered: $("#mMastered"),
    mSearch: $("#mSearch"),
    mFilter: $("#mFilter"),
    mistakeList: $("#mistakeList"),
    reviewToday: $("#reviewToday"),
    reviewModal: $("#reviewModal"),
    reviewBody: $("#reviewBody"),
    closeReview: $("#closeReview"),
    closeReview2: $("#closeReview2"),
    exportMistakes: $("#exportMistakes"),
    importMistakes: $("#importMistakes"),

    // Settings
    setStudyMin: $("#setStudyMin"),
    setBreakMin: $("#setBreakMin"),
    setAutoSwitch: $("#setAutoSwitch"),
    setSound: $("#setSound"),
    setFocusDefault: $("#setFocusDefault"),
    setLighterDay: $("#setLighterDay"),
    setReviewFreq: $("#setReviewFreq"),
    saveDurations: $("#saveDurations"),
    accentBtns: $$(".accent"),
    exportAll: $("#exportAll"),
    importAllFile: $("#importAllFile"),
  };

  /* -----------------------------
     Boot / Load persisted state
  ----------------------------- */
  function loadAll() {
    state.lang = localStorage.getItem(LS.lang) || "ar";

    state.settings = { ...defaultSettings, ...loadLS(LS.settings, {}) };
    document.body.dataset.accent = state.settings.accent || "iris";

    state.stats = { ...defaultStats, ...loadLS(LS.stats, {}) };
    state.dailyMinutes = loadLS(LS.daily, {});
    state.reviewedLog = loadLS(LS.reviewedLog, {});
    state.timer = { ...state.timer, ...loadLS(LS.timer, {}) };
    state.plan = loadLS(LS.plan, null);
    state.planDoneCore = loadLS(LS.planDone, {});
    state.mistakes = loadLS(LS.mistakes, []);
    // Usage hours kept separately (small array)
    state.timer.usageHours = loadLS("serag_usage_hours", Array(24).fill(0));

    // Ensure timer integrity
    const s = clamp(Number(state.settings.studyMin || 25), 10, 90);
    const b = clamp(Number(state.settings.breakMin || 5), 3, 30);
    state.settings.studyMin = s;
    state.settings.breakMin = b;

    if (!state.timer.totalSec || state.timer.totalSec < 60) {
      setTimerMode("study", true);
    }

    // Focus default
    if (state.settings.focusDefault) setFocus(true);
    // Header mute reflect
    updateMuteButton();
  }

  function persistAll() {
    localStorage.setItem(LS.lang, state.lang);
    saveLS(LS.settings, state.settings);
    saveLS(LS.stats, state.stats);
    saveLS(LS.daily, state.dailyMinutes);
    saveLS(LS.reviewedLog, state.reviewedLog);
    saveLS(LS.timer, {
      mode: state.timer.mode,
      running: state.timer.running,
      remainingSec: state.timer.remainingSec,
      totalSec: state.timer.totalSec,
      lastStartTs: 0,
      usageHours: state.timer.usageHours,
    });
    saveLS("serag_usage_hours", state.timer.usageHours);
    saveLS(LS.plan, state.plan);
    saveLS(LS.planDone, state.planDoneCore);
    saveLS(LS.mistakes, state.mistakes);
  }

  /* -----------------------------
     Apply language & UI strings
  ----------------------------- */
  function applyLanguage(lang) {
    state.lang = lang;
    const dict = I18N[lang] || I18N.ar;

    const root = document.documentElement;
    if (lang === "ar") {
      root.setAttribute("lang", "ar");
      root.setAttribute("dir", "rtl");
    } else {
      root.setAttribute("lang", "en");
      root.setAttribute("dir", "ltr");
    }

    // data-i18n text
    $$("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key && dict[key] != null) node.textContent = dict[key];
    });

    // placeholder translations
    $$("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (key && dict[key] != null) node.setAttribute("placeholder", dict[key]);
    });

    // Language buttons state
    el.langAR.classList.toggle("is-active", lang === "ar");
    el.langEN.classList.toggle("is-active", lang === "en");

    // Update title in header based on active tab
    updateHeaderTitle(state.activeTab);

    // Re-render dynamic sections
    renderHome();
    renderTimer();
    renderPlan();
    renderWeakBoostUI();
    renderMistakes();
    renderStats();

    localStorage.setItem(LS.lang, lang);
  }

  function t(key) {
    const dict = I18N[state.lang] || I18N.ar;
    return dict[key] != null ? dict[key] : key;
  }

  /* -----------------------------
     Navigation + Drawer
  ----------------------------- */
  function updateHeaderTitle(tab) {
    const map = {
      home: t("tabHome"),
      sessions: t("tabSessions"),
      plan: t("tabPlan"),
      stats: t("tabStats"),
      mistakes: t("tabMistakes"),
      settings: t("tabSettings"),
    };
    el.pageTitle.textContent = map[tab] || map.home;
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    el.tabPanels.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-tab-panel") === tab));

    // active in all navs
    el.navItems.forEach((btn) => btn.classList.toggle("is-active", btn.getAttribute("data-tab") === tab));
    $$(".bottomNav__item").forEach((btn) => btn.classList.toggle("is-active", btn.getAttribute("data-tab") === tab));

    updateHeaderTitle(tab);

    // close drawer on navigation (mobile)
    closeDrawer();

    // focus main content
    const main = $("#content");
    if (main) main.focus({ preventScroll: true });

    // Render in case
    if (tab === "home") renderHome();
    if (tab === "sessions") renderTimer();
    if (tab === "plan") renderPlan();
    if (tab === "stats") renderStats();
    if (tab === "mistakes") renderMistakes();
    if (tab === "settings") renderSettings();

    persistAll();
  }

  function openDrawer() {
    if (!el.drawer || !el.backdrop) return;
    el.backdrop.hidden = false;
    el.drawer.classList.add("is-open");
    el.drawer.setAttribute("aria-hidden", "false");
    // focus close button for accessibility
    el.drawerClose?.focus?.({ preventScroll: true });
  }

  function closeDrawer() {
    if (!el.drawer || !el.backdrop) return;
    el.drawer.classList.remove("is-open");
    el.drawer.setAttribute("aria-hidden", "true");
    el.backdrop.hidden = true;
  }

  function setupDrawer() {
    el.menuBtn?.addEventListener("click", openDrawer);
    el.drawerClose?.addEventListener("click", closeDrawer);

    // backdrop click
    el.backdrop?.addEventListener("click", closeDrawer);

    // ESC closes
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // close drawer first
        if (el.drawer?.classList.contains("is-open")) closeDrawer();
        // also close modal if open
        if (el.reviewModal?.open) el.reviewModal.close();
      }
    });
  }

  /* -----------------------------
     Focus Mode
  ----------------------------- */
  function setFocus(on) {
    document.body.classList.toggle("is-focus", !!on);
    el.focusBtn?.setAttribute("aria-pressed", on ? "true" : "false");
    state.settings.focusDefault = !!(state.settings.focusDefault); // leave preference to settings toggle
  }

  function toggleFocus() {
    const on = !document.body.classList.contains("is-focus");
    setFocus(on);
  }

  /* -----------------------------
     Mute toggle (header)
  ----------------------------- */
  function updateMuteButton() {
    if (!el.muteBtn) return;
    const muted = !!state.settings.headerMuted;
    el.muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    // Update icon
    const i = el.muteBtn.querySelector("i");
    if (i) i.setAttribute("data-lucide", muted ? "volume-x" : "volume-2");
    safeRefreshIcons();
  }

  function toggleMute() {
    state.settings.headerMuted = !state.settings.headerMuted;
    updateMuteButton();
    persistAll();
  }

  /* -----------------------------
     Lucide icons safe refresh
  ----------------------------- */
  function safeRefreshIcons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch {
      // ignore
    }
  }

  /* -----------------------------
     Toast helper (Timer panel)
  ----------------------------- */
  let toastTimer = 0;
  function toast(msg) {
    if (!el.timerToast) return;
    el.timerToast.textContent = msg || "";
    el.timerToast.style.opacity = msg ? "1" : "0";
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.timerToast.textContent = "";
      el.timerToast.style.opacity = "0";
    }, 2200);
  }

  /* -----------------------------
     Timer (Pomodoro)
  ----------------------------- */
  let interval = 0;

  function setTimerMode(mode, reset) {
    state.timer.mode = mode;
    const min = mode === "study" ? state.settings.studyMin : state.settings.breakMin;
    if (reset) {
      state.timer.totalSec = min * 60;
      state.timer.remainingSec = min * 60;
      state.timer.running = false;
      state.timer.lastStartTs = 0;
    } else {
      // keep remaining but update total if needed
      state.timer.totalSec = Math.max(60, min * 60);
      state.timer.remainingSec = clamp(state.timer.remainingSec, 0, state.timer.totalSec);
    }
    renderTimer();
    persistAll();
  }

  function renderTimer() {
    if (!el.timerClock) return;

    // Sync inputs
    if (el.studyMin) el.studyMin.value = String(state.settings.studyMin);
    if (el.breakMin) el.breakMin.value = String(state.settings.breakMin);
    if (el.autoSwitch) el.autoSwitch.checked = !!state.settings.autoSwitch;

    // Mode label
    const isStudy = state.timer.mode === "study";
    if (el.timerModeLabel) el.timerModeLabel.textContent = isStudy ? t("modeStudy") : t("modeBreak");

    // dot color via class? quick
    const dot = el.timerModePill?.querySelector(".dot");
    if (dot) {
      dot.style.background = isStudy ? "var(--ok)" : "var(--warn)";
      dot.style.boxShadow = isStudy
        ? "0 0 0 4px rgba(57,229,140,.12)"
        : "0 0 0 4px rgba(255,209,102,.14)";
    }

    const mm = Math.floor(state.timer.remainingSec / 60);
    const ss = state.timer.remainingSec % 60;
    el.timerClock.textContent = `${pad2(mm)}:${pad2(ss)}`;

    if (el.timerHint) {
      if (state.timer.running) {
        el.timerHint.textContent = isStudy ? "…" : "…";
      } else {
        el.timerHint.textContent = t("timerHint");
      }
    }

    // Metrics side panel
    if (el.mStudySessions) el.mStudySessions.textContent = String(state.stats.completedStudySessions || 0);
    if (el.mStudyMinutes) el.mStudyMinutes.textContent = String(state.stats.totalStudyMinutes || 0);
    if (el.mBreaks) el.mBreaks.textContent = String(state.stats.completedBreaks || 0);
    if (el.mBreakMinutes) el.mBreakMinutes.textContent = String(state.stats.totalBreakMinutes || 0);

    drawRing();
    updateTimeInsight();
  }

  function drawRing() {
    if (!el.ring) return;
    const ctx = el.ring.getContext("2d");
    if (!ctx) return;

    const w = el.ring.width;
    const h = el.ring.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;

    const total = Math.max(1, state.timer.totalSec);
    const rem = clamp(state.timer.remainingSec, 0, total);
    const p = 1 - rem / total;

    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue("--accent2")?.trim() || "#37d7ff";
    const track = "rgba(255,255,255,.10)";

    ctx.clearRect(0, 0, w, h);

    // track
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.strokeStyle = track;
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();

    // progress
    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();

    // subtle inner glow
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.arc(cx, cy, r - 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  function validateDurations(studyMin, breakMin) {
    const s = Number(studyMin);
    const b = Number(breakMin);
    if (!Number.isFinite(s) || !Number.isFinite(b)) return false;
    if (s < 10 || s > 90) return false;
    if (b < 3 || b > 30) return false;
    return true;
  }

  function updateUsageInsightTick() {
    // Count usage for insight based on when sessions START
    const h = new Date().getHours();
    state.timer.usageHours[h] = (state.timer.usageHours[h] || 0) + 1;
    saveLS("serag_usage_hours", state.timer.usageHours);
  }

  function updateTimeInsight() {
    if (!el.timeInsightChip) return;
    const hours = state.timer.usageHours || Array(24).fill(0);
    const morning = hours.slice(5, 12).reduce((a, b) => a + b, 0);
    const evening = hours.slice(16, 23).reduce((a, b) => a + b, 0);

    let txt = t("insightNeutral");
    if (morning >= evening + 3) txt = t("insightMorning");
    else if (evening >= morning + 3) txt = t("insightEvening");

    el.timeInsightChip.querySelector("span").textContent = txt;
  }

  function beep() {
    // obey mute + sound setting
    if (state.settings.headerMuted) return;
    if (!state.settings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 660;
      g.gain.value = 0.06;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close?.();
      }, 220);
    } catch {
      // ignore
    }
  }

  function alertFinish(kind) {
    // visual
    toast(kind === "study" ? t("toastStudyDone") : t("toastBreakDone"));
    // small beep
    beep();

    // Also a subtle title blink
    const oldTitle = document.title;
    let n = 0;
    const int = setInterval(() => {
      document.title = n % 2 === 0 ? `⏱️ ${oldTitle}` : oldTitle;
      n++;
      if (n > 5) {
        clearInterval(int);
        document.title = oldTitle;
      }
    }, 350);
  }

  function addDailyMinutes(min) {
    const iso = todayISO();
    state.dailyMinutes[iso] = (state.dailyMinutes[iso] || 0) + min;
    saveLS(LS.daily, state.dailyMinutes);
  }

  function markActivityForStreak() {
    // streak derived from activity days: any day with >=1 study session OR >=1 plan task done
    // we already track dailyMinutes for study. For plan done we add tiny marker in dailyMinutes? better: keep plan activity flag
    const iso = todayISO();
    state.dailyMinutes[iso] = state.dailyMinutes[iso] || 0; // ensure exists
    saveLS(LS.daily, state.dailyMinutes);
  }

  function startTimer() {
    if (state.timer.running) return;

    // Mark usage hour insight (when starting a cycle)
    updateUsageInsightTick();

    state.timer.running = true;
    state.timer.lastStartTs = Date.now();

    clearInterval(interval);
    interval = window.setInterval(() => {
      state.timer.remainingSec = Math.max(0, state.timer.remainingSec - 1);
      renderTimer();

      if (state.timer.remainingSec <= 0) {
        clearInterval(interval);
        state.timer.running = false;

        if (state.timer.mode === "study") {
          state.stats.completedStudySessions += 1;
          state.stats.totalStudyMinutes += state.settings.studyMin;
          addDailyMinutes(state.settings.studyMin);
          markActivityForStreak();
          alertFinish("study");
          // Auto switch?
          if (state.settings.autoSwitch) {
            setTimerMode("break", true);
            startTimer();
          } else {
            setTimerMode("break", true);
          }
        } else {
          state.stats.completedBreaks += 1;
          state.stats.totalBreakMinutes += state.settings.breakMin;
          alertFinish("break");
          if (state.settings.autoSwitch) {
            setTimerMode("study", true);
            startTimer();
          } else {
            setTimerMode("study", true);
          }
        }

        persistAll();
        renderHome();
        renderStats();
      }
    }, 1000);

    persistAll();
    renderTimer();
  }

  function pauseTimer() {
    if (!state.timer.running) return;
    state.timer.running = false;
    clearInterval(interval);
    persistAll();
    renderTimer();
  }

  function resetTimer() {
    clearInterval(interval);
    state.timer.running = false;
    setTimerMode(state.timer.mode, true);
    toast(t("reset"));
  }

  function nextTimer() {
    clearInterval(interval);
    state.timer.running = false;
    setTimerMode(state.timer.mode === "study" ? "break" : "study", true);
    toast(t("next"));
  }

  function setupTimerEvents() {
    el.btnStart?.addEventListener("click", startTimer);
    el.btnPause?.addEventListener("click", pauseTimer);
    el.btnReset?.addEventListener("click", resetTimer);
    el.btnNext?.addEventListener("click", nextTimer);

    // Duration inputs (inline)
    const applyFromInputs = () => {
      const s = Number(el.studyMin?.value);
      const b = Number(el.breakMin?.value);
      if (!validateDurations(s, b)) {
        toast(t("toastInvalid"));
        // re-sync
        renderTimer();
        return;
      }
      state.settings.studyMin = s;
      state.settings.breakMin = b;
      if (el.autoSwitch) state.settings.autoSwitch = !!el.autoSwitch.checked;

      // If currently not running, reset current mode timer to new duration
      if (!state.timer.running) setTimerMode(state.timer.mode, true);

      persistAll();
      toast(t("toastSaved"));
      renderSettings();
    };

    el.studyMin?.addEventListener("change", applyFromInputs);
    el.breakMin?.addEventListener("change", applyFromInputs);
    el.autoSwitch?.addEventListener("change", () => {
      state.settings.autoSwitch = !!el.autoSwitch.checked;
      persistAll();
    });

    // Notes
    const notesKey = "serag_session_notes";
    el.sessionNotes.value = localStorage.getItem(notesKey) || "";
    el.saveNotes?.addEventListener("click", () => {
      localStorage.setItem(notesKey, el.sessionNotes.value || "");
      toast(t("toastSaved"));
    });
    el.clearNotes?.addEventListener("click", () => {
      el.sessionNotes.value = "";
      localStorage.setItem(notesKey, "");
      toast(t("toastCleared"));
    });
  }

  /* -----------------------------
     Finish Plan generator
  ----------------------------- */
  function subjectLabel(subject) {
    return t(`subject_${subject}`);
  }

  function typeLabel(type) {
    const map = { Learn: "typeLearn", Revise: "typeRevise", Practice: "typePractice", Review: "typeReview" };
    return t(map[type] || "typeLearn");
  }

  function getTargetDateByMode(mode) {
    // based on current year
    const year = new Date().getFullYear();
    if (mode === "intensive") return `${year}-05-01`;
    // balanced/light by May 15
    return `${year}-05-15`;
  }

  function getPlanLoadOrInit() {
    if (state.plan && state.plan.days && Array.isArray(state.plan.days)) return;
    state.plan = null;
  }

  function buildTaskPool() {
    // Flatten tasks into pool entries
    const pool = [];
    Object.entries(checklistTasks).forEach(([subject, tasks]) => {
      tasks.forEach((task) => {
        pool.push({
          kind: "task",
          subject,
          taskId: task.id,
          title_ar: task.title_ar,
          title_en: task.title_en,
          type: task.type,
          estMin: task.estMin,
          goal_ar: task.goal_ar,
          goal_en: task.goal_en,
          tags: Array.isArray(task.tags) ? task.tags : [],
          coreId: `${subject}:${task.id}`,
        });
      });
    });
    return pool;
  }

  function pickWeakTagsFromUI() {
    // UI injects checkboxes, we read them
    const picked = { history: [], religion: [], english: [], arabic: [] };
    $$(".weakPick").forEach((cb) => {
      if (!cb.checked) return;
      const subject = cb.getAttribute("data-subject");
      const tag = cb.getAttribute("data-tag");
      if (subject && tag && picked[subject] && picked[subject].length < 3) picked[subject].push(tag);
    });
    return picked;
  }

  function uniqueTagsBySubject() {
    const out = { history: new Set(), religion: new Set(), english: new Set(), arabic: new Set() };
    Object.entries(checklistTasks).forEach(([subject, tasks]) => {
      tasks.forEach((t0) => (t0.tags || []).forEach((tg) => out[subject].add(tg)));
    });
    // Keep it clean (max 6 tags per subject for UI)
    const pickSome = (set) => Array.from(set).slice(0, 6);
    return {
      history: pickSome(out.history),
      religion: pickSome(out.religion),
      english: pickSome(out.english),
      arabic: pickSome(out.arabic),
    };
  }

  function renderWeakBoostUI() {
    if (!el.weakBoostGrid) return;
    const tags = uniqueTagsBySubject();
    const picked = state.plan?.weakBoost || { history: [], religion: [], english: [], arabic: [] };

    const blocks = ["history", "religion", "english", "arabic"].map((sub) => {
      const tagList = tags[sub] || [];
      const chips = tagList
        .map((tg) => {
          const isOn = (picked[sub] || []).includes(tg);
          return `
            <label class="badge" style="cursor:pointer;">
              <input class="weakPick" type="checkbox" data-subject="${sub}" data-tag="${escapeHtml(tg)}" ${isOn ? "checked" : ""} />
              <span>${escapeHtml(tg)}</span>
            </label>
          `;
        })
        .join("");

      return `
        <div class="mCard">
          <div class="mCard__title">${subjectLabel(sub)}</div>
          <div class="mCard__meta">${t("weakBoostHint")}</div>
          <div class="mCard__actions" style="margin-top:10px">${chips || `<span class="muted">—</span>`}</div>
        </div>
      `;
    });

    el.weakBoostGrid.innerHTML = blocks.join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shuffleWithSeed(arr, seedStr) {
    // deterministic shuffle for "regenerate variation"
    const a = arr.slice();
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

    const rand = () => {
      // xorshift32
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };

    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function scoreTask(task, weakBoost) {
    // Higher score means earlier scheduling
    let s = 0;
    if (task.type === "Learn") s += 2;
    if (task.type === "Practice") s += 1.5;
    if (task.type === "Review") s += 1.2;

    const picks = weakBoost?.[task.subject] || [];
    if (picks.length) {
      const overlap = task.tags.filter((tg) => picks.includes(tg)).length;
      if (overlap) s += 3 + overlap;
    }
    // slight subject balancing via random component is handled in generation
    return s;
  }

  function insertMicroBlocks(dayItems, dayIndex, reviewFreq) {
    // every N days, add a micro-block
    if (reviewFreq <= 0) return;
    if ((dayIndex + 1) % reviewFreq === 0) {
      dayItems.push({
        kind: "review",
        subject: "mixed",
        taskId: `micro-${dayIndex + 1}`,
        title_ar: t("microReview"),
        title_en: t("microReview"),
        type: "Review",
        estMin: 12,
        goal_ar: "تحليل أخطاء سريع + تلخيص نقاط التعثر",
        goal_en: "Quick error analysis + summarize stumbling points",
        tags: ["Review", "Error analysis"],
        coreId: `micro:${dayIndex + 1}`,
      });
    }
  }

  function insertWeakBoostBlocks(dayItems, dayISO, weakBoost) {
    // “Increase repetition frequency” safely without questions:
    // Add a 10-min boost review if weak tags exist, once every 5 days per subject.
    const d = isoToDate(dayISO);
    const dayNum = d.getDate(); // simple periodic trigger
    const subs = ["history", "religion", "english", "arabic"];
    subs.forEach((sub) => {
      const picks = weakBoost?.[sub] || [];
      if (!picks.length) return;
      if (dayNum % 5 !== 0) return; // periodic
      const tag = picks[Math.floor(Math.random() * picks.length)];
      dayItems.push({
        kind: "boost",
        subject: sub,
        taskId: `boost-${sub}-${tag}-${dayISO}`,
        title_ar: `${t("boostReview")} — ${tag}`,
        title_en: `${t("boostReview")} — ${tag}`,
        type: "Review",
        estMin: 10,
        goal_ar: "مراجعة مركزة لموضوع ضعيف مع تلخيص نقطة واحدة",
        goal_en: "Focused review of a weak topic with 1-sentence summary",
        tags: ["Boost", tag],
        coreId: `boost:${sub}:${tag}:${dayISO}`,
      });
    });
  }

  function chooseWeeklyLighterDayIndex(totalDays) {
    // pick a consistent weekly lighter day: Friday-ish (index 5) but depends on start day.
    // We'll just mark every 7th day as lighter (dayIndex % 7 === 5).
    // Works fine for Jordan routine (Friday often lighter).
    return (i) => i % 7 === 5;
  }

  function generatePlan({ mode, split, reviewFreq, lighterDay, weakBoost, seed, preserveDone = true }) {
    const start = todayISO();
    const target = getTargetDateByMode(mode);
    let span = daysBetween(start, target);
    if (span < 7) span = 7; // minimum

    // Task pool with scoring
    const pool = buildTaskPool();

    // Score & sort; then shuffle within similar score using seed
    const scored = pool
      .map((x) => ({ ...x, _score: scoreTask(x, weakBoost) }))
      .sort((a, b) => b._score - a._score);

    // apply deterministic shuffle to avoid identical schedule on regenerate
    const seedStr = String(seed || Date.now());
    const ordered = shuffleWithSeed(scored, seedStr);

    // If preserving done, remove tasks already done (coreId marked true)
    const remaining = preserveDone
      ? ordered.filter((it) => !state.planDoneCore[it.coreId])
      : ordered;

    // Build days
    const days = [];
    const isLightDay = chooseWeeklyLighterDayIndex(span);

    // Helper to pull next item by subject priority (for split=4)
    const perSubjectQueues = { history: [], religion: [], english: [], arabic: [] };
    remaining.forEach((it) => perSubjectQueues[it.subject].push(it));

    for (let i = 0; i <= span; i++) {
      const dateISO = addDaysISO(start, i);
      const items = [];
      const light = !!lighterDay && isLightDay(i);

      // Insert micro review blocks regularly (keep even on light day)
      insertMicroBlocks(items, i, Number(reviewFreq) || 3);

      // Weak boost blocks
      insertWeakBoostBlocks(items, dateISO, weakBoost);

      if (split === "four") {
        // 1 from each subject per day (or none if empty)
        ["history", "religion", "english", "arabic"].forEach((sub) => {
          const q = perSubjectQueues[sub];
          if (q && q.length) items.unshift(q.shift()); // keep tasks above micro blocks? We'll place tasks first
        });
      } else {
        // two tasks/day (lighter day might only 1)
        const count = light ? 1 : 2;
        // choose next tasks fairly by cycling subjects
        const subCycle = ["history", "religion", "english", "arabic"];
        let added = 0;
        let guard = 0;
        while (added < count && guard < 20) {
          const sub = subCycle[(i + guard) % subCycle.length];
          const q = perSubjectQueues[sub];
          if (q && q.length) {
            items.unshift(q.shift());
            added++;
          }
          guard++;
          // if queues empty across all, break
          if (subCycle.every((s0) => !perSubjectQueues[s0].length)) break;
        }
        // If still short, grab from any
        while (added < count && subCycle.some((s0) => perSubjectQueues[s0].length)) {
          const anySub = subCycle.find((s0) => perSubjectQueues[s0].length);
          items.unshift(perSubjectQueues[anySub].shift());
          added++;
        }
      }

      // finalize with stable item ids
      const normalized = items.map((it, idx) => ({
        ...it,
        dateISO,
        itemId:
          it.kind === "task"
            ? it.coreId
            : it.coreId, // boosts/micro are unique already by date
        _idx: idx,
      }));

      // If light day label in metadata
      days.push({ dateISO, light, items: normalized });
    }

    // prune trailing empty days
    while (days.length && days[days.length - 1].items.filter((x) => x.kind === "task").length === 0) {
      // keep at least a few days if micro/boost exist
      const last = days[days.length - 1];
      if (last.items.length === 0) days.pop();
      else break;
    }

    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      mode,
      split,
      startDate: start,
      targetDate: target,
      reviewFreq: Number(reviewFreq) || 3,
      lighterDay: !!lighterDay,
      weakBoost: weakBoost || { history: [], religion: [], english: [], arabic: [] },
      seed: seedStr,
      days,
    };

    state.plan = plan;
    persistAll();
    renderPlan();
    renderHome();
    renderStats();
  }

  function renderPlanControlsState() {
    const mode = state.plan?.mode || "balanced";
    const split = state.plan?.split || "two";

    el.pillsMode.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-mode") === mode));
    el.pillsSplit.forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-split") === split));

    if (el.lighterDay) el.lighterDay.checked = !!(state.plan?.lighterDay ?? state.settings.lighterDay);
    if (el.reviewFreq) el.reviewFreq.value = String(state.plan?.reviewFreq ?? state.settings.reviewFreq);
  }

  function planCompletion() {
    // completion = done tasks / total tasks in pool (excluding boosts/micro)
    const total = buildTaskPool().length;
    const done = Object.keys(state.planDoneCore).filter((k) => k.includes(":")).length;
    return total ? Math.round((done / total) * 100) : 0;
  }

  function planNextIncompleteTodayOrLater() {
    if (!state.plan?.days?.length) return null;
    const today = todayISO();
    for (const day of state.plan.days) {
      if (day.dateISO < today) continue;
      for (const item of day.items) {
        if (item.kind !== "task") continue;
        if (state.planDoneCore[item.itemId]) continue;
        return { day, item };
      }
    }
    // fallback: any remaining in whole plan
    for (const day of state.plan.days) {
      for (const item of day.items) {
        if (item.kind !== "task") continue;
        if (!state.planDoneCore[item.itemId]) return { day, item };
      }
    }
    return null;
  }

  function markPlanItemDone(itemId, done) {
    if (!itemId) return;
    if (done) state.planDoneCore[itemId] = true;
    else delete state.planDoneCore[itemId];

    // plan activity counts for streak
    markActivityForStreak();

    saveLS(LS.planDone, state.planDoneCore);
    renderPlan();
    renderHome();
    renderStats();
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => toast(t("copied")))
        .catch(() => toast(t("copyFailed")));
    } else {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast(t("copied"));
      } catch {
        toast(t("copyFailed"));
      } finally {
        ta.remove();
      }
    }
  }

  function buildPlanCopyText() {
    if (!state.plan?.days?.length) return "";
    const lang = state.lang;
    const lines = [];
    const title = `${lang === "ar" ? "خطة الختمة — سراج" : "Finish Plan — Serag"}`;
    lines.push(title);
    lines.push(`${lang === "ar" ? "من" : "From"}: ${state.plan.startDate}  →  ${lang === "ar" ? "حتى" : "To"}: ${state.plan.targetDate}`);
    lines.push("");

    state.plan.days.forEach((day) => {
      const dayTitle = `${day.dateISO} (${formatDateHuman(day.dateISO, lang)})${day.light ? ` — ${t("weeklyLight")}` : ""}`;
      lines.push(dayTitle);
      day.items.forEach((it) => {
        const done = it.kind === "task" && !!state.planDoneCore[it.itemId];
        const subject = it.kind === "review" ? (lang === "ar" ? "عام" : "Mixed") : subjectLabel(it.subject);
        const titleText = lang === "ar" ? it.title_ar : it.title_en;
        const goalText = lang === "ar" ? it.goal_ar : it.goal_en;
        const tag = typeLabel(it.type);
        lines.push(`- ${done ? "✅" : "⬜"} [${subject}] ${titleText} — ${tag} — ${it.estMin}${lang === "ar" ? "د" : "m"} | ${t("goal")}: ${goalText}`);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function renderPlan() {
    if (!el.planList) return;

    renderPlanControlsState();
    renderWeakBoostUI();

    if (!state.plan?.days?.length) {
      el.planList.innerHTML = `<div class="glassCard"><div class="muted">${t("planEmpty")}</div></div>`;
      return;
    }

    // Day-by-day list
    const lang = state.lang;
    const html = state.plan.days
      .map((day) => {
        const itemsHtml = day.items
          .map((it) => {
            const isTask = it.kind === "task";
            const done = isTask && !!state.planDoneCore[it.itemId];

            const subjectText =
              it.kind === "review"
                ? (lang === "ar" ? "عام" : "Mixed")
                : it.kind === "boost"
                ? subjectLabel(it.subject)
                : subjectLabel(it.subject);

            const titleText = lang === "ar" ? it.title_ar : it.title_en;
            const goalText = lang === "ar" ? it.goal_ar : it.goal_en;

            const tags = (it.tags || []).slice(0, 3).map((tg) => `<span class="badge">${escapeHtml(tg)}</span>`).join(" ");

            const actionBtn = isTask
              ? `<button class="btn ${done ? "btn--soft" : "btn--primary"} planDoneBtn" data-item="${escapeHtml(it.itemId)}" data-done="${done ? "1" : "0"}" type="button">
                    ${done ? `<i data-lucide="check-circle-2"></i><span>${t("done")}</span>` : `<i data-lucide="check"></i><span>${t("markDone")}</span>`}
                 </button>`
              : `<span class="chip"><i data-lucide="clock-3"></i><span>${typeLabel(it.type)}</span></span>`;

            return `
              <div class="mCard" style="border-color:${done ? "rgba(57,229,140,.18)" : "rgba(255,255,255,.08)"}">
                <div class="mCard__top">
                  <div>
                    <div class="mCard__title">${escapeHtml(titleText)}</div>
                    <div class="mCard__meta">
                      <span class="badge">${escapeHtml(subjectText)}</span>
                      <span class="badge">${escapeHtml(typeLabel(it.type))}</span>
                      <span class="badge">${escapeHtml(String(it.estMin))} ${t("estMin")}</span>
                    </div>
                  </div>
                  <div>${actionBtn}</div>
                </div>
                <div class="mCard__body">
                  <div><strong>${t("goal")}:</strong> ${escapeHtml(goalText)}</div>
                  <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap">${tags}</div>
                </div>
              </div>
            `;
          })
          .join("");

        return `
          <div class="glassCard">
            <div class="cardHead">
              <div class="cardHead__title">${day.dateISO} <span class="muted">(${formatDateHuman(day.dateISO, lang)})</span></div>
              <div class="cardHead__hint">${day.light ? t("weeklyLight") : ""}</div>
            </div>
            <div class="mistakeList">${itemsHtml || `<div class="muted">—</div>`}</div>
          </div>
        `;
      })
      .join("");

    el.planList.innerHTML = html;

    // Bind buttons
    $$(".planDoneBtn", el.planList).forEach((btn) => {
      btn.addEventListener("click", () => {
        const itemId = btn.getAttribute("data-item");
        const wasDone = btn.getAttribute("data-done") === "1";
        markPlanItemDone(itemId, !wasDone);
      });
    });

    safeRefreshIcons();
  }

  function setupPlanEvents() {
    // default plan control state (if no plan)
    renderPlanControlsState();
    renderWeakBoostUI();

    el.pillsMode.forEach((p) => {
      p.addEventListener("click", () => {
        el.pillsMode.forEach((x) => x.classList.remove("is-active"));
        p.classList.add("is-active");
        // If plan exists, update mode only in controls; regenerate will rebuild
        if (!state.plan) state.plan = { mode: p.getAttribute("data-mode") || "balanced" };
      });
    });
    el.pillsSplit.forEach((p) => {
      p.addEventListener("click", () => {
        el.pillsSplit.forEach((x) => x.classList.remove("is-active"));
        p.classList.add("is-active");
        if (!state.plan) state.plan = { ...(state.plan || {}), split: p.getAttribute("data-split") || "two" };
      });
    });

    el.generatePlan?.addEventListener("click", () => {
      const mode = ($(".pill[data-mode].is-active")?.getAttribute("data-mode")) || state.plan?.mode || "balanced";
      const split = ($(".pill[data-split].is-active")?.getAttribute("data-split")) || state.plan?.split || "two";
      const reviewFreq = Number(el.reviewFreq?.value || state.settings.reviewFreq || 3);
      const lighterDay = !!el.lighterDay?.checked;
      const weakBoost = pickWeakTagsFromUI();

      // store control defaults into settings too
      state.settings.reviewFreq = reviewFreq;
      state.settings.lighterDay = lighterDay;

      generatePlan({
        mode,
        split,
        reviewFreq,
        lighterDay,
        weakBoost,
        seed: Date.now(),
        preserveDone: true,
      });
    });

    el.regenPlan?.addEventListener("click", () => {
      if (!confirm(t("confirmRegen"))) return;
      const mode = state.plan?.mode || ($(".pill[data-mode].is-active")?.getAttribute("data-mode")) || "balanced";
      const split = state.plan?.split || ($(".pill[data-split].is-active")?.getAttribute("data-split")) || "two";
      const reviewFreq = Number(el.reviewFreq?.value || state.plan?.reviewFreq || 3);
      const lighterDay = !!el.lighterDay?.checked;
      const weakBoost = pickWeakTagsFromUI();

      generatePlan({
        mode,
        split,
        reviewFreq,
        lighterDay,
        weakBoost,
        seed: Date.now(), // new variation
        preserveDone: true,
      });
    });

    el.copyPlan?.addEventListener("click", () => {
      const txt = buildPlanCopyText();
      copyText(txt);
    });

    el.rebalancePlan?.addEventListener("click", () => {
      if (!state.plan?.days?.length) return;
      if (!confirm(t("confirmRebalance"))) return;
      rebalanceFromToday();
    });
  }

  function rebalanceFromToday() {
    // Gather remaining tasks (not done) in current plan and rebuild schedule from today onwards.
    const remainingTasks = [];
    const weakBoost = state.plan?.weakBoost || { history: [], religion: [], english: [], arabic: [] };

    // All tasks in the master checklist that are not done:
    buildTaskPool().forEach((task) => {
      if (!state.planDoneCore[task.coreId]) remainingTasks.push(task);
    });

    // Build a new plan but preserving done tasks via planDoneCore already
    const mode = state.plan?.mode || "balanced";
    const split = state.plan?.split || "two";
    const reviewFreq = state.plan?.reviewFreq || state.settings.reviewFreq || 3;
    const lighterDay = state.plan?.lighterDay ?? state.settings.lighterDay;

    // Temporarily create a pool using remainingTasks by marking done for everything else already exists.
    // Our generator already filters using planDoneCore, so we just regenerate with new seed.
    generatePlan({
      mode,
      split,
      reviewFreq,
      lighterDay,
      weakBoost,
      seed: Date.now() + "-rebalance",
      preserveDone: true,
    });
  }

  /* -----------------------------
     Home (Today’s focus + mini stats)
  ----------------------------- */
  function computeStreak() {
    // A streak day counts if:
    // - dailyMinutes[date] > 0 OR any plan completion happened that day (we ensure day exists when plan is marked done)
    const keys = Object.keys(state.dailyMinutes || {}).sort();
    if (!keys.length) return 0;

    const today = todayISO();
    let streak = 0;
    let cur = today;

    while (true) {
      const m = state.dailyMinutes[cur];
      const has = typeof m === "number" && m >= 0 && (m > 0 || cur in state.dailyMinutes);
      // Note: we keep day marker for plan activity by setting key exist with 0.
      // For sessions, minutes>0.
      if (!has) break;
      streak += 1;
      cur = addDaysISO(cur, -1);
    }
    return streak;
  }

  function renderHome() {
    // Today focus
    if (el.todayFocus) {
      const next = planNextIncompleteTodayOrLater();
      if (!state.plan?.days?.length) {
        el.todayFocus.innerHTML = `<div class="muted">${t("planEmpty")}</div>`;
      } else if (!next) {
        el.todayFocus.innerHTML = `<div class="muted">🎉 ${state.lang === "ar" ? "ممتاز! خلصت كل مهام الخطة." : "Great! You finished all plan tasks."}</div>`;
      } else {
        const { day, item } = next;
        const titleText = state.lang === "ar" ? item.title_ar : item.title_en;
        const goalText = state.lang === "ar" ? item.goal_ar : item.goal_en;
        el.todayFocus.innerHTML = `
          <div style="display:flex; gap:10px; align-items:flex-start; justify-content:space-between;">
            <div>
              <div style="font-weight:950;">${escapeHtml(titleText)}</div>
              <div class="muted" style="margin-top:4px;">
                ${day.dateISO} • ${escapeHtml(subjectLabel(item.subject))} • ${escapeHtml(typeLabel(item.type))}
              </div>
              <div class="muted" style="margin-top:8px; line-height:1.6">
                <strong>${t("goal")}:</strong> ${escapeHtml(goalText)}
              </div>
            </div>
            <span class="badge">${escapeHtml(String(item.estMin))} ${t("estMin")}</span>
          </div>
        `;
      }
    }

    // Mini stats
    const streak = computeStreak();
    if (el.miniSessions) el.miniSessions.textContent = String(state.stats.completedStudySessions || 0);
    if (el.miniMinutes) el.miniMinutes.textContent = String(state.stats.totalStudyMinutes || 0);
    if (el.miniPlan) el.miniPlan.textContent = `${planCompletion()}%`;
    if (el.miniStreak) el.miniStreak.textContent = String(streak);
  }

  /* -----------------------------
     Mistake Notebook
  ----------------------------- */
  const SR_INTERVALS = [1, 3, 7, 14];

  function nextReviewDate(fromISO, idx) {
    const days = SR_INTERVALS[clamp(idx, 0, SR_INTERVALS.length - 1)];
    return addDaysISO(fromISO, days);
  }

  function addMistakeEntry(entry) {
    state.mistakes.unshift(entry);
    saveLS(LS.mistakes, state.mistakes);
    renderMistakes();
    renderStats();
  }

  function renderMistakes() {
    if (!el.mistakeList) return;

    const q = (el.mSearch?.value || "").trim().toLowerCase();
    const f = el.mFilter?.value || "all";

    const items = (state.mistakes || []).filter((m) => {
      if (f !== "all" && m.subject !== f) return false;
      if (!q) return true;
      const blob = `${m.title} ${m.wrong} ${m.correct} ${m.fix} ${(m.tags || []).join(" ")}`.toLowerCase();
      return blob.includes(q);
    });

    if (!items.length) {
      el.mistakeList.innerHTML = `<div class="muted">${state.lang === "ar" ? "لا يوجد عناصر تطابق البحث." : "No items match your search."}</div>`;
      return;
    }

    const lang = state.lang;
    el.mistakeList.innerHTML = items
      .map((m) => {
        const due = !m.mastered && m.nextReviewDate && m.nextReviewDate <= todayISO();
        const meta = [
          subjectLabel(m.subject),
          m.dateISO,
          m.mastered ? (lang === "ar" ? "متقن" : "Mastered") : (due ? (lang === "ar" ? "مستحق" : "Due") : (lang === "ar" ? "غير مستحق" : "Not due")),
        ].join(" • ");

        const tags = (m.tags || []).slice(0, 4).map((tg) => `<span class="badge">${escapeHtml(tg)}</span>`).join(" ");

        return `
          <div class="mCard">
            <div class="mCard__top">
              <div>
                <div class="mCard__title">${escapeHtml(m.title)}</div>
                <div class="mCard__meta">${escapeHtml(meta)}</div>
              </div>
              <div class="mCard__actions" style="margin-top:0">
                <button class="btn btn--ghost smallBtn" data-action="toggleMastered" data-id="${m.id}" type="button">
                  <i data-lucide="badge-check"></i><span>${lang === "ar" ? (m.mastered ? "إلغاء متقن" : "متقن") : (m.mastered ? "Unmaster" : "Mastered")}</span>
                </button>
                <button class="btn btn--danger smallBtn" data-action="delete" data-id="${m.id}" type="button">
                  <i data-lucide="trash-2"></i><span>${lang === "ar" ? "حذف" : "Delete"}</span>
                </button>
              </div>
            </div>
            <div class="mCard__body">
              <div><strong>${t("whatWentWrong")}:</strong> ${escapeHtml(m.wrong)}</div>
              <div style="margin-top:8px"><strong>${t("correctConcept")}:</strong> ${escapeHtml(m.correct)}</div>
              <div style="margin-top:8px"><strong>${t("fixAction")}:</strong> ${escapeHtml(m.fix)}</div>
              <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">${tags}</div>
              <div class="muted" style="margin-top:10px">
                ${m.mastered ? (lang === "ar" ? "تم إتقان هذا الخطأ." : "This mistake is mastered.") :
                  (m.nextReviewDate ? `${t("nextReviewIn")} ${escapeHtml(m.nextReviewDate)}` : "")}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // bind actions
    $$(".smallBtn", el.mistakeList).forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (action === "delete") {
          state.mistakes = state.mistakes.filter((m) => m.id !== id);
          saveLS(LS.mistakes, state.mistakes);
          renderMistakes();
          renderStats();
        } else if (action === "toggleMastered") {
          const m = state.mistakes.find((x) => x.id === id);
          if (!m) return;
          m.mastered = !m.mastered;
          // if unmastered, set next review to today + 1
          if (!m.mastered) {
            m.intervalIndex = 0;
            m.nextReviewDate = nextReviewDate(todayISO(), 0);
          } else {
            m.nextReviewDate = null;
          }
          saveLS(LS.mistakes, state.mistakes);
          renderMistakes();
          renderStats();
        }
      });
    });

    safeRefreshIcons();
  }

  function openReviewModal(cards) {
    if (!el.reviewModal || !el.reviewBody) return;

    const lang = state.lang;
    if (!cards.length) {
      el.reviewBody.innerHTML = `<div class="muted">${t("reviewNone")}</div>`;
    } else {
      el.reviewBody.innerHTML = cards
        .map((m) => {
          return `
            <div class="mCard">
              <div class="mCard__title">${escapeHtml(m.title)} <span class="muted">• ${escapeHtml(subjectLabel(m.subject))}</span></div>
              <div class="mCard__body">
                <div><strong>${t("whatWentWrong")}:</strong> ${escapeHtml(m.wrong)}</div>
                <div style="margin-top:8px"><strong>${t("correctConcept")}:</strong> ${escapeHtml(m.correct)}</div>
                <div style="margin-top:8px"><strong>${t("fixAction")}:</strong> ${escapeHtml(m.fix)}</div>
              </div>
              <div class="mCard__actions">
                <button class="btn btn--primary reviewMark" data-id="${m.id}" type="button">
                  <i data-lucide="repeat"></i><span>${t("reviewed")}</span>
                </button>
                <button class="btn btn--soft reviewMaster" data-id="${m.id}" type="button">
                  <i data-lucide="badge-check"></i><span>${lang === "ar" ? "وضع متقن" : "Mark mastered"}</span>
                </button>
              </div>
            </div>
          `;
        })
        .join("");
    }

    el.reviewModal.showModal();
    safeRefreshIcons();

    // bind
    $$(".reviewMark", el.reviewBody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const m = state.mistakes.find((x) => x.id === id);
        if (!m) return;
        // advance interval
        const idx = clamp((m.intervalIndex ?? 0) + 1, 0, SR_INTERVALS.length - 1);
        m.intervalIndex = idx;
        m.nextReviewDate = nextReviewDate(todayISO(), idx);
        m.mastered = false;

        // log review for subject distribution
        const d = todayISO();
        state.reviewedLog[d] = state.reviewedLog[d] || { history: 0, religion: 0, english: 0, arabic: 0 };
        state.reviewedLog[d][m.subject] = (state.reviewedLog[d][m.subject] || 0) + 1;
        saveLS(LS.reviewedLog, state.reviewedLog);

        saveLS(LS.mistakes, state.mistakes);
        renderMistakes();
        renderStats();
        openReviewModal(pickDueMistakes(5)); // refresh list
      });
    });

    $$(".reviewMaster", el.reviewBody).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const m = state.mistakes.find((x) => x.id === id);
        if (!m) return;
        m.mastered = true;
        m.nextReviewDate = null;
        saveLS(LS.mistakes, state.mistakes);
        renderMistakes();
        renderStats();
        openReviewModal(pickDueMistakes(5));
      });
    });
  }

  function pickDueMistakes(n = 5) {
    const due = (state.mistakes || []).filter((m) => !m.mastered && m.nextReviewDate && m.nextReviewDate <= todayISO());
    // shuffle
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [due[i], due[j]] = [due[j], due[i]];
    }
    return due.slice(0, n);
  }

  function setupMistakesEvents() {
    el.mistakeForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const subject = el.mSubject?.value || "history";
      const title = (el.mTitle?.value || "").trim();
      const wrong = (el.mWrong?.value || "").trim();
      const correct = (el.mCorrect?.value || "").trim();
      const fix = (el.mFix?.value || "").trim();
      const tags = (el.mTags?.value || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 8);

      if (!title || !wrong || !correct || !fix) return;

      const iso = todayISO();
      const entry = {
        id: uid(),
        subject,
        title,
        wrong,
        correct,
        fix,
        tags,
        dateISO: iso,
        intervalIndex: 0,
        nextReviewDate: nextReviewDate(iso, 0),
        mastered: !!el.mMastered?.checked,
      };
      if (entry.mastered) entry.nextReviewDate = null;

      addMistakeEntry(entry);

      // clear form
      el.mTitle.value = "";
      el.mWrong.value = "";
      el.mCorrect.value = "";
      el.mFix.value = "";
      el.mTags.value = "";
      el.mMastered.checked = false;
    });

    el.mSearch?.addEventListener("input", renderMistakes);
    el.mFilter?.addEventListener("change", renderMistakes);

    el.reviewToday?.addEventListener("click", () => {
      openReviewModal(pickDueMistakes(5));
    });

    el.closeReview?.addEventListener("click", () => el.reviewModal?.close());
    el.closeReview2?.addEventListener("click", () => el.reviewModal?.close());

    el.exportMistakes?.addEventListener("click", () => {
      downloadJSON({ mistakes: state.mistakes }, `serag-mistakes-${todayISO()}.json`);
    });

    el.importMistakes?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = safeJSON(text, null);
      if (!data || !Array.isArray(data.mistakes)) return;
      state.mistakes = data.mistakes;
      saveLS(LS.mistakes, state.mistakes);
      renderMistakes();
      renderStats();
      e.target.value = "";
    });
  }

  /* -----------------------------
     Statistics
  ----------------------------- */
  function bestDay() {
    const entries = Object.entries(state.dailyMinutes || {});
    if (!entries.length) return null;
    entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    return { dateISO: entries[0][0], minutes: entries[0][1] || 0 };
  }

  function weeklySeries() {
    const end = todayISO();
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDaysISO(end, -i);
      arr.push({ dateISO: d, minutes: state.dailyMinutes[d] || 0 });
    }
    return arr;
  }

  function subjectDistribution() {
    // based on:
    // - plan tasks done (coreId counts by subject)
    // - mistakes reviewed (reviewedLog) counts by subject
    const dist = { history: 0, religion: 0, english: 0, arabic: 0 };

    Object.keys(state.planDoneCore || {}).forEach((coreId) => {
      const parts = coreId.split(":");
      const subject = parts[0];
      if (dist[subject] != null) dist[subject] += 1;
    });

    // add reviewed counts (last 14 days weight)
    const today = todayISO();
    for (let i = 0; i < 14; i++) {
      const d = addDaysISO(today, -i);
      const row = state.reviewedLog[d];
      if (!row) continue;
      Object.keys(dist).forEach((s) => {
        dist[s] += (row[s] || 0) * 0.5; // lighter weight
      });
    }

    return dist;
  }

  function focusScore() {
    const sessions = state.stats.completedStudySessions || 0;
    const planDone = Object.keys(state.planDoneCore || {}).filter((k) => k.includes(":")).length;
    // simple bounded score
    return clamp(Math.round(sessions * 2 + planDone * 1.5), 0, 999);
  }

  function trendText() {
    const w = weeklySeries();
    const a = w.slice(0, 3).reduce((s, x) => s + x.minutes, 0);
    const b = w.slice(4, 7).reduce((s, x) => s + x.minutes, 0);
    if (b > a + 15) return state.lang === "ar" ? "ترندك صاعد هذا الأسبوع 📈" : "Your trend is up this week 📈";
    if (a > b + 15) return state.lang === "ar" ? "ترندك نازل—ارجع ثبت روتينك 📉" : "Trend is down—stabilize your routine 📉";
    return state.lang === "ar" ? "ترندك ثابت تقريبًا ➖" : "Trend is roughly stable ➖";
  }

  function consistencyText() {
    const w = weeklySeries();
    const daysActive = w.filter((x) => x.minutes > 0 || (x.dateISO in state.dailyMinutes)).length;
    if (daysActive >= 5) return state.lang === "ar" ? "اتساق ممتاز (5+ أيام/أسبوع) ✅" : "Great consistency (5+ days/week) ✅";
    if (daysActive >= 3) return state.lang === "ar" ? "اتساق جيد (3–4 أيام) 👍" : "Good consistency (3–4 days) 👍";
    return state.lang === "ar" ? "بدك تثبيت (≤2 أيام) 🔧" : "Needs consistency (≤2 days) 🔧";
  }

  function renderWeeklyChart() {
    if (!el.weeklyChart) return;
    const ctx = el.weeklyChart.getContext("2d");
    if (!ctx) return;

    const w = el.weeklyChart.width;
    const h = el.weeklyChart.height;

    ctx.clearRect(0, 0, w, h);

    const series = weeklySeries();
    const max = Math.max(60, ...series.map((x) => x.minutes));
    const pad = 36;

    // axis
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    for (let i = 1; i <= 3; i++) {
      const y = pad + ((h - pad * 2) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    // line
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue("--accent2")?.trim() || "#37d7ff";

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const xStep = (w - pad * 2) / (series.length - 1);
    const yScale = (h - pad * 2) / max;

    ctx.beginPath();
    series.forEach((p, i) => {
      const x = pad + xStep * i;
      const y = h - pad - p.minutes * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points
    ctx.fillStyle = "rgba(255,255,255,.9)";
    series.forEach((p, i) => {
      const x = pad + xStep * i;
      const y = h - pad - p.minutes * yScale;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // labels (small)
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = "12px Inter, Cairo, system-ui";
    series.forEach((p, i) => {
      const x = pad + xStep * i;
      const d = isoToDate(p.dateISO);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      ctx.fillText(label, x - 14, h - pad + 18);
    });
  }

  function renderSubjectBars() {
    if (!el.subjectBars) return;
    const dist = subjectDistribution();
    const max = Math.max(1, ...Object.values(dist));
    const subs = ["history", "religion", "english", "arabic"];

    el.subjectBars.innerHTML = subs
      .map((s) => {
        const v = dist[s] || 0;
        const pct = Math.round((v / max) * 100);
        return `
          <div style="margin-top:10px">
            <div class="row row--spread" style="align-items:baseline">
              <div style="font-weight:900">${escapeHtml(subjectLabel(s))}</div>
              <div class="muted">${v.toFixed(1)}</div>
            </div>
            <div style="height:10px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-top:8px;">
              <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--accent1), var(--accent2));"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderStats() {
    const streak = computeStreak();

    if (el.sCompletedSessions) el.sCompletedSessions.textContent = String(state.stats.completedStudySessions || 0);
    if (el.sTotalMinutes) el.sTotalMinutes.textContent = String(state.stats.totalStudyMinutes || 0);
    if (el.sPlanCompletion) el.sPlanCompletion.textContent = `${planCompletion()}%`;
    if (el.sStreak) el.sStreak.textContent = String(streak);

    if (el.trendText) el.trendText.textContent = trendText();
    if (el.consistencyText) el.consistencyText.textContent = consistencyText();
    if (el.focusScoreText) {
      el.focusScoreText.textContent =
        state.lang === "ar" ? `نقاط التركيز: ${focusScore()} ✨` : `Focus score: ${focusScore()} ✨`;
    }

    renderWeeklyChart();
    renderSubjectBars();

    // Also update Home minis
    renderHome();
  }

  function setupStatsEvents() {
    el.resetStats?.addEventListener("click", () => {
      if (!confirm(t("confirmResetStats"))) return;
      state.stats = { ...defaultStats };
      state.dailyMinutes = {};
      state.reviewedLog = {};
      saveLS(LS.stats, state.stats);
      saveLS(LS.daily, state.dailyMinutes);
      saveLS(LS.reviewedLog, state.reviewedLog);
      renderStats();
      renderHome();
    });

    el.resetAll?.addEventListener("click", () => {
      if (!confirm(t("confirmResetAll"))) return;

      // Preserve language + accents? We'll keep settings and lang, but reset data
      state.stats = { ...defaultStats };
      state.dailyMinutes = {};
      state.reviewedLog = {};
      state.plan = null;
      state.planDoneCore = {};
      state.mistakes = [];

      saveLS(LS.stats, state.stats);
      saveLS(LS.daily, state.dailyMinutes);
      saveLS(LS.reviewedLog, state.reviewedLog);
      saveLS(LS.plan, state.plan);
      saveLS(LS.planDone, state.planDoneCore);
      saveLS(LS.mistakes, state.mistakes);

      renderPlan();
      renderMistakes();
      renderStats();
      renderHome();
    });
  }

  /* -----------------------------
     Settings
  ----------------------------- */
  function renderSettings() {
    if (el.setStudyMin) el.setStudyMin.value = String(state.settings.studyMin);
    if (el.setBreakMin) el.setBreakMin.value = String(state.settings.breakMin);
    if (el.setAutoSwitch) el.setAutoSwitch.checked = !!state.settings.autoSwitch;
    if (el.setSound) el.setSound.checked = !!state.settings.soundEnabled;
    if (el.setFocusDefault) el.setFocusDefault.checked = !!state.settings.focusDefault;
    if (el.setLighterDay) el.setLighterDay.checked = !!state.settings.lighterDay;
    if (el.setReviewFreq) el.setReviewFreq.value = String(state.settings.reviewFreq);
  }

  function setupSettingsEvents() {
    el.saveDurations?.addEventListener("click", () => {
      const s = Number(el.setStudyMin?.value);
      const b = Number(el.setBreakMin?.value);
      if (!validateDurations(s, b)) {
        toast(t("toastInvalid"));
        renderSettings();
        return;
      }
      state.settings.studyMin = s;
      state.settings.breakMin = b;

      // sync timer inputs too
      if (el.studyMin) el.studyMin.value = String(s);
      if (el.breakMin) el.breakMin.value = String(b);

      // if not running, reset current mode
      if (!state.timer.running) setTimerMode(state.timer.mode, true);

      persistAll();
      toast(t("toastSaved"));
      renderTimer();
    });

    el.setAutoSwitch?.addEventListener("change", () => {
      state.settings.autoSwitch = !!el.setAutoSwitch.checked;
      persistAll();
      renderTimer();
    });

    el.setSound?.addEventListener("change", () => {
      state.settings.soundEnabled = !!el.setSound.checked;
      persistAll();
    });

    el.setFocusDefault?.addEventListener("change", () => {
      state.settings.focusDefault = !!el.setFocusDefault.checked;
      persistAll();
    });

    el.setLighterDay?.addEventListener("change", () => {
      state.settings.lighterDay = !!el.setLighterDay.checked;
      persistAll();
    });

    el.setReviewFreq?.addEventListener("change", () => {
      const v = clamp(Number(el.setReviewFreq.value), 2, 4);
      state.settings.reviewFreq = v;
      persistAll();
    });

    // Accent
    el.accentBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const accent = b.getAttribute("data-accent");
        if (!accent) return;
        document.body.dataset.accent = accent;
        state.settings.accent = accent;
        persistAll();
        drawRing();
        renderWeeklyChart();
      });
    });

    // Export/Import all
    el.exportAll?.addEventListener("click", () => {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: state.settings,
        stats: state.stats,
        dailyMinutes: state.dailyMinutes,
        reviewedLog: state.reviewedLog,
        plan: state.plan,
        planDoneCore: state.planDoneCore,
        mistakes: state.mistakes,
        lang: state.lang,
      };
      downloadJSON(payload, `serag-backup-${todayISO()}.json`);
    });

    el.importAllFile?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = safeJSON(text, null);
      if (!data) return;

      // restore best-effort
      if (data.settings) state.settings = { ...defaultSettings, ...data.settings };
      if (data.stats) state.stats = { ...defaultStats, ...data.stats };
      if (data.dailyMinutes) state.dailyMinutes = data.dailyMinutes;
      if (data.reviewedLog) state.reviewedLog = data.reviewedLog;
      if (data.plan) state.plan = data.plan;
      if (data.planDoneCore) state.planDoneCore = data.planDoneCore;
      if (Array.isArray(data.mistakes)) state.mistakes = data.mistakes;
      if (data.lang) state.lang = data.lang;

      document.body.dataset.accent = state.settings.accent || "iris";

      persistAll();
      applyLanguage(state.lang);
      renderPlan();
      renderMistakes();
      renderStats();
      renderTimer();
      renderSettings();

      e.target.value = "";
      toast(t("toastSaved"));
    });
  }

  function downloadJSON(obj, filename) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  /* -----------------------------
     Global bindings
  ----------------------------- */
  function setupGlobalBindings() {
    // nav buttons
    el.navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) setActiveTab(tab);
      });
    });

    // goto quick actions
    el.gotoBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-goto");
        if (tab) setActiveTab(tab);
      });
    });

    // language toggles
    el.langAR?.addEventListener("click", () => applyLanguage("ar"));
    el.langEN?.addEventListener("click", () => applyLanguage("en"));

    // mute
    el.muteBtn?.addEventListener("click", () => {
      toggleMute();
      // reflect icon
      updateMuteButton();
    });

    // focus
    el.focusBtn?.addEventListener("click", toggleFocus);
    el.focusCalloutBtn?.addEventListener("click", toggleFocus);
  }

  /* -----------------------------
     Init
  ----------------------------- */
  function init() {
    loadAll();
    setupDrawer();
    setupGlobalBindings();
    setupTimerEvents();
    setupPlanEvents();
    setupMistakesEvents();
    setupStatsEvents();
    setupSettingsEvents();

    // Ensure icons render once
    safeRefreshIcons();

    // Set initial UI
    applyLanguage(state.lang);
    renderSettings();

    // Set initial tab (home)
    setActiveTab("home");

    // Ensure timer in correct mode if stored
    setTimerMode(state.timer.mode || "study", false);
    renderTimer();
    renderHome();
    renderPlan();
    renderMistakes();
    renderStats();

    // Resync controls based on settings if no plan
    if (!state.plan) {
      if (el.lighterDay) el.lighterDay.checked = !!state.settings.lighterDay;
      if (el.reviewFreq) el.reviewFreq.value = String(state.settings.reviewFreq);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

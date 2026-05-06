// js/store.js — Alpine.js global store + all application logic
//
// Register with: registerStore(Alpine) before Alpine.start()

import { auth, db } from "./firebase.js";
import * as DB from "./db.js";
import { translations } from "./i18n.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import {
  debounce,
  beep,
  restToSeconds,
  secondsToRest,
  todayStr,
  formatDate,
  getMonthYear,
  relativeDate,
  generateId,
} from "./utils.js";

const MUSCLE_GROUPS = [
  "Neck",
  "Traps",
  "Shoulders",
  "Chest",
  "Biceps",
  "Forearms",
  "Abs",
  "Quadriceps",
  "Calves",
  "Upper Back",
  "Triceps",
  "Lower Back",
  "Glutes",
  "Hamstring",
];
const PERIODIZATIONS = ["Linear", "Set Range"];
const IV_VALUES = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"];
const LI_VALUES = ["0.25", "0.5", "0.75", "1", "1.25", "2", "5"];

// ─── HELPERS (non-reactive) ───────────────────────────────────
function getMarker(ex, name) {
  return (ex.markers || []).find((m) => m.marker === name)?.markerValue ?? null;
}
function setMarker(ex, name, value) {
  if (!ex.markers) ex.markers = [];
  const m = ex.markers.find((x) => x.marker === name);
  if (value) {
    if (m) m.markerValue = value;
    else ex.markers.push({ marker: name, markerValue: value });
  } else ex.markers = ex.markers.filter((x) => x.marker !== name);
}
function flatExercises(list) {
  const out = [];
  for (const item of list) {
    if (item.isSuperset) item.items.forEach((e) => out.push(e));
    else out.push(item);
  }
  return out;
}

/**
 * Returns the last `count` unique workout dates from an exercise's setHistory,
 * newest first, excluding today.
 */
function getLastWorkoutDates(ex, count = 2) {
  const today = todayStr();
  const dates = new Set();
  for (const entries of Object.values(ex.setHistory ?? {})) {
    for (const e of entries ?? []) {
      if (e?.date && e.date !== today) dates.add(e.date);
    }
  }
  return [...dates].sort().reverse().slice(0, count);
}

/**
 * Check whether the periodization success criteria was met for a given date.
 *
 * Linear    – first set must hit target; all other sets ≥ target − 2.
 * Set Range – first 2 sets must hit target; all other sets ≥ target − 2.
 *
 * Returns true (met), false (failed), or null (no data for that date).
 */
function criteriaMet(ex, date) {
  const periodization = getMarker(ex, "Periodization") ?? "Linear";
  const firstRequired = periodization === "Set Range" ? 2 : 1;
  let hasData = false;
  for (let i = 0; i < ex.sets.length; i++) {
    const set = ex.sets[i];
    const hist = ex.setHistory?.[set.key] ?? [];
    const entry = hist.find((e) => e?.date === date);
    if (!entry) continue;
    hasData = true;
    const target = parseInt(set.reps, 10) || 0;
    const actual = entry.reps ?? 0;
    if (i < firstRequired) {
      if (actual < target) return false;
    } else {
      if (actual < target - 2) return false;
    }
  }
  return hasData ? true : null;
}

export function registerStore(Alpine) {
  Alpine.store("gym", {
    // ── Auth ─────────────────────────────────────────────────
    user: null,
    loading: true,

    // ── i18n ─────────────────────────────────────────────────
    lang: localStorage.getItem("gymbudy-lang") || "en",

    // ── Navigation ───────────────────────────────────────────
    view: "workout", // 'workout' | 'history'
    mode: "workout", // 'workout' | 'config' | 'history'
    sidebarOpen: true,

    // ── Data ─────────────────────────────────────────────────
    programs: [],
    selectedProgramId: null,
    sessions: [],
    selectedSessionId: null,
    exercises: [], // flat Firestore docs for the active session
    globalExercises: [],
    workoutLogs: [],
    historyLoaded: false,

    // ── Config state ─────────────────────────────────────────
    mergeSet: [], // exercise IDs staged for superset merge
    dragIdx: null, // index of the item being dragged
    searchQuery: "",
    searchOpen: false,
    saveStatus: "saved", // 'saved' | 'saving'

    // ── Workout state ─────────────────────────────────────────
    expandedId: null, // exercise doc ID expanded in workout mode
    workoutDraft: {}, // { exerciseId: { "Set 1": { weight, reps }, ... } }
    activeTimers: {}, // { "eid-setIdx": { remaining, intervalId } }

    // ── UI state ─────────────────────────────────────────────
    modal: null, // { type: string, data: any }
    modalForm: {},
    modalChips: [], // selected muscle-group chips in add-exercise modal
    toasts: [],
    manageOpen: false,

    // ─── CONSTANTS (accessible from templates) ────────────────
    MUSCLE_GROUPS,
    PERIODIZATIONS,
    IV_VALUES,
    LI_VALUES,

    // ─── i18n HELPERS ─────────────────────────────────────────
    t(key, ...args) {
      const tr = translations[this.lang] ?? translations.en;
      const entry = tr[key] ?? translations.en[key];
      if (typeof entry === "function") return entry(...args);
      return entry ?? key;
    },

    setLang(langCode) {
      this.lang = langCode;
      localStorage.setItem("gymbudy-lang", langCode);
    },

    // ─── COMPUTED ────────────────────────────────────────────
    get selectedProgram() {
      return this.programs.find((p) => p.id === this.selectedProgramId) ?? null;
    },
    get selectedSession() {
      return this.sessions.find((s) => s.id === this.selectedSessionId) ?? null;
    },

    /** Exercises grouped into display items (standalone or superset). */
    get displayExercises() {
      const sorted = [...this.exercises].sort((a, b) => a.order - b.order);
      const result = [];
      const ssMap = new Map();
      for (const ex of sorted) {
        if (ex.supersetGroup) {
          if (!ssMap.has(ex.supersetGroup)) {
            const g = {
              isSuperset: true,
              supersetGroup: ex.supersetGroup,
              items: [],
              order: ex.order,
            };
            ssMap.set(ex.supersetGroup, g);
            result.push(g);
          }
          ssMap.get(ex.supersetGroup).items.push(ex);
        } else {
          result.push({ isSuperset: false, ...ex });
        }
      }
      return result;
    },

    /** Exercises visible in the autocomplete dropdown. */
    get filteredGlobal() {
      const q = this.searchQuery.toLowerCase().trim();
      const src = q
        ? this.globalExercises.filter((e) => e.name.toLowerCase().includes(q))
        : this.globalExercises;
      return src.slice(0, 10);
    },

    get hasUnsaved() {
      return this.saveStatus === "saving";
    },

    // ─── INIT ────────────────────────────────────────────────
    async init() {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          window.location.href = "./index.html";
          return;
        }
        this.user = user;
        await this.loadInitialData();
        this.loading = false;
      });
    },

    async loadInitialData() {
      const [programs, globalExercises] = await Promise.all([
        DB.getPrograms(this.user.uid),
        DB.getGlobalExercises(),
      ]);
      this.programs = programs;
      this.globalExercises = globalExercises;
      if (programs.length > 0) await this.selectProgram(programs[0].id);
    },

    async logout() {
      await signOut(auth);
      window.location.href = "./index.html";
    },

    // ─── NAVIGATION ──────────────────────────────────────────
    async switchView(v) {
      this.view = v;
      if (v === "history" && !this.historyLoaded) {
        this.workoutLogs = await DB.getWorkoutLogs(this.user.uid);
        this.historyLoaded = true;
      }
    },

    async loadHistory() {
      if (!this.historyLoaded) {
        this.workoutLogs = await DB.getWorkoutLogs(this.user.uid);
        this.historyLoaded = true;
      }
    },

    sessionLogs() {
      const logs = this.workoutLogs.filter(
        (log) => log.sessionId === this.selectedSessionId,
      );
      const byDate = new Map();
      const tsMs = (log) => {
        const ts = log.updatedAt ?? log.loggedAt;
        if (!ts) return 0;
        if (typeof ts.toMillis === "function") return ts.toMillis();
        if (typeof ts.seconds === "number") return ts.seconds * 1000;
        const parsed = Date.parse(ts);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      for (const log of logs) {
        const prev = byDate.get(log.date);
        if (!prev || tsMs(log) > tsMs(prev)) byDate.set(log.date, log);
      }

      return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
    },

    // ─── PROGRAMS ────────────────────────────────────────────
    async selectProgram(pid) {
      this.selectedProgramId = pid;
      this.selectedSessionId = null;
      this.exercises = [];
      this.sessions = await DB.getSessions(this.user.uid, pid);
      if (this.sessions.length > 0)
        await this.selectSession(this.sessions[0].id);
    },

    async addProgram() {
      const { name, desc: description } = this.modalForm;
      if (!name.trim()) return;
      const p = await DB.addProgram(this.user.uid, {
        name: name.trim(),
        description: description ?? "",
      });
      this.programs.push(p);
      await this.selectProgram(p.id);
      this.showToast("toast_program_created");
      this.closeModal();
    },

    async editProgram() {
      const pid = this.modal.data;
      const { name, desc: description } = this.modalForm;
      if (!name.trim()) return;
      await DB.updateProgram(this.user.uid, pid, {
        name: name.trim(),
        description: description ?? "",
      });
      const p = this.programs.find((x) => x.id === pid);
      if (p) {
        p.name = name.trim();
        p.description = description ?? "";
      }
      this.showToast("toast_program_updated");
      this.closeModal();
    },

    async deleteProgram() {
      const pid = this.modal.data;
      await DB.deleteProgram(this.user.uid, pid);
      this.programs = this.programs.filter((x) => x.id !== pid);
      if (this.selectedProgramId === pid) {
        this.selectedProgramId = null;
        this.selectedSessionId = null;
        this.sessions = [];
        this.exercises = [];
        if (this.programs.length) await this.selectProgram(this.programs[0].id);
      }
      this.showToast("toast_program_deleted");
      this.closeModal();
    },

    // ─── SESSIONS ────────────────────────────────────────────
    async selectSession(sid) {
      this.selectedSessionId = sid;
      this.exercises = [];
      this.expandedId = null;
      this.mergeSet = [];
      this.workoutDraft = this._loadDraft(sid);
      this.exercises = await DB.getSessionExercises(
        this.user.uid,
        this.selectedProgramId,
        sid,
      );
    },

    async addSession() {
      const { name } = this.modalForm;
      if (!name.trim() || !this.selectedProgramId) return;
      const order = this.sessions.length;
      const s = await DB.addSession(this.user.uid, this.selectedProgramId, {
        name: name.trim(),
        order,
      });
      this.sessions.push(s);
      await this.selectSession(s.id);
      this.showToast("toast_day_created");
      this.closeModal();
    },

    async editSession() {
      const sid = this.modal.data;
      const { name } = this.modalForm;
      if (!name.trim()) return;
      await DB.updateSession(this.user.uid, this.selectedProgramId, sid, {
        name: name.trim(),
      });
      const s = this.sessions.find((x) => x.id === sid);
      if (s) s.name = name.trim();
      this.showToast("toast_day_updated");
      this.closeModal();
    },

    async deleteSession() {
      const sid = this.modal.data;
      await DB.deleteSession(this.user.uid, this.selectedProgramId, sid);
      this.sessions = this.sessions.filter((x) => x.id !== sid);
      if (this.selectedSessionId === sid) {
        this.selectedSessionId = null;
        this.exercises = [];
        if (this.sessions.length) await this.selectSession(this.sessions[0].id);
      }
      this.showToast("toast_day_deleted");
      this.closeModal();
    },

    // ─── EXERCISES ───────────────────────────────────────────
    async addExerciseToSession(globalEx) {
      if (!this.selectedSessionId) return;
      const uid = this.user.uid,
        pid = this.selectedProgramId,
        sid = this.selectedSessionId;
      // Prevent duplicates
      if (this.exercises.some((e) => e.globalId === globalEx.id)) {
        this.showToast("toast_already_in_session", "error");
        return;
      }
      const order = this.exercises.length + 1;
      const data = {
        globalId: globalEx.id,
        name: globalEx.name,
        videoLink: globalEx.videoLink ?? "",
        muscleGroups: globalEx.muscleGroups ?? [],
        order,
        supersetGroup: null,
        sets: [{ key: "Set 1", reps: "10", rest: "01:30" }],
        markers: [],
        setHistory: {},
      };
      const saved = await DB.addSessionExercise(uid, pid, sid, data);
      this.exercises.push(saved);
      this.searchQuery = "";
      this.searchOpen = false;
      this._scheduleSave();
    },

    async addCustomExercise() {
      const { name, videoLink } = this.modalForm;
      if (!name.trim()) return;
      const muscleGroups = [...this.modalChips];
      // Add to global library
      const globalEx = await DB.addGlobalExercise({
        name: name.trim(),
        videoLink: videoLink?.trim() ?? "",
        muscleGroups,
        createdBy: this.user.uid,
      });
      this.globalExercises.push(globalEx);
      // Add to session
      await this.addExerciseToSession(globalEx);
      this.showToast("toast_exercise_added");
      this.closeModal();
    },

    async removeExercise(eid) {
      await DB.deleteSessionExercise(
        this.user.uid,
        this.selectedProgramId,
        this.selectedSessionId,
        eid,
      );
      this.exercises = this.exercises.filter((e) => e.id !== eid);
      this.mergeSet = this.mergeSet.filter((x) => x !== eid);
    },

    // ─── SETS CONFIG ─────────────────────────────────────────
    async updateSetField(eid, setIdx, field, value) {
      const ex = this.exercises.find((e) => e.id === eid);
      if (!ex) return;
      ex.sets[setIdx][field] = value;
      this._scheduleSave(ex);
    },

    async addSet(eid) {
      const ex = this.exercises.find((e) => e.id === eid);
      if (!ex || ex.sets.length >= 10) return;
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        key: `Set ${ex.sets.length + 1}`,
        reps: last?.reps ?? "10",
        rest: last?.rest ?? "01:30",
      });
      await this._saveExercise(ex);
    },

    async removeSet(eid, setIdx) {
      const ex = this.exercises.find((e) => e.id === eid);
      if (!ex || ex.sets.length <= 1) return;
      ex.sets.splice(setIdx, 1);
      ex.sets.forEach((s, i) => {
        s.key = `Set ${i + 1}`;
      });
      await this._saveExercise(ex);
    },

    // ─── MARKERS ─────────────────────────────────────────────
    async updateMarker(eid, markerName, value) {
      const ex = this.exercises.find((e) => e.id === eid);
      if (!ex) return;
      setMarker(ex, markerName, value);
      this._scheduleSave(ex);
    },

    getMarkerValue(eid, markerName) {
      const ex = this.exercises.find((e) => e.id === eid);
      return ex ? getMarker(ex, markerName) : null;
    },

    // ─── SUPERSET ────────────────────────────────────────────
    toggleMerge(eid) {
      const idx = this.mergeSet.indexOf(eid);
      if (idx >= 0) this.mergeSet.splice(idx, 1);
      else this.mergeSet.push(eid);
    },

    async mergeSuperset() {
      if (this.mergeSet.length < 2) return;
      const groupId = "ss-" + generateId();
      const ids = new Set(this.mergeSet);
      const minOrder = Math.min(
        ...this.exercises.filter((e) => ids.has(e.id)).map((e) => e.order),
      );
      let subOrder = 0.1;
      for (const ex of [...this.exercises].sort((a, b) => a.order - b.order)) {
        if (ids.has(ex.id)) {
          ex.supersetGroup = groupId;
          ex.order = minOrder + subOrder;
          subOrder += 0.1;
        }
      }
      this.mergeSet = [];
      await this._batchSaveOrder();
      this.showToast("toast_superset_created");
    },

    async unmergeSuperset(groupId) {
      const members = this.exercises.filter((e) => e.supersetGroup === groupId);
      let order = members.length
        ? Math.floor(members[0].order)
        : this.exercises.length;
      for (const ex of members) {
        ex.supersetGroup = null;
        ex.order = order++;
      }
      await this._batchSaveOrder();
      this.showToast("toast_superset_removed");
    },

    // ─── DRAG AND DROP (config mode) ─────────────────────────
    onDragStart(idx) {
      this.dragIdx = idx;
    },
    onDragOver(idx) {
      if (this.dragIdx === null || this.dragIdx === idx) return;
      // Reorder displayExercises and map back to flat exercises
      const display = this.displayExercises;
      const [moved] = display.splice(this.dragIdx, 1);
      display.splice(idx, 0, moved);
      this.dragIdx = idx;
      // Reassign orders
      let order = 1;
      for (const item of display) {
        if (item.isSuperset) {
          item.items.forEach((ex, i) => {
            const flat = this.exercises.find((e) => e.id === ex.id);
            if (flat) flat.order = order + i * 0.1;
          });
          order++;
        } else {
          const flat = this.exercises.find((e) => e.id === item.id);
          if (flat) flat.order = order++;
        }
      }
    },
    async onDrop() {
      this.dragIdx = null;
      await this._batchSaveOrder();
    },

    // ─── WORKOUT MODE ────────────────────────────────────────
    toggleExpand(eid) {
      this.expandedId = this.expandedId === eid ? null : eid;
    },

    updateWeight(eid, setKey, value) {
      this.workoutDraft = {
        ...this.workoutDraft,
        [eid]: {
          ...(this.workoutDraft[eid] ?? {}),
          [setKey]: { ...(this.workoutDraft[eid]?.[setKey] ?? {}), weight: value },
        },
      };
      this.saveStatus = "saving";
      this._persistDraft();
      this._autosaveWorkoutDebounced();
    },

    updateReps(eid, setKey, value) {
      this.workoutDraft = {
        ...this.workoutDraft,
        [eid]: {
          ...(this.workoutDraft[eid] ?? {}),
          [setKey]: { ...(this.workoutDraft[eid]?.[setKey] ?? {}), reps: value },
        },
      };
      this.saveStatus = "saving";
      this._persistDraft();
      this._autosaveWorkoutDebounced();
    },

    _getTodayEntry(hist) {
      const today = todayStr();
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i]?.date === today) return hist[i];
      }
      return null;
    },

    getDraftWeight(eid, setKey) {
      const set = this.workoutDraft[eid]?.[setKey];
      if (set !== undefined && "weight" in set) return set.weight ?? "";
      const ex = this.exercises.find((e) => e.id === eid);
      const entry = this._getTodayEntry(ex?.setHistory?.[setKey] ?? []);
      return entry?.weight ?? "";
    },

    getDraftReps(eid, setKey) {
      const set = this.workoutDraft[eid]?.[setKey];
      if (set !== undefined && "reps" in set) return set.reps ?? "";
      const ex = this.exercises.find((e) => e.id === eid);
      const entry = this._getTodayEntry(ex?.setHistory?.[setKey] ?? []);
      return entry?.reps ?? "";
    },

    getSetHistory(eid, setKey) {
      const ex = this.exercises.find((e) => e.id === eid);
      const hist = ex?.setHistory?.[setKey] ?? [];
      const today = todayStr();
      return hist.filter((h) => h?.date !== today);
    },

    /** Apply weight goals: prefill each exercise's draft weight based on periodization criteria. */
    applyWeightGoals() {
      for (const ex of this.exercises) {
        const li = parseFloat(getMarker(ex, "LI") ?? "0");
        if (!li) continue;
        const dates = getLastWorkoutDates(ex, 2);
        if (!dates.length) continue;

        const lastMet = criteriaMet(ex, dates[0]);
        const prevMet = dates[1] ? criteriaMet(ex, dates[1]) : null;

        // Two consecutive failures (or drastic drop counted as failure) → deload
        let delta;
        if (lastMet === false && prevMet === false) delta = -(li * 2);
        else if (lastMet === true) delta = li;
        else delta = 0;

        for (const set of ex.sets) {
          const hist = ex.setHistory?.[set.key] ?? [];
          const lastEntry = hist.find((e) => e?.date === dates[0]);
          if (!lastEntry) continue;
          const lastW = parseFloat(lastEntry.weight ?? 0) || 0;
          const goal = Math.round((lastW + delta) * 100) / 100;
          if (!this.workoutDraft[ex.id]) this.workoutDraft[ex.id] = {};
          if (!this.workoutDraft[ex.id][set.key]) this.workoutDraft[ex.id][set.key] = {};
          this.workoutDraft[ex.id][set.key].weight = goal;
        }
      }
      this._persistDraft();
      this.showToast("toast_goals_applied");
      this.closeModal();
    },

    weightGoalRows() {
      const rows = [];
      for (const ex of this.exercises) {
        const li = parseFloat(getMarker(ex, "LI") ?? "0");
        if (!li) continue;
        const dates = getLastWorkoutDates(ex, 2);
        if (!dates.length) continue;

        const lastMet = criteriaMet(ex, dates[0]);
        const prevMet = dates[1] ? criteriaMet(ex, dates[1]) : null;

        let delta, status;
        if (lastMet === false && prevMet === false) {
          delta = -(li * 2);
          status = "deload";
        } else if (lastMet === true) {
          delta = li;
          status = "progress";
        } else {
          delta = 0;
          status = "hold";
        }

        const setRows = [];
        for (const set of ex.sets) {
          const hist = ex.setHistory?.[set.key] ?? [];
          const lastEntry = hist.find((e) => e?.date === dates[0]);
          if (!lastEntry) continue;
          const lastW = parseFloat(lastEntry.weight ?? 0) || 0;
          const goal = Math.round((lastW + delta) * 100) / 100;
          setRows.push({ key: set.key, lastW, goal });
        }
        if (setRows.length) rows.push({ name: ex.name, li, status, delta, sets: setRows });
      }
      return rows;
    },

    async persistWorkoutProgress(showToast = false) {
      if (!this.selectedSessionId) return;
      const today = todayStr();

      const normalizeWeight = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const n = Number.parseFloat(value);
        return Number.isFinite(n) ? n : null;
      };
      const normalizeReps = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
      };

      const logExercises = this.exercises
        .map((ex) => ({
          id: ex.id,
          name: ex.name,
          sets: (ex.sets || [])
            .map((s) => ({
              key: s.key,
              weight: normalizeWeight(this.workoutDraft[ex.id]?.[s.key]?.weight),
              reps: normalizeReps(this.workoutDraft[ex.id]?.[s.key]?.reps),
            }))
            .filter((s) => s.weight != null || s.reps != null),
        }))
        .filter((e) => e.sets.length > 0);

      if (!logExercises.length) return;

      // Upsert a single daily log per program+session+date
      const log = await DB.upsertWorkoutLogByDate(this.user.uid, {
        programId: this.selectedProgramId,
        programName: this.selectedProgram?.name ?? "",
        sessionId: this.selectedSessionId,
        sessionName: this.selectedSession?.name ?? "",
        date: today,
        exercises: logExercises,
      });

      // Update set history on each exercise doc with one entry per date (keep last 5 dates)
      const updatePromises = this.exercises.map((ex) => {
        const draftSets = this.workoutDraft[ex.id];
        if (!draftSets) return Promise.resolve();
        const updatedHistory = { ...(ex.setHistory ?? {}) };
        for (const [setKey, vals] of Object.entries(draftSets)) {
          const weight = normalizeWeight(vals.weight);
          const reps = normalizeReps(vals.reps);
          if (weight == null && reps == null) continue;

          const prev = updatedHistory[setKey] ?? [];
          const todayIdx = prev.findIndex((entry) => entry.date === today);
          const todayEntry = {
            weight: weight,
            reps: reps,
            date: today,
            logId: log.id,
          };

          if (todayIdx >= 0) {
            prev[todayIdx] = todayEntry;
            updatedHistory[setKey] = prev;
          } else {
            updatedHistory[setKey] = [...prev, todayEntry].slice(-5);
          }
        }
        ex.setHistory = updatedHistory;
        return DB.saveWorkoutDraftToExercise(
          this.user.uid,
          this.selectedProgramId,
          this.selectedSessionId,
          ex.id,
          updatedHistory,
        );
      });
      await Promise.all(updatePromises);

      // Upsert in local history cache too
      if (this.historyLoaded) {
        const idx = this.workoutLogs.findIndex((x) => x.id === log.id);
        const merged = {
          ...this.workoutLogs[idx],
          ...log,
          updatedAt: new Date(),
        };
        if (idx >= 0) this.workoutLogs.splice(idx, 1, merged);
        else this.workoutLogs.unshift(merged);
      }

      if (showToast) {
        this.showToast("toast_workout_saved");
        this.closeModal();
      }
    },

    async finishWorkout() {
      await this.persistWorkoutProgress(true);
    },

    // ─── TIMERS ──────────────────────────────────────────────
    startTimer(key, seconds) {
      if (this.activeTimers[key]) {
        clearInterval(this.activeTimers[key].intervalId);
        const t = { ...this.activeTimers };
        delete t[key];
        this.activeTimers = t;
        return;
      }
      let remaining = seconds;
      const intervalId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(this.activeTimers[key]?.intervalId);
          const t = { ...this.activeTimers };
          delete t[key];
          this.activeTimers = t;
          beep();
          this.showToast("toast_rest_done");
          return;
        }
        this.activeTimers = {
          ...this.activeTimers,
          [key]: { remaining, intervalId: this.activeTimers[key].intervalId },
        };
      }, 1000);
      this.activeTimers = {
        ...this.activeTimers,
        [key]: { remaining, intervalId },
      };
    },

    timerDisplay(key) {
      const t = this.activeTimers[key];
      return t ? secondsToRest(t.remaining) : null;
    },

    // ─── MODALS ──────────────────────────────────────────────
    openModal(type, data = null) {
      this.modal = { type, data };
      this.modalForm = {};
      this.modalChips = [];
      if (type === "editProgram") {
        const p = this.programs.find((x) => x.id === data);
        if (p) {
          this.modalForm = { name: p.name, desc: p.description ?? "" };
        }
      }
      if (type === "editSession") {
        const s = this.sessions.find((x) => x.id === data);
        if (s) {
          this.modalForm = { name: s.name };
        }
      }
    },
    closeModal() {
      this.modal = null;
      this.modalForm = {};
      this.modalChips = [];
    },

    toggleChip(muscle) {
      const i = this.modalChips.indexOf(muscle);
      if (i >= 0) this.modalChips.splice(i, 1);
      else this.modalChips.push(muscle);
    },

    // ─── TOASTS ──────────────────────────────────────────────
    showToast(msgOrKey, type = "success") {
      const id = generateId();
      const msg = this.t(msgOrKey);
      this.toasts.push({ id, msg, type });
      setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
      }, 2500);
    },

    // ─── SEARCH ──────────────────────────────────────────────
    _searchDebounced: null, // set lazily below
    onSearch(q) {
      this.searchOpen = q.length > 0 || true; // always open in config mode when focused
      this._searchDebounced(q);
    },
    closeSearch() {
      this.searchOpen = false;
      this.searchQuery = "";
    },

    // ─── HISTORY HELPERS ─────────────────────────────────────
    groupedLogs() {
      const groups = new Map();
      for (const log of this.workoutLogs) {
        const date = new Date(log.date + "T12:00:00");
        const tr = translations[this.lang] ?? translations.en;
        const month = `${tr.months[date.getMonth()]} ${date.getFullYear()}`;
        if (!groups.has(month)) groups.set(month, []);
        groups.get(month).push(log);
      }
      return [...groups.entries()].map(([month, logs]) => ({ month, logs }));
    },

    formatDate(dateStr) {
      const date = new Date(dateStr + "T12:00:00");
      const tr = translations[this.lang] ?? translations.en;
      return `${tr.days_short[date.getDay()]}, ${tr.months_short[date.getMonth()]} ${date.getDate()}`;
    },
    relativeDate(dateStr) {
      const diff = Math.floor(
        (new Date() - new Date(dateStr + "T12:00:00")) / 86400000,
      );
      const tr = translations[this.lang] ?? translations.en;
      if (diff === 0) return tr.today;
      if (diff === 1) return tr.yesterday;
      if (diff < 7) return tr.days_ago(diff);
      if (diff < 30) return tr.weeks_ago(diff);
      if (diff < 365) return tr.months_ago(diff);
      return tr.years_ago(diff);
    },
    secondsToRest(seconds) {
      return secondsToRest(seconds);
    },
    restToSeconds(restStr) {
      return restToSeconds(restStr);
    },

    // ─── INTERNAL SAVE HELPERS ───────────────────────────────
    _scheduleSave: null, // set lazily below

    async _saveExercise(ex) {
      if (!this.selectedSessionId) return;
      const { id, ...data } = ex;
      await DB.updateSessionExercise(
        this.user.uid,
        this.selectedProgramId,
        this.selectedSessionId,
        id,
        data,
      );
    },

    async _batchSaveOrder() {
      this.saveStatus = "saving";
      await DB.batchReorderExercises(
        this.user.uid,
        this.selectedProgramId,
        this.selectedSessionId,
        this.exercises,
      );
      this.saveStatus = "saved";
    },

    // ─── DRAFT PERSISTENCE (localStorage) ────────────────────
    _draftKey(sid) {
      return `gymbudy-draft-${sid}-${todayStr()}`;
    },
    _loadDraft(sid) {
      try {
        return (
          JSON.parse(localStorage.getItem(this._draftKey(sid)) ?? "null") ?? {}
        );
      } catch (_) {
        return {};
      }
    },
    _persistDraft: null, // set lazily below
    _autosaveWorkoutDebounced: null, // set lazily below
    _clearDraft(sid) {
      localStorage.removeItem(this._draftKey(sid));
    },
  });

  // Lazily wire debounced functions (cannot reference `this` inside literal)
  const store = Alpine.store("gym");

  store._scheduleSave = debounce(async (ex) => {
    if (!store.selectedSessionId) return;
    store.saveStatus = "saving";
    if (ex) {
      const { id, ...data } = ex;
      await DB.updateSessionExercise(
        store.user.uid,
        store.selectedProgramId,
        store.selectedSessionId,
        id,
        data,
      );
    }
    store.saveStatus = "saved";
  }, 800);

  store._persistDraft = debounce(() => {
    if (!store.selectedSessionId) return;
    localStorage.setItem(
      store._draftKey(store.selectedSessionId),
      JSON.stringify(store.workoutDraft),
    );
  }, 600);

  store._autosaveWorkoutDebounced = debounce(async () => {
    try {
      await store.persistWorkoutProgress(false);
    } finally {
      store.saveStatus = "saved";
    }
  }, 1000);

  store._searchDebounced = debounce((q) => {
    store.searchQuery = q;
  }, 500);
}

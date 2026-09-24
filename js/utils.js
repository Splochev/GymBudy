// js/utils.js — Shared utilities: icons, timers, date helpers

// ─── ID GENERATION & DEBOUNCE (shared) ────────────────────────
export { generateId, debounce } from 'https://splochev.github.io/personalBudy/js/shared-utils.js';

// ─── AUDIO FEEDBACK ──────────────────────────────────────────
export function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 800;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 800);
  } catch (_) {}
}

// ─── TIME HELPERS ─────────────────────────────────────────────
export function restToSeconds(rest) {
  if (!rest) return 0;
  const [m, s] = rest.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

export function secondsToRest(sec) {
  const m = Math.floor(sec / 60),
    s = sec % 60;
  return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export function getMonthYear(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function relativeDate(dateStr) {
  const diff = Math.floor(
    (new Date() - new Date(dateStr + "T12:00:00")) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
}

// ─── MISC ────────────────────────────────────────────────────
// generateId is re-exported from shared-utils.js above

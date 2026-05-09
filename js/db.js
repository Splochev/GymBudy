// js/db.js — All Firestore read/write operations
//
// Firestore data model:
//   /exercises/{id}                                     — global exercise library
//   /users/{uid}/programs/{pid}                         — workout programs
//   /users/{uid}/programs/{pid}/sessions/{sid}          — workout days
//   /users/{uid}/programs/{pid}/sessions/{sid}/exercises/{eid} — session exercises (flat, supersets via supersetGroup)
//   /users/{uid}/workoutLogs/{lid}                      — completed workout log entries

import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// ─── HELPERS ──────────────────────────────────────────────────
const col = (...segs) => collection(db, segs.join("/"));
const docR = (...segs) => doc(db, segs.join("/"));
// ─── GLOBAL EXERCISES ─────────────────────────────────────────
export async function getGlobalExercises() {
  const snap = await getDocs(
    query(col("exercises"), orderBy("name")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addGlobalExercise({
  name,
  videoLink = "",
  muscleGroups = [],
  createdBy = "system",
}) {
  const ref = await addDoc(col("exercises"), {
    name,
    videoLink,
    muscleGroups,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name, videoLink, muscleGroups, createdBy };
}

// ─── PROGRAMS ─────────────────────────────────────────────────
export async function getPrograms(uid) {
  const snap = await getDocs(
    query(col(`users/${uid}/programs`), orderBy("createdAt")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addProgram(uid, { name, description = "" }) {
  const ref = await addDoc(col(`users/${uid}/programs`), {
    name,
    description,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name, description };
}

export async function updateProgram(uid, pid, changes) {
  await updateDoc(docR(`users/${uid}/programs/${pid}`), changes);
}

export async function deleteProgram(uid, pid) {
  // Delete sessions + their exercises, then the program itself
  const sessSnap = await getDocs(col(`users/${uid}/programs/${pid}/sessions`));
  const batch = writeBatch(db);
  for (const sessDoc of sessSnap.docs) {
    const exSnap = await getDocs(
      col(`users/${uid}/programs/${pid}/sessions/${sessDoc.id}/exercises`),
    );
    exSnap.docs.forEach((e) => batch.delete(e.ref));
    batch.delete(sessDoc.ref);
  }
  batch.delete(docR(`users/${uid}/programs/${pid}`));
  await batch.commit();
}

// ─── SESSIONS ─────────────────────────────────────────────────
export async function getSessions(uid, pid) {
  const snap = await getDocs(
    query(col(`users/${uid}/programs/${pid}/sessions`), orderBy("order")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSession(uid, pid, { name, order = 0 }) {
  const ref = await addDoc(col(`users/${uid}/programs/${pid}/sessions`), {
    name,
    order,
  });
  return { id: ref.id, name, order };
}

export async function updateSession(uid, pid, sid, changes) {
  await updateDoc(
    docR(`users/${uid}/programs/${pid}/sessions/${sid}`),
    changes,
  );
}

export async function deleteSession(uid, pid, sid) {
  const exSnap = await getDocs(
    col(`users/${uid}/programs/${pid}/sessions/${sid}/exercises`),
  );
  const batch = writeBatch(db);
  exSnap.docs.forEach((e) => batch.delete(e.ref));
  batch.delete(docR(`users/${uid}/programs/${pid}/sessions/${sid}`));
  await batch.commit();
}

// ─── SESSION EXERCISES ────────────────────────────────────────
// Each exercise document fields:
//   name, videoLink, muscleGroups (array), order (number, e.g. 1, 2, 3.1, 3.2),
//   supersetGroup (string|null), sets (array), markers (array), setHistory (object)

const EXERCISES_PATH = (uid, pid, sid) =>
  `users/${uid}/programs/${pid}/sessions/${sid}/exercises`;

export async function getSessionExercises(uid, pid, sid) {
  const snap = await getDocs(
    query(col(EXERCISES_PATH(uid, pid, sid)), orderBy("order")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSessionExercise(uid, pid, sid, exerciseData) {
  const ref = await addDoc(col(EXERCISES_PATH(uid, pid, sid)), exerciseData);
  return { id: ref.id, ...exerciseData };
}

export async function updateSessionExercise(uid, pid, sid, eid, data) {
  await setDoc(docR(EXERCISES_PATH(uid, pid, sid), eid), data, { merge: true });
}

export async function deleteSessionExercise(uid, pid, sid, eid) {
  await deleteDoc(docR(EXERCISES_PATH(uid, pid, sid), eid));
}

/** Batch-update the `order` and `supersetGroup` fields for all exercises
 *  (used after drag-and-drop reorder or superset merge/unmerge). */
export async function batchReorderExercises(uid, pid, sid, exercises) {
  const batch = writeBatch(db);
  for (const ex of exercises) {
    const ref = docR(EXERCISES_PATH(uid, pid, sid), ex.id);
    batch.update(ref, {
      order: ex.order,
      supersetGroup: ex.supersetGroup ?? null,
    });
  }
  await batch.commit();
}

/** Persist today's draft weight/reps AND update rolling set-history.
 *  History keeps the last 5 entries per set key. */
export async function saveWorkoutDraftToExercise(
  uid,
  pid,
  sid,
  eid,
  setHistory,
) {
  const ref = docR(EXERCISES_PATH(uid, pid, sid), eid);
  await updateDoc(ref, { setHistory });
}

// ─── WORKOUT LOGS ─────────────────────────────────────────────
// Log document shape (one document per program + session + date):
//   programId, programName, sessionId, sessionName,
//   date (YYYY-MM-DD), loggedAt (Timestamp), updatedAt (Timestamp),
//   exercises: [{ id, name, sets: [{ key, weight, reps }] }]

export async function getWorkoutLogs(uid, maxCount = 50) {
  const snap = await getDocs(
    query(
      col(`users/${uid}/workoutLogs`),
      orderBy("date", "desc"),
      limit(maxCount),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertWorkoutLogByDate(uid, logData) {
  const logId = `${logData.programId}__${logData.sessionId}__${logData.date}`;
  const ref = docR(`users/${uid}/workoutLogs/${logId}`);
  const snap = await getDoc(ref);

  const payload = {
    ...logData,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) payload.loggedAt = serverTimestamp();

  await setDoc(ref, payload, { merge: true });
  return { id: logId, ...logData };
}

export async function addWorkoutLog(uid, logData) {
  const ref = await addDoc(col(`users/${uid}/workoutLogs`), {
    ...logData,
    loggedAt: serverTimestamp(),
  });
  return { id: ref.id, ...logData };
}

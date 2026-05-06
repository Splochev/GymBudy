// js/db.js — All Firestore read/write operations for DietBudy
//
// Firestore data model:
//   /users/{uid}/foods/{fid}        — user's food database
//   /users/{uid}/mealPlans/{pid}    — meal plans (full plan stored as single doc)

import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// ─── HELPERS ──────────────────────────────────────────────────
const col  = (...segs) => collection(db, segs.join("/"));
const docR = (...segs) => doc(db, segs.join("/"));

// ─── LOCAL CACHE ──────────────────────────────────────────────
function cacheGet(key) {
  try {
    const raw = localStorage.getItem("dietbudy:" + key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (ttl && Date.now() - ts > ttl) {
      localStorage.removeItem("dietbudy:" + key);
      return null;
    }
    return data;
  } catch { return null; }
}

function cacheSet(key, data, ttl = 0) {
  try {
    localStorage.setItem("dietbudy:" + key, JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch { /* ignore quota errors */ }
}

function cacheBust(...keys) {
  for (const k of keys) localStorage.removeItem("dietbudy:" + k);
}

// ─── FOODS ────────────────────────────────────────────────────
// Food shape:
//   { id, userId, name, calories, protein, fats?, carbs?,
//     packageWeight, price, priceType: "per_package"|"per_kg" }

export async function getFoods(uid) {
  const key = `foods:${uid}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const snap = await getDocs(
    query(col(`users/${uid}/foods`), orderBy("name"))
  );
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cacheSet(key, data);
  return data;
}

export async function addFood(uid, food) {
  const payload = {
    userId: uid,
    name:          food.name,
    calories:      Number(food.calories)      || 0,
    protein:       Number(food.protein)       || 0,
    fats:          Number(food.fats)          || 0,
    carbs:         Number(food.carbs)         || 0,
    packageWeight: Number(food.packageWeight) || 0,
    price:         Number(food.price)         || 0,
    priceType:     food.priceType || "per_package",
    createdAt:     serverTimestamp(),
  };
  const ref = await addDoc(col(`users/${uid}/foods`), payload);
  cacheBust(`foods:${uid}`);
  return { id: ref.id, ...payload };
}

export async function updateFood(uid, fid, changes) {
  const payload = {
    name:          changes.name,
    calories:      Number(changes.calories)      || 0,
    protein:       Number(changes.protein)       || 0,
    fats:          Number(changes.fats)          || 0,
    carbs:         Number(changes.carbs)         || 0,
    packageWeight: Number(changes.packageWeight) || 0,
    price:         Number(changes.price)         || 0,
    priceType:     changes.priceType || "per_package",
    updatedAt:     serverTimestamp(),
  };
  await updateDoc(docR(`users/${uid}/foods/${fid}`), payload);
  cacheBust(`foods:${uid}`);
}

export async function deleteFood(uid, fid) {
  await deleteDoc(docR(`users/${uid}/foods/${fid}`));
  cacheBust(`foods:${uid}`);
}

// ─── MEAL PLANS ───────────────────────────────────────────────
// MealPlan shape:
//   { id, userId, name, targetCalories, targetProtein, days,
//     meals: [ { name, items: [ { foodId, quantity } ] } ] }

export async function getMealPlans(uid) {
  const key = `mealplans:${uid}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const snap = await getDocs(
    query(col(`users/${uid}/mealPlans`), orderBy("createdAt"))
  );
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cacheSet(key, data);
  return data;
}

export async function saveMealPlan(uid, plan) {
  // plan.id present → update, else → create
  const payload = {
    userId:         uid,
    name:           plan.name           || "Untitled Plan",
    targetCalories: Number(plan.targetCalories) || 0,
    targetProtein:  Number(plan.targetProtein)  || 0,
    days:           Number(plan.days)           || 1,
    meals:          plan.meals          || [],
    updatedAt:      serverTimestamp(),
  };

  if (plan.id) {
    await updateDoc(docR(`users/${uid}/mealPlans/${plan.id}`), payload);
    cacheBust(`mealplans:${uid}`);
    return { ...plan, ...payload };
  } else {
    payload.createdAt = serverTimestamp();
    const ref = await addDoc(col(`users/${uid}/mealPlans`), payload);
    cacheBust(`mealplans:${uid}`);
    return { id: ref.id, ...payload };
  }
}

export async function deleteMealPlan(uid, pid) {
  await deleteDoc(docR(`users/${uid}/mealPlans/${pid}`));
  cacheBust(`mealplans:${uid}`);
}

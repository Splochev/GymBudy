// js/utils.js — Shared utility helpers for DietBudy

/** Generate a simple unique ID */
export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Debounce a function */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Round a number to N decimal places */
export function round(n, decimals = 1) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Compute price per 100g for a food item.
 * Returns null if pricing info is incomplete.
 */
export function pricePer100g(food) {
  if (!food.price || food.price <= 0) return null;
  if (food.priceType === "per_kg") {
    return food.price / 10; // price per kg → price per 100g
  }
  // per_package
  if (!food.packageWeight || food.packageWeight <= 0) return null;
  return (food.price / food.packageWeight) * 100;
}

/**
 * Calculate nutrition + cost for a MealItem.
 * quantity is in grams.
 */
export function calcItem(food, quantity) {
  const q = quantity / 100;
  return {
    calories: round(food.calories * q, 1),
    protein:  round(food.protein  * q, 1),
    fats:     round((food.fats  || 0) * q, 1),
    carbs:    round((food.carbs || 0) * q, 1),
    cost:     pricePer100g(food) != null ? round(pricePer100g(food) * q, 2) : null,
  };
}

/**
 * Sum nutrition totals across an array of { food, quantity } items.
 */
export function sumItems(items, foodMap) {
  const totals = { calories: 0, protein: 0, fats: 0, carbs: 0, cost: 0, costKnown: true };
  for (const item of items) {
    const food = foodMap[item.foodId];
    if (!food) continue;
    const c = calcItem(food, item.quantity);
    totals.calories += c.calories;
    totals.protein  += c.protein;
    totals.fats     += c.fats;
    totals.carbs    += c.carbs;
    if (c.cost != null) totals.cost += c.cost;
    else totals.costKnown = false;
  }
  totals.calories = round(totals.calories, 0);
  totals.protein  = round(totals.protein,  1);
  totals.fats     = round(totals.fats,     1);
  totals.carbs    = round(totals.carbs,    1);
  totals.cost     = round(totals.cost,     2);
  return totals;
}

/**
 * Determine status color class based on actual vs target ratio.
 * Returns 'good' | 'warn' | 'bad'
 */
export function statusClass(actual, target) {
  if (!target || target <= 0) return '';
  const ratio = actual / target;
  if (ratio <= 1.10) return 'good';
  if (ratio <= 1.20) return 'warn';
  return 'bad';
}

/**
 * Shopping list: compute how many packages needed for X days,
 * given daily quantity in grams and package weight.
 * Returns { grams, packages, cost } or null if data missing.
 */
export function shoppingCalc(food, dailyGrams, days) {
  const totalGrams = dailyGrams * days;
  if (!food.packageWeight || food.packageWeight <= 0) {
    return { grams: round(totalGrams, 0), packages: null, cost: null };
  }
  const packages = Math.ceil(totalGrams / food.packageWeight);
  const cost = food.price > 0 ? round(packages * food.price, 2) : null;
  return { grams: round(totalGrams, 0), packages, cost };
}

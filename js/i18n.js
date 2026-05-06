// js/i18n.js — Translation strings for English (en) and Bulgarian (bg)

export const translations = {
  en: {
    // ── Loading / misc ────────────────────────────────────────
    loading: "Loading GymBudy…",

    // ── Top bar ───────────────────────────────────────────────
    workouts: "Workouts",
    history: "History",
    sign_out: "Sign out",
    toggle_sidebar: "Toggle sidebar",

    // ── Sidebar ───────────────────────────────────────────────
    programs: "Programs",
    new_program: "New program",
    workout_days: "Workout Days",
    new_day: "New day",
    no_programs: "No programs yet. Create one!",
    no_days: "No days yet. Add one!",
    select_program_first: "Select a program first.",

    // ── Toolbar ───────────────────────────────────────────────
    mode_workout: "Workout",
    mode_configure: "Configure",
    weight_goals: "Target",
    finish_workout: "Save Now",
    saving: "Saving…",
    saved: "Saved",
    add_exercise_placeholder: "Add exercise…",
    merge_label: "Merge",
    add_new_exercise: "Add new exercise…",
    add_new_named: (query) => `Add new: "${query}"`,

    // ── Empty states ──────────────────────────────────────────
    select_workout_day: "Select a workout day",
    select_workout_day_desc:
      "Pick a program and a day from the sidebar to get started.",
    no_exercises_yet: "No exercises yet",
    no_exercises_yet_desc: "Use the search box above to add exercises.",
    no_exercises: "No exercises",
    no_exercises_desc: "Switch to Configure to add exercises to this day.",

    // ── Config mode ───────────────────────────────────────────
    superset: "Superset",
    unmerge: "Unmerge",
    add_set: "Add Set",
    periodization: "Periodization",
    intensity_volume: "Intensity Volume",
    load_increment: "Load Inc.",
    reps: "Reps",
    rest_mmss: "Rest (mm:ss)",

    // ── Workout mode ──────────────────────────────────────────
    set_abbr: "Set",
    reps_abbr: "reps",
    kg_abbr: "kg",
    no_history: "No history",
    sets_count: (n) => `${n} sets`,

    // ── History view ──────────────────────────────────────────
    no_history_yet: "No workout history yet",
    no_history_yet_desc:
      "Start logging sets in Workout mode. Entries are autosaved.",
    exercises_count: (n) => `${n} exercises`,

    // ── Modal titles ──────────────────────────────────────────
    new_program_title: "New Program",
    edit_program_title: "Edit Program",
    delete_program_title: "Delete Program",
    new_session_title: "New Workout Day",
    adding_to: "Adding to:",
    edit_session_title: "Edit Workout Day",
    delete_session_title: "Delete Workout Day",
    add_exercise_title: "Add New Exercise",
    weight_goals_title: "Target",
    weight_goals_desc: "Based on last workout + Load Increment (LI)",
    weight_goals_empty: "Work out at least once to generate goals.",
    finish_workout_title: "Save Workout Now",
    finish_workout_desc:
      "Autosave is enabled. Use this to save immediately.",

    // ── Delete confirmations (split around <strong> name) ─────
    confirm_delete_prefix: "Delete ",
    delete_program_suffix:
      "? This will also delete all workout days and exercises. This cannot be undone.",
    delete_session_suffix: "? All exercises in this day will also be removed.",

    // ── Form labels ───────────────────────────────────────────
    label_name: "Name",
    label_description: "Description",
    label_day_name: "Day Name",
    label_video_url: "YouTube / Video URL",
    label_muscle_groups: "Muscle Groups",

    // ── Buttons ───────────────────────────────────────────────
    btn_cancel: "Cancel",
    btn_create: "Create",
    btn_save: "Save",
    btn_delete: "Delete",
    btn_close: "Close",
    btn_add_insert: "Add & Insert",
    btn_save_workout: "Save Workout",
    btn_apply_goals: "Apply Goals",

    // ── Placeholders ──────────────────────────────────────────
    placeholder_program_name: "e.g. Push Pull Legs",
    placeholder_description: "Optional description",
    placeholder_day_name: "e.g. Push Day, Monday…",
    placeholder_exercise_name: "Exercise name",
    placeholder_video_url: "https://youtube.com/…",

    // ── Toast messages ────────────────────────────────────────
    toast_program_created: "Program created",
    toast_program_updated: "Program updated",
    toast_program_deleted: "Program deleted",
    toast_day_created: "Workout day created",
    toast_day_updated: "Day updated",
    toast_day_deleted: "Day deleted",
    toast_already_in_session: "Already in this session",
    toast_exercise_added: "Exercise added",
    toast_superset_created: "Superset created",
    toast_superset_removed: "Superset removed",
    toast_rest_done: "Rest done — next set!",
    toast_no_data: "No data logged yet",
    toast_workout_saved: "Workout saved!",
    toast_goals_applied: "Goals applied!",

    // ── Relative dates ────────────────────────────────────────
    today: "Today",
    yesterday: "Yesterday",
    days_ago: (n) => `${n} days ago`,
    weeks_ago: (n) => `${Math.floor(n / 7)} weeks ago`,
    months_ago: (n) => `${Math.floor(n / 30)} months ago`,
    years_ago: (n) => `${Math.floor(n / 365)} years ago`,

    // ── Month / day names (for date formatting) ───────────────
    months: [
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
    ],
    months_short: [
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
    ],
    days_short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],

    // ── Login page ────────────────────────────────────────────
    welcome_back: "Welcome back",
    sign_in_desc: "Sign in to your account",
    label_email: "Email",
    label_password: "Password",
    btn_sign_in: "Sign In",
    btn_signing_in: "Signing in…",
    placeholder_email: "you@example.com",
    placeholder_password: "••••••••",
    error_fill_fields: "Please fill in all fields.",
    error_user_not_found: "No account found with that email.",
    error_wrong_password: "Incorrect password.",
    error_invalid_credential: "Invalid email or password.",
    error_email_in_use: "An account with this email already exists.",
    error_too_many_requests: "Too many attempts. Please try again later.",
    error_network: "Network error. Check your connection.",
    error_generic: "An error occurred. Please try again.",
  },

  bg: {
    // ── Loading / misc ────────────────────────────────────────
    loading: "Зарежда GymBudy…",

    // ── Top bar ───────────────────────────────────────────────
    workouts: "Тренировки",
    history: "История",
    sign_out: "Изход",
    toggle_sidebar: "Скрий/покажи панела",

    // ── Sidebar ───────────────────────────────────────────────
    programs: "Програми",
    new_program: "Нова програма",
    workout_days: "Тренировъчни дни",
    new_day: "Нов ден",
    no_programs: "Няма програми. Създайте такава!",
    no_days: "Няма дни. Добавете такъв!",
    select_program_first: "Изберете програма първо.",

    // ── Toolbar ───────────────────────────────────────────────
    mode_workout: "Тренировка",
    mode_configure: "Настройки",
    weight_goals: "Цел",
    finish_workout: "Запази сега",
    saving: "Запазва...",
    saved: "Запазено",
    add_exercise_placeholder: "Добави упражнение…",
    merge_label: "Обедини",
    add_new_exercise: "Добави ново упражнение…",
    add_new_named: (query) => `Добави ново: „${query}"`,

    // ── Empty states ──────────────────────────────────────────
    select_workout_day: "Изберете тренировъчен ден",
    select_workout_day_desc:
      "Изберете програма и ден от страничния панел, за да започнете.",
    no_exercises_yet: "Няма упражнения",
    no_exercises_yet_desc:
      "Използвайте полето за търсене, за да добавите упражнения.",
    no_exercises: "Няма упражнения",
    no_exercises_desc:
      "Превключете на Настройки, за да добавите упражнения към деня.",

    // ── Config mode ───────────────────────────────────────────
    superset: "Суперсерия",
    unmerge: "Раздели",
    add_set: "Добави серия",
    periodization: "Периодизация",
    intensity_volume: "Интензивност (ИО %)",
    load_increment: "Прираст на натоварв.",
    reps: "Повторения",
    rest_mmss: "Почивка (мм:сс)",

    // ── Workout mode ──────────────────────────────────────────
    set_abbr: "Сер",
    reps_abbr: "повт",
    kg_abbr: "кг",
    no_history: "Няма история",
    sets_count: (n) => `${n} серии`,

    // ── History view ──────────────────────────────────────────
    no_history_yet: "Все още няма история на тренировките",
    no_history_yet_desc:
      "Започнете да въвеждате серии в режим Тренировка. Записът е автоматичен.",
    exercises_count: (n) => `${n} упражнения`,

    // ── Modal titles ──────────────────────────────────────────
    new_program_title: "Нова програма",
    edit_program_title: "Редактирай програма",
    delete_program_title: "Изтрий програма",
    new_session_title: "Нов тренировъчен ден",
    adding_to: "Добавяне към:",
    edit_session_title: "Редактирай тренировъчен ден",
    delete_session_title: "Изтрий тренировъчен ден",
    add_exercise_title: "Добави ново упражнение",
    weight_goals_title: "Цели за тежести",
    weight_goals_desc:
      "Базирано на последна тренировка + Приращение на натоварването (ПН)",
    weight_goals_empty: "Тренирайте поне веднъж, за да генерирате цели.",
    finish_workout_title: "Запази тренировка сега",
    finish_workout_desc:
      "Автоматичното запазване е включено. Използвайте това за незабавен запис.",

    // ── Delete confirmations ──────────────────────────────────
    confirm_delete_prefix: "Изтрий ",
    delete_program_suffix:
      "? Това ще изтрие и всички тренировъчни дни и упражнения. Действието е необратимо.",
    delete_session_suffix:
      "? Всички упражнения в този ден ще бъдат премахнати.",

    // ── Form labels ───────────────────────────────────────────
    label_name: "Име",
    label_description: "Описание",
    label_day_name: "Наименование на деня",
    label_video_url: "YouTube / Видео URL",
    label_muscle_groups: "Мускулни групи",

    // ── Buttons ───────────────────────────────────────────────
    btn_cancel: "Отказ",
    btn_create: "Създай",
    btn_save: "Запиши",
    btn_delete: "Изтрий",
    btn_close: "Затвори",
    btn_add_insert: "Добави",
    btn_save_workout: "Запиши тренировка",
    btn_apply_goals: "Приложи цели",

    // ── Placeholders ──────────────────────────────────────────
    placeholder_program_name: "напр. Бутане, Дърпане, Крака",
    placeholder_description: "Незадължително описание",
    placeholder_day_name: "напр. Ден за бутане, Понеделник…",
    placeholder_exercise_name: "Наименование на упражнението",
    placeholder_video_url: "https://youtube.com/…",

    // ── Toast messages ────────────────────────────────────────
    toast_program_created: "Програмата е създадена",
    toast_program_updated: "Програмата е обновена",
    toast_program_deleted: "Програмата е изтрита",
    toast_day_created: "Тренировъчният ден е създаден",
    toast_day_updated: "Денят е обновен",
    toast_day_deleted: "Денят е изтрит",
    toast_already_in_session: "Вече е добавено в тази сесия",
    toast_exercise_added: "Упражнението е добавено",
    toast_superset_created: "Суперсерията е създадена",
    toast_superset_removed: "Суперсерията е премахната",
    toast_rest_done: "Почивката свърши — следваща серия!",
    toast_no_data: "Няма записани данни",
    toast_workout_saved: "Тренировката е записана!",
    toast_goals_applied: "Целите са приложени!",

    // ── Relative dates ────────────────────────────────────────
    today: "Днес",
    yesterday: "Вчера",
    days_ago: (n) => `Преди ${n} дни`,
    weeks_ago: (n) => `Преди ${Math.floor(n / 7)} седмици`,
    months_ago: (n) => `Преди ${Math.floor(n / 30)} месеца`,
    years_ago: (n) => `Преди ${Math.floor(n / 365)} години`,

    // ── Month / day names ─────────────────────────────────────
    months: [
      "Януари",
      "Февруари",
      "Март",
      "Април",
      "Май",
      "Юни",
      "Юли",
      "Август",
      "Септември",
      "Октомври",
      "Ноември",
      "Декември",
    ],
    months_short: [
      "Яну",
      "Фев",
      "Мар",
      "Апр",
      "Май",
      "Юни",
      "Юли",
      "Авг",
      "Сеп",
      "Окт",
      "Ное",
      "Дек",
    ],
    days_short: ["Нед", "Пон", "Вт", "Ср", "Чет", "Пет", "Съб"],

    // ── Login page ────────────────────────────────────────────
    welcome_back: "Добре дошли",
    sign_in_desc: "Влезте в акаунта си",
    label_email: "Имейл",
    label_password: "Парола",
    btn_sign_in: "Вход",
    btn_signing_in: "Влизане…",
    placeholder_email: "вие@example.com",
    placeholder_password: "••••••••",
    error_fill_fields: "Моля, попълнете всички полета.",
    error_user_not_found: "Не е намерен акаунт с този имейл.",
    error_wrong_password: "Грешна парола.",
    error_invalid_credential: "Невалиден имейл или парола.",
    error_email_in_use: "Вече съществува акаунт с този имейл.",
    error_too_many_requests: "Твърде много опити. Опитайте по-късно.",
    error_network: "Мрежова грешка. Проверете връзката си.",
    error_generic: "Възникна грешка. Опитайте отново.",
  },
};

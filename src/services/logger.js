/* =============================================================================
   src/services/logger.js — EduSphere Phase 2.5: Centralized Logging Service
   =============================================================================
   Every log in the app should go through this instead of calling console.*
   directly, so logging can be turned on/off (or filtered by category) from
   one config flag instead of hunting through the codebase.

   Categories map directly to the prefixes already used throughout the
   original file ("[EduSphere]", "[EduSphere Upload]", etc.) so switching
   existing call sites over is a pure rename, not a behavior change:
     console.log("[EduSphere] ...")         -> Logger.info("app", ...)
     console.log("[EduSphere Upload] ...")  -> Logger.upload(...)
     console.error("[EduSphere] Firebase")  -> Logger.firebase(...)
     auth-related console.error             -> Logger.auth(...)
     anything else                          -> Logger.info / Logger.warn / Logger.error

   Load this AFTER src/config/appConfig.js (reads LOGGING config from there)
   and BEFORE anything that logs (firebase/init.js, legacy/app-legacy.js).
   ============================================================================= */

/* ----------------------------- Config -----------------------------
   New config, not present in the original file — additive only. Central
   on/off switch plus per-category toggles, so e.g. verbose upload progress
   logs can be silenced in production while errors stay on. Defaults
   preserve EXACTLY today's behavior (everything logs, nothing is silenced). */
const LOGGING_CONFIG = {
  enabled: true,
  minLevel: "info", // "debug" | "info" | "warn" | "error" — anything below this level is suppressed
  categories: {
    app: true,
    upload: true,
    firebase: true,
    auth: true,
    community: true,
    quiz: true,
    admin: true,
  },
};

const LEVEL_RANK = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level, category) {
  if (!LOGGING_CONFIG.enabled) return false;
  if (category && LOGGING_CONFIG.categories[category] === false) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[LOGGING_CONFIG.minLevel];
}

function fmt(category, args) {
  const prefix = category === "app" || !category ? "[EduSphere]" : `[EduSphere ${category[0].toUpperCase()}${category.slice(1)}]`;
  return [prefix, ...args];
}

function debug(category, ...args) {
  if (shouldLog("debug", category)) console.debug(...fmt(category, args));
}
function info(category, ...args) {
  if (shouldLog("info", category)) console.log(...fmt(category, args));
}
function warn(category, ...args) {
  if (shouldLog("warn", category)) console.warn(...fmt(category, args));
}
function error(category, ...args) {
  if (shouldLog("error", category)) console.error(...fmt(category, args));
}

/* Convenience per-category shorthands matching the categories called out in
   Phase 2.5 (Information, Warning, Upload, Firebase, Authentication, Error). */
const Logger = {
  debug: (...args) => debug("app", ...args),
  info: (...args) => info("app", ...args),
  warn: (...args) => warn("app", ...args),
  error: (...args) => error("app", ...args),

  upload: {
    info: (...args) => info("upload", ...args),
    warn: (...args) => warn("upload", ...args),
    error: (...args) => error("upload", ...args),
  },
  firebase: {
    info: (...args) => info("firebase", ...args),
    warn: (...args) => warn("firebase", ...args),
    error: (...args) => error("firebase", ...args),
  },
  auth: {
    info: (...args) => info("auth", ...args),
    warn: (...args) => warn("auth", ...args),
    error: (...args) => error("auth", ...args),
  },
  community: {
    info: (...args) => info("community", ...args),
    warn: (...args) => warn("community", ...args),
    error: (...args) => error("community", ...args),
  },
  quiz: {
    info: (...args) => info("quiz", ...args),
    warn: (...args) => warn("quiz", ...args),
    error: (...args) => error("quiz", ...args),
  },
  admin: {
    info: (...args) => info("admin", ...args),
    warn: (...args) => warn("admin", ...args),
    error: (...args) => error("admin", ...args),
  },

  configure(overrides) {
    Object.assign(LOGGING_CONFIG, overrides || {});
    if (overrides && overrides.categories) {
      Object.assign(LOGGING_CONFIG.categories, overrides.categories);
    }
  },
  getConfig: () => ({ ...LOGGING_CONFIG, categories: { ...LOGGING_CONFIG.categories } }),
};

window.EduSphere = window.EduSphere || {};
window.EduSphere.Logger = Logger;
window.EduSphere.LOGGING_CONFIG = LOGGING_CONFIG;

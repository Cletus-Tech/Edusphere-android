/* =============================================================================
   src/firebase/init.js — EduSphere Phase 2.2: Centralized Firebase Service
   =============================================================================
   Firebase is initialized exactly ONCE, here, and nowhere else. Every screen/
   module should use fbAuth / fbDb / fbStorage (or EduSphere.Firebase.*) —
   never call firebase.initializeApp() again anywhere else in the codebase.

   Source: original file, lines 138-204 (FIREBASE SETUP block). Logic is
   copied verbatim — only its location has changed. Load this script BEFORE
   any screen/service code, immediately after the Firebase CDN <script> tags
   and after src/config/appConfig.js (needs firebaseConfig).
   ============================================================================= */

let FIREBASE_INIT_ERROR = null;
let fbAuth = null;
let fbDb = null;
let fbStorage = null;

try {
  if (typeof firebase === "undefined") {
    throw new Error(
      window.__FL_PROTOCOL_ISSUE
        ? "Firebase SDK scripts didn't load — this page was opened over " + window.location.protocol + "//, which blocks remote scripts. Serve the app over http:// or https:// instead."
        : "Firebase SDK scripts didn't load (check your network connection or ad-blocker)."
    );
  }

  // Guard against accidental double-initialization (e.g. a stray legacy
  // <script> still calling firebase.initializeApp somewhere during the
  // Phase 2.1 migration). This did not exist in the original file — added
  // defensively per the "Firebase initialized only once" requirement.
  if (firebase.apps && firebase.apps.length > 0) {
    EduSphere.Logger.firebase.warn("[EduSphere] Firebase app already initialized elsewhere — reusing existing instance instead of re-initializing.");
  } else {
    firebase.initializeApp(firebaseConfig);
    EduSphere.Logger.firebase.info("[EduSphere] Firebase initialized");
  }

  fbAuth = firebase.auth();
  EduSphere.Logger.firebase.info("[EduSphere] Authentication connected");

  fbDb = firebase.firestore();
  EduSphere.Logger.firebase.info("[EduSphere] Firestore connected");

  fbDb.enablePersistence({ synchronizeTabs: true }).then(
    () => EduSphere.Logger.firebase.info("[EduSphere] Firestore offline persistence enabled"),
    (persistErr) => EduSphere.Logger.firebase.warn("[EduSphere] Firestore offline persistence unavailable:", persistErr && persistErr.code)
  );

  try {
    fbStorage = firebase.storage();
    EduSphere.Logger.firebase.info("[EduSphere] Storage connected");
  } catch (storageErr) {
    EduSphere.Logger.firebase.error("[EduSphere] Storage failed to connect (non-fatal — not required for auth/quizzes):", storageErr);
    fbStorage = null;
  }
} catch (err) {
  EduSphere.Logger.firebase.error("[EduSphere] Firebase initialization failed:", err);
  FIREBASE_INIT_ERROR = (err && err.message) || String(err);
}

/* ----------------------------- Reusable service helpers -----------------------------
   Source: withTimeout — original line 208. UNCHANGED. Moved here (rather than
   utils/) because it's used almost exclusively to wrap Firebase calls. */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/* Source: original line 225. UNCHANGED. */
function stripUndefined(obj) {
  const out = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === undefined) return;
    out[key] = (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && typeof val.isEqual !== "function")
      ? stripUndefined(val)
      : val;
  });
  return out;
}

/* Source: original line 243. UNCHANGED. */
function resolveDisplayOrder(incoming, existingValue) {
  if (incoming !== undefined && incoming !== null && incoming !== "") {
    const n = Number(incoming);
    if (Number.isFinite(n)) return n;
  }
  if (typeof existingValue === "number" && Number.isFinite(existingValue)) return existingValue;
  return Date.now();
}

/* Convenience helper — new in Phase 2.2, not previously centralized. Every
   write path across the codebase repeats `firebase.firestore.FieldValue.
   serverTimestamp()` inline; this just gives it one name so future code (and
   any code migrated in Phase 2.1) can call `serverTimestamp()` instead of the
   fully-qualified path. Purely additive — does not change any existing call. */
function serverTimestamp() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

/* ----------------------------- Error mapping (centralized service-layer errors) -----------------------------
   Source: firebaseAuthErrorMessage — original line 255. UNCHANGED. */
function firebaseAuthErrorMessage(err) {
  const code = err && err.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with that email address.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/requires-recent-login":
      return "For security, please log out and log back in before doing this.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    default:
      return (err && err.message)
        ? err.message.replace(/^Firebase:\s*/, "").replace(/\s*\(auth\/[a-z0-9\-]+\)\.?$/i, "")
        : "Something went wrong. Please try again.";
  }
}

/* Source: describeUploadError — original lines 302-347. UNCHANGED logic,
   condensed comment (full rationale preserved in Phase-2.1 upload service
   docstring once that module is extracted). */
function describeUploadError(err) {
  const code = err && err.code;
  const msg = (err && err.message) || "";

  if (code === "storage/unauthorized" || code === "permission-denied") {
    return "Permission denied — your account doesn't have access to upload this.";
  }
  if (code === "storage/unauthenticated") {
    return "You've been signed out. Please log in again and retry.";
  }
  if (code === "storage/quota-exceeded" || code === "resource-exhausted") {
    return "Storage quota exceeded. Free up space or contact support, then retry.";
  }
  if (code === "storage/retry-limit-exceeded" || code === "storage/server-file-wrong-size" || code === "storage/invalid-checksum") {
    return "Upload interrupted by a network issue. Please retry.";
  }
  if (code === "storage/canceled") {
    return "Upload was canceled.";
  }
  if (code === "storage/object-not-found") {
    return "That file could not be found in Storage. Please retry.";
  }
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return "Network issue — check your connection and retry.";
  }
  if (code === "deadline-exceeded" || code === "internal" || code === "aborted") {
    return "Server issue on Firebase's side — please retry in a moment.";
  }
  if (/timed out after \d+ms/i.test(msg)) {
    return "This is taking too long — your connection may be slow or unstable. Please retry.";
  }
  if (/network/i.test(msg)) {
    return "Network issue — check your connection and retry.";
  }
  if (code && code.startsWith("storage/")) {
    return msg.replace(/^Firebase:\s*/, "").replace(/\s*\(storage\/[a-z0-9\-]+\)\.?$/i, "") || "Upload failed. Please retry.";
  }
  if (msg) return msg;
  return "Upload failed for an unknown reason. Please retry.";
}

/* ----------------------------- Namespaced export ----------------------------- */
window.EduSphere = window.EduSphere || {};
window.EduSphere.Firebase = {
  auth: fbAuth,
  db: fbDb,
  storage: fbStorage,
  initError: FIREBASE_INIT_ERROR,
  withTimeout,
  stripUndefined,
  resolveDisplayOrder,
  serverTimestamp,
  firebaseAuthErrorMessage,
  describeUploadError,
};

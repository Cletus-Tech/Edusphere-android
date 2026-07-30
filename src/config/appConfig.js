/* =============================================================================
   src/config/appConfig.js — EduSphere Phase 2.3: Global Configuration System
   =============================================================================
   Every editable setting that was previously scattered across the 14,000-line
   monolith now lives here. Nothing in this file changes behavior — every value
   below is copied verbatim from where it used to live (see the "source" note
   on each block). Future config changes only ever touch this one file.

   Loaded as a plain (non-module) Babel script, same as the original file, so
   these stay accessible as bare top-level identifiers (firebaseConfig, C,
   ADMIN_EMAILS, etc.) to all not-yet-migrated legacy code — zero behavior
   change, zero risk of breaking existing screens that reference them directly.
   New/refactored code should prefer the EduSphere.Config.* namespace below.
   ============================================================================= */

/* ----------------------------- Firebase project config -----------------------------
   Source: original file, lines 144-152. UNCHANGED. */
const firebaseConfig = {
  apiKey: "AIzaSyARNwzBWcUTeY3NxgwUu7Lga8GN44HgPDE",
  authDomain: "futalearn.firebaseapp.com",
  projectId: "futalearn",
  storageBucket: "futalearn.firebasestorage.app",
  messagingSenderId: "98228262952",
  appId: "1:98228262952:web:74a9c969e455ab7942bd1d",
  measurementId: "G-2RZMGLFZ7B",
};

/* ----------------------------- App identity -----------------------------
   Source: DEFAULT_BRAND_CONFIG / DEFAULT_BRAND_ASSETS, original lines 8936-8952.
   These remain the *fallback* defaults shown until a Super Admin edits
   settings/branding or settings/brandAssets in Firestore (dynamic branding,
   unchanged) — this file does not alter that live-override behavior. */
const APP_NAME = "EduSphere";
const APP_VERSION = "1.2.0"; // bump on every release; also compared against settings/app.minAppVersion
const DEFAULT_BRAND_CONFIG = {
  appName: "EduSphere",
  shortName: "EduSphere",
  tagline: "Learn • Practice • Succeed",
  description: "EduSphere is an intelligent Computer-Based Test (CBT) platform created by Cletus Tech to help students prepare smarter for examinations through modern educational technology.",
  copyright: "© 2026 Cletus Tech · All rights reserved",
  website: "",
  supportEmail: "",
  contactPhone: "",
  privacyUrl: "",
  termsUrl: "",
};
const DEFAULT_BRAND_ASSETS = {
  appLogo: "", splashLogo: "", loginLogo: "", dashboardLogo: "", favicon: "",
  androidIcon: "", loadingAnimation: "", watermark: "",
  defaultProfilePicture: "", defaultCourseImage: "", defaultUniversityLogo: "",
};

/* ----------------------------- Default university -----------------------------
   NOTE (new in Phase 2.3, not previously a named constant): the app currently
   sources universities live from Firestore (ACADEMIC_COLLECTIONS.universities)
   rather than a hardcoded default — onboarding picks whatever's first in that
   live collection. This constant is added as a documented, centralized place
   for a *fallback label only* (e.g. empty-state copy) and is NOT yet wired
   into onboarding logic. Wiring it in is a candidate for a future phase —
   flagging here rather than silently changing onboarding behavior. */
const DEFAULT_UNIVERSITY_LABEL = "Federal University of Technology, Akure (FUTA)";

/* ----------------------------- Admin access -----------------------------
   Source: original line 542. UNCHANGED. */
const ADMIN_EMAILS = ["cletustech25@gmail.com"];

/* ----------------------------- Theme -----------------------------
   Source: LIGHT_THEME / DARK_THEME, original lines 371-420. UNCHANGED. */
const LIGHT_THEME = {
  mode: "light",
  primary: "#2563EB",
  primaryDark: "#1E40AF",
  secondary: "#0F1E3D",
  accent: "#38BDF8",
  bg: "#F4F8FF",
  bodyBg: "#E8EFFC",
  card: "#FFFFFF",
  cardAlt: "#F4F8FF",
  text: "#0F1E33",
  textSoft: "#5B6B82",
  textFaint: "#9AA7B8",
  border: "#E3ECFB",
  success: "#2E7D32",
  successBg: "#E9F7EC",
  danger: "#D32F2F",
  dangerBg: "#FDECEC",
  warn: "#8A6100",
  warnBg: "#FFF6E5",
  warnBorder: "#FFE1A6",
  overlay: "rgba(15,30,51,0.55)",
  shadow: "0 8px 24px rgba(21,101,192,0.10)",
};
const DARK_THEME = {
  mode: "dark",
  primary: "#4F8CF7",
  primaryDark: "#2563EB",
  secondary: "#0B1830",
  accent: "#4CC9F7",
  bg: "#0D1420",
  bodyBg: "#090E17",
  card: "#161F30",
  cardAlt: "#1C2740",
  text: "#F3F6FC",
  textSoft: "#AEBDD4",
  textFaint: "#79899F",
  border: "#2A374E",
  success: "#5FCB74",
  successBg: "#173322",
  danger: "#F27B7B",
  dangerBg: "#3A1E20",
  warn: "#F2C979",
  warnBg: "#2E2818",
  warnBorder: "#4A3E1F",
  overlay: "rgba(0,0,0,0.7)",
  shadow: "0 8px 24px rgba(0,0,0,0.45)",
};
const DEFAULT_THEME_PREF = "light"; // "light" | "dark" | "system"

/* ----------------------------- Upload limits -----------------------------
   Source: original lines 7077-7088. UNCHANGED. */
const MAX_IMAGE_INPUT_MB = 15;
const MAX_PROFILE_PHOTO_INPUT_MB = 10;
const MAX_VIDEO_MB = 300;
const MAX_PDF_MB = 50;
const DEFAULT_STORAGE_QUOTA_MB = 500; // per-user, overridable from Super Admin > Settings

const IMAGE_FULL_MAX_DIM = 1600, IMAGE_FULL_QUALITY = 0.82;
const IMAGE_THUMB_MAX_DIM = 480, IMAGE_THUMB_QUALITY = 0.6;
const PROFILE_PHOTO_MAX_DIM = 800, PROFILE_PHOTO_QUALITY = 0.85;

const VIDEO_COMPRESS_THRESHOLD_MB = 20;
const VIDEO_COMPRESS_MAX_WIDTH = 1280;

/* ----------------------------- Community settings -----------------------------
   Source: original line 7418-7419. UNCHANGED. */
const MAX_VIDEOS_PER_POST = 2;
const MAX_IMAGES_PER_POST = 10;

/* ----------------------------- System / announcement settings defaults -----------------------------
   Source: fetchAppSettings() fallback object, original line 8916. UNCHANGED.
   Live values are still read from Firestore settings/app — this is only the
   shape used when that document doesn't exist yet. */
const DEFAULT_SYSTEM_SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: "",
  minAppVersion: "",
  contactWhatsApp: "",
  contactEmail: "",
  contactPhone: "",
  storageQuotaMB: DEFAULT_STORAGE_QUOTA_MB,
};

/* ----------------------------- Animation settings -----------------------------
   Source: HOMEPAGE_ANIMATIONS, original line 11959. UNCHANGED. */
const HOMEPAGE_ANIMATIONS = ["fade", "slide", "zoom", "bounce"];
const DEFAULT_HOMEPAGE_ANIMATION = "fade";

/* ----------------------------- Namespaced export -----------------------------
   New code (Phase 2.1 onward) should read config from here rather than bare
   identifiers, so config stays discoverable in one place. Bare identifiers
   above are kept only for legacy-code backward compatibility. */
window.EduSphere = window.EduSphere || {};
window.EduSphere.Config = {
  firebaseConfig,
  APP_NAME,
  APP_VERSION,
  DEFAULT_BRAND_CONFIG,
  DEFAULT_BRAND_ASSETS,
  DEFAULT_UNIVERSITY_LABEL,
  ADMIN_EMAILS,
  LIGHT_THEME,
  DARK_THEME,
  DEFAULT_THEME_PREF,
  uploads: {
    MAX_IMAGE_INPUT_MB,
    MAX_PROFILE_PHOTO_INPUT_MB,
    MAX_VIDEO_MB,
    MAX_PDF_MB,
    DEFAULT_STORAGE_QUOTA_MB,
    IMAGE_FULL_MAX_DIM, IMAGE_FULL_QUALITY,
    IMAGE_THUMB_MAX_DIM, IMAGE_THUMB_QUALITY,
    PROFILE_PHOTO_MAX_DIM, PROFILE_PHOTO_QUALITY,
    VIDEO_COMPRESS_THRESHOLD_MB, VIDEO_COMPRESS_MAX_WIDTH,
  },
  community: {
    MAX_VIDEOS_PER_POST,
    MAX_IMAGES_PER_POST,
  },
  DEFAULT_SYSTEM_SETTINGS,
  animations: {
    HOMEPAGE_ANIMATIONS,
    DEFAULT_HOMEPAGE_ANIMATION,
  },
};

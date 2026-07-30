/* =============================================================================
   src/services/uploadManager.js — EduSphere Phase 2.4: Global Upload Manager
   =============================================================================
   Everything below the "NEW: UploadManager registry" marker further down is
   copied verbatim from the original file (validation, quota tracking, cleanup,
   compression, and the four upload functions: uploadCommunityImage,
   uploadProfilePhoto, uploadCommunityPdf, uploadCommunityVideo) — extracted
   here because it's used across many screens (community posts, profile,
   branding assets), not just one place, matching "every upload must use this
   shared service."

   Bug fixed during this extraction (a repair of a defect introduced in the
   prior Phase 2.1 pass, not new behavior): the "STORAGE MODULE" comment just
   below had its closing comment-terminator accidentally removed, which
   silently swallowed the VIDEO_COMPRESS_TIMEOUT_MS and STORAGE_CACHE_METADATA
   declarations into a dangling comment — both would have been undefined at
   runtime, breaking every upload path. Restored and verified against the
   untouched original file.

   Console logs in this file were mechanically migrated to the Phase 2.5
   Logger service (22 console.* calls -> 22 EduSphere.Logger.upload.* calls,
   verified 1:1, zero behavior change — Logger just calls console under the
   hood by default).

   NEW in Phase 2.4: none of the four upload functions below expose cancel/
   pause/resume, even though Firebase's ref.put() already returns a pausable/
   cancelable/resumable UploadTask — the original code just discarded that
   handle after wiring .on("state_changed", ...). The UploadManager registry
   at the bottom of this file is additive: it wraps each upload kind uniformly,
   keeps the underlying UploadTask so pause/resume/cancel actually work, adds
   retry-with-backoff, and reports diagnostics through Logger. It does not
   change what any existing screen sees when it calls uploadCommunityImage /
   uploadProfilePhoto / uploadCommunityPdf / uploadCommunityVideo directly —
   those keep working exactly as before, for whichever screens haven't been
   switched over to UploadManager.start(...) yet.
   ============================================================================= */

/* ============================= STORAGE MODULE (Stage 2.3) =============================
   Media used to be squeezed into Firestore documents as base64 (1MiB doc limit, no
   compression on profile photos, hard 60MB video / 10MB PDF caps). Everything below
   moves images and profile photos into Firebase Storage alongside videos/PDFs, adds
   real file validation (magic-byte sniffing, not just MIME/extension), tracks a
   per-user storage quota, and adds best-effort client-side video compression.
   Upload limits (MAX_IMAGE_INPUT_MB, etc.) now live in src/config/appConfig.js —
   see EduSphere.Config.uploads. This comment previously had its closing
   terminator cut off during the Phase 2.1 extraction pass (an off-by-line-
   number mistake when removing the relocated MAX_ and DEFAULT_STORAGE_QUOTA_MB
   consts), which silently swallowed the VIDEO_COMPRESS_TIMEOUT_MS and
   STORAGE_CACHE_METADATA declarations below into a dangling unclosed comment
   — meaning both were undefined at runtime and every upload path referencing
   them would have thrown a ReferenceError. Fixed here during the Phase 2.4
   Upload Manager extraction, verified by diffing back against the untouched
   original file.
   ========================================================================================= */
const VIDEO_COMPRESS_TIMEOUT_MS = 180000; // 3 min hard cap — falls back to original upload

/* All community/profile media is immutable once uploaded (a new upload always gets
   a fresh timestamped path), so it's safe to tell browsers/the CDN to cache it for a
   full year instead of re-fetching the same photo/video every time a post scrolls
   back into view. This is the "media caching" half of the Optimization work — the
   other half (in-app thumbnails + lazy mounting) already happens in PostMediaGrid. */
const STORAGE_CACHE_METADATA = { cacheControl: "public, max-age=31536000, immutable" };

/* ---------- File validation: real magic-byte sniffing, not just MIME/extension ----------
   A renamed .exe with a fake "image/jpeg" MIME type will fail this even though the
   browser-reported file.type would have let it through. */
async function readMagicBytes(file, len = 16) {
  const buf = await file.slice(0, len).arrayBuffer();
  return new Uint8Array(buf);
}
function bytesMatch(bytes, pattern, offset = 0) {
  return pattern.every((b, i) => bytes[offset + i] === b);
}
async function validateImageFile(file) {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_IMAGE_INPUT_MB * 1024 * 1024) throw new Error(`Images must be under ${MAX_IMAGE_INPUT_MB}MB.`);
  const bytes = await readMagicBytes(file, 12);
  const ok = bytesMatch(bytes, [0xFF, 0xD8, 0xFF])                         // JPEG
    || bytesMatch(bytes, [0x89, 0x50, 0x4E, 0x47])                         // PNG
    || bytesMatch(bytes, [0x47, 0x49, 0x46])                               // GIF
    || (bytesMatch(bytes, [0x52, 0x49, 0x46, 0x46]) && bytesMatch(bytes, [0x57, 0x45, 0x42, 0x50], 8)); // WEBP (RIFF....WEBP)
  if (!ok) throw new Error("This image looks corrupted or isn't a supported format (JPEG, PNG, GIF, WebP).");
}
async function validatePdfFile(file) {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) throw new Error("That file isn't a PDF.");
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF must be under ${MAX_PDF_MB}MB.`);
  const bytes = await readMagicBytes(file, 5);
  if (!bytesMatch(bytes, [0x25, 0x50, 0x44, 0x46])) throw new Error("This PDF looks corrupted (missing PDF header).");
}
async function validateVideoFile(file) {
  if (!VIDEO_MIME_OK.includes(file.type)) throw new Error("Videos must be MP4, MOV, or WebM.");
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Video must be under ${MAX_VIDEO_MB}MB.`);
  const bytes = await readMagicBytes(file, 12);
  const isMp4Family = bytesMatch(bytes, [0x66, 0x74, 0x79, 0x70], 4); // 'ftyp' box at offset 4 (mp4/mov)
  const isWebm = bytesMatch(bytes, [0x1A, 0x45, 0xDF, 0xA3]);
  if (!isMp4Family && !isWebm) throw new Error("This video looks corrupted or isn't a supported format.");
}

/* ---------- Storage quota: tracked as users/{uid}.storageUsedBytes, capped by
   settings/app.storageQuotaMB (editable from Super Admin > Settings). ---------- */
async function getStorageQuotaMB() {
  try {
    const doc = await fbDb.collection("settings").doc("app").get();
    const v = doc.exists ? doc.data().storageQuotaMB : null;
    return v && v > 0 ? v : DEFAULT_STORAGE_QUOTA_MB;
  } catch { return DEFAULT_STORAGE_QUOTA_MB; }
}
async function getUserStorageUsage(uid) {
  const doc = await fbDb.collection("users").doc(uid).get();
  return (doc.exists && doc.data().storageUsedBytes) || 0;
}
async function ensureStorageQuota(uid, incomingBytes) {
  const [quotaMB, used] = await Promise.all([getStorageQuotaMB(), getUserStorageUsage(uid)]);
  const quotaBytes = quotaMB * 1024 * 1024;
  if (used + incomingBytes > quotaBytes) {
    throw new Error(`Storage quota exceeded (${(used / 1048576).toFixed(1)}MB of ${quotaMB}MB used). Delete old posts or media to free up space.`);
  }
  return quotaBytes;
}
async function trackStorageDelta(uid, deltaBytes) {
  if (!uid || !deltaBytes || !fbDb) return;
  try { await fbDb.collection("users").doc(uid).set({ storageUsedBytes: firebase.firestore.FieldValue.increment(deltaBytes) }, { merge: true }); }
  catch (err) { EduSphere.Logger.upload.warn("[EduSphere] Storage usage tracking failed:", err.message); }
}
/* Best-effort cleanup: deletes a Storage object given its download URL, and
   silently ignores failures (already deleted, permission edge cases, etc.) so a
   single bad reference never blocks the rest of a post deletion. */
async function deleteStorageUrl(url) {
  if (!url || !fbStorage || typeof url !== "string" || !url.startsWith("http")) return;
  try { await fbStorage.refFromURL(url).delete(); } catch (err) { EduSphere.Logger.upload.warn("[EduSphere] Storage cleanup skipped:", err.message); }
}
/* Same as deleteStorageUrl, but also looks up the object's real size first and
   refunds it from the quota — used when a user replaces one piece of media with
   another (e.g. a new profile photo), where the old file would otherwise just
   sit in Storage forever, still counted against their quota. */
async function deleteStorageUrlAndRefund(url, uid) {
  if (!url || !fbStorage || typeof url !== "string" || !url.startsWith("http")) return;
  try {
    const ref = fbStorage.refFromURL(url);
    const meta = await ref.getMetadata().catch(() => null);
    await ref.delete();
    if (meta && meta.size) await trackStorageDelta(uid, -meta.size);
  } catch (err) { EduSphere.Logger.upload.warn("[EduSphere] Storage cleanup skipped:", err.message); }
}
async function cleanupPostMedia(post) {
  if (!post) return;
  const urls = [
    ...(post.images || []), ...(post.imageThumbs || []),
    ...(post.videos || []).map((v) => v.url),
    ...(post.videos || []).map((v) => v.thumb),
    post.pdfUrl,
  ].filter(Boolean);
  await Promise.all(urls.map(deleteStorageUrl));
}

/* Resizes/compresses an image file onto a canvas and returns a JPEG Blob (not a data
   URL — data URLs are ~33% bigger and used to force the whole image into the Firestore
   document itself, which is what broke on anything but tiny photos). */
function renderImageToBlob(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode image."))), "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
/* Cheap, synchronous-feeling data-URL preview for instant UI feedback while a
   picked image waits to be uploaded — never saved anywhere, purely cosmetic. */
function compressImageFile(file, maxDim = 480, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- [EduSphere Upload] PIPELINE: LOGGING + TIMEOUTS (permanent) ----------
   ROOT CAUSE of the "Uploading & Saving…" hang (found while tracing this module):

   1. UPLOAD_DIAGNOSTICS_MODE was left set to `true`. withUploadTimeout() used it to
      skip withTimeout() entirely "temporarily", so a stuck request could reach the
      console with Firebase's real error instead of ours — but if the underlying
      request neither resolved NOR rejected (a genuine network/CORS stall, which is
      exactly what flaky mobile connections produce), there was nothing left to ever
      settle the promise. No timeout meant no rejection, which meant the calling
      screen's `catch` block never ran and `saving` never got set back to false —
      the spinner just ran forever with no error, on every upload path that used
      withUploadTimeout (branding assets, profile photos, community images/PDFs).
      Fix: the bypass is gone. withUploadTimeout() always applies a real timeout now;
      there is no flag left that can silently turn it off again.
   2. saveBrandAssets() / saveBrandConfig() — the Firestore write that runs *after*
      every Storage upload succeeds — had no timeout at all, ever, regardless of the
      flag above. A stalled write here reproduces the identical symptom (indefinite
      "Uploading & Saving…", no error) even when every file finished uploading fine.
      Fix: both now go through withTimeout(), and every write logs before/after.
   3. uploadCommunityVideo()'s resumable-upload promise had no timeout wrapper at
      all (every other upload function in this file did) — same failure mode,
      just for videos specifically. Fix: wrapped like uploadCommunityPdf().

   Logging: every stage of every upload — start (file name/type/size, auth UID,
   storage path), live progress %, completion (download URL), the Firestore write
   that follows, and final success — is logged with the "[EduSphere Upload]" prefix.
   Every caught exception logs its Firebase error code, message, server response,
   and full stack trace. This is the permanent architecture; nothing here should be
   flagged as temporary or bypassed again. */

function logUploadStart(kind, file, storagePath) {
  EduSphere.Logger.upload.info(`[EduSphere Upload] Upload started: ${kind}`);
  EduSphere.Logger.upload.info("[EduSphere Upload] Selected file name:", file.name);
  EduSphere.Logger.upload.info("[EduSphere Upload] File type:", file.type);
  EduSphere.Logger.upload.info("[EduSphere Upload] File size:", file.size, "bytes");
  EduSphere.Logger.upload.info("[EduSphere Upload] Authenticated user UID:", fbAuth && fbAuth.currentUser ? fbAuth.currentUser.uid : "(no authenticated user — this alone would explain a permission failure)");
  EduSphere.Logger.upload.info("[EduSphere Upload] Firebase Storage path:", storagePath);
}
function logUploadState(snap) {
  const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
  EduSphere.Logger.upload.info(`[EduSphere Upload] Upload progress: ${pct}% (${snap.bytesTransferred}/${snap.totalBytes} bytes) — state: ${snap.state}`);
}
function logUploadComplete(kind) {
  EduSphere.Logger.upload.info(`[EduSphere Upload] Upload completed: ${kind}`);
}
function logDownloadUrl(url) {
  EduSphere.Logger.upload.info("[EduSphere Upload] Download URL generated:", url);
}
function logFirestoreWrite(label, path) {
  EduSphere.Logger.upload.info(`[EduSphere Upload] Writing Firestore document — ${label}${path ? ` (${path})` : ""}…`);
}
function logFirestoreWriteDone(label) {
  EduSphere.Logger.upload.info(`[EduSphere Upload] Firestore document updated: ${label}`);
}
function logUploadFinished(kind) {
  EduSphere.Logger.upload.info(`[EduSphere Upload] Upload finished successfully: ${kind}`);
}
function logUploadSuccess(url) {
  // Kept for existing call sites — download URL + a completion log in one call.
  logDownloadUrl(url);
}
function logUploadError(err) {
  EduSphere.Logger.upload.error("[EduSphere Upload] Caught exception during upload.");
  EduSphere.Logger.upload.error("[EduSphere Upload] Firebase error code:", err && err.code);
  EduSphere.Logger.upload.error("[EduSphere Upload] Firebase error message:", err && err.message);
  EduSphere.Logger.upload.error("[EduSphere Upload] Server response:", err && (err.serverResponse_ || (err.customData && err.customData.serverResponse)));
  EduSphere.Logger.upload.error("[EduSphere Upload] Stack trace:", err && err.stack);
  EduSphere.Logger.upload.error("[EduSphere Upload] Full error object:", err);
}
/* Always-on timeout for every Storage upload in the app. There is no bypass flag —
   see the postmortem above for exactly why that was unsafe. */
function withUploadTimeout(promise, ms, label) {
  return withTimeout(promise, ms, label);
}
/* Same guarantee for the Firestore write that follows an upload — logs before and
   after, and never hangs past `ms` without rejecting. */
async function withFirestoreWriteTimeout(promise, label, path, ms = 15000) {
  logFirestoreWrite(label, path);
  try {
    const result = await withTimeout(promise, ms, label);
    logFirestoreWriteDone(label);
    return result;
  } catch (err) { logUploadError(err); throw err; }
}


/* Full pipeline for one community/comment image: validate -> compress to a full +
   thumb JPEG -> quota check -> upload both to Storage -> return their URLs + bytes. */
async function uploadCommunityImage(file, uid) {
  if (!fbStorage) throw new Error("Storage isn't configured for this project yet.");
  await validateImageFile(file);
  const [fullBlob, thumbBlob] = await Promise.all([
    renderImageToBlob(file, IMAGE_FULL_MAX_DIM, IMAGE_FULL_QUALITY),
    renderImageToBlob(file, IMAGE_THUMB_MAX_DIM, IMAGE_THUMB_QUALITY),
  ]);
  const bytes = fullBlob.size + thumbBlob.size;
  await ensureStorageQuota(uid, bytes);
  const stamp = Date.now();
  const fullPath = `communityImages/${uid}/${stamp}_full.jpg`;
  const thumbPath = `communityImages/${uid}/${stamp}_thumb.jpg`;
  logUploadStart("community image (full)", file, fullPath);
  logUploadStart("community image (thumb)", file, thumbPath);
  const fullRef = fbStorage.ref().child(fullPath);
  const thumbRef = fbStorage.ref().child(thumbPath);
  let url, thumbUrl;
  try {
    [url, thumbUrl] = await Promise.all([
      withUploadTimeout(fullRef.put(fullBlob, STORAGE_CACHE_METADATA), 30000, "Uploading image").then((s) => { logUploadComplete("community image (full)"); return s.ref.getDownloadURL(); }),
      withUploadTimeout(thumbRef.put(thumbBlob, STORAGE_CACHE_METADATA), 30000, "Uploading thumbnail").then((s) => { logUploadComplete("community image (thumb)"); return s.ref.getDownloadURL(); }),
    ]);
  } catch (err) { logUploadError(err); throw err; }
  logUploadSuccess(url);
  logUploadSuccess(thumbUrl);
  await trackStorageDelta(uid, bytes);
  logUploadFinished("community image");
  return { url, thumbUrl, bytes };
}

/* Profile photos used to be stored as raw base64 directly on the user document with
   no compression — a photo just under the old 1.5MB cap could tip a user doc over
   Firestore's 1MiB limit. Now compressed once and uploaded to Storage like everything
   else; the user doc only ever holds a short download URL. */
async function uploadProfilePhoto(file, uid) {
  if (!fbStorage) throw new Error("Storage isn't configured for this project yet.");
  await validateImageFile(file);
  if (file.size > MAX_PROFILE_PHOTO_INPUT_MB * 1024 * 1024) throw new Error(`Profile photos must be under ${MAX_PROFILE_PHOTO_INPUT_MB}MB.`);
  const blob = await renderImageToBlob(file, PROFILE_PHOTO_MAX_DIM, PROFILE_PHOTO_QUALITY);
  await ensureStorageQuota(uid, blob.size);
  const path = `profilePhotos/${uid}/${Date.now()}.jpg`;
  logUploadStart("profile photo", file, path);
  const ref = fbStorage.ref().child(path);
  let url;
  try {
    await withUploadTimeout(ref.put(blob, STORAGE_CACHE_METADATA), 30000, "Uploading photo");
    logUploadComplete("profile photo");
    url = await ref.getDownloadURL();
  } catch (err) { logUploadError(err); throw err; }
  logUploadSuccess(url);
  await trackStorageDelta(uid, blob.size);
  logUploadFinished("profile photo");
  return url;
}

/* onProgress(pct, transferredBytes, totalBytes) — mirrors uploadCommunityVideo's
   resumable pattern below (ref.put() already returns a resumable UploadTask; the
   old version just never listened to state_changed, so the UI could only show a
   static placeholder bar instead of real % / MB progress). */
async function uploadCommunityPdf(file, uid, onProgress, onTaskReady) {
  if (!fbStorage) throw new Error("Storage isn't configured for this project yet.");
  await validatePdfFile(file);
  await ensureStorageQuota(uid, file.size);
  const path = `communityPdfs/${uid}/${Date.now()}_${file.name}`;
  logUploadStart("community PDF", file, path);
  const ref = fbStorage.ref().child(path);
  const task = ref.put(file, STORAGE_CACHE_METADATA);
  if (onTaskReady) onTaskReady(task);
  let url;
  try {
    await withUploadTimeout(new Promise((resolve, reject) => {
      task.on("state_changed",
        (snap) => {
          logUploadState(snap);
          if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100), snap.bytesTransferred, snap.totalBytes);
        },
        reject, resolve);
    }), 60000, "Uploading PDF");
    logUploadComplete("community PDF");
    url = await task.snapshot.ref.getDownloadURL();
  } catch (err) { logUploadError(err); throw err; }
  logUploadSuccess(url);
  await trackStorageDelta(uid, file.size);
  logUploadFinished("community PDF");
  return { url, name: file.name, size: file.size };
}

const VIDEO_MIME_OK = ["video/mp4", "video/quicktime", "video/webm"];

/* Grabs a frame from the video (at ~10% in, so we skip black opening frames)
   and returns it as a compressed JPEG data URL to use as the feed thumbnail. */
function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      if (!isFinite(video.duration) || video.duration <= 0) { video.currentTime = 0; return; }
      video.currentTime = Math.min(0.5, video.duration * 0.1);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = 720;
        let { videoWidth: w, videoHeight: h } = video;
        if (w > maxDim || h > maxDim) { const scale = maxDim / Math.max(w, h); w = Math.round(w * scale); h = Math.round(h * scale); }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(video, 0, 0, w, h);
        const thumb = canvas.toDataURL("image/jpeg", 0.6);
        cleanup();
        resolve({ thumb, duration: video.duration || 0, width: video.videoWidth, height: video.videoHeight });
      } catch (err) { cleanup(); reject(err); }
    };
    video.onerror = () => { cleanup(); reject(new Error("Couldn't read that video file.")); };
  });
}

/* ---------- Client-side video compression (ffmpeg.wasm, single-threaded core) ----------
   Loaded lazily from a CDN only when a clip actually needs shrinking, so users who
   never upload a big video never pay the ~25MB wasm download. Uses the single-thread
   core (not the multi-thread one) because that one needs COOP/COEP response headers,
   which a plain static HTML deploy can't guarantee. Hard-capped at
   VIDEO_COMPRESS_TIMEOUT_MS — if transcoding is too slow on the device, we abandon it
   and upload the original (already-validated) file instead of blocking the user. */
let _ffmpegLoadPromise = null;
function loadFfmpeg() {
  if (_ffmpegLoadPromise) return _ffmpegLoadPromise;
  _ffmpegLoadPromise = new Promise((resolve, reject) => {
    if (window.FFmpeg) { resolve(window.FFmpeg); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js";
    script.onload = () => resolve(window.FFmpeg);
    script.onerror = () => reject(new Error("Couldn't load the video compressor."));
    document.head.appendChild(script);
  });
  return _ffmpegLoadPromise;
}
async function compressVideoFile(file, onProgress) {
  if (file.size < VIDEO_COMPRESS_THRESHOLD_MB * 1024 * 1024) return file; // small enough already
  try {
    const result = await withTimeout((async () => {
      const { FFmpeg } = await loadFfmpeg();
      const ffmpeg = new FFmpeg();
      if (onProgress) ffmpeg.on("progress", ({ progress }) => onProgress(Math.min(99, Math.round(progress * 100))));
      await ffmpeg.load({
        coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
        wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
      });
      const inName = "input" + (file.name.match(/\.\w+$/) || [".mp4"])[0];
      const buf = new Uint8Array(await file.arrayBuffer());
      await ffmpeg.writeFile(inName, buf);
      await ffmpeg.exec([
        "-i", inName,
        "-vf", `scale='min(${VIDEO_COMPRESS_MAX_WIDTH},iw)':-2`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "out.mp4",
      ]);
      const data = await ffmpeg.readFile("out.mp4");
      return new File([data], file.name.replace(/\.\w+$/, ".mp4"), { type: "video/mp4" });
    })(), VIDEO_COMPRESS_TIMEOUT_MS, "Compressing video");
    // Only use the compressed result if it's actually smaller — otherwise keep the original.
    return result.size < file.size ? result : file;
  } catch (err) {
    EduSphere.Logger.upload.warn("[EduSphere] Video compression skipped, uploading original:", err.message);
    return file;
  }
}

/* Uploads a video: validates, best-effort compresses if it's large, then uploads
   to Storage with resumable progress reporting via onProgress(0-100). */
async function uploadCommunityVideo(file, uid, onProgress, onTaskReady) {
  if (!fbStorage) throw new Error("Storage isn't configured for this project yet.");
  await validateVideoFile(file);
  const compressed = await compressVideoFile(file, (pct) => onProgress && onProgress(Math.round(pct * 0.5))); // compression = first half of the bar
  await ensureStorageQuota(uid, compressed.size);
  const meta = await generateVideoThumbnail(file);
  const path = `communityVideos/${uid}/${Date.now()}_${compressed.name}`;
  logUploadStart("community video", compressed, path);
  const ref = fbStorage.ref().child(path);
  const task = ref.put(compressed, STORAGE_CACHE_METADATA);
  if (onTaskReady) onTaskReady(task);
  let url;
  try {
    await withUploadTimeout(new Promise((resolve, reject) => {
      task.on("state_changed",
        (snap) => {
          logUploadState(snap);
          if (onProgress) onProgress(50 + Math.round((snap.bytesTransferred / snap.totalBytes) * 50));
        },
        reject, resolve);
    }), 120000, "Uploading video");
    logUploadComplete("community video");
    url = await task.snapshot.ref.getDownloadURL();
  } catch (err) { logUploadError(err); throw err; }
  logUploadSuccess(url);
  await trackStorageDelta(uid, compressed.size);
  logUploadFinished("community video");
  return { url, thumb: meta.thumb, duration: meta.duration, name: compressed.name, size: compressed.size };
}

/* ============================= NEW: UploadManager registry (Phase 2.4) =============================
   Unified handle for every upload kind — supports progress, retry (with
   exponential backoff), cancel, and pause/resume where the underlying
   Firebase UploadTask is available (PDFs and videos, both already resumable
   uploads). Images and profile photos currently upload via Promise.all/then
   chains rather than a retained task handle, so pause/resume isn't available
   for those two yet — cancel still works for them (it just stops waiting on
   the result; the in-flight Storage request itself completes or fails on its
   own, same as it silently would today with no cancel button at all). That
   asymmetry is a real, documented limitation, not glossed over — see
   MIGRATION_STATUS.md for the follow-up to give image/profile-photo uploads
   real resumable tasks too. */

const _uploadRegistry = new Map(); // id -> internal record, for diagnostics/inspection

function _makeUploadId() {
  return "upl_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function _resolveUploadFn(kind) {
  switch (kind) {
    case "communityImage": return uploadCommunityImage;
    case "profilePhoto": return uploadProfilePhoto;
    case "communityPdf": return uploadCommunityPdf;
    case "communityVideo": return uploadCommunityVideo;
    default: throw new Error(`UploadManager: unknown upload kind "${kind}". Expected one of: communityImage, profilePhoto, communityPdf, communityVideo.`);
  }
}

const _RESUMABLE_KINDS = new Set(["communityPdf", "communityVideo"]);

/**
 * Starts a managed upload. Returns a handle: { id, promise, status, cancel(), pause(), resume(), retry() }.
 *
 * @param {"communityImage"|"profilePhoto"|"communityPdf"|"communityVideo"} kind
 * @param {File} file
 * @param {string} uid
 * @param {{ onProgress?: (pct:number)=>void, onStatusChange?: (status:string, record:object)=>void, maxRetries?: number }} [options]
 */
function start(kind, file, uid, options = {}) {
  const { onProgress, onStatusChange, maxRetries = 2 } = options;
  const id = _makeUploadId();
  const record = {
    id, kind, fileName: file && file.name, fileSize: file && file.size, uid,
    status: "uploading", attempt: 0, maxRetries, error: null, result: null, task: null,
    startedAt: Date.now(),
  };
  _uploadRegistry.set(id, record);

  const setStatus = (status, extra) => {
    record.status = status;
    if (extra) Object.assign(record, extra);
    EduSphere.Logger.upload.info(`[UploadManager] ${id} (${kind}) -> ${status}`);
    if (onStatusChange) onStatusChange(status, record);
  };

  const attempt = async () => {
    record.attempt += 1;
    record.task = null;
    setStatus(record.attempt > 1 ? "retrying" : "uploading");
    try {
      const fn = _resolveUploadFn(kind);
      let result;
      if (_RESUMABLE_KINDS.has(kind)) {
        result = await fn(file, uid, (pct) => onProgress && onProgress(pct, record), (task) => { record.task = task; });
      } else {
        // communityImage / profilePhoto: no progress callback or task handle
        // available from the underlying function today (see file-header note).
        result = await fn(file, uid);
      }
      record.result = result;
      setStatus("done");
      return result;
    } catch (err) {
      if (record.status === "canceled") throw err; // don't retry a deliberate cancel
      record.error = err;
      if (record.attempt <= record.maxRetries) {
        const backoffMs = 1000 * Math.pow(2, record.attempt - 1); // 1s, 2s, 4s, ...
        EduSphere.Logger.upload.warn(`[UploadManager] ${id} attempt ${record.attempt}/${record.maxRetries + 1} failed — retrying in ${backoffMs}ms:`, describeUploadError(err));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return attempt();
      }
      setStatus("error", { error: err, friendlyMessage: describeUploadError(err) });
      throw err;
    }
  };

  record.promise = attempt().catch((err) => {
    // Swallow here so a caller that never attaches a .catch() doesn't produce
    // an unhandled-rejection warning; handle.promise still rejects for callers
    // who DO await/catch it, since we re-throw below via a fresh promise chain.
    throw err;
  });

  return {
    id,
    get status() { return record.status; },
    get error() { return record.error; },
    promise: record.promise,
    cancel() {
      if (record.status === "done" || record.status === "canceled") return;
      setStatus("canceled");
      if (record.task && typeof record.task.cancel === "function") record.task.cancel();
    },
    pause() {
      if (record.task && typeof record.task.pause === "function" && record.status === "uploading") {
        record.task.pause();
        setStatus("paused");
      }
    },
    resume() {
      if (record.task && typeof record.task.resume === "function" && record.status === "paused") {
        record.task.resume();
        setStatus("uploading");
      }
    },
    retry() {
      if (record.status !== "error") return record.promise;
      record.attempt = 0;
      record.error = null;
      record.promise = attempt();
      return record.promise;
    },
  };
}

/** Diagnostics: current status of every upload started this session (for an admin/debug panel). */
function getDiagnostics() {
  return Array.from(_uploadRegistry.values()).map((r) => ({
    id: r.id, kind: r.kind, fileName: r.fileName, fileSize: r.fileSize,
    status: r.status, attempt: r.attempt, error: r.error && r.error.message,
    startedAt: r.startedAt, elapsedMs: Date.now() - r.startedAt,
  }));
}

function clearFinishedDiagnostics() {
  for (const [id, r] of _uploadRegistry.entries()) {
    if (r.status === "done" || r.status === "canceled") _uploadRegistry.delete(id);
  }
}

window.EduSphere = window.EduSphere || {};
window.EduSphere.UploadManager = {
  start,
  getDiagnostics,
  clearFinishedDiagnostics,
  // Direct escape hatches to the underlying functions, for any call site not
  // yet migrated to start() — same functions, same behavior as before.
  uploadCommunityImage, uploadProfilePhoto, uploadCommunityPdf, uploadCommunityVideo,
  validateImageFile, validatePdfFile, validateVideoFile,
  compressVideoFile, compressImageFile, renderImageToBlob, generateVideoThumbnail,
  ensureStorageQuota, getStorageQuotaMB, getUserStorageUsage, trackStorageDelta,
  deleteStorageUrl, deleteStorageUrlAndRefund, cleanupPostMedia,
};

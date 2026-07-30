/* =============================================================================
   src/legacy/app-legacy.js — EduSphere Phase 2.1: Not-Yet-Modularized Remainder
   =============================================================================
   This is the original single-file app (screens, components, hooks, community/
   quiz/admin/dashboard logic — everything) with ONLY the following removed,
   because they now live in src/config/appConfig.js and src/firebase/init.js:

     firebaseConfig, Firebase init block, withTimeout, stripUndefined,
     resolveDisplayOrder, firebaseAuthErrorMessage, describeUploadError,
     LIGHT_THEME, DARK_THEME, ADMIN_EMAILS, MAX_IMAGE_INPUT_MB and sibling
     upload-limit consts, DEFAULT_STORAGE_QUOTA_MB, MAX_VIDEOS_PER_POST,
     MAX_IMAGES_PER_POST, DEFAULT_BRAND_CONFIG, DEFAULT_BRAND_ASSETS,
     HOMEPAGE_ANIMATIONS.

   Every removal was verified (via grep) to be the file's ONLY declaration of
   that identifier, so nothing here was silently changed — this file just
   references those names as globals now supplied by the two files loaded
   before it. Zero behavior change.

   This file is the deliberate boundary of what got fully split apart in this
   pass. Splitting IT further — into components/, screens/, services/, hooks/,
   admin/, community/, quiz/, dashboard/ as in the target tree — is Phase 2.1's
   remaining work, deferred to a following session by design rather than done
   here in one unreviewed pass across ~13,600 lines of tightly-coupled UI code.
   See MIGRATION_STATUS.md at the project root for the concrete next-step plan,
   including a line-by-line section map of this file to make that split safe
   and incremental instead of a risky one-shot rewrite. */

const { useState, useEffect, useCallback, useRef, useMemo } = React;







/* Small dismissible banner used to surface startup/runtime problems (Firebase
   init failures, Firestore timeouts, etc.) without trapping the user on a
   dead-end error screen — the rest of the app still renders underneath it. */
function StartupErrorBanner({ text, onDismiss }) {
  if (!text) return null;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 999, background: "#FDECEA", borderBottom: "1px solid #F5C6C0",
      color: "#B3261E", fontSize: 12.5, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{text}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "#B3261E", fontWeight: 800, cursor: "pointer",
          fontSize: 15, lineHeight: 1, padding: 0,
        }}>×</button>
      )}
    </div>
  );
}

const C = { ...LIGHT_THEME };

function getSystemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function loadThemePref() {
  try { return localStorage.getItem(userScopedKey("futalearn_theme")) || "light"; } catch { return "light"; }
}
function saveThemePref(pref) {
  try { localStorage.setItem(userScopedKey("futalearn_theme"), pref); } catch {}
}
/* Module 1.4 Phase 2 — syncs the theme choice to the user's Firestore profile so it
   follows them to any device they log into. Fire-and-forget: local + instant apply
   already happened via saveThemePref/applyThemeColors, this just persists it. */
function syncThemePrefToCloud(uid, pref) {
  if (!fbDb || !uid) return;
  fbDb.collection("users").doc(uid).set({ themePref: pref }, { merge: true })
    .catch((err) => EduSphere.Logger.error("[EduSphere] Theme sync failed:", err));
}
function applyThemeColors(pref) {
  const effective = pref === "system" ? (getSystemPrefersDark() ? "dark" : "light") : pref;
  const palette = effective === "dark" ? DARK_THEME : LIGHT_THEME;
  Object.assign(C, palette);
  try { document.body.style.background = C.bodyBg; } catch {}
  // Phase 2.7 (additive): also expose the palette as CSS custom properties on
  // :root, so new/refactored components can use var(--es-primary) etc.
  // instead of importing C directly. Existing components that read C are
  // completely unaffected — this only adds extra properties, it doesn't
  // change what applyThemeColors returns or how C is read.
  try {
    const root = document.documentElement.style;
    Object.keys(palette).forEach((key) => {
      if (key === "mode") return;
      root.setProperty(`--es-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, palette[key]);
    });
  } catch {}
  return effective;
}

/* ----------------------------- EMOJI ICONS (no external icon lib needed) ----------------------------- */
/* EduSphere brand logo, embedded as a compressed WebP data URI (no network
   request, no dependency on external hosting) — used on the splash screen,
   auth screens, About page, and Profile/menu header. */
const FL_LOGO_SRC = "data:image/webp;base64,UklGRoYdAABXRUJQVlA4IHodAADwbwCdASpAAUABPjEYi0QiIaERSdTIIAMEsbdvdV5+USXS9fM79/b/2s9tuwv2L8K/2f9p+t3LR2Ifuf7Z+7P+f+YX+T/w/sU/O/+49wf+Jf0P/Of3j8ce5J+5PqC/kf9u/7P+R/f/5fv+j/pPZj/kf8L/u/cA/qX+N6y39xPYP/aT/6euZ+4Pwh/tj+1P/X+Rb9gf+v+f/yAegB1X/Yj+1+jrx8+5fk3+5Hc+ec/af94NIz+N/af8L/fv2n/NLnz+LeoR+H/yL+3/k3/b/3M5gzZPMC9jPn3+j/xH7c/5XnR+Zn8qvoA/Uv/H/lh/df//7vfhF+cewJ/IP6L/yv7n+ZHxd/8n+z/Iz29fnn+X/7X+S/dz6Cv5D/Tf9T/fP8x/z/7/////H97Pst/bv2f/2dGW8qzMGVuPtcQiq1Aef3klFfqdjYK+j/2ORVV/ZB64aC3Mqq/sgfmPoUSuRTURGapd84ciqrp8X3N//83vc19fcKUWS4h5jXEZQFT7YcPjY22ekIkqkuzoM+4VtL53dnQ+mJcHM569UntaK+nYWORVYwVL0Qqgq+smp3tyWZ7KTjJY0d7p3bf4+EyzvcmrR2hsxJ+ESrLaA/qgisEBE1rJwh426ui9C/2KL2z6RnLnkzqzl6z/nj1025R2xIkVHXk2dzY5RhXiD8D2cWjAB2UhGmJRsCcqFrl9mq4xff/PExo1mZq8EuXNpUOqJkAbwJhn+7GHBiX1WUNouECa7OgVqRkuPQTGC9V84fjG6X/JmD8ZP/4Gv/iT7nkCftywMjGJau8Uh+PNtIlu+kG8o7EtXY9KUZmNZZ3TSAw5Au/3cktfRIltgT2/47tCCWrUt8+9HH8ejvMgJc7USPanXygE1Y4svFo9dfu7j4+MNFo1S9ArMLMIDsQG5tNZzBSZpp4y1s4ZjEet38rfrH51JyUwsypByjdwcxUxpdNQi1kvHhiwjD5UP1lYvH555IU9RO5a7FlQb5sR2SDQdH0No2bGJrwMbqkAN9HYb0QQ1x+uqm4PNr4GJvcrAM2ybnwBHu97kPnfHq/k5NnH5njN8Z/9oXT/nGGxpN9f3IcO0FxgPZU0U9YzKGbUWKNdbeH4ZGkEXazizTKS55Boj3oqS2FJb/RPkIw85dsieEyyOLRtEx0UA56jjcLaN0JkvXZi7VSZQMdK9lJN14ouvfCblRvgLglF2CYAAP7+Mvv+Vua6L1Cu/kDwpJu4KlJnBYO1+nWIXbB8qtbLwqqvaCm+Q0a3E5j4nl0+8ogF1CThYlJqqg3/UwAjqAfDkTvm/2mmQdbrrflgu+hHzpYHEknPodIy7CG2UgyZQvj9bKSJtQc/PZqIjv+Ab1d3Be43QRvsskRWFQBwR4W6FdcZsSDQKjIL7WF0W2iI6aEu4HCeBlq46lz2fBpAtbpryPFXVfhJ8xZ0K8qvYbVQbVHKV3OZGF970uoGwnj+xnMFYsXg9UauZgVeZpNykDQpLlBwyzXu1wxzSm8aklqGNVQZ/4x0wOm9Nz1JYt0Cz0xw0ZYKAXP3H3jD707qtKJLA+fgB5I48BsEelCtcYUsuKGBrVGOkMny4TNsGsV/RkhcNguP08/FuWoVmfaXG1Y6JxRw0S8eATsu9eDrWgAq7m84ZNi64b3R247NGA5ExMd+zVYr8f8PoMI/7ozVDTto8oMC0D6YEkxJ2qnM3dnHXrSEnNbTGYXZgUEHKr5dTHo+eflkiWRTW5GOp04Uf00OqA45dWwQfu+sqlBsZUd/GINjfndpAReJ3Hgn0+kej89pGDyYbewSn/IHLCj/Mp1SpZyvbIYNpiNX5dtwQ7/7GNDymX3dEaSJPm1rxJrHw8UOpWJqndLl2GouPH50v3kD+12onapxSTRdaR6WVYj6zkyiuytS9JUJugnJBXKSscm7MAhuAIjNz0xRPNGgR77iuIXeKAmofXj50F54SKiofjwaEiPGINL1eGkUVonkTm6DTUKej6RidU1a4D0HnIlJH6S2I+P79+SBASJUt3ZP2WEph3+WqZ4KvuEuwWKpOer/bAQmCy+MxtDUZc/sVKAXXFfubIyGePov6TVAeS9PC69TmzTP3Ir/nMOcWNOV00LhMoU13yF9LgVZesh2PaxOWSnMP08du35EOC21CuRZzJ1KKThiM0oZoeoZ3T4iZR3yJDcs/Y9xCTzxkXY2hJgAPopUx0u4NiJjN7JSov+T50sT16oHNxPVqYVkUeE/hhpbps6XJkvAbq3yxmAB5Ju2vgkevTTeG/RKq40ocybFZOKlTXYwbKWj1lX4fZbkg2exXcawhvc3//IyhnBePldDKnHUcwgCBOe2sOzri73y5YtWK1ipb5a79TumMN0fevrE+1nLKyZrqJQszgm321mGyWFozUh7isT+eFDesV2bf7EDNbxsLtVi4nXulijKKL5DxW1nZVwg8xbIxR1D8jr3b+wtIl+zUueWL5i/e1AoUO5NRdm0IcyIBKS5VgcX8FuwKup5BR0s2R2k3cJl4oXA829yc4XPdg84VqGXleA95S2t4b7EQrgg/63DyY41nEytmhSPOASNBgotWoPN0tcYIAk1rMhJ7F1tURsJRpXeSPYa3pYM+NbZBOLyetO3sY1OoHQIn/Id/iEHZMVp8a5QGXEVX8TnmSYysYOV/gLlNIy35hezbT5q0E4tnehgBAbx03kv9DRgOTVFnkSaY4VRYxlJKaFufq363U34kCuK6acJ2OCL32VsO/yY7we2LlADBO49cpCC9Lob9cxUzS5wts6FQrp/+c4TmjIDrQaFMBfX+GVRfTd8dmxlSwfqNFeZYrLTHAULIQ3wulQM/YuJFMlnIw1FJBtVa5qFEI6zL1VtBnkvuVwiW4gR72+7GcPzWvakUW/GyHjRchXaO0a9z+mxMHriGNxXwpHGLV0L1G7+rZoCmSyInmiRWAeC2GyW5Vz7ARr9M7Ze1yyJhgLcI+wqoAQMqeHr+AnDOiyA6uMAEWh2CmcJGs3yca/mXP8H5gbRDoxLluUqQ67h3xQVllof1HNrrn1qfGQjw+C+LXOu4U2vzOO4gb46V4bu/bAGgd6Yr0SZZnxFsk53logvGiDtCEoVTaTixGHG81OXq8xHGWbTXSjtszH8tw+TFfySViJvn7gBnLlbjBm7KwQeszdg6h/y+5dlW0SQZRCBWGJdhUecFVbrX5yrMTe0X2r5cY3rEIBCpHVourA1DOVhfhj5t0QCCuZX7MDA3gRrLM6uNb4n6D9a8g6u57pVMsd1rvJKMOR4qUX9aqJdu+Z8jepPpXWd9dmLv7mUwmYmCcbXO3ZMJt75uAUkQfrEYi4ysAV4DkWI2IhhmJZucwffrcGu5qcTS5/sAkiZ+p/bpa0FuB260c/fS4PapgW3nJ1li2FyXMhek6EMr/gDHJmL69W0uPWJQn4uVfaI4d0IjW5A+7iXM8rbKPZV+xzUDu4iecpIo0k97/TJWCV0vvzXD03W/f4+EAo8HJXprm0inNhf2afEDHNNOcJxrwE5IvVBp8lSJNeMSl5RZ0nGmLPPm8xMSBGKH4Wdr5Yv+UAo2bejRWxZKxKEcI1v2kFg4CUkw0/F5APPR1YnQVR+taXz4KPUga4ZJB/2zJozNQ+ANnQvqfFfTPNxrXaHF8jm1+j4+khOmi65VX8meiEraYCUHMyJQNGB/QWsbX0V4vy+7o37OhbNfGuzrUfsDc+NRiMfpXFmCDz28KjrZcgK50QvPtISZ35rD4HYJ2UpVBL1nEyUaseXsFh5DDj9YA/u5u2xS0KsD4zCHDTZSsrNmc2EiNJPvKsWbJiKpXXFHRftnzZoJKyoTC0vKI6o9crgdcUNZFSbosNcPW4UJFvvEvuCRNDlrwN9XssZ07QQiBqxgM5R1m9UO1ryQlFXaG3EriKhj6oWQTkAVgJTCz5QE+YDCn7QRZ/sLBURmpAo5LsQQCdMPqcDCULRMyQ+slZjHQkLSTvst9HhbdPwLlCV75U9ZZowtg0KluX2uiqx5/cdGscJH+4dlhSGzZoYgie/CkMS8P5gsT7+XWcBsELCNctv1ybuE6IUbeYv0R4kCLIAwkPnjmZU27vELmM06F7YAVighsciYVqTgDbu1cVmnzEfyKN4W8IWcEq/wgcTIBQSV3VwU+WN3EgsmRiUjWgNTzTdzJFf/7ljkFnZ11lHULknMit/nfQp64TFBob6mqroEv3N/xGLYG7AIYdOWf6o0ZSQ1+7HsFYmQb5LoILgKRC4wcP8V9u57SlxUNyOYd8ls8mcUvWB9bIIfCDcDXyMZIrQGI/VvVVc/eZs6Sp4lOpbKTmN/QWHqxQxVuXKcPh/dX4azNp7IXPBixt5HCESkSgE5N9e+6vpK2YuuGGS+Z72O4ejGbpAatAwtKKFw7YSa6B6DlZFAodLjTnIrF1EBRuVAowNa61DJCVzerH9Xh+1+ZlfIQ1zAdVvoXDvxbjoMZigmwr6u4nA/bvg93xI8a/6KFLp2FmWO2naRRrxO53jpkpaqN739f3J5Aayp/nMFi3aw8KmopsLgYa5foOmNHgU0pGDuYmNTN/jHCVrhRZhawVuRRslmvuvm/uwjm7IXVNnO/31Qk9RYg85cPhGt0oHoVyEZqI4EhSrTr4VlQR1wbP4mbvg4EwzT0w74Rp3YoUjXZSD+9Sj+WPf2Au+oKkdQrarC4RrLCUuzn4ziSrPEOmv3gCsDFfd/836WRY2r6G4RyYTJz/0pkQ9WNrSqC9z6jK6NbxnhsWY6Q33oYcs892lcUyJ06xqbbWmqJxmIGfmygm3G7M8uk2zD3T7fh6OlpEtWa4y8heaEXVlyuceuNJADXuCaT2gj+CDGvnxlyyRmZzSM666GYiPOYe+UHmvZfQZR6MYBbBbRpwMgVn5tTRPGtpWTDnmm381aXoxkMkI4zp5h3W44Lz5KuV0zgW9Ac/xRnOzb+LOp1CvgPLff2RLhr8U78h6G4cWKO7YXmcUWaXCc11m4Jz0j9dHxc8/PbXDECA+T9Hqflw0RmXgc5NYbh3ItL+5D2TpK5cXqagME69K5hSlku+Aajw1WubJLNIjPy8hXkPCMtm70ejR3kajQ8dWSQLBo8UD5eEB/Qn1yM8zYJnLKjadyIKGjqeIT4SFpowKY1W2n0MMJZ36CvcobzNmW3le6PVq5k+FJ99of1vSqse2Cy3dmCN1RanEjXturCH2RbULbsNAkYo/PxRu+E3+FU/SupxRrIDRcZFstGVtJic7dQCIwR5UFWWo/uiKxP5agqJE5TvUKB6pwoBsNmNm8DYDM3dJ7ENxI8j0ws9Xiwac5KZwm7b2jnHmIfzr/8P34oz2E7FUuczjm8XG+zLJatDM84+/WMHJdd4IJCXHhz6P7yZpJ5qDD+LH+H78hDza18xdzhFlTGjb1l/8Na5R+WvTyL/fbKeGsHwbUBX1ct1H35FofTq7E3z2u1hpLdgSB4B9DOB1wTp+dzQR66wv/FAAdPru0KqlJzeIco8v/67YB//1Bx2BM43SkHYdGKe0AOnM0Z5Iy7IZ1cyG1VOagn0G5W+dyu6q7MVEV8DX1GpkPhHSv/7//LWdSse4ZBDin2Luv7s9uElR6fOauSbMkpycJK7cT7romgRYWkei3DZNTw0bA2P3RD1Jo9ZdAuY4uq+1WkcBKURHyX+DVBBRHDZTsrznm5truVnj3SJ6PYQkrKQ+DrQbbicWS/qe5TiLDPjNRYBfDjTb4fIF3ux0/sIAIP+iW+Z5HT2r/vuJWLVw1Rd3WXI3w/Ofy8hcnKzJMFBpEJroh/i+RvGJM+jj1eZdjbcUB8gC3lO7ltkDR+oOmNjtqNXvf9utPT4IqpB7yc8u4dgprRq1hg1RhR8Bo4HN+ACWEIz+/TfTbenhgI1blw6Y+U2qo2dAFc8Mo4U/i2iR7f9uPunxx63tUMQOUiyGM8zOHvnhFvyGpFTL/sOYqUPPm5Fr5S5PbfXlDw0B+4tmjRLLJMshde5dWLy9Jc2dbnw/oPLhPBdu4AQEWqyvx1sPbDfA5awmUjRvqJZLBfkHahNoVXLhmYOAaxNNOQkV9G61RMhnl4YV+2laUpd9EjFXiyaOKkM84utkTx0OuaVyN0hAe8LZNSVfoZM2yHi9o8WKCoxG/Kb/3sPT2Uc8zY/KerpJBXm8l+bShZuXWBy+HsqLU6zgGFD1yFt80aCP8Eb11SrQI07X2fO/5tNS5rAagqGLXTKS4dzPrinjaaYkfJTI3+n5u+misVJBs8QFYBKiyGU4ukHjS+k4LiJag4fLn5C3c9gA/chPWu3ivWr+XEyjBwISQwPWgav4+5LSZ9VTaNz7dwlsI0Sq8Rj+rHJ46HkIoTD5s5RopHeKCICDsUhGp7RDOKWOEEx1VbS71YIVNI+oU4kzLctzY/el/RjxGTTyYKq071K4HhTj/1u47Uqx8aTZtwrfY1UGlt7OSWJo2NKBs/zuE/TGViygYhWEe2WDM86ZFafIREvf8ugV5q47gs/9SbzflI+NhMkXqcNVJFjY1rWwAXCRJu9JyWhJtntFZrlJJWl3wa8ciDtupoFrbRkzBWJwTuYe2qOdYAwn84owf/5c61tRVN4VbFeIW/K0D5GLofZH6/CyPnL6tOcBdVn9wcbXh1ieU7zFALrRUXSIrSU8tvjTSPEcMGeT9tpMeZDQzMWbo5yaDdEDe9r/ZA/D9ZA7WZSce93M7JjD9Eh4OPVnJQxu6a9ds7IbJXlrz5VFL0Y0CQUEr/GgQ0HPF1Yl1TBrzfS35SA3cKCkfooT7hhKAHipv39ShR/9g5/I5VdoEOY+/6A5W31XuHj/8CXkfL/sHwcAAfxaquWbyFvb7Reo3e/J5u9ayAYlG+sqZAAp7yfRhyOLiX/ZXF/oNUQCFVUbqfdZud22syzg5v/UXhUxq+RZby5EHosN55R1ykbNc+PlPBCGvmOtbNg0LYTVZCZQLTI7EdR0OF3T8pNDb8imyii2LqZp9NQk//SJjvmsEzQVlcJAlG7PYI1zo4f/FPwKgffw2LE+AQBootEaGl/VJAL2AO6bg7vWvrMEucObI7298aUOQNqrPBFi0rAiV42B2NaW5sZTAGHZfP6cYvBj7T9skS+ZIsu6dJ0kW61Ls4wZVhtdLjyNmo71sjXmZWivUnkajIqGOked4jv5YcK/Ymh8kRPN6zdRFwDpl+d7RQxq5sVqIvnFGw5uzrzJp9NgvAGNCNWmnq8BXrSVtonybyy3zlWCJyQ1ekC1rGKUvHjUhdDQwDGhOZnImtOJ2eAbq+gd85UnJgjvyseFlt/CWkg0GlDDrJpDsvoMUFOS3Po7tjqYS7rH4IHTTNxuQE9NmACRUjYN5EUPxhI9zjo3IZ9LlHJJ6H2uBdvN3p+ihvCyO3rloopfiwlVViztmePt98Q0Fx0aSTi/j5WxrASkAyYkVgvuncs5dVwTwh+knD0MKsPIT311Duw3JUUzjAzQQt7fiw0ER9heCTTlmrXWJ2ERAWLNyohaYF9zBnYV5+6ECewdV+LX/XPYrdnL//pjSTQVZt4YbawzPxfjvegrlaW3ZtY3GKTkxs9MAlI0/9mLypT+h/aua+rF052YBjVgVu4SN7je8nTtzB//6YSeO/EzbejPfhfVgSzbK5+2+uyFFMJx/U3yuprx3kU+vaPktrK61srGVdE048SRy4liv/ZnVgX0uGt+iD6wX1fRzIqG8oiTq77JfeGppHvsJcOxaPCvZK/ML3UTDYUXM1+x/N/huY9i92sJXQ5Yhq++MLjVs5BkTb5Ufk4E1vnsX4mEBniG8xlCbGQ6uBr3u1CaOkgbRpKUTa79aNYed9zpjoe0fNDJ8xNaStKEUDRl9SgWkbw2ReklYFrA2QMFg5TVo3XeTYKXJ9cP8OSg+OJ92ydMZRNEXAKuMkbFzZzKKmBDx7wpKEnHuwvxE2gMUh6mnelcgHlcPlIXNnCwkJJqr/niLo0zSmmLf8KVpAy8K+e3/myv+mgextCDM2cUGW43A0TYJ6p5IhCC8Di1SnbTyGbKPYbGxB4hiov893WZXmPB9LgGex0sIrsdeuphSrYwHYREeRHpDFqKIiSWWfofq/bNGuhurYEvwZhoBcNRKtE73CPr0dhrtOaF3s4yREo3mTzbqvip1X9XdP8g/+NZSOXGw2DA7pSOQCL4wAPbcBr1rD7+5uCeqymedqCo509d60ECszqIXe2vZlMwlH/yNwS3ijXdwCAYWONDOrBjEDYJbzVgvyoa+tmOQPCMvkeDtIQNL7A7WRVCHlBdZnCu82SJ3UT9DMvTdfOIealSv4N94iWftalQ1c7DR3lOtgWL4reoBFDSPSScA8sANjD3Qs6J/MPwtZzZzeCp3SaCFkzdyI1fisANGmmizS6MMo8GcV3ULtJhN4B2Go1iXPDV9c6tPf9t49W2PZ0DU+yqqr4MHBf5iFVwwx8x4ch2gJHG2DiAVcw02vrr7pkaTESybDZMAWwUFd9aU3PInt50PsA8Fz+H7KxjrHzW4QREmRVU/oBzMW6luZ6uX+EjGLZIFfYt4W3xbSaLaX4ZPn+Sx1dCQ++e6u+Pas4Nb89xpQrhD6Z6nCiyv7vsHLZQlzU0GIqOh0dGnlXAXRyszX5T8GtzXeKFe1RSCdvhCC3TwmrPchC83qBDWGmHxgVzVHAGonA4zdZq1WtysLAwty8XK77c9P4jtGJlsbWLbrIgJXMxMq9Uq9xBqZnstlWjY2rS+Mvn1/fC9IHUM+0l+UT7sOICz/KRwAgyWUQeRG+nJpDBO19PWJlGF3SLBZ92JN+lF7WZDzc+uzgG49NkMz8G+HV+m3M+2ZU3jN5xyOYuwO3OQW8SF9dFkeitWMuE4OBX/HHeSbalsPlcg9Iz4XBGjx+z4s5HPxRUEnYvTBGcmFl1XRbFqHmREBR3yennQ+SPZ56Q3NI3/86Nfa5Qqxnq3ymWaRJK1q0W02w72QyW4Cfo5f5gzzJaTL5sbsiC3SFCHkXRFH22B3gJNutyL35/0sOilzrjfSC5ft8X+Ty+7Ms61T9ue1ZHFPzTykTe2/u3FwQBNq30LfM1EKsVXYPI2eL0FcZ7LuAqQaP+/D/v4wntpIN2LBFjdctsFZIBjdqtzn/FaF3RJWp2KG0mpQ0ppjvYzLPV1PD8PY7h2bsA6HwCXRJEhZ1xOK2WZHK87jd18Co7gWzS6EUmc+BHh51YKyGmORmUcX83pp8GQUxcNgbF6f2bTM21j4l9COAj//PfFmQ78Jwrim2zvRdgx/yiOXasGf5V6CYc9mO5KcsO5KZNtvakja+SD7Fk711foekrLKFBs3lync582Y4mtupoAVdmYXgotwYfz/1RARLiTMTckREuiHtb9Az+tkOTDUxwzIa3OR5D3ysQo7g+8/fdobMJFeOqOHwVMwgl6maeMnDK42q3i2DekBBP2t6FswjPV4ZpiytvQYgSRUDJJl50tlOBQ5RNJ9u8630cvruWeTUDi0jRWIHB/qHi40b5MWGJkZTfVwHkgQzOarr9HYST7MtozVD/Q+eHWGRK66drSOwZDZp70xM1+5VMpInL4xJiaXRU+/sdoilxr5kDKoO1BbcenD+yJzyPJsVyY9jEHJl9v//u11kktIkX5T66kyHYQ7xkeivYNzKfRwAlB5d2RJ/8++Fho7IW5/j3V+5eQElPZNz8yLYDj+XvVWYpTLXBlEqg66poGVY3U+ag4uShdoAWRokSfXSyYxaTxBARywR+20z4G/alnDgxJ8R2ujVw14HP/1dW8rSMhpNim+DVcr+XGWfLYQ1UXL7IyTabw4ThKYxhl/4VqjBeVtV3Oc0n99GIf1c5/CIYID0l0oMBTZZTGDe7FKtHGESFrF3OJLME1UIDJmuFsrjzO62A763y2GUGytU8bjEHZm6X82KZk68J/pT/zMV5ETpS+buC8YihAmh/TSQ2RcLrZAZ8H+A+adzc4H/nC+jw0NYQk4nt95VL4+FrODlATp4fSGEiR476wGpGsInKi6os9rpdMOhq+nrgSX1V/gM+8GbYT94sa4KuB4Eq4k3S5DWuq6viAbDqWmRkh5KjN4HnpcLhkXP8RTnNeN4v3+/R9xrI9AAA";

/* variant picks which configurable slot to use (Phase 3: Dynamic Branding Assets) —
   "splash" | "login" | "dashboard" | "app" (default). Falls back to the built-in
   logo above whenever a Super Admin hasn't uploaded a replacement for that slot. */
function Logo({ size = 64, style, variant = "app" }) {
  const { assets, config } = useBrand();
  const variantKey = variant === "splash" ? "splashLogo" : variant === "login" ? "loginLogo"
    : variant === "dashboard" ? "dashboardLogo" : "appLogo";
  const src = (assets && assets[variantKey]) || FL_LOGO_SRC;
  return (
    <img src={src} alt={(config && config.shortName) || "EduSphere"} width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block", ...style }} />
  );
}

function makeIcon(emoji) {
  return function Ico({ size = 20, color, style = {} }) {
    return <span style={{ fontSize: size, lineHeight: 1, display: "inline-block", color, ...style }}>{emoji}</span>;
  };
}
const Home = makeIcon("🏠");
const BookOpen = makeIcon("📚");
const BarChart3 = makeIcon("📊");
const User = makeIcon("👤");
const ChevronRight = makeIcon("›");
const ArrowLeft = makeIcon("←");
const FileText = makeIcon("📄");
const HelpCircle = makeIcon("❓");
const ClipboardCheck = makeIcon("📝");
const TrendingUp = makeIcon("📈");
const Settings = makeIcon("⚙️");
const Info = makeIcon("ℹ️");
const Phone = makeIcon("📞");
const MessageCircle = makeIcon("💬");
const Award = makeIcon("🏆");
const CheckCircle2 = makeIcon("✅");
const XCircle = makeIcon("❌");
const Search = makeIcon("🔍");
const GraduationCap = makeIcon("🎓");
const Bookmark = makeIcon("🔖");
const Sparkles = makeIcon("✨");
const Clock = makeIcon("⏱️");
const Layers = makeIcon("🗂️");
const Calculator = makeIcon("🧮");
const Star = makeIcon("⭐");
const StarOutline = makeIcon("☆");
const Pause = makeIcon("⏸️");
const Play = makeIcon("▶️");
const Sun = makeIcon("☀️");
const Moon = makeIcon("🌙");
const MobileIcon = makeIcon("📱");
const Shield = makeIcon("🛡️");
const Users = makeIcon("👥");
const Ban = makeIcon("🚫");
const UserCheck = makeIcon("✅");
const Trash = makeIcon("🗑️");
const KeyRound = makeIcon("🔑");
const Megaphone = makeIcon("📢");
const Database = makeIcon("🗄️");
const PieChart = makeIcon("📈");
const Trophy = makeIcon("🏅");
const CardsIcon = makeIcon("🗂️");
const Cog = makeIcon("🛠️");
const Eye = makeIcon("👁️");
const EyeOff = makeIcon("🙈");
const Grid = makeIcon("🔢");
const Heart = makeIcon("❤️");
const HeartOutline = makeIcon("🤍");
const Share2 = makeIcon("↗️");
const Flag = makeIcon("🚩");
const Send = makeIcon("➤");
const ImageIcon = makeIcon("🖼️");
const Paperclip = makeIcon("📎");
const Pin = makeIcon("📌");
const LockIcon = makeIcon("🔒");
const Download = makeIcon("⬇️");
const Bell = makeIcon("🔔");
const Filter = makeIcon("🧰");
const Broadcast = makeIcon("📡");
const AlertTriangle = makeIcon("⚠️");

/* ----------------------------- SUPER ADMIN ACCESS -----------------------------
   IMPORTANT: replace the placeholder below with the real email address(es) that
   should have Super Admin access (the account must already exist / be able to
   register normally — this list just unlocks the admin dashboard for it).
   This check only hides the UI on the client. Real protection against a
   student calling Firestore directly requires deploying the accompanying
   firestore.rules file, which also checks admin status by email. */
function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(String(email).toLowerCase());
}

/* ----------------------------- COURSES ----------------------------- */
const COURSES = [
  { code: "CSC102", name: "Introduction to Problem Solving", dept: "Computer Science", ready: true },
  { code: "MTS102", name: "Algebra & Trigonometry", dept: "Mathematics", ready: false },
  { code: "MTS104", name: "Introductory Mathematics IV", dept: "Mathematics", ready: false },
  { code: "PHY102", name: "General Physics II", dept: "Physics", ready: false },
  { code: "PHY104", name: "General Physics IV", dept: "Physics", ready: false },
  { code: "PHY108", name: "Practical Physics II", dept: "Physics", ready: false },
  { code: "CHE102", name: "General Chemistry II", dept: "Chemistry", ready: false },
  { code: "CHE108", name: "Practical Chemistry II", dept: "Chemistry", ready: false },
  { code: "GNS102", name: "Nigerian Peoples & Culture", dept: "General Studies", ready: false },
  { code: "GNS106", name: "General Studies II", dept: "General Studies", ready: false },
  { code: "GST112", name: "Communication in English II", dept: "General Studies", ready: false },
  { code: "CPE102", name: "Engineering Drawing", dept: "Computer Engineering", ready: true },
  { code: "MEE102", name: "Engineering Mechanics", dept: "Mechanical Engineering", ready: false },
];

/* ----------------------------- ACADEMIC CATALOG (Onboarding) -----------------------------
   Schools -> Departments -> Level -> course codes. Only 100L is populated with real course
   data for now (matching what the CBT engine actually has content for). Levels 200-500 are
   present in the structure (so the picker doesn't need to change later) but intentionally
   empty until course content exists for them — the UI shows "Coming soon" instead of fake
   course codes. Extend this object (or move it to Firestore, like COURSES) as new levels launch. */
const GEN_100 = ["GST112", "GNS102", "MTS102"];
function catalogDept(extra100 = []) {
  return { 100: [...GEN_100, ...extra100], 200: [], 300: [], 400: [], 500: [] };
}
const SCHOOL_CATALOG = {
  "School of Computing": {
    "Computer Science": catalogDept(["CSC102", "PHY102"]),
    "Cyber Security": catalogDept(["CSC102", "PHY102"]),
    "Information Systems": catalogDept(["CSC102"]),
    "Information Technology": catalogDept(["CSC102"]),
    "Software Engineering": catalogDept(["CSC102", "PHY102"]),
  },
  "School of Electrical Systems Engineering": {
    "Electrical & Electronics Engineering": catalogDept(["PHY102", "CHE102"]),
    "Computer Engineering": catalogDept(["CPE102", "PHY102"]),
    "Mechatronics Engineering": catalogDept(["CPE102", "PHY102"]),
    "Telecommunications Engineering": catalogDept(["PHY102"]),
  },
  "School of Engineering and Engineering Technology": {
    "Civil Engineering": catalogDept(["PHY102", "CHE102"]),
    "Mechanical Engineering": catalogDept(["MEE102", "PHY102"]),
    "Chemical Engineering": catalogDept(["CHE102", "PHY102"]),
    "Metallurgical & Materials Engineering": catalogDept(["CHE102", "PHY102"]),
    "Agricultural & Bioresources Engineering": catalogDept(["PHY102", "CHE102"]),
  },
  "School of Environmental Technology": {
    "Architecture": catalogDept([]),
    "Building": catalogDept([]),
    "Estate Management": catalogDept([]),
    "Quantity Surveying": catalogDept([]),
    "Urban & Regional Planning": catalogDept([]),
    "Surveying & Geoinformatics": catalogDept(["PHY102"]),
  },
  "School of Sciences": {
    "Physics": catalogDept(["PHY102", "PHY104", "PHY108"]),
    "Chemistry": catalogDept(["CHE102", "CHE108"]),
    "Mathematics": catalogDept(["MTS102", "MTS104"]),
    "Microbiology": catalogDept(["CHE102"]),
    "Biochemistry": catalogDept(["CHE102"]),
    "Industrial Chemistry": catalogDept(["CHE102", "CHE108"]),
  },
  "School of Agriculture and Agricultural Technology": {
    "Crop Soil & Pest Management": catalogDept([]),
    "Animal Production & Health": catalogDept([]),
    "Agricultural Extension": catalogDept([]),
    "Fisheries & Aquaculture": catalogDept([]),
    "Food Science & Technology": catalogDept(["CHE102"]),
  },
  "School of Management Technology": {
    "Project Management Technology": catalogDept([]),
    "Information Management Technology": catalogDept(["CSC102"]),
    "Transport Management Technology": catalogDept([]),
    "Entrepreneurship": catalogDept([]),
  },
};
const SCHOOL_LIST = Object.keys(SCHOOL_CATALOG);
function deptsForSchool(school) { return school ? Object.keys(SCHOOL_CATALOG[school] || {}) : []; }
function coursesForDeptLevel(school, dept, level) {
  const list = (SCHOOL_CATALOG[school] && SCHOOL_CATALOG[school][dept] && SCHOOL_CATALOG[school][dept][level]) || [];
  // Resolve course codes against the live catalog so names/ready-state stay in sync.
  return list.map((code) => COURSES.find((c) => c.code === code) || { code, name: code, dept, ready: false }).filter(Boolean);
}

/* =====================================================================================
   ACADEMIC STRUCTURE (v8.0 Module 1) — University → School → Department → Level →
   Semester → Course, fully dynamic and Firestore-backed. Nothing here is hardcoded:
   every entity is a document a Super Admin creates/edits/reorders/archives from the
   Academic Management section of the Admin Dashboard.

   DESIGN NOTE ON "CASCADE": rather than writing a name to every dependent document
   (which then has to be walked and rewritten whenever a parent is renamed), every
   dependent stores its parent's *id* only (schoolId, departmentId, levelId,
   semesterId). Names are always resolved live via the nameById lookups below. That
   means a School rename is instantly reflected everywhere that references it — there
   is nothing to cascade-write, and nothing can drift out of sync. Deletes are still
   guarded (see academicDeletionBlocker) so a School/Department/Level/Semester that's
   still in use can't be deleted out from under its children (no orphan records).

   Legacy compatibility: SCHOOL_CATALOG / COURSES above remain untouched and are only
   used as (a) the one-time seed source for the new collections and (b) the fallback
   the app already had before Firestore responds. Existing course docs keep their old
   string fields (school, department, level, semester) — Phase 3 below adds new id-based
   fields (schoolId, departmentId, levelId, semesterId, ...) alongside them, so nothing
   that already reads the old fields breaks. ===================================== */

const ACADEMIC_COLLECTIONS = {
  universities: "universities",
  schools: "schools",
  departments: "departments",
  levels: "levels",
  semesters: "semesters",
};

/* Generic CRUD for the five academic entities — they all share the same document
   shape (id, name, code, status, displayOrder, createdAt, updatedAt, createdBy,
   updatedBy, plus whatever entity-specific fields the caller passes in), so one
   factory replaces five near-identical copies of the same read/write functions. */
function academicCRUD(collectionName) {
  const col = () => fbDb.collection(collectionName);
  return {
    async list() {
      const snap = await withTimeout(col().orderBy("displayOrder", "asc").get(), 15000, `Loading ${collectionName}`);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async upsert(id, data, userEmail) {
      const isNew = !id;
      const ref = isNew ? col().doc() : col().doc(id);
      const existing = isNew ? null : await ref.get();
      const wasNew = isNew || !existing.exists;
      const payload = {
        ...data,
        // BUGFIX: previously only defaulted displayOrder when wasNew, so editing an
        // existing doc that predates this field (or that explicitly submits displayOrder:
        // undefined for "not specified") sent undefined straight to Firestore and crashed
        // the save — the same root cause as the courses/MTS102 bug. resolveDisplayOrder()
        // now guarantees a real number on every save, create or edit.
        displayOrder: resolveDisplayOrder(data.displayOrder, !isNew && existing && existing.exists ? existing.data().displayOrder : undefined),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: userEmail || null,
      };
      if (wasNew) {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.createdBy = userEmail || null;
      }
      await ref.set(stripUndefined(payload), { merge: true });
      return ref.id;
    },
    async remove(id) {
      await col().doc(id).delete();
    },
    async setStatus(id, status) {
      await col().doc(id).set({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    },
    async reorder(id, displayOrder) {
      // Same guarantee as above — a swap partner missing displayOrder (legacy doc) must
      // never forward undefined into this write.
      await col().doc(id).set({ displayOrder: resolveDisplayOrder(displayOrder, undefined), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    },
    async seedIfEmpty(seedDocs) {
      const existing = await col().limit(1).get();
      if (!existing.empty) return false;
      const batch = fbDb.batch();
      seedDocs.forEach((docData, i) => {
        const ref = docData.__id ? col().doc(docData.__id) : col().doc();
        const { __id, ...rest } = docData;
        batch.set(ref, {
          status: "active", displayOrder: (i + 1) * 10, createdBy: "seed", updatedBy: "seed",
          ...rest,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      return true;
    },
  };
}
const universityCRUD = academicCRUD(ACADEMIC_COLLECTIONS.universities);
const schoolCRUD = academicCRUD(ACADEMIC_COLLECTIONS.schools);
const departmentCRUD = academicCRUD(ACADEMIC_COLLECTIONS.departments);
const levelCRUD = academicCRUD(ACADEMIC_COLLECTIONS.levels);
const semesterCRUD = academicCRUD(ACADEMIC_COLLECTIONS.semesters);

/* One-time, idempotent migration: turns the existing hardcoded SCHOOL_CATALOG and the
   standard 100–500 levels / two-semester pattern into real Firestore documents the
   first time a Super Admin opens Academic Management. Safe to call repeatedly — each
   collection's seedIfEmpty() only writes if that collection is still completely empty,
   so it never overwrites admin edits made after the first run. */
let __academicMigrationRan = false;
async function migrateLegacyAcademicStructureIfNeeded() {
  if (!fbDb || __academicMigrationRan) return;
  __academicMigrationRan = true;
  try {
    await universityCRUD.seedIfEmpty([
      { __id: "futa", name: "Federal University of Technology, Akure", code: "FUTA", description: "", motto: "Creativity, Technology, Excellence" },
    ]);
    // Always resolve the university id (even if seeding was skipped because it already existed).
    const uniSnap = await fbDb.collection(ACADEMIC_COLLECTIONS.universities).limit(1).get();
    const universityId = uniSnap.empty ? "futa" : uniSnap.docs[0].id;

    await schoolCRUD.seedIfEmpty(
      SCHOOL_LIST.map((s) => ({ name: s, code: "", universityId, description: "", color: "" }))
    );
    // Departments need each school's *new* Firestore id, so re-read schools after seeding.
    const schoolsSnap = await fbDb.collection(ACADEMIC_COLLECTIONS.schools).get();
    const schoolIdByName = {};
    schoolsSnap.docs.forEach((d) => { schoolIdByName[d.data().name] = d.id; });

    const deptSeed = [];
    SCHOOL_LIST.forEach((s) => {
      Object.keys(SCHOOL_CATALOG[s]).forEach((dep) => {
        deptSeed.push({ name: dep, code: "", schoolId: schoolIdByName[s] || null, description: "" });
      });
    });
    await departmentCRUD.seedIfEmpty(deptSeed);

    await levelCRUD.seedIfEmpty([
      { __id: "100", name: "100 Level", number: 100, description: "" },
      { __id: "200", name: "200 Level", number: 200, description: "" },
      { __id: "300", name: "300 Level", number: 300, description: "" },
      { __id: "400", name: "400 Level", number: 400, description: "" },
      { __id: "500", name: "500 Level", number: 500, description: "" },
    ]);
    await semesterCRUD.seedIfEmpty([
      { __id: "first", name: "First Semester", description: "" },
      { __id: "second", name: "Second Semester", description: "" },
    ]);

    // Backfill: give existing course documents (seeded earlier from the legacy COURSES
    // array by Courses Manager) their schoolId/departmentId/levelId based on where they
    // appear in the legacy SCHOOL_CATALOG, so Course Classification isn't empty for
    // content that already exists — "Do not lose" from the spec. Only touches courses
    // that don't already have a schoolId, so it never overwrites an admin's own
    // classification. Courses not found anywhere in SCHOOL_CATALOG are left for the
    // admin to classify manually — that can't be inferred from the old data.
    try {
      const levelsSnap = await fbDb.collection(ACADEMIC_COLLECTIONS.levels).get();
      const levelIdByNumber = {};
      levelsSnap.docs.forEach((d) => { const num = d.data().number; if (num) levelIdByNumber[String(num)] = d.id; });
      const deptsSnap2 = await fbDb.collection(ACADEMIC_COLLECTIONS.departments).get();
      const deptIdByName = {};
      deptsSnap2.docs.forEach((d) => { deptIdByName[d.data().name] = d.id; });

      const coursesSnap = await fbDb.collection("courses").get();
      const batch2 = fbDb.batch();
      let count2 = 0;
      coursesSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.schoolId) return; // already classified — never overwrite
        outer: for (const s of SCHOOL_LIST) {
          const deptMap = SCHOOL_CATALOG[s];
          for (const dep of Object.keys(deptMap)) {
            for (const lvl of Object.keys(deptMap[dep])) {
              if ((deptMap[dep][lvl] || []).includes(doc.id)) {
                batch2.set(doc.ref, {
                  schoolId: schoolIdByName[s] || null,
                  departmentId: deptIdByName[dep] || null,
                  levelId: levelIdByNumber[lvl] || null,
                }, { merge: true });
                count2++;
                break outer;
              }
            }
          }
        }
      });
      if (count2 > 0) await batch2.commit();
    } catch (backfillErr) {
      EduSphere.Logger.error("[EduSphere] Course classification backfill failed:", backfillErr);
    }
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] Academic structure migration failed:", err);
    __academicMigrationRan = false; // allow a retry on the next screen open
  }
}

/* Live hooks — one per entity, same shape as useLiveCourses: subscribe in real time,
   fall back to an empty array (never undefined) before Firestore responds. Every
   Academic Management screen and every dropdown elsewhere in the app should use
   these instead of reading SCHOOL_CATALOG, so an admin edit appears everywhere
   instantly with no refresh. */
function useLiveAcademicCollection(collectionName) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubscribe = fbDb.collection(collectionName).orderBy("displayOrder", "asc").onSnapshot(
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => EduSphere.Logger.error(`[EduSphere] Live ${collectionName} listener failed:`, err)
    );
    return () => unsubscribe();
  }, [collectionName]);
  return items;
}
function useLiveUniversities() { return useLiveAcademicCollection(ACADEMIC_COLLECTIONS.universities); }
function useLiveSchools() { return useLiveAcademicCollection(ACADEMIC_COLLECTIONS.schools); }
function useLiveDepartments() { return useLiveAcademicCollection(ACADEMIC_COLLECTIONS.departments); }
function useLiveLevels() { return useLiveAcademicCollection(ACADEMIC_COLLECTIONS.levels); }
function useLiveSemesters() { return useLiveAcademicCollection(ACADEMIC_COLLECTIONS.semesters); }

/* Convenience: full academic tree in one hook, for screens (Course form, Onboarding)
   that need several levels of the hierarchy at once. */
function useAcademicStructure() {
  const universities = useLiveUniversities();
  const schools = useLiveSchools();
  const departments = useLiveDepartments();
  const levels = useLiveLevels();
  const semesters = useLiveSemesters();
  useEffect(() => { migrateLegacyAcademicStructureIfNeeded(); }, []);
  const schoolsForUniversity = useCallback((uniId) => schools.filter((s) => !uniId || s.universityId === uniId), [schools]);
  const departmentsForSchool = useCallback((schoolId) => departments.filter((d) => !schoolId || d.schoolId === schoolId), [departments]);
  const nameById = useCallback((list, id) => (list.find((x) => x.id === id) || {}).name || "", []);
  return { universities, schools, departments, levels, semesters, schoolsForUniversity, departmentsForSchool, nameById };
}

/* Prevents orphan records: returns a human-readable reason a delete should be blocked,
   or null if it's safe to delete. Checked before every delete in the Academic
   Management screens. */
async function academicDeletionBlocker(kind, id) {
  try {
    if (kind === "university") {
      const s = await fbDb.collection(ACADEMIC_COLLECTIONS.schools).where("universityId", "==", id).limit(1).get();
      if (!s.empty) return "This university still has schools assigned to it.";
    }
    if (kind === "school") {
      const d = await fbDb.collection(ACADEMIC_COLLECTIONS.departments).where("schoolId", "==", id).limit(1).get();
      if (!d.empty) return "This school still has departments assigned to it.";
      const c = await fbDb.collection("courses").where("schoolId", "==", id).limit(1).get();
      if (!c.empty) return "This school still has courses assigned to it.";
    }
    if (kind === "department") {
      const c = await fbDb.collection("courses").where("departmentId", "==", id).limit(1).get();
      if (!c.empty) return "This department still has courses assigned to it.";
    }
    if (kind === "level") {
      const c = await fbDb.collection("courses").where("levelId", "==", id).limit(1).get();
      if (!c.empty) return "This level still has courses assigned to it.";
    }
    if (kind === "semester") {
      const c = await fbDb.collection("courses").where("semesterId", "==", id).limit(1).get();
      if (!c.empty) return "This semester still has courses assigned to it.";
    }
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] Deletion check failed:", err);
    return "Couldn't verify it's safe to delete — try again.";
  }
  return null;
}

/* ----------------------------- LIVE COURSES (single source of truth) -----------------------------
   Every screen that lists or looks up courses should call this hook instead of reading the
   static COURSES array directly. It subscribes to the Firestore "courses" collection in real
   time, so anything the Admin does in Courses Manager (add/edit/delete/publish) appears
   everywhere in the app instantly, with no refresh. The static COURSES array is now only a
   fallback (used before Firestore responds, or if the collection is ever empty/unreachable),
   never the primary source. */
function useLiveCourses() {
  const [courses, setCourses] = useState(COURSES);
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubscribe = fbDb.collection("courses").orderBy("code", "asc").onSnapshot(
      (snap) => {
        if (snap.empty) { setCourses(COURSES); return; }
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => { EduSphere.Logger.error("[EduSphere] Live courses listener failed:", err); }
    );
    return () => unsubscribe();
  }, []);
  return courses;
}

/* ----------------------------- LIVE QUESTIONS (single source of truth) -----------------------------
   Practice Mode, Mock Exams, Flashcards, and the CBT Engine all pull questions through this hook
   instead of any hardcoded array. It subscribes to the Firestore "questions" collection in real
   time, filtered by course, so a question added, edited, deleted, or bulk-imported anywhere in the
   Admin Question Bank appears in every quiz screen instantly — no refresh, no redeploy.

   Offline behavior: Firestore's own IndexedDB persistence (enabled once at startup — see
   enablePersistence() above) keeps this onSnapshot listener fed from the local cache when the
   network is down, and lets Admin writes queue and sync once back online. On top of that, the
   last successful snapshot for each course is also mirrored into localStorage, so the very first
   paint (even before Firestore responds) can show real, previously-seen questions instead of
   nothing. Nothing here ever falls back to a hardcoded question array. */
function normalizeDifficulty(d) {
  const s = (d || "").toString().trim().toLowerCase();
  if (s === "easy") return "Easy";
  if (s === "hard") return "Hard";
  return "Medium";
}

/* ----------------------------- QUESTION TYPES -----------------------------
   EduSphere supports six question types. Every question, regardless of type,
   is still stored in the same Firestore "questions" collection and flows
   through the same normalizeQuestionDoc() below — the type just changes which
   fields are meaningful and how the CBT Engine renders/grades it.

     mcq          Multiple Choice     - options[], answer = correct index
     trueFalse    True / False        - options = ["True","False"], answer = 0|1
     shortAnswer  Short Answer        - acceptableAnswers[], free-text match
     fillBlank    Fill in the Blank   - same matching as shortAnswer, rendered
                                        as an inline input; question text
                                        conventionally contains "____"
     multiSelect  Multiple Select     - options[], answer = array of correct
                                        indices, checkboxes, exact-set scoring
     essay        Essay               - free text, no auto-scoring; an Admin
                                        grades it manually after submission

   Legacy documents (written before this feature existed) have no `type`
   field at all — they're always treated as "mcq", which is exactly how they
   already behaved, so nothing about them changes. */
const QUESTION_TYPES = ["mcq", "trueFalse", "shortAnswer", "fillBlank", "multiSelect", "essay"];
const QUESTION_TYPE_LABELS = {
  mcq: "Multiple Choice", trueFalse: "True / False", shortAnswer: "Short Answer",
  fillBlank: "Fill in the Blank", multiSelect: "Multiple Select", essay: "Essay",
};
const AUTO_GRADED_TYPES = ["mcq", "trueFalse", "shortAnswer", "fillBlank", "multiSelect"];

/* Used by Bulk Import (and by normalizeQuestionDoc for any doc missing an
   explicit `type`) to detect a question's type from its shape alone, so
   older JSON exports — which never had a `type` field — keep importing
   and working exactly as MCQs. */
function inferQuestionType(doc) {
  if (doc.type && QUESTION_TYPES.includes(doc.type)) return doc.type;
  const opts = doc.options || doc.o;
  if (Array.isArray(opts) && opts.length) {
    const norm = opts.map((o) => (o || "").toString().trim().toLowerCase());
    if (opts.length === 2 && norm.includes("true") && norm.includes("false")) return "trueFalse";
    if (Array.isArray(doc.answer) || Array.isArray(doc.a)) return "multiSelect";
    return "mcq";
  }
  const text = (doc.question || doc.q || "");
  const looksLikeBlank = /_{2,}/.test(text);
  if (Array.isArray(doc.acceptableAnswers) && doc.acceptableAnswers.length) {
    return looksLikeBlank ? "fillBlank" : "shortAnswer";
  }
  if (doc.answer !== undefined || doc.a !== undefined) {
    return looksLikeBlank ? "fillBlank" : "shortAnswer";
  }
  return "essay"; // no options and no answer at all => free-response essay
}

/* NFC-normalizes then strips combining diacritical marks — used only as a
   last-resort, lenient fallback comparison for typed answers (helps with
   e.g. French/Spanish accents typed without their accent marks). German
   umlauts/ß are handled separately below since they're meaningful letters,
   not accents, and shouldn't be silently stripped by default. */
function foldDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normalizeAnswerText(s, { ignoreSpaces = true, caseSensitive = false } = {}) {
  let out = (s === undefined || s === null ? "" : String(s)).normalize("NFC");
  if (ignoreSpaces) out = out.trim().replace(/\s+/g, " ");
  if (!caseSensitive) out = out.toLowerCase();
  return out;
}
/* Short Answer / Fill in the Blank matching. Case and extra-space handling
   are controlled per-question (case-insensitive + space-tolerant by
   default). Checks the full acceptableAnswers list so multiple correct
   spellings ("Guten Morgen" / "guten morgen" / "GUTEN MORGEN") all pass,
   fully Unicode-aware so German ä/ö/ü/ß compare correctly. */
function isTextAnswerCorrect(userInput, question) {
  const candidates = (question.acceptableAnswers && question.acceptableAnswers.length)
    ? question.acceptableAnswers
    : [question.answer];
  const opts = { caseSensitive: !!question.caseSensitive, ignoreSpaces: question.ignoreSpaces !== false };
  const userNorm = normalizeAnswerText(userInput, opts);
  if (!userNorm) return false;
  return candidates.some((c) => {
    const cNorm = normalizeAnswerText(c, opts);
    if (!cNorm) return false;
    if (userNorm === cNorm) return true;
    if (userNorm.replace(/ß/g, "ss") === cNorm.replace(/ß/g, "ss")) return true; // ß/ss leniency
    if (foldDiacritics(userNorm) === foldDiacritics(cNorm)) return true; // accent-insensitive fallback
    return false;
  });
}
function sameOptionSet(a, b) {
  const A = new Set((a || []).map(String));
  const B = new Set((b || []).map(String));
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}
/* True if the learner has put anything into this question at all — used for
   the "answered / not answered" indicators and progress counts, which need
   to understand strings and arrays as well as the original MCQ index. */
function isQuestionAnswered(q, val) {
  if (val === undefined || val === null) return false;
  if (q.type === "multiSelect") return Array.isArray(val) && val.length > 0;
  if (q.type === "shortAnswer" || q.type === "fillBlank" || q.type === "essay") return String(val).trim().length > 0;
  return true; // mcq / trueFalse: any selected index counts
}
/* The single grading entry point every screen (CBT Engine, results,
   analytics) should use instead of re-implementing `answer === q.a`.
   Returns { status: "correct" | "wrong" | "skipped" | "ungraded", auto }. */
function gradeQuestion(q, val) {
  if (!isQuestionAnswered(q, val)) return { status: "skipped", auto: true };
  if (q.type === "essay") return { status: "ungraded", auto: false };
  if (q.type === "multiSelect") return { status: sameOptionSet(val, q.answer) ? "correct" : "wrong", auto: true };
  if (q.type === "shortAnswer" || q.type === "fillBlank") return { status: isTextAnswerCorrect(val, q) ? "correct" : "wrong", auto: true };
  return { status: val === q.answer ? "correct" : "wrong", auto: true }; // mcq / trueFalse
}

/* The one place every question document — however it arrived (legacy MCQ,
   new-schema doc, or a Bulk Import row) — gets turned into a single
   consistent in-memory shape. It exposes BOTH the original short field names
   (q, o, a, e, ref) that all the existing MCQ rendering/scoring code already
   depends on, AND the new full-schema names (type, question, options,
   answer, acceptableAnswers, explanation, school, department, level,
   semester, tags, points, reference). Nothing downstream has to guess which
   naming convention a document used. */
/* True/False answers may arrive as 0/1 (matching options ["True","False"]),
   or — especially from hand-written Bulk Import JSON — as a boolean or the
   strings "true"/"false". Normalizes all of those to the 0/1 index form used
   internally (0 = True, 1 = False). */
function normalizeTrueFalseAnswer(answer) {
  if (typeof answer === "boolean") return answer ? 0 : 1;
  if (typeof answer === "string") {
    if (/^true$/i.test(answer.trim())) return 0;
    if (/^false$/i.test(answer.trim())) return 1;
  }
  return answer;
}
function normalizeQuestionDoc(doc) {
  const type = inferQuestionType(doc);
  const question = doc.question || doc.q || "";
  let options = doc.options || doc.o || [];
  if (type === "trueFalse" && (!Array.isArray(options) || options.length !== 2)) options = ["True", "False"];
  let answer = doc.answer !== undefined ? doc.answer : doc.a;
  if (type === "trueFalse") answer = normalizeTrueFalseAnswer(answer);
  if (type === "multiSelect") {
    answer = Array.isArray(answer) ? answer : (answer !== undefined && answer !== null ? [answer] : []);
  }
  let acceptableAnswers = Array.isArray(doc.acceptableAnswers)
    ? doc.acceptableAnswers.filter((x) => x !== undefined && x !== null && String(x).trim() !== "")
    : [];
  if ((type === "shortAnswer" || type === "fillBlank") && acceptableAnswers.length === 0 && answer !== undefined && answer !== null && String(answer).trim() !== "") {
    acceptableAnswers = [String(answer)];
  }
  const explanation = doc.explanation || doc.e || "";
  const reference = doc.reference || doc.ref || "";
  return {
    ...doc,
    type,
    q: question, question,
    o: options, options,
    a: answer, answer,
    acceptableAnswers,
    caseSensitive: !!doc.caseSensitive,
    ignoreSpaces: doc.ignoreSpaces !== false,
    e: explanation, explanation,
    ref: reference, reference,
    week: (doc.week === undefined || doc.week === null || doc.week === "") ? "Unassigned" : doc.week,
    topic: doc.topic || "General",
    difficulty: normalizeDifficulty(doc.difficulty),
    school: doc.school || "", department: doc.department || "", level: doc.level || "", semester: doc.semester || "",
    tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? String(doc.tags).split(",").map((s) => s.trim()).filter(Boolean) : []),
    points: typeof doc.points === "number" && doc.points > 0 ? doc.points : 1,
  };
}
function questionCacheKey(code) { return "futalearn_qcache_" + code; }
function loadQuestionCache(code) {
  if (!code) return [];
  try {
    const raw = localStorage.getItem(questionCacheKey(code));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveQuestionCache(code, list) {
  if (!code) return;
  try { localStorage.setItem(questionCacheKey(code), JSON.stringify(list)); } catch {}
}

/* Subscribes to Firestore questions for one course. Returns { questions, loading, error }. Pass
   `null` for code to skip subscribing (useful when a caller already has the pool from elsewhere
   and just wants a fallback listener on standby). */
function useLiveQuestions(code) {
  const [state, setState] = useState(() => ({
    questions: loadQuestionCache(code).map(normalizeQuestionDoc),
    loading: !!code,
    error: null,
  }));

  useEffect(() => {
    setState({ questions: loadQuestionCache(code).map(normalizeQuestionDoc), loading: !!code, error: null });
    if (!fbDb || !code) return undefined;
    const unsubscribe = fbDb.collection("questions").where("courseCode", "==", code).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        saveQuestionCache(code, list);
        setState({ questions: list.map(normalizeQuestionDoc), loading: false, error: null });
      },
      (err) => {
        EduSphere.Logger.error("[EduSphere] Live questions listener failed:", err);
        setState((s) => ({ ...s, loading: false, error: err.message || "Couldn't load questions." }));
      }
    );
    return () => unsubscribe();
  }, [code]);

  return state;
}

/* Builds the week/topic filter options directly from whatever questions actually exist for a
   course right now — no static per-course week list. Sorts "Week 1", "Week 2", ... "Week 10"
   numerically when weeks follow that pattern, and falls back to alphabetical order otherwise. */
function buildWeekOptionsFromQuestions(questions) {
  const map = new Map(); // week label -> { count, topics: Set }
  questions.forEach((q) => {
    const wk = q.week || "Unassigned";
    if (!map.has(wk)) map.set(wk, { count: 0, topics: new Set() });
    const entry = map.get(wk);
    entry.count += 1;
    if (q.topic) entry.topics.add(q.topic);
  });
  const weeks = Array.from(map.keys());
  weeks.sort((a, b) => {
    const na = parseInt(String(a).match(/\d+/), 10);
    const nb = parseInt(String(b).match(/\d+/), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    if (!isNaN(na) && isNaN(nb)) return -1;
    if (isNaN(na) && !isNaN(nb)) return 1;
    return String(a).localeCompare(String(b));
  });
  return weeks.map((wk) => {
    const entry = map.get(wk);
    const topics = Array.from(entry.topics);
    const title = topics.length === 0 ? "General" : topics.length === 1 ? topics[0] : `${topics.length} topics`;
    return { value: wk, label: wk, title, count: entry.count };
  });
}

/* ----------------------------- CSC102 NOTES (by week) ----------------------------- */
const CSC102_NOTES = [
  { week: "Week 1", title: "Foundations of Problem Solving", points: [
    "Data = raw facts with no built-in meaning. Information = data that has been processed to be meaningful.",
    "Algorithm = a finite sequence of clear, unambiguous steps that solves a problem. Program = an algorithm written in a language a computer can execute.",
    "A problem has an initial state, a goal state, and obstacles/constraints.",
    "Problems are identified through observation of symptoms, needs analysis, or opportunities.",
    "A good problem statement includes current state, measurable goal, constraints, and stakeholders.",
    "Routine (well-defined) problems have an algorithmic solution; non-routine (ill-defined) problems need heuristics and creativity.",
    "Pólya's 4 steps: Understand → Devise a Plan → Carry Out the Plan → Look Back.",
  ]},
  { week: "Week 2", title: "Solvability and the Nature of Solutions", points: [
    "Solvable (decidable): an algorithm exists that always halts with the correct output. Unsolvable (undecidable): no such algorithm exists for every instance.",
    "Tractable = polynomial running time (feasible). Intractable = super-polynomial time (infeasible for large inputs).",
    "Heuristic = an experience-based shortcut that gives a good, not guaranteed optimal, solution quickly.",
    "Church–Turing thesis: any mechanical computation can be simulated by a Turing machine.",
    "The Halting Problem is undecidable in general.",
    "P = solvable in polynomial time; NP = solutions verifiable in polynomial time.",
    "5 properties of an algorithm: Finiteness, Definiteness, Input, Output, Effectiveness.",
  ]},
  { week: "Week 3", title: "Decomposition and Abstraction", points: [
    "Abstraction removes irrelevant details, keeping only what matters.",
    "Decomposition breaks a complex problem into smaller subproblems.",
    "Analogy solves a new problem by mapping it to a previously solved one — watch out for false analogy.",
    "Brainstorming: aim for quantity, withhold criticism, welcome wild ideas, combine/improve ideas.",
    "Trial and error: attempt, observe, learn, iterate.",
    "Hypothesis testing: form a testable conjecture, test it, accept/reject/refine.",
    "Reduction: transform a problem into a known problem, solve that, map the solution back.",
  ]},
  { week: "Week 4", title: "Pattern Recognition and Generalization", points: [
    "Pattern recognition = identifying recurring structures or similarities.",
    "Generalization = extending a specific solution to a broader class of problems.",
    "Inductive reasoning: specific → general (bottom-up). Deductive reasoning: general → specific (top-down).",
    "Generalization in software: functions with parameters, OOP classes, APIs.",
  ]},
  { week: "Week 5", title: "The Problem-Solving Cycle and Algorithms", points: [
    "The problem-solving cycle (understand, design, implement, evaluate) is iterative, not linear.",
    "Pseudocode bridges human thought and programming syntax. Flowcharts visualize an algorithm.",
    "Efficiency is measured by time (speed) and space (memory).",
    "Top-down design starts from the overall goal and breaks it down. Bottom-up builds small reusable pieces first.",
  ]},
  { week: "Week 6", title: "Introduction to Pseudocode", points: [
    "Pseudocode is informal with no strict syntax, but follows structural conventions.",
    "A variable is a named storage location; assignment stores a value in it.",
    "Standard constructs: Sequence, Selection (IF-THEN-ELSE), Iteration (WHILE/FOR/REPEAT-UNTIL).",
    "Best practice: descriptive names, indentation, simple statements.",
  ]},
  { week: "Week 7", title: "Flowcharts and Visual Logic", points: [
    "Oval/Pill = Start/End. Parallelogram = Input/Output. Rectangle = Process. Diamond = Decision. Arrows = flow of control.",
    "Advantage: easy to communicate logic visually and spot flaws early.",
    "Disadvantage: becomes unwieldy for large algorithms and is hard to modify.",
  ]},
  { week: "Week 8", title: "Control Structures — Selection", points: [
    "A control structure chooses a direction based on a condition.",
    "A condition is a Boolean expression (True/False).",
    "IF-THEN runs code only if true. IF-THEN-ELSE runs one of two blocks. Nested IFs test multiple conditions.",
    "Relational operators: ==, !=, >, <, >=, <=. Logical operators: AND, OR, NOT.",
  ]},
  { week: "Week 9", title: "Control Structures — Iteration", points: [
    "Iteration repeats code while a condition holds or for a set number of times.",
    "WHILE is a pre-test loop (may run zero times). REPEAT-UNTIL/DO-WHILE is a post-test loop (runs at least once).",
    "FOR loop is count-controlled — used when the number of iterations is known.",
    "Loop control variables must be initialized, tested, and updated — or you get an infinite loop.",
  ]},
  { week: "Week 10", title: "Data Representation and Structures", points: [
    "A data type classifies a value (Integer, Float, String, Boolean) and tells the computer how much memory to use and what operations are valid.",
    "An array stores items at contiguous memory locations, usually zero-indexed.",
    "A record/struct groups related variables of different types under one name.",
  ]},
  { week: "Week 11", title: "Testing, Debugging, and Optimization", points: [
    "Testing finds errors; debugging finds and fixes the root cause.",
    "Syntax error = grammar violation. Logical error = wrong output from flawed logic. Runtime error = crash during execution.",
    "Test with normal, boundary/extreme, and erroneous data.",
    "Trace tables (desk checking) track variable values step-by-step.",
    "Optimization can trade time for space or readability — but correctness always comes first.",
  ]},
  { week: "Week 12", title: "Computer Fundamentals (2016/2017 Past Exam Bank)", points: [
    "This section is a large bank of past CSC102 computer-based exam questions covering computer fundamentals.",
    "Topics include: computer generations & hardware, number systems (binary/octal/hex conversions), CPU architecture, memory types, input/output devices, software classification, databases, and Visual Basic / VBA / VB.NET programming basics.",
    "Use this bank for broad revision alongside the core problem-solving notes above.",
  ]},
];
/* ----------------------------- CSC102 QUESTION BANK (raw) ----------------------------- */
const CSC102_QUESTIONS_RAW = [
  { q: "What is 'Data' in the context of computing?", o: ["A processed, meaningful result", "Raw facts or symbols with no built-in meaning", "A finite sequence of steps", "A named storage location"], a: 1, e: "Data is raw facts/symbols with no built-in meaning; once processed it becomes information." },
  { q: "Which best defines 'Information'?", o: ["Unprocessed raw symbols", "Data that has been processed or organised to be meaningful", "A program written in machine code", "A loop that never terminates"], a: 1, e: "Information is data that has been organised/processed to carry meaning." },
  { q: "An algorithm is best described as:", o: ["Any computer program", "A finite sequence of clear, unambiguous steps that solves a specific problem", "A diagram of a system", "A random guess at a solution"], a: 1, e: "An algorithm is a finite, unambiguous sequence of steps — think of it like a recipe." },
  { q: "A 'program' is:", o: ["An algorithm written in a language a computer can execute", "A flowchart symbol", "A type of data structure", "A test case"], a: 0, e: "A program is an algorithm implemented in an executable programming language." },
  { q: "In the computing context, a 'problem' is defined by:", o: ["Only a goal state", "An initial state and a desired goal state, with a non-obvious path between them", "Any error message", "A syntax mistake"], a: 1, e: "A problem has a clear initial state, a goal state, and requires deliberate action to bridge them." },
  { q: "Which of these is NOT a component of a problem?", o: ["Initial state", "Goal state", "Obstacles/constraints", "Compiler version"], a: 3, e: "The three components are initial state, goal state, and obstacles/constraints — not compiler version." },
  { q: "Discovering what users truly need (not just what they ask for) is called:", o: ["Requirement elicitation", "Debugging", "Abstraction", "Generalization"], a: 0, e: "Requirement elicitation is about uncovering real underlying needs." },
  { q: "A 'weak' problem statement is best described as one that is:", o: ["Vague, e.g. 'Our registration system is bad'", "Measurable with clear constraints", "Written in pseudocode", "Backed by a trace table"], a: 0, e: "A weak statement lacks specificity — a strong one has measurable goals, context, and constraints." },
  { q: "A routine (well-defined) problem is one where:", o: ["The goal is ambiguous", "All information is given, operators are clear, and an algorithmic solution exists", "Only heuristics can be applied", "No correct answer exists"], a: 1, e: "Routine problems (e.g. sorting, averaging) have clear inputs/operators and an algorithmic solution." },
  { q: "Which is an example of a non-routine (ill-defined) problem?", o: ["Averaging a list of numbers", "Sorting an array", "Designing a user interface", "Computing a sum with Dijkstra's algorithm"], a: 2, e: "UI design is ill-defined — it's ambiguous and needs creativity/iteration, unlike routine algorithmic tasks." },
  { q: "In problem solving, humans primarily contribute:", o: ["Fast repetitive execution", "Creativity, turning ill-defined problems into well-defined subproblems", "Guaranteed correctness", "Memory allocation"], a: 1, e: "Humans provide creativity; computers execute algorithms once a problem is well-defined." },
  { q: "Pólya's four-step process is:", o: ["Code, Compile, Run, Debug", "Understand, Devise a Plan, Carry Out the Plan, Look Back", "Input, Process, Output, Store", "Analyse, Design, Test, Deploy"], a: 1, e: "Pólya's steps: Understand the Problem, Devise a Plan, Carry Out the Plan, Look Back." },
  { q: "The 'Look Back' step in Pólya's process involves:", o: ["Restating the given data", "Choosing a strategy", "Verifying correctness and considering efficiency/improvements", "Writing the first line of code"], a: 2, e: "Look Back = evaluate and reflect: check correctness, efficiency, and lessons learned." },
  { q: "A solvable (decidable) problem is one where:", o: ["No algorithm can ever solve it", "An algorithm exists that produces the correct output and halts for every valid input", "Only approximate answers exist", "It requires exponential time"], a: 1, e: "Decidable problems have an algorithm that always halts correctly." },
  { q: "The Halting Problem demonstrates that:", o: ["All problems are tractable", "It is impossible, in general, to decide whether a program halts on a given input", "Heuristics always find optimal solutions", "P equals NP"], a: 1, e: "The Halting Problem is a classic example of an undecidable problem." },
  { q: "A 'tractable' problem is one solvable in:", o: ["Exponential time", "Factorial time", "Polynomial time relative to input size", "Infinite time"], a: 2, e: "Tractable = polynomial time, e.g. O(n) or O(n log n) — generally feasible." },
  { q: "Which of these running times indicates an intractable problem?", o: ["O(n)", "O(n log n)", "O(n^2)", "O(2^n)"], a: 3, e: "O(2^n) is exponential — this is intractable for large n, unlike the polynomial options." },
  { q: "A heuristic is best described as:", o: ["A guaranteed optimal algorithm", "An experience-based shortcut that finds good (not guaranteed optimal) solutions quickly", "A syntax rule", "A type of data structure"], a: 1, e: "Heuristics trade guaranteed optimality for speed and practicality." },
  { q: "The Church–Turing thesis states that:", o: ["Every problem is solvable in polynomial time", "Any computation that can be performed mechanically can be simulated by a Turing machine", "NP problems cannot be verified", "All algorithms must be recursive"], a: 1, e: "This is the foundational thesis linking mechanical computation to Turing machines." },
  { q: "In complexity theory, NP is the class of problems where:", o: ["No solution can ever be verified", "Proposed solutions can be verified in polynomial time", "Solutions take infinite time to check", "Only linear algorithms apply"], a: 1, e: "NP = solutions can be VERIFIED in polynomial time (not necessarily solved that fast)." },
  { q: "Which is NOT one of the five essential properties of an algorithm?", o: ["Finiteness", "Definiteness", "Popularity", "Effectiveness"], a: 2, e: "The five properties are Finiteness, Definiteness, Input, Output, and Effectiveness — not popularity." },
  { q: "'Effectiveness' as a property of an algorithm means:", o: ["It runs on the fastest hardware", "Each step is basic enough to be carried out, in principle, with pencil-and-paper", "It never produces output", "It has unlimited steps"], a: 1, e: "Effectiveness means each step is simple/basic enough to be performed manually in principle." },
  { q: "Abstraction in problem solving means:", o: ["Adding as much detail as possible", "Removing irrelevant details to produce a simplified model", "Writing the final program", "Testing with boundary data"], a: 1, e: "Abstraction strips away what doesn't matter, keeping only the essentials for solving the problem." },
  { q: "Decomposition is the process of:", o: ["Combining two solved problems into one", "Breaking a complex problem into smaller, manageable subproblems", "Guessing an answer at random", "Removing all constraints from a problem"], a: 1, e: "Decomposition reduces complexity by splitting a problem into smaller parts." },
  { q: "A 'false analogy' occurs when:", o: ["Two problems share a deep structural similarity", "Two problems appear similar on the surface but don't share the same causal/structural relations", "A hypothesis is properly tested", "An algorithm has all five essential properties"], a: 1, e: "False analogy = superficial similarity without matching underlying structure, which can mislead problem solving." },
  { q: "Which is one of the four core rules of brainstorming?", o: ["Criticise ideas immediately", "Aim for quantity", "Only consider realistic ideas", "Work individually, never combine ideas"], a: 1, e: "The four rules: aim for quantity, withhold criticism, welcome wild ideas, and combine/improve ideas." },
  { q: "'Reduction' as a problem-solving technique means:", o: ["Making a problem statement shorter", "Transforming a problem into a known problem, solving that, then mapping the solution back", "Removing all variables from an algorithm", "Testing with fewer test cases"], a: 1, e: "Reduction maps an unfamiliar problem onto a problem you already know how to solve." },
  { q: "Pattern recognition is best defined as:", o: ["Writing a program from scratch", "Identifying similarities, trends, or recurring structures within data or processes", "Verifying an algorithm halts", "Choosing a data type"], a: 1, e: "Pattern recognition finds recurring structures — a foundation for generalization." },
  { q: "Inductive reasoning works by:", o: ["Applying general rules to specific cases (top-down)", "Deriving general principles from specific observations (bottom-up)", "Ignoring all observed data", "Only using deductive logic"], a: 1, e: "Inductive reasoning is bottom-up: from specific observations to general principles." },
  { q: "Deductive reasoning works by:", o: ["Applying general rules to specific cases (top-down)", "Deriving general rules from many specific cases", "Random trial and error", "Pattern recognition only"], a: 0, e: "Deductive reasoning is top-down: general rule applied to a specific case." },
  { q: "In software, 'generalization' is exemplified by:", o: ["Hardcoding a single value into a function", "Writing functions with parameters instead of hardcoded values", "Removing all comments from code", "Deleting unused variables"], a: 1, e: "Using parameters instead of hardcoded values lets one function serve many cases — that's generalization." },
  { q: "Pseudocode is best described as:", o: ["A compiled machine language", "A plain-language description of algorithm steps bridging human thought and code", "A diagram using standard shapes", "A type of runtime error"], a: 1, e: "Pseudocode has no strict syntax but conveys algorithm logic in a structured, readable way." },
  { q: "In a flowchart, a diamond shape represents:", o: ["Start/End", "Input/Output", "A decision (condition to evaluate)", "A process/calculation"], a: 2, e: "The diamond symbol represents a decision point with Yes/No branches." },
  { q: "In a flowchart, an oval/pill shape represents:", o: ["Process/Action", "Start/End (Terminal)", "Decision", "Input/Output"], a: 1, e: "The oval (terminal) symbol marks the Start or End of a flowchart." },
  { q: "A disadvantage of flowcharts is that they:", o: ["Cannot show decisions", "Can become unwieldy and hard to modify for large algorithms", "Cannot be understood by non-programmers", "Always run faster than pseudocode"], a: 1, e: "Flowcharts are great for small logic but get complex and hard to update for large algorithms." },
  { q: "An IF-THEN-ELSE structure is used to:", o: ["Repeat a block of code indefinitely", "Execute one block if a condition is true, and a different block if false", "Store a value in a variable", "Declare a data type"], a: 1, e: "IF-THEN-ELSE branches between two blocks based on a condition." },
  { q: "Which of these is a relational operator?", o: ["AND", "OR", "NOT", ">="], a: 3, e: ">= is a relational operator; AND/OR/NOT are logical operators." },
  { q: "Which of these is a logical operator?", o: ["==", "!=", "AND", "<="], a: 2, e: "AND is a logical operator used to combine multiple conditions." },
  { q: "A WHILE loop is best described as:", o: ["A post-test loop that always runs at least once", "A pre-test loop where the condition is checked before the body executes", "A loop with a fixed number of iterations only", "A loop that cannot use a counter"], a: 1, e: "WHILE checks its condition first, so it may execute zero times." },
  { q: "A REPEAT-UNTIL (or DO-WHILE) loop:", o: ["Checks the condition before running the body", "Checks the condition after running the body, so it always executes at least once", "Can never terminate", "Is the same as a FOR loop"], a: 1, e: "REPEAT-UNTIL is a post-test loop — the body runs at least once before the condition is checked." },
  { q: "A FOR loop is best used when:", o: ["The number of iterations is unknown", "The number of iterations is known beforehand", "You need a decision, not a loop", "You are declaring a record"], a: 1, e: "FOR loops are count-controlled, ideal when the number of repetitions is known in advance." },
  { q: "An 'infinite loop' typically results from:", o: ["A loop control variable that is properly initialized, tested and updated", "A condition that never becomes false", "Using a FOR loop with a fixed range", "Correct use of relational operators"], a: 1, e: "If the loop's condition never turns false, the loop never terminates — an infinite loop." },
  { q: "An array is best described as:", o: ["A composite type grouping different data types under one name", "A collection of items stored at contiguous memory locations, accessed by index", "A single named storage location for one value", "A diagram symbol"], a: 1, e: "Arrays store multiple items of (usually) the same type in contiguous memory, indexed for access." },
  { q: "A record/struct is used to:", o: ["Store a single integer only", "Group related variables of different types under one name", "Repeat a block of code", "Represent a decision in a flowchart"], a: 1, e: "A record/struct groups related fields of different types, e.g. Name (String), Age (Integer), GPA (Float)." },
  { q: "Arrays are typically indexed starting from:", o: ["1", "0", "-1", "100"], a: 1, e: "Most arrays are zero-indexed — the first element is at index 0." },
  { q: "A syntax error is:", o: ["A crash caused by dividing by zero", "A violation of the programming language's grammar rules", "Correct output from flawed logic", "A memory optimization issue"], a: 1, e: "Syntax errors violate language grammar and are typically caught by the compiler/interpreter." },
  { q: "A logical error occurs when:", o: ["The program crashes immediately", "The program runs but produces incorrect output due to flawed logic", "The compiler rejects the code", "The file cannot be found"], a: 1, e: "Logical errors let the program run, but the output is wrong because the logic itself is flawed." },
  { q: "A runtime error is best exemplified by:", o: ["A missing semicolon", "Dividing by zero during execution, causing a crash", "A variable naming convention", "An unused import statement"], a: 1, e: "Runtime errors occur during execution — e.g. division by zero or a missing file." },
  { q: "'Boundary/extreme data' in testing refers to:", o: ["Typical, expected inputs", "Inputs at the edges of acceptable ranges", "Invalid inputs used to test error handling", "Data that is never tested"], a: 1, e: "Boundary data tests the edges of valid input ranges, e.g. minimum and maximum allowed values." },
  { q: "A trace table (desk checking) is used to:", o: ["Compile a program automatically", "Manually track variable values step-by-step as an algorithm executes", "Draw flowchart symbols", "Generate random test data"], a: 1, e: "Trace tables let you manually verify logic by tracking how variables change at each step." },
  { q: "In optimization, the 'time-space tradeoff' means:", o: ["Correctness is less important than speed", "Making code run faster may require using more memory, or vice versa", "All optimized code is easier to read", "Optimization always reduces both time and memory"], a: 1, e: "You often gain speed at the cost of memory (or vice versa) — but correctness must always come first." },
];/* ----------------------------- CSC102 PAST QUESTIONS (2016/2017 Computer-Based Exam, Computer Fundamentals) ----------------------------- */
const CSC102_PASTQ_RAW = [
  { q: "The basic or major operation performed by a computer is", o: ["Arithmetic operation", "Logical operation", "Storage and retrieval", "All the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The two major types of computer chips are", o: ["Internal and external memory chips", "Primary memory and microprocessor chips", "Primary and Secondary memory chips", "Silicon and integrated circuits"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the main difference between a mainframe and a super computer?", o: ["Super computer is much larger than mainframe computers", "Super computers are much smaller than mainframe computers", "Supercomputers are focused to execute few programs as fast as possible while mainframe uses its power to execute as many programs concurrently", "Supercomputers are focused to execute as many programs as possible while mainframe uses its power to execute few programs as fast as possible."], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What are the stages in the compilation process?", o: ["Feasibility study, system design and testing", "Implementation and documentation", "Lexical Analysis, syntax analysis, and code generation", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "One millisecond is", o: ["1 second", "10th of a seconds", "1000th of a second", "10000th of a seconds"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Abacus was the first", o: ["electronic computer", "mechanical computer", "electronic calculator", "mechanical calculator"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following can be regarded as a problem oriented language?", o: ["High level language", "Machine language", "Assembly language", "Low level language"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A nibble equals what?", o: ["1 bits", "2 bits", "4 bits", "8 bits"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer size was very large in", o: ["First Generation", "Second Generation", "Third Generation", "Fourth Generation"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The term GIGO is related to which characteristics of computers?", o: ["Speed", "Automatic", "Accuracy", "Reliability"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "One of the popular mass storage devices is CD ROM. What does CD ROM stand for?", o: ["Compactable Disc Read Only Memory", "Compact Disc Read Only Memory", "Compactable Disk Read Only Memory", "Compact Disk Read Only Memory"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ASCII stands for", o: ["American Standard Code for International Interchange", "American Standard Code for Institutional Interchange", "American Standard Code for Information Interchange", "American Standard Code to Interchange Information"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In analog computer", o: ["Input is first converted to digital form", "Input is never converted to digital form", "Output is displayed in digital form", "All of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following storage devices can store the largest amount of data?", o: ["Hard Disks", "Flash Disks", "Blu-Ray Disks", "DVDs"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The octal equivalence of 111010(base 2) is", o: ["67", "72", "71", "27"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What do you call a single point on a computer screen?", o: ["Coordinate", "Element", "Pixel", "Bit"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Integrated circuits are classified according to the", o: ["number of chips", "number of vacuum tube", "number of gates", "number of transistors"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "How would you represent the decimal value 30 in Hexadecimal form?", o: ["1E", "30", "1C", "9F"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is NOT a 3rd generation programming language?", o: ["ADA", "Assembly Language", "FORTRAN", "Java"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In a distributed computer system", o: ["there are many computers and terminals", "the task is executed by a number of processors", "the task is distributed throughout the system", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The linking of computers with a communication system is called", o: ["Interconnection", "Networking", "Internet working", "Internetworking"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Distributed data entry means that data can be", o: ["entered at different locations where it originates", "sent to different locations from a central place", "accessed from different places know as distribution points", "distributed through a network"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Memory in which any location can be reached in a fixed (and short) amount of time after specifying its address is called", o: ["sequential-access memory", "random-access memory", "secondary memory", "mass storage"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Stored instructions and data in digital computers consist of", o: ["bytes", "kilobytes", "digits", "bits"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Transistor was invented in", o: ["1945", "1946", "1947", "1948"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "How are data represented in a computer?", o: ["Logical System", "Byte system", "Binary system", "Hexadecimal system"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which statement is NOT a \"special care\" to ensure that data saved on your CD/DVD is preserved?", o: ["Do not expose your CD/DVD to extreme temperature", "Store them in their casing - any scratch makes it difficult to read through the reflective coating", "Clean the CD/DVD with a brush, in an outward direction from the center of the disk, avoiding circular movements, to remove dust", "Do not write on the reflective coating of the CD/DVD and use only recommended marker for any labelling on the label side"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is NOT a feature of a word processor?", o: ["Borders and shading", "Mail Merge and letter assistant", "Macros", "Sending email"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following gives a list of memory in increasing order of speed access?", o: ["RAM, Hard Disk, L1 Cache, L2 Cache", "RAM, Hard Disk, L2 Cache, L1 Cache", "Hard Disk, RAM, L2 Cache, L1 Cache", "L1 Cache, L2 Cache, RAM, Hard Disk"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following describe mainframe computers except", o: ["processing of large amount of data at very high speed", "supports multi-user facility", "number of processors varies from one to six", "designed to be used by only one person at a time"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Users interacted with third generation computers through ______", o: ["peripheral devices", "keyboards and monitors", "mouse and keyboard", "mouse and monitors"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are peripheral devices except", o: ["Keyboard", "pointing devices", "touchscreen", "scanners"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In machine language, elementary operations are the following except:", o: ["data transfer", "data suppression", "data and program control", "arithmetic and logic operations"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In programming, converting high level language into machine language is done by", o: ["drivers", "translators", "service programs", "converters"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not an output device?", o: ["Monitor", "Printer", "Plotter", "Pointer"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is NOT a type of testing?", o: ["Manual Testing with sample data", "Testing sample data on the computer", "Sample Checking", "Testing by a group of users"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is superior in terms of speed?", o: ["secondary memory", "main memory", "tertiary memory", "auxiliary memory"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The fifth generation of computing devices are based on _______", o: ["Expert system and natural language", "Artificial intelligence", "Mathematical modeling", "Simulation and modeling"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "One million bytes represent a", o: ["Megabyte", "Gigabyte", "Kilobyte", "Picobyte"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The errors that can be pointed out by the compiler are", o: ["Semantic errors", "Syntax errors", "Logical errors", "Compilation errors"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A step by step procedure used to solve a problem is called", o: ["Pseudocode", "Application Program", "Algorithm", "Flowcharting"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The translator that converts high-level languages, one statement at a time into machine code, before the program is executed is", o: ["interpreter", "BASIC", "query language", "compiler"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Floating point representation is used to store", o: ["Boolean values", "whole numbers", "real integers", "integers"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ICs stand for what?", o: ["Integrated circuit", "Input consoles", "Integrated circuits", "Internet connections"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following concepts qualifies a programming language as an Object-Oriented Programming Languages (OOPL)", o: ["Encapsulation", "Inheritance", "Polymorphism", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Arrange in order of development", o: ["relays, valves, transistors, integrated circuits", "relays, transistors, valves, integrated circuits", "valves, relays, transistors, integrated circuits", "valves, transistors, relays, integrated circuits"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The number system that we use in our day to day life is called what?", o: ["octal", "binary", "hexadecimal", "decimal"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Terminal is", o: ["a device to give power supply to computer", "a point at which data enters or leaves the computer", "the last instruction in a program", "any input/output device"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Example of non-numerical data is", o: ["Employee address", "Examination score", "Bank balance", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The sum of two hexadecimal numbers 37 and 63 will be:", o: ["A9", "45", "100", "9A"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of these is used for logical operations or comparisons such as less than equal to or greater than?", o: ["Arithmetic and Logic Unit", "Control Unit", "Both of above", "None of above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The basic architecture of computer was developed by", o: ["John Von Neumann", "Charles Babbage", "Blaise Pascal", "Garden Moore"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which is not consisted in a processor?", o: ["ALU", "Control unit", "Memory", "Registers"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "When we look at the cost, which of the following computer is most expensive?", o: ["Mainframe Computer", "Mini Computers", "Micro Computers", "Super Computers"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Pick the one that is used for logical operations or comparisons such as less than equal to or greater than.", o: ["Arithmetic and Logic Unit", "Control Unit", "Both of above", "None of above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following class of computers can process physical quantities such as speed?", o: ["Analog Computers", "Digital Computers", "Hybrid Computers", "None of above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer that process both analog and digital is called", o: ["Analog computer", "Digital computer", "Hybrid computer", "Mainframe computer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The processing speed of first generation computers was", o: ["Milliseconds", "Microseconds", "Nanoseconds", "picoseconds"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is used only for data entry and storage, and never for processing?", o: ["Personal Computer", "Dumb terminal", "Micro Computer", "Laptop Computers"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is input device?", o: ["scanner", "speaker", "monitor", "projector"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "WAN which is an abbreviation in Networking, what is its full meaning?", o: ["WAP Area Network", "Wide Area Network", "Wide Array of Network", "Wireless Access Network"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What does ASCII stand for?", o: ["American Stable Code for International Interchange", "American Standard Case for Institutional Interchange", "American Standard Code for Information Interchange", "American Standard Code for Interchange Information"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of this statement is correct?", o: ["1 KB = 1024 Bytes", "1 MB = 1024 Bytes", "1 KB = 1000 Bytes", "1 MB = 1000 Bytes"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is a feature of fifth generation computers?", o: ["Use of natural language", "artificial intelligence", "bio-chips", "All of above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A song being played on computer speaker is", o: ["hard output", "soft output", "both hard and soft output", "neither hard nor soft output"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Second Generation computers were developed during", o: ["1949 to 1955", "1956 to 1965", "1965 to 1970", "1970 to 1990"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "All modern computer operate on", o: ["Information", "Floppies", "Data", "Word"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a classification of computer based on size?", o: ["Mainframe Computer", "Micro Computer", "Mini Computer", "Digital Computer"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Cursor is a ____", o: ["Pixel", "Thin blinking line", "Pointing device", "None of these"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A kind of serial dot-matrix printer that forms characters with magnetically-charged ink sprayed dots is called", o: ["Laser printer", "Ink-jet printer", "Drum printer", "Chan printer"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following memory medium is not used as main memory system?", o: ["Magnetic core", "Semiconductor", "Magnetic tape", "Both a and b"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The word Abacus is derived from Abax, a word from", o: ["Latin language", "Greek Language", "Sanskrit language", "Ancient Egypt"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A kind of scanner MICR is the short form of", o: ["Magnetic Ink Character Reader", "Magnetic Ink Code Reader", "Magnetic Ink Cases Reader", "None"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A computer Program that translates one program instruction at a time into machine language is called a/an", o: ["Interpreter", "CPU", "Compiler", "Simulator"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Input and output devices such as monitors and keyboards are classified as", o: ["arithmetic units", "control unit devices", "peripheral devices", "main store devices"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following are the cheapest memory devices in terms of Cost/Bit?", o: ["Semiconductor memories", "Magnetic Disks", "Compact Disks", "Magnetic Tapes"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word 'RAM' stands for", o: ["random access memory", "read access memory", "read arithmetic memory", "random arithmetic memory"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Two type of memories 'RAM' and 'ROM' are part of", o: ["backup memory", "main memory", "shorter memory", "long-term memory"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Small computers that are not microcomputers are classified as", o: ["micro computers", "mini computers", "mainframe computers", "mega processors"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "An electronic tool that allows information to be input, processed, and output is ____", o: ["Operating system", "Motherboard", "Computer", "CPU"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is worldwide network of computers", o: ["CPU", "Internet", "RAM", "Network"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The brain of the computer that does calculation, moving and processing of information is ____", o: ["CPU", "RAM", "Motherboard", "Hard drive"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Part of a computer that allows a user to put information into the computer is ____", o: ["Output device", "Software", "Operating system", "Input system"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a small picture that represents a folder, program or other things", o: ["Desktop", "Icon", "Graphic", "Image"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A name for the short term memory of the computer that is lost when the computer is turned off is ____", o: ["CPU", "Hardware", "RAM", "Processor"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a part of the computer that all other parts are connected to which allows all of the parts to communicate so they work together.", o: ["Operating system", "Disk drive", "Output device", "Mother board"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The non-physical part of a computer is called ____", o: ["Hardware", "Hard drive", "Disk drive", "Software"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Parts of a computer that allow the user to see or hear information that comes out from the computer is ____", o: ["Software", "Input device", "Output device", "Operating system"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "This part stores programs and other information on 2 or more disks that are located inside the computer is ____", o: ["Motherboard", "Hard drive", "CPU", "Operating system"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is the part of the computer that reads information from a disk", o: ["Operating system", "Motherboard", "Hard drive", "Disk drive"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A collection of computer programs is ____", o: ["Software", "RAM", "Input Devices", "Hardware"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A program that controls a computer's basic functions is ____", o: ["Hard Drive", "Motherboard", "Operating System", "CPU"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word 'RAM' stands for", o: ["random access memory", "read access memory", "read arithmetic memory", "random arithmetic memory"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A teletypewriter terminal is an example of", o: ["input devices", "output devices", "input/output devices", "storage devices"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Devices that accept data from outside computer and transfer into CPU are called", o: ["input devices", "digital devices", "analogue devices", "truth table peripheral"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Devices that are used to receive data from central processing unit are classified as", o: ["output/input devices", "digital devices", "signaled device", "output devices"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The component of Microsoft Office suite used for typing and editing of documents is", o: ["Spreadsheets", "Database", "Word Processor", "Desktop Publishing"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the default file extension for all Word documents?", o: ["TXT", "WRD", "FIL", "DOC"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In order to save an existing document with a different name you need to:", o: ["Retype the document and give it a different name", "Use the Save as command", "Copy and paste the original document to a new document and then save", "Use Windows Explorer to copy the document to a different location and then rename it"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which keyboard shortcut bolds selected text?", o: ["Ctrl+B", "Alt+B", "File/Format/Bold", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "How do we create a new document in Word?", o: ["Click on the blank document icon in the upper left hand corner", "Click on the file menu and choose the \"close\" option", "Click on the file menu and choose the \"save\" option", "Click on the X in the upper right hand corner"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A document that has been saved is called a process document", o: ["True", "False", "None of the above", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a correct procedure for printing in Microsoft Office", o: ["File | Print | Ok", "CTRL+X", "File | Print preview | Print", "All of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What would you see while spell checking the phrase \"My father was write\"?", o: ["The word \"write\" is misspelled", "No errors", "The verb of the phrase will be highlighted", "A blue squiggly underline under the word \"write\""], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following professions has not been affected by personal computers?", o: ["Medical", "Clerical and law", "Accounting", "None of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ROM stands for", o: ["Randomized Only Memory", "Data Read Only Memory", "Random Only Memory", "Read Only Memory"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ALU is", o: ["Arithmetic Logic Unit", "Array Logic Unit", "Application Logic Unit", "None of above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "WAN stands for", o: ["Wap Area Network", "Wide Area Network", "Wide Array Net", "Wireless Area Network"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "UNIVAC is", o: ["Universal Automatic Computer", "Universal Array Computer", "Unique Automatic Computer", "Unvalued Automatic Computer"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The first automatic calculating device which could only add and subtract using precise interconnected gears was invented by ____", o: ["Charles Babbage", "Alan Turing", "Augusta Ada", "Blaise Pascal"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In generation history of computers, ____ generation computer are referred to as transistorized computers", o: ["First", "Third", "Fifth", "Second"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are examples of computer that were invented in the first generation of computers except ____", o: ["IBM/370", "Abacus", "Pascaline", "ENIAC"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are the characteristics of first generation computers with the exception of ____", o: ["They have logic circuitries built from vacuum tubes", "They dissipate less heat", "They are too slow in the operation", "They demand for expertise in operating them"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The component of the computer system that drives the physical components to work is referred to as ____", o: ["Operating System", "System Utility", "Driver", "Software"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A special system software that manages both hardware and software resources of the computer system is ____", o: ["System Manager", "Resource Manager", "Operating System", "System Utility"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Input/Output devices of the computer system include the following except ____", o: ["Keyboard", "Plotter", "Comptometer", "Joystick"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Regularly used application software among users of the computer system especially windows-based personal computer include the following except ____", o: ["Microsoft Access", "Windows 7", "Microsoft power point", "Excel"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is an electronic spreadsheet used by accountants and data analyst in calculations and analyzing data.", o: ["Microsoft Access", "Microsoft PowerPoint", "Microsoft Excel", "Word Perfect"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is commonly used to store voluminous data in a persistent mode.", o: ["Random Access Memory", "Read Only Memory", "Hard Disk", "Register"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are menu-driven, almost what-you-see-is-what-you-get word processor except ____", o: ["Word Good", "Word Star", "Word Perfect", "Microsoft Word"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Converting 110011(base 2) to decimal will yield ____", o: ["37", "17", "30", "27"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Multiplying 1001 by 101 and 1101 by 1010 will yield ____.", o: ["101101 and 110000010", "101101 and 110000010", "110010 and 10000010", "101101 and 101000010"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A ____ of data can be conceptually represented as eight consecutive 1s or 0s.", o: ["Nibble", "Word", "Byte", "Binary Digit"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "11111011 can be represented as ____ and ____ in decimal and hexadecimal respectively.", o: ["252 and FB", "251 and FB", "253 and FD", "251 and FC"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "01011010 can be represented as ____ and ____ in decimal and hexadecimal respectively", o: ["90 and 5B", "90 and 5A", "92 and 5B", "91 and 5C"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Converting BE(base 16) to decimal yields ____", o: ["180", "190", "175", "191"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In binary, 11011101 + 100010 will yield ____ process", o: ["11111001", "11110111", "11111111", "11010011"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are example of special purpose computing except ____", o: ["IBM/370", "Petrol pump", "ATM", "POS Machine"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The characteristic of the computer that makes it employable in nearly all fields of life in ____", o: ["Accuracy", "Reliability", "Versatility", "Speed"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a set or arrangement of parts that act together to perform a function", o: ["Computer", "System", "Assembly", "Organization"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ statement causes termination of execution of one iteration of a loop", o: ["Data", "Statistics", "Information", "Binary Digit"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a computer whose operation can be changed by altering its stored programs", o: ["Computer", "Special-purpose computer", "General purpose computer", "Pascaline"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is ready-made application software that enables you to organize numbers and formulas into a rectangular array of cells.", o: ["Spreadsheet", "Organizer", "Photoshop", "Corel Draw"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The smallest unit of information used in computer and communication system is ____", o: ["Code", "Bit", "Data", "Junit"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a combination of thousands of circuits built on tiny pieces of silicon, which are called chips", o: ["Water", "Integrated Circuit", "Microprocessor", "Circuit"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ provides an interconnection for all hardware components of the computer system so as to perform function", o: ["Microprocessor", "Expansion Slot", "Port", "Motherboard"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a device that converts keystrokes into special code that can be electronically manipulated by computer", o: ["Keyboard", "Memory", "Port", "Disk"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not considered to be one of the basic tasks, that a computer is capable of performing?", o: ["Responding to output in a predictable way", "Processing input according to instructions", "Storing instruction and the results of processing", "Providing output in the form of information"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Large-scale general-purpose computers are called ____", o: ["Microcomputer", "Mainframe", "Minicomputers", "Personal computer"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Advance in computer technology have led to ____.", o: ["Low performance in smaller packages", "High performance in smaller package", "High performance at greater expense", "None of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The difference between data and information is that", o: ["Data always contain information", "Data have context, while information may not", "Information has to context while data may not", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual Basic for application is a high level programming language that evolved from the earlier ____ language that also evolved from", o: ["VB.Net and C#", "VB6 and C#", "VB.Net and BASIC", "VB6 and BASIC"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are from control in VBA except ____", o: ["Label", "Command Button", "Picture Box", "Image Box"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The several data types established in Visual Basic include the following except ____", o: ["Boolean", "Double", "Float", "Single"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Consider this do statement: Given the below program segment: Private Sub displayAdd (x As Integer, y As Integer) MsgBox (x+y) * (x-y) X = 3 Y = 10 End Sub Private Sub UserForm_Initialize() Dim a As Integer Dim b As Integer a = 5 b = 2 displayAdd (a,b) End Sub What will be the output of the main module that calls displayAdd(a,b).", o: ["ab", "a+b", "21", "42"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Parameters are data values that can be passed to a subroutine by ____ and ____", o: ["Value and values", "Reference and values", "Reference and addresses", "Variables and constant"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Given the below for-loop: Dim I as Integer For I = 20 to 0 step -2 Range(\"C2\").Offset(I,O) = I, Nest I How many number of iteration will the execution of the statement within the loop be?", o: ["20 times", "11 times", "10 times", "18 times"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In the second generation of Computer", o: ["Transistor Technology replaced Vacuum tubes", "Integrated circuitry system replaced Vacuum tubes", "Mainframe technology replaced Vacuum tubes", "Artificial Intelligence replaced Vacuum tubes"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In the Third generation of computers", o: ["Artificial Intelligence were developed", "Integrated circuits were developed", "Magnetic core memories were developed", "Computer became ubiquitous."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "IBM 360/91 is an example of the:", o: ["First generation computer", "Second generation computer", "Third generation computer", "Fifth generation computer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Computer can be classified based on the following except:", o: ["Signal type", "Purpose", "Capacity", "Durability"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Classification based on signal type include the following except:", o: ["Digital", "Analog", "Super breed", "Hybrid"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are examples of input devices except:", o: ["Keyboard", "Mouse", "Optical scanner", "RAM"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is false:", o: ["Monitor is an output device", "System Unit is the Central Processing Unit (CPU)", "The RAM and ROM are primary memories", "Computer takes, stores and processes data and gives result as output."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "All the electronic components in a PC are mounted on a piece of fiberglass called the ____", o: ["Motherboard", "Motherbord", "MorderBoard", "Majorboard"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A series of coded instructions showing the logical steps the computer follows to solve a given problem is called ____", o: ["Sub", "Program", "Function", "Logic"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a graphical representation of the major steps of a program", o: ["Pseudo code", "Program guide", "Algorithm", "Flowchart"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is false about An Algorithm:", o: ["A finite set or sequence of actions", "This sequence of actions has a unique initial action", "Each action in the sequence has unique successor", "The sequence does not terminate."], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Data is referred to as raw ____", o: ["Device", "facts", "Machine", "Statement"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Another name for information is ____", o: ["Data", "Processed Data", "Guideline orders", "Instruction"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The act of having computers all around us is referred to as ____", o: ["Cloud", "Grid", "Ubiquitous", "Traditional"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In VBA, a group of variables that share a common name, where its variables are referred to by using the name and an index number in parentheses is called ____", o: ["An Array", "A sub", "A Function", "An Index"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ Statement simply transfers program execution to a new statement, which is preceded by a label.", o: ["print", "Go To", "Input", "Divert"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Private Sub CommandButton1_Click() Dim score1 As Integer, score2 As Integer, result As String score1 = Range(\"A1\").Value score2 = Range(\"B1\").Value If score1 >= 60 And score2 > 1 Then result = \"pass\" Else result = \"fail\" End If Range(\"C1\").Value = result End Sub In VBA, the above is an example of using the:", o: ["If---Then---Elseif---Else \"Control\" Statements", "If---Elif---Else \"Control\" Statements", "Output \"Control\" Statements", "Do-Loop \"Control\" Statements"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Private Sub CommandButton1_Click() Dim i As Integer For i = 1 To 15 Step 2 Cells(i, 1).Value = i Next End Sub In VBA, the above is an example of using the:", o: ["If---Then---Elseif---Else \"Control\" Statements", "For---Next \"Control\" Statements", "Nested For---Next \"Control\" Statements", "Output \"Control\" Statements"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a collection of tables or file with related data.", o: ["Database", "Dictionary", "Label", "Store"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In database management, ____ is referred to as a Unique Key.", o: ["Tertiary Key", "Secondary Key", "Primary Key", "Elementary Key"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are features of computer except ____", o: ["Speed", "Accuracy", "Space", "Automatic"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The ability of a computer system to be able to perform any type of task once it can be reduced to logical steps is called ____", o: ["Reliability", "Flexibility", "Complexity", "Rationality"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "First generation of computers uses ____ in form of vacuum tubes, instead of electromechanical relays", o: ["Circuit", "Switches", "Circuit board", "Electronic switches"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The use of program stored in memory to control the order of arithmetic operations, makes ____ to run order of magnitude faster than ____", o: ["First generation computer, third generation computer", "ENIAC, EDVAC", "EDVAC, ENIAC", "Second generation computer, third generation computer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "During the ____ generation, many high level programming language were introduced", o: ["First", "Second", "Third", "Fourth"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "All of the following were innovations used in third generation except", o: ["Integrated circuit", "Semiconductor memories", "Software engineering", "Microprogramming"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ computer measures rather than count", o: ["Digital", "Compute", "Analog", "Hybrid"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Based on classification by capacity, the following are main categories except ____", o: ["Microcomputers", "Medium/Mini/Small Computers", "Super Computers", "Large Computers/Main Frames"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are examples of Micro Computers except", o: ["IBM", "APPLE", "COMPAQ", "INTEL"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer hardware comprises the input unit, the processing unit and the ____ unit", o: ["Storage", "Output", "Control", "memory"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following contains body of codes that perform a particular task and does not return a value.", o: ["Subroutine", "Function", "Complier", "Module"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is used to return to a value.", o: ["Subroutine", "Function", "Complier", "Module"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The conversion of 1F2(base 16) to Base 10 is ____", o: ["499", "498", "477", "500"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "VBA treats as a ____ anything on a line that follows the apostrophe '", o: ["Array", "Label", "Function", "Comment"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following does not return a value", o: ["Array", "Label", "Sub", "Function"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A very important use of ____ is to utilize them to break up the code to smaller piece each performing a specific task and does not return a value.", o: ["Function", "Sub", "Array", "Label"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The act of correcting errors in a program code is called", o: ["Debugging", "Sorting", "Flowcharting", "Looping"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "public Class Form1 Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click Dim num1 As Integer = 1 Do While num1 < 10 MessageBox.Show(\"The value of num1 is: \" & num1) num1 = num1 + 1 Loop End Sub End Class In VB .NET the above is an Example of using the", o: ["The For Statement", "The For-Next Statement", "The End sub Statement", "The Do Loops"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "VB.NET is considered to be a:", o: ["Low level Language, Object-oriented Programming Language", "First generation Language.", "High level, Object-oriented Programming Language", "Machine Object-oriented Programming Language"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ENIAC computer belongs to", o: ["1st Generation of computer", "2nd Generation of computer", "3rd Generation of computer", "4th Generation of computer"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are the advantages of using computer except", o: ["flexibility", "automatic", "accuracy", "privacy violation"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ENIAC stand for", o: ["Electrical Numerical Integrator and Computer", "Electronic Numerical Integrator and Computer", "Electronic Numerical Integrator and Calculator", "Electrical Numerical Integrator and Calculator"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "2nd generation High level language include the following except", o: ["Pascal", "Fortran", "ALGOL", "COBOL"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The major characteristics of 3rd Generation computer is the use of", o: ["vacuum tubes", "transistors", "large scale integration", "Integrated circuit"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Another name for Intel iPSC-1 is", o: ["hyperbole", "hypercube", "hypertech", "none of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer that is designed to solve a restricted class of problems is", o: ["general purpose computer", "multiple purpose computer", "special purpose computer", "micro computer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Classification of computer by capacity include", o: ["Microcomputer", "Mini computer", "Mainframe computer", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The input unit include the following except", o: ["Monitor", "scanner", "keyboard", "trackball"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The main unit of a personal computer is", o: ["ROM unit", "RAM unit", "System unit", "Keyboard unit"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer software can be classified into", o: ["Digital and analog software", "System and application software", "Analog and application software", "Digital and system software"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A program that acts as an interface between a user of a computer and the computer hardware is known as", o: ["Utility software", "Language translator", "Operating system", "All of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The three key parameters in which computer can be classified is based on", o: ["Analog, Digital and Hybrid", "Laptop, Notebook and Palmtop", "Purpose, signal type and capacity", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The components of the system unit of the computer include the following except", o: ["Keyboard", "Motherboard", "Expansion slot", "Math Coprocessor slot"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The suites of languages that translate other languages to machine language are called", o: ["Language interpreter", "Language compiler", "Language translator", "none of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The initial program written in a language different from machine language is called", o: ["Source program", "Start program", "Beginning program", "Object program"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A program that accepts code from one high level language, reads, translates and executes it, line by line into machine language is known as", o: ["translator", "interpreter", "compiler", "executor"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The stages in compilation in order are", o: ["Syntax analysis, Lexical analysis, Semantic analysis, Code generation", "Lexical analysis, Semantic analysis, Syntax analysis, Code generation", "Lexical analysis, Syntax analysis, Semantic analysis, Code generation", "Syntax analysis, Semantic analysis, Lexical analysis, Code generation"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Typical logic operations in computer programming language include the following except:", o: ["shift", "compare", "test", "add"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The very high level language generally described as", o: ["Fourth Generation (computer) Language (4GL)", "Third Generation (computer) Language (3GL)", "Second Generation (computer) Language (2GL)", "First Generation (computer) Language (1GL)"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The process of locating and correcting errors is known as", o: ["Error tracing", "debugging", "editing", "updating"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A finite step-by-step method of solving a problem is", o: ["Flowchart", "Algorithm", "pseudocode", "coding"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A program design aid that help in expressing the detailed logic of a program is", o: ["Flowchart", "Algorithm", "Pseudocode", "coding"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is false", o: ["The sign of a positive or negative binary is changed by taking it's 2's complement", "Subtraction is addition with the sign of the minuend changed", "When two binary numbers are multiplied, both numbers MUST BE in true form", "Subtraction is addition with the sign of the subtrahend changed"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ number system has digits 0-9 and letters A-F", o: ["Decimal", "Hexadecimal", "Octal", "Binary"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The octal equivalent of 654h is", o: ["1216", "6250", "6540", "3124"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the binary equivalent of the octal 732(base 8)", o: ["111011010", "011100110010", "1100011100", "11100011"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The major difference between a function and subroutine is that", o: ["Function is in excel while subroutine is a BASIC language", "Function can be used in database software while subroutine can only be used in word software", "Function returns a value while subroutine do not return value", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The Sequence of instructions followed by Excel to achieve a particular purpose is", o: ["Flowchart", "Algorithm", "Pseudocode", "Macro"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Keyboard short cut to open vba editor in excel is", o: ["alt + f10", "ctrl + f10", "alt + f11", "ctrl + f11"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "To enter the string \"Computer\" into the cell at the intersection of row 3 and column 2 in Excel VBA", o: ["Cells(3,2).value = \"Computer\"", "Range(\"B3\").Value = \"Computer\"", "Cells(3,2).value = Computer", "(A) and (B) above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Examples of program flows and decision making include all except", o: ["Select Case", "Go To", "Do ... Loop", "While ... Wend"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A group of variables that share a common name is called", o: ["Array", "Subroutine", "Procedure", "Function"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which among is/are not related to database", o: ["Cell", "Table", "Row", "(A) and (C)"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A key that serves as a linking between two tables is known as", o: ["Compound key", "Foreign key", "Primary key", "Integrity key"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The process of organizing data in a database", o: ["Normalization", "Sterilization", "Organization", "Classification"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The \"Junction table\" can be found in", o: ["Many-to-One relationship", "One-to-Many relationship", "Many-to-Many", "One-to-One"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "When a student can offer many courses, but each course can only be offered once by each student is termed", o: ["Many-to-One relationship", "One-to-Many relationship", "Many-to-Many", "On-to-One"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The database object that can be used to answer a simple question, to perform calculations, to combine data from different tables is known as", o: ["Query", "Report", "Form", "Table"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The basic code-building component, which has no visible interface and adds specific functionality to project in VB.Net is", o: ["Windows control library", "Class library", "Console application", "All of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The access specifier in which scope of accessibility is limited within the class and the Inherited class is", o: ["Public", "Private", "Protected", "Friends"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What did the first generation of computers use for circuitry?", o: ["Transistors", "Integrated Circuits", "Vacuum tubes", "Microprocessor"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What did the second generation of computers use for circuitry?", o: ["Transistors", "Integrated Circuits", "Vacuum tubes", "Microprocessor"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The third generation of computers was based on which of the following?", o: ["Transistors", "Integrated Circuits", "Vacuum tubes", "Microprocessor"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Computers can be classified based on the following key parameters except", o: ["Signal type", "Durability", "Purpose", "Capacity"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not likely to be areas where special purpose computer are deployed?", o: ["Navigational problems", "Tracking airplane or missiles", "Banking operations", "Process control applications in industries"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not an advantage of the micro-computers over the mini computers and mainframes?", o: ["Memory capacity", "Speed", "Size", "Durability"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following cannot be found at the front side of a system unit?", o: ["Network adapter", "Reset button", "Power on/off", "CD Rom slot"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following cannot be found at the back side of a system unit?", o: ["Fan housing", "Monitor port", "Key lock", "Monitor port"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The speed of measured in MHz. A PC running at 400GHz means:", o: ["400 thousand ticks per second", "400 million ticks per second", "400 billion ticks per second", "400 trillion ticks per second"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The central process unit is the following except:", o: ["Processes (moves and calculates) data", "It is the center of PC data processing", "Is also referred to as system unit", "It is chip which contains millions of transistors"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of these is not a computer output device?", o: ["Monitor", "Speaker", "Keyboard", "Printer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The system software can be divided into the following except", o: ["Operating system", "Application software", "Language translator", "Utility software"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not correct about Language translators?", o: ["A compiler translate an entire assembly language program into machine language program", "An assembler translate the entire assembly language program into machine language program", "An interpreter translate and execute a source program line by line into assembly language", "A compiler translate an entire high level language into assembly language program"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word processors, spreadsheet and database packages are examples of:", o: ["System software", "Application software", "Utility software", "Operating System"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a component of an operating system?", o: ["Process management", "Code generation management", "Memory management", "File management"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following basic types of instructions causes the computer to alter the sequence of instruction within the program?", o: ["Input-output instructions", "Arithmetic instructions", "Branching instructions", "Logic instructions"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a feature of machine language programming", o: ["The operation code is expressed as a combination of letters called mnemonics", "They make use of instructions written in binary notations 1 and 0.", "It is time consuming", "It is computer dependent"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "At what stage of programming is algorithms, flowchart, pseudo code and decision table used?", o: ["Program testing", "Program debugging", "Program definition", "Developing the method of solution"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Among the flowchart symbols, which is used for input and output instructions?", o: ["Oval", "Rectangular", "kite", "parallelogram"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The rectangle symbol of flowchart is used for:", o: ["Input and output instruction", "Decision making", "Arithmetic calculation", "Operation sequence and data flow directions"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The hexadecimal numbering system contains", o: ["10 characters", "15 characters", "16 characters", "17 characters"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Converting 0Dh into binary gives", o: ["00001011", "00001101", "00001001", "00000111"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Converting 111111000101101001 to hexadecimal gives", o: ["FC5A1", "2F169", "3F169", "11F169"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Converting 1Ch to decimal gives", o: ["27", "28", "29", "30"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In VBA, the difference between a sub and function is", o: ["A procedure returns a value to the sub that called it", "A procedure returns a value to the function that called it", "A sub returns a value to the procedure that called it", "A function returns a value to the procedure that called it"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In VBA one of the following contains buttons to which you have quick and easy access", o: ["Menu bar", "Toolbar", "Project window", "Properties window"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In VBA, a function that displays a box where users can enter a value or message in form of text is called", o: ["TextBox", "MsgBox", "InputBox", "ValueBox"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a part of the VBA IDE", o: ["Menu bar", "Toolbar", "Code menu", "properties window"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a statement for controlling program flow in VBA", o: ["If...then...else", "Do while", "For next", "Do loop"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is a correct way of declaring array \"A\" in VBA", o: ["Dim A[1 To 5] as Strings", "Array A[1 To 5] as Strings", "Dim A(1 To 5) as Strings", "Array A(1 To 5) as Strings"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In database, a request for data results and for action on data is called", o: ["Sort", "Enquiry", "Query", "Call"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A process of organizing data in database by eliminating redundancy and inconsistent dependency is called", o: ["Formalization", "Synchronization", "Query", "Normalization"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a type of relationship in database?", o: ["One-to-one", "One-to-many", "Many-to-one", "Many-to-many"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following shows a correct declaration of variable \"A\" in Visual Basic?", o: ["Dim A : Integer", "Dim A :: Integer", "Dim A, Integer", "Dim A as Integer"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following describes access specifiers?", o: ["The primary key of an object and its members", "The scope of accessibility of a string literal and its members", "The primary key of a string literal and its members", "The scope of accessibility of an object and its members"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a type of access specifier?", o: ["Public", "Private", "Protected", "Unprotected"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Queries used to retrieve data from a table or to make calculations are called", o: ["Select queries", "Action queries", "Passive queries", "Filter queries"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Queries that add, change or delete data are called", o: ["Select queries", "Action queries", "Passive queries", "Filter queries"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is correct", o: ["Built-in functions are procedures created independently from the even procedures", "User-defined functions can only perform some basic operations", "Built-in functions can be used to perform all complex operations", "User-defined function can be used to perform more complex operations"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Every task you perform can be recorded using one of the following tools", o: ["Autosave", "Autorun", "Macro", "Recorder"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are characteristics of a computer expect ____.", o: ["Speed", "Accuracy", "Storage", "Rigid"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ was mainly used in the Third generation of computer?", o: ["Vacuum Tube", "Integrated Circuit", "Transistor", "Large Scale integration chip"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In analogue computer ____?", o: ["Input is first converted to digital form", "Input is never converted to digital form", "Output is displayed in digital form", "All of above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The mainframe computer system can execute ____ instruction per second", o: ["100", "1000", "10000", "10"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following are the two main components of the CPU?", o: ["Control Unit and Registers", "Registers and Main Memory", "Control unit and ALU", "ALU and bus"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is an input device ____?", o: ["Keyboard", "Mouse", "Card Reader", "All of these"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ facilitates the optimal use of the hardware systems and/or provide a suitable environment for the writing, editing, debugging, testing and running of User Programs.", o: ["Operating system", "System software", "Application software", "Software"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the full meaning of OOP?", o: ["Object Only Programming", "Object Oriented Programming", "Optional Object Programming", "Open Operations Programming"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following are the functions of an operating system ____?", o: ["Allocates resources", "Monitors Activities", "Manages disks and files", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The suites of languages that translate other languages to machine language are called ____?", o: ["Language translator", "Machine translator", "System translator", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a stage in compilation ____?", o: ["Word processing", "Lexical analysis", "Syntax analysis", "Semantics analysis"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual BASIC is a ____ language.", o: ["machine", "high-level", "low level", "mid-level"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In Visual BASIC, ____ are tied to the occurrence of events.", o: ["actions", "options", "clicks", "inputs"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are major components of the Visual BASIC design panel, EXCEPT", o: ["Coding Panel", "Form Panel", "Properties Window", "Menu Bar"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual BASIC form controls can be found on the ____.", o: ["toolbar", "menu bar", "properties window", "design panel"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The features of Visual BASIC tools can be changed in its ____.", o: ["property window", "features window", "characteristics window", "toolbar"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In Visual Basic, the project name always appears in the ____.", o: ["property window", "intermediate window", "code panel", "title bar"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following cannot be found in the Visual Basic toolbar?", o: ["Picture box", "Check box", "List box", "Compile button"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What would be a good Visual Basic tool to accept the input of a person's first name?", o: ["Command Button", "Label Box", "Text Box", "Check Box"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is NOT one of the three basic types of statement structures?", o: ["Sequence", "Loop", "Decision/Branching", "Input/Output"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which one of the following is NOT one of the three main types of errors?", o: ["Syntax error", "Logic error", "Declaration error", "Run-time error"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual Studio provides which feature:", o: ["debugging", "application deployment", "syntax checking", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The first computers were programmed using", o: ["Assembly Language", "Machine Language", "Source Code", "Object Code"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is a good principle of programming", o: ["Accuracy", "Efficiency", "Readability", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ combines the features of the text box and list box", o: ["Picture box", "Check box", "Combo box", "Option button"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the output of the following code MyString=\"Hello World\" LeftString=left(MyString,3)", o: ["Hel", "Hello World", "World", "Wor"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The data operated on by a particular operation is called ____.", o: ["OP Code", "Operand", "data", "information"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A person who writes programs is called?", o: ["An Analyst", "A Scientist", "A Writer", "A Programmer"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Major registers in the CPU includes the following except?", o: ["Accumulator", "Program Counter", "Main Memory register", "Data Register"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Major sub-systems of the CPU include which of the following?", o: ["Instruction Decoder", "Controller Sequencer", "ALU", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the full meaning of OOP?", o: ["Object Only Programming", "Object Oriented Programming", "Optional Object Programming", "Open Operations Programming"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The acronym GUI stands for ____.", o: ["Graphical User Interface", "Graphical Utility Interface", "Graphical Utility for Interaction", "Graphical User Interaction"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the full meaning of IDE?", o: ["Integrated Design Environment", "Integrated Development Environment", "Interior Development Environment", "Industrial Design Environment"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are input devices except?", o: ["Speakers", "Light pen", "Keyboard", "Mouse"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Read/Write Memory are composed of ____", o: ["titanium", "flip-flops", "registers", "counters"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ provides the interconnection between the internal buses and I/O devices", o: ["I/O Interfaces", "Panel", "Cables", "Ports"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What are the two types of software?", o: ["System and Application software", "User Defined and Generic Software", "Utility Output and Application Software", "General Purpose and Task Specific Software"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The ____ uniquely identifies each record in a table?", o: ["Matric Number", "Surname", "Primary Key", "Foreign Key"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ is a field that matches the unique identifier column of a different table?", o: ["First Field", "Primary Key", "Last Field", "Foreign Key"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Easy to use features of Access 2010 includes which of the following?", o: ["Analyse data", "Modify Records", "Sort Records", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual Basic for Applications is a ____?", o: ["Low Level Language", "Intermediate Level Language", "High Level Language", "Assembled Language"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "VBA is an Object-Oriented Programming language?", o: ["True", "False", "Never", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "One of the unique features of VBA is that", o: ["It has a unique name", "it allows it code to be quickly modified while being debugged", "it is the oldest existing language and with that it contains more constructs", "it is easy to code"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A GUI stands for", o: ["Grid User Interface", "General User Interface", "Graphical User Interface", "All of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Some of the commands displayed by the Menu Bar includes?", o: ["File", "Edit", "View", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Fundamental Data Types in Visual Basic includes?", o: ["Boolean, Double, Integer", "Single, String, Exp", "Double, String, Cos", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Some VBA mathematical functions include?", o: ["Log, Abs, Sin", "Round, Log, Rnd", "Sqr, Tan, Sin", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A subroutine can be thought of as a ____?", o: ["Documented activity", "Miniature program", "A variable declaration", "All of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A subroutine can be called in some of this ways except", o: ["By using the CALL keyword", "By stating the name of the subroutine", "By Redeclaring its statements", "All of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ returns a double value specifying the square root of a number?", o: ["sqrt symbol", "Sqr", "root", "None of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The two ways in which parameters can be sent to a subroutine are?", o: ["By Val and By Position", "By Val and By Type", "By Ref and By Val", "All of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In what case is a function used?", o: ["If there will be a need for a Return Value", "If there will be no need for a Return Value", "If the Return Value is a constant", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Logical Operators in VBA includes?", o: ["=, <>, <", "<!, !!, <", "<>, !=, >!!", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A good Visual Basic tool to for submitting Form Entries will be?", o: ["Command Button", "Label Box", "Text Box", "Check Box"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which one of the following is NOT one of the three main types of errors?", o: ["Syntax error", "Logic error", "Declaration error", "Run-time error"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual BASIC is an ____ language.", o: ["abstract", "event driven", "obsolete", "open source"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Groupings of 8 bits handled as a single unit is called a ____.", o: ["Bit group", "Nibble", "Concat", "Byte"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A nibble is made up of ____.", o: ["1 byte", "2 bytes", "4 bits", "6 bits"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Microsoft Word documents have the ____ extension.", o: [".doc", ".docx", ".docu", "A and B above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The acronym GUI stands for ____.", o: ["Graphical User Interface", "Graphical Utility Interface", "Graphical Utility for Interaction", "Graphical User Interaction"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is the full meaning of IDE?", o: ["Integrated Design Environment", "Integrated Development Environment", "Interior Development Environment", "Industrial Design Environment"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual BASIC form controls can be found on the ____.", o: ["toolbar", "menu bar", "properties window", "design panel"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The features of Visual BASIC tools can be changed in its ____.", o: ["property window", "features window", "characteristics window", "toolbar"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A GUI", o: ["uses buttons, menus and icons", "should be interactive", "stands for Graphical User Interface", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The acronym BASIC stands for ____.", o: ["Believable And Simple Instruction Code", "Beginners' All-purpose Symbolic Instruction Code", "Beginners' Available Simple Instruction Code", "Beginners' All-purpose Simple Instruction Code"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual Basic is regarded as a", o: ["low level language", "first-generation language", "high-level language", "machine language"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following best describes an algorithm?", o: ["A mathematical formula that solves a problem.", "A series of gimmicks in writing code.", "A logical sequence of steps that solve a problem.", "A tool that designs computer programs and draws the user interface."], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In event-driven programming, an event could be generated by:", o: ["the system", "a user's action", "the program itself", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which is not a numeric data type?", o: ["String", "Short", "Long", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which is a numeric data type?", o: ["Floating point", "Integer", "String", "Both A. and B."], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which is a valid statement for declaring a variable?", o: ["Const Sum As Integer", "Const mySum as Integer", "Dim mySum as Integer", "All of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following will generate an error?", o: ["Dividing by zero", "Assigning the string \"Hello, world\" to an string variable", "Both A. and B. above", "None of the above."], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The process of checking for and correcting errors in a program code is called ____.", o: ["sniffing", "debugging", "disinfecting", "inspecting"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which keyword is used in Visual Basic for variable declaration?", o: ["Dim", "Var", "Set", "None of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Convert 20B3(base 16) to decimal", o: ["8471", "8581", "8371", "8381"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Addition of 195(base 16) and 319(base 16) is ____", o: ["4AE(base 16)", "4AD(base 16)", "4AC(base 16)", "NONE OF THE ABOVE"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Add DEAD(base 16) and BEEF(base 16)", o: ["19C9C(base 16)", "19D9B(base 16)", "19D9C(base 16)", "19D9D(base 16)"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Compute 7526(base 8) - 3142(base 8)", o: ["4365(base 8)", "4363(base 8)", "4364(base 8)", "4366(base 8)"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Stored instructions and data in digital computers consists of", o: ["Alphabets", "Numerals", "Characters", "Bits"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "CD-ROM stands for", o: ["Compactable Read Only Memory", "Compact Data Read Only Memory", "Compactable Disk Read Only Memory", "Compact Disk Read Only Memory"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "How was the generation of computer classified?", o: ["by the device used in memory and processor", "by the speed of computer", "by the model of the computer", "by the accuracy of computer"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Chief component of first generation computer was", o: ["Transistors", "Vacuum Tubes and Valves", "Integrated Circuits", "None of above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Second Generation computers were developed during", o: ["1949 to 1955", "1956 to 1965", "1965 to 1970", "1970 to 1990"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is meant by a dedicated computer?", o: ["Which is used by one person only", "Which is assigned one and only one task", "Which uses one kind of software", "Which is meant for application software"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A storage area used to store data to a compensate for the difference in speed at which the different units can handle data is", o: ["Memory", "Buffer", "Accumulator", "Address"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which number system is commonly used as a shortcut notation for groups of four binary digits?", o: ["Binary", "Decimal", "Octal", "Hexadecimal"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The difference between memory and storage is that memory is .... and storage is ...", o: ["Temporary, permanent", "Permanent, temporary", "Slow, fast", "All of above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The octal equivalence of 111010 is", o: ["81", "72", "71", "None of above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not used as secondary storage?", o: ["semiconductor memory", "magnetic disks", "magnetic drums", "magnetic tapes"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is the fastest?", o: ["CPU", "Magnetic tapes and disks", "Video terminal", "Sensors, mechanical controllers"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Who built the first Mechanical Calculator", o: ["Joseph Marie Jacquard", "John Mauchly", "Blaise Pascal", "Howard Aiken"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following items are examples of storage devices?", o: ["Floppy / hard disks", "CD-ROMs", "Tape devices", "All of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A computer Program that translates one program instruction at a time into machine language is called a/an", o: ["Interpreter", "CPU", "Compiler", "Simulator"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer that process both analog and digital is called", o: ["Analog computer", "Digital computer", "Hybrid computer", "Mainframe computer"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The term bit is short for:", o: ["megabyte", "binary language", "binary digit", "binary number"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A ____ is approximately a million bytes", o: ["gigabyte", "kilobyte", "megabyte", "terabyte"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word processing, spreadsheet, and photo-editing are examples of:", o: ["Application software", "System software", "Operating system software", "Platform software"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ are specially designed computer chips that reside inside other devices, such as your car or your electronic thermostat.", o: ["Servers", "Embedded computers", "Robotic computers", "Mainframes"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What is true about supercomputers?", o: ["they can fit on a single small chip", "they are found at thousands of places around the world", "they cost only few thousand rupee", "they can process billions of operations in a second"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following functions of a computer is wrong?", o: ["It obtains data from an input device", "It processes the data and delivers the final results to an output device", "It takes processing steps from the list of instructions called program", "It generates the program on its own."], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Memories in which any location can be reached in a fixed (and short) amount of time after specifying its address is called", o: ["sequential-access memory", "random-access memory", "secondary memory", "mass storage"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "What does the diamond flowchart symbol represent?", o: ["input/output", "terminal", "decision", "connector"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A graphical depiction of the logical steps to carry out a task and show how the steps relate to each other is called a(n)", o: ["Flowchart", "Pseudocode.", "Algorithms.", "Hierarchy chart."], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Visual Basic is a tool that allows you to develop application in....", o: ["Real time", "Graphical User Interface", "Menu Driven", "None of above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Any storage device added to computer beyond the immediately usable main storage is known as:", o: ["Floppy disk", "Hard Disk", "Backing store", "Punched Card"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is application software?", o: ["Compiler", "Power Point", "Debugger", "None of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is invalid type of memory", o: ["RAM (Random Access Memory)", "PRAM (Programmable Read Access Only Memory)", "ROM (Read Only Memory)", "EPROM (Erasable Programmable Read Only)"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which windows display a list of all forms and modules making up your application", o: ["Project window", "Properties window", "Form layout window", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following provides quick access to commonly used commands in the programming environment?", o: ["Toolbox", "Object browser", "Toolbar", "None of above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is valid storage type?", o: ["CPU", "Keyboard", "Pen Drive", "Track Ball"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not necessarily a characteristic of a program module?", o: ["It performs a single task", "It contains several sub modules", "It is self-contained", "It is relatively small in size"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The function gets called when the function name is followed by", o: ["colon", "semicolon", "statement", "bracket"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The mechanism used to convey information to the function is the", o: ["Argument", "commands", "loops", "statements"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following windows is the central to the development of Visual Basic Applications?", o: ["Project window", "Form window", "Properties window", "All of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Microsoft Office can be classified under what heading of application software:", o: ["Spreadsheet", "Database", "Word Processor", "Desktop Publishing"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In order to save an existing document with a different name you need to:", o: ["Retype the document and give it a different name", "Use the Save as.. command", "Copy and paste the original document to a new document and then save", "Use Windows Explorer to copy the document to a different location and then rename it"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Digital computer represents its variable in form ...", o: ["Letter", "Digit", "Symbol", "Number"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Peripheral equipment is equipment that is ____", o: ["Part of the central processing unit.", "Inside the processor.", "A section of primary memory.", "Outside the CPU"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The computer that is likely to have the MOST secondary storage is a ____", o: ["Microcomputer.", "Minicomputer.", "Mainframe computer", "Supercomputer."], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "One of the tasks that an operating system performs is to control the computer when ____", o: ["An application program is executing.", "A system program is executing", "A system program or a packaged program is executing.", "No applications or system programs are executing."], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The type of storage that can be described as volatile is ____", o: ["ROM.", "RAM.", "Secondary storage.", "External storage."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A kilobyte contains exactly how many bytes?", o: ["1000", "1024", "One million", "1,048,576"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The two main units of the processor are the ____", o: ["Primary storage and arithmetic-logic units.", "Arithmetic-logic and control units.", "Control and primary storage units.", "Arithmetic/storage and control units."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The use of a mouse as an input device ____", o: ["is more common than the use of a keyboard.", "is less common than the use of a keyboard.", "Requires more training than using a keyboard.", "Never slows a computer user down."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The abbreviation CPU refers to the ____", o: ["Central printing unit.", "Complete processing unit.", "Central processing unit.", "Comprehensive processing unit."], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "____ displays selections such as File, Edit, Help, etc. which may be used in the program.", o: ["Display menu", "Bar menu", "Menu bar", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Computer networks allow ____", o: ["Program instructions to be analyzed by the processor.", "Hardware devices to communicate with each other.", "Data to be transferred faster between computers than between components inside a computer.", "Programs to communicate with each other."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The processor of a CPU is stored on ____", o: ["One electronic circuit.", "One or more chips", "One or more memory chips.", "A RAM card."], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are examples of output device except", o: ["Keyboard", "Monitor", "Printers", "Speakers"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The speed of a CPU is measure in ____", o: ["Millimeter", "Centimeter", "Megahertz", "Meter"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The physical component of a computer system are called ____", o: ["Program", "Software", "Hardware", "System"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Computer software can be classified into ____ major groups?", o: ["3", "2", "1", "5"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are major functions of software except ____", o: ["Editing", "Debugging", "Testing", "all of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The suites of languages that translate other languages to machine language are called ____", o: ["Sources program", "Language translator", "Program converter", "None of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The following are examples of classes of language translators except ____", o: ["Assemblers", "Interpreters", "Compilers.", "Copier"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Computer use the ____ language to process data", o: ["Relational", "Megabyte", "Binary", "Processing"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word processing, spreadsheet, and photo-editing are example of ____", o: ["Application software", "System software", "Operating system software", "Platform software"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which language is directly understood by the computer without translation?", o: ["Machine language", "High level language", "Assembly language", "All of the above"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Process is called ____", o: ["Contents of a memory", "A jobs in a secondary memory", "A program in execution", "Program in high level language kept on disk"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The most frequently used instructions of a computer program are likely to be fetch from ____", o: ["RAM", "Cache memory", "HHD", "Register"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following are normally used to initialize a computer system's hardware?", o: ["Bootstrap memory", "RAM", "External mass memory", "Static memory"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is still useful for adding numbers?", o: ["EDVAC", "EDSAC", "ABACUS", "ENIAC"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "System program that contains the separately compiled modules of a program into a form suitable for executions is called ____", o: ["Assembler", "Load and go", "Linking loader", "Compiler"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following is not a valid version of MS office?", o: ["Office XP", "Office vista", "Office 2007", "None"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "All modern computer operate on ____", o: ["Data", "Information", "Floppy", "None"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "CD-ROM stands for ____", o: ["Compactible Read Only Memory", "Compactible Disk Read Only Memory", "Compact Disk Read Only Memory", "All of the above."], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which generation of computer is converted by the period 1964-1977?", o: ["First", "Second", "Fourth", "Third"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following belongs to the first generation of computer?", o: ["ENIAC", "IBM 1401", "IBM 1890", "UNIVAC"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A typical modern computer uses ____", o: ["Values", "Input device", "LSI chip", "None of the above"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which part interprets program instructions and initiate control operations", o: ["Input", "Storage units", "Control units", "None of the above"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Devices that accept data from outside computer and transfer into CPU are called", o: ["input devices", "digital devices", "analogue devices", "truth table peripherals"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Word 'RAM' stands for", o: ["random access memory", "read access memory", "read arithmetic memory", "random arithmetic memory"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "If any instruction consists any arithmetic operation, data is transferred to", o: ["quantitative unit", "qualitative unit", "arithmetic and logical unit", "central processing unit"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Devices that are under control of computer and are directly connected to it are said to be", o: ["off-line devices", "on-line devices", "IN gate device", "IF gate device"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Type of integrated circuit which consists of arithmetic unit, control unit and some main store is called a", o: ["mega processor", "micro processor", "micro computers", "mega computers"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A visual display unit is an example of", o: ["output device", "input/output devices", "backup devices", "mediums"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Large computers with wide range of peripheral devices are classified as", o: ["mainframe computers", "mini frame computers", "mainframe processors", "peripheral interface"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "The part of computer system that can be touched are called", o: ["hardware", "software", "computer system", "computer accessories"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Input and output devices such as monitors and keyboards are classified as", o: ["arithmetic units", "control unit devices", "peripheral devices", "main store devices"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "'ROM' stands for", o: ["read only memory", "random only memory", "readily oral memory", "random available memory"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Two type of memories 'RAM' and 'ROM' are part of", o: ["backup memory", "main memory", "shorter memory", "long-term memory"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A device in which data is represented by a continuous variable quantity is called", o: ["analogue device", "computer device", "system programs", "digital program"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Small computers that are not microcomputers are classified as", o: ["micro computers", "mini computers", "mainframe computers", "mega processors"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Specialized program that allows users to utilize in specific application is classified as", o: ["relative programs", "application programs", "relative programs", "replicate programs"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "System programs examples includes", o: ["operating system of computer", "trace program", "compiler", "all of above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Set of programs with full set of documentation is considered as", o: ["database packages", "file package", "software", "software packages"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Function of running and loading programs and usage of peripherals is performed by", o: ["operating system", "enquiry system", "dump programs", "function system"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Set of software authorized to specific users is considered as", o: ["software library", "program library", "directory library", "library package"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Program which is used to produce pictures and text and to organize it in newspaper is classified as", o: ["text publishing package", "desktop publishing package", "experimental package", "organizing publishing package"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "System program which performs one simple task is classified as", o: ["utility programs", "function program", "compiling program", "enquiry program"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Program which provides users with grid of rows and columns is classified as", o: ["spreadsheet", "column grid", "rows grid", "reliability grid"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Program packages that allows program users to design data files and select information are called", o: ["file management", "file enquiry", "database package", "all of above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Collection of useful working routines and programs and is only available to users with authorization is classified as", o: ["directory library", "library package", "program library", "software library"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "System software's are supplied by the", o: ["text slots", "payroll programmers", "manufacturer", "enquiry programmers"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Program subroutines are", o: ["called by other programs", "fixed variable", "default constants", "default variables"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "When divisions of decimals are involved in program, these numbers are stored in", o: ["rational numbers", "irrational numbers", "real numbers", "original numbers"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Loop statement which is repeated to some given number of times is classified as", o: ["FOR loop", "GO loop", "REPEAT loop", "GO REPEAT loop"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In line \"100 INPUT NUM\" of a BASIC program, NUM is if chosen by programmer is classified as", o: ["real constants", "exponents", "identifier", "reserved variable"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Type of statement written in sequence and are repeated until conditions met is classified as", o: ["format", "loop", "case", "condition"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In statement 110 IF Num = INT(Num) THEN PRINT \"Whole number' \" of BASIC language, built-in function is", o: ["Num", "INT", "PRINT", "IF"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Sequence of instructions that are carried out for a particular task is classified as", o: ["routine", "subroutine", "procedure", "function"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Name given by a programmer to some data is classified as", o: ["identifier", "identification", "exponent", "mantissa"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Statement in BASIC language 10 IF A1=A2 THEN Comparison CDN$ = \"EQUAL\" is an example of", o: ["if then statement", "if else statement", "then else statement", "else one statement"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "In line \"100 INPUT NUM\" of a BASIC program, 'INPUT NUM' is", o: ["line statement", "single instruction", "reserved words", "expression"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A set of finite rules to solve a problem is called?", o: ["An Instruction", "A Pseudocode", "An Algorithm", "A program"], a: 2, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A group of 8 bits is called?", o: ["Word", "Byte", "digits", "Octave"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "How many distinct patterns can be generated from 3 bits?", o: ["6", "8", "10", "9"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "First operator precedence for evaluating Boolean expressions is", o: ["parenthesis", "AND", "OR", "NOT"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "A boolean function can be converted from algebraic expressions to a product of maxterms by using", o: ["graphical representation", "Truth table", "Canonical Conversion Method", "Both b and c"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of following gate is represented by x+y=z?", o: ["NOR gate", "OR gate", "NOT gate", "XOR gate"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Using 10's complement subtracting 3250 from 72532 is equal to", o: ["69282", "69272", "69252", "69232"], a: 0, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Subtraction of two signed numbers is performed with", o: ["1's complement", "2's complement", "9's complement", "10's complement"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Representation of 8620 in binary is", o: ["1000_0111_1110_0000", "1000_0110_1011_0000", "1000_0110_1010_0100", "1011_0110_0010_1000"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "ASCII is an", o: ["8 bit Code", "4 bit Code", "6 bit Code", "7 bit code"], a: 1, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
  { q: "Which of the following professions has not been affected by personal computers?", o: ["Medical", "Clerical and law", "Accounting", "None of the above"], a: 3, e: "From the FUTA CSC102 2016/2017 past exam paper — see Week 12 notes for the general topic area." },
];

/* ----------------------------- QUESTION TAGGING -----------------------------
   The raw bank above was written following the same week-by-week order as
   CSC102_NOTES. Rather than hand-editing all 51 question objects, we tag
   them programmatically by index range so each question gets a `week`
   number (matching CSC102_NOTES), a `topic` label, a rough `difficulty`,
   and a `ref` string pointing back to the relevant notes section. */
const WEEK_QUESTION_COUNTS = [13, 9, 5, 4, 0, 1, 3, 3, 4, 3, 6, 462]; // Weeks 1-11 (51 core questions) + Week 12 (462 past-exam questions)
const HARD_KEYWORDS = ["NP", "Halting", "Church", "tractable", "heuristic", "false analogy", "time-space", "undecidable", "Pólya", "decidable"];
const EASY_KEYWORDS = ["best defines", "best described as", "is:", "represents:"];

function classifyDifficulty(qText) {
  if (HARD_KEYWORDS.some((k) => qText.includes(k))) return "Hard";
  if (EASY_KEYWORDS.some((k) => qText.includes(k))) return "Easy";
  return "Medium";
}

function tagQuestionBank(rawBank, notes) {
  const weekOfIndex = [];
  WEEK_QUESTION_COUNTS.forEach((count, wIdx) => {
    for (let i = 0; i < count; i++) weekOfIndex.push(wIdx + 1);
  });
  return rawBank.map((raw, i) => {
    const week = weekOfIndex[i] || notes.length;
    const noteEntry = notes[week - 1];
    const topic = noteEntry ? noteEntry.title : "General";
    return {
      ...raw,
      id: "csc102-" + i,
      week,
      topic,
      difficulty: classifyDifficulty(raw.q),
      ref: noteEntry ? `${noteEntry.week} Notes — ${noteEntry.title}` : "Course Notes",
    };
  });
}

const CSC102_QUESTIONS = tagQuestionBank([...CSC102_QUESTIONS_RAW, ...CSC102_PASTQ_RAW], CSC102_NOTES);
const WEEK_OPTIONS = CSC102_NOTES.map((n, i) => ({
  value: i + 1,
  label: n.week,
  title: n.title,
  count: CSC102_QUESTIONS.filter((q) => q.week === i + 1).length,
})).filter((w) => w.count > 0);

/* ----------------------------- CPE102 NOTES (by section) ----------------------------- */
const CPE102_NOTES = [
  { week: "Section 1", title: "From Idea to Market — Engineering Innovation for Africa", points: [
    "Roughly 60% of Africa's population is under 25 — a young, fast-growing user base.",
    "Imported technologies often fail because they assume infrastructure (grid power, broadband, banking rails) that doesn't reliably exist locally.",
    "The Innovation Formula: Useful Idea × Execution × Adoption = Innovation — if Adoption is zero, total impact is zero.",
    "Invention vs Innovation: inventions produce patents/prototypes; innovations reach paying users in the market.",
    "The Engineering & Commercialization Engine begins with Problem Identification via deep observation methods like the '5 Whys'.",
    "MVP Subtraction Model: strip a product to its core — e.g. a v1 Smart Prepaid Meter needs accurate measurement, mobile top-up, and remote disconnect, not dashboards or AI grid balancing.",
    "Field-test prototypes in their real operating environment for at least 30 days before scaling.",
    "Pay-As-You-Go (PAYG) micropayments convert CapEx into daily OpEx, unlocking mass-market African adoption.",
    "VCs avoid solo engineering founders due to 'bus-factor of one' / key-man risk.",
    "Flutterwave's lesson: infrastructure (unified payment rails) beats standalone apps because it turns other developers into a distribution channel.",
    "A 30-Day Validation Sprint has weekly milestones — e.g. Week 2 covers literature review and recruiting complementary co-founders.",
  ]},
  { week: "Section 2", title: "Computing in Engineering — Industry 4.0 & Applications", points: [
    "Industry 4.0 integrates Cyber-Physical Systems, AI, IoT, and cloud networks to optimize physical assets in real time.",
    "3D CAD & BIM design has replaced traditional manual drafting in engineering workflows.",
    "A Digital Twin is a real-time virtual replica of a physical asset, continuously updated by live sensor data.",
    "ANSYS Fluent is a standard Computational Fluid Dynamics (CFD) tool for modeling fluid flow and heat transfer.",
    "Frugal engineering in Nigeria: Mechatronics engineers build DIY automation with opto-isolated Arduino/ESP32 kits running OpenPLC to avoid costly imported PLCs.",
    "Agricultural Engineering tool stack: ArcGIS, HYDRUS, Python/R.",
    "The 'Default-to-Off' safety rule: heavy machinery and remote pumps must power down automatically to a safe state if a control signal drops.",
    "Primavera / MS Project is a project management tool used broadly across Civil, Chemical, and Mining Engineering.",
  ]},
  { week: "Section 3", title: "Historical Development of Modern Computing & Its Role in Engineering", points: [
    "The Jacquard Loom (1801) used punched cards to control weaving patterns — a direct forerunner of programming.",
    "John von Neumann is the 'Architect of Modern Computers', defining the CPU/Memory/I/O structural framework.",
    "First-generation computers (1940s–1956) were characterized by vacuum tubes.",
    "Moore's Law (1965): the number of transistors on a chip doubles approximately every 2 years.",
    "ASPEN HYSYS is standard in Chemical Engineering for steady-state and dynamic process simulation of distillation columns and reactors.",
    "Leapfrog Geo is used in Mining Engineering for implicit 3D geological modeling with wireframes and RBF algorithms.",
    "Python is favored for data analysis and ML; C/C++ for embedded, performance-critical code.",
    "Future trend (2025–2035): Generative AI for Design can generate optimal component geometries purely from functional constraints.",
  ]},
];
/* ----------------------------- CPE102 QUESTION BANK (raw) ----------------------------- */
const CPE102_QUESTIONS_RAW = [
  // File 1: From Idea to Market (Engineering Innovation for Africa)
  { q: "According to the structural realities of Africa outlined in the course, what percentage of the population is under 25 years old?", o: ["40%", "50%", "60%", "70%"], a: 2, e: "Roughly 60% of Africa's population is under 25 — a young, fast-growing user base." },
  { q: "Why do imported technologies frequently fail in the African operating environment?", o: ["They are too advanced for local engineers to understand.", "They assume the existence of an underlying infrastructure that does not exist.", "They are intentionally designed with lower quality materials.", "They lack proper digital rights management software."], a: 1, e: "Imported tech often assumes grid power, broadband, or banking rails that aren't reliably available locally." },
  { q: "Which of the following represents the correct sequential leapfrog progression for African infrastructure mentioned in the slides?", o: ["Branch banking → Desktop internet → Mobile wallets", "Landlines → Mobile phones → 5G infrastructure", "Power grid → Distributed solar microgrids → Nuclear energy", "Physical logistics → Drone delivery networks"], a: 3, e: "Leapfrogging skips intermediate physical-logistics infrastructure straight to drone delivery networks." },
  { q: "In the Innovation Formula ([Useful Idea] × [Execution] × [Adoption] = Innovation), what happens if the adoption variable equals zero?", o: ["The technical novelty increases.", "The total impact is zero.", "The project reverts to the validation phase.", "The startup pivots to a charity model."], a: 1, e: "Since the formula is multiplicative, any zero factor — including Adoption — makes total impact zero." },
  { q: "What distinguishes an Invention from an Innovation in the context of the market?", o: ["Inventions focus on execution failure; innovations focus on scientific failure.", "Inventions output patents and prototypes; innovations output products reaching paying users.", "Inventions are measured by mobile money transactions; innovations are measured by lab metrics.", "Inventions happen exclusively in commercial tech hubs; innovations happen in university labs."], a: 1, e: "Invention = patents/prototypes. Innovation = the same idea reaching paying users in the market." },
  { q: "Which stage of the Engineering & Commercialization Engine involves deep observation using the '5 Whys' methodology?", o: ["Ideation", "Implementation", "Problem Identification", "Feasibility Study"], a: 2, e: "The '5 Whys' is a root-cause observation technique used during Problem Identification." },
  { q: "Under the MVP Subtraction Model, what constitutes the core feature set of a version 1 Smart Prepaid Meter?", o: ["Cloud dashboards and predictive analytics", "Dynamic pricing algorithms and AI grid balancing", "Accurate measurement, mobile top-up, and remote disconnect", "Sub-GHz mesh networks and localized edge nodes"], a: 2, e: "MVP subtraction strips a product to its bare essentials — here, measurement, top-up, and disconnect." },
  { q: "What is the minimum recommended deployment duration for field-testing an engineering prototype in its actual African operating environment?", o: ["7 days", "14 days", "30 days", "90 days"], a: 2, e: "A minimum of 30 days is recommended to surface real-world operating conditions." },
  { q: "Which pricing model is explicitly noted for unlocking massive African markets by converting capital expenses (CapEx) into daily operating expenses (OpEx)?", o: ["Institutional one-time fees", "Transaction percentage cuts", "Pay-As-You-Go (PAYG) micropayments", "Flat-rate annual subscriptions"], a: 2, e: "PAYG micropayments turn a large upfront cost into small daily payments, unlocking mass adoption." },
  { q: "Why do venture capital investors strongly avoid financing solo engineering founders?", o: ["Solo founders demand higher equity shares.", "It introduces a critical 'bus-factor of one' or key-man risk where burn-out collapses the venture.", "Engineers cannot legally register professional corporate entities by themselves.", "Solo founders are ineligible for international hackathons."], a: 1, e: "A single founder represents a key-man risk — if they burn out, the whole venture can collapse." },
  { q: "What core engineering lesson is derived from the success of Flutterwave's unified payment API infrastructure?", o: ["Hard constraints require drone logistics.", "Ethical frameworks are primary engineering deliverables.", "Infrastructure wins over applications because foundational rails turn developers into distribution channels.", "Embedded IoT locks serve as consumer credit scores."], a: 2, e: "Building foundational infrastructure (payment rails) turns other developers into a distribution channel." },
  { q: "In the 30-Day Validation Sprint timeline, what specific milestones must be achieved by Week 2?", o: ["Build a functional bench prototype and establish structural matrices.", "Complete literature reviews and recruit complementary co-founders.", "Submit three accelerator applications and determine the customer acquisition cost.", "Finalize the Bill of Materials (BOM) and secure seed funding term sheets."], a: 1, e: "Week 2 of the sprint focuses on literature review and recruiting complementary co-founders." },
  // File 2: Computing in Engineering (Interdisciplinary Applications & Industry 4.0)
  { q: "Which industrial revolution paradigm is defined by the integration of Cyber-Physical Systems, AI, IoT, and cloud networks seamlessly optimizing physical assets?", o: ["Industry 1.0", "Industry 2.0", "Industry 3.0", "Industry 4.0"], a: 3, e: "Industry 4.0 is defined by CPS, AI, IoT, and cloud integration optimizing physical assets in real time." },
  { q: "What digital shift corresponds directly to replacing traditional manual drafting in modern engineering workflows?", o: ["AI Predictive Analytics", "Cloud Collaboration Platforms", "3D CAD & BIM Design", "Finite Element Simulations"], a: 2, e: "3D CAD and BIM tools have replaced manual drafting boards in engineering design." },
  { q: "A real-time virtual replica of a physical asset (such as a turbine or factory floor) continuously updated by live sensor data is known as a:", o: ["Parametric Assembly", "Digital Twin", "Discrete Event Node", "Micro-cloud Framework"], a: 1, e: "This is the definition of a Digital Twin." },
  { q: "Which specific analytical software tool is categorized under Computational Fluid Dynamics (CFD) for modeling fluid flow and heat transfer?", o: ["ANSYS Fluent", "SAP2000", "SolidWorks", "Aspen Plus"], a: 0, e: "ANSYS Fluent is a standard CFD tool for fluid flow and heat transfer modeling." },
  { q: "In the context of the Nigerian infrastructure paradox, what is the frugal solution for Mechatronics Engineering to overcome the high cost of imported PLCs?", o: ["Designing grid-reliant heavy assembly lines", "Using offline-first SQLite software nodes", "Building opto-isolated Arduino and ESP32 DIY automation kits running OpenPLC", "Implementing paper-based barcode telemetry workflows"], a: 2, e: "Opto-isolated Arduino/ESP32 kits running OpenPLC are a frugal substitute for costly imported PLCs." },
  { q: "Match the appropriate tool stack to Agricultural Engineering applications as listed in the course roadmap:", o: ["AutoCAD, Revit, ETABS", "ArcGIS, HYDRUS, Python/R", "Cadence, Verilog, Kali Linux", "Aspen Plus, HYSYS, Gaussian"], a: 1, e: "Agricultural Engineering's tool stack in the roadmap is ArcGIS, HYDRUS, and Python/R." },
  { q: "According to the 'Default-to-Off' rule in industrial cybersecurity and safety:", o: ["Cloud servers must disconnect during high FX volatility.", "Heavy machinery and remote pumps must power down automatically to safe states if a control signal drops.", "Engineers must write machine code using binary open-source configurations.", "Touchscreen interfaces must go dark when operating under solar power backup."], a: 1, e: "Default-to-Off means equipment fails safe — powering down automatically if control signal is lost." },
  { q: "According to the cross-disciplinary tool matrix, which project management tool is universally leveraged across fields like Civil, Chemical, and Mining Engineering?", o: ["Wireshark", "Minitab", "Primavera / MS Project", "OpenCV"], a: 2, e: "Primavera / MS Project is the cross-disciplinary project management tool used across these fields." },
  // File 3: Historical Development of Modern Computing & Its Role in Engineering
  { q: "Which pre-electronic era device, invented in 1801, used punched cards to control weaving patterns and served as a direct forerunner of programming?", o: ["Pascaline", "Jacquard Loom", "Difference Engine", "Hollerith Tabulator"], a: 1, e: "The Jacquard Loom (1801) used punched cards, foreshadowing programmable machines." },
  { q: "Who is historically recognized as the 'Architect of Modern Computers' due to defining the structural framework comprising the CPU, Memory, and I/O?", o: ["Charles Babbage", "Alan Turing", "John von Neumann", "Gordon Moore"], a: 2, e: "John von Neumann defined the CPU/Memory/I/O architecture underlying modern computers." },
  { q: "What primary electronic component characterized the First Generation of computers (1940s – 1956)?", o: ["Transistors", "Integrated Circuits", "Vacuum Tubes", "Microprocessors"], a: 2, e: "First-generation computers relied on vacuum tubes." },
  { q: "Gordon Moore's landmark observation (Moore's Law) proposed in 1965 states that:", o: ["Computer clock speeds double every 10 years.", "Software development speed increases exponentially with high-level languages.", "The number of transistors on a single silicon chip doubles approximately every 2 years.", "Cloud computing data capacity expands by 1.7MB every second per person."], a: 2, e: "Moore's Law: transistor counts on a chip roughly double every 2 years." },
  { q: "Which software suite is standard within Chemical Engineering for conducting steady-state and dynamic process simulations of distillation columns and reactors?", o: ["ASPEN HYSYS", "SolidWorks", "Surpac", "ETABS"], a: 0, e: "ASPEN HYSYS is the standard for chemical process simulation." },
  { q: "In Mining Engineering computing, which software tool is specifically used for implicit 3D geological modeling using wireframes and RBF algorithms?", o: ["Rocscience SLIDE", "Leapfrog Geo", "JKSimBlast", "Ventsim"], a: 1, e: "Leapfrog Geo performs implicit 3D geological modeling using wireframes and RBF algorithms." },
  { q: "Under the universal computing foundations, what programming languages are paired correctly with their typical engineering utilities?", o: ["Python → Performance-critical bare-metal code; C++ → Statistical data visualizations", "SQL → Real-time robot kinematics; MATLAB → Containerization frameworks", "Python → Data analysis and ML; C/C++ → Embedded performance-critical code", "BASIC → Micro-climate forecasting; Verilog → Linear programming models"], a: 2, e: "Python suits data analysis/ML; C/C++ suits embedded, performance-critical code." },
  { q: "Looking ahead into the future of engineering computing (2025–2035), what technology will allow optimal component geometries to be generated purely from functional constraints?", o: ["Neuromorphic edge processing", "Generative AI for Design", "Microscopic traffic network simulation", "Discrete Event Bottleneck mappings"], a: 1, e: "Generative AI for Design generates optimal geometries directly from functional constraints." },
];

const CPE102_SECTION_COUNTS = [12, 8, 8]; // Section 1, 2, 3 question counts (matches CPE102_NOTES order)

function tagCpe102Bank(rawBank, notes, sectionCounts) {
  const sectionOfIndex = [];
  sectionCounts.forEach((count, sIdx) => {
    for (let i = 0; i < count; i++) sectionOfIndex.push(sIdx + 1);
  });
  return rawBank.map((raw, i) => {
    const week = sectionOfIndex[i] || notes.length;
    const noteEntry = notes[week - 1];
    const topic = noteEntry ? noteEntry.title : "General";
    return {
      ...raw,
      id: "cpe102-" + i,
      week,
      topic,
      difficulty: classifyDifficulty(raw.q),
      ref: noteEntry ? `${noteEntry.week} Notes — ${noteEntry.title}` : "Course Notes",
    };
  });
}

const CPE102_QUESTIONS = tagCpe102Bank(CPE102_QUESTIONS_RAW, CPE102_NOTES, CPE102_SECTION_COUNTS);
const CPE102_WEEK_OPTIONS = CPE102_NOTES.map((n, i) => ({
  value: i + 1,
  label: n.week,
  title: n.title,
  count: CPE102_QUESTIONS.filter((q) => q.week === i + 1).length,
})).filter((w) => w.count > 0);

/* ----------------------------- COURSE DATA REGISTRY -----------------------------
   NOTE: question data is no longer looked up through a hardcoded registry. The raw
   CSC102/CPE102 question arrays above are retained only as historical/legacy content
   (they were the original seed data) and are no longer read by any screen — Practice
   Mode, Mock Exams, Flashcards, and the CBT Engine all pull live from Firestore via
   useLiveQuestions(). If you want that legacy content available in the app, import it
   through Admin → Question Bank → Bulk Import (paste the *_QUESTIONS_RAW array as
   JSON) rather than wiring it back into a lookup object here. */
const COURSE_NOTES_MAP = { CSC102: CSC102_NOTES, CPE102: CPE102_NOTES };

/* ----------------------------- LOCAL STORAGE HELPERS ----------------------------- */
/* CURRENT_USER_ID namespaces all per-user data (history, bookmarks, theme, etc.) so
   one user can never see another user's data on the same device. It's set on login /
   session-restore and cleared on logout. */
let CURRENT_USER_ID = null;
function userScopedKey(base) {
  return CURRENT_USER_ID ? `${base}_u${CURRENT_USER_ID}` : base;
}

function loadHistory(code) {
  try {
    const raw = localStorage.getItem(userScopedKey("futalearn_history_" + code));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistoryEntry(code, entry) {
  const existing = loadHistory(code);
  const updated = [entry, ...existing].slice(0, 30);
  try { localStorage.setItem(userScopedKey("futalearn_history_" + code), JSON.stringify(updated)); } catch {}
  return updated;
}
function loadBookmarks(code) {
  try {
    const raw = localStorage.getItem(userScopedKey("futalearn_bookmarks_" + code));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveBookmarks(code, list) {
  try { localStorage.setItem(userScopedKey("futalearn_bookmarks_" + code), JSON.stringify(list)); } catch {}
}

/* ----------------------------- SCANNING MODE — MY MISTAKES -----------------------------
   Every question a student answers incorrectly in Scanning Mode is stored here (full
   question snapshot, same shape as Bookmarks) so it can be reviewed later without needing
   a live Firestore read. Purely additive — no existing collection or field is touched. */
function loadMistakes(code) {
  try {
    const raw = localStorage.getItem(userScopedKey("futalearn_mistakes_" + code));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveMistakes(code, list) {
  try { localStorage.setItem(userScopedKey("futalearn_mistakes_" + code), JSON.stringify(list)); } catch {}
}
function addMistake(code, question) {
  const list = loadMistakes(code);
  const without = list.filter((m) => m.id !== question.id);
  const updated = [{ ...question, missedAt: new Date().toISOString() }, ...without].slice(0, 500);
  saveMistakes(code, updated);
  return updated;
}
function removeMistake(code, questionId) {
  const updated = loadMistakes(code).filter((m) => m.id !== questionId);
  saveMistakes(code, updated);
  return updated;
}

/* ----------------------------- SCANNING MODE — RESUME PROGRESS -----------------------------
   Local-first (instant, works offline) with a fire-and-forget Firestore mirror so progress
   also follows the student across devices, mirroring the existing examHistory pattern below.
   Never blocks the UI and never touches the questions/users schema beyond this one new
   sub-collection. */
function scanProgressKey(code) { return userScopedKey("futalearn_scanprogress_" + code); }
function loadScanProgress(code) {
  try {
    const raw = localStorage.getItem(scanProgressKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveScanProgress(code, progress) {
  try { localStorage.setItem(scanProgressKey(code), JSON.stringify(progress)); } catch {}
  saveScanProgressToFirestore(code, progress); // fire-and-forget cloud sync
}
function clearScanProgress(code) {
  try { localStorage.removeItem(scanProgressKey(code)); } catch {}
}
async function saveScanProgressToFirestore(code, progress) {
  if (!fbDb || !CURRENT_USER_ID) return;
  try {
    await fbDb.collection("users").doc(CURRENT_USER_ID).collection("scanProgress").doc(code).set(progress, { merge: true });
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] Scanning Mode progress sync failed:", err);
  }
}

/* ----------------------------- EXAM HISTORY (Firestore) -----------------------------
   Every finished exam is written to Firestore at users/{uid}/examHistory/{autoId}
   so a user's exam history follows them across devices, in addition to the
   localStorage cache above (which keeps Performance/History screens fast and
   working offline). Firestore writes are fire-and-forget from the screen's
   point of view — they never block finishing an exam. */

/* Builds the saved "review" snapshot for one finished exam — one entry per
   question, carrying enough of the question (type, options/answer key,
   acceptableAnswers, points) to re-render it later in Review Answers, plus
   what the learner actually submitted and how it was graded. Every question
   type is graded here through the single gradeQuestion() entry point, so
   review, results, and analytics can never disagree about a score. Essay
   questions come back with status "ungraded" until an Admin grades them. */
function buildReviewItems(questions, answers, marked) {
  return questions.map((q, i) => {
    const userAnswer = answers[i] !== undefined ? answers[i] : null;
    const { status, auto } = gradeQuestion(q, userAnswer);
    return {
      type: q.type, q: q.q, o: q.o, a: q.a, acceptableAnswers: q.acceptableAnswers,
      caseSensitive: q.caseSensitive, ignoreSpaces: q.ignoreSpaces,
      topic: q.topic, difficulty: q.difficulty, week: q.week, points: q.points,
      e: q.e, ref: q.ref,
      userAnswer,
      status, auto, graded: auto ? true : false, pointsEarned: status === "correct" ? q.points : 0,
      marked: !!(marked && marked.has && marked.has(i)),
    };
  });
}

async function saveExamHistoryToFirestore(entry) {
  if (!fbDb || !CURRENT_USER_ID) return;
  try {
    await fbDb.collection("users").doc(CURRENT_USER_ID).collection("examHistory").add({
      ...entry,
      date: firebase.firestore.FieldValue.serverTimestamp(),
      clientDate: entry.date,
    });
    EduSphere.Logger.firebase.info("[EduSphere] Exam history saved to Firestore");
  } catch (err) {
    EduSphere.Logger.firebase.error("[EduSphere] Couldn't save exam history to Firestore:", err);
  }
  try {
    const isExam = entry.mode === "cbt";
    await createNotification({
      recipientId: CURRENT_USER_ID,
      type: isExam ? "examCompleted" : "practiceCompleted",
      category: "cbt", priority: "normal",
      title: isExam ? "Exam completed" : "Practice completed",
      message: `You scored ${entry.pct}% (${entry.correct}/${entry.total}) in ${entry.course}.`,
      targetCollection: "examHistory", actionUrl: "examHistory",
    });
    if (entry.pct >= 80) {
      await createNotification({
        recipientId: CURRENT_USER_ID, type: "highScore", category: "cbt", priority: "normal",
        title: "High score! 🏆", message: `${entry.pct}% in ${entry.course} — great work!`,
        targetCollection: "examHistory", actionUrl: "examHistory",
      });
    }
  } catch (err) { EduSphere.Logger.error("[EduSphere] exam-completion notification failed:", err); }
}

async function fetchExamHistory(max = 50) {
  if (!fbDb || !CURRENT_USER_ID) return [];
  const snap = await fbDb.collection("users").doc(CURRENT_USER_ID)
    .collection("examHistory").orderBy("date", "desc").limit(max).get();
  return snap.docs.map((d) => {
    const data = d.data();
    let dateIso = data.clientDate || new Date().toISOString();
    try {
      if (data.date && typeof data.date.toDate === "function") dateIso = data.date.toDate().toISOString();
    } catch {}
    return { id: d.id, ...data, date: dateIso };
  });
}

/* ----------------------------- AUTH: FIREBASE BACKEND LAYER -----------------------------
   EduSphere is backed by Firebase Authentication (email/password) and Cloud Firestore.

   Firestore "users" collection — one document per account, keyed by uid:
     { uid, fullName, email, phoneNumber, dateCreated, profilePhoto }

   These functions keep the same names/shapes the screens already call
   (registerUser, loginUser, resetPasswordFor, updateUserRecord, etc.) so none
   of the screen components below needed to change — only what happens inside
   these functions changed, from localStorage to real Firebase calls.

   Note on "Email or Phone Number": Firebase Authentication signs people in with
   an email address, so account creation and login both require a valid email.
   Phone number is kept as a separate profile field (editable from Edit Profile)
   rather than as a sign-in identifier. */

function normalizeIdentifier(id) { return (id || "").trim().toLowerCase(); }
function isEmailFormat(id) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((id || "").trim()); }
function isPhoneFormat(id) { return /^[0-9+][0-9\s-]{6,}$/.test((id || "").trim()); }

/* Converts a Firestore "users" doc into the flat shape the screens expect
   (id, fullName, email, phone, photo, dateJoined). */
function mapFirestoreUser(uid, data) {
  data = data || {};
  let dateJoined = new Date().toISOString();
  try {
    if (data.dateCreated && typeof data.dateCreated.toDate === "function") {
      dateJoined = data.dateCreated.toDate().toISOString();
    } else if (data.dateCreated) {
      dateJoined = data.dateCreated;
    }
  } catch {}
  let lastLogin = null;
  try {
    if (data.lastLogin && typeof data.lastLogin.toDate === "function") {
      lastLogin = data.lastLogin.toDate().toISOString();
    } else if (data.lastLogin) {
      lastLogin = data.lastLogin;
    }
  } catch {}
  return {
    id: uid,
    fullName: data.fullName || "",
    email: data.email || "",
    phone: data.phoneNumber || "",
    photo: data.profilePhoto || null,
    dateJoined,
    lastLogin,
    suspended: !!data.suspended,
    deleted: !!data.deleted,
    school: data.school || null,
    department: data.department || null,
    level: data.level || null,
    registeredCourses: Array.isArray(data.registeredCourses) ? data.registeredCourses : [],
    profileCompleted: !!data.profileCompleted,
    onboardingPromptShown: !!data.onboardingPromptShown,
    themePref: data.themePref || null,
    communitySuspended: !!data.communitySuspended,
    banned: !!data.banned,
    banReason: data.banReason || null,
    warningCount: data.warningCount || 0,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}

async function fetchUserProfile(uid) {
  const snap = await fbDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return mapFirestoreUser(uid, snap.data());
}

function getUserById(userId) {
  // Kept only for compatibility with any lingering callers. Real lookups now
  // go through fetchUserProfile (async, reads Firestore) via onAuthStateChanged.
  return null;
}

// createUserWithEmailAndPassword automatically signs the new account in for a
// moment before we deliberately sign it back out (see registerUser below).
// This flag tells the onAuthStateChanged listener in the root component to
// ignore that brief blip so the screen doesn't flicker to "home" and back.
let SUPPRESS_AUTH_NAV = false;

async function registerUser({ fullName, identifier, password }) {
  EduSphere.Logger.info("[EduSphere] User registration started");
  const email = normalizeIdentifier(identifier);
  if (!isEmailFormat(email)) {
    EduSphere.Logger.error("[EduSphere] User registration failed: invalid email format");
    return { ok: false, error: "Please enter a valid email address to create an account." };
  }
  if (FIREBASE_INIT_ERROR || !fbAuth || !fbDb) {
    const msg = "Can't create an account right now — Firebase isn't connected (" + (FIREBASE_INIT_ERROR || "unknown error") + ").";
    EduSphere.Logger.error("[EduSphere] User registration failed:", msg);
    return { ok: false, error: msg };
  }
  SUPPRESS_AUTH_NAV = true;
  try {
    // Every Firebase call below is raced against a timeout so a stalled
    // network connection can never leave the "Creating account..." spinner
    // running forever — it always resolves one way or the other.
    const cred = await withTimeout(
      fbAuth.createUserWithEmailAndPassword(email, password),
      15000,
      "Account creation"
    );
    const uid = cred.user.uid;
    const trimmedName = fullName.trim();
    try { await withTimeout(cred.user.updateProfile({ displayName: trimmedName }), 8000, "Profile name update"); } catch {}
    const profileDoc = {
      uid,
      fullName: trimmedName,
      email,
      phoneNumber: "",
      dateCreated: firebase.firestore.FieldValue.serverTimestamp(),
      profilePhoto: null,
      school: null,
      department: null,
      level: null,
      registeredCourses: [],
      profileCompleted: false,
      onboardingPromptShown: false,
      // Module 1.4 Phase 2: every new account starts on Dark Theme by default.
      // Existing accounts are untouched (this key is only ever set here, at creation).
      themePref: "dark",
    };
    await withTimeout(fbDb.collection("users").doc(uid).set(profileDoc), 15000, "Saving profile to Firestore");
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationsBatch(adminIds, {
        type: "userRegistered", category: "admin", priority: "normal",
        title: "New user registered", message: `${trimmedName} (${email}) just signed up.`,
        targetCollection: "users", targetDocumentId: uid, actionUrl: "adminUsers",
      });
    } catch (err) { EduSphere.Logger.error("[EduSphere] registration notification failed:", err); }
    // Registration only creates the account — the user still logs in
    // explicitly afterwards, matching the existing "redirect to login" UX.
    await withTimeout(fbAuth.signOut(), 8000, "Sign-out after registration");
    EduSphere.Logger.info("[EduSphere] User registration successful:", uid);
    return {
      ok: true,
      user: { id: uid, fullName: trimmedName, email, phone: "", photo: null, dateJoined: new Date().toISOString() },
    };
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] User registration failed:", (err && (err.code + ": " + err.message)) || err);
    try { await fbAuth.signOut(); } catch {}
    return { ok: false, error: firebaseAuthErrorMessage(err) };
  } finally {
    SUPPRESS_AUTH_NAV = false;
  }
}

async function loginUser({ identifier, password, remember = true }) {
  const email = normalizeIdentifier(identifier);
  if (!isEmailFormat(email)) {
    EduSphere.Logger.auth.error("[EduSphere] Login failed: invalid email format");
    return { ok: false, error: "Please sign in with the email address you registered with." };
  }
  if (FIREBASE_INIT_ERROR || !fbAuth || !fbDb) {
    const msg = "Can't sign in right now — Firebase isn't connected (" + (FIREBASE_INIT_ERROR || "unknown error") + ").";
    EduSphere.Logger.auth.error("[EduSphere] Login failed:", msg);
    return { ok: false, error: msg };
  }
  try {
    await withTimeout(
      fbAuth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION),
      8000,
      "Setting session persistence"
    );
    const cred = await withTimeout(fbAuth.signInWithEmailAndPassword(email, password), 15000, "Sign-in");
    let profile;
    try {
      profile = await withTimeout(fetchUserProfile(cred.user.uid), 10000, "Fetching profile");
    } catch (profileErr) {
      EduSphere.Logger.auth.error("[EduSphere] Couldn't fetch Firestore profile after login:", profileErr);
      profile = null;
    }
    if (!profile) {
      // Auth account exists but its Firestore profile is missing (or
      // unreachable) — recreate/merge a minimal one so the rest of the app
      // has something to work with instead of failing the whole login.
      const fallbackDoc = {
        uid: cred.user.uid,
        fullName: cred.user.displayName || "",
        email,
        phoneNumber: "",
        dateCreated: firebase.firestore.FieldValue.serverTimestamp(),
        profilePhoto: null,
        school: null,
        department: null,
        level: null,
        registeredCourses: [],
        profileCompleted: false,
        onboardingPromptShown: false,
      };
      try {
        await withTimeout(fbDb.collection("users").doc(cred.user.uid).set(fallbackDoc, { merge: true }), 10000, "Saving fallback profile");
      } catch (saveErr) {
        EduSphere.Logger.error("[EduSphere] Couldn't save fallback profile (continuing with local data only):", saveErr);
      }
      profile = mapFirestoreUser(cred.user.uid, fallbackDoc);
    }
    if ((profile.suspended || profile.deleted || profile.banned) && !isAdminEmail(email)) {
      EduSphere.Logger.auth.warn("[EduSphere] Login blocked — account is", profile.deleted ? "deleted" : profile.banned ? "banned" : "suspended");
      await fbAuth.signOut();
      return {
        ok: false,
        error: profile.deleted
          ? "This account has been removed. Contact support if you believe this is a mistake."
          : profile.banned
          ? `This account has been banned${profile.banReason ? `: ${profile.banReason}` : ""}. Contact support if you believe this is a mistake.`
          : "This account has been suspended. Contact support for help.",
      };
    }
    try {
      await fbDb.collection("users").doc(cred.user.uid).set(
        { lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }
      );
      profile.lastLogin = new Date().toISOString();
    } catch (llErr) {
      EduSphere.Logger.auth.warn("[EduSphere] Couldn't record last login:", llErr);
    }
    EduSphere.Logger.auth.info("[EduSphere] Login successful:", cred.user.uid);
    return { ok: true, user: profile };
  } catch (err) {
    EduSphere.Logger.auth.error("[EduSphere] Login failed:", (err && (err.code + ": " + err.message)) || err);
    return { ok: false, error: firebaseAuthErrorMessage(err) };
  }
}

/* ----------------------------- ONBOARDING (Academic Profile) ----------------------------- */
async function saveOnboardingProfile(uid, { school, department, level, registeredCourses, completed }) {
  if (!fbDb || !uid) return { ok: false, error: "Not signed in." };
  try {
    await withTimeout(fbDb.collection("users").doc(uid).set({
      school: school || null,
      department: department || null,
      level: level || null,
      registeredCourses: Array.isArray(registeredCourses) ? registeredCourses : [],
      profileCompleted: !!completed,
      onboardingPromptShown: true,
    }, { merge: true }), 15000, "Saving academic profile");
    return { ok: true };
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] Saving academic profile failed:", err);
    return { ok: false, error: "Couldn't save your academic info. Please try again." };
  }
}

async function dismissOnboardingPrompt(uid) {
  if (!fbDb || !uid) return;
  try {
    await fbDb.collection("users").doc(uid).set({ onboardingPromptShown: true }, { merge: true });
  } catch (err) {
    EduSphere.Logger.warn("[EduSphere] Couldn't record onboarding dismissal:", err);
  }
}

/* Real Firebase password resets happen via an emailed link — the client can't
   silently overwrite another account's password. This sends that email. */
async function resetPasswordFor(identifier) {
  const email = normalizeIdentifier(identifier);
  if (!isEmailFormat(email)) {
    return { ok: false, error: "Enter the email address on your account." };
  }
  try {
    await fbAuth.sendPasswordResetEmail(email);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: firebaseAuthErrorMessage(err) };
  }
}

/* Updates the Firestore profile doc (fullName / phoneNumber / profilePhoto).
   Email changes are handled separately since they also touch Firebase Auth. */
async function updateUserRecord(userId, updates) {
  const firestoreUpdates = {};
  if (updates.fullName !== undefined) firestoreUpdates.fullName = updates.fullName;
  if (updates.phone !== undefined) firestoreUpdates.phoneNumber = updates.phone;
  if (updates.photo !== undefined) firestoreUpdates.profilePhoto = updates.photo;

  if (updates.email !== undefined && fbAuth.currentUser && updates.email !== fbAuth.currentUser.email) {
    await fbAuth.currentUser.updateEmail(updates.email); // throws on failure (handled by caller)
    firestoreUpdates.email = updates.email;
  }

  await fbDb.collection("users").doc(userId).set(firestoreUpdates, { merge: true });
  return fetchUserProfile(userId);
}

/* Permanently deletes the signed-in user's account: Firebase requires a
   "recent login" for security-sensitive operations like account deletion, so
   the user's password is re-collected and used to reauthenticate right
   before deleting — this proves the current session hasn't gone stale.
   On success: the Firestore profile doc is removed, then the Firebase Auth
   account itself, then the caller (UI) is expected to redirect to Login. */
async function deleteUserAccount({ password }) {
  const fbUser = fbAuth.currentUser;
  if (!fbUser) {
    return { ok: false, error: "You're not signed in. Please log in again and retry." };
  }
  try {
    const credential = firebase.auth.EmailAuthProvider.credential(fbUser.email, password);
    await withTimeout(fbUser.reauthenticateWithCredential(credential), 15000, "Re-authentication");
  } catch (err) {
    EduSphere.Logger.auth.error("[EduSphere] Account deletion — re-authentication failed:", (err && (err.code + ": " + err.message)) || err);
    return { ok: false, error: firebaseAuthErrorMessage(err) };
  }
  try {
    const uid = fbUser.uid;
    try {
      await withTimeout(fbDb.collection("users").doc(uid).delete(), 15000, "Deleting profile data");
    } catch (docErr) {
      // Don't block account deletion on a Firestore hiccup — the Auth
      // account is the source of truth for "does this account still exist".
      EduSphere.Logger.auth.error("[EduSphere] Couldn't delete Firestore profile (continuing with Auth deletion):", docErr);
    }
    await withTimeout(fbUser.delete(), 15000, "Deleting account");
    EduSphere.Logger.info("[EduSphere] Account permanently deleted:", uid);
    return { ok: true };
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] Account deletion failed:", (err && (err.code + ": " + err.message)) || err);
    return { ok: false, error: firebaseAuthErrorMessage(err) };
  }
}

/* Session persistence is now handled natively by Firebase Auth (see
   fbAuth.setPersistence in loginUser, and the onAuthStateChanged listener in
   the root EduSphere component) — "Remember Me" maps to LOCAL vs SESSION
   persistence, and the user stays signed in until they explicitly log out. */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
/* Shuffle a question's options while keeping track of the correct answer(s).
   Only meaningful for types that actually have an options list (mcq,
   trueFalse, multiSelect) — shortAnswer/fillBlank/essay pass through
   untouched since they have no options to reorder. */
function shuffleOptions(question) {
  if (!Array.isArray(question.o) || question.o.length === 0) return question;
  const order = shuffle(question.o.map((_, i) => i));
  const newOptions = order.map((origIdx) => question.o[origIdx]);
  if (question.type === "multiSelect") {
    const correctSet = new Set((Array.isArray(question.a) ? question.a : []).map(Number));
    const newAnswerIdxs = order.map((origIdx, newIdx) => (correctSet.has(origIdx) ? newIdx : null)).filter((v) => v !== null);
    return { ...question, o: newOptions, options: newOptions, a: newAnswerIdxs, answer: newAnswerIdxs };
  }
  const newAnswerIdx = order.indexOf(question.a);
  return { ...question, o: newOptions, options: newOptions, a: newAnswerIdx, answer: newAnswerIdx };
}

/* ----------------------------- SAFE MINI CALCULATOR ENGINE ----------------------------- */
function safeEvaluate(expr) {
  if (!expr) return 0;
  let cleaned = expr.replace(/×/g, "*").replace(/÷/g, "/");
  // Percentage: turn "50%" into "(50/100)"
  cleaned = cleaned.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
  if (!/^[0-9+\-*/().\s]*$/.test(cleaned)) throw new Error("Invalid expression");
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${cleaned || 0});`)();
  if (typeof result !== "number" || !isFinite(result)) throw new Error("Invalid result");
  return result;
}

function CalculatorWidget({ onClose }) {
  const [expr, setExpr] = useState("");
  const [display, setDisplay] = useState("0");
  const [pos, setPos] = useState({ x: 20, y: 90 });
  const dragRef = useRef(null);

  const startDrag = (e) => {
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: point.clientX, startY: point.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("touchmove", onDrag, { passive: false });
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
  };
  const onDrag = (e) => {
    if (!dragRef.current) return;
    if (e.touches) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    setPos({ x: Math.max(4, dragRef.current.origX + dx), y: Math.max(4, dragRef.current.origY + dy) });
  };
  const endDrag = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("touchmove", onDrag);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchend", endDrag);
  };

  const press = (val) => {
    if (val === "C") { setExpr(""); setDisplay("0"); return; }
    if (val === "DEL") { setExpr((e) => e.slice(0, -1)); return; }
    if (val === "=") {
      try { const r = safeEvaluate(expr); setDisplay(String(r)); setExpr(String(r)); }
      catch { setDisplay("Error"); }
      return;
    }
    if (val === "√") {
      try { const r = Math.sqrt(safeEvaluate(expr || display)); setDisplay(String(r)); setExpr(String(r)); }
      catch { setDisplay("Error"); }
      return;
    }
    setExpr((e) => e + val);
  };

  useEffect(() => { setDisplay(expr || "0"); }, [expr]);

  const keys = [
    ["(", ")", "%", "√"],
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    ["0", ".", "DEL", "+"],
  ];

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, width: 240, zIndex: 60,
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
      boxShadow: "0 12px 30px rgba(0,0,0,0.25)", overflow: "hidden", userSelect: "none",
    }}>
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        style={{
          background: C.primary, color: "#fff", padding: "9px 12px", display: "flex",
          alignItems: "center", justifyContent: "space-between", cursor: "grab", fontSize: 12.5, fontWeight: 700,
        }}>
        <span><Calculator size={13} /> Calculator</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 15, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: "12px 12px 6px", background: C.cardAlt, textAlign: "right", fontSize: 20, fontWeight: 800, color: C.text, minHeight: 30, overflowX: "auto", whiteSpace: "nowrap" }}>
        {display}
      </div>
      <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {keys.flat().map((k) => (
          <button key={k} onClick={() => press(k)} style={{
            padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`,
            background: ["÷", "×", "-", "+", "="].includes(k) ? C.primary : C.bg,
            color: ["÷", "×", "-", "+", "="].includes(k) ? "#fff" : C.text,
            fontSize: 13.5, fontWeight: 700, cursor: "pointer",
          }}>{k}</button>
        ))}
        <button onClick={() => press("=")} style={{
          gridColumn: "span 4", padding: "10px 0", borderRadius: 10, border: "none",
          background: C.success, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
        }}>=</button>
        <button onClick={() => press("C")} style={{
          gridColumn: "span 4", padding: "8px 0", borderRadius: 10, border: `1px solid ${C.border}`,
          background: "transparent", color: C.danger, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>Clear</button>
      </div>
    </div>
  );
}

/* ----------------------------- SHARED UI BITS ----------------------------- */
function TopBar({ title, onBack, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 16px 14px", background: C.primary, color: "#fff",
      position: "sticky", top: 0, zIndex: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back" style={iconBtnStyle}>
            <ArrowLeft size={20} color="#fff" />
          </button>
        )}
        <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>
      </div>
      {right || <div style={{ width: 20 }} />}
    </div>
  );
}
const iconBtnStyle = {
  background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
  width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

/* Real-time unread counter — one onSnapshot listener, reused by the bell. */
function useUnreadNotificationCount(uid) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!fbDb || !uid) { setCount(0); return undefined; }
    const unsubscribe = fbDb.collection("notifications")
      .where("recipientId", "==", uid).where("isDeleted", "==", false).where("isRead", "==", false)
      .onSnapshot(
        (snap) => setCount(snap.size),
        (err) => { EduSphere.Logger.error("[EduSphere] Unread notification listener failed:", err); setCount(0); }
      );
    return () => unsubscribe();
  }, [uid]);
  return count;
}

function NotificationBell({ uid, onClick, size = 20, dark }) {
  const unread = useUnreadNotificationCount(uid);
  return (
    <button onClick={onClick} aria-label="Notifications" style={{
      position: "relative", width: 40, height: 40, borderRadius: 12,
      background: dark ? "rgba(255,255,255,0.15)" : C.card, border: dark ? "none" : `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      <Bell size={size} color={dark ? "#fff" : C.primary} />
      {unread > 0 && (
        <span style={{
          position: "absolute", top: 3, right: 3, minWidth: 16, height: 16, borderRadius: 8,
          background: C.danger, color: "#fff", fontSize: 9.5, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
        }}>{unread > 99 ? "99+" : unread}</span>
      )}
    </button>
  );
}

function BottomNav({ active, onNav }) {
  const items = [
    { key: "home", label: "Home", Icon: Home },
    { key: "courses", label: "Courses", Icon: BookOpen },
    { key: "community", label: "Community", Icon: Users },
    { key: "results", label: "Results", Icon: BarChart3 },
    { key: "profile", label: "Profile", Icon: User },
  ];
  return (
    <div style={{
      position: "sticky", bottom: 0, background: C.card, borderTop: `1px solid ${C.border}`,
      display: "flex", justifyContent: "space-around", padding: "8px 0 10px", zIndex: 5,
    }}>
      {items.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button key={key} onClick={() => onNav(key)} style={{
            background: "none", border: "none", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, cursor: "pointer", color: isActive ? C.primary : C.textFaint,
          }}>
            <Icon size={20} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MenuTile({ Icon, label, sub, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "flex-start",
      gap: 8, cursor: disabled ? "default" : "pointer", textAlign: "left",
      opacity: disabled ? 0.5 : 1, boxShadow: "0 1px 2px rgba(21,101,192,0.06)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={C.primary} />
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSoft, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}

function ListRow({ title, subtitle, onClick, right, badge }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "13px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
      cursor: "pointer", marginBottom: 10,
    }}>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          {badge && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: C.primary, background: C.bg,
              padding: "2px 7px", borderRadius: 20, border: `1px solid ${C.border}`,
            }}>{badge}</span>
          )}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right || <ChevronRight size={18} color={C.textFaint} />}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.textSoft }}>
      <Layers size={30} color={C.textFaint} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13.5 }}>{text}</div>
    </div>
  );
}

function Checkbox({ checked, label, sub, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      background: checked ? C.bg : C.card, border: `1.5px solid ${checked ? C.primary : C.border}`,
      borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", border: `2px solid ${checked ? C.primary : C.border}`,
        background: checked ? C.primary : "transparent", color: "#fff", fontSize: 12, fontWeight: 800,
      }}>{checked ? "✓" : ""}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSoft }}>{sub}</div>}
      </div>
    </button>
  );
}

function RadioRow({ checked, label, sub, onSelect }) {
  return (
    <button onClick={onSelect} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      background: checked ? C.bg : C.card, border: `1.5px solid ${checked ? C.primary : C.border}`,
      borderRadius: 14, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", border: `2px solid ${checked ? C.primary : C.border}`,
      }}>
        {checked && <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary }} />}
      </span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSoft }}>{sub}</div>}
      </div>
    </button>
  );
}

function Modal({ children, onClose }) {
  // Module 1.4 Phase 1: the overlay owns the scroll (overscroll-behavior: contain stops
  // it from chaining into the page behind it — no more locked background scroll), and
  // the card itself scrolls internally with momentum once its content is taller than
  // the viewport, instead of the whole modal getting clipped or freezing.
  return (
    <div className="flScrollY" style={{
      position: "fixed", inset: 0, background: C.overlay, zIndex: 70,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      overscrollBehavior: "contain",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flScrollY" style={{
        background: C.card, borderRadius: 18, padding: 20, width: "100%", maxWidth: 360,
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)", maxHeight: "85vh", overscrollBehavior: "contain",
      }}>
        {children}
      </div>
    </div>
  );
}

function CourseMarquee({ courses }) {
  const [paused, setPaused] = useState(false);
  const text = "Available Courses:  " + courses.map((c) => c.code).join("  •  ") + "  •  ";
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      style={{
        overflow: "hidden", background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "9px 0", marginBottom: 18,
      }}
    >
      <div style={{
        display: "flex", width: "max-content",
        animation: "flMarquee 24s linear infinite",
        animationPlayState: paused ? "paused" : "running",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, whiteSpace: "nowrap", paddingRight: 24 }}>{text}</span>
        <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 700, color: C.primary, whiteSpace: "nowrap", paddingRight: 24 }}>{text}</span>
      </div>
    </div>
  );
}

/* ----------------------------- SMART INFO CAROUSEL (Home) -----------------------------
   Replaces the old static "Course Resource Status" / "Coming Soon" blocks with one
   animated, auto-rotating card that pulls live data straight from Firestore — no
   refresh, no redeploy. It reads:

   - announcements/{autoId}: { title, message, type:"announcement", priority, startDate,
     endDate, active }. An announcement is shown only while active === true (falls back
     to the legacy `published` field if `active` is absent) AND today falls between
     startDate/endDate (either bound is optional). It disappears automatically once
     endDate passes — no code change needed.
   - exams/{autoId} (new, optional): { courseCode, title, startAt, active }. Add a
     document here for any upcoming CBT/test and it appears in the "Upcoming Exam" slide
     the moment it's written.
   - courses / questions / notes / flashcards (existing collections) power the
     "Course Ready", "New Course", "Featured Course" and "Statistics" slides.

   Priority order in the rotation: urgent/emergency announcements → other announcements
   → upcoming exam → newly uploaded resources → newly added course → featured course →
   statistics (always last, always present). */

function toJsDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch { return null; } }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function sortKeyDate(v) {
  const d = toJsDate(v);
  return d ? d.getTime() : 0;
}

function usePageVisible() {
  const [visible, setVisible] = useState(typeof document === "undefined" ? true : !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/* Combines a date-only Firestore field with an optional "HH:MM" time-of-day field into
   one real Date — used for both start and expiry so admins can schedule to the minute. */
function combineDateAndTime(dateVal, timeStr) {
  const d = toJsDate(dateVal);
  if (!d) return null;
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map(Number);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
  }
  return d;
}

/* Module 1.4 Phase 3 — does this item's target audience include this user? "Everyone"
   (or no audience set at all, for backward compatibility with pre-Module-1.4 items)
   always matches. Every other mode requires the matching profile field. */
function announcementMatchesAudience(a, user) {
  const audience = a.audience || "everyone";
  if (audience === "everyone") return true;
  if (!user) return false;
  switch (audience) {
    case "school": return !!a.audienceValue && a.audienceValue === user.school;
    case "department": return !!a.audienceValue && a.audienceValue === user.department;
    case "level": return !!a.audienceValue && a.audienceValue === user.level;
    case "semester": return !!a.audienceValue && a.audienceValue === user.semester;
    case "course": return !!a.audienceValue && Array.isArray(user.registeredCourses) && user.registeredCourses.includes(a.audienceValue);
    case "students": return Array.isArray(a.audienceStudentIds) && a.audienceStudentIds.includes(user.id);
    default: return true;
  }
}

/* Active, in-date, audience-matched announcements only — this is what the carousel
   rotates through. Pass the logged-in user (or null while signed out / on shared
   screens) so targeted items only ever show to the audience the admin picked. */
function useLiveAnnouncements(user) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubscribe = fbDb.collection("announcements").onSnapshot(
      (snap) => {
        const now = new Date();
        const live = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => {
            const active = a.active !== undefined ? !!a.active : (a.published !== undefined ? !!a.published : true);
            if (!active) return false;
            const start = combineDateAndTime(a.startDate, a.startTime);
            if (start && now < start) return false;
            const end = combineDateAndTime(a.endDate, a.expiryTime);
            if (end) {
              const endMoment = a.expiryTime ? end : new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
              if (now > endMoment) return false;
            }
            return announcementMatchesAudience(a, user);
          })
          .map((a) => {
            // 4-tier priority per spec: Urgent > High > Normal > Low. `important` kept
            // as a legacy alias for `high` so pre-upgrade documents still sort correctly.
            const p = (a.priority || "normal").toLowerCase();
            const tierMap = { urgent: 0, emergency: 0, high: 1, important: 1, normal: 2, low: 3 };
            const tier = tierMap[p] !== undefined ? tierMap[p] : 2;
            const urgent = tier === 0;
            return { ...a, message: a.message || a.body || "", urgent, tier };
          })
          .sort((a, b) => a.tier - b.tier || sortKeyDate(b.createdAt) - sortKeyDate(a.createdAt));
        setItems(live.slice(0, 5));
      },
      (err) => { EduSphere.Logger.error("[EduSphere] Announcements listener failed:", err); setItems([]); }
    );
    return () => unsubscribe();
  }, [user && user.id, user && user.school, user && user.department, user && user.level, user && user.semester]);
  return items;
}

/* Module 1.4 Phase 3 — admin-curated "Course Showcase" cards for the homepage (replaces
   the old hardcoded Available Courses concept). Live Firestore listener: any add /
   remove / reorder / feature toggle from the Homepage Manager appears instantly on
   every connected device, no refresh. Hidden items and hard-deleted courses are
   filtered out here so the UI never needs to think about it. */
function useLiveCourseShowcase() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubscribe = fbDb.collection("courseShowcase").orderBy("order", "asc").onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.hidden);
        setItems(list);
      },
      (err) => { EduSphere.Logger.error("[EduSphere] Course showcase listener failed:", err); setItems([]); }
    );
    return () => unsubscribe();
  }, []);
  return items;
}

function useLiveExams() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubscribe = fbDb.collection("exams").onSnapshot(
      (snap) => {
        const grace = new Date(Date.now() - 6 * 3600 * 1000);
        const upcoming = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => e.active !== false)
          .map((e) => ({ ...e, startAt: toJsDate(e.startAt || e.startDate) }))
          .filter((e) => e.startAt && e.startAt >= grace)
          .sort((a, b) => a.startAt - b.startAt);
        setItems(upcoming.slice(0, 3));
      },
      (err) => { EduSphere.Logger.error("[EduSphere] Exams listener failed:", err); setItems([]); }
    );
    return () => unsubscribe();
  }, []);
  return items;
}

/* Live per-course resource counts, so "485 Questions Available" style figures update
   the instant an admin uploads/removes questions, notes, or flashcards — anywhere. */
function useLiveResourceIndex() {
  const [index, setIndex] = useState({ questionCounts: {}, notesCourses: {}, flashcardsCourses: {} });
  useEffect(() => {
    if (!fbDb) return undefined;
    const unsubQ = fbDb.collection("questions").onSnapshot((snap) => {
      const map = {};
      snap.forEach((d) => { const c = (d.data() || {}).courseCode; if (c) map[c] = (map[c] || 0) + 1; });
      setIndex((prev) => ({ ...prev, questionCounts: map }));
    }, (err) => EduSphere.Logger.error("[EduSphere] Question index listener failed:", err));
    const unsubN = fbDb.collection("notes").onSnapshot((snap) => {
      const map = {};
      snap.forEach((d) => { const c = (d.data() || {}).courseCode; if (c) map[c] = true; });
      setIndex((prev) => ({ ...prev, notesCourses: map }));
    }, (err) => EduSphere.Logger.error("[EduSphere] Notes index listener failed:", err));
    const unsubF = fbDb.collection("flashcards").onSnapshot((snap) => {
      const map = {};
      snap.forEach((d) => { const c = (d.data() || {}).courseCode; if (c) map[c] = true; });
      setIndex((prev) => ({ ...prev, flashcardsCourses: map }));
    }, (err) => EduSphere.Logger.error("[EduSphere] Flashcards index listener failed:", err));
    return () => { unsubQ(); unsubN(); unsubF(); };
  }, []);
  return index;
}

/* Reuses the existing per-user notifications stream (every "courseNew" notification is
   already fanned out to every student the moment Courses Manager adds a course) as the
   live signal for the "Newly Added Course" slide — accurate down to the second, with no
   new write path needed. */
function useLatestNewCourseNotification(uid) {
  const [item, setItem] = useState(null);
  useEffect(() => {
    if (!fbDb || !uid) { setItem(null); return undefined; }
    const unsubscribe = fbDb.collection("notifications")
      .where("recipientId", "==", uid).where("type", "==", "courseNew")
      .orderBy("createdAt", "desc").limit(1)
      .onSnapshot(
        (snap) => setItem(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }),
        (err) => { EduSphere.Logger.error("[EduSphere] New-course notification listener failed:", err); setItem(null); }
      );
    return () => unsubscribe();
  }, [uid]);
  return item;
}

function CarouselSlideBadge({ slide }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${slide.accent}1A`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 17 }}>{slide.icon}</span>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: slide.accent }}>{slide.eyebrow}</div>
      {slide.urgent && (
        <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: "#fff", background: C.danger, borderRadius: 5, padding: "2px 6px" }}>LIVE</span>
      )}
    </div>
  );
}

function CarouselSlideContent({ slide }) {
  if (slide.kind === "announcement") {
    const fontScale = { small: 0.9, normal: 1, large: 1.15 }[slide.fontSize] || 1;
    const wrapStyle = slide.bgColor ? { background: slide.bgColor, borderRadius: 14, padding: 12, margin: -12 } : {};
    return (
      <div style={wrapStyle}>
        <CarouselSlideBadge slide={slide} />
        <div style={{ fontSize: 15 * fontScale, fontWeight: 800, color: slide.textColor || C.text, marginBottom: 6 }}>{slide.title}</div>
        <div style={{ fontSize: 12.5 * fontScale, color: slide.textColor || C.textSoft, lineHeight: 1.55 }}>{slide.body}</div>
      </div>
    );
  }
  if (slide.kind === "resource") {
    return (
      <div>
        <CarouselSlideBadge slide={slide} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>{slide.code}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: C.success, marginBottom: 8, flexWrap: "wrap" }}>
          <span>✔ Questions</span><span>✔ Notes</span><span>✔ Flashcards</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{slide.questionCount.toLocaleString()} Questions Available</div>
      </div>
    );
  }
  if (slide.kind === "new") {
    return (
      <div>
        <CarouselSlideBadge slide={slide} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>{slide.code}</div>
        <div style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.55 }}>
          {slide.questionCount > 0 ? "Questions are now available. Tap to begin learning." : "Course materials are being prepared — check back soon."}
        </div>
      </div>
    );
  }
  if (slide.kind === "exam") {
    const d = slide.startAt;
    const dayLabel = d ? d.toLocaleDateString(undefined, { weekday: "long" }) : "TBA";
    const timeLabel = d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
    return (
      <div>
        <CarouselSlideBadge slide={slide} />
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>{slide.title}</div>
        <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 2 }}>Starts:</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{dayLabel}{timeLabel ? ` · ${timeLabel}` : ""}</div>
      </div>
    );
  }
  if (slide.kind === "featured") {
    return (
      <div>
        <CarouselSlideBadge slide={slide} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>{slide.code}</div>
        <div style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.5 }}>{slide.name}</div>
      </div>
    );
  }
  // stats
  const stats = [
    ["Courses Ready", slide.coursesReady],
    ["Questions Available", slide.questionsTotal],
    ["Students Practising", slide.studentsTotal],
  ];
  return (
    <div>
      <CarouselSlideBadge slide={slide} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {stats.map(([label, val]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{val === null || val === undefined ? "…" : val.toLocaleString()}</div>
            <div style={{ fontSize: 9.5, color: C.textSoft, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartInfoCarousel({ go, courses, user }) {
  const announcements = useLiveAnnouncements(user);
  const exams = useLiveExams();
  const resourceIndex = useLiveResourceIndex();
  const questionsTotal = useLiveCount("questions");
  const studentsTotal = useLiveCount("users");
  const newCourseNotif = useLatestNewCourseNotification(CURRENT_USER_ID);
  const pageVisible = usePageVisible();

  const [openAnnouncement, setOpenAnnouncement] = useState(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [archive, setArchive] = useState(null);

  useEffect(() => {
    if (!showAllAnnouncements || !fbDb) return undefined;
    let cancelled = false;
    fbDb.collection("announcements").orderBy("createdAt", "desc").limit(20).get()
      .then((snap) => {
        if (cancelled) return;
        setArchive(snap.docs.map((d) => {
          const data = d.data() || {};
          const p = (data.priority || "normal").toLowerCase();
          const urgent = p === "urgent" || p === "emergency" || p === "high";
          return { id: d.id, ...data, message: data.message || data.body || "", urgent };
        }));
      })
      .catch((err) => { EduSphere.Logger.error("[EduSphere] Announcements archive fetch failed:", err); setArchive([]); });
    return () => { cancelled = true; };
  }, [showAllAnnouncements]);

  const slides = useMemo(() => {
    const list = [];

    announcements.forEach((a) => {
      const typeLabel = (HOMEPAGE_ITEM_TYPES.find((t) => t.value === a.itemType) || {}).label || "Announcement";
      list.push({
        key: `ann-${a.id}`, kind: "announcement", urgent: a.urgent,
        icon: a.icon || "📢", accent: a.bgColor || (a.urgent ? C.danger : C.primary),
        eyebrow: a.urgent ? `URGENT ${typeLabel.toUpperCase()}` : typeLabel.toUpperCase(),
        title: a.title || "Notice", body: a.message, data: a,
        textColor: a.textColor || null, bgColor: a.bgColor || null, fontSize: a.fontSize || "normal",
      });
    });

    if (exams[0]) {
      const e = exams[0];
      list.push({
        key: `exam-${e.id}`, kind: "exam", icon: "📅", accent: C.warn,
        eyebrow: "UPCOMING EXAM",
        title: e.title || (e.courseCode ? `${e.courseCode} CBT` : "CBT Exam"),
        code: e.courseCode, startAt: e.startAt,
      });
    }

    const readyCourses = courses.filter((c) => c.ready);
    const recentReady = [...readyCourses].sort((a, b) => sortKeyDate(b.updatedAt) - sortKeyDate(a.updatedAt))[0];
    if (recentReady) {
      list.push({
        key: `resource-${recentReady.code}`, kind: "resource", icon: "📚", accent: C.success,
        eyebrow: "COURSE READY", code: recentReady.code,
        questionCount: resourceIndex.questionCounts[recentReady.code] || 0,
      });
    }

    if (newCourseNotif && newCourseNotif.targetDocumentId) {
      const isRecent = sortKeyDate(newCourseNotif.createdAt) > Date.now() - 14 * 24 * 3600 * 1000;
      const stillExists = courses.some((c) => c.code === newCourseNotif.targetDocumentId);
      if (isRecent && stillExists) {
        const code = newCourseNotif.targetDocumentId;
        list.push({
          key: `new-${newCourseNotif.id}`, kind: "new", icon: "🎉", accent: C.accent,
          eyebrow: "NEW COURSE", code, questionCount: resourceIndex.questionCounts[code] || 0,
        });
      }
    }

    const featured = readyCourses.find((c) => c.featured) || readyCourses[0];
    if (featured) {
      list.push({
        key: `featured-${featured.code}`, kind: "featured", icon: "🔥", accent: C.primaryDark,
        eyebrow: "FEATURED COURSE", code: featured.code, name: featured.name,
      });
    }

    list.push({
      key: "stats", kind: "stats", icon: "📈", accent: C.primary, eyebrow: "STATISTICS",
      coursesReady: readyCourses.length, questionsTotal, studentsTotal,
    });

    return list;
  }, [announcements, exams, courses, resourceIndex, newCourseNotif, questionsTotal, studentsTotal]);

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => { if (index >= slides.length) setIndex(0); }, [slides.length]);

  useEffect(() => {
    if (paused || !pageVisible || slides.length <= 1) return undefined;
    const t = setInterval(() => { setDir(1); setIndex((i) => (i + 1) % slides.length); }, 5000);
    return () => clearInterval(t);
  }, [paused, pageVisible, slides.length]);

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  if (!slides.length) return null;
  const s = slides[index];
  const hasUrgent = announcements.some((a) => a.urgent);

  const goTo = (next) => {
    const wrapped = ((next % slides.length) + slides.length) % slides.length;
    setDir(next >= index ? 1 : -1);
    setIndex(wrapped);
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX != null) {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { if (dx < 0) goTo(index + 1); else goTo(index - 1); }
    }
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 4000);
  };

  const handleTap = () => {
    if (s.kind === "announcement") setOpenAnnouncement(s.data);
    else if (s.kind === "exam") { if (s.code) go("quiz", s.code, "mock"); }
    else if (s.kind === "resource" || s.kind === "new" || s.kind === "featured") { if (s.code) go("courseDetail", s.code); }
  };

  const listForModal = archive || announcements;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Updates for You</div>
        <button onClick={() => setShowAllAnnouncements(true)} style={{ background: "none", border: "none", color: C.primary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          View all announcements
        </button>
      </div>

      {hasUrgent && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.danger, color: "#fff",
          borderRadius: 10, padding: "7px 12px", marginBottom: 10, overflow: "hidden",
          animation: "flCarouselGlow 2.4s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>LIVE</span>
          <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            🔴 Breaking: {(announcements.find((a) => a.urgent) || {}).title || "Important announcement"}
          </span>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={handleTap}
        style={{
          position: "relative", borderRadius: 20, overflow: "hidden", cursor: "pointer",
          minHeight: 150, background: C.card, border: `1px solid ${C.border}`,
          boxShadow: "0 6px 20px rgba(15,30,51,0.08)",
        }}
      >
        <div key={s.key} style={{
          padding: 18,
          animation: `${dir > 0 ? "flCarouselEnterRight" : "flCarouselEnterLeft"} 0.45s cubic-bezier(0.22,1,0.36,1)`,
          willChange: "transform, opacity",
          backfaceVisibility: "hidden",
        }}>
          <CarouselSlideContent slide={s} />
        </div>
      </div>

      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {slides.map((sl, i) => (
            <span key={sl.key} onClick={(e) => { e.stopPropagation(); goTo(i); }} style={{
              width: i === index ? 16 : 6, height: 6, borderRadius: 3, cursor: "pointer",
              background: i === index ? C.primary : C.border, transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      )}

      {openAnnouncement && (
        <Modal onClose={() => setOpenAnnouncement(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>📢</span>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{openAnnouncement.title || "Announcement"}</div>
          </div>
          <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6, marginBottom: 18 }}>
            {openAnnouncement.message || openAnnouncement.body}
          </div>
          <button onClick={() => setOpenAnnouncement(null)} style={{
            width: "100%", background: C.primary, color: "#fff", border: "none", borderRadius: 14,
            padding: "12px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
          }}>Close</button>
        </Modal>
      )}

      {showAllAnnouncements && (
        <Modal onClose={() => setShowAllAnnouncements(false)}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>All Announcements</div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {listForModal.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.textSoft, textAlign: "center", padding: "20px 0" }}>No announcements yet.</div>
            )}
            {listForModal.map((a) => (
              <button key={a.id} onClick={() => { setShowAllAnnouncements(false); setOpenAnnouncement(a); }} style={{
                width: "100%", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {a.urgent && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: C.danger, borderRadius: 5, padding: "1px 5px" }}>LIVE</span>}
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{a.title || "Notice"}</div>
                </div>
                <div style={{ fontSize: 11.5, color: C.textSoft, lineHeight: 1.5 }}>{a.message}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowAllAnnouncements(false)} style={{
            width: "100%", background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
            borderRadius: 14, padding: "12px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginTop: 4,
          }}>Close</button>
        </Modal>
      )}
    </div>
  );
}

/* Module 1.4 Phase 3 — the admin-curated Course Showcase row. Renders nothing when the
   admin hasn't added any cards yet, so it never shows an empty shelf on the homepage. */
function CourseShowcaseCard({ item, go }) {
  return (
    <button onClick={() => go("courseDetail", item.courseCode)} style={{
      minWidth: 168, maxWidth: 168, textAlign: "left", cursor: "pointer", flexShrink: 0,
      background: item.featured ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.card,
      border: `1px solid ${item.featured ? "transparent" : C.border}`,
      borderRadius: 16, padding: 14, boxShadow: C.shadow,
    }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        {item.isNew && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: C.success, borderRadius: 6, padding: "2px 7px" }}>NEW</span>}
        {item.isUpdated && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: C.warn, borderRadius: 6, padding: "2px 7px" }}>UPDATED</span>}
        {item.featured && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 7px" }}>⭐ FEATURED</span>}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: item.featured ? "#fff" : C.text, marginBottom: 3 }}>{item.courseCode}</div>
      <div style={{
        fontSize: 11, color: item.featured ? "rgba(255,255,255,0.85)" : C.textSoft, lineHeight: 1.4,
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{item.title}</div>
    </button>
  );
}
function CourseShowcaseRow({ go }) {
  const items = useLiveCourseShowcase();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Available Courses</div>
      <div className="flScrollY flNoScrollX" style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", paddingBottom: 4, overscrollBehavior: "contain" }}>
        {items.map((c) => <CourseShowcaseCard key={c.id} item={c} go={go} />)}
      </div>
    </div>
  );
}

/* ----------------------------- SCREENS: HOME / COURSES / NOTES ----------------------------- */
function HomeScreen({ go, goSelect, courses, user }) {
  useEffect(() => { EduSphere.Logger.info("[EduSphere] Home screen loaded"); }, []);

  return (
    <div style={{ padding: 16, paddingBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Hi, Student 👋</div>
          <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>Ready to practice today?</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessagesIconButton uid={CURRENT_USER_ID} onClick={() => go("messages")} />
          <NotificationBell uid={CURRENT_USER_ID} onClick={() => go("notifications")} />
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <GraduationCap size={20} color={C.primary} />
          </div>
        </div>
      </div>

      <CourseMarquee courses={courses} />
      <CourseShowcaseRow go={go} />

      <button onClick={() => goSelect("cbt")} style={{
        width: "100%", border: "none", cursor: "pointer", textAlign: "left",
        borderRadius: 20, padding: 20, marginBottom: 18, color: "#fff",
        background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
        boxShadow: "0 10px 24px rgba(21,101,192,0.28)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, opacity: 0.9 }}>EDUSPHERE</div>
        <div style={{ fontSize: 21, fontWeight: 800, margin: "4px 0 2px" }}>CBT Simulator</div>
        <div style={{ fontSize: 13, opacity: 0.95 }}>Pick a course, set it up, and simulate the real exam</div>
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MenuTile Icon={BookOpen} label="All Courses" onClick={() => go("courses")} />
        <MenuTile Icon={FileText} label="Course Notes" onClick={() => goSelect("notes")} />
        <MenuTile Icon={HelpCircle} label="Practice Qs" onClick={() => goSelect("practice")} />
        <MenuTile Icon={ClipboardCheck} label="Mock Exam" onClick={() => goSelect("cbt")} />
        <MenuTile Icon={BarChart3} label="Performance" onClick={() => goSelect("performance")} />
        <MenuTile Icon={Bookmark} label="Bookmarks" onClick={() => goSelect("bookmarks")} />
        <MenuTile Icon={Settings} label="Settings" onClick={() => go("settings")} />
        <MenuTile Icon={Info} label="About" onClick={() => go("about")} />
      </div>

      <SmartInfoCarousel go={go} courses={courses} user={user} />
    </div>
  );
}

function CoursesScreen({ go, courses }) {
  const [search, setSearch] = useState("");
  const filtered = courses.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <TopBar title="All Courses" onBack={() => go("home")} />
      <div style={{ padding: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 16,
        }}>
          <Search size={16} color={C.textFaint} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..."
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
        </div>
        {filtered.map((c) => (
          <ListRow key={c.code} title={c.code} subtitle={c.dept}
            badge={c.ready ? "Ready" : "Coming Soon"}
            onClick={() => go("courseDetail", c.code)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.textSoft, fontSize: 13, marginTop: 30 }}>No courses match your search.</div>
        )}
      </div>
    </div>
  );
}

function CourseDetailScreen({ code, go, courses }) {
  const course = courses.find((c) => c.code === code);
  if (!course) return null;
  const options = [
    { Icon: FileText, label: "Course Notes", sub: "Weekly summary notes", action: () => go("notes", code) },
    { Icon: HelpCircle, label: "Practice Questions", sub: "Flexible, topic-based practice", action: () => go("practiceOptions", code) },
    { Icon: ClipboardCheck, label: "Mock CBT Exam", sub: "Full-length timed simulation", action: () => go("quiz", code, "mock") },
    { Icon: BarChart3, label: "Performance", sub: "Your score history & analytics", action: () => go("performance", code) },
    { Icon: Bookmark, label: "Bookmarks", sub: "Questions saved for later", action: () => go("bookmarks", code) },
  ];
  return (
    <div>
      <TopBar title={course.code} onBack={() => go("courses")} />
      <div style={{ padding: 16 }}>
        <div style={{
          borderRadius: 18, padding: 18, marginBottom: 18, color: "#fff",
          background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{course.code}</div>
              <div style={{ fontSize: 12.5, opacity: 0.9 }}>{course.dept}</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 12, opacity: 0.95 }}>{course.name}</div>
        </div>

        {!course.ready && (
          <div style={{
            background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 14,
            padding: 14, marginBottom: 16, fontSize: 12.5, color: C.warn, display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <Sparkles size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Question bank for {course.code} is being prepared. It'll unlock in a future update — {courses.filter((c) => c.ready).map((c) => c.code).join(", ")} {courses.filter((c) => c.ready).length === 1 ? "is" : "are"} ready to practice now.</span>
          </div>
        )}

        {options.map((o) => (
          <ListRow key={o.label} title={o.label} subtitle={o.sub}
            onClick={course.ready || o.label === "Course Notes" ? o.action : undefined}
            right={course.ready || o.label === "Course Notes" ? undefined : <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 700 }}>Soon</span>} />
        ))}
      </div>
    </div>
  );
}

/* Live notes for one course, straight from the same "notes" collection the Admin Notes
   Manager writes to — so publishing/editing/deleting a note there appears here instantly,
   no refresh. Falls back to the built-in COURSE_NOTES_MAP only if Firestore has nothing yet
   for this course (keeps the original seeded CSC102/CPE102 notes working out of the box). */
function useLiveNotes(code) {
  const [notes, setNotes] = useState(null); // null = loading
  useEffect(() => {
    if (!fbDb || !code) { setNotes([]); return undefined; }
    setNotes(null);
    const unsubscribe = fbDb.collection("notes").where("courseCode", "==", code).onSnapshot(
      (snap) => {
        if (snap.empty) { setNotes(COURSE_NOTES_MAP[code] || []); return; }
        const live = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        live.sort((a, b) => (a.week || "").localeCompare(b.week || "", undefined, { numeric: true }));
        setNotes(live);
      },
      (err) => { EduSphere.Logger.error("[EduSphere] Live notes listener failed:", err); setNotes(COURSE_NOTES_MAP[code] || []); }
    );
    return () => unsubscribe();
  }, [code]);
  return notes;
}

function NotesScreen({ code, go, courses, prevScreen }) {
  const course = courses.find((c) => c.code === code);
  const liveNotes = useLiveNotes(code);
  const notes = liveNotes || [];
  const backTarget = prevScreen === "selectCourse" ? "selectCourse" : "courseDetail";
  return (
    <div>
      <TopBar title={`${code} Notes`} onBack={() => go(backTarget, code)} />
      <div style={{ padding: 16 }}>
        {liveNotes === null ? (
          <EmptyState text="Loading notes…" />
        ) : notes.length === 0 ? (
          <EmptyState text={`Notes for ${course ? course.name : code} are coming soon.`} />
        ) : notes.map((w) => (
          <div key={w.week} id={"note-" + w.week.replace(/\s+/g, "-").toLowerCase()} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: 0.4 }}>{w.week.toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: "3px 0 10px" }}>{w.title}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {w.points.map((p, i) => (
                <li key={i} style={{ fontSize: 12.8, color: C.textSoft, lineHeight: 1.55, marginBottom: 6 }}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- COURSE SELECT (generic, purpose-driven) ----------------------------- */
/* This screen is never hardcoded to a specific course — it always renders whatever
   courses exist in the COURSES array, so adding a new course elsewhere is all that's
   needed for it to show up here automatically. */
const SELECT_PURPOSE_CONFIG = {
  notes: { title: "Course Notes", subtitle: "Choose a course to view its notes", alwaysOpen: true },
  practice: { title: "Select Course", subtitle: "Choose a course to practice", alwaysOpen: false },
  cbt: { title: "Select Course", subtitle: "Choose a course to simulate", alwaysOpen: false },
  performance: { title: "Select Course", subtitle: "Choose a course to view performance", alwaysOpen: false },
  bookmarks: { title: "Select Course", subtitle: "Choose a course to view bookmarks", alwaysOpen: false },
};

function CourseSelectScreen({ purpose, go, courses }) {
  const cfg = SELECT_PURPOSE_CONFIG[purpose] || SELECT_PURPOSE_CONFIG.practice;
  const [search, setSearch] = useState("");
  const filtered = courses.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const select = (code) => {
    if (purpose === "notes") go("notes", code);
    else if (purpose === "practice") go("practiceOptions", code);
    else if (purpose === "cbt") go("quizSetup", code, "mock");
    else if (purpose === "performance") go("performance", code);
    else if (purpose === "bookmarks") go("bookmarks", code);
  };

  return (
    <div>
      <TopBar title={cfg.title} onBack={() => go("home")} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 14 }}>{cfg.subtitle}</div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 16,
        }}>
          <Search size={16} color={C.textFaint} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..."
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
        </div>
        {filtered.map((c) => {
          const clickable = cfg.alwaysOpen || c.ready;
          return (
            <ListRow key={c.code} title={c.code} subtitle={`${c.name} · ${c.dept}`}
              badge={c.ready ? "Ready" : "Coming Soon"}
              onClick={clickable ? () => select(c.code) : undefined}
              right={clickable ? undefined : <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 700 }}>Soon</span>} />
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.textSoft, fontSize: 13, marginTop: 30 }}>No courses match your search.</div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- PRACTICE QUESTIONS: MODE PICKER ----------------------------- */
function PracticeOptionsScreen({ code, go, courses, prevScreen }) {
  const course = courses.find((c) => c.code === code);
  if (!course) return null;
  const backTarget = prevScreen === "courseDetail" ? "courseDetail" : "selectCourse";

  const options = [
    { Icon: HelpCircle, label: "Scanning Mode", sub: "Instant feedback as you answer", action: () => go("quiz", code, "practice") },
    { Icon: ClipboardCheck, label: "Mock CBT Exam", sub: "Full-length timed simulation", action: () => go("quiz", code, "mock") },
    { Icon: Layers, label: "Flashcards", sub: "Flip through key questions fast", action: () => go("flashcards", code) },
    { Icon: BookOpen, label: "Topic Practice", sub: "Practice filtered by specific topics", action: () => go("quiz", code, "practice") },
    { Icon: XCircle, label: "My Mistakes", sub: "Review questions you've gotten wrong", action: () => go("mistakes", code) },
  ];

  return (
    <div>
      <TopBar title={`${code} — Practice`} onBack={() => go(backTarget, code)} />
      <div style={{ padding: 16 }}>
        {!course.ready && (
          <div style={{
            background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 14,
            padding: 14, marginBottom: 16, fontSize: 12.5, color: C.warn, display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <Sparkles size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Practice resources for {course.code} are being prepared and will unlock in a future update.</span>
          </div>
        )}
        {options.map((o) => (
          <ListRow key={o.label} title={o.label} subtitle={o.sub}
            onClick={course.ready ? o.action : undefined}
            right={course.ready ? undefined : <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 700 }}>Soon</span>} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- FLASHCARDS ----------------------------- */
/* Human-readable "correct answer" text for any question type — used by
   Flashcards, Bookmarks, and the Admin Question Bank list, anywhere we need
   to show the answer key without the full interactive CBT rendering. */
function answerKeyText(q) {
  if (q.type === "multiSelect") {
    const idxs = Array.isArray(q.a) ? q.a : [];
    return idxs.map((i) => q.o && q.o[i]).filter(Boolean).join(", ") || "—";
  }
  if (q.type === "shortAnswer" || q.type === "fillBlank") {
    return (q.acceptableAnswers && q.acceptableAnswers.length) ? q.acceptableAnswers.join(" / ") : (q.answer || "—");
  }
  if (q.type === "essay") return "Graded manually by an Admin";
  return (q.o && q.o[q.a] !== undefined) ? q.o[q.a] : "—"; // mcq / trueFalse
}

function FlashcardsScreen({ code, go, courses }) {
  const course = courses.find((c) => c.code === code);
  const { questions: bank, loading, error } = useLiveQuestions(code);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!bank.length) {
    return (
      <div>
        <TopBar title="Flashcards" onBack={() => go("practiceOptions", code)} />
        {error && <AdminError text={error} />}
        <EmptyState text={loading ? "Loading flashcards…" : `Flashcards for ${course ? course.name : code} are coming soon.`} />
      </div>
    );
  }

  const card = bank[idx % bank.length];
  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % bank.length); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + bank.length) % bank.length); };

  return (
    <div>
      <TopBar title={`${code} Flashcards`} onBack={() => go("practiceOptions", code)} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.textSoft, textAlign: "center", marginBottom: 12 }}>
          Card {idx + 1} of {bank.length} · Tap card to flip
        </div>
        <button onClick={() => setFlipped((f) => !f)} style={{
          width: "100%", minHeight: 220, border: `1px solid ${C.border}`, borderRadius: 20,
          background: flipped ? C.primary : C.card, color: flipped ? "#fff" : C.text,
          padding: 22, display: "flex", alignItems: "center", justifyContent: "center",
          textAlign: "center", cursor: "pointer", marginBottom: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
            {flipped ? answerKeyText(card) : card.q}
          </div>
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={prev} style={{
            flex: 1, padding: "12px 0", borderRadius: 14, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.text, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>← Prev</button>
          <button onClick={next} style={{
            flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
            background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- SMART EXAM GENERATOR (SETUP) ----------------------------- */
const COUNT_PRESETS = [10, 20, 30, 50, "All"];
const DIFFICULTY_OPTIONS = ["Mixed", "Easy", "Medium", "Hard"];
const MOCK_DURATION_PRESETS = [30, 45, 60, 90];
const PRACTICE_DURATION_PRESETS = [5, 10, 15, 20, 30];

function questionsAvailable(bank, weeks, difficulty) {
  return bank.filter((q) =>
    (weeks.length === 0 || weeks.includes(q.week)) &&
    (difficulty === "Mixed" || q.difficulty === difficulty)
  ).length;
}

function QuizSetupScreen({ code, mode, go, onStart, prevScreen }) {
  const isMock = mode === "mock";
  const backTarget = prevScreen === "practiceOptions" ? "practiceOptions"
    : prevScreen === "selectCourse" ? "selectCourse"
    : "courseDetail";
  const [numQuestions, setNumQuestions] = useState(isMock ? 50 : 20);
  const [weeks, setWeeks] = useState([]); // empty = all topics
  const [difficulty, setDifficulty] = useState("Mixed");
  const [timed, setTimed] = useState(isMock ? true : false); // Scanning Mode is always untimed
  const [duration, setDuration] = useState(isMock ? 60 : 15);
  const [randomizeQ, setRandomizeQ] = useState(true);
  const [randomizeOpt, setRandomizeOpt] = useState(true);

  const { questions: bank, loading, error } = useLiveQuestions(code);
  const weekOptions = useMemo(() => buildWeekOptionsFromQuestions(bank), [bank]);
  const available = questionsAvailable(bank, weeks, difficulty);
  const actualCount = numQuestions === "All" ? available : Math.min(numQuestions, available);

  const toggleWeek = (wk) => {
    setWeeks((prev) => prev.includes(wk) ? prev.filter((w) => w !== wk) : [...prev, wk]);
  };

  const start = () => {
    onStart({
      numQuestions: actualCount,
      weeks, difficulty, timed: isMock ? true : false,
      durationMinutes: isMock && timed ? duration : null,
      randomizeQuestions: randomizeQ, randomizeOptions: randomizeOpt,
      allowPause: !isMock,
      mode,
      bank, // the live Firestore question pool as loaded at start time — see QuizRunScreen / ScanningModeScreen
    });
    go("quizRun", code, mode);
  };

  if (loading && bank.length === 0) {
    return (
      <div>
        <TopBar title={isMock ? "Mock CBT Exam Setup" : "Scanning Mode Setup"} onBack={() => go(backTarget, code)} />
        <EmptyState text="Loading questions…" />
      </div>
    );
  }

  return (
    <div>
      <TopBar title={isMock ? "Mock CBT Exam Setup" : "Scanning Mode Setup"} onBack={() => go(backTarget, code)} />
      <div style={{ padding: 16, paddingBottom: 30 }}>
        {error && <AdminError text={error} />}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, textAlign: "center", marginBottom: 18,
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16, background: C.bg, margin: "0 auto 10px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {isMock ? <Clock size={24} color={C.primary} /> : <HelpCircle size={24} color={C.primary} />}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{code} — {isMock ? "Mock Exam" : "Scanning Mode"}</div>
          <div style={{ fontSize: 12.5, color: C.textSoft, marginTop: 4 }}>Build your own set below, then start when ready.</div>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Number of Questions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {COUNT_PRESETS.map((n) => (
            <button key={n} onClick={() => setNumQuestions(n)} style={{
              padding: "9px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${numQuestions === n ? C.primary : C.border}`,
              background: numQuestions === n ? C.primary : C.card, color: numQuestions === n ? "#fff" : C.text,
            }}>{n === "All" ? "All Questions" : n}</button>
          ))}
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Select Topics (Weeks)</div>
        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 10 }}>Leave all unchecked to include every topic.</div>
        {weekOptions.map((w) => (
          <Checkbox key={w.value} checked={weeks.includes(w.value)}
            label={`${w.label}: ${w.title}`} sub={`${w.count} question${w.count === 1 ? "" : "s"} available`}
            onToggle={() => toggleWeek(w.value)} />
        ))}

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "18px 0 10px" }}>Difficulty</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {DIFFICULTY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              padding: "9px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${difficulty === d ? C.primary : C.border}`,
              background: difficulty === d ? C.primary : C.card, color: difficulty === d ? "#fff" : C.text,
            }}>{d}</button>
          ))}
        </div>

        {isMock ? (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Timing</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10 }}>Mock exams are always timed to simulate the real CBT.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {MOCK_DURATION_PRESETS.map((m) => (
                <button key={m} onClick={() => setDuration(m)} style={{
                  padding: "9px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${duration === m ? C.primary : C.border}`,
                  background: duration === m ? C.primary : C.card, color: duration === m ? "#fff" : C.text,
                }}>{m} min</button>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 14, padding: 14, marginBottom: 18,
            fontSize: 12.5, color: C.success, fontWeight: 700, display: "flex", gap: 8, alignItems: "center",
          }}>
            <span style={{ fontSize: 16 }}>⏱️</span> No timer — study at your own pace, question by question.
          </div>
        )}

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "4px 0 10px" }}>Question Order</div>
        <RadioRow checked={randomizeQ} label="Shuffle" sub="Random question order every session" onSelect={() => setRandomizeQ(true)} />
        <RadioRow checked={!randomizeQ} label="Sequential" sub="Go in the order questions were added" onSelect={() => setRandomizeQ(false)} />
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "14px 0 10px" }}>Answer Options</div>
        <Checkbox checked={randomizeOpt} label="Randomize Answer Options" onToggle={() => setRandomizeOpt((v) => !v)} />

        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginTop: 18, marginBottom: 6,
          fontSize: 12.5, color: C.textSoft, lineHeight: 1.6,
        }}>
          <b style={{ color: C.text }}>{actualCount}</b> question{actualCount === 1 ? "" : "s"} match your filters
          {isMock && <> · <b style={{ color: C.text }}>{duration} min</b> on the clock</>}
          {!isMock && <> · Untimed · Resume anytime</>}
        </div>

        <button onClick={start} disabled={actualCount === 0} style={{
          marginTop: 14, width: "100%", background: actualCount === 0 ? C.textFaint : C.primary, color: "#fff", border: "none",
          borderRadius: 14, padding: "14px 0", fontSize: 14.5, fontWeight: 700, cursor: actualCount === 0 ? "default" : "pointer",
        }}>
          Start {isMock ? "Mock Exam" : "Scanning Mode"}
        </button>
        {actualCount === 0 && (
          <div style={{ textAlign: "center", color: C.danger, fontSize: 12, marginTop: 8 }}>No questions match this combination — widen your filters.</div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- QUIZ NAVIGATOR GRID ----------------------------- */
function QuestionNavigator({ questions, currentIndex, answers, marked, onJump }) {
  const SECTION_SIZE = 5;
  const sections = [];
  for (let i = 0; i < questions.length; i += SECTION_SIZE) {
    sections.push({
      label: String.fromCharCode(65 + sections.length),
      start: i,
      end: Math.min(i + SECTION_SIZE, questions.length) - 1,
    });
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 16, fontSize: 11, color: C.textSoft, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: C.border, display: "inline-block" }} /> Not Answered
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: C.primary, display: "inline-block" }} /> Answered
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: C.success, display: "inline-block" }} /> Current
        </span>
        <span>⭐ Marked</span>
      </div>
      {sections.map((sec) => (
        <div key={sec.label} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Section {sec.label} · Questions {sec.start + 1}–{sec.end + 1}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {Array.from({ length: sec.end - sec.start + 1 }, (_, k) => sec.start + k).map((i) => {
              const isAnswered = isQuestionAnswered(questions[i], answers[i]);
              const isCurrent = i === currentIndex;
              const isMarked = marked.has(i);
              return (
                <button key={i} onClick={() => onJump(i)} style={{
                  position: "relative", height: 40, borderRadius: 10, cursor: "pointer",
                  border: isCurrent ? `2.5px solid ${C.success}` : `1px solid ${C.border}`,
                  background: isCurrent ? C.success : isAnswered ? C.primary : C.card,
                  color: isCurrent || isAnswered ? "#fff" : C.text,
                  fontSize: 12.5, fontWeight: 700,
                }}>
                  {i + 1}
                  {isMarked && (
                    <span style={{ position: "absolute", top: -6, right: -6, fontSize: 12 }}>⭐</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- QUIZ RUN ----------------------------- */
const QUIZ_PAGE_SIZE = 1;

/* Renders the interactive input for one question in the CBT Engine, chosen by
   q.type. This is the only place that changed to teach the engine new
   question types — the MCQ branch is pixel-identical to the original
   inline rendering, so existing MCQ questions look and behave exactly as
   before. */
function QuestionInputRenderer({ q, qIdx, value, onSelect, onToggleMulti, onText }) {
  if (q.type === "trueFalse") {
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {(q.o || ["True", "False"]).map((opt, i) => {
          const isSel = value === i;
          return (
            <button key={i} onClick={() => onSelect(qIdx, i)} style={{
              flex: 1, padding: "16px 0", borderRadius: 14, textAlign: "center", cursor: "pointer",
              background: isSel ? C.primary : C.bg, color: isSel ? "#fff" : C.text,
              border: `1.5px solid ${isSel ? C.primary : C.border}`, fontWeight: 800, fontSize: 14.5,
            }}>{opt}</button>
          );
        })}
      </div>
    );
  }
  if (q.type === "multiSelect") {
    const selArr = Array.isArray(value) ? value : [];
    return (
      <>
        <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8, fontWeight: 700 }}>Select all that apply</div>
        {(q.o || []).map((opt, i) => {
          const isSel = selArr.includes(i);
          return (
            <button key={i} onClick={() => onToggleMulti(qIdx, i)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              background: isSel ? C.primary : C.bg, color: isSel ? "#fff" : C.text,
              border: `1.5px solid ${isSel ? C.primary : C.border}`, borderRadius: 14,
              padding: "12px 14px", marginBottom: 9, cursor: "pointer",
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: isSel ? "rgba(255,255,255,0.25)" : C.card, color: isSel ? "#fff" : C.primary,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800,
                border: `1.5px solid ${isSel ? "rgba(255,255,255,0.5)" : C.border}`,
              }}>{isSel ? "✓" : ""}</span>
              <span style={{ fontSize: 13.5 }}>{opt}</span>
            </button>
          );
        })}
      </>
    );
  }
  if (q.type === "shortAnswer" || q.type === "fillBlank") {
    return (
      <input value={value || ""} onChange={(e) => onText(qIdx, e.target.value)}
        placeholder={q.type === "fillBlank" ? "Type the missing word(s)…" : "Type your answer…"}
        spellCheck={true} autoCapitalize="off" autoCorrect="off"
        style={{
          width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px",
          fontSize: 14, color: C.text, background: C.bg, outline: "none",
        }} />
    );
  }
  if (q.type === "essay") {
    return (
      <textarea value={value || ""} onChange={(e) => onText(qIdx, e.target.value)} rows={8}
        placeholder="Write your answer… (this question is graded manually by an Admin)"
        style={{
          width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px",
          fontSize: 13.5, color: C.text, background: C.bg, outline: "none", lineHeight: 1.6, resize: "vertical",
        }} />
    );
  }
  // default: mcq
  return (
    <>
      {(q.o || []).map((opt, i) => {
        const isSel = value === i;
        return (
          <button key={i} onClick={() => onSelect(qIdx, i)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
            background: isSel ? C.primary : C.bg, color: isSel ? "#fff" : C.text,
            border: `1.5px solid ${isSel ? C.primary : C.border}`, borderRadius: 14,
            padding: "12px 14px", marginBottom: 9, cursor: "pointer",
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              background: isSel ? "rgba(255,255,255,0.25)" : C.card, color: isSel ? "#fff" : C.primary,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800,
            }}>{String.fromCharCode(65 + i)}</span>
            <span style={{ fontSize: 13.5 }}>{opt}</span>
          </button>
        );
      })}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCANNING MODE — a completely separate learning engine (formerly labeled
   "Practice Mode" in the UI). It reuses the existing question loader
   (useLiveQuestions / cfg.bank), the bookmark system, gradeQuestion(), and
   the QuestionNavigator grid — but has its own component tree so the CBT
   Engine (QuizRunScreen, below) and Mock Exam mode are never touched by
   anything in this section. Built modular on purpose:
     ScanningModeScreen   — orchestrator: session state, resume, persistence
       ScanProgressBar      — "Question 15 of 200" + progress fill
       ScanStatsStrip / ScanStatsModal — accuracy, streaks, counters
       ScanQuestionMeta      — topic/difficulty chip + bookmark toggle
       ScanAnswerOptions     — feedback-aware input for every question type
       AnswerFeedbackBanner  — ✅ / ❌ banner with pop + shake animation
       ExplanationCard       — collapsible why/formula/topic/memory-tip card
       ScanResumeModal       — "Continue from Question 87?" prompt
   Any future feature (weak-topic detection, favorite topics, etc.) plugs
   into this tree without touching QuizRunScreen or its history/Firestore
   writes at all.
   ════════════════════════════════════════════════════════════════════════ */

function ScanProgressBar({ index, total }) {
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div style={{ padding: "10px 16px 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>
        <span>Question {index + 1} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: C.border, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.primary, borderRadius: 4, transition: "width 0.35s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
    </div>
  );
}

function ScanStatsStrip({ counts, streak, onExpand }) {
  const attempted = counts.correct + counts.wrong;
  const accuracy = attempted ? Math.round((counts.correct / attempted) * 100) : 0;
  return (
    <button onClick={onExpand} style={{
      width: "calc(100% - 32px)", display: "flex", alignItems: "center", justifyContent: "space-between",
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px",
      margin: "8px 16px 0", cursor: "pointer",
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>🎯 {accuracy}% accuracy</span>
      <span key={streak} style={{
        fontSize: 12, fontWeight: 700, color: streak > 0 ? C.primary : C.textSoft,
        animation: streak > 0 ? "flScanStreakPop 0.3s cubic-bezier(0.22,1,0.36,1)" : "none",
      }}>🔥 {streak} streak</span>
      <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 700 }}>Stats ›</span>
    </button>
  );
}

function ScanStatsModal({ counts, streak, bestStreak, total, index, onClose }) {
  const attempted = counts.correct + counts.wrong;
  const accuracy = attempted ? Math.round((counts.correct / attempted) * 100) : 0;
  const overallScore = total ? Math.round((counts.correct / total) * 100) : 0;
  const remaining = Math.max(0, total - (index + 1));
  const rows = [
    ["Accuracy", accuracy + "%", C.primary], ["Overall Score", overallScore + "%", C.success],
    ["Correct", counts.correct, C.success], ["Wrong", counts.wrong, C.danger],
    ["Skipped", counts.skipped, C.warn], ["Remaining", remaining, C.textSoft],
    ["Current Streak", streak, C.primary], ["Best Streak", bestStreak, C.primary],
  ];
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>Learning Stats</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {rows.map(([label, val, color]) => (
          <div key={label} style={{ flex: "1 1 40%", background: C.bg, borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{
        marginTop: 18, width: "100%", background: C.primary, color: "#fff", border: "none",
        borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>Close</button>
    </Modal>
  );
}

function ScanResumeModal({ savedIndex, onContinue, onRestart }) {
  return (
    <Modal onClose={onRestart}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>Resume Scanning?</div>
      <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 18, lineHeight: 1.55 }}>
        You left off at Question {savedIndex + 1}. Continue where you stopped, or start this set over from Question 1?
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRestart} style={{
          flex: 1, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: "13px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
        }}>Restart</button>
        <button onClick={onContinue} style={{
          flex: 1, background: C.primary, color: "#fff", border: "none",
          borderRadius: 14, padding: "13px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
        }}>Continue</button>
      </div>
    </Modal>
  );
}

function AnswerFeedbackBanner({ status }) {
  if (status === "ungraded") {
    return (
      <div style={{
        background: C.warnBg, border: `1.5px solid ${C.warnBorder}`, borderRadius: 16, padding: "14px 16px",
        margin: "14px 0", display: "flex", alignItems: "center", gap: 10,
        animation: "flScanCardIn 0.35s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <span style={{ fontSize: 22 }}>📝</span>
        <div>
          <div style={{ fontWeight: 800, color: C.warn, fontSize: 14 }}>Recorded</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>Essay answers are graded manually — this won't affect your accuracy.</div>
        </div>
      </div>
    );
  }
  const correct = status === "correct";
  return (
    <div style={{
      background: correct ? C.successBg : C.dangerBg, border: `1.5px solid ${correct ? C.success : C.danger}`,
      borderRadius: 16, padding: "14px 16px", margin: "14px 0", display: "flex", alignItems: "center", gap: 10,
      animation: correct
        ? "flScanCardIn 0.35s cubic-bezier(0.22,1,0.36,1)"
        : "flScanCardIn 0.35s cubic-bezier(0.22,1,0.36,1), flScanShake 0.4s ease 0.15s",
    }}>
      <span style={{ fontSize: 26, animation: "flScanPopIn 0.45s cubic-bezier(0.22,1,0.36,1)" }}>{correct ? "✅" : "❌"}</span>
      <div>
        <div style={{ fontWeight: 800, color: correct ? C.success : C.danger, fontSize: 14.5 }}>{correct ? "Correct!" : "Incorrect"}</div>
        <div style={{ fontSize: 12, color: C.textSoft }}>{correct ? "Excellent." : "Don't worry, keep learning."}</div>
      </div>
    </div>
  );
}

function ExplanationCard({ q, open, onToggle }) {
  const hasFormula = !!q.formula;
  const memoryTip = q.memoryTip || q.tip;
  return (
    <div style={{
      background: C.card, border: `1.5px solid ${C.primary}`, borderRadius: 16, marginTop: 4, overflow: "hidden",
      animation: "flScanCardIn 0.4s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 16px", background: "none", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.primary }}>💡 Explanation</span>
        <span style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>{open ? "▲ Hide" : "▼ View Explanation"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          {q.e ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textSoft, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Why this answer is correct</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{q.e}</div>
            </div>
          ) : null}
          {hasFormula && (
            <div style={{ marginTop: 14, background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textSoft, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Formula</div>
              <div style={{ fontSize: 13.5, color: C.text, fontWeight: 700, fontFamily: "monospace" }}>{q.formula}</div>
            </div>
          )}
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px" }}>📚 Topic: {q.topic}</span>
            {q.ref ? <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px" }}>📄 {q.ref}</span> : null}
          </div>
          {memoryTip && (
            <div style={{ marginTop: 14, background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.warn, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>🧠 Memory Tip</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{memoryTip}</div>
            </div>
          )}
          {!q.e && !hasFormula && !memoryTip && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: C.textSoft }}>No explanation was added for this question yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* Feedback-aware input for one question — mirrors QuestionInputRenderer's type
   handling exactly (same q.type branches) but adds the locked/revealed
   green-correct / red-wrong state Scanning Mode needs. Kept entirely
   separate from QuestionInputRenderer so CBT/Mock Exam rendering can never
   be affected by a Scanning Mode change. */
function ScanAnswerOptions({ q, value, isRevealed, onCommit }) {
  const [draft, setDraft] = useState(() => (q.type === "multiSelect" ? [] : ""));
  useEffect(() => { setDraft(q.type === "multiSelect" ? [] : ""); }, [q.id]);

  const correctSet = new Set(q.type === "multiSelect" ? (Array.isArray(q.a) ? q.a : []) : [q.a]);
  const optionColors = (i, isSel) => {
    if (isRevealed) {
      if (correctSet.has(i)) return { background: C.successBg, border: C.success, color: C.success };
      if (isSel) return { background: C.dangerBg, border: C.danger, color: C.danger };
      return { background: C.bg, border: C.border, color: C.textSoft };
    }
    return isSel ? { background: C.primary, border: C.primary, color: "#fff" } : { background: C.bg, border: C.border, color: C.text };
  };

  if (q.type === "trueFalse") {
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {(q.o || ["True", "False"]).map((opt, i) => {
          const colors = optionColors(i, value === i);
          return (
            <button key={i} disabled={isRevealed} onClick={() => onCommit(i)} style={{
              flex: 1, padding: "16px 0", borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 14.5,
              cursor: isRevealed ? "default" : "pointer", transition: "background 0.25s ease, border-color 0.25s ease",
              background: colors.background, color: colors.color, border: `1.5px solid ${colors.border}`,
            }}>{opt} {isRevealed && correctSet.has(i) ? "✅" : isRevealed && value === i ? "❌" : ""}</button>
          );
        })}
      </div>
    );
  }

  if (q.type === "multiSelect") {
    const selArr = isRevealed ? (Array.isArray(value) ? value : []) : draft;
    const toggle = (i) => { if (isRevealed) return; setDraft((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])); };
    return (
      <>
        <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8, fontWeight: 700 }}>Select all that apply</div>
        {(q.o || []).map((opt, i) => {
          const colors = optionColors(i, selArr.includes(i));
          return (
            <button key={i} disabled={isRevealed} onClick={() => toggle(i)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", borderRadius: 14,
              padding: "12px 14px", marginBottom: 9, cursor: isRevealed ? "default" : "pointer",
              transition: "background 0.25s ease, border-color 0.25s ease",
              background: colors.background, color: colors.color, border: `1.5px solid ${colors.border}`,
            }}>
              <span style={{ fontSize: 13.5, flex: 1 }}>{opt}</span>
              {isRevealed && correctSet.has(i) && <span>✅</span>}
              {isRevealed && !correctSet.has(i) && selArr.includes(i) && <span>❌</span>}
            </button>
          );
        })}
        {!isRevealed && (
          <button onClick={() => onCommit(draft)} disabled={draft.length === 0} style={{
            width: "100%", marginTop: 6, padding: "12px 0", borderRadius: 12, border: "none",
            background: draft.length === 0 ? C.textFaint : C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5,
            cursor: draft.length === 0 ? "default" : "pointer",
          }}>Check Answer</button>
        )}
      </>
    );
  }

  if (q.type === "shortAnswer" || q.type === "fillBlank") {
    const status = isRevealed ? gradeQuestion(q, value).status : null;
    return (
      <>
        <input value={isRevealed ? String(value || "") : draft} disabled={isRevealed} onChange={(e) => setDraft(e.target.value)}
          placeholder={q.type === "fillBlank" ? "Type the missing word(s)…" : "Type your answer…"}
          spellCheck={true} autoCapitalize="off" autoCorrect="off" style={{
            width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, outline: "none",
            border: `1.5px solid ${isRevealed ? (status === "correct" ? C.success : C.danger) : C.border}`,
            color: C.text, background: isRevealed ? (status === "correct" ? C.successBg : C.dangerBg) : C.bg,
          }} />
        {isRevealed && status !== "correct" && (
          <div style={{ fontSize: 11.5, color: C.success, marginTop: 8, fontWeight: 700 }}>✅ Accepted answer: {answerKeyText(q)}</div>
        )}
        {!isRevealed && (
          <button onClick={() => onCommit(draft)} disabled={!draft.trim()} style={{
            width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12, border: "none",
            background: !draft.trim() ? C.textFaint : C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5,
            cursor: !draft.trim() ? "default" : "pointer",
          }}>Check Answer</button>
        )}
      </>
    );
  }

  if (q.type === "essay") {
    return (
      <>
        <textarea value={isRevealed ? String(value || "") : draft} disabled={isRevealed} onChange={(e) => setDraft(e.target.value)} rows={7}
          placeholder="Write your answer… (essays aren't auto-graded — this just records your attempt)" style={{
            width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 13.5,
            color: C.text, background: C.bg, outline: "none", lineHeight: 1.6, resize: "vertical",
          }} />
        {!isRevealed && (
          <button onClick={() => onCommit(draft)} disabled={!draft.trim()} style={{
            width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12, border: "none",
            background: !draft.trim() ? C.textFaint : C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5,
            cursor: !draft.trim() ? "default" : "pointer",
          }}>Submit</button>
        )}
      </>
    );
  }

  // default: mcq
  return (
    <>
      {(q.o || []).map((opt, i) => {
        const colors = optionColors(i, value === i);
        return (
          <button key={i} disabled={isRevealed} onClick={() => onCommit(i)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", borderRadius: 14,
            padding: "12px 14px", marginBottom: 9, cursor: isRevealed ? "default" : "pointer",
            transition: "background 0.25s ease, border-color 0.25s ease",
            background: colors.background, color: colors.color, border: `1.5px solid ${colors.border}`,
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 800,
              background: isRevealed ? "transparent" : (value === i ? "rgba(255,255,255,0.25)" : C.card),
              color: isRevealed ? "inherit" : (value === i ? "#fff" : C.primary),
            }}>{String.fromCharCode(65 + i)}</span>
            <span style={{ fontSize: 13.5, flex: 1 }}>{opt}</span>
            {isRevealed && correctSet.has(i) && <span>✅</span>}
            {isRevealed && !correctSet.has(i) && value === i && <span>❌</span>}
          </button>
        );
      })}
    </>
  );
}

function ScanningModeScreen({ code, config, go, onFinish }) {
  const cfg = config || { numQuestions: 20, weeks: [], difficulty: "Mixed", randomizeQuestions: true, randomizeOptions: true, bank: [] };
  const needsFallback = !cfg.bank || !cfg.bank.length;
  const fallback = useLiveQuestions(needsFallback ? code : null);
  const sourceBank = cfg.bank && cfg.bank.length ? cfg.bank : fallback.questions;

  // Session pool is built once per mount, honoring the student's own
  // Randomize / Sequential choice from Scanning Mode Setup (unlike the CBT
  // Engine, which always shuffles — Scanning Mode explicitly gives students
  // that choice per the spec).
  const [questions] = useState(() => {
    let pool = sourceBank.filter((q) =>
      (cfg.weeks.length === 0 || cfg.weeks.includes(q.week)) &&
      (cfg.difficulty === "Mixed" || q.difficulty === cfg.difficulty)
    );
    if (cfg.randomizeQuestions !== false) pool = shuffle(pool);
    const count = cfg.numQuestions === "All" || !cfg.numQuestions ? pool.length : Math.min(cfg.numQuestions, pool.length);
    pool = pool.slice(0, count);
    if (cfg.randomizeOptions !== false) pool = pool.map(shuffleOptions);
    return pool;
  });
  const total = questions.length;

  const savedProgress = useMemo(() => loadScanProgress(code), [code]);
  const canResume = !!(savedProgress && savedProgress.total === total && savedProgress.index > 0 && savedProgress.index < total);
  const [resumeChoice, setResumeChoice] = useState(canResume ? "pending" : "resolved");

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks(code).map((b) => b.id));
  const [showNav, setShowNav] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(true);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState((savedProgress && savedProgress.bestStreak) || 0);
  const [counts, setCounts] = useState({ correct: 0, wrong: 0, skipped: 0 });

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const applyResume = (cont) => {
    if (cont && savedProgress) {
      setIndex(Math.min(savedProgress.index || 0, Math.max(0, total - 1)));
      setAnswers(savedProgress.answers || {});
      setRevealed(savedProgress.revealed || {});
      setStreak(savedProgress.streak || 0);
      setCounts(savedProgress.counts || { correct: 0, wrong: 0, skipped: 0 });
    } else {
      clearScanProgress(code);
    }
    setResumeChoice("resolved");
  };

  // Auto-save progress (local + fire-and-forget Firestore mirror) after every
  // meaningful change, so exiting mid-session and coming back later — or on
  // another device — resumes exactly where the student left off.
  useEffect(() => {
    if (resumeChoice === "pending" || total === 0) return;
    saveScanProgress(code, { index, total, answers, revealed, streak, bestStreak, counts, updatedAt: new Date().toISOString() });
  }, [index, answers, revealed, streak, bestStreak, counts, resumeChoice, code, total]);

  const q = questions[index];
  const isRevealed = !!revealed[index];
  const selected = answers[index];
  const grade = q ? gradeQuestion(q, selected) : null;

  useEffect(() => { setExplanationOpen(true); }, [index]);

  if (total === 0) {
    return (
      <div>
        <TopBar title="Scanning Mode" onBack={() => go("practiceOptions", code)} />
        <EmptyState text="No questions match this combination yet — go back and widen your filters." />
      </div>
    );
  }

  const toggleBookmark = () => {
    const list = loadBookmarks(code);
    const exists = list.some((b) => b.id === q.id);
    const updated = exists ? list.filter((b) => b.id !== q.id) : [...list, q];
    saveBookmarks(code, updated);
    setBookmarks(updated.map((b) => b.id));
  };
  const isBookmarked = bookmarks.includes(q.id);

  const commitAnswer = (val) => {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [index]: val }));
    setRevealed((prev) => ({ ...prev, [index]: true }));
    const g = gradeQuestion(q, val);
    if (g.status === "correct") {
      setStreak((s) => { const next = s + 1; setBestStreak((b) => Math.max(b, next)); return next; });
      setCounts((c) => ({ ...c, correct: c.correct + 1 }));
      if (navigator.vibrate) navigator.vibrate(35);
    } else if (g.status === "wrong") {
      setStreak(0);
      setCounts((c) => ({ ...c, wrong: c.wrong + 1 }));
      addMistake(code, q);
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    }
    // "ungraded" (essay) intentionally doesn't touch streak/counts/mistakes —
    // it's recorded for review, not auto-scored.
  };

  const skip = () => {
    if (isRevealed) return;
    setCounts((c) => ({ ...c, skipped: c.skipped + 1 }));
    goTo(index + 1);
  };

  const goTo = (newIndex) => setIndex(Math.max(0, Math.min(total - 1, newIndex)));

  const finalize = () => {
    clearScanProgress(code);
    onFinish(questions, answersRef.current, new Set(), {});
  };

  if (resumeChoice === "pending") {
    return <ScanResumeModal savedIndex={savedProgress.index} onContinue={() => applyResume(true)} onRestart={() => applyResume(false)} />;
  }

  return (
    <div>
      <TopBar title="Scanning Mode" onBack={() => go("practiceOptions", code)} right={
        <button onClick={toggleBookmark} aria-label="Bookmark" style={{ ...iconBtnStyle, fontSize: 16 }}>{isBookmarked ? "🔖" : "📑"}</button>
      } />
      <ScanProgressBar index={index} total={total} />
      <ScanStatsStrip counts={counts} streak={streak} onExpand={() => setShowStats(true)} />

      <div key={index} style={{ padding: 16, paddingBottom: 130, animation: "flScanCardIn 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: C.primary, background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px",
            }}>Q{index + 1} · {q.topic} · {q.difficulty}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {QUESTION_TYPE_LABELS[q.type] || "Multiple Choice"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 14 }}>{q.q}</div>
          <ScanAnswerOptions q={q} value={selected} isRevealed={isRevealed} onCommit={commitAnswer} />
        </div>

        {isRevealed && (
          <>
            <AnswerFeedbackBanner status={grade.status} />
            <ExplanationCard q={q} open={explanationOpen} onToggle={() => setExplanationOpen((v) => !v)} />
          </>
        )}
      </div>

      <button onClick={() => setShowNav(true)} aria-label="Jump to Question" style={{
        position: "fixed", right: 16, bottom: 100, zIndex: 8, width: 54, height: 54, borderRadius: "50%",
        border: "none", background: C.primary, color: "#fff", boxShadow: "0 8px 22px rgba(21,101,192,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}><Grid size={22} color="#fff" /></button>

      {showNav && (
        <Modal onClose={() => setShowNav(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Jump to Question</div>
            <button onClick={() => setShowNav(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textSoft }}>✕</button>
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <QuestionNavigator questions={questions} currentIndex={index} answers={answers} marked={new Set()}
              onJump={(qIdx) => { goTo(qIdx); setShowNav(false); }} />
          </div>
        </Modal>
      )}

      {showStats && (
        <ScanStatsModal counts={counts} streak={streak} bestStreak={bestStreak} total={total} index={index} onClose={() => setShowStats(false)} />
      )}

      <div style={{
        position: "sticky", bottom: 0, background: C.card, borderTop: `1px solid ${C.border}`,
        padding: 14, display: "flex", gap: 10,
      }}>
        <button onClick={() => goTo(index - 1)} disabled={index === 0} style={{
          flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
          background: C.card, color: index === 0 ? C.textFaint : C.text, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>← Previous</button>
        {!isRevealed && (
          <button onClick={skip} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.textSoft, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Skip</button>
        )}
        {isRevealed && index < total - 1 && (
          <button onClick={() => goTo(index + 1)} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Next →</button>
        )}
        {isRevealed && index === total - 1 && (
          <button onClick={finalize} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: C.success, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Finish Session</button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- MY MISTAKES (Scanning Mode) ----------------------------- */
function MistakesScreen({ code, go }) {
  const [list, setList] = useState(() => loadMistakes(code));
  const remove = (id) => setList(removeMistake(code, id));
  const clearAll = () => { saveMistakes(code, []); setList([]); };
  return (
    <div>
      <TopBar title="My Mistakes" onBack={() => go("practiceOptions", code)} right={
        list.length > 0 ? (
          <button onClick={clearAll} style={{ background: "none", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Clear All</button>
        ) : undefined
      } />
      <div style={{ padding: 16 }}>
        {list.length === 0 ? (
          <EmptyState text="No mistakes logged yet — questions you get wrong in Scanning Mode will show up here for review." />
        ) : list.map((q) => (
          <div key={q.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{q.q}</div>
              <button onClick={() => remove(q.id)} aria-label="Remove from mistakes" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>🗑️</button>
            </div>
            <QuestionAnswerKeyBlock q={q} />
            {q.e && (
              <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 6, background: C.bg, padding: 8, borderRadius: 8 }}>
                📖 {q.e}
                {q.ref ? <div style={{ marginTop: 3, fontWeight: 700, color: C.primary }}>📄 {q.ref}</div> : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizRunScreen({ code, mode, config, go, onFinish }) {
  const cfg = config || { numQuestions: 20, weeks: [], difficulty: "Mixed", timed: false, durationMinutes: null, randomizeQuestions: true, randomizeOptions: true, allowPause: true };

  // The Firestore-backed question pool normally arrives ready-made via cfg.bank (set by
  // QuizSetupScreen from its own live subscription at the moment "Start" was pressed). This
  // fallback subscription only kicks in if that's ever missing (e.g. a session resumed without
  // going through setup) — it's never a hardcoded array, just Firestore again.
  const needsFallback = !cfg.bank || !cfg.bank.length;
  const fallback = useLiveQuestions(needsFallback ? code : null);
  const sourceBank = cfg.bank && cfg.bank.length ? cfg.bank : fallback.questions;

  // Requirement: every session gets a freshly shuffled question order — this
  // runs once per mount (i.e. every time a session is started), and
  // randomization is no longer optional, so re-entering a session always
  // produces a new order even if a stale config says otherwise.
  const [questions] = useState(() => {
    let pool = sourceBank.filter((q) =>
      (cfg.weeks.length === 0 || cfg.weeks.includes(q.week)) &&
      (cfg.difficulty === "Mixed" || q.difficulty === cfg.difficulty)
    );
    pool = shuffle(pool); // always shuffle question order, every session
    const count = cfg.numQuestions === "All" || !cfg.numQuestions ? pool.length : Math.min(cfg.numQuestions, pool.length);
    pool = pool.slice(0, count);
    pool = pool.map(shuffleOptions); // always shuffle option order too
    return pool;
  });

  const totalPages = Math.max(1, Math.ceil(questions.length / QUIZ_PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(() => new Set());
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks(code).map((b) => b.id));
  const [paused, setPaused] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(cfg.timed && cfg.durationMinutes ? cfg.durationMinutes * 60 : null);
  const [timeSpent, setTimeSpent] = useState({}); // keyed by page number

  const answersRef = useRef(answers);
  const markedRef = useRef(marked);
  const switchRef = useRef({ page: 0, t: Date.now() });
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { markedRef.current = marked; }, [marked]);

  const pageStart = page * QUIZ_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + QUIZ_PAGE_SIZE, questions.length) - 1;
  const pageQuestions = questions.slice(pageStart, pageEnd + 1);

  const goPage = (newPage) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, newPage));
    const now = Date.now();
    const delta = now - switchRef.current.t;
    setTimeSpent((prev) => ({ ...prev, [switchRef.current.page]: (prev[switchRef.current.page] || 0) + delta }));
    switchRef.current = { page: clamped, t: now };
    setPage(clamped);
  };
  const jumpToQuestion = (qIdx) => goPage(Math.floor(qIdx / QUIZ_PAGE_SIZE));

  const select = (qIdx, optIdx) => setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  const setTextAnswer = (qIdx, text) => setAnswers((prev) => ({ ...prev, [qIdx]: text }));
  const toggleMultiOption = (qIdx, optIdx) => setAnswers((prev) => {
    const current = Array.isArray(prev[qIdx]) ? prev[qIdx] : [];
    const next = current.includes(optIdx) ? current.filter((i) => i !== optIdx) : [...current, optIdx];
    return { ...prev, [qIdx]: next };
  });
  const toggleMark = (qIdx) => setMarked((prev) => {
    const next = new Set(prev);
    next.has(qIdx) ? next.delete(qIdx) : next.add(qIdx);
    return next;
  });
  const toggleBookmark = (question) => {
    const list = loadBookmarks(code);
    const exists = list.some((b) => b.id === question.id);
    const updated = exists ? list.filter((b) => b.id !== question.id) : [...list, question];
    saveBookmarks(code, updated);
    setBookmarks(updated.map((b) => b.id));
  };

  const flushTime = () => {
    const now = Date.now();
    const delta = now - switchRef.current.t;
    setTimeSpent((prev) => ({ ...prev, [switchRef.current.page]: (prev[switchRef.current.page] || 0) + delta }));
  };

  const finalize = () => {
    flushTime();
    onFinish(questions, answersRef.current, markedRef.current, timeSpent);
  };

  const togglePause = () => {
    if (!paused) flushTime();
    else switchRef.current = { page, t: Date.now() };
    setPaused((p) => !p);
  };

  /* Countdown timer */
  useEffect(() => {
    if (!cfg.timed || paused || timeUp) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(t);
          setTimeUp(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paused, cfg.timed, timeUp]);

  useEffect(() => {
    if (timeUp) {
      const to = setTimeout(() => finalize(), 1600);
      return () => clearTimeout(to);
    }
  }, [timeUp]);

  const answeredCount = questions.filter((q, i) => isQuestionAnswered(q, answers[i])).length;
  const notAnsweredCount = questions.length - answeredCount;
  const markedCount = marked.size;

  if (!questions.length) return null;

  if (timeUp) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 30, textAlign: "center", background: C.bg,
      }}>
        <div style={{ fontSize: 46, marginBottom: 14 }}>⏱️</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 8 }}>Time Up!</div>
        <div style={{ fontSize: 13.5, color: C.textSoft }}>Your exam has been submitted automatically.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "16px 16px 14px", background: C.primary, color: "#fff",
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={() => go("courseDetail", code)} aria-label="Back" style={iconBtnStyle}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <button onClick={() => { flushTime(); setShowSummary(true); }} aria-label="Submit Exam" style={{
            background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10,
            padding: "8px 12px", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer",
          }}>Submit</button>
        </div>
        <span style={{
          fontSize: 14, fontWeight: 700, flex: 1, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {cfg.timed && timeLeft !== null ? `⏱ ${fmtClock(timeLeft)}` : `Question ${page + 1} of ${totalPages}`}
        </span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {cfg.allowPause && (
            <button onClick={togglePause} aria-label="Pause" style={iconBtnStyle}>
              {paused ? <Play size={16} color="#fff" /> : <Pause size={16} color="#fff" />}
            </button>
          )}
          <button onClick={() => setShowCalc((v) => !v)} aria-label="Calculator" style={iconBtnStyle}>
            <Calculator size={16} color="#fff" />
          </button>
        </div>
      </div>

      <div style={{
        textAlign: "center", fontSize: 11, color: cfg.timed && timeLeft < 60 ? C.danger : C.textSoft,
        padding: "6px 0", fontWeight: 700, animation: cfg.timed && timeLeft < 60 ? "flPulse 1s infinite" : "none",
      }}>
        Question {page + 1} of {totalPages} · Section {String.fromCharCode(65 + Math.floor(page / 5))} · {cfg.mode === "mock" ? "Mock Exam" : "Practice"}
      </div>

      {paused ? (
        <div style={{
          padding: 40, textAlign: "center", color: C.textSoft,
        }}>
          <Pause size={36} color={C.primary} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>Practice Paused</div>
          <div style={{ fontSize: 12.5, marginBottom: 20 }}>The timer is on hold. Resume whenever you're ready.</div>
          <button onClick={togglePause} style={{
            background: C.primary, color: "#fff", border: "none", borderRadius: 14,
            padding: "12px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>▶️ Resume Practice</button>
        </div>
      ) : (
        <div style={{ padding: 16, paddingBottom: 110 }}>
          {pageQuestions.map((q, localI) => {
            const qIdx = pageStart + localI;
            const selected = answers[qIdx];
            const isBookmarked = bookmarks.includes(q.id);
            return (
              <div key={qIdx} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
                padding: 16, marginBottom: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, color: C.primary, background: C.bg,
                    border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px",
                  }}>Q{qIdx + 1} · {q.topic} · {q.difficulty}</div>
                  <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                    <button onClick={() => toggleBookmark(q)} aria-label="Bookmark" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                      {isBookmarked ? "🔖" : "📑"}
                    </button>
                    <button onClick={() => toggleMark(qIdx)} aria-label="Mark for review" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
                      {marked.has(qIdx) ? "⭐" : "☆"}
                    </button>
                  </div>
                </div>

                <div style={{
                  fontSize: 10, fontWeight: 700, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4,
                }}>{QUESTION_TYPE_LABELS[q.type] || "Multiple Choice"}{q.points !== 1 ? ` · ${q.points} pt${q.points === 1 ? "" : "s"}` : ""}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 14 }}>{q.q}</div>
                <QuestionInputRenderer q={q} qIdx={qIdx} value={selected}
                  onSelect={select} onToggleMulti={toggleMultiOption} onText={setTextAnswer} />
              </div>
            );
          })}
        </div>
      )}

      {!paused && (
        <button onClick={() => setShowNav(true)} aria-label="Question Navigator" style={{
          position: "fixed", right: 16, bottom: 100, zIndex: 8,
          width: 54, height: 54, borderRadius: "50%", border: "none",
          background: C.primary, color: "#fff", boxShadow: "0 8px 22px rgba(21,101,192,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Grid size={22} color="#fff" />
        </button>
      )}

      {showNav && (
        <Modal onClose={() => setShowNav(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Question Navigator</div>
            <button onClick={() => setShowNav(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textSoft }}>✕</button>
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <QuestionNavigator questions={questions} currentIndex={page} answers={answers} marked={marked}
              onJump={(qIdx) => { jumpToQuestion(qIdx); setShowNav(false); }} />
          </div>
        </Modal>
      )}

      {!paused && (
        <div style={{
          position: "sticky", bottom: 0, background: C.card, borderTop: `1px solid ${C.border}`,
          padding: 14, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: C.textSoft }}>
            Question {page + 1} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => goPage(page - 1)} disabled={page === 0} style={{
              flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
              background: C.card, color: page === 0 ? C.textFaint : C.text, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            }}>← Previous</button>
            {page < totalPages - 1 ? (
              <button onClick={() => goPage(page + 1)} style={{
                flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              }}>Next →</button>
            ) : (
              <button onClick={() => { flushTime(); setShowSummary(true); }} style={{
                flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                background: C.success, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              }}>Finish & Submit</button>
            )}
          </div>
        </div>
      )}

      {showSummary && (
        <Modal onClose={() => setShowSummary(false)}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Submit Exam?</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {[["Answered", answeredCount, C.success], ["Not Answered", notAnsweredCount, C.danger],
              ["Marked for Review", markedCount, C.warn], ["Remaining Time", cfg.timed ? fmtClock(timeLeft || 0) : "Untimed", C.primary]]
              .map(([label, val, color]) => (
              <div key={label} style={{ flex: "1 1 40%", background: C.bg, borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: C.text, background: C.dangerBg, borderRadius: 12, padding: 12, marginBottom: 18, lineHeight: 1.55, fontWeight: 600 }}>
            Are you sure you want to submit your exam?<br />
            You still have unanswered questions (if any).
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowSummary(false)} style={{
              flex: 1, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
              borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={finalize} style={{
              flex: 1, background: C.success, color: "#fff", border: "none",
              borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Submit</button>
          </div>
        </Modal>
      )}

      {showCalc && <CalculatorWidget onClose={() => setShowCalc(false)} />}
    </div>
  );
}

/* ----------------------------- RESULT / PERFORMANCE DASHBOARD ----------------------------- */
function computeWeekBreakdown(questions, answers) {
  const byWeek = {};
  questions.forEach((q, i) => {
    if (!byWeek[q.week]) byWeek[q.week] = { topic: q.topic, correct: 0, total: 0 };
    byWeek[q.week].total += 1;
    if (gradeQuestion(q, answers[i]).status === "correct") byWeek[q.week].correct += 1;
  });
  return Object.entries(byWeek).map(([week, d]) => ({
    week, topic: d.topic, correct: d.correct, total: d.total,
    pct: d.total ? Math.round((d.correct / d.total) * 100) : 0,
  })).sort((a, b) => {
    const na = parseInt(String(a.week).match(/\d+/), 10);
    const nb = parseInt(String(b.week).match(/\d+/), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a.week).localeCompare(String(b.week));
  });
}

function ExamReviewList({ items }) {
  return (
    <div style={{ padding: 16 }}>
      {items.map((q, i) => {
        const userAns = q.userAnswer;
        const notAttempted = userAns === null || userAns === undefined || (typeof userAns === "string" && !userAns.trim()) || (Array.isArray(userAns) && userAns.length === 0);
        const type = q.type || "mcq";
        return (
          <div key={i} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{i + 1}. {q.q}</div>
              {q.marked && <span style={{ fontSize: 14 }}>⭐</span>}
            </div>

            {(type === "mcq" || type === "trueFalse") && (q.o || []).map((opt, oi) => {
              let bg = "transparent", col = C.textSoft, mark = "";
              if (oi === q.a) { bg = C.successBg; col = C.success; mark = "✅ "; }
              if (oi === userAns && userAns !== q.a) { bg = C.dangerBg; col = C.danger; mark = "❌ "; }
              return (
                <div key={oi} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "7px 10px", borderRadius: 9,
                  background: bg, marginBottom: 5, fontSize: 12.8, color: col, fontWeight: oi === q.a ? 700 : 500,
                }}>
                  <span>{mark}{opt}</span>
                </div>
              );
            })}

            {type === "multiSelect" && (q.o || []).map((opt, oi) => {
              const correctSet = new Set(Array.isArray(q.a) ? q.a : []);
              const userSet = new Set(Array.isArray(userAns) ? userAns : []);
              const isCorrectOpt = correctSet.has(oi);
              const isUserOpt = userSet.has(oi);
              let bg = "transparent", col = C.textSoft, mark = "";
              if (isCorrectOpt) { bg = C.successBg; col = C.success; mark = "✅ "; }
              if (isUserOpt && !isCorrectOpt) { bg = C.dangerBg; col = C.danger; mark = "❌ "; }
              return (
                <div key={oi} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "7px 10px", borderRadius: 9,
                  background: bg, marginBottom: 5, fontSize: 12.8, color: col, fontWeight: isCorrectOpt ? 700 : 500,
                }}>
                  <span>{mark}{opt}{isUserOpt ? " (your pick)" : ""}</span>
                </div>
              );
            })}

            {(type === "shortAnswer" || type === "fillBlank") && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  fontSize: 12.8, padding: "8px 10px", borderRadius: 9, marginBottom: 5,
                  background: q.status === "correct" ? C.successBg : C.dangerBg,
                  color: q.status === "correct" ? C.success : C.danger, fontWeight: 700,
                }}>{q.status === "correct" ? "✅ " : "❌ "}Your answer: {notAttempted ? "(blank)" : String(userAns)}</div>
                {q.status !== "correct" && (
                  <div style={{ fontSize: 12, color: C.textSoft }}>Accepted answer{(q.acceptableAnswers || []).length > 1 ? "s" : ""}: {(q.acceptableAnswers || []).join(", ") || "—"}</div>
                )}
              </div>
            )}

            {type === "essay" && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 12.8, padding: "10px", borderRadius: 9, background: C.bg, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: 6 }}>
                  {notAttempted ? "(no answer submitted)" : String(userAns)}
                </div>
                <div style={{
                  fontSize: 11.5, fontWeight: 700, display: "inline-block", padding: "4px 10px", borderRadius: 20,
                  background: q.graded ? C.successBg : C.warnBg, color: q.graded ? C.success : C.warn,
                }}>{q.graded ? `Graded: ${q.pointsEarned ?? 0}/${q.points ?? 1} pts` : "⏳ Pending Admin grading"}</div>
              </div>
            )}

            {notAttempted && (
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.warn, marginBottom: 6 }}>⚠️ Not Attempted</div>
            )}
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 8, lineHeight: 1.5, background: C.bg, padding: 10, borderRadius: 10 }}>
              <div>📖 <b>Explanation:</b> {q.e}</div>
              {q.ref && <div style={{ marginTop: 4, color: C.primary, fontWeight: 700 }}>📄 Reference: {q.ref}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultScreen({ code, mode, questions, answers, marked, timeSpent, go, onSaved, prevEntry }) {
  const total = questions.length;
  const grades = useMemo(() => questions.map((q, i) => ({ i, ...gradeQuestion(q, answers[i]) })), [questions, answers]);
  const correct = grades.filter((g) => g.status === "correct").length;
  const wrong = grades.filter((g) => g.status === "wrong").length;
  const skipped = grades.filter((g) => g.status === "skipped").length;
  const pending = grades.filter((g) => g.status === "ungraded").length; // essays awaiting Admin grading
  const answeredIdx = questions.map((_, i) => i).filter((i) => isQuestionAnswered(questions[i], answers[i]));
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const gradedAttempts = correct + wrong; // excludes skipped and still-pending essays
  const accuracy = gradedAttempts ? Math.round((correct / gradedAttempts) * 100) : 0;
  const totalTimeMs = Object.values(timeSpent || {}).reduce((a, b) => a + b, 0);
  const avgTimePerQ = total ? Math.round(totalTimeMs / total / 1000) : 0;
  const weekBreakdown = useMemo(() => computeWeekBreakdown(questions, answers), [questions, answers]);
  const strongest = weekBreakdown.length ? weekBreakdown.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  const weakest = weekBreakdown.length ? weekBreakdown.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const improvement = prevEntry ? pct - prevEntry.pct : null;

  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    const reviewItems = buildReviewItems(questions, answers, marked);
    const entry = {
      date: new Date().toISOString(), score: correct, total, pct, mode, course: code,
      correct, wrong, accuracy, avgTimePerQ, timeTakenMs: totalTimeMs,
      skipped, pending, hasUngradedEssays: pending > 0,
      answered: answeredIdx.length, weekBreakdown, review: reviewItems,
    };
    const updated = saveHistoryEntry(code, entry);
    onSaved(updated);
    saveExamHistoryToFirestore(entry); // fire-and-forget cloud sync
  }, []);

  if (showReview) {
    return (
      <div>
        <TopBar title="Review Answers" onBack={() => setShowReview(false)} />
        <ExamReviewList items={buildReviewItems(questions, answers, marked)} />
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Test Result" onBack={() => go("courseDetail", code)} />
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", margin: "10px auto 16px",
          background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Award size={38} color="#fff" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Exam Completed</div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, marginTop: 18 }}>
          <div style={{ fontSize: 13, color: C.textSoft }}>Your Score</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: "4px 0" }}>{correct} <span style={{ fontSize: 16, color: C.textSoft, fontWeight: 600 }}>/ {total}</span></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: pct >= 50 ? C.success : C.danger }}>{pct}%</div>
          <div style={{ fontSize: 12.5, color: C.textSoft, marginTop: 2 }}>
            {pct >= 80 ? "Excellent Performance!" : pct >= 50 ? "Good effort — keep practicing!" : "Keep studying — you'll get there!"}
          </div>
          {improvement !== null && (
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: improvement >= 0 ? C.success : C.danger }}>
              {improvement >= 0 ? "▲" : "▼"} {Math.abs(improvement)}% {improvement >= 0 ? "improvement" : "drop"} since last {mode === "mock" ? "mock exam" : "practice test"}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            ["Accuracy", `${accuracy}%`], ["Avg Time / Q", `${avgTimePerQ}s`],
            ["Answered", answeredIdx.length], ["Skipped", skipped],
            ["Correct", correct], ["Wrong", wrong],
            ...(pending > 0 ? [["Pending Grading", pending]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{val}</div>
              <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        {pending > 0 && (
          <div style={{ fontSize: 11.5, color: C.warn, background: C.warnBg, borderRadius: 12, padding: 10, marginTop: 10, fontWeight: 600 }}>
            ⏳ This exam includes {pending} essay question{pending === 1 ? "" : "s"} awaiting manual grading by an Admin. Your score above will update once grading is complete.
          </div>
        )}

        {strongest && weakest && (
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, background: C.successBg, borderRadius: 14, padding: 12, textAlign: "left" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.success }}>💪 STRONGEST TOPIC</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 3 }}>{strongest.topic}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>{strongest.pct}% accuracy</div>
            </div>
            <div style={{ flex: 1, background: C.dangerBg, borderRadius: 14, padding: 12, textAlign: "left" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.danger }}>📌 WEAKEST TOPIC</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 3 }}>{weakest.topic}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>{weakest.pct}% accuracy</div>
            </div>
          </div>
        )}

        <button onClick={() => setShowReview(true)} style={{
          width: "100%", marginTop: 16, background: C.primary, color: "#fff", border: "none",
          borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Review Answers & Explanations</button>
        <button onClick={() => go("performance", code)} style={{
          width: "100%", marginTop: 10, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>View Full Performance Dashboard</button>
        <button onClick={() => go("quizSetup", code, mode)} style={{
          width: "100%", marginTop: 10, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Retry Test</button>
        <button onClick={() => go("home")} style={{
          width: "100%", marginTop: 10, background: "none", color: C.primary, border: "none",
          borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>🏠 Back Home</button>
      </div>
    </div>
  );
}

/* ----------------------------- BOOKMARKS ----------------------------- */
/* Read-only "answer key" block — shows options with the correct one(s)
   highlighted for mcq/trueFalse/multiSelect, the accepted answers for
   shortAnswer/fillBlank, or a manual-grading note for essay. Shared by
   BookmarksScreen and the Admin Question Bank list so both stay in sync as
   new question types are added. */
function QuestionAnswerKeyBlock({ q }) {
  if (q.type === "shortAnswer" || q.type === "fillBlank") {
    return (
      <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 9, background: C.successBg, color: C.success, fontWeight: 700, marginBottom: 8 }}>
        ✅ Accepted: {(q.acceptableAnswers && q.acceptableAnswers.length) ? q.acceptableAnswers.join(" / ") : (q.answer || "—")}
      </div>
    );
  }
  if (q.type === "essay") {
    return (
      <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 9, background: C.warnBg, color: C.warn, fontWeight: 700, marginBottom: 8 }}>
        📝 Essay — graded manually by an Admin ({q.points} pt{q.points === 1 ? "" : "s"})
      </div>
    );
  }
  const correctSet = new Set(q.type === "multiSelect" ? (Array.isArray(q.a) ? q.a : []) : [q.a]);
  return (
    <div style={{ display: q.type === "multiSelect" ? "block" : "grid", gridTemplateColumns: q.type === "multiSelect" ? undefined : "1fr 1fr", gap: 6, marginBottom: 8 }}>
      {(q.o || []).map((opt, i) => (
        <div key={i} style={{
          fontSize: 11.5, padding: "6px 8px", borderRadius: 8, marginBottom: q.type === "multiSelect" ? 4 : 0,
          background: correctSet.has(i) ? C.successBg : C.bg, color: correctSet.has(i) ? C.success : C.textSoft,
          fontWeight: correctSet.has(i) ? 700 : 500,
        }}>{q.type === "trueFalse" ? opt : `${String.fromCharCode(65 + i)}. ${opt}`}{correctSet.has(i) ? " ✅" : ""}</div>
      ))}
    </div>
  );
}

function BookmarksScreen({ code, go }) {
  const [list, setList] = useState(() => loadBookmarks(code));
  const remove = (id) => {
    const updated = list.filter((b) => b.id !== id);
    saveBookmarks(code, updated);
    setList(updated);
  };
  return (
    <div>
      <TopBar title="Bookmarks" onBack={() => go("courseDetail", code)} />
      <div style={{ padding: 16 }}>
        {list.length === 0 ? (
          <EmptyState text="No saved questions yet. Tap the 📑 icon during a test to bookmark a question for later study." />
        ) : list.map((q) => (
          <div key={q.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{q.q}</div>
              <button onClick={() => remove(q.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>🔖</button>
            </div>
            <QuestionAnswerKeyBlock q={q} />
            <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 6, background: C.bg, padding: 8, borderRadius: 8 }}>
              📖 {q.e}
              <div style={{ marginTop: 3, fontWeight: 700, color: C.primary }}>📄 {q.ref}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- SIMPLE SVG LINE CHART (no external lib) ----------------------------- */
function ProgressLineChart({ points }) {
  if (points.length < 2) return (
    <div style={{ fontSize: 11.5, color: C.textSoft, textAlign: "center", padding: "16px 0" }}>
      Take a few more tests to see your progress chart.
    </div>
  );
  const w = 300, h = 100, pad = 8;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [pad + i * stepX, pad + (h - pad * 2) * (1 - p / 100)]);
  const path = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline points={coords.map((c) => c.join(",")).join(" ")} fill="none" stroke={C.border} strokeWidth="0" />
      <path d={path} fill="none" stroke={C.primary} strokeWidth="2.5" />
      {coords.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill={C.primary} />)}
    </svg>
  );
}

/* ----------------------------- PERFORMANCE DASHBOARD ----------------------------- */
function PerformanceScreen({ code, go, courses, history }) {
  const [selected, setSelected] = useState(code);
  const list = history[selected] || [];
  const testsTaken = list.length;
  const best = testsTaken ? Math.max(...list.map((h) => h.pct)) : 0;
  const avg = testsTaken ? Math.round(list.reduce((a, h) => a + h.pct, 0) / testsTaken) : 0;
  const chartPoints = [...list].slice(0, 10).reverse().map((h) => h.pct);

  const latestWithBreakdown = list.find((h) => h.weekBreakdown && h.weekBreakdown.length);
  const weekAgg = {};
  list.forEach((h) => {
    (h.weekBreakdown || []).forEach((wb) => {
      if (!weekAgg[wb.week]) weekAgg[wb.week] = { topic: wb.topic, correct: 0, total: 0 };
      weekAgg[wb.week].correct += wb.correct;
      weekAgg[wb.week].total += wb.total;
    });
  });
  const weekStats = Object.entries(weekAgg).map(([week, d]) => ({
    week, topic: d.topic, pct: d.total ? Math.round((d.correct / d.total) * 100) : 0,
  })).sort((a, b) => {
    const na = parseInt(String(a.week).match(/\d+/), 10);
    const nb = parseInt(String(b.week).match(/\d+/), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a.week).localeCompare(String(b.week));
  });

  return (
    <div>
      <TopBar title="Performance" onBack={() => go("courseDetail", selected)} />
      <div style={{ padding: 16 }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{
          width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${C.border}`,
          fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 18, background: C.card,
        }}>
          {courses.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 8 }}>Overall Performance</div>
          <div style={{
            width: 140, height: 140, borderRadius: "50%", margin: "0 auto", position: "relative",
            background: `conic-gradient(${C.primary} ${avg * 3.6}deg, ${C.border} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 108, height: 108, borderRadius: "50%", background: C.card,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{avg}%</div>
              <div style={{ fontSize: 10.5, color: C.textSoft }}>Average Score</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {[["Tests Taken", testsTaken], ["Best Score", `${best}%`], ["Avg Score", `${avg}%`]].map(([label, val]) => (
            <div key={label} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{val}</div>
              <div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 8 }}>Progress Over Time</div>
          <ProgressLineChart points={chartPoints} />
        </div>

        {weekStats.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Accuracy by Topic</div>
            {weekStats.map((w) => (
              <div key={w.week} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.textSoft, marginBottom: 3 }}>
                  <span>{w.topic}</span><span style={{ fontWeight: 700, color: C.text }}>{w.pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: C.bg, overflow: "hidden" }}>
                  <div style={{ width: `${w.pct}%`, height: "100%", background: w.pct >= 50 ? C.success : C.danger }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Recent Tests</div>
          <button onClick={() => go("examHistory")} style={{
            background: "none", border: "none", color: C.primary, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Full History →</button>
        </div>
        {testsTaken === 0 ? (
          <EmptyState text="No tests taken yet for this course. Start a practice test to see your performance here." />
        ) : list.slice(0, 10).map((h, i) => (
          <ListRow key={i} title={h.mode === "mock" ? "Mock Exam" : "Practice Test"}
            subtitle={`${fmtDate(h.date)} · ${h.answered ?? h.total}/${h.total} answered${h.avgTimePerQ ? ` · ${h.avgTimePerQ}s avg` : ""}`}
            right={<span style={{ fontWeight: 800, color: h.pct >= 50 ? C.success : C.danger, fontSize: 14 }}>{h.pct}%</span>} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- EXAM HISTORY (cross-course, Firestore) ----------------------------- */
function ExamHistoryScreen({ go, courses }) {
  const [entries, setEntries] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await withTimeout(fetchExamHistory(50), 10000, "Exam history fetch");
        if (!cancelled) setEntries(rows);
      } catch (err) {
        EduSphere.Logger.error("[EduSphere] Couldn't load exam history:", err);
        if (!cancelled) { setError(firebaseAuthErrorMessage(err)); setEntries([]); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (selected) {
    const course = courses.find((c) => c.code === selected.course);
    return (
      <div>
        <TopBar title={`${selected.course} · Review`} onBack={() => setSelected(null)} />
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{course ? course.name : selected.course}</div>
            <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 2 }}>
              {selected.mode === "mock" ? "Mock Exam" : "Practice Test"} · {fmtDate(selected.date)}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12 }}>
              <span>Score: <b style={{ color: selected.pct >= 50 ? C.success : C.danger }}>{selected.correct ?? selected.score}/{selected.total} ({selected.pct}%)</b></span>
              <span>Wrong: <b>{selected.wrong ?? (selected.total - (selected.correct ?? selected.score))}</b></span>
            </div>
          </div>
        </div>
        {selected.review && selected.review.length
          ? <ExamReviewList items={selected.review} />
          : <EmptyState text="Detailed review isn't available for this older attempt." />}
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Exam History" onBack={() => go("performance")} />
      <div style={{ padding: 16 }}>
        {entries === null ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textSoft, fontSize: 13 }}>Loading your exam history…</div>
        ) : error ? (
          <div style={{ fontSize: 12.5, color: C.danger, background: C.dangerBg, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            {error}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState text="No exams recorded yet. Finish a practice test or mock exam to see it here." />
        ) : entries.map((h) => (
          <ListRow key={h.id} title={`${h.course || "Course"} · ${h.mode === "mock" ? "Mock Exam" : "Practice"}`}
            subtitle={`${fmtDate(h.date)} · ${h.correct ?? h.score}/${h.total} correct`}
            onClick={() => setSelected(h)}
            right={<span style={{ fontWeight: 800, color: h.pct >= 50 ? C.success : C.danger, fontSize: 14 }}>{h.pct}%</span>} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- AUTH: WELCOME ----------------------------- */
function WelcomeScreen({ go }) {
  const { config: brandConfig } = useBrand();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", padding: 28, textAlign: "center",
      background: `linear-gradient(160deg, ${C.primary}, ${C.secondary})`, color: "#fff",
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 24, background: "rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
        boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
      }}>
        <Logo size={66} variant="login" />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{brandConfig.appName}</div>
      <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 40, lineHeight: 1.5 }}>
        {brandConfig.tagline}<br />Your FUTA CBT companion.
      </div>
      <button onClick={() => go("login")} style={{
        width: "100%", maxWidth: 320, padding: "14px 0", borderRadius: 14, border: "none",
        background: "#fff", color: C.primary, fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 12,
      }}>Log In</button>
      <button onClick={() => go("register")} style={{
        width: "100%", maxWidth: 320, padding: "14px 0", borderRadius: 14,
        border: "1.5px solid rgba(255,255,255,0.6)", background: "transparent", color: "#fff",
        fontWeight: 800, fontSize: 15, cursor: "pointer",
      }}>Create Account</button>
    </div>
  );
}

/* Shared text input for the auth screens */
function AuthInput({ label, type = "text", value, onChange, placeholder, right }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>{label}</div>
      <div style={{
        display: "flex", alignItems: "center", background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: "12px 14px",
      }}>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
          border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text,
        }} />
        {right}
      </div>
    </div>
  );
}
function AuthError({ text }) {
  if (!text) return null;
  return (
    <div style={{
      background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 12, padding: "10px 12px",
      fontSize: 12.5, color: C.danger, marginBottom: 14,
    }}>{text}</div>
  );
}
function AuthSuccess({ text }) {
  if (!text) return null;
  return (
    <div style={{
      background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 12, padding: "10px 12px",
      fontSize: 12.5, color: C.success, marginBottom: 14,
    }}>{text}</div>
  );
}

/* ----------------------------- AUTH: LOGIN ----------------------------- */
function LoginScreen({ go, onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!identifier.trim() || !password) { setError("Please fill in both fields."); return; }
    setLoading(true);
    const res = await loginUser({ identifier, password, remember });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onLoginSuccess(res.user, remember);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{
        background: `linear-gradient(160deg, ${C.primary}, ${C.secondary})`, padding: "26px 20px 46px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <button onClick={() => go("welcome")} aria-label="Back" style={{ ...iconBtnStyle, background: "rgba(255,255,255,0.14)" }}>
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>

      <div style={{ padding: "0 20px", marginTop: -34 }}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "28px 22px 24px",
          boxShadow: "0 20px 50px rgba(15,30,61,0.14)", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: C.bg, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${C.primary}22`,
          }}>
            <Logo size={50} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 4 }}>Welcome Back</div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 22 }}>Sign in to continue learning.</div>

          <div style={{ textAlign: "left" }}>
            <AuthError text={error} />
            <AuthInput label="Email or Phone Number" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 080..." />
            <AuthInput label="Password" type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
              right={
                <button onClick={() => setShowPassword((s) => !s)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center",
                }}>
                  {showPassword ? <EyeOff size={17} color={C.textSoft} /> : <Eye size={17} color={C.textSoft} />}
                </button>
              } />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <button onClick={() => setRemember((r) => !r)} style={{
                display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${remember ? C.primary : C.border}`, background: remember ? C.primary : "transparent",
                  color: "#fff", fontSize: 11, fontWeight: 800,
                }}>{remember ? "✓" : ""}</span>
                <span style={{ fontSize: 12.5, color: C.textSoft, fontWeight: 600 }}>Remember Me</span>
              </button>
              <button onClick={() => go("forgotPassword")} style={{
                background: "none", border: "none", color: C.primary, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              }}>Forgot Password?</button>
            </div>

            <button onClick={submit} disabled={loading} style={{
              width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
              background: loading ? C.textFaint : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
              color: "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "default" : "pointer", marginBottom: 18,
              boxShadow: loading ? "none" : `0 10px 24px ${C.primary}33`, transition: "transform 0.15s ease",
            }}>{loading ? "Signing in..." : "Sign In"}</button>
          </div>

          <div style={{ textAlign: "center", fontSize: 13, color: C.textSoft }}>
            Don't have an account?{" "}
            <button onClick={() => go("register")} style={{
              background: "none", border: "none", color: C.primary, fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Create one</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- AUTH: REGISTER ----------------------------- */
function RegisterScreen({ go, onRegisterSuccess }) {
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!isEmailFormat(identifier)) return setError("Enter a valid email address to sign up.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const res = await registerUser({ fullName, identifier, password });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess("Account created successfully! Redirecting to login...");
    setTimeout(() => { onRegisterSuccess(); go("login"); }, 1400);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{
        background: `linear-gradient(160deg, ${C.primary}, ${C.secondary})`, padding: "26px 20px 46px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <button onClick={() => go("welcome")} aria-label="Back" style={{ ...iconBtnStyle, background: "rgba(255,255,255,0.14)" }}>
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>

      <div style={{ padding: "0 20px 24px", marginTop: -34 }}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "28px 22px 24px",
          boxShadow: "0 20px 50px rgba(15,30,61,0.14)", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: C.bg, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${C.primary}22`,
          }}>
            <Logo size={50} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 4 }}>Create Account</div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 22 }}>Start your learning journey.</div>

          <div style={{ textAlign: "left" }}>
            <AuthError text={error} />
            <AuthSuccess text={success} />
            <AuthInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            <AuthInput label="Email Address" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" />
            <AuthInput label="Password" type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
              right={
                <button onClick={() => setShowPassword((s) => !s)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center",
                }}>
                  {showPassword ? <EyeOff size={17} color={C.textSoft} /> : <Eye size={17} color={C.textSoft} />}
                </button>
              } />
            <AuthInput label="Confirm Password" type={showPassword ? "text" : "password"} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" />

            <button onClick={submit} disabled={loading} style={{
              width: "100%", padding: "15px 0", borderRadius: 16, border: "none", marginTop: 6,
              background: loading ? C.textFaint : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
              color: "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "default" : "pointer", marginBottom: 18,
              boxShadow: loading ? "none" : `0 10px 24px ${C.primary}33`,
            }}>{loading ? "Creating account..." : "Create Account"}</button>
          </div>

          <div style={{ textAlign: "center", fontSize: 13, color: C.textSoft }}>
            Already have an account?{" "}
            <button onClick={() => go("login")} style={{
              background: "none", border: "none", color: C.primary, fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Log in</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- AUTH: FORGOT PASSWORD ----------------------------- */
function ForgotPasswordScreen({ go }) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const continueStep = async () => {
    setError(""); setSuccess("");
    if (!isEmailFormat(identifier)) return setError("Enter the email address on your account.");
    setLoading(true);
    const res = await resetPasswordFor(identifier);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess("Reset link sent! Check your email inbox (and spam folder) for a link to set a new password.");
  };

  // Kept for parity with the original two-step layout — Firebase's reset link
  // takes the user to set a new password on their own, so this step no longer
  // needs to submit anything from here.
  const submitReset = async () => {};

  return (
    <div>
      <TopBar title="Forgot Password" onBack={() => go("login")} />
      <div style={{ padding: 16, paddingTop: 20 }}>
        <AuthError text={error} />
        <AuthSuccess text={success} />
        {step === 1 ? (
          <>
            <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 16, lineHeight: 1.5 }}>
              Enter the email address on your account and we'll send you a secure link to reset
              your password.
            </div>
            <AuthInput label="Email or Phone Number" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 080..." />
            <button onClick={continueStep} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: C.primary, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
            }}>Continue</button>
          </>
        ) : (
          <>
            <AuthInput label="New Password" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
            <AuthInput label="Confirm New Password" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
            <button onClick={submitReset} disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: loading ? C.textFaint : C.primary, color: "#fff", fontWeight: 800, fontSize: 15,
              cursor: loading ? "default" : "pointer",
            }}>{loading ? "Saving..." : "Reset Password"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- SETTINGS (APPEARANCE / THEME) ----------------------------- */
function SettingsScreen({ go, themePref, onThemeChange }) {
  const options = [
    { value: "light", label: "Light Mode", Icon: Sun },
    { value: "dark", label: "Dark Mode", Icon: Moon },
    { value: "system", label: "Follow Device Theme", Icon: MobileIcon },
  ];
  return (
    <div>
      <TopBar title="Settings" onBack={() => go("profile")} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Appearance</div>
        {options.map((o) => (
          <RadioRow key={o.value} checked={themePref === o.value}
            label={<span><o.Icon size={14} /> &nbsp;{o.label}</span>}
            onSelect={() => onThemeChange(o.value)} />
        ))}
        <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 6, lineHeight: 1.5 }}>
          The app switches themes instantly across every screen.
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- PROFILE ----------------------------- */
function ProfileScreen({ go, user, onLogout, onAccountDeleted, isAdmin, goToOnboarding }) {
  const { config: brandConfig, assets: brandAssets } = useBrand();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [deleteStage, setDeleteStage] = useState(null); // null | "confirm" | "password"
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteShowPw, setDeleteShowPw] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const closeDeleteFlow = () => {
    setDeleteStage(null);
    setDeletePassword("");
    setDeleteError("");
    setDeleteBusy(false);
    setDeleteShowPw(false);
  };

  const submitDelete = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password to continue.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError("");
    const res = await deleteUserAccount({ password: deletePassword });
    if (res.ok) {
      closeDeleteFlow();
      onAccountDeleted && onAccountDeleted();
    } else {
      setDeleteError(res.error || "Couldn't delete your account. Please try again.");
      setDeleteBusy(false);
    }
  };

  const items = [
    { Icon: Bell, label: "Notifications", action: () => go("notifications") },
    { Icon: User, label: "Edit Profile", action: () => go("editProfile") },
    { Icon: GraduationCap, label: "Academic Information", action: () => goToOnboarding() },
    { Icon: BookOpen, label: "My Courses", action: () => go("courses") },
    { Icon: BarChart3, label: "Performance", action: () => go("performance", COURSES[0].code) },
    { Icon: BarChart3, label: "Exam History", action: () => go("examHistory") },
    { Icon: Bookmark, label: "Bookmarks", action: () => go("bookmarks", COURSES[0].code) },
    { Icon: Users, label: "My Posts", action: () => go("myPosts") },
    { Icon: Bookmark, label: "Saved Posts", action: () => go("savedPosts") },
    { Icon: Shield, label: "Community Guidelines", action: () => go("communityGuidelines") },
    { Icon: Settings, label: "Settings", action: () => go("settings") },
    { Icon: Info, label: "About", action: () => go("about") },
    { Icon: Phone, label: "Contact Us", action: () => go("about") },
  ];
  return (
    <div>
      <TopBar title="Menu" />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Logo size={22} variant="dashboard" />
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{brandConfig.appName}</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 16, marginBottom: 18,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: C.bg, display: "flex",
            alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
          }}>
            {(user && user.photo) || brandAssets.defaultProfilePicture
              ? <img loading="lazy" src={(user && user.photo) || brandAssets.defaultProfilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <GraduationCap size={26} color={C.primary} />}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{user ? user.fullName : "Student"}</div>
              {isAdmin && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 800,
                  color: "#fff", background: C.primary, borderRadius: 999, padding: "2px 8px", flexShrink: 0,
                }}>
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: C.textSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user ? (user.email || user.phone) : "FUTA CBT Learner"}
            </div>
          </div>
        </div>
        {isAdmin && (
          <ListRow title="Open Admin Dashboard" subtitle="Control Center" onClick={() => go("adminDashboard")}
            right={<Shield size={18} color={C.primary} />} />
        )}
        {items.map((it) => (
          <ListRow key={it.label} title={it.label} onClick={it.action} />
        ))}

        {!confirmingLogout ? (
          <ListRow title="Log Out" onClick={() => setConfirmingLogout(true)}
            right={<span style={{ fontSize: 13, color: C.danger, fontWeight: 700 }}>→</span>} />
        ) : (
          <div style={{
            background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 14, padding: 14, marginBottom: 10,
          }}>
            <div style={{ fontSize: 12.5, color: C.text, marginBottom: 10 }}>Log out of your account?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingLogout(false)} style={{
                flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.card, color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={onLogout} style={{
                flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: C.danger, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Log Out</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <ListRow title="Delete My Account" subtitle="Permanently erase your account and data"
            onClick={() => setDeleteStage("confirm")}
            right={<Trash size={17} color={C.danger} />} />
        </div>

        {deleteStage && (
          <Modal onClose={deleteBusy ? undefined : closeDeleteFlow}>
            {deleteStage === "confirm" ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Delete Account?</div>
                <div style={{ fontSize: 13, color: C.text, background: C.dangerBg, borderRadius: 12, padding: 14, marginBottom: 18, lineHeight: 1.55, fontWeight: 600 }}>
                  Are you sure you want to permanently delete your EduSphere account? This action cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeDeleteFlow} style={{
                    flex: 1, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
                    borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>Cancel</button>
                  <button onClick={() => setDeleteStage("password")} style={{
                    flex: 1, background: C.danger, color: "#fff", border: "none",
                    borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>Continue</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Confirm Your Password</div>
                <div style={{ fontSize: 12.8, color: C.textSoft, marginBottom: 14, lineHeight: 1.5 }}>
                  For your security, please re-enter your password to permanently delete your account.
                </div>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <input
                    type={deleteShowPw ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Password"
                    disabled={deleteBusy}
                    style={{
                      width: "100%", padding: "12px 42px 12px 14px", borderRadius: 12,
                      border: `1.5px solid ${deleteError ? C.danger : C.border}`, background: C.bg,
                      color: C.text, fontSize: 13.5, outline: "none",
                    }}
                  />
                  <button onClick={() => setDeleteShowPw((v) => !v)} aria-label="Toggle password visibility" style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                  }}>
                    {deleteShowPw ? <EyeOff size={16} color={C.textSoft} /> : <Eye size={16} color={C.textSoft} />}
                  </button>
                </div>
                {deleteError && <AuthError text={deleteError} />}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={closeDeleteFlow} disabled={deleteBusy} style={{
                    flex: 1, background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
                    borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: deleteBusy ? "default" : "pointer",
                  }}>Cancel</button>
                  <button onClick={submitDelete} disabled={deleteBusy} style={{
                    flex: 1, background: C.danger, color: "#fff", border: "none",
                    borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700,
                    cursor: deleteBusy ? "default" : "pointer", opacity: deleteBusy ? 0.75 : 1,
                  }}>{deleteBusy ? "Deleting…" : "Delete Permanently"}</button>
                </div>
              </>
            )}
          </Modal>
        )}

        <div style={{ textAlign: "center", marginTop: 26, color: C.textSoft, fontSize: 12 }}>
          <div style={{ fontWeight: 800, color: C.text, fontSize: 13 }}>{brandConfig.appName}</div>
          <div>Version 5.2</div>
          <div style={{ marginTop: 8 }}>Created by <b style={{ color: C.primary }}>Cletus Tech</b></div>
          {brandConfig.contactPhone && <div>WhatsApp: {brandConfig.contactPhone}</div>}
          <div style={{ marginTop: 4 }}>{brandConfig.copyright}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- EDIT PROFILE ----------------------------- */
/* Live storage usage + quota, for the small indicator on Edit Profile. */
function useStorageUsage(uid) {
  const [state, setState] = useState({ usedBytes: 0, quotaMB: DEFAULT_STORAGE_QUOTA_MB, loading: true });
  useEffect(() => {
    if (!fbDb || !uid) { setState((s) => ({ ...s, loading: false })); return undefined; }
    getStorageQuotaMB().then((quotaMB) => setState((s) => ({ ...s, quotaMB })));
    const unsubscribe = fbDb.collection("users").doc(uid).onSnapshot(
      (snap) => setState((s) => ({ ...s, usedBytes: (snap.exists && snap.data().storageUsedBytes) || 0, loading: false })),
      () => setState((s) => ({ ...s, loading: false }))
    );
    return () => unsubscribe();
  }, [uid]);
  return state;
}
function StorageUsageBar({ uid }) {
  const { usedBytes, quotaMB, loading } = useStorageUsage(uid);
  if (loading) return null;
  const usedMB = usedBytes / 1048576;
  const pct = Math.min(100, Math.round((usedMB / quotaMB) * 100));
  const nearLimit = pct >= 90;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textSoft, marginBottom: 4 }}>
        <span>Storage used</span><span style={{ fontWeight: 700, color: nearLimit ? C.danger : C.text }}>{usedMB.toFixed(1)}MB / {quotaMB}MB</span>
      </div>
      <div style={{ height: 6, borderRadius: 20, background: C.bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: nearLimit ? C.danger : C.primary, borderRadius: 20 }} />
      </div>
    </div>
  );
}

function EditProfileScreen({ go, user, onSave }) {
  const { assets: brandAssets } = useBrand();
  const [fullName, setFullName] = useState(user ? user.fullName : "");
  const [email, setEmail] = useState(user ? user.email : "");
  const [phone, setPhone] = useState(user ? user.phone : "");
  const [photo, setPhoto] = useState(user ? user.photo : null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [lastPhotoFile, setLastPhotoFile] = useState(null); // kept only so Retry can re-attempt without re-picking
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwInfo, setPwInfo] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  if (!user) return null;

  const uploadPhoto = async (file) => {
    setPhotoError(""); setPhotoBusy(true);
    try {
      const url = await uploadProfilePhoto(file, user.id);
      setPhoto(url);
      setLastPhotoFile(null);
    } catch (err) {
      logUploadError(err);
      setPhotoError(describeUploadError(err));
      setLastPhotoFile(file); // so Retry can re-attempt the exact same file
    } finally {
      // Always reset — a failed photo upload must never leave "Change Profile
      // Picture" stuck showing "Uploading…" with the input disabled.
      setPhotoBusy(false);
    }
  };
  const handlePhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    await uploadPhoto(file);
  };

  const [saving, setSaving] = useState(false);

  const saveInfo = async () => {
    setError(""); setInfo("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (email && !isEmailFormat(email)) return setError("Enter a valid email address.");
    if (phone && !isPhoneFormat(phone)) return setError("Enter a valid phone number.");
    if (!email.trim()) return setError("An email address is required.");

    setSaving(true);
    try {
      const oldPhoto = user.photo;
      const updated = await updateUserRecord(user.id, {
        fullName: fullName.trim(),
        email: normalizeIdentifier(email),
        phone: phone.trim(),
        photo,
      });
      if (photo !== oldPhoto && oldPhoto) deleteStorageUrlAndRefund(oldPhoto, user.id).catch(() => {});
      onSave(updated);
      setInfo("Profile updated.");
    } catch (err) {
      setError(firebaseAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError(""); setPwInfo("");
    if (!currentPw) return setPwError("Enter your current password.");
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters.");
    if (newPw !== confirmPw) return setPwError("New passwords do not match.");
    setPwLoading(true);
    try {
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPw);
      await fbAuth.currentUser.reauthenticateWithCredential(credential);
      await fbAuth.currentUser.updatePassword(newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwInfo("Password changed successfully.");
    } catch (err) {
      setPwError(firebaseAuthErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Edit Profile" onBack={() => go("profile")} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{
            width: 84, height: 84, borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10,
          }}>
            {photo ? <img loading="lazy" src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : brandAssets.defaultProfilePicture ? <img loading="lazy" src={brandAssets.defaultProfilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <GraduationCap size={36} color={C.primary} />}
          </div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.primary, cursor: photoBusy ? "default" : "pointer" }}>
            {photoBusy ? "Uploading…" : "Change Profile Picture"}
            <input type="file" accept="image/*" onChange={handlePhoto} disabled={photoBusy} style={{ display: "none" }} />
          </label>
          {photoError && !photoBusy && (
            <div style={{ width: "100%", marginTop: 10 }}>
              <UploadFailBanner error={photoError} onRetry={lastPhotoFile ? () => uploadPhoto(lastPhotoFile) : undefined} />
            </div>
          )}
        </div>

        <StorageUsageBar uid={user.id} />

        <AuthError text={error} />
        <AuthSuccess text={info} />
        <AuthInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <AuthInput label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <AuthInput label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080..." />
        <button onClick={saveInfo} disabled={saving || photoBusy} style={{
          width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
          background: saving ? C.textFaint : C.primary, color: "#fff", fontWeight: 800, fontSize: 14.5,
          cursor: saving ? "default" : "pointer", marginBottom: 26,
        }}>{saving ? "Saving..." : "Save Changes"}</button>

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 12 }}>Change Password</div>
        <AuthError text={pwError} />
        <AuthSuccess text={pwInfo} />
        <AuthInput label="Current Password" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        <AuthInput label="New Password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" />
        <AuthInput label="Confirm New Password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        <button onClick={changePassword} disabled={pwLoading} style={{
          width: "100%", padding: "13px 0", borderRadius: 14, border: `1.5px solid ${C.primary}`,
          background: "transparent", color: C.primary, fontWeight: 800, fontSize: 14.5,
          cursor: pwLoading ? "default" : "pointer",
        }}>{pwLoading ? "Saving..." : "Change Password"}</button>
      </div>
    </div>
  );
}

const WHATSAPP_PHONE_INTL = "2349066528682"; // 09066528682 in international format
function openWhatsAppSupport(onFallback) {
  const appUrl = `whatsapp://send?phone=${WHATSAPP_PHONE_INTL}&text=${encodeURIComponent("Hi, I need help with EduSphere")}`;
  let left = false;
  const markLeft = () => { left = true; };
  window.addEventListener("blur", markLeft);
  document.addEventListener("visibilitychange", markLeft);
  window.location.href = appUrl;
  setTimeout(() => {
    window.removeEventListener("blur", markLeft);
    document.removeEventListener("visibilitychange", markLeft);
    if (!left && !document.hidden) onFallback && onFallback();
  }, 1200);
}

const EXPERTISE_AREAS = [
  "Artificial Intelligence (AI)", "Software Engineering", "Educational Technology", "Firebase Development",
  "Full-Stack Web Development", "Mobile App Development", "CBT System Development", "Prompt Engineering",
  "YouTube Automation", "Digital Product Development", "Social Media Automation", "Technology Consulting",
];

const COMING_SOON_FEATURES = [
  "AI Study Assistant", "Flashcards", "Daily Quiz", "Leaderboard", "Voice Reading", "Study Planner",
  "Offline Mode", "Improved Analytics", "More Courses", "More Practice Questions",
  "Performance Insights", "Personalized Recommendations",
];

/* ----------------------------- ONBOARDING WIZARD ----------------------------- */
/* Reusable action button for the Academic Selection steps (School/Department/Level) —
   full-width, premium shadow, disabled state, loading spinner, hover lift (web) and a
   tap ripple (mobile), with a subtle fade-slide reveal each time it becomes the active
   step's button. Sticky-positioned by its caller rather than fixed, so it sits directly
   under short content and only pins to the viewport edge once content overflows. */
function StepActionButton({ label, onClick, disabled, loading, revealKey }) {
  const [ripples, setRipples] = useState([]);
  const addRipple = (e) => {
    if (disabled || loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.4;
    const id = `${Date.now()}-${Math.random()}`;
    setRipples((prev) => [...prev, { id, x, y, size }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  };
  return (
    <button
      key={revealKey /* remounts on step change so the reveal animation replays */}
      className="flContinueBtn"
      onClick={onClick}
      onMouseDown={addRipple}
      onTouchStart={addRipple}
      disabled={disabled || loading}
      style={{
        position: "relative", overflow: "hidden", width: "100%", height: 54, borderRadius: 16, border: "none",
        background: (disabled || loading) ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
        color: (disabled || loading) ? C.textFaint : "#fff", fontSize: 15.5, fontWeight: 800,
        cursor: (disabled || loading) ? "default" : "pointer",
        boxShadow: (disabled || loading) ? "none" : "0 10px 24px rgba(21,101,192,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        animation: "flContinueIn .35s ease",
      }}>
      {loading && (
        <span style={{
          width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.4)",
          borderTopColor: "#fff", animation: "flSpin .6s linear infinite", display: "inline-block", flexShrink: 0,
        }} />
      )}
      <span>{label}</span>
      {ripples.map((r) => (
        <span key={r.id} className="flRippleSpan" style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size }} />
      ))}
    </button>
  );
}

/* Tracks how much the on-screen keyboard is covering the viewport, so a sticky footer
   button can lift above it instead of being hidden underneath. Only reacts to genuine
   keyboard-sized shifts (not minor browser-chrome resizes) and returns 0 once the
   keyboard closes, restoring the normal layout automatically. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (!window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const onResize = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(gap > 60 ? gap : 0);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); };
  }, []);
  return inset;
}

function OnboardingScreen({ go, user, onSave, returnTo }) {
  const [step, setStep] = useState(1);

  // v8.0 Module 1 — School/Department/Level now come from the live, admin-managed
  // academic hierarchy instead of the hardcoded SCHOOL_CATALOG. Both branches below are
  // normalized to the same { id, name } shape so the rest of this screen never needs to
  // know which source it's rendering. The static catalog is only used for the brief
  // window before the live "schools" collection has responded (or if Firestore is ever
  // unreachable) — exactly the same fallback pattern useLiveCourses() already uses.
  const { schools, departmentsForSchool, levels } = useAcademicStructure();
  const live = schools.length > 0;
  const liveSchools = live ? schools.map((s) => ({ id: s.id, name: s.name })) : SCHOOL_LIST.map((s) => ({ id: s, name: s }));
  const liveLevels = levels.length > 0 ? levels.map((l) => ({ id: l.id, name: l.name, number: l.number }))
    : ["100", "200", "300", "400", "500"].map((n) => ({ id: n, name: `${n} Level`, number: Number(n) }));

  const [schoolId, setSchoolId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [levelId, setLevelId] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState(user?.registeredCourses || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const depts = live ? departmentsForSchool(schoolId).map((d) => ({ id: d.id, name: d.name }))
    : deptsForSchool(schoolId).map((d) => ({ id: d, name: d }));
  const school = liveSchools.find((s) => s.id === schoolId) || null;
  const department = depts.find((d) => d.id === departmentId) || null;
  const level = liveLevels.find((l) => l.id === levelId) || null;

  // Preselect from an existing profile (re-opening onboarding to edit) once the live
  // hierarchy has loaded — the saved profile stores names, so match on name.
  useEffect(() => {
    if (schoolId || !user?.school) return;
    const match = liveSchools.find((s) => s.name === user.school);
    if (match) setSchoolId(match.id);
  }, [liveSchools.length, user?.school]);
  useEffect(() => {
    if (departmentId || !user?.department || !schoolId) return;
    const match = depts.find((d) => d.name === user.department);
    if (match) setDepartmentId(match.id);
  }, [schoolId, user?.department]);
  useEffect(() => {
    if (levelId || !user?.level) return;
    const match = liveLevels.find((l) => l.name === user.level || String(l.number) === String(user.level));
    if (match) setLevelId(match.id);
  }, [liveLevels.length, user?.level]);

  const liveCourses = useLiveCourses();
  const availableCourses = live
    ? liveCourses.filter((c) => c.departmentId === departmentId && c.levelId === levelId)
    : coursesForDeptLevel(school ? school.name : null, department ? department.name : null, level ? String(level.number) : null);
  const totalSteps = 4;

  const finish = async (completed) => {
    setSaving(true);
    setError("");
    const schoolName = school ? school.name : null;
    const departmentName = department ? department.name : null;
    const levelName = level ? level.name : null;
    const res = await saveOnboardingProfile(user.id, {
      school: schoolName, department: departmentName, level: levelName, registeredCourses: selectedCourses, completed,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error); return; }
    onSave && onSave({
      ...user, school: schoolName, department: departmentName, level: levelName, registeredCourses: selectedCourses,
      profileCompleted: completed, onboardingPromptShown: true,
    });
    go(returnTo || "home");
  };

  const skip = async () => {
    // Skipping mid-wizard still records that the prompt was shown, so it
    // won't auto-pop again on next login — only from Profile.
    setSaving(true);
    await dismissOnboardingPrompt(user.id);
    setSaving(false);
    onSave && onSave({ ...user, onboardingPromptShown: true });
    go(returnTo || "home");
  };

  const toggleCourse = (code) => {
    setSelectedCourses((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const StepDots = () => (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 22 : 8, height: 8, borderRadius: 999,
          background: i + 1 <= step ? C.primary : C.border, transition: "all .2s",
        }} />
      ))}
    </div>
  );

  const Option = ({ label, subtitle, selected, onClick }) => (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
      background: selected ? C.primary + "14" : C.cardAlt, border: `1.5px solid ${selected ? C.primary : C.border}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer",
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? C.primary : C.text }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {selected && <CheckCircle2 size={18} color={C.primary} />}
    </button>
  );

  // Continue is a local step change (no network call) — a brief spinner still gives
  // immediate, honest visual feedback that the tap registered, per the UX requirement,
  // without adding artificial latency to an otherwise-instant transition.
  const [advancing, setAdvancing] = useState(false);
  const handleContinue = () => {
    setAdvancing(true);
    setTimeout(() => { setStep((s) => s + 1); setAdvancing(false); }, 180);
  };
  const kbInset = useKeyboardInset();
  const stepValid = (step === 1 && schoolId) || (step === 2 && departmentId) || (step === 3 && levelId) || step === 4;
  const cardStyle = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20,
    boxShadow: "0 8px 28px rgba(21,101,192,0.08)", marginBottom: 24, animation: "flFadeUp .35s ease",
  };
  // Sticky (not fixed): sits right below the card with no extra gap when content is
  // short, and pins to the viewport edge (respecting the keyboard and safe-area insets)
  // only once content is tall enough to scroll — solving both problems at once.
  const actionBarStyle = {
    position: "sticky", bottom: kbInset > 0 ? kbInset + 10 : "calc(10px + env(safe-area-inset-bottom, 0px))",
    zIndex: 5, transition: "bottom .18s ease",
  };

  return (
    <div>
      <TopBar title="Academic Profile"
        onBack={step > 1 ? () => setStep(step - 1) : () => go(returnTo || "home")}
        right={<button onClick={skip} disabled={saving} style={{
          background: "transparent", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>Skip for Now</button>} />
      <div style={{ padding: 16, paddingBottom: 24 }}>
        <StepDots />
        {error && (
          <div style={{ background: "#fee", border: "1px solid #f99", borderRadius: 10, padding: 10, marginBottom: 14, color: "#c00", fontSize: 12.5 }}>{error}</div>
        )}

        {step === 1 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Which school are you in?</div>
            <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 18 }}>This helps us tailor courses and content to you.</div>
            <div className="flScrollY flNoScrollX" style={{ maxHeight: liveSchools.length > 6 ? "56vh" : "none", overscrollBehavior: "contain" }}>
              {liveSchools.map((s) => (
                <Option key={s.id} label={s.name} selected={schoolId === s.id}
                  onClick={() => { setSchoolId(s.id); setDepartmentId(null); }} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Which department?</div>
            <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 18 }}>{school && school.name}</div>
            <div className="flScrollY flNoScrollX" style={{ maxHeight: depts.length > 6 ? "56vh" : "none", overscrollBehavior: "contain" }}>
              {depts.map((d) => (
                <Option key={d.id} label={d.name} selected={departmentId === d.id} onClick={() => setDepartmentId(d.id)} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>What level are you?</div>
            <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 18 }}>{department && department.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {liveLevels.map((lvl) => (
                <button key={lvl.id} onClick={() => setLevelId(lvl.id)} style={{
                  background: levelId === lvl.id ? C.primary : C.cardAlt, border: `1.5px solid ${levelId === lvl.id ? C.primary : C.border}`,
                  borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 800,
                  color: levelId === lvl.id ? "#fff" : C.text, cursor: "pointer",
                }}>{lvl.name}</button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>Register your courses</div>
            <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 18 }}>
              Optional — these become your default dashboard courses. You can change them anytime.
            </div>
            {availableCourses.length === 0 ? (
              <div style={{ textAlign: "center", color: C.textSoft, fontSize: 13, padding: "30px 10px", background: C.cardAlt, borderRadius: 14, border: `1px solid ${C.border}` }}>
                Courses for {level && level.name} in {department && department.name} are coming soon. You can still finish setup and register courses later.
              </div>
            ) : availableCourses.map((c) => (
              <label key={c.code} onClick={() => toggleCourse(c.code)} style={{
                display: "flex", alignItems: "center", gap: 12, background: C.cardAlt,
                border: `1.5px solid ${selectedCourses.includes(c.code) ? C.primary : C.border}`,
                borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${selectedCourses.includes(c.code) ? C.primary : C.border}`,
                  background: selectedCourses.includes(c.code) ? C.primary : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {selectedCourses.includes(c.code) && <CheckCircle2 size={13} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{c.code}</div>
                  <div style={{ fontSize: 11.5, color: C.textSoft }}>{c.name}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={actionBarStyle}>
          {step < totalSteps ? (
            <StepActionButton label="Continue" onClick={handleContinue} disabled={!stepValid} loading={advancing} revealKey={step} />
          ) : (
            <StepActionButton label={saving ? "Saving…" : "Finish Setup"} onClick={() => finish(true)} disabled={false} loading={saving} revealKey={step} />
          )}
        </div>
      </div>
    </div>
  );
}

function AboutScreen({ go }) {
  const [waFallback, setWaFallback] = useState(false);
  const { config: brandConfig } = useBrand();
  const whatsAppNumber = brandConfig.contactPhone || "09066528682";
  return (
    <div>
      <TopBar title="About" onBack={() => go("profile")} />
      <div style={{ padding: 16 }}>
        {/* App identity banner */}
        <div style={{
          borderRadius: 20, padding: "26px 22px", textAlign: "center", color: "#fff", marginBottom: 18,
          background: `linear-gradient(160deg, ${C.primary}, ${C.secondary})`,
          animation: "flFadeUp 0.4s ease",
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: 20, background: "rgba(255,255,255,0.14)", margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Logo size={54} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{brandConfig.appName}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700 }}>
            {brandConfig.tagline}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.95, marginTop: 8 }}>App Version 5.2</div>
        </div>

        {/* Premium profile card — About Cletus Tech */}
        <div style={{
          borderRadius: 20, overflow: "hidden", marginBottom: 16, border: `1px solid ${C.border}`,
          boxShadow: "0 8px 28px rgba(21,101,192,0.10)", animation: "flFadeUp 0.5s ease",
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.primary}, #1E40AF)`, padding: "30px 20px 46px",
            textAlign: "center", position: "relative",
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: "50%", background: "rgba(255,255,255,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
              border: "3px solid rgba(255,255,255,0.35)", animation: "flFloat 4s ease-in-out infinite",
            }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#fff" }}>CT</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Cletus Tech</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: 600, lineHeight: 1.5 }}>
              AI Engineer • Software Developer<br />Education Technology Consultant
            </div>
          </div>
          <div style={{ background: C.card, padding: "18px 18px 20px", marginTop: -26, borderRadius: "20px 20px 0 0", position: "relative" }}>
            <div style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.7 }}>
              {brandConfig.description}
            </div>
          </div>
        </div>

        {/* Areas of expertise */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Sparkles size={18} color={C.primary} />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>Areas of Expertise</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXPERTISE_AREAS.map((f) => (
              <span key={f} style={{
                fontSize: 11, fontWeight: 600, color: C.primary, background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 11px",
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Vision */}
        <div style={{
          borderRadius: 16, padding: 16, marginBottom: 16, color: "#fff",
          background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>
            Our Vision
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600 }}>
            To build Africa's smartest educational platform that empowers students through technology and
            intelligent learning solutions.
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <MessageCircle size={18} color={C.primary} />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>Contact Information</div>
          </div>
          <div style={{ fontSize: 12.8, color: C.textSoft, marginBottom: 4 }}>WhatsApp: <b style={{ color: C.text }}>{whatsAppNumber}</b></div>
          <div style={{ fontSize: 12.8, color: C.textSoft, marginBottom: 12 }}>
            Email: <a href={`mailto:${brandConfig.supportEmail || "ogijicletus22@gmail.com"}`} style={{ color: C.primary, fontWeight: 700, textDecoration: "none" }}>{brandConfig.supportEmail || "ogijicletus22@gmail.com"}</a>
          </div>
          <button onClick={() => openWhatsAppSupport(() => setWaFallback(true))} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#25D366", color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 0", fontSize: 13.5, fontWeight: 800, cursor: "pointer",
          }}>
            <MessageCircle size={16} color="#fff" /> WhatsApp Support
          </button>
        </div>

        {waFallback && (
          <Modal onClose={() => setWaFallback(false)}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>Couldn't Open WhatsApp</div>
            <div style={{ fontSize: 12.8, color: C.textSoft, lineHeight: 1.6, marginBottom: 18 }}>
              It looks like WhatsApp isn't installed on this device. You can reach us at <b style={{ color: C.text }}>{whatsAppNumber}</b>, or open WhatsApp Web instead.
            </div>
            <button onClick={() => { window.open(`https://wa.me/${WHATSAPP_PHONE_INTL}`, "_blank"); setWaFallback(false); }} style={{
              width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 14,
              padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10,
            }}>Open WhatsApp Web</button>
            <button onClick={() => setWaFallback(false)} style={{
              width: "100%", background: "transparent", color: C.text, border: `1.5px solid ${C.border}`,
              borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Close</button>
          </Modal>
        )}

        {/* Coming Soon — student-facing only, nothing confidential */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Coming Soon</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COMING_SOON_FEATURES.map((f) => (
              <span key={f} style={{
                fontSize: 11, fontWeight: 600, color: C.primary, background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 11px",
              }}>{f}</span>
            ))}
          </div>
        </div>

        {(brandConfig.website || brandConfig.privacyUrl || brandConfig.termsUrl) && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {brandConfig.website && <a href={brandConfig.website} target="_blank" rel="noreferrer" style={{ fontSize: 12.8, color: C.primary, fontWeight: 700, textDecoration: "none" }}>Visit our website</a>}
            {brandConfig.privacyUrl && <a href={brandConfig.privacyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.8, color: C.primary, fontWeight: 700, textDecoration: "none" }}>Privacy Policy</a>}
            {brandConfig.termsUrl && <a href={brandConfig.termsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.8, color: C.primary, fontWeight: 700, textDecoration: "none" }}>Terms of Service</a>}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, fontWeight: 700, color: C.textSoft }}>Created by Cletus Tech</div>
        <div style={{ textAlign: "center", marginTop: 4, fontSize: 11.5, color: C.textFaint }}>{brandConfig.copyright}</div>
      </div>
    </div>
  );
}

/* ----------------------------- SUPER ADMIN: CONTROL CENTER -----------------------------
   Phase 1: dashboard shell + full User Management. Every other module below is a
   modular, wired-up placeholder (real navigation target, disabled action) so
   Phase 2 can fill each in without touching the routing or layout again. */
function AccessDeniedScreen({ go }) {
  return (
    <div>
      <TopBar title="Restricted" onBack={() => go("home")} />
      <div style={{ padding: 30, textAlign: "center" }}>
        <Shield size={36} color={C.danger} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15.5, fontWeight: 800, color: C.text, marginBottom: 6 }}>Admins Only</div>
        <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>
          This area is restricted to the Super Admin account. If you believe you should have access, contact Cletus Tech.
        </div>
      </div>
    </div>
  );
}

/* Generic real-time count for any collection (optionally filtered), used to power the live
   Admin Dashboard overview tiles and manager badges. Returns null while first loading. */
function useLiveCount(collectionName, applyQuery) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!fbDb) { setCount(0); return undefined; }
    let ref = fbDb.collection(collectionName);
    if (applyQuery) ref = applyQuery(ref);
    const unsubscribe = ref.onSnapshot(
      (snap) => setCount(snap.size),
      (err) => { EduSphere.Logger.error(`[EduSphere] Live count failed for ${collectionName}:`, err); setCount(0); }
    );
    return () => unsubscribe();
  }, [collectionName]);
  return count;
}

function AdminDashboardScreen({ go, currentUser }) {
  const [userStats, setUserStats] = useState({ loading: true, total: 0, active: 0, suspended: 0, error: null });

  // Real-time — the moment a user is suspended, deleted, or restored anywhere in the app,
  // this updates with no refresh.
  useEffect(() => {
    if (!fbDb) { setUserStats({ loading: false, total: 0, active: 0, suspended: 0, error: "Firebase not connected" }); return undefined; }
    const unsubscribe = fbDb.collection("users").onSnapshot(
      (snap) => {
        let active = 0, suspended = 0;
        snap.forEach((doc) => {
          const d = doc.data() || {};
          if (d.deleted) return;
          if (d.suspended) suspended += 1; else active += 1;
        });
        setUserStats({ loading: false, total: active + suspended, active, suspended, error: null });
      },
      (err) => setUserStats({ loading: false, total: 0, active: 0, suspended: 0, error: err.message || "Couldn't load stats" })
    );
    return () => unsubscribe();
  }, []);

  // Every one of these is a live listener on the exact same collection its Manager screen
  // reads/writes, so the dashboard is never stale and never needs a manual refresh.
  const coursesCount = useLiveCount("courses");
  const notesCount = useLiveCount("notes");
  const flashcardsCount = useLiveCount("flashcards");
  const questionsCount = useLiveCount("questions");
  const announcementsCount = useLiveCount("announcements");
  const postsCount = useLiveCount("communityPosts");
  const pendingPostsCount = useLiveCount("communityPosts", (ref) => ref.where("status", "==", "pending"));
  const openReportsCount = useLiveCount("communityReports", (ref) => ref.where("status", "==", "open"));

  const fmt = (v) => (v === null ? "…" : v);
  const overviewCards = [
    ["Total Users", userStats.loading ? "…" : userStats.total],
    ["Active", userStats.loading ? "…" : userStats.active],
    ["Suspended", userStats.loading ? "…" : userStats.suspended],
    ["Courses", fmt(coursesCount)],
    ["Notes", fmt(notesCount)],
    ["Flashcards", fmt(flashcardsCount)],
    ["Questions", fmt(questionsCount)],
    ["Announcements", fmt(announcementsCount)],
    ["Community Posts", fmt(postsCount)],
  ];

  return (
    <div>
      <TopBar title="Super Admin" onBack={() => go("profile")} right={<NotificationBell uid={currentUser?.id} onClick={() => go("adminNotifications")} dark />} />
      <div style={{ padding: 16, paddingBottom: 30 }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, color: "#fff",
          borderRadius: 18, padding: 18, marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} />
            <div style={{ fontSize: 16, fontWeight: 800 }}>Control Center</div>
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.95, marginTop: 6, lineHeight: 1.5 }}>
            Signed in as {currentUser ? currentUser.email : "admin"}. This dashboard is hidden from every other account.
          </div>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Overview — Live</div>
        {userStats.error ? (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 14, padding: 14, marginBottom: 18, fontSize: 12.5, color: C.danger }}>
            Couldn't load live stats: {userStats.error}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {overviewCards.map(([label, val]) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{val}</div>
                <div style={{ fontSize: 9.5, color: C.textSoft, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>People & Community</div>
        <ListRow title="Notification Center" subtitle="Broadcast, schedule, and track read/delivery status" onClick={() => go("adminNotifications")} />
        <ListRow title="User Management" subtitle="Search, suspend, reactivate, delete, reset passwords" onClick={() => go("adminUsers")} />
        <ListRow title="Community Management" subtitle="Approve/reject/pin/hide posts, resolve reports" onClick={() => go("adminCommunity")}
          badge={(pendingPostsCount || openReportsCount) ? `${fmt(pendingPostsCount)} pending · ${fmt(openReportsCount)} reports` : null} />
        <ListRow title="Leaderboard Manager" subtitle="Rankings, hide students, reset attempts" onClick={() => go("adminLeaderboard")} />

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "18px 0 10px" }}>Content</div>
        <ListRow title="Academic Management" subtitle="Universities, schools, departments, levels & semesters" onClick={() => go("academicHub")} />
        <ListRow title="Courses Manager" subtitle="Create, edit, publish courses" onClick={() => go("adminCourses")} badge={fmt(coursesCount)} />
        <ListRow title="Question Bank Manager" subtitle="Add, edit, bulk-import questions" onClick={() => go("adminQuestions")} badge={fmt(questionsCount)} />
        <ListRow title="Notes Manager" subtitle="Weekly notes per course" onClick={() => go("adminNotes")} badge={fmt(notesCount)} />
        <ListRow title="Flashcards Manager" subtitle="Front/back cards per course" onClick={() => go("adminFlashcards")} badge={fmt(flashcardsCount)} />
        <ListRow title="Homepage Manager" subtitle="Announcements, notices & course showcase" onClick={() => go("adminAnnouncements")} badge={fmt(announcementsCount)} />

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "18px 0 10px" }}>Results & Insights</div>
        <ListRow title="Exam Results Manager" subtitle="Every completed mock exam, all students" onClick={() => go("adminExamResults")} />
        <ListRow title="Exam History Manager" subtitle="Full chronological attempt log" onClick={() => go("adminExamHistory")} />
        <ListRow title="Practice History Manager" subtitle="Untimed practice sessions" onClick={() => go("adminPracticeHistory")} />
        <ListRow title="Analytics Dashboard" subtitle="Usage & performance at a glance" onClick={() => go("adminAnalytics")} />
        <ListRow title="Grade Essays" subtitle="Manually score essay questions from submitted exams" onClick={() => go("adminGradeEssays")} />

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: "18px 0 10px" }}>System</div>
        <ListRow title="Settings" subtitle="Maintenance mode, contact info, app version" onClick={() => go("adminSettings")} />
        <ListRow title="Brand Management" subtitle="App name, tagline, description, legal & contact info" onClick={() => go("adminBrandManagement")} />
        <ListRow title="Branding Assets" subtitle="Logos, favicon, icons, watermark & default images" onClick={() => go("adminBrandAssets")} />

        <div style={{ marginTop: 18, fontSize: 11.5, color: C.textFaint, lineHeight: 1.6, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
          🔒 The Super Admin gate here checks the signed-in email in the app's code. For real protection against direct database access, deploy the <b>firestore.rules</b> file provided alongside this update.
        </div>
      </div>
    </div>
  );
}

function AdminUserRow({ u, isSelf, onSuspendToggle, onMuteToggle, onBanToggle, onWarn, onDelete, onResetPassword, busy }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = u.deleted ? "Deleted" : u.banned ? "Banned" : u.suspended ? "Suspended" : "Active";
  const statusColor = u.deleted ? C.textFaint : (u.banned || u.suspended) ? C.warn : C.success;
  const statusBg = u.deleted ? C.border : (u.banned || u.suspended) ? C.warnBg : C.successBg;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{u.fullName || "(no name)"}{isSelf && <span style={{ fontSize: 10.5, color: C.primary }}> · you</span>}</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>{u.email}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 20, padding: "3px 10px" }}>{status}</span>
          {u.communitySuspended && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.warn }}>Muted</span>}
          {u.warningCount > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.danger }}>{u.warningCount} strike{u.warningCount === 1 ? "" : "s"}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>
        Joined {fmtDate(u.dateJoined)} · Last login {u.lastLogin ? fmtDate(u.lastLogin) : "Never"}
      </div>
      {isSelf ? (
        <div style={{ fontSize: 11.5, color: C.textFaint }}>You can't moderate your own admin account here.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={onResetPassword} disabled={busy} style={{
            flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${C.border}`,
            background: "transparent", color: C.text, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
          }}><KeyRound size={12} /> Reset Password</button>
          {!u.deleted && (
            <button onClick={onSuspendToggle} disabled={busy} style={{
              flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${u.suspended ? C.success : C.warn}`,
              background: "transparent", color: u.suspended ? C.success : C.warn, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
            }}>{u.suspended ? <><UserCheck size={12} /> Reactivate</> : <><Ban size={12} /> Suspend</>}</button>
          )}
          {!u.deleted && (
            <button onClick={onMuteToggle} disabled={busy} style={{
              flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${u.communitySuspended ? C.success : C.warn}`,
              background: "transparent", color: u.communitySuspended ? C.success : C.warn, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
            }}>{u.communitySuspended ? "Unmute" : "Mute"}</button>
          )}
          {!u.deleted && (
            <button onClick={onWarn} disabled={busy} style={{
              flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: "transparent", color: C.text, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
            }}>⚠️ Warn</button>
          )}
          {!u.deleted && (
            <button onClick={onBanToggle} disabled={busy} style={{
              flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${C.danger}`,
              background: u.banned ? "transparent" : C.dangerBg, color: C.danger, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
            }}>{u.banned ? "Unban" : "Ban"}</button>
          )}
          {!u.deleted && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} disabled={busy} style={{
              flex: "1 1 auto", padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${C.danger}`,
              background: C.dangerBg, color: C.danger, fontWeight: 700, fontSize: 11.5, cursor: busy ? "default" : "pointer",
            }}><Trash size={12} /> Delete</button>
          )}
          {confirmDelete && (
            <div style={{ flex: "1 1 100%", display: "flex", gap: 8, marginTop: 2 }}>
              <button onClick={() => setConfirmDelete(false)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: `1.5px solid ${C.border}`,
                background: "transparent", color: C.text, fontWeight: 700, fontSize: 11.5, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={() => { setConfirmDelete(false); onDelete(); }} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                background: C.danger, color: "#fff", fontWeight: 700, fontSize: 11.5, cursor: "pointer",
              }}>Confirm Delete</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminUserManagementScreen({ go, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await fbDb.collection("users").get();
      const list = [];
      snap.forEach((doc) => list.push(mapFirestoreUser(doc.id, doc.data())));
      list.sort((a, b) => (b.dateJoined || "").localeCompare(a.dateJoined || ""));
      setUsers(list);
    } catch (err) {
      setError(err.message || "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const flash = (text) => { setToast(text); setTimeout(() => setToast(null), 3000); };

  const suspendToggle = async (u) => {
    setBusyId(u.id);
    try {
      await fbDb.collection("users").doc(u.id).set({ suspended: !u.suspended }, { merge: true });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, suspended: !u.suspended } : x)));
      flash(u.suspended ? `${u.fullName || u.email} reactivated.` : `${u.fullName || u.email} suspended.`);
      createNotification({
        recipientId: u.id, type: u.suspended ? "userRestored" : "userSuspended", category: "admin", priority: "high",
        title: u.suspended ? "Account restored" : "Account suspended",
        message: u.suspended ? "Your account has been reactivated." : "Your account has been suspended. Contact support for help.",
      }).catch((err) => EduSphere.Logger.error("[EduSphere] suspend notification failed:", err));
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const muteToggle = async (u) => {
    setBusyId(u.id);
    try {
      await setCommunitySuspended(u.id, !u.communitySuspended);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, communitySuspended: !u.communitySuspended } : x)));
      flash(u.communitySuspended ? `${u.fullName || u.email} unmuted.` : `${u.fullName || u.email} muted from posting.`);
      createNotification({
        recipientId: u.id, type: "communityModerated", category: "community", priority: "normal",
        title: u.communitySuspended ? "Community access restored" : "Muted from Community",
        message: u.communitySuspended ? "You can post and comment in the community again." : "You've been muted and can no longer post or comment in the community. Contact support for help.",
      }).catch((err) => EduSphere.Logger.error("[EduSphere] mute notification failed:", err));
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const banToggle = async (u) => {
    if (!u.banned && !confirm(`Ban ${u.fullName || u.email}? This blocks them from logging in at all.`)) return;
    setBusyId(u.id);
    try {
      const reason = u.banned ? null : (prompt("Reason for ban (shown to the user, optional):") || undefined);
      await setUserBanned(u.id, !u.banned, reason);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, banned: !u.banned, banReason: !u.banned ? (reason || "Violated community guidelines.") : null } : x)));
      flash(u.banned ? `${u.fullName || u.email} unbanned.` : `${u.fullName || u.email} banned.`);
      createNotification({
        recipientId: u.id, type: u.banned ? "userRestored" : "userBanned", category: "admin", priority: "high",
        title: u.banned ? "Account restored" : "Account banned",
        message: u.banned ? "Your account has been reactivated." : "Your account has been banned. Contact support if you believe this is a mistake.",
      }).catch((err) => EduSphere.Logger.error("[EduSphere] ban notification failed:", err));
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const warnUserPrompt = async (u) => {
    const reason = prompt(`Reason for warning ${u.fullName || u.email}:`);
    if (reason === null) return; // cancelled
    setBusyId(u.id);
    try {
      await warnUser(u.id, reason || undefined);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, warningCount: (x.warningCount || 0) + 1 } : x)));
      flash(`Warning sent to ${u.fullName || u.email}.`);
      createNotification({
        recipientId: u.id, type: "userWarned", category: "admin", priority: "high",
        title: "You've received a warning", message: reason ? `Reason: ${reason}` : "Please review the Community Guidelines.",
      }).catch((err) => EduSphere.Logger.error("[EduSphere] warn notification failed:", err));
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u) => {
    setBusyId(u.id);
    try {
      // Soft delete: hides the account and blocks future logins immediately.
      // Fully removing the Firebase Auth account (not just the Firestore
      // profile) requires an Admin-SDK Cloud Function — see functions/index.js.
      await fbDb.collection("users").doc(u.id).set({ deleted: true, suspended: true }, { merge: true });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, deleted: true, suspended: true } : x)));
      flash(`${u.fullName || u.email} removed. (Login blocked; Auth account itself needs the Cloud Function to fully delete.)`);
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (u) => {
    setBusyId(u.id);
    try {
      const res = await resetPasswordFor(u.email);
      flash(res.ok ? `Password reset email sent to ${u.email}.` : res.error);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter((u) =>
    !search.trim() ||
    (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <TopBar title="User Management" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 14,
        }}>
          <Search size={16} color={C.textFaint} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..."
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
        </div>

        {toast && (
          <div style={{ background: C.successBg, border: `1px solid ${C.success}`, color: C.success, borderRadius: 12, padding: "10px 14px", fontSize: 12, marginBottom: 12 }}>{toast}</div>
        )}

        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 10 }}>
          {loading ? "Loading users…" : `${filtered.length} of ${users.length} user${users.length === 1 ? "" : "s"}`}
        </div>

        {error && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 12.5, color: C.danger }}>
            {error}
            <button onClick={loadUsers} style={{ display: "block", marginTop: 8, background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", padding: 0 }}>Retry</button>
          </div>
        )}

        {!loading && filtered.length === 0 && !error && <EmptyState text="No users match that search." />}

        {filtered.map((u) => (
          <AdminUserRow key={u.id} u={u} isSelf={currentUser && currentUser.id === u.id} busy={busyId === u.id}
            onSuspendToggle={() => suspendToggle(u)} onMuteToggle={() => muteToggle(u)} onBanToggle={() => banToggle(u)}
            onWarn={() => warnUserPrompt(u)} onDelete={() => deleteUser(u)} onResetPassword={() => resetPassword(u)} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- COMMUNITY DEV MODE (TEMPORARY) -----------------------------
   Until the Admin Dashboard + moderation workflow is finished, new posts publish and
   become visible immediately instead of sitting in "pending" awaiting approval.
   Flip this back to false once moderation is ready — nothing else needs to change,
   since fetchCommunityFeed() already reads status == "approved" by default and
   moderatePost() already knows how to move a post from "pending" to "approved". */
const COMMUNITY_DEV_MODE = true;

/* ============================= COMMUNITY MODULE (v5.2) =============================
   New Firestore collections:
     communityPosts/{postId}
       { authorId, authorName, authorPhoto, authorDept, authorLevel, content,
         images: [dataURL,...] (compressed client-side, max 4), pdfUrl, pdfName, pdfSize,
         category, tags: [lowercase strings], status: "pending"|"approved"|"rejected"|"hidden",
         rejectReason, pinned, locked, isAnnouncement,
         likeCount, commentCount, bookmarkCount, downloadCount, createdAt, updatedAt }
     communityPosts/{postId}/comments/{commentId}
       { authorId, authorName, authorPhoto, content, parentId, pinned, likeCount, likedBy: [uid,...], createdAt }
     communityPosts/{postId}/likes/{uid}      – one doc per liking user, dedupes likes
     communityReports/{reportId}
       { postId, reporterId, reason, details, status: "open"|"resolved", createdAt }
     users/{uid}/bookmarksCommunity/{postId}  – saved posts for that user
     users/{uid}.communitySuspended: bool     – admin can block a user from posting

   ----- COMMUNITY FIRESTORE SECURITY RULES -----
   The current version of these rules, including the temporary dev-mode relaxation
   matching COMMUNITY_DEV_MODE above, lives in the accompanying firestore.rules file.
   Merge that file's communityPosts / communityReports / bookmarksCommunity blocks
   into your existing deployed ruleset rather than replacing the whole thing, since
   your existing users/profile/admin rules aren't part of that file. See the comments
   in firestore.rules for how to flip back to the approval-gated production rules
   once the Admin Dashboard ships. */

const COMMUNITY_CATEGORIES = [
  "Past Questions", "Lecture Notes", "Assignments", "Project Ideas", "Programming",
  "Mathematics", "Physics", "Chemistry", "Engineering", "General Discussion",
  "Announcements", "Study Tips", "Career", "AI & Technology",
];
const REPORT_REASONS = ["Spam", "Harassment", "False Information", "Offensive Content", "Copyright", "Other"];

/* Visibility enforcement is done client-side after the normal category/status
   query, so no new composite indexes are needed. "school" is a no-op today
   since EduSphere is single-school, but the field is kept so a future
   multi-school rollout only needs to change this one function. */
function postVisibleToUser(post, user, isAdmin) {
  if (isAdmin || (user && post.authorId === user.id)) return true;
  const v = post.visibility || "everyone";
  if (v === "everyone" || v === "school") return true;
  if (!user) return false;
  if (v === "department") return !!user.department && user.department === post.authorDept;
  if (v === "level") return !!user.level && user.level === post.authorLevel;
  return true;
}

function parseTags(input) {
  return Array.from(new Set(
    (input || "").split(/[,\s]+/).map((t) => t.replace(/^#/, "").trim().toLowerCase()).filter(Boolean)
  )).slice(0, 8);
}


async function createCommunityPost({ user, content, images, imageThumbs, videos, pdf, category, tags, visibility, mediaBytes }) {
  if (!fbDb || !user) throw new Error("You need to be signed in to post.");
  const doc = {
    authorId: user.id,
    authorName: user.fullName || "Student",
    authorPhoto: user.photo || null,
    authorDept: user.department || null,
    authorLevel: user.level || null,
    content: content || "",
    images: (images || []).slice(0, MAX_IMAGES_PER_POST),
    imageThumbs: (imageThumbs || []).slice(0, MAX_IMAGES_PER_POST),
    videos: (videos || []).slice(0, MAX_VIDEOS_PER_POST),
    pdfUrl: pdf ? pdf.url : null,
    pdfName: pdf ? pdf.name : null,
    pdfSize: pdf ? pdf.size : null,
    mediaBytes: mediaBytes || 0,
    category: category || "General Discussion",
    tags: tags || [],
    visibility: visibility || "everyone",
    status: COMMUNITY_DEV_MODE ? "approved" : "pending",
    rejectReason: null,
    pinned: false,
    locked: false,
    commentsDisabled: false,
    isAnnouncement: false,
    featured: false,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    shareCount: 0,
    downloadCount: 0,
    viewCount: 0,
    uniqueViewCount: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await withTimeout(fbDb.collection("communityPosts").add(doc), 15000, "Publishing post");
  return ref.id;
}

async function fetchCommunityFeed({ status = "approved", category = null, afterDoc = null, pageSize = 12 } = {}) {
  let q = fbDb.collection("communityPosts").where("status", "==", status);
  if (category) q = q.where("category", "==", category);
  q = q.orderBy("pinned", "desc").orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading community feed");
  return { docs: snap.docs, posts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

async function fetchMyPosts(uid, { afterDoc = null, pageSize = 15 } = {}) {
  let q = fbDb.collection("communityPosts").where("authorId", "==", uid).orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading your posts");
  return { docs: snap.docs, posts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

async function fetchAllPostsAdmin({ status = null, afterDoc = null, pageSize = 20 } = {}) {
  let q = fbDb.collection("communityPosts");
  if (status) q = q.where("status", "==", status);
  q = q.orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading posts");
  return { docs: snap.docs, posts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

async function fetchPendingPosts() {
  const snap = await fbDb.collection("communityPosts").where("status", "==", "pending").orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchPost(postId) {
  const doc = await fbDb.collection("communityPosts").doc(postId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function moderatePost(postId, action, extra = {}) {
  const ref = fbDb.collection("communityPosts").doc(postId);

  // removeMedia is special: it has to delete the actual Storage files and refund
  // the author's quota, not just flip a Firestore field, so it's handled separately
  // from the simple field-update actions below.
  if (action === "removeMedia") {
    const snap = await ref.get();
    const post = snap.exists ? snap.data() : null;
    if (post) {
      await cleanupPostMedia(post);
      if (post.authorId && post.mediaBytes) await trackStorageDelta(post.authorId, -post.mediaBytes);
      await ref.update({
        images: [], imageThumbs: [], videos: [], pdfUrl: null, pdfName: null, pdfSize: null, mediaBytes: 0,
        mediaRemovedByAdmin: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      if (post.authorId) {
        await createNotification({ recipientId: post.authorId, type: "postRemoved", category: "community", priority: "normal",
          title: "Media removed", message: `Media on "${post.title || (post.content || "").slice(0, 60) || "your post"}" was removed by a moderator for violating guidelines.`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}` }).catch(() => {});
      }
    }
    return;
  }

  const updates = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
  if (action === "approve") { updates.status = "approved"; updates.rejectReason = null; }
  else if (action === "reject") { updates.status = "rejected"; updates.rejectReason = extra.reason || "Didn't meet community guidelines."; }
  else if (action === "hide") { updates.status = "hidden"; }
  else if (action === "restore") { updates.status = "approved"; }
  else if (action === "pin") { updates.pinned = !!extra.pinned; }
  else if (action === "lock") { updates.locked = !!extra.locked; }
  else if (action === "disableComments") { updates.commentsDisabled = !!extra.disabled; }
  else if (action === "feature") { updates.featured = !!extra.featured; }
  else if (action === "announce") { updates.isAnnouncement = !!extra.isAnnouncement; if (extra.isAnnouncement) updates.pinned = true; }
  await ref.update(updates);

  // Notify the post author about moderation outcomes that affect them.
  try {
    const postSnap = await ref.get();
    const post = postSnap.exists ? postSnap.data() : null;
    if (post && post.authorId) {
      const title = post.title || post.content?.slice(0, 60) || "Your post";
      if (action === "approve") {
        await createNotification({ recipientId: post.authorId, type: "postApproved", category: "community", priority: "normal",
          title: "Post approved", message: `"${title}" is now live in the community.`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}` });
      } else if (action === "reject") {
        await createNotification({ recipientId: post.authorId, type: "postRejected", category: "community", priority: "normal",
          title: "Post rejected", message: `"${title}" wasn't approved: ${updates.rejectReason}`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}` });
      } else if (action === "hide") {
        await createNotification({ recipientId: post.authorId, type: "postRemoved", category: "community", priority: "normal",
          title: "Post removed", message: `"${title}" was removed by a moderator.`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}` });
      } else if (action === "pin" && extra.pinned) {
        await createNotification({ recipientId: post.authorId, type: "pinnedPost", category: "community", priority: "normal",
          title: "Post pinned", message: `"${title}" was pinned to the top of the community.`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}` });
      }
    }
  } catch (err) { EduSphere.Logger.error("[EduSphere] moderatePost notification failed:", err); }
}

async function deleteCommunityPost(postId) {
  const ref = fbDb.collection("communityPosts").doc(postId);
  const snap = await ref.get();
  const post = snap.exists ? snap.data() : null;
  await ref.delete();
  if (post) {
    await cleanupPostMedia(post);
    if (post.authorId && post.mediaBytes) await trackStorageDelta(post.authorId, -post.mediaBytes);
  }
}

const REACTION_TYPES = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "helpful", emoji: "🤝", label: "Helpful" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
];

/* Reactions replace the old binary like. Firestore layout is unchanged
   (communityPosts/{postId}/likes/{uid}), just the doc now carries a `type`.
   post.reactions.{type} holds the per-type tally; post.likeCount stays the
   running total across all types so every existing sort/display that reads
   likeCount keeps working untouched. */
async function setReaction(postId, uid, user, type) {
  const ref = fbDb.collection("communityPosts").doc(postId).collection("likes").doc(uid);
  const postRef = fbDb.collection("communityPosts").doc(postId);
  const existing = await ref.get();
  const prevType = existing.exists ? existing.data().type || "like" : null;

  if (prevType === type) {
    await ref.delete();
    await postRef.update({ [`reactions.${type}`]: firebase.firestore.FieldValue.increment(-1), likeCount: firebase.firestore.FieldValue.increment(-1) });
    return null;
  }
  await ref.set({ type, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  const updates = { [`reactions.${type}`]: firebase.firestore.FieldValue.increment(1) };
  if (prevType) updates[`reactions.${prevType}`] = firebase.firestore.FieldValue.increment(-1);
  else updates.likeCount = firebase.firestore.FieldValue.increment(1);
  await postRef.update(updates);

  if (!prevType) {
    try {
      const postSnap = await postRef.get();
      const post = postSnap.exists ? postSnap.data() : null;
      if (post && post.authorId && post.authorId !== uid) {
        const title = post.title || post.content?.slice(0, 60) || "your post";
        const rt = REACTION_TYPES.find((r) => r.key === type) || REACTION_TYPES[0];
        await createNotification({
          recipientId: post.authorId, senderId: uid, senderName: user?.fullName || "A student", senderPhoto: user?.photo || null,
          type: "like", category: "community", priority: "normal",
          title: "New reaction", message: `${user?.fullName || "Someone"} reacted ${rt.emoji} to "${title}".`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}`,
        });
      }
    } catch (err) { EduSphere.Logger.error("[EduSphere] reaction notification failed:", err); }
  }
  return type;
}

async function getMyReaction(postId, uid) {
  if (!uid) return null;
  const doc = await fbDb.collection("communityPosts").doc(postId).collection("likes").doc(uid).get();
  return doc.exists ? (doc.data().type || "like") : null;
}

async function toggleBookmark(postId, uid) {
  const ref = fbDb.collection("users").doc(uid).collection("bookmarksCommunity").doc(postId);
  const postRef = fbDb.collection("communityPosts").doc(postId);
  const existing = await ref.get();
  if (existing.exists) {
    await ref.delete();
    await postRef.update({ bookmarkCount: firebase.firestore.FieldValue.increment(-1) });
    return false;
  }
  await ref.set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await postRef.update({ bookmarkCount: firebase.firestore.FieldValue.increment(1) });
  return true;
}

async function fetchBookmarkedPosts(uid) {
  const snap = await fbDb.collection("users").doc(uid).collection("bookmarksCommunity").orderBy("savedAt", "desc").limit(50).get();
  const ids = snap.docs.map((d) => d.id);
  const posts = await Promise.all(ids.map((id) => fetchPost(id)));
  return posts.filter(Boolean);
}

async function trackDownload(postId) {
  await fbDb.collection("communityPosts").doc(postId).update({ downloadCount: firebase.firestore.FieldValue.increment(1) });
}

/* Views: every open increments the raw viewCount. uniqueViewCount only goes up
   the first time a given uid (or, for signed-out browsing, a per-device id
   stashed in localStorage) opens that post — so refreshing doesn't inflate it. */
async function trackView(postId, uid) {
  const ref = fbDb.collection("communityPosts").doc(postId);
  const viewerKey = uid || (() => {
    let id = localStorage.getItem("futalearn_anon_viewer_id");
    if (!id) { id = "anon_" + Math.random().toString(36).slice(2); localStorage.setItem("futalearn_anon_viewer_id", id); }
    return id;
  })();
  const seenRef = ref.collection("viewers").doc(viewerKey);
  const updates = { viewCount: firebase.firestore.FieldValue.increment(1) };
  try {
    const seen = await seenRef.get();
    if (!seen.exists) {
      updates.uniqueViewCount = firebase.firestore.FieldValue.increment(1);
      await seenRef.set({ firstViewedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    await ref.update(updates);
  } catch (err) { EduSphere.Logger.error("[EduSphere] trackView failed:", err); }
}

async function trackShare(postId) {
  await fbDb.collection("communityPosts").doc(postId).update({ shareCount: firebase.firestore.FieldValue.increment(1) });
}

/* "Share inside EduSphere": creates a lightweight new post that quotes the
   original (content/first image/author), rather than duplicating all its
   media. Counts as a share on the original post too. */
async function repostCommunityPost({ user, original, caption }) {
  const ref = await fbDb.collection("communityPosts").add({
    authorId: user.id, authorName: user.fullName || "Student", authorPhoto: user.photo || null,
    authorDept: user.department || null, authorLevel: user.level || null,
    content: caption || "", images: [], videos: [], pdfUrl: null, pdfName: null, pdfSize: null,
    category: original.category || "General Discussion", tags: original.tags || [], visibility: "everyone",
    status: COMMUNITY_DEV_MODE ? "approved" : "pending", rejectReason: null,
    pinned: false, locked: false, commentsDisabled: false, isAnnouncement: false, featured: false,
    likeCount: 0, commentCount: 0, bookmarkCount: 0, shareCount: 0, downloadCount: 0, viewCount: 0, uniqueViewCount: 0,
    repostOf: { postId: original.id, authorName: original.authorName, content: (original.content || "").slice(0, 200), image: (original.images || [])[0] || null },
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await trackShare(original.id);
  return ref.id;
}

async function fetchComments(postId) {
  const snap = await fbDb.collection("communityPosts").doc(postId).collection("comments").orderBy("createdAt", "asc").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function addComment({ postId, user, content, parentId, image, mentions }) {
  const postRef = fbDb.collection("communityPosts").doc(postId);
  await postRef.collection("comments").add({
    authorId: user.id, authorName: user.fullName || "Student", authorPhoto: user.photo || null,
    content, image: image || null, mentions: mentions || [], parentId: parentId || null, pinned: false, likeCount: 0, likedBy: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await postRef.update({ commentCount: firebase.firestore.FieldValue.increment(1) });

  try {
    const postSnap = await postRef.get();
    const post = postSnap.exists ? postSnap.data() : null;
    if (!post) return;
    const title = post.title || post.content?.slice(0, 60) || "your post";
    if (parentId) {
      // Reply — notify the parent comment's author (if different from the replier).
      const parentSnap = await postRef.collection("comments").doc(parentId).get();
      const parent = parentSnap.exists ? parentSnap.data() : null;
      if (parent && parent.authorId && parent.authorId !== user.id) {
        await createNotification({
          recipientId: parent.authorId, senderId: user.id, senderName: user.fullName || "A student", senderPhoto: user.photo || null,
          type: "reply", category: "community", priority: "normal",
          title: "New reply", message: `${user.fullName || "Someone"} replied to your comment on "${title}".`,
          targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}`,
        });
      }
    } else if (post.authorId && post.authorId !== user.id) {
      // Top-level comment — notify the post author.
      await createNotification({
        recipientId: post.authorId, senderId: user.id, senderName: user.fullName || "A student", senderPhoto: user.photo || null,
        type: "comment", category: "community", priority: "normal",
        title: "New comment", message: `${user.fullName || "Someone"} commented on "${title}".`,
        targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}`,
      });
    }
    const mentionedIds = (mentions || []).filter((id) => id !== user.id && id !== post.authorId);
    if (mentionedIds.length) {
      await createNotificationsBatch(mentionedIds, {
        senderId: user.id, senderName: user.fullName || "A student", senderPhoto: user.photo || null,
        type: "mention", category: "community", priority: "normal",
        title: "You were mentioned", message: `${user.fullName || "Someone"} mentioned you in a comment on "${title}".`,
        targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}`,
      });
    }
  } catch (err) { EduSphere.Logger.error("[EduSphere] comment notification failed:", err); }
}

async function editComment(postId, commentId, content) {
  await fbDb.collection("communityPosts").doc(postId).collection("comments").doc(commentId)
    .update({ content, editedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

async function deleteCommentDoc(postId, commentId) {
  await fbDb.collection("communityPosts").doc(postId).collection("comments").doc(commentId).delete();
  await fbDb.collection("communityPosts").doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) });
}

async function toggleCommentLike(postId, commentId, uid, wasLiked) {
  const ref = fbDb.collection("communityPosts").doc(postId).collection("comments").doc(commentId);
  await ref.update({
    likeCount: firebase.firestore.FieldValue.increment(wasLiked ? -1 : 1),
    likedBy: wasLiked ? firebase.firestore.FieldValue.arrayRemove(uid) : firebase.firestore.FieldValue.arrayUnion(uid),
  });
}

async function pinComment(postId, commentId, pinned) {
  await fbDb.collection("communityPosts").doc(postId).collection("comments").doc(commentId).update({ pinned });
}

async function submitReport({ postId, uid, reporterName, reason, details, postAuthorId, postAuthorName, postSnippet }) {
  await fbDb.collection("communityReports").add({
    postId, reporterId: uid, reporterName: reporterName || "A student", reason, details: details || "", status: "open",
    postAuthorId: postAuthorId || null, postAuthorName: postAuthorName || null, postSnippet: postSnippet || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  try {
    const adminIds = await getAdminUserIds();
    await createNotificationsBatch(adminIds, {
      type: "reportSubmitted", category: "admin", priority: "high",
      title: "New report submitted", message: `A post was reported: ${reason}.`,
      targetCollection: "communityPosts", targetDocumentId: postId, actionUrl: `postDetail:${postId}`,
    });
  } catch (err) { EduSphere.Logger.error("[EduSphere] report notification failed:", err); }
}

async function fetchReports(status = "open") {
  const snap = await fbDb.collection("communityReports").where("status", "==", status).orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function fetchTopStrikes() {
  const snap = await withTimeout(fbDb.collection("users").orderBy("warningCount", "desc").limit(5).get(), 15000, "Loading strikes").catch(() => null);
  if (!snap) return [];
  return snap.docs.map((d) => mapFirestoreUser(d.id, d.data())).filter((u) => u.warningCount > 0);
}

async function resolveReport(reportId) {
  const ref = fbDb.collection("communityReports").doc(reportId);
  const snap = await ref.get();
  const report = snap.exists ? snap.data() : null;
  await ref.update({ status: "resolved" });
  try {
    if (report && report.reporterId) {
      await createNotification({
        recipientId: report.reporterId, type: "reportResolved", category: "admin", priority: "normal",
        title: "Report resolved", message: "Thanks for the report — our moderators have reviewed and resolved it.",
        targetCollection: "communityPosts", targetDocumentId: report.postId || null,
        actionUrl: report.postId ? `postDetail:${report.postId}` : null,
      });
    }
  } catch (err) { EduSphere.Logger.error("[EduSphere] resolveReport notification failed:", err); }
}

/* "Mute" = blocked from posting/commenting in the community, but can still log in
   and browse. Backed by the same field community posting already checked. */
async function setCommunitySuspended(uid, suspended) {
  await fbDb.collection("users").doc(uid).set({ communitySuspended: suspended }, { merge: true });
}

/* "Ban" = blocked from logging in at all (checked at the login gate), distinct from
   "Suspend" mainly by intent/severity — both a full-timeline admin can reverse. */
async function setUserBanned(uid, banned, reason) {
  await fbDb.collection("users").doc(uid).set({ banned, banReason: banned ? (reason || "Violated community guidelines.") : null }, { merge: true });
}

/* "Warn" = a recorded strike that doesn't block anything by itself, but shows up
   in the user's record and the Reports dashboard's strike count. */
async function warnUser(uid, reason) {
  await fbDb.collection("users").doc(uid).set({
    warningCount: firebase.firestore.FieldValue.increment(1),
    warnings: firebase.firestore.FieldValue.arrayUnion({ reason: reason || "Violated community guidelines.", at: new Date().toISOString() }),
  }, { merge: true });
}

/* ============================================================================
   NOTIFICATION SYSTEM — Firestore-backed, real-time, no hardcoded data.
   Collection: "notifications". Every document follows the schema below and is
   generated automatically by app events (comments, likes, moderation, exam
   results, admin broadcasts, etc). See firestore.rules / firestore.indexes.json
   deliverables for the security rules and composite indexes this relies on.
   ============================================================================ */

/* Doc shape:
   { notificationId (== doc id), recipientId, senderId, senderName, senderPhoto,
     type, title, message, icon, priority ("normal"|"high"|"urgent"),
     category ("community"|"cbt"|"courses"|"notes"|"admin"|"security"|"system"),
     targetCollection, targetDocumentId, actionUrl,
     isRead, isDeleted, openedAt, broadcastId,
     createdAt (server ts), updatedAt (server ts) } */

const NOTIFICATION_ICONS = {
  newPost: "💬", comment: "💬", reply: "↩️", like: "❤️", mention: "📣", bookmark: "🔖",
  newMessage: "✉️",
  reportSubmitted: "🚩", reportResolved: "✅", postApproved: "✅", postRejected: "❌",
  postRemoved: "🗑️", pinnedPost: "📌", lockedPost: "🔒", announcement: "📢",
  examCompleted: "📝", practiceCompleted: "📘", highScore: "🏆", leaderboardPosition: "📊",
  weeklyChallenge: "🎯", achievement: "🏅", certificate: "🎓",
  courseNew: "📚", courseUpdated: "🔄", courseRemoved: "🗑️", courseReopened: "📗", courseArchived: "📦",
  noteNew: "📄", noteUpdated: "🔄", pdfNew: "📎", pdfRemoved: "🗑️",
  userRegistered: "🆕", userSuspended: "🚫", userRestored: "✅", userDeleted: "🗑️",
  userBanned: "⛔", userWarned: "⚠️", communityModerated: "🔇",
  passwordChanged: "🔐", emailChanged: "✉️", accountLogin: "🔓", newDeviceLogin: "📱", suspiciousLogin: "⚠️",
  maintenance: "🛠️", serverUpdate: "🔄", bugFix: "🐞", versionUpdate: "🆙", systemAnnouncement: "📣",
};

const NOTIFICATION_CATEGORY_LABELS = {
  community: "Community", cbt: "CBT & Practice", courses: "Courses", notes: "Notes",
  admin: "Admin", security: "Security", system: "System", messages: "Messages",
};

/* Core write: creates a single notification for one recipient. Fire-and-forget
   safe — callers don't await failures blocking the user's primary action. */
async function createNotification({
  recipientId, senderId = null, senderName = null, senderPhoto = null,
  type, title, message, icon, priority = "normal", category,
  targetCollection = null, targetDocumentId = null, actionUrl = null,
}) {
  if (!fbDb || !recipientId) return null;
  try {
    const ref = await fbDb.collection("notifications").add({
      recipientId, senderId, senderName, senderPhoto, type,
      title, message, icon: icon || NOTIFICATION_ICONS[type] || "🔔",
      priority, category, targetCollection, targetDocumentId, actionUrl,
      isRead: false, isDeleted: false, openedAt: null, broadcastId: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] createNotification failed:", err);
    return null;
  }
}

/* Fan-out write for broadcasts — batched at 450 docs/batch (Firestore's cap is
   500 writes/batch, this leaves headroom for the batch metadata). */
async function createNotificationsBatch(recipientIds, payload) {
  if (!fbDb || !recipientIds || !recipientIds.length) return 0;
  const uniqueIds = Array.from(new Set(recipientIds));
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 450) chunks.push(uniqueIds.slice(i, i + 450));
  let sent = 0;
  for (const chunk of chunks) {
    const batch = fbDb.batch();
    chunk.forEach((uid) => {
      const ref = fbDb.collection("notifications").doc();
      batch.set(ref, {
        recipientId: uid, senderId: payload.senderId || null, senderName: payload.senderName || null,
        senderPhoto: payload.senderPhoto || null, type: payload.type || "systemAnnouncement",
        title: payload.title, message: payload.message,
        icon: payload.icon || NOTIFICATION_ICONS[payload.type] || "📢",
        priority: payload.priority || "normal", category: payload.category || "system",
        targetCollection: payload.targetCollection || null, targetDocumentId: payload.targetDocumentId || null,
        actionUrl: payload.actionUrl || null, isRead: false, isDeleted: false, openedAt: null,
        broadcastId: payload.broadcastId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    await withTimeout(batch.commit(), 30000, "Sending notifications");
    sent += chunk.length;
  }
  return sent;
}

async function markNotificationRead(id) {
  if (!fbDb) return;
  await fbDb.collection("notifications").doc(id).set(
    { isRead: true, openedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function markAllNotificationsRead(uid) {
  if (!fbDb || !uid) return 0;
  const snap = await fbDb.collection("notifications")
    .where("recipientId", "==", uid).where("isRead", "==", false).limit(450).get();
  if (snap.empty) return 0;
  const batch = fbDb.batch();
  snap.docs.forEach((d) => batch.set(d.ref, { isRead: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }));
  await batch.commit();
  return snap.size;
}

async function deleteNotificationDoc(id) {
  if (!fbDb) return;
  await fbDb.collection("notifications").doc(id).set(
    { isDeleted: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }
  );
}

async function clearAllNotifications(uid) {
  if (!fbDb || !uid) return 0;
  const snap = await fbDb.collection("notifications")
    .where("recipientId", "==", uid).where("isDeleted", "==", false).limit(450).get();
  if (snap.empty) return 0;
  const batch = fbDb.batch();
  snap.docs.forEach((d) => batch.set(d.ref, { isDeleted: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }));
  await batch.commit();
  return snap.size;
}

/* One-time paginated fetch (used for "load more" beyond the live first page). */
async function fetchNotificationsPage({ uid, afterDoc = null, pageSize = 20, unreadOnly = false }) {
  if (!fbDb || !uid) return { docs: [], items: [] };
  let q = fbDb.collection("notifications").where("recipientId", "==", uid).where("isDeleted", "==", false);
  if (unreadOnly) q = q.where("isRead", "==", false);
  q = q.orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading notifications");
  return { docs: snap.docs, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

/* Resolves the uid(s) for EduSphere's admin accounts, used to notify admins
   about new reports, new registrations, etc. */
async function getAdminUserIds() {
  if (!fbDb) return [];
  const results = await Promise.all(
    ADMIN_EMAILS.map((email) => fbDb.collection("users").where("email", "==", email).limit(1).get())
  );
  return results.flatMap((snap) => snap.docs.map((d) => d.id));
}

async function getAllUserIds() {
  if (!fbDb) return [];
  const snap = await fbDb.collection("users").get();
  return snap.docs.filter((d) => !(d.data() || {}).deleted).map((d) => d.id);
}

/* Best-effort targeting for "specific course" broadcasts: users who have at
   least one exam/practice attempt logged against that course code. (EduSphere
   doesn't currently store course enrollment on the user profile — level,
   department and faculty targeting need that field added to the "users"
   collection before they can be wired up to real data.) */
async function getUserIdsByCourse(courseCode) {
  if (!fbDb || !courseCode) return [];
  const snap = await fbDb.collectionGroup("examHistory").where("course", "==", courseCode).get();
  const ids = snap.docs.map((d) => d.ref.parent.parent && d.ref.parent.parent.id).filter(Boolean);
  return Array.from(new Set(ids));
}

/* ----------------------------- MESSAGING (Real-Time Student Chat) -----------------------------
   Data model:
     conversations/{conversationId}   id = sorted "uidA_uidB"
       { participants:[uidA,uidB], names:{uid:name}, photos:{uid:photo|null},
         lastMessage, lastMessageAt, lastMessageSenderId,
         unread:{uid:count}, typing:{uid:bool}, createdAt }
     conversations/{id}/messages/{msgId}
       { senderId, text, imageUrl, createdAt, readBy:[uids] }

   Presence is approximated with Firestore alone (no Realtime DB in this stack): every
   active session touches users/{uid}.lastActive every ~45s and on focus/visibility change.
   "Online" = lastActive within the last 2 minutes; otherwise we show a formatted "last seen".

   Security note: this file can only describe the shape of the data — actual access control
   must be enforced with Firestore Security Rules in the Firebase console. Recommended rules:
     match /conversations/{cid} {
       allow read, update: if request.auth.uid in resource.data.participants;
       allow create: if request.auth.uid in request.resource.data.participants;
       match /messages/{mid} {
         allow read, create: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(cid)).data.participants;
       }
     }
   Admins should be granted access via a separate custom-claim check if moderation is required. */

function conversationIdFor(uidA, uidB) { return [uidA, uidB].sort().join("_"); }

async function getOrCreateConversation(me, otherUser) {
  if (!fbDb || !me || !otherUser) throw new Error("Not signed in.");
  const cid = conversationIdFor(me.id, otherUser.id);
  const ref = fbDb.collection("conversations").doc(cid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      participants: [me.id, otherUser.id],
      names: { [me.id]: me.fullName || "Student", [otherUser.id]: otherUser.fullName || "Student" },
      photos: { [me.id]: me.photo || null, [otherUser.id]: otherUser.photo || null },
      lastMessage: "", lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(), lastMessageSenderId: null,
      unread: { [me.id]: 0, [otherUser.id]: 0 },
      typing: { [me.id]: false, [otherUser.id]: false },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  return cid;
}

/* Live list of a student's conversations, newest first. */
function subscribeToConversations(uid, onData, onError) {
  if (!fbDb || !uid) return () => {};
  return fbDb.collection("conversations")
    .where("participants", "array-contains", uid)
    .orderBy("lastMessageAt", "desc")
    .limit(100)
    .onSnapshot(
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { EduSphere.Logger.error("[EduSphere] Conversations listener failed:", err); onError && onError(err); }
    );
}

/* Live message list for one conversation (most recent `pageSize`, ascending for render). */
function subscribeToMessages(conversationId, pageSize, onData, onError) {
  if (!fbDb || !conversationId) return () => {};
  return fbDb.collection("conversations").doc(conversationId).collection("messages")
    .orderBy("createdAt", "desc").limit(pageSize)
    .onSnapshot(
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()),
      (err) => { EduSphere.Logger.error("[EduSphere] Messages listener failed:", err); onError && onError(err); }
    );
}

async function loadOlderMessages(conversationId, beforeMsg, pageSize = 30) {
  if (!fbDb || !conversationId || !beforeMsg) return [];
  const snap = await fbDb.collection("conversations").doc(conversationId).collection("messages")
    .orderBy("createdAt", "desc").startAfter(beforeMsg.createdAt || null).limit(pageSize).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
}

async function sendMessage(conversationId, sender, otherUserId, { text, imageUrl }) {
  if (!fbDb || !conversationId || !sender) return { ok: false, error: "Not signed in." };
  const trimmed = (text || "").trim();
  if (!trimmed && !imageUrl) return { ok: false, error: "Message is empty." };
  const convoRef = fbDb.collection("conversations").doc(conversationId);
  try {
    await convoRef.collection("messages").add({
      senderId: sender.id, text: trimmed, imageUrl: imageUrl || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), readBy: [sender.id],
    });
    await convoRef.set({
      lastMessage: trimmed || "📷 Photo", lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessageSenderId: sender.id,
      [`unread.${otherUserId}`]: firebase.firestore.FieldValue.increment(1),
      [`typing.${sender.id}`]: false,
    }, { merge: true });
    createNotification({
      recipientId: otherUserId, senderId: sender.id, senderName: sender.fullName || "Student",
      senderPhoto: sender.photo || null, type: "newMessage", category: "messages", priority: "normal",
      title: sender.fullName || "New message", message: trimmed ? (trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed) : "Sent you a photo",
      targetCollection: "conversations", targetDocumentId: conversationId, actionUrl: `chat:${conversationId}`,
    }).catch(() => {});
    return { ok: true };
  } catch (err) {
    EduSphere.Logger.error("[EduSphere] sendMessage failed:", err);
    return { ok: false, error: "Message couldn't be sent. Check your connection and try again." };
  }
}

async function markConversationRead(conversationId, uid) {
  if (!fbDb || !conversationId || !uid) return;
  try {
    await fbDb.collection("conversations").doc(conversationId).set({ [`unread.${uid}`]: 0 }, { merge: true });
  } catch (err) { EduSphere.Logger.warn("[EduSphere] markConversationRead failed:", err); }
}

/* Marks any messages not sent by `uid` as read by `uid` — capped batch, called when the
   chat screen is open and messages are visible (not a full-history backfill). */
async function markMessagesRead(conversationId, uid, messages) {
  if (!fbDb || !conversationId || !uid || !messages || !messages.length) return;
  const unread = messages.filter((m) => m.senderId !== uid && !(m.readBy || []).includes(uid));
  if (!unread.length) return;
  try {
    const batch = fbDb.batch();
    const convoRef = fbDb.collection("conversations").doc(conversationId);
    unread.forEach((m) => {
      batch.update(convoRef.collection("messages").doc(m.id), {
        readBy: firebase.firestore.FieldValue.arrayUnion(uid),
      });
    });
    await batch.commit();
  } catch (err) { EduSphere.Logger.warn("[EduSphere] markMessagesRead failed:", err); }
}

let typingDebounce = null;
function setTypingStatus(conversationId, uid, isTyping) {
  if (!fbDb || !conversationId || !uid) return;
  clearTimeout(typingDebounce);
  typingDebounce = setTimeout(() => {
    fbDb.collection("conversations").doc(conversationId).set({ [`typing.${uid}`]: isTyping }, { merge: true }).catch(() => {});
  }, 150);
}

/* Presence heartbeat — call once per app session. Updates users/{uid}.lastActive
   periodically while the tab/app is in the foreground. */
function usePresenceHeartbeat(uid) {
  useEffect(() => {
    if (!fbDb || !uid) return undefined;
    const touch = () => fbDb.collection("users").doc(uid).set(
      { lastActive: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }
    ).catch(() => {});
    touch();
    const interval = setInterval(() => { if (document.visibilityState === "visible") touch(); }, 45000);
    const onVisible = () => { if (document.visibilityState === "visible") touch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [uid]);
}

function isUserOnline(lastActive) {
  if (!lastActive) return false;
  const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
  return Date.now() - date.getTime() < 120000;
}

function formatLastSeen(lastActive) {
  if (!lastActive) return "Offline";
  if (isUserOnline(lastActive)) return "Online";
  return "Last seen " + timeAgo(lastActive);
}

/* One-time-fetch student search (matches on fullName/email substring, case-insensitive).
   A single collection read + client-side filter — fine for a class-sized cohort; swap for
   a dedicated search index (Algolia/Typesense) if the student base grows much larger. */
async function searchStudents(query, excludeUid) {
  if (!fbDb || !query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const snap = await fbDb.collection("users").limit(500).get();
  const results = [];
  snap.forEach((doc) => {
    if (doc.id === excludeUid) return;
    const d = doc.data() || {};
    if (d.deleted || d.suspended) return;
    const name = (d.fullName || "").toLowerCase();
    const email = (d.email || "").toLowerCase();
    if (name.includes(q) || email.includes(q)) {
      results.push({
        id: doc.id, fullName: d.fullName || "Student", email: d.email || "",
        photo: d.profilePhoto || null, department: d.department || null, level: d.level || null,
        lastActive: d.lastActive || null,
      });
    }
  });
  return results.slice(0, 25);
}

/* ---------- Admin broadcast composer ---------- */
async function createBroadcast({ title, message, type, category, targetType, targetValue, senderId, senderName, scheduledFor }) {
  if (!fbDb) return { ok: false, error: "Firebase not connected" };
  let recipientIds = [];
  if (targetType === "all") recipientIds = await getAllUserIds();
  else if (targetType === "user") {
    const snap = await fbDb.collection("users").where("email", "==", (targetValue || "").trim().toLowerCase()).limit(1).get();
    recipientIds = snap.docs.map((d) => d.id);
    if (!recipientIds.length) return { ok: false, error: `No user found with email ${targetValue}` };
  } else if (targetType === "course") {
    recipientIds = await getUserIdsByCourse((targetValue || "").trim().toUpperCase());
    if (!recipientIds.length) return { ok: false, error: `No students found with activity on ${targetValue}` };
  }
  if (!recipientIds.length) return { ok: false, error: "No recipients matched this target." };

  const broadcastRef = fbDb.collection("broadcasts").doc();
  const isScheduled = !!scheduledFor;
  await broadcastRef.set({
    title, message, type: type || "systemAnnouncement", category: category || "system",
    targetType, targetValue: targetValue || null, recipientCount: recipientIds.length,
    senderId: senderId || null, senderName: senderName || "Admin",
    status: isScheduled ? "scheduled" : "sent", scheduledFor: scheduledFor || null,
    isDeleted: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // NOTE: "Send now" delivers immediately below. A *scheduled* broadcast is
  // recorded with status "scheduled" and scheduledFor, but actually firing it
  // at that future time requires a server-side trigger (Cloud Function on a
  // schedule) since there's no client running when the app is closed — see
  // the deployment notes for the Cloud Function this needs.
  if (isScheduled) return { ok: true, scheduled: true, recipientCount: recipientIds.length };

  const sent = await createNotificationsBatch(recipientIds, {
    type: type || "systemAnnouncement", category: category || "system", title, message,
    senderId: senderId || null, senderName: senderName || "Admin", broadcastId: broadcastRef.id,
  });
  return { ok: true, recipientCount: sent };
}

async function fetchRecentBroadcasts(max = 20) {
  if (!fbDb) return [];
  const snap = await fbDb.collection("broadcasts").where("isDeleted", "==", false)
    .orderBy("createdAt", "desc").limit(max).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getBroadcastReadStats(broadcastId) {
  if (!fbDb) return { sent: 0, read: 0 };
  const base = fbDb.collection("notifications").where("broadcastId", "==", broadcastId);
  try {
    const [sentSnap, readSnap] = await Promise.all([
      base.count().get(),
      base.where("isRead", "==", true).count().get(),
    ]);
    return { sent: sentSnap.data().count, read: readSnap.data().count };
  } catch {
    // Older SDKs without count(): fall back to a capped get().
    const snap = await base.limit(500).get();
    const read = snap.docs.filter((d) => d.data().isRead).length;
    return { sent: snap.size, read };
  }
}

async function deleteBroadcast(broadcastId) {
  if (!fbDb) return;
  await fbDb.collection("broadcasts").doc(broadcastId).set({ isDeleted: true }, { merge: true });
  // Soft-delete every notification this broadcast created, in batches.
  let cursor = null;
  for (;;) {
    let q = fbDb.collection("notifications").where("broadcastId", "==", broadcastId).where("isDeleted", "==", false).limit(450);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = fbDb.batch();
    snap.docs.forEach((d) => batch.set(d.ref, { isDeleted: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }));
    await batch.commit();
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < 450) break;
  }
}

/* ============================= ADMIN CONTENT MANAGEMENT DATA LAYER (v5.3) =============================
   New Firestore collections used by the Admin Dashboard modules below:
     courses/{code}          { code, name, dept, ready, description, updatedAt }
     questions/{autoId}      { courseCode, week, topic, difficulty, q, o:[4 strings], a:index, e, ref, createdAt, updatedAt }
     notes/{autoId}          { courseCode, week, title, points:[strings], createdAt, updatedAt }
     flashcards/{autoId}     { courseCode, front, back, topic, createdAt, updatedAt }
     announcements/{autoId}  { title, body, priority: "normal"|"important"|"urgent", published, pinned, createdAt, updatedAt }
     settings/app            { maintenanceMode, maintenanceMessage, minAppVersion, contactWhatsApp, contactEmail, contactPhone, updatedAt }
     users/{uid}/examHistory/{autoId} (existing, written by the student app) — read here via
       a Firestore *collection group* query so the admin can see every user's history at once.
     users/{uid}.leaderboardHidden: bool — admin can hide a student from the leaderboard.

   List/query helpers below return { docs, items }: `docs` are the raw
   QueryDocumentSnapshots (kept so "Load more" can call .startAfter(lastDoc)) and
   `items` are plain { id, ...data() } objects ready to render. */

/* ---------- Courses Manager ---------- */
async function fetchManagedCourses() {
  const snap = await withTimeout(fbDb.collection("courses").orderBy("code", "asc").get(), 15000, "Loading courses");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function upsertManagedCourse(code, data) {
  if (!code || !String(code).trim()) throw new Error("Course code is required.");
  if (!data || !data.name || !String(data.name).trim()) throw new Error("Course name is required.");
  const ref = fbDb.collection("courses").doc(code);
  const existing = await ref.get();
  const isNew = !existing.exists;
  // BUGFIX (courses/MTS102 "Unsupported field value: undefined" in field
  // displayOrder): the old fallback — `existing.exists ? existing.data().displayOrder
  // : Date.now()` — assumed an existing doc always already had a displayOrder. Legacy/
  // seeded course docs created before this field existed don't, so that fallback itself
  // evaluated to undefined and was sent straight to Firestore. resolveDisplayOrder()
  // guarantees a real number no matter what state the existing doc is in.
  const payload = {
    code, name: data.name || "", dept: data.dept || "", ready: !!data.ready, description: data.description || "",
    // v8.0 Module 1 — id-based classification against the dynamic academic hierarchy.
    // Kept alongside the legacy `dept` string above so every existing consumer (CBT
    // engine, offline cache, old admin tooling) keeps working unchanged; anything new
    // should classify/filter using these ids instead.
    schoolId: data.schoolId || null, departmentId: data.departmentId || null,
    levelId: data.levelId || null, semesterId: data.semesterId || null,
    creditUnit: data.creditUnit || null, lecturer: data.lecturer || "",
    thumbnailUrl: data.thumbnailUrl || "", bannerUrl: data.bannerUrl || "",
    color: data.color || "", icon: data.icon || "",
    visibility: data.visibility || "public", // public | private | hidden | archived
    displayOrder: resolveDisplayOrder(data.displayOrder, existing.exists ? existing.data().displayOrder : undefined),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  // Defense in depth: even after the fix above, strip any other field that
  // somehow ends up undefined (e.g. a future field added without an `|| ""`
  // fallback) so a single bad field can never fail the entire save.
  await ref.set(stripUndefined(payload), { merge: true });
  // Broadcast to all users — new/updated course uploads are a system-wide event.
  try {
    const userIds = await getAllUserIds();
    await createNotificationsBatch(userIds, isNew
      ? { type: "courseNew", category: "courses", priority: "normal", title: "New course available", message: `${data.name || code} (${code}) has been added to EduSphere.`, targetCollection: "courses", targetDocumentId: code, actionUrl: `courseDetail:${code}` }
      : { type: "courseUpdated", category: "courses", priority: "normal", title: "Course updated", message: `${data.name || code} (${code}) was just updated.`, targetCollection: "courses", targetDocumentId: code, actionUrl: `courseDetail:${code}` }
    );
  } catch (err) { EduSphere.Logger.error("[EduSphere] course notification failed:", err); }
}
async function deleteManagedCourse(code) {
  const ref = fbDb.collection("courses").doc(code);
  const snap = await ref.get();
  const course = snap.exists ? snap.data() : null;
  await ref.delete();
  try {
    const userIds = await getAllUserIds();
    await createNotificationsBatch(userIds, {
      type: "courseRemoved", category: "courses", priority: "normal",
      title: "Course removed", message: `${(course && course.name) || code} (${code}) has been removed.`,
    });
  } catch (err) { EduSphere.Logger.error("[EduSphere] course removal notification failed:", err); }
}
/* Copies the app's built-in COURSES array into Firestore the first time an
   admin opens Courses Manager on a fresh project, so the list isn't empty.
   Safe to call repeatedly — it merges, never overwrites existing edits. */
async function seedManagedCoursesIfEmpty() {
  const existing = await fbDb.collection("courses").limit(1).get();
  if (!existing.empty) return false;
  const batch = fbDb.batch();
  COURSES.forEach((c) => {
    const ref = fbDb.collection("courses").doc(c.code);
    batch.set(ref, { ...c, description: "", updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
  return true;
}

/* ---------- Question Bank Manager ---------- */
/* Builds the full Firestore document for a question — every new-schema field
   (type, question, options, answer, acceptableAnswers, explanation,
   courseCode, school, department, level, semester, topic, week, difficulty,
   tags, points) plus the legacy short aliases (q, o, a, e, ref), so any code
   — old or new, this app or a script poking the database directly — finds
   the fields it expects. Shared by the single-question admin form and Bulk
   Import so the two can never drift apart on what gets written. */
function buildQuestionWriteDoc(courseCode, item) {
  const type = inferQuestionType(item);
  const question = item.question || item.q || "";
  let options = item.options || item.o || [];
  if (type === "trueFalse" && (!Array.isArray(options) || options.length !== 2)) options = ["True", "False"];
  let answer = item.answer !== undefined ? item.answer : item.a;
  if (type === "trueFalse") answer = normalizeTrueFalseAnswer(answer);
  if (type === "multiSelect") answer = Array.isArray(answer) ? answer : (answer !== undefined && answer !== null ? [answer] : []);
  let acceptableAnswers = Array.isArray(item.acceptableAnswers)
    ? item.acceptableAnswers.filter((x) => x !== undefined && x !== null && String(x).trim() !== "")
    : [];
  if ((type === "shortAnswer" || type === "fillBlank") && acceptableAnswers.length === 0 && answer !== undefined && answer !== null && String(answer).trim() !== "") {
    acceptableAnswers = [String(answer)];
  }
  const explanation = item.explanation || item.e || "";
  const reference = item.reference || item.ref || "";
  return {
    courseCode, type,
    question, q: question,
    options, o: options,
    answer, a: answer,
    acceptableAnswers,
    caseSensitive: !!item.caseSensitive,
    ignoreSpaces: item.ignoreSpaces !== false,
    explanation, e: explanation,
    reference, ref: reference,
    school: item.school || "", department: item.department || "", level: item.level || "", semester: item.semester || "",
    topic: item.topic || "", week: item.week || "",
    difficulty: normalizeDifficulty(item.difficulty),
    tags: Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(",").map((s) => s.trim()).filter(Boolean) : []),
    points: typeof item.points === "number" && item.points > 0 ? item.points : 1,
  };
}
async function fetchQuestions({ courseCode, afterDoc = null, pageSize = 25 } = {}) {
  let q = fbDb.collection("questions");
  if (courseCode) q = q.where("courseCode", "==", courseCode);
  q = q.orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading questions");
  return { docs: snap.docs, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}
async function addQuestion(data) {
  await fbDb.collection("questions").add({
    ...buildQuestionWriteDoc(data.courseCode, data),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
async function updateQuestion(id, data) {
  const payload = data.courseCode ? buildQuestionWriteDoc(data.courseCode, data) : data;
  await fbDb.collection("questions").doc(id).set({ ...payload, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function deleteQuestion(id) {
  await fbDb.collection("questions").doc(id).delete();
}
/* Bulk import: accepts an array of question objects of ANY supported type —
   MCQ, True/False, Short Answer, Fill Blank, Multiple Select, or Essay — and
   writes them in batches of 400 (Firestore's per-batch write cap is 500; 400
   leaves headroom). Type is read from an explicit `type` field if present,
   otherwise auto-detected from the item's shape (see inferQuestionType), so
   older JSON exports that only ever had { q, o, a, e, week, topic,
   difficulty } keep importing exactly as MCQs, unchanged. */
async function bulkImportQuestions(courseCode, list) {
  const chunks = [];
  for (let i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
  let written = 0;
  for (const chunk of chunks) {
    const batch = fbDb.batch();
    chunk.forEach((item) => {
      const ref = fbDb.collection("questions").doc();
      batch.set(ref, {
        ...buildQuestionWriteDoc(courseCode, item),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
    await withTimeout(batch.commit(), 30000, "Importing questions");
    written += chunk.length;
  }
  return written;
}

/* ---------- Notes Manager ---------- */
async function fetchNotes({ courseCode, afterDoc = null, pageSize = 25 } = {}) {
  let q = fbDb.collection("notes");
  if (courseCode) q = q.where("courseCode", "==", courseCode);
  q = q.orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading notes");
  return { docs: snap.docs, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}
async function addNote(data) {
  await fbDb.collection("notes").add({
    courseCode: data.courseCode, week: data.week || "", title: data.title || "",
    points: data.points || [], createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  try {
    const userIds = await getUserIdsByCourse(data.courseCode);
    const targets = userIds.length ? userIds : await getAllUserIds();
    await createNotificationsBatch(targets, {
      type: "noteNew", category: "notes", priority: "normal",
      title: "New note uploaded", message: `New note "${data.title || "Untitled"}" added for ${data.courseCode}.`,
      targetCollection: "notes", actionUrl: `notes:${data.courseCode}`,
    });
  } catch (err) { EduSphere.Logger.error("[EduSphere] note notification failed:", err); }
}
async function updateNote(id, data) {
  await fbDb.collection("notes").doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function deleteNote(id) {
  await fbDb.collection("notes").doc(id).delete();
}

/* ---------- Flashcards Manager ---------- */
async function fetchFlashcardsAdmin({ courseCode, afterDoc = null, pageSize = 25 } = {}) {
  let q = fbDb.collection("flashcards");
  if (courseCode) q = q.where("courseCode", "==", courseCode);
  q = q.orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading flashcards");
  return { docs: snap.docs, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}
async function addFlashcard(data) {
  await fbDb.collection("flashcards").add({
    courseCode: data.courseCode, front: data.front || "", back: data.back || "", topic: data.topic || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
async function updateFlashcard(id, data) {
  await fbDb.collection("flashcards").doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function deleteFlashcard(id) {
  await fbDb.collection("flashcards").doc(id).delete();
}

/* ---------- Announcements Manager ---------- */
async function fetchAnnouncements({ afterDoc = null, pageSize = 25 } = {}) {
  let q = fbDb.collection("announcements").orderBy("pinned", "desc").orderBy("createdAt", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading announcements");
  return { docs: snap.docs, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}
async function addAnnouncement(data) {
  await fbDb.collection("announcements").add({
    title: data.title || "", body: data.body || "",
    itemType: data.itemType || "announcement", bannerType: data.bannerType || "carousel",
    priority: data.priority || "normal",
    published: !!data.published, pinned: !!data.pinned,
    startDate: data.startDate || null, endDate: data.endDate || null,
    startTime: data.startTime || "", expiryTime: data.expiryTime || "",
    audience: data.audience || "everyone", audienceValue: data.audienceValue || "",
    audienceStudentIds: Array.isArray(data.audienceStudentIds) ? data.audienceStudentIds : [],
    textColor: data.textColor || "", bgColor: data.bgColor || "", icon: data.icon || "",
    animationStyle: data.animationStyle || "fade", scrollSpeed: data.scrollSpeed || "normal",
    fontSize: data.fontSize || "normal", displayDuration: data.displayDuration || 6,
    displayFrequency: data.displayFrequency || "always",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
async function updateAnnouncement(id, data) {
  await fbDb.collection("announcements").doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function deleteAnnouncement(id) {
  await fbDb.collection("announcements").doc(id).delete();
}

/* ---------- Course Showcase (Module 1.4 Phase 3) ---------- */
async function fetchCourseShowcase() {
  const snap = await withTimeout(fbDb.collection("courseShowcase").orderBy("order", "asc").get(), 15000, "Loading course showcase");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function addShowcaseCourse(data) {
  const snap = await fbDb.collection("courseShowcase").orderBy("order", "desc").limit(1).get();
  const nextOrder = snap.empty ? 0 : (snap.docs[0].data().order || 0) + 1;
  await fbDb.collection("courseShowcase").add({
    courseCode: data.courseCode || "", title: data.title || "", featured: !!data.featured,
    isNew: !!data.isNew, isUpdated: !!data.isUpdated, hidden: !!data.hidden, order: nextOrder,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}
async function updateShowcaseCourse(id, data) {
  await fbDb.collection("courseShowcase").doc(id).set(data, { merge: true });
}
async function deleteShowcaseCourse(id) {
  await fbDb.collection("courseShowcase").doc(id).delete();
}
/* Swaps this item's order with its neighbor in the given direction — a simple, reliable
   rearrange mechanism (no drag-and-drop library needed) that persists instantly. */
async function moveShowcaseCourse(list, index, direction) {
  const otherIndex = index + direction;
  if (otherIndex < 0 || otherIndex >= list.length) return;
  const a = list[index], b = list[otherIndex];
  const batch = fbDb.batch();
  batch.set(fbDb.collection("courseShowcase").doc(a.id), { order: b.order }, { merge: true });
  batch.set(fbDb.collection("courseShowcase").doc(b.id), { order: a.order }, { merge: true });
  await batch.commit();
}

/* ---------- Exam Results / Exam History / Practice History (collection group) ----------
   Every finished attempt already lives at users/{uid}/examHistory/{autoId} with a
   `mode` field of "mock" (timed exam) or "practice". A Firestore *collection group*
   query reads across every user's subcollection in one call — this is what makes
   "see every result school-wide" possible without looping over each user doc. */
async function fetchAttemptsAdmin({ mode = null, afterDoc = null, pageSize = 30 } = {}) {
  let q = fbDb.collectionGroup("examHistory");
  if (mode) q = q.where("mode", "==", mode);
  q = q.orderBy("date", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading attempts");
  const items = snap.docs.map((d) => ({ id: d.id, uid: d.ref.parent.parent ? d.ref.parent.parent.id : null, ...d.data() }));
  return { docs: snap.docs, items };
}
async function deleteAttemptAdmin(uid, attemptId) {
  await fbDb.collection("users").doc(uid).collection("examHistory").doc(attemptId).delete();
}

async function fetchUsersMap() {
  const snap = await withTimeout(fbDb.collection("users").get(), 15000, "Loading users");
  const map = {};
  snap.forEach((d) => { map[d.id] = mapFirestoreUser(d.id, d.data()); });
  return map;
}

/* ---------- Essay Grading (Admin) ----------
   Essay questions are never auto-scored — ResultScreen stamps
   hasUngradedEssays:true on any attempt containing at least one, which is
   exactly what this query filters on. Grading writes back into that same
   attempt's `review` array and recomputes its aggregate score, so the
   student's Result/Performance screens update the moment an Admin grades
   their response — no separate "grades" collection needed. */
async function fetchUngradedEssayAttempts({ afterDoc = null, pageSize = 25 } = {}) {
  let q = fbDb.collectionGroup("examHistory").where("hasUngradedEssays", "==", true).orderBy("date", "desc").limit(pageSize);
  if (afterDoc) q = q.startAfter(afterDoc);
  const snap = await withTimeout(q.get(), 15000, "Loading essay submissions");
  const items = snap.docs.map((d) => ({ id: d.id, uid: d.ref.parent.parent ? d.ref.parent.parent.id : null, ...d.data() }));
  return { docs: snap.docs, items };
}
async function gradeEssayAnswer(uid, attemptId, reviewIndex, pointsEarned) {
  const ref = fbDb.collection("users").doc(uid).collection("examHistory").doc(attemptId);
  const snap = await withTimeout(ref.get(), 15000, "Loading attempt");
  if (!snap.exists) throw new Error("Attempt not found.");
  const data = snap.data();
  const review = Array.isArray(data.review) ? [...data.review] : [];
  const item = review[reviewIndex];
  if (!item) throw new Error("Question not found in this attempt.");
  const maxPoints = item.points || 1;
  const clamped = Math.max(0, Math.min(maxPoints, Number(pointsEarned) || 0));
  review[reviewIndex] = { ...item, graded: true, pointsEarned: clamped, status: clamped > 0 ? "correct" : "wrong" };

  const correct = review.filter((r) => r.status === "correct").length;
  const wrong = review.filter((r) => r.status === "wrong").length;
  const skipped = review.filter((r) => r.status === "skipped").length;
  const pending = review.filter((r) => r.status === "ungraded").length;
  const total = review.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const gradedAttempts = correct + wrong;
  const accuracy = gradedAttempts ? Math.round((correct / gradedAttempts) * 100) : 0;

  await withTimeout(ref.set({
    review, correct, wrong, skipped, pending, score: correct, pct, accuracy,
    hasUngradedEssays: pending > 0,
  }, { merge: true }), 15000, "Saving grade");
  return { correct, wrong, skipped, pending, pct };
}

/* ---------- Leaderboard Manager ----------
   There's no separate `leaderboard` collection to keep writes cheap — rankings
   are computed here from the same examHistory collection group (best % per
   student across "mock" attempts). Admin can hide a student from any future
   public leaderboard (flag on their user doc) or clear their ranked attempts. */
async function computeLeaderboard(limitUsers = 100) {
  const [historySnap, usersSnap] = await Promise.all([
    withTimeout(fbDb.collectionGroup("examHistory").where("mode", "==", "mock").get(), 20000, "Loading leaderboard data"),
    withTimeout(fbDb.collection("users").get(), 15000, "Loading users"),
  ]);
  const userMap = {};
  usersSnap.forEach((d) => { userMap[d.id] = mapFirestoreUser(d.id, d.data()); });
  const byUser = {};
  historySnap.forEach((d) => {
    const uid = d.ref.parent.parent ? d.ref.parent.parent.id : null;
    if (!uid) return;
    const data = d.data();
    if (!byUser[uid]) byUser[uid] = { uid, attempts: 0, best: 0, totalPct: 0 };
    byUser[uid].attempts += 1;
    byUser[uid].totalPct += (data.pct || 0);
    byUser[uid].best = Math.max(byUser[uid].best, data.pct || 0);
  });
  const rows = Object.values(byUser).map((r) => ({
    ...r, avg: r.attempts ? Math.round(r.totalPct / r.attempts) : 0,
    user: userMap[r.uid] || { id: r.uid, fullName: "(deleted user)", email: "" },
    hidden: !!(userMap[r.uid] && userMap[r.uid].leaderboardHidden),
  }));
  rows.sort((a, b) => b.best - a.best || b.avg - a.avg);
  return rows.slice(0, limitUsers);
}
async function setLeaderboardHidden(uid, hidden) {
  await fbDb.collection("users").doc(uid).set({ leaderboardHidden: hidden }, { merge: true });
}
async function clearUserAttempts(uid) {
  const snap = await fbDb.collection("users").doc(uid).collection("examHistory").get();
  const batch = fbDb.batch();
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

/* ---------- Analytics Dashboard ---------- */
async function fetchAnalyticsSummary() {
  const [usersSnap, historySnap, postsSnap, reportsSnap, questionsSnap, commentsGroupSnap] = await Promise.all([
    withTimeout(fbDb.collection("users").get(), 15000, "Loading users"),
    withTimeout(fbDb.collectionGroup("examHistory").get(), 20000, "Loading attempts"),
    withTimeout(fbDb.collection("communityPosts").get(), 15000, "Loading posts"),
    withTimeout(fbDb.collection("communityReports").where("status", "==", "open").get(), 15000, "Loading reports"),
    withTimeout(fbDb.collection("questions").get(), 20000, "Loading question bank"),
    withTimeout(fbDb.collectionGroup("comments").get(), 20000, "Loading comments").catch(() => null),
  ]);
  let activeUsers = 0, suspendedUsers = 0, dailyActiveUsers = 0;
  const usersJoinedByDay = {};
  usersSnap.forEach((d) => {
    const u = d.data() || {};
    if (u.deleted) return;
    if (u.suspended) suspendedUsers += 1; else activeUsers += 1;
    if (u.lastActive) { const ts = u.lastActive.toDate ? u.lastActive.toDate() : new Date(u.lastActive); if (Date.now() - ts.getTime() < 86400000) dailyActiveUsers += 1; }
    const joined = u.dateCreated && u.dateCreated.toDate ? u.dateCreated.toDate() : (u.dateCreated ? new Date(u.dateCreated) : null);
    if (joined) { const key = joined.toDateString(); usersJoinedByDay[key] = (usersJoinedByDay[key] || 0) + 1; }
  });

  let mockCount = 0, practiceCount = 0, pctSum = 0, pctCount = 0, pendingEssays = 0;
  const courseCounts = {};
  // Question Type Statistics + Difficulty Analysis, tallied from every graded
  // question across every saved attempt (correct / wrong / skipped / pending).
  const typeStats = {}; // type -> { correct, wrong, skipped, pending }
  const difficultyStats = {}; // difficulty -> { correct, wrong, skipped, pending }
  const bump = (bucketObj, key, status) => {
    if (!bucketObj[key]) bucketObj[key] = { correct: 0, wrong: 0, skipped: 0, pending: 0 };
    const slot = status === "ungraded" ? "pending" : status;
    if (bucketObj[key][slot] !== undefined) bucketObj[key][slot] += 1;
  };
  historySnap.forEach((d) => {
    const data = d.data() || {};
    if (data.mode === "mock") mockCount += 1; else practiceCount += 1;
    if (typeof data.pct === "number") { pctSum += data.pct; pctCount += 1; }
    if (data.course) courseCounts[data.course] = (courseCounts[data.course] || 0) + 1;
    if (data.hasUngradedEssays) pendingEssays += 1;
    (data.review || []).forEach((item) => {
      const type = item.type || "mcq";
      const diff = item.difficulty || "Medium";
      bump(typeStats, type, item.status);
      bump(difficultyStats, diff, item.status);
    });
  });
  const topCourses = Object.entries(courseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Question Bank composition — what's actually in the bank right now, by
  // type and by difficulty, regardless of whether it's ever been attempted.
  const bankByType = {}, bankByDifficulty = {};
  questionsSnap.forEach((d) => {
    const item = d.data() || {};
    const type = item.type || "mcq";
    const diff = normalizeDifficulty(item.difficulty);
    bankByType[type] = (bankByType[type] || 0) + 1;
    bankByDifficulty[diff] = (bankByDifficulty[diff] || 0) + 1;
  });

  let approvedPosts = 0, pendingPosts = 0;
  const activityByUser = {}; // uid -> { name, posts, comments }
  const postsByDay = {};
  let totalImages = 0, totalVideos = 0, totalPdfs = 0, postsWithMedia = 0;
  let totalLikes = 0, totalShares = 0, totalViews = 0, totalCommentsOnPosts = 0;
  const bumpActivity = (uid, name, field) => {
    if (!uid) return;
    if (!activityByUser[uid]) activityByUser[uid] = { name: name || "Student", posts: 0, comments: 0 };
    activityByUser[uid][field] += 1;
    if (name) activityByUser[uid].name = name;
  };
  postsSnap.forEach((d) => {
    const p = d.data() || {};
    if (p.status === "approved") approvedPosts += 1;
    if (p.status === "pending") pendingPosts += 1;
    bumpActivity(p.authorId, p.authorName, "posts");
    const created = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : null);
    if (created) { const key = created.toDateString(); postsByDay[key] = (postsByDay[key] || 0) + 1; }
    const imgCount = (p.images || []).length, vidCount = (p.videos || []).length, hasPdf = !!p.pdfUrl;
    totalImages += imgCount; totalVideos += vidCount; if (hasPdf) totalPdfs += 1;
    if (imgCount || vidCount || hasPdf) postsWithMedia += 1;
    totalLikes += p.likeCount || 0; totalShares += p.shareCount || 0; totalViews += p.viewCount || 0;
    totalCommentsOnPosts += p.commentCount || 0;
  });
  if (commentsGroupSnap) {
    commentsGroupSnap.forEach((d) => { const c = d.data() || {}; bumpActivity(c.authorId, c.authorName, "comments"); });
  }

  const mostActiveUsers = Object.entries(activityByUser)
    .map(([uid, v]) => ({ uid, name: v.name, posts: v.posts, comments: v.comments, total: v.posts + v.comments }))
    .sort((a, b) => b.total - a.total).slice(0, 5);

  const mostViewedPosts = postsSnap.docs
    .map((d) => { const p = d.data() || {}; return { id: d.id, title: (p.title || p.content || "Untitled post").slice(0, 60), author: p.authorName || "Student", value: p.viewCount || 0 }; })
    .sort((a, b) => b.value - a.value).slice(0, 5);

  const mostSharedPosts = postsSnap.docs
    .map((d) => { const p = d.data() || {}; return { id: d.id, title: (p.title || p.content || "Untitled post").slice(0, 60), author: p.authorName || "Student", value: p.shareCount || 0 }; })
    .sort((a, b) => b.value - a.value).slice(0, 5);

  const totalEngagements = totalLikes + totalCommentsOnPosts + totalShares;
  const engagementRate = totalViews > 0 ? Math.round((totalEngagements / totalViews) * 100) : 0;

  // 7-day growth trend for new posts and new users, oldest first.
  const growthDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toDateString();
    growthDays.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), posts: postsByDay[key] || 0, users: usersJoinedByDay[key] || 0 });
  }

  return {
    totalUsers: activeUsers + suspendedUsers, activeUsers, suspendedUsers,
    totalAttempts: mockCount + practiceCount, mockCount, practiceCount,
    avgScore: pctCount ? Math.round(pctSum / pctCount) : 0,
    topCourses, totalPosts: postsSnap.size, approvedPosts, pendingPosts, openReports: reportsSnap.size,
    pendingEssays, typeStats, difficultyStats,
    questionBankTotal: questionsSnap.size, bankByType, bankByDifficulty,
    mostActiveUsers, mostViewedPosts, mostSharedPosts, engagementRate,
    dailyActiveUsers, growthDays,
    uploadStats: { totalImages, totalVideos, totalPdfs, postsWithMedia },
  };
}

/* ---------- Settings ---------- */
async function fetchAppSettings() {
  const doc = await withTimeout(fbDb.collection("settings").doc("app").get(), 15000, "Loading settings");
  return doc.exists ? doc.data() : { maintenanceMode: false, maintenanceMessage: "", minAppVersion: "", contactWhatsApp: "", contactEmail: "", contactPhone: "", storageQuotaMB: DEFAULT_STORAGE_QUOTA_MB };
}
async function saveAppSettings(data) {
  await fbDb.collection("settings").doc("app").set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

const BrandContext = React.createContext({
  config: DEFAULT_BRAND_CONFIG, assets: DEFAULT_BRAND_ASSETS, loading: true,
});
function useBrand() { return React.useContext(BrandContext); }

/* Mounted once at the app root — subscribes to both docs and exposes them via
   BrandContext to every screen, merging in the defaults above for any field a
   Super Admin hasn't set yet. */
function useBrandSubscription() {
  const [config, setConfig] = useState(DEFAULT_BRAND_CONFIG);
  const [assets, setAssets] = useState(DEFAULT_BRAND_ASSETS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!fbDb) { setLoading(false); return undefined; }
    let gotConfig = false, gotAssets = false;
    const markLoaded = () => { if (gotConfig && gotAssets) setLoading(false); };
    const unsubConfig = fbDb.collection("settings").doc("branding").onSnapshot(
      (doc) => { setConfig({ ...DEFAULT_BRAND_CONFIG, ...(doc.exists ? doc.data() : {}) }); gotConfig = true; markLoaded(); },
      (err) => { EduSphere.Logger.warn("[EduSphere] Brand config listener failed:", err.message); gotConfig = true; markLoaded(); }
    );
    const unsubAssets = fbDb.collection("settings").doc("brandAssets").onSnapshot(
      (doc) => { setAssets({ ...DEFAULT_BRAND_ASSETS, ...(doc.exists ? doc.data() : {}) }); gotAssets = true; markLoaded(); },
      (err) => { EduSphere.Logger.warn("[EduSphere] Brand assets listener failed:", err.message); gotAssets = true; markLoaded(); }
    );
    return () => { unsubConfig(); unsubAssets(); };
  }, []);
  return { config, assets, loading };
}
async function saveBrandConfig(data) {
  await withFirestoreWriteTimeout(
    fbDb.collection("settings").doc("branding").set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    "brand config (settings/branding)", "settings/branding"
  );
}
async function saveBrandAssets(data) {
  await withFirestoreWriteTimeout(
    fbDb.collection("settings").doc("brandAssets").set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }),
    "brand assets (settings/brandAssets)", "settings/brandAssets"
  );
}
/* Uploads one branding asset (logo, favicon, watermark, etc.) to Firebase Storage.
   Unlike community/profile photos, these are NOT recompressed to JPEG — logos,
   favicons and watermarks routinely rely on PNG/SVG transparency, and the Android
   launcher icon needs to stay a real PNG at whatever resolution was provided. */
async function uploadBrandAsset(file, key) {
  if (!fbStorage) throw new Error("Storage isn't configured for this project yet.");
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_IMAGE_INPUT_MB * 1024 * 1024) throw new Error(`Files must be under ${MAX_IMAGE_INPUT_MB}MB.`);
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `branding/${key}_${Date.now()}.${ext}`;
  logUploadStart(`brand asset (${key})`, file, path);
  const ref = fbStorage.ref().child(path);
  let url;
  try {
    await withUploadTimeout(ref.put(file, STORAGE_CACHE_METADATA), 30000, "Uploading asset");
    logUploadComplete(`brand asset (${key})`);
    url = await ref.getDownloadURL();
  } catch (err) { logUploadError(err); throw err; }
  logUploadSuccess(url);
  logUploadFinished(`brand asset (${key})`);
  return url;
}

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return date.toLocaleDateString();
}

/* ----------------------------- COMMUNITY UI ----------------------------- */

function CommunityCategoryChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      border: `1.5px solid ${active ? C.primary : C.border}`,
      background: active ? C.primary : C.card, color: active ? "#fff" : C.textSoft, cursor: "pointer",
    }}>{label}</button>
  );
}

function PostStatusBadge({ status }) {
  const map = {
    pending: { label: "Pending Review", color: C.warn, bg: C.warnBg },
    approved: { label: "Approved", color: C.success, bg: C.successBg },
    rejected: { label: "Rejected", color: C.danger, bg: C.dangerBg },
    hidden: { label: "Hidden", color: C.textFaint, bg: C.border },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 20, padding: "3px 10px" }}>{s.label}</span>;
}

function AdminActionBtn({ label, onClick, kind }) {
  const styles = {
    success: { bg: C.successBg, color: C.success, border: C.success },
    danger: { bg: C.dangerBg, color: C.danger, border: C.danger },
    warn: { bg: C.warnBg, color: C.warn, border: C.warnBorder },
    default: { bg: C.bg, color: C.text, border: C.border },
  }[kind || "default"];
  return (
    <button onClick={onClick} style={{
      padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${styles.border}`, background: styles.bg,
      color: styles.color, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    }}>{label}</button>
  );
}

/* Full-screen viewer for a post's images/videos. Supports swipe between items,
   pinch-to-zoom and double-tap-to-zoom on images, and inline video playback. */
/* Module 1.4-2 bug fix, take 2: the first attempt used window.history.pushState/
   back() to intercept the Android back button — that turned out to be actively
   harmful here, because this app has ZERO other history/router usage anywhere
   (pure in-memory state navigation via go()). Pushing a history entry made the
   WebView shell treat back as a real page navigation instead of an in-app state
   change, which is what caused the blank screen. Reverted — no window.history
   calls anywhere in this component now. What's still fixed below: tap-background-
   to-close, swipe-down-to-close, and a single guarded close() path so the ✕,
   background tap, and swipe can never double-fire or race each other. */
function MediaLightbox({ media, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex || 0);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);      // vertical drag offset for swipe-down-to-close
  const [dragging, setDragging] = useState(false);
  const touchState = useRef({});
  const closedRef = useRef(false);            // guards against double-close (✕ / background tap / swipe racing each other)

  const item = media[index];
  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };
  const go = (dir) => { resetZoom(); setIndex((i) => Math.max(0, Math.min(media.length - 1, i + dir))); };

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose(); // unmounts this component — that alone resets all local state (index/scale/dragY/etc.), nothing lingers
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      touchState.current.pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      touchState.current.startScale = scale;
    } else if (e.touches.length === 1) {
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.lastTap = touchState.current.lastTap || 0;
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && touchState.current.pinchDist) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.min(4, Math.max(1, touchState.current.startScale * (dist / touchState.current.pinchDist)));
      setScale(next);
    } else if (e.touches.length === 1 && scale > 1) {
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
    } else if (e.touches.length === 1 && scale === 1 && item.type !== "video") {
      // Not zoomed and not a video (videos have their own controls/scrubber) —
      // a single-finger vertical drag is a swipe-down-to-close gesture.
      const dy = e.touches[0].clientY - touchState.current.startY;
      const dx = e.touches[0].clientX - touchState.current.startX;
      if (dragging || (dy > 8 && Math.abs(dy) > Math.abs(dx))) {
        setDragging(true);
        setDragY(Math.max(0, dy));
      }
    }
  };
  const onTouchEnd = (e) => {
    if (dragging) {
      if (dragY > 110) { close(); return; }
      setDragY(0);
      setDragging(false);
    } else if (e.touches.length === 0 && touchState.current.startX != null && scale === 1) {
      const now = Date.now();
      if (now - touchState.current.lastTap < 280) { setScale(2.2); }
      touchState.current.lastTap = now;
    }
    touchState.current.pinchDist = null;
  };

  // Tap-background-to-close: only fires when the tap lands on the backdrop
  // itself, not when it bubbles up from the image, video, or a button.
  const onBackdropClick = (e) => { if (e.target === e.currentTarget) close(); };
  const backdropOpacity = dragging ? Math.max(0.35, 0.94 - dragY / 300) : 0.94;

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: "fixed", inset: 0, background: `rgba(0,0,0,${backdropOpacity})`, zIndex: 999,
        display: "flex", flexDirection: "column", touchAction: "none",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
        <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 700 }}>{index + 1} / {media.length}</span>
        <button onClick={close} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>
      <div
        onClick={onBackdropClick}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        {item.type === "video" ? (
          <video src={item.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "100%" }} />
        ) : (
          <img loading="lazy" src={item.url} alt="" style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
            transform: `translateY(${dragY}px) scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: touchState.current.pinchDist || dragging ? "none" : "transform 0.15s ease-out",
          }} />
        )}
        {media.length > 1 && index > 0 && (
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={lightboxNavBtnStyle("left")}>‹</button>
        )}
        {media.length > 1 && index < media.length - 1 && (
          <button onClick={(e) => { e.stopPropagation(); go(1); }} style={lightboxNavBtnStyle("right")}>›</button>
        )}
      </div>
      {media.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "10px 0 18px" }}>
          {media.map((_, i) => (
            <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 4, background: i === index ? "#fff" : "rgba(255,255,255,0.4)", transition: "width 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
function lightboxNavBtnStyle(side) {
  return {
    position: "absolute", [side]: 10, top: "50%", transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
    width: 38, height: 38, color: "#fff", fontSize: 22, cursor: "pointer", lineHeight: "38px",
  };
}

/* Renders a post's images+videos as a responsive grid (1-10 items), with a
   "+N" overlay when more media exists than the grid shows. Grid tiles always
   show a lightweight thumbnail (imageThumbs, or the video's poster frame) —
   tapping any tile opens the full MediaLightbox at that index, which is where
   the real <video> element mounts and plays. Nothing full-res loads until
   the grid itself scrolls into view (see the IntersectionObserver below). */
function PostMediaGrid({ images, imageThumbs, videos, compact, full }) {
  const media = [
    ...(images || []).map((url, i) => ({ type: "image", url, gridUrl: (imageThumbs && imageThumbs[i]) || url })),
    ...(videos || []).map((v) => ({ type: "video", url: v.url, thumb: v.thumb, gridUrl: v.thumb })),
  ];
  const [lightbox, setLightbox] = useState(null);
  const [visible, setVisible] = useState(!compact);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || visible) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible]);

  if (media.length === 0) return null;
  const shown = full ? media : media.slice(0, 4);
  const extra = media.length - shown.length;
  const cols = shown.length === 1 ? 1 : 2;

  return (
    <div ref={ref}>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4,
        marginBottom: 10, overflow: "hidden", borderRadius: 12,
      }}>
        {shown.map((m, i) => (
          <div key={i} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLightbox(i); }}
            style={{ position: "relative", height: shown.length === 1 ? 220 : 120, cursor: "pointer", background: "#000" }}>
            {visible ? (
              <img src={m.gridUrl} alt="" loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : <div style={{ width: "100%", height: "100%", background: C.bg }} />}
            {m.type === "video" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.18)",
              }}><Play size={26} color="#fff" fill="#fff" /></div>
            )}
            {i === 3 && extra > 0 && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex",
                alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 800,
              }}>+{extra}</div>
            )}
          </div>
        ))}
      </div>
      {lightbox !== null && <MediaLightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function PostCard({ post, onOpen, showStatus }) {
  return (
    <button onClick={onOpen} style={{
      display: "block", width: "100%", textAlign: "left", background: C.card,
      border: post.isAnnouncement ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`,
      borderRadius: 16, padding: 14, marginBottom: 12, cursor: "pointer",
    }}>
      {post.repostOf && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10.5, color: C.textFaint }}>
          <Share2 size={11} /> Shared from {post.repostOf.authorName}
        </div>
      )}
      {post.repostOf && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, marginBottom: 10 }}>
          {post.repostOf.image && <img loading="lazy" src={post.repostOf.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
          <div style={{ fontSize: 11, color: C.textSoft, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{post.repostOf.content}</div>
        </div>
      )}
      {post.isAnnouncement && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 800, color: C.primary }}>
          <Megaphone size={13} /> OFFICIAL ANNOUNCEMENT
        </div>
      )}
      {post.featured && !post.isAnnouncement && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 800, color: "#B8860B" }}>
          <Star size={13} /> FEATURED
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: C.bg, display: "flex",
          alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
        }}>
          {post.authorPhoto ? <img loading="lazy" src={post.authorPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GraduationCap size={18} color={C.primary} />}
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{post.authorName}</div>
          <div style={{ fontSize: 10.5, color: C.textFaint }}>
            {[post.authorDept, post.authorLevel].filter(Boolean).join(" · ")}{(post.authorDept || post.authorLevel) ? " · " : ""}{timeAgo(post.createdAt)}
          </div>
        </div>
        {post.pinned && !post.isAnnouncement && <Pin size={14} color={C.primary} />}
      </div>
      {showStatus && <div style={{ marginBottom: 8 }}><PostStatusBadge status={post.status} /></div>}
      <div style={{
        fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: post.images && post.images.length ? 10 : 8,
        whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical",
      }}>{post.content}</div>
      <PostMediaGrid images={post.images} imageThumbs={post.imageThumbs} videos={post.videos} compact />
      {post.pdfName && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, borderRadius: 10, padding: "8px 10px", marginBottom: 10, fontSize: 11.5, color: C.textSoft }}>
          <FileText size={14} color={C.primary} /> {post.pdfName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: C.bg, borderRadius: 20, padding: "3px 9px" }}>{post.category}</span>
        {(post.tags || []).slice(0, 3).map((t) => <span key={t} style={{ fontSize: 10, color: C.textFaint }}>#{t}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: C.textFaint, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        <span>❤️ {post.likeCount || 0}</span>
        <span>💬 {post.commentCount || 0}</span>
        <span>🔖 {post.bookmarkCount || 0}</span>
        <span>↗️ {post.shareCount || 0}</span>
        <span>👁️ {post.viewCount || 0}</span>
        {post.pdfName && <span>⬇️ {post.downloadCount || 0}</span>}
      </div>
    </button>
  );
}

/* Automatic cleanup of unused media. Uploads are normally cleaned up immediately
   when a post is deleted or media is replaced (see cleanupPostMedia and
   deleteStorageUrlAndRefund above) — this sweep exists for the rarer durable
   orphan: an upload that finished but the app crashed / lost connection before
   the post document itself was written. Runs at most once per 24h per user
   (tracked on their own profile doc) and only touches that user's own Storage
   folders, so it's safe under Storage security rules that scope writes to uid. */
async function cleanupMyOrphanedMedia(user) {
  if (!fbDb || !fbStorage || !user) return;
  const userRef = fbDb.collection("users").doc(user.id);
  try {
    const doc = await userRef.get();
    const last = doc.exists && doc.data().lastMediaCleanupAt;
    const lastMs = last && last.toDate ? last.toDate().getTime() : (last ? new Date(last).getTime() : 0);
    if (Date.now() - lastMs < 24 * 60 * 60 * 1000) return;
    await userRef.set({ lastMediaCleanupAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch { return; }

  try {
    const [postsSnap, profileSnap] = await Promise.all([
      fbDb.collection("communityPosts").where("authorId", "==", user.id).get(),
      userRef.get(),
    ]);
    const referenced = new Set();
    postsSnap.forEach((d) => {
      const p = d.data() || {};
      (p.images || []).forEach((u) => referenced.add(u));
      (p.imageThumbs || []).forEach((u) => referenced.add(u));
      (p.videos || []).forEach((v) => { if (v.url) referenced.add(v.url); if (v.thumb && v.thumb.startsWith("http")) referenced.add(v.thumb); });
      if (p.pdfUrl) referenced.add(p.pdfUrl);
    });
    const profilePhoto = profileSnap.exists && profileSnap.data().profilePhoto;
    if (profilePhoto) referenced.add(profilePhoto);

    const staleCutoffMs = Date.now() - 60 * 60 * 1000; // skip anything under an hour old — may still be mid-upload
    for (const folder of ["communityImages", "communityVideos", "communityPdfs", "profilePhotos"]) {
      const listing = await fbStorage.ref().child(`${folder}/${user.id}`).listAll().catch(() => null);
      if (!listing) continue;
      for (const itemRef of listing.items) {
        const url = await itemRef.getDownloadURL().catch(() => null);
        if (!url || referenced.has(url)) continue;
        const meta = await itemRef.getMetadata().catch(() => null);
        if (!meta || new Date(meta.timeCreated).getTime() > staleCutoffMs) continue;
        await itemRef.delete().catch(() => {});
        if (meta.size) await trackStorageDelta(user.id, -meta.size);
      }
    }
  } catch (err) { EduSphere.Logger.warn("[EduSphere] Orphaned media sweep failed:", err.message); }
}

function CommunityScreen({ go, goPost, user, isAdmin }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const suspended = user && user.communitySuspended;

  const loadFeed = useCallback(async (reset) => {
    try {
      if (reset) { setPosts(null); setError(""); }
      const { docs, posts: newPosts } = await fetchCommunityFeed({
        status: "approved", category, afterDoc: reset ? null : lastDoc, pageSize: 12,
      });
      setPosts((prev) => (reset || !prev ? newPosts : [...prev, ...newPosts]));
      setLastDoc(docs.length ? docs[docs.length - 1] : null);
      setHasMore(docs.length === 12);
    } catch (err) {
      setError(err.message || "Couldn't load the community feed.");
      setPosts((p) => p || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => { loadFeed(true); /* eslint-disable-next-line */ }, [category]);
  useEffect(() => { cleanupMyOrphanedMedia(user); /* eslint-disable-next-line */ }, [user.id]);

  const loadMore = async () => { setLoadingMore(true); await loadFeed(false); setLoadingMore(false); };

  // Infinite scroll: auto-fetch the next page once the sentinel below the last
  // post scrolls into view, instead of making the person tap "Load more" every
  // time. The button stays as a manual fallback for accessibility / slow connections.
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || !posts || query.trim()) return undefined;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { rootMargin: "600px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, posts, query, lastDoc]);

  const filtered = (posts || []).filter((p) => {
    if (!postVisibleToUser(p, user, isAdmin)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (p.content || "").toLowerCase().includes(q)
      || (p.authorName || "").toLowerCase().includes(q)
      || (p.tags || []).some((t) => t.includes(q))
      || (p.category || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <TopBar title="Community" right={
        <button onClick={() => go("communityGuidelines")} style={iconBtnStyle} aria-label="Guidelines">
          <Info size={18} color="#fff" />
        </button>
      } />
      <div style={{ padding: "14px 16px 4px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 12,
        }}>
          <Search size={16} color={C.textFaint} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts, tags, people..."
            style={{ border: "none", outline: "none", fontSize: 13.5, width: "100%", background: "transparent", color: C.text }} />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
          <CommunityCategoryChip label="All" active={!category} onClick={() => setCategory(null)} />
          {COMMUNITY_CATEGORIES.map((c) => (
            <CommunityCategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 90px" }}>
        {suspended && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 12, color: C.danger }}>
            An admin has restricted your posting privileges. You can still read and browse the community.
          </div>
        )}
        {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 12.5, color: C.danger }}>{error}</div>}
        {posts === null && !error && (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 140, borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }} />)}
          </div>
        )}
        {posts && filtered.length === 0 && <EmptyState text={query ? "No posts match your search." : "No posts yet. Be the first to share something!"} />}
        {filtered.map((p) => <PostCard key={p.id} post={p} onOpen={() => goPost(p.id)} />)}
        {posts && !query && hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        {posts && !query && hasMore && (
          <button onClick={loadMore} disabled={loadingMore} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 6,
          }}>{loadingMore ? "Loading…" : "Load more"}</button>
        )}
      </div>

      <button onClick={() => (suspended ? null : go("createPost"))} disabled={suspended} style={{
        position: "fixed", bottom: 84, right: 20, width: 54, height: 54, borderRadius: "50%",
        background: suspended ? C.textFaint : C.primary, color: "#fff", border: "none", fontSize: 26, lineHeight: "54px", textAlign: "center",
        boxShadow: "0 8px 20px rgba(37,99,235,0.35)", cursor: suspended ? "default" : "pointer", zIndex: 6, padding: 0,
      }}>+</button>
    </div>
  );
}

function CreatePostScreen({ go, user }) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(COMMUNITY_CATEGORIES[0]);
  const [visibility, setVisibility] = useState("everyone");
  const [tagsInput, setTagsInput] = useState("");
  const [images, setImages] = useState([]); // [{file, preview}] — uploaded to Storage on submit
  const [videoFiles, setVideoFiles] = useState([]); // [{file, thumb, duration}]
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadBytesLabel, setUploadBytesLabel] = useState("");
  const [error, setError] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [vidBusy, setVidBusy] = useState(false);

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES_PER_POST - images.length);
    if (!files.length) return;
    setImgBusy(true);
    setError("");
    try {
      const next = [];
      for (const f of files) {
        await validateImageFile(f); // magic-byte check, size cap — throws with a clear message
        const preview = await compressImageFile(f);
        next.push({ file: f, preview });
      }
      setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES_PER_POST));
    } catch (err) {
      setError(err.message || "Couldn't process image.");
    }
    setImgBusy(false);
    e.target.value = "";
  };

  const onPickVideos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_VIDEOS_PER_POST - videoFiles.length);
    if (!files.length) return;
    setVidBusy(true);
    setError("");
    try {
      for (const f of files) {
        try { await validateVideoFile(f); } catch (err) { setError(err.message); continue; }
        const meta = await generateVideoThumbnail(f);
        setVideoFiles((prev) => [...prev, { file: f, thumb: meta.thumb, duration: meta.duration }].slice(0, MAX_VIDEOS_PER_POST));
      }
    } catch (err) {
      setError(err.message || "Couldn't process video.");
    }
    setVidBusy(false);
    e.target.value = "";
  };

  const onPickPdf = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      await validatePdfFile(file);
      setPdfFile(file);
      setPdfName(file.name);
    } catch (err) {
      setError(err.message || "Couldn't use that PDF.");
    }
    e.target.value = "";
  };

  const submit = async () => {
    setError("");
    if (!content.trim() && images.length === 0 && videoFiles.length === 0 && !pdfFile) { setError("Add some text, media, or a PDF before posting."); return; }
    if (!agree) { setError("Please confirm you'll follow the Community Guidelines."); return; }
    setBusy(true);
    let mediaBytes = 0;
    const uploadedUrls = []; // rolled back on failure so a broken submit never leaves orphaned Storage files
    try {
      let pdf = null;
      if (pdfFile) {
        setUploadStage("Uploading PDF…"); setUploadPct(0);
        pdf = await uploadCommunityPdf(pdfFile, user.id, (pct, transferred, total) => {
          setUploadPct(pct);
          setUploadBytesLabel(`${(transferred / 1048576).toFixed(1)} MB / ${(total / 1048576).toFixed(1)} MB`);
        });
        mediaBytes += pdf.size || 0; uploadedUrls.push(pdf.url);
      }
      setUploadBytesLabel("");
      const videos = [];
      for (let i = 0; i < videoFiles.length; i++) {
        setUploadStage(`Uploading video ${i + 1}/${videoFiles.length}…`);
        setUploadPct(0);
        const v = await uploadCommunityVideo(videoFiles[i].file, user.id, setUploadPct);
        videos.push(v);
        mediaBytes += v.size || 0;
        uploadedUrls.push(v.url);
      }
      const imageUrls = [], imageThumbUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploadStage(`Uploading image ${i + 1}/${images.length}…`);
        const up = await uploadCommunityImage(images[i].file, user.id);
        imageUrls.push(up.url); imageThumbUrls.push(up.thumbUrl);
        mediaBytes += up.bytes || 0;
        uploadedUrls.push(up.url, up.thumbUrl);
      }
      setUploadStage("Publishing…");
      await createCommunityPost({
        user, content: content.trim(), images: imageUrls, imageThumbs: imageThumbUrls,
        videos, pdf, category, tags: parseTags(tagsInput), visibility, mediaBytes,
      });
      go("community");
    } catch (err) {
      logUploadError(err);
      setError(describeUploadError(err));
      if (uploadedUrls.length) {
        Promise.all(uploadedUrls.map(deleteStorageUrl))
          .then(() => trackStorageDelta(user.id, -mediaBytes))
          .catch((cleanupErr) => EduSphere.Logger.warn("[EduSphere] Rollback cleanup failed:", cleanupErr.message));
      }
    }
    setUploadStage(""); setUploadPct(0); setUploadBytesLabel("");
    setBusy(false);
  };

  return (
    <div>
      <TopBar title="Create Post" onBack={() => go("community")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 12, padding: 12, fontSize: 11.5, color: C.warn, marginBottom: 14, lineHeight: 1.5 }}>
          Posts are reviewed by an admin before they appear in the Community feed.
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share notes, a question, past questions, an idea..."
          rows={6} style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, fontSize: 14,
            fontFamily: "inherit", color: C.text, background: C.card, resize: "vertical", marginBottom: 14, boxSizing: "border-box",
          }} />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>Category</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{
          width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13.5,
          color: C.text, background: C.card, marginBottom: 14, boxSizing: "border-box",
        }}>
          {COMMUNITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>Tags</div>
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="CSC102, FUTA, Exam"
          style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13.5, color: C.text, background: C.card, marginBottom: 14, boxSizing: "border-box" }} />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>Who can see this</div>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{
          width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13.5,
          color: C.text, background: C.card, marginBottom: 14, boxSizing: "border-box",
        }}>
          <option value="everyone">Everyone</option>
          <option value="school">My school only</option>
          <option value="department">My department only</option>
          <option value="level">My level only</option>
        </select>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <label style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${C.border}`, fontSize: 12.5, fontWeight: 700, color: C.primary, cursor: "pointer" }}>
            <ImageIcon size={16} /> {imgBusy ? "Processing…" : `Images (${images.length}/${MAX_IMAGES_PER_POST})`}
            <input type="file" accept="image/*" multiple onChange={onPickImages} style={{ display: "none" }} disabled={images.length >= MAX_IMAGES_PER_POST || imgBusy} />
          </label>
          <label style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${C.border}`, fontSize: 12.5, fontWeight: 700, color: C.primary, cursor: "pointer" }}>
            <Play size={16} /> {vidBusy ? "Processing…" : `Video (${videoFiles.length}/${MAX_VIDEOS_PER_POST})`}
            <input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={onPickVideos} style={{ display: "none" }} disabled={videoFiles.length >= MAX_VIDEOS_PER_POST || vidBusy} />
          </label>
          <label style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, border: `1.5px dashed ${C.border}`, fontSize: 12.5, fontWeight: 700, color: C.primary, cursor: "pointer" }}>
            <Paperclip size={16} /> {pdfName ? "Change PDF" : "PDF"}
            <input type="file" accept="application/pdf" onChange={onPickPdf} style={{ display: "none" }} />
          </label>
        </div>

        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img loading="lazy" src={img.preview} alt="" style={{ width: 74, height: 74, borderRadius: 10, objectFit: "cover" }} />
                <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                  background: C.danger, color: "#fff", border: "none", fontSize: 11, cursor: "pointer",
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
        {videoFiles.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {videoFiles.map((v, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img loading="lazy" src={v.thumb} alt="" style={{ width: 74, height: 74, borderRadius: 10, objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={18} color="#fff" />
                </div>
                <button onClick={() => setVideoFiles((prev) => prev.filter((_, idx) => idx !== i))} style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                  background: C.danger, color: "#fff", border: "none", fontSize: 11, cursor: "pointer",
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
        {pdfName && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.text, overflow: "hidden" }}>
              <FileText size={16} color={C.primary} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pdfName}</span>
            </div>
            <button onClick={() => { setPdfFile(null); setPdfName(""); }} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12 }}>Remove</button>
          </div>
        )}

        <Checkbox checked={agree} onToggle={() => setAgree(!agree)} label="I agree to follow the Community Guidelines"
          sub="No spam, harassment, cheating services, or inappropriate content." />

        {error && !busy && <UploadFailBanner error={error} onRetry={submit} />}

        {busy && uploadStage && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 6 }}>
              {uploadStage}{uploadPct > 0 ? ` ${uploadPct}%` : ""}{uploadBytesLabel ? ` · ${uploadBytesLabel}` : ""}
            </div>
            <div style={{ height: 6, borderRadius: 4, background: C.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${uploadPct || 15}%`, background: C.primary, transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        <button onClick={submit} disabled={busy} style={{
          width: "100%", padding: "14px 0", borderRadius: 14, border: "none", marginTop: 16,
          background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
        }}>{busy ? "Publishing…" : "Submit for Review"}</button>
      </div>
    </div>
  );
}

function ShareSheet({ postId, post, user, onClose, onShared, onReposted }) {
  const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  const [copied, setCopied] = useState(false);
  const [reposting, setReposting] = useState(false);
  const track = () => { trackShare(postId).catch(() => {}); if (onShared) onShared(); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); track(); } catch {}
  };
  const doRepost = async () => {
    setReposting(true);
    try { await repostCommunityPost({ user, original: { ...post, id: postId } }); if (onReposted) onReposted(); }
    catch {} 
    setReposting(false);
  };
  const options = [
    { label: "WhatsApp", emoji: "💬", href: `https://wa.me/?text=${encodeURIComponent(url)}` },
    { label: "Telegram", emoji: "✈️", href: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
    { label: "Facebook", emoji: "📘", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>Share Post</div>
      {user && post && post.authorId !== user.id && (
        <button onClick={doRepost} disabled={reposting} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.primary}`, background: C.bg,
          color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12,
        }}><Share2 size={15} /> {reposting ? "Sharing…" : "Share to my Community feed"}</button>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {options.map((o) => (
          <a key={o.label} href={o.href} target="_blank" rel="noopener noreferrer" onClick={track} style={{
            flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 12, border: `1px solid ${C.border}`, textDecoration: "none", fontSize: 20,
          }}>{o.emoji}<div style={{ fontSize: 10.5, color: C.textSoft, marginTop: 4 }}>{o.label}</div></a>
        ))}
      </div>
      <button onClick={copyLink} style={{
        width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
        background: C.bg, color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer",
      }}>{copied ? "Link Copied ✓" : "Copy Link"}</button>
    </Modal>
  );
}

function ReportModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>Report Post</div>
      {REPORT_REASONS.map((r) => <RadioRow key={r} checked={reason === r} label={r} onSelect={() => setReason(r)} />)}
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Additional details (optional)" rows={3} style={{
        width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, fontSize: 12.5,
        fontFamily: "inherit", color: C.text, marginTop: 6, marginBottom: 14, boxSizing: "border-box",
      }} />
      <button onClick={async () => { setBusy(true); await onSubmit(reason, details); setBusy(false); }} disabled={busy} style={{
        width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: C.danger, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
      }}>{busy ? "Submitting…" : "Submit Report"}</button>
    </Modal>
  );
}

function highlightMentions(text) {
  const parts = (text || "").split(/(@[A-Za-z][\w'-]*)/g);
  return parts.map((part, i) => (part.startsWith("@") ? <b key={i} style={{ color: C.primary }}>{part}</b> : part));
}

function CommentRow({ comment, replies, currentUser, isAdmin, onReply, onDelete, onEdit, onLike, onPin }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content);
  const liked = (comment.likedBy || []).includes(currentUser && currentUser.id);
  const isOwn = currentUser && comment.authorId === currentUser.id;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {comment.authorPhoto ? <img loading="lazy" src={comment.authorPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GraduationCap size={15} color={C.primary} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: comment.pinned ? C.bg : C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "9px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{comment.authorName}</span>
              {comment.pinned && <Pin size={10} color={C.primary} />}
              <span style={{ fontSize: 10, color: C.textFaint }}>· {timeAgo(comment.createdAt)}{comment.editedAt ? " · edited" : ""}</span>
            </div>
            {editing ? (
              <div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={() => { onEdit(comment.id, text); setEditing(false); }} style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ fontSize: 11, color: C.textFaint, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {comment.content && <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{highlightMentions(comment.content)}</div>}
                {comment.image && <img loading="lazy" src={comment.image} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, marginTop: comment.content ? 8 : 0, objectFit: "cover" }} />}
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 11, color: C.textFaint, paddingLeft: 4 }}>
            <button onClick={() => onLike(comment.id, liked)} style={{ background: "none", border: "none", color: liked ? C.primary : C.textFaint, cursor: "pointer", padding: 0, fontWeight: liked ? 700 : 400 }}>❤ {comment.likeCount || 0}</button>
            <button onClick={() => onReply(comment.id)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 0 }}>Reply</button>
            {isOwn && !editing && <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 0 }}>Edit</button>}
            {(isOwn || isAdmin) && <button onClick={() => onDelete(comment.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: 0 }}>Delete</button>}
            {isAdmin && <button onClick={() => onPin(comment.id, !comment.pinned)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", padding: 0 }}>{comment.pinned ? "Unpin" : "Pin"}</button>}
          </div>
          {replies && replies.length > 0 && (
            <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: `2px solid ${C.border}` }}>
              {replies.map((r) => (
                <CommentRow key={r.id} comment={r} replies={null} currentUser={currentUser} isAdmin={isAdmin}
                  onReply={onReply} onDelete={onDelete} onEdit={onEdit} onLike={onLike} onPin={onPin} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostDetailScreen({ postId, go, user, isAdmin }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState("");
  const [myReaction, setMyReaction] = useState(null);
  const [showReactions, setShowReactions] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [commentImgBusy, setCommentImgBusy] = useState(false);
  const [mentionedIds, setMentionedIds] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const flash = (t) => { setToast(t); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    try {
      const p = await fetchPost(postId);
      setPost(p);
      const c = await fetchComments(postId);
      setComments(c);
      if (user) {
        setMyReaction(await getMyReaction(postId, user.id));
        const bset = await fbDb.collection("users").doc(user.id).collection("bookmarksCommunity").doc(postId).get();
        setBookmarked(bset.exists);
      }
    } catch (err) {
      setError(err.message || "Couldn't load this post.");
    }
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);
  // Fire-and-forget view tracking — separate effect so a failed view-count
  // write never blocks or errors the actual post/comments load above.
  useEffect(() => { trackView(postId, user && user.id).catch(() => {}); }, [postId, user]);

  if (error) return <div><TopBar title="Post" onBack={() => go("community")} /><div style={{ padding: 16 }}><EmptyState text={error} /></div></div>;
  if (!post) return <div><TopBar title="Post" onBack={() => go("community")} /><div style={{ padding: 16 }}><EmptyState text="Loading…" /></div></div>;
  if (!postVisibleToUser(post, user, isAdmin)) return <div><TopBar title="Post" onBack={() => go("community")} /><div style={{ padding: 16 }}><EmptyState text="This post isn't visible to you." /></div></div>;

  const doReact = async (type) => {
    const wasType = myReaction;
    const nextType = wasType === type ? null : type;
    setMyReaction(nextType);
    setPost((p) => ({ ...p, likeCount: (p.likeCount || 0) + (wasType ? (nextType ? 0 : -1) : 1) }));
    setShowReactions(false);
    try { await setReaction(postId, user.id, user, type); } catch { load(); }
  };
  const doBookmark = async () => {
    setBookmarked((v) => !v);
    try { await toggleBookmark(postId, user.id); flash(bookmarked ? "Removed from Saved" : "Saved"); } catch { load(); }
  };
  const doDownload = async () => {
    try { await trackDownload(postId); } catch {}
    window.open(post.pdfUrl, "_blank");
  };
  const postComment = async () => {
    if (!commentText.trim() && !commentImage) return;
    const text = commentText.trim();
    const img = commentImage;
    const ids = mentionedIds.filter((m) => text.includes("@" + m.token)).map((m) => m.id);
    setCommentText(""); setCommentImage(null); setMentionedIds([]);
    try { await addComment({ postId, user, content: text, parentId: replyTo, image: img, mentions: ids }); setReplyTo(null); load(); }
    catch (err) { flash(err.message || "Couldn't post comment."); }
  };
  const onPickCommentImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCommentImgBusy(true);
    try { setCommentImage(await compressImageFile(file, 700, 0.6)); } catch (err) { flash(err.message || "Couldn't add image."); }
    setCommentImgBusy(false);
    e.target.value = "";
  };
  const addMention = (id, name) => {
    const token = name.split(" ")[0];
    if (!mentionedIds.some((m) => m.id === id)) setMentionedIds((prev) => [...prev, { id, token }]);
    setCommentText((t) => (t.endsWith(" ") || !t ? t : t + " ") + "@" + token + " ");
  };
  const doDeleteComment = async (id) => { await deleteCommentDoc(postId, id); load(); };
  const doEditComment = async (id, text) => { await editComment(postId, id, text); load(); };
  const doLikeComment = async (id, wasLiked) => { await toggleCommentLike(postId, id, user.id, wasLiked); load(); };
  const doPinComment = async (id, pinned) => { await pinComment(postId, id, pinned); load(); };

  const rootComments = comments.filter((c) => !c.parentId);
  const repliesFor = (id) => comments.filter((c) => c.parentId === id);
  const isOwner = user && post.authorId === user.id;
  const mentionCandidates = React.useMemo(() => {
    const map = new Map();
    if (post.authorId && user && post.authorId !== user.id) map.set(post.authorId, post.authorName);
    comments.forEach((c) => { if (c.authorId && (!user || c.authorId !== user.id)) map.set(c.authorId, c.authorName); });
    return Array.from(map, ([id, name]) => ({ id, name })).slice(0, 8);
  }, [post, comments, user]);

  return (
    <div>
      <TopBar title="Post" onBack={() => go("community")} right={
        <button onClick={() => setShowShare(true)} style={iconBtnStyle} aria-label="Share"><Share2 size={17} color="#fff" /></button>
      } />
      <div style={{ padding: 16, paddingBottom: 100 }}>
        {toast && <div style={{ background: C.successBg, color: C.success, border: `1px solid ${C.success}`, borderRadius: 12, padding: "9px 14px", fontSize: 12, marginBottom: 12 }}>{toast}</div>}

        {(isAdmin || isOwner) && post.status !== "approved" && <div style={{ marginBottom: 14 }}><PostStatusBadge status={post.status} /></div>}
        {post.status === "rejected" && post.rejectReason && (isOwner || isAdmin) && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 12, padding: 12, fontSize: 12, color: C.danger, marginBottom: 14 }}>
            Rejected: {post.rejectReason}
          </div>
        )}
        {post.repostOf && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
            <Share2 size={13} color={C.textFaint} />
            <div style={{ fontSize: 11.5, color: C.textSoft }}>Shared from <b>{post.repostOf.authorName}</b>: {post.repostOf.content}</div>
          </div>
        )}
        {post.isAnnouncement && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 800, color: C.primary }}>
            <Megaphone size={14} /> OFFICIAL ANNOUNCEMENT
          </div>
        )}
        {post.featured && !post.isAnnouncement && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 800, color: "#B8860B" }}>
            <Star size={14} /> FEATURED
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {post.authorPhoto ? <img loading="lazy" src={post.authorPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GraduationCap size={20} color={C.primary} />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{post.authorName}</div>
            <div style={{ fontSize: 11, color: C.textFaint }}>
              {[post.authorDept, post.authorLevel].filter(Boolean).join(" · ")}{(post.authorDept || post.authorLevel) ? " · " : ""}{timeAgo(post.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 14 }}>{post.content}</div>

        <PostMediaGrid images={post.images} imageThumbs={post.imageThumbs} videos={post.videos} full />

        {post.pdfName && (
          <button onClick={doDownload} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14, cursor: "pointer",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.text }}><FileText size={16} color={C.primary} /> {post.pdfName}</span>
            <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}><Download size={13} /> {post.downloadCount || 0}</span>
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.primary, background: C.bg, borderRadius: 20, padding: "3px 10px" }}>{post.category}</span>
          {(post.tags || []).map((t) => <span key={t} style={{ fontSize: 10.5, color: C.textFaint }}>#{t}</span>)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "12px 0", marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => (myReaction ? doReact(myReaction) : setShowReactions((v) => !v))}
              onContextMenu={(e) => { e.preventDefault(); setShowReactions(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: myReaction ? C.primary : C.textSoft }}>
              {myReaction ? REACTION_TYPES.find((r) => r.key === myReaction)?.emoji : "🤍"} {post.likeCount || 0}
            </button>
            {!myReaction && (
              <button onClick={() => setShowReactions((v) => !v)} style={{
                position: "absolute", left: 0, bottom: "100%", marginBottom: 2, background: "none", border: "none",
                fontSize: 9, color: C.textFaint, cursor: "pointer", padding: 0,
              }}>▲ react</button>
            )}
            {showReactions && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: -6, display: "flex", gap: 4,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "6px 8px",
                boxShadow: "0 6px 18px rgba(0,0,0,0.18)", zIndex: 5,
              }}>
                {REACTION_TYPES.map((r) => (
                  <button key={r.key} onClick={() => doReact(r.key)} style={{
                    background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 3,
                    transform: myReaction === r.key ? "scale(1.25)" : "scale(1)",
                  }} title={r.label}>{r.emoji}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.textSoft }}>💬 {post.commentCount || 0}</div>
          <button onClick={doBookmark} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: bookmarked ? C.primary : C.textSoft }}>
            🔖 {post.bookmarkCount || 0}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.textSoft }}>↗️ {post.shareCount || 0}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.textFaint }} title="Unique / total views">👁️ {post.uniqueViewCount || 0}</div>
          {!isOwner && (
            <button onClick={() => setShowReport(true)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.textFaint, fontSize: 12.5 }}>
              <Flag size={14} /> Report
            </button>
          )}
        </div>

        {isAdmin && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textSoft, marginBottom: 10 }}>ADMIN CONTROLS</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {post.status === "pending" && (
                <>
                  <AdminActionBtn label="Approve" onClick={async () => { await moderatePost(postId, "approve"); load(); }} kind="success" />
                  <AdminActionBtn label="Reject" onClick={() => setShowReject(true)} kind="danger" />
                </>
              )}
              {post.status === "approved" && <AdminActionBtn label="Hide" onClick={async () => { await moderatePost(postId, "hide"); load(); }} kind="warn" />}
              {(post.status === "hidden" || post.status === "rejected") && <AdminActionBtn label="Restore" onClick={async () => { await moderatePost(postId, "restore"); load(); }} kind="success" />}
              <AdminActionBtn label={post.pinned ? "Unpin" : "Pin"} onClick={async () => { await moderatePost(postId, "pin", { pinned: !post.pinned }); load(); }} kind="default" />
              <AdminActionBtn label={post.featured ? "Unfeature" : "Feature Post"} onClick={async () => { await moderatePost(postId, "feature", { featured: !post.featured }); load(); }} kind="default" />
              <AdminActionBtn label={post.locked ? "Unlock Comments" : "Lock Comments"} onClick={async () => { await moderatePost(postId, "lock", { locked: !post.locked }); load(); }} kind="default" />
              <AdminActionBtn label={post.commentsDisabled ? "Enable Comments" : "Disable Comments"} onClick={async () => { await moderatePost(postId, "disableComments", { disabled: !post.commentsDisabled }); load(); }} kind="default" />
              <AdminActionBtn label={post.isAnnouncement ? "Unmark Announcement" : "Make Announcement"} onClick={async () => { await moderatePost(postId, "announce", { isAnnouncement: !post.isAnnouncement }); load(); }} kind="default" />
              {(post.images?.length > 0 || post.videos?.length > 0 || post.pdfUrl) && (
                <AdminActionBtn label="Remove Media" onClick={async () => { if (confirm("Remove all images, videos, and PDF from this post? This can't be undone.")) { await moderatePost(postId, "removeMedia"); load(); } }} kind="warn" />
              )}
              <AdminActionBtn label="Delete" onClick={async () => { if (confirm("Delete this post permanently?")) { await deleteCommunityPost(postId); go("community"); } }} kind="danger" />
            </div>
            {showReject && (
              <div style={{ marginTop: 12 }}>
                <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection"
                  style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 12.5, marginBottom: 8, boxSizing: "border-box" }} />
                <button onClick={async () => { await moderatePost(postId, "reject", { reason: rejectReason || undefined }); setShowReject(false); load(); }} style={{
                  background: C.danger, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>Confirm Rejection</button>
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 12 }}>Comments ({post.commentCount || 0})</div>
        {post.locked && <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 12 }}>Comments are locked for this post.</div>}
        {rootComments.length === 0 && <div style={{ fontSize: 12.5, color: C.textFaint, marginBottom: 14 }}>No comments yet. Start the discussion!</div>}
        {rootComments.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((c) => (
          <CommentRow key={c.id} comment={c} replies={repliesFor(c.id)} currentUser={user} isAdmin={isAdmin}
            onReply={(id) => setReplyTo(id)} onDelete={doDeleteComment} onEdit={doEditComment} onLike={doLikeComment} onPin={doPinComment} />
        ))}
      </div>

      {!post.locked && !post.commentsDisabled && (
        <div style={{ position: "sticky", bottom: 0, background: C.card, borderTop: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {replyTo && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textFaint }}>
              <span>Replying to comment</span>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer" }}>Cancel</button>
            </div>
          )}
          {mentionCandidates.length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {mentionCandidates.map((m) => (
                <button key={m.id} onClick={() => addMention(m.id, m.name)} style={{
                  flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: C.primary, background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 14, padding: "3px 10px", cursor: "pointer",
                }}>@{m.name.split(" ")[0]}</button>
              ))}
            </div>
          )}
          {commentImage && (
            <div style={{ position: "relative", width: 60 }}>
              <img loading="lazy" src={commentImage} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
              <button onClick={() => setCommentImage(null)} style={{
                position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                background: C.danger, color: "#fff", border: "none", fontSize: 10, cursor: "pointer",
              }}>✕</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ flexShrink: 0, cursor: "pointer", color: commentImgBusy ? C.textFaint : C.primary }}>
              <ImageIcon size={20} />
              <input type="file" accept="image/*" onChange={onPickCommentImage} style={{ display: "none" }} disabled={commentImgBusy || !!commentImage} />
            </label>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment... use @ to mention"
              onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
              style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 20, padding: "10px 14px", fontSize: 13, background: C.bg, color: C.text }} />
            <button onClick={postComment} style={{ width: 38, height: 38, borderRadius: "50%", background: C.primary, color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {showShare && (
        <ShareSheet postId={postId} post={post} user={user} onClose={() => setShowShare(false)}
          onShared={() => setPost((p) => ({ ...p, shareCount: (p.shareCount || 0) + 1 }))}
          onReposted={() => { setShowShare(false); flash("Shared to your Community feed."); setPost((p) => ({ ...p, shareCount: (p.shareCount || 0) + 1 })); }} />
      )}
      {showReport && (
        <ReportModal onClose={() => setShowReport(false)} onSubmit={async (reason, details) => {
          await submitReport({
            postId, uid: user.id, reporterName: user.fullName, reason, details,
            postAuthorId: post.authorId, postAuthorName: post.authorName,
            postSnippet: (post.title || post.content || "").slice(0, 100),
          });
          setShowReport(false);
          flash("Report submitted. Thank you.");
        }} />
      )}
    </div>
  );
}

function SavedPostsScreen({ go, goPost, user }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const p = await fetchBookmarkedPosts(user.id); if (!cancelled) setPosts(p); }
      catch (err) { if (!cancelled) setError(err.message || "Couldn't load saved posts."); }
    })();
    return () => { cancelled = true; };
  }, [user]);
  return (
    <div>
      <TopBar title="Saved Posts" onBack={() => go("profile")} />
      <div style={{ padding: 16 }}>
        {error && <EmptyState text={error} />}
        {posts === null && !error && <EmptyState text="Loading…" />}
        {posts && posts.length === 0 && <EmptyState text="You haven't saved any posts yet." />}
        {posts && posts.map((p) => <PostCard key={p.id} post={p} onOpen={() => goPost(p.id)} />)}
      </div>
    </div>
  );
}

function MyPostsScreen({ go, goPost, user }) {
  const [posts, setPosts] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const PAGE_SIZE = 15;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { docs, posts: p } = await fetchMyPosts(user.id, { pageSize: PAGE_SIZE });
        if (cancelled) return;
        setPosts(p);
        setLastDoc(docs[docs.length - 1] || null);
        setHasMore(docs.length === PAGE_SIZE);
      } catch (err) { if (!cancelled) setError(err.message || "Couldn't load your posts."); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { docs, posts: p } = await fetchMyPosts(user.id, { afterDoc: lastDoc, pageSize: PAGE_SIZE });
      setPosts((prev) => [...(prev || []), ...p]);
      setLastDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message || "Couldn't load more posts.");
    } finally {
      setLoadingMore(false);
    }
  };

  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || !posts) return undefined;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { rootMargin: "600px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, posts, lastDoc]);

  return (
    <div>
      <TopBar title="My Posts" onBack={() => go("profile")} />
      <div style={{ padding: 16 }}>
        {error && <EmptyState text={error} />}
        {posts === null && !error && <EmptyState text="Loading…" />}
        {posts && posts.length === 0 && <EmptyState text="You haven't posted anything yet." />}
        {posts && posts.map((p) => <PostCard key={p.id} post={p} showStatus onOpen={() => goPost(p.id)} />)}
        {posts && posts.length > 0 && hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        {posts && posts.length > 0 && hasMore && (
          <button onClick={loadMore} disabled={loadingMore} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.primary, fontWeight: 700, fontSize: 13, cursor: loadingMore ? "default" : "pointer", marginTop: 6,
          }}>{loadingMore ? "Loading…" : "Load More"}</button>
        )}
        {posts && posts.length > 0 && !hasMore && (
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.textFaint, padding: "10px 0" }}>You've reached the end.</div>
        )}
      </div>
    </div>
  );
}

function CommunityGuidelinesScreen({ go }) {
  const rules = [
    ["No Spam", "Don't post repetitive, irrelevant, or promotional content."],
    ["No Pornography", "Sexual or explicit content of any kind is prohibited."],
    ["No Violence", "Content depicting or promoting violence is not allowed."],
    ["No Harassment", "Treat every member with respect — no bullying, threats, or targeted abuse."],
    ["No Cheating Services", "Don't offer or request paid exam-writing, assignment-writing, or exam-leak services."],
    ["No Fraud", "Scams, phishing, or requests for money under false pretenses are prohibited."],
    ["No Hate Speech", "Content attacking people based on identity, religion, tribe, or background is not allowed."],
    ["No Illegal Content", "Don't share or request anything illegal under Nigerian law."],
  ];
  return (
    <div>
      <TopBar title="Community Guidelines" onBack={() => go("community")} />
      <div style={{ padding: 16, paddingBottom: 30 }}>
        <div style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.6, marginBottom: 18 }}>
          EduSphere Community exists to help FUTA students learn together. Every post is reviewed by an admin before it goes live. Here's what keeps it safe and useful for everyone:
        </div>
        {rules.map(([title, desc]) => (
          <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 12, lineHeight: 1.6 }}>
          Breaking these guidelines can lead to a post being rejected, removed, or your posting privileges being restricted by an admin.
        </div>
      </div>
    </div>
  );
}

const ADMIN_POST_STATUS_FILTERS = [
  { key: "", label: "All" }, { key: "approved", label: "Approved" }, { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" }, { key: "hidden", label: "Hidden" },
];

function AdminPostRow({ p, onOpen, onApprove, onReject, onPin, onHide, onRestore, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <PostCard post={p} onOpen={onOpen} showStatus />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: -6 }}>
        {p.status === "pending" && <AdminActionBtn label="Approve" onClick={onApprove} kind="success" />}
        {p.status === "pending" && <AdminActionBtn label="Reject" onClick={onReject} kind="danger" />}
        {p.status === "approved" && <AdminActionBtn label="Hide" onClick={onHide} kind="warn" />}
        {(p.status === "hidden" || p.status === "rejected") && <AdminActionBtn label="Restore" onClick={onRestore} kind="success" />}
        <AdminActionBtn label={p.pinned ? "Unpin" : "Pin"} onClick={onPin} kind="default" />
        {!confirmDelete ? (
          <AdminActionBtn label="Delete" onClick={() => setConfirmDelete(true)} kind="danger" />
        ) : (
          <>
            <AdminActionBtn label="Cancel" onClick={() => setConfirmDelete(false)} kind="default" />
            <AdminActionBtn label="Confirm Delete" onClick={() => { setConfirmDelete(false); onDelete(); }} kind="danger" />
          </>
        )}
      </div>
    </div>
  );
}

function AdminCommunityScreen({ go, goPost }) {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState(null);
  const [reports, setReports] = useState(null);
  const [resolvedReports, setResolvedReports] = useState(null);
  const [reportSubTab, setReportSubTab] = useState("open"); // "open" | "resolved"
  const [topStrikes, setTopStrikes] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // All Posts tab state
  const [allPosts, setAllPosts] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flash = (text) => { setToast(text); setTimeout(() => setToast(null), 2500); };

  const loadOverview = useCallback(async () => {
    try {
      const [p, r, allSnap, strikes] = await Promise.all([fetchPendingPosts(), fetchReports("open"), fbDb.collection("communityPosts").get(), fetchTopStrikes()]);
      setPending(p);
      setReports(r);
      setTopStrikes(strikes);
      let approved = 0, total = 0;
      allSnap.forEach((d) => { total += 1; if ((d.data() || {}).status === "approved") approved += 1; });
      setStats({ total, approved, pending: p.length, reports: r.length });
    } catch (err) {
      setError(err.message || "Couldn't load community data.");
    }
  }, []);

  const loadResolvedReports = useCallback(async () => {
    try { setResolvedReports(await fetchReports("resolved")); }
    catch (err) { setError(err.message || "Couldn't load resolved reports."); }
  }, []);

  useEffect(() => { if (tab === "reports" && reportSubTab === "resolved" && resolvedReports === null) loadResolvedReports(); }, [tab, reportSubTab, resolvedReports, loadResolvedReports]);

  const loadAllPosts = useCallback(async (reset) => {
    try {
      const { docs, posts } = await fetchAllPostsAdmin({ status: statusFilter || null, pageSize: 20 });
      setAllPosts(posts);
      setLastDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === 20);
    } catch (err) {
      setError(err.message || "Couldn't load posts.");
    }
  }, [statusFilter]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "all") { setAllPosts(null); loadAllPosts(true); } }, [tab, loadAllPosts]);

  const loadMoreAllPosts = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { docs, posts } = await fetchAllPostsAdmin({ status: statusFilter || null, afterDoc: lastDoc, pageSize: 20 });
      setAllPosts((prev) => [...(prev || []), ...posts]);
      setLastDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === 20);
    } catch (err) {
      setError(err.message || "Couldn't load more posts.");
    } finally {
      setLoadingMore(false);
    }
  };

  const quickApprove = async (id) => { await moderatePost(id, "approve"); flash("Post approved."); loadOverview(); if (tab === "all") loadAllPosts(); };
  const quickReject = async (id) => { await moderatePost(id, "reject", { reason: "Didn't meet community guidelines." }); flash("Post rejected."); loadOverview(); if (tab === "all") loadAllPosts(); };
  const quickHide = async (id) => { await moderatePost(id, "hide"); flash("Post hidden."); loadOverview(); if (tab === "all") loadAllPosts(); };
  const quickRestore = async (id) => { await moderatePost(id, "restore"); flash("Post restored."); loadOverview(); if (tab === "all") loadAllPosts(); };
  const quickPin = async (id, pinned) => { await moderatePost(id, "pin", { pinned: !pinned }); flash(pinned ? "Post unpinned." : "Post pinned."); loadOverview(); if (tab === "all") loadAllPosts(); };
  const quickDelete = async (id) => { await deleteCommunityPost(id); flash("Post deleted."); loadOverview(); if (tab === "all") loadAllPosts(); };

  const visiblePosts = (allPosts || []).filter((p) =>
    !search.trim() ||
    (p.content || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.authorName || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <TopBar title="Community Management" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        {error && <div style={{ background: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 14 }}>{error}</div>}
        {toast && <div style={{ background: C.successBg, color: C.success, border: `1px solid ${C.success}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, marginBottom: 12 }}>{toast}</div>}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[["Total", stats.total], ["Approved", stats.approved], ["Pending", stats.pending], ["Reports", stats.reports]].map(([label, val]) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{val}</div>
                <div style={{ fontSize: 9, color: C.textSoft, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["all", "All Posts"], ["pending", "Pending"], ["reports", "Reports"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: `1.5px solid ${tab === k ? C.primary : C.border}`,
              background: tab === k ? C.primary : C.card, color: tab === k ? "#fff" : C.textSoft, fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {tab === "all" && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 10,
            }}>
              <Search size={16} color={C.textFaint} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts, authors, tags…"
                style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
              {ADMIN_POST_STATUS_FILTERS.map((f) => (
                <CommunityCategoryChip key={f.key} label={f.label} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)} />
              ))}
            </div>
            {allPosts === null && <EmptyState text="Loading…" />}
            {allPosts && visiblePosts.length === 0 && <EmptyState text="No posts match." />}
            {allPosts && visiblePosts.map((p) => (
              <AdminPostRow key={p.id} p={p} onOpen={() => goPost(p.id)}
                onApprove={() => quickApprove(p.id)} onReject={() => quickReject(p.id)}
                onHide={() => quickHide(p.id)} onRestore={() => quickRestore(p.id)}
                onPin={() => quickPin(p.id, p.pinned)} onDelete={() => quickDelete(p.id)} />
            ))}
            {allPosts && visiblePosts.length > 0 && !search.trim() && hasMore && (
              <button onClick={loadMoreAllPosts} disabled={loadingMore} style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: C.card, color: C.primary, fontWeight: 700, fontSize: 13, cursor: loadingMore ? "default" : "pointer", marginTop: 6,
              }}>{loadingMore ? "Loading…" : "Load More"}</button>
            )}
          </>
        )}

        {tab === "pending" && (
          <>
            {pending === null && <EmptyState text="Loading…" />}
            {pending && pending.length === 0 && <EmptyState text="No posts awaiting review." />}
            {pending && pending.map((p) => (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <PostCard post={p} onOpen={() => goPost(p.id)} showStatus />
                <div style={{ display: "flex", gap: 8, marginTop: -6 }}>
                  <AdminActionBtn label="Quick Approve" onClick={() => quickApprove(p.id)} kind="success" />
                  <AdminActionBtn label="Quick Reject" onClick={() => quickReject(p.id)} kind="danger" />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "reports" && (
          <>
            {topStrikes && topStrikes.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textSoft, marginBottom: 8 }}>USER STRIKES</div>
                {topStrikes.map((u) => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{u.fullName || u.email}</span>
                    <span style={{ color: C.danger, fontWeight: 700 }}>{u.warningCount} strike{u.warningCount === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["open", "Pending"], ["resolved", "Resolved"]].map(([k, label]) => (
                <button key={k} onClick={() => setReportSubTab(k)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${reportSubTab === k ? C.primary : C.border}`,
                  background: reportSubTab === k ? C.primary : C.card, color: reportSubTab === k ? "#fff" : C.textSoft, fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>

            {reportSubTab === "open" && (
              <>
                {reports === null && <EmptyState text="Loading…" />}
                {reports && reports.length === 0 && <EmptyState text="No pending reports." />}
                {reports && reports.map((r) => (
                  <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>{r.reason}</div>
                    {r.postSnippet && <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 4, fontStyle: "italic" }}>"{r.postSnippet}"</div>}
                    <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>
                      Reported by {r.reporterName || "a student"}{r.postAuthorName ? ` · Post by ${r.postAuthorName}` : ""}
                    </div>
                    {r.details && <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 8 }}>{r.details}</div>}
                    <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 10 }}>{timeAgo(r.createdAt)}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <AdminActionBtn label="View Post" onClick={() => goPost(r.postId)} kind="default" />
                      {r.postAuthorId && (
                        <AdminActionBtn label="Warn Author" onClick={async () => {
                          const reason = prompt(`Reason for warning ${r.postAuthorName || "this user"}:`, r.reason) ;
                          if (reason === null) return;
                          await warnUser(r.postAuthorId, reason || r.reason);
                          flash("Warning sent.");
                        }} kind="warn" />
                      )}
                      <AdminActionBtn label="Resolve" onClick={async () => { await resolveReport(r.id); flash("Report resolved."); loadOverview(); }} kind="success" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {reportSubTab === "resolved" && (
              <>
                {resolvedReports === null && <EmptyState text="Loading…" />}
                {resolvedReports && resolvedReports.length === 0 && <EmptyState text="No resolved reports yet." />}
                {resolvedReports && resolvedReports.map((r) => (
                  <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10, opacity: 0.85 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>{r.reason}</div>
                    {r.postSnippet && <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 4, fontStyle: "italic" }}>"{r.postSnippet}"</div>}
                    <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8 }}>
                      Reported by {r.reporterName || "a student"}{r.postAuthorName ? ` · Post by ${r.postAuthorName}` : ""} · Resolved
                    </div>
                    <AdminActionBtn label="View Post" onClick={() => goPost(r.postId)} kind="default" />
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


/* ============================= ADMIN PHASE-2 MODULES (v5.3) ============================= */

function AdminStatRow({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8, marginBottom: 16 }}>
      {items.map(([label, val]) => (
        <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{val}</div>
          <div style={{ fontSize: 9, color: C.textSoft, marginTop: 2 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function AdminSearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: C.card,
      border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 12,
    }}>
      <Search size={16} color={C.textFaint} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
    </div>
  );
}

function AdminToast({ text }) {
  if (!text) return null;
  return <div style={{ background: C.successBg, color: C.success, border: `1px solid ${C.success}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, marginBottom: 12 }}>{text}</div>;
}
function AdminError({ text, onRetry }) {
  if (!text) return null;
  return (
    <div style={{ background: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 12, padding: 12, fontSize: 12, marginBottom: 14 }}>
      {text}{onRetry && <button onClick={onRetry} style={{ display: "block", marginTop: 6, background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", padding: 0 }}>Retry</button>}
    </div>
  );
}

/* ----------------------------- SHARED UPLOAD UI (no more infinite loading) -----------------------------
   Two small building blocks reused by every upload flow (branding assets,
   community post media, profile photo):
   - UploadFailBanner: "Upload failed" + the specific reason from
     describeUploadError() + a Retry button. This is what the user sees
     instead of a spinner that never resolves and a console-only error.
   - UploadStageIndicator: the Uploading… → Processing… → Saving… →
     Completed successfully progression for admin uploads, so there's always
     a visible sign of what's happening (and that it finished). */
function UploadFailBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.danger }}>Upload failed</div>
          <div style={{ fontSize: 11.5, color: C.danger, marginTop: 2, lineHeight: 1.45 }}>{error}</div>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          marginTop: 10, background: C.danger, color: "#fff", border: "none", borderRadius: 9,
          padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Retry Upload</button>
      )}
    </div>
  );
}
const UPLOAD_STAGE_LABELS = { uploading: "Uploading…", processing: "Processing…", saving: "Saving…", done: "Completed successfully" };
function UploadStageIndicator({ stage }) {
  if (!stage || !UPLOAD_STAGE_LABELS[stage]) return null;
  const isDone = stage === "done";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9, background: isDone ? C.successBg : C.cardAlt,
      border: `1px solid ${isDone ? C.success : C.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14,
    }}>
      {isDone
        ? <CheckCircle2 size={15} />
        : <span style={{
            width: 13, height: 13, borderRadius: "50%", border: `2px solid ${C.border}`, borderTopColor: C.primary,
            display: "inline-block", animation: "flSpin 0.8s linear infinite", flexShrink: 0,
          }} />}
      <span style={{ fontSize: 12.5, fontWeight: 700, color: isDone ? C.success : C.text }}>{UPLOAD_STAGE_LABELS[stage]}</span>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, textarea, type }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>{label}</div>}
      <Tag value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type || "text"}
        rows={textarea ? 4 : undefined}
        style={{
          width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px",
          fontSize: 13.5, color: C.text, background: C.card, outline: "none", resize: textarea ? "vertical" : undefined,
          fontFamily: "inherit",
        }} />
    </div>
  );
}

function CourseChipRow({ courses, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
      {courses.map((c) => (
        <CommunityCategoryChip key={c.code} label={c.code} active={value === c.code} onClick={() => onChange(c.code)} />
      ))}
    </div>
  );
}

/* ---------------- Courses Manager ---------------- */
const COURSE_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" }, { value: "private", label: "Private" },
  { value: "hidden", label: "Hidden" }, { value: "archived", label: "Archived" },
];
function AdminCourseFormModal({ initial, onClose, onSave }) {
  const [code, setCode] = useState(initial ? initial.code : "");
  const [name, setName] = useState(initial ? initial.name : "");
  const [dept, setDept] = useState(initial ? initial.dept : "");
  const [description, setDescription] = useState(initial ? initial.description || "" : "");
  const [ready, setReady] = useState(initial ? !!initial.ready : false);
  // v8.0 Module 1 — classification against the dynamic academic hierarchy. Every course
  // now belongs to exactly one School, Department, Level, and Semester (by id).
  const [schoolId, setSchoolId] = useState(initial ? initial.schoolId || "" : "");
  const [departmentId, setDepartmentId] = useState(initial ? initial.departmentId || "" : "");
  const [levelId, setLevelId] = useState(initial ? initial.levelId || "" : "");
  const [semesterId, setSemesterId] = useState(initial ? initial.semesterId || "" : "");
  const [creditUnit, setCreditUnit] = useState(initial && initial.creditUnit ? String(initial.creditUnit) : "");
  const [lecturer, setLecturer] = useState(initial ? initial.lecturer || "" : "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial ? initial.thumbnailUrl || "" : "");
  const [bannerUrl, setBannerUrl] = useState(initial ? initial.bannerUrl || "" : "");
  const [color, setColor] = useState(initial ? initial.color || "" : "");
  const [icon, setIcon] = useState(initial ? initial.icon || "" : "");
  const [visibility, setVisibility] = useState(initial ? initial.visibility || "public" : "public");
  const [displayOrder, setDisplayOrder] = useState(initial && initial.displayOrder !== undefined && initial.displayOrder !== null ? String(initial.displayOrder) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const { schools, departments, levels, semesters, departmentsForSchool } = useAcademicStructure();
  const schoolOptions = schools.map((s) => ({ value: s.id, label: s.name }));
  const departmentOptions = departmentsForSchool(schoolId).map((d) => ({ value: d.id, label: d.name }));
  const levelOptions = levels.map((l) => ({ value: l.id, label: l.name }));
  const semesterOptions = semesters.map((s) => ({ value: s.id, label: s.name }));
  useEffect(() => {
    if (!departmentId) return;
    const match = departments.find((d) => d.id === departmentId);
    if (match) setDept(match.name);
  }, [departmentId, departments]);

  const save = async () => {
    if (!code.trim() || !name.trim()) { setErr("Course code and name are required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave(code.trim().toUpperCase(), {
        name, dept, description, ready, schoolId, departmentId, levelId, semesterId,
        creditUnit: creditUnit === "" ? null : Number(creditUnit), lecturer, thumbnailUrl, bannerUrl, color, icon,
        visibility, displayOrder: displayOrder === "" ? undefined : Number(displayOrder),
      });
      onClose();
    }
    catch (e) { setErr(e.message || "Couldn't save course."); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Course" : "Add Course"}</div>
      {err && <AdminError text={err} />}
      <TextField label="Course Code" value={code} onChange={setCode} placeholder="e.g. CPE102" />
      <TextField label="Course Name" value={name} onChange={setName} placeholder="e.g. Engineering Drawing" />
      <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, margin: "6px 0 2px" }}>Classification</div>
      <SelectField label="School" value={schoolId} onChange={(v) => { setSchoolId(v); setDepartmentId(""); }} options={schoolOptions} placeholder="Select school…" />
      <SelectField label="Department" value={departmentId} onChange={setDepartmentId} options={departmentOptions} placeholder={schoolId ? "Select department…" : "Select a school first"} />
      <SelectField label="Level" value={levelId} onChange={setLevelId} options={levelOptions} placeholder="Select level…" />
      <SelectField label="Semester" value={semesterId} onChange={setSemesterId} options={semesterOptions} placeholder="Select semester…" />
      <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, margin: "10px 0 2px" }}>Details</div>
      <TextField label="Credit Unit" value={creditUnit} onChange={setCreditUnit} placeholder="e.g. 3" type="number" />
      <TextField label="Lecturer" value={lecturer} onChange={setLecturer} placeholder="Optional" />
      <TextField label="Course Thumbnail URL" value={thumbnailUrl} onChange={setThumbnailUrl} placeholder="https://… (optional)" />
      <TextField label="Course Banner URL" value={bannerUrl} onChange={setBannerUrl} placeholder="https://… (optional)" />
      <TextField label="Course Color" value={color} onChange={setColor} placeholder="#1565C0 (optional)" />
      <TextField label="Course Icon" value={icon} onChange={setIcon} placeholder="e.g. 📘 (optional emoji)" />
      <SelectField label="Visibility" value={visibility} onChange={setVisibility} options={COURSE_VISIBILITY_OPTIONS} placeholder="Select visibility…" />
      <TextField label="Display Order" value={displayOrder} onChange={setDisplayOrder} placeholder="Lower shows first (optional)" type="number" />
      <TextField label="Department (legacy text label)" value={dept} onChange={setDept} placeholder="Auto-fills from Department above — only used by older screens" />
      <TextField label="Description" value={description} onChange={setDescription} placeholder="Short description (optional)" textarea />
      <Checkbox checked={ready} label="Ready for students" sub="Shown as available to practice/study" onToggle={() => setReady((r) => !r)} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

function AdminCoursesScreen({ go }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  // One-time seed (safe/idempotent), then a live listener takes over — this is the same
  // "courses" collection useLiveCourses() reads, so every add/edit/delete here reaches
  // every student screen instantly.
  useEffect(() => {
    let cancelled = false;
    setError("");
    seedManagedCoursesIfEmpty().catch((err) => { if (!cancelled) setError(err.message || "Couldn't seed courses."); });
    const unsubscribe = fbDb.collection("courses").orderBy("code", "asc").onSnapshot(
      (snap) => { if (!cancelled) setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
      (err) => { if (!cancelled) setError(err.message || "Couldn't load courses."); }
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const filtered = (courses || []).filter((c) =>
    !search.trim() || c.code.toLowerCase().includes(search.toLowerCase()) || (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const remove = async (c) => {
    if (!confirm(`Delete ${c.code}? This removes it from Courses Manager only.`)) return;
    await deleteManagedCourse(c.code);
    flash(`${c.code} deleted.`);
  };

  return (
    <div>
      <TopBar title="Courses Manager" onBack={() => go("adminDashboard")} right={
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ Add</button>
      } />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} />
        <AdminToast text={toast} />
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
        {courses === null && !error && <EmptyState text="Loading…" />}
        {courses && filtered.length === 0 && <EmptyState text="No courses found." />}
        {filtered.map((c) => (
          <div key={c.code} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.code}</div>
                <div style={{ fontSize: 12, color: C.textSoft }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{c.dept}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px",
                color: c.ready ? C.success : C.textFaint, background: c.ready ? C.successBg : C.border,
              }}>{c.ready ? "Ready" : "Not Ready"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <AdminActionBtn label="Edit" onClick={() => { setEditing(c); setShowForm(true); }} kind="default" />
              <AdminActionBtn label="Delete" onClick={() => remove(c)} kind="danger" />
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <AdminCourseFormModal initial={editing} onClose={() => setShowForm(false)}
          onSave={async (code, data) => { await upsertManagedCourse(code, data); flash(editing ? "Course updated." : "Course added."); }} />
      )}
    </div>
  );
}

/* ================== ACADEMIC MANAGEMENT (v8.0 Module 1) ==================
   Config-driven CRUD for the five academic entities (Universities, Schools,
   Departments, Levels, Semesters). One list screen + one form modal + one
   bulk-import modal serve all five — only the config differs — so adding a
   sixth entity later is a config entry, not a new screen. */

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>{label}</div>}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="flNativeSelect" style={{
        width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
        fontSize: 13.5, fontWeight: 600, color: C.text, background: C.card,
      }}>
        <option value="">{placeholder || "Select…"}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* Minimal CSV parser (handles quoted fields with embedded commas) — deliberately
   simple since bulk-import files here are admin-authored, not arbitrary uploads. */
function parseAcademicCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const splitLine = (line) => {
    const out = []; let cur = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] !== undefined ? cells[i] : ""; });
    return obj;
  });
}

const ACADEMIC_ENTITY_CONFIGS = {
  university: {
    kind: "university", label: "University", plural: "Universities", crud: universityCRUD,
    collectionName: ACADEMIC_COLLECTIONS.universities, blockerKind: "university",
    fields: [
      { key: "name", label: "University Name", required: true, placeholder: "e.g. Federal University of Technology, Akure" },
      { key: "code", label: "Code", placeholder: "e.g. FUTA" },
      { key: "motto", label: "Motto", placeholder: "Optional" },
      { key: "logoUrl", label: "Logo URL", placeholder: "https://… (optional)" },
      { key: "description", label: "Description", textarea: true, placeholder: "Optional" },
    ],
  },
  school: {
    kind: "school", label: "School", plural: "Schools", crud: schoolCRUD,
    collectionName: ACADEMIC_COLLECTIONS.schools, blockerKind: "school",
    parent: { key: "universityId", label: "University", source: "universities" },
    fields: [
      { key: "name", label: "School Name", required: true, placeholder: "e.g. School of Computing" },
      { key: "code", label: "Code", placeholder: "Optional" },
      { key: "color", label: "Color", placeholder: "#1565C0 (optional)" },
      { key: "logoUrl", label: "Logo URL", placeholder: "https://… (optional)" },
      { key: "description", label: "Description", textarea: true, placeholder: "Optional" },
    ],
  },
  department: {
    kind: "department", label: "Department", plural: "Departments", crud: departmentCRUD,
    collectionName: ACADEMIC_COLLECTIONS.departments, blockerKind: "department",
    parent: { key: "schoolId", label: "School", source: "schools" },
    fields: [
      { key: "name", label: "Department Name", required: true, placeholder: "e.g. Computer Engineering" },
      { key: "code", label: "Code", placeholder: "Optional" },
      { key: "logoUrl", label: "Logo URL", placeholder: "https://… (optional)" },
      { key: "description", label: "Description", textarea: true, placeholder: "Optional" },
    ],
  },
  level: {
    kind: "level", label: "Level", plural: "Levels", crud: levelCRUD,
    collectionName: ACADEMIC_COLLECTIONS.levels, blockerKind: "level",
    fields: [
      { key: "name", label: "Level Name", required: true, placeholder: "e.g. 100 Level, Postgraduate, HND II" },
      { key: "number", label: "Level Number", type: "number", placeholder: "e.g. 100 (optional — used for sorting)" },
      { key: "description", label: "Description", textarea: true, placeholder: "Optional" },
    ],
  },
  semester: {
    kind: "semester", label: "Semester", plural: "Semesters", crud: semesterCRUD,
    collectionName: ACADEMIC_COLLECTIONS.semesters, blockerKind: "semester",
    fields: [
      { key: "name", label: "Semester Name", required: true, placeholder: "e.g. First Semester, SIWES" },
      { key: "description", label: "Description", textarea: true, placeholder: "Optional" },
    ],
  },
};

function AdminAcademicFormModal({ config, initial, parentOptions, onClose, onSave }) {
  const buildInitial = () => {
    const v = {};
    config.fields.forEach((f) => { v[f.key] = initial ? (initial[f.key] ?? "") : ""; });
    if (config.parent) v[config.parent.key] = initial ? (initial[config.parent.key] || "") : "";
    return v;
  };
  const [values, setValues] = useState(buildInitial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const setField = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setErr("");
    for (const f of config.fields) {
      if (f.required && !String(values[f.key] || "").trim()) { setErr(`${f.label} is required.`); return; }
    }
    if (config.parent && !values[config.parent.key]) { setErr(`${config.parent.label} is required.`); return; }
    setSaving(true);
    try {
      const payload = { ...values };
      config.fields.forEach((f) => { if (f.type === "number") payload[f.key] = payload[f.key] === "" ? null : Number(payload[f.key]); });
      await onSave(initial ? initial.id : null, payload);
      onClose();
    } catch (e) { setErr(e.message || "Couldn't save."); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? `Edit ${config.label}` : `Add ${config.label}`}</div>
      {err && <AdminError text={err} />}
      {config.parent && (
        <SelectField label={config.parent.label} value={values[config.parent.key]}
          onChange={(v) => setField(config.parent.key, v)} options={parentOptions} placeholder={`Select ${config.parent.label}…`} />
      )}
      {config.fields.map((f) => (
        <TextField key={f.key} label={f.label} value={String(values[f.key] ?? "")} onChange={(v) => setField(f.key, v)}
          placeholder={f.placeholder} textarea={!!f.textarea} type={f.type === "number" ? "number" : "text"} />
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

/* Bulk import via pasted CSV or JSON — covers the spec's "CSV / JSON" bulk-import
   requirement. Excel (.xlsx) import isn't wired up in this build (no file-picker or
   spreadsheet-parsing library is loaded here yet) — CSV/JSON cover the same need in
   the meantime; flagging this as a deferred item rather than silently skipping it. */
function AdminAcademicImportModal({ config, parentOptions, onClose, onDone }) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState("csv");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setErr(""); setBusy(true);
    try {
      let rows = [];
      if (format === "json") {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");
        rows = parsed;
      } else {
        rows = parseAcademicCSV(text);
      }
      if (rows.length === 0) throw new Error("No rows found.");
      let written = 0, skipped = 0;
      let batch = fbDb.batch(); let batchCount = 0;
      for (const row of rows) {
        const name = (row.name || row.Name || "").toString().trim();
        if (!name) { skipped++; continue; }
        const data = { name };
        config.fields.forEach((f) => {
          if (f.key === "name") return;
          const raw = row[f.key] !== undefined ? row[f.key] : row[f.label];
          if (raw !== undefined && raw !== "") data[f.key] = f.type === "number" ? Number(raw) : String(raw);
        });
        if (config.parent) {
          const parentRaw = row[config.parent.key] || row[config.parent.label] || "";
          const match = parentOptions.find((p) => p.label.toLowerCase() === String(parentRaw).toLowerCase().trim());
          if (!match) { skipped++; continue; } // never create an orphan — skip rows whose parent can't be resolved
          data[config.parent.key] = match.value;
        }
        const ref = fbDb.collection(config.collectionName).doc();
        batch.set(ref, {
          ...data, status: "active", displayOrder: Date.now() + written,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: "bulk-import", updatedBy: "bulk-import",
        });
        written++; batchCount++;
        if (batchCount >= 400) { await batch.commit(); batch = fbDb.batch(); batchCount = 0; }
      }
      if (batchCount > 0) await batch.commit();
      if (written === 0) throw new Error("No valid rows imported — check required columns and that parent names match exactly.");
      onDone(written, skipped);
    } catch (e) { setErr(e.message || "Import failed."); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Bulk Import {config.plural}</div>
      {err && <AdminError text={err} />}
      <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 10, lineHeight: 1.5 }}>
        Columns: <b>name</b>{config.parent ? `, ${config.parent.label}` : ""}{config.fields.filter((f) => f.key !== "name").length ? ", " + config.fields.filter((f) => f.key !== "name").map((f) => f.key).join(", ") : ""}.
        {config.parent ? ` ${config.parent.label} must match an existing ${config.parent.label.toLowerCase()} name exactly, or the row is skipped.` : ""}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setFormat("csv")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${format === "csv" ? C.primary : C.border}`, background: format === "csv" ? C.primary + "14" : "transparent", color: format === "csv" ? C.primary : C.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>CSV</button>
        <button onClick={() => setFormat("json")} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${format === "json" ? C.primary : C.border}`, background: format === "json" ? C.primary + "14" : "transparent", color: format === "json" ? C.primary : C.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>JSON</button>
      </div>
      <TextField label={format === "csv" ? "Paste CSV (with header row)" : "Paste JSON array"} value={text} onChange={setText} textarea
        placeholder={format === "csv" ? "name,code,description\nComputer Engineering,CPE,..." : '[{"name":"Computer Engineering","code":"CPE"}]'} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={run} disabled={busy || !text.trim()} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{busy ? "Importing…" : "Import"}</button>
      </div>
    </Modal>
  );
}

/* Generic list screen shared by all five entities. Reordering uses Up/Down buttons
   that swap displayOrder rather than drag-and-drop — this build has no drag library
   loaded and touch drag-and-drop is unreliable on mobile web without one, so this is
   a deliberate, documented substitute that still satisfies "save display order
   automatically" from the spec. */
function AdminAcademicListScreen({ go, kind, backTo }) {
  const config = ACADEMIC_ENTITY_CONFIGS[kind];
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const universities = useLiveUniversities();
  const schools = useLiveSchools();
  const parentSource = config.parent ? (config.parent.source === "universities" ? universities : schools) : null;
  const parentOptions = (parentSource || []).map((p) => ({ value: p.id, label: p.name }));
  const parentName = (id) => ((parentSource || []).find((p) => p.id === id) || {}).name || "—";

  useEffect(() => {
    let cancelled = false;
    setError(""); setItems(null);
    migrateLegacyAcademicStructureIfNeeded().catch(() => {});
    const unsubscribe = fbDb.collection(config.collectionName).orderBy("displayOrder", "asc").onSnapshot(
      (snap) => { if (!cancelled) setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); },
      (err) => { if (!cancelled) setError(err.message || `Couldn't load ${config.plural.toLowerCase()}.`); }
    );
    return () => { cancelled = true; unsubscribe(); };
  }, [kind]);

  const filtered = (items || []).filter((it) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (it.name || "").toLowerCase().includes(q) || (it.code || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || (it.status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const move = async (item, dir) => {
    const idx = filtered.findIndex((x) => x.id === item.id);
    const swapWith = filtered[idx + dir];
    if (!swapWith) return;
    await config.crud.reorder(item.id, swapWith.displayOrder);
    await config.crud.reorder(swapWith.id, item.displayOrder);
  };
  const toggleStatus = async (item, next) => {
    await config.crud.setStatus(item.id, next);
    flash(`${item.name} ${next === "active" ? "enabled" : next === "disabled" ? "disabled" : "archived"}.`);
  };
  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}? This can't be undone.`)) return;
    const blocker = await academicDeletionBlocker(config.blockerKind, item.id);
    if (blocker) { flash(blocker); return; }
    await config.crud.remove(item.id);
    flash(`${item.name} deleted.`);
  };

  return (
    <div>
      <TopBar title={config.plural} onBack={() => go(backTo || "academicHub")} right={
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowImport(true)} style={{ ...iconBtnStyle, width: "auto", padding: "0 10px", fontSize: 11, fontWeight: 700 }}>Import</button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ Add</button>
        </div>
      } />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} />
        <AdminToast text={toast} />
        <AdminSearchBar value={search} onChange={setSearch} placeholder={`Search ${config.plural.toLowerCase()}…`} />
        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
          {["all", "active", "disabled", "archived"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${statusFilter === s ? C.primary : C.border}`,
              background: statusFilter === s ? C.primary + "14" : "transparent", color: statusFilter === s ? C.primary : C.textSoft,
              fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        {config.parent && parentOptions.length === 0 && (
          <AdminError text={`Add a ${config.parent.label} first — ${config.plural} need one to belong to.`} />
        )}
        {items === null && !error && <EmptyState text="Loading…" />}
        {items && filtered.length === 0 && <EmptyState text={`No ${config.plural.toLowerCase()} found.`} />}
        {filtered.map((it) => (
          <div key={it.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{it.name}</div>
                {it.code && <div style={{ fontSize: 11, color: C.textFaint }}>{it.code}</div>}
                {config.parent && <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 2 }}>{parentName(it[config.parent.key])}</div>}
                {kind === "level" && it.number != null && it.number !== "" && <div style={{ fontSize: 11.5, color: C.textSoft }}>#{it.number}</div>}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px",
                color: (it.status || "active") === "active" ? C.success : (it.status === "archived" ? C.textFaint : C.warn),
                background: (it.status || "active") === "active" ? C.successBg : (it.status === "archived" ? C.border : C.warnBg),
              }}>{((it.status || "active"))[0].toUpperCase() + (it.status || "active").slice(1)}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <AdminActionBtn label="↑" onClick={() => move(it, -1)} kind="default" />
              <AdminActionBtn label="↓" onClick={() => move(it, 1)} kind="default" />
              <AdminActionBtn label="Edit" onClick={() => { setEditing(it); setShowForm(true); }} kind="default" />
              {(it.status || "active") === "active"
                ? <AdminActionBtn label="Disable" onClick={() => toggleStatus(it, "disabled")} kind="warn" />
                : <AdminActionBtn label="Enable" onClick={() => toggleStatus(it, "active")} kind="success" />}
              {it.status !== "archived"
                ? <AdminActionBtn label="Archive" onClick={() => toggleStatus(it, "archived")} kind="default" />
                : <AdminActionBtn label="Restore" onClick={() => toggleStatus(it, "active")} kind="success" />}
              <AdminActionBtn label="Delete" onClick={() => remove(it)} kind="danger" />
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <AdminAcademicFormModal config={config} initial={editing} parentOptions={parentOptions} onClose={() => setShowForm(false)}
          onSave={async (id, data) => {
            const dupe = (items || []).find((x) => x.id !== id
              && (x.name || "").trim().toLowerCase() === (data.name || "").trim().toLowerCase()
              && (!config.parent || x[config.parent.key] === data[config.parent.key]));
            if (dupe) throw new Error(`"${data.name}" already exists${config.parent ? " under this " + config.parent.label.toLowerCase() : ""}.`);
            await config.crud.upsert(id, data);
            flash(editing ? `${config.label} updated.` : `${config.label} added.`);
          }} />
      )}
      {showImport && (
        <AdminAcademicImportModal config={config} parentOptions={parentOptions} onClose={() => setShowImport(false)}
          onDone={(written, skipped) => { setShowImport(false); flash(`${written} imported${skipped ? `, ${skipped} skipped` : ""}.`); }} />
      )}
    </div>
  );
}

function AdminAcademicHubScreen({ go }) {
  const [counts, setCounts] = useState({});
  const fmt = (v) => (v === undefined ? "…" : v);
  useEffect(() => {
    migrateLegacyAcademicStructureIfNeeded().catch(() => {});
    const unsubs = Object.entries(ACADEMIC_COLLECTIONS).map(([key, col]) =>
      fbDb.collection(col).onSnapshot((snap) => setCounts((prev) => ({ ...prev, [key]: snap.size })))
    );
    return () => unsubs.forEach((u) => u());
  }, []);
  return (
    <div>
      <TopBar title="Academic Management" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 14, lineHeight: 1.5 }}>
          The single source of truth for EduSphere's academic structure. Everything here flows down to onboarding, courses, CBT, and every other feature in real time — nothing is hardcoded.
        </div>
        <ListRow title="Universities" subtitle="Top of the hierarchy" onClick={() => go("adminUniversities")} badge={fmt(counts.universities)} />
        <ListRow title="Schools" subtitle="Belong to a university" onClick={() => go("adminSchools")} badge={fmt(counts.schools)} />
        <ListRow title="Departments" subtitle="Belong to a school" onClick={() => go("adminDepartments")} badge={fmt(counts.departments)} />
        <ListRow title="Levels" subtitle="100L, 200L, Postgraduate, custom…" onClick={() => go("adminLevels")} badge={fmt(counts.levels)} />
        <ListRow title="Semesters" subtitle="First, Second, SIWES, custom…" onClick={() => go("adminSemesters")} badge={fmt(counts.semesters)} />
        <ListRow title="Courses" subtitle="Classified by school, department, level & semester" onClick={() => go("adminCourses")} />
      </div>
    </div>
  );
}

/* ---------------- Question Bank Manager ---------------- */
function AdminQuestionFormModal({ initial, courseCode, onClose, onSave }) {
  const [type, setType] = useState(initial ? (initial.type || "mcq") : "mcq");
  const [q, setQ] = useState(initial ? initial.q : "");
  const [options, setOptions] = useState(initial && Array.isArray(initial.o) && initial.o.length >= 2 ? initial.o : ["", "", "", ""]);
  const [a, setA] = useState(initial && typeof initial.a === "number" ? initial.a : 0);
  const [multiCorrect, setMultiCorrect] = useState(initial && Array.isArray(initial.a) ? initial.a : []);
  const [correctAnswer, setCorrectAnswer] = useState(
    initial && (initial.type === "shortAnswer" || initial.type === "fillBlank")
      ? ((initial.acceptableAnswers && initial.acceptableAnswers[0]) || initial.a || "")
      : ""
  );
  const [altAnswersText, setAltAnswersText] = useState(
    initial && Array.isArray(initial.acceptableAnswers) ? initial.acceptableAnswers.slice(1).join("\n") : ""
  );
  const [caseSensitive, setCaseSensitive] = useState(initial ? !!initial.caseSensitive : false);
  const [ignoreSpaces, setIgnoreSpaces] = useState(initial ? initial.ignoreSpaces !== false : true);
  const [week, setWeek] = useState(initial ? initial.week || "" : "");
  const [topic, setTopic] = useState(initial ? initial.topic || "" : "");
  const [difficulty, setDifficulty] = useState(initial ? normalizeDifficulty(initial.difficulty) : "Medium");
  const [e, setE] = useState(initial ? initial.e || "" : "");
  const [ref, setRef] = useState(initial ? initial.ref || "" : "");
  const [points, setPoints] = useState(initial && initial.points ? String(initial.points) : "1");
  const [school, setSchool] = useState(initial ? initial.school || "" : "");
  const [department, setDepartment] = useState(initial ? initial.department || "" : "");
  const [level, setLevel] = useState(initial ? initial.level || "" : "");
  const [semester, setSemester] = useState(initial ? initial.semester || "" : "");
  const [tagsText, setTagsText] = useState(initial && Array.isArray(initial.tags) ? initial.tags.join(", ") : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const needsOptions = type === "mcq" || type === "multiSelect";
  const isTextType = type === "shortAnswer" || type === "fillBlank";

  const save = async () => {
    setErr("");
    if (!q.trim()) { setErr("Question text is required."); return; }
    let payload = {
      courseCode, type, q, e, week, topic, difficulty, ref,
      points: Number(points) || 1, school, department, level, semester, tags: tagsText,
    };
    if (type === "mcq") {
      if (options.some((o) => !o.trim())) { setErr("All 4 options are required."); return; }
      payload = { ...payload, o: options, a };
    } else if (type === "trueFalse") {
      payload = { ...payload, o: ["True", "False"], a };
    } else if (type === "multiSelect") {
      if (options.some((o) => !o.trim())) { setErr("All 4 options are required."); return; }
      if (multiCorrect.length === 0) { setErr("Select at least one correct option."); return; }
      payload = { ...payload, o: options, a: multiCorrect };
    } else if (isTextType) {
      if (!correctAnswer.trim()) { setErr("A correct answer is required."); return; }
      const alts = altAnswersText.split("\n").map((s) => s.trim()).filter(Boolean);
      payload = { ...payload, a: correctAnswer, acceptableAnswers: [correctAnswer, ...alts], caseSensitive, ignoreSpaces };
    }
    // essay: no answer key at all — nothing further to add, it's graded manually.
    setSaving(true);
    try { await onSave(payload); onClose(); }
    catch (err) { setErr(err.message || "Couldn't save question."); }
    finally { setSaving(false); }
  };

  const toggleMultiCorrect = (i) => setMultiCorrect((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Question" : "Add Question"} · {courseCode}</div>
      {err && <AdminError text={err} />}

      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Question Type</div>
      <select value={type} onChange={(e2) => setType(e2.target.value)} style={{
        width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`,
        fontSize: 13, fontWeight: 700, color: C.text, background: C.card, marginBottom: 14,
      }}>
        {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
      </select>

      <TextField label="Question" value={q} onChange={setQ}
        placeholder={type === "fillBlank" ? "e.g. Ich ____ ein Student." : "Question text"} textarea />

      {type === "mcq" && options.map((opt, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <RadioRow checked={a === i} label={`Option ${String.fromCharCode(65 + i)}${a === i ? " (correct)" : ""}`}
            sub={opt || "(empty)"} onSelect={() => setA(i)} />
          <input value={opt} onChange={(e2) => setOptions((prev) => prev.map((o, j) => (j === i ? e2.target.value : o)))}
            placeholder={`Option ${String.fromCharCode(65 + i)} text`}
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, color: C.text, background: C.card, outline: "none", marginTop: 4 }} />
        </div>
      ))}

      {type === "trueFalse" && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Correct Answer</div>
          <RadioRow checked={a === 0} label="True" onSelect={() => setA(0)} />
          <RadioRow checked={a === 1} label="False" onSelect={() => setA(1)} />
        </div>
      )}

      {type === "multiSelect" && (
        <>
          <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 6 }}>Check every option that's correct.</div>
          {options.map((opt, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Checkbox checked={multiCorrect.includes(i)} label={`Option ${String.fromCharCode(65 + i)}${multiCorrect.includes(i) ? " (correct)" : ""}`}
                sub={opt || "(empty)"} onToggle={() => toggleMultiCorrect(i)} />
              <input value={opt} onChange={(e2) => setOptions((prev) => prev.map((o, j) => (j === i ? e2.target.value : o)))}
                placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, color: C.text, background: C.card, outline: "none", marginTop: 4 }} />
            </div>
          ))}
        </>
      )}

      {isTextType && (
        <>
          <TextField label="Correct Answer" value={correctAnswer} onChange={setCorrectAnswer}
            placeholder={type === "fillBlank" ? "e.g. bin" : "e.g. Guten Morgen"} />
          <TextField label="Alternative Correct Answers (one per line)" value={altAnswersText} onChange={setAltAnswersText}
            placeholder={"e.g.\nguten morgen\nGUTEN MORGEN"} textarea />
          <Checkbox checked={caseSensitive} label="Case Sensitive" sub={'Off by default — "Guten Morgen" and "guten morgen" both match'} onToggle={() => setCaseSensitive((v) => !v)} />
          <Checkbox checked={ignoreSpaces} label="Ignore Extra Spaces" sub="Trims and collapses whitespace before comparing" onToggle={() => setIgnoreSpaces((v) => !v)} />
        </>
      )}

      {type === "essay" && (
        <div style={{ fontSize: 12, color: C.textSoft, background: C.warnBg, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          📝 Essay questions have no auto-graded answer key. Students submit free text, and an Admin grades each response manually from Exam History after submission. Use "Explanation" below for a model answer or rubric.
        </div>
      )}

      <TextField label={type === "essay" ? "Model Answer / Rubric (optional)" : "Explanation (optional)"} value={e} onChange={setE} placeholder="Why the answer is correct" textarea />
      <TextField label="Week (optional)" value={week} onChange={setWeek} placeholder="e.g. Week 3" />
      <TextField label="Topic (optional)" value={topic} onChange={setTopic} placeholder="e.g. Control Structures" />
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Difficulty</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["Easy", "Medium", "Hard"].map((d) => (
          <button key={d} onClick={() => setDifficulty(d)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${difficulty === d ? C.primary : C.border}`,
            background: difficulty === d ? C.primary : C.card, color: difficulty === d ? "#fff" : C.text,
          }}>{d}</button>
        ))}
      </div>
      <TextField label="Points" value={points} onChange={setPoints} type="number" placeholder="1" />

      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: "6px 0" }}>Classification (optional)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <TextField label="School" value={school} onChange={setSchool} placeholder="e.g. FUTA" />
        <TextField label="Department" value={department} onChange={setDepartment} placeholder="e.g. Computer Science" />
        <TextField label="Level" value={level} onChange={setLevel} placeholder="e.g. 100L" />
        <TextField label="Semester" value={semester} onChange={setSemester} placeholder="e.g. First" />
      </div>
      <TextField label="Tags (comma-separated)" value={tagsText} onChange={setTagsText} placeholder="e.g. grammar, verbs, A1" />
      <TextField label="Reference (optional)" value={ref} onChange={setRef} placeholder="Source / page reference" />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

/* Validates one Bulk Import row against whatever type it's inferred to be
   (explicit `type` field, or auto-detected from its shape — see
   inferQuestionType). Legacy rows shaped like the original MCQ-only importer
   ({ q, o, a, e, week, topic }) satisfy the "mcq" branch untouched, so old
   JSON exports keep importing exactly as before. */
function validateImportItem(item, idx) {
  const label = `Item ${idx + 1}`;
  const type = inferQuestionType(item);
  const qText = item.question || item.q;
  if (!qText || !String(qText).trim()) return `${label}: missing question text ("q" or "question").`;
  if (type === "mcq") {
    const opts = item.options || item.o;
    if (!Array.isArray(opts) || opts.length < 2) return `${label} (Multiple Choice): needs an "o"/"options" array of at least 2 choices.`;
    const ans = item.answer !== undefined ? item.answer : item.a;
    if (typeof ans !== "number" || ans < 0 || ans >= opts.length) return `${label} (Multiple Choice): "a"/"answer" must be a valid option index.`;
  } else if (type === "multiSelect") {
    const opts = item.options || item.o;
    if (!Array.isArray(opts) || opts.length < 2) return `${label} (Multiple Select): needs an "o"/"options" array of at least 2 choices.`;
    const ans = item.answer !== undefined ? item.answer : item.a;
    if (!Array.isArray(ans) || ans.length === 0) return `${label} (Multiple Select): "a"/"answer" must be a non-empty array of correct option indices.`;
  } else if (type === "shortAnswer" || type === "fillBlank") {
    const hasAcceptable = Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length > 0;
    const ansVal = item.answer !== undefined ? item.answer : item.a;
    const hasAnswer = ansVal !== undefined && ansVal !== null && String(ansVal).trim() !== "";
    if (!hasAcceptable && !hasAnswer) return `${label} (${QUESTION_TYPE_LABELS[type]}): needs "a"/"answer" or an "acceptableAnswers" array.`;
  }
  // trueFalse: options default to True/False if omitted. essay: no answer key needed at all.
  return null;
}

function AdminBulkImportModal({ courseCode, onClose, onImported }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async () => {
    setErr("");
    let list;
    try { list = JSON.parse(raw); if (!Array.isArray(list)) throw new Error("JSON must be an array of questions."); }
    catch (e) { setErr("Invalid JSON: " + e.message); return; }
    for (let i = 0; i < list.length; i++) {
      const problem = validateImportItem(list[i], i);
      if (problem) { setErr(problem); return; }
    }
    setBusy(true);
    try { const n = await bulkImportQuestions(courseCode, list); onImported(n); onClose(); }
    catch (e) { setErr(e.message || "Import failed."); }
    finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>Bulk Import · {courseCode}</div>
      <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 10, lineHeight: 1.5 }}>
        Paste a JSON array — every question type is supported and auto-detected from an explicit <code>"type"</code> field, or from shape if omitted (so older MCQ-only exports keep working unchanged):
        <br /><code>{`{"type":"mcq","q":"...","o":["A","B","C","D"],"a":0}`}</code>
        <br /><code>{`{"type":"trueFalse","q":"...","a":0}`}</code> (0=True, 1=False)
        <br /><code>{`{"type":"shortAnswer","q":"Translate 'Good Morning'","acceptableAnswers":["Guten Morgen","guten morgen"]}`}</code>
        <br /><code>{`{"type":"fillBlank","q":"Ich ____ ein Student.","a":"bin"}`}</code>
        <br /><code>{`{"type":"multiSelect","q":"...","o":["A","B","C","D"],"a":[0,2]}`}</code>
        <br /><code>{`{"type":"essay","q":"Discuss...","points":10}`}</code>
        <br />All types also accept <code>week</code>, <code>topic</code>, <code>difficulty</code>, <code>e</code>/<code>explanation</code>, <code>points</code>. Imported questions appear instantly in Practice Mode, Mock Exams, and the CBT Engine — no redeploy needed.
      </div>
      {err && <AdminError text={err} />}
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} placeholder="Paste JSON array here…"
        style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: C.text, background: C.card, outline: "none", fontFamily: "monospace", marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={run} disabled={busy} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{busy ? "Importing…" : "Import"}</button>
      </div>
    </Modal>
  );
}

function AdminQuestionBankScreen({ go }) {
  const courses = useLiveCourses();
  const [courseCode, setCourseCode] = useState(COURSES[0].code);
  const [items, setItems] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };
  useEffect(() => {
    if (courses.length && !courses.some((c) => c.code === courseCode)) setCourseCode(courses[0].code);
  }, [courses, courseCode]);

  const load = async () => {
    setError(""); setItems(null);
    try {
      const { docs, items: list } = await fetchQuestions({ courseCode, pageSize: 25 });
      setItems(list.map(normalizeQuestionDoc)); setLastDoc(docs[docs.length - 1] || null); setHasMore(docs.length === 25);
    } catch (err) { setError(err.message || "Couldn't load questions."); }
  };
  useEffect(() => { load(); }, [courseCode]);

  const loadMore = async () => {
    if (!lastDoc) return;
    const { docs, items: more } = await fetchQuestions({ courseCode, afterDoc: lastDoc, pageSize: 25 });
    setItems((prev) => [...(prev || []), ...more.map(normalizeQuestionDoc)]); setLastDoc(docs[docs.length - 1] || null); setHasMore(docs.length === 25);
  };

  const filtered = (items || []).filter((q) => !search.trim() || (q.q || "").toLowerCase().includes(search.toLowerCase()) || (q.topic || "").toLowerCase().includes(search.toLowerCase()));

  const remove = async (id) => {
    if (!confirm("Delete this question permanently?")) return;
    await deleteQuestion(id); flash("Question deleted."); load();
  };

  return (
    <div>
      <TopBar title="Question Bank" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        <CourseChipRow courses={courses} value={courseCode} onChange={setCourseCode} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>+ Add Question</button>
          <button onClick={() => setShowImport(true)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Bulk Import</button>
        </div>
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search questions…" />
        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 10 }}>{items === null ? "Loading…" : `${filtered.length} question${filtered.length === 1 ? "" : "s"} loaded for ${courseCode}`}</div>
        {items && filtered.length === 0 && <EmptyState text="No questions yet for this course." />}
        {filtered.map((q) => (
          <div key={q.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.primary, background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.3,
              }}>{QUESTION_TYPE_LABELS[q.type] || "Multiple Choice"}</span>
              {q.points !== 1 && <span style={{ fontSize: 10, fontWeight: 700, color: C.textSoft }}>{q.points} pts</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>{q.q}</div>
            <QuestionAnswerKeyBlock q={q} />
            <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 8 }}>{[q.week, q.topic, q.difficulty].filter(Boolean).join(" · ")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <AdminActionBtn label="Edit" onClick={() => { setEditing(q); setShowForm(true); }} kind="default" />
              <AdminActionBtn label="Delete" onClick={() => remove(q.id)} kind="danger" />
            </div>
          </div>
        ))}
        {items && filtered.length > 0 && hasMore && !search.trim() && (
          <button onClick={loadMore} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Load More</button>
        )}
      </div>
      {showForm && (
        <AdminQuestionFormModal initial={editing} courseCode={courseCode} onClose={() => setShowForm(false)}
          onSave={async (data) => {
            if (editing) await updateQuestion(editing.id, data); else await addQuestion(data);
            flash(editing ? "Question updated." : "Question added."); load();
          }} />
      )}
      {showImport && <AdminBulkImportModal courseCode={courseCode} onClose={() => setShowImport(false)} onImported={(n) => { flash(`Imported ${n} questions.`); load(); }} />}
    </div>
  );
}

/* ---------------- Notes Manager ---------------- */
function AdminNoteFormModal({ initial, courseCode, onClose, onSave }) {
  const [week, setWeek] = useState(initial ? initial.week || "" : "");
  const [title, setTitle] = useState(initial ? initial.title || "" : "");
  const [pointsText, setPointsText] = useState(initial ? (initial.points || []).join("\n") : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true); setErr("");
    try {
      const points = pointsText.split("\n").map((p) => p.trim()).filter(Boolean);
      await onSave({ courseCode, week, title, points }); onClose();
    } catch (e) { setErr(e.message || "Couldn't save note."); }
    finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Note" : "Add Note"} · {courseCode}</div>
      {err && <AdminError text={err} />}
      <TextField label="Week" value={week} onChange={setWeek} placeholder="e.g. Week 1" />
      <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. Foundations of Problem Solving" />
      <TextField label="Points (one per line)" value={pointsText} onChange={setPointsText} placeholder={"Point 1\nPoint 2\nPoint 3"} textarea />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

function AdminNotesScreen({ go }) {
  const courses = useLiveCourses();
  const [courseCode, setCourseCode] = useState(COURSES[0].code);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (courses.length && !courses.some((c) => c.code === courseCode)) setCourseCode(courses[0].code);
  }, [courses, courseCode]);

  // Real-time: any add/edit/delete here — from this device or any other admin session —
  // shows up instantly, and the same listener is what feeds the live NotesScreen students see.
  useEffect(() => {
    setError(""); setItems(null);
    if (!fbDb || !courseCode) return undefined;
    const unsubscribe = fbDb.collection("notes").where("courseCode", "==", courseCode).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.week || "").localeCompare(b.week || "", undefined, { numeric: true }));
        setItems(list);
      },
      (err) => setError(err.message || "Couldn't load notes.")
    );
    return () => unsubscribe();
  }, [courseCode]);

  const remove = async (id) => { if (!confirm("Delete this note?")) return; await deleteNote(id); flash("Note deleted."); };

  return (
    <div>
      <TopBar title="Notes Manager" onBack={() => go("adminDashboard")} right={
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ Add</button>
      } />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} />
        <AdminToast text={toast} />
        <CourseChipRow courses={courses} value={courseCode} onChange={setCourseCode} />
        {items === null && !error && <EmptyState text="Loading…" />}
        {items && items.length === 0 && <EmptyState text="No notes yet for this course." />}
        {items && items.map((n) => (
          <div key={n.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 2 }}>{n.week}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{n.title}</div>
            <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 10 }}>
              {(n.points || []).slice(0, 3).map((p, i) => <li key={i} style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 3 }}>{p}</li>)}
              {(n.points || []).length > 3 && <li style={{ fontSize: 11, color: C.textFaint }}>+{n.points.length - 3} more…</li>}
            </ul>
            <div style={{ display: "flex", gap: 8 }}>
              <AdminActionBtn label="Edit" onClick={() => { setEditing(n); setShowForm(true); }} kind="default" />
              <AdminActionBtn label="Delete" onClick={() => remove(n.id)} kind="danger" />
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <AdminNoteFormModal initial={editing} courseCode={courseCode} onClose={() => setShowForm(false)}
          onSave={async (data) => { if (editing) await updateNote(editing.id, data); else await addNote(data); flash(editing ? "Note updated." : "Note added."); }} />
      )}
    </div>
  );
}

/* ---------------- Flashcards Manager ---------------- */
function AdminFlashcardFormModal({ initial, courseCode, onClose, onSave }) {
  const [front, setFront] = useState(initial ? initial.front || "" : "");
  const [back, setBack] = useState(initial ? initial.back || "" : "");
  const [topic, setTopic] = useState(initial ? initial.topic || "" : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!front.trim() || !back.trim()) { setErr("Front and back are both required."); return; }
    setSaving(true); setErr("");
    try { await onSave({ courseCode, front, back, topic }); onClose(); }
    catch (e) { setErr(e.message || "Couldn't save flashcard."); }
    finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Flashcard" : "Add Flashcard"} · {courseCode}</div>
      {err && <AdminError text={err} />}
      <TextField label="Front" value={front} onChange={setFront} placeholder="Question / term" textarea />
      <TextField label="Back" value={back} onChange={setBack} placeholder="Answer / definition" textarea />
      <TextField label="Topic (optional)" value={topic} onChange={setTopic} placeholder="e.g. Iteration" />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

function AdminFlashcardsScreen({ go }) {
  const courses = useLiveCourses();
  const [courseCode, setCourseCode] = useState(COURSES[0].code);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (courses.length && !courses.some((c) => c.code === courseCode)) setCourseCode(courses[0].code);
  }, [courses, courseCode]);

  useEffect(() => {
    setError(""); setItems(null);
    if (!fbDb || !courseCode) return undefined;
    const unsubscribe = fbDb.collection("flashcards").where("courseCode", "==", courseCode).onSnapshot(
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message || "Couldn't load flashcards.")
    );
    return () => unsubscribe();
  }, [courseCode]);

  const remove = async (id) => { if (!confirm("Delete this flashcard?")) return; await deleteFlashcard(id); flash("Flashcard deleted."); };

  return (
    <div>
      <TopBar title="Flashcards Manager" onBack={() => go("adminDashboard")} right={
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ Add</button>
      } />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} />
        <AdminToast text={toast} />
        <CourseChipRow courses={courses} value={courseCode} onChange={setCourseCode} />
        {items === null && !error && <EmptyState text="Loading…" />}
        {items && items.length === 0 && <EmptyState text="No flashcards yet for this course." />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {items && items.map((f) => (
            <div key={f.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>{f.front}</div>
              <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8 }}>{f.back}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <AdminActionBtn label="Edit" onClick={() => { setEditing(f); setShowForm(true); }} kind="default" />
                <AdminActionBtn label="Delete" onClick={() => remove(f.id)} kind="danger" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {showForm && (
        <AdminFlashcardFormModal initial={editing} courseCode={courseCode} onClose={() => setShowForm(false)}
          onSave={async (data) => { if (editing) await updateFlashcard(editing.id, data); else await addFlashcard(data); flash(editing ? "Flashcard updated." : "Flashcard added."); }} />
      )}
    </div>
  );
}

/* ---------------- Leaderboard Manager ---------------- */
function AdminLeaderboardScreen({ go }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setRows(null);
    try { setRows(await computeLeaderboard(100)); }
    catch (err) { setError(err.message || "Couldn't load leaderboard."); }
  };
  useEffect(() => { load(); }, []);

  const filtered = (rows || []).filter((r) => !search.trim() || (r.user.fullName || "").toLowerCase().includes(search.toLowerCase()) || (r.user.email || "").toLowerCase().includes(search.toLowerCase()));

  const toggleHide = async (r) => { await setLeaderboardHidden(r.uid, !r.hidden); flash(r.hidden ? "Student unhidden." : "Student hidden from leaderboard."); load(); };
  const resetAttempts = async (r) => {
    if (!confirm(`Clear ALL exam history for ${r.user.fullName || r.user.email}? This can't be undone.`)) return;
    const n = await clearUserAttempts(r.uid); flash(`Cleared ${n} attempt${n === 1 ? "" : "s"}.`); load();
  };

  return (
    <div>
      <TopBar title="Leaderboard" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 12, lineHeight: 1.5 }}>
          Ranked by best mock-exam score. Hiding a student removes them from any future public leaderboard without deleting their data.
        </div>
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search students…" />
        {rows === null && !error && <EmptyState text="Loading…" />}
        {rows && filtered.length === 0 && <EmptyState text="No ranked attempts yet." />}
        {filtered.map((r, i) => (
          <div key={r.uid} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10, opacity: r.hidden ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.primary }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.user.fullName || "(no name)"}{r.hidden && <span style={{ fontSize: 10, color: C.textFaint }}> · hidden</span>}</div>
                  <div style={{ fontSize: 11, color: C.textSoft }}>{r.user.email}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{r.best}%</div>
                <div style={{ fontSize: 9.5, color: C.textFaint }}>best</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>Avg {r.avg}% · {r.attempts} attempt{r.attempts === 1 ? "" : "s"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <AdminActionBtn label={r.hidden ? "Unhide" : "Hide"} onClick={() => toggleHide(r)} kind="default" />
              <AdminActionBtn label="Reset Attempts" onClick={() => resetAttempts(r)} kind="danger" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Exam Results / Exam History / Practice History ---------------- */
function AdminAttemptRow({ a, userLabel, onDelete }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{a.course || "Course"} · {a.mode === "mock" ? "Mock Exam" : "Practice"}</div>
          <div style={{ fontSize: 11, color: C.textSoft }}>{userLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: (a.pct || 0) >= 50 ? C.success : C.danger }}>{a.pct}%</div>
          <div style={{ fontSize: 9.5, color: C.textFaint }}>{a.score}/{a.total}</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: C.textFaint, marginBottom: 10 }}>{fmtDate(a.clientDate || a.date)} · {a.correct} correct · {a.wrong} wrong · {a.skipped} skipped</div>
      <AdminActionBtn label="Delete" onClick={onDelete} kind="danger" />
    </div>
  );
}

function useAttemptsAdmin(mode) {
  const [items, setItems] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [usersMap, setUsersMap] = useState({});

  const load = async () => {
    setError(""); setItems(null);
    try {
      const [{ docs, items: list }, umap] = await Promise.all([fetchAttemptsAdmin({ mode, pageSize: 25 }), fetchUsersMap()]);
      setItems(list); setLastDoc(docs[docs.length - 1] || null); setHasMore(docs.length === 25); setUsersMap(umap);
    } catch (err) { setError(err.message || "Couldn't load attempts."); }
  };
  const loadMore = async () => {
    if (!lastDoc) return;
    const { docs, items: more } = await fetchAttemptsAdmin({ mode, afterDoc: lastDoc, pageSize: 25 });
    setItems((prev) => [...(prev || []), ...more]); setLastDoc(docs[docs.length - 1] || null); setHasMore(docs.length === 25);
  };
  const remove = async (a) => {
    if (!confirm("Delete this attempt permanently?")) return;
    await deleteAttemptAdmin(a.uid, a.id); setItems((prev) => prev.filter((x) => x.id !== a.id));
  };
  useEffect(() => { load(); }, [mode]);
  return { items, error, hasMore, usersMap, load, loadMore, remove };
}

function AdminAttemptsScreen({ go, mode, title, subtitle }) {
  const { items, error, hasMore, usersMap, load, loadMore, remove } = useAttemptsAdmin(mode);
  const [search, setSearch] = useState("");

  const filtered = (items || []).filter((a) => {
    if (!search.trim()) return true;
    const u = usersMap[a.uid] || {};
    return (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.course || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <TopBar title={title} onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        {subtitle && <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 12, lineHeight: 1.5 }}>{subtitle}</div>}
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search by student or course…" />
        {items === null && !error && <EmptyState text="Loading…" />}
        {items && filtered.length === 0 && <EmptyState text="No attempts found." />}
        {filtered.map((a) => {
          const u = usersMap[a.uid];
          const label = u ? `${u.fullName || "(no name)"} · ${u.email || ""}` : "Unknown student";
          return <AdminAttemptRow key={a.id} a={a} userLabel={label} onDelete={() => remove(a)} />;
        })}
        {items && filtered.length > 0 && !search.trim() && hasMore && (
          <button onClick={loadMore} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, color: C.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Load More</button>
        )}
      </div>
    </div>
  );
}

function AdminExamResultsScreen({ go }) {
  return <AdminAttemptsScreen go={go} mode="mock" title="Exam Results" subtitle="Every completed mock exam across all students, most recent first." />;
}
function AdminExamHistoryScreen({ go }) {
  return <AdminAttemptsScreen go={go} mode={null} title="Exam History" subtitle="Full chronological log of every attempt — mock exams and practice — across all students." />;
}
function AdminPracticeHistoryScreen({ go }) {
  return <AdminAttemptsScreen go={go} mode="practice" title="Practice History" subtitle="Untimed practice sessions across all students, most recent first." />;
}

/* ---------------- Essay Grading ---------------- */
function EssayGradeRow({ item, onGrade }) {
  const [points, setPoints] = useState(String(item.points || 1));
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await onGrade(Number(points)); } finally { setSaving(false); } };
  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>{item.q}</div>
      <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap", background: C.card, borderRadius: 8, padding: 10, marginBottom: 8, lineHeight: 1.5 }}>
        {item.userAnswer && String(item.userAnswer).trim() ? String(item.userAnswer) : "(no answer submitted)"}
      </div>
      {item.e && <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 8 }}>📖 Model answer / rubric: {item.e}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="number" min={0} max={item.points || 1} value={points} onChange={(e) => setPoints(e.target.value)}
          style={{ width: 70, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: C.text, background: C.card, outline: "none" }} />
        <span style={{ fontSize: 12, color: C.textSoft }}>/ {item.points || 1} pts</span>
        <button onClick={save} disabled={saving} style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{saving ? "Saving…" : "Save Grade"}</button>
      </div>
    </div>
  );
}

function AdminGradeEssaysScreen({ go }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [usersMap, setUsersMap] = useState({});
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setItems(null);
    try {
      const [{ items: list }, umap] = await Promise.all([fetchUngradedEssayAttempts({ pageSize: 25 }), fetchUsersMap()]);
      setItems(list); setUsersMap(umap);
    } catch (err) { setError(err.message || "Couldn't load essay submissions."); }
  };
  useEffect(() => { load(); }, []);

  const gradeOne = async (attempt, reviewIndex, points) => {
    try { await gradeEssayAnswer(attempt.uid, attempt.id, reviewIndex, points); flash("Grade saved."); load(); }
    catch (err) { setError(err.message || "Couldn't save grade."); }
  };

  return (
    <div>
      <TopBar title="Grade Essays" onBack={() => go("adminAnalytics")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        <div style={{ fontSize: 11.5, color: C.textSoft, marginBottom: 12, lineHeight: 1.5 }}>
          Essay questions aren't auto-scored — grade each response below, then Save. The student's score updates immediately.
        </div>
        {items === null && !error && <EmptyState text="Loading…" />}
        {items && items.length === 0 && <EmptyState text="No essays waiting for grading. 🎉" />}
        {items && items.map((attempt) => {
          const u = usersMap[attempt.uid];
          const label = u ? `${u.fullName || "(no name)"} · ${u.email || ""}` : "Unknown student";
          const essayItems = (attempt.review || [])
            .map((r, i) => ({ ...r, reviewIndex: i }))
            .filter((r) => r.type === "essay" && !r.graded);
          if (essayItems.length === 0) return null;
          return (
            <div key={attempt.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 2 }}>{attempt.course} · {attempt.mode === "mock" ? "Mock Exam" : "Practice"}</div>
              <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10 }}>{label} · {fmtDate(attempt.clientDate || attempt.date)}</div>
              {essayItems.map((item) => (
                <EssayGradeRow key={item.reviewIndex} item={item} onGrade={(pts) => gradeOne(attempt, item.reviewIndex, pts)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Announcements Manager ---------------- */
const HOMEPAGE_ITEM_TYPES = [
  { value: "announcement", label: "Announcement" }, { value: "news", label: "News" },
  { value: "event", label: "Events" }, { value: "course", label: "Available Courses" },
  { value: "exam", label: "Examination Updates" }, { value: "registration", label: "Registration Notices" },
  { value: "cbt", label: "CBT Updates" }, { value: "holiday", label: "Holiday Notices" },
  { value: "emergency", label: "Emergency Messages" }, { value: "promo", label: "Promotional Messages" },
];
const HOMEPAGE_BANNER_TYPES = [
  { value: "scrolling", label: "Scrolling Text" }, { value: "sliding", label: "Sliding Cards" },
  { value: "fade", label: "Fade Animation" }, { value: "marquee", label: "Marquee" },
  { value: "carousel", label: "Carousel" }, { value: "breaking", label: "Breaking News" },
  { value: "popup", label: "Popup Banner" },
];
const HOMEPAGE_PRIORITIES = [
  { value: "urgent", label: "Urgent" }, { value: "high", label: "High" },
  { value: "normal", label: "Normal" }, { value: "low", label: "Low" },
];
const HOMEPAGE_AUDIENCES = [
  { value: "everyone", label: "Everyone" }, { value: "school", label: "School" },
  { value: "department", label: "Department" }, { value: "level", label: "Level" },
  { value: "semester", label: "Semester" }, { value: "course", label: "Registered Course" },
  { value: "students", label: "Selected Students" },
];
const HOMEPAGE_SCROLL_SPEEDS = ["slow", "normal", "fast"];
const HOMEPAGE_FONT_SIZES = ["small", "normal", "large"];
const HOMEPAGE_FREQUENCIES = [
  { value: "always", label: "Every visit" }, { value: "once", label: "Once per user" },
  { value: "daily", label: "Once per day" },
];

/* Small labeled section wrapper so the (now much longer) form reads as clear steps
   instead of one long wall of fields — each section scrolls with the modal body
   (Phase 1's flScrollY Modal), so nothing gets clipped or freezes on long forms. */
function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
function PillPicker({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const active = value === val;
        return (
          <button key={val} onClick={() => onChange(val)} style={{
            padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${active ? C.primary : C.border}`,
            background: active ? C.primary : C.card, color: active ? "#fff" : C.textSoft,
            fontSize: 11.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

function AdminAnnouncementFormModal({ initial, onClose, onSave }) {
  const { schools, departments, levels, semesters } = useAcademicStructure();
  const liveCourses = useLiveCourses();
  const i = initial || {};
  const [title, setTitle] = useState(i.title || "");
  const [body, setBody] = useState(i.body || "");
  const [itemType, setItemType] = useState(i.itemType || "announcement");
  const [bannerType, setBannerType] = useState(i.bannerType || "carousel");
  const [priority, setPriority] = useState(i.priority === "important" ? "high" : (i.priority || "normal"));
  const [published, setPublished] = useState(i.published !== undefined ? !!i.published : true);
  const [pinned, setPinned] = useState(!!i.pinned);
  // Scheduling
  const toDateInput = (v) => { const d = toJsDate(v); return d ? d.toISOString().slice(0, 10) : ""; };
  const [startDate, setStartDate] = useState(toDateInput(i.startDate));
  const [endDate, setEndDate] = useState(toDateInput(i.endDate));
  const [startTime, setStartTime] = useState(i.startTime || "");
  const [expiryTime, setExpiryTime] = useState(i.expiryTime || "");
  // Target audience
  const [audience, setAudience] = useState(i.audience || "everyone");
  const [audienceValue, setAudienceValue] = useState(i.audienceValue || "");
  const [studentEmails, setStudentEmails] = useState(i.audienceStudentEmails || "");
  // Appearance
  const [textColor, setTextColor] = useState(i.textColor || "");
  const [bgColor, setBgColor] = useState(i.bgColor || "");
  const [icon, setIcon] = useState(i.icon || "");
  const [animationStyle, setAnimationStyle] = useState(i.animationStyle || "fade");
  const [scrollSpeed, setScrollSpeed] = useState(i.scrollSpeed || "normal");
  const [fontSize, setFontSize] = useState(i.fontSize || "normal");
  const [displayDuration, setDisplayDuration] = useState(String(i.displayDuration || 6));
  const [displayFrequency, setDisplayFrequency] = useState(i.displayFrequency || "always");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const audienceOptionsForMode = () => {
    if (audience === "school") return schools.map((s) => ({ value: s.name, label: s.name }));
    if (audience === "department") return departments.map((d) => ({ value: d.name, label: d.name }));
    if (audience === "level") return levels.map((l) => ({ value: l.name, label: l.name }));
    if (audience === "semester") return semesters.map((s) => ({ value: s.name, label: s.name }));
    if (audience === "course") return liveCourses.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
    return [];
  };

  const save = async () => {
    if (!title.trim() || !body.trim()) { setErr("Title and message are required."); return; }
    setSaving(true); setErr("");
    try {
      // "Selected Students" resolves emails -> uids at save time so the runtime filter
      // (announcementMatchesAudience) only ever compares plain ids.
      let audienceStudentIds = [];
      if (audience === "students" && studentEmails.trim()) {
        const emails = studentEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
        const results = await Promise.all(emails.map((em) => fbDb.collection("users").where("email", "==", em).limit(1).get().catch(() => null)));
        audienceStudentIds = results.filter((r) => r && !r.empty).map((r) => r.docs[0].id);
      }
      await onSave({
        title, body, itemType, bannerType, priority, published, pinned,
        startDate: startDate || null, endDate: endDate || null, startTime, expiryTime,
        audience, audienceValue: audience === "students" ? "" : audienceValue,
        audienceStudentIds, audienceStudentEmails: studentEmails,
        textColor, bgColor, icon, animationStyle, scrollSpeed, fontSize,
        displayDuration: Number(displayDuration) || 6, displayFrequency,
      });
      onClose();
    }
    catch (e) { setErr(e.message || "Couldn't save this item."); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Homepage Item" : "New Homepage Item"}</div>
      {err && <AdminError text={err} />}

      <FormSection title="Content">
        <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. CBT server maintenance" />
        <TextField label="Message" value={body} onChange={setBody} placeholder="Details shown to students" textarea />
      </FormSection>

      <FormSection title="Type">
        <PillPicker options={HOMEPAGE_ITEM_TYPES} value={itemType} onChange={setItemType} />
      </FormSection>

      <FormSection title="Banner Type">
        <PillPicker options={HOMEPAGE_BANNER_TYPES} value={bannerType} onChange={setBannerType} />
      </FormSection>

      <FormSection title="Priority">
        <PillPicker options={HOMEPAGE_PRIORITIES} value={priority} onChange={setPriority} />
      </FormSection>

      <FormSection title="Scheduling">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <TextField label="Start Date" value={startDate} onChange={setStartDate} type="date" />
          <TextField label="Start Time" value={startTime} onChange={setStartTime} type="time" />
          <TextField label="End Date" value={endDate} onChange={setEndDate} type="date" />
          <TextField label="Expiry Time" value={expiryTime} onChange={setExpiryTime} type="time" />
        </div>
        <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: -4, marginBottom: 4 }}>Leave blank for no start/end limit. Expired items disappear automatically.</div>
      </FormSection>

      <FormSection title="Target Audience">
        <PillPicker options={HOMEPAGE_AUDIENCES} value={audience} onChange={(v) => { setAudience(v); setAudienceValue(""); }} />
        {["school", "department", "level", "semester", "course"].includes(audience) && (
          <SelectField label={`Choose ${audience}`} value={audienceValue} onChange={setAudienceValue}
            options={audienceOptionsForMode()} placeholder={`Select ${audience}…`} />
        )}
        {audience === "students" && (
          <TextField label="Student emails (comma-separated)" value={studentEmails} onChange={setStudentEmails}
            placeholder="jane@example.com, john@example.com" textarea />
        )}
      </FormSection>

      <FormSection title="Appearance">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <TextField label="Text Color" value={textColor} onChange={setTextColor} placeholder="#FFFFFF (optional)" />
          <TextField label="Background Color" value={bgColor} onChange={setBgColor} placeholder="#2563EB (optional)" />
        </div>
        <TextField label="Icon (emoji)" value={icon} onChange={setIcon} placeholder="e.g. 📢 🔴 🎓 (optional)" />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>Animation Style</div>
        <PillPicker options={HOMEPAGE_ANIMATIONS} value={animationStyle} onChange={setAnimationStyle} />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>Scroll Speed</div>
        <PillPicker options={HOMEPAGE_SCROLL_SPEEDS} value={scrollSpeed} onChange={setScrollSpeed} />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>Font Size</div>
        <PillPicker options={HOMEPAGE_FONT_SIZES} value={fontSize} onChange={setFontSize} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <TextField label="Display Duration (seconds)" value={displayDuration} onChange={setDisplayDuration} type="number" />
          <SelectField label="Display Frequency" value={displayFrequency} onChange={setDisplayFrequency} options={HOMEPAGE_FREQUENCIES} />
        </div>
      </FormSection>

      <Checkbox checked={published} label="Published" sub="Visible to students" onToggle={() => setPublished((v) => !v)} />
      <Checkbox checked={pinned} label="Pin to top" sub="Shown above other items" onToggle={() => setPinned((v) => !v)} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

function AdminShowcaseFormModal({ initial, onClose, onSave }) {
  const liveCourses = useLiveCourses();
  const i = initial || {};
  const [courseCode, setCourseCode] = useState(i.courseCode || "");
  const [title, setTitle] = useState(i.title || "");
  const [featured, setFeatured] = useState(!!i.featured);
  const [isNew, setIsNew] = useState(!!i.isNew);
  const [isUpdated, setIsUpdated] = useState(!!i.isUpdated);
  const [hidden, setHidden] = useState(!!i.hidden);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!courseCode) { setErr("Choose a course."); return; }
    setSaving(true); setErr("");
    try {
      const course = liveCourses.find((c) => c.code === courseCode);
      await onSave({ courseCode, title: title || (course ? course.name : ""), featured, isNew, isUpdated, hidden });
      onClose();
    } catch (e) { setErr(e.message || "Couldn't save this course card."); }
    finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>{initial ? "Edit Course Card" : "Add Course to Showcase"}</div>
      {err && <AdminError text={err} />}
      <SelectField label="Course" value={courseCode} onChange={setCourseCode}
        options={liveCourses.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} placeholder="Select course…" />
      <TextField label="Display Title (optional)" value={title} onChange={setTitle} placeholder="Defaults to the course name" />
      <Checkbox checked={featured} label="Featured" sub="Highlighted at the front of the showcase" onToggle={() => setFeatured((v) => !v)} />
      <Checkbox checked={isNew} label="Mark as New" onToggle={() => setIsNew((v) => !v)} />
      <Checkbox checked={isUpdated} label="Mark as Updated" onToggle={() => setIsUpdated((v) => !v)} />
      <Checkbox checked={hidden} label="Hide from homepage" sub="Card stays saved but won't display" onToggle={() => setHidden((v) => !v)} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: C.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

function AdminCourseShowcaseTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setItems(null);
    try { setItems(await fetchCourseShowcase()); }
    catch (err) { setError(err.message || "Couldn't load course showcase."); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { if (!confirm("Remove this course from the showcase?")) return; await deleteShowcaseCourse(id); flash("Removed."); load(); };
  const move = async (index, dir) => { await moveShowcaseCourse(items, index, dir); load(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ Add Course</button>
      </div>
      <AdminError text={error} onRetry={load} />
      <AdminToast text={toast} />
      {items === null && !error && <EmptyState text="Loading…" />}
      {items && items.length === 0 && <EmptyState text="No courses in the showcase yet." />}
      {items && items.map((c, idx) => (
        <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {c.featured && <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: C.bg, borderRadius: 20, padding: "3px 10px" }}>⭐ Featured</span>}
            {c.isNew && <span style={{ fontSize: 10, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 20, padding: "3px 10px" }}>New</span>}
            {c.isUpdated && <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, background: C.warnBg, borderRadius: 20, padding: "3px 10px" }}>Updated</span>}
            {c.hidden && <span style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, background: C.border, borderRadius: 20, padding: "3px 10px" }}>Hidden</span>}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 2 }}>{c.courseCode}</div>
          <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10 }}>{c.title}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AdminActionBtn label="↑ Up" onClick={() => move(idx, -1)} kind="default" />
            <AdminActionBtn label="↓ Down" onClick={() => move(idx, 1)} kind="default" />
            <AdminActionBtn label="Edit" onClick={() => { setEditing(c); setShowForm(true); }} kind="default" />
            <AdminActionBtn label={c.hidden ? "Unhide" : "Hide"} onClick={() => { updateShowcaseCourse(c.id, { hidden: !c.hidden }).then(load); }} kind={c.hidden ? "success" : "warn"} />
            <AdminActionBtn label="Remove" onClick={() => remove(c.id)} kind="danger" />
          </div>
        </div>
      ))}
      {showForm && (
        <AdminShowcaseFormModal initial={editing} onClose={() => setShowForm(false)}
          onSave={async (data) => { if (editing) await updateShowcaseCourse(editing.id, data); else await addShowcaseCourse(data); flash(editing ? "Updated." : "Added to showcase."); load(); }} />
      )}
    </div>
  );
}

function AdminAnnouncementsTab() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setItems(null);
    try { const { items: list } = await fetchAnnouncements({ pageSize: 50 }); setItems(list); }
    catch (err) { setError(err.message || "Couldn't load homepage items."); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => { if (!confirm("Delete this item?")) return; await deleteAnnouncement(id); flash("Deleted."); load(); };
  const togglePublish = async (a) => { await updateAnnouncement(a.id, { published: !a.published }); flash(a.published ? "Unpublished." : "Published."); load(); };

  const priorityStyle = { urgent: { color: C.danger, bg: C.dangerBg }, high: { color: C.warn, bg: C.warnBg }, important: { color: C.warn, bg: C.warnBg }, normal: { color: C.textSoft, bg: C.bg }, low: { color: C.textFaint, bg: C.bg } };
  const typeLabel = (v) => (HOMEPAGE_ITEM_TYPES.find((t) => t.value === v) || {}).label || "Announcement";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...iconBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>+ New</button>
      </div>
      <AdminError text={error} onRetry={load} />
      <AdminToast text={toast} />
      {items === null && !error && <EmptyState text="Loading…" />}
      {items && items.length === 0 && <EmptyState text="Nothing published yet." />}
      {items && items.map((a) => {
        const s = priorityStyle[a.priority] || priorityStyle.normal;
        return (
          <div key={a.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: C.bg, borderRadius: 20, padding: "3px 10px" }}>{typeLabel(a.itemType)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 20, padding: "3px 10px", textTransform: "capitalize" }}>{a.priority || "normal"}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: a.published ? C.success : C.textFaint, background: a.published ? C.successBg : C.border, borderRadius: 20, padding: "3px 10px" }}>{a.published ? "Published" : "Draft"}</span>
              {a.pinned && <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: C.bg, borderRadius: 20, padding: "3px 10px" }}>📌 Pinned</span>}
              {a.audience && a.audience !== "everyone" && (
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textSoft, background: C.bg, borderRadius: 20, padding: "3px 10px" }}>🎯 {a.audience}{a.audienceValue ? `: ${a.audienceValue}` : ""}</span>
              )}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10, lineHeight: 1.5 }}>{a.body}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <AdminActionBtn label="Edit" onClick={() => { setEditing(a); setShowForm(true); }} kind="default" />
              <AdminActionBtn label={a.published ? "Unpublish" : "Publish"} onClick={() => togglePublish(a)} kind={a.published ? "warn" : "success"} />
              <AdminActionBtn label="Delete" onClick={() => remove(a.id)} kind="danger" />
            </div>
          </div>
        );
      })}
      {showForm && (
        <AdminAnnouncementFormModal initial={editing} onClose={() => setShowForm(false)}
          onSave={async (data) => { if (editing) await updateAnnouncement(editing.id, data); else await addAnnouncement(data); flash(editing ? "Updated." : "Published."); load(); }} />
      )}
    </div>
  );
}

/* Module 1.4 Phase 3 — Homepage Manager: full Super Admin control over everything shown
   in the homepage announcement/info carousel, plus the dynamic Course Showcase. */
function AdminAnnouncementsScreen({ go }) {
  const [tab, setTab] = useState("items");
  return (
    <div>
      <TopBar title="Homepage Manager" onBack={() => go("adminDashboard")} />
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: C.cardAlt, borderRadius: 12, padding: 4 }}>
          {[["items", "Announcements & Notices"], ["courses", "Course Showcase"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
              background: tab === k ? C.primary : "transparent", color: tab === k ? "#fff" : C.textSoft,
              fontSize: 12, fontWeight: 700,
            }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 16px 40px" }}>
        {tab === "items" ? <AdminAnnouncementsTab /> : <AdminCourseShowcaseTab />}
      </div>
    </div>
  );
}

/* ---------------- Analytics Dashboard ---------------- */
function AnalyticsBar({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.textSoft, marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: C.text }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 20, background: C.bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.primary, borderRadius: 20 }} />
      </div>
    </div>
  );
}

/* A single ranked row — used for Most Active Users, Most Viewed Posts, Most Shared Posts. */
function RankedRow({ rank, title, subtitle, value, valueLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: rank < 5 ? `1px solid ${C.border}` : "none" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", background: rank <= 3 ? C.primary : C.bg, color: rank <= 3 ? "#fff" : C.textSoft,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0,
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{value}</div>
        {valueLabel && <div style={{ fontSize: 9, color: C.textFaint }}>{valueLabel}</div>}
      </div>
    </div>
  );
}

/* 7-day growth trend — two overlaid mini bar series (new posts vs new users) sharing one scale. */
function GrowthChart({ days }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.posts, d.users)));
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 90, marginBottom: 8 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: "100%" }}>
              <div title={`${d.posts} posts`} style={{ width: 7, borderRadius: 3, background: C.primary, height: `${Math.max(4, (d.posts / max) * 100)}%` }} />
              <div title={`${d.users} new users`} style={{ width: 7, borderRadius: 3, background: C.success, height: `${Math.max(4, (d.users / max) * 100)}%` }} />
            </div>
            <div style={{ fontSize: 9, color: C.textFaint }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: C.textSoft }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.primary, marginRight: 5 }} />New posts</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.success, marginRight: 5 }} />New users</span>
      </div>
    </div>
  );
}

/* One row of a correct/wrong/skipped/pending breakdown — used for both
   Question Type Statistics and Difficulty Analysis in Admin Analytics. */
function GradeBreakdownRow({ label, stats }) {
  const total = stats.correct + stats.wrong + stats.skipped + stats.pending;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 5 }}>
        <span>{label}</span><span style={{ color: C.textSoft, fontWeight: 600 }}>{total} attempt{total === 1 ? "" : "s"}</span>
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 20, overflow: "hidden", background: C.bg, marginBottom: 4 }}>
        {total > 0 && (
          <>
            <div style={{ width: `${(stats.correct / total) * 100}%`, background: C.success }} />
            <div style={{ width: `${(stats.wrong / total) * 100}%`, background: C.danger }} />
            <div style={{ width: `${(stats.pending / total) * 100}%`, background: C.warn }} />
            <div style={{ width: `${(stats.skipped / total) * 100}%`, background: C.border }} />
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.textSoft }}>
        <span>✅ {stats.correct} correct</span>
        <span>❌ {stats.wrong} wrong</span>
        {stats.pending > 0 && <span>⏳ {stats.pending} pending</span>}
        <span>— {stats.skipped} skipped</span>
      </div>
    </div>
  );
}

function AdminAnalyticsScreen({ go }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = async () => {
    setError(""); setData(null);
    try { setData(await fetchAnalyticsSummary()); }
    catch (err) { setError(err.message || "Couldn't load analytics."); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <TopBar title="Analytics" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        {!data && !error && <EmptyState text="Loading…" />}
        {data && (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Users</div>
            <AdminStatRow items={[["Total", data.totalUsers], ["Active", data.activeUsers], ["Suspended", data.suspendedUsers]]} />

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Exam Activity</div>
            <AdminStatRow items={[["Attempts", data.totalAttempts], ["Mock", data.mockCount], ["Practice", data.practiceCount], ["Avg Score", data.avgScore + "%"]]} />

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Top Courses by Attempts</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              {data.topCourses.length === 0 && <div style={{ fontSize: 12, color: C.textFaint }}>No attempts recorded yet.</div>}
              {data.topCourses.map(([course, count]) => (
                <AnalyticsBar key={course} label={course} value={count} max={data.topCourses[0][1]} />
              ))}
            </div>

            {data.pendingEssays > 0 && (
              <div onClick={() => go("adminGradeEssays")} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
                background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 14, padding: 14, marginBottom: 18,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.warn }}>⏳ {data.pendingEssays} exam{data.pendingEssays === 1 ? "" : "s"} awaiting essay grading</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>Tap to open the grading queue</div>
                </div>
                <span style={{ color: C.warn, fontWeight: 800 }}>→</span>
              </div>
            )}

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Question Bank</div>
            <AdminStatRow items={[["Total Questions", data.questionBankTotal]]} />
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 8 }}>By Type</div>
              {Object.keys(data.bankByType).length === 0 && <div style={{ fontSize: 12, color: C.textFaint }}>No questions in the bank yet.</div>}
              {Object.entries(data.bankByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <AnalyticsBar key={type} label={QUESTION_TYPE_LABELS[type] || type} value={count} max={data.questionBankTotal || 1} />
              ))}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, marginBottom: 8 }}>By Difficulty</div>
              {["Easy", "Medium", "Hard"].map((d) => (
                <AnalyticsBar key={d} label={d} value={data.bankByDifficulty[d] || 0} max={data.questionBankTotal || 1} />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Question Type Statistics</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              {Object.keys(data.typeStats).length === 0 && <div style={{ fontSize: 12, color: C.textFaint }}>No attempts recorded yet.</div>}
              {Object.entries(data.typeStats).map(([type, stats]) => (
                <GradeBreakdownRow key={type} label={QUESTION_TYPE_LABELS[type] || type} stats={stats} />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Difficulty Analysis</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              {Object.keys(data.difficultyStats).length === 0 && <div style={{ fontSize: 12, color: C.textFaint }}>No attempts recorded yet.</div>}
              {["Easy", "Medium", "Hard"].filter((d) => data.difficultyStats[d]).map((d) => (
                <GradeBreakdownRow key={d} label={d} stats={data.difficultyStats[d]} />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Community</div>
            <AdminStatRow items={[["Posts", data.totalPosts], ["Approved", data.approvedPosts], ["Pending", data.pendingPosts], ["Open Reports", data.openReports]]} />

            <AdminStatRow items={[["Daily Active", data.dailyActiveUsers], ["Engagement", data.engagementRate + "%"]]} />

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Community Growth — Last 7 Days</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              <GrowthChart days={data.growthDays} />
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Most Active Users</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "4px 14px", marginBottom: 18 }}>
              {data.mostActiveUsers.length === 0 && <div style={{ fontSize: 12, color: C.textFaint, padding: "10px 0" }}>No community activity yet.</div>}
              {data.mostActiveUsers.map((u, i) => (
                <RankedRow key={u.uid} rank={i + 1} title={u.name} subtitle={`${u.posts} post${u.posts === 1 ? "" : "s"} · ${u.comments} comment${u.comments === 1 ? "" : "s"}`} value={u.total} valueLabel="activity" />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Most Viewed Posts</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "4px 14px", marginBottom: 18 }}>
              {data.mostViewedPosts.length === 0 && <div style={{ fontSize: 12, color: C.textFaint, padding: "10px 0" }}>No posts yet.</div>}
              {data.mostViewedPosts.map((p, i) => (
                <RankedRow key={p.id} rank={i + 1} title={p.title} subtitle={`by ${p.author}`} value={p.value} valueLabel="views" />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Most Shared Posts</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "4px 14px", marginBottom: 18 }}>
              {data.mostSharedPosts.length === 0 && <div style={{ fontSize: 12, color: C.textFaint, padding: "10px 0" }}>No shares yet.</div>}
              {data.mostSharedPosts.map((p, i) => (
                <RankedRow key={p.id} rank={i + 1} title={p.title} subtitle={`by ${p.author}`} value={p.value} valueLabel="shares" />
              ))}
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Upload Statistics</div>
            <AdminStatRow items={[["Images", data.uploadStats.totalImages], ["Videos", data.uploadStats.totalVideos], ["PDFs", data.uploadStats.totalPdfs], ["Posts w/ Media", data.uploadStats.postsWithMedia]]} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function AdminSettingsScreen({ go }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setSettings(null);
    try { setSettings(await fetchAppSettings()); }
    catch (err) { setError(err.message || "Couldn't load settings."); }
  };
  useEffect(() => { load(); }, []);

  const set = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));
  const save = async () => {
    setSaving(true);
    try { await saveAppSettings(settings); flash("Settings saved."); }
    catch (err) { setError(err.message || "Couldn't save settings."); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <TopBar title="Settings" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        {!settings && !error && <EmptyState text="Loading…" />}
        {settings && (
          <>
            <Checkbox checked={!!settings.maintenanceMode} label="Maintenance Mode" sub="Show a maintenance banner to all students" onToggle={() => set("maintenanceMode", !settings.maintenanceMode)} />
            <TextField label="Maintenance Message" value={settings.maintenanceMessage || ""} onChange={(v) => set("maintenanceMessage", v)} placeholder="e.g. Down for scheduled maintenance until 6pm." textarea />
            <TextField label="Minimum App Version" value={settings.minAppVersion || ""} onChange={(v) => set("minAppVersion", v)} placeholder="e.g. 5.3.0" />
            <TextField label="Contact WhatsApp" value={settings.contactWhatsApp || ""} onChange={(v) => set("contactWhatsApp", v)} placeholder="+234…" />
            <TextField label="Contact Email" value={settings.contactEmail || ""} onChange={(v) => set("contactEmail", v)} placeholder="support@…" />
            <TextField label="Contact Phone" value={settings.contactPhone || ""} onChange={(v) => set("contactPhone", v)} placeholder="+234…" />
            <TextField label="Per-User Storage Quota (MB)" value={String(settings.storageQuotaMB || DEFAULT_STORAGE_QUOTA_MB)}
              onChange={(v) => set("storageQuotaMB", Math.max(1, parseInt(v, 10) || DEFAULT_STORAGE_QUOTA_MB))}
              placeholder={String(DEFAULT_STORAGE_QUOTA_MB)} type="number" />
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              Caps how much Storage (images, videos, PDFs, profile photos) each student can use before uploads are blocked.
            </div>
            <button onClick={save} disabled={saving} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6 }}>{saving ? "Saving…" : "Save Settings"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- SUPER ADMIN: BRAND MANAGEMENT (Phase 2) -----------------------------
   Edits settings/branding — every field here is read live by useBrand() throughout the
   app (splash, welcome/login, profile menu + footer, About), so a save here updates the
   whole app immediately for every signed-in user, with no code changes or redeploy. */
function BrandManagementScreen({ go }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setForm(null);
    try {
      const doc = await withTimeout(fbDb.collection("settings").doc("branding").get(), 15000, "Loading brand settings");
      setForm({ ...DEFAULT_BRAND_CONFIG, ...(doc.exists ? doc.data() : {}) });
    } catch (err) { setError(err.message || "Couldn't load brand settings."); }
  };
  useEffect(() => { load(); }, []);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const save = async () => {
    if (!form.appName || !form.appName.trim()) { setError("Application Name is required."); return; }
    setSaving(true); setError("");
    try { await saveBrandConfig(form); flash("Brand settings saved — live for every user now."); }
    catch (err) { setError(err.message || "Couldn't save brand settings."); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <TopBar title="Brand Management" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        {!form && !error && <EmptyState text="Loading…" />}
        {form && (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textSoft, textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 10px" }}>Identity</div>
            <TextField label="Application Name" value={form.appName} onChange={(v) => set("appName", v)} placeholder="EduSphere" />
            <TextField label="Short Name" value={form.shortName} onChange={(v) => set("shortName", v)} placeholder="Used where space is tight (icons, tab titles)" />
            <TextField label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} placeholder="Learn • Practice • Succeed" />
            <TextField label="Description" value={form.description} onChange={(v) => set("description", v)} placeholder="Shown on the About page" textarea />

            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textSoft, textTransform: "uppercase", letterSpacing: 0.5, margin: "18px 0 10px" }}>Legal & Contact</div>
            <TextField label="Copyright" value={form.copyright} onChange={(v) => set("copyright", v)} placeholder="© 2026 Your Company · All rights reserved" />
            <TextField label="Website" value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" />
            <TextField label="Support Email" value={form.supportEmail} onChange={(v) => set("supportEmail", v)} placeholder="support@…" />
            <TextField label="Contact Phone" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} placeholder="+234…" />
            <TextField label="Privacy Policy URL" value={form.privacyUrl} onChange={(v) => set("privacyUrl", v)} placeholder="https://…/privacy" />
            <TextField label="Terms URL" value={form.termsUrl} onChange={(v) => set("termsUrl", v)} placeholder="https://…/terms" />

            <div style={{ fontSize: 11, color: C.textFaint, marginTop: -4, marginBottom: 14, lineHeight: 1.5 }}>
              These fields drive the app's name, tagline, and legal/contact info everywhere it appears — the splash
              screen, login screen, profile menu, About page, and browser tab title. Changes apply immediately to
              every signed-in user, without touching the app's source code.
            </div>
            <button onClick={save} disabled={saving} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6 }}>{saving ? "Saving…" : "Save Brand Settings"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- SUPER ADMIN: BRANDING ASSETS (Phase 3) -----------------------------
   Edits settings/brandAssets. Picking a file only stores it locally (instant preview,
   nothing uploaded yet) — actual Storage upload + Firestore save only happens once the
   Super Admin taps "Save All Changes", per the "show previews before saving" requirement. */
const BRAND_ASSET_FIELDS = [
  { key: "appLogo", label: "App Logo", hint: "Primary logo used across the app" },
  { key: "splashLogo", label: "Splash Screen Logo", hint: "Shown while the app is starting up" },
  { key: "loginLogo", label: "Login Logo", hint: "Shown on the Welcome/Login screen" },
  { key: "dashboardLogo", label: "Dashboard Logo", hint: "Shown in the profile menu header" },
  { key: "favicon", label: "Browser Favicon", hint: "Shown in the browser tab" },
  { key: "androidIcon", label: "Android Launcher Icon", hint: "For future native app releases" },
  { key: "loadingAnimation", label: "Loading Animation", hint: "Shown during in-app loading states" },
  { key: "watermark", label: "Watermark", hint: "Overlaid on shared/exported content" },
  { key: "defaultProfilePicture", label: "Default Profile Picture", hint: "Fallback avatar for users without a photo" },
  { key: "defaultCourseImage", label: "Default Course Image", hint: "Fallback thumbnail for courses without one" },
  { key: "defaultUniversityLogo", label: "Default University Logo", hint: "Fallback logo for schools without one" },
];
function BrandAssetRow({ field, currentUrl, pendingFile, previewUrl, onPick, onClear, busy }) {
  const inputRef = useRef(null);
  const shown = previewUrl || currentUrl;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 12, marginBottom: 10,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
      }}>
        {shown ? <img loading="lazy" src={shown} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <ImageIcon size={22} color={C.textFaint} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{field.label}</div>
        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{field.hint}</div>
        {pendingFile && <div style={{ fontSize: 10.5, color: C.primary, fontWeight: 700, marginTop: 3 }}>New file selected — not saved yet</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} style={{
          fontSize: 11, fontWeight: 700, color: C.primary, background: "transparent", border: `1.5px solid ${C.primary}`,
          borderRadius: 10, padding: "6px 10px", cursor: busy ? "default" : "pointer",
        }}>Change</button>
        {shown && (
          <button onClick={onClear} disabled={busy} style={{
            fontSize: 11, fontWeight: 700, color: C.danger, background: "transparent", border: "none", cursor: busy ? "default" : "pointer",
          }}>Remove</button>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) onPick(e.target.files[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}
function BrandAssetsScreen({ go }) {
  const [saved, setSaved] = useState(null);       // what's currently in Firestore
  const [pending, setPending] = useState({});      // key -> File (picked, not yet uploaded)
  const [previews, setPreviews] = useState({});    // key -> local object URL, for instant preview
  const [cleared, setCleared] = useState({});      // key -> true, marks "remove on save"
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState("");   // "uploading" | "saving" | "done"
  const [uploadError, setUploadError] = useState("");   // failure reason for the Save-All flow specifically
  const [toast, setToast] = useState(null);
  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setError(""); setSaved(null);
    try {
      const doc = await withTimeout(fbDb.collection("settings").doc("brandAssets").get(), 15000, "Loading branding assets");
      setSaved({ ...DEFAULT_BRAND_ASSETS, ...(doc.exists ? doc.data() : {}) });
      setPending({}); setPreviews({}); setCleared({});
    } catch (err) { setError(err.message || "Couldn't load branding assets."); }
  };
  useEffect(() => { load(); return () => Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u)); }, []); // eslint-disable-line

  const pick = (key, file) => {
    setPending((prev) => ({ ...prev, [key]: file }));
    setCleared((prev) => ({ ...prev, [key]: false }));
    setPreviews((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      return { ...prev, [key]: URL.createObjectURL(file) };
    });
  };
  const clear = (key) => {
    setPending((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setPreviews((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      const n = { ...prev }; delete n[key]; return n;
    });
    setCleared((prev) => ({ ...prev, [key]: true }));
  };

  const hasChanges = Object.keys(pending).length > 0 || Object.values(cleared).some(Boolean);

  const saveAll = async () => {
    EduSphere.Logger.info(`[EduSphere Upload] Save All Changes tapped — ${Object.keys(pending).length} file(s) to upload, ${Object.values(cleared).filter(Boolean).length} field(s) to clear.`);
    setSaving(true); setUploadError("");
    try {
      const updates = {};
      const keys = Object.keys(pending);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        setUploadStage("uploading");
        updates[key] = await uploadBrandAsset(pending[key], key);
      }
      for (const key of Object.keys(cleared)) {
        if (cleared[key]) updates[key] = "";
      }
      setUploadStage("saving");
      await saveBrandAssets(updates);
      logUploadFinished("branding assets batch save");
      setUploadStage("done");
      flash("Branding assets saved — live for every user now.");
      await load();
    } catch (err) {
      // Every failure here — a Storage upload OR the Firestore write that
      // follows it — is caught in one place, logged in full, and turned
      // into a specific reason the user can act on (never just a spinner
      // that hangs forever with nothing but a console log).
      logUploadError(err);
      setUploadError(describeUploadError(err));
    } finally {
      // Always reset — a failed upload must never leave "Save All Changes"
      // stuck disabled or stuck reading "Uploading & Saving…".
      setSaving(false);
      setUploadStage("");
    }
  };

  return (
    <div>
      <TopBar title="Branding Assets" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 40 }}>
        <AdminError text={error} onRetry={load} />
        <AdminToast text={toast} />
        {!saved && !error && <EmptyState text="Loading…" />}
        {saved && (
          <>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14, lineHeight: 1.5 }}>
              Pick new files below to preview them instantly — nothing uploads until you tap "Save All Changes".
              All uploads go to Firebase Storage.
            </div>
            {BRAND_ASSET_FIELDS.map((field) => (
              <BrandAssetRow key={field.key} field={field}
                currentUrl={cleared[field.key] ? "" : saved[field.key]}
                pendingFile={pending[field.key]} previewUrl={previews[field.key]}
                onPick={(file) => pick(field.key, file)} onClear={() => clear(field.key)}
                busy={saving} />
            ))}
            <UploadStageIndicator stage={uploadStage} />
            <UploadFailBanner error={uploadError} onRetry={saveAll} />
            <button onClick={saveAll} disabled={saving || !hasChanges} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
              background: (saving || !hasChanges) ? C.textFaint : C.primary, color: "#fff",
              fontWeight: 700, fontSize: 13.5, cursor: (saving || !hasChanges) ? "default" : "pointer", marginTop: 10,
            }}>{saving ? (UPLOAD_STAGE_LABELS[uploadStage] || "Saving…") : "Save All Changes"}</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- NOTIFICATION CENTER (USER) ----------------------------- */

// actionUrl is stored as "screen" or "screen:param" — this turns it into a go() call.
// Chat notifications are special-cased since ChatScreen needs the other user's
// name/photo, which the notification already carries (senderId/senderName/senderPhoto).
function openNotificationTarget(n, go, goToChat) {
  const actionUrl = n && n.actionUrl;
  if (!actionUrl) return;
  const [screen, param] = actionUrl.split(":");
  if (!screen) return;
  if (screen === "chat" && goToChat) {
    goToChat(param, { id: n.senderId, fullName: n.senderName || "Student", photo: n.senderPhoto || null });
    return;
  }
  go(screen, param);
}

function dateGroupLabel(ts) {
  if (!ts) return "Earlier";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "Earlier This Month";
  return "Older";
}

function NotificationRow({ n, go, goToChat, onRead, onDelete }) {
  return (
    <div style={{
      display: "flex", gap: 10, padding: "12px 14px", background: n.isRead ? C.card : C.cardAlt,
      border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8, position: "relative",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", background: C.bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden",
      }}>
        {n.senderPhoto ? <img loading="lazy" src={n.senderPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (n.icon || "🔔")}
      </div>
      <button onClick={() => { if (!n.isRead) onRead(n.id); openNotificationTarget(n, go, goToChat); }} style={{
        flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{n.title}</span>
          {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.primary, flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
        <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
      </button>
      <button onClick={() => onDelete(n.id)} aria-label="Delete notification" style={{
        background: "none", border: "none", cursor: "pointer", color: C.textFaint, alignSelf: "flex-start", padding: 2,
      }}><Trash size={13} /></button>
    </div>
  );
}

const NOTIFICATION_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
];

function NotificationsScreen({ go, user, prevScreen, goToChat }) {
  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState(null);
  const uid = user && user.id;

  useEffect(() => {
    if (!fbDb || !uid) { setItems([]); return undefined; }
    const unsubscribe = fbDb.collection("notifications")
      .where("recipientId", "==", uid).where("isDeleted", "==", false)
      .orderBy("createdAt", "desc").limit(30)
      .onSnapshot(
        (snap) => {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLastDoc(snap.docs[snap.docs.length - 1] || null);
          setHasMore(snap.size === 30);
          setError(null);
        },
        (err) => { EduSphere.Logger.error("[EduSphere] Notifications listener failed:", err); setError(err.message || "Couldn't load notifications"); setItems([]); }
      );
    return () => unsubscribe();
  }, [uid]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { docs, items: more } = await fetchNotificationsPage({ uid, afterDoc: lastDoc, pageSize: 20 });
      setItems((prev) => [...(prev || []), ...more]);
      setLastDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === 20);
    } catch (err) {
      setToast("Couldn't load more: " + (err.message || "unknown error"));
    } finally { setLoadingMore(false); }
  };

  const markRead = async (id) => {
    setItems((prev) => (prev || []).map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try { await markNotificationRead(id); } catch (err) { EduSphere.Logger.error(err); }
  };

  const remove = async (id) => {
    setItems((prev) => (prev || []).filter((n) => n.id !== id));
    try { await deleteNotificationDoc(id); } catch (err) { setToast("Couldn't delete: " + (err.message || "unknown error")); }
  };

  const markAllRead = async () => {
    try {
      const n = await markAllNotificationsRead(uid);
      setItems((prev) => (prev || []).map((x) => ({ ...x, isRead: true })));
      setToast(n ? `Marked ${n} as read.` : "Nothing to mark.");
    } catch (err) { setToast("Failed: " + (err.message || "unknown error")); }
  };

  const clearAll = async () => {
    try {
      await clearAllNotifications(uid);
      setItems([]);
      setToast("Cleared all notifications.");
    } catch (err) { setToast("Failed: " + (err.message || "unknown error")); }
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    const now = Date.now();
    return items.filter((n) => {
      if (filter === "unread" && n.isRead) return false;
      if (filter === "today") {
        const d = n.createdAt && n.createdAt.toDate ? n.createdAt.toDate() : null;
        if (!d || dateGroupLabel(n.createdAt) !== "Today") return false;
      }
      if (filter === "week") {
        const d = n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().getTime() : now;
        if (now - d > 7 * 86400000) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!((n.title || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((n) => {
      const label = dateGroupLabel(n.createdAt);
      (groups[label] = groups[label] || []).push(n);
    });
    return groups;
  }, [filtered]);

  const unreadCount = (items || []).filter((n) => !n.isRead).length;

  return (
    <div>
      <TopBar title="Notifications" onBack={() => go(prevScreen || "home")} />
      <div style={{ padding: "12px 16px 24px" }}>
        {toast && (
          <div style={{ background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, color: C.success, marginBottom: 10 }}>{toast}</div>
        )}
        {error && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, color: C.danger, marginBottom: 10 }}>Couldn't load notifications: {error}</div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px" }}>
            <Search size={14} color={C.textFaint} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notifications"
              style={{ border: "none", outline: "none", background: "none", fontSize: 12.5, flex: 1, color: C.text }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
          {NOTIFICATION_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flexShrink: 0, padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${filter === f.key ? C.primary : C.border}`,
              background: filter === f.key ? C.primary : "transparent", color: filter === f.key ? "#fff" : C.textSoft,
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, color: C.textSoft }}>{unreadCount} unread</span>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={markAllRead} style={{ background: "none", border: "none", color: C.primary, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>
            <button onClick={clearAll} style={{ background: "none", border: "none", color: C.danger, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Clear all</button>
          </div>
        </div>

        {items === null ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textSoft, fontSize: 13 }}>Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <EmptyState text={query ? "No notifications match your search." : "You're all caught up — no notifications yet."} />
        ) : (
          Object.entries(grouped).map(([label, list]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5, margin: "6px 0" }}>{label}</div>
              {list.map((n) => <NotificationRow key={n.id} n={n} go={go} goToChat={goToChat} onRead={markRead} onDelete={remove} />)}
            </div>
          ))
        )}

        {hasMore && filtered.length > 0 && filter === "all" && !query && (
          <button onClick={loadMore} disabled={loadingMore} style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: "transparent", color: C.primary, fontWeight: 700, fontSize: 12.5, cursor: loadingMore ? "default" : "pointer", marginTop: 4,
          }}>{loadingMore ? "Loading…" : "Load more"}</button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- MESSAGING UI ----------------------------- */

function Avatar({ photo, size = 44, online }) {
  const { assets } = useBrand();
  const shown = photo || assets.defaultProfilePicture;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: C.bg, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`,
      }}>
        {shown ? <img loading="lazy" src={shown} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <GraduationCap size={Math.round(size * 0.45)} color={C.primary} />}
      </div>
      {online && (
        <span style={{
          position: "absolute", bottom: 0, right: 0, width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          background: C.success, border: `2px solid ${C.card}`,
        }} />
      )}
    </div>
  );
}

function useOtherUserPresence(uid) {
  const [lastActive, setLastActive] = useState(null);
  useEffect(() => {
    if (!fbDb || !uid) return undefined;
    const unsub = fbDb.collection("users").doc(uid).onSnapshot(
      (snap) => setLastActive(snap.exists ? (snap.data() || {}).lastActive : null),
      () => {}
    );
    return () => unsub();
  }, [uid]);
  return lastActive;
}

/* Live sum of unread messages across all of a student's conversations — powers
   the badge on the Messages icon, the same pattern as useUnreadNotificationCount. */
function useUnreadMessagesCount(uid) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!fbDb || !uid) { setCount(0); return undefined; }
    const unsub = fbDb.collection("conversations").where("participants", "array-contains", uid)
      .onSnapshot(
        (snap) => {
          let total = 0;
          snap.forEach((doc) => { total += ((doc.data() || {}).unread || {})[uid] || 0; });
          setCount(total);
        },
        (err) => { EduSphere.Logger.error("[EduSphere] Unread messages listener failed:", err); setCount(0); }
      );
    return () => unsub();
  }, [uid]);
  return count;
}

function MessagesIconButton({ uid, onClick, dark }) {
  const unread = useUnreadMessagesCount(uid);
  return (
    <button onClick={onClick} aria-label="Messages" style={{
      position: "relative", width: 40, height: 40, borderRadius: 12,
      background: dark ? "rgba(255,255,255,0.15)" : C.card, border: dark ? "none" : `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      <MessageCircle size={20} color={dark ? "#fff" : C.primary} />
      {unread > 0 && (
        <span style={{
          position: "absolute", top: 3, right: 3, minWidth: 16, height: 16, borderRadius: 8,
          background: C.danger, color: "#fff", fontSize: 9.5, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
        }}>{unread > 99 ? "99+" : unread}</span>
      )}
    </button>
  );
}

function MessagesScreen({ go, user, goToChat }) {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const unsub = subscribeToConversations(user.id, setConversations, () => setError("Couldn't load your conversations."));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!searching) { setResults(null); setQuery(""); return; }
    if (query.trim().length < 2) { setResults(null); return; }
    setSearchBusy(true);
    const handle = setTimeout(async () => {
      try { setResults(await searchStudents(query, user.id)); }
      catch { setResults([]); }
      setSearchBusy(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, searching, user]);

  const openWith = async (otherUser) => {
    setSearching(false);
    const cid = await getOrCreateConversation(user, otherUser);
    goToChat(cid, otherUser);
  };

  return (
    <div>
      <TopBar title="Messages" onBack={() => go("home")}
        right={<button onClick={() => setSearching((s) => !s)} style={iconBtnStyle}>
          {searching ? <XCircle size={18} color="#fff" /> : <Search size={18} color="#fff" />}
        </button>} />
      <div style={{ padding: 16 }}>
        {searching && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 10,
            }}>
              <Search size={16} color={C.textFaint} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students by name or email..."
                style={{ border: "none", outline: "none", fontSize: 14, width: "100%", background: "transparent", color: C.text }} />
            </div>
            {searchBusy && <div style={{ fontSize: 12, color: C.textSoft, textAlign: "center", padding: 10 }}>Searching…</div>}
            {results && !searchBusy && results.length === 0 && query.trim().length >= 2 && (
              <div style={{ fontSize: 12, color: C.textSoft, textAlign: "center", padding: 10 }}>No students found.</div>
            )}
            {results && results.map((s) => (
              <button key={s.id} onClick={() => openWith(s)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.card,
                border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, marginBottom: 8, cursor: "pointer", textAlign: "left",
              }}>
                <Avatar photo={s.photo} size={40} online={isUserOnline(s.lastActive)} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{s.fullName}</div>
                  <div style={{ fontSize: 11.5, color: C.textSoft }}>{[s.department, s.level && s.level + " Level"].filter(Boolean).join(" · ") || s.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!searching && (
          <>
            {error && <div style={{ color: C.danger, fontSize: 13, textAlign: "center", padding: 20 }}>{error}</div>}
            {conversations === null && !error && <div style={{ textAlign: "center", color: C.textSoft, fontSize: 13, padding: 30 }}>Loading conversations…</div>}
            {conversations && conversations.length === 0 && (
              <EmptyState text="No conversations yet. Tap the search icon to find a student and start chatting." />
            )}
            {conversations && conversations.map((c) => {
              const otherId = c.participants.find((p) => p !== user.id);
              const name = (c.names && c.names[otherId]) || "Student";
              const photo = c.photos && c.photos[otherId];
              const unread = (c.unread && c.unread[otherId + ""]) || (c.unread && c.unread[user.id]) || 0;
              const myUnread = (c.unread || {})[user.id] || 0;
              const isMine = c.lastMessageSenderId === user.id;
              return (
                <button key={c.id} onClick={() => goToChat(c.id, { id: otherId, fullName: name, photo })} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.card,
                  border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, marginBottom: 10, cursor: "pointer", textAlign: "left",
                }}>
                  <ConversationAvatar otherId={otherId} photo={photo} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</span>
                      <span style={{ fontSize: 10.5, color: C.textFaint, flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <span style={{
                        fontSize: 12, color: myUnread > 0 ? C.text : C.textSoft, fontWeight: myUnread > 0 ? 700 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 210,
                      }}>{isMine ? "You: " : ""}{c.lastMessage || "Say hi 👋"}</span>
                      {myUnread > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9, background: C.primary, color: "#fff",
                          fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0,
                        }}>{myUnread > 99 ? "99+" : myUnread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function ConversationAvatar({ otherId, photo }) {
  const lastActive = useOtherUserPresence(otherId);
  return <Avatar photo={photo} size={46} online={isUserOnline(lastActive)} />;
}

const EMOJI_PALETTE = ["😀", "😂", "😍", "🙏", "👍", "🔥", "🎉", "😢", "😮", "❤️", "🤔", "😴"];

function ChatScreen({ go, user, conversationId, otherUser }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [convo, setConvo] = useState(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastActive = useOtherUserPresence(otherUser.id);

  useEffect(() => {
    if (!conversationId) return undefined;
    const unsub = subscribeToMessages(conversationId, 50, setMessages, () => {});
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    if (!fbDb || !conversationId) return undefined;
    const unsub = fbDb.collection("conversations").doc(conversationId).onSnapshot(
      (snap) => setConvo(snap.exists ? snap.data() : null), () => {}
    );
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    if (user) markConversationRead(conversationId, user.id);
  }, [conversationId, user]);

  useEffect(() => {
    if (messages && messages.length) {
      markMessagesRead(conversationId, user.id, messages);
      bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, conversationId, user]);

  useEffect(() => () => setTypingStatus(conversationId, user.id, false), [conversationId, user]);

  const otherTyping = !!(convo && convo.typing && convo.typing[otherUser.id]);

  const onChangeText = (v) => {
    setText(v);
    setTypingStatus(conversationId, user.id, v.length > 0);
  };

  const pickImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setImgBusy(true);
    try { setPendingImage(await compressImageFile(file, 900, 0.55)); }
    catch { /* ignore bad image */ }
    setImgBusy(false);
  };

  const send = async () => {
    if (!text.trim() && !pendingImage) return;
    setSending(true);
    const res = await sendMessage(conversationId, user, otherUser.id, { text, imageUrl: pendingImage });
    setSending(false);
    if (res.ok) { setText(""); setPendingImage(null); setTypingStatus(conversationId, user.id, false); }
  };

  const loadMore = async () => {
    if (!messages || !messages.length) return;
    const older = await loadOlderMessages(conversationId, messages[0], 30);
    if (older.length) setMessages((prev) => [...older, ...prev]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar title={otherUser.fullName}
        onBack={() => go("messages")}
        right={<div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
          {otherTyping ? "typing…" : formatLastSeen(lastActive)}
        </div>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 4px" }}>
        {messages && messages.length >= 50 && (
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <button onClick={loadMore} style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px",
              fontSize: 11.5, color: C.textSoft, cursor: "pointer",
            }}>Load earlier messages</button>
          </div>
        )}
        {messages === null && <div style={{ textAlign: "center", color: C.textSoft, fontSize: 13, padding: 30 }}>Loading…</div>}
        {messages && messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.textSoft, fontSize: 12.5, padding: 30 }}>
            No messages yet. Say hello to {otherUser.fullName.split(" ")[0]} 👋
          </div>
        )}
        {messages && messages.map((m) => {
          const mine = m.senderId === user.id;
          const read = (m.readBy || []).includes(otherUser.id);
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ maxWidth: "76%" }}>
                <div style={{
                  background: mine ? C.primary : C.card, color: mine ? "#fff" : C.text,
                  border: mine ? "none" : `1px solid ${C.border}`,
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "9px 13px", fontSize: 13.5, lineHeight: 1.4, wordBreak: "break-word",
                }}>
                  {m.imageUrl && <img loading="lazy" src={m.imageUrl} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: m.text ? 6 : 0, display: "block" }} />}
                  {m.text}
                </div>
                <div style={{
                  display: "flex", gap: 4, justifyContent: mine ? "flex-end" : "flex-start",
                  fontSize: 9.5, color: C.textFaint, marginTop: 3, padding: "0 4px",
                }}>
                  <span>{timeAgo(m.createdAt)}</span>
                  {mine && <span>{read ? "✓✓ Read" : "✓ Sent"}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 14px", borderTop: `1px solid ${C.border}`, background: C.card }}>
          {EMOJI_PALETTE.map((e) => (
            <button key={e} onClick={() => onChangeText(text + e)} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>{e}</button>
          ))}
        </div>
      )}
      {pendingImage && (
        <div style={{ padding: "8px 14px", background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <img loading="lazy" src={pendingImage} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
          <span style={{ fontSize: 11.5, color: C.textSoft, flex: 1 }}>Photo ready to send</span>
          <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><XCircle size={18} color={C.textFaint} /></button>
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: C.card,
        borderTop: `1px solid ${C.border}`, paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
      }}>
        <button onClick={() => setShowEmoji((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>😊</span>
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={pickImage} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={imgBusy} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <ImageIcon size={20} color={C.primary} />
        </button>
        <input value={text} onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Type a message..." style={{
            flex: 1, border: `1px solid ${C.border}`, borderRadius: 20, padding: "9px 14px",
            fontSize: 13.5, outline: "none", background: C.bg, color: C.text,
          }} />
        <button onClick={send} disabled={sending || (!text.trim() && !pendingImage)} style={{
          width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
          background: (sending || (!text.trim() && !pendingImage)) ? C.border : C.primary,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- ADMIN: NOTIFICATION BROADCAST CENTER ----------------------------- */

const BROADCAST_TYPES = [
  { value: "systemAnnouncement", label: "System Announcement" },
  { value: "maintenance", label: "Maintenance Notice" },
  { value: "versionUpdate", label: "Version Update" },
  { value: "bugFix", label: "Bug Fix" },
  { value: "achievement", label: "Achievement / Celebration" },
  { value: "weeklyChallenge", label: "Weekly Challenge" },
];

function AdminNotificationsScreen({ go, currentUser }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("systemAnnouncement");
  const [targetType, setTargetType] = useState("all");
  const [targetValue, setTargetValue] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [broadcasts, setBroadcasts] = useState(null);
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    try { setBroadcasts(await fetchRecentBroadcasts()); }
    catch (err) { setToast("Couldn't load broadcasts: " + (err.message || "unknown error")); setBroadcasts([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (t) => { setToast(t); setTimeout(() => setToast(null), 3500); };

  const send = async () => {
    if (!title.trim() || !message.trim()) { flash("Title and message are required."); return; }
    if (targetType !== "all" && !targetValue.trim()) { flash("Enter a target value (email or course code)."); return; }
    setSending(true);
    try {
      const res = await createBroadcast({
        title: title.trim(), message: message.trim(), type, category: "system",
        targetType, targetValue: targetValue.trim(), senderId: currentUser?.id, senderName: currentUser?.fullName || "Admin",
      });
      if (res.ok) {
        flash(`Sent to ${res.recipientCount} user${res.recipientCount === 1 ? "" : "s"}.`);
        setTitle(""); setMessage(""); setTargetValue("");
        load();
      } else {
        flash(res.error || "Couldn't send broadcast.");
      }
    } catch (err) {
      flash("Failed: " + (err.message || "unknown error"));
    } finally { setSending(false); }
  };

  const loadStats = async (id) => {
    setStats((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const s = await getBroadcastReadStats(id);
      setStats((prev) => ({ ...prev, [id]: { ...s, loading: false } }));
    } catch (err) {
      setStats((prev) => ({ ...prev, [id]: { loading: false, error: true } }));
    }
  };

  const remove = async (id) => {
    try {
      await deleteBroadcast(id);
      setBroadcasts((prev) => (prev || []).filter((b) => b.id !== id));
      flash("Broadcast deleted.");
    } catch (err) { flash("Failed: " + (err.message || "unknown error")); }
  };

  return (
    <div>
      <TopBar title="Notification Center" onBack={() => go("adminDashboard")} />
      <div style={{ padding: 16, paddingBottom: 30 }}>
        {toast && (
          <div style={{ background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, color: C.success, marginBottom: 12 }}>{toast}</div>
        )}

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}><Broadcast size={14} /> Broadcast a Notification</div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 20 }}>
          <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. Scheduled maintenance tonight" />
          <TextField label="Message" value={message} onChange={setMessage} placeholder="Full notification text" textarea />

          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, margin: "10px 0 6px" }}>Type</div>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{
            width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12.5, marginBottom: 10, background: C.card, color: C.text,
          }}>
            {BROADCAST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSoft, margin: "4px 0 6px" }}>Send to</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["all", "All Users"], ["user", "Specific User"], ["course", "Course"]].map(([v, l]) => (
              <button key={v} onClick={() => setTargetType(v)} style={{
                flex: 1, padding: "8px 6px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${targetType === v ? C.primary : C.border}`,
                background: targetType === v ? C.primary : "transparent", color: targetType === v ? "#fff" : C.textSoft,
              }}>{l}</button>
            ))}
          </div>
          {targetType === "user" && (
            <TextField label="User email" value={targetValue} onChange={setTargetValue} placeholder="student@example.com" />
          )}
          {targetType === "course" && (
            <TextField label="Course code" value={targetValue} onChange={setTargetValue} placeholder="e.g. CPE102" />
          )}
          <div style={{ fontSize: 10.5, color: C.textFaint, lineHeight: 1.5, marginBottom: 10 }}>
            "Course" targets students with at least one exam/practice attempt logged for that code. Level/department/faculty targeting needs those fields added to user profiles first.
          </div>

          <button onClick={send} disabled={sending} style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: sending ? C.textFaint : C.primary, color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: sending ? "default" : "pointer",
          }}>{sending ? "Sending…" : "Send Now"}</button>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>Recent Broadcasts</div>
        {broadcasts === null ? (
          <div style={{ textAlign: "center", padding: 30, color: C.textSoft, fontSize: 13 }}>Loading…</div>
        ) : broadcasts.length === 0 ? (
          <EmptyState text="No broadcasts sent yet." />
        ) : (
          broadcasts.map((b) => (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{b.title}</div>
                <button onClick={() => remove(b.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", flexShrink: 0 }}><Trash size={13} /></button>
              </div>
              <div style={{ fontSize: 12, color: C.textSoft, margin: "4px 0" }}>{b.message}</div>
              <div style={{ fontSize: 10.5, color: C.textFaint }}>
                {timeAgo(b.createdAt)} · Sent to {b.recipientCount} · Target: {b.targetType === "all" ? "All users" : `${b.targetType} (${b.targetValue})`}
              </div>
              {stats[b.id] ? (
                stats[b.id].loading ? (
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>Loading stats…</div>
                ) : stats[b.id].error ? (
                  <div style={{ fontSize: 11, color: C.danger, marginTop: 6 }}>Couldn't load stats.</div>
                ) : (
                  <div style={{ fontSize: 11, color: C.success, marginTop: 6, fontWeight: 700 }}>
                    {stats[b.id].read}/{stats[b.id].sent} read ({stats[b.id].sent ? Math.round((stats[b.id].read / stats[b.id].sent) * 100) : 0}%)
                  </div>
                )
              ) : (
                <button onClick={() => loadStats(b.id)} style={{ background: "none", border: "none", color: C.primary, fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 6, padding: 0 }}>View read stats</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------- ROOT APP ----------------------------- */
const AUTH_SCREENS = ["welcome", "login", "register", "forgotPassword"];

function EduSphere() {
  const brand = useBrandSubscription(); // Phase 2/3: live Application Identity + Branding Assets
  const { config: brandConfig, assets: brandAssets } = brand;

  // Keep the browser tab title and favicon in sync with Brand Management —
  // "immediately, without modifying source code" per Phase 2.
  useEffect(() => {
    const name = brandConfig.appName || "EduSphere";
    document.title = brandConfig.tagline ? `${name} — ${brandConfig.tagline}` : name;
  }, [brandConfig.appName, brandConfig.tagline]);
  useEffect(() => {
    if (!brandAssets.favicon) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = brandAssets.favicon;
  }, [brandAssets.favicon]);

  const courses = useLiveCourses(); // single source of truth — live from Firestore "courses", falls back to COURSES
  const [screen, setScreen] = useState(null); // null while session is being resolved
  const [prevScreen, setPrevScreen] = useState("home");
  const screenRef = useRef("home");
  const [selectPurpose, setSelectPurpose] = useState("practice");
  const [activeCourse, setActiveCourse] = useState(COURSES[0].code);
  const [activePostId, setActivePostId] = useState(null);
  const [onboardingReturn, setOnboardingReturn] = useState("home");
  const [activeChat, setActiveChat] = useState(null); // { conversationId, otherUser }
  const [activeMode, setActiveMode] = useState("practice");
  const [quizConfig, setQuizConfig] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [history, setHistory] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [themePref, setThemePref] = useState("light");
  const [, forceThemeTick] = useState(0);

  const loadAllHistory = useCallback(() => {
    const seeded = {};
    (courses.length ? courses : COURSES).forEach((c) => { seeded[c.code] = loadHistory(c.code); });
    setHistory(seeded);
  }, [courses]);

  const [startupError, setStartupError] = useState(null);

  // Confirms to the plain-JS watchdog script (in <head>) that React actually
  // mounted and ran — used to cancel the "app never booted" fallback screen.
  useEffect(() => { window.__FL_BOOTED = true; }, []);

  // Firebase Auth is the single source of truth for the session: this fires
  // once on mount with whatever session Firebase already has persisted
  // (LOCAL or SESSION), and again on every future sign-in/sign-out — which is
  // what keeps the user logged in across app restarts until they log out.
  //
  // Every path out of this effect (success, Firebase init failure, Firestore
  // timeout, or the outer fail-safe timer) always ends by calling setScreen,
  // so the splash screen can never be left showing indefinitely.
  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const goWelcome = () => {
      screenRef.current = "welcome";
      setPrevScreen("welcome");
      setScreen("welcome");
    };

    // Fail-safe: no matter what goes wrong above, never leave the splash
    // screen up for more than a few seconds.
    const failSafeTimer = setTimeout(() => {
      if (cancelled || settled) return;
      EduSphere.Logger.warn("[EduSphere] Startup timed out — forcing past the splash screen.");
      setStartupError("Startup is taking longer than expected, so we've continued without a saved session. Some features may be limited until you reload.");
      goWelcome();
      settled = true;
    }, 8000);

    if (FIREBASE_INIT_ERROR || !fbAuth) {
      EduSphere.Logger.auth.error("[EduSphere] Cannot check auth state — Firebase failed to initialize:", FIREBASE_INIT_ERROR);
      setStartupError("Couldn't connect to Firebase: " + (FIREBASE_INIT_ERROR || "unknown error") + ". Login and saved progress won't work until this is fixed.");
      goWelcome();
      settled = true;
      clearTimeout(failSafeTimer);
      return () => { cancelled = true; };
    }

    EduSphere.Logger.auth.info("[EduSphere] Checking auth state...");
    const unsubscribe = fbAuth.onAuthStateChanged(async (fbUser) => {
      if (cancelled || SUPPRESS_AUTH_NAV) return;
      EduSphere.Logger.auth.info("[EduSphere] Auth state checked:", fbUser ? `signed in (${fbUser.uid})` : "signed out");

      if (fbUser) {
        CURRENT_USER_ID = fbUser.uid;
        let profile = null;
        try {
          profile = await withTimeout(fetchUserProfile(fbUser.uid), 6000, "Firestore profile fetch");
          EduSphere.Logger.firebase.info("[EduSphere] Firestore connected");
        } catch (err) {
          EduSphere.Logger.firebase.error("[EduSphere] Firestore unreachable:", err);
          setStartupError("Couldn't reach the database, so some profile details may be missing. Check your connection and try again.");
        }
        if (cancelled) return;
        if (!profile) {
          profile = {
            id: fbUser.uid, fullName: fbUser.displayName || "", email: fbUser.email || "",
            phone: "", photo: null, dateJoined: new Date().toISOString(),
          };
        }
        if ((profile.suspended || profile.deleted) && !isAdminEmail(profile.email)) {
          EduSphere.Logger.warn("[EduSphere] Session ended — account is", profile.deleted ? "deleted" : "suspended");
          CURRENT_USER_ID = null;
          setCurrentUser(null);
          try { await fbAuth.signOut(); } catch {}
          setStartupError(profile.deleted
            ? "This account has been removed. Contact support if you believe this is a mistake."
            : "This account has been suspended. Contact support for help.");
          goWelcome();
          settled = true;
          clearTimeout(failSafeTimer);
          return;
        }
        const isAdminLogin = isAdminEmail(profile.email);
        EduSphere.Logger.info("Logged in email:", profile.email);
        EduSphere.Logger.auth.info("Is Admin:", isAdminLogin);
        setCurrentUser(profile);
        // Module 1.4 Phase 2 — cross-device theme sync: the Firestore profile's
        // themePref (set at signup, or whenever the user changes it on any device)
        // wins over whatever this particular device has cached locally. We still
        // cache it locally right away so the *next* launch on this device applies
        // instantly, before Firestore has even responded.
        const resolvedTheme = profile.themePref || loadThemePref();
        setThemePref(resolvedTheme);
        saveThemePref(resolvedTheme);
        loadAllHistory();
        const landingScreen = isAdminLogin ? "adminDashboard" : "home";
        screenRef.current = landingScreen;
        setScreen(landingScreen);
      } else {
        CURRENT_USER_ID = null;
        setCurrentUser(null);
        setHistory({});
        setThemePref("light");
        applyThemeColors("light");
        forceThemeTick((n) => n + 1);
        goWelcome();
      }
      settled = true;
      clearTimeout(failSafeTimer);
    }, (err) => {
      // Fires if the onAuthStateChanged listener itself errors out.
      EduSphere.Logger.auth.error("[EduSphere] Auth listener error:", err);
      if (cancelled) return;
      setStartupError("Firebase Authentication error: " + firebaseAuthErrorMessage(err));
      goWelcome();
      settled = true;
      clearTimeout(failSafeTimer);
    });

    return () => { cancelled = true; clearTimeout(failSafeTimer); unsubscribe(); };
  }, [loadAllHistory]);

  useEffect(() => {
    if (screen === null) return;
    applyThemeColors(themePref);
    forceThemeTick((n) => n + 1);
    if (themePref !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { applyThemeColors("system"); forceThemeTick((n) => n + 1); };
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler); };
  }, [themePref, screen]);

  const handleThemeChange = (pref) => {
    setThemePref(pref);
    saveThemePref(pref);
    if (currentUser?.id) syncThemePrefToCloud(currentUser.id, pref);
  };

  const go = useCallback((target, courseCode, mode) => {
    if (courseCode) setActiveCourse(courseCode);
    if (mode) setActiveMode(mode);
    const resolved = target === "quiz" ? "quizSetup" : target;
    setPrevScreen(screenRef.current);
    screenRef.current = resolved;
    setScreen(resolved);
    window.scrollTo && window.scrollTo({ top: 0 });
  }, []);

  /* Bug fix: opening a community post used to call go("postDetail", postId),
     which reused the SAME activeCourse state that a dozen other screens
     (courseDetail, notes, practiceOptions, quizSetup, performance, bookmarks,
     etc.) treat as the currently selected course code. That silently
     overwrote activeCourse with a Firestore post ID, so anything navigated
     to afterward without explicitly passing a fresh course code — e.g. the
     bottom nav's Results tab, which calls go("performance", activeCourse) —
     received a bogus "course code" instead. Post navigation now has its own
     state (activePostId) via this dedicated function, so viewing a post can
     never corrupt course navigation elsewhere in the app. */
  const goPost = useCallback((postId) => {
    setActivePostId(postId);
    setPrevScreen(screenRef.current);
    screenRef.current = "postDetail";
    setScreen("postDetail");
    window.scrollTo && window.scrollTo({ top: 0 });
  }, []);

  const goSelect = useCallback((purpose) => {
    setSelectPurpose(purpose);
    setPrevScreen(screenRef.current);
    screenRef.current = "selectCourse";
    setScreen("selectCourse");
    window.scrollTo && window.scrollTo({ top: 0 });
  }, []);

  const goToOnboarding = useCallback(() => {
    setOnboardingReturn("profile");
    go("onboarding");
  }, [go]);

  const goToChat = useCallback((conversationId, otherUser) => {
    setActiveChat({ conversationId, otherUser });
    go("chat");
  }, [go]);

  usePresenceHeartbeat(currentUser ? currentUser.id : null);

  const handleLoginSuccess = useCallback((user) => {
    // fbAuth's onAuthStateChanged listener above already fires from the
    // signInWithEmailAndPassword call inside loginUser() and takes care of
    // setting currentUser / history / navigating home. This just guarantees
    // an immediate, synchronous transition rather than waiting on that async
    // listener, using the profile loginUser() already fetched.
    const isAdminLogin = isAdminEmail(user.email);
    EduSphere.Logger.info("Logged in email:", user.email);
    EduSphere.Logger.auth.info("Is Admin:", isAdminLogin);
    CURRENT_USER_ID = user.id;
    setCurrentUser(user);
    setThemePref(loadThemePref());
    loadAllHistory();
    // Show the academic-profile onboarding wizard once, right after a first
    // login/registration — never again automatically once it's been shown
    // (dismissed or completed). Students can always redo it from Profile.
    if (!isAdminLogin && !user.profileCompleted && !user.onboardingPromptShown) {
      setOnboardingReturn("home");
      go("onboarding");
    } else {
      go(isAdminLogin ? "adminDashboard" : "home");
    }
  }, [go, loadAllHistory]);

  const handleRegisterSuccess = useCallback(() => {}, []);

  const handleLogout = useCallback(() => {
    // onAuthStateChanged (above) handles resetting all local state once
    // Firebase confirms the sign-out.
    fbAuth.signOut();
  }, []);

  const handleAccountDeleted = useCallback(() => {
    // deleteUserAccount() has already removed the Firebase Auth account and
    // Firestore profile by this point. onAuthStateChanged will also fire
    // (the user is gone), but we clear local state and navigate immediately
    // for a snappy transition straight to the Login screen rather than
    // waiting on that async listener.
    CURRENT_USER_ID = null;
    setCurrentUser(null);
    setHistory({});
    setThemePref("light");
    applyThemeColors("light");
    forceThemeTick((n) => n + 1);
    screenRef.current = "login";
    setPrevScreen("welcome");
    setScreen("login");
  }, []);

  const handleProfileSaved = useCallback((updatedUser) => {
    if (updatedUser) setCurrentUser(updatedUser);
  }, []);

  const handleStartQuiz = (config) => setQuizConfig(config);

  const handleFinishQuiz = (questions, answers, marked, timeSpent) => {
    setQuizData({ questions, answers, marked, timeSpent });
    setScreen("result");
  };

  const handleHistorySaved = (updated) => {
    setHistory((prev) => ({ ...prev, [activeCourse]: updated }));
  };

  const prevEntry = useMemo(() => {
    const list = history[activeCourse] || [];
    return list.find((h) => h.mode === activeMode) || null;
  }, [history, activeCourse, activeMode]);

  const isAdmin = !!(currentUser && isAdminEmail(currentUser.email));

  if (screen === null) {
    return (
      <BrandContext.Provider value={brand}>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, #0B1130 0%, #14265C 28%, #2563EB 62%, #60A5FA 100%)",
      }}>
        <StartupErrorBanner text={startupError} onDismiss={() => setStartupError(null)} />

        {/* Soft glow behind the logo */}
        <div aria-hidden style={{
          position: "absolute", top: "26%", left: "50%", transform: "translate(-50%,-50%)",
          width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(56,189,248,0.18) 55%, transparent 75%)",
          filter: "blur(6px)", animation: "flGlowPulse 3.2s ease-in-out infinite",
        }} />

        {/* Abstract floating education-themed shapes */}
        <div aria-hidden style={{
          position: "absolute", top: "12%", left: "12%", width: 46, height: 46, borderRadius: "50%",
          background: "rgba(255,255,255,0.10)", animation: "flFloat 5s ease-in-out infinite",
        }} />
        <div aria-hidden style={{
          position: "absolute", top: "18%", right: "10%", width: 30, height: 30, borderRadius: "50%",
          background: "rgba(56,189,248,0.22)", animation: "flFloat 4.2s ease-in-out infinite 0.6s",
        }} />
        <div aria-hidden style={{
          position: "absolute", bottom: "26%", left: "8%", width: 58, height: 58, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", animation: "flFloat 6s ease-in-out infinite 1s",
        }} />
        <div aria-hidden style={{
          position: "absolute", bottom: "30%", right: "14%", width: 36, height: 36, borderRadius: "50%",
          background: "rgba(37,99,235,0.25)", animation: "flFloat 4.6s ease-in-out infinite 0.3s",
        }} />

        <div style={{
          position: "relative", flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center",
        }}>
          <div style={{
            width: 132, height: 132, borderRadius: 32, background: "rgba(255,255,255,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22,
            animation: "flLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}>
            <Logo size={92} variant="splash" />
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: 0.3,
            animation: "flFadeUp 0.6s ease 0.35s both",
          }}>{brandConfig.appName}</div>
          <div style={{
            fontSize: 13.5, color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: 1.2,
            marginTop: 8, textTransform: "uppercase", animation: "flFadeIn 0.6s ease 0.7s both",
          }}>{brandConfig.tagline}</div>
        </div>

        <div style={{
          position: "relative", paddingBottom: 34, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 14, animation: "flFadeIn 0.6s ease 0.9s both",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "#fff",
                animation: `flDotBounce 1.2s ease-in-out infinite ${i * 0.15}s`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            {startupError ? "Continuing without a saved session…" : "Preparing your dashboard..."}
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontWeight: 600, marginTop: 6 }}>
            {brandConfig.copyright}
          </div>
        </div>
      </div>
      </BrandContext.Provider>
    );
  }

  let content = null;
  switch (screen) {
    case "welcome": content = <WelcomeScreen go={go} />; break;
    case "login": content = <LoginScreen go={go} onLoginSuccess={handleLoginSuccess} />; break;
    case "register": content = <RegisterScreen go={go} onRegisterSuccess={handleRegisterSuccess} />; break;
    case "forgotPassword": content = <ForgotPasswordScreen go={go} />; break;
    case "home": content = <HomeScreen go={go} goSelect={goSelect} courses={courses} user={currentUser} />; break;
    case "courses": content = <CoursesScreen go={go} courses={courses} />; break;
    case "courseDetail": content = <CourseDetailScreen code={activeCourse} go={go} courses={courses} />; break;
    case "selectCourse": content = <CourseSelectScreen purpose={selectPurpose} go={go} courses={courses} />; break;
    case "notes": content = <NotesScreen code={activeCourse} go={go} courses={courses} prevScreen={prevScreen} />; break;
    case "practiceOptions": content = <PracticeOptionsScreen code={activeCourse} go={go} courses={courses} prevScreen={prevScreen} />; break;
    case "flashcards": content = <FlashcardsScreen code={activeCourse} go={go} courses={courses} />; break;
    case "quizSetup": content = <QuizSetupScreen code={activeCourse} mode={activeMode} go={go} onStart={handleStartQuiz} prevScreen={prevScreen} />; break;
    case "quizRun": content = activeMode === "practice"
      ? <ScanningModeScreen code={activeCourse} config={quizConfig} go={go} onFinish={handleFinishQuiz} />
      : <QuizRunScreen code={activeCourse} mode={activeMode} config={quizConfig} go={go} onFinish={handleFinishQuiz} />;
      break;
    case "mistakes": content = <MistakesScreen code={activeCourse} go={go} />; break;
    case "result":
      content = quizData ? (
        <ResultScreen code={activeCourse} mode={activeMode} questions={quizData.questions}
          answers={quizData.answers} marked={quizData.marked} timeSpent={quizData.timeSpent}
          go={go} onSaved={handleHistorySaved} prevEntry={prevEntry} />
      ) : null;
      break;
    case "performance": content = <PerformanceScreen code={activeCourse} go={go} courses={courses} history={history} />; break;
    case "examHistory": content = <ExamHistoryScreen go={go} courses={courses} />; break;
    case "bookmarks": content = <BookmarksScreen code={activeCourse} go={go} />; break;
    case "settings": content = <SettingsScreen go={go} themePref={themePref} onThemeChange={handleThemeChange} />; break;
    case "profile": content = <ProfileScreen go={go} user={currentUser} onLogout={handleLogout} onAccountDeleted={handleAccountDeleted} isAdmin={isAdmin} goToOnboarding={goToOnboarding} />; break;
    case "editProfile": content = <EditProfileScreen go={go} user={currentUser} onSave={handleProfileSaved} />; break;
    case "onboarding": content = <OnboardingScreen go={go} user={currentUser} onSave={handleProfileSaved} returnTo={onboardingReturn} />; break;
    case "about": content = <AboutScreen go={go} />; break;
    case "adminDashboard": content = isAdmin ? <AdminDashboardScreen go={go} currentUser={currentUser} /> : <AccessDeniedScreen go={go} />; break;
    case "adminUsers": content = isAdmin ? <AdminUserManagementScreen go={go} currentUser={currentUser} /> : <AccessDeniedScreen go={go} />; break;
    case "community": content = <CommunityScreen go={go} goPost={goPost} user={currentUser} isAdmin={isAdmin} />; break;
    case "createPost": content = <CreatePostScreen go={go} user={currentUser} />; break;
    case "postDetail": content = <PostDetailScreen postId={activePostId} go={go} user={currentUser} isAdmin={isAdmin} />; break;
    case "savedPosts": content = <SavedPostsScreen go={go} goPost={goPost} user={currentUser} />; break;
    case "myPosts": content = <MyPostsScreen go={go} goPost={goPost} user={currentUser} />; break;
    case "communityGuidelines": content = <CommunityGuidelinesScreen go={go} />; break;
    case "adminCommunity": content = isAdmin ? <AdminCommunityScreen go={go} goPost={goPost} /> : <AccessDeniedScreen go={go} />; break;
    case "adminCourses": content = isAdmin ? <AdminCoursesScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "academicHub": content = isAdmin ? <AdminAcademicHubScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminUniversities": content = isAdmin ? <AdminAcademicListScreen go={go} kind="university" backTo="academicHub" /> : <AccessDeniedScreen go={go} />; break;
    case "adminSchools": content = isAdmin ? <AdminAcademicListScreen go={go} kind="school" backTo="academicHub" /> : <AccessDeniedScreen go={go} />; break;
    case "adminDepartments": content = isAdmin ? <AdminAcademicListScreen go={go} kind="department" backTo="academicHub" /> : <AccessDeniedScreen go={go} />; break;
    case "adminLevels": content = isAdmin ? <AdminAcademicListScreen go={go} kind="level" backTo="academicHub" /> : <AccessDeniedScreen go={go} />; break;
    case "adminSemesters": content = isAdmin ? <AdminAcademicListScreen go={go} kind="semester" backTo="academicHub" /> : <AccessDeniedScreen go={go} />; break;
    case "adminQuestions": content = isAdmin ? <AdminQuestionBankScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminNotes": content = isAdmin ? <AdminNotesScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminFlashcards": content = isAdmin ? <AdminFlashcardsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminLeaderboard": content = isAdmin ? <AdminLeaderboardScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminExamResults": content = isAdmin ? <AdminExamResultsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminExamHistory": content = isAdmin ? <AdminExamHistoryScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminPracticeHistory": content = isAdmin ? <AdminPracticeHistoryScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminAnnouncements": content = isAdmin ? <AdminAnnouncementsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminAnalytics": content = isAdmin ? <AdminAnalyticsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminGradeEssays": content = isAdmin ? <AdminGradeEssaysScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminSettings": content = isAdmin ? <AdminSettingsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminBrandManagement": content = isAdmin ? <BrandManagementScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "adminBrandAssets": content = isAdmin ? <BrandAssetsScreen go={go} /> : <AccessDeniedScreen go={go} />; break;
    case "notifications": content = <NotificationsScreen go={go} user={currentUser} prevScreen={prevScreen} goToChat={goToChat} />; break;
    case "messages": content = <MessagesScreen go={go} user={currentUser} goToChat={goToChat} />; break;
    case "chat": content = activeChat
      ? <ChatScreen go={go} user={currentUser} conversationId={activeChat.conversationId} otherUser={activeChat.otherUser} />
      : <MessagesScreen go={go} user={currentUser} goToChat={goToChat} />; break;
    case "adminNotifications": content = isAdmin ? <AdminNotificationsScreen go={go} currentUser={currentUser} /> : <AccessDeniedScreen go={go} />; break;
    default: content = <HomeScreen go={go} goSelect={goSelect} courses={courses} user={currentUser} />;
  }

  const ADMIN_SCREENS = [
    "adminDashboard", "adminUsers", "adminCommunity", "adminCourses", "adminQuestions", "adminNotes",
    "adminFlashcards", "adminLeaderboard", "adminExamResults", "adminExamHistory", "adminPracticeHistory",
    "adminAnnouncements", "adminAnalytics", "adminGradeEssays", "adminSettings", "adminBrandManagement",
    "adminBrandAssets", "adminNotifications",
  ];

  const navActive = ["home"].includes(screen) ? "home"
    : ["courses", "courseDetail", "selectCourse", "notes", "practiceOptions", "flashcards", "quizSetup", "quizRun", "result", "bookmarks"].includes(screen) ? "courses"
    : ["community", "createPost", "postDetail", "communityGuidelines", "adminCommunity"].includes(screen) ? "community"
    : ["performance"].includes(screen) ? "results"
    : ["profile", "about", "settings", "editProfile", "savedPosts", "myPosts", "notifications", ...ADMIN_SCREENS].includes(screen) ? "profile" : "home";

  const showBottomNav = screen !== "quizRun" && screen !== "chat" && !AUTH_SCREENS.includes(screen);

  return (
    <BrandContext.Provider value={brand}>
    <div style={{
      maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: C.bg,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column",
      boxShadow: "0 0 40px rgba(21,101,192,0.08)", color: C.text,
    }}>
      <StartupErrorBanner text={startupError} onDismiss={() => setStartupError(null)} />
      <div key={screen} style={{ flex: 1, animation: "flFadeIn 0.28s ease" }}>{content}</div>
      {showBottomNav && <BottomNav active={navActive} onNav={(k) => {
        if (k === "results") go("performance", activeCourse);
        else go(k);
      }} />}
    </div>
    </BrandContext.Provider>
  );
}

/* ----------------------------- ERROR BOUNDARY (no more permanent blank screen) -----------------------------
   The app previously had ZERO error boundaries anywhere. Any uncaught
   exception during render — in any screen — unmounts the whole React tree,
   and since nothing catches it, the user is left on a permanently blank
   screen with no in-app way back (this is one of the ways a "can't get back,
   it just goes blank" report can happen, on top of any specific navigation
   bug). This wraps the whole app once, at the root, so a render error in any
   single screen shows a recoverable message instead of taking down
   everything silently. */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    EduSphere.Logger.error("[EduSphere] Uncaught render error — app would have gone blank without this boundary:", error, info && info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, textAlign: "center", background: "#0F1E33", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 12.5, color: "#9AA7B8", marginBottom: 20, maxWidth: 320, lineHeight: 1.5 }}>
            {this.state.error && this.state.error.message ? this.state.error.message : "An unexpected error occurred."}
          </div>
          <button onClick={() => window.location.reload()} style={{
            padding: "12px 24px", borderRadius: 12, border: "none", background: "#2563EB", color: "#fff",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}


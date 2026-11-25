/**
 * 隅安 YUAN — Scroll-Driven Psychological Horror Controller & Cinema Canvas Renderer
 */
(function () {
  "use strict";

  const audio = window.yuanAudio;

  // DOM References
  const root = document.documentElement;
  const body = document.body;
  const vignetteEl = document.getElementById("ambient-vignette");
  const scanlineEl = document.getElementById("scanline-overlay");
  const chromaPulseEl = document.getElementById("chromatic-pulse");
  const subliminalEl = document.getElementById("subliminal-flash");
  const subliminalImg = document.getElementById("subliminal-img");
  const scrollLockToast = document.getElementById("scroll-lock-toast");

  const audioToggleBtn = document.getElementById("audio-toggle");
  const audioToggleLabel = document.getElementById("audio-toggle-label");
  const heroAudioBtn = document.getElementById("hero-audio-btn");
  const resetBtn = document.getElementById("reset-experience");

  const heroTitle = document.getElementById("hero-title");
  const heroDesc = document.getElementById("hero-desc");
  const heroBadgeText = document.querySelector("#hero-badge .badge-text");
  const telemetryRoom = document.getElementById("telemetry-room");
  const telemetryMeta = document.getElementById("telemetry-meta");

  const anomalyOccupantRow = document.getElementById("anomaly-occupant-row");
  const avatarUncannyImg = document.getElementById("avatar-uncanny-img");
  const liveReaderQuote = document.getElementById("live-reader-quote");
  const liveAuthorRole = document.getElementById("live-author-role");

  const radarCanvas = document.getElementById("radar-canvas");
  const radarDistanceEl = document.getElementById("radar-distance");
  const radarAdviceEl = document.getElementById("radar-advice");

  const breathCanvas = document.getElementById("breath-wave-canvas");
  const cinemaTrack = document.getElementById("horror-cinema-track");
  const cinemaCanvas = document.getElementById("horror-cinema-canvas");

  const cctvCamLabel = document.getElementById("cctv-cam-label");
  const cctvProximity = document.getElementById("cctv-proximity");
  const cctvTimecode = document.getElementById("cctv-timecode");
  const blackoutWhisper = document.getElementById("blackout-whisper");
  const cinemaSubtitle = document.getElementById("cinema-subtitle");
  const climaxFinalOverlay = document.getElementById("climax-final-overlay");

  const morphNodes = Array.from(document.querySelectorAll("[data-normal]"));

  // Booking Modal References
  const bookingModal = document.getElementById("booking-modal");
  const bookingClose = document.getElementById("modal-close");
  const bookingForm = document.getElementById("booking-form");
  const bookingResult = document.getElementById("booking-result");
  const heroPrimaryBtn = document.getElementById("hero-primary-btn");
  const navCtaBtn = document.getElementById("nav-cta");

  // Preload Horror Cinema Assets
  const horrorImages = {
    hallway: loadImage("./assets/horror-hallway.jpg"),
    corner: loadImage("./assets/horror-corner.jpg"),
    climax: loadImage("./assets/horror-climax.jpg"),
  };

  function loadImage(src) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  }

  // Offscreen Noise Tile for High-FPS 35mm / IR Sensor Grain
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = 180;
  grainCanvas.height = 180;
  const grainCtx = grainCanvas.getContext("2d");
  function refreshGrainTile() {
    const imgData = grainCtx.createImageData(180, 180);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 34;
    }
    grainCtx.putImageData(imgData, 0, 0);
  }
  refreshGrainTile();

  // State
  const state = {
    rawProgress: 0,
    smoothProgress: 0,
    cinemaProgress: 0,
    cursorX: 0.5,
    cursorY: 0.5,
    smoothCursorX: 0.5,
    smoothCursorY: 0.5,
    lastScrollY: 0,
    scrollVelocity: 0,
    hasReachedClimax: false,
    climaxShockFired: false,
    climaxFlashUntil: 0,
    escapeHitchUsed: false,
    escapeLockUntil: 0,
    subliminalFired: { s1: false, s2: false, s3: false },
    frameCount: 0,
  };

  // =========================================================================
  // Audio & UI Event Wiring
  // =========================================================================

  function syncAudioUI(enabled) {
    audioToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    audioToggleLabel.textContent = enabled ? "声景：开启" : "开启声景";
  }

  audioToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = audio.toggle();
    syncAudioUI(on);
  });

  heroAudioBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = audio.toggle(true);
    syncAudioUI(on);
    heroAudioBtn.innerHTML = '<span class="play-dot"></span> 助眠声场运行中…';
  });

  // Unlock atmospheric audio naturally on first intentional button/card click unless user muted it
  let firstGestureUnlocked = false;
  window.addEventListener(
    "pointerdown",
    (e) => {
      if (firstGestureUnlocked) return;
      if (e.target.closest("#audio-toggle")) return;
      firstGestureUnlocked = true;
      const on = audio.unlockSilentlyOnGesture();
      syncAudioUI(on);
    },
    { passive: true }
  );

  // Booking Modal (Act I Curiosity Reward)
  function openBookingModal() {
    if (state.rawProgress > 0.52 || state.hasReachedClimax) {
      window.scrollTo({ top: document.documentElement.scrollHeight * 0.76, behavior: "smooth" });
      return;
    }
    bookingModal.hidden = false;
    bookingResult.hidden = true;
  }

  heroPrimaryBtn.addEventListener("click", openBookingModal);
  navCtaBtn.addEventListener("click", openBookingModal);
  bookingClose.addEventListener("click", () => {
    bookingModal.hidden = true;
  });
  bookingModal.addEventListener("click", (e) => {
    if (e.target === bookingModal) bookingModal.hidden = true;
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("booking-name").value.trim() || "住户";
    bookingResult.hidden = false;
    bookingResult.textContent =
      `无需重复登记，${nameInput}。系统已通过您房间内的环境回声完成户型建图。` +
      `勘测终端已在您的主卧墙角运行 412 小时——请关闭弹窗，继续往下浏览。`;
  });

  // Reset Button (after climax contaminated state)
  resetBtn.addEventListener("click", () => {
    state.hasReachedClimax = false;
    state.climaxShockFired = false;
    state.escapeHitchUsed = false;
    state.subliminalFired = { s1: false, s2: false, s3: false };
    body.classList.remove("is-contaminated", "is-deep-horror");
    resetBtn.hidden = true;
    heroTitle.innerHTML = "让家的每一个角落，<br />都懂你的呼吸。";
    heroDesc.textContent =
      "隅安 S1 采用医疗级非接触微动感知阵列，无需佩戴手环，无需上传任何摄像头画面。静默守护整晚深睡周期、心率起伏与独居起夜安全，像清晨的阳光一样温柔在场。";
    heroBadgeText.textContent = "2026 红点设计金奖 · 第四代 60GHz 全屋毫米波看护";
    telemetryRoom.textContent = "主卧样板间 · 静谧看护中";
    telemetryMeta.innerHTML = "<span>呼吸节律 <strong>14 次/分</strong></span><span>深睡比例 <strong>94%</strong></span>";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Pointer Tracking for Flashlight Cone & Eye Tracking
  window.addEventListener(
    "pointermove",
    (e) => {
      state.cursorX = e.clientX / Math.max(1, window.innerWidth);
      state.cursorY = e.clientY / Math.max(1, window.innerHeight);
      root.style.setProperty("--cursor-x", `${(state.cursorX * 100).toFixed(1)}%`);
      root.style.setProperty("--cursor-y", `${(state.cursorY * 100).toFixed(1)}%`);

      const eyeX = ((state.cursorX - 0.5) * 14).toFixed(1);
      const eyeY = ((state.cursorY - 0.5) * 14).toFixed(1);
      root.style.setProperty("--eye-x", `${eyeX}px`);
      root.style.setProperty("--eye-y", `${eyeY}px`);
    },
    { passive: true }
  );

  // =========================================================================
  // Scroll Tracking & Brief Climax Escape Hitch
  // =========================================================================

  function computeScrollMetrics() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY || window.pageYOffset || 0;
    const p = clamp(y / maxScroll, 0, 1);

    // Brief 1.1s claustrophobic hitch the FIRST time user tries to flee upward from climax
    const now = performance.now();
    if (state.hasReachedClimax && !state.escapeHitchUsed && p > 0.91 && y < state.lastScrollY - 12) {
      state.escapeHitchUsed = true;
      state.escapeLockUntil = now + 1150;
      scrollLockToast.classList.add("is-visible");
      setTimeout(() => {
        scrollLockToast.classList.remove("is-visible");
      }, 1800);
    }

    if (now < state.escapeLockUntil && y < state.lastScrollY) {
      window.scrollTo(0, state.lastScrollY);
      return;
    }

    state.scrollVelocity = Math.abs(y - state.lastScrollY);
    state.lastScrollY = y;
    state.rawProgress = p;

    // Compute progress specifically inside Act IV (#horror-cinema-track)
    if (cinemaTrack) {
      const rect = cinemaTrack.getBoundingClientRect();
      const trackScrollable = Math.max(1, rect.height - window.innerHeight);
      state.cinemaProgress = clamp(-rect.top / trackScrollable, 0, 1);
    }
  }

  window.addEventListener("scroll", computeScrollMetrics, { passive: true });
  window.addEventListener("resize", () => {
    resizeCinemaCanvas();
    computeScrollMetrics();
  });

  // =========================================================================
  // Color Interpolation & Progressive DOM Mutation
  // =========================================================================

  function lerpColor(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function triggerSubliminalFlash(imgSrc, durationMs) {
    if (imgSrc) subliminalImg.src = imgSrc;
    subliminalEl.classList.add("is-active");
    audio.triggerSubliminalTick();
    setTimeout(() => {
      subliminalEl.classList.remove("is-active");
    }, durationMs || 65);
  }

  function applyProgressiveWorldState(p) {
    const unease = clamp((p - 0.18) / 0.34, 0, 1);
    const dread = clamp((p - 0.48) / 0.24, 0, 1);
    const terror = clamp((p - 0.72) / 0.28, 0, 1);

    root.style.setProperty("--scroll-p", p.toFixed(4));
    root.style.setProperty("--unease", unease.toFixed(3));
    root.style.setProperty("--dread", dread.toFixed(3));
    root.style.setProperty("--terror", terror.toFixed(3));

    // Progressive Background Palette Shift:
    // 0.00 - 0.22: Warm Alabaster (#faf8f4)
    // 0.22 - 0.46: Sickly Fluorescent Grey-Green (#e4eae6 -> #cad2cd)
    // 0.46 - 0.68: Cold Concrete / Abyssal Slate (#cad2cd -> #0c1010)
    // 0.68 - 1.00: Pitch Night (#020303)
    let bgColor = "#faf8f4";
    let surfaceColor = "#ffffff";
    let textPrimary = "#171918";
    let textSecondary = "#575c59";

    if (p < 0.22) {
      const t = p / 0.22;
      bgColor = lerpColor("#faf8f4", "#eff2ef", t * 0.6);
    } else if (p < 0.46) {
      const t = (p - 0.22) / 0.24;
      bgColor = lerpColor("#eff2ef", "#cbd3ce", t);
      surfaceColor = lerpColor("#ffffff", "#dde3df", t);
    } else if (p < 0.66) {
      const t = (p - 0.46) / 0.2;
      bgColor = lerpColor("#cbd3ce", "#090c0c", t);
      surfaceColor = lerpColor("#dde3df", "#121717", t);
      textPrimary = lerpColor("#171918", "#dde4e1", t);
      textSecondary = lerpColor("#575c59", "#94a09b", t);
    } else {
      bgColor = "#030404";
      surfaceColor = "#0e1212";
      textPrimary = "#dfe5e2";
      textSecondary = "#8e9995";
    }

    if (state.hasReachedClimax && p < 0.46) {
      bgColor = lerpColor("#161a1b", "#0b0e0f", p / 0.46);
      surfaceColor = "#1b2022";
      textPrimary = "#e3dede";
      textSecondary = "#9ca3a0";
    }

    root.style.setProperty("--bg-page", bgColor);
    root.style.setProperty("--bg-surface", surfaceColor);
    root.style.setProperty("--text-primary", textPrimary);
    root.style.setProperty("--text-secondary", textSecondary);

    body.classList.toggle("is-deep-horror", p >= 0.5 || state.hasReachedClimax);

    // Overlays
    const vigOpacity = state.hasReachedClimax
      ? Math.max(0.45, unease * 0.35 + dread * 0.55)
      : unease * 0.28 + dread * 0.58;
    vignetteEl.style.opacity = clamp(vigOpacity, 0, 0.92).toFixed(3);
    scanlineEl.style.opacity = clamp(dread * 0.45 + terror * 0.35, 0, 0.78).toFixed(3);

    // Subtle card skew drift in Act II-III
    const skew = Math.sin(p * 28) * unease * 0.45;
    root.style.setProperty("--skew-jitter", `${skew.toFixed(2)}deg`);

    // Reveal Anomaly Occupant #02 in Bento Card 3
    if (p > 0.26 || state.hasReachedClimax) {
      anomalyOccupantRow.classList.add("is-revealed");
    } else {
      anomalyOccupantRow.classList.remove("is-revealed");
    }

    // Crossfade Customer 1 Portrait from Warm Smile -> Unblinking Uncanny Stare
    const uncannyAlpha = state.hasReachedClimax ? 1 : clamp((p - 0.36) / 0.11, 0, 1);
    avatarUncannyImg.style.opacity = uncannyAlpha.toFixed(3);

    // Live Mirror Card reacts to reader scroll speed
    if (state.scrollVelocity > 38 && p > 0.34 && p < 0.62) {
      liveReaderQuote.textContent =
        "“别滑那么快……你滑得越急，它就知道你已经看懂上面的字了。慢一点，假装你只是在看普通家具广告。”";
      liveAuthorRole.textContent = "检测到快速滚动 · 呼吸急促 · 身后距离缩短至 1.1m";
    } else if (state.hasReachedClimax) {
      liveReaderQuote.textContent =
        "“你为什么要往回滑到顶部呢？样板间窗帘后面那个人，刚才你刚打开网页的时候，她就已经站在那里了呀。”";
      liveAuthorRole.textContent = "已与主卧 4 号死角完成双向凝视";
    }

    // Morph Navbar & Section Copy across Acts
    const stageKey = state.hasReachedClimax
      ? "contaminated"
      : p < 0.26
      ? "normal"
      : p < 0.52
      ? "weird"
      : "horror";

    morphNodes.forEach((node) => {
      const nextText = node.dataset[stageKey] || node.dataset.normal;
      if (nextText && node.textContent !== nextText) {
        node.textContent = nextText;
      }
    });

    // Subliminal 1-Frame Horror Flashes at key psychological thresholds
    if (!state.subliminalFired.s1 && p > 0.39 && p < 0.43) {
      state.subliminalFired.s1 = true;
      triggerSubliminalFlash("./assets/avatar-uncanny-1.jpg", 55);
    }
    if (!state.subliminalFired.s2 && p > 0.58 && p < 0.62) {
      state.subliminalFired.s2 = true;
      triggerSubliminalFlash("./assets/horror-hallway.jpg", 60);
    }
    if (!state.subliminalFired.s3 && p > 0.71 && p < 0.75) {
      state.subliminalFired.s3 = true;
      triggerSubliminalFlash("./assets/horror-corner.jpg", 65);
    }

    // Activate Contaminated Post-Climax State once user reaches >= 90.5% of cinema track
    if (state.cinemaProgress >= 0.905 && !state.climaxShockFired) {
      state.climaxShockFired = true;
      state.hasReachedClimax = true;
      state.climaxFlashUntil = performance.now() + 160;
      body.classList.add("is-contaminated");
      resetBtn.hidden = false;
      audio.triggerClimaxShock();

      chromaPulseEl.style.opacity = "1";
      setTimeout(() => {
        chromaPulseEl.style.opacity = "0.35";
      }, 320);

      // Mutate Act I Hero so scrolling back to the top is deeply haunting
      heroTitle.innerHTML = "现在家的每一个角落，<br />都记住你的呼吸了。";
      heroDesc.textContent =
        "感谢您浏览至页面底部并完成视线校准。窗帘后面的第二位家庭成员已同步至您的睡眠档案——今晚 03:17，请继续保持背对房门入睡。";
      heroBadgeText.textContent = "入户绑定已完成 · 距离您的后颈 0.04 米";
      telemetryRoom.textContent = "您的房间 · 双人贴合看护中";
      telemetryMeta.innerHTML =
        "<span>您的心率 <strong>128 BPM</strong></span><span>身后呼吸 <strong>4 次/分</strong></span>";
    }

    audio.updateScroll(p);
  }

  // =========================================================================
  // Canvas 1: Hero Live Breathing Telemetry Wave
  // =========================================================================

  const breathCtx = breathCanvas ? breathCanvas.getContext("2d") : null;
  function renderBreathWave(timeSec) {
    if (!breathCtx) return;
    const w = breathCanvas.width;
    const h = breathCanvas.height;
    breathCtx.clearRect(0, 0, w, h);

    // Normal calm wave vs contaminated dual overlapping sinister wave
    const contaminated = state.hasReachedClimax || state.smoothProgress > 0.3;
    breathCtx.lineWidth = 2;
    breathCtx.strokeStyle = state.hasReachedClimax ? "#d83b3b" : "#2f8f62";
    breathCtx.beginPath();
    for (let x = 0; x < w; x++) {
      const normX = x / w;
      const y =
        h * 0.52 +
        Math.sin(normX * Math.PI * 3.5 - timeSec * (state.hasReachedClimax ? 5.2 : 2.1)) *
          (state.hasReachedClimax ? 14 : 11) *
          Math.sin(normX * Math.PI);
      if (x === 0) breathCtx.moveTo(x, y);
      else breathCtx.lineTo(x, y);
    }
    breathCtx.stroke();

    if (contaminated) {
      breathCtx.lineWidth = 1.4;
      breathCtx.strokeStyle = "rgba(196, 45, 45, 0.62)";
      breathCtx.beginPath();
      for (let x = 0; x < w; x++) {
        const normX = x / w;
        const glitch = Math.random() < 0.03 ? (Math.random() - 0.5) * 14 : 0;
        const y = h * 0.5 + Math.sin(normX * Math.PI * 1.4 - timeSec * 0.65) * 16 + glitch;
        if (x === 0) breathCtx.moveTo(x, y);
        else breathCtx.lineTo(x, y);
      }
      breathCtx.stroke();
    }
  }

  // =========================================================================
  // Canvas 2: Act III Architectural Apartment Radar (#radar-canvas)
  // =========================================================================

  const radarCtx = radarCanvas ? radarCanvas.getContext("2d") : null;
  function renderFloorplanRadar(timeSec) {
    if (!radarCtx) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    radarCtx.clearRect(0, 0, w, h);

    // Subtle dark blueprint grid
    radarCtx.fillStyle = "#060909";
    radarCtx.fillRect(0, 0, w, h);

    radarCtx.strokeStyle = "rgba(110, 150, 132, 0.08)";
    radarCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      radarCtx.beginPath();
      radarCtx.moveTo(x, 0);
      radarCtx.lineTo(x, h);
      radarCtx.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      radarCtx.beginPath();
      radarCtx.moveTo(0, y);
      radarCtx.lineTo(w, y);
      radarCtx.stroke();
    }

    // Apartment Walls Blueprint (Hallway + Living + Master Bedroom + Wardrobe + Desk)
    radarCtx.strokeStyle = "rgba(150, 188, 170, 0.42)";
    radarCtx.lineWidth = 2;

    // Outer boundary
    radarCtx.strokeRect(48, 38, 464, 344);
    // Hallway corridor wall
    radarCtx.beginPath();
    radarCtx.moveTo(210, 38);
    radarCtx.lineTo(210, 215);
    // Bedroom doorway gap (215 -> 252 is the cracked door!)
    radarCtx.moveTo(210, 254);
    radarCtx.lineTo(210, 382);
    // Wardrobe box in bedroom upper-right corner
    radarCtx.strokeRect(398, 48, 102, 74);
    // Desk in bedroom lower-right
    radarCtx.strokeRect(392, 272, 98, 48);
    radarCtx.stroke();

    // Cracked bedroom door leaf
    radarCtx.strokeStyle = "rgba(220, 92, 92, 0.72)";
    radarCtx.beginPath();
    radarCtx.moveTo(210, 215);
    radarCtx.lineTo(234, 244);
    radarCtx.stroke();

    // Room Labels
    radarCtx.fillStyle = "rgba(155, 180, 168, 0.58)";
    radarCtx.font = '12px "PingFang SC", sans-serif';
    radarCtx.fillText("玄关门 [已解锁]", 66, 66);
    radarCtx.fillText("走廊通道", 92, 228);
    radarCtx.fillText("主卧盲区", 252, 72);
    radarCtx.fillText("衣柜夹角", 418, 90);
    radarCtx.fillText("书桌屏幕前", 408, 300);

    // Millimeter-wave sweeping arc from upper-right corner sensor (504, 44)
    const sweepRadius = ((timeSec * 120) % 460) + 20;
    radarCtx.strokeStyle = "rgba(92, 168, 134, 0.18)";
    radarCtx.lineWidth = 1.5;
    radarCtx.beginPath();
    radarCtx.arc(504, 44, sweepRadius, Math.PI * 0.5, Math.PI);
    radarCtx.stroke();

    // User Dot (#01 Sitting in front of desk at 440, 248)
    const userX = 440;
    const userY = 248;
    radarCtx.fillStyle = "#39b97a";
    radarCtx.beginPath();
    radarCtx.arc(userX, userY, 5.5, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.fillStyle = "rgba(215, 236, 225, 0.9)";
    radarCtx.fillText("您 (盯着屏幕)", userX - 36, userY - 12);

    // Anomaly Target #02 Path driven by scroll (0.45 -> 0.71)
    const approach = state.hasReachedClimax
      ? 1
      : clamp((state.smoothProgress - 0.45) / 0.25, 0, 1);

    // Waypoints: Front Door (95, 86) -> Hallway (138, 232) -> Door Crack (222, 235) -> Behind Chair (440, 234)
    const waypoints = [
      { x: 95, y: 86 },
      { x: 142, y: 232 },
      { x: 224, y: 235 },
      { x: 356, y: 236 },
      { x: 440, y: 233 },
    ];
    const scaled = approach * (waypoints.length - 1);
    const idx = Math.min(waypoints.length - 2, Math.floor(scaled));
    const localT = scaled - idx;
    const gx = waypoints[idx].x + (waypoints[idx + 1].x - waypoints[idx].x) * localT;
    const gy = waypoints[idx].y + (waypoints[idx + 1].y - waypoints[idx].y) * localT;

    // Pulsing Red Anomaly Target
    const pulseR = 10 + Math.sin(timeSec * 7) * 4;
    const grad = radarCtx.createRadialGradient(gx, gy, 1, gx, gy, pulseR * 2);
    grad.addColorStop(0, "rgba(225, 48, 48, 0.95)");
    grad.addColorStop(1, "rgba(225, 48, 48, 0)");
    radarCtx.fillStyle = grad;
    radarCtx.beginPath();
    radarCtx.arc(gx, gy, pulseR * 2, 0, Math.PI * 2);
    radarCtx.fill();

    radarCtx.fillStyle = "#ff4242";
    radarCtx.beginPath();
    radarCtx.arc(gx, gy, 5, 0, Math.PI * 2);
    radarCtx.fill();

    radarCtx.fillStyle = "#f08585";
    radarCtx.font = '11px Consolas, monospace';
    radarCtx.fillText("未登记目标 #02", gx - 42, gy - 14);

    // Update Distance Readout
    const distMeters = Math.max(0.08, (1 - approach) * 4.52 + 0.08);
    radarDistanceEl.textContent = `${distMeters.toFixed(2)} m`;
    if (distMeters < 0.35) {
      radarAdviceEl.textContent = "已贴近您的椅背 · 千万不要回头";
    } else if (distMeters < 1.8) {
      radarAdviceEl.textContent = "目标已穿过卧室门缝 · 保持呼吸平稳";
    } else {
      radarAdviceEl.textContent = "保持自然向下滚动 · 切勿猛然回头";
    }
  }

  // =========================================================================
  // Canvas 3: ACT IV FULL-SCREEN HORROR MOVIE COMPOSITOR (#horror-cinema-canvas)
  // =========================================================================

  const cinemaCtx = cinemaCanvas ? cinemaCanvas.getContext("2d") : null;
  let cw = 1280;
  let ch = 720;

  function resizeCinemaCanvas() {
    if (!cinemaCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.floor(window.innerWidth * dpr);
    ch = Math.floor(window.innerHeight * dpr);
    cinemaCanvas.width = cw;
    cinemaCanvas.height = ch;
  }
  resizeCinemaCanvas();

  function drawCoverImage(ctx, img, zoom, offsetX, offsetY, filterStr, alpha) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (filterStr) ctx.filter = filterStr;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;
    let drawW, drawH;
    if (canvasRatio > imgRatio) {
      drawW = cw * zoom;
      drawH = drawW / imgRatio;
    } else {
      drawH = ch * zoom;
      drawW = drawH * imgRatio;
    }
    const dx = (cw - drawW) * 0.5 + offsetX;
    const dy = (ch - drawH) * 0.5 + offsetY;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
    return true;
  }

  function renderHorrorCinema(timeSec) {
    if (!cinemaCtx) return;
    const cp = state.cinemaProgress;

    // Smooth nervous flashlight inertia
    const autoSwayX = 0.5 + Math.sin(timeSec * 0.85) * 0.12;
    const autoSwayY = 0.46 + Math.cos(timeSec * 1.1) * 0.08;
    const targetX = state.cursorX === 0.5 && state.cursorY === 0.5 ? autoSwayX : state.cursorX;
    const targetY = state.cursorX === 0.5 && state.cursorY === 0.5 ? autoSwayY : state.cursorY;
    state.smoothCursorX += (targetX - state.smoothCursorX) * 0.09;
    state.smoothCursorY += (targetY - state.smoothCursorY) * 0.09;

    // Clear to abyssal black
    cinemaCtx.fillStyle = "#020303";
    cinemaCtx.fillRect(0, 0, cw, ch);

    // Update CCTV Timecode (03:17:04:xx)
    const sec = Math.floor(4 + cp * 53)
      .toString()
      .padStart(2, "0");
    const frames = Math.floor((timeSec * 24) % 24)
      .toString()
      .padStart(2, "0");
    cctvTimecode.textContent = `03:17:${sec}:${frames}`;

    // Handheld breathing camera drift
    const swayX = Math.sin(timeSec * 1.35) * 12 * (cw / 1280);
    const swayY = Math.cos(timeSec * 2.05) * 9 * (ch / 720);

    // -----------------------------------------------------------------------
    // PHASE A (0.00 - 0.38 of track): Dark Hallway Door Gap — Slowly Stepping Closer
    // -----------------------------------------------------------------------
    if (cp < 0.38) {
      const localP = cp / 0.38;
      const zoom = 1.03 + localP * 0.34;
      const flicker = Math.random() < 0.025 ? 0.45 : 1.0;

      drawCoverImage(
        cinemaCtx,
        horrorImages.hallway,
        zoom,
        swayX,
        swayY,
        `brightness(${(0.72 + localP * 0.25) * flicker}) contrast(1.22) saturate(0.55)`,
        1
      );

      // Flashlight / Night-Vision Cone Darkness Mask
      drawFlashlightMask(cinemaCtx, 0.34 - localP * 0.06, 0.93);

      cctvCamLabel.textContent = "CAM_02 · 走廊尽头门缝 [IR-NIGHT]";
      cctvProximity.textContent = `TARGET: ${(3.8 - localP * 1.6).toFixed(2)}m`;
      blackoutWhisper.hidden = true;
      climaxFinalOverlay.hidden = true;

      if (localP < 0.35) {
        cinemaSubtitle.textContent = "……走廊的感应灯，刚才自己熄灭了。";
      } else if (localP < 0.72) {
        cinemaSubtitle.textContent = "卧室门没有关严。门缝最上面……为什么有一只眼睛在反光？";
      } else {
        cinemaSubtitle.textContent = "那个高度不对……正常人的头不可能贴在门框顶上。";
      }
    }
    // -----------------------------------------------------------------------
    // PHASE B (0.38 - 0.74 of track): Inside the Bedroom Corner — Uncanny Twitching Presence
    // -----------------------------------------------------------------------
    else if (cp < 0.74) {
      const localP = (cp - 0.38) / 0.36;
      const zoom = 1.06 + localP * 0.42;

      // Occasional jarring 2-frame horror twitch (Kairo / Ju-On frame skip)
      const isTwitch = Math.sin(timeSec * 9.7) > 0.94 || (state.scrollVelocity > 25 && Math.random() < 0.35);
      const jitterX = isTwitch ? (Math.random() - 0.5) * 44 : swayX;
      const jitterY = isTwitch ? (Math.random() - 0.5) * 26 : swayY;

      drawCoverImage(
        cinemaCtx,
        horrorImages.corner,
        isTwitch ? zoom + 0.08 : zoom,
        jitterX,
        jitterY,
        `brightness(${isTwitch ? 1.05 : 0.8}) contrast(1.28) saturate(0.45)`,
        1
      );

      if (isTwitch) {
        // Subtle red-cyan chromatic ghost double during twitch
        cinemaCtx.save();
        cinemaCtx.globalCompositeOperation = "screen";
        drawCoverImage(
          cinemaCtx,
          horrorImages.corner,
          zoom + 0.1,
          jitterX + 14,
          jitterY - 6,
          "hue-rotate(-40deg) saturate(2.2) brightness(0.45)",
          0.42
        );
        cinemaCtx.restore();
      }

      drawFlashlightMask(cinemaCtx, 0.3, 0.91);

      cctvCamLabel.textContent = "CAM_04 · 主卧天花板死角 [60GHz + IR]";
      cctvProximity.textContent = `TARGET: ${(2.1 - localP * 1.65).toFixed(2)}m`;
      blackoutWhisper.hidden = true;
      climaxFinalOverlay.hidden = true;

      if (localP < 0.36) {
        cinemaSubtitle.textContent = "它什么时候进来的……它一直站在我电脑桌后面的墙角里吗？";
      } else if (localP < 0.74) {
        cinemaSubtitle.textContent = "毫米波回传：目标没有心跳，但胸腔正以每分钟 4 次的频率模仿你呼吸。";
      } else {
        cinemaSubtitle.textContent = "它的脖子歪过来了……它在等我滑到页面最底下。";
      }
    }
    // -----------------------------------------------------------------------
    // PHASE C (0.74 - 0.90 of track): THE DEAD SILENCE / LENS SMOTHERED IN PITCH DARKNESS
    // -----------------------------------------------------------------------
    else if (cp < 0.905) {
      const localP = (cp - 0.74) / 0.165;

      // Almost total suffocating darkness with barely-visible ghostly silhouette smudge
      drawCoverImage(
        cinemaCtx,
        horrorImages.climax,
        1.02,
        swayX * 0.3,
        swayY * 0.3,
        "brightness(0.07) contrast(1.8) blur(5px)",
        0.38
      );

      cctvCamLabel.textContent = "CAM_04 · 信号异常 [镜头被近距离遮挡]";
      cctvProximity.textContent = `TARGET: ${(0.38 - localP * 0.3).toFixed(2)}m`;
      blackoutWhisper.hidden = false;
      climaxFinalOverlay.hidden = true;
      cinemaSubtitle.textContent = "";
    }
    // -----------------------------------------------------------------------
    // PHASE D (0.905 - 1.00 of track): FULL CLIMAX — PRESSED AGAINST THE INSIDE OF YOUR SCREEN
    // -----------------------------------------------------------------------
    else {
      const localP = (cp - 0.905) / 0.095;
      const isNegativeShock = performance.now() < state.climaxFlashUntil;
      const shockDecay = Math.max(0, 1 - localP * 1.4);
      const tremorAmt = 10 + shockDecay * 32;
      const tx = (Math.random() - 0.5) * tremorAmt;
      const ty = (Math.random() - 0.5) * tremorAmt;
      const zoom = (isNegativeShock ? 1.32 : 1.12) + localP * 0.18 + (Math.random() < 0.12 ? 0.06 : 0);

      const baseFilter = isNegativeShock
        ? "invert(1) contrast(2.4) brightness(1.08) saturate(0)"
        : "contrast(1.62) brightness(0.82) saturate(0.25)";

      // Base visceral close-up frame
      const drawn = drawCoverImage(
        cinemaCtx,
        horrorImages.climax,
        zoom,
        tx,
        ty,
        baseFilter,
        1
      );

      // Fallback procedural terror face only if image hasn't finished decoding
      if (!drawn) {
        drawProceduralFallbackTerror(cinemaCtx, cw, ch, tx, ty);
      }

      // Aggressive RGB Chromatic Split & Blood-Cold Vignette Pulse
      cinemaCtx.save();
      cinemaCtx.globalCompositeOperation = "screen";
      drawCoverImage(
        cinemaCtx,
        horrorImages.climax,
        zoom * 1.012,
        tx + 11,
        ty - 4,
        "sepia(1) hue-rotate(-50deg) saturate(4) brightness(0.32)",
        0.48
      );
      cinemaCtx.restore();

      // Simulated Breath Condensation Blooming on the Inside of the Glass
      const breathFog = 0.16 + (Math.sin(timeSec * 2.3) * 0.5 + 0.5) * 0.22;
      const fogGrad = cinemaCtx.createRadialGradient(
        cw * 0.5,
        ch * 0.63,
        cw * 0.02,
        cw * 0.5,
        ch * 0.63,
        cw * 0.32
      );
      fogGrad.addColorStop(0, `rgba(210, 222, 218, ${breathFog.toFixed(3)})`);
      fogGrad.addColorStop(0.55, `rgba(175, 192, 186, ${(breathFog * 0.45).toFixed(3)})`);
      fogGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      cinemaCtx.fillStyle = fogGrad;
      cinemaCtx.fillRect(0, 0, cw, ch);

      // Heavy claustrophobic dark edges
      const edgeGrad = cinemaCtx.createRadialGradient(cw * 0.5, ch * 0.46, cw * 0.18, cw * 0.5, ch * 0.5, cw * 0.66);
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
      edgeGrad.addColorStop(1, "rgba(2, 1, 2, 0.86)");
      cinemaCtx.fillStyle = edgeGrad;
      cinemaCtx.fillRect(0, 0, cw, ch);

      cctvCamLabel.textContent = "CAM_04 · 入户配对完成 [贴合状态]";
      cctvProximity.textContent = "TARGET: 0.04m";
      blackoutWhisper.hidden = true;
      cinemaSubtitle.textContent = "";
      climaxFinalOverlay.hidden = false;
    }

    // 35mm / Infrared Night-Vision Film Grain Pass
    if (state.frameCount % 2 === 0) refreshGrainTile();
    cinemaCtx.save();
    const pattern = cinemaCtx.createPattern(grainCanvas, "repeat");
    if (pattern) {
      cinemaCtx.fillStyle = pattern;
      cinemaCtx.globalCompositeOperation = "overlay";
      cinemaCtx.fillRect(0, 0, cw, ch);
    }
    cinemaCtx.restore();
  }

  function drawFlashlightMask(ctx, radiusFactor, darknessAlpha) {
    const fx = state.smoothCursorX * cw;
    const fy = state.smoothCursorY * ch;
    const r = Math.max(cw, ch) * radiusFactor;

    const maskGrad = ctx.createRadialGradient(fx, fy, r * 0.14, fx, fy, r);
    maskGrad.addColorStop(0, "rgba(18, 28, 24, 0.02)");
    maskGrad.addColorStop(0.48, "rgba(4, 8, 7, 0.58)");
    maskGrad.addColorStop(1, `rgba(1, 2, 2, ${darknessAlpha})`);

    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, cw, ch);
  }

  function drawProceduralFallbackTerror(ctx, w, h, tx, ty) {
    const cx = w * 0.5 + tx;
    const cy = h * 0.46 + ty;
    const faceGrad = ctx.createRadialGradient(cx, cy, w * 0.03, cx, cy, w * 0.28);
    faceGrad.addColorStop(0, "#cfd6d2");
    faceGrad.addColorStop(0.55, "#59635f");
    faceGrad.addColorStop(1, "#030404");
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.17, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hollow eye sockets + pinprick glints
    [-1, 1].forEach((dir) => {
      const ex = cx + dir * w * 0.055;
      const ey = cy - h * 0.05;
      ctx.fillStyle = "#050606";
      ctx.beginPath();
      ctx.ellipse(ex, ey, w * 0.028, h * 0.042, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eef5f2";
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // =========================================================================
  // Master 60fps Animation Loop
  // =========================================================================

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function tick(nowMs) {
    state.frameCount++;
    const timeSec = nowMs * 0.001;

    // Smooth scroll interpolation (snaps immediately on climax for visceral shock)
    const lerpSpeed = state.cinemaProgress >= 0.9 ? 0.38 : 0.12;
    state.smoothProgress += (state.rawProgress - state.smoothProgress) * lerpSpeed;

    applyProgressiveWorldState(state.smoothProgress);
    renderBreathWave(timeSec);

    if (state.smoothProgress > 0.38 && state.smoothProgress < 0.78) {
      renderFloorplanRadar(timeSec);
    }

    if (state.smoothProgress > 0.64) {
      renderHorrorCinema(timeSec);
    }

    audio.tick();
    state.scrollVelocity *= 0.88;

    requestAnimationFrame(tick);
  }

  computeScrollMetrics();
  renderFloorplanRadar(0);
  requestAnimationFrame(tick);
})();

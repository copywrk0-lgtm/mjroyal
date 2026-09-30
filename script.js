const loader = document.getElementById("loader");
import('./scroll-motion.js').then(({startScrollMotion}) => startScrollMotion()).catch(() => {});
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const previewIntro = new URLSearchParams(location.search).get("intro") === "preview";
const introSeen = (() => {
  try { return sessionStorage.getItem("mjroyal-wire-intro-seen") === "1"; }
  catch { return false; }
})();
if ((!introSeen || previewIntro) && !reduceMotion && loader) {
  document.body.classList.add("loading");
  let finished = false;
  let cleanup = () => {};
  function finishIntro() {
    if (finished) return;
    finished = true;
    clearTimeout(safetyTimer);
    try { sessionStorage.setItem("mjroyal-wire-intro-seen", "1"); } catch {}
    loader.style.pointerEvents = "none";
    const origin = cleanup.flash?.() || {x:innerWidth/2,y:innerHeight*.28};
    const radius = Math.hypot(innerWidth,innerHeight);
    const glow = document.createElement("div");
    glow.setAttribute("aria-hidden", "true");
    glow.style.cssText = "position:absolute;left:0;top:0;width:12vmin;height:12vmin;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,.8) 12%,rgba(255,255,255,.2) 38%,transparent 70%);opacity:0;z-index:3";
    glow.style.left = origin.x+"px";
    glow.style.top = origin.y+"px";
    loader.appendChild(glow);
    glow.animate([
      {opacity:0,transform:"translate(-50%,-50%) scale(.15)"},
      {opacity:1,transform:"translate(-50%,-50%) scale(3)"}
    ], {duration:180,easing:"cubic-bezier(.2,.8,.3,1)",fill:"forwards"});
    const flash = document.createElement("div");
    flash.setAttribute("aria-hidden", "true");
    flash.style.cssText = "position:fixed;inset:0;z-index:120;background:#fff;opacity:0;pointer-events:none";
    document.body.appendChild(flash);
    const exposure = flash.animate([
      {opacity:0,clipPath:`circle(0px at ${origin.x}px ${origin.y}px)`},
      {opacity:1,clipPath:`circle(${radius}px at ${origin.x}px ${origin.y}px)`,offset:.20},
      {opacity:1,clipPath:`circle(${radius}px at ${origin.x}px ${origin.y}px)`,offset:.32},
      {opacity:.55,clipPath:`circle(${radius}px at ${origin.x}px ${origin.y}px)`,offset:.55},
      {opacity:0,clipPath:`circle(${radius}px at ${origin.x}px ${origin.y}px)`}
    ], {duration:900,delay:70,easing:"linear",fill:"forwards"});
    // Swap the camera for the homepage while the exposure is fully white.
    setTimeout(() => {
      cleanup();
      loader.remove();
      document.body.classList.remove("loading");
      document.querySelector(".hero")?.animate([
        {filter:"brightness(1.45) saturate(.7)"},
        {filter:"brightness(1) saturate(1)"}
      ], {duration:780,easing:"ease-out"});
    }, 310);
    exposure.finished.catch(() => {}).then(() => flash.remove());
  }
  let safetyTimer = setTimeout(finishIntro, 8000);
  document.getElementById("loader-skip")?.addEventListener("click", finishIntro);
  import("./camera-intro.js").then(({startCameraIntro}) => {
    if (finished) return;
    cleanup = startCameraIntro(document.getElementById("camera-stage"), finishIntro, {
      preview: previewIntro,
      onReady() { clearTimeout(safetyTimer); if (!previewIntro) safetyTimer = setTimeout(finishIntro, 5000); }
    });
  }).catch(() => finishIntro());
} else {
  loader?.remove();
  document.body.classList.remove("loading");
}

const menuButton = document.getElementById("menu");
const menuClose = document.getElementById("menu-close");
const menuPanel = document.getElementById("menu-panel");

function setMenu(open) {
  if (!menuPanel || !menuButton) return;
  menuPanel.classList.toggle("open", open);
  menuPanel.setAttribute("aria-hidden", String(!open));
  menuButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
}
menuButton?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));
menuPanel?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

const stories = {
  "om-divya": { title: "OM × DIVYA", kicker: "A STORY MEANT TO LAST", images: ["photo-08.webp","photo-10.webp","photo-12.webp","photo-14.webp"] },
  "quiet-before": { title: "THE QUIET BEFORE", kicker: "BRIDAL PORTRAIT", images: ["photo-14.webp","photo-02.webp","photo-09.webp"] },
  "together": { title: "TOGETHER", kicker: "WEDDING DAY", images: ["photo-05.webp","photo-03.webp","photo-06.webp","photo-13.webp"] },
  "vows": { title: "VOWS", kicker: "IN THE MOMENT", images: ["photo-12.webp","photo-15.webp","photo-04.webp"] },
  "simran": { title: "SIMRAN", kicker: "A CELEBRATION", images: ["photo-01.webp","photo-07.webp","photo-11.webp","photo-16.webp"] },
  "afterglow": { title: "AFTERGLOW", kicker: "PORTRAIT STUDY", images: ["photo-16.webp","photo-02.webp","photo-09.webp"] }
};

const viewer = document.getElementById("story-viewer");
const storyTitle = document.getElementById("story-title");
const storyKicker = document.getElementById("story-kicker");
const storyGallery = document.getElementById("story-gallery");
const storyClose = document.getElementById("story-close");

function openStory(key) {
  const story = stories[key];
  if (!story || !viewer) return;
  storyTitle.textContent = story.title;
  storyKicker.textContent = story.kicker;
  storyGallery.innerHTML = story.images
    .map((src, i) => `<img src="assets/${src}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" alt="${story.title} — MJ Royal wedding story">`)
    .join("");
  document.body.classList.add("story-open");
  viewer.showModal();
}
function closeStory() {
  if (!viewer?.open) return;
  viewer.close();
  document.body.classList.remove("story-open");
}
document.querySelectorAll(".story-card").forEach(card => {
  card.addEventListener("click", () => openStory(card.dataset.story));
});
storyClose?.addEventListener("click", closeStory);
viewer?.addEventListener("click", (e) => { if (e.target === viewer) closeStory(); });
viewer?.addEventListener("close", () => document.body.classList.remove("story-open"));

const film = document.getElementById("featured-film");
const filmPlay = document.getElementById("film-play");

filmPlay?.addEventListener("click", async () => {
  if (!film) return;
  if (film.paused) {
    await film.play().catch(() => {});
    filmPlay.textContent = "FULLSCREEN ↗";
  } else if (film.requestFullscreen) {
    film.requestFullscreen().catch(() => {});
  }
});

if ("IntersectionObserver" in window && film) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.45 && !reduceMotion) {
        film.play().catch(() => {});
      } else {
        film.pause();
      }
    });
  }, { threshold: [0, .45, .75] });
  observer.observe(film);
}

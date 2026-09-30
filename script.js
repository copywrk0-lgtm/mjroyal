const loader = document.getElementById("loader");
const flash = document.getElementById("flash");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const introSeen = (() => {
  try { return sessionStorage.getItem("mjroyal-intro-seen") === "1"; }
  catch { return false; }
})();

if (!introSeen && !reduceMotion && loader) {
  document.body.classList.add("loading");

  const reveal = () => {
    flash?.animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.28 },
        { opacity: 0.72, offset: 0.46 },
        { opacity: 0, offset: 1 }
      ],
      { duration: 1050, easing: "cubic-bezier(.16,.7,.2,1)", fill: "forwards" }
    );

    setTimeout(() => {
      if (loader) {
        loader.style.opacity = "0";
        loader.style.visibility = "hidden";
      }
    }, 155);

    const hero = document.querySelector(".hero");
    hero?.animate(
      [
        { filter: "brightness(2.15) saturate(.35)" },
        { filter: "brightness(1.25) saturate(.72)", offset: .35 },
        { filter: "none" }
      ],
      { duration: 1100, delay: 110, easing: "ease-out", fill: "both" }
    );

    setTimeout(() => {
      loader?.remove();
      document.body.classList.remove("loading");
      try { sessionStorage.setItem("mjroyal-intro-seen", "1"); } catch {}
    }, 1100);
  };

  window.addEventListener("load", () => setTimeout(reveal, 900), { once: true });
} else {
  loader?.remove();
  flash?.remove();
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
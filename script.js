document.body.classList.add("loading");

const loader = document.getElementById("loader");
const flash = document.getElementById("flash");

const reveal = () => {
  // First shutter burst.
  flash.animate(
    [
      { opacity: 0 },
      { opacity: 1, offset: 0.12 },
      { opacity: 1, offset: 0.28 },
      { opacity: 0.72, offset: 0.46 },
      { opacity: 0, offset: 1 }
    ],
    { duration: 1050, easing: "cubic-bezier(.16,.7,.2,1)", fill: "forwards" }
  );

  // The loader disappears while the flash is at peak exposure.
  setTimeout(() => {
    loader.style.opacity = "0";
    loader.style.visibility = "hidden";
  }, 155);

  // Let the hero resolve from overexposed to correctly exposed.
  const hero = document.querySelector(".hero");
  hero?.animate(
    [
      { filter: "brightness(2.2) saturate(.35)" },
      { filter: "brightness(1.28) saturate(.72)", offset: .35 },
      { filter: "brightness(1) saturate(1)" }
    ],
    { duration: 1300, delay: 120, easing: "ease-out", fill: "both" }
  );

  setTimeout(() => {
    loader.remove();
    document.body.classList.remove("loading");
  }, 1180);
};

window.addEventListener("load", () => {
  setTimeout(reveal, 1450);
});

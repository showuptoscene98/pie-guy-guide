window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragstart", (e) => e.preventDefault());

const viewer = document.getElementById("viewer");
const img = document.getElementById("mapImage");

let scale = 1;
let originX = 0;
let originY = 0;
let dragging = false;
let startX = 0;
let startY = 0;

function updateTransform() {
  img.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
}

function resetView() {
  scale = 1;
  originX = 0;
  originY = 0;
  updateTransform();
}

// uses dungeons folder 
function loadDungeon(file) {
  img.src = `dungeons/${file}`;
  resetView();
}

viewer.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = viewer.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const zoomFactor = 1.12;
  const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;

  originX = mx - (mx - originX) * (newScale / scale);
  originY = my - (my - originY) * (newScale / scale);

  scale = newScale;
  updateTransform();
});

img.addEventListener("mousedown", (e) => {
  dragging = true;
  startX = e.clientX - originX;
  startY = e.clientY - originY;
  img.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
  dragging = false;
  img.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  originX = e.clientX - startX;
  originY = e.clientY - startY;
  updateTransform();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.api.closeOverlay();
});

loadDungeon("Rahu Sewer.jpg");

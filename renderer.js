// Block right click and dragging images out of the app
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("dragstart", (e) => e.preventDefault());

function setActiveNav(id) {
  document.querySelectorAll(".navBtn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(id);
  if (btn) btn.classList.add("active");
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");
}

function go(name) {
  showPage(`page-${name}`);

  const navMap = {
    home: "navHome",
    maps: "navMaps",
    dungeons: "navDungeons",
    leveling: "navLeveling",
    tips: "navTips",
    about: "navAbout"
  };

  setActiveNav(navMap[name]);
}

// Default page on launch:
go("about");
// Leveling accordion: only one bracket open at a time
function setupLevelingAccordion() {
  const container = document.querySelector("#page-leveling .leveling");
  if (!container) return;

  const all = Array.from(container.querySelectorAll("details.lvl"));

  all.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      all.forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });
}

// run after DOM loads
window.addEventListener("DOMContentLoaded", setupLevelingAccordion);

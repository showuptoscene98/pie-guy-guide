// Stop right-click menu and stop dragging images out (logo + icons)
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

/**
 * Fetch zone and dungeon map images from Project Gorgon wiki when they don't exist locally.
 * Uses detailed "MarkedMap" (zones) and "PlayerMap" (dungeons) versions when available.
 * Run from project root: node scripts/fetch-wiki-maps.js [--force]
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const WIKI_API = "https://wiki.projectgorgon.com/w/api.php";
const force = process.argv.includes("--force");

// App map filename (in maps/) -> Wiki File: name (detailed/labeled when available)
const MAP_SOURCES = [
  { appFile: "AnagogeIsland.jpg", wikiFile: "AnagogeMarkedMap.jpg" },
  { appFile: "Eltibule.jpg", wikiFile: "EltibuleMarkedMap.jpg" },
  { appFile: "Fae Realm.jpg", wikiFile: "FaeRealmMarkedMap.jpg" },
  { appFile: "Gazluk.jpg", wikiFile: "GazlukMarkedMap.jpg" },
  { appFile: "Ilmari.jpg", wikiFile: "IlmariMarkedMap.jpg" },
  { appFile: "Kur Mountains.jpg", wikiFile: "KurMountainsMarkedMap.jpg" },
  { appFile: "Povus.jpg", wikiFile: "PovusMarkedMap.jpg" },
  { appFile: "Rahu.jpg", wikiFile: "RahuMarkedMap.jpg" },
  { appFile: "Serbule.jpg", wikiFile: "SerbuleMarkedMap.jpg" },
  { appFile: "SerbuleHills.jpg", wikiFile: "SerbuleHillsMarkedMap.jpg" },
  { appFile: "Sun Vale.jpg", wikiFile: "SunValeMarkedMap.jpg" },
  // Zones from https://wiki.projectgorgon.com/wiki/Zones (app uses .png placeholders; overwrite with .jpg when wiki has MarkedMap)
  { appFile: "StagingArea.jpg", wikiFile: "StagingAreaMarkedMap.jpg" },
  { appFile: "PhantomIlmariDesert.jpg", wikiFile: "PhantomIlmariDesertMarkedMap.jpg" },
  { appFile: "RedWingCasino.jpg", wikiFile: "RedWingCasinoMarkedMap.jpg" },
  { appFile: "Vidaria.jpg", wikiFile: "VidariaMarkedMap.jpg" },
  { appFile: "Statehelm.jpg", wikiFile: "StatehelmMarkedMap.jpg" },
  { appFile: "WinterNexus.jpg", wikiFile: "WinterNexusMarkedMap.jpg" },
];

// App display name -> Wiki File: name (PlayerMap = in-game style, detailed). Optional appFile = exact output filename.
const DUNGEON_SOURCES = [
  { displayName: "Goblin Dungeon Lower", wikiFile: "Goblin DungeonLowerLevelsPlayerMap.jpg" },
  { displayName: "Goblin Dungeon Upper", wikiFile: "Goblin DungeonUpperCellarPlayerMap.png" },
  { displayName: "Kur Tower", wikiFile: "Kur TowerPlayerMap.png" },
  { displayName: "Rahu Sewer", wikiFile: "Rahu SewerPlayerMap.png" },
  { displayName: "Serbule Crypt", wikiFile: "Serbule CryptPlayerMap.png" },
  { displayName: "Wolf Cave", wikiFile: "Wolf CavePlayerMap.png" },
  { displayName: "Yeti Cave", wikiFile: "Yeti CavePlayerMap.png" },
  { displayName: "Myconian Cave", wikiFile: "Myconian CavePlayerMap.png" },
  { displayName: "Labyrinth Map", wikiFile: "LabyrinthPlayerMap.jpeg" },
  { displayName: "Dark Chapel", wikiFile: "Dark ChapelPlayerMap.png", appFile: "Dark_Chapel.png" },
];

function getWikiImageUrl(wikiFileName) {
  return new Promise((resolve, reject) => {
    const title = "File:" + wikiFileName.replace(/ /g, "_");
    const url = `${WIKI_API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (ch) => (data += ch));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query?.pages || {};
          const page = Object.values(pages)[0];
          const info = page?.imageinfo?.[0];
          if (info?.url) {
            resolve(info.url.replace(/^http:/, "https:"));
          } else {
            reject(new Error("No image URL for " + wikiFileName));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function downloadToFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const mapsDir = path.join(projectRoot, "maps");
  const dungeonsDir = path.join(projectRoot, "dungeons");

  console.log("Checking zone maps...");
  for (const { appFile, wikiFile } of MAP_SOURCES) {
    const outPath = path.join(mapsDir, appFile);
    if (!force && fs.existsSync(outPath)) {
      console.log("  Skip (exists):", appFile);
      continue;
    }
    try {
      const url = await getWikiImageUrl(wikiFile);
      console.log("  Fetching:", wikiFile, "->", appFile);
      await downloadToFile(url, outPath);
      console.log("  Saved:", appFile);
    } catch (e) {
      console.error("  Error", appFile, e.message);
    }
  }

  console.log("\nChecking dungeon maps...");
  for (const { displayName, wikiFile, appFile: appFileOverride } of DUNGEON_SOURCES) {
    const ext = path.extname(wikiFile);
    const appFile = appFileOverride || displayName + ext;
    const outPath = path.join(dungeonsDir, appFile);
    if (!force && fs.existsSync(outPath)) {
      console.log("  Skip (exists):", appFile);
      continue;
    }
    try {
      const url = await getWikiImageUrl(wikiFile);
      console.log("  Fetching:", wikiFile, "->", appFile);
      await downloadToFile(url, outPath);
      console.log("  Saved:", appFile);
    } catch (e) {
      console.error("  Error", displayName, e.message);
    }
  }

  console.log("\nDone.");
}

main();

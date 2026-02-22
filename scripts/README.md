# Scripts

## fetch-wiki-maps.js

Downloads zone and dungeon map images from the [Project Gorgon Wiki](https://wiki.projectgorgon.com/wiki/) when they are missing locally. Uses the detailed **MarkedMap** (zones) and **PlayerMap** (dungeons) versions when available.

**Usage** (from project root):

```bash
node scripts/fetch-wiki-maps.js
```

- Only downloads files that don’t already exist in `maps/` or `dungeons/`.
- Use `--force` to re-download and overwrite existing files:

```bash
node scripts/fetch-wiki-maps.js --force
```

Zone maps are saved with the names the app expects (e.g. `Serbule.jpg`). Dungeon maps keep the wiki’s extension (e.g. `.png` or `.jpeg`). The app tries `.jpg`, `.png`, and `.jpeg` for each dungeon, so wiki-sourced images will load automatically after running the script.

## upload-release-asset.ps1

PowerShell script to create a GitHub release and upload the Windows installer. Requires `$env:GITHUB_TOKEN` with `repo` scope. See the script header for usage.

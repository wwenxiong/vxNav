const fs = require("fs");
const path = require("path");

function linkExternalPackages() {
  const nextNm = path.join(process.cwd(), ".next", "node_modules");
  if (!fs.existsSync(nextNm)) {
    try {
      fs.mkdirSync(nextNm, { recursive: true });
    } catch {
      // Ignore
    }
  }

  const chunksDir = path.join(process.cwd(), ".next", "server", "chunks");
  if (!fs.existsSync(chunksDir)) return;

  const targetPath = path.join(process.cwd(), "node_modules", "better-sqlite3");
  if (!fs.existsSync(targetPath)) return;

  try {
    const files = fs.readdirSync(chunksDir);
    const linked = new Set();
    for (const file of files) {
      if (!file.endsWith(".js")) continue;
      const content = fs.readFileSync(path.join(chunksDir, file), "utf8");
      const matches = content.matchAll(/better-sqlite3-[a-f0-9]+/g);
      for (const m of matches) {
        const linkName = m[0];
        if (linked.has(linkName)) continue;
        linked.add(linkName);

        const linkPath = path.join(nextNm, linkName);
        if (!fs.existsSync(linkPath)) {
          try {
            fs.symlinkSync(targetPath, linkPath, "junction");
            console.log(`[prepare-prod] Linked external module: ${linkName}`);
          } catch (err) {
            console.error(`[prepare-prod] Failed linking ${linkName}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("[prepare-prod] Error:", err.message);
  }
}

linkExternalPackages();

/**
 * Loader — entry point của MCP Jira extension.
 *
 * Trách nhiệm:
 * 1. Check GitHub release latest có version mới hơn không
 * 2. Nếu có, download bundle.js mới về cache
 * 3. require() bundle.js (ưu tiên cache, fallback bundle bundled trong DXT)
 *
 * Loader này CHỈ dùng Node.js builtins (https, fs, path, os) — không cần npm deps.
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const REPO = "nguyenquynh201/mcp-jira";
const CACHE_DIR = path.join(os.homedir(), ".mcp-jira-cache");
const CACHED_BUNDLE = path.join(CACHE_DIR, "bundle.js");
const CACHED_VERSION = path.join(CACHE_DIR, "version.txt");
const FALLBACK_BUNDLE = path.join(__dirname, "bundle.js");
const UPDATE_TIMEOUT_MS = 5000;

interface GhAsset {
  name: string;
  browser_download_url: string;
}
interface GhRelease {
  tag_name: string;
  assets: GhAsset[];
}

function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "mcp-jira-loader",
          Accept: "application/octet-stream, application/json, */*",
          ...headers,
        },
        timeout: UPDATE_TIMEOUT_MS,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchUrl(res.headers.location, headers).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} when fetching ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("Timeout"));
    });
    req.on("error", reject);
  });
}

function readCachedVersion(): string | null {
  try {
    return fs.readFileSync(CACHED_VERSION, "utf8").trim();
  } catch {
    return null;
  }
}

async function tryUpdate(): Promise<void> {
  const meta = JSON.parse(
    await fetchUrl(`https://api.github.com/repos/${REPO}/releases/latest`)
  ) as GhRelease;

  const latestVersion = meta.tag_name;
  const cachedVersion = readCachedVersion();

  if (cachedVersion === latestVersion && fs.existsSync(CACHED_BUNDLE)) {
    console.error(`[loader] Up-to-date (${cachedVersion})`);
    return;
  }

  const asset = meta.assets.find((a) => a.name === "bundle.js");
  if (!asset) {
    console.error(`[loader] Release ${latestVersion} không có bundle.js → bỏ qua update`);
    return;
  }

  console.error(
    `[loader] Update có sẵn: ${cachedVersion ?? "(chưa cache)"} → ${latestVersion}, đang tải...`
  );

  const code = await fetchUrl(asset.browser_download_url);

  if (code.length < 1000) {
    throw new Error(`bundle.js quá nhỏ (${code.length} bytes), nghi tải lỗi`);
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const tmp = CACHED_BUNDLE + ".tmp";
  fs.writeFileSync(tmp, code, "utf8");
  fs.renameSync(tmp, CACHED_BUNDLE);
  fs.writeFileSync(CACHED_VERSION, latestVersion, "utf8");

  console.error(`[loader] ✅ Đã cập nhật lên ${latestVersion}`);
}

function pickBundle(): string {
  if (fs.existsSync(CACHED_BUNDLE)) {
    console.error(`[loader] Sử dụng cached bundle: ${CACHED_BUNDLE}`);
    return CACHED_BUNDLE;
  }
  console.error(`[loader] Sử dụng fallback bundle (DXT): ${FALLBACK_BUNDLE}`);
  return FALLBACK_BUNDLE;
}

async function main() {
  try {
    await Promise.race([
      tryUpdate(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Update timeout")), UPDATE_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.error(
      `[loader] ⚠️ Update check thất bại: ${(err as Error).message} — dùng version hiện có`
    );
  }

  const bundlePath = pickBundle();
  try {
    require(bundlePath);
  } catch (err) {
    console.error(`[loader] ❌ Lỗi khi load bundle: ${(err as Error).message}`);
    if (bundlePath === CACHED_BUNDLE && fs.existsSync(FALLBACK_BUNDLE)) {
      console.error(`[loader] Thử fallback bundle...`);
      try {
        fs.unlinkSync(CACHED_BUNDLE);
        fs.unlinkSync(CACHED_VERSION);
      } catch {
        /* ignore */
      }
      require(FALLBACK_BUNDLE);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("[loader] FATAL:", err);
  process.exit(1);
});

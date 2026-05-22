const { createWriteStream, existsSync } = require("fs");
const { chmod, mkdir } = require("fs/promises");
const { dirname, join } = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const isLinux = process.platform === "linux";
const binaryName = "yt-dlp_linux";
const targetPath = join(
  process.cwd(),
  "node_modules",
  "youtube-dl-exec",
  "bin",
  binaryName
);

async function install() {
  if (!isLinux) {
    console.log("Skipping Linux yt-dlp binary install on non-Linux platform.");
    return;
  }

  if (existsSync(targetPath)) {
    console.log("Linux yt-dlp binary already installed.");
    return;
  }

  const releaseResponse = await fetch(
    "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN
      ? {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`,
          },
        }
      : undefined
  );

  if (!releaseResponse.ok) {
    throw new Error(`Unable to load yt-dlp release: ${releaseResponse.status}`);
  }

  const release = await releaseResponse.json();
  const asset = release.assets?.find((item) => item.name === binaryName);

  if (!asset?.browser_download_url) {
    throw new Error(`Unable to find ${binaryName} in the latest yt-dlp release.`);
  }

  const binaryResponse = await fetch(asset.browser_download_url);
  if (!binaryResponse.ok || !binaryResponse.body) {
    throw new Error(`Unable to download ${binaryName}: ${binaryResponse.status}`);
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(binaryResponse.body), createWriteStream(targetPath));
  await chmod(targetPath, 0o755);
  console.log(`Installed ${binaryName}.`);
}

install().catch((error) => {
  console.error(error);
  process.exit(1);
});

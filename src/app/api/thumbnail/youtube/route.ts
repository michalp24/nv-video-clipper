import { execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { join } from "path";

const THUMBNAIL_WIDTH = 1980;
const THUMBNAIL_HEIGHT = 1080;
const MIN_SOURCE_HEIGHT = 720;
const MAX_TIMESTAMP_SECONDS = 60 * 60 * 12;
const YT_DLP_TIMEOUT_MS = 45_000;
const FFMPEG_TIMEOUT_MS = 45_000;
const BROWSER_CAPTURE_TIMEOUT_MS = 45_000;
const LOCAL_FFMPEG_BINARY = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
const FFMPEG_BINARY =
  ffmpegPath && existsSync(ffmpegPath)
    ? ffmpegPath
    : existsSync(LOCAL_FFMPEG_BINARY)
      ? LOCAL_FFMPEG_BINARY
      : "ffmpeg";
const PYTHON_CANDIDATES = [
  process.env.PYTHON_PATH,
  "/opt/homebrew/bin/python3.13",
  "/opt/homebrew/bin/python3.12",
  "/usr/local/bin/python3.13",
  "/usr/local/bin/python3.12",
].filter(Boolean) as string[];

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function detailedErrorResponse(message: string, details: Record<string, string>, status = 400) {
  if (process.env.NODE_ENV === "production") {
    return errorResponse(message, status);
  }

  return NextResponse.json({ details, error: message }, { status });
}

function getYouTubeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429")) {
    return "YouTube is rate-limiting extraction right now. Try again later or configure yt-dlp cookies.";
  }

  if (message.toLowerCase().includes("sign in") || message.toLowerCase().includes("cookies")) {
    return "YouTube requires sign-in or cookies for this video. Configure YT_DLP_COOKIES_PATH on the server.";
  }

  if (message.includes("Timed out")) return message;

  return "Unable to extract that YouTube video.";
}

function getVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1) || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      return (
        parsedUrl.searchParams.get("v") ||
        parsedUrl.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ||
        null
      );
    }

    return null;
  } catch {
    return null;
  }
}

function isYouTubeUrl(url: string) {
  return Boolean(getVideoId(url));
}

function getYtDlpCommand() {
  if (process.env.YT_DLP_PATH) {
    return {
      argsPrefix: [] as string[],
      command: process.env.YT_DLP_PATH,
    };
  }

  const localBinary = join(process.cwd(), "bin", "yt-dlp");
  if (existsSync(localBinary)) {
    const pythonPath = PYTHON_CANDIDATES.find((candidate) => existsSync(candidate));

    if (pythonPath) {
      return {
        argsPrefix: [localBinary],
        command: pythonPath,
      };
    }

    return {
      argsPrefix: [] as string[],
      command: localBinary,
    };
  }

  const bundledLinuxBinary = join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    "yt-dlp_linux"
  );
  if (process.platform === "linux" && existsSync(bundledLinuxBinary)) {
    return {
      argsPrefix: [] as string[],
      command: bundledLinuxBinary,
    };
  }

  const bundledBinary = join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    "yt-dlp"
  );
  if (existsSync(bundledBinary)) {
    const pythonPath = PYTHON_CANDIDATES.find((candidate) => existsSync(candidate));

    if (pythonPath) {
      return {
        argsPrefix: [bundledBinary],
        command: pythonPath,
      };
    }
  }

  return {
    argsPrefix: [] as string[],
    command: "yt-dlp",
  };
}

function buildYtDlpArgs(url: string, args: string[], playerClient?: string) {
  const finalArgs = [
    "--no-warnings",
    "--no-playlist",
    "--user-agent",
    "Mozilla/5.0",
    ...args,
  ];

  if (playerClient) {
    finalArgs.splice(2, 0, "--extractor-args", `youtube:player_client=${playerClient}`);
  }

  if (process.env.YT_DLP_COOKIES_PATH) {
    finalArgs.push("--cookies", process.env.YT_DLP_COOKIES_PATH);
  }

  finalArgs.push(url);
  return finalArgs;
}

async function runYtDlp(args: string[], timeoutMessage: string) {
  const { argsPrefix, command } = getYtDlpCommand();

  return new Promise<string>((resolve, reject) => {
    execFile(command, [...argsPrefix, ...args], {
      maxBuffer: 1024 * 1024 * 8,
      timeout: YT_DLP_TIMEOUT_MS,
    }, (error, stdout, stderr) => {
      if (error) {
        if ("killed" in error && error.killed) {
          reject(new Error(timeoutMessage));
          return;
        }

        reject(new Error(stderr || error.message));
        return;
      }

      resolve(stdout);
    });
  });
}

type YtDlpInfo = {
  duration?: number;
  height?: number;
  id?: string;
  title?: string;
  url?: string;
  width?: number;
};

async function getVideoInfo(url: string) {
  const args = ["--dump-single-json"];
  const timeoutMessage = "Timed out while loading YouTube video details.";
  let stdout: string;

  try {
    stdout = await runYtDlp(buildYtDlpArgs(url, args), timeoutMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("sign in") && !message.includes("429")) {
      throw error;
    }

    stdout = await runYtDlp(buildYtDlpArgs(url, args, "android,ios"), timeoutMessage);
  }

  const info = JSON.parse(stdout) as YtDlpInfo;
  const durationSeconds = Math.floor(Number(info.duration || 0));
  const title = info.title || "YouTube video";

  return {
    durationSeconds,
    title,
    videoId: info.id || getVideoId(url) || "youtube",
  };
}

type StreamInfo = {
  height: number;
  streamUrl: string;
  width: number;
};

async function getStreamInfo(url: string): Promise<StreamInfo> {
  const args = [
      "-f",
      "bestvideo[height>=1080][ext=mp4]/bestvideo[height>=1080]/bestvideo[ext=mp4]/bestvideo/best",
      "--dump-single-json",
    ];
  const timeoutMessage = "Timed out while resolving the YouTube video stream.";
  let stdout: string;

  try {
    stdout = await runYtDlp(buildYtDlpArgs(url, args), timeoutMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("sign in") && !message.includes("429")) {
      throw error;
    }

    stdout = await runYtDlp(buildYtDlpArgs(url, args, "android,ios"), timeoutMessage);
  }

  const info = JSON.parse(stdout) as YtDlpInfo;
  const streamUrl = info.url;

  if (!streamUrl) {
    throw new Error("yt-dlp did not return a playable stream URL.");
  }

  return {
    height: Math.floor(Number(info.height || 0)),
    streamUrl,
    width: Math.floor(Number(info.width || 0)),
  };
}

function captureFrameFromStream(streamUrl: string, timestamp: number) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    timestamp.toString(),
    "-user_agent",
    "Mozilla/5.0",
    "-i",
    streamUrl,
    "-frames:v",
    "1",
    "-vf",
    `scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=increase,crop=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}`,
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "pipe:1",
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const ffmpeg = spawn(FFMPEG_BINARY, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    let stderr = "";
    const timeout = setTimeout(() => {
      ffmpeg.kill("SIGKILL");
      reject(new Error("Timed out while capturing the thumbnail."));
    }, FFMPEG_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
    };

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", (error) => {
      cleanup();
      reject(new Error(`FFmpeg failed to start: ${error.message}`));
    });

    ffmpeg.on("close", (code) => {
      cleanup();
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
        return;
      }

      reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

function getBrowserCaptureOrigin() {
  if (process.env.YOUTUBE_CAPTURE_ORIGIN) {
    return process.env.YOUTUBE_CAPTURE_ORIGIN;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://thumbnail-clipper.local";
}

async function captureFrameFromYouTubeEmbed(videoId: string, timestamp: number) {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const browserArgs = [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-dev-shm-usage",
    "--no-sandbox",
  ];

  const browser = await (async () => {
    if (isServerless || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
      const [{ chromium }, chromiumPackage] = await Promise.all([
        import("playwright-core"),
        import("@sparticuz/chromium"),
      ]);
      const chromiumBinary = chromiumPackage.default;
      const executablePath =
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        await chromiumBinary.executablePath();

      return chromium.launch({
        args: [...chromiumBinary.args, ...browserArgs],
        executablePath,
        headless: true,
      });
    }

    const { chromium } = await import("playwright");

    return chromium.launch({
      args: browserArgs,
      headless: true,
    });
  })();

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: {
        height: THUMBNAIL_HEIGHT,
        width: THUMBNAIL_WIDTH,
      },
    });

    const captureOrigin = getBrowserCaptureOrigin();
    const captureUrl = `${captureOrigin}/capture`;
    const targetTimestamp = Math.max(0, Math.floor(timestamp));
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            html, body, #player {
              background: #000;
              height: 100%;
              margin: 0;
              overflow: hidden;
              width: 100%;
            }

            iframe {
              border: 0;
              display: block;
              height: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="player"></div>
          <script>
            const targetTimestamp = ${JSON.stringify(targetTimestamp)};
            const videoId = ${JSON.stringify(videoId)};
            window.captureState = {
              currentTime: 0,
              duration: 0,
              error: null,
              loadedFraction: 0,
              playerState: -1,
              ready: false
            };

            function updateCaptureState(player) {
              try {
                window.captureState.currentTime = player.getCurrentTime();
                window.captureState.duration = player.getDuration();
                window.captureState.loadedFraction = player.getVideoLoadedFraction();
                window.captureState.playerState = player.getPlayerState();
              } catch (error) {
                window.captureState.error = error && error.message ? error.message : String(error);
              }
            }

            window.onYouTubeIframeAPIReady = function () {
              window.player = new YT.Player("player", {
                height: "${THUMBNAIL_HEIGHT}",
                videoId,
                width: "${THUMBNAIL_WIDTH}",
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  disablekb: 1,
                  enablejsapi: 1,
                  fs: 0,
                  iv_load_policy: 3,
                  modestbranding: 1,
                  mute: 1,
                  origin: ${JSON.stringify(captureOrigin)},
                  playsinline: 1,
                  rel: 0,
                  start: targetTimestamp
                },
                events: {
                  onError(event) {
                    window.captureState.error = "YouTube player error " + event.data;
                  },
                  onReady(event) {
                    const player = event.target;
                    window.captureState.ready = true;
                    player.mute();
                    if (player.setPlaybackQualityRange) player.setPlaybackQualityRange("hd1080");
                    if (player.setPlaybackQuality) player.setPlaybackQuality("hd1080");
                    player.seekTo(targetTimestamp, true);
                    player.playVideo();
                    updateCaptureState(player);
                    window.captureInterval = window.setInterval(() => updateCaptureState(player), 100);
                  },
                  onStateChange(event) {
                    window.captureState.playerState = event.data;
                    updateCaptureState(event.target);
                  }
                }
              });
            };
          </script>
          <script src="https://www.youtube.com/iframe_api"></script>
        </body>
      </html>`;

    await page.route(captureUrl, (route) => {
      route.fulfill({
        body: html,
        contentType: "text/html; charset=utf-8",
      });
    });

    await page.goto(captureUrl, {
      timeout: BROWSER_CAPTURE_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => {
        const state = (window as unknown as {
          captureState?: { error: string | null; ready: boolean };
        }).captureState;
        return Boolean(state?.ready || state?.error);
      },
      null,
      { timeout: BROWSER_CAPTURE_TIMEOUT_MS }
    );

    const initialError = await page.evaluate(() => {
      const state = (window as unknown as {
        captureState?: { error?: string | null };
      }).captureState;
      return state?.error || null;
    });

    if (initialError) {
      throw new Error(initialError);
    }

    await page.evaluate((seconds) => {
      const player = (window as unknown as {
        player?: {
          mute: () => void;
          pauseVideo: () => void;
          playVideo: () => void;
          seekTo: (seconds: number, allowSeekAhead: boolean) => void;
          setPlaybackQuality?: (quality: string) => void;
          setPlaybackQualityRange?: (quality: string) => void;
        };
      }).player;

      player?.mute();
      player?.setPlaybackQualityRange?.("hd1080");
      player?.setPlaybackQuality?.("hd1080");
      player?.seekTo(seconds, true);
      player?.playVideo();
    }, targetTimestamp);

    await page.waitForFunction(
      (seconds) => {
        const state = (window as unknown as {
          captureState?: {
            currentTime: number;
            error: string | null;
            loadedFraction: number;
            playerState: number;
          };
        }).captureState;

        if (!state || state.error) return true;

        return (
          state.loadedFraction > 0 &&
          Math.abs(state.currentTime - Number(seconds)) <= 1.5 &&
          (state.playerState === 1 || state.playerState === 2)
        );
      },
      targetTimestamp,
      { timeout: BROWSER_CAPTURE_TIMEOUT_MS }
    );

    const seekError = await page.evaluate(() => {
      const state = (window as unknown as {
        captureState?: { error?: string | null };
      }).captureState;
      return state?.error || null;
    });

    if (seekError) {
      throw new Error(seekError);
    }

    const playerFrame = page
      .frames()
      .find((frame) => frame.url().includes("youtube.com/embed/"));

    await playerFrame?.addStyleTag({
      content: `
        .ytp-ce-element,
        .ytp-cards-button,
        .ytp-chrome-bottom,
        .ytp-chrome-top,
        .ytp-gradient-bottom,
        .ytp-gradient-top,
        .ytp-large-play-button,
        .ytp-pause-overlay,
        .ytp-share-button,
        .ytp-show-cards-title,
        .ytp-title,
        .ytp-watermark,
        .ytp-youtube-button {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `,
    }).catch(() => undefined);

    await page.evaluate(() => {
      const player = (window as unknown as {
        player?: { pauseVideo: () => void };
      }).player;
      player?.pauseVideo();
    });
    await page.waitForTimeout(350);

    const canvasImage = await playerFrame?.evaluate(
      ({ height, width }) => {
        const video = document.querySelector("video");
        if (!(video instanceof HTMLVideoElement)) {
          throw new Error("The YouTube video element was not available.");
        }

        if (!video.videoWidth || !video.videoHeight) {
          throw new Error("The YouTube video frame is not ready.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to create a browser capture canvas.");
        }

        const outputRatio = width / height;
        const sourceRatio = video.videoWidth / video.videoHeight;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = video.videoWidth;
        let sourceHeight = video.videoHeight;

        if (sourceRatio > outputRatio) {
          sourceWidth = video.videoHeight * outputRatio;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else if (sourceRatio < outputRatio) {
          sourceHeight = video.videoWidth / outputRatio;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }

        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height
        );

        return canvas.toDataURL("image/png");
      },
      {
        height: THUMBNAIL_HEIGHT,
        width: THUMBNAIL_WIDTH,
      }
    ).catch(() => null);

    if (canvasImage) {
      return Buffer.from(canvasImage.split(",")[1] || "", "base64");
    }

    return Buffer.from(await page.screenshot({
      fullPage: false,
      type: "png",
    }));
  } finally {
    await browser.close();
  }
}

type ThumbnailSource = "browser-screenshot" | "exact-frame";

function thumbnailResponse(image: Buffer, filename: string, source: ThumbnailSource, title?: string) {
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "image/png",
      "X-Thumbnail-Source": source,
      ...(title ? { "X-Video-Title": encodeURIComponent(title) } : {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();

  if (!url || !isYouTubeUrl(url)) {
    return errorResponse("Enter a valid YouTube URL.");
  }

  try {
    const { durationSeconds, title, videoId } = await getVideoInfo(url);

    return NextResponse.json({
      durationSeconds,
      title,
      videoId,
    });
  } catch (error) {
    console.error("YouTube info error:", error);
    return errorResponse(getYouTubeErrorMessage(error), 502);
  }
}

export async function POST(request: NextRequest) {
  let body: { timestamp?: unknown; url?: unknown };

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.");
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const timestamp = Number(body.timestamp);

  if (!url || !isYouTubeUrl(url)) {
    return errorResponse("Enter a valid YouTube URL.");
  }

  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > MAX_TIMESTAMP_SECONDS) {
    return errorResponse("Choose a valid timestamp.");
  }

  try {
    let durationSeconds = 0;
    let title = "YouTube video";
    let videoId = getVideoId(url) || "youtube";

    try {
      const videoInfo = await getVideoInfo(url);
      durationSeconds = videoInfo.durationSeconds;
      title = videoInfo.title;
      videoId = videoInfo.videoId;
    } catch (infoError) {
      console.warn("YouTube info unavailable, using browser capture:", infoError);
    }

    if (durationSeconds > 0 && timestamp > durationSeconds) {
      return errorResponse("The timestamp is beyond the end of the video.");
    }

    let stream: StreamInfo | null = null;

    try {
      stream = await getStreamInfo(url);
    } catch (streamError) {
      console.warn("YouTube stream unavailable, using browser capture:", streamError);
    }

    if (!stream || (stream.height > 0 && stream.height < MIN_SOURCE_HEIGHT)) {
      const image = await captureFrameFromYouTubeEmbed(videoId, timestamp);

      return thumbnailResponse(
        image,
        `thumbnail-${videoId}-${Math.round(timestamp)}s-screenshot.png`,
        "browser-screenshot",
        title
      );
    }

    const image = await captureFrameFromStream(stream.streamUrl, timestamp);

    return thumbnailResponse(
      image,
      `thumbnail-${videoId}-${Math.round(timestamp)}s.png`,
      "exact-frame",
      title
    );
  } catch (error) {
    console.error("YouTube thumbnail error:", error);
    const videoId = getVideoId(url);
    const originalError = error instanceof Error ? error.message : String(error);

    return detailedErrorResponse(
      "Exact timestamp frame capture failed.",
      {
        originalError,
        videoId: videoId || "none",
      },
      502
    );
  }
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

const THUMBNAIL_WIDTH = 1980;
const THUMBNAIL_HEIGHT = 1080;
const MAX_YOUTUBE_TIMESTAMP_SECONDS = 60 * 60 * 12;
const YOUTUBE_QUALITY_ORDER = [
  "highres",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
  "tiny",
  "auto",
];

type SourceType = "direct" | "youtube" | null;
type GeneratedThumbnail = {
  filename: string;
  source: "browser-tab-frame" | "browser-screenshot" | "direct-frame" | "exact-frame";
  url: string;
};
type YouTubePlayer = {
  destroy: () => void;
  getAvailableQualityLevels?: () => string[];
  getDuration: () => number;
  getPlaybackQuality?: () => string;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackQuality?: (quality: string) => void;
  setPlaybackQualityRange?: (smallestQuality: string, largestQuality?: string) => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
          };
          height?: string;
          playerVars?: Record<string, string | number>;
          videoId: string;
          width?: string;
        }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube player is only available in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      window.onYouTubeIframeAPIReady = () => resolve();

      if (existingScript) {
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => reject(new Error("Unable to load the YouTube player."));
      document.body.appendChild(script);
    });
  }

  return youtubeApiPromise;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00:00";

  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const mins = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    mins.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
}

function parseTimecode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !/^\d{1,2}$/.test(part))) return null;

  const [hours, minutes, seconds] =
    parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)];

  if (minutes > 59 || seconds > 59) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

function getYouTubeVideoId(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1) || null;
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v") || parsedUrl.pathname.split("/").pop() || null;
    }
  } catch {
    return null;
  }

  return null;
}

function isYouTubeUrl(url: string) {
  return Boolean(getYouTubeVideoId(url));
}

function waitForSeek(video: HTMLVideoElement, timestamp: number) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };

    const handleSeeked = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Unable to seek to that timestamp."));
    };

    if (Math.abs(video.currentTime - timestamp) < 0.05) {
      resolve();
      return;
    }

    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = timestamp;
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getBestYouTubeQuality(player: YouTubePlayer) {
  const availableQualities = player.getAvailableQualityLevels?.() || [];
  const availableSet = new Set(availableQualities);

  return (
    YOUTUBE_QUALITY_ORDER.find((quality) => availableSet.has(quality)) ||
    availableQualities[0] ||
    "hd1080"
  );
}

function requestBestYouTubeQuality(player: YouTubePlayer) {
  const bestQuality = getBestYouTubeQuality(player);

  player.setPlaybackQualityRange?.(bestQuality, bestQuality);
  player.setPlaybackQuality?.(bestQuality);

  return bestQuality;
}

export default function ThumbnailPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePreviewFrameRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const timestampRef = useRef(0);
  const [urlInput, setUrlInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [hasKnownDuration, setHasKnownDuration] = useState(false);
  const [timestamp, setTimestamp] = useState(0);
  const [timestampInput, setTimestampInput] = useState("00:00:00");
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isYouTubePlayerReady, setIsYouTubePlayerReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScreenCaptureMode, setIsScreenCaptureMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generatedThumbnail, setGeneratedThumbnail] = useState<GeneratedThumbnail | null>(null);

  const timestampLabel = useMemo(() => formatTime(timestamp), [timestamp]);
  const canCapture = isVideoReady && !isCapturing && !isLoadingVideo && videoDuration > 0;

  useEffect(() => {
    timestampRef.current = timestamp;
  }, [timestamp]);

  useEffect(() => {
    return () => {
      if (generatedThumbnail) {
        URL.revokeObjectURL(generatedThumbnail.url);
      }
    };
  }, [generatedThumbnail]);

  useEffect(() => {
    if (sourceType !== "youtube" || !youtubeVideoId || !youtubeContainerRef.current) {
      return;
    }

    let isCancelled = false;
    setIsYouTubePlayerReady(false);

    loadYouTubeApi()
      .then(() => {
        if (isCancelled || !window.YT?.Player || !youtubeContainerRef.current) return;

        youtubePlayerRef.current?.destroy();
        youtubeContainerRef.current.innerHTML = "";

        youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
          height: "100%",
          videoId: youtubeVideoId,
          width: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            vq: "hd2160",
          },
          events: {
            onReady: ({ target }) => {
              if (isCancelled) return;

              const duration = Math.floor(target.getDuration());
              if (Number.isFinite(duration) && duration > 0) {
                setVideoDuration(duration);
                setHasKnownDuration(true);
                setTimestamp((currentTimestamp) => Math.min(currentTimestamp, duration));
              }

              target.mute();
              requestBestYouTubeQuality(target);
              target.seekTo(timestampRef.current, true);
              setIsYouTubePlayerReady(true);
            },
          },
        });
      })
      .catch((playerError) => {
        setError(playerError instanceof Error ? playerError.message : "Unable to load the YouTube player.");
      });

    return () => {
      isCancelled = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [sourceType, youtubeVideoId]);

  useEffect(() => {
    if (sourceType !== "youtube" || !isYouTubePlayerReady || !youtubePlayerRef.current) {
      return;
    }

    youtubePlayerRef.current.seekTo(timestamp, true);
    youtubePlayerRef.current.mute();
    requestBestYouTubeQuality(youtubePlayerRef.current);
    youtubePlayerRef.current.playVideo();

    const pauseTimer = window.setTimeout(() => {
      youtubePlayerRef.current?.pauseVideo();
    }, 450);

    return () => window.clearTimeout(pauseTimer);
  }, [isYouTubePlayerReady, sourceType, timestamp]);

  const handleLoadVideo = useCallback(async () => {
    const nextUrl = urlInput.trim();

    setError("");
    setNotice("");
    setGeneratedThumbnail(null);
    setIsVideoReady(false);
    setIsLoadingVideo(false);
    setIsYouTubePlayerReady(false);
    setVideoDuration(0);
    setTimestamp(0);
    setTimestampInput("00:00:00");
    setVideoTitle("");
    setHasKnownDuration(false);
    setYoutubeVideoId("");
    setSourceType(null);

    if (!nextUrl) {
      setError("Paste a direct video URL first.");
      setVideoUrl("");
      return;
    }

    try {
      new URL(nextUrl);
    } catch {
      setError("Enter a valid video URL.");
      setVideoUrl("");
      return;
    }

    if (isYouTubeUrl(nextUrl)) {
      const parsedVideoId = getYouTubeVideoId(nextUrl) || "";

      try {
        setIsLoadingVideo(true);
        const response = await fetch(`/api/thumbnail/youtube?url=${encodeURIComponent(nextUrl)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load that YouTube video.");
        }

        const durationSeconds = Math.floor(Number(data.durationSeconds));
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
          throw new Error("This YouTube video does not expose a fixed duration.");
        }

        setVideoUrl(nextUrl);
        setSourceType("youtube");
        setYoutubeVideoId(data.videoId || parsedVideoId);
        setVideoTitle(data.title || "YouTube video");
        setVideoDuration(durationSeconds);
        setHasKnownDuration(true);
        setIsVideoReady(true);
      } catch (loadError) {
        setVideoUrl(nextUrl);
        setSourceType("youtube");
        setYoutubeVideoId(parsedVideoId);
        setVideoTitle("YouTube video");
        setVideoDuration(MAX_YOUTUBE_TIMESTAMP_SECONDS);
        setHasKnownDuration(false);
        setIsVideoReady(Boolean(parsedVideoId));
        setError("");
        setNotice("");
      } finally {
        setIsLoadingVideo(false);
      }
      return;
    }

    setSourceType("direct");
    setVideoUrl(nextUrl);
  }, [urlInput]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      setIsVideoReady(false);
      setError("This video does not expose a fixed duration, so a timestamp cannot be selected.");
      return;
    }

    setVideoDuration(Math.floor(video.duration));
    setTimestamp(0);
    setTimestampInput("00:00:00");
    setIsVideoReady(true);
    setHasKnownDuration(true);
    setSourceType("direct");
    setError("");
    setNotice("");
  }, []);

  const handleVideoError = useCallback(() => {
    setIsVideoReady(false);
    setError("That video could not be loaded. Use a direct MP4, MOV, or WebM URL that allows browser playback.");
  }, []);

  const handleTimestampChange = useCallback((nextValue: number, shouldFormatInput = true) => {
    const safeValue = Math.max(0, Math.min(Math.round(nextValue), Math.floor(videoDuration || 0)));
    setTimestamp(safeValue);
    if (shouldFormatInput) {
      setTimestampInput(formatTime(safeValue));
    }

    const video = videoRef.current;
    if (sourceType === "direct" && video && Number.isFinite(safeValue)) {
      video.currentTime = safeValue;
    }
  }, [sourceType, videoDuration]);

  const handleTimestampInputChange = useCallback((nextValue: string) => {
    setTimestampInput(nextValue);

    const parsedSeconds = parseTimecode(nextValue);
    if (parsedSeconds !== null) {
      handleTimestampChange(parsedSeconds, false);
    }
  }, [handleTimestampChange]);

  const handleTimestampInputBlur = useCallback(() => {
    setTimestampInput(formatTime(timestamp));
  }, [timestamp]);

  const handleDownloadThumbnail = useCallback(async () => {
    const saveGeneratedThumbnail = (
      blob: Blob,
      filename: string,
      source: GeneratedThumbnail["source"]
    ) => {
      const downloadUrl = URL.createObjectURL(blob);
      setGeneratedThumbnail((previousThumbnail) => {
        if (previousThumbnail) {
          URL.revokeObjectURL(previousThumbnail.url);
        }

        return {
          filename,
          source,
          url: downloadUrl,
        };
      });

      return downloadUrl;
    };

    const downloadCanvas = async (
      draw: (context: CanvasRenderingContext2D) => void,
      filename: string,
      source: GeneratedThumbnail["source"]
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to prepare the thumbnail canvas.");
      }

      draw(context);

      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("The browser could not create the thumbnail."));
            }
          }, "image/png");
        } catch {
          reject(new Error("This source blocks thumbnail export."));
        }
      });

      const downloadUrl = saveGeneratedThumbnail(blob, filename, source);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (sourceType === "youtube") {
      let displayStream: MediaStream | null = null;

      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("Your browser does not support tab capture. Try Chrome or Edge.");
        }

        const captureTarget = youtubePreviewFrameRef.current;
        const player = youtubePlayerRef.current;

        if (!captureTarget || !player || !isYouTubePlayerReady) {
          throw new Error("The YouTube preview is not ready yet.");
        }

        setIsCapturing(true);
        setError("");
        const requestedQuality = requestBestYouTubeQuality(player);
        player.seekTo(timestamp, true);
        player.mute();
        player.playVideo();

        flushSync(() => {
          setGeneratedThumbnail(null);
          setIsScreenCaptureMode(true);
          setNotice(`Choose this tab in the browser prompt. Requesting ${requestedQuality} before capture.`);
        });

        displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: false,
          video: {
            displaySurface: "browser",
            frameRate: {
              ideal: 5,
              max: 10,
            },
            height: {
              ideal: 2160,
            },
            width: {
              ideal: 3840,
            },
          },
          preferCurrentTab: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "exclude",
        } as DisplayMediaStreamOptions);

        const captureVideo = document.createElement("video");
        captureVideo.muted = true;
        captureVideo.playsInline = true;

        const metadataLoaded = new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            captureVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
            captureVideo.removeEventListener("error", handleError);
          };

          const handleLoadedMetadata = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            reject(new Error("Unable to read the shared tab."));
          };

          captureVideo.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
          captureVideo.addEventListener("error", handleError, { once: true });
        });

        captureVideo.srcObject = displayStream;
        await metadataLoaded;
        await captureVideo.play();
        requestBestYouTubeQuality(player);
        await wait(1800);

        if (!captureVideo.videoWidth || !captureVideo.videoHeight) {
          throw new Error("The shared tab did not provide a video frame.");
        }

        const targetRect = captureTarget.getBoundingClientRect();
        const scaleX = captureVideo.videoWidth / window.innerWidth;
        const scaleY = captureVideo.videoHeight / window.innerHeight;
        const sourceX = Math.max(0, Math.round(targetRect.left * scaleX));
        const sourceY = Math.max(0, Math.round(targetRect.top * scaleY));
        const sourceWidth = Math.min(
          captureVideo.videoWidth - sourceX,
          Math.round(targetRect.width * scaleX)
        );
        const sourceHeight = Math.min(
          captureVideo.videoHeight - sourceY,
          Math.round(targetRect.height * scaleY)
        );

        if (sourceWidth <= 0 || sourceHeight <= 0) {
          throw new Error("The shared tab could not be matched to the video preview.");
        }

        await downloadCanvas(
          (context) => {
            context.drawImage(
              captureVideo,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              THUMBNAIL_WIDTH,
              THUMBNAIL_HEIGHT
            );
          },
          `thumbnail-${youtubeVideoId || "youtube"}-${Math.round(timestamp)}s.png`,
          "browser-tab-frame"
        );

        setNotice("");
      } catch (captureError) {
        setNotice("");
        setError(captureError instanceof Error ? captureError.message : "Unable to capture that YouTube thumbnail.");
      } finally {
        displayStream?.getTracks().forEach((track) => track.stop());
        youtubePlayerRef.current?.pauseVideo();
        setIsScreenCaptureMode(false);
        setIsCapturing(false);
      }
      return;
    }

    const video = videoRef.current;
    if (!video || !canCapture) return;

    try {
      setIsCapturing(true);
      setError("");
      setNotice("");

      await waitForSeek(video, timestamp);

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      if (!sourceWidth || !sourceHeight) {
        throw new Error("The video frame is not ready yet.");
      }

      const outputRatio = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
      const sourceRatio = sourceWidth / sourceHeight;
      let sx = 0;
      let sy = 0;
      let sw = sourceWidth;
      let sh = sourceHeight;

      if (sourceRatio > outputRatio) {
        sw = sourceHeight * outputRatio;
        sx = (sourceWidth - sw) / 2;
      } else if (sourceRatio < outputRatio) {
        sh = sourceWidth / outputRatio;
        sy = (sourceHeight - sh) / 2;
      }

      await downloadCanvas(
        (context) => {
          context.drawImage(
            video,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            THUMBNAIL_WIDTH,
            THUMBNAIL_HEIGHT
          );
        },
        `thumbnail-${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}-${Math.round(timestamp)}s.png`,
        "direct-frame"
      );
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Unable to download that thumbnail.");
    } finally {
      setIsCapturing(false);
    }
  }, [canCapture, isYouTubePlayerReady, sourceType, timestamp, youtubeVideoId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Download a sharp video thumbnail
        </h2>
        <p className="mt-2 text-lg text-gray-400">
          Paste a direct video or YouTube URL, pick the exact frame, and export a 1980 x 1080 PNG.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="thumbnail-preview-heading">
          <div className="mb-3 flex items-center justify-between">
            <h3 id="thumbnail-preview-heading" className="text-lg font-semibold text-white">
              Video Preview
            </h3>
            {isVideoReady && hasKnownDuration && (
              <span className="text-sm text-gray-400">
                Duration {formatTime(videoDuration)}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-nvidia-border bg-black">
            {videoUrl && sourceType === "youtube" && youtubeVideoId ? (
              <div
                className={
                  isScreenCaptureMode
                    ? "fixed inset-0 z-50 flex items-center justify-center bg-black"
                    : "aspect-video w-full bg-black"
                }
              >
                <div
                  ref={youtubePreviewFrameRef}
                  className={
                    isScreenCaptureMode
                      ? "aspect-video h-auto max-h-screen w-screen bg-black"
                      : "h-full w-full"
                  }
                >
                  <div ref={youtubeContainerRef} className="h-full w-full" />
                </div>
                {isScreenCaptureMode && (
                  <div className="pointer-events-none fixed bottom-6 left-1/2 max-w-md -translate-x-1/2 rounded-lg border border-nvidia-border bg-nvidia-darker/90 px-4 py-3 text-center text-sm text-gray-200 shadow-2xl">
                    Share this tab in the browser prompt. The app will capture only the video frame.
                  </div>
                )}
              </div>
            ) : videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                crossOrigin="anonymous"
                controls
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleVideoError}
                className="aspect-video w-full bg-black object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-nvidia-gray/30 px-8 text-center text-gray-400">
                Load a video or YouTube URL to preview frames.
              </div>
            )}
          </div>
        </section>

        <aside aria-labelledby="thumbnail-controls-heading">
          <h3 id="thumbnail-controls-heading" className="mb-3 text-lg font-semibold text-white">
            Thumbnail Settings
          </h3>

          <div className="space-y-5 rounded-xl border border-nvidia-border bg-nvidia-gray/30 p-6">
            <div>
              <label htmlFor="video-url" className="mb-2 block text-sm font-medium text-gray-300">
                Video URL
              </label>
              <div className="flex flex-col gap-3">
                <input
                  id="video-url"
                  type="url"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
                  className="w-full rounded-lg border border-nvidia-border bg-nvidia-gray px-3 py-2.5 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-nvidia-green focus:outline-none focus:ring-2 focus:ring-nvidia-green/20"
                />
                <button
                  type="button"
                  onClick={handleLoadVideo}
                  disabled={isLoadingVideo}
                  className="w-full rounded-lg bg-nvidia-green px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-nvidia-green/20 transition-colors hover:bg-nvidia-green-hover focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark"
                >
                  {isLoadingVideo ? "Loading Video..." : "Load Video"}
                </button>
              </div>
            </div>

            {sourceType === "youtube" && videoTitle && (
              <div className="rounded-lg border border-nvidia-border bg-nvidia-gray/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  YouTube
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-white">
                  {videoTitle}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Downloads use browser tab capture. When prompted, share this tab.
                </p>
              </div>
            )}

            <div className={isVideoReady ? "space-y-3" : "space-y-3 opacity-50"}>
              <div className="flex items-center justify-between">
                <label htmlFor="timestamp-timecode" className="text-sm font-medium text-gray-300">
                  Timestamp
                </label>
                <span className="text-sm font-semibold text-nvidia-green">
                  {timestampLabel}
                </span>
              </div>

              <input
                id="timestamp-range"
                type="range"
                min="0"
                max={Math.max(0, videoDuration)}
                step="1"
                value={String(timestamp)}
                aria-label="Timestamp in one second increments"
                onChange={(event) => handleTimestampChange(Number(event.target.value))}
                onInput={(event) => handleTimestampChange(Number(event.currentTarget.value))}
                disabled={!isVideoReady}
                className="w-full accent-nvidia-green"
              />

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>00:00:00</span>
                <span>1 second steps</span>
                <span>{formatTime(videoDuration)}</span>
              </div>

              <input
                id="timestamp-timecode"
                type="text"
                inputMode="numeric"
                value={timestampInput}
                onChange={(event) => handleTimestampInputChange(event.target.value)}
                onBlur={handleTimestampInputBlur}
                disabled={!isVideoReady}
                placeholder="00:00:00"
                className="w-full rounded-lg border border-nvidia-border bg-nvidia-gray px-3 py-2.5 text-sm text-white transition-colors focus:border-nvidia-green focus:outline-none focus:ring-2 focus:ring-nvidia-green/20 disabled:cursor-not-allowed"
              />
            </div>

            <div className="rounded-lg border border-nvidia-border bg-nvidia-gray/50 p-4">
              {sourceType === "youtube" && !hasKnownDuration && (
                <div className="mb-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                  Duration unavailable. Enter a timecode like 00:01:30.
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Output</span>
                <span className="font-semibold text-white">
                  {THUMBNAIL_WIDTH} x {THUMBNAIL_HEIGHT}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-400">Format</span>
                <span className="font-semibold text-nvidia-green">PNG</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {notice && !error && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                {notice}
              </div>
            )}

            {generatedThumbnail && (
              <div className="space-y-4 rounded-lg border border-nvidia-green/30 bg-nvidia-green/10 p-4">
                <div className="overflow-hidden rounded-lg border border-nvidia-border bg-black">
                  <img
                    src={generatedThumbnail.url}
                    alt="Generated thumbnail preview"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Thumbnail ready
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {generatedThumbnail.source === "browser-tab-frame"
                      ? "Captured from your browser preview, 1980 x 1080."
                      : generatedThumbnail.source === "browser-screenshot"
                      ? "YouTube timestamp frame capture, 1980 x 1080."
                      : "Exact frame thumbnail, 1980 x 1080."}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href={generatedThumbnail.url}
                    download={generatedThumbnail.filename}
                    className="block rounded-lg bg-nvidia-green px-4 py-2.5 text-center text-sm font-semibold text-black shadow-lg shadow-nvidia-green/20 transition-colors hover:bg-nvidia-green-hover focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark"
                  >
                    Download PNG
                  </a>
                  <a
                    href={generatedThumbnail.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-nvidia-border bg-nvidia-gray px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:border-nvidia-green/50 hover:bg-nvidia-gray-light focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark"
                  >
                    Open PNG
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadThumbnail}
              disabled={!canCapture}
              className={`w-full rounded-lg px-6 py-3 text-base font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-nvidia-green focus:ring-offset-2 focus:ring-offset-nvidia-dark ${
                canCapture
                  ? "bg-nvidia-green text-black shadow-lg shadow-nvidia-green/20 hover:bg-nvidia-green-hover"
                  : "cursor-not-allowed bg-nvidia-gray text-gray-500"
              }`}
            >
              {isCapturing
                ? sourceType === "youtube"
                  ? "Waiting for Tab Capture..."
                  : "Preparing Thumbnail..."
                : sourceType === "youtube"
                  ? "Capture Thumbnail"
                  : "Download Thumbnail"}
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-12 border-t border-nvidia-border pt-8 text-center">
        <p className="text-sm text-gray-500">
          Direct links export directly. YouTube exports ask you to share the current tab, then capture the selected preview frame.
        </p>
      </div>
    </div>
  );
}

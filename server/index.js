import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import multer from "multer";

const app = express();
const port = Number(process.env.PORT) || 3001;
const uploadDirectory = path.join(os.tmpdir(), "instadown-pro");
const maxFileSize = 150 * 1024 * 1024;
const allowedQualities = new Set(["1080", "720", "480"]);

await mkdir(uploadDirectory, { recursive: true });

const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: maxFileSize, files: 1, fields: 1, fieldSize: 16 },
  fileFilter(_req, file, callback) {
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Upload an audio or video file."));
  },
});

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/audio", upload.single("media"), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "Choose an audio or video file to convert." });
    return;
  }

  const outputPath = path.join(uploadDirectory, `${randomUUID()}.mp3`);
  try {
    await runFfmpeg([
      "-nostdin", "-hide_banner", "-loglevel", "error",
      "-i", req.file.path,
      "-vn", "-codec:a", "libmp3lame", "-b:a", "192k",
      "-map_metadata", "-1", "-y", outputPath,
    ]);
    res.download(outputPath, "audio.mp3", (error) => {
      if (error && !res.headersSent) next(error);
      void cleanup(req.file.path, outputPath);
    });
  } catch (error) {
    await cleanup(req.file.path, outputPath);
    next(error);
  }
});

app.post("/api/video", upload.single("media"), async (req, res, next) => {
  if (!req.file) {
    res.status(400).json({ error: "Choose a video file to convert." });
    return;
  }
  const quality = req.body.quality;
  if (!allowedQualities.has(quality)) {
    await cleanup(req.file.path);
    res.status(400).json({ error: "Choose a supported video quality." });
    return;
  }

  const outputPath = path.join(uploadDirectory, `${randomUUID()}.mp4`);
  const height = Number(quality);
  try {
    await runFfmpeg([
      "-nostdin", "-hide_banner", "-loglevel", "error",
      "-i", req.file.path,
      "-map", "0:v:0", "-map", "0:a?",
      "-vf", `scale=-2:min(ih\\,${height})`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
      "-y", outputPath,
    ]);
    res.download(outputPath, `video-${quality}p.mp4`, (error) => {
      if (error && !res.headersSent) next(error);
      void cleanup(req.file.path, outputPath);
    });
  } catch (error) {
    await cleanup(req.file.path, outputPath);
    next(error);
  }
});

const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(clientDirectory));
app.get("/{*path}", (_req, res, next) => {
  res.sendFile(path.join(clientDirectory, "index.html"), (error) => {
    if (error) next();
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Files must be 150 MB or smaller."
      : "Upload one audio or video file at a time.";
    res.status(400).json({ error: message });
    return;
  }
  if (error.message === "Upload an audio or video file.") {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error("Media processing request failed:", error.message);
  if (!res.headersSent) {
    res.status(500).json({ error: "Media processing failed. Try another supported file." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`InstaDown Pro API listening on http://0.0.0.0:${port}`);
});

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("FFmpeg binary is unavailable."));
      return;
    }
    const process = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    const timeout = setTimeout(() => process.kill("SIGKILL"), 180_000);
    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (chunk) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-4000);
    });
    process.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    process.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      const detail = signal === "SIGKILL"
        ? "Conversion exceeded the 3-minute time limit."
        : errorOutput.trim() || `FFmpeg exited with code ${code}.`;
      reject(new Error(detail));
    });
  });
}

async function cleanup(...files) {
  await Promise.all(files.map(async (file) => {
    try {
      await unlink(file);
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Temporary file cleanup failed:", error.message);
    }
  }));
}

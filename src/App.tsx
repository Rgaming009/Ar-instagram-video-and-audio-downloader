import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Download,
  FileAudio,
  FileVideo2,
  Heart,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Music2,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";

type Workspace = "video" | "audio";
type VideoQuality = "original" | "1080" | "720" | "480";

const MAX_FILE_SIZE = 150 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "150 MB";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [workspace, setWorkspace] = useState<Workspace>("video");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [quality, setQuality] = useState<VideoQuality>("original");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!file) {
      setVideoPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  function chooseFile(nextFile: File | undefined, target: Workspace) {
    if (!nextFile) return;
    clearMessages();
    setAudioUrl("");
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(`That file is over the ${MAX_FILE_SIZE_LABEL} upload limit.`);
      return;
    }

    const valid = target === "video"
      ? nextFile.type.startsWith("video/")
      : nextFile.type.startsWith("video/") || nextFile.type.startsWith("audio/");
    if (!valid) {
      setFile(null);
      setError(target === "video"
        ? "Choose a video file to continue."
        : "Choose an audio or video file to extract an MP3.");
      return;
    }
    setFile(nextFile);
    setQuality("original");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, target: Workspace) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0], target);
  }

  async function pasteLink() {
    clearMessages();
    try {
      const text = await navigator.clipboard.readText();
      setSourceUrl(text.trim());
      if (!text.trim()) setNotice("Your clipboard is empty.");
    } catch {
      setError("Clipboard access was denied. Paste the link into the field instead.");
    }
  }

  async function downloadVideo() {
    clearMessages();
    if (!file) {
      setError(sourceUrl
        ? "Instagram link downloads aren't supported. Select an authorized video file below to continue."
        : "Select an authorized video file before downloading.");
      return;
    }
    if (quality === "original") {
      saveBlob(file, file.name);
      setNotice("Your original video is ready.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("media", file);
      body.append("quality", quality);
      const response = await fetch("/api/video", { method: "POST", body });
      if (!response.ok) throw new Error(await readApiError(response));
      const blob = await response.blob();
      saveBlob(blob, `${file.name.replace(/\.[^.]+$/, "")}-${quality}p.mp4`);
      setNotice("Your optimized video is ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The video could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  async function convertAudio() {
    clearMessages();
    if (!file) {
      setError("Choose an authorized audio or video file before converting.");
      return;
    }

    setBusy(true);
    setAudioUrl("");
    setAudioBlob(null);
    try {
      const body = new FormData();
      body.append("media", file);
      const response = await fetch("/api/audio", { method: "POST", body });
      if (!response.ok) throw new Error(await readApiError(response));
      const mp3 = await response.blob();
      setAudioBlob(mp3);
      setAudioUrl(URL.createObjectURL(mp3));
      setNotice("Your MP3 is ready to preview and download.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The audio could not be converted.");
    } finally {
      setBusy(false);
    }
  }

  async function readApiError(response: Response) {
    try {
      const data: { error?: string } = await response.json();
      return data.error || "The media could not be processed. Try another file.";
    } catch {
      return "The media could not be processed. Try another file.";
    }
  }

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the page link. Please copy it from your browser.");
    }
  }

  const dropHandlers = (target: Workspace) => ({
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: React.DragEvent<HTMLDivElement>) => handleDrop(event, target),
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="InstaDown Pro home">
          <span className="brand-mark"><ArrowDownToLine size={19} strokeWidth={2.5} /></span>
          <span>insta<span className="brand-accent">down</span><span className="brand-pro"> PRO</span></span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#workspace">Downloader</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
        </nav>
        <div className="topbar-right">
          <span className="secure-label"><ShieldCheck size={15} /> Private &amp; secure</span>
          <a className="help-button" href="#footer"><CircleHelp size={17} /> <span>Help</span></a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-content">
            <div className="eyebrow"><Sparkles size={14} /> YOUR MEDIA, MADE SIMPLE</div>
            <h1>Keep the moments<br />that <span>move you.</span></h1>
            <p>A private, beautifully simple workspace to download and convert media you’re authorized to use.</p>
            <div className="hero-badges">
              <span><LockKeyhole size={14} /> No account needed</span>
              <i />
              <span><ShieldCheck size={14} /> Files stay yours</span>
              <i />
              <span><Heart size={14} /> Made for creators</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-card art-card-back"><AudioLines size={25} /><span>audio</span></div>
            <div className="art-card art-card-front">
              <div className="art-video">
                <div className="art-sun" />
                <div className="art-hill hill-one" />
                <div className="art-hill hill-two" />
                <div className="art-play"><Play size={16} fill="currentColor" /></div>
              </div>
              <div className="art-card-caption"><span>your next favorite</span><b>saved, in a moment</b></div>
            </div>
            <div className="floating-sparkle sparkle-one">✦</div>
            <div className="floating-sparkle sparkle-two">✧</div>
          </div>
        </section>

        <section className="workspace-wrap" id="workspace">
          <div className="workspace-card">
            <div className="workspace-heading">
              <div>
                <div className="section-kicker">THE CREATOR TOOLKIT</div>
                <h2>What would you like to do?</h2>
                <p>One little workspace. A lot of possibilities.</p>
              </div>
              <div className="workspace-decoration"><span /><span /><span /></div>
            </div>

            <div className="tabs" role="tablist" aria-label="Choose a media tool">
              <button
                className={`tab-button ${workspace === "video" ? "selected" : ""}`}
                onClick={() => { setWorkspace("video"); clearMessages(); }}
                role="tab"
                aria-selected={workspace === "video"}
              >
                <span className="tab-icon video-icon"><Video size={18} /></span>
                <span><b>Video downloader</b><small>Save your favorite clips</small></span>
                <span className="tab-arrow">↗</span>
              </button>
              <button
                className={`tab-button ${workspace === "audio" ? "selected" : ""}`}
                onClick={() => { setWorkspace("audio"); clearMessages(); }}
                role="tab"
                aria-selected={workspace === "audio"}
              >
                <span className="tab-icon audio-icon"><Music2 size={18} /></span>
                <span><b>Audio downloader</b><small>Turn moments into music</small></span>
                <span className="tab-arrow">↗</span>
              </button>
            </div>

            {workspace === "video" ? (
              <div className="tool-panel" role="tabpanel">
                <div className="panel-title-row">
                  <div className="panel-icon video-icon"><Video size={18} /></div>
                  <div><h3>Download a video</h3><p>Save an authorized video in the quality you want.</p></div>
                  <span className="step-pill"><span>01</span> VIDEO</span>
                </div>

                <label className="field-label" htmlFor="instagram-url">Instagram post link <span>OPTIONAL</span></label>
                <div className="url-field">
                  <Link2 size={18} className="url-icon" />
                  <input
                    id="instagram-url"
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => { setSourceUrl(event.target.value); setError(""); }}
                    placeholder="https://www.instagram.com/p/..."
                    aria-label="Instagram post link"
                  />
                  {sourceUrl && <button className="clear-link" onClick={() => setSourceUrl("")} aria-label="Clear link"><X size={15} /></button>}
                  <button className="paste-button" onClick={pasteLink}><Clipboard size={15} /> Paste link</button>
                </div>
                <div className="url-note"><LockKeyhole size={13} /> Instagram links aren’t fetched. Select an authorized video file to download.</div>

                <div className="divider"><span>OR USE A FILE YOU HAVE PERMISSION TO USE</span></div>

                <div
                  className={`upload-zone ${dragging ? "dragging" : ""} ${file && workspace === "video" ? "has-file" : ""}`}
                  onClick={() => videoInputRef.current?.click()}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") videoInputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a video file or drop it here"
                  {...dropHandlers("video")}
                >
                  <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(event) => chooseFile(event.target.files?.[0], "video")} />
                  <span className="upload-icon"><Upload size={19} /></span>
                  {file ? (
                    <span className="upload-copy"><b>{file.name}</b><small>{formatBytes(file.size)} · Click to choose another</small></span>
                  ) : (
                    <span className="upload-copy"><b>Drop your video here, or <em>browse files</em></b><small>MP4, MOV, WEBM and other video formats · Up to {MAX_FILE_SIZE_LABEL}</small></span>
                  )}
                  {file && <button className="remove-file" onClick={(event) => { event.stopPropagation(); setFile(null); setAudioUrl(""); }} aria-label="Remove video"><X size={16} /></button>}
                </div>

                {file && (
                  <div className="media-preview video-preview">
                    <video src={videoPreviewUrl} controls playsInline preload="metadata" />
                    <div className="preview-meta"><FileVideo2 size={15} /><span>Video preview</span><span className="preview-size">{formatBytes(file.size)}</span></div>
                  </div>
                )}

                <div className="quality-row">
                  <label htmlFor="quality-select">Video quality</label>
                  <div className="select-wrap">
                    <select id="quality-select" value={quality} onChange={(event) => setQuality(event.target.value as VideoQuality)}>
                      <option value="original">Original quality · no changes</option>
                      <option value="1080">Up to 1080p · MP4</option>
                      <option value="720">Up to 720p · MP4</option>
                      <option value="480">Up to 480p · MP4</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>

                {error && <div className="feedback error-feedback" role="alert">{error}</div>}
                {notice && <div className="feedback success-feedback" role="status"><Check size={15} />{notice}</div>}
                <button className="primary-button" onClick={downloadVideo} disabled={busy || (!file && !sourceUrl)}>
                  {busy ? <><LoaderCircle className="spin" size={17} /> Preparing video…</> : <><Download size={17} /> Download video <span className="button-arrow">↗</span></>}
                </button>
                <p className="privacy-note"><ShieldCheck size={14} /> Your original file is never changed. Conversion runs securely for this request only.</p>
              </div>
            ) : (
              <div className="tool-panel" role="tabpanel">
                <div className="panel-title-row">
                  <div className="panel-icon audio-icon"><Music2 size={18} /></div>
                  <div><h3>Extract an MP3</h3><p>Find the soundtrack in a video or convert an audio file.</p></div>
                  <span className="step-pill audio-step"><span>02</span> AUDIO</span>
                </div>

                <div className="audio-info"><AudioLines size={17} /><span>High-quality MP3 · 192 kbps</span><span className="audio-info-separator" /><span>Powered by FFmpeg</span></div>

                <div
                  className={`upload-zone audio-upload ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                  onClick={() => audioInputRef.current?.click()}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") audioInputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose an audio or video file or drop it here"
                  {...dropHandlers("audio")}
                >
                  <input ref={audioInputRef} type="file" accept="audio/*,video/*" hidden onChange={(event) => chooseFile(event.target.files?.[0], "audio")} />
                  <span className="upload-icon audio-upload-icon"><Upload size={19} /></span>
                  {file ? (
                    <span className="upload-copy"><b>{file.name}</b><small>{formatBytes(file.size)} · Click to choose another</small></span>
                  ) : (
                    <span className="upload-copy"><b>Drop audio or video here, or <em>browse files</em></b><small>MP4, MOV, MP3, WAV and more · Up to {MAX_FILE_SIZE_LABEL}</small></span>
                  )}
                  {file && <button className="remove-file" onClick={(event) => { event.stopPropagation(); setFile(null); setAudioUrl(""); }} aria-label="Remove file"><X size={16} /></button>}
                </div>

                {file && (
                  <div className="selected-file-row"><span className="selected-file-icon"><FileAudio size={17} /></span><span className="selected-file-name">{file.name}</span><span className="selected-file-size">{formatBytes(file.size)}</span></div>
                )}

                {audioUrl && (
                  <div className="audio-result">
                    <div className="audio-result-heading"><span className="result-check"><Check size={13} /></span><span>MP3 ready to go</span><button onClick={() => setAudioUrl("")} aria-label="Dismiss MP3"><X size={15} /></button></div>
                    <audio src={audioUrl} controls />
                    <button className="download-mp3" onClick={() => audioBlob && saveBlob(audioBlob, "audio.mp3")}>
                      <Download size={15} /> Download MP3
                    </button>
                  </div>
                )}

                {error && <div className="feedback error-feedback" role="alert">{error}</div>}
                {notice && <div className="feedback success-feedback" role="status"><Check size={15} />{notice}</div>}
                <button className="primary-button audio-primary" onClick={convertAudio} disabled={busy || !file}>
                  {busy ? <><LoaderCircle className="spin" size={17} /> Converting to MP3…</> : <><AudioLines size={18} /> Extract audio <span className="button-arrow">↗</span></>}
                </button>
                <p className="privacy-note"><ShieldCheck size={14} /> Files are processed temporarily and deleted when conversion completes.</p>
              </div>
            )}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-kicker">SIMPLE BY DESIGN</div>
          <h2>A few clicks. <span>Your moment, yours.</span></h2>
          <div className="steps-grid">
            <article className="step-card"><div className="step-number">01</div><div className="step-illustration select-illustration"><Upload size={21} /></div><h3>Choose your media</h3><p>Upload an audio or video file you own or have permission to use.</p></article>
            <article className="step-card"><div className="step-number">02</div><div className="step-illustration tune-illustration"><Sparkles size={21} /></div><h3>Make it yours</h3><p>Keep the original video, pick a smaller size, or extract an MP3.</p></article>
            <article className="step-card"><div className="step-number">03</div><div className="step-illustration save-illustration"><Download size={21} /></div><h3>Save &amp; enjoy</h3><p>Your processed file is ready to preview and download. Easy as that.</p></article>
          </div>
        </section>

        <section className="trust-banner">
          <div className="trust-icon"><ShieldCheck size={22} /></div>
          <div><b>Your privacy comes first.</b><p>Media uploads are temporary, processed on request, and removed after conversion.</p></div>
          <span className="trust-badge"><LockKeyhole size={13} /> PRIVATE BY DESIGN</span>
        </section>
      </main>

      <footer id="footer">
        <div className="footer-main">
          <a className="brand footer-brand" href="#" aria-label="InstaDown Pro home">
            <span className="brand-mark"><ArrowDownToLine size={17} strokeWidth={2.5} /></span>
            <span>insta<span className="brand-accent">down</span><span className="brand-pro"> PRO</span></span>
          </a>
          <p>Made for your moments. Always with care.</p>
          <button className="share-button" onClick={copyPageLink}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied!" : "Share this tool"}</button>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} InstaDown Pro · Use media responsibly.</span>
          <span className="footer-links"><a href="#how-it-works">How it works</a><a href="#workspace">Back to top ↑</a></span>
        </div>
      </footer>
    </div>
  );
}

export default App;

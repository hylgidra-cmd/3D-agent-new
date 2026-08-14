import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { officeAudio, PREMIUM_TRACKS } from "../audio/officeAudioEngine";
import { useIsPremium } from "../store/subscriptionStore";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";

/** What's currently on the music layer — a locale-independent shape (translation key, not a
 * pre-resolved string) so switching EN/UZ re-labels the premium track name without needing to
 * re-select it. Uploaded files keep their real filename either way. `trackCount` on the
 * "uploaded" kind is how the panel decides whether to show the next-track control (a one-file
 * upload has nothing to skip to). */
type NowPlaying =
  | { kind: "uploaded"; fileName: string; trackCount: number }
  | { kind: "premium"; nameKey: TranslationKey };

const DEFAULT_MUSIC_VOLUME = 0.35; // mirrors officeAudioEngine's ensureMusicGain default

/**
 * The office's audio control — a header popover, not a standalone mute toggle (which it
 * replaces). No background track auto-plays; the user explicitly picks one: their own uploaded
 * file(s) (free, real playback — one or many, forming a playlist with next-track/pause
 * controls), or one of the premium generative tracks (gated behind any paid plan — see
 * subscriptionStore). Whichever one is picked, a volume slider appears so you can turn *that*
 * track up or down without it fighting the mute toggle (mute is all-or-nothing; this is 0–100%
 * on just the music layer).
 */
export default function AudioPlayer() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const isPremium = useIsPremium();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Keep the "now playing" label in sync with the engine's playlist — fires on manual
  // nextTrack() calls and on auto-advance when a track finishes, so both paths update the UI
  // the same way (see officeAudioEngine's onTrackChange doc).
  useEffect(() => {
    officeAudio.setOnTrackChange((_index, name) => {
      setPaused(false);
      setNowPlaying((prev) =>
        prev?.kind === "uploaded" ? { ...prev, fileName: name } : prev,
      );
    });
    return () => officeAudio.setOnTrackChange(null);
  }, []);

  const ensureAudible = () => {
    officeAudio.start();
    if (muted) {
      officeAudio.setMuted(false);
      setMuted(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-selecting the same file(s) later
    if (files.length === 0) return;
    ensureAudible();
    officeAudio.playUploadedFiles(files);
    officeAudio.setMusicVolume(volume);
    setPaused(false);
    setNowPlaying({ kind: "uploaded", fileName: files[0].name, trackCount: files.length });
  };

  const handleNextTrack = () => {
    officeAudio.nextTrack();
    officeAudio.setMusicVolume(volume);
  };

  const handlePauseToggle = () => {
    setPaused(officeAudio.togglePauseMusic());
  };

  const handlePremiumTrack = (trackId: string, nameKey: TranslationKey) => {
    if (!isPremium) return;
    ensureAudible();
    officeAudio.playPremiumTrack(trackId);
    officeAudio.setMusicVolume(volume);
    setPaused(false);
    setNowPlaying({ kind: "premium", nameKey });
  };

  const handleStop = () => {
    officeAudio.stopMusic();
    setNowPlaying(null);
    setPaused(false);
  };

  const handleMuteToggle = () => {
    officeAudio.start();
    const next = !muted;
    officeAudio.setMuted(next);
    setMuted(next);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value) / 100;
    setVolume(next);
    officeAudio.setMusicVolume(next);
  };

  const nowPlayingLabel = nowPlaying
    ? nowPlaying.kind === "uploaded"
      ? nowPlaying.fileName
      : t(nowPlaying.nameKey)
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-white/5 px-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          {!muted && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
        </svg>
        <span className="hidden max-w-[90px] truncate text-[11px] font-medium sm:inline">
          {nowPlayingLabel ?? t("audio.buttonDefault")}
        </span>
      </button>

      {open && (
        <>
          {/* Click-outside catcher */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="glass-panel absolute right-0 top-11 z-40 w-64 rounded-xl p-3 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{t("audio.panelTitle")}</p>
              <button type="button" onClick={handleMuteToggle} className="text-[10px] font-medium text-white/50 hover:text-white">
                {muted ? t("audio.unmute") : t("audio.mute")}
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-left text-xs text-white/80 transition hover:bg-white/10"
              >
                {t("audio.uploadOwnTrack")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mt-1 border-t border-white/10 pt-1.5">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-white/35">
                  {t("audio.premiumLibrary")} {!isPremium && "🔒"}
                </p>
                {PREMIUM_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    disabled={!isPremium}
                    onClick={() => handlePremiumTrack(track.id, track.nameKey)}
                    className="mb-1 w-full rounded-lg bg-white/5 px-2.5 py-1.5 text-left text-xs text-white/80 transition last:mb-0 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5"
                  >
                    {t(track.nameKey)}
                  </button>
                ))}
                {!isPremium && <p className="mt-1 text-[10px] leading-relaxed text-white/35">{t("audio.upgradeToUnlock")}</p>}
              </div>

              {nowPlaying && (
                <>
                  {/* Volume slider — adjusts only the music layer (see officeAudioEngine's
                      setMusicVolume), independent of the header mute toggle. */}
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                    <span className="shrink-0 text-[10px] text-white/50">{t("audio.volume")}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(volume * 100)}
                      onChange={handleVolumeChange}
                      className="h-1 w-full cursor-pointer accent-sky-400"
                      aria-label={t("audio.volume")}
                    />
                  </div>

                  {/* Pause/resume and next-track — uploaded playlist only (premium tracks are
                      synthesized oscillator graphs with no pause semantics; see
                      officeAudioEngine's togglePauseMusic/nextTrack docs). */}
                  {nowPlaying.kind === "uploaded" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePauseToggle}
                        className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                      >
                        {paused ? t("audio.resume") : t("audio.pause")}
                      </button>
                      {nowPlaying.trackCount > 1 && (
                        <button
                          type="button"
                          onClick={handleNextTrack}
                          className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                        >
                          {t("audio.next")}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStop}
                    className="rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-left text-xs text-red-300 transition hover:bg-red-500/20"
                  >
                    {t("audio.stop", { label: nowPlayingLabel ?? "" })}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

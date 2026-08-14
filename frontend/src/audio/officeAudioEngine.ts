import type { AgentId, AgentState } from "../data/agents";
import type { TranslationKey } from "../i18n/translations";

export interface PremiumTrackDef {
  id: string;
  /** Translation key for the track's display name — see i18n/translations.ts's
   * `audio.track.*` keys, so AudioPlayer re-renders the library in the active locale. */
  nameKey: TranslationKey;
}

/** The premium background-track library (gated behind a paid plan — see AudioPlayer.tsx /
 * subscriptionStore.ts). All three are procedurally generated right now (see playPremiumTrack's
 * REAL AUDIO FILE HOOK) — clearly-labeled placeholders standing in for real licensed tracks. */
export const PREMIUM_TRACKS: PremiumTrackDef[] = [
  { id: "deep-focus", nameKey: "audio.track.deepFocus" },
  { id: "lofi-pulse", nameKey: "audio.track.lofiPulse" },
  { id: "rainy-office", nameKey: "audio.track.rainyOffice" },
];

/**
 * The office's sound engine — a plain singleton class, not React/zustand state. Web Audio API
 * nodes (AudioContext, PannerNode, GainNode, ...) are imperative, mutable, and don't need to be
 * reactive; this mirrors how three/materials.ts keeps shared THREE.Material instances outside
 * React state for the same reason.
 *
 * Two independent layers, both routed through masterGain (so AudioPlayer's mute affects
 * everything uniformly):
 *  - SFX (typing clacks / footsteps): always synthesized procedurally, tied to agent state.
 *  - Music (this layer): OFF by default — no hardcoded background track auto-plays. The user
 *    picks a source via AudioPlayer.tsx: their own uploaded file(s) (free — one or many, forming
 *    a playlist with next-track/pause controls), or one of PREMIUM_TRACKS (paid plans only).
 *    Uploaded files are real audio playback already; the premium tracks are procedurally
 *    generated placeholders — each REAL AUDIO FILE HOOK below marks exactly where to swap in a
 *    real licensed file later.
 *
 * Browsers block audio until a user gesture — nothing plays until start() is called from a
 * click handler (see AudioPlayer.tsx and App.tsx's first-interaction listener).
 */
class OfficeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private started = false;
  private muted = false;

  private agentPanners = new Map<AgentId, PannerNode>();
  private agentLastState = new Map<AgentId, AgentState>();
  private agentLoopTimers = new Map<AgentId, number>();

  // ── Music layer ──────────────────────────────────────────────────────────────────────────
  private musicGain: GainNode | null = null;
  private musicSources: AudioNode[] = [];
  private musicAudioElement: HTMLAudioElement | null = null;
  private musicElementSource: MediaElementAudioSourceNode | null = null;
  private musicPlaylist: { url: string; name: string }[] = [];
  private musicPlaylistIndex = -1;
  private musicPaused = false;
  /** Notified whenever the active playlist track changes — on manual nextTrack() calls and on
   * auto-advance when a track finishes — so AudioPlayer.tsx can keep its "now playing" label in
   * sync without polling. */
  private onTrackChange: ((index: number, name: string) => void) | null = null;

  get isStarted() {
    return this.started;
  }

  get isMuted() {
    return this.muted;
  }

  /** Idempotent — safe to call from every click handler that might be the first user gesture. */
  start() {
    if (this.started) {
      this.ctx?.resume();
      return;
    }

    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return; // no Web Audio support — sound simply stays off

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.55;
    this.masterGain.connect(this.ctx.destination);

    this.started = true;
    // Deliberately no auto-playing background track here — see the class doc comment. The user
    // picks what (if anything) plays via AudioPlayer.tsx.
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.55;
  }

  // ── Spatial positioning ──────────────────────────────────────────────────────────────────

  /** Called every frame from OfficeCamera with the camera's world position/orientation, so
   * agent sounds pan/attenuate correctly relative to whatever the user is currently looking
   * at — genuine 3D spatial audio, not just stereo panning. */
  updateListener(position: readonly [number, number, number], forward: readonly [number, number, number]) {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = position[0];
      listener.positionY.value = position[1];
      listener.positionZ.value = position[2];
      listener.forwardX.value = forward[0];
      listener.forwardY.value = forward[1];
      listener.forwardZ.value = forward[2];
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    } else {
      // Older Safari — the AudioParam-based listener API above isn't available yet.
      listener.setPosition(position[0], position[1], position[2]);
      listener.setOrientation(forward[0], forward[1], forward[2], 0, 1, 0);
    }
  }

  private getOrCreatePanner(agentId: AgentId): PannerNode | null {
    if (!this.ctx || !this.masterGain) return null;
    let panner = this.agentPanners.get(agentId);
    if (!panner) {
      panner = this.ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 3;
      panner.maxDistance = 45;
      panner.rolloffFactor = 1.1;
      panner.connect(this.masterGain);
      this.agentPanners.set(agentId, panner);
    }
    return panner;
  }

  /** Called every frame from AgentController with that agent's live world position. */
  updateAgentPosition(agentId: AgentId, position: readonly [number, number, number]) {
    const panner = this.agentPanners.get(agentId);
    if (!panner) return;
    if (panner.positionX) {
      panner.positionX.value = position[0];
      panner.positionY.value = position[1];
      panner.positionZ.value = position[2];
    } else {
      panner.setPosition(position[0], position[1], position[2]);
    }
  }

  // ── State-triggered sound effects ────────────────────────────────────────────────────────

  /** Call whenever an agent's AgentState changes — starts/stops the looping footstep SFX for
   * WALKING, no-ops for every other state (WORKING's typing-clack loop was removed: it was
   * constant background chatter across every desk at once and read as noise, not signal).
   * Safe to call with the same state repeatedly (only reacts to an actual change). */
  setAgentState(agentId: AgentId, state: AgentState) {
    if (this.agentLastState.get(agentId) === state) return;
    this.agentLastState.set(agentId, state);
    this.clearLoop(agentId);

    if (state === "WALKING") {
      const timer = window.setInterval(() => this.playFootstep(agentId), 360);
      this.agentLoopTimers.set(agentId, timer);
    }
  }

  /** Stops this agent's looping SFX and releases its panner — call on unmount. */
  disposeAgent(agentId: AgentId) {
    this.clearLoop(agentId);
    this.agentPanners.get(agentId)?.disconnect();
    this.agentPanners.delete(agentId);
    this.agentLastState.delete(agentId);
  }

  private clearLoop(agentId: AgentId) {
    const timer = this.agentLoopTimers.get(agentId);
    if (timer !== undefined) {
      window.clearInterval(timer);
      this.agentLoopTimers.delete(agentId);
    }
  }

  /** REAL AUDIO FILE HOOK: replace the noise burst below with a short decoded "footstep.mp3"
   * AudioBufferSourceNode played through the same panner. */
  private playFootstep(agentId: AgentId) {
    if (!this.ctx) return;
    const panner = this.getOrCreatePanner(agentId);
    if (!panner) return;

    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length); // short decaying thump
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;

    const gain = ctx.createGain();
    gain.gain.value = 0.22;

    noise.connect(filter).connect(gain).connect(panner);
    noise.start();
  }

  // ── Music layer (AudioPlayer.tsx) ────────────────────────────────────────────────────────

  private ensureMusicGain(): GainNode | null {
    if (!this.ctx || !this.masterGain) return null;
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.masterGain);
    }
    return this.musicGain;
  }

  setMusicVolume(volume: number) {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /** Stops whatever's currently playing on the music layer (uploaded playlist or a premium
   * track) — always called first by each of the play* methods below, so only one background
   * source is ever active at a time. */
  stopMusic() {
    this.musicSources.forEach((node) => {
      const source = node as Partial<OscillatorNode | AudioBufferSourceNode>;
      if (typeof source.stop === "function") {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
      }
      node.disconnect();
    });
    this.musicSources = [];
    this.musicAudioElement?.pause();
    this.musicPaused = false;
  }

  /** Registers (or clears, with null) the listener notified on every playlist track change —
   * see the field doc above. AudioPlayer.tsx calls this once on mount. */
  setOnTrackChange(listener: ((index: number, name: string) => void) | null) {
    this.onTrackChange = listener;
  }

  get isMusicPaused() {
    return this.musicPaused;
  }

  /** Free tier: play the file(s) the user picked from their own device as a playlist — one file
   * loops forever, multiple files advance to the next on end (wrapping around) and can also be
   * skipped manually via nextTrack(). This is genuinely real audio playback already (an <audio>
   * element via MediaElementAudioSourceNode) — not a placeholder. */
  playUploadedFiles(files: File[]) {
    if (!this.ctx || files.length === 0) return;
    this.stopMusic();
    this.musicPlaylist.forEach((track) => URL.revokeObjectURL(track.url));
    this.musicPlaylist = files.map((file) => ({ url: URL.createObjectURL(file), name: file.name }));
    this.playPlaylistIndex(0);
  }

  /** Skips to the next track in the current upload playlist, wrapping around at the end. No-op
   * if nothing (or only one track) is loaded. */
  nextTrack() {
    if (this.musicPlaylist.length === 0) return;
    this.playPlaylistIndex((this.musicPlaylistIndex + 1) % this.musicPlaylist.length);
  }

  /** Toggles play/pause on the current upload playlist track (as opposed to stopMusic(), which
   * fully tears it down). Returns the new paused state. No-op if no playlist track is active. */
  togglePauseMusic(): boolean {
    if (!this.musicAudioElement || this.musicPlaylist.length === 0) return this.musicPaused;
    if (this.musicAudioElement.paused) {
      void this.musicAudioElement.play().catch(() => {});
      this.musicPaused = false;
    } else {
      this.musicAudioElement.pause();
      this.musicPaused = true;
    }
    return this.musicPaused;
  }

  private playPlaylistIndex(index: number) {
    const track = this.musicPlaylist[index];
    const gain = this.ensureMusicGain();
    if (!gain || !track || !this.ctx) return;
    this.musicPlaylistIndex = index;
    this.musicPaused = false;

    if (!this.musicAudioElement) {
      this.musicAudioElement = new Audio();
      this.musicElementSource = this.ctx.createMediaElementSource(this.musicAudioElement);
      this.musicElementSource.connect(gain);
      this.musicAudioElement.addEventListener("ended", () => this.nextTrack());
    }
    // A single-track playlist loops itself; a multi-track playlist advances via the "ended"
    // listener above instead, so it can wrap through every track rather than repeat the first.
    this.musicAudioElement.loop = this.musicPlaylist.length === 1;
    this.musicAudioElement.src = track.url;
    void this.musicAudioElement.play().catch(() => {
      /* blocked until a user gesture — start() having been called already covers this in
         practice, since playUploadedFiles only ever runs from a click handler */
    });
    this.onTrackChange?.(index, track.name);
  }

  /** Paid tiers only (gated in AudioPlayer.tsx, not here) — a simple generative pad per preset,
   * three detuned-ish sine layers through a lowpass filter with a slow shared tremolo. REAL
   * AUDIO FILE HOOK: replace this whole method's oscillator graph with fetching a real licensed
   * loop file per trackId, connected to the same music gain node. */
  playPremiumTrack(trackId: string) {
    if (!this.ctx) return;
    this.stopMusic();
    const gain = this.ensureMusicGain();
    if (!gain) return;
    const ctx = this.ctx;

    const presets: Record<string, { freqs: number[]; filterFreq: number; lfoRate: number }> = {
      "deep-focus": { freqs: [110, 165, 220], filterFreq: 900, lfoRate: 0.05 },
      "lofi-pulse": { freqs: [98, 146.83, 196], filterFreq: 650, lfoRate: 0.18 },
      "rainy-office": { freqs: [130.81, 196, 261.63], filterFreq: 1400, lfoRate: 0.03 },
    };
    const preset = presets[trackId] ?? presets["deep-focus"];

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = preset.filterFreq;
    filter.connect(gain);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain);
    lfo.start();

    const newNodes: AudioNode[] = [filter, lfo, lfoGain];
    preset.freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.05;
      lfoGain.connect(oscGain.gain); // shared slow tremolo across all three layers
      osc.connect(oscGain).connect(filter);
      osc.start();
      newNodes.push(osc, oscGain);
    });

    this.musicSources.push(...newNodes);
  }
}

/** One shared engine instance for the whole app. */
export const officeAudio = new OfficeAudioEngine();

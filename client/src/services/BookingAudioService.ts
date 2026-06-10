/**
 * BookingAudioService — Singleton audio manager for guide booking notifications.
 *
 * Design:
 *  - Single Audio instance per app lifetime (singleton pattern prevents
 *    multiple overlapping sounds if a component remounts).
 *  - Looping: audio repeats until stop() is explicitly called.
 *  - Browsers require a user gesture before audio can play. If the guide
 *    has interacted with the page (clicked the Online toggle), this will work.
 *
 * Future extension point:
 *  - Swap the WAV source for different notification types (e.g. guide_assigned.wav).
 *  - Add volume control.
 *  - Replace with WebAudio API for more precise control post-Alpha.
 */

import notificationSoundUrl from '@/assets/guide_new_booking.wav';
import cancelSoundUrl from '@/assets/guide_cancelled.wav'; // User will place this file here

class BookingAudioService {
  private static instance: BookingAudioService;
  private audio: HTMLAudioElement | null = null;

  private constructor() {}

  static getInstance(): BookingAudioService {
    if (!BookingAudioService.instance) {
      BookingAudioService.instance = new BookingAudioService();
    }
    return BookingAudioService.instance;
  }

  /** Start looping the notification sound. Safe to call multiple times. */
  play(): void {
    if (this.audio && !this.audio.paused) return; // Already playing

    this.audio = new Audio(notificationSoundUrl);
    this.audio.loop = true;
    this.audio.volume = 0.85;

    this.audio.play().catch((err) => {
      console.warn('⚠️ [AudioService] Autoplay blocked — guide must interact with page first.', err.message);
    });
  }

  /** Stop and reset the looping audio. Safe to call even if not playing. */
  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio = null;
  }

  /**
   * Play any sound URL once (non-looping). Used for customer-side notifications.
   * No reference is kept — the Audio object is GC'd after playback.
   */
  playOnce(soundUrl: string): void {
    const audio = new Audio(soundUrl);
    audio.loop   = false;
    audio.volume = 0.85;
    audio.play().catch((err) => {
      console.warn('⚠️ [AudioService] playOnce blocked:', err.message);
    });
  }

  /**
   * Play the cancellation notification sound once.
   */
  playCancelSound(): void {
    this.playOnce(cancelSoundUrl);
  }

  get isPlaying(): boolean {
    return !!this.audio && !this.audio.paused;
  }

}

// Export a single shared instance
export const bookingAudio = BookingAudioService.getInstance();

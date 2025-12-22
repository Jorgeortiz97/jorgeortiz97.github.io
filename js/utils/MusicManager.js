// MusicManager - Handles background music playback across scenes

class MusicManager {
    constructor() {
        this.soundManager = null;
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.currentSound = null;
        this.isPlaying = false;
        this.nextTrackTimeout = null;

        // Track keys (must match keys in ASSET_PATHS.audio)
        this.trackKeys = ['soundtrack_1', 'soundtrack_2', 'soundtrack_3', 'soundtrack_4'];

        // Gap between tracks in milliseconds
        this.trackGapMs = 10000;
    }

    init(scene) {
        this.soundManager = scene.sound;

        // Create initial shuffled playlist
        this.createPlaylist();
    }

    createPlaylist() {
        this.playlist = shuffleArray([...this.trackKeys]);
        this.currentTrackIndex = 0;
    }

    start() {
        if (this.isPlaying) return;
        if (!this.soundManager) return;

        this.isPlaying = true;
        this.playCurrentTrack();
    }

    stop() {
        this.isPlaying = false;

        // Stop current track if playing
        if (this.currentSound) {
            this.currentSound.stop();
            this.currentSound = null;
        }

        // Cancel any pending timeout
        if (this.nextTrackTimeout) {
            clearTimeout(this.nextTrackTimeout);
            this.nextTrackTimeout = null;
        }
    }

    playCurrentTrack() {
        if (!this.isPlaying) return;
        if (!this.soundManager) return;

        const trackKey = this.playlist[this.currentTrackIndex];

        // Stop any existing sound
        if (this.currentSound) {
            this.currentSound.stop();
        }

        // Create and play the new track
        this.currentSound = this.soundManager.add(trackKey, {
            volume: 0.5,
            loop: false
        });

        // Listen for track completion
        this.currentSound.once('complete', () => {
            this.onTrackComplete();
        });

        this.currentSound.play();
    }

    onTrackComplete() {
        if (!this.isPlaying) return;

        // Move to next track (loop back to beginning if at end)
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;

        // Wait 10 seconds before playing next track
        // Use setTimeout (browser-based) to work across scene changes
        this.nextTrackTimeout = setTimeout(() => {
            this.playCurrentTrack();
        }, this.trackGapMs);
    }

    // Called when music is re-enabled from settings
    restart() {
        this.stop();
        this.createPlaylist();
        this.start();
    }

    // Check if music is currently playing
    getIsPlaying() {
        return this.isPlaying;
    }
}

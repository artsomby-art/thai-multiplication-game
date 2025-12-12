// =====================================================
// Sound Management System
// =====================================================

window.SoundManager = {
    context: null,
    sounds: {},
    isMuted: false,
    musicPlaying: false,
    musicTimeout: null,

    // Initialize Audio Context
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    },

    // Play a beep sound with specific frequency
    playBeep(frequency = 440, duration = 0.2, type = 'sine') {
        if (this.isMuted || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    },

    // Button click sound
    playClick() {
        this.playBeep(800, 0.1, 'square');
    },

    // Correct answer sound
    playCorrect() {
        if (this.isMuted || !this.context) return;

        // Play a cheerful melody
        const notes = [523.25, 659.25, 783.99]; // C, E, G
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playBeep(freq, 0.15, 'sine');
            }, index * 100);
        });
    },

    // Wrong answer sound
    playWrong() {
        if (this.isMuted || !this.context) return;

        // Play a gentle descending tone
        const notes = [392, 349.23]; // G, F
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playBeep(freq, 0.2, 'triangle');
            }, index * 150);
        });
    },

    // Game start sound
    playStart() {
        if (this.isMuted || !this.context) return;

        // Ascending melody
        const notes = [261.63, 329.63, 392, 523.25]; // C, E, G, C
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playBeep(freq, 0.15, 'sine');
            }, index * 100);
        });
    },

    // Countdown tick sound
    playTick() {
        this.playBeep(600, 0.05, 'square');
    },

    // Celebration sound
    playCelebration() {
        if (this.isMuted || !this.context) return;

        // Happy ascending arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (high)
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playBeep(freq, 0.2, 'sine');
            }, index * 80);
        });
    },

    // Background music (cheerful loop)
    playBackgroundMusic() {
        if (this.isMuted || !this.context || this.musicPlaying) return;

        this.musicPlaying = true;

        // Happy, playful melody for kids
        const melody = [
            { freq: 523.25, duration: 0.25 }, // C
            { freq: 659.25, duration: 0.25 }, // E
            { freq: 783.99, duration: 0.25 }, // G
            { freq: 659.25, duration: 0.25 }, // E
            { freq: 523.25, duration: 0.5 },  // C (longer)

            { freq: 587.33, duration: 0.25 }, // D
            { freq: 698.46, duration: 0.25 }, // F
            { freq: 783.99, duration: 0.25 }, // G
            { freq: 698.46, duration: 0.25 }, // F
            { freq: 587.33, duration: 0.5 },  // D (longer)

            { freq: 659.25, duration: 0.25 }, // E
            { freq: 783.99, duration: 0.25 }, // G
            { freq: 1046.50, duration: 0.25 }, // C (high)
            { freq: 783.99, duration: 0.25 }, // G
            { freq: 659.25, duration: 0.5 },  // E (longer)

            { freq: 587.33, duration: 0.25 }, // D
            { freq: 523.25, duration: 0.25 }, // C
            { freq: 587.33, duration: 0.25 }, // D
            { freq: 659.25, duration: 0.25 }, // E
            { freq: 523.25, duration: 0.8 },  // C (final, long)
        ];

        let time = 0;
        melody.forEach((note) => {
            setTimeout(() => {
                if (!this.isMuted && this.musicPlaying) {
                    this.playBeep(note.freq, note.duration * 0.9, 'triangle');
                }
            }, time * 1000);
            time += note.duration;
        });

        // Loop the music after a short pause
        this.musicTimeout = setTimeout(() => {
            this.musicPlaying = false;
            if (!this.isMuted) {
                this.playBackgroundMusic();
            }
        }, (time + 0.5) * 1000);
    },

    // Stop background music
    stopBackgroundMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
        }
    },

    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    },

    // Set volume
    setVolume(volume) {
        // Volume control could be implemented with a master gain node
        this.volume = Math.max(0, Math.min(1, volume));
    }
};

// Initialize sound system when page loads
document.addEventListener('DOMContentLoaded', () => {
    SoundManager.init();
});

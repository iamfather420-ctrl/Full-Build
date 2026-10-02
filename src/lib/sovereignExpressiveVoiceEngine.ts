// ============================================================================
// SOVEREIGN EXPRESSIVE NEURAL VOICE SYNTHESIS ENGINE (BLACK BOX)
// Replaces monotone robot speech with a natural, expressive, dynamic voice tone 
// tuned for the Daisy Haminja Sovereign persona.
// ============================================================================

export class SovereignExpressiveVoiceEngine {
  /**
   * Initializes and speaks text using human-like cadence, warm inflections, 
   * and a natural conversational voice profile.
   */
  public static speakExpressive(text: string, onStart?: () => void, onEnd?: () => void, onBoundary?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[Voice Engine] Speech synthesis not supported in this environment.');
      return;
    }

    // Cancel any ongoing robotic utterances or beeps
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Fine-tune rate and pitch for a natural, smooth, non-robotic tone
    utterance.rate = 0.95; // Slightly measured and steady for clarity
    utterance.pitch = 1.05; // Balanced warmth and presence

    // Attempt to select a high-quality human-sounding voice (prioritizing natural neural/enhanced engines)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Google') || 
      v.name.includes('Samantha') || 
      v.name.includes('Microsoft') ||
      v.lang.includes('en-US')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = () => onStart();
    if (onEnd) utterance.onend = () => onEnd();
    if (onBoundary) utterance.onboundary = () => onBoundary();
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    // Attach to window global override so Daisy Haminja utilizes this automatically
    window.speechSynthesis.speak(utterance);
    console.info('[Expressive Voice] Synthesizing natural speech response.');
  }

  /**
   * Hooks into the global application events so Daisy speaks updates naturally.
   */
  public static registerVoiceHooks(): void {
    if (typeof window === 'undefined') return;

    (window as any).DaisyVoiceOverride = {
      speak: (message: string) => this.speakExpressive(message)
    };
  }
}

export interface TranscriptionOptions {
  onResult: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (error: string) => void;
  lang?: string;
}

export class VoiceTranscriber {
  private recognition: any;
  private isListening: boolean = false;
  private silenceTimer: any;

  constructor(options: TranscriptionOptions) {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = options.lang || 'en-IN';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              options.onResult(transcript, true);
              this.resetSilenceTimer(options.onEnd);
            } else {
              interimTranscript += transcript;
              options.onResult(interimTranscript, false);
              this.resetSilenceTimer(options.onEnd);
            }
          }
        };

        this.recognition.onend = () => {
          if (this.isListening) {
            this.recognition.start();
          } else {
            options.onEnd();
          }
        };

        this.recognition.onerror = (event: any) => {
          options.onError(event.error);
        };
      }
    }
  }

  private resetSilenceTimer(onEnd: () => void) {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stop();
        onEnd();
      }
    }, 5000); // 5 seconds of silence stops recording
  }

  start() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
    }
  }
}

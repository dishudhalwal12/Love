let transcriber: any = null;

export async function getTranscriber() {
  if (typeof window === 'undefined') return null;
  if (transcriber) return transcriber;

  try {
    // Lazy load the library to avoid top-level side effects
    const { pipeline, env } = await import('@xenova/transformers');

    // Robust environment polyfills for the browser
    // @ts-ignore
    window.global = window;
    // @ts-ignore
    window.process = window.process || { env: {} };
    // @ts-ignore
    window.process.env = window.process.env || {};

    // Configure for web-only execution
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    
    // Disable multi-threading in ONNX if it causes issues in some browsers
    // @ts-ignore
    if (env.backends && env.backends.onnx) {
      env.backends.onnx.wasm.numThreads = 1;
    }

    // Load the model (OpenAI Whisper tiny)
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    return transcriber;
  } catch (error) {
    console.error("Failed to initialize Whisper engine:", error);
    return null;
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const t = await getTranscriber();
  if (!t) throw new Error("Transcriber not initialized");
  
  // Convert blob to audio buffer
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Xenova/transformers expects a Float32Array of the audio at 16kHz
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  const audioData = renderedBuffer.getChannelData(0);

  const result = await t(audioData);
  return result.text;
}

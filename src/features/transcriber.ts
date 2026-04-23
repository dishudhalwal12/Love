// Polyfill for transformers.js in some environments
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

let transcriber: any = null;
let env: any = null;

export async function getTranscriber() {
  if (transcriber) return transcriber;
  
  // Dynamic import to prevent SSR errors and improve initial bundle size
  const transformers = await import('@xenova/transformers');
  const pipeline = transformers.pipeline;
  env = transformers.env;

  // Configure environment for web
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  
  // Use the smallest model for speed and low memory on mobile
  transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  return transcriber;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const t = await getTranscriber();
  
  // Convert blob to audio buffer
  const audioContext = new AudioContext();
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

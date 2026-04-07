/**
 * Audio processing utilities for the Live API.
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioData: (base64Data: string) => void;

  constructor(onAudioData: (base64Data: string) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext is not supported in this browser');
    }

    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      this.stop();
      throw err;
    }

    if (!this.audioContext || !this.stream) return;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Using ScriptProcessorNode for simplicity in this environment, 
    // though AudioWorklet is preferred in modern apps.
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      if (!this.audioContext) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      this.onAudioData(base64Data);
    };
  }

  stop() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.audioContext = null;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  // Helper to play received PCM audio
  static async playPCM(base64Data: string, sampleRate: number = 24000) {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = audioCtx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
    
    return new Promise<void>((resolve) => {
      source.onended = () => {
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
        resolve();
      };
    });
  }
}

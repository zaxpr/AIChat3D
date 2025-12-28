export interface Message {
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

export interface AudioState {
  isPlaying: boolean;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  source: AudioBufferSourceNode | null;
}

export enum ModelStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error'
}

export type AvatarState = 'idle' | 'typing' | 'thinking' | 'speaking';
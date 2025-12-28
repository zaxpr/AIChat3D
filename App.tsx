import React, { useState, useRef, useEffect } from 'react';
import { Scene } from './components/Scene';
import { ChatInterface } from './components/ChatInterface';
import { Message, AudioState, ModelStatus, AvatarState } from './types';
// Switch back to OpenAI + ElevenLabs service
import { generateTextResponse, generateSpeech } from './services/apiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  // Set default modelUrl to vivian.vrm in /models/vivian.vrm
  const [modelUrl, setModelUrl] = useState<string | null>("/models/vivian.vrm#model.vrm");
  // Default to READY so user can chat with the default cube immediately
  const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.READY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  
  // Audio Logic Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    audioContext: null,
    analyser: null,
    source: null
  });

  // Calculate the current state of the avatar for animation purposes
  const getAvatarState = (): AvatarState => {
    if (audioState.isPlaying) return 'speaking';
    if (isProcessing) return 'thinking';
    if (isUserTyping) return 'typing';
    return 'idle';
  };

  // Initialize AudioContext on first interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // Good balance for visualizer
      analyser.smoothingTimeConstant = 0.5;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      
      setAudioState(prev => ({
        ...prev,
        audioContext: ctx,
        analyser: analyser
      }));
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handleModelUpload = (file: File) => {
    setModelStatus(ModelStatus.LOADING);
    // Create Blob URL for uploaded file
    const url = URL.createObjectURL(file) + "#model.vrm";
    setModelUrl(url);
    // Slight delay to allow Loader to show
    setTimeout(() => {
      setModelStatus(ModelStatus.READY);
    }, 1000);
  };

  const playAudio = async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current || !analyserRef.current) return;
    
    // Stop previous if exists
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
    }

    try {
      // Decode the Audio Data (ElevenLabs returns standard MP3/MPEG, so native decodeAudioData works)
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      // Connect: Source -> Analyser -> Destination (Speakers)
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      };

      sourceRef.current = source;
      source.start(0);
      setAudioState(prev => ({ ...prev, isPlaying: true, source: source }));
    } catch (err) {
      console.error("Error decoding audio", err);
      // Fallback message if audio fails
      setMessages(prev => [...prev, { role: 'model', text: "(Audio playback failed: Check API Key or format)" }]);
    }
  };

  const handleSendMessage = async (text: string) => {
    initAudioContext();
    setIsProcessing(true);
    
    // Add User Message
    const newMessages = [...messages, { role: 'user', text } as Message];
    setMessages(newMessages);

    try {
      // 1. Get Text from OpenAI
      const responseText = await generateTextResponse(newMessages, text);
      
      // Update UI with text immediately
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

      // 2. Get Audio from ElevenLabs
      const audioData = await generateSpeech(responseText);
      
      // 3. Play Audio
      await playAudio(audioData);

    } catch (error) {
      console.error("Chat flow error:", error);
      let errorMessage = "Sorry, I encountered an error.";
      if (error instanceof Error) errorMessage += " " + error.message;
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-black text-white overflow-hidden" onClick={initAudioContext}>
      
      {/* Left Panel: 3D Scene (66% width on desktop) */}
      <div className="w-full md:w-2/3 h-[50vh] md:h-full relative bg-gradient-to-b from-gray-900 to-black">
         <Scene 
            modelUrl={modelUrl} 
            audioState={audioState} 
            avatarState={getAvatarState()}
         />
         
         {/* Optional Overlay for Scene status */}
         {modelStatus === ModelStatus.LOADING && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <span className="text-white font-bold">Loading Model...</span>
            </div>
         )}
      </div>

      {/* Right Panel: Chat Interface (33% width on desktop) */}
      <div className="w-full md:w-1/3 h-[50vh] md:h-full bg-gray-900 border-t md:border-t-0 md:border-l border-white/10 relative z-10 shadow-2xl">
        <ChatInterface 
          messages={messages}
          onSendMessage={handleSendMessage}
          onModelUpload={handleModelUpload}
          onUserTyping={setIsUserTyping}
          modelStatus={modelStatus}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default App;
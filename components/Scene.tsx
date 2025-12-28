import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Loader } from '@react-three/drei';
import { VRMAvatar } from './VRMAvatar';
import { DefaultAvatar } from './DefaultAvatar';
import { AudioState, AvatarState } from '../types';

interface SceneProps {
  modelUrl: string | null;
  audioState: AudioState;
  avatarState: AvatarState;
}

export const Scene: React.FC<SceneProps> = ({ modelUrl, audioState, avatarState }) => {
  return (
    <>
      <Canvas
        // Setup camera for a "Portrait" shot (Shoulders to Head)
        // Position Y=0.9 aligns roughly with the neck/face center given the VRM scaling/positioning
        // FOV 30 creates a flatter, more portrait-like lens effect
        camera={{ position: [0, 0.9, 2.0], fov: 30 }} 
        shadows
        className="w-full h-full bg-gradient-to-b from-gray-900 to-black"
      >
        <ambientLight intensity={0.8} />
        {/* Switched to DirectionalLight for more stable shadow rendering with VRM/MToon */}
        <directionalLight 
            position={[5, 10, 5]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#b0c4de" />
        
        <Suspense fallback={null}>
            <Environment preset="city" />
            
            {modelUrl ? (
                <VRMAvatar url={modelUrl} audioState={audioState} avatarState={avatarState} />
            ) : (
                <DefaultAvatar audioState={audioState} />
            )}
        </Suspense>

        <Grid 
            position={[0, -5, 0]} 
            args={[100, 100]} 
            cellSize={2} 
            cellThickness={1} 
            cellColor="#444" 
            sectionSize={10} 
            sectionThickness={1.5} 
            sectionColor="#666" 
            fadeDistance={50} 
            infiniteGrid 
        />
        
        <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
        {/* Target locked to the face area (Y=0.9) to keep rotation centered on the head */}
        <OrbitControls 
            target={[0, 0.9, 0]} 
            minPolarAngle={Math.PI / 3} // Limit looking too high
            maxPolarAngle={Math.PI / 1.8} // Limit looking too low
            minDistance={1.0} // Prevent zooming too close (inside head)
            maxDistance={4.0} // Prevent zooming too far out
        />
      </Canvas>
      <Loader />
    </>
  );
};
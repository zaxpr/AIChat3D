import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { MMDLoader } from 'three-stdlib';
import * as THREE from 'three';
import { AudioState } from '../types';

interface MMDModelProps {
  url: string;
  audioState: AudioState;
}

export const MMDModel: React.FC<MMDModelProps> = ({ url, audioState }) => {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  
  // We use useLoader to load the PMX file. 
  // MMDLoader returns a mesh or a scene object depending on implementation details, 
  // typically it returns the mesh directly or an object containing mesh.
  // Note: Loading MMD models without texture paths mapped correctly in a browser environment 
  // can result in white models. This is expected behavior for a single-file upload demo.
  const mmd = useLoader(MMDLoader, url);
  
  // To store the index of the mouth morph target
  const [morphIndex, setMorphIndex] = useState<number | null>(null);

  useEffect(() => {
    if (mmd && meshRef.current) {
      // Create a Physics helper if needed, but for simple lip sync we just need the mesh
      // Identify the morph target for mouth opening.
      // Common Japanese MMD names: 'あ' (a), 'い' (i), 'う' (u), 'え' (e), 'お' (o).
      // 'あ' is usually the best for general talking amplitude.
      const dict = meshRef.current.morphTargetDictionary;
      if (dict) {
        // Try to find common mouth open morphs
        const target = dict['あ'] ?? dict['a'] ?? dict['aa'] ?? dict['mouth_a'] ?? 0;
        setMorphIndex(target);
      }
      
      // Basic material adjustment to ensure it's visible
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach(m => {
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
        });
      }
    }
  }, [mmd]);

  // Animation Loop
  useFrame(() => {
    if (!meshRef.current || morphIndex === null || !audioState.analyser || !audioState.isPlaying) {
      // Reset mouth if not playing
      if (meshRef.current && morphIndex !== null && (!audioState.isPlaying)) {
         if (meshRef.current.morphTargetInfluences) {
             // Smooth closing
             meshRef.current.morphTargetInfluences[morphIndex] = THREE.MathUtils.lerp(meshRef.current.morphTargetInfluences[morphIndex], 0, 0.2);
         }
      }
      return;
    }

    // Get Audio Data
    const dataArray = new Uint8Array(audioState.analyser.frequencyBinCount);
    audioState.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume of relevant speech frequencies (lower-mid range)
    let sum = 0;
    // We only take a slice of the frequency spectrum where human voice usually sits
    const startBin = 2; 
    const endBin = 50; 
    for (let i = startBin; i < endBin; i++) {
      sum += dataArray[i];
    }
    const average = sum / (endBin - startBin);
    
    // Map volume (0-255) to morph influence (0-1)
    // Add a threshold so mouth doesn't jitter on silence
    const sensitivity = 2.0;
    const value = Math.min(1, Math.max(0, (average / 100) * sensitivity));

    // Apply to morph target with some smoothing
    if (meshRef.current.morphTargetInfluences) {
        const current = meshRef.current.morphTargetInfluences[morphIndex];
        meshRef.current.morphTargetInfluences[morphIndex] = THREE.MathUtils.lerp(current, value, 0.4);
    }
  });

  return (
    <primitive 
      object={mmd} 
      ref={meshRef} 
      position={[0, -10, 0]} 
      scale={[1, 1, 1]} 
    />
  );
};
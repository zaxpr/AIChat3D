import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioState } from '../types';
import { RoundedBox } from '@react-three/drei';

interface DefaultAvatarProps {
  audioState: AudioState;
}

export const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ audioState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    let targetScaleY = 1;
    let targetColor = new THREE.Color("#4f46e5"); // Base Blue

    if (audioState.isPlaying && audioState.analyser) {
        const dataArray = new Uint8Array(audioState.analyser.frequencyBinCount);
        audioState.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume of speech frequencies
        let sum = 0;
        const startBin = 2; 
        const endBin = 30; 
        for (let i = startBin; i < endBin; i++) {
            sum += dataArray[i];
        }
        const average = sum / (endBin - startBin);
        const volume = Math.min(1, average / 100);

        // Squash and stretch effect
        // When Y goes up (mouth open), X and Z shrink slightly to preserve volume illusion
        targetScaleY = 1 + (volume * 0.5); 
        
        // Pulse color on loud volumes
        if (volume > 0.2) {
            targetColor = new THREE.Color("#818cf8"); // Lighter Blue
        }
    }

    // Smooth interpolation
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScaleY, 0.2);
    
    // Inverse scale for X/Z to squash/stretch
    const inverseScale = 1 / Math.sqrt(meshRef.current.scale.y);
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, inverseScale, 0.2);
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, inverseScale, 0.2);

    if (materialRef.current) {
        materialRef.current.color.lerp(targetColor, 0.1);
        materialRef.current.emissive.lerp(targetColor, 0.1);
    }
    
    // Idle floating animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.5;
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <group position={[0, 0, 0]}>
        <RoundedBox 
            ref={meshRef} 
            args={[2, 2, 2]} // Width, Height, Depth
            radius={0.4} // Smooth corners
            smoothness={4} 
        >
            <meshStandardMaterial 
                ref={materialRef}
                color="#4f46e5" 
                roughness={0.2}
                metalness={0.5}
                emissive="#4f46e5"
                emissiveIntensity={0.2}
            />
        </RoundedBox>
        
        {/* Simple "Eyes" */}
        <group position={[0, 0.5, 1.1]}>
             <mesh position={[-0.5, 0, 0]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color="white" />
             </mesh>
             <mesh position={[0.5, 0, 0]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color="white" />
             </mesh>
        </group>
    </group>
  );
};
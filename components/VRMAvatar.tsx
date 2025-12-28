import React, { useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three-stdlib';
import { VRMLoaderPlugin, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { AudioState, AvatarState } from '../types';

// Suppress specific VRM warnings that are expected for VRM 0.0 models loaded in newer Three.js versions
// These warnings are informative but do not prevent the model from working.
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (
    msg.includes('VRMMaterialsV0CompatPlugin') || 
    msg.includes('Curves of LookAtDegreeMap')
  ) {
    return;
  }
  originalWarn(...args);
};

interface VRMAvatarProps {
  url: string;
  audioState: AudioState;
  avatarState: AvatarState;
}

export const VRMAvatar: React.FC<VRMAvatarProps> = ({ url, audioState, avatarState }) => {
  const [vrm, setVrm] = useState<any>(null);

  // Load VRM using GLTFLoader with VRMLoaderPlugin
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => {
      // @ts-ignore: Cast to any to handle type mismatch between three-stdlib and @pixiv/three-vrm
      return new VRMLoaderPlugin(parser as any) as any;
    });
  });

  useEffect(() => {
    if (gltf && gltf.userData.vrm) {
      const vrmInstance = gltf.userData.vrm;
      
      // Fix rotation for VRM 0.x models to face forward
      VRMUtils.rotateVRM0(vrmInstance);

      // Disable built-in LookAt to prevent conflicts with our custom animation
      // and to avoid issues with unsupported LookAtDegreeMap curves
      if (vrmInstance.lookAt) {
        vrmInstance.lookAt.autoUpdate = false;
      }
      
      // Enable shadows for all meshes
      vrmInstance.scene.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            // Prevent culling issues
            obj.frustumCulled = false; 
        }
      });

      setVrm(vrmInstance);
    }
  }, [gltf]);

  useFrame((state, delta) => {
    if (vrm) {
      // 1. Update VRM internal physics (SpringBone, etc.)
      vrm.update(delta);

      // 2. Procedural Animation logic
      const t = state.clock.elapsedTime;
      const humanoid = vrm.humanoid;

      // Helper function to safely rotate a bone if it exists
      // Using lerp for smooth transitions between states
      const rotateBone = (boneName: VRMHumanBoneName, x: number, y: number, z: number, speed: number = 0.1) => {
        const node = humanoid.getRawBoneNode(boneName);
        if (node) {
            node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, x, speed);
            node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, y, speed);
            node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, z, speed);
        }
      };

      if (avatarState === 'thinking') {
         // --- THINKING STATE ---
         // Head: Tilt and look up slightly
         rotateBone(VRMHumanBoneName.Head, 0.1, 0.3, -0.1, 0.05); 
         rotateBone(VRMHumanBoneName.Neck, 0, 0.1, 0, 0.05); 
         rotateBone(VRMHumanBoneName.Spine, 0.05, 0, 0, 0.05);
         
         // Left Arm: Hand on hip (maintaining posture)
         rotateBone(VRMHumanBoneName.LeftUpperArm, 0, 0, 0.9, 0.05); 
         rotateBone(VRMHumanBoneName.LeftLowerArm, 0, 1.4, 0, 0.05);
         rotateBone(VRMHumanBoneName.LeftHand, 0, -0.5, 0.5, 0.05);

         // Right Arm: "Thinking" pose (Hand near chin)
         // Upper Arm: Lifted forward and slightly up
         rotateBone(VRMHumanBoneName.RightUpperArm, -0.5, -0.6, -0.8, 0.05); 
         // Lower Arm: Bent sharply to bring hand up
         rotateBone(VRMHumanBoneName.RightLowerArm, 0, -2.0, 0, 0.05); 
         // Hand: Relaxed
         rotateBone(VRMHumanBoneName.RightHand, 0, 0, 0, 0.05);

      } else if (avatarState === 'typing') {
         // --- TYPING STATE ---
         // Head: Looking down
         rotateBone(VRMHumanBoneName.Head, 0.3, 0, 0, 0.1); 
         rotateBone(VRMHumanBoneName.Neck, 0.2, 0, 0, 0.1); 
         rotateBone(VRMHumanBoneName.Spine, 0.2, 0, 0, 0.1); 

         // Arms: Forward and bent "typing" on a keyboard
         // Left Arm
         rotateBone(VRMHumanBoneName.LeftUpperArm, 0.2, 0.2, 1.2, 0.1); 
         rotateBone(VRMHumanBoneName.LeftLowerArm, 0, 1.5, 0, 0.1);
         // Right Arm
         rotateBone(VRMHumanBoneName.RightUpperArm, 0.2, -0.2, -1.2, 0.1);
         rotateBone(VRMHumanBoneName.RightLowerArm, 0, -1.5, 0, 0.1);

      } else if (avatarState === 'speaking') {
         // --- SPEAKING STATE ---
         // Dynamic movement variables
         const headBob = Math.sin(t * 12) * 0.08; 
         const headSway = Math.cos(t * 3) * 0.1;
         const armGesture = Math.sin(t * 5) * 0.2; // Rhythmic arm movement

         // Head: Expressive bobbing
         rotateBone(VRMHumanBoneName.Head, headBob, headSway, 0, 0.1); 
         rotateBone(VRMHumanBoneName.Neck, 0, headSway * 0.5, 0, 0.1);
         rotateBone(VRMHumanBoneName.Spine, 0.05, 0, 0, 0.05);

         // Arms: Gesturing but keeping left hand on hip for character consistency
         // Left Arm: Hand on hip (Anchored)
         rotateBone(VRMHumanBoneName.LeftUpperArm, 0, 0, 0.9, 0.05); 
         rotateBone(VRMHumanBoneName.LeftLowerArm, 0, 1.4, 0, 0.05);
         
         // Right Arm: Gesturing actively
         rotateBone(VRMHumanBoneName.RightUpperArm, 0, 0, -1.1 - armGesture, 0.05); 
         rotateBone(VRMHumanBoneName.RightLowerArm, 0, -0.8 - (armGesture * 0.5), 0, 0.05);

      } else {
         // --- IDLE STATE (HANDS ON HIPS / PANGGUL) ---
         // 1. Breathing (Rhythmic expansion/rotation of the spine)
         const breathTime = t * 2.0;
         const breathe = Math.sin(breathTime) * 0.04; 
         
         // 2. Drifting (Subtle body sway to simulate aliveness)
         const driftTime = t * 0.5;
         const drift = Math.sin(driftTime) * 0.02;

         // Apply motions
         rotateBone(VRMHumanBoneName.Head, 0, drift * 0.5, 0, 0.02);
         rotateBone(VRMHumanBoneName.Neck, 0, 0, 0, 0.02);
         rotateBone(VRMHumanBoneName.Spine, breathe, 0, drift, 0.02);
         rotateBone(VRMHumanBoneName.Hips, 0, 0, drift * 0.5, 0.02); // Subtle weight shift

         // Left Arm (Hand on Hip)
         // Upper Arm: Out and slightly down (~50 degrees)
         rotateBone(VRMHumanBoneName.LeftUpperArm, 0, 0, 0.9, 0.05); 
         // Lower Arm: Bent inward (~80 degrees)
         rotateBone(VRMHumanBoneName.LeftLowerArm, 0, 1.4, 0, 0.05);
         // Hand: Tilted to rest on hip
         rotateBone(VRMHumanBoneName.LeftHand, 0.2, -0.2, 0.5, 0.05);

         // Right Arm (Hand on Hip)
         // Upper Arm: Out and slightly down (~50 degrees)
         rotateBone(VRMHumanBoneName.RightUpperArm, 0, 0, -0.9, 0.05);
         // Lower Arm: Bent inward (~80 degrees)
         rotateBone(VRMHumanBoneName.RightLowerArm, 0, -1.4, 0, 0.05);
         // Hand: Tilted to rest on hip
         rotateBone(VRMHumanBoneName.RightHand, 0.2, 0.2, -0.5, 0.05);
      }

      // 3. Lip Sync (Mouth Movement)
      if (audioState.isPlaying && audioState.analyser) {
         const dataArray = new Uint8Array(audioState.analyser.frequencyBinCount);
         audioState.analyser.getByteFrequencyData(dataArray);
         
         // Calculate volume from frequency data
         let sum = 0;
         const startBin = 2; 
         const endBin = 30; 
         for (let i = startBin; i < endBin; i++) {
           sum += dataArray[i];
         }
         const average = sum / (endBin - startBin);
         
         // Amplify and clamp volume
         const volume = Math.min(1.0, Math.max(0, (average / 255) * 3.5));
         
         if (vrm.expressionManager) {
            vrm.expressionManager.setValue('aa', volume);
            
            // Auto blink override when speaking loudly (squint)
            if (volume > 0.6) {
                vrm.expressionManager.setValue('blink', THREE.MathUtils.lerp(vrm.expressionManager.getValue('blink'), 0.5, 0.2));
            }
         }
      } else {
         // Close mouth smoothly when not speaking
         if (vrm.expressionManager) {
            const currentAa = vrm.expressionManager.getValue('aa');
            vrm.expressionManager.setValue('aa', THREE.MathUtils.lerp(currentAa, 0, 0.2));
            
            // Procedural Blinking in Idle/Silence
            const blinkTrigger = Math.sin(t * 2);
            // Random blink logic: Blink every ~3 seconds
            const isBlinking = Math.random() > 0.992; 
            const currentBlink = vrm.expressionManager.getValue('blink');
            
            if (isBlinking) {
                vrm.expressionManager.setValue('blink', 1);
            } else {
                vrm.expressionManager.setValue('blink', THREE.MathUtils.lerp(currentBlink, 0, 0.2));
            }
         }
      }
    }
  });

  return <primitive object={gltf.scene} position={[0, -5, 0]} rotation={[0, Math.PI, 0]} scale={4} />;
};
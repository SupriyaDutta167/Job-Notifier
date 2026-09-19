import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Fallback visual component when WebGL is unavailable or fails
export const HeroSceneFallback: React.FC = () => {
  return (
    <div 
      data-testid="hero-scene-fallback"
      className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] flex items-center justify-center rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/80"
    >
      <div className="absolute inset-0 bg-radial-gradient opacity-60 pointer-events-none" />
      
      {/* SVG Network Graphic */}
      <svg className="w-full h-full max-w-lg p-6" viewBox="0 0 500 500" fill="none">
        {/* Concentric orbital circles */}
        <circle cx="250" cy="250" r="190" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="250" cy="250" r="130" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 5" />
        <circle cx="250" cy="250" r="70" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* Connecting pulse lines */}
        <line x1="250" y1="250" x2="110" y2="150" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="250" y1="250" x2="390" y2="170" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="250" y1="250" x2="360" y2="360" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="250" y1="250" x2="130" y2="350" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Floating company satellite nodes */}
        <g className="animate-pulse">
          <circle cx="110" cy="150" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
          <text x="110" y="154" fill="#38bdf8" fontSize="9" textAnchor="middle" fontFamily="monospace">AMZN</text>

          <circle cx="390" cy="170" r="14" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
          <text x="390" y="174" fill="#60a5fa" fontSize="9" textAnchor="middle" fontFamily="monospace">GOOG</text>

          <circle cx="360" cy="360" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
          <text x="360" y="364" fill="#34d399" fontSize="9" textAnchor="middle" fontFamily="monospace">NVDA</text>

          <circle cx="130" cy="350" r="14" fill="#0f172a" stroke="#8b5cf6" strokeWidth="2" />
          <text x="130" y="354" fill="#a78bfa" fontSize="9" textAnchor="middle" fontFamily="monospace">JPMC</text>
        </g>

        {/* Central Job Watcher Core */}
        <circle cx="250" cy="250" r="32" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="250" cy="250" r="18" fill="#06b6d4" fillOpacity="0.8" />
        <circle cx="250" cy="250" r="6" fill="#ffffff" />
      </svg>
      
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          Job Intelligence Network • Static Mode
        </span>
      </div>
    </div>
  );
};

// Error Boundary around 3D canvas
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}
export class HeroSceneErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('HeroScene 3D error, rendering fallback:', error);
  }
  render() {
    if (this.state.hasError) {
      return <HeroSceneFallback />;
    }
    return this.props.children;
  }
}

// Check if WebGL is available in the current environment
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const HeroScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 16);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    // Geometries & Materials tracking for cleanup
    const disposables: { dispose: () => void }[] = [];

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x0f172a, 3.0);
    scene.add(ambientLight);

    const centerPointLight = new THREE.PointLight(0x38bdf8, 4.0, 30);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
    topLight.position.set(5, 10, 7);
    scene.add(topLight);

    // 1. Central Core Node (Job Watcher Orchestrator)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const coreGeo = new THREE.IcosahedronGeometry(1.6, 2);
    disposables.push(coreGeo);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
    });
    disposables.push(coreMat);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    const innerCoreGeo = new THREE.SphereGeometry(1.0, 16, 16);
    disposables.push(innerCoreGeo);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false,
    });
    disposables.push(innerCoreMat);
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    // 2. Concentric Orbital Rings
    const ringsGroup = new THREE.Group();
    scene.add(ringsGroup);

    const ringRadii = [3.8, 5.8, 7.8];
    const ringTilts = [
      { x: 0.8, y: 0.2 },
      { x: -0.6, y: 0.5 },
      { x: 0.3, y: -0.7 },
    ];

    ringRadii.forEach((radius, i) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
      disposables.push(ringGeo);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x0284c7 : i === 1 ? 0x3b82f6 : 0x64748b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      disposables.push(ringMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = ringTilts[i].x;
      ring.rotation.y = ringTilts[i].y;
      ringsGroup.add(ring);
    });

    // 3. Orbiting Company Nodes (NVIDIA, Amazon, Google, JP Morgan representations)
    interface OrbitNode {
      mesh: THREE.Mesh;
      line: THREE.Line;
      radius: number;
      speed: number;
      angle: number;
      tiltX: number;
      tiltY: number;
    }

    const orbitNodes: OrbitNode[] = [];
    const companyColors = [
      0x10b981, // Emerald (NVIDIA)
      0xf59e0b, // Amber (Amazon)
      0x38bdf8, // Cyan/Blue (Google)
      0x8b5cf6, // Purple (JP Morgan)
    ];

    companyColors.forEach((color, i) => {
      const nodeGeo =
        i === 0
          ? new THREE.OctahedronGeometry(0.5)
          : i === 1
          ? new THREE.BoxGeometry(0.7, 0.7, 0.7)
          : i === 2
          ? new THREE.DodecahedronGeometry(0.5)
          : new THREE.TetrahedronGeometry(0.6);
      disposables.push(nodeGeo);

      const nodeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7,
      });
      disposables.push(nodeMat);
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      scene.add(nodeMesh);

      // Connecting line from node to center
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      disposables.push(lineGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });
      disposables.push(lineMat);
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);

      orbitNodes.push({
        mesh: nodeMesh,
        line,
        radius: 4.2 + i * 1.1,
        speed: (0.35 - i * 0.05) * (i % 2 === 0 ? 1 : -1),
        angle: (i * Math.PI) / 2,
        tiltX: ringTilts[i % ringTilts.length].x,
        tiltY: ringTilts[i % ringTilts.length].y,
      });
    });

    // 4. Ambient Data Stream Particles
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 2.5 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    disposables.push(particleGeo);

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
    });
    disposables.push(particleMat);

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize handling
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Tab visibility handling
    let isTabVisible = !document.hidden;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      if (!isTabVisible) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth camera parallax
      targetX += (mouseX * 1.5 - targetX) * 0.05;
      targetY += (mouseY * 1.0 - targetY) * 0.05;
      camera.position.x = targetX;
      camera.position.y = targetY;
      camera.lookAt(0, 0, 0);

      if (!prefersReducedMotion) {
        // Rotate central core
        coreGroup.rotation.y += 0.4 * delta;
        coreGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.15;

        // Pulse inner core scale
        const pulse = 1 + Math.sin(elapsed * 2.0) * 0.06;
        innerCoreMesh.scale.set(pulse, pulse, pulse);

        // Rotate rings
        ringsGroup.rotation.z += 0.05 * delta;

        // Orbit nodes
        orbitNodes.forEach((node) => {
          node.angle += node.speed * delta;
          const x = Math.cos(node.angle) * node.radius;
          const z = Math.sin(node.angle) * node.radius;

          // Apply orbital tilt
          const tiltedY = z * Math.sin(node.tiltX);
          const tiltedZ = z * Math.cos(node.tiltX);

          node.mesh.position.set(x, tiltedY, tiltedZ);
          node.mesh.rotation.x += delta * 1.2;
          node.mesh.rotation.y += delta * 1.5;

          // Update connecting line
          const positions = (node.line.geometry as THREE.BufferGeometry).attributes.position;
          positions.setXYZ(1, x, tiltedY, tiltedZ);
          positions.needsUpdate = true;
        });

        // Rotate background particle field
        particleSystem.rotation.y += 0.08 * delta;
        particleSystem.rotation.x += 0.03 * delta;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      // Render single static frame
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);

      disposables.forEach((item) => item.dispose());
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  if (!webGLSupported) {
    return <HeroSceneFallback />;
  }

  return (
    <div
      ref={containerRef}
      data-testid="hero-scene-canvas"
      className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] flex items-center justify-center pointer-events-auto"
    />
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Activity, ShieldCheck, Radio } from 'lucide-react';

interface CompanyNode {
  name: string;
  angle: number;
  distance: number;
  color: number;
}

const DEFAULT_COMPANIES: CompanyNode[] = [
  { name: 'NVIDIA', angle: 0, distance: 3.2, color: 0x76b900 },
  { name: 'Amazon', angle: Math.PI * 0.5, distance: 3.2, color: 0xff9900 },
  { name: 'Google', angle: Math.PI, distance: 3.2, color: 0x4285f4 },
  { name: 'JP Morgan', angle: Math.PI * 1.5, distance: 3.2, color: 0x006699 },
];

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

const MonitoringOrbitFallback: React.FC = () => {
  return (
    <div className="relative flex h-full min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      {/* SVG Diagram Fallback */}
      <svg className="h-48 w-48 animate-pulse opacity-80" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="75" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <circle cx="100" cy="100" r="50" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
        <circle cx="100" cy="100" r="16" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.5" />
        {/* Company satellite dots */}
        <circle cx="175" cy="100" r="6" fill="#76b900" />
        <circle cx="100" cy="25" r="6" fill="#ff9900" />
        <circle cx="25" cy="100" r="6" fill="#4285f4" />
        <circle cx="100" cy="175" r="6" fill="#006699" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono text-xs font-semibold text-cyan-400">MONITORING ENGINE</span>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">Continuous Career Radar</span>
      </div>
    </div>
  );
};

export const MonitoringOrbit: React.FC<{ companyCount?: number; activeProfiles?: number; height?: number }> = ({
  companyCount = 4,
  activeProfiles = 2,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 4, 7);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x06b6d4, 2, 20);
    pointLight.position.set(0, 3, 2);
    scene.add(pointLight);

    // Central Core Node (Job Watcher Orchestrator)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const coreGeo = new THREE.SphereGeometry(0.55, 20, 20);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // Core Wireframe Halo
    const haloGeo = new THREE.SphereGeometry(0.75, 12, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    coreGroup.add(haloMesh);

    // Orbital Ring
    const ringGeo = new THREE.RingGeometry(3.18, 3.22, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Satellite Company Nodes
    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);

    const satelliteMeshes: THREE.Mesh[] = [];
    DEFAULT_COMPANIES.forEach((comp) => {
      const satGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const satMat = new THREE.MeshStandardMaterial({
        color: comp.color,
        emissive: comp.color,
        emissiveIntensity: 0.4,
        roughness: 0.3,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.position.set(
        Math.cos(comp.angle) * comp.distance,
        0,
        Math.sin(comp.angle) * comp.distance
      );
      satelliteGroup.add(satMesh);
      satelliteMeshes.push(satMesh);
    });

    // Ambient Data Particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const r = 1.2 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      particlePositions[i] = Math.cos(theta) * r;
      particlePositions[i + 1] = (Math.random() - 0.5) * 0.8;
      particlePositions[i + 2] = Math.sin(theta) * r;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (document.hidden) return; // Pause when tab is hidden

      const delta = clock.getDelta();
      if (!prefersReducedMotion) {
        // Orbit rotation
        satelliteGroup.rotation.y += delta * 0.25;
        particleSystem.rotation.y += delta * 0.15;
        coreGroup.rotation.y -= delta * 0.3;

        // Core pulse
        const pulse = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
        haloMesh.scale.set(pulse, pulse, pulse);
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer && container) {
        try {
          container.removeChild(renderer.domElement);
          renderer.dispose();
        } catch {
          // ignore
        }
      }
      coreGeo.dispose();
      coreMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return <MonitoringOrbitFallback />;
  }

  return (
    <div
      style={{ height: height ? `${height}px` : undefined }}
      className="relative h-full min-h-[220px] w-full rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden backdrop-blur-sm"
    >
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Floating Status Telemetry Badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-cyan-300 backdrop-blur-md">
          <Radio className="h-3 w-3 animate-pulse text-cyan-400" />
          <span>RADAR ACTIVE</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>{companyCount} TARGETS</span>
        </div>
      </div>

      {/* Bottom Center Engine Caption */}
      <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center pointer-events-none">
        <div className="rounded-full border border-slate-800/80 bg-slate-950/80 px-3 py-1 text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-md flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{activeProfiles} Watch Profiles &bull; Continuous Crawler Sync</span>
        </div>
      </div>
    </div>
  );
};

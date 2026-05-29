import { useEffect, useRef, useState } from 'react';
import { ThreeSceneManager } from '@/lib/three-scene';
import * as THREE from 'three';

interface Project {
  id: string;
  name: string;
  progress: number;
  color: number;
}

interface ThreeDProjectDashboardProps {
  projects?: Project[];
  onProjectClick?: (projectId: string) => void;
}

export function ThreeDProjectDashboard({ projects = [], onProjectClick }: ThreeDProjectDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    if (projects.length === 0) {
      setIsLoading(false);
      return;
    }

    const scene = new ThreeSceneManager({
      container: containerRef.current,
      backgroundColor: 0x080807,
    });

    const cubes: { mesh: THREE.Mesh; projectId: string }[] = [];

    projects.slice(0, 9).forEach((project, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = (col - 1) * 22;
      const y = 14 - row * 22;
      const size = 7 + Math.min(project.progress, 100) / 25;

      const cube = scene.createGradientCube(size, { x, y, z: 0 }, {
        top: project.color,
        bottom: 0x1c160d,
        side: project.color,
      });

      scene.animateRotation(cube, 0.004, { x: true, y: true });
      cubes.push({ mesh: cube, projectId: project.id });

      scene.createCylinder(2.4, 2.4, Math.max(project.progress * 0.18, 0.5), { x, y: y - 12, z: 0 }, 0x6ee7d8);
      scene.createTextMesh(project.name.substring(0, 14), { x, y: y + 12, z: 0 }, 24, '#f8f4e8');
      scene.createTextMesh(`${Math.round(project.progress)}%`, { x, y: y - 20, z: 0 }, 20, '#c9a24d');
    });

    scene.startAnimationLoop(() => {
      const time = Date.now() * 0.00018;
      scene.camera.position.x = Math.sin(time) * 9;
      scene.camera.position.y = Math.cos(time * 0.8) * 4;
      scene.camera.position.z = 62;
      scene.camera.lookAt(0, -3, 0);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, scene.camera);
      const intersects = raycaster.intersectObjects(cubes.map((c) => c.mesh));
      if (intersects.length > 0) {
        const clickedCube = cubes.find((c) => c.mesh === intersects[0].object);
        if (clickedCube) onProjectClick?.(clickedCube.projectId);
      }
    };

    containerRef.current.addEventListener('click', onMouseClick);
    setIsLoading(false);

    return () => {
      containerRef.current?.removeEventListener('click', onMouseClick);
      scene.dispose();
    };
  }, [projects, onProjectClick]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,#2a2112,#080807_70%)]">
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: '520px' }} />

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="text-white">جاري تحميل لوحة التحكم 3D...</div>
        </div>
      )}

      {projects.length === 0 && !isLoading && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-2xl border border-primary/20 bg-black/30 px-6 py-5 text-center backdrop-blur">
            <p className="text-lg font-bold text-foreground">لا توجد مشاريع بعد</p>
            <p className="text-sm text-muted-foreground">أنشئ مشروعك الأول وستظهر البيانات هنا بشكل 3D</p>
          </div>
        </div>
      )}
    </div>
  );
}

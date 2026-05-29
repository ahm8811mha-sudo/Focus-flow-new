import { useEffect, useRef, useState } from 'react';
import { ThreeSceneManager } from '@/lib/three-scene';

interface StatisticData {
  label: string;
  value: number;
  maxValue: number;
  color: number;
}

interface ThreeDStatisticsProps {
  data?: StatisticData[];
  title?: string;
}

export function ThreeDStatistics({
  data = [],
  title = 'إحصائيات المشروع',
}: ThreeDStatisticsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    if (data.length === 0) {
      setIsLoading(false);
      return;
    }

    const scene = new ThreeSceneManager({
      container: containerRef.current,
      backgroundColor: 0x080807,
    });

    data.forEach((stat, index) => {
      const denominator = Math.max(stat.maxValue, 1);
      const x = (index - (data.length - 1) / 2) * 15;
      const height = Math.max((stat.value / denominator) * 30, 0.6);

      const bar = scene.createCylinder(4, 4, height, { x, y: height / 2 - 15, z: 0 }, stat.color);
      bar.scale.y = 0.01;

      scene.createTextMesh(stat.label.substring(0, 10), { x, y: -23, z: 0 }, 24, '#f8f4e8');
      scene.createTextMesh(`${stat.value}`, { x, y: height / 2 + 6, z: 0 }, 28, '#c9a24d');

      const duration = 850;
      const startTime = Date.now();

      const animateBar = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        bar.scale.y = Math.max(eased, 0.01);
        bar.position.y = (height * eased) / 2 - 15;
        if (progress < 1) requestAnimationFrame(animateBar);
      };

      animateBar();
    });

    scene.startAnimationLoop(() => {
      const time = Date.now() * 0.00012;
      scene.camera.position.x = Math.sin(time) * 42;
      scene.camera.position.z = 54 + Math.cos(time) * 10;
      scene.camera.lookAt(0, -5, 0);
    });

    setIsLoading(false);

    return () => {
      scene.dispose();
    };
  }, [data]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top,#241d10,#080807_70%)]">
      <div className="absolute right-5 top-5 z-10 text-right text-white">
        <p className="text-xs text-primary">Live 3D Analytics</p>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>

      <div ref={containerRef} className="h-full w-full" style={{ minHeight: '400px' }} />

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="text-white">جاري تحميل الإحصائيات...</div>
        </div>
      )}

      {data.length === 0 && !isLoading && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-2xl border border-primary/20 bg-black/30 px-6 py-4 text-center text-muted-foreground backdrop-blur">
            لا توجد بيانات لعرضها بعد
          </div>
        </div>
      )}
    </div>
  );
}

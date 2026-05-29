import * as THREE from 'three';

/**
 * Lightweight Three.js scene manager for the Lateen Notes dashboard.
 * The class owns the renderer, resize listener and every animation frame it creates
 * so React components can mount/unmount without leaking canvases or RAF loops.
 */
export interface SceneConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: number;
}

export class ThreeSceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
  objects: THREE.Object3D[] = [];

  private animationFrameIds = new Set<number>();
  private readonly resizeHandler: () => void;

  constructor(config: SceneConfig) {
    this.container = config.container;

    const backgroundColor = config.backgroundColor ?? 0x080807;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
    this.scene.fog = new THREE.Fog(backgroundColor, 80, 600);

    const width = Math.max(config.width ?? this.container.clientWidth, 320);
    const height = Math.max(config.height ?? this.container.clientHeight, 320);

    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 58);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.handleResize();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xf8f4e8, 0.72);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff2c6, 1.15);
    keyLight.position.set(22, 34, 28);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    const tealLight = new THREE.PointLight(0x6ee7d8, 0.85, 160);
    tealLight.position.set(-32, 18, 36);
    this.scene.add(tealLight);

    const goldLight = new THREE.PointLight(0xc9a24d, 0.65, 180);
    goldLight.position.set(36, -24, 18);
    this.scene.add(goldLight);
  }

  private handleResize() {
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private requestFrame(callback: FrameRequestCallback) {
    const frameId = requestAnimationFrame((time) => {
      this.animationFrameIds.delete(frameId);
      callback(time);
    });
    this.animationFrameIds.add(frameId);
    return frameId;
  }

  createGradientCube(
    size: number = 10,
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    colors: { top: number; bottom: number; side: number } = {
      top: 0xc9a24d,
      bottom: 0x6b5528,
      side: 0x6ee7d8,
    }
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, size, size, 2, 2, 2);
    const materials = [
      new THREE.MeshStandardMaterial({ color: colors.side, metalness: 0.18, roughness: 0.32 }),
      new THREE.MeshStandardMaterial({ color: colors.side, metalness: 0.18, roughness: 0.32 }),
      new THREE.MeshStandardMaterial({ color: colors.top, metalness: 0.25, roughness: 0.28 }),
      new THREE.MeshStandardMaterial({ color: colors.bottom, metalness: 0.08, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ color: colors.side, metalness: 0.16, roughness: 0.34 }),
      new THREE.MeshStandardMaterial({ color: colors.side, metalness: 0.16, roughness: 0.34 }),
    ];

    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(position.x, position.y, position.z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);
    this.objects.push(cube);
    return cube;
  }

  createSphere(
    radius: number = 5,
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    color: number = 0xc9a24d
  ): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.36 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(position.x, position.y, position.z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);
    this.objects.push(sphere);
    return sphere;
  }

  createCylinder(
    radiusTop: number = 5,
    radiusBottom: number = 5,
    height: number = 20,
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    color: number = 0xc9a24d
  ): THREE.Mesh {
    const safeHeight = Math.max(height, 0.1);
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, safeHeight, 40);
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.3 });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(position.x, position.y, position.z);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    this.scene.add(cylinder);
    this.objects.push(cylinder);
    return cylinder;
  }

  createTextMesh(
    text: string,
    position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    size: number = 20,
    color: string = '#f8f4e8'
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is not available');

    canvas.width = 512;
    canvas.height = 256;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.font = `700 ${size}px Cairo, Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.direction = 'rtl';
    context.fillText(text, canvas.width / 2, canvas.height / 2, 460);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(26, 13);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    this.scene.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  animateRotation(
    object: THREE.Object3D,
    speed: number = 0.01,
    axes: { x?: boolean; y?: boolean; z?: boolean } = { y: true }
  ) {
    const animate = () => {
      if (axes.x) object.rotation.x += speed;
      if (axes.y) object.rotation.y += speed;
      if (axes.z) object.rotation.z += speed;
      this.requestFrame(animate);
    };
    animate();
  }

  animatePosition(
    object: THREE.Object3D,
    targetPosition: { x?: number; y?: number; z?: number },
    duration: number = 1000
  ): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = object.position.clone();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        if (targetPosition.x !== undefined) object.position.x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
        if (targetPosition.y !== undefined) object.position.y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
        if (targetPosition.z !== undefined) object.position.z = startPosition.z + (targetPosition.z - startPosition.z) * eased;

        if (progress < 1) this.requestFrame(animate);
        else resolve();
      };

      animate();
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  startAnimationLoop(callback?: () => void) {
    const animate = () => {
      callback?.();
      this.render();
      this.requestFrame(animate);
    };
    animate();
  }

  stopAnimationLoop() {
    this.animationFrameIds.forEach((frameId) => cancelAnimationFrame(frameId));
    this.animationFrameIds.clear();
  }

  clear() {
    this.objects.forEach((obj) => {
      this.scene.remove(obj);
      if ('geometry' in obj && obj.geometry instanceof THREE.BufferGeometry) obj.geometry.dispose();
      if ('material' in obj) {
        const material = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
    this.objects = [];
  }

  dispose() {
    this.stopAnimationLoop();
    window.removeEventListener('resize', this.resizeHandler);
    this.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

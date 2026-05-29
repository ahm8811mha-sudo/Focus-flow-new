import * as THREE from 'three';

/**
 * 3D Interaction Handler
 * Manages mouse and touch interactions with 3D objects
 */

export interface InteractionConfig {
  container: HTMLElement;
  camera: THREE.Camera;
  scene: THREE.Scene;
  onObjectClick?: (object: THREE.Object3D, event: MouseEvent) => void;
  onObjectHover?: (object: THREE.Object3D | null) => void;
}

export class ThreeInteractionHandler {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  container: HTMLElement;
  camera: THREE.Camera;
  scene: THREE.Scene;
  hoveredObject: THREE.Object3D | null = null;
  onObjectClick?: (object: THREE.Object3D, event: MouseEvent) => void;
  onObjectHover?: (object: THREE.Object3D | null) => void;

  constructor(config: InteractionConfig) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.container = config.container;
    this.camera = config.camera;
    this.scene = config.scene;
    this.onObjectClick = config.onObjectClick;
    this.onObjectHover = config.onObjectHover;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.addEventListener('click', (e) => this.onClick(e));
    this.container.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.container.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private getMousePosition(event: MouseEvent | Touch): THREE.Vector2 {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return new THREE.Vector2(
      (x / rect.width) * 2 - 1,
      -(y / rect.height) * 2 + 1
    );
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse = this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object !== this.hoveredObject) {
        // Add hover effect
        if (object instanceof THREE.Mesh) {
          const originalScale = (object as any).originalScale || 1;
          object.scale.set(originalScale * 1.1, originalScale * 1.1, originalScale * 1.1);
        }

        this.hoveredObject = object;
        this.onObjectHover?.(object);
      }
    } else {
      // Remove hover effect
      if (this.hoveredObject && this.hoveredObject instanceof THREE.Mesh) {
        const originalScale = (this.hoveredObject as any).originalScale || 1;
        this.hoveredObject.scale.set(originalScale, originalScale, originalScale);
      }

      this.hoveredObject = null;
      this.onObjectHover?.(null);
    }
  }

  private onClick(event: MouseEvent) {
    this.mouse = this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.onObjectClick?.(object, event);
    }
  }

  private onTouchMove(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.mouse = this.getMousePosition(touch);
      this.raycaster.setFromCamera(this.mouse, this.camera);
    }
  }

  private onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const mouseEvent = new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.onClick(mouseEvent);
    }
  }

  /**
   * Add glow effect to object
   */
  addGlowEffect(object: THREE.Object3D, color: number = 0x00d4ff) {
    if (object instanceof THREE.Mesh) {
      const glowGeometry = object.geometry.clone();
      const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.scale.multiplyScalar(1.2);
      object.add(glowMesh);
    }
  }

  /**
   * Animate object on click
   */
  animateObjectClick(object: THREE.Object3D, duration: number = 300) {
    if (object instanceof THREE.Mesh) {
      const originalScale = object.scale.clone();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Pulse effect
        const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
        object.scale.copy(originalScale).multiplyScalar(scale);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          object.scale.copy(originalScale);
        }
      };

      animate();
    }
  }

  /**
   * Remove event listeners
   */
  dispose() {
    this.container.removeEventListener('mousemove', (e) => this.onMouseMove(e));
    this.container.removeEventListener('click', (e) => this.onClick(e));
    this.container.removeEventListener('touchmove', (e) => this.onTouchMove(e));
    this.container.removeEventListener('touchend', (e) => this.onTouchEnd(e));
  }
}

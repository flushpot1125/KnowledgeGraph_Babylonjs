import {
  Camera,
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Observer,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export class LifecycleLegend {
  private scene: Scene;
  private domRoot: HTMLElement | null = null;
  private worldRoot: TransformNode;
  private worldPlane: Mesh;
  private followObserver: Observer<Scene> | null = null;
  private attachedCamera: Camera | null = null;

  constructor(scene: Scene, domContainerId = 'lifecycleLegendRoot') {
    this.scene = scene;
    this.domRoot = document.getElementById(domContainerId);
    this.buildDomLegend();

    this.worldRoot = new TransformNode('lifecycle-legend-root', this.scene);
    this.worldPlane = MeshBuilder.CreatePlane(
      'lifecycle-legend-plane',
      { width: 1.25, height: 0.62 },
      this.scene
    );
    this.worldPlane.parent = this.worldRoot;
    this.worldPlane.isPickable = false;
    this.worldPlane.renderingGroupId = 2;

    const texture = new DynamicTexture(
      'lifecycle-legend-texture',
      { width: 2048, height: 1024 },
      this.scene,
      true
    );
    texture.hasAlpha = true;
    this.drawLegendTexture(texture);

    const material = new StandardMaterial('lifecycle-legend-mat', this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.42, 0.42, 0.42);
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.specularColor = new Color3(0, 0, 0);
    this.worldPlane.material = material;

    this.attachToActiveCamera();
    this.updateWorldLegendVisibility();
    this.followObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (this.scene.activeCamera !== this.attachedCamera) {
        this.attachToActiveCamera();
      }
      this.updateWorldLegendVisibility();
    });
  }

  dispose(): void {
    if (this.followObserver) {
      this.scene.onBeforeRenderObservable.remove(this.followObserver);
      this.followObserver = null;
    }

    if (this.domRoot) {
      this.domRoot.innerHTML = '';
    }

    const material = this.worldPlane.material as StandardMaterial | null;
    const texture = material?.diffuseTexture as DynamicTexture | null;
    texture?.dispose();
    material?.dispose();
    this.worldPlane.dispose();
    this.worldRoot.dispose();
  }

  private buildDomLegend(): void {
    if (!this.domRoot) {
      return;
    }

    this.domRoot.innerHTML = `
      <div class="kg-legend" aria-label="Lifecycle legend">
        <p class="kg-legend-title">Technology Lifecycle</p>
        <div class="kg-legend-item">
          <span class="kg-legend-swatch kg-legend-swatch-blue"></span>
          <span>Long-term</span>
        </div>
        <div class="kg-legend-item">
          <span class="kg-legend-swatch kg-legend-swatch-green"></span>
          <span>Growing</span>
        </div>
        <div class="kg-legend-item">
          <span class="kg-legend-swatch kg-legend-swatch-orange"></span>
          <span>New</span>
        </div>
      </div>
    `;
  }

  private drawLegendTexture(texture: DynamicTexture): void {
    const size = texture.getSize();
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = 'rgba(6, 18, 34, 0.9)';
    context.fillRect(0, 0, size.width, size.height);

    context.fillStyle = '#9adfff';
    context.font = 'bold 120px Courier New';
    context.fillText('Technology Lifecycle', 120, 180);

    this.drawLegendRow(context, 300, '#3380ff', 'Long-term');
    this.drawLegendRow(context, 520, '#34e572', 'Growing');
    this.drawLegendRow(context, 740, '#ff9633', 'New');

    texture.update(false);
  }

  private drawLegendRow(
    context: CanvasRenderingContext2D,
    y: number,
    color: string,
    label: string
  ): void {
    context.fillStyle = color;
    context.beginPath();
    context.arc(200, y - 45, 44, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#e8fcff';
    context.font = 'bold 106px Courier New';
    context.fillText(label, 300, y);
  }

  private attachToActiveCamera(): void {
    const camera = this.scene.activeCamera;
    if (!camera) {
      return;
    }

    this.attachedCamera = camera;
    this.worldRoot.parent = camera;
    this.worldRoot.position = new Vector3(0.95, -0.42, 2.15);
    this.worldRoot.rotation = Vector3.Zero();
    this.worldRoot.scaling = new Vector3(1, 1, 1);
  }

  private updateWorldLegendVisibility(): void {
    const className = this.scene.activeCamera?.getClassName?.() || '';
    const isXR = className === 'WebXRCamera';
    this.worldRoot.setEnabled(isXR);
  }
}

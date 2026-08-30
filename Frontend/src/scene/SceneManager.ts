import {
  AbstractMesh,
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  PointLight,
  Color3,
  Color4,
  GlowLayer,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import { categoryZMap, getCategoryList } from '../utils/TechnologyCategory';

export class SceneManager {
  private engine: Engine;
  private scene: Scene;
  private camera: UniversalCamera;
  private glowLayer: GlowLayer;
  private axisMeshes: AbstractMesh[] = [];
  private axisLabelMeshes: AbstractMesh[] = [];
  private categoryBandMeshes: AbstractMesh[] = [];

  constructor(canvas: HTMLCanvasElement) {
    // Babylon.js エンジン初期化
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // シーン作成
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.02, 0.02, 0.05, 1.0); // ダークな宇宙背景

    // カメラ設定
    this.camera = new UniversalCamera(
      'camera',
      new Vector3(5, 6, -40),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.keysUp = [38];
    this.camera.keysDown = [40];
    this.camera.keysLeft = [37];
    this.camera.keysRight = [39];
    this.camera.speed = 1.2;
    this.camera.minZ = 0.1;
    this.camera.rotation = new Vector3(0, 0, 0);
    this.camera.setTarget(new Vector3(5, 6, 20));

    // ライティング設定
    this.setupLights();

    // グロー効果
    this.glowLayer = new GlowLayer('glow', this.scene, {
      mainTextureFixedSize: 1024,
      blurKernelSize: 64,
    });
    this.glowLayer.intensity = 0.3;

    // フォグ効果（遠方のノードにDepth感を出す）
    this.scene.fogMode = Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.01;
    this.scene.fogColor = new Color3(0.02, 0.02, 0.05);

    this.createCoordinateGuides();

    // レンダーループ開始
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // ウィンドウリサイズ対応
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupLights(): void {
    // 環境光（全体を薄く照らす）
    const ambient = new HemisphericLight(
      'ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    ambient.intensity = 0.3;
    ambient.diffuse = new Color3(0.1, 0.2, 0.3);
    ambient.groundColor = new Color3(0.05, 0.05, 0.1);

    // アクセントポイントライト（タイムライン中央）
    const pointLight1 = new PointLight(
      'pointLight1',
      new Vector3(5, 10, 0),
      this.scene
    );
    pointLight1.diffuse = new Color3(0, 0.8, 1.0); // シアン系
    pointLight1.intensity = 0.5;
    pointLight1.range = 50;

    // セカンドポイントライト（終点側）
    const pointLight2 = new PointLight(
      'pointLight2',
      new Vector3(10, 8, 0),
      this.scene
    );
    pointLight2.diffuse = new Color3(0.5, 0.2, 1.0); // 紫系
    pointLight2.intensity = 0.4;
    pointLight2.range = 40;
  }

  private createCoordinateGuides(): void {
    const xLength = 105;
    const yLength = 12;
    const zLength = 290;

    const xAxis = MeshBuilder.CreateLines(
      'axis_x',
      { points: [new Vector3(0, 0, 0), new Vector3(xLength, 0, 0)] },
      this.scene
    );
    xAxis.color = new Color3(1.0, 0.3, 0.3);
    this.axisMeshes.push(xAxis);

    const yAxis = MeshBuilder.CreateLines(
      'axis_y',
      { points: [new Vector3(0, 0, 0), new Vector3(0, yLength, 0)] },
      this.scene
    );
    yAxis.color = new Color3(0.3, 1.0, 0.3);
    this.axisMeshes.push(yAxis);

    const zAxis = MeshBuilder.CreateLines(
      'axis_z',
      { points: [new Vector3(0, 0, 0), new Vector3(0, 0, zLength)] },
      this.scene
    );
    zAxis.color = new Color3(0.3, 0.6, 1.0);
    this.axisMeshes.push(zAxis);

    for (let year = 2016; year <= 2026; year += 1) {
      const x = (year - 2016) * 10;
      const tick = MeshBuilder.CreateLines(
        `axis_x_tick_${year}`,
        { points: [new Vector3(x, 0, -2), new Vector3(x, 0, 2)] },
        this.scene
      );
      tick.color = new Color3(0.8, 0.8, 0.8);
      this.axisMeshes.push(tick);

     // const yearLabel = this.createTextPlane(`axis_x_label_${year}`, String(year), 4, new Color3(0.9, 0.9, 0.9));
	  const yearLabel = this.createTextPlane(`axis_x_label_${year}`, String(year), 10, new Color3(0.9, 0.9, 0.9));
      
      yearLabel.position = new Vector3(x, -0.8, -6);
      this.axisLabelMeshes.push(yearLabel);
    }

    const xLabel = this.createTextPlane('axis_label_x', 'X: Year', 5, new Color3(1.0, 0.5, 0.5));
    xLabel.position = new Vector3(xLength + 6, 0.3, 0);
    this.axisLabelMeshes.push(xLabel);

    const yLabel = this.createTextPlane('axis_label_y', 'Y: Interest Score', 5, new Color3(0.5, 1.0, 0.5));
    yLabel.position = new Vector3(0, yLength + 1.5, 0);
    this.axisLabelMeshes.push(yLabel);

    const zLabel = this.createTextPlane('axis_label_z', 'Z: Technology Category', 5, new Color3(0.5, 0.7, 1.0));
    zLabel.position = new Vector3(0, 0.3, zLength + 10);
    this.axisLabelMeshes.push(zLabel);

    const categories = getCategoryList();
    categories.forEach((category, index) => {
      const z = categoryZMap[category];
      const band = MeshBuilder.CreateBox(
        `category_band_${category}`,
        { width: xLength, height: yLength, depth: 12 },
        this.scene
      );
      band.position = new Vector3(xLength / 2, yLength / 2, z);
      const bandMaterial = new StandardMaterial(`category_band_mat_${category}`, this.scene);
      bandMaterial.diffuseColor = new Color3(0.15 + (index % 3) * 0.1, 0.2 + (index % 2) * 0.08, 0.35);
      bandMaterial.specularColor = new Color3(0, 0, 0);
      bandMaterial.alpha = 0.08;
      band.material = bandMaterial;
      band.isPickable = false;
      this.categoryBandMeshes.push(band);

      const categoryLabel = this.createTextPlane(
        `category_label_${category}`,
        category,
        10,
        new Color3(0.8, 0.9, 1.0)
      );
      categoryLabel.position = new Vector3(-8, yLength + 0.5, z);
      this.axisLabelMeshes.push(categoryLabel);
    });
  }

  private createTextPlane(name: string, text: string, size: number, color: Color3): AbstractMesh {
    const plane = MeshBuilder.CreatePlane(name, { size }, this.scene);
    const texture = new DynamicTexture(`${name}_dt`, { width: 2048, height: 1024 }, this.scene, true);
    texture.hasAlpha = true;
    //texture.drawText(text, null, 150, 'bold 64px Courier New', `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`, 'transparent', true);
	texture.drawText(text, null, 150, 'bold 120px Courier New', `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`, 'transparent', true);

    const material = new StandardMaterial(`${name}_mat`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = color;
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = false;
    plane.material = material;
    plane.isPickable = false;
    plane.billboardMode = 7;

    return plane;
  }

  setCoordinateGuideVisibility(showAxes: boolean, showAxisLabels: boolean, showCategoryBands: boolean): void {
    this.axisMeshes.forEach(mesh => {
      mesh.setEnabled(showAxes);
    });
    this.axisLabelMeshes.forEach(mesh => {
      mesh.setEnabled(showAxisLabels);
    });
    this.categoryBandMeshes.forEach(mesh => {
      mesh.setEnabled(showCategoryBands);
    });
  }

  getScene(): Scene {
    return this.scene;
  }

  getCamera(): UniversalCamera {
    return this.camera;
  }

  getGlowLayer(): GlowLayer {
    return this.glowLayer;
  }

  dispose(): void {
    this.axisMeshes.forEach(mesh => mesh.dispose());
    this.axisLabelMeshes.forEach(mesh => mesh.dispose());
    this.categoryBandMeshes.forEach(mesh => mesh.dispose());
    this.scene.dispose();
    this.engine.dispose();
  }
}

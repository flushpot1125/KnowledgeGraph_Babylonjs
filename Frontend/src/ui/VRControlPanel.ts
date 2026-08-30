import {
  AbstractMesh,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Color3,
  Vector3,
} from '@babylonjs/core';
import type { GraphSettings } from '../models/GraphSettings';

interface VRActionMetadata {
  action: string;
}

interface ButtonSpec {
  key: string;
  mesh: Mesh;
  update: (settings?: GraphSettings) => void;
}

export class VRControlPanel {
  private scene: Scene;
  private yearOptions: string[];
  private onApply: (settings: GraphSettings) => Promise<void> | void;
  private root: TransformNode;
  private background: Mesh;
  private settings: GraphSettings;
  private buttonSpecs: ButtonSpec[] = [];
  private isVisible = false;
  private readonly panelWidth = 2.5;
  private readonly panelHeight = 4.0;

  constructor(
    scene: Scene,
    yearOptions: string[],
    initialSettings: GraphSettings,
    onApply: (settings: GraphSettings) => Promise<void> | void
  ) {
    this.scene = scene;
    this.yearOptions = yearOptions;
    this.settings = { ...initialSettings };
    this.onApply = onApply;
    this.root = new TransformNode('vr-control-panel-root', this.scene);
    this.root.position = new Vector3(0, 1.4, 2.0);

    this.background = MeshBuilder.CreatePlane('vr-control-panel-bg', { width: this.panelWidth, height: this.panelHeight }, this.scene);
    this.background.parent = this.root;
    this.background.renderingGroupId = 2;
    this.background.isPickable = false;
    const backgroundMaterial = new StandardMaterial('vr-control-panel-bg-mat', this.scene);
    backgroundMaterial.diffuseColor = new Color3(0.05, 0.08, 0.14);
    backgroundMaterial.emissiveColor = new Color3(0.08, 0.1, 0.12);
    backgroundMaterial.disableLighting = true;
    backgroundMaterial.alpha = 0.98;
    backgroundMaterial.zOffset = 1;
    backgroundMaterial.specularColor = new Color3(0, 0, 0);
    this.background.material = backgroundMaterial;

    this.buildPanel();
    this.setVisible(false);
  }

  showAt(position: Vector3, viewerPosition: Vector3): void {
    this.root.parent = null;
    this.root.position.copyFrom(position);

    const toViewer = viewerPosition.subtract(position);
    toViewer.y = 0;
    if (toViewer.lengthSquared() > 0.0001) {
      const yaw = Math.atan2(toViewer.x, toViewer.z);
      this.root.rotation = new Vector3(0, yaw + Math.PI, 0);
    }

    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.root.setEnabled(visible);
  }

  isPanelVisible(): boolean {
    return this.isVisible;
  }

  setSettings(settings: GraphSettings): void {
    this.settings = { ...settings };
    this.refreshButtonStates();
  }

  getSettings(): GraphSettings {
    return { ...this.settings };
  }

  handleRayPick(mesh: AbstractMesh): boolean {
    const metadata = mesh.metadata as VRActionMetadata | undefined;
    if (!metadata?.action) {
      return false;
    }

    const action = metadata.action;
    const settings = { ...this.settings };

    switch (action) {
      case 'yearPrev':
        settings.year = this.getPreviousYear(settings.year);
        break;
      case 'yearNext':
        settings.year = this.getNextYear(settings.year);
        break;
      case 'keywordMinus':
        settings.keywordCount = Math.max(10, settings.keywordCount - 5);
        break;
      case 'keywordPlus':
        settings.keywordCount = Math.min(100, settings.keywordCount + 5);
        break;
      case 'minWeightMinus':
        settings.minWeight = Math.max(1, settings.minWeight - 1);
        break;
      case 'minWeightPlus':
        settings.minWeight = Math.min(20, settings.minWeight + 1);
        break;
      case 'showLabels':
        settings.showLabels = !settings.showLabels;
        break;
      case 'showAxes':
        settings.showAxes = !settings.showAxes;
        break;
      case 'showAxisLabels':
        settings.showAxisLabels = !settings.showAxisLabels;
        break;
      case 'showCategoryBands':
        settings.showCategoryBands = !settings.showCategoryBands;
        break;
      case 'showRelationshipEdges':
        settings.showRelationshipEdges = !settings.showRelationshipEdges;
        break;
      case 'showTimelineEdges':
        settings.showTimelineEdges = !settings.showTimelineEdges;
        break;
      case 'highlightLongLivedKeywords':
        settings.highlightLongLivedKeywords = !settings.highlightLongLivedKeywords;
        break;
      case 'minActiveYearsMinus':
        settings.minActiveYears = Math.max(2, settings.minActiveYears - 1);
        break;
      case 'minActiveYearsPlus':
        settings.minActiveYears = Math.min(10, settings.minActiveYears + 1);
        break;
      case 'storyMode':
        settings.storyMode = !settings.storyMode;
        break;
      case 'apply':
        void this.onApply(this.getSettings());
        return true;
      default:
        return false;
    }

    this.settings = settings;
    this.refreshButtonStates();
    return true;
  }

  dispose(): void {
    this.background.dispose();
    this.root.dispose();
    this.buttonSpecs = [];
  }

  private buildPanel(): void {
    this.createTitle('VR Settings', 1.62, 86);
    this.createSubtitle('Trigger buttons to edit values', 1.42, 56);

    let rowY = 1.18;
    const rowStep = 0.22;

    this.createStepperRow('Year', rowY, 'yearPrev', 'yearValue', 'yearNext', () => this.settings.year);
    rowY -= rowStep;
    this.createStepperRow('Keyword Count', rowY, 'keywordMinus', 'keywordCountValue', 'keywordPlus', () => String(this.settings.keywordCount));
    rowY -= rowStep;
    this.createStepperRow('Min Weight', rowY, 'minWeightMinus', 'minWeightValue', 'minWeightPlus', () => String(this.settings.minWeight));
    rowY -= rowStep;

    this.createToggleRow('Show Labels', rowY, 'showLabels', () => this.settings.showLabels);
    rowY -= rowStep;
    this.createToggleRow('Show Axes', rowY, 'showAxes', () => this.settings.showAxes);
    rowY -= rowStep;
    this.createToggleRow('Axis Labels', rowY, 'showAxisLabels', () => this.settings.showAxisLabels);
    rowY -= rowStep;
    this.createToggleRow('Category Bands', rowY, 'showCategoryBands', () => this.settings.showCategoryBands);
    rowY -= rowStep;
    this.createToggleRow('Relationship Edges', rowY, 'showRelationshipEdges', () => this.settings.showRelationshipEdges);
    rowY -= rowStep;
    this.createToggleRow('Timeline Edges', rowY, 'showTimelineEdges', () => this.settings.showTimelineEdges);
    rowY -= rowStep;
    this.createToggleRow('Highlight Long-Lived', rowY, 'highlightLongLivedKeywords', () => this.settings.highlightLongLivedKeywords);
    rowY -= rowStep;
    this.createStepperRow('Min Active Years', rowY, 'minActiveYearsMinus', 'minActiveYearsValue', 'minActiveYearsPlus', () => String(this.settings.minActiveYears));
    rowY -= rowStep;
    this.createToggleRow('Story Mode', rowY, 'storyMode', () => this.settings.storyMode);

    this.createApplyButton(-0.6, -1.76);
  }

  private createTitle(text: string, y: number, fontSize: number): void {
    this.createTextPlane('vr-panel-title', text, 2.1, 0.18, y, fontSize, '#9fe9ff', '#0a1626', false);
  }

  private createSubtitle(text: string, y: number, fontSize: number): void {
    this.createTextPlane('vr-panel-subtitle', text, 2.1, 0.12, y, fontSize, '#83b7cf', '#0a1626', false);
  }

  private createStepperRow(
    label: string,
    y: number,
    minusAction: string,
    valueKey: string,
    plusAction: string,
    valueGetter: () => string
  ): void {
    this.createTextPlane(`label_${valueKey}`, label, 1.16, 0.16, y, 56, '#e4f8ff', '#13263a', false);
    this.createButtonPlane(`btn_${minusAction}`, '-', -0.06, y, 0.2, 0.16, minusAction, '#24425d');
    const valueMesh = this.createTextPlane(`value_${valueKey}`, valueGetter(), 0.5, 0.16, 0, 54, '#00d4ff', '#102235', true);
    valueMesh.position.x = 0.28;
    valueMesh.position.y = y;
    valueMesh.parent = this.root;
    this.buttonSpecs.push({
      key: valueKey,
      mesh: valueMesh,
      update: () => this.updateTextPlane(valueMesh, valueGetter(), '#00d4ff', '#102235'),
    });
    this.createButtonPlane(`btn_${plusAction}`, '+', 0.8, y, 0.2, 0.16, plusAction, '#24425d');
  }

  private createToggleRow(label: string, y: number, action: string, valueGetter: () => boolean): void {
    this.createTextPlane(`label_${action}`, label, 1.3, 0.16, y, 56, '#e4f8ff', '#13263a', false);
    const toggleMesh = this.createButtonPlane(
      `btn_${action}`,
      valueGetter() ? 'ON' : 'OFF',
      0.72,
      y,
      0.44,
      0.16,
      action,
      valueGetter() ? '#0f6e52' : '#6b2d37'
    );
    this.buttonSpecs.push({
      key: action,
      mesh: toggleMesh,
      update: () => this.updateTextPlane(toggleMesh, valueGetter() ? 'ON' : 'OFF', '#ffffff', valueGetter() ? '#0f6e52' : '#6b2d37'),
    });
  }

  private createApplyButton(x: number, y: number): void {
    this.createButtonPlane('btn_apply', 'APPLY', x, y, 1.22, 0.22, 'apply', '#0f6e52');
  }

  private createButtonPlane(
    name: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    action: string,
    backgroundColor: string
  ): Mesh {
    const plane = MeshBuilder.CreatePlane(name, { width, height }, this.scene);
    plane.parent = this.root;
    plane.renderingGroupId = 3;
    plane.position.x = x;
    plane.position.y = y;
    plane.position.z = -0.06;
    plane.metadata = { action };
    const material = new StandardMaterial(`${name}_mat`, this.scene);
    const texture = new DynamicTexture(`${name}_texture`, { width: 2048, height: 1024 }, this.scene, true);
    texture.hasAlpha = true;
    this.drawText(texture, text, '#ffffff', backgroundColor, 128);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.28, 0.28, 0.28);
    material.disableLighting = true;
    material.zOffset = -2;
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = true;
    plane.material = material;
    plane.isPickable = true;
    return plane;
  }

  private createTextPlane(
    name: string,
    text: string,
    width: number,
    height: number,
    y: number,
    fontSize: number,
    textColor: string,
    backgroundColor: string,
    pickable: boolean
  ): Mesh {
    const plane = MeshBuilder.CreatePlane(name, { width, height }, this.scene);
    plane.parent = this.root;
    plane.renderingGroupId = 3;
    plane.position.y = y;
    plane.position.z = -0.06;
    const material = new StandardMaterial(`${name}_mat`, this.scene);
    const texture = new DynamicTexture(`${name}_texture`, { width: 2048, height: 1024 }, this.scene, true);
    texture.hasAlpha = true;
    this.drawText(texture, text, textColor, backgroundColor, fontSize);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.28, 0.28, 0.28);
    material.disableLighting = true;
    material.zOffset = -2;
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = true;
    plane.material = material;
    plane.isPickable = pickable;
    return plane;
  }

  private updateTextPlane(mesh: Mesh, text: string, textColor: string, backgroundColor: string): void {
    const material = mesh.material as StandardMaterial | null;
    const texture = material?.diffuseTexture as DynamicTexture | null;
    if (!texture) {
      return;
    }
    this.drawText(texture, text, textColor, backgroundColor, 108);
  }

  private drawText(texture: DynamicTexture, text: string, textColor: string, backgroundColor: string, fontSize: number): void {
    const context = texture.getContext();
    context.clearRect(0, 0, texture.getSize().width, texture.getSize().height);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, texture.getSize().width, texture.getSize().height);
    texture.drawText(
      text,
      null,
      620,
      `${fontSize}px Courier New`,
      textColor,
      backgroundColor,
      true,
      true
    );
  }

  private refreshButtonStates(): void {
    for (const spec of this.buttonSpecs) {
      spec.update(this.settings);
    }
  }

  private getPreviousYear(year: string): string {
    const currentIndex = this.yearOptions.indexOf(year);
    if (currentIndex <= 0) {
      return this.yearOptions[this.yearOptions.length - 1] || year;
    }
    return this.yearOptions[currentIndex - 1] || year;
  }

  private getNextYear(year: string): string {
    const currentIndex = this.yearOptions.indexOf(year);
    if (currentIndex < 0 || currentIndex >= this.yearOptions.length - 1) {
      return this.yearOptions[0] || year;
    }
    return this.yearOptions[currentIndex + 1] || year;
  }
}

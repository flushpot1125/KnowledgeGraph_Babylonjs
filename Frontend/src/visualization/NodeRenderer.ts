import {
  Observer,
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core';
import type { KeywordNode, LifecycleStage } from '../models/TimelineData';

export interface RenderedNode {
  node: KeywordNode;
  mesh: Mesh;
  material: StandardMaterial;
}

export interface NodeRenderOptions {
  persistentKeywords?: Set<string>;
  highlightPersistent?: boolean;
  storyMode?: boolean;
}

export class NodeRenderer {
  private scene: Scene;
  private renderedNodes: Map<string, RenderedNode> = new Map();
  private options: NodeRenderOptions;
  private pulseObserver: Observer<Scene> | null = null;
  private pulseNodes: Array<{ mesh: Mesh; baseScaling: Vector3 }> = [];

  constructor(scene: Scene, options: NodeRenderOptions = {}) {
    this.scene = scene;
    this.options = options;
  }

  // ノードを球体として描画
  renderNodes(nodes: KeywordNode[]): RenderedNode[] {
    const rendered: RenderedNode[] = [];

    nodes.forEach(node => {
      const renderedNode = this.createNode(node);
      this.renderedNodes.set(node.id, renderedNode);
      rendered.push(renderedNode);
    });

    return rendered;
  }

  private createNode(node: KeywordNode): RenderedNode {
    // スコアに基づくサイズ（0.2 - 0.8の範囲）
    const baseSize = 0.2;
    const maxSize = 0.8;
    const normalizedScore = Math.min(node.score / 100, 1.0);
    const persistent =
      this.options.highlightPersistent && this.options.persistentKeywords?.has(node.keyword);
    const stage = this.options.storyMode ? node.lifecycleStage : undefined;
    const stageSizeMultiplier = stage === 'LongTerm' ? 1.2 : 1.0;
    const sizeMultiplier = persistent ? 1.25 : 1.0;
    const size = (baseSize + normalizedScore * (maxSize - baseSize)) * sizeMultiplier * stageSizeMultiplier;

    // 球体メッシュ作成
    const sphere = MeshBuilder.CreateSphere(
      node.id,
      { diameter: size, segments: 16 },
      this.scene
    );

    // 位置設定
    sphere.position = new Vector3(
      node.position.x,
      node.position.y,
      node.position.z
    );

    // マテリアル作成（Tron風のネオンカラー）
    const material = new StandardMaterial(`mat_${node.id}`, this.scene);
    
    // スコアに基づく色のグラデーション
    const color = this.getColorForNode(node, normalizedScore, persistent);
    material.diffuseColor = color;
    const emissiveScale = this.options.storyMode && stage === 'New' ? 1.2 : 0.8;
    material.emissiveColor = color.scale(emissiveScale);
    material.specularColor = new Color3(1, 1, 1);
    material.specularPower = 32;

    sphere.material = material;

    // メタデータ保存（選択時に使用）
    sphere.metadata = {
      nodeData: node,
      isKeywordNode: true,
    };

    if (this.options.storyMode && stage === 'Growing') {
      this.pulseNodes.push({ mesh: sphere, baseScaling: sphere.scaling.clone() });
      this.ensurePulseObserver();
    }

    return {
      node,
      mesh: sphere,
      material,
    };
  }

  private getColorForNode(
    node: KeywordNode,
    normalizedScore: number,
    persistent: boolean | undefined
  ): Color3 {
    if (this.options.storyMode && node.lifecycleStage) {
      return this.getLifecycleColor(node.lifecycleStage);
    }

    const metrics = node.metrics;
    const baseColor = this.getColorByScore(normalizedScore);

    if (!metrics) {
      return persistent ? new Color3(1.0, 0.35, 0.95) : baseColor;
    }

    const growth = metrics.yearOverYearGrowth[node.year] || 0;
    const isFirstAppearance = metrics.firstAppearanceYear === node.year;
    const isEmerging = growth > Math.max(metrics.maxPositiveGrowth * 0.5, 10);

    if (isEmerging) {
      return new Color3(0.45, 1.0, 0.45);
    }

    if (isFirstAppearance) {
      return new Color3(1.0, 0.8, 0.2);
    }

    if (persistent) {
      return new Color3(1.0, 0.35, 0.95);
    }

    return baseColor;
  }

  private getLifecycleColor(stage: LifecycleStage): Color3 {
    switch (stage) {
      case 'LongTerm':
        return new Color3(0.2, 0.5, 1.0);
      case 'Growing':
        return new Color3(0.2, 0.95, 0.45);
      case 'New':
        return new Color3(1.0, 0.58, 0.12);
      default:
        return new Color3(0.4, 0.8, 1.0);
    }
  }

  private ensurePulseObserver(): void {
    if (this.pulseObserver) {
      return;
    }

    this.pulseObserver = this.scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.004;
      const pulse = 1 + 0.08 * Math.sin(t);
      for (const item of this.pulseNodes) {
        item.mesh.scaling.x = item.baseScaling.x * pulse;
        item.mesh.scaling.y = item.baseScaling.y * pulse;
        item.mesh.scaling.z = item.baseScaling.z * pulse;
      }
    });
  }

  // スコアに基づく色のグラデーション（シアン→紫）
  private getColorByScore(normalizedScore: number): Color3 {
    // 低スコア: シアン (0, 0.8, 1.0)
    // 高スコア: 紫 (0.8, 0.2, 1.0)
    const cyan = new Color3(0, 0.8, 1.0);
    const purple = new Color3(0.8, 0.2, 1.0);
    
    return Color3.Lerp(cyan, purple, normalizedScore);
  }

  // ノード取得
  getRenderedNode(nodeId: string): RenderedNode | undefined {
    return this.renderedNodes.get(nodeId);
  }

  getAllRenderedNodes(): RenderedNode[] {
    return Array.from(this.renderedNodes.values());
  }

  // ノードのハイライト
  highlightNode(nodeId: string, highlight: boolean): void {
    const rendered = this.renderedNodes.get(nodeId);
    if (!rendered) return;

    if (highlight) {
      // ハイライト時: スケール拡大と明るさ増加
      rendered.mesh.scaling = new Vector3(1.5, 1.5, 1.5);
      rendered.material.emissiveColor = rendered.material.diffuseColor.scale(1.5);
    } else {
      // 通常状態に戻す
      rendered.mesh.scaling = new Vector3(1, 1, 1);
      rendered.material.emissiveColor = rendered.material.diffuseColor.scale(0.8);
    }
  }

  // すべてのノードを削除
  dispose(): void {
    if (this.pulseObserver) {
      this.scene.onBeforeRenderObservable.remove(this.pulseObserver);
      this.pulseObserver = null;
    }
    this.pulseNodes = [];
    this.renderedNodes.forEach(rendered => {
      rendered.mesh.dispose();
      rendered.material.dispose();
    });
    this.renderedNodes.clear();
  }
}

import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Animation,
} from '@babylonjs/core';
import type { KeywordNode } from '../models/TimelineData';
import type { KeywordRelationship } from '../models/TimelineData';

export interface RelationshipLine {
  from: KeywordNode;
  to: KeywordNode;
  weight: number;
  line: Mesh;
  material: StandardMaterial;
}

export class RelationshipRenderer {
  private scene: Scene;
  private activeLines: RelationshipLine[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // キーワード関係性を可視化
  async renderRelationships(
    sourceNode: KeywordNode,
    relationships: KeywordRelationship[],
    allNodes: Map<string, KeywordNode>
  ): Promise<void> {
    // 既存の関係性ラインをクリア
    this.clearRelationships();

    relationships.forEach(rel => {
      // 関連キーワードのノードを探す（同じ年または近い年のノード）
      const targetNode = this.findClosestNode(rel.keyword, sourceNode.year, allNodes);
      if (!targetNode) return;

      // ラインを作成
      const line = this.createRelationshipLine(sourceNode, targetNode, rel.weight);
      this.activeLines.push(line);
    });
  }

  // 最も近い年のノードを探す
  private findClosestNode(
    keyword: string,
    sourceYear: number,
    allNodes: Map<string, KeywordNode>
  ): KeywordNode | null {
    const candidates: KeywordNode[] = [];
    
    allNodes.forEach(node => {
      if (node.keyword === keyword) {
        candidates.push(node);
      }
    });

    if (candidates.length === 0) return null;

    // 最も年が近いノードを選択
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.year - sourceYear);
      const diffB = Math.abs(b.year - sourceYear);
      return diffA - diffB;
    });

    return candidates[0];
  }

  // 関係性ラインを作成
  private createRelationshipLine(
    from: KeywordNode,
    to: KeywordNode,
    weight: number
  ): RelationshipLine {
    const points = [
      new Vector3(from.position.x, from.position.y, from.position.z),
      new Vector3(to.position.x, to.position.y, to.position.z),
    ];

    // weightに基づく太さ（0.02 - 0.15の範囲）
    const thickness = 0.02 + (Math.min(weight, 20) / 20) * 0.13;

    const line = MeshBuilder.CreateTube(
      `relationship_${from.id}_${to.id}`,
      {
        path: points,
        radius: thickness,
        tessellation: 8,
        updatable: false,
      },
      this.scene
    );

    // マテリアル（パルス効果付き）
    const material = new StandardMaterial(
      `mat_rel_${from.id}_${to.id}`,
      this.scene
    );

    // weightに基づく色の強さ
    const intensity = Math.min(weight / 15, 1.0);
    const color = new Color3(1.0, 0.5 * intensity, 0.0); // オレンジ系
    
    material.emissiveColor = color.scale(0.8);
    material.diffuseColor = color;
    material.alpha = 0.6 + intensity * 0.4;
    material.backFaceCulling = false;

    line.material = material;

    // パルスアニメーション
    this.animatePulse(material);

    return { from, to, weight, line, material };
  }

  // パルスアニメーション
  private animatePulse(material: StandardMaterial): void {
    const fps = 30;
    const baseColor = material.emissiveColor.clone();

    const animation = new Animation(
      'pulse',
      'emissiveColor',
      fps,
      Animation.ANIMATIONTYPE_COLOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      { frame: 0, value: baseColor },
      { frame: fps, value: baseColor.scale(1.5) },
      { frame: fps * 2, value: baseColor },
    ];

    animation.setKeys(keys);
    material.animations = [animation];

    this.scene.beginAnimation(material, 0, fps * 2, true);
  }

  // すべての関係性ラインをクリア
  clearRelationships(): void {
    this.activeLines.forEach(line => {
      line.line.dispose();
      line.material.dispose();
    });
    this.activeLines = [];
  }

  dispose(): void {
    this.clearRelationships();
  }
}

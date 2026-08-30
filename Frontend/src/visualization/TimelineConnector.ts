import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Animation,
  DynamicTexture,
} from '@babylonjs/core';
import type { KeywordNode } from '../models/TimelineData';

export interface TimelineConnection {
  keyword: string;
  nodes: KeywordNode[];
  line: Mesh;
  material: StandardMaterial;
}

export interface TimelineConnectorOptions {
  persistentKeywords?: Set<string>;
  highlightPersistent?: boolean;
}

export class TimelineConnector {
  private scene: Scene;
  private connections: Map<string, TimelineConnection> = new Map();
  private options: TimelineConnectorOptions;

  constructor(scene: Scene, options: TimelineConnectorOptions = {}) {
    this.scene = scene;
    this.options = options;
  }

  // 同じキーワードが複数年に出現する場合、ノード間に接続線を作成
  createConnections(keywordGroups: Map<string, KeywordNode[]>): void {
    keywordGroups.forEach((nodes, keyword) => {
      // 2年以上にわたって出現するキーワードのみ接続
      if (nodes.length < 2) return;

      // 年順にソート
      const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);

      // 接続線のポイント作成
      const points: Vector3[] = sortedNodes.map(node => 
        new Vector3(node.position.x, node.position.y, node.position.z)
      );

      // チューブメッシュで滑らかな線を作成
      const line = MeshBuilder.CreateTube(
        `timeline_${keyword}`,
        {
          path: points,
          radius: 0.05,
          tessellation: 16,
          updatable: false,
        },
        this.scene
      );

      // マテリアル作成（流れるアニメーション効果）
      const material = this.createAnimatedMaterial(
        keyword,
        sortedNodes.length,
        this.options.highlightPersistent && this.options.persistentKeywords?.has(keyword)
      );
      line.material = material;

      // メタデータ保存
      line.metadata = {
        keyword,
        isTimelineConnection: true,
        nodes: sortedNodes,
      };

      this.connections.set(keyword, {
        keyword,
        nodes: sortedNodes,
        line,
        material,
      });
    });
  }

  // 流れるアニメーション効果を持つマテリアル作成
  private createAnimatedMaterial(keyword: string, nodeCount: number, persistent?: boolean): StandardMaterial {
    const material = new StandardMaterial(`mat_timeline_${keyword}`, this.scene);

    // Timeline edgeは青系を基準色とする
    const baseColor = persistent ? new Color3(0.6, 0.85, 1.0) : new Color3(0.2, 0.75, 1.0);

    material.emissiveColor = baseColor.scale(persistent ? 1.2 : 0.8);
    material.diffuseColor = baseColor;
    material.alpha = persistent ? 0.95 : 0.8;
    material.backFaceCulling = false;

    // ダッシュライン効果用のテクスチャ
    const texture = new DynamicTexture(
      `tex_timeline_${keyword}`,
      { width: 512, height: 16 },
      this.scene,
      false
    );
    const ctx = texture.getContext();
    
    // ダッシュパターン描画
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 512; i += 40) {
      ctx.fillRect(i, 0, 20, 16);
    }
    texture.update();
    
    material.emissiveTexture = texture;
    (material.emissiveTexture as DynamicTexture).uScale = nodeCount * 2;
    (material.emissiveTexture as DynamicTexture).vScale = 1;

    // UVスクロールアニメーション
    this.animateUVScroll(material);

    return material;
  }

  // UVスクロールアニメーション（流れる効果）
  private animateUVScroll(material: StandardMaterial): void {
    if (!material.emissiveTexture) return;

    const fps = 30;
    const scrollSpeed = 0.5;

    const animation = new Animation(
      'uvScroll',
      'emissiveTexture.uOffset',
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      { frame: 0, value: 0 },
      { frame: fps * 2, value: scrollSpeed * 2 },
    ];

    animation.setKeys(keys);
    material.animations = [animation];

    this.scene.beginAnimation(material, 0, fps * 2, true);
  }

  // 接続線のハイライト
  highlightConnection(keyword: string, highlight: boolean): void {
    const connection = this.connections.get(keyword);
    if (!connection) return;

    if (highlight) {
      // ハイライト時: 太さと明るさを増加
      connection.line.scaling = new Vector3(2, 2, 2);
      connection.material.emissiveColor = connection.material.diffuseColor.scale(1.5);
      connection.material.alpha = 1.0;
    } else {
      // 通常状態
      connection.line.scaling = new Vector3(1, 1, 1);
      connection.material.emissiveColor = connection.material.diffuseColor.scale(0.6);
      connection.material.alpha = 0.7;
    }
  }

  // 特定のキーワードの接続線を取得
  getConnection(keyword: string): TimelineConnection | undefined {
    return this.connections.get(keyword);
  }

  // すべての接続線を取得
  getAllConnections(): TimelineConnection[] {
    return Array.from(this.connections.values());
  }

  // すべての接続線を削除
  dispose(): void {
    this.connections.forEach(connection => {
      connection.line.dispose();
      connection.material.dispose();
    });
    this.connections.clear();
  }
}

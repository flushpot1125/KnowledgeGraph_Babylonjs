import {
  Scene,
  Mesh,
  Vector3,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  TextBlock,
  Rectangle,
  Control,
} from '@babylonjs/gui';
import type { KeywordNode } from '../models/TimelineData';

export class NodeLabel {
  private scene: Scene;
  private advancedTexture: AdvancedDynamicTexture;
  private labels: Map<string, Rectangle> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    
    // フルスクリーンGUI作成
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
  }

  // ノードにラベルを追加
  addLabel(node: KeywordNode, mesh: Mesh, alwaysVisible: boolean = true): void {
    // ラベルコンテナ
    const label = new Rectangle(`label_${node.id}`);
    label.width = '150px';
    label.height = alwaysVisible ? '30px' : '60px';
    label.cornerRadius = 5;
    label.thickness = 1;
    label.background = 'rgba(0, 20, 40, 0.8)';
    label.color = '#00d4ff';
    
    // テキストブロック
    const text = new TextBlock();
    text.text = node.keyword;
    text.color = '#00d4ff';
    text.fontSize = 14;
    text.fontFamily = 'Courier New, monospace';
    text.textWrapping = true;
    
    label.addControl(text);

    // GUIに追加してからメッシュにリンク
    this.advancedTexture.addControl(label);
    label.linkWithMesh(mesh);
    label.linkOffsetY = -50; // メッシュの上に表示
    
    this.labels.set(node.id, label);

    // デフォルトは非表示（選択時のみ表示）
    if (!alwaysVisible) {
      label.isVisible = false;
    }
  }

  // 詳細情報ラベルを表示
  showDetailLabel(node: KeywordNode, mesh: Mesh): void {
    const existingLabel = this.labels.get(node.id);
    if (existingLabel) {
      existingLabel.isVisible = false;
    }

    // 詳細ラベル作成
    const detailLabel = new Rectangle(`detail_${node.id}`);
    detailLabel.width = '200px';
    detailLabel.height = '150px';
    detailLabel.cornerRadius = 10;
    detailLabel.thickness = 2;
    detailLabel.background = 'rgba(0, 30, 60, 0.95)';
    detailLabel.color = '#00d4ff';
    detailLabel.shadowBlur = 20;
    detailLabel.shadowColor = 'rgba(0, 212, 255, 0.8)';

    // 詳細テキスト
    const detailText = new TextBlock();
    const metrics = node.metrics;
    const firstAppearance = metrics ? metrics.firstAppearanceYear : node.year;
    detailText.text = [
      `${node.keyword}`,
      `Category: ${node.category || 'Other'}`,
      `Year: ${node.year}`,
      `Score: ${node.score}`,
      `First: ${firstAppearance}`,
    ].join('\n');
    detailText.color = '#ffffff';
    detailText.fontSize = 15;
    detailText.fontFamily = 'Courier New, monospace';
    detailText.textWrapping = true;
    detailText.lineSpacing = '3px';
    detailText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    detailText.paddingTop = '10px';

    detailLabel.addControl(detailText);
    
    // GUIに追加してからメッシュにリンク
    this.advancedTexture.addControl(detailLabel);
    detailLabel.linkWithMesh(mesh);
    detailLabel.linkOffsetY = -80;

    this.labels.set(`detail_${node.id}`, detailLabel);
  }

  // 詳細ラベルを非表示
  hideDetailLabel(nodeId: string): void {
    const detailLabel = this.labels.get(`detail_${nodeId}`);
    if (detailLabel) {
      this.advancedTexture.removeControl(detailLabel);
      this.labels.delete(`detail_${nodeId}`);
    }

    // 通常ラベルを復元
    const label = this.labels.get(nodeId);
    if (label) {
      label.isVisible = true;
    }
  }

  // ラベルの表示/非表示切り替え
  setLabelVisibility(nodeId: string, visible: boolean): void {
    const label = this.labels.get(nodeId);
    if (label) {
      label.isVisible = visible;
    }
  }

  // すべてのラベルを削除
  dispose(): void {
    this.labels.forEach(label => {
      this.advancedTexture.removeControl(label);
    });
    this.labels.clear();
    this.advancedTexture.dispose();
  }
}

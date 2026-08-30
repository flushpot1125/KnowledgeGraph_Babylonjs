import {
  Scene,
  Mesh,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Vector3,
  Ray,
} from '@babylonjs/core';
import type { KeywordNode } from '../models/TimelineData';
import { NodeRenderer } from '../visualization/NodeRenderer';
import { TimelineConnector } from '../visualization/TimelineConnector';
import { RelationshipRenderer } from '../visualization/RelationshipRenderer';
import { ParticleEffects } from '../effects/ParticleEffects';
import { NodeLabel } from '../ui/NodeLabel';
import { GraphAPI } from '../api/GraphAPI';

export class SelectionManager {
  private scene: Scene;
  private nodeRenderer: NodeRenderer;
  private timelineConnector: TimelineConnector;
  private relationshipRenderer: RelationshipRenderer;
  private particleEffects: ParticleEffects;
  private nodeLabel: NodeLabel;
  private selectedNode: KeywordNode | null = null;
  private selectedMesh: Mesh | null = null;
  private allNodesMap: Map<string, KeywordNode> = new Map();
  private pointerObserver: Observer<PointerInfo> | null = null;
  private minRelationshipWeight: number;
  private showLabels: boolean;
  private showRelationshipEdges: boolean;
  private showTimelineEdges: boolean;

  constructor(
    scene: Scene,
    nodeRenderer: NodeRenderer,
    timelineConnector: TimelineConnector,
    relationshipRenderer: RelationshipRenderer,
    particleEffects: ParticleEffects,
    nodeLabel: NodeLabel,
    allNodes: KeywordNode[],
    options: {
      minRelationshipWeight: number;
      showLabels: boolean;
      showRelationshipEdges: boolean;
      showTimelineEdges: boolean;
    }
  ) {
    this.scene = scene;
    this.nodeRenderer = nodeRenderer;
    this.timelineConnector = timelineConnector;
    this.relationshipRenderer = relationshipRenderer;
    this.particleEffects = particleEffects;
    this.nodeLabel = nodeLabel;
    this.minRelationshipWeight = options.minRelationshipWeight;
    this.showLabels = options.showLabels;
    this.showRelationshipEdges = options.showRelationshipEdges;
    this.showTimelineEdges = options.showTimelineEdges;

    // ノードマップ作成
    allNodes.forEach(node => {
      this.allNodesMap.set(node.id, node);
    });

    this.setupPointerEvents();
  }

  private setupPointerEvents(): void {
    // ポインタークリック/タップイベント
    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        this.handlePointerDown(pointerInfo);
      }
    });
  }

  private handlePointerDown(pointerInfo: PointerInfo): void {
    const pickResult = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY
    );

    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      const mesh = pickResult.pickedMesh as Mesh;
      
      // キーワードノードかチェック
      if (mesh.metadata?.isKeywordNode) {
        const nodeData = mesh.metadata.nodeData as KeywordNode;
        this.selectNode(nodeData, mesh);
      } else {
        // 背景クリック時は選択解除
        this.deselectNode();
      }
    } else {
      this.deselectNode();
    }
  }

  // ノード選択
  async selectNode(node: KeywordNode, mesh: Mesh): Promise<void> {
    // 既存の選択を解除
    if (this.selectedNode) {
      this.deselectNode();
    }

    this.selectedNode = node;
    this.selectedMesh = mesh;

    // ノードをハイライト
    this.nodeRenderer.highlightNode(node.id, true);

    // 詳細ラベル表示
    if (this.showLabels) {
      this.nodeLabel.showDetailLabel(node, mesh);
    }

    // 同じキーワードのタイムライン接続をハイライト
    if (this.showTimelineEdges) {
      this.timelineConnector.highlightConnection(node.keyword, true);
    }

    // 選択バーストエフェクト
    this.particleEffects.createSelectionBurst(
      new Vector3(node.position.x, node.position.y, node.position.z)
    );

    // キーワード関係性を取得して表示
    if (this.showRelationshipEdges) {
      try {
        const relationships = await GraphAPI.getKeywordRelationships(node.keyword);
        const filteredRelationships = relationships.filter(
          rel => rel.weight >= this.minRelationshipWeight
        );

        if (filteredRelationships.length > 0) {
          await this.relationshipRenderer.renderRelationships(
            node,
            filteredRelationships,
            this.allNodesMap
          );
        }
      } catch (error) {
        this.relationshipRenderer.clearRelationships();
        console.error('Failed to load relationships:', error);
      }
    }

    console.log('Selected node:', node);
  }

  // 選択解除
  deselectNode(): void {
    if (!this.selectedNode) return;

    // ハイライト解除
    this.nodeRenderer.highlightNode(this.selectedNode.id, false);

    // 詳細ラベル非表示
    if (this.showLabels) {
      this.nodeLabel.hideDetailLabel(this.selectedNode.id);
    }

    // タイムライン接続のハイライト解除
    if (this.showTimelineEdges) {
      this.timelineConnector.highlightConnection(this.selectedNode.keyword, false);
    }

    this.selectedNode = null;
    this.selectedMesh = null;
  }

  // XRコントローラーからのレイキャスト選択
  selectByRay(ray: Ray): boolean {
    const pickResult = this.scene.pickWithRay(ray);

    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      const mesh = pickResult.pickedMesh as Mesh;
      
      if (mesh.metadata?.isKeywordNode) {
        const nodeData = mesh.metadata.nodeData as KeywordNode;
        this.selectNode(nodeData, mesh);
        return true;
      }
    }

    return false;
  }

  // 現在選択されているノードを取得
  getSelectedNode(): KeywordNode | null {
    return this.selectedNode;
  }

  dispose(): void {
    this.deselectNode();
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
  }
}

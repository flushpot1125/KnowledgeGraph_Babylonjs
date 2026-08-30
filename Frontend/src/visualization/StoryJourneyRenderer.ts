import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type { KeywordNode, LifecycleStage } from '../models/TimelineData';

export class StoryJourneyRenderer {
  private scene: Scene;
  private edges: Array<{ mesh: Mesh; material: StandardMaterial }> = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  renderPath(nodes: KeywordNode[]): void {
    this.clear();
    if (nodes.length < 2) return;

    for (let i = 0; i < nodes.length - 1; i += 1) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const path = [
        new Vector3(from.position.x, from.position.y, from.position.z),
        new Vector3(to.position.x, to.position.y, to.position.z),
      ];

      const mesh = MeshBuilder.CreateTube(
        `story_edge_${from.id}_${to.id}`,
        {
          path,
          radius: 0.1,
          tessellation: 14,
          updatable: false,
        },
        this.scene
      );

      const material = new StandardMaterial(`story_mat_${from.id}_${to.id}`, this.scene);
      const stage = to.lifecycleStage || from.lifecycleStage || 'Growing';
      const color = this.getLifecycleColor(stage);
      material.diffuseColor = color;
      material.emissiveColor = color.scale(1.1);
      material.alpha = 0.9;
      material.backFaceCulling = false;
      mesh.material = material;

      this.edges.push({ mesh, material });
    }
  }

  clear(): void {
    this.edges.forEach(edge => {
      edge.mesh.dispose();
      edge.material.dispose();
    });
    this.edges = [];
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
        return new Color3(0.9, 0.95, 0.35);
    }
  }

  dispose(): void {
    this.clear();
  }
}

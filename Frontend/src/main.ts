import { SceneManager } from './scene/SceneManager';
import { XRManager } from './scene/XRManager';
import { GraphAPI } from './api/GraphAPI';
import { TimelineLayout } from './visualization/TimelineLayout';
import { NodeRenderer } from './visualization/NodeRenderer';
import { TimelineConnector } from './visualization/TimelineConnector';
import { RelationshipRenderer } from './visualization/RelationshipRenderer';
import { ParticleEffects } from './effects/ParticleEffects';
import { NodeLabel } from './ui/NodeLabel';
import { SelectionManager } from './interaction/SelectionManager';
import type { EnrichedKeywordNode, KeywordNode, TimelineEntry } from './models/TimelineData';
import { buildYearOptions, defaultGraphSettings, type GraphSettings } from './models/GraphSettings';
import { ControlPanel } from './ui/ControlPanel';
import { VRControlPanel } from './ui/VRControlPanel';
import { LifecycleLegend } from './ui/LifecycleLegend';
import { StoryJourneyRenderer } from './visualization/StoryJourneyRenderer';
import {
  buildKeywordMetrics,
  getLifecycleStageBonus,
  selectEvolutionEntries,
  selectStoryLifecycleEntries,
} from './utils/TimelineMetrics';
import { inferCategory } from './utils/TechnologyCategory';
import { Vector3 } from '@babylonjs/core';

class KnowledgeGraphXR {
  private readonly minYear = 2016;
  private readonly maxYear = 2026;

  private sceneManager: SceneManager | null = null;
  private xrManager: XRManager | null = null;
  private timelineLayout: TimelineLayout | null = null;
  private nodeRenderer: NodeRenderer | null = null;
  private timelineConnector: TimelineConnector | null = null;
  private relationshipRenderer: RelationshipRenderer | null = null;
  private particleEffects: ParticleEffects | null = null;
  private nodeLabel: NodeLabel | null = null;
  private selectionManager: SelectionManager | null = null;
  private controlPanel: ControlPanel | null = null;
  private vrControlPanel: VRControlPanel | null = null;
  private lifecycleLegend: LifecycleLegend | null = null;
  private storyRenderer: StoryJourneyRenderer | null = null;

  private timelineDataCache: TimelineEntry[] = [];
  private settings: GraphSettings = { ...defaultGraphSettings };

  async initialize(): Promise<void> {
    try {
      // ローディング画面
      const loadingScreen = document.getElementById('loadingScreen');
      const controlPanelRoot = document.getElementById('controlPanelRoot');
      
      // Canvas取得
      const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas element not found');
      }
      if (!controlPanelRoot) {
        throw new Error('Control panel root not found');
      }

      console.log('Initializing Babylon.js scene...');
      
      // シーンマネージャー初期化
      this.sceneManager = new SceneManager(canvas);
      const scene = this.sceneManager.getScene();

      // XRマネージャー初期化
      this.xrManager = new XRManager(scene);
      const xrSupported = await this.xrManager.initialize();
      console.log('WebXR supported:', xrSupported);

      // データ取得（キャッシュ）
      console.log('Fetching timeline data...');
      this.timelineDataCache = await GraphAPI.getTimeline();
      console.log(`Loaded ${this.timelineDataCache.length} timeline entries`);

      if (this.timelineDataCache.length === 0) {
        console.warn('No timeline data available');
        return;
      }

      this.controlPanel = new ControlPanel(
        controlPanelRoot,
        buildYearOptions(this.minYear, this.maxYear),
        this.settings,
        async (settings: GraphSettings) => {
          this.settings = settings;
          await this.applySettings(settings);
        }
      );

      this.vrControlPanel = new VRControlPanel(
        scene,
        buildYearOptions(this.minYear, this.maxYear),
        this.settings,
        async (settings: GraphSettings) => {
          this.settings = settings;
          await this.applySettings(settings);
        }
      );
      this.xrManager.setVRControlPanel(this.vrControlPanel);
      this.lifecycleLegend = new LifecycleLegend(scene);

      await this.applySettings(this.settings);

      console.log('Knowledge Graph XR initialized successfully!');

      // カメラの初期位置を調整（タイムラインの全体が見えるように）
      const camera = this.sceneManager.getCamera();
      camera.position.set(5, 6, -40);
      camera.setTarget(new Vector3(5, 6, 20));

      // ローディング画面を非表示
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }

    } catch (error) {
      console.error('Failed to initialize Knowledge Graph XR:', error);
      alert('アプリケーションの初期化に失敗しました。コンソールを確認してください。');
    }
  }

  private async applySettings(settings: GraphSettings): Promise<void> {
    if (!this.sceneManager) return;

    this.controlPanel?.setDisabled(true);

    try {
      const scene = this.sceneManager.getScene();
      this.sceneManager.setCoordinateGuideVisibility(
        settings.showAxes,
        settings.showAxisLabels,
        settings.showCategoryBands
      );
      this.vrControlPanel?.setSettings(settings);
      this.clearVisualization();

      const scopedEntries = this.getYearScopedEntries(settings);
      const metricsByKeyword = buildKeywordMetrics(scopedEntries, this.minYear, this.maxYear);
      const selectedEntries = settings.storyMode
        ? selectStoryLifecycleEntries(scopedEntries, metricsByKeyword, settings.keywordCount, 2)
        : selectEvolutionEntries(
            scopedEntries,
            metricsByKeyword,
            settings.keywordCount,
            settings.minActiveYears
          );
      const timelineEntries = selectedEntries.map(entry => ({
        ...entry,
        category: entry.category || inferCategory(entry.keyword),
      }));
      if (timelineEntries.length === 0) {
        return;
      }

      const activeYears = new Map(
        Array.from(metricsByKeyword.entries()).map(([keyword, metrics]) => [keyword, metrics.activeYears])
      );
      const persistentKeywords = new Set(
        Array.from(activeYears.entries())
          .filter(([, count]) => count >= settings.minActiveYears)
          .map(([keyword]) => keyword)
      );

      this.nodeRenderer = new NodeRenderer(scene, {
        persistentKeywords,
        highlightPersistent: settings.highlightLongLivedKeywords,
        storyMode: settings.storyMode,
      });

      this.timelineConnector = new TimelineConnector(scene, {
        persistentKeywords,
        highlightPersistent: settings.highlightLongLivedKeywords,
      });
      this.relationshipRenderer = new RelationshipRenderer(scene);
      this.particleEffects = new ParticleEffects(scene);
      this.nodeLabel = new NodeLabel(scene);
      this.storyRenderer = new StoryJourneyRenderer(scene);
      this.timelineLayout = new TimelineLayout(this.minYear, this.maxYear);

      const nodes = this.timelineLayout.calculateLayout(timelineEntries).map(node => ({
        ...node,
        metrics: metricsByKeyword.get(node.keyword),
        lifecycleStage: metricsByKeyword.get(node.keyword)?.lifecycleStage,
      })) as EnrichedKeywordNode[];
      const renderedNodes = this.nodeRenderer.renderNodes(nodes);

      if (settings.showTimelineEdges) {
        const keywordGroups = this.timelineLayout.groupByKeyword(nodes);
        this.timelineConnector.createConnections(keywordGroups);
      }

      if (settings.showLabels) {
        renderedNodes.forEach(rendered => {
          this.nodeLabel!.addLabel(rendered.node, rendered.mesh, true);
        });
      }

      if (settings.storyMode) {
        const storyPath = this.buildStoryPath(nodes);
        this.storyRenderer.renderPath(storyPath);
        this.focusCameraOnNodes(nodes);
      } else {
        this.focusCameraOnNodes(nodes);
      }

      this.selectionManager = new SelectionManager(
        scene,
        this.nodeRenderer,
        this.timelineConnector,
        this.relationshipRenderer,
        this.particleEffects,
        this.nodeLabel,
        nodes,
        {
          minRelationshipWeight: settings.minWeight,
          showLabels: settings.showLabels,
          showRelationshipEdges: settings.showRelationshipEdges,
          showTimelineEdges: settings.showTimelineEdges,
        }
      );
      this.xrManager?.setSelectionManager(this.selectionManager);
    } finally {
      this.controlPanel?.setDisabled(false);
    }
  }

  private getYearScopedEntries(settings: GraphSettings): TimelineEntry[] {
    return settings.year === 'All'
      ? this.timelineDataCache
      : this.timelineDataCache.filter(entry => entry.year === Number(settings.year));
  }

  private buildStoryPath(nodes: KeywordNode[]): KeywordNode[] {
    const byKeyword = new Map<string, KeywordNode[]>();
    const byYear = new Map<number, KeywordNode[]>();
    const nodeById = new Map<string, KeywordNode>();

    nodes.forEach(node => {
      if (!byKeyword.has(node.keyword)) {
        byKeyword.set(node.keyword, []);
      }
      byKeyword.get(node.keyword)!.push(node);

      if (!byYear.has(node.year)) {
        byYear.set(node.year, []);
      }
      byYear.get(node.year)!.push(node);
      nodeById.set(node.id, node);
    });

    byKeyword.forEach(keywordNodes => {
      keywordNodes.sort((a, b) => this.getStoryNodePriority(b) - this.getStoryNodePriority(a));
    });
    byYear.forEach(yearNodes => {
      yearNodes.sort((a, b) => this.getStoryNodePriority(b) - this.getStoryNodePriority(a));
    });

    const selectedByKeyword = Array.from(byKeyword.values()).map(keywordNodes => keywordNodes[0]);
    const byStage = {
      LongTerm: selectedByKeyword
        .filter(node => (node.lifecycleStage || node.metrics?.lifecycleStage) === 'LongTerm')
        .sort((a, b) => a.year - b.year || this.getStoryNodePriority(b) - this.getStoryNodePriority(a)),
      Growing: selectedByKeyword
        .filter(node => (node.lifecycleStage || node.metrics?.lifecycleStage) === 'Growing')
        .sort((a, b) => a.year - b.year || this.getStoryNodePriority(b) - this.getStoryNodePriority(a)),
      New: selectedByKeyword
        .filter(node => (node.lifecycleStage || node.metrics?.lifecycleStage) === 'New')
        .sort((a, b) => a.year - b.year || this.getStoryNodePriority(b) - this.getStoryNodePriority(a)),
    };

    const stageQuota = Math.max(2, Math.floor(Math.max(this.settings.keywordCount, 9) / 3));
    const selected: KeywordNode[] = [
      ...byStage.LongTerm.slice(0, stageQuota),
      ...byStage.Growing.slice(0, stageQuota),
      ...byStage.New.slice(0, stageQuota),
    ];

    selected.sort((a, b) => a.year - b.year || this.getStoryNodePriority(b) - this.getStoryNodePriority(a));

    if (selected.length < 2) {
      const fallback = Array.from(byYear.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, yearNodes]) => yearNodes[0])
        .filter(Boolean) as KeywordNode[];
      return fallback;
    }

    const result: KeywordNode[] = [];
    const used = new Set<string>();

    for (let i = 0; i < selected.length; i += 1) {
      const current = selected[i];
      if (!used.has(current.id)) {
        result.push(current);
        used.add(current.id);
      }

      const next = selected[i + 1];
      if (!next) continue;

      for (let year = current.year + 1; year < next.year; year += 1) {
        const yearNodes = byYear.get(year) || [];
        const candidate = yearNodes.find(node => !used.has(node.id) && this.getStoryNodePriority(node) > 0.35);
        if (candidate) {
          result.push(candidate);
          used.add(candidate.id);
        }
      }
    }

    return result
      .map(node => nodeById.get(node.id))
      .filter((node): node is KeywordNode => Boolean(node));
  }

  private getStoryNodePriority(node: KeywordNode): number {
    const metrics = node.metrics;
    if (!metrics) {
      return node.score / 100;
    }

    const stage = node.lifecycleStage || metrics.lifecycleStage || 'Growing';
    const stageBonus = getLifecycleStageBonus(stage) / 100;
    const growth = Math.min(Math.max(metrics.growthScore || 0, 0) / 100, 0.5);
    const recentBonus = node.year === metrics.lastAppearanceYear ? 0.1 : 0;
    const longTermBonus = stage === 'LongTerm' && metrics.activeYears >= this.settings.minActiveYears ? 0.1 : 0;

    return node.score / 100 + metrics.evolutionRank * 0.3 + stageBonus + growth + recentBonus + longTermBonus;
  }

  private focusCameraOnNodes(nodes: KeywordNode[]): void {
    if (!this.sceneManager || nodes.length === 0) return;

    const camera = this.sceneManager.getCamera();
    const center = nodes.reduce(
      (acc, node) => ({
        x: acc.x + node.position.x,
        y: acc.y + node.position.y,
        z: acc.z + node.position.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    center.x /= nodes.length;
    center.y /= nodes.length;
    center.z /= nodes.length;

    camera.setTarget(new Vector3(center.x, center.y, center.z));
    camera.position.set(center.x, center.y + 6, center.z - Math.max(24, Math.min(56, nodes.length * 0.9)));
  }

  private clearVisualization(): void {
    this.selectionManager?.dispose();
    this.selectionManager = null;

    this.nodeLabel?.dispose();
    this.nodeLabel = null;

    this.relationshipRenderer?.dispose();
    this.relationshipRenderer = null;

    this.timelineConnector?.dispose();
    this.timelineConnector = null;

    this.storyRenderer?.dispose();
    this.storyRenderer = null;

    this.nodeRenderer?.dispose();
    this.nodeRenderer = null;

    this.particleEffects?.dispose();
    this.particleEffects = null;
  }

  dispose(): void {
    this.clearVisualization();
    this.lifecycleLegend?.dispose();
    this.lifecycleLegend = null;
    this.vrControlPanel?.dispose();
    this.vrControlPanel = null;
    this.xrManager?.dispose();
    this.sceneManager?.dispose();
  }
}

// アプリケーション起動
window.addEventListener('DOMContentLoaded', async () => {
  const app = new KnowledgeGraphXR();
  await app.initialize();
});

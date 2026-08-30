// データモデル型定義

export interface TimelineEntry {
  year: number;
  keyword: string;
  score: number;
  category?: string;
}

export type LifecycleStage = 'LongTerm' | 'Growing' | 'New';

export interface KeywordMetrics {
  firstAppearanceYear: number;
  lastAppearanceYear: number;
  activeYears: number;
  persistenceRatio: number;
  latestScore: number;
  peakScore: number;
  peakYear: number;
  yearOverYearGrowth: Record<number, number>;
  growthRatesByYear: Record<number, number>;
  maxPositiveGrowth: number;
  maxGrowthYear: number;
  evolutionRank: number;
  lifecycleStage?: LifecycleStage;
  growthScore?: number;
  storyScore?: number;
}

export interface KeywordNode {
  id: string;
  keyword: string;
  year: number;
  score: number;
  category?: string;
  lifecycleStage?: LifecycleStage;
  metrics?: KeywordMetrics;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface EnrichedKeywordNode extends KeywordNode {
  metrics: KeywordMetrics;
}

export interface KeywordRelationship {
  keyword: string;
  weight: number;
}

export interface GraphNode {
  id: string;
  type: string;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export interface YearGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

// タイムラインデータの前処理
export class TimelineProcessor {
  static processTimelineData(entries: TimelineEntry[]): {
    nodes: KeywordNode[];
    keywordTimelines: Map<string, KeywordNode[]>;
  } {
    const nodes: KeywordNode[] = [];
    const keywordTimelines = new Map<string, KeywordNode[]>();
    
    // 年ごとにグループ化
    const yearGroups = new Map<number, TimelineEntry[]>();
    entries.forEach(entry => {
      if (!yearGroups.has(entry.year)) {
        yearGroups.set(entry.year, []);
      }
      yearGroups.get(entry.year)!.push(entry);
    });
    
    // 全体の最大スコアを取得（正規化用）
    const maxScore = Math.max(...entries.map(e => e.score), 1);
    
    // 各年のキーワードをレイアウト
    yearGroups.forEach((yearEntries, year) => {
      const sortedEntries = [...yearEntries].sort((a, b) => b.score - a.score);
      const count = sortedEntries.length;
      
      sortedEntries.forEach((entry, index) => {
        // 円形配置でZ軸を分散
        const angle = (index / count) * Math.PI * 2;
        const radius = 3 + (index % 3); // 2-5の範囲でランダムに配置
        
        const node: KeywordNode = {
          id: `${entry.keyword}_${year}`,
          keyword: entry.keyword,
          year: entry.year,
          score: entry.score,
          position: {
            x: 0, // 後でレイアウト計算で設定
            y: 0,
            z: Math.cos(angle) * radius,
          },
        };
        
        nodes.push(node);
        
        // キーワードのタイムライン追跡
        if (!keywordTimelines.has(entry.keyword)) {
          keywordTimelines.set(entry.keyword, []);
        }
        keywordTimelines.get(entry.keyword)!.push(node);
      });
    });
    
    // キーワードタイムラインを年順にソート
    keywordTimelines.forEach(timeline => {
      timeline.sort((a, b) => a.year - b.year);
    });
    
    return { nodes, keywordTimelines };
  }
}

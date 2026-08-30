import type { KeywordNode, TimelineEntry } from '../models/TimelineData';
import { getCategoryZ, inferCategory } from '../utils/TechnologyCategory';

export class TimelineLayout {
  private minYear: number = 2016;
  private maxYear: number = 2026;
  private yearSpacing: number = 10.0; // X軸上の年間隔

  constructor(minYear: number = 2016, maxYear: number = 2026) {
    this.minYear = minYear;
    this.maxYear = maxYear;
  }

  // タイムラインデータから3D位置を計算
  calculateLayout(entries: TimelineEntry[]): KeywordNode[] {
    const nodes: KeywordNode[] = [];
    
    if (entries.length === 0) return nodes;

    // 最大スコアを取得（Y軸正規化用）
    const maxScore = Math.max(...entries.map(e => e.score), 1);

    // 年ごとにグループ化
    const yearGroups = new Map<number, TimelineEntry[]>();
    entries.forEach(entry => {
      if (!yearGroups.has(entry.year)) {
        yearGroups.set(entry.year, []);
      }
      yearGroups.get(entry.year)!.push(entry);
    });

    // 各年のキーワードを配置
    yearGroups.forEach((yearEntries, year) => {
      const xPos = this.yearToX(year);
      
      // スコアでソート（高い順）
      const sortedEntries = [...yearEntries].sort((a, b) => b.score - a.score);
      const count = sortedEntries.length;

      sortedEntries.forEach((entry, index) => {
        // Y軸: スコアに基づく高さ（0-10の範囲）
        const normalizedScore = (entry.score / maxScore) * 10;
        const yPos = normalizedScore;

        // Z軸: 技術カテゴリの固定座標
        const category = entry.category || inferCategory(entry.keyword);
        const baseZ = getCategoryZ(category);

        // 同カテゴリ内の重なりを防ぐ微小オフセット
        const localBandIndex = index % 8;
        const localOffset = (localBandIndex - 3.5) * 2.0;
        const zPos = baseZ + localOffset;

        // X方向も微小オフセットを入れて視認性を上げる
        const xOffset = ((Math.floor(index / 8) % 3) - 1) * 0.8;

        const node: KeywordNode = {
          id: `${entry.keyword}_${year}`,
          keyword: entry.keyword,
          year: entry.year,
          score: entry.score,
          category,
          position: {
            x: xPos + xOffset,
            y: yPos,
            z: zPos,
          },
        };

        nodes.push(node);
      });
    });

    return nodes;
  }

  // 年をX座標に変換
  private yearToX(year: number): number {
    return (year - this.minYear) * this.yearSpacing;
  }

  // X座標を年に変換
  xToYear(x: number): number {
    return Math.round(x / this.yearSpacing) + this.minYear;
  }

  // 同じキーワードのノードをグループ化
  groupByKeyword(nodes: KeywordNode[]): Map<string, KeywordNode[]> {
    const groups = new Map<string, KeywordNode[]>();
    
    nodes.forEach(node => {
      if (!groups.has(node.keyword)) {
        groups.set(node.keyword, []);
      }
      groups.get(node.keyword)!.push(node);
    });

    // 各グループを年順にソート
    groups.forEach(group => {
      group.sort((a, b) => a.year - b.year);
    });

    return groups;
  }

  getYearRange(): { min: number; max: number } {
    return { min: this.minYear, max: this.maxYear };
  }
}

// REST API クライアント

import type { 
  TimelineEntry, 
  KeywordRelationship, 
  YearGraph 
} from '../models/TimelineData';

const API_BASE = '/api';

export class GraphAPI {
  // タイムラインデータ取得
  static async getTimeline(): Promise<TimelineEntry[]> {
    try {
      const response = await fetch(`${API_BASE}/timeline`);
      if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching timeline:', error);
      return [];
    }
  }
  
  // キーワード関係性取得
  static async getKeywordRelationships(keyword: string): Promise<KeywordRelationship[]> {
    try {
      const response = await fetch(`${API_BASE}/keyword/${encodeURIComponent(keyword)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch keyword relationships: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching relationships for ${keyword}:`, error);
      return [];
    }
  }
  
  // 年次グラフ取得
  static async getYearGraph(year: number): Promise<YearGraph> {
    try {
      const response = await fetch(`${API_BASE}/graph/${year}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch year graph: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching graph for year ${year}:`, error);
      return { nodes: [], links: [] };
    }
  }
}

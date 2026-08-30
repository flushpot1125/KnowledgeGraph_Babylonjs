export interface GraphSettings {
  year: string;
  keywordCount: number;
  minWeight: number;
  showLabels: boolean;
  showAxes: boolean;
  showAxisLabels: boolean;
  showCategoryBands: boolean;
  showRelationshipEdges: boolean;
  showTimelineEdges: boolean;
  highlightLongLivedKeywords: boolean;
  minActiveYears: number;
  storyMode: boolean;
}

export const defaultGraphSettings: GraphSettings = {
  year: 'All',
  keywordCount: 20,
  minWeight: 5,
  showLabels: true,
  showAxes: true,
  showAxisLabels: true,
  showCategoryBands: true,
  showRelationshipEdges: true,
  showTimelineEdges: true,
  highlightLongLivedKeywords: true,
  minActiveYears: 3,
  storyMode: false,
};

export function buildYearOptions(minYear: number, maxYear: number): string[] {
  const options: string[] = ['All'];
  for (let year = maxYear; year >= minYear; year -= 1) {
    options.push(String(year));
  }
  return options;
}

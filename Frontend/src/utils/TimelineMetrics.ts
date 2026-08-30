import type { KeywordMetrics, LifecycleStage, TimelineEntry } from '../models/TimelineData';
import { inferCategory, type TechnologyCategory } from './TechnologyCategory';

export const LIFECYCLE_LONG_TERM_MIN_ACTIVE_YEARS = 5;
export const LIFECYCLE_GROWING_MIN_DELTA = 30;
export const LIFECYCLE_NEW_MIN_YEAR = 2025;

const LIFECYCLE_STAGE_BONUS: Record<LifecycleStage, number> = {
  LongTerm: 50,
  Growing: 75,
  New: 300,
};

const STORY_CATEGORY_BOOST: Record<TechnologyCategory, number> = {
  Cloud: 0,
  AI: 0.14,
  'Knowledge Graph': 0.16,
  Python: 0.18,
  Godot: 0,
  Web: 0,
  Android: 0,
  iOS: 0,
  Blender: 0,
  XR: 0,
  Unity: 0,
  PLATEAU: 0,
  Adobe: 0,
  Other: 0,
};

const STORY_REQUIRED_CATEGORIES: TechnologyCategory[] = ['Python', 'Knowledge Graph', 'AI'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distinctYears(entries: TimelineEntry[]): number[] {
  return Array.from(new Set(entries.map(entry => entry.year))).sort((a, b) => a - b);
}

export function getLifecycleStage(metrics: KeywordMetrics): LifecycleStage {
  const isNew = metrics.firstAppearanceYear >= LIFECYCLE_NEW_MIN_YEAR;
  const isGrowing = (metrics.growthScore ?? 0) >= LIFECYCLE_GROWING_MIN_DELTA;
  const isLongTerm = metrics.activeYears >= LIFECYCLE_LONG_TERM_MIN_ACTIVE_YEARS;

  // Newを最優先にし、次にGrowingを優先して新規技術の可視性を担保する
  if (isNew) return 'New';
  if (isGrowing) return 'Growing';
  if (isLongTerm) return 'LongTerm';
  return 'Growing';
}

export function getLifecycleStageBonus(stage: LifecycleStage): number {
  return LIFECYCLE_STAGE_BONUS[stage];
}

export function buildKeywordMetrics(
  entries: TimelineEntry[],
  minYear: number,
  maxYear: number
): Map<string, KeywordMetrics> {
  const byKeyword = new Map<string, TimelineEntry[]>();
  entries.forEach(entry => {
    if (!byKeyword.has(entry.keyword)) {
      byKeyword.set(entry.keyword, []);
    }
    byKeyword.get(entry.keyword)!.push(entry);
  });

  const visibleSpan = Math.max(maxYear - minYear + 1, 1);
  let globalLatestScoreMax = 1;
  let globalPositiveGrowthMax = 1;
  const partials = new Map<string, Omit<KeywordMetrics, 'evolutionRank'>>();

  byKeyword.forEach((keywordEntries, keyword) => {
    const sorted = [...keywordEntries].sort((a, b) => a.year - b.year);
    const years = sorted.map(entry => entry.year);
    const scoresByYear = new Map(sorted.map(entry => [entry.year, entry.score]));
    const firstAppearanceYear = years[0];
    const lastAppearanceYear = years[years.length - 1];
    const activeYears = new Set(years).size;
    const spanYears = Math.max(lastAppearanceYear - firstAppearanceYear + 1, 1);
    const persistenceRatio = activeYears / spanYears;
    const latestScore = sorted[sorted.length - 1].score;
    const peakEntry = [...sorted].sort((a, b) => b.score - a.score)[0];
    const peakScore = peakEntry.score;
    const peakYear = peakEntry.year;
    const yearOverYearGrowth: Record<number, number> = {};
    const growthRatesByYear: Record<number, number> = {};
    let maxPositiveGrowth = 0;
    let maxGrowthYear = firstAppearanceYear;

    sorted.forEach((entry, index) => {
      if (index === 0) {
        yearOverYearGrowth[entry.year] = entry.score;
        growthRatesByYear[entry.year] = 1;
        return;
      }

      const previous = sorted[index - 1];
      const delta = entry.score - previous.score;
      const growthRate = previous.score === 0 ? 1 : delta / previous.score;
      yearOverYearGrowth[entry.year] = delta;
      growthRatesByYear[entry.year] = growthRate;
      if (delta > maxPositiveGrowth) {
        maxPositiveGrowth = delta;
        maxGrowthYear = entry.year;
      }
    });

    globalLatestScoreMax = Math.max(globalLatestScoreMax, latestScore);
    globalPositiveGrowthMax = Math.max(globalPositiveGrowthMax, maxPositiveGrowth);

    partials.set(keyword, {
      firstAppearanceYear,
      lastAppearanceYear,
      activeYears,
      persistenceRatio,
      latestScore,
      peakScore,
      peakYear,
      yearOverYearGrowth,
      growthRatesByYear,
      maxPositiveGrowth,
      maxGrowthYear,
    });
  });

  const metrics = new Map<string, KeywordMetrics>();

  partials.forEach((partial, keyword) => {
    const novelty = visibleSpan <= 1
      ? 0
      : (partial.firstAppearanceYear - minYear) / (visibleSpan - 1);
    const activeRatio = partial.activeYears / visibleSpan;
    const growthRank = partial.maxPositiveGrowth / globalPositiveGrowthMax;
    const recentScore = partial.latestScore / globalLatestScoreMax;
    const stability = partial.persistenceRatio;

    const evolutionRank = clamp(
      0.3 * growthRank +
        0.25 * activeRatio +
        0.2 * stability +
        0.15 * novelty +
        0.1 * recentScore,
      0,
      1
    );

    const growthScore = Math.max(partial.yearOverYearGrowth[partial.lastAppearanceYear] || 0, 0);
    const lifecycleStage = getLifecycleStage({
      ...partial,
      evolutionRank,
      growthScore,
    });
    const storyScore = partial.latestScore + getLifecycleStageBonus(lifecycleStage);

    metrics.set(keyword, {
      ...partial,
      evolutionRank,
      lifecycleStage,
      growthScore,
      storyScore,
    });
  });

  return metrics;
}

export function calculateActiveYears(entries: TimelineEntry[]): Map<string, number> {
  const metrics = buildKeywordMetrics(entries, Math.min(...distinctYears(entries), 2016), Math.max(...distinctYears(entries), 2026));
  const activeYears = new Map<string, number>();
  metrics.forEach((metric, keyword) => {
    activeYears.set(keyword, metric.activeYears);
  });
  return activeYears;
}

export function selectEvolutionEntries(
  entries: TimelineEntry[],
  metricsByKeyword: Map<string, KeywordMetrics>,
  keywordLimit: number,
  minActiveYears: number
): TimelineEntry[] {
  if (entries.length === 0) {
    return [];
  }

  const years = distinctYears(entries);
  const entriesByYear = new Map<number, TimelineEntry[]>();
  const entriesByKeyword = new Map<string, TimelineEntry[]>();
  const globalMaxScore = Math.max(...entries.map(entry => entry.score), 1);
  const globalMaxGrowth = Math.max(
    ...Array.from(metricsByKeyword.values()).map(metric => metric.maxPositiveGrowth),
    1
  );

  entries.forEach(entry => {
    if (!entriesByYear.has(entry.year)) {
      entriesByYear.set(entry.year, []);
    }
    entriesByYear.get(entry.year)!.push(entry);

    if (!entriesByKeyword.has(entry.keyword)) {
      entriesByKeyword.set(entry.keyword, []);
    }
    entriesByKeyword.get(entry.keyword)!.push(entry);
  });

  const scoreEntry = (entry: TimelineEntry): number => {
    const metrics = metricsByKeyword.get(entry.keyword);
    if (!metrics) {
      return entry.score / globalMaxScore;
    }

    const positiveGrowth = Math.max(metrics.yearOverYearGrowth[entry.year] || 0, 0);
    const scoreNorm = entry.score / globalMaxScore;
    const growthNorm = positiveGrowth / globalMaxGrowth;
    const firstAppearanceBonus = metrics.firstAppearanceYear === entry.year ? 0.25 : 0;
    const coreBonus = metrics.activeYears >= minActiveYears ? 0.2 : 0;
    const bridgeBonus = metrics.activeYears > 1 && entry.year !== metrics.firstAppearanceYear ? 0.1 : 0;

    return scoreNorm * 0.2 + growthNorm * 0.35 + firstAppearanceBonus + coreBonus + bridgeBonus + metrics.evolutionRank * 0.25;
  };

  const selectedKeys = new Set<string>();
  const selectedEntries: TimelineEntry[] = [];
  const selectedKeywords = new Set<string>();
  const perYearQuota = Math.max(1, Math.ceil(keywordLimit / Math.max(years.length, 1)));

  years.forEach(year => {
    const ranked = [...(entriesByYear.get(year) || [])].sort((a, b) => scoreEntry(b) - scoreEntry(a));
    for (const entry of ranked.slice(0, perYearQuota)) {
      const key = `${entry.keyword}::${entry.year}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        selectedEntries.push(entry);
        selectedKeywords.add(entry.keyword);
      }
    }
  });

  const rankedKeywords = Array.from(metricsByKeyword.entries()).sort((a, b) => b[1].evolutionRank - a[1].evolutionRank);
  for (const [keyword, metrics] of rankedKeywords) {
    if (selectedKeywords.size >= keywordLimit && selectedKeywords.has(keyword) === false) {
      continue;
    }

    const keywordEntries = [...(entriesByKeyword.get(keyword) || [])].sort((a, b) => a.year - b.year);
    if (keywordEntries.length === 0) continue;

    const representativeYears = new Set<number>([
      metrics.firstAppearanceYear,
      metrics.maxGrowthYear,
      metrics.lastAppearanceYear,
    ]);

    if (metrics.activeYears >= minActiveYears) {
      keywordEntries.forEach(entry => {
        representativeYears.add(entry.year);
      });
    }

    for (const entry of keywordEntries) {
      if (!representativeYears.has(entry.year)) {
        continue;
      }
      const key = `${entry.keyword}::${entry.year}`;
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        selectedEntries.push(entry);
        selectedKeywords.add(entry.keyword);
      }
    }
  }

  return selectedEntries.sort((a, b) => a.year - b.year || b.score - a.score);
}

export function selectStoryLifecycleEntries(
  entries: TimelineEntry[],
  metricsByKeyword: Map<string, KeywordMetrics>,
  keywordLimit: number,
  minPerStage = 2
): TimelineEntry[] {
  if (entries.length === 0) {
    return [];
  }

  const byKeyword = new Map<string, TimelineEntry[]>();
  entries.forEach(entry => {
    if (!byKeyword.has(entry.keyword)) {
      byKeyword.set(entry.keyword, []);
    }
    byKeyword.get(entry.keyword)!.push(entry);
  });

  const globalMaxScore = Math.max(...entries.map(entry => entry.score), 1);
  const globalMaxGrowth = Math.max(
    ...Array.from(metricsByKeyword.values()).map(metric => metric.growthScore || 0),
    1
  );

  const scoreEntry = (entry: TimelineEntry, metrics: KeywordMetrics): number => {
    const stage = metrics.lifecycleStage || 'Growing';
    const stageBonusNorm = getLifecycleStageBonus(stage) / 300;
    const scoreNorm = entry.score / globalMaxScore;
    const growthNorm = Math.max(metrics.growthScore || 0, 0) / globalMaxGrowth;
    const category = inferCategory(entry.keyword);
    const categoryBonus = STORY_CATEGORY_BOOST[category] || 0;
    return scoreNorm * 0.45 + growthNorm * 0.35 + stageBonusNorm * 0.2 + categoryBonus;
  };

  type KeywordCandidate = {
    keyword: string;
    stage: LifecycleStage;
    bestScore: number;
  };

  const candidatesByStage: Record<LifecycleStage, KeywordCandidate[]> = {
    LongTerm: [],
    Growing: [],
    New: [],
  };

  byKeyword.forEach((keywordEntries, keyword) => {
    const metrics = metricsByKeyword.get(keyword);
    if (!metrics) {
      return;
    }

    const stage = metrics.lifecycleStage || 'Growing';
    const bestScore = Math.max(...keywordEntries.map(entry => scoreEntry(entry, metrics)));

    candidatesByStage[stage].push({
      keyword,
      stage,
      bestScore,
    });
  });

  (Object.keys(candidatesByStage) as LifecycleStage[]).forEach(stage => {
    candidatesByStage[stage].sort((a, b) => b.bestScore - a.bestScore);
  });

  const selectedKeywords = new Set<string>();
  const stageOrder: LifecycleStage[] = ['LongTerm', 'Growing', 'New'];

  stageOrder.forEach(stage => {
    const quota = Math.min(minPerStage, candidatesByStage[stage].length);
    for (let i = 0; i < quota; i += 1) {
      selectedKeywords.add(candidatesByStage[stage][i].keyword);
    }
  });

  const allRanked = stageOrder
    .flatMap(stage => candidatesByStage[stage])
    .sort((a, b) => b.bestScore - a.bestScore);

  for (const candidate of allRanked) {
    if (selectedKeywords.size >= keywordLimit) {
      break;
    }
    selectedKeywords.add(candidate.keyword);
  }

  const candidateScoreMap = new Map(allRanked.map(candidate => [candidate.keyword, candidate.bestScore]));
  const categoryByKeyword = new Map(
    Array.from(byKeyword.keys()).map(keyword => [keyword, inferCategory(keyword)])
  );

  // 特定カテゴリがゼロにならないように最低1キーワードを保証する
  for (const requiredCategory of STORY_REQUIRED_CATEGORIES) {
    const matchingCandidates = allRanked
      .filter(candidate => categoryByKeyword.get(candidate.keyword) === requiredCategory)
      .sort((a, b) => b.bestScore - a.bestScore);

    if (matchingCandidates.length === 0) {
      continue;
    }

    const hasRequiredCategory = Array.from(selectedKeywords).some(
      keyword => categoryByKeyword.get(keyword) === requiredCategory
    );
    if (hasRequiredCategory) {
      continue;
    }

    const bestRequired = matchingCandidates[0].keyword;

    if (selectedKeywords.size < keywordLimit) {
      selectedKeywords.add(bestRequired);
      continue;
    }

    let replaceTarget: string | null = null;
    let replaceScore = Number.POSITIVE_INFINITY;

    for (const keyword of selectedKeywords) {
      const keywordCategory = categoryByKeyword.get(keyword);
      if (keywordCategory && STORY_REQUIRED_CATEGORIES.includes(keywordCategory)) {
        const countInCategory = Array.from(selectedKeywords).filter(
          selectedKeyword => categoryByKeyword.get(selectedKeyword) === keywordCategory
        ).length;
        if (countInCategory <= 1) {
          continue;
        }
      }

      const score = candidateScoreMap.get(keyword) ?? Number.NEGATIVE_INFINITY;
      if (score < replaceScore) {
        replaceScore = score;
        replaceTarget = keyword;
      }
    }

    if (replaceTarget) {
      selectedKeywords.delete(replaceTarget);
      selectedKeywords.add(bestRequired);
    }
  }

  return entries
    .filter(entry => selectedKeywords.has(entry.keyword))
    .sort((a, b) => a.year - b.year || b.score - a.score);
}

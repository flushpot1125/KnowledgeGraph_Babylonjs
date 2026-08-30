export type TechnologyCategory =
  | 'Cloud'
  | 'AI'
  | 'Knowledge Graph'
  | 'Python'
  | 'Godot'
  | 'Web'
  | 'Android'
  | 'iOS'
  | 'Blender'
  | 'XR'
  | 'Unity'
  |'PLATEAU'
  |'Adobe'
  | 'Other';

const keywordCategoryMap: Record<string, TechnologyCategory> = {
  Azure: 'Cloud',
  CosmosDB: 'Cloud',
  Firebase: 'Cloud',
  PowerAutomate: 'Cloud',
  DevOps: 'Cloud',
  Repos : 'Cloud',
  Foundary: 'AI',
  RAG: 'AI',
  ChatGPT: 'AI',
  Cognitive: 'AI',
  Copilot : 'AI',
  Cortana: 'AI',
  LLM: 'AI',
  OpenAI: 'AI',
  Neo4j: 'Knowledge Graph',
  GraphRAG: 'Knowledge Graph',
  'Babylon.js': 'Web',
  babylonjs: 'Web',
  babylon: 'Web',
  'three.js' : 'Web',
  JavaScript: 'Web',
  TypeScript: 'Web',
  Mozilla: 'Web',
  PWA : 'Web',
  PlayCanvas: 'Web',
  React: 'Web',
  ReactJS: 'Web',
  Vite: 'Web',
  WebGPU: 'Web',
  WebXR: 'XR',
  HoloLens: 'XR',
  AltspaceVR: 'XR',
  Augmented: 'XR',
  Daydream: 'XR',
  GearVR: 'XR',
  Even: 'XR',
  Lumberyard: 'XR',
  MR:'XR',
  AR: 'XR',
  'Mixed Reality': 'XR',
  Milbox: 'XR',
  NeoxVR: 'XR',
  Oculus: 'XR',
  Quest: 'XR',
  VuzeXR: 'XR',
  WebAR: 'XR',
  WebVR: 'XR',
  Wolvic: 'XR',
  Wonderland: 'XR',
  Unity: 'Unity',
  Skyshop : 'Unity',
  unity: 'Unity',
  UnityMARS: 'Unity',
  VMagicMirror: 'Unity',
  VRM: 'Unity',
  Vuforia: 'Unity',
  GodotVisionExample: 'Godot',
  'Godot Engine': 'Godot',
  Godot: 'Godot',
  'Android Studio': 'Android',
  Kotlin: 'Android',
  android: 'Android',
  Python: 'Python',
  BeautifulSoup : 'Python',
  Embedding: 'Python',
  '3DCG': 'Blender',
  Blender: 'Blender',
  Archimeth: 'Blender',
  PLATEAU: 'PLATEAU',
  Mixamo: 'Adobe',
  'Adobe XD': 'Adobe',
  AdobeXR: 'Adobe',
  Premiere: 'Adobe',
  'After Effects': 'Adobe',
  Apple: 'iOS',
  Xcode: 'iOS',
  xcode: 'iOS',
};

export const categoryZMap: Record<TechnologyCategory, number> = {
  Cloud: 0,
  AI: 10,
  'Knowledge Graph': 20,
  Python: 30,
  Godot: 40,
  Web: 50,
  Android: 60,
  iOS: 70,
  Blender: 80,
  PLATEAU: 90,
  XR: 100,
  Unity: 110,
  Adobe: 120,
  Other: 130
};


const aliases: Array<{ pattern: RegExp; category: TechnologyCategory }> = [
  { pattern: /azure|microsoft graph|aws|gcp|cloud/i, category: 'Cloud' },
  // 部分一致だと "malltail" のような語が "ai" に誤マッチするため境界を使う
  { pattern: /(?:^|[^a-z0-9])(openai|gpt|rag|llm|prompt|ai|machine)(?:[^a-z0-9]|$)/i, category: 'AI' },
  // "graphic" などへの誤検知を減らすため graph も境界で判定する
  { pattern: /(?:^|[^a-z0-9])(neo4j|graph|graphrag|cypher)(?:[^a-z0-9]|$)/i, category: 'Knowledge Graph' },
  { pattern: /venv|pyvenv|wordcloud|matplotlib/i, category: 'Python' },
  { pattern: /Area3D|CharacterBody3D|WorldNode|WorldNode.get_node/i, category: 'Godot' },
 // { pattern: /neo4j|graph|graphrag|cypher/i, category: 'Web' },
//  { pattern: /neo4j|graph|graphrag|cypher/i, category: 'Android' },
//  { pattern: /neo4j|graph|graphrag|cypher/i, category: 'iOS' },
//  { pattern: /neo4j|graph|graphrag|cypher/i, category: 'Blender' },
//  { pattern: /neo4j|graph|graphrag|cypher/i, category: 'PLATEAU' },  
  { pattern: /babylon|webxr|hololens|xr|vr|ar|metaverse|meta/i, category: 'XR' },
//  { pattern: /unity|blender|dev|developer|tool|sdk|engine/i, category: 'Unity' },
//  { pattern: /teams|collaboration|sharepoint|office/i, category: 'Adobe' },
];

function normalizeKeyword(keyword: string): string {
  return keyword.trim();
}

export function inferCategory(keyword: string): TechnologyCategory {
  const normalized = normalizeKeyword(keyword);
  const direct = keywordCategoryMap[normalized];
  if (direct) {
    return direct;
  }

  for (const alias of aliases) {
    if (alias.pattern.test(normalized)) {
      return alias.category;
    }
  }

  return 'Other';
}

export function getCategoryZ(category: string): number {
  const valid = (category in categoryZMap ? category : 'Other') as TechnologyCategory;
  return categoryZMap[valid];
}

export function getCategoryList(): TechnologyCategory[] {
  return [
    'Cloud',
    'AI',
    'Knowledge Graph',
	'Python',
	'Godot',
	'Web',
	'Android',
	'iOS',
	'Blender',
    'XR',
	'Unity',
	'PLATEAU',
	'Adobe',
    'Other',
  ];
}

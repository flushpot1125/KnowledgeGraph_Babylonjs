#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

INPUT_FILE = "articles.json"
OUTPUT_FILE = "articles_normalized.json"

#
# 表記揺れ辞書
#
KEYWORD_MAPPING = {

    # Babylon.js
    "Babylon": "Babylon.js",
    "BabylonJS": "Babylon.js",
    "BabylonJs": "Babylon.js",

    # Neo4j
    "Neo 4j": "Neo4j",

    # GraphRAG
    "Graph Rag": "GraphRAG",
    "Graph-RAG": "GraphRAG",

    # OpenAI
    "Azure OpenAI Service": "Azure OpenAI",
    "AzureOpenAI": "Azure OpenAI",

    # Copilot
    "Microsoft Copilot": "Copilot",
    "GitHub Copilot": "Copilot",

	# Unity
    "Unity3D": "Unity",
    "unity": "Unity",
}


def normalize_keywords(article):

    merged_keywords = {}

    for keyword in article["keywords"]:

        term = keyword["term"]
        count = keyword["count"]

        #
        # 表記揺れ変換
        #
        normalized_term = KEYWORD_MAPPING.get(
            term,
            term
        )

        #
        # 同一キーワードを集約
        #
        if normalized_term not in merged_keywords:
            merged_keywords[normalized_term] = 0

        merged_keywords[normalized_term] += count

    #
    # Neo4j投入しやすい形式へ戻す
    #
    article["keywords"] = [
        {
            "term": term,
            "count": count
        }
        for term, count
        in sorted(
            merged_keywords.items(),
            key=lambda x: x[1],
            reverse=True
        )
    ]

    return article


def main():

    with open(
        INPUT_FILE,
        "r",
        encoding="utf-8"
    ) as f:

        articles = json.load(f)

    normalized_articles = []

    for article in articles:

        normalized_articles.append(
            normalize_keywords(article)
        )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            normalized_articles,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"saved: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()
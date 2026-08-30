#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# このスクリプトははてなブログ向けにparser処理が書かれています。他のブログの場合は途中の処理を修正してください

import json
import re
import time
from collections import Counter
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from janome.tokenizer import Tokenizer



BASE_URL = "ここを任意のRLなどに変更してください"
START_YEAR = 2016
END_YEAR = 2026

OUTPUT_FILE = "articles.json"

tokenizer = Tokenizer()

# 除外ワード
STOP_WORDS = {

    # 一般語
    "こと", "もの", "ため", "よう", "これ", "それ",
    "今回", "記事", "利用", "実装", "作成", "紹介",
    "方法", "確認", "場合", "対応", "機能", "環境",
    "結果", "取得", "モード", "セーフ", "起動", "コード",
    "管理", "設定", "追加", "変更", "確認", "実行","表示","地図",
    "開発","端末","情報","作業","処理","手順","手法","手段","手続き",
    "関係","意味","音量","ボタン","削除","ブログ","回答","質問","会社",
    "ファイル","テキスト","フォルダ","ディレクトリ","パス","パラメータ","オプション",
    "画面","撮影","データ","ログイン","認証","ウインドウ","映像","参加","勉強","調整",
    "発表","活動","接続","認識","カメラ","サーバ","データ","システム","キャッシュ","解決",
    "前回","ブロック","衝突","アップ", "ロード","エラー","プレゼンテーション","プロジェクト",
    "移動","配送","注文","アメリカ","購入","有効","今後",
    "懐中電灯","電灯","懐中", "インポート","おすすめ","企業","中心",
    "選択","候補","モデル","失敗","複雑","課金","世界","東京","対象",
    "コンテ","個別","指定","サンプル",




    # 動詞・補助語
    "です", "ます", "する", "ある", "いる","そう","あと",

    # HTML
    "id", "plain", "alt", "title", "embed",
    "content", "class", "style",
    "div", "span", "href", "src",
    "width", "height", "type",
    "name", "value", "data",
    "img", "cite", "blockquote",
    "pre", "code", "url", "\\","xml","io","://","\":",
    "(@", ")", "(", ")", "[", "]", "{", "}", "<", ">",
    "//","\",","/#","()","txt","ads","de","or","/*(",
    ");","/*","*/","///","</",");","']",")*/","++","-[",
    "._",">=",



    # URL関連
    "http", "https", "www", "com",
    "jp", "net", "html",

    # はてなブログ関連
    "takyu", "magicbullet", "hatenablog","hatena","entry",
    "blog", "archive", "crossroad", "tech",

    # その他の一般的なノイズ(HTMLタグなど)
    "br", "li", "ul", "ol", "em", "strong", "link", "meta",
    "#", "##", "###","of","is", "and", "the", "in", "on", "to", "for", "with", "by",
    "--",

    # その他の一般的なノイズ(日本語の助詞や接続詞など)
    "ところ", "こちら", "とき",
    "フォルダ", "さん", "通り", "ここ","そう",
    "イン","向け",

    # その他の一般的なノイズ (技術系,英語)
    "api", "json", "file", "files", "project",
    "github", "git", "user", "users", "page",
    "pages","const","${","js","sty","footnote","pt","can","use","was",
    "The","has","get","Coin","We","are","also","Air","at","you","You","not",
    "It","ver",

}


def extract_article_urls_from_page(url):
    """
    Archiveページ1枚から記事URLを取得
    """

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    urls = set()

    for a in soup.find_all("a", href=True):

        href = a["href"]

        if href.startswith("/"):
            href = BASE_URL + href

        parsed = urlparse(href)

        if parsed.netloc != "www.crossroad-tech.com":
            continue

        if not parsed.path.startswith("/entry/"):
            continue

        urls.add(href)

    return urls


def extract_article_urls_from_archive(year):
    """
    Archiveページから記事URL取得
    """

    urls = set()

    archive_url = f"{BASE_URL}/archive/{year}"

    print(f"[{year}] archive取得")

    #
    # Page1
    #
    page1_urls = extract_article_urls_from_page(
        archive_url
    )

    print(
        f"  page1 : {len(page1_urls)} articles"
    )

    urls.update(page1_urls)

    #
    # Page2
    #
    page2_url = f"{archive_url}?page=2"

    try:

        page2_urls = extract_article_urls_from_page(
            page2_url
        )

        if page2_urls:

            print(
                f"  page2 : {len(page2_urls)} articles"
            )

            urls.update(page2_urls)

    except Exception as ex:

        print(
            f"  page2 skipped: {ex}"
        )

    return sorted(urls)


def extract_text(html):
    """
    HTMLから本文抽出
    """

    soup = BeautifulSoup(html, "html.parser")

    # 本文領域
    body = soup.select_one(".entry-content")

    if body:
        text = body.get_text("\n")
    else:
        text = soup.get_text("\n")

    text = re.sub(r"\s+", " ", text)

    return text


def extract_keywords(text, top_n=5):
    """
    Janomeで名詞抽出
    """

    words = []

    for token in tokenizer.tokenize(text):

        pos = token.part_of_speech.split(",")

        if pos[0] != "名詞":
            continue

        term = token.surface.strip()

        if len(term) <= 1:
            continue

        if term.isdigit():
            continue

        if term in STOP_WORDS:
            continue

        words.append(term)

    counter = Counter(words)

    return [
        {
            "term": term,
            "count": count
        }
        for term, count in counter.most_common(top_n)
    ]


def extract_id(url):
    """
    URLからidを生成

    https://www.crossroad-tech.com/entry/python-wordcloud
    ↓
    python-wordcloud
    """

    parsed = urlparse(url)

    path = parsed.path

    match = re.search(r"/entry/(.+)$", path)

    if match:
        return match.group(1)

    return path.split("/")[-1]


def parse_article(url):

    try:

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # title
        title_tag = soup.select_one(".entry-title")

        title = (
            title_tag.get_text(strip=True)
            if title_tag
            else soup.title.get_text(strip=True)
        )

        # date
        date_tag = soup.select_one("time")

        if date_tag and date_tag.has_attr("datetime"):
            date = date_tag["datetime"][:10]
        else:
            date = ""

        year = int(date[:4]) if date else None

        text = extract_text(response.text)

        keywords = extract_keywords(text)

        return {
            "id": extract_id(url),
            "date": date,
            "year": year,
            "title": title,
            "url": url,
            "keywords": keywords
        }

    except Exception as ex:

        print(f"ERROR {url}")
        print(ex)

        return None


def main():

    results = []

    for year in range(START_YEAR, END_YEAR + 1):

        urls = extract_article_urls_from_archive(year)

        print(f"  found {len(urls)} articles")

        for idx, url in enumerate(urls, start=1):

            print(
                f"  [{idx}/{len(urls)}] {url}"
            )

            article = parse_article(url)

            if article:
                results.append(article)

            time.sleep(1)

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print()
    print(f"saved: {OUTPUT_FILE}")
    print(f"count : {len(results)}")


if __name__ == "__main__":
    main()
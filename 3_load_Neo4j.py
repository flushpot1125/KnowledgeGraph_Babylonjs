import json
from neo4j import GraphDatabase

# =========================
# Neo4j設定
# =========================

NEO4J_URI = "neo4j	://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "20260822"

JSON_FILE = "articles_normalized.json"

# =========================

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)


def create_constraints(tx):

    tx.run("""
        CREATE CONSTRAINT year_name IF NOT EXISTS
        FOR (y:Year)
        REQUIRE y.year IS UNIQUE
    """)

    tx.run("""
        CREATE CONSTRAINT article_id IF NOT EXISTS
        FOR (a:Article)
        REQUIRE a.id IS UNIQUE
    """)

    tx.run("""
        CREATE CONSTRAINT keyword_name IF NOT EXISTS
        FOR (k:Keyword)
        REQUIRE k.name IS UNIQUE
    """)


def load_article(tx, article):

    tx.run("""
        MERGE (y:Year {
            year: $year
        })

        MERGE (a:Article {
            id: $id
        })

        SET
            a.title = $title,
            a.date = $date,
            a.url = $url

        MERGE (y)-[:CONTAINS]->(a)

    """,
    year=article["year"],
    id=article["id"],
    title=article["title"],
    date=article["date"],
    url=article["url"]
    )

    for kw in article["keywords"]:

        tx.run("""
            MATCH (a:Article {
                id: $article_id
            })

            MERGE (k:Keyword {
                name: $keyword
            })

            MERGE (a)-[r:MENTIONS]->(k)

            SET r.count = $count
        """,
        article_id=article["id"],
        keyword=kw["term"],
        count=kw["count"])


def main():

    with open(
        JSON_FILE,
        encoding="utf-8"
    ) as f:

        articles = json.load(f)

    with driver.session() as session:

        session.execute_write(
            create_constraints
        )

        for idx, article in enumerate(
            articles,
            start=1
        ):

            session.execute_write(
                load_article,
                article
            )

            if idx % 50 == 0:

                print(
                    f"{idx}/{len(articles)} loaded"
                )

    driver.close()

    print("Done.")


if __name__ == "__main__":
    main()
import { Router } from "express";
import { driver } from "./neo4j";

const router = Router();

router.get("/", async (_req, res) => {

  const session = driver.session();

  try {

    const result = await session.run(
      `
      MATCH (y:Year)-[:CONTAINS]->(a:Article)
      MATCH (a)-[m:MENTIONS]->(k:Keyword)

      WITH
        y.year AS year,
        k.name AS keyword,
        SUM(m.count) AS score

      RETURN
        year,
        keyword,
        score

      ORDER BY year
      `
    );

    res.json(
      result.records.map(r => ({
        year: r.get("year").toNumber(),
        keyword: r.get("keyword"),
        score: r.get("score").toNumber()
      }))
    );

  } finally {

    await session.close();

  }

});

export default router;
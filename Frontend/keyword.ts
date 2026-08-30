import { Router } from "express";
import { driver } from "./neo4j";

const router = Router();

router.get("/:keyword", async (req, res) => {

  const keyword = req.params.keyword;

  const session = driver.session();

  try {

    const result = await session.run(
      `
      MATCH (k:Keyword {name:$keyword})

      MATCH (k)-[r:CO_OCCURS]-(related:Keyword)

      RETURN
        related.name AS keyword,
        r.weight AS weight

      ORDER BY weight DESC
      `,
      {
        keyword
      }
    );

    res.json(
      result.records.map(r => ({
        keyword: r.get("keyword"),
        weight: r.get("weight").toNumber()
      }))
    );

  } finally {

    await session.close();

  }

});

export default router;
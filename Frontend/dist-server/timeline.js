"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const neo4j_1 = require("./neo4j");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const session = neo4j_1.driver.session();
    try {
        const result = await session.run(`
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
      `);
        res.json(result.records.map(r => ({
            year: r.get("year"),
            keyword: r.get("keyword"),
            score: r.get("score").toNumber()
        })));
    }
    finally {
        await session.close();
    }
});
exports.default = router;

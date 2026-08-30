"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const neo4j_1 = require("./neo4j");
const router = (0, express_1.Router)();
router.get("/:year", async (req, res) => {
    const year = Number(req.params.year);
    const session = neo4j_1.driver.session();
    try {
        const result = await session.run(`
      MATCH (y:Year {year:$year})
            -[:CONTAINS]->
            (a:Article)

      MATCH (a)-[:MENTIONS]->(k1:Keyword)
      MATCH (a)-[:MENTIONS]->(k2:Keyword)

      WHERE id(k1) < id(k2)

      RETURN
        k1.name AS source,
        k2.name AS target,
        count(*) AS weight

      ORDER BY weight DESC
      LIMIT 100
      `, { year });
        const nodeSet = new Set();
        const links = [];
        result.records.forEach(record => {
            const source = record.get("source");
            const target = record.get("target");
            const weight = record.get("weight").toNumber();
            nodeSet.add(source);
            nodeSet.add(target);
            links.push({
                source,
                target,
                weight
            });
        });
        const nodes = [...nodeSet].map(name => ({
            id: name,
            type: "Keyword"
        }));
        res.json({
            nodes,
            links
        });
    }
    finally {
        await session.close();
    }
});
exports.default = router;

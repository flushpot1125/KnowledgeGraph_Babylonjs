"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const neo4j_1 = require("./neo4j");
const router = (0, express_1.Router)();
router.get("/:keyword", async (req, res) => {
    const keyword = req.params.keyword;
    const session = neo4j_1.driver.session();
    try {
        const result = await session.run(`
      MATCH (k:Keyword {name:$keyword})

      MATCH (k)-[r:CO_OCCURS]-(related:Keyword)

      RETURN
        related.name AS keyword,
        r.weight AS weight

      ORDER BY weight DESC
      `, {
            keyword
        });
        res.json(result.records.map(r => ({
            keyword: r.get("keyword"),
            weight: r.get("weight").toNumber()
        })));
    }
    finally {
        await session.close();
    }
});
exports.default = router;

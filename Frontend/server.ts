import express from "express";

import graphRouter from "./graph";
import keywordRouter from "./keyword";
import timelineRouter from "./timeline";

const app = express();

app.use("/api/graph", graphRouter);
app.use("/api/keyword", keywordRouter);
app.use("/api/timeline", timelineRouter);

app.listen(3000, () => {

  console.log(
    "http://localhost:3000"
  );

});
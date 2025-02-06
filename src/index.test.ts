import { CubeApi } from "@cubejs-client/core";

import { CubeDef } from "./";

describe("", () => {
  const cubeDef = new CubeDef(
    "test",
    {
      myMeasure: { type: "number", parser: Number },
      myOther: { type: "boolean", parser: Boolean },
      myThird: { type: "string", parser: String },
    },
    {
      myDimension: { type: "string", parser: String },
    },
    ["segment_1", "segment_2"]
  );

  it("", async () => {
    const api = new CubeApi();

    const [query, rowReader] = cubeDef
      .buildQuery()
      .measure("myMeasure")
      .measure("myOther")
      .dimension("myDimension")
      .finalize();

    const response = await api.load(query);
    const table = response.tablePivot()[0];
    const row = rowReader(table);
    console.log(row.myMeasure, row.myOther, row.myDimension);
  });
});

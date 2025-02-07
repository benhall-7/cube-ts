import { CubeApi } from "@cubejs-client/core";

import { CubeDef, m } from "./";

describe("", () => {
  const cubeDef = new CubeDef(
    "test",
    {
      myMeasure: m.number,
      myOther: m.boolean,
      myThird: m.string,
    },
    {
      myDimension: m.string,
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

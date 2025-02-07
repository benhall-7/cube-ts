import { CubeDef, m } from "./";

describe(CubeDef, () => {
  const cubeDef = new CubeDef(
    "MyCube",
    {
      myMeasure: m.number,
      myOther: m.boolean,
      myThird: m.string,
    },
    {
      myDimension: m.string,
      myOtherDimension: m.time,
    },
    ["segment1", "segment2"]
  );

  it("generates schemas correctly", async () => {
    const [query] = cubeDef
      .buildQuery()
      .measure("myMeasure")
      .measure("myOther")
      .dimension("myDimension")
      .segment("segment1")
      .filter((builder) =>
        builder
          .binaryFilter({
            member: "myMeasure",
            operator: "gte",
            values: [42],
          })
          .orDimensionFilter((builder) =>
            builder
              .binaryFilter({
                member: "myDimension",
                operator: "startsWith",
                values: ["prefix_"],
              })
              .binaryFilter({
                member: "myOtherDimension",
                operator: "beforeDate",
                values: [new Date("2025-01-01")],
              })
          )
      )
      .finalize();

    expect(query).toEqual({
      measures: ["MyCube.myMeasure", "MyCube.myOther"],
      dimensions: ["MyCube.myDimension"],
      segments: ["MyCube.segment1"],
      filters: [
        { member: "MyCube.myMeasure", operator: "gte", values: ["42"] },
        {
          or: [
            {
              member: "MyCube.myDimension",
              operator: "startsWith",
              values: ["prefix_"],
            },
            {
              member: "MyCube.myOtherDimension",
              operator: "beforeDate",
              values: ["2025-01-01T00:00:00.000Z"],
            },
          ],
        },
      ],
    });
  });
});

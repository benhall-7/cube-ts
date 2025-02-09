import { CubeDef, m } from "./";

describe(CubeDef, () => {
  const cube = new CubeDef({
    name: "MyCube",
    measures: {
      myMeasure: m.number,
      myOther: m.boolean,
      myThird: m.string,
    },
    dimensions: {
      myDimension: m.string,
      myTimeDimension: m.time,
    },
    segments: ["segment1", "segment2"],
  });

  it("generates schemas correctly", async () => {
    const query = {
      measures: [cube.measure("myMeasure"), cube.measure("myThird")],
      dimensions: [cube.dimension("myDimension")],
      timeDimensions: [
        cube.timeDimension({
          dimension: "myTimeDimension",
          granularity: "hour",
          dateRange: [new Date("2024-01-01"), new Date("2025-02-09")],
        }),
      ] as const,
      segments: [cube.segment("segment1")],
      filters: [
        {
          or: [
            cube.binaryFilter({
              member: "myMeasure",
              operator: "gte",
              values: [100],
            }),
            cube.unaryFilter({
              member: "myOther",
              operator: "set",
            }),
            cube.binaryFilter({
              member: "myThird",
              operator: "startsWith",
              values: ["cool_"],
            }),
            cube.binaryFilter({
              member: "myTimeDimension",
              operator: "afterDate",
              values: [new Date("2025-01-01")],
            }),
          ],
        },
      ],
    };

    expect(query).toEqual({
      measures: ["MyCube.myMeasure", "MyCube.myThird"],
      dimensions: ["MyCube.myDimension"],
      timeDimensions: [
        {
          dateRange: ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"],
          dimension: "MyCube.myTimeDimension",
          granularity: "hour",
        },
      ],
      segments: ["MyCube.segment1"],
      filters: [
        {
          or: [
            { member: "MyCube.myMeasure", operator: "gte", values: ["100"] },
            { member: "MyCube.myOther", operator: "set" },
            {
              member: "MyCube.myThird",
              operator: "startsWith",
              values: ["cool_"],
            },
            {
              member: "MyCube.myTimeDimension",
              operator: "afterDate",
              values: ["2025-01-01T00:00:00.000Z"],
            },
          ],
        },
      ],
    });
  });
});

import { CubeDef, m } from "./";

describe(CubeDef, () => {
  const cube = new CubeDef({
    name: "MyCube",
    measures: {
      myNumber: m.number,
      myBool: m.boolean,
      myString: m.string,
    },
    dimensions: {
      myStringDimension: m.string,
      myTimeDimension: m.time,
      myOtherTimeDimension: m.time,
    },
    segments: ["segment1", "segment2"],
  });

  it("generates schemas correctly", async () => {
    const query = {
      measures: [cube.measure("myNumber"), cube.measure("myString")],
      dimensions: [cube.dimension("myStringDimension")],
      timeDimensions: [
        cube.timeDimension({
          dimension: "myTimeDimension",
          granularity: "hour",
          dateRange: [new Date("2025-01-01"), new Date("2025-02-09")],
        }),
        cube.timeDimensionUngrouped({
          dimension: "myOtherTimeDimension",
          dateRange: [new Date("2024-01-01"), new Date("2024-01-02")],
        }),
      ] as const,
      segments: [cube.segment("segment1")],
      filters: [
        {
          or: [
            cube.binaryFilter({
              member: "myNumber",
              operator: "gte",
              values: [100],
            }),
            cube.unaryFilter({
              member: "myBool",
              operator: "set",
            }),
            cube.binaryFilter({
              member: "myString",
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
      measures: ["MyCube.myNumber", "MyCube.myString"],
      dimensions: ["MyCube.myStringDimension"],
      timeDimensions: [
        {
          dateRange: ["2025-01-01T00:00:00.000Z", "2025-02-09T00:00:00.000Z"],
          dimension: "MyCube.myTimeDimension",
          granularity: "hour",
        },
        {
          dateRange: ["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"],
          dimension: "MyCube.myOtherTimeDimension",
        },
      ],
      segments: ["MyCube.segment1"],
      filters: [
        {
          or: [
            { member: "MyCube.myNumber", operator: "gte", values: ["100"] },
            { member: "MyCube.myBool", operator: "set" },
            {
              member: "MyCube.myString",
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

  it("deserializes a request response according to a schema", () => {
    const response = {
      [cube.measure("myNumber")]: "20",
      [cube.measure("myString")]: "some string",
      [cube.dimension("myStringDimension")]: "some other string",
      [cube.timeDimensionKey("myTimeDimension", "day")]: "2025-01-01",
      [cube.timeDimensionKey("myOtherTimeDimension", "hour")]: "2025-01-02",
    };

    const deserializer = cube.deserializer({
      measures: ["myNumber", "myString"],
      dimensions: ["myStringDimension"],
      timeDimensions: [
        ["myTimeDimension", "day"],
        ["myOtherTimeDimension", "hour"],
      ],
    });

    const result = deserializer(response);

    expect(result).toEqual<typeof result>({
      myNumber: 20,
      myString: "some string",
      myStringDimension: "some other string",
      "myTimeDimension.day": new Date("2025-01-01T00:00:00.000Z"),
      "myOtherTimeDimension.hour": new Date("2025-01-02T00:00:00.000Z"),
    });
  });
});

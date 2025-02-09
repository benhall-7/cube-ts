import { CubeApi } from "@cubejs-client/core";
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
    const api = new CubeApi();

    const result = await api.load({
      measures: [cube.measure("myMeasure"), cube.measure("myThird")],
      dimensions: [cube.dimension("myDimension")],
      timeDimensions: [
        cube.timeDimension({
          dimension: "myTimeDimension",
          granularity: "hour",
          dateRange: [new Date(), new Date()],
        }),
      ] as const,
    });
    const raw = result.rawData();
    console.log(
      raw[0]["MyCube.myDimension"],
      raw[0]["MyCube.myThird"],
      raw[0]["MyCube.myMeasure"],
      raw[0]["MyCube.myTimeDimension.hour"]
    );
  });
});

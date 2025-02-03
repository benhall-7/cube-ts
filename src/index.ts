import { CubeApi, type Query } from "@cubejs-client/core";

type Parser = (input: unknown) => unknown;
type Keys = Record<string, Parser>;

type Cube<Measures extends Keys, Dimensions extends Keys> = {
  name: string;
  measures: Measures;
  dimensions: Dimensions;
};

export function elideCube<Measures extends Keys, Dimensions extends Keys>(def: Cube<Measures, Dimensions>): Cube<Measures, Dimensions> {
  return def;
}

type ResponseBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions,
> = {
  measure<Name extends keyof Measures>(
    name: Name,
  ): ResponseBuilder<
    Measures,
    Dimensions,
    InputMeasures | Name,
    InputDimensions
  >;
  dimension<Name extends keyof Dimensions>(
    name: Name,
  ): ResponseBuilder<
    Measures,
    Dimensions,
    InputMeasures,
    InputDimensions | Name
  >;
  load(api: CubeApi): {
    [K in InputMeasures]: Measures[K];
  } & {
    [K in InputDimensions]: Dimensions[K];
  };
};

export function consume<Measures extends Keys, Dimensions extends Keys>(
  cube: Cube<Measures, Dimensions>,
): ResponseBuilder<Measures, Dimensions, never, never> {
  return responseBuilder(cube, [], []);
}

function responseBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions,
>(
  cube: Cube<Measures, Dimensions>,
  measures: InputMeasures[],
  dimensions: InputDimensions[],
): ResponseBuilder<Measures, Dimensions, InputMeasures, InputDimensions> {
  return {
    measure: <Name extends keyof Measures>(name: Name) => {
      return responseBuilder(cube, [...measures, name], dimensions);
    },
    dimension: <Name extends keyof Dimensions>(name: Name) => {
      return responseBuilder(cube, measures, [...dimensions, name]);
    },
    load: (api) => {
      const query: Query = {};
      if (measures.length) {
        query.measures = measures.map((ms) => `${cube.name}.${String(ms)}`);
      }
      if (dimensions.length) {
        query.dimensions = dimensions.map((dm) => `${cube.name}.${String(dm)}`);
      }

      return {
        ...measures.reduce(
          (acc, curr) => {
            acc[curr] = cube.measures[curr];
            return acc;
          },
          {} as { [K in InputMeasures]: Measures[K] },
        ),
        ...dimensions.reduce(
          (acc, curr) => {
            acc[curr] = cube.dimensions[curr];
            return acc;
          },
          {} as { [K in InputDimensions]: Dimensions[K] },
        ),
      };
    },
  };
}

async function testCube() {
  const api = new CubeApi();

  const cubeDef = elideCube({
    name: "test",
    measures: {
      myMeasure: Number,
      myOther: String,
      myThird: Boolean,
    },
    dimensions: {
      myDimension: String,
    },
  });

  const cubeResponse = consume(cubeDef)
    .measure("myMeasure")
    .measure("myOther")
    .dimension("myDimension")
    .load(api);
}

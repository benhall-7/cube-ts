import {
  BinaryOperator,
  CubeApi,
  UnaryOperator,
  type Query,
} from "@cubejs-client/core";

type MemberType = "string" | "time" | "boolean" | "number";
type Member = {
  type: MemberType;
  parser: (input: unknown) => unknown;
};
type Keys = Record<string, Member>;

class CubeDef<
  Measures extends Keys,
  Dimensions extends Keys,
  Segments extends string
> {
  readonly name: string;
  readonly measures: Measures;
  readonly dimensions: Dimensions;
  readonly segments: Segments[];

  constructor(
    name: string,
    measures: Measures,
    dimensions: Dimensions,
    segments: Segments[]
  ) {
    this.name = name;
    this.measures = measures;
    this.dimensions = dimensions;
    this.segments = segments;
  }

  buildQuery(): QueryBuilder<Measures, Dimensions, Segments, never, never> {
    return queryBuilder(this, [], [], []);
  }

  /**
   * @param name the name of the measure
   * @returns the "full path" of the cube measure
   */
  measure<Name extends keyof Measures>(name: Name): string {
    return `${this.name}.${String(name)}`;
  }
  /**
   * @param name the name of the dimension
   * @returns the "full path" of the cube dimension
   */
  dimension<Name extends keyof Dimensions>(name: Name): string {
    return `${this.name}.${String(name)}`;
  }
  /**
   * @param name the name of the dimension
   * @returns the "full path" of the cube dimension
   */
  segment(name: Segments): string {
    return `${this.name}.${name}`;
  }
}

/*

  export type Filter = BinaryFilter | UnaryFilter | LogicalOrFilter | LogicalAndFilter;
  export type LogicalAndFilter = {
    and: Filter[];
  };

  export type LogicalOrFilter = {
    or: Filter[];
  };

  export interface BinaryFilter {
    dimension?: string;
    member?: string;
    operator: BinaryOperator;
    values: string[];
  }
  export interface UnaryFilter {
    dimension?: string;
    member?: string;
    operator: UnaryOperator;
    values?: never;
  }
  export type UnaryOperator = 'set' | 'notSet';
  export type BinaryOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'notStartsWith'
    | 'endsWith'
    | 'notEndsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'inDateRange'
    | 'notInDateRange'
    | 'beforeDate'
    | 'beforeOrOnDate'
    | 'afterDate'
    | 'afterOrOnDate';
*/

type Filter<Measures extends string, Dimensions extends string> =
  | UnaryFilter<Measures>
  | UnaryFilter<Dimensions>
  | BinaryFilter<Measures>
  | BinaryFilter<Dimensions>
  // can't mix-and-match measures and dimensions in these filter
  // types, so we use never to exclude them recursively
  | LogicalAndFilter<Measures, never>
  | LogicalAndFilter<never, Dimensions>
  | LogicalOrFilter<Measures, never>
  | LogicalOrFilter<never, Dimensions>;
// TODO: restrict values to the correct type
type BinaryFilter<Member extends string> = {
  member: Member;
  operator: BinaryOperator;
  values: string[];
};

type UnaryFilter<Member extends string> = {
  member: Member;
  operator: UnaryOperator;
  values?: never;
};

type LogicalAndFilter<Measures extends string, Dimensions extends string> = {
  and: Filter<Measures, Dimensions>[];
};

type LogicalOrFilter<Measures extends string, Dimensions extends string> = {
  or: Filter<Measures, Dimensions>[];
};

type Row<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
> = {
  [K in InputMeasures]: ReturnType<Measures[K]["parser"]>;
} & {
  [K in InputDimensions]: ReturnType<Dimensions[K]["parser"]>;
};

type QueryBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  Segments extends string,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
> = {
  measure<Name extends keyof Measures>(
    name: Name
  ): QueryBuilder<
    Measures,
    Dimensions,
    Segments,
    InputMeasures | Name,
    InputDimensions
  >;
  dimension<Name extends keyof Dimensions>(
    name: Name
  ): QueryBuilder<
    Measures,
    Dimensions,
    Segments,
    InputMeasures,
    InputDimensions | Name
  >;
  segment(
    name: Segments[number]
  ): QueryBuilder<
    Measures,
    Dimensions,
    Segments,
    InputMeasures,
    InputDimensions
  >;
  /**
   * returns a Query object that can be passed to the Cube.js REST endpoint,
   * and a function to parse individual rows
   */
  finalize(): [
    Query,
    (
      row: Record<string, unknown>
    ) => Row<Measures, Dimensions, InputMeasures, InputDimensions>
  ];
};

function queryBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  Segments extends string,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
>(
  cube: CubeDef<Measures, Dimensions, Segments>,
  measures: InputMeasures[],
  dimensions: InputDimensions[],
  segments: Segments[]
): QueryBuilder<
  Measures,
  Dimensions,
  Segments,
  InputMeasures,
  InputDimensions
> {
  return {
    measure: <Name extends keyof Measures>(name: Name) => {
      return queryBuilder(cube, [...measures, name], dimensions, segments);
    },
    dimension: <Name extends keyof Dimensions>(name: Name) => {
      return queryBuilder(cube, measures, [...dimensions, name], segments);
    },
    segment: (name: Segments) => {
      return queryBuilder(cube, measures, dimensions, [...segments, name]);
    },
    finalize: () => {
      const query: Query = {};

      if (measures.length) {
        query.measures = measures.map((ms) => cube.measure(ms));
      }
      if (dimensions.length) {
        query.dimensions = dimensions.map((dm) => cube.dimension(dm));
      }

      query.filters = [{ member: "test", operator: "set" }];

      query.segments = ["test"];

      return [
        query,
        // row parser
        (row: Record<string, unknown>) => ({
          ...measures.reduce((acc, ms) => {
            const key = cube.measure(ms);
            const parsed = cube.measures[ms].parser(row[key]) as ReturnType<
              Measures[InputMeasures]["parser"]
            >;
            acc[ms] = parsed;
            return acc;
          }, {} as { [K in InputMeasures]: ReturnType<Measures[K]["parser"]> }),

          ...dimensions.reduce((acc, dm) => {
            const key = cube.dimension(dm);
            const parsed = cube.dimensions[dm].parser(row[key]) as ReturnType<
              Dimensions[InputDimensions]["parser"]
            >;
            acc[dm] = parsed;
            return acc;
          }, {} as { [K in InputDimensions]: ReturnType<Dimensions[K]["parser"]> }),
        }),
      ];
    },
  };
}

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

async function testCube() {
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
}

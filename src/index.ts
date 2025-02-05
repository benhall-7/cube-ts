import {
  BinaryOperator,
  CubeApi,
  UnaryOperator,
  type Query,
} from "@cubejs-client/core";

type MemberType = "string" | "time" | "boolean" | "number";
type Member = {
  type: MemberType;
};
type Keys = Record<string, Member>;

class CubeDef<Measures extends Keys, Dimensions extends Keys> {
  name: string;
  measures: Measures;
  dimensions: Dimensions;

  constructor(name: string, measures: Measures, dimensions: Dimensions) {
    this.name = name;
    this.measures = measures;
    this.dimensions = dimensions;
  }

  buildQuery(): QueryBuilder<Measures, Dimensions, never, never> {
    return responseBuilder(this, [], []);
  }

  measure<Name extends keyof Measures>(name: Name): string {
    return `${this.name}.${String(name)}`
  }

  dimension<Name extends keyof Dimensions>(name: Name): string {
    return `${this.name}.${String(name)}`
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

type QueryBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
> = {
  measure<Name extends keyof Measures>(
    name: Name
  ): QueryBuilder<Measures, Dimensions, InputMeasures | Name, InputDimensions>;
  dimension<Name extends keyof Dimensions>(
    name: Name
  ): QueryBuilder<Measures, Dimensions, InputMeasures, InputDimensions | Name>;
  finalize(): { query: Query; parser: () => void };
};

function responseBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
>(
  cube: CubeDef<Measures, Dimensions>,
  measures: InputMeasures[],
  dimensions: InputDimensions[]
): QueryBuilder<Measures, Dimensions, InputMeasures, InputDimensions> {
  return {
    measure: <Name extends keyof Measures>(name: Name) => {
      return responseBuilder(cube, [...measures, name], dimensions);
    },
    dimension: <Name extends keyof Dimensions>(name: Name) => {
      return responseBuilder(cube, measures, [...dimensions, name]);
    },
    finalize: () => {
      const query: Query = {};

      if (measures.length) {
        query.measures = measures.map((ms) => `${cube.name}.${String(ms)}`);
      }
      if (dimensions.length) {
        query.dimensions = dimensions.map((dm) => `${cube.name}.${String(dm)}`);
      }

      query.filters = [{ member: "test", operator: "set" }];

      return { query, parser: () => {} };
    },
  };
}

async function testCube() {
  const api = new CubeApi();

  const cubeDef = new CubeDef(
    "test",
    {
      myMeasure: Number,
      myOther: String,
      myThird: Boolean,
    },
    {
      myDimension: String,
    }
  );

  const cubeResponse = cubeDef
    .buildQuery()
    .measure("myMeasure")
    .measure("myOther")
    .dimension("myDimension");
}

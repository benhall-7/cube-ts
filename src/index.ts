import { Filter, type Query } from "@cubejs-client/core";

import { MemberConfig, Keys, Row, FilterType } from "./base";
import { filterBuilder, FilterBuilder, FilterResult } from "./filter";

/**
 * A convenience method for eliding the type param T when
 * declaring the member. For example:
 *
 * ```
 * const myMemberType = elideMember({
 *   filter: "string",
 *   deserialize: Number,
 *   serialize: String,
 * });
 * ```
 *
 * @param member the object details
 * @returns the object with no modifications, but with the
 * type T automatically elided based on context
 */
export function elideMember<T, FT extends FilterType>(
  member: MemberConfig<T, FT>
) {
  return member;
}

/**
 * An object containing predefined members for use in defining
 * cubes. The end user can still define their own members with
 * custom serialization logic
 */
export const m = {
  /**
   * A configuration that reads strings. The deserializer expects
   * string inputs. Defaults to an empty string
   */
  string: elideMember({
    filter: "string",
    deserialize: (input: unknown) => {
      if (typeof input === "string") {
        return input;
      }
      return "";
    },
    serialize: String,
  }),
  /**
   * A configuration that reads Dates. The deserializer expects
   * strings with parsable values. Defaults to Unix epoch. The
   * serializer uses the .toISOString method
   */
  time: elideMember({
    filter: "time",
    deserialize: (input: unknown) => {
      if (typeof input === "string") {
        const timestamp = Date.parse(input);
        if (isNaN(timestamp)) {
          return new Date();
        }
        return new Date(timestamp);
      }
      return new Date();
    },
    serialize: (date: Date) => date.toISOString(),
  }),
  /**
   * A configuration that reads booleans. The deserializer expects
   * strings with values of "true" or "false". Defaults to false.
   */
  boolean: elideMember({
    filter: "string",
    deserialize: (input: unknown) => {
      if (typeof input === "string") {
        return input !== "false";
      }
      return false;
    },
    serialize: String,
  }),
  number: elideMember({
    filter: "number",
    deserialize: (input: unknown) => {
      if (typeof input === "string") {
        return Number(input);
      }
      return 0;
    },
    serialize: String,
  }),
};

/**
 * A class for encapsulating a cube, which should reflect the
 * definition of the cube on the Cube.js server
 */
export class CubeDef<
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

  /**
   * @returns a builder closure that can be used to add measures, dimensions,
   * segments, etc, and produce typesafe parsers for the cube.js response
   */
  buildQuery(): QueryBuilder<Measures, Dimensions, Segments, never, never> {
    return queryBuilder(this, [], [], [], filterBuilder(this, []));
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
  /**
   * @param name the name of the measure or dimension
   * @returns the "full path" of the cube member
   */
  member<Name extends keyof (Measures & Dimensions)>(name: Name): string {
    return `${this.name}.${String(name)}`;
  }
}

export type QueryBuilder<
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
    name: Segments
  ): QueryBuilder<
    Measures,
    Dimensions,
    Segments,
    InputMeasures,
    InputDimensions
  >;
  filter(
    cb: (
      filter: FilterBuilder<Pick<Measures, InputMeasures>, Dimensions>
    ) => FilterBuilder<Pick<Measures, InputMeasures>, Dimensions>
  ): QueryBuilder<
    Measures,
    Dimensions,
    Segments,
    InputMeasures,
    InputDimensions
  >;
  /**
   * returns a Query object that can be passed to the Cube.js REST endpoint,
   * and a function to parse the pivot rows from the response
   */
  finalize(): [
    Query,
    (
      row: Record<string, unknown>
    ) => Row<Measures, Dimensions, InputMeasures, InputDimensions>
  ];
};

type FilterBuilderRestricted<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures
> = FilterBuilder<Pick<Measures, InputMeasures>, Dimensions>;

export function queryBuilder<
  Measures extends Keys,
  Dimensions extends Keys,
  Segments extends string,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
>(
  cube: CubeDef<Measures, Dimensions, Segments>,
  measures: InputMeasures[],
  dimensions: InputDimensions[],
  segments: Segments[],
  filterBuilder: FilterBuilderRestricted<Measures, Dimensions, InputMeasures>
): QueryBuilder<
  Measures,
  Dimensions,
  Segments,
  InputMeasures,
  InputDimensions
> {
  return {
    measure: <Name extends keyof Measures>(name: Name) => {
      return queryBuilder(
        cube,
        [...measures, name],
        dimensions,
        segments,
        filterBuilder
      );
    },
    dimension: <Name extends keyof Dimensions>(name: Name) => {
      return queryBuilder(
        cube,
        measures,
        [...dimensions, name],
        segments,
        filterBuilder
      );
    },
    segment: (name: Segments) => {
      return queryBuilder(
        cube,
        measures,
        dimensions,
        [...segments, name],
        filterBuilder
      );
    },
    filter: (
      cb: (
        filter: FilterBuilder<Pick<Measures, InputMeasures>, Dimensions>
      ) => FilterBuilder<Pick<Measures, InputMeasures>, Dimensions>
    ) => {
      return queryBuilder(
        cube,
        measures,
        dimensions,
        segments,
        cb(filterBuilder)
      );
    },
    finalize: () => {
      const query: Query = {};

      if (measures.length) {
        query.measures = measures.map((ms) => cube.measure(ms));
      }
      if (dimensions.length) {
        query.dimensions = dimensions.map((dm) => cube.dimension(dm));
      }
      if (segments.length) {
        query.segments = segments.map((sg) => cube.segment(sg));
      }

      // recursive filter conversion
      const baseFilterLayer = filterBuilder.finalize();
      function getFilters<M extends Keys, D extends Keys>(
        filterLayer: FilterResult<M, D>[]
      ): Filter[] {
        return filterLayer.map((filterResult) => {
          if ("and" in filterResult) {
            return { and: getFilters(filterResult.and) };
          }
          if ("or" in filterResult) {
            return { or: getFilters(filterResult.or) };
          }
          if ("values" in filterResult && filterResult.values) {
            return {
              member: cube.member(filterResult.member),
              operator: filterResult.operator,
              values: filterResult.values.map((value) => {
                console.log({ filterResult, cube, value });
                const members = {
                  ...cube.measures,
                  ...cube.dimensions,
                };

                return members[filterResult.member].serialize(value);
              }),
            };
          }
          return {
            member: cube.member(filterResult.member),
            operator: filterResult.operator,
          };
        });
      }
      const filters = getFilters(baseFilterLayer);
      if (filters.length) {
        query.filters = filters;
      }

      return [
        query,
        // row parser
        (row: Record<string, unknown>) => ({
          ...measures.reduce((acc, ms) => {
            const col = row[cube.measure(ms)];
            const parsed = cube.measures[ms].deserialize(col) as ReturnType<
              Measures[InputMeasures]["deserialize"]
            >;
            acc[ms] = parsed;
            return acc;
          }, {} as { [K in InputMeasures]: ReturnType<Measures[K]["deserialize"]> }),

          ...dimensions.reduce((acc, dm) => {
            const col = row[cube.dimension(dm)];
            const parsed = cube.dimensions[dm].deserialize(col) as ReturnType<
              Dimensions[InputDimensions]["deserialize"]
            >;
            acc[dm] = parsed;
            return acc;
          }, {} as { [K in InputDimensions]: ReturnType<Dimensions[K]["deserialize"]> }),
        }),
      ];
    },
  };
}

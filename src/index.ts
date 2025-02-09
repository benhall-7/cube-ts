/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Filter,
  TimeDimensionComparison,
  TimeDimensionPredefinedGranularity,
  type Query,
} from "@cubejs-client/core";

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

export type Time<Dimensions extends Keys> = {
  [K in keyof Dimensions as Dimensions[K] extends MemberConfig<any, "time">
    ? K
    : never]: Dimensions[K];
};

type MemberType<Member> = Member extends MemberConfig<infer T, any> ? T : never;

/**
type ExtractTimeMembers<T> =
    T extends readonly [infer First, ...infer Rest]
    ? ExtractTimeMember<First> | ExtractTimeMembers<Rest>
    : never;
*/

/**
 * A class for encapsulating a cube, which should reflect the
 * definition of the cube on the Cube.js server
 */
export class CubeDef<
  Name extends string,
  Measures extends Keys,
  Dimensions extends Keys,
  Segments extends string
> {
  readonly name: Name;
  readonly measures: Measures;
  readonly dimensions: Dimensions;
  readonly segments: Segments[];

  constructor({
    name,
    measures,
    dimensions,
    segments,
  }: {
    name: Name;
    measures: Measures;
    dimensions: Dimensions;
    segments: Segments[];
  }) {
    this.name = name;
    this.measures = measures;
    this.dimensions = dimensions;
    this.segments = segments;
  }

  /**
   * @param name the name of the measure
   * @returns the "full path" of the cube measure
   */
  measure<Member extends keyof Measures & string>(
    member: Member
  ): `${typeof this.name}.${Member}` {
    return `${this.name}.${member}`;
  }
  /**
   * @param name the name of the dimension
   * @returns the "full path" of the cube dimension
   */
  dimension<Member extends keyof Dimensions & string>(
    member: Member
  ): `${typeof this.name}.${Member}` {
    return `${this.name}.${member}`;
  }
  /**
   * Creates a strongly typed time dimension
   * @param dimension the name of the dimension
   * @param granularity the granularity level
   * @param dateRange the date range (typed)
   * @returns an object that can be plugged into the timeDimensions array
   */
  timeDimension<
    TimeDimension extends keyof Time<Dimensions> & string,
    Granularity extends TimeDimensionPredefinedGranularity
  >({
    dimension,
    granularity,
    dateRange,
  }: {
    dimension: TimeDimension;
    granularity: Granularity;
    dateRange:
      | string
      | [
          MemberType<Dimensions[TimeDimension]>,
          MemberType<Dimensions[TimeDimension]>
        ];
  }) {
    const name = this.name;
    const serialize = this.dimensions[dimension].serialize;

    return {
      dimension: `${name}.${dimension}` as const,
      granularity,
      dateRange:
        typeof dateRange === "string"
          ? dateRange
          : ([serialize(dateRange[0]), serialize(dateRange[0])] as const),
    };
  }
  /**
   * Creates a strongly typed time dimension, with a compareDateRange array
   * @param dimension the name of the dimension
   * @param granularity the granularity level
   * @param compareDateRange the date range (typed)
   * @returns an object that can be plugged into the timeDimensions array
   */
  timeDimensionComparison<
    TimeDimension extends keyof Time<Dimensions> & string,
    Granularity extends TimeDimensionPredefinedGranularity
  >({
    dimension,
    granularity,
    compareDateRange,
  }: {
    dimension: TimeDimension;
    granularity: Granularity;
    compareDateRange: Array<
      | string
      | [
          MemberType<Dimensions[TimeDimension]>,
          MemberType<Dimensions[TimeDimension]>
        ]
    >;
  }) {
    const name = this.name;
    const serialize = this.dimensions[dimension].serialize;

    return {
      dimension: `${name}.${dimension}` as const,
      granularity,
      compareDateRange: compareDateRange.map((dateRange) =>
        typeof dateRange === "string"
          ? dateRange
          : ([serialize(dateRange[0]), serialize(dateRange[0])] as const)
      ),
    };
  }
  /**
   * @param name the name of the segment
   * @returns the "full path" of the cube segment (as a string)
   */
  segment(name: Segments): string {
    return `${this.name}.${name}`;
  }
  /**
   * @param name the name of the measure or dimension
   * @returns the "full path" of the cube member
   */
  member<Member extends keyof (Measures & Dimensions) & string>(
    member: Member
  ): `${typeof this.name}.${Member}` {
    return `${this.name}.${member}`;
  }
}

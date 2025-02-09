/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TimeDimensionPredefinedGranularity,
  UnaryOperator,
} from "@cubejs-client/core";

/**
 * The "type" of the filter operations which can be used
 */
export type FilterType = "string" | "number" | "time" | "none";
/**
 * The object
 */
export type MemberConfig<T, FT extends FilterType> = {
  filter: FT;
  deserialize: (input: unknown) => T;
  serialize: (input: T) => string;
};

type Keys = Record<string, MemberConfig<any, any>>;

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
    filter: "none",
    deserialize: (input: unknown) => {
      if (typeof input === "string") {
        return input !== "false";
      }
      return false;
    },
    serialize: String,
  }),
  /**
   * A configuration that reads numbers. The deserializer expects
   * strings with parsable values. Defaults to 0.
   */
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
type MemberFilterType<Member> = Member extends MemberConfig<any, infer T>
  ? T
  : never;

type ValidBinaryFilters = {
  string:
    | "equals"
    | "notEquals"
    | "contains"
    | "notContains"
    | "startsWith"
    | "notStartsWith"
    | "endsWith"
    | "notEndsWith";
  number: "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte";
  time:
    | "equals"
    | "notEquals"
    | "inDateRange"
    | "notInDateRange"
    | "beforeDate"
    | "beforeOrOnDate"
    | "afterDate"
    | "afterOrOnDate";
  none: "equals" | "notEquals";
};

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
          : ([serialize(dateRange[0]), serialize(dateRange[1])] as const)
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
  /**
   * A function that generates a filter using a binary operation
   * with correctly-typed inputs
   * @param member the name of the measure or dimension
   * @param operator the operator to use in the filter
   * @param values the array of values to check against
   * @returns a filter with the member name and values converted
   * to the correct formats
   */
  binaryFilter<Member extends keyof (Measures & Dimensions) & string>({
    member,
    operator,
    values,
  }: {
    member: Member;
    operator: ValidBinaryFilters[MemberFilterType<
      (Measures & Dimensions)[Member]
    >];
    values: MemberType<(Measures & Dimensions)[Member]>[];
  }) {
    const members = {
      ...this.measures,
      ...this.dimensions,
    };
    return {
      member: this.member(member),
      operator,
      values: values.map((value) => members[member].serialize(value)),
    };
  }
  /**
   * A function that generates a filter using a unary operation
   * @param member the name of the measure or dimension
   * @param operator the operator to use in the filter
   * @returns a filter with the member name converted to the
   * correct format
   */
  unaryFilter<Member extends keyof (Measures & Dimensions) & string>({
    member,
    operator,
  }: {
    member: Member;
    operator: UnaryOperator;
  }) {
    return {
      member: this.member(member),
      operator,
    };
  }
}

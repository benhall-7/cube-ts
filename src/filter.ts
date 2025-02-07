/* eslint-disable @typescript-eslint/no-empty-object-type */

import { UnaryOperator } from "@cubejs-client/core";

import { Keys, MemberConfig } from "./base";
import { CubeDef } from ".";

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
};

export type FilterResult<Measures extends Keys, Dimensions extends Keys> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | UnaryFilter<Measures & Dimensions, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | BinaryFilter<Measures & Dimensions, any>
  | AndFilter<Measures, {}>
  | AndFilter<{}, Dimensions>
  | OrFilter<Measures, {}>
  | OrFilter<{}, Dimensions>;

type UnaryFilter<Members extends Keys, MemberName extends keyof Members> = {
  member: MemberName;
  operator: UnaryOperator;
  values?: never;
};

type BinaryFilter<Members extends Keys, MemberName extends keyof Members> = {
  member: MemberName;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  operator: Members[MemberName] extends MemberConfig<infer T, infer FT>
    ? ValidBinaryFilters[FT]
    : never;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  values: (Members[MemberName] extends MemberConfig<infer T, infer FT>
    ? T
    : never)[];
};

type AndFilter<Measures extends Keys, Dimensions extends Keys> = {
  and: FilterResult<Measures, Dimensions>[];
};

type OrFilter<Measures extends Keys, Dimensions extends Keys> = {
  or: FilterResult<Measures, Dimensions>[];
};

export type FilterBuilder<Measures extends Keys, Dimensions extends Keys> = {
  /**
   * A unary operation filter. Can check if a value is set or not
   * @param filter the filter object
   */
  unaryFilter<Name extends keyof (Measures & Dimensions)>(
    filter: UnaryFilter<Measures & Dimensions, Name>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * A binary operation filter. Checks if a value matches criteria
   * @param filter the filter object
   */
  binaryFilter<Name extends keyof (Measures & Dimensions)>(
    filter: BinaryFilter<Measures & Dimensions, Name>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * A conjunctive "and" filter, which can only filter on measures
   * @param cb the callback, containing a FilterBuilder to customize
   */
  andMeasureFilter(
    cb: (builder: FilterBuilder<Measures, {}>) => FilterBuilder<Measures, {}>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * A conjunctive "and" filter, which can only filter on dimensions
   * @param cb the callback, containing a FilterBuilder to customize
   */
  andDimensionFilter(
    cb: (
      builder: FilterBuilder<{}, Dimensions>
    ) => FilterBuilder<{}, Dimensions>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * A conjunctive "or" filter, which can only filter on measures
   * @param cb the callback, containing a FilterBuilder to customize
   */
  orMeasureFilter(
    cb: (builder: FilterBuilder<Measures, {}>) => FilterBuilder<Measures, {}>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * A conjunctive "or" filter, which can only filter on dimensions
   * @param cb the callback, containing a FilterBuilder to customize
   */
  orDimensionFilter(
    cb: (
      builder: FilterBuilder<{}, Dimensions>
    ) => FilterBuilder<{}, Dimensions>
  ): FilterBuilder<Measures, Dimensions>;
  /**
   * An internal method converting filterBuilders into an internal representation
   * End users shouldn't need to use this
   */
  finalize(): FilterResult<Measures, Dimensions>[];
};

export function filterBuilder<Measures extends Keys, Dimensions extends Keys>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cube: CubeDef<Measures, Dimensions, any>,
  filters: FilterResult<Measures, Dimensions>[]
): FilterBuilder<Measures, Dimensions> {
  return {
    unaryFilter<Name extends keyof (Measures & Dimensions)>(
      filter: UnaryFilter<Measures & Dimensions, Name>
    ) {
      return filterBuilder(cube, [...filters, filter]);
    },
    binaryFilter<Name extends keyof (Measures & Dimensions)>(
      filter: BinaryFilter<Measures & Dimensions, Name>
    ) {
      return filterBuilder(cube, [...filters, filter]);
    },
    andMeasureFilter(
      cb: (builder: FilterBuilder<Measures, {}>) => FilterBuilder<Measures, {}>
    ) {
      const andFilterBuilder = filterBuilder<Measures, {}>(cube, []);
      const andFilter: AndFilter<Measures, Dimensions> = {
        and: cb(andFilterBuilder).finalize(),
      };

      return filterBuilder(cube, [...filters, andFilter]);
    },
    andDimensionFilter(
      cb: (
        builder: FilterBuilder<{}, Dimensions>
      ) => FilterBuilder<{}, Dimensions>
    ) {
      const andFilterBuilder = filterBuilder(cube, []);
      const andFilter = { and: cb(andFilterBuilder).finalize() };

      return filterBuilder(cube, [...filters, andFilter]);
    },
    orMeasureFilter(
      cb: (builder: FilterBuilder<Measures, {}>) => FilterBuilder<Measures, {}>
    ) {
      const orFilterBuilder = filterBuilder<Measures, {}>(cube, []);
      const orFilter = { or: cb(orFilterBuilder).finalize() };

      return filterBuilder(cube, [...filters, orFilter]);
    },
    orDimensionFilter(
      cb: (
        builder: FilterBuilder<{}, Dimensions>
      ) => FilterBuilder<{}, Dimensions>
    ) {
      const orFilterBuilder = filterBuilder(cube, []);
      const orFilter = { or: cb(orFilterBuilder).finalize() };

      return filterBuilder(cube, [...filters, orFilter]);
    },
    finalize() {
      return filters;
    },
  };
}

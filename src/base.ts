/**
 * The "type" of the filter operations which can be used
 */
export type FilterType = "string" | "number" | "time";
/**
 * The object
 */
export type MemberConfig<T, FT extends FilterType> = {
  filter: FT;
  deserialize: (input: unknown) => T;
  serialize: (input: T) => string;
};

// An acceptable use of "any", because there's no way to know
// how many properties Keys has, or which type each Member is

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Keys = Record<string, MemberConfig<any, any>>;

export type Row<
  Measures extends Keys,
  Dimensions extends Keys,
  InputMeasures extends keyof Measures,
  InputDimensions extends keyof Dimensions
> = {
  [K in InputMeasures]: ReturnType<Measures[K]["deserialize"]>;
} & {
  [K in InputDimensions]: ReturnType<Dimensions[K]["deserialize"]>;
};

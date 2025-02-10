# cube-ts

A utility for working with Cube.js queries in TypeScript.

## Features

### Cube declaration

You can declare a cube and its allowed members in code:

```typescript
import { CubeDef, m } from "cube-ts";

const myCube = new CubeDef({
  name: "MyCube",
  measures: {
    myNumber: m.number,
    myString: m.string,
  },
  dimensions: {
    myTimeDimension: m.time,
  },
  segments: ["segment1"],
});
```

There are two main exports from `cube-ts`: a class to define cube schemas with, and a set of predefined "members types" that can be assigned to each member, behind the "m" export. For example, you can use `m.number` to provide the default behavior for dealing with numeric cube members.

### Query creation

You can use the cube definition to saturate the Query object when running a load query. This grants the user strong typing support and lets them use native types in filters instead of only strings:

```typescript
const query = {
  measures: [cube.measure("myNumber"), cube.measure("myString")],
  dimensions: [cube.dimension("myStringDimension")],
  timeDimensions: [
    cube.timeDimension({
      dimension: "myTimeDimension",
      granularity: "hour",
      // notice the use of Date objects
      dateRange: [new Date("2025-01-01"), new Date("2025-02-09")],
    }),
  ] as const,
  segments: [cube.segment("segment1")],
  filters: [
    cube.binaryFilter({
      member: "myNumber",
      operator: "gte",
      // notice the true numbers instead of strings
      values: [100],
    }),
  ],
};
```

### Result parsing

The Cube.js client library supports automatic type inference in ResultSet objects, but this only extends to the rawData method; not to other methods such as tablePivot. To alleviate this limitation, the CubeDef class contains a "deserializer" method that accepts a list of measures, dimensions, and timeDimensions and produces a function that will validate and parse the expected type:

```typescript
const deserializer = cube.deserializer({
  measures: ["myNumber", "myString"],
  dimensions: ["myStringDimension"],
  timeDimensions: [["myTimeDimension", "day"]],
});

const result = deserializer(response);
console.log(
  result.myNumber, // a number
  result.myString, // a string
  result.myStringDimension, // a string
  result["myTimeDimension.day"] // a Date
);
```

This does come at the cost of some redundancy, because it requires the user to specify the measures, dimensions, and time dimensions in both the query, and the deserializer

### Customization

Because the cube member type is designed to be generic, a user can choose to define their own and use that instead. For example, you could use `dayjs` instead of `Date`; or you could create a type with custom serialization/deserialization, like so:

```typescript
import { config } from "cube-ts";

const myCBool = elideMember({
  filter: "none",
  deserialize(input: unknown) {
    return input === "1";
  },
  serialize(input: boolean) {
    return input ? "1" : "0";
  },
});
```

and this new type can be used for the given member of the cube.

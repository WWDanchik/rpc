import z from "zod";
import { Rpc } from "./rpc/Rpc";

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

export type StorageType = "collection" | "singleton";

export type RpcConfig = {
    storageType?: StorageType;
    loadCallback?: LoadCallback<any>;
};

export type ZodSchemaKeys<T extends z.ZodSchema> = keyof z.infer<T>;
export type ZodSchemaType<T extends z.ZodSchema> = z.infer<T>;

export type TypedRpcRelation<
    TLocalSchema extends z.ZodSchema = z.ZodSchema,
    TTargetSchema extends z.ZodSchema = z.ZodSchema
> = {
    targetType: string;
    relationType: RelationType;
    foreignKey: ZodSchemaKeys<TTargetSchema>;
    localKey: ZodSchemaKeys<TLocalSchema>;
    arrayKey: string;
};

export type RpcRelation = {
    targetType: string;
    relationType: RelationType;
    foreignKey: string;
    localKey: string;
};

export type Join<K, P> = K extends string
    ? P extends string
        ? `${K}.${P}`
        : never
    : never;

export type ArrayElementFields<T> = T extends Array<infer U>
    ? U extends object
        ? keyof U
        : never
    : never;

export type RpcArrayPaths<T, D extends number = 15> = [D] extends [never]
    ? never
    : {
          [K in keyof T]: T[K] extends Array<any>
              ? K | Join<K, RpcArrayPaths<ArrayElementType<T[K]>, Prev[D]>>
              : never;
      }[keyof T];

export type ArrayElementType<T> = T extends Array<infer U> ? U : never;

type Prev = [
    never,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    70,
    71,
    72,
    73,
    74,
    75,
    76,
    77,
    78,
    79,
    80,
    81,
    82,
    83,
    84,
    85,
    86,
    87,
    88,
    89,
    90,
    91,
    92,
    93,
    94,
    95,
    96,
    97,
    98,
    99,
    100
];

export type GetArrayByPath<T, Path> = Path extends keyof T
    ? T[Path]
    : Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? T[K] extends Array<any>
            ? GetArrayByPath<ArrayElementType<T[K]>, Rest>
            : GetArrayByPath<T[K], Rest>
        : never
    : never;

export type ArrayFieldsRecord<T> = {
    [K in RpcArrayPaths<T>]: ArrayElementFields<GetArrayByPath<T, K>>;
};

export type RelationKey<
    TTypes extends Record<string, Rpc<any>>,
    TSource extends keyof TTypes,
    TField extends keyof z.infer<
        TTypes[TSource] extends Rpc<infer S> ? S : never
    >
> = {
    field: TField;
    key: TTypes[TSource] extends Rpc<infer S>
        ? TField extends keyof z.infer<S>
            ? ArrayElementFields<z.infer<S>[TField]>
            : never
        : never;
};

export type IdFieldMap = {
    [path: string]:
        | string
        | {
              idField: string;
              children?: string;
              recursive?: boolean;
          };
};

export type LoadCallback<T> = (id: string | number) => Promise<T | null>;

export type RelationTree = {
    [type: string]: {
        relations: {
            [targetType: string]: {
                targetType: string;
                relationType: RelationType;
                foreignKey: string;
                localKey: string;
            };
        };
        children?: {
            [targetType: string]: RelationTree;
        };
    };
};

export type FieldNameMap = {
    [type: string]: string;
};

export type RelatedFieldNameMap<
    TTypes extends Record<string, Rpc<any>>,
    TCurrent extends keyof TTypes
> = {
    [K in keyof TTypes]: K extends TCurrent ? never : string;
};

export type RelatedTypes<
    TTypes extends Record<string, Rpc<any>>,
    T extends keyof TTypes
> = {
    [K in keyof TTypes]: K extends T ? never : K;
}[keyof TTypes];

export type RelatedFieldsMapFor = Partial<Record<string, string>>;

export type RelatedFieldsMapAuto = Partial<Record<string, string>>;

export type Message<TTypes extends Record<string, Rpc<any>>> = {
    [K in keyof TTypes]: {
        type: K;
        payload:
            | Record<
                  string,
                  Partial<
                      TTypes[K] extends Rpc<infer S> ? z.infer<S> : never
                  > | null
              >
            | Array<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never>;
    };
}[keyof TTypes];

export type DataChangeEvent<TTypes extends Record<string, Rpc<any>>> =
    Message<TTypes>;

export type DataChangeListener<
    TTypes extends Record<string, Rpc<any>>,
    TKeys extends keyof TTypes = keyof TTypes
> = (
    events: Array<{
        type: TKeys;
        payload: Array<TTypes[TKeys] extends Rpc<infer S> ? z.infer<S> : never>;
    }>
) => void;

export type DataChangeFilter<
    TTypes extends Record<string, Rpc<any>>,
    TKeys extends keyof TTypes = keyof TTypes
> = {
    types: readonly TKeys[];
};

export type MergeRpc<
    TTypes extends Record<string, Rpc<any>>,
    K extends keyof TTypes = keyof TTypes
> =
    | Record<
          string,
          Partial<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never> | null
      >
    | Array<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never>;
export type InferRpcType<T> = T extends Rpc<infer S> ? z.infer<S> : never;

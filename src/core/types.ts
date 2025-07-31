import z from "zod";
import { Rpc } from "./rpc/Rpc";

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

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

// Example interface for type demonstrations
// interface User {
//     id: number;
//     name: string;
//     post: {
//         id: string;
//         title: string;
//         content: string;
//         author: {
//             id: number;
//             name: string;
//         };
//     }[];
//     profile: {
//         bio: string;
//         age: number;
//         hobbies: { name: string; level: number }[];
//         settings: {
//             notifications: {
//                 types: { id: string; enabled: boolean }[];
//             };
//         };
//     };
//     comments: {
//         text: string;
//         likes: number;
//         replies: {
//             text: string;
//             author: string;
//             likes: {
//                 id: number;
//                 users: {
//                     id: number;
//                     name: string;
//                 }[];
//             }[];
//         }[];
//     }[];
// }

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

// type PostArray = GetArrayByPath<User, "post">;
// type HobbiesArray = GetArrayByPath<User, "profile.hobbies">;
// type RepliesArray = GetArrayByPath<User, "comments.replies">;
// type RepliesLikesArray = GetArrayByPath<User, "comments.replies.likes">;
// type RepliesLikesUsersArray = GetArrayByPath<
//     User,
//     "comments.replies.likes.users"
// >;

// Example usage:
// const a: ArrayFieldsRecord<User> = {
//     post: "id",
//     "comments.replies": "text",
//     "comments.replies.likes.users": "id",
//     "comments.replies.likes": "id",
//     comments: "text",
// };

// Типы для конфигурации полей ID
export type IdFieldMap = {
    [path: string]:
        | string
        | {
              idField: string;
              children?: string;
              recursive?: boolean;
          };
};

// Типы для callback'ов
export type LoadCallback<T> = (id: string | number) => Promise<T | null>;

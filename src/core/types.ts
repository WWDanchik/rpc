import z from "zod";

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

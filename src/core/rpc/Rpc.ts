import z from "zod";
import { EventEmitter, Events } from "../event/EventEmitter";
import { TypedRpcRelation, ZodSchemaKeys, ZodSchemaType } from "../types";

export class Rpc<TSchema extends z.ZodSchema = z.ZodSchema> {
    private type: string;
    private fields: TSchema;
    private emitter: EventEmitter;
    private relations = new Map<string, TypedRpcRelation<TSchema, any>>();

    constructor(type: string, fields: TSchema) {
        this.type = type;
        this.fields = fields;
        this.emitter = new EventEmitter();
    }

    public validate(data: any): ZodSchemaType<TSchema> {
        return this.fields.parse(data);
    }

    public getType(): string {
        return this.type;
    }

    public getFields(): TSchema {
        return this.fields;
    }

    public on(event: Events, listener: Function): this {
        this.emitter.on(event, listener);
        return this;
    }

    public off(event: Events, listener?: Function): this {
        this.emitter.off(event, listener);
        return this;
    }

    public emit(event: Events, ...args: any[]): this {
        this.emitter.emit(event, ...args);
        return this;
    }

    public hasMany<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TTargetSchema>,
        localKey: ZodSchemaKeys<TSchema> = "id" as ZodSchemaKeys<TSchema>
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-many",
            foreignKey,
            localKey,
        });
    }

    public hasOne<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TTargetSchema>,
        localKey: ZodSchemaKeys<TSchema> = "id" as ZodSchemaKeys<TSchema>
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-one",
            foreignKey,
            localKey,
        });
    }

    public belongsTo<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TSchema>,
        localKey: ZodSchemaKeys<TTargetSchema> = "id" as ZodSchemaKeys<TTargetSchema>
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-one",
            foreignKey: localKey,
            localKey: foreignKey,
        });
    }

    private addRelation(
        name: string,
        relation: TypedRpcRelation<TSchema, any>
    ): this {
        this.relations.set(name, relation);
        return this;
    }

    public getRelation(
        name: string
    ): TypedRpcRelation<TSchema, any> | undefined {
        return this.relations.get(name);
    }

    public getRelations(): Map<string, TypedRpcRelation<TSchema, any>> {
        return this.relations;
    }
}

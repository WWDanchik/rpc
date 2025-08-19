import z from "zod";
import { EventEmitter, Events } from "../event/EventEmitter";
import { TypedRpcRelation, ZodSchemaKeys, ZodSchemaType, IdFieldMap } from "../types";

export class Rpc<TSchema extends z.ZodSchema = z.ZodSchema> {
    private type: string;
    private fields: TSchema;
    private emitter: EventEmitter;
    private relations = new Map<string, TypedRpcRelation<TSchema, any>>();
    private foreignKey: ZodSchemaKeys<TSchema>;
    private mergePath: IdFieldMap;
    private relatedFields: Record<string, string>;

    constructor(
        type: string,
        fields: TSchema,
        foreignKey?: ZodSchemaKeys<TSchema>
    ) {
        this.type = type;
        this.fields = fields;
        this.emitter = new EventEmitter();
        this.foreignKey = foreignKey || ("id" as ZodSchemaKeys<TSchema>);
        this.mergePath = {};
        this.relatedFields = {};
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

    public getMergePath(): IdFieldMap {
        return this.mergePath;
    }

    public setMergePath(mergePath: IdFieldMap): this {
        this.mergePath = { ...mergePath };
        return this;
    }

    public createMessage(
        data: Record<string, Partial<ZodSchemaType<TSchema>> | null>
    ): {
        type: string;
        payload: Record<string, Partial<ZodSchemaType<TSchema>> | null>;
    };
    
    public createMessage(
        data: Array<ZodSchemaType<TSchema>>
    ): {
        type: string;
        payload: Array<ZodSchemaType<TSchema>>;
    };

    public createMessage(
        data:
            | Record<string, Partial<ZodSchemaType<TSchema>> | null>
            | Array<ZodSchemaType<TSchema>>
    ): {
        type: string;
        payload:
            | Record<string, Partial<ZodSchemaType<TSchema>> | null>
            | Array<ZodSchemaType<TSchema>>;
    } {
        return {
            type: this.type,
            payload: data,
        };
    }

    public hasMany<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TTargetSchema>,
        localKey: ZodSchemaKeys<TSchema> = "id" as ZodSchemaKeys<TSchema>,
        arrayKey: string
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-many",
            foreignKey,
            localKey,
            arrayKey,
        });
    }

    public hasOne<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TTargetSchema>,
        localKey: ZodSchemaKeys<TSchema> = "id" as ZodSchemaKeys<TSchema>,
        arrayKey: string = "id"
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-one",
            foreignKey,
            localKey,
            arrayKey,
        });
    }

    public belongsTo<TTargetSchema extends z.ZodSchema>(
        targetType: string,
        foreignKey: ZodSchemaKeys<TSchema>,
        localKey: ZodSchemaKeys<TTargetSchema> = "id" as ZodSchemaKeys<TTargetSchema>,
        arrayKey: string = "id"
    ): this {
        return this.addRelation(targetType, {
            targetType,
            relationType: "one-to-one",
            foreignKey: localKey,
            localKey: foreignKey,
            arrayKey,
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

    public getForeignKey(): ZodSchemaKeys<TSchema> {
        return this.foreignKey;
    }

    public getRelatedFields(): Record<string, string> {
        return this.relatedFields;
    }
}

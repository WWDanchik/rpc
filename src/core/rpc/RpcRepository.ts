import z from "zod";
import { Rpc } from "./Rpc";

export class RpcRepository<TTypes extends Record<string, Rpc<any>> = {}> {
    private rpcs = new Map<string, Rpc<any>>();
    private data = new Map<string, Map<string, any>>();

    constructor() {}

    public registerRpc<TName extends string, TRpc extends Rpc<any>>(
        name: TName,
        rpc: TRpc
    ): RpcRepository<TTypes & { [K in TName]: TRpc }> {
        this.rpcs.set(name, rpc);
        this.data.set(name, new Map());
        return this;
    }

    public getState() {
        const state: Record<string, any> = {};

        for (const [type, dataMap] of this.data.entries()) {
            state[type] = {
                byId: Object.fromEntries(dataMap),
                allIds: Array.from(dataMap.keys()),
            };
        }

        return state;
    }

    public save<T extends keyof TTypes>(
        type: T,
        id: string | number,
        data: Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): TTypes[T] extends Rpc<infer S> ? z.infer<S> : never {
        const rpc = this.getRpc(type as string);
        const validatedData = rpc.validate({ ...data, id });

        const typeData = this.data.get(type as string) || new Map();
        typeData.set(String(id), validatedData);
        this.data.set(type as string, typeData);

        return validatedData;
    }

    public saveMany<T extends keyof TTypes>(
        type: T,
        records: Array<
            Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> & {
                id: string | number;
            }
        >
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const savedRecords: Array<
            TTypes[T] extends Rpc<infer S> ? z.infer<S> : never
        > = [];

        for (const record of records) {
            const savedRecord = this.save(type, record.id, record);
            savedRecords.push(savedRecord);
        }

        return savedRecords;
    }

    public findAll<T extends keyof TTypes>(
        type: T,
        
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const typeData = this.data.get(type as string) || new Map();
        return Array.from(typeData.values());
    }

    public findById<T extends keyof TTypes>(
        type: T,
        id: string | number
    ): (TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null {
        const typeData = this.data.get(type as string) || new Map();
        return typeData.get(String(id)) || null;
    }

    public findBy<T extends keyof TTypes>(
        type: T,
        field: TTypes[T] extends Rpc<infer S> ? keyof z.infer<S> : never, // ← АВТОКОМПЛИТ!
        value: any
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const allRecords = this.findAll(type);
        return allRecords.filter(
            (record: any) => record[String(field)] === value
        );
    }

    public defineRelation<
        TSource extends keyof TTypes,
        TTarget extends keyof TTypes
    >(
        sourceType: TSource,
        targetType: TTarget
    ): {
        hasMany: (
            foreignKey: TTypes[TSource] extends Rpc<infer S>
                ? keyof z.infer<S>
                : never,
            localKey: TTypes[TTarget] extends Rpc<infer S>
                ? keyof z.infer<S>
                : never
        ) => RpcRepository<TTypes>;
        belongsTo: (
            foreignKey: string,
            localKey: string
        ) => RpcRepository<TTypes>;
    } {
        return {
            hasMany: (foreignKey, localKey) => {
                const sourceRpc = this.getRpc(sourceType);
                (sourceRpc as any).hasMany(targetType, foreignKey, localKey);
                return this;
            },
            belongsTo: (foreignKey, localKey) => {
                const sourceRpc = this.getRpc(sourceType);
                (sourceRpc as any).belongsTo(targetType, foreignKey, localKey);
                return this;
            },
        };
    }

    public getRelated<
        TSource extends keyof TTypes,
        TTarget extends keyof TTypes
    >(
        sourceType: TSource,
        sourceId: string | number,
        targetType: TTarget
    ):
        | Array<TTypes[TTarget] extends Rpc<infer S> ? z.infer<S> : never>
        | (TTypes[TTarget] extends Rpc<infer S> ? z.infer<S> : never)
        | null {
        const sourceRecord = this.findById(sourceType, sourceId);
        if (!sourceRecord) return [];

        const sourceRpc = this.getRpc(sourceType);
        const relation = sourceRpc.getRelation(targetType as string);

        if (!relation) return [];

        if (relation.relationType === "one-to-many") {
            return this.findBy(
                targetType,
                relation.foreignKey as any,
                (sourceRecord as any)[relation.localKey as string]
            );
        } else {
            const foreignKeyValue = (sourceRecord as any)[
                relation.localKey as string
            ];
            return this.findById(targetType, foreignKeyValue);
        }
    }

    public groupBy<T extends keyof TTypes>(
        type: T,
        field: TTypes[T] extends Rpc<infer S> ? keyof z.infer<S> : never
    ): Record<
        string,
        Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    > {
        const records = this.findAll(type);
        const groups: Record<
            string,
            Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
        > = {};

        for (const record of records) {
            const key = String((record as any)[String(field)]);
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        }

        return groups;
    }

    public sortBy<T extends keyof TTypes>(
        type: T,
        field: TTypes[T] extends Rpc<infer S> ? keyof z.infer<S> : never,
        order: "asc" | "desc" = "asc"
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const records = this.findAll(type);

        return records.sort((a: any, b: any) => {
            const aVal = a[String(field)];
            const bVal = b[String(field)];

            if (aVal < bVal) return order === "asc" ? -1 : 1;
            if (aVal > bVal) return order === "asc" ? 1 : -1;
            return 0;
        });
    }

    public update<T extends keyof TTypes>(
        type: T,
        id: string | number,
        updates: Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): TTypes[T] extends Rpc<infer S> ? z.infer<S> : never {
        const existing = this.findById(type, id);
        if (!existing)
            throw new Error(`Record ${String(type)}:${id} not found`);

        const merged = { ...existing, ...updates };
        return this.save(type, id, merged);
    }

    public remove(type: string, id: string | number) {
        const typeData = this.data.get(type) || new Map();
        const result = typeData.delete(String(id));
        return result;
    }

    public getStats() {
        const stats: Record<string, any> = {};

        for (const [type, dataMap] of this.data.entries()) {
            stats[type] = {
                count: dataMap.size,
                ids: Array.from(dataMap.keys()),
            };
        }

        return stats;
    }

    // ============ 🔗 ПОЛУЧЕНИЕ ВСЕХ СВЯЗЕЙ ============

    public getAllRelations() {
        const allRelations: Record<string, Record<string, any>> = {};

        for (const [typeName, rpc] of this.rpcs.entries()) {
            const relations = rpc.getRelations();
            const relationsObj: Record<string, any> = {};

            for (const [targetType, relation] of relations.entries()) {
                relationsObj[targetType] = {
                    targetType: relation.targetType,
                    relationType: relation.relationType,
                    foreignKey: relation.foreignKey,
                    localKey: relation.localKey,
                };
            }

            if (Object.keys(relationsObj).length > 0) {
                allRelations[typeName] = relationsObj;
            }
        }

        return allRelations;
    }

    public getRelationsForType(typeName: string) {
        const rpc = this.rpcs.get(typeName);
        if (!rpc) return {};

        const relations = rpc.getRelations();
        const result: Record<string, any> = {};

        for (const [targetType, relation] of relations.entries()) {
            result[targetType] = {
                targetType: relation.targetType,
                relationType: relation.relationType,
                foreignKey: relation.foreignKey,
                localKey: relation.localKey,
            };
        }

        return result;
    }

    public printAllRelations() {
        const relations = this.getAllRelations();
        
        console.log("🔗 Все связи в системе:");
        
        for (const [sourceType, targets] of Object.entries(relations)) {
            console.log(`\n📋 ${sourceType}:`);
            
            for (const [targetType, relation] of Object.entries(targets)) {
                const arrow = relation.relationType === "one-to-many" ? "→→→" : "→";
                console.log(`  ${arrow} ${targetType} (${relation.relationType})`);
                console.log(`     foreignKey: ${relation.foreignKey}, localKey: ${relation.localKey}`);
            }
        }
    }

    protected getRpc(type: string | keyof TTypes): Rpc<any> {
        const rpc = this.rpcs.get(String(type));
        if (!rpc) {
            throw new Error(`RPC type "${String(type)}" not registered`);
        }
        return rpc;
    }
}

export function createRpcRepository() {
    return new RpcRepository();
}

export function setupRepository<T extends RpcRepository<any>>(
    repositoryBuilder: T
) {
    return repositoryBuilder;
}

export type RepositoryState<T extends RpcRepository<any>> = ReturnType<
    T["getState"]
>;

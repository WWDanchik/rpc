import z from "zod";
import { RelationKey, IdFieldMap, LoadCallback } from "../types";
import { Rpc } from "./Rpc";

export class RpcRepository<TTypes extends Record<string, Rpc<any>> = {}> {
    private rpcs = new Map<string, Rpc<any>>();
    private data = new Map<string, Map<string, any>>();
    private loadCallbacks = new Map<string, LoadCallback<any>>();

    constructor() {}

    public registerRpc<TName extends string, TRpc extends Rpc<any>>(
        name: TName,
        rpc: TRpc,
        loadCallback?: LoadCallback<
            TRpc extends Rpc<infer S> ? z.infer<S> : never
        >
    ): RpcRepository<TTypes & { [K in TName]: TRpc }> {
        this.rpcs.set(name, rpc);
        this.data.set(name, new Map());
        if (loadCallback) {
            this.loadCallbacks.set(name, loadCallback);
        }
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
        data: Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): TTypes[T] extends Rpc<infer S> ? z.infer<S> : never {
        const rpc = this.getRpc(type as string);
        const foreignKey = rpc.getForeignKey() as keyof (TTypes[T] extends Rpc<
            infer S
        >
            ? z.infer<S>
            : never);

        const validatedData = rpc.validate({ ...data });

        const typeData = this.data.get(type as string) || new Map();
        typeData.set(String(data[foreignKey]), validatedData);
        this.data.set(type as string, typeData);

        return validatedData;
    }

    public mergeRpc<T extends keyof TTypes>(
        type: T,
        source: Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>,
        target:
            | Record<
                  string,
                  Partial<
                      TTypes[T] extends Rpc<infer S> ? z.infer<S> : never
                  > | null
              >
            | Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const rpc = this.getRpc(type);
        const mergePath = rpc.getMergePath();

        // Преобразуем mergePath в IdFieldMap
        const idFieldMap: IdFieldMap = {};
        for (const [path, idField] of Object.entries(mergePath)) {
            idFieldMap[path] = idField;
        }

        if (Array.isArray(target)) {
            // Слияние с массивом
            return this.mergeArrayDeep(
                type,
                this.arrayToRecord(type, target),
                idFieldMap
            );
        } else if (typeof target === "object" && target !== null) {
            // Это Record<string, Partial<...>>
            return this.mergeArrayDeep(
                type,
                target as Record<
                    string,
                    TTypes[T] extends Rpc<infer S> ? z.infer<S> : never | null
                >,
                idFieldMap
            );
        }

        return source;
    }

    private arrayToRecord<T extends keyof TTypes>(
        type: T,
        array: Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Record<
        string,
        TTypes[T] extends Rpc<infer S> ? z.infer<S> : never | null
    > {
        const record: Record<
            string,
            TTypes[T] extends Rpc<infer S> ? z.infer<S> : never | null
        > = {};

        for (const item of array) {
            const rpc = this.getRpc(type);
            const foreignKey =
                rpc.getForeignKey() as keyof (TTypes[T] extends Rpc<infer S>
                    ? z.infer<S>
                    : never);
            const id = item[foreignKey];
            if (id !== undefined) {
                record[String(id)] = item;
            }
        }

        return record;
    }

    public async update<T extends keyof TTypes>(
        type: T,
        id: string | number,
        data: Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Promise<(TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null> {
        const existing = await this.findById(type, id);
        if (!existing) return null;

        const updatedRecord = { ...existing, ...data };

        const rpc = this.getRpc(type);
        const validatedData = rpc.validate(updatedRecord);

        const typeData = this.data.get(type as string) || new Map();
        typeData.set(String(id), validatedData);
        this.data.set(type as string, typeData);

        return validatedData;
    }

    public updateByPath<T extends keyof TTypes>(
        type: T,
        id: string | number,
        path: string,
        value: any
    ): (TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null {
        const existing = this.findById(type, id);
        if (!existing) return null;

        const updated = { ...existing };
        this.setRpcPathValue(updated, path, value);

        const rpc = this.getRpc(type);
        const validatedData = rpc.validate(updated);

        const typeData = this.data.get(type as string) || new Map();
        typeData.set(String(id), validatedData);
        this.data.set(type as string, typeData);

        return validatedData;
    }

    public getByPath<T extends keyof TTypes>(
        type: T,
        id: string | number,
        path: string
    ): any {
        const record = this.findById(type, id);
        if (!record) return undefined;

        return this.getRpcPathValue(record, path);
    }

    public saveMany<T extends keyof TTypes>(
        type: T,
        records: Array<
            Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
        >
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const savedRecords: Array<
            TTypes[T] extends Rpc<infer S> ? z.infer<S> : never
        > = [];

        for (const record of records) {
            const savedRecord = this.save(type, record);
            savedRecords.push(savedRecord);
        }

        return savedRecords;
    }

    public findAll<T extends keyof TTypes>(
        type: T
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const typeData = this.data.get(type as string) || new Map();
        return Array.from(typeData.values());
    }

        public findById<T extends keyof TTypes>(
        type: T,
        id: string | number
    ): (TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null {
        const typeData = this.data.get(type as string) || new Map();
        let result = typeData.get(String(id)) || null;
        
        // Если данные не найдены и есть callback для загрузки - загружаем в фоне
        if (!result) {
            const loadCallback = this.loadCallbacks.get(String(type));
            if (loadCallback) {
                // Загружаем в фоне без await
                loadCallback(id).then((loadedData) => {
                    if (loadedData) {
                        this.save(type, loadedData);
                    }
                }).catch((error) => {
                    console.warn(
                        `Failed to load data for ${String(type)} with id ${id}:`,
                        error
                    );
                });
            }
        }
        
        return result;
    }

    public findBy<T extends keyof TTypes>(
        type: T,
        field: TTypes[T] extends Rpc<infer S> ? keyof z.infer<S> : never,
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
        hasMany: <
            TForeignField extends keyof z.infer<
                TTypes[TSource] extends Rpc<infer S> ? S : never
            >,
            TLocalField extends keyof z.infer<
                TTypes[TTarget] extends Rpc<infer S> ? S : never
            >
        >(
            foreign: RelationKey<TTypes, TSource, TForeignField>,
            localKey: TLocalField
        ) => RpcRepository<TTypes>;
        belongsTo: <
            TForeignField extends keyof z.infer<
                TTypes[TSource] extends Rpc<infer S> ? S : never
            >,
            TLocalField extends keyof z.infer<
                TTypes[TTarget] extends Rpc<infer S> ? S : never
            >
        >(
            foreign: RelationKey<TTypes, TSource, TForeignField>,
            localKey: TLocalField
        ) => RpcRepository<TTypes>;
    } {
        return {
            hasMany: (foreign, localKey) => {
                const sourceRpc = this.getRpc(sourceType);
                (sourceRpc as any).hasMany(
                    targetType as string,
                    String(foreign.field),
                    String(localKey)
                );
                return this;
            },
            belongsTo: (foreign, localKey) => {
                const sourceRpc = this.getRpc(sourceType);
                (sourceRpc as any).belongsTo(
                    targetType,
                    String(foreign.field),
                    String(localKey)
                );
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
    ): Array<TTypes[TTarget] extends Rpc<infer S> ? z.infer<S> : never> {
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
            const result = this.findById(targetType, foreignKeyValue);
            return result ? [result] : [];
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

    public remove<T extends keyof TTypes>(type: T, id: string | number) {
        const typeData = this.data.get(type as string) || new Map();
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

    private getIdFieldForPath(
        idFieldMap: IdFieldMap,
        path: string,
        rootPath: string = ""
    ): string | undefined {
        const directMatch = idFieldMap[path];
        if (directMatch) {
            return typeof directMatch === "string"
                ? directMatch
                : directMatch.idField;
        }

        if (rootPath) {
            const fullPath = `${rootPath}.${path}`;
            const fullPathMatch = idFieldMap[fullPath];
            if (fullPathMatch) {
                return typeof fullPathMatch === "string"
                    ? fullPathMatch
                    : fullPathMatch.idField;
            }

            for (const [key, value] of Object.entries(idFieldMap)) {
                const keyWithoutRoot = key.startsWith(`${rootPath}.`)
                    ? key.substring(`${rootPath}.`.length)
                    : key;

                if (keyWithoutRoot === path) {
                    return typeof value === "string" ? value : value.idField;
                }
            }
        }

        for (const [mapPath, config] of Object.entries(idFieldMap)) {
            if (
                typeof config === "object" &&
                config.recursive &&
                config.children
            ) {
                if (
                    this.isChildPath(path, mapPath, config.children, rootPath)
                ) {
                    return config.idField;
                }
            }
        }

        for (const [pattern, value] of Object.entries(idFieldMap)) {
            if (
                pattern.includes("*") &&
                this.matchesWildcard(path, pattern, rootPath)
            ) {
                return typeof value === "string" ? value : value.idField;
            }
        }

        return undefined;
    }

    private isChildPath(
        currentPath: string,
        parentPath: string,
        childrenField: string,
        rootPath: string = ""
    ): boolean {
        const normalizedCurrent =
            rootPath && currentPath.startsWith(`${rootPath}.`)
                ? currentPath.substring(`${rootPath}.`.length)
                : currentPath;

        const normalizedParent =
            rootPath && parentPath.startsWith(`${rootPath}.`)
                ? parentPath.substring(`${rootPath}.`.length)
                : parentPath;

        if (normalizedCurrent === normalizedParent) {
            return true;
        }

        const escapedParent = normalizedParent.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const escapedChildren = childrenField.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = `^${escapedParent}\\.[^.]+\\.${escapedChildren}(\\.|$)`;
        const regex = new RegExp(pattern);

        return regex.test(normalizedCurrent);
    }

    private matchesWildcard(
        path: string,
        pattern: string,
        rootPath: string = ""
    ): boolean {
        if (rootPath) {
            const fullPath = `${rootPath}.${path}`;
            const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
            if (regex.test(fullPath)) {
                return true;
            }
        }

        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(path);
    }

    private mergeDeep(
        target: any,
        source: any,
        idFieldMap: IdFieldMap = {},
        currentPath: string = "",
        rootPath: string = ""
    ): any {
        const result = Array.isArray(target) ? [...target] : { ...target };
        const idField =
            this.getIdFieldForPath(idFieldMap, currentPath, rootPath) || "id";

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                const sourceVal = source[key];

                if (sourceVal === null) {
                    result[key] = null;
                    continue;
                }

                if (
                    sourceVal &&
                    typeof sourceVal === "object" &&
                    !Array.isArray(sourceVal)
                ) {
                    if (
                        Object.keys(sourceVal).length > 0 &&
                        Object.keys(sourceVal).every(
                            (key) => !isNaN(Number(key))
                        )
                    ) {
                        if (Array.isArray(result[key])) {
                            const arrayIdField =
                                this.getIdFieldForPath(
                                    idFieldMap,
                                    newPath,
                                    rootPath
                                ) || idField;

                            const newArray = [...result[key]];

                            for (const numKey in sourceVal) {
                                if (
                                    Object.prototype.hasOwnProperty.call(
                                        sourceVal,
                                        numKey
                                    )
                                ) {
                                    const numericId = Number(numKey);
                                    const index = newArray.findIndex(
                                        (item: any) =>
                                            item[arrayIdField] === numericId
                                    );

                                    if (sourceVal[numKey] === null) {
                                        if (index !== -1) {
                                            newArray.splice(index, 1);
                                        }
                                        continue;
                                    }

                                    if (index !== -1) {
                                        newArray[index] = this.mergeDeep(
                                            newArray[index],
                                            sourceVal[numKey],
                                            idFieldMap,
                                            `${newPath}.${numKey}`,
                                            rootPath
                                        );
                                    } else {
                                        const newItem = {
                                            ...sourceVal[numKey],
                                            [arrayIdField]: numericId,
                                        };
                                        newArray.unshift(newItem);
                                    }
                                }
                            }
                            result[key] = newArray;
                        } else {
                            const newObj =
                                result[key] && typeof result[key] === "object"
                                    ? { ...result[key] }
                                    : {};

                            for (const numKey in sourceVal) {
                                if (
                                    Object.prototype.hasOwnProperty.call(
                                        sourceVal,
                                        numKey
                                    )
                                ) {
                                    if (sourceVal[numKey] === null) {
                                        delete newObj[numKey];
                                        continue;
                                    }

                                    newObj[numKey] = this.mergeDeep(
                                        newObj[numKey] || {},
                                        sourceVal[numKey],
                                        idFieldMap,
                                        `${newPath}.${numKey}`,
                                        rootPath
                                    );
                                }
                            }
                            result[key] = newObj;
                        }
                        continue;
                    }

                    const existingValue = result[key];
                    const newNestedObj =
                        existingValue &&
                        typeof existingValue === "object" &&
                        !Array.isArray(existingValue)
                            ? existingValue
                            : {};

                    result[key] = this.mergeDeep(
                        newNestedObj,
                        sourceVal,
                        idFieldMap,
                        newPath,
                        rootPath
                    );
                } else {
                    result[key] = sourceVal;
                }
            }
        }
        return result;
    }

    private getRpcPathValue(obj: any, path: string): any {
        return path.split(".").reduce((current, key) => {
            return current && current[key] !== undefined
                ? current[key]
                : undefined;
        }, obj);
    }

    private setRpcPathValue(obj: any, path: string, value: any): void {
        const keys = path.split(".");
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== "object") {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    private mergeArrayDeep<T extends keyof TTypes>(
        type: T,
        updates: Record<
            string,
            TTypes[T] extends Rpc<infer S> ? z.infer<S> : never | null
        >,
        idFieldMap: IdFieldMap = {}
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> {
        const existing = this.findAll(type);
        let result = [...existing];
        const mainIdField = this.getIdFieldForPath(idFieldMap, "", "") || "id";

        for (const [itemId, updatedItem] of Object.entries(updates)) {
            const numericItemId = Number(itemId);
            const index = result.findIndex(
                (item: any) => item[mainIdField] === numericItemId
            );

            if (updatedItem == null) {
                if (index !== -1) {
                    result = result.filter((_, i) => i !== index);
                }
                continue;
            }

            if (index !== -1) {
                result = result.map((item, i) =>
                    i === index
                        ? this.mergeDeep(item, updatedItem, idFieldMap, "", "")
                        : item
                );
            } else if (updatedItem !== null) {
                result = [
                    { ...updatedItem, [mainIdField]: numericItemId } as any,
                    ...result,
                ];
            }
        }

        for (const item of result) {
            const rpc = this.getRpc(type);
            const foreignKey =
                rpc.getForeignKey() as keyof (TTypes[T] extends Rpc<infer S>
                    ? z.infer<S>
                    : never);
            const id = item[foreignKey];
            if (id !== undefined) {
                this.save(type, item);
            }
        }

        return result;
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

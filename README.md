# @yunu-lab/rpc-ts

TypeScript библиотека для работы с Remote Procedure Call (RPC) с поддержкой Zod схем, связей между типами и глубокого слияния данных.

## Установка

```bash
npm install @yunu-lab/rpc-ts
```

## ✨ Ключевые возможности

- 🎯 **Автокомплит полей** - IDE знает все поля из Zod схем
- ⚡ **Автоматический вывод типов** - как в Redux Toolkit  
- 🛡️ **Валидация Zod** - данные всегда корректны
- 🔗 **Связи между сущностями** - hasMany, belongsTo
- 🔄 **Глубокое слияние данных** - mergeRpc с поддержкой путей
- 🎛️ **Продвинутые типы** - ArrayElementFields, RelationKey, ArrayFieldsRecord
- 📡 **Асинхронные callback'и** - load, save, update, delete для каждого типа

## Быстрый старт

```typescript
import z from "zod";
import { Rpc, RpcRepository } from "@yunu-lab/rpc-ts";

// 1. Определяем схемы данных
const cellSchema = z.object({
    id: z.number(),
    name: z.string(),
    cell_id: z.number(),
    products_ids: z.array(z.object({ id: z.number() })),
});

const rectangleSchema = z.object({
    id: z.number(),
    name: z.string(),
    cell_ids: z.array(z.object({ id: z.number() })),
});

const productSchema = z.object({
    id: z.number(),
    name: z.string(),
    price: z.number(),
});

// 2. Создаем RPC типы
const cellRpc = new Rpc("cell", cellSchema, "cell_id");
const rectangleRpc = new Rpc("rectangle", rectangleSchema, "id");
const productRpc = new Rpc("product", productSchema, "id");

// 3. Создаем repository
const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc)
    .registerRpc("rectangle", rectangleRpc)
    .registerRpc("product", productRpc);

// 4. Определяем связи между типами
rpcRepository.defineRelation("rectangle", "cell", "cells").hasMany(
    {
        field: "cell_ids",
        key: "id",
    },
    "cell_id"
);

rpcRepository.defineRelation("cell", "product", "products").hasMany(
    {
        field: "products_ids",
        key: "id",
    },
    "id"
);

// 5. Сохраняем данные
rpcRepository.save("cell", {
    id: 1,
    name: "Cell 1",
    cell_id: 1,
    products_ids: [{ id: 1 }, { id: 2 }],
});

rpcRepository.save("rectangle", {
    id: 1,
    name: "Rectangle 1",
    cell_ids: [{ id: 1 }, { id: 2 }],
});

// 6. Получаем данные с полными связями
const fullData = rpcRepository.getFullRelatedData<RectangleWithData>("rectangle", 1);
```

## CRUD операции

### Сохранение данных

```typescript
// Сохранение одного элемента
rpcRepository.save("cell", {
    id: 1,
    name: "Cell 1",
    cell_id: 1,
    products_ids: [{ id: 1 }, { id: 2 }],
});

// Сохранение нескольких элементов
rpcRepository.saveMany("cell", [
    { id: 1, name: "Cell 1", cell_id: 1, products_ids: [] },
    { id: 2, name: "Cell 2", cell_id: 2, products_ids: [] },
]);
```

### Получение данных

```typescript
// Поиск по ID
const cell = rpcRepository.findById("cell", 1);

// Поиск всех элементов
const allCells = rpcRepository.findAll("cell");

// Поиск по условию
const cells = rpcRepository.findBy("cell", "name", "Cell 1");
```

### Обновление данных

```typescript
// Обновление по ID
await rpcRepository.update("cell", 1, { name: "Cell Updated" });
```

### Удаление данных

```typescript
// Удаление по ID
rpcRepository.remove("cell", 1);
```

## Связи между типами

### hasMany (один ко многим)

```typescript
rpcRepository.defineRelation("rectangle", "cell", "cells").hasMany(
    {
        field: "cell_ids",
        key: "id",
    },
    "cell_id"
);

// Получение связанных данных
const rectangleCells = rpcRepository.getRelated("rectangle", 1, "cell");
```

### belongsTo (многие к одному)

```typescript
rpcRepository.defineRelation("cell", "product", "products").hasMany(
    {
        field: "products_ids",
        key: "id",
    },
    "id"
);

// Получение связанных данных
const cellProducts = rpcRepository.getRelated("cell", 1, "product");
```

## Получение полных данных со связями

### getFullRelatedData

```typescript
// Получение одного элемента с полными связями
const fullRectangleData = rpcRepository.getFullRelatedData<RectangleWithData>("rectangle", 1);

// Получение всех элементов с полными связями
const allRectanglesWithData = rpcRepository.getFullRelatedData<RectangleWithData>("rectangle");
```

### getFullRelation

```typescript
// Получение дерева связей
const relationTree = rpcRepository.getFullRelation();
```

## Рекурсивные связи

```typescript
// Схема с рекурсивной связью
const hierarchicalCellSchema = z.object({
    id: z.number(),
    name: z.string(),
    parent_id: z.number().optional(),
    children_ids: z.array(z.object({ id: z.number() })).optional(),
});

const hierarchicalCellRpc = new Rpc("hierarchical_cell", hierarchicalCellSchema, "id");

const hierarchicalRepository = new RpcRepository()
    .registerRpc("hierarchical_cell", hierarchicalCellRpc);

// Определяем рекурсивную связь
hierarchicalRepository.defineRelation("hierarchical_cell", "hierarchical_cell", "children").hasMany(
    {
        field: "children_ids",
        key: "id",
    },
    "parent_id"
);

// Получаем полную иерархию
interface HierarchicalCell {
    id: number;
    name: string;
    parent_id?: number;
    children_ids?: { id: number }[];
    children?: HierarchicalCell[];
}

const fullHierarchy = hierarchicalRepository.getFullRelatedData<HierarchicalCell>("hierarchical_cell", 1);
```

## Обработка сообщений

### handleMessages метод

```typescript
const messages: Array<{
    type: "cell" | "rectangle" | "product";
    payload: any;
}> = [
    {
        type: "cell",
        payload: {
            1: {
                cell_id: 1,
                cell_name: "Обновленная ячейка A1",
                cell_value: "CELL_000333333",
                is_stretched: false,
                products_ids: [{ id: 1 }, { id: 2 }],
            },
            2: {
                cell_id: 2,
                cell_name: "Новая ячейка B1",
                cell_value: "CELL_000444444",
                is_stretched: true,
                products_ids: [{ id: 3 }],
            },
        },
    },
    {
        type: "rectangle",
        payload: {
            1: {
                id: 1,
                name: "Обновленный прямоугольник",
                width: 200,
                height: 150,
                cell_ids: [{ id: 1 }, { id: 2 }],
            },
        },
    },
    {
        type: "product",
        payload: [
            {
                id: 1,
                name: "Продукт A",
                price: 100,
            },
            {
                id: 2,
                name: "Продукт B",
                price: 200,
            },
        ],
    },
];

// Обработка массива сообщений
rpcRepository.handleMessages(messages);
```

## Глубокое слияние данных

### mergeRpc метод

```typescript
// Слияние с массивом новых записей
const updatedCells = rpcRepository.mergeRpc("cell", [
    { id: 1, name: "Cell Updated", cell_id: 1, products_ids: [] },
    { id: 3, name: "New Cell", cell_id: 3, products_ids: [] },
]);

// Слияние с объектом обновлений
const updatedCells = rpcRepository.mergeRpc("cell", {
    "1": { name: "Cell Updated" },
    "2": null, // удаление записи
    "3": { id: 3, name: "New Cell", cell_id: 3, products_ids: [] },
});
```

## Message API

Библиотека поддерживает работу с сообщениями для массового обновления данных:

### Создание сообщений

```typescript
// Создание сообщения с обновлениями
const cellMessage = cellRpc.createMessage({
    "1": {
        cell_id: 1,
        cell_name: "Updated Cell",
        cell_value: "CELL_001",
        is_stretched: true,
        products_ids: [{ id: 1 }, { id: 2 }],
    },
    "2": null, // удаление записи
});

// Создание сообщения с массивом записей
const cellArrayMessage = cellRpc.createMessage([
    {
        cell_id: 1,
        cell_name: "Cell 1",
        cell_value: "CELL_001",
        is_stretched: true,
        products_ids: [{ id: 1 }],
    },
    {
        cell_id: 2,
        cell_name: "Cell 2", 
        cell_value: "CELL_002",
        is_stretched: false,
        products_ids: [{ id: 2 }],
    },
]);
```

### Обработка сообщений

```typescript
// Массовая обработка сообщений
const messages: Array<Message<RepositoryTypes<typeof rpcRepository>>> = [
    {
        type: "cell",
        payload: {
            "1": { cell_name: "Updated Cell" },
            "2": null,
        },
    },
    {
        type: "product", 
        payload: [
            { id: 1, name: "Product 1", article: "ART001" },
            { id: 2, name: "Product 2", article: "ART002" },
        ],
    },
];

rpcRepository.handleMessages(messages);
```

### Типы сообщений

```typescript
type Message<TTypes extends Record<string, Rpc<any>>> = {
    [K in keyof TTypes]: {
        type: K;
        payload: 
            | Record<string, Partial<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never> | null>
            | Array<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never>;
    };
}[keyof TTypes];
```

## API Reference

### Rpc

```typescript
class Rpc<TSchema extends z.ZodSchema> {
    constructor(
        type: string,
        schema: TSchema,
        foreignKey: keyof z.infer<TSchema>
    );
    
    getType(): string;
    getSchema(): TSchema;
    getForeignKey(): keyof z.infer<TSchema>;
    getRelatedFields(): Record<string, string>;
    
    createMessage(
        data: Record<string, Partial<z.infer<TSchema>> | null> | Array<z.infer<TSchema>>
    ): {
        type: string;
        payload: Record<string, Partial<z.infer<TSchema>> | null> | Array<z.infer<TSchema>>;
    };
}
```

### RpcRepository

```typescript
class RpcRepository<TTypes extends Record<string, Rpc<any>> = {}> {
    registerRpc<TName extends string, TRpc extends Rpc<any>>(
        name: TName,
        rpc: TRpc,
        loadCallback?: LoadCallback<TRpc extends Rpc<infer S> ? z.infer<S> : never>
    ): RpcRepository<TTypes & { [K in TName]: TRpc }>;
    
    defineRelation<TSource extends keyof TTypes, TTarget extends keyof TTypes>(
        sourceType: TSource,
        targetType: TTarget,
        relatedFieldName: string
    ): {
        hasMany: <TForeignField, TLocalField>(
            foreign: RelationKey<TTypes, TSource, TForeignField>,
            localKey: TLocalField
        ) => RpcRepository<TTypes>;
        belongsTo: <TForeignField, TLocalField>(
            foreign: RelationKey<TTypes, TSource, TForeignField>,
            localKey: TLocalField
        ) => RpcRepository<TTypes>;
    };
    
    save<T extends keyof TTypes>(
        type: T,
        data: Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): TTypes[T] extends Rpc<infer S> ? z.infer<S> : never;
    
    saveMany<T extends keyof TTypes>(
        type: T,
        records: Array<Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>>
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>;
    
    findById<T extends keyof TTypes>(
        type: T,
        id: string | number
    ): (TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null;
    
    findAll<T extends keyof TTypes>(
        type: T
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>;
    
    getRelated<TSource extends keyof TTypes, TTarget extends keyof TTypes>(
        sourceType: TSource,
        sourceId: string | number,
        targetType: TTarget
    ): Array<TTypes[TTarget] extends Rpc<infer S> ? z.infer<S> : never>;
    
    getFullRelatedData<TResult>(
        type: string,
        id?: string | number,
        visited?: Set<string>
    ): TResult | TResult[] | null;
    
    getFullRelation(): RelationTree;
    
    mergeRpc<T extends keyof TTypes>(
        type: T,
        target: Record<string, Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> | null> | Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>;
    
    handleMessages(
        messages: Array<Message<TTypes>>
    ): void;
}
```

## Лицензия

MIT
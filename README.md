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
- 🔔 **Система событий** - отслеживание изменений данных в реальном времени

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

## Система событий изменений данных

Библиотека предоставляет мощную систему событий для отслеживания изменений данных в реальном времени. Это позволяет интегрировать RPC пакет с UI фреймворками, системами кэширования и другими компонентами.

### Базовое использование

```typescript
// Слушатель всех изменений с полной типизацией
const listenerId = repository.onDataChanged((events) => {
    // events - массив событий (если изменилось несколько элементов сразу)
    events.forEach(event => {
        // event.type - автокомплит всех типов RPC
        // event.payload - типизированный массив данных
        console.log(`Изменение в ${event.type}:`, {
            type: event.type,
            payload: event.payload, // Полная типизация с автокомплитом
            count: event.payload.length
        });
    });
});

// Удаление слушателя
repository.offDataChanged(listenerId);
```

### Фильтрация событий

```typescript
// Слушатель только для определенного типа
const userListenerId = repository.onDataChanged((events) => {
    events.forEach(event => {
        // event.type - только "user"
        // event.payload - типизированный массив User[]
        event.payload.forEach(user => {
            console.log(user.name, user.email); // Полный автокомплит
        });
    });
}, { types: ["user"] });

// Слушатель для нескольких типов с DataChangeBuilder
const multiTypeListenerId = DataChangeBuilder.new<RepositoryTypes<typeof repository>>()
    .withRepository(repository)
    .withTypes(["user", "order"])
    .onDataChanged((events) => {
        events.forEach(event => {
            if (event.type === "user") {
                event.payload.forEach(user => {
                    console.log("User:", user.name); // Автокомплит полей User
                });
            } else if (event.type === "order") {
                event.payload.forEach(order => {
                    console.log("Order:", order.total); // Автокомплит полей Order
                });
            }
        });
    });
```

### Типы событий

```typescript
type DataChangeEvent<TTypes extends Record<string, Rpc<any>>> = Message<TTypes>;

type DataChangeListener<TTypes extends Record<string, Rpc<any>>, TFilteredTypes extends keyof TTypes = keyof TTypes> = (
    events: Array<{
        [K in TFilteredTypes]: {
            type: K;
            payload: Array<TTypes[K] extends Rpc<infer S> ? z.infer<S> : never>;
        };
    }[TFilteredTypes]>
) => void;

type DataChangeFilter<TTypes extends Record<string, Rpc<any>>> = {
    types?: Array<keyof TTypes>;  // Фильтр по типам
};

// Builder для создания типизированных слушателей
class DataChangeBuilder<TTypes extends Record<string, Rpc<any>>> {
    static new<TTypes>(): IDataChangeFilter<TTypes>;
    withTypes<T extends keyof TTypes>(types: T[]): IDataChangeListener<TTypes, T>;
}
```

### Управление слушателями

```typescript
// Получение количества активных слушателей
const listenerCount = repository.getDataChangedListenerCount();

// Очистка всех слушателей
repository.clearAllDataChangedListeners();

// Очистка конкретного слушателя
repository.offDataChanged(listenerId);
```

### Пример интеграции с React

```typescript
import { useEffect, useState } from 'react';

function useRepositoryData<T>(repository: RpcRepository, type: string, id?: number) {
    const [data, setData] = useState<T | null>(null);

    useEffect(() => {
        // Загружаем начальные данные
        if (id) {
            const initialData = repository.findById(type, id);
            setData(initialData);
        } else {
            const allData = repository.findAll(type);
            setData(allData);
        }

        // Подписываемся на изменения с типизацией
        const listenerId = repository.onDataChanged((event) => {
            if (event.type === type) {
                if (id) {
                    // Обновляем конкретный элемент
                    const updatedData = repository.findById(type, id);
                    setData(updatedData);
                } else {
                    // Обновляем весь список с типизацией
                    setData(event.payload as T);
                }
            }
        }, { types: [type] });

        // Очистка при размонтировании
        return () => {
            repository.offDataChanged(listenerId);
        };
    }, [repository, type, id]);

    return data;
}
```

### Пример интеграции с Vue

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useRepositoryData<T>(repository: RpcRepository, type: string, id?: number) {
    const data = ref<T | null>(null);

    let listenerId: string;

    onMounted(() => {
        // Загружаем начальные данные
        if (id) {
            data.value = repository.findById(type, id);
        } else {
            data.value = repository.findAll(type);
        }

        // Подписываемся на изменения с типизацией
        listenerId = repository.onDataChanged((event) => {
            if (event.type === type) {
                if (id) {
                    data.value = repository.findById(type, id);
                } else {
                    data.value = event.payload as T;
                }
            }
        }, { types: [type] });
    });

    onUnmounted(() => {
        if (listenerId) {
            repository.offDataChanged(listenerId);
        }
    });

    return data;
}
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
    
    // Методы для работы с событиями изменений данных
    onDataChanged(
        listener: DataChangeListener<TTypes>,
        filter?: DataChangeFilter<TTypes>
    ): string;
    
    offDataChanged(listenerId: string): boolean;
    
    getDataChangedListenerCount(): number;
    
    clearAllDataChangedListeners(): void;
}
```

## Лицензия

MIT
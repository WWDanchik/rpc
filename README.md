# RPC Repository Library

Библиотека для работы с RPC типами с поддержкой коллекций и синглтонов.

## Установка

```bash
npm install rpc-repository
```

## Основное использование

### 1. Определение типов хранилища

```typescript
import { createRpcStorageType } from "rpc-repository";

const RpcStorageType = createRpcStorageType({
    cell: "collection",
    product: "collection", 
    rectangle: "collection",
    settings: "singleton",
    error: "singleton",
} as const);

type RpcStorageType = typeof RpcStorageType;
```

### 2. Создание репозитория

```typescript
import { RpcRepository, z } from "rpc-repository";

const cellRpc = new Rpc(z.object({
    cell_id: z.number(),
    cell_name: z.string(),
    cell_value: z.string(),
    is_stretched: z.boolean(),
    products_ids: z.array(z.object({ id: z.number() })),
}));

const errorRpc = new Rpc(z.object({
    code: z.string(),
    msg: z.string(),
    tech_msg: z.string(),
    text_code: z.string(),
}));

const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc, { storageType: "collection" })
    .registerRpc("error", errorRpc, { storageType: "singleton" });
```

### 3. Использование утилит для типизации

```typescript
import {
    InferCollectionType,
    InferSingletonType,
    InferMergeTarget,
    InferTestData,
    CollectionKeys,
    SingletonKeys,
    isCollection,
    isSingleton,
} from "rpc-repository";

// Типизированные данные для разных типов
type CellData = InferCollectionType<typeof rpcRepository, RpcStorageType, "cell">;
type ErrorData = InferSingletonType<typeof rpcRepository, RpcStorageType, "error">;
type MergeTarget = InferMergeTarget<typeof rpcRepository, RpcStorageType, "error">;
type TestData = InferTestData<typeof rpcRepository, RpcStorageType, "cell">;

// Ключи для разных типов
type CollectionTypeKeys = CollectionKeys<RpcStorageType>; // "cell" | "product" | "rectangle"
type SingletonTypeKeys = SingletonKeys<RpcStorageType>; // "settings" | "error"

// Проверка типов
const isCellCollection = isCollection(RpcStorageType, "cell"); // true
const isErrorSingleton = isSingleton(RpcStorageType, "error"); // true
```

### 4. Работа с данными

```typescript
// Для collection типов
rpcRepository.test<"cell", RpcStorageType>("cell", [
    { cell_id: 1, cell_name: "Ячейка A1", cell_value: "CELL_001", is_stretched: true, products_ids: [{ id: 1 }] }
]);

// Для singleton типов  
rpcRepository.test<"error", RpcStorageType>("error", {
    code: "AUTHENTICATION_ERROR",
    msg: "Test error",
    tech_msg: "Test tech msg", 
    text_code: "TEST_001",
});

// Merge с типизацией
rpcRepository.mergeRpc<"error", RpcStorageType>("error", {
    code: "AUTHENTICATION_ERROR",
    msg: "Ошибка из объекта",
    tech_msg: "Object merge test",
    text_code: "AUTH_003",
});
```

### 5. Слушатели событий

```typescript
const errorListenerId = rpcRepository.onDataChanged<RpcStorageType, ["error"]>(
    (events) => {
        events.forEach((event) => {
            console.log(`Type: ${event.type}`);
            console.log(`Payload:`, event.payload);
            console.log(`Is array: ${Array.isArray(event.payload)}`);
        });
    },
    { types: ["error"] }
);
```

## Утилиты

### Типы

- `RpcStorageType` - базовый тип для определения типов хранилища
- `InferRpcType<T>` - извлекает тип из RPC схемы
- `InferRpcTypes<TTypes>` - извлекает типы для всех RPC в объекте
- `InferCollectionType<TTypes, TStorageType, T>` - тип для collection данных
- `InferSingletonType<TTypes, TStorageType, T>` - тип для singleton данных
- `InferMergeTarget<TTypes, TStorageType, T>` - тип для merge операций
- `InferTestData<TTypes, TStorageType, T>` - тип для test данных
- `CollectionKeys<TStorageType>` - ключи collection типов
- `SingletonKeys<TStorageType>` - ключи singleton типов

### Функции

- `createRpcStorageType<T>(storageType)` - создает типизированный объект типов хранилища
- `isCollection(storageType, key)` - проверяет, является ли тип collection
- `isSingleton(storageType, key)` - проверяет, является ли тип singleton

## Преимущества

1. **Строгая типизация** - TypeScript автоматически определяет правильные типы
2. **Автодополнение** - IDE предоставляет точные подсказки
3. **Безопасность типов** - ошибки типов обнаруживаются на этапе компиляции
4. **Удобство использования** - утилиты упрощают работу с типами
5. **Гибкость** - поддержка как коллекций, так и синглтонов
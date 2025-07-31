# @yunu-lab/rpc-ts

Современная TypeScript RPC библиотека с автокомплитом и валидацией.

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
- 📍 **Работа с путями** - updateByPath, getByPath
- 🎛️ **Продвинутые типы** - ArrayElementFields, RelationKey, ArrayFieldsRecord

## Быстрый старт

```typescript
import { Rpc, RpcRepository, z } from '@yunu-lab/rpc-ts';

// 1. Создаем схемы
const cellSchema = z.object({
    cell_id: z.number(),
    cell_name: z.string(),
    cell_value: z.string(),
    is_stretched: z.boolean(),
    products_ids: z.array(z.object({ id: z.number() })),
});

const rectangleSchema = z.object({
    id: z.number(),
    cell_ids: z.array(z.object({ id: z.number() })),
    map_cells: z.record(z.string(), z.object({
        id: z.number(),
        type: z.enum(["box", "pallet"]),
        parent: z.object({ id: z.number(), code: z.string() }).optional(),
    })),
});

const productSchema = z.object({
    id: z.number(),
    article: z.string(),
    name: z.string(),
    gravatar: z.string(),
    barcode_ids: z.array(z.object({ id: z.number() })),
    is_stretched: z.boolean(),
});

// 2. Создаем RPC с конфигурацией путей для слияния
const cellRpc = new Rpc("cell", cellSchema, "cell_id", {
    products_ids: "id",
});

const rectangleRpc = new Rpc("rectangle", rectangleSchema, "id", {
    cell_ids: "id",
});

const productRpc = new Rpc("product", productSchema, "id", {
    barcode_ids: "id",
});

// 3. Создаем repository с callback'ами для загрузки данных
const rpcRepository = new RpcRepository()
    .registerRpc("cell", cellRpc)
    .registerRpc("product", productRpc, async (id) => {
        // Загружаем данные продукта с сервера
        const response = await fetch(`/api/products/${id}`);
        return response.json();
    })
    .registerRpc("rectangle", rectangleRpc);

// 4. Определяем связи между сущностями
rpcRepository.defineRelation("rectangle", "cell").hasMany(
    { field: "cell_ids", key: "id" },
    "cell_id"
);

rpcRepository.defineRelation("cell", "product").hasMany(
    { field: "products_ids", key: "id" },
    "id"
);

// 5. Сохраняем данные
rpcRepository.save("product", {
    id: 1,
    article: "ART001",
    name: "Товар 1",
    gravatar: "https://example.com/img1.jpg",
    barcode_ids: [{ id: 1001 }, { id: 1002 }],
    is_stretched: false,
});

rpcRepository.save("cell", {
    cell_id: 1,
    cell_name: "Ячейка A1",
    cell_value: "CELL_000222222",
    is_stretched: true,
    products_ids: [{ id: 1 }, { id: 2 }],
});

rpcRepository.save("rectangle", {
    id: 1,
    cell_ids: [{ id: 1 }, { id: 2 }],
    map_cells: {
        pos_1_1: { id: 101, type: "pallet" },
        pos_1_2: { id: 102, type: "box", parent: { id: 101, code: "pos_1_1" } },
    },
});
```

## 🎯 Полное API

### CRUD операции с автокомплитом

```typescript
// ✨ Сохранение одной записи
rpcRepository.save("product", {
    id: 2,
    article: "ART002",
    name: "Товар 2",
    gravatar: "https://example.com/img2.jpg",
    barcode_ids: [{ id: 2001 }, { id: 2002 }],
    is_stretched: true,
});

// ✨ Сохранение массива записей
rpcRepository.saveMany("product", [
    { id: 3, article: "ART003", name: "Товар 3", /* ... */ },
    { id: 4, article: "ART004", name: "Товар 4", /* ... */ }
]);

// ✨ Поиск с автокомплитом полей
const allProducts = rpcRepository.findAll("product");
const product = rpcRepository.findById("product", 1);
const productsByName = rpcRepository.findBy("product", "name", "Товар 1");

// ✨ Обновление и удаление
rpcRepository.remove("product", 1);
```

### 🔄 Глубокое слияние данных

```typescript
// Слияние с Record<string, Partial<...>> - обновление конкретных записей по ID
rpcRepository.mergeRpc("product", existingProducts, {
    "1": { article: "ART001_UPDATED", name: "Новое имя" },
    "2": { is_stretched: true },
    "3": null, // удаление записи
});

// Слияние с массивом - добавление новых записей
rpcRepository.mergeRpc("product", existingProducts, [
    { id: 5, article: "ART005", name: "Новый товар" },
    { id: 6, article: "ART006", name: "Еще один товар" }
]);
```



### 🔗 Связи между сущностями

```typescript
// Получение связанных данных
const rectangleCells = await rpcRepository.getRelated("rectangle", 1, "cell");
const cellProducts = await rpcRepository.getRelated("cell", 1, "product");

// Теперь при вызове findById, если данных нет локально, 
// они будут автоматически загружены через callback
const product = await rpcRepository.findById("product", 123);
```

### 🎛️ Продвинутые типы

```typescript
import { ArrayElementFields, RelationKey, ArrayFieldsRecord } from '@yunu-lab/rpc-ts';

// ArrayElementFields - извлекает поля элементов массива
type ProductFields = ArrayElementFields<Product[]>; // "id" | "article" | "name" | ...

// RelationKey - типизированная связь между сущностями
type CellProductRelation = RelationKey<
    typeof rpcRepository,
    "cell",
    "products_ids"
>;

// ArrayFieldsRecord - карта путей к массивам и их полей
type RectangleArrayFields = ArrayFieldsRecord<Rectangle>;
// {
//   cell_ids: "id";
//   map_cells: "id" | "type" | "parent";
// }
```

### Утилиты с автокомплитом

```typescript
// ✨ Группировка по полю
const productsByStretch = rpcRepository.groupBy("product", "is_stretched");

// ✨ Сортировка по полю  
const sortedProducts = rpcRepository.sortBy("product", "article", "asc");

// ✨ Статистика
const stats = rpcRepository.getStats();
// { product: { count: 2, ids: ["1", "2"] }, cell: { count: 1, ids: ["1"] } }

// ✨ Состояние репозитория
const state = rpcRepository.getState();
// { product: { byId: {...}, allIds: [...] }, cell: { byId: {...}, allIds: [...] } }
```

## 🏗️ Архитектура

### Rpc класс
```typescript
const rpc = new Rpc(
    "product",           // тип сущности
    productSchema,       // Zod схема
    "id",               // поле ID
    { barcode_ids: "id" } // конфигурация путей для слияния
);
```

### RpcRepository класс
```typescript
const repository = new RpcRepository()
    .registerRpc("product", productRpc)
    .registerRpc("cell", cellRpc);
```

## 🎯 Типы для экспорта

```typescript
export type Cell = z.infer<typeof cellSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;
export type Product = z.infer<typeof productSchema>;

// Типы с расширенными данными
type CellWithProducts = Cell & {
    products: Product[];
};

type RectangleWithData = Rectangle & {
    cells: CellWithProducts[];
};
```

## 📦 Экспорты

```typescript
import {
    Rpc,
    RpcRepository,
    ArrayElementFields,
    RelationKey,
    ArrayFieldsRecord,
    IdFieldMap,
    createRpcRepository,
    setupRepository
} from '@yunu-lab/rpc-ts';
```




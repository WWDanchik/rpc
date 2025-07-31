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
const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    posts: z.array(z.object({ id: z.number(), title: z.string() })),
});

const postSchema = z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
    author_id: z.number(),
});

// 2. Создаем RPC типы
const userRpc = new Rpc("user", userSchema, "id", {
    posts: "id",
});
const postRpc = new Rpc("post", postSchema, "id", {});

// 3. Создаем repository с callback для загрузки данных
const rpcRepository = new RpcRepository()
    .registerRpc("user", userRpc)
    .registerRpc("post", postRpc, async (id) => {
        // Загружаем данные с сервера если их нет локально
        const response = await fetch(`/api/posts/${id}`);
        return response.json();
    });

// 4. Определяем связи между типами
rpcRepository.defineRelation("user", "post").hasMany(
    { field: "posts", key: "id" },
    "id"
);

// 5. Сохраняем данные
rpcRepository.save("user", {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    posts: [{ id: 1, title: "First Post" }],
});

// 6. Получаем данные
const user = rpcRepository.findById("user", 1); // Синхронный поиск, загружает в фоне если нет локально
const userPosts = rpcRepository.getRelated("user", 1, "post"); // Синхронный поиск связанных данных
```

## CRUD операции

### Сохранение данных

```typescript
// Сохранение одного элемента
rpcRepository.save("user", {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    posts: [{ id: 1, title: "First Post" }],
});

// Сохранение нескольких элементов
rpcRepository.saveMany("user", [
    { id: 1, name: "John", email: "john@example.com", posts: [] },
    { id: 2, name: "Jane", email: "jane@example.com", posts: [] },
]);
```

### Получение данных

```typescript
// Синхронный поиск по ID (только локальное хранилище)
const user = rpcRepository.findById("user", 1);

// Асинхронный поиск по ID (с загрузкой с сервера если нужно)
const userAsync = await rpcRepository.findByIdAsync("user", 1);

// Поиск всех элементов
const allUsers = rpcRepository.findAll("user");

// Поиск по условию
const users = rpcRepository.findBy("user", (user) => user.name.includes("John"));
```

### Обновление данных

```typescript
// Обновление по ID
rpcRepository.update("user", 1, { name: "John Updated" });

// Обновление по условию
rpcRepository.updateBy("user", (user) => user.name === "John", { name: "John Updated" });
```

### Удаление данных

```typescript
// Удаление по ID
rpcRepository.delete("user", 1);

// Удаление по условию
rpcRepository.deleteBy("user", (user) => user.name === "John");
```

## Связи между типами

### hasMany (один ко многим)

```typescript
rpcRepository.defineRelation("user", "post").hasMany(
    { field: "posts", key: "id" },
    "id"
);

// Получение связанных данных
const userPosts = rpcRepository.getRelated("user", 1, "post");
```

### belongsTo (многие к одному)

```typescript
rpcRepository.defineRelation("post", "user").belongsTo(
    { field: "author_id", key: "id" },
    "id"
);

// Получение связанных данных
const postAuthor = rpcRepository.getRelated("post", 1, "user");
```

## Глубокое слияние данных

### mergeRpc метод

```typescript
// Слияние с массивом новых записей
const updatedUsers = rpcRepository.mergeRpc("user", existingUsers, [
    { id: 1, name: "John Updated", email: "john@example.com", posts: [] },
    { id: 3, name: "New User", email: "new@example.com", posts: [] },
]);

// Слияние с объектом обновлений
const updatedUsers = rpcRepository.mergeRpc("user", existingUsers, {
    "1": { name: "John Updated" },
    "2": null, // удаление записи
    "3": { id: 3, name: "New User", email: "new@example.com", posts: [] },
});
```


**Пример с load callback:**
```typescript
// Регистрируем callback для загрузки данных
rpcRepository.registerRpc("user", userRpc, async (id) => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
});

// Синхронный поиск с фоновой загрузкой
const user = rpcRepository.findById("user", 123); // null если нет локально, но загружает в фоне
```

## Продвинутые типы

### ArrayElementFields

Извлекает ключи элементов массива:

```typescript
type UserPosts = ArrayElementFields<User["posts"]>; // "id" | "title"
```

### RelationKey

Определяет связь между RPC типами:

```typescript
type UserPostRelation = RelationKey<RepositoryTypes, "user", "posts">;
// { field: "posts"; key: "id" }
```

### ArrayFieldsRecord

Маппинг путей к массивам на поля их элементов:

```typescript
type UserArrayFields = ArrayFieldsRecord<User>;
// { posts: "id" | "title" }
```

## API Reference

### Rpc

```typescript
class Rpc<TSchema extends z.ZodSchema> {
    constructor(
        type: string,
        schema: TSchema,
        foreignKey: keyof z.infer<TSchema>,
        mergePath?: ArrayFieldsRecord<z.infer<TSchema>>
    );
    
    getType(): string;
    getSchema(): TSchema;
    getForeignKey(): keyof z.infer<TSchema>;
    getMergePath(): ArrayFieldsRecord<z.infer<TSchema>>;
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
    
    registerLoadCallback<T extends keyof TTypes>(
        type: T,
        callback: LoadCallback<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): this;
    
    defineRelation<TSource extends keyof TTypes, TTarget extends keyof TTypes>(
        sourceType: TSource,
        targetType: TTarget
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
    

    
    mergeRpc<T extends keyof TTypes>(
        type: T,
        source: Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>,
        target: Record<string, Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> | null> | Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>;
}
```

## Лицензия

MIT

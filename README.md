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
- 📍 **Работа с путями** - updateByPath, getByPath
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
const user = await rpcRepository.findById("user", 1);
const userPosts = await rpcRepository.getRelated("user", 1, "post");
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
// Поиск по ID
const user = rpcRepository.findById("user", 1);

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

## Асинхронная загрузка данных

### Когда использовать?

**Проблема:** В реальных приложениях данные часто хранятся на сервере, но не все данные нужны сразу. Загрузка всех данных при инициализации приложения может быть медленной и неэффективной.

**Примеры проблем:**
```typescript
// ❌ Плохо: Загружаем все данные сразу
const allUsers = await fetch('/api/users'); // 1000+ записей
const allPosts = await fetch('/api/posts'); // 5000+ записей
const allComments = await fetch('/api/comments'); // 10000+ записей

// ❌ Плохо: Ручная проверка наличия данных
const user = users.find(u => u.id === 123);
if (!user) {
    const response = await fetch(`/api/users/123`);
    const newUser = await response.json();
    users.push(newUser);
}

// ❌ Плохо: Дублирование логики загрузки
const getUser = async (id) => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
};
const getPost = async (id) => {
    const response = await fetch(`/api/posts/${id}`);
    return response.json();
};
```

**Решение с @yunu-lab/rpc-ts:**
```typescript
// ✅ Хорошо: Ленивая загрузка только нужных данных
const rpcRepository = new RpcRepository()
    .registerRpc("user", userRpc, async (id) => {
        const response = await fetch(`/api/users/${id}`);
        return response.json();
    })
    .registerRpc("post", postRpc, async (id) => {
        const response = await fetch(`/api/posts/${id}`);
        return response.json();
    });

// Данные загружаются автоматически только когда нужны
const user = await rpcRepository.findById("user", 123); // Загрузит только пользователя 123
const userPosts = await rpcRepository.getRelated("user", 123, "post"); // Загрузит только посты пользователя 123
```

### Регистрация callback'ов

```typescript
// При регистрации RPC типа
rpcRepository.registerRpc("post", postRpc, async (id) => {
    const response = await fetch(`/api/posts/${id}`);
    return response.json();
});

// Или отдельно
rpcRepository.registerLoadCallback("post", async (id) => {
    const response = await fetch(`/api/posts/${id}`);
    return response.json();
});
```

### Как это работает

```typescript
// 1. Регистрируем callback для загрузки данных
rpcRepository.registerLoadCallback("post", async (id) => {
    const response = await fetch(`/api/posts/${id}`);
    return response.json();
});

// 2. При вызове findById происходит следующее:
const post = await rpcRepository.findById("post", 123);
// - Сначала ищет в локальном хранилище
// - Если не найден, вызывает load callback
// - Загруженные данные автоматически сохраняются локально
// - Возвращает данные (из локального хранилища или с сервера)

// 3. getRelated также использует load callback
const userPosts = await rpcRepository.getRelated("user", 1, "post");
// - Для каждого связанного ID вызывает findById
// - Если данных нет локально, загружает через callback
// - Возвращает полные данные со связями
```

**Преимущества:**
- 🚀 **Ленивая загрузка** - данные загружаются только когда нужны
- 💾 **Кэширование** - загруженные данные сохраняются локально
- 🔄 **Автоматическая синхронизация** - callback вызывается автоматически
- 🛡️ **Обработка ошибок** - если callback падает, возвращается null

### Сценарии использования

**1. E-commerce приложение:**
```typescript
// Пользователь просматривает каталог товаров
const product = await rpcRepository.findById("product", 456);
// ✅ Загрузит только товар 456, а не весь каталог

// Пользователь открывает корзину
const cartItems = await rpcRepository.getRelated("cart", 1, "product");
// ✅ Загрузит только товары в корзине пользователя
```

**2. Социальная сеть:**
```typescript
// Пользователь открывает профиль друга
const friend = await rpcRepository.findById("user", 789);
const friendPosts = await rpcRepository.getRelated("user", 789, "post");
// ✅ Загрузит только данные друга и его посты
```

**3. CRM система:**
```typescript
// Менеджер открывает карточку клиента
const client = await rpcRepository.findById("client", 101);
const clientOrders = await rpcRepository.getRelated("client", 101, "order");
const clientContacts = await rpcRepository.getRelated("client", 101, "contact");
// ✅ Загрузит только данные конкретного клиента
```

**4. Dashboard с виджетами:**
```typescript
// Каждый виджет загружает только свои данные
const salesData = await rpcRepository.findById("sales", "current_month");
const userStats = await rpcRepository.findById("stats", "users");
const notifications = await rpcRepository.findById("notifications", "unread");
// ✅ Каждый виджет независимо загружает нужные данные
```

### Альтернативы и почему @yunu-lab/rpc-ts лучше

**React Query / TanStack Query:**
```typescript
// ❌ Нужно вручную управлять кэшем и ключами
const { data: user } = useQuery(['user', id], () => fetchUser(id));
const { data: posts } = useQuery(['posts', userId], () => fetchUserPosts(userId));

// ✅ С @yunu-lab/rpc-ts: автоматическое управление
const user = await rpcRepository.findById("user", id);
const posts = await rpcRepository.getRelated("user", id, "post");
```

**Redux Toolkit Query:**
```typescript
// ❌ Сложная настройка API endpoints
const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    endpoints: (builder) => ({
        getUser: builder.query<User, number>({
            query: (id) => `users/${id}`,
        }),
        getUserPosts: builder.query<Post[], number>({
            query: (userId) => `users/${userId}/posts`,
        }),
    }),
});

// ✅ С @yunu-lab/rpc-ts: простая регистрация callback'ов
rpcRepository.registerRpc("user", userRpc, async (id) => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
});
```

**SWR:**
```typescript
// ❌ Нужно помнить ключи и зависимости
const { data: user } = useSWR(`/api/users/${id}`, fetcher);
const { data: posts } = useSWR(
    user ? `/api/users/${user.id}/posts` : null, 
    fetcher
);

// ✅ С @yunu-lab/rpc-ts: автоматические зависимости
const user = await rpcRepository.findById("user", id);
const posts = await rpcRepository.getRelated("user", id, "post");
```

**Преимущества @yunu-lab/rpc-ts:**
- 🎯 **Простота** - минимум кода для настройки
- 🔗 **Связи** - автоматическая загрузка связанных данных
- 🛡️ **Валидация** - встроенная валидация Zod
- 📦 **Кэширование** - автоматическое кэширование без настройки
- 🚀 **Производительность** - загрузка только нужных данных

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
    ): Promise<(TTypes[T] extends Rpc<infer S> ? z.infer<S> : never) | null>;
    
    mergeRpc<T extends keyof TTypes>(
        type: T,
        source: Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>,
        target: Record<string, Partial<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never> | null> | Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>
    ): Array<TTypes[T] extends Rpc<infer S> ? z.infer<S> : never>;
}
```

## Лицензия

MIT

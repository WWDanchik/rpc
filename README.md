# @yunu-lab/rpc

Современная TypeScript RPC библиотека с автокомплитом и валидацией .

## Установка

```bash
npm install @yunu-lab/rpc
```

## ✨ Ключевые возможности

- 🎯 **Автокомплит полей** - IDE знает все поля из Zod схем
- ⚡ **Автоматический вывод типов** - как в Redux Toolkit  
- 🛡️ **Валидация Zod** - данные всегда корректны
- 🔗 **Связи между сущностями** - hasMany, belongsTo


## Быстрый старт

```typescript
import { Rpc, createRpcRepository, setupRepository, z } from '@yourusername/rpc';

// 1. Создаем схемы
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional()
});

// 2. Создаем RPC
const userRpc = new Rpc('user', userSchema);

// 3. Создаем repository
const repository = setupRepository(
  createRpcRepository()
    .registerRpc('user', userRpc)
);

// 4. Автоматический вывод типов!
export type AppRepositoryState = RepositoryState<typeof repository>;

// 5. Используем с автокомплитом!
repository.save('user', 'user-1', {
  name: 'John',           // ← автокомплит полей!
  email: 'john@email.com' // ← валидация Zod!
});

// ✨ Или сохраняем массив пользователей!
repository.saveMany('user', [
  { id: 'user-1', name: 'John', email: 'john@email.com' },
  { id: 'user-2', name: 'Jane', email: 'jane@email.com' }
]);

const users = repository.findBy('user', 'name', 'John'); // ← автокомплит 'name'!
```

## 🎯 Полное API

### Создание Repository

```typescript
import { createRpcRepository, setupRepository } from '@yourusername/rpc';

const repository = setupRepository(
  createRpcRepository()
    .registerRpc('user', userRpc)
    .registerRpc('post', postRpc)
);

// Автоматический вывод типов как в Redux Toolkit!
export type AppRepositoryState = RepositoryState<typeof repository>;
```

### CRUD операции с автокомплитом

```typescript
// ✨ Сохранение одной записи
repository.save(type, id, data);

// ✨ Сохранение массива записей
repository.saveMany(type, [
    { id: 'user-1', name: 'John', email: 'john@email.com' },
    { id: 'user-2', name: 'Jane', email: 'jane@email.com' }
]);

// ✨ Поиск с автокомплитом полей
repository.findAll(type);
repository.findById(type, id);  
repository.findBy(type, field, value);    // ← field автокомплит!

// ✨ Обновление и удаление
repository.update(type, id, updates);
repository.remove(type, id);
```

### Утилиты с автокомплитом

```typescript
// ✨ Группировка по полю
repository.groupBy(type, field);          // ← field автокомплит!

// ✨ Сортировка по полю  
repository.sortBy(type, field, order);    // ← field автокомплит!

// ✨ Статистика
repository.getStats();
```

### Связи между сущностями

```typescript
// Определение связей
repository.defineRelation('user', 'post').hasMany('userId', 'id');
repository.defineRelation('post', 'user').belongsTo('userId', 'id');

// Получение связанных данных
const userPosts = repository.getRelated('user', 'user-1', 'post');
```




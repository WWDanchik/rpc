# @yourusername/rpc

Простая TypeScript библиотека для RPC вызовов.

## Установка

```bash
npm install @yourusername/rpc
```

## Использование

### Базовое использование

```typescript
import { createRPCClient } from '@yourusername/rpc';

// Создание клиента с настройками
const client = createRPCClient({
  timeout: 10000, // 10 секунд
  retries: 3      // количество повторов
});

// Вызов метода
const result = await client.call('getUserInfo', userId);
console.log(result);
```

### Использование класса напрямую

```typescript
import { RPCClient } from '@yourusername/rpc';

const client = new RPCClient({
  timeout: 5000,
  retries: 2
});

const result = await client.call('methodName', param1, param2);
```

### Работа с типами

```typescript
import { RPCOptions, RPCRequest, RPCResponse } from '@yourusername/rpc';

const options: RPCOptions = {
  timeout: 8000,
  retries: 1
};
```

## API

### `createRPCClient(options?: RPCOptions): RPCClient`

Создает новый экземпляр RPC клиента.

### `RPCClient`

#### Методы

- `call(method: string, ...params: any[]): Promise<any>` - Выполняет RPC вызов

#### Опции (`RPCOptions`)

- `timeout?: number` - Таймаут в миллисекундах (по умолчанию: 5000)
- `retries?: number` - Количество повторов (по умолчанию: 3)

### Утилиты

- `isRPCError(response: RPCResponse): boolean` - Проверяет, содержит ли ответ ошибку
- `parseRPCResponse(data: string): RPCResponse` - Парсит строку в RPC ответ

## Разработка

### Сборка

```bash
npm run build:lib
```

### Запуск примера

```bash
npm run build:lib
node example.js
```

## Публикация в npm

Перед публикацией:

1. **Обновите информацию в package.json:**
   ```json
   {
     "name": "@your-npm-username/rpc", // ваше имя пользователя npm
     "author": "Your Name",
     "repository": {
       "type": "git",
       "url": "https://github.com/yourusername/rpc.git"
     }
   }
   ```

2. **Войдите в npm:**
   ```bash
   npm login
   ```

3. **Опубликуйте пакет:**
   ```bash
   npm publish --access public
   ```

4. **Для обновления версии:**
   ```bash
   npm version patch  # для патча (1.0.0 -> 1.0.1)
   npm version minor  # для минора (1.0.0 -> 1.1.0)  
   npm version major  # для мажора (1.0.0 -> 2.0.0)
   npm publish
   ```

## Лицензия

MIT 
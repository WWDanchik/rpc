import { describe, it, expect, beforeEach } from 'vitest'
import { RpcRepository, RepositoryTypes } from '../core/rpc/RpcRepository'
import { Rpc } from '../core/rpc/Rpc'
import z from 'zod'
import { Message } from '../core/types'

describe('RpcRepository', () => {
  let repository: any

  const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    post_ids: z.array(z.object({ id: z.number() })).optional(),
  })

  const postSchema = z.object({
    id: z.number(),
    title: z.string(),
    userId: z.number(),
  })

  const tagSchema = z.object({
    id: z.number(),
    name: z.string(),
  })

  const userRpc = new Rpc('user', userSchema, 'id')
  const postRpc = new Rpc('post', postSchema, 'id')
  const tagRpc = new Rpc('tag', tagSchema, 'id')

  beforeEach(() => {
    repository = new RpcRepository()
      .registerRpc('user', userRpc)
      .registerRpc('post', postRpc)
      .registerRpc('tag', tagRpc)

    repository.defineRelation('user', 'post', 'posts').hasMany(
      { field: 'post_ids', key: 'id' },
      'id'
    )

    repository.defineRelation('post', 'tag', 'tags').hasMany(
      { field: 'id', key: 'id' },
      'id'
    )
  })

  describe('registerRpc', () => {
    it('should register RPC types', () => {
      const newRepository = new RpcRepository()
      const result = newRepository.registerRpc('user', userRpc)
      
      expect(result).toBe(newRepository)
    })
  })

  describe('save and findById', () => {
    it('should save and find user by id', () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      }

      const savedUser = repository.save('user', userData)
      expect(savedUser).toEqual(userData)

      const foundUser = repository.findById('user', 1)
      expect(foundUser).toEqual(userData)
    })

    it('should return null for non-existent user', () => {
      const foundUser = repository.findById('user', 999)
      expect(foundUser).toBeNull()
    })
  })

  describe('saveMany', () => {
    it('should save multiple users', () => {
      const users = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ]

      const savedUsers = repository.saveMany('user', users)
      expect(savedUsers).toHaveLength(2)
      expect(savedUsers[0]).toEqual(users[0])
      expect(savedUsers[1]).toEqual(users[1])
    })
  })

  describe('findAll', () => {
    it('should find all users', () => {
      const users = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ]

      repository.saveMany('user', users)
      const allUsers = repository.findAll('user')
      expect(allUsers).toHaveLength(2)
    })
  })

  describe('findBy', () => {
    it('should find users by field', () => {
      const users = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
        { id: 3, name: 'John', email: 'john2@example.com' },
      ]

      repository.saveMany('user', users)
      const johns = repository.findBy('user', 'name', 'John')
      expect(johns).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const user = repository.save('user', {
        id: 1,
        name: 'John',
        email: 'john@example.com',
      })

      const updatedUser = await repository.update('user', 1, {
        name: 'John Updated',
      })

      expect(updatedUser?.name).toBe('John Updated')
      expect(updatedUser?.email).toBe('john@example.com')
    })

    it('should return null for non-existent user', async () => {
      const result = await repository.update('user', 999, { name: 'Test' })
      expect(result).toBeNull()
    })
  })

  describe('remove', () => {
    it('should remove user', () => {
      repository.save('user', {
        id: 1,
        name: 'John',
        email: 'john@example.com',
      })

      const removed = repository.remove('user', 1)
      expect(removed).toBe(true)

      const found = repository.findById('user', 1)
      expect(found).toBeNull()
    })
  })

  describe('relations', () => {
    beforeEach(() => {
      // Save test data
      repository.save('user', {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        post_ids: [{ id: 1 }, { id: 2 }],
      })

      repository.save('post', {
        id: 1,
        title: 'Post 1',
        userId: 1,
      })

      repository.save('post', {
        id: 2,
        title: 'Post 2',
        userId: 1,
      })

      repository.save('tag', { id: 1, name: 'Tech' })
      repository.save('tag', { id: 2, name: 'News' })
    })

    it('should get related posts for user (duplicate test)', () => {
      const posts = repository.getRelated('user', 1, 'post')
      expect(posts).toHaveLength(2)
      expect(posts[0]?.title).toBe('Post 1')
      expect(posts[1]?.title).toBe('Post 2')
    })

    it('should get related posts for user', () => {
      const posts = repository.getRelated('user', 1, 'post')
      expect(posts).toHaveLength(2)
      

      const post1 = posts.find(post => post.id === 1)
      const post2 = posts.find(post => post.id === 2)
      
      expect(post1?.title).toBe('Post 1')
      expect(post2?.title).toBe('Post 2')
    })

    it('should return empty array for non-existent relations', () => {
      const posts = repository.getRelated('user', 999, 'post')
      expect(posts).toHaveLength(0)
    })
  })

  describe('getFullRelatedData', () => {
    beforeEach(() => {
      repository.save('user', {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        post_ids: [{ id: 1 }],
      })

      repository.save('post', {
        id: 1,
        title: 'Post 1',
        userId: 1,
        tags: [{ id: 1 }],
      })

      repository.save('tag', { id: 1, name: 'Tech' })
    })

    it('should get full related data for user', () => {
      const fullData = repository.getFullRelatedData('user', 1)
      expect(fullData).toBeDefined()
      expect((fullData as any).posts).toBeDefined()
      expect((fullData as any).posts[0].tags).toBeDefined()
    })
  })

  describe('mergeRpc', () => {
    it('should merge with array', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })

      const merged = repository.mergeRpc('user', [
        { id: 1, name: 'John Updated', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ])

      expect(merged).toHaveLength(2)
      
      const johnUpdated = merged.find(item => item.id === 1)
      const jane = merged.find(item => item.id === 2)
      
      expect(johnUpdated?.name).toBe('John Updated')
      expect(jane?.name).toBe('Jane')
    })

    it('should merge with record', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })

      const merged = repository.mergeRpc('user', {
        '1': { name: 'John Updated' },
        '2': { id: 2, name: 'Jane', email: 'jane@example.com' },
      })

      expect(merged).toHaveLength(2)
      
      const johnUpdated = merged.find(item => item.id === 1)
      const jane = merged.find(item => item.id === 2)
      
      expect(johnUpdated?.name).toBe('John Updated')
      expect(jane?.name).toBe('Jane')
    })

    it('should delete items when null is passed in record', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })
      repository.save('user', { id: 2, name: 'Jane', email: 'jane@example.com' })
      repository.save('user', { id: 3, name: 'Bob', email: 'bob@example.com' })

      const merged = repository.mergeRpc('user', {
        '1': { name: 'John Updated' },
        '2': null,
        '3': { name: 'Bob Updated' },
      })

      expect(merged).toHaveLength(2)
      
      const johnUpdated = merged.find(item => item.id === 1)
      const bobUpdated = merged.find(item => item.id === 3)
      const jane = merged.find(item => item.id === 2)
      
      expect(johnUpdated?.name).toBe('John Updated')
      expect(bobUpdated?.name).toBe('Bob Updated')
      expect(jane).toBeUndefined()
    })

    it('should not delete items when using array input (arrays cannot contain null)', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })
      repository.save('user', { id: 2, name: 'Jane', email: 'jane@example.com' })
      repository.save('user', { id: 3, name: 'Bob', email: 'bob@example.com' })

      const merged = repository.mergeRpc('user', [
        { id: 1, name: 'John Updated', email: 'john@example.com' },
        { id: 3, name: 'Bob Updated', email: 'bob@example.com' },
      ])

      expect(merged).toHaveLength(3)
      
      const johnUpdated = merged.find(item => item.id === 1)
      const bobUpdated = merged.find(item => item.id === 3)
      const jane = merged.find(item => item.id === 2)
      
      expect(johnUpdated?.name).toBe('John Updated')
      expect(bobUpdated?.name).toBe('Bob Updated')
      expect(jane?.name).toBe('Jane')
    })

    it('should return correct count of remaining items after deletion', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })
      repository.save('user', { id: 2, name: 'Jane', email: 'jane@example.com' })
      repository.save('user', { id: 3, name: 'Bob', email: 'bob@example.com' })
      repository.save('user', { id: 4, name: 'Alice', email: 'alice@example.com' })

      const initialCount = repository.findAll('user').length
      expect(initialCount).toBe(4)

      const merged = repository.mergeRpc('user', {
        '1': null,
        '2': null,
      })

      expect(merged).toHaveLength(2)
      
      const remainingUsers = repository.findAll('user')
      expect(remainingUsers).toHaveLength(2)
      
      const bob = remainingUsers.find(item => item.id === 3)
      const alice = remainingUsers.find(item => item.id === 4)
      
      expect(bob?.name).toBe('Bob')
      expect(alice?.name).toBe('Alice')
    })
  })

  describe('handleMessages', () => {
    it('should handle messages', () => {
      const messages = [
        {
          type: 'user' as const,
          payload: {
            '1': { id: 1, name: 'John', email: 'john@example.com' },
            '2': { id: 2, name: 'Jane', email: 'jane@example.com' },
          },
        },
      ]

      repository.handleMessages(messages)

      const users = repository.findAll('user')
      expect(users).toHaveLength(2)
    })
  })

  describe('mergeRpc with nested arrays (cell)', () => {
    const cellSchema = z.object({
      id: z.number(),
      name: z.string(),
      type: z.enum(['shelf', 'pallet', 'box', 'loss']),
      is_stretched: z.boolean(),
      parent_cell_id: z.number().nullable(),
      code: z.string(),
      warehouse_id: z.number(),
      children: z.array(z.object({ id: z.number() })),
      products: z.array(
        z.object({
          id: z.number(),
          barcodes: z.array(z.object({ id: z.number() })),
        })
      ),
    })

    const cellRpc = new Rpc('cell', cellSchema, 'id')

    beforeEach(() => {
      repository.registerRpc('cell', cellRpc)

      repository.save('cell', {
        id: 1,
        name: 'Cell A',
        type: 'shelf',
        is_stretched: false,
        parent_cell_id: null,
        code: 'A-1',
        warehouse_id: 100,
        children: [{ id: 10 }, { id: 11 }],
        products: [
          { id: 1, barcodes: [{ id: 1 }, { id: 2 }] },
          { id: 2, barcodes: [{ id: 5 }] },
        ],
      })
    })

    it('deletes nested barcode via null at barcodes level', () => {
      repository.mergeRpc('cell', {
        '1': { products: { '1': { barcodes: { '1': null } } } },
      })

      const cell = repository.findById('cell', 1) as any
      const p1 = cell.products.find((p: any) => p.id === 1)
      expect(p1.barcodes.find((b: any) => b.id === 1)).toBeUndefined()
      expect(p1.barcodes.find((b: any) => b.id === 2)).toBeTruthy()
    })

    it('adds nested barcode when provided with numeric id key', () => {
      repository.mergeRpc('cell', {
        '1': { products: { '1': { barcodes: { '3': { id: 3 } } } } },
      })

      const cell = repository.findById('cell', 1) as any
      const p1 = cell.products.find((p: any) => p.id === 1)
      const ids = p1.barcodes.map((b: any) => b.id).sort()
      expect(ids).toEqual([1, 2, 3])
    })

    it('deletes nested product via null at products level', () => {
      repository.mergeRpc('cell', {
        '1': { products: { '1': null } },
      })

      const cell = repository.findById('cell', 1) as any
      const ids = cell.products.map((p: any) => p.id).sort()
      expect(ids).toEqual([2])
    })

    it('deletes child via null at children level', () => {
      repository.mergeRpc('cell', {
        '1': { children: { '10': null } },
      })

      const cell = repository.findById('cell', 1) as any
      const ids = cell.children.map((c: any) => c.id).sort()
      expect(ids).toEqual([11])
    })

    it('updates top-level field together with nested change', () => {
      repository.mergeRpc('cell', {
        '1': { name: 'Cell A Updated', products: { '2': { barcodes: { '6': { id: 6 } } } } },
      })

      const cell = repository.findById('cell', 1) as any
      expect(cell.name).toBe('Cell A Updated')
      const p2 = cell.products.find((p: any) => p.id === 2)
      const ids = p2.barcodes.map((b: any) => b.id).sort()
      expect(ids).toEqual([5, 6])
    })
  })

  describe('getStats', () => {
    it('should return stats', () => {
      repository.save('user', { id: 1, name: 'John', email: 'john@example.com' })
      repository.save('user', { id: 2, name: 'Jane', email: 'jane@example.com' })

      const stats = repository.getStats()
      expect(stats.user.count).toBe(2)
      expect(stats.user.ids).toEqual(['1', '2'])
    })
  })

  describe('getAllRelations', () => {
    it('should return all relations', () => {
      const relations = repository.getAllRelations()
      expect(relations.user).toBeDefined()
      expect(relations.user.post).toBeDefined()
    })
  })

  describe('getRelationsForType', () => {
    it('should return relations for specific type', () => {
      const relations = repository.getRelationsForType('user')
      expect(relations.post).toBeDefined()
    })
  })

  describe('getFullRelation', () => {
    it('should return full relation tree', () => {
      const tree = repository.getFullRelation()
      expect(tree.user).toBeDefined()
      expect(tree.user.relations.post).toBeDefined()
    })
  })
}) 

describe("RpcRepository > data change events", () => {
    let repository: any;

    const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
        isActive: z.boolean(),
        createdAt: z.string(),
    });

    const postSchema = z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        userId: z.number(),
        published: z.boolean(),
        createdAt: z.string(),
    });

    const userRpc = new Rpc("user", userSchema, "id");
    const postRpc = new Rpc("post", postSchema, "id");

    beforeEach(() => {
        repository = new RpcRepository()
            .registerRpc("user", userRpc)
            .registerRpc("post", postRpc);
    });

    it("should emit events when data is saved", async () => {
        const events: Array<Message<any>> = [];
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("user");
        expect(Array.isArray(events[0].payload)).toBe(true);
        expect(events[0].payload).toHaveLength(1);

        repository.offDataChanged(listenerId);
    });

    it("should emit events when data is updated", async () => {
        const events: Array<Message<any>> = [];
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        repository.update("user", 1, {
            name: "John Updated",
            age: 31,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(2);
        expect(events[1].type).toBe("user");
        expect(Array.isArray(events[1].payload)).toBe(true);

        repository.offDataChanged(listenerId);
    });

    it("should emit events when data is removed", async () => {
        const events: Array<Message<any>> = [];
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        repository.remove("user", 1);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(2);
        expect(events[1].type).toBe("user");
        expect(Array.isArray(events[1].payload)).toBe(true);

        repository.offDataChanged(listenerId);
    });

    it("should filter events by type", async () => {
        const userEvents: Array<Message<any>> = [];
        const postEvents: Array<Message<any>> = [];
        
        const userListenerId = repository.onDataChanged((eventEvents) => {
            userEvents.push(...eventEvents);
        }, { types: ["user"] });

        const postListenerId = repository.onDataChanged((eventEvents) => {
            postEvents.push(...eventEvents);
        }, { types: ["post"] });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        repository.save("post", {
            id: 1,
            title: "Test Post",
            content: "Test Content",
            userId: 1,
            published: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(userEvents).toHaveLength(1);
        expect(userEvents[0].type).toBe("user");
        expect(postEvents).toHaveLength(1);
        expect(postEvents[0].type).toBe("post");

        repository.offDataChanged(userListenerId);
        repository.offDataChanged(postListenerId);
    });

    it("should batch multiple events", async () => {
        const events: Array<Message<any>> = [];
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        repository.save("user", {
            id: 2,
            name: "Jane",
            email: "jane@example.com",
            age: 25,
            isActive: true,
            createdAt: "2023-01-01",
        });

        repository.save("post", {
            id: 1,
            title: "Test Post",
            content: "Test Content",
            userId: 1,
            published: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(2);
        expect(events[0].type).toBe("user");

        expect(events[1].type).toBe("post");

        repository.offDataChanged(listenerId);
    });

    it("should return correct listener count", () => {
        expect(repository.getDataChangedListenerCount()).toBe(0);

        const listenerId1 = repository.onDataChanged(() => {});
        expect(repository.getDataChangedListenerCount()).toBe(1);

        const listenerId2 = repository.onDataChanged(() => {});
        expect(repository.getDataChangedListenerCount()).toBe(2);

        repository.offDataChanged(listenerId1);
        expect(repository.getDataChangedListenerCount()).toBe(1);

        repository.offDataChanged(listenerId2);
        expect(repository.getDataChangedListenerCount()).toBe(0);
    });

    it("should clear all listeners", () => {
        repository.onDataChanged(() => {});
        repository.onDataChanged(() => {});
        expect(repository.getDataChangedListenerCount()).toBe(2);

        repository.clearAllDataChangedListeners();
        expect(repository.getDataChangedListenerCount()).toBe(0);
    });

    it("should work with filtered events", async () => {
        const events: Array<Message<any>> = [];
        
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        }, { types: ["user", "post"] });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        repository.save("post", {
            id: 1,
            title: "Test Post",
            content: "Test Content",
            userId: 1,
            published: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(2);
        expect(events[0].type).toBe("user");
        expect(events[1].type).toBe("post");

        repository.offDataChanged(listenerId);
    });

    it("should emit events when items are deleted via mergeRpc", async () => {
        const events: Array<Message<any>> = [];
        
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        repository.save("user", {
            id: 2,
            name: "Jane",
            email: "jane@example.com",
            age: 25,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(1);

        repository.mergeRpc("user", {
            "1": null,
            "2": null,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(2);
        expect(events[1].type).toBe("user");
        expect(Array.isArray(events[1].payload)).toBe(true);

        repository.offDataChanged(listenerId);
    });

    it("should emit events when some items are deleted via mergeRpc (partial deletion)", async () => {
        const events: Array<Message<any>> = [];
        
        const listenerId = repository.onDataChanged((eventEvents) => {
            events.push(...eventEvents);
        });

        repository.save("user", {
            id: 1,
            name: "John",
            email: "john@example.com",
            age: 30,
            isActive: true,
            createdAt: "2023-01-01",
        });

        repository.save("user", {
            id: 2,
            name: "Jane",
            email: "jane@example.com",
            age: 25,
            isActive: true,
            createdAt: "2023-01-01",
        });

        repository.save("user", {
            id: 3,
            name: "Bob",
            email: "bob@example.com",
            age: 35,
            isActive: true,
            createdAt: "2023-01-01",
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events).toHaveLength(1);

        repository.mergeRpc("user", {
            "1": { name: "John Updated" },
            "2": null,
            "3": { name: "Bob Updated" },
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(events.length).toBeGreaterThan(1);
        const lastEvent = events[events.length - 1];
        expect(lastEvent.type).toBe("user");
        expect(Array.isArray(lastEvent.payload)).toBe(true);

        repository.offDataChanged(listenerId);
    });
}); 
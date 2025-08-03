import { describe, it, expect } from 'vitest'
import { Rpc } from '../core/rpc/Rpc'
import z from 'zod'

describe('Rpc', () => {
  const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
  })

  const userRpc = new Rpc('user', userSchema, 'id')

  describe('constructor', () => {
    it('should create Rpc instance with correct properties', () => {
      expect(userRpc.getType()).toBe('user')
      expect(userRpc.getFields()).toBe(userSchema)
      expect(userRpc.getForeignKey()).toBe('id')
    })
  })

  describe('validate', () => {
    it('should validate correct data', () => {
      const data = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const result = userRpc.validate(data)
      expect(result).toEqual(data)
    })

    it('should throw error for invalid data', () => {
      const invalidData = {
        id: 1,
        name: 'John Doe',
        email: 'invalid-email',
      }

      expect(() => userRpc.validate(invalidData)).toThrow()
    })
  })

  describe('createMessage', () => {
    it('should create message with record payload', () => {
      const data = {
        '1': { id: 1, name: 'John', email: 'john@example.com' },
        '2': { id: 2, name: 'Jane', email: 'jane@example.com' },
      }

      const message = userRpc.createMessage(data)
      expect(message).toEqual({
        type: 'user',
        payload: data,
      })
    })

    it('should create message with array payload', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ]

      const message = userRpc.createMessage(data)
      expect(message).toEqual({
        type: 'user',
        payload: data,
      })
    })
  })

  describe('relations', () => {
    const postSchema = z.object({
      id: z.number(),
      title: z.string(),
      userId: z.number(),
    })

    const postRpc = new Rpc('post', postSchema, 'id')

    it('should add hasMany relation', () => {
      userRpc.hasMany('post', 'userId', 'id', 'id')

      const relation = userRpc.getRelation('post')
      expect(relation).toEqual({
        targetType: 'post',
        relationType: 'one-to-many',
        foreignKey: 'userId',
        localKey: 'id',
        arrayKey: 'id',
      })
    })

    it('should add hasOne relation', () => {
      userRpc.hasOne('profile', 'userId', 'id', 'id')

      const relation = userRpc.getRelation('profile')
      expect(relation).toEqual({
        targetType: 'profile',
        relationType: 'one-to-one',
        foreignKey: 'userId',
        localKey: 'id',
        arrayKey: 'id',
      })
    })

    it('should add belongsTo relation', () => {
      postRpc.belongsTo('user', 'userId', 'id', 'id')

      const relation = postRpc.getRelation('user')
      expect(relation).toEqual({
        targetType: 'user',
        relationType: 'one-to-one',
        foreignKey: 'id',
        localKey: 'userId',
        arrayKey: 'id',
      })
    })

    it('should get all relations', () => {
      const relations = userRpc.getRelations()
      expect(relations.size).toBeGreaterThan(0)
    })
  })

  describe('events', () => {
    it('should handle events', () => {
      let eventFired = false
      userRpc.on('dataChanged', () => {
        eventFired = true
      })

      userRpc.emit('dataChanged')
      expect(eventFired).toBe(true)
    })

    it('should remove event listener', () => {
      let eventCount = 0
      const listener = () => {
        eventCount++
      }

      userRpc.on('dataChanged', listener)
      userRpc.emit('dataChanged')
      userRpc.off('dataChanged', listener)
      userRpc.emit('dataChanged')

      expect(eventCount).toBe(1)
    })
  })
}) 
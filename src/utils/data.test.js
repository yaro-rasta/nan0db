import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Data, {
	flatten,
	unflatten,
	merge,
	find
} from './data.js'

suite('Data', () => {
	describe('Static Properties', () => {
		it('should have default constants', () => {
			assert.strictEqual(Data.OBJECT_DIVIDER, '/')
			assert.strictEqual(Data.ARRAY_WRAPPER, '[]')
			assert.strictEqual(Data.MAX_DEEP_UNFLATTEN, 99)
		})
	})

	describe('Configuration', () => {
		it('should set and reset array wrapper', () => {
			Data.setArrayWrapper('{}')
			assert.strictEqual(Data.ARRAY_WRAPPER, '{}')
			Data.resetArrayWrapper()
			assert.strictEqual(Data.ARRAY_WRAPPER, '[]')
		})

		it('should set and reset object divider', () => {
			Data.setObjectDivider('.')
			assert.strictEqual(Data.OBJECT_DIVIDER, '.')
			Data.resetObjectDivider()
			assert.strictEqual(Data.OBJECT_DIVIDER, '/')
		})
	})

	describe('flatten()', () => {
		it('should flatten nested objects', () => {
			const obj = { a: { b: { c: 1 } } }
			assert.deepEqual(Data.flatten(obj), { 'a/b/c': 1 })
			assert.deepEqual(flatten(obj), { 'a/b/c': 1 })
		})

		it('should handle arrays', () => {
			const obj = { a: [1, 2, 3] }
			assert.deepEqual(Data.flatten(obj), {
				'a/[0]': 1,
				'a/[1]': 2,
				'a/[2]': 3
			})
		})
	})

	describe('unflatten()', () => {
		it('should unflatten to nested objects', () => {
			const flat = { 'a/b/c': 1 }
			assert.deepEqual(Data.unflatten(flat), { a: { b: { c: 1 } } })
			assert.deepEqual(unflatten(flat), { a: { b: { c: 1 } } })
		})

		it('should handle arrays', () => {
			const flat = {
				'a/[0]': 1,
				'a/[1]': 2
			}
			assert.deepEqual(Data.unflatten(flat), { a: [1, 2] })
		})
	})

	describe('find()', () => {
		it('should find values by path', () => {
			const obj = { a: { b: { c: 1 } } }
			assert.strictEqual(Data.find('a/b/c', obj), 1)
			assert.strictEqual(find('a/b/c', obj), 1)
		})

		it('should return undefined for missing paths', () => {
			assert.strictEqual(Data.find('a/b/c', {}), undefined)
		})
	})

	describe('merge()', () => {
		it('should deep merge objects', () => {
			const target = { a: { b: 1 } }
			const source = { a: { c: 2 } }
			assert.deepEqual(Data.merge(target, source), { a: { b: 1, c: 2 } })
			assert.deepEqual(merge(target, source), { a: { b: 1, c: 2 } })
		})

		it('should replace arrays', () => {
			const target = { a: [1, 2] }
			const source = { a: [3, 4] }
			assert.deepEqual(Data.merge(target, source), { a: [3, 4] })
		})
	})
})

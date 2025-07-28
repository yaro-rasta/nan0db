import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import BrowserDB from './BrowserDB.js'

describe('BrowserDB', () => {
	let db
	let fetchMock

	beforeEach(() => {
		db = new BrowserDB()
		fetchMock = mock.method(global, 'fetch', async (uri, options) => {
			if (uri === 'index.d.json') {
				return {
					ok: true,
					json: async () => ({ local: true })
				}
			}
			if (uri === 'index.json') {
				return {
					ok: true,
					json: async () => ({ global: true })
				}
			}
			if (uri === 'auth/signin/test') {
				return {
					ok: true,
					json: async () => ({ token: 'test-token' })
				}
			}
			if (options?.headers?.Authorization) {
				return { ok: true, json: async () => ({}) }
			}
			return { ok: false }
		})
	})

	describe('load', () => {
		it('should load from local index first', async () => {
			const result = await db.load()
			assert.deepEqual(result, { local: true })
		})

		it('should fallback to global index', async () => {
			fetchMock.mock.mockImplementationOnce(async (uri) => {
				if (uri === 'index.json') return {
					ok: true,
					json: async () => ({ global: true })
				}
				return { ok: false }
			})
			const result = await db.load()
			assert.deepEqual(result, { global: true })
		})
	})

	describe('auth methods', () => {
		it('should set token on successful login', async () => {
			await db.logIn('test', 'password')
			assert.equal(db.token, 'test-token')
		})

		it('should clear token on logout', async () => {
			db.token = 'test-token'
			await db.logOut('test')
			assert.equal(db.token, '')
		})
	})

	describe('document operations', () => {
		it('should include auth header when token exists', async () => {
			db.token = 'test-token'
			await db.loadDocument('test.json')
			assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, 'Bearer test-token')
		})

		it('should handle failed requests', async () => {
			fetchMock.mock.mockImplementationOnce(async () => ({ ok: false }))
			await assert.rejects(db.loadDocument('test.json'))
		})
	})
})

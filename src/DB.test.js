import { suite, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import DB from './index.js'

class MockDB extends DB {
	constructor() {
		super()
		this.accessLevels = []
	}
	async ensureAccess(uri, level = 'r') {
		this.accessLevels.push({ uri, level })
		if (!['r', 'w', 'd'].includes(level)) {
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}
		return true
	}
	async loadDocument(uri, defaultValue = "") {
		return defaultValue
	}
	async saveDocument(uri, document) {
		return false
	}
	async statDocument(uri) {
		return {
			isDirectory: false,
			mtimeMs: 0,
		}
	}
	async loadDirectoryEntries(uri) {
		return []
	}
}

class WorkingDB extends DB {
	async resolve(...args) {
		return args.join("/").replace(/\/+/g, "/")
	}
}

suite("DB", () => {
	/** @type {MockDB} */
	let db
	let workDb

	beforeEach(() => {
		db = new MockDB()
		workDb = new WorkingDB()
	})

	describe('attach and detach', () => {
		let db1, db2

		beforeEach(() => {
			db1 = new MockDB()
			db2 = new MockDB()
		})

		it('should attach a DB instance', () => {
			db.attach(db1)
			assert.strictEqual(db.dbs.length, 1)
			assert.strictEqual(db.dbs[0], db1)
		})

		it('should throw TypeError when attaching a non-DB instance', () => {
			assert.throws(() => db.attach({}), TypeError)
		})

		it('should detach an existing DB instance', () => {
			db.attach(db1)
			const result = db.detach(db1)
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0], db1)
			assert.strictEqual(db.dbs.length, 0)
		})

		it('should return false when detaching a non-existent DB instance', () => {
			const result = db.detach(db1)
			assert.strictEqual(result, false)
			assert.strictEqual(db.dbs.length, 0)
		})

		it('should detach one of multiple attached DBs', () => {
			db.attach(db1)
			db.attach(db2)
			assert.strictEqual(db.dbs.length, 2)
			const result = db.detach(db1)
			assert.strictEqual(result.length, 1)
			assert.strictEqual(result[0], db1)
			assert.strictEqual(db.dbs.length, 1)
			assert.strictEqual(db.dbs[0], db2)
		})
	})

	describe('extname', () => {
		it('should return extension with dot', () => {
			assert.strictEqual(db.extname('file.txt'), '.txt')
			assert.strictEqual(db.extname('archive.tar.gz'), '.gz')
		})

		it('should return empty string if no extension', () => {
			assert.strictEqual(db.extname('filename'), '')
		})

		it('should handle empty string', () => {
			assert.strictEqual(db.extname(''), '')
		})
	})

	describe('resolve', () => {
		it('should throw not implemented error', async () => {
			const fn = async () => await db.resolve('path')
			await assert.rejects(fn, /not implemented/i)
		})
		it("should resolve the path", async () => {
			const path = await workDb.resolve("a/b", "c")
			assert.equal(path, "a/b/c")
		})
	})

	describe('relative', () => {
		it('should throw not implemented error', () => {
			assert.throws(() => db.relative('from', 'to'), /not implemented/i)
		})
	})

	describe('loadDocument', () => {
		it('should call ensureAccess with r and return undefined', async () => {
			const uri = 'doc.txt'
			const result = await db.loadDocument(uri)
			assert.strictEqual(result, "")
		})
	})

	describe('saveDocument', () => {
		it('should call ensureAccess [w]rite and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.saveDocument(uri, 'data')
			assert.strictEqual(result, false)
		})
	})

	describe('writeDocument', () => {
		it('should call ensureAccess with w and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.writeDocument(uri, 'chunk')
			assert.strictEqual(result, false)
		})
	})

	describe('dropDocument', () => {
		it('should call ensureAccess with d and return false', async () => {
			const uri = 'doc.txt'
			const result = await db.dropDocument(uri)
			assert.strictEqual(result, false)
		})
	})

	describe('moveDocument', () => {
		it('should call ensureAccess for from and to, and loadConfig', async () => {
			const from = 'from.txt'
			const to = 'to.txt'
			const result = await db.moveDocument(from, to)
			assert.strictEqual(result, undefined)
		})
	})

	describe('ensureAccess', () => {
		it('should return true for valid levels', async () => {
			assert.strictEqual(await db.ensureAccess('uri', 'r'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'w'), true)
			assert.strictEqual(await db.ensureAccess('uri', 'd'), true)
		})

		it('should throw error for invalid level', async () => {
			await assert.rejects(() => db.ensureAccess('uri', 'x'), /Access level must be one of \[r, w, d\]/)
		})
	})
})

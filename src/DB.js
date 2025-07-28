import { oneOf } from "@nanoweb/types"
import DocumentStat from "./DocumentStat.js"
import DocumentEntry from "./DocumentEntry.js"
import StreamEntry from "./StreamEntry.js"

class DB {
	encoding = "utf-8"
	/** @type {Map<uri: string, DocumentEntry>} */
	data = new Map()
	/** @type {Map<uri: string, DocumentStat>} */
	meta = new Map()
	/** @type {boolean} */
	connected = false
	/** @type {string} */
	root
	/** @type {string} */
	cwd = "."
	/** @type {DB[]} */
	dbs

	/**
	 * @param {object} input
	 * @param {string} [input.root="."]
	 * @param {string} [input.cwd="."]
	 * @param {boolean} [input.connected=false]
	 * @param {Map<string, DocumentEntry>} [input.data=new Map()]
	 * @param {Map<string, DocumentStat>} [input.meta=new Map()]
	 */
	constructor(input = {}) {
		const {
			root = ".",
			cwd = ".",
			data = new Map(),
			meta = new Map(),
			connected = false,
			dbs = [],
		} = input
		this.root = root
		this.cwd = cwd
		this.data = data instanceof Map ? data : new Map(data)
		this.meta = meta instanceof Map ? meta : new Map(meta)
		this.connected = connected
		this.dbs = dbs
	}

	get loaded() {
		return this.meta.has("?loaded")
	}

	attach(db) {
		if (!(db instanceof DB)) {
			throw new TypeError("It is possible to attach only DB or extended databases")
		}
		this.dbs.push(db)
	}

	detach(db) {
		const index = this.dbs.findIndex((d) => d.root === db.root && d.cwd === db.cwd)
		if (index < 0) {
			return false
		}
		return this.dbs.splice(index, 1)
	}

	/**
	 * Creates a new DB instance with a subset of the data and meta.
	 * @param {string} uri The URI to extract from the current DB.
	 * @returns {DB}
	 */
	extract(uri) {
		const root = ("." === this.root ? "" : this.root + "/")
		return new this.constructor({
			root: root + uri,
			data: new Map(Array.from(this.data.entries()).filter(
				([key]) => key.startsWith(uri)
			).map(([key, value]) => [key.replace(uri, ""), value])),
			meta: new Map(Array.from(this.meta.entries()).filter(
				([key]) => key.startsWith(uri)
			).map(([key, value]) => [key.replace(uri, ""), value])),
		})
	}

	/**
	 * @param {string} uri
	 * @returns {string}
	 */
	extname(uri) {
		const arr = uri.split(".")
		return arr.length > 1 ? `.${arr.pop()}` : ""
	}

	/**
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @returns {Promise<string>}
	 */
	relative(from, to) {
		throw new Error("Not implemented")
	}

	toString() {
		return this.constructor.name + " " + this.root + " [" + this.encoding + "]"
	}

	/**
	 * Reading the current directory or branch as async generator to follow progress.
	 * For FetchDB it is loading of "index.txt" or "manifest.json".
	 * For NodeFsDB it is loading readdirSync in a conditional recursion.
	 * @param {string} uri
	 * @param {object} options
	 * @param {number} [options.depth=0]
	 * @param {boolean} [options.skipStat=false]
	 * @returns {AsyncGenerator<DocumentEntry>}
	 */
	async *readDir(uri = ".", options = {}) {
		const {
			depth = 0,
			skipStat = false,
			skipSymbolicLink = false,
			filter = (uri) => true,
		} = options
		await this.ensureAccess(uri, "r")
		if (!filter(uri)) {
			return
		}
		const stat = await this.statDocument(uri)
		// yield new DocumentEntry({ name: uri, stat })
		if (stat.isDirectory) {
			const entries = await this.listDir(uri, { depth, skipStat, skipSymbolicLink })
			const later = []
			for (const entry of entries) {
				let path = await this.resolve(uri, entry.name)
				if (!filter(path)) {
					continue
				}
				this.data.set(path, false)
				this.meta.set(path, entry.stat)
				const element = new DocumentEntry({ name: entry.name, stat: entry.stat, depth, path })
				if (entry.isDirectory) {
					yield element
				} else {
					later.push(element)
				}
			}
			for (const entry of later) {
				yield entry
			}
			for (const entry of entries) {
				if (skipSymbolicLink && entry.stat.isSymbolicLink) {
					continue
				}
				if (entry.isDirectory) {
					const path = await this.resolve(uri, entry.name)
					yield* this.readDir(path, { depth: depth + 1, skipStat, skipSymbolicLink, filter })
				}
			}
		} else {
			const name = this.relative(this.root, uri)
			this.data.set(uri, false)
			this.meta.set(uri, stat)
			if (filter(uri)) {
				yield new DocumentEntry({ name, stat, depth, path: uri })
			}
		}
	}

	async readBranch(uri, depth = -1) {
		return this.readDir(uri, depth)
	}

	async requireConnected() {
		if (!this.connected) {
			await this.connect()
		}
		if (!this.connected) {
			throw new Error("DB is not connected")
		}
	}

	/**
	 * @param {string | (key: string, value: any) => boolean} uri
	 * @returns {AsyncGenerator<string, void, unknown>}
	 */
	async *find(uri, depth = 0) {
		await this.requireConnected()
		if (!this.loaded) {
			for await (const _ of this.readDir(this.root)) {
				yield* this.readDir(this.root, depth + 1)
			}
			this.meta.set("?loaded", true)
		}
		if ("function" === typeof uri) {
			for (const [key, value] of this.data) {
				if (uri(key, value)) {
					yield key
				}
			}
		} else {
			if (this.data.has(uri)) {
				yield uri
			}
		}
	}

	async connect() {
		this.connected = true
	}

	async get(uri) {
		await this.ensureAccess(uri, "r")
		if (!this.data.has(uri) || false === this.data.get(uri)) {
			const data = await this.loadDocument(uri)
			this.data.set(uri, data)
		}
		return this.data.get(uri)
	}

	async set(uri, data) {
		await this.ensureAccess(uri, "w")
		this.data.set(uri, data)
		const meta = this.meta.has(uri) ? this.meta.get(uri) : {}
		this.meta.set(uri, { ...meta, mtime: Date.now() })
		return data
	}

	/**
	 * Returns the stat of the document, uses meta (cache) if available.
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @returns {Promise<DocumentStat>}
	 */
	async stat(uri) {
		await this.ensureAccess(uri, "r")
		if (!this.meta.has(uri)) {
			const stat = await this.statDocument(uri)
			this.meta.set(uri, stat)
		}
		return this.meta.get(uri)
	}

	/**
	 * Returns the relative path of the resolved path to the cwd,
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param  {...string[]} args
	 * @return {Promise<string>}
	 */
	resolve(...args) {
		throw new Error("Not implemented")
	}
	/**
	 * Returns the absolute path of the resolved path.
	 * @note Must be overwritten by platform specific application.
	 * @param  {...string[]} args
	 * @return {Promise<string>}
	 */
	absolute(...args) {
		throw new Error("Not implemented")
	}

	/**
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @returns {any|undefined}
	*/
	async loadDocument(uri, defaultValue = "") {
		await this.ensureAccess(uri, "r")
		throw new Error("Not implemented")
	}

	/**
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @returns {boolean}
	 */
	async saveDocument(uri, document) {
		await this.ensureAccess(uri, "w")
		throw new Error("Not implemented")
	}

	/**
	 * @param {string} uri
	 * @returns {Promise<DocumentStat>}
	 */
	async statDocument(uri) {
		await this.ensureAccess(uri)
		throw new Error("Not implemented")
	}

	/**
	 * Writes a chunk of data to a document.
	 * @param {string} uri
	 * @param {string} chunk
	 * @returns {boolean}
	 */
	async writeDocument(uri, chunk) {
		await this.ensureAccess(uri, "w")
		return false
	}

	/**
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @returns {boolean}
	 */
	async dropDocument(uri) {
		await this.ensureAccess(uri, "d")
		return false
	}

	/**
	 * @note Must be overwritten by platform specific application.
	 * @throws
	 * @param {string} uri
	 * @param {string} level The access level, one of r, w, d.
	 * @returns {Promise<boolean>}
	 */
	async ensureAccess(uri, level = "r") {
		if (!oneOf("r", "w", "d")(level)) {
			throw new TypeError([
				"Access level must be one of [r, w, d]",
				"r = read",
				"w = write",
				"d = delete",
			].join("\n"))
		}
		return true
	}

	async push(uri = null) {
		if (uri) {
			await this.ensureAccess(uri, "w")
		} else {
			for (const [key] of this.data) {
				await this.ensureAccess(key, "w")
			}
		}
		const changed = []
		for (const [key, value] of this.data) {
			const meta = this.meta.get(key) ?? {}
			const stat = await this.statDocument(key)
			if (meta.mtimeMs > stat.mtimeMs) {
				changed.push(key)
				await this.saveDocument(key, value)
			}
		}
		return changed
	}

	async moveDocument(from, to) {
		await this.ensureAccess(to, "w")
		await this.ensureAccess(from, "r")
		const data = await this.get(from)
		await this.saveDocument(to, data)
	}

	async disconnect() {
		this.connected = false
	}

	/**
	 * @param {string} uri
	 * @returns {Promise<{name: string, isDirectory: boolean}[]>}
	 */
	async listDir(uri, { depth = 0, skipStat = false } = {}) {
		throw new Error("Not implemented")
	}

	/**
	 * @param {string} uri
	 * @param {Object} options
	 * @param {Function} [options.filter]
	 * @param {number} [options.limit]
	 * @param {string} [options.sort]
	 * @param {string} [options.order]
	 * @param {boolean} [options.skipStat]
	 * @param {boolean} [options.skipSymbolicLink]
	 * @returns {AsyncGenerator<StreamEntry>}
	 */
	async *findStream(uri, options = {}) {
		const {
			filter = (uri) => true,
			limit = -1,
			sort = "name",
			order = "asc",
			skipStat = false,
			skipSymbolicLink = false,
		} = options
		/** @type {Map<string, DocumentEntry>} */
		let dirs = new Map()
		/** @type {Map<string, DocumentEntry>} */
		let top = new Map()
		/** @type {Map<string, string>} */
		let errors = new Map()

		const sortFn = (a, b) => {
			if (sort === "name") {
				return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
			}
			if (sort === "mtime") {
				return order === "asc" ? a.stat.mtime - b.stat.mtime : b.stat.mtime - a.stat.mtime
			}
			if (sort === "size") {
				return order === "asc" ? a.stat.size - b.stat.size : b.stat.size - a.stat.size
			}
			return 0
		}

		/**
		 * !!! INCORRECT PROGRESS CALCULATION !!!
		 * @param {DocumentEntry[]} files
		 * @returns {number}
		 */
		function getProgress(files) {
			let progress = 0

			/** @type {DocumentEntry} */
			const last = files[files.length - 2] ?? null
			const recent = files[files.length - 1]
			if (recent.isDirectory) {
				dirs.set(recent.path, recent)
			} else {
				if ("" !== recent.parent && !dirs.has(recent.parent)) {
					throw new Error([ "Directory not found", recent.parent ].join(": "))
				}
			}
			if (last?.parent && last.parent !== recent.parent && dirs.has(last.parent)) {
				const dir = dirs.get(last.parent)
				dir.fulfilled = true
				const topDir = top.get(dir.name)
				if (topDir) {
					topDir.fulfilled = true
				}
			}
			if (recent.depth > 0) {
				// Calculate progress based on fulfillment of subdirectories the same way as top level directories.
				// Find the top-level directory for this recent file.
				let topLevelDirName = recent.name
				let dir = recent
				while (dir.parent && dirs.has(dir.parent)) {
					dir = dirs.get(dir.parent)
					topLevelDirName = dir.name
				}
				// Mark the top-level directory as fulfilled if all its subdirectories are fulfilled.
				if (top.has(topLevelDirName)) {
					const topDir = top.get(topLevelDirName)
					// Find all directories under this top-level directory.
					const subDirs = Array.from(dirs.values()).filter(
						d =>
							d.name !== topLevelDirName &&
							(d.parent === topLevelDirName || d.name.startsWith(topLevelDirName + "/"))
					)
					const allFulfilled =
						subDirs.length > 0 && subDirs.every(d => d.fulfilled)
					if (allFulfilled) {
						topDir.fulfilled = true
					}
				}
				const fulfilledDirs = Array.from(top.values()).filter(dir => dir.fulfilled)
				progress = top.size ? fulfilledDirs.length / top.size : 0
			}
			else if (recent.isDirectory) {
				top.set(recent.name, recent)
			}
			// Calculate progress based on the number of fulfilled directories
			const fulfilledDirs = Array.from(dirs.values()).filter(dir => dir.fulfilled)
			progress = dirs.size ? fulfilledDirs.length / dirs.size : 0
			return progress
		}
		const totalSize = { dirs: 0, files: 0 }

		const startDir = await this.resolve(this.cwd, uri)
		await this.ensureAccess(uri)

		const files = []
		for await (const file of this.readDir(startDir, { skipStat, skipSymbolicLink, filter })) {
			files.push(file)
			if (file.stat.error) {
				errors.set(file.path, file.stat.error)
			}
			if (file.isDirectory) {
				dirs.set(file.path, file)
				totalSize.dirs += file.stat.size
			}
			totalSize.files += file.isFile ? file.stat.size : 0
			const progress = getProgress(files)
			const entry = new StreamEntry({
				file,
				files: files.sort(sortFn),
				dirs,
				top,
				errors,
				progress,
				totalSize,
			})
			yield entry
			if (limit > 0 && files.length >= limit) break
		}
	}

	static from(props) {
		if (props instanceof DB) return props
		return new this(props)
	}
}

export default DB

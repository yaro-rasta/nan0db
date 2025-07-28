import DBFS from "@nanoweb/db-fs"
import User from "./User.js"

class AuthDB extends DBFS {
	static TOKEN_LIFETIME = 3_600_000
	/** @type {Map<string, {time: Date, username: string}>} */
	tokens
	async load() {
		let count = 0
		for await (const entry of this.readDir()) {
			++count
		}
		// Load all tokens into memory
		this.tokens = new Map()
		for (const [uri, value] of this.data.entries()) {
			if (!uri.endsWith("/tokens.json")) continue
			let data = value
			if (!data) {
				data = await this.loadDocument(uri, {})
			}
			const username = uri.split("/").slice(-2)[0]
			for (const [token, time] of Object.entries(data)) {
				this.tokens.set(token, { time: new Date(time), username })
			}
		}
	}

	/**
	 * @param {string} token
	 * @returns {Promise<User | null>} The user instance.
	 */
	async auth(token) {
		if (!this.tokens.has(token)) {
			return null
		}
		const data = this.tokens.get(token)
		if (Date.now() - data.time.getTime() > AuthDB.TOKEN_LIFETIME) {
			await this.deleteToken(token)
			return null
		}
		return await this.getUser(data.username)
	}

	getUserPath(username, suffix = "/") {
		const levelA = username.slice(0, 2).toLowerCase()
		const levelB = username.slice(2, 4).toLowerCase()
		return `users/${levelA}/${levelB}/${username}${suffix}`
	}

	async updateToken(token, username, time = new Date()) {
		const dir = this.getUserPath(username)
		const tokensPath = `${dir}tokens.json`

		// Update in-memory map
		this.tokens.set(token, { time, username })

		// Update on disk
		const tokens = await this.loadDocument(tokensPath, {})
		tokens[token] = time.toISOString()
		await this.saveDocument(tokensPath, tokens)
	}

	async deleteToken(token) {
		const tokenData = this.tokens.get(token)
		if (!tokenData) return false

		const { username } = tokenData
		const dir = this.getUserPath(username)
		const tokensPath = `${dir}tokens.json`

		// Update in-memory map
		this.tokens.delete(token)

		// Update on disk
		const tokens = await this.loadDocument(tokensPath, {})
		delete tokens[token]
		await this.saveDocument(tokensPath, tokens)

		return true
	}

	/**
	 * @param {string} username
	 * @returns {Promise<User | null>}
	 */
	async getUser(username) {
		const data = await this.get(this.getUserPath(username) + "info.json")
		return data ? new User(data) : null
	}

	/**
	 * @param {string} username
	 * @returns {Map<string, {time: Date, username}>}
	 */
	async getUserTokens(username) {
		const path = this.getUserPath(username) + "tokens.json"
		const data = await this.loadDocument(path, {})
		const tokens = new Map()
		for (const [token, time] of Object.entries(data)) {
			tokens.set(token, { time: new Date(time), username })
		}
		return tokens
	}

	/**
	 * @param {User} user
	 * @returns {Promise<boolean>} True if saved, false otherwise.
	 */
	async saveUser(user) {
		if (!/^[a-z0-9_-]{3,32}$/i.test(user.name)) {
			throw new Error('Username must be 3-32 chars with letters, numbers, - or _')
		}
		if (!(user instanceof User)) {
			throw new Error('User must be an instance of User class')
		}
		return this.saveDocument(`${this.getUserPath(user.name)}info.json`, user.toObject())
	}

	async deleteUser(username) {
		const path = this.getUserPath(username)
		await this.dropDocument(`${path}/info.json`)
		await this.dropDocument(`${path}/tokens.json`)
	}
}

export default AuthDB

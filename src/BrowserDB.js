import DB from './DB.js'
import { oneOf } from "@nanoweb/types"

/**
 * BrowserDB extends DB for browser usage with authentication support
 */
class BrowserDB extends DB {
	/** @type {string} */
	token = ''
	/** @type {string} */
	extension = '.json'
	/** @type {string} */
	indexFile = 'index.json'
	/** @type {string} */
	localIndexFile = 'index.d.json'

	/**
	 * @param {object} input
	 * @param {string} [input.token='']
	 * @param {string} [input.extension='.json']
	 * @param {string} [input.indexFile='index.json']
	 * @param {string} [input.localIndexFile='index.d.json']
	 */
	constructor(input = {}) {
		super(input)
		this.token = input.token || ''
		this.extension = input.extension || '.json'
		this.indexFile = input.indexFile || 'index.json'
		this.localIndexFile = input.localIndexFile || 'index.d.json'
	}

	/**
	 * Load indexes from local or global index file
	 * @returns {Promise<Record<string, any>>}
	 */
	async load() {
		try {
			const localIndex = await this.loadDocument(this.localIndexFile)
			if (localIndex) return localIndex
		} catch (e) {
			// Ignore local index failure
		}

		try {
			const globalIndex = await this.loadDocument(this.indexFile)
			return globalIndex || {}
		} catch (e) {
			return {}
		}
	}

	/**
	 * @override
	 * @param {string} uri
	 * @returns {Promise<any>}
	 */
	async loadDocument(uri) {
		await this.ensureAccess(uri, 'r')
		const response = await fetch(uri, {
			headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
		})
		if (!response.ok) throw new Error(`Failed to load ${uri}`)
		return response.json()
	}

	/**
	 * @override
	 * @param {string} uri
	 * @param {any} document
	 * @returns {Promise<boolean>}
	 */
	async saveDocument(uri, document) {
		await this.ensureAccess(uri, 'w')
		const response = await fetch(uri, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
			},
			body: JSON.stringify(document)
		})
		if (!response.ok) throw new Error(`Failed to save ${uri}`)
		return response.json()
	}

	/**
	 * @override
	 * @param {string} uri
	 * @returns {Promise<boolean>}
	 */
	async dropDocument(uri) {
		await this.ensureAccess(uri, 'd')
		const response = await fetch(uri, {
			method: 'DELETE',
			headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
		})
		return response.ok
	}

	// Auth API methods
	async register(input) {
		const result = await this.saveDocument('auth/signup', input)
		if (result?.token) this.token = result.token
		return result
	}

	async confirmRegistration(username, code) {
		const result = await this.saveDocument(`auth/signup/${username}`, { code })
		if (result?.token) this.token = result.token
		return result
	}

	async deleteAccount(username) {
		const result = await this.dropDocument(`auth/signup/${username}`)
		if (result) this.token = ''
		return result
	}

	async logIn(username, password) {
		const result = await this.saveDocument(`auth/signin/${username}`, { password })
		if (result?.token) this.token = result.token
		return result
	}

	async getUser(username) {
		return this.loadDocument(`auth/signin/${username}`)
	}

	async refreshToken(token, replace = false) {
		const result = await this.saveDocument(`auth/refresh/${token}`, { replace })
		if (result?.token) this.token = result.token
		return result
	}

	async forgotPassword(username) {
		return this.saveDocument(`auth/forgot/${username}`, { target: 'password' })
	}

	async resetPassword(username, code, password) {
		const result = await this.saveDocument(`auth/reset/${username}`, {
			target: 'password',
			code,
			password
		})
		if (result?.token) this.token = result.token
		return result
	}

	async logOut(username) {
		const result = await this.dropDocument(`auth/signin/${username}`)
		if (result) this.token = ''
		return result
	}

	// 3rd party auth
	async authWithProvider(provider, token) {
		const result = await this.saveDocument(`auth/${provider}`, { token })
		if (result?.token) this.token = result.token
		return result
	}
}

export default BrowserDB

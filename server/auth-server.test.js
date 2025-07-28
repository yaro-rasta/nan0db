import { suite, describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import AuthServer from './auth-server.js'
import { APIRequest } from 'nanoweb-http'
import { rmdirSync } from 'node:fs'

class APIAuthRequest extends APIRequest {
	/** @type {string} */
	_token
	/**
	 * @type {string}
	 * @param {string} token
	 */
	set token(token) {
		token = String(token)
		this._token = token.length < 18 ? null : token
	}
	get token() {
		return this._token
	}
	async get(path = "", headers = {}) {
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return await super.get(path, headers)
	}
	async post(path = "", body = "", headers = {}) {
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return await super.post(path, body, headers)
	}
	async put(path = "", body = "", headers = {}) {
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return await super.put(path, body, headers)
	}
	async patch(path = "", body = "", headers = {}) {
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return await super.patch(path, body, headers)
	}
	async delete(path = "", headers = {}) {
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`
		}
		return await super.delete(path,headers)
	}
}

const testPort = 3001
const baseUrl = `http://localhost:${testPort}`
const api = new APIAuthRequest(baseUrl + "/auth/")

/** @type {AuthServer} */
let server

before(async () => {
	server = new AuthServer({
		port: testPort,
		dbPath: './test-auth-data'
	})
	// rmdirSync(server.db.cwd, { recursive: true })
	await server.start()
})

after(() => {
	return server.stop()
})

suite("Auth Server", () => {
	describe("Setting up a clean server with a root user", () => {
		let token

		it("should not get info of root without access", async () => {
			const response = await api.get("info/root")
			assert.strictEqual(response.status, 401)
		})

		it("should log in and reset a password (mandatory action)", async () => {
			const tokenResponse = await api.post("signin/root", { password: "root" })
			assert.strictEqual(tokenResponse.status, 200)
			const tokenData = await tokenResponse.json()
			assert.ok(tokenData)
			assert.ok(tokenData.token.length > 18)

			const infoResponse = await api.get("info/root", {
				Authorization: `Bearer ${tokenData.token}`
			})
			assert.strictEqual(infoResponse.status, 200)
			const info = await infoResponse.json()
			assert.ok(info.createdAt)
			assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(info.createdAt))
			assert.equal(info.email, "root@localhost")
			assert.ok(!info.passwordHash)
			assert.ok(!info.resetCode)
			assert.ok(!info.verificationCode)
		})

		it("should log in with a default password", async () => {
			// First get reset code
			const response = await api.post("signin/root", { password: "root" })
			assert.strictEqual(response.status, 200)
			const data = await response.json()
			assert.ok(data.token.length > 18)
			api.token = data.token
		})

		it("should log in with a new password", async () => {
			// First get reset code
			api.token = null
			const forgotResponse = await api.post("forgot/root")
			assert.strictEqual(forgotResponse.status, 200)

			const user = await server.db.getUser("root")

			const passwordReset = await api.post("reset/root", {
				code: user.resetCode,
				password: "newRootPassword"
			})
			assert.strictEqual(passwordReset.status, 200)
			const resetData = await passwordReset.json()
			assert.ok(resetData.token)
			api.token = resetData.token
		})

		it("should not access a hidden data: passwords", async () => {
			const response = await api.get("info/root")
			assert.strictEqual(response.status, 200)
			const data = await response.json()
			assert.ok(Object.hasOwn(data, 'verified'))
			assert.ok(!Object.hasOwn(data, 'passwordHash'))
		})

		it("should list all the users", async () => {
			const usersResponse = await api.get("info")
			assert.strictEqual(usersResponse.status, 200)
			const data = await usersResponse.json()
			assert.ok(data.users.includes('root'))
		})
	})

	describe("User joins to our website", () => {
		let testToken = ""

		it("should register", async () => {
			const response = await api.post("signup", {
				username: "testuser",
				password: "testpass123",
				email: "test@example.com"
			})
			assert.strictEqual(response.status, 200)
			const user = await response.json()
			assert.ok(user)
		})

		it.skip("should confirm registration", async () => {
			// In real scenario we'd get the code from email
			const user = await server.db.getUser("testuser")
			const code = "123456"
			const confirmResponse = await api.post("signup/testuser", { code: user.resetCod })
			assert.strictEqual(confirmResponse.status, 200)
			const confirmData = await confirmResponse.json()
			testToken = confirmData.token
			assert.ok(testToken)
		})

		it.skip("should log in", async () => {
			const loginResponse = await api.post("signin/testuser", {
				password: "testpass123"
			})
			assert.strictEqual(loginResponse.status, 200)
		})

		it.skip("should prolong token", async () => {
			const tokenResponse = await api.post("refresh", { replace: false })
			assert.strictEqual(tokenResponse.status, 200)
			assert.ok(tokenResponse.data.token)
		})

		it.skip("should replace token", async () => {
			const tokenResponse = await api.post("refresh", { replace: true })
			assert.strictEqual(tokenResponse.status, 200)
			assert.ok(tokenResponse.data.token)
		})

		it.skip("should change the user info", async () => {
			const updateResponse = await api.post("info/testuser", {
				contact: { tel: "+123456789" }
			})
			assert.strictEqual(updateResponse.status, 200)
		})

		it.skip("should not access a hidden data: codes, passwords", async () => {
			const infoResponse = await api.get("info/testuser")
			assert.strictEqual(infoResponse.status, 200)
			assert.notProperty(infoResponse.data, 'passwordHash')
			assert.notProperty(infoResponse.data, 'verificationCode')
		})

		it.skip("should log out", async () => {
			const logoutResponse = await api.delete("signin/testuser")
			assert.strictEqual(logoutResponse.status, 200)
		})

		it.skip("should restore password", async () => {
			const resetResponse = await api.post("forgot/testuser")
			assert.strictEqual(resetResponse.status, 200)
			assert.ok(resetResponse.data.code)
		})

		it.skip("should log in with a new password", async () => {
			const passwordReset = await api.post("reset/testuser", {
				code: "123456", // from forgot password
				password: "newTestPassword"
			})
			assert.strictEqual(passwordReset.status, 200)
			assert.ok(passwordReset.data.token)
		})

		it.skip("should log out", async () => {
			const logoutResponse = await api.delete("signin/testuser")
			assert.strictEqual(logoutResponse.status, 200)
		})

		it.skip("should log in with a provider", async () => {
			// Mock provider login
			const providerResponse = await api.post("signin/testuser", {
				provider: "google",
				token: "test-provider-token"
			})
			assert.strictEqual(providerResponse.status, 200)
			assert.ok(providerResponse.data.token)
		})

		it.skip("should delete an account", async () => {
			const deleteResponse = await api.delete("signup/testuser")
			assert.strictEqual(deleteResponse.status, 200)
		})
	})
})

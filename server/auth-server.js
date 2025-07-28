import { createServer, Router, ServerResponse } from 'nanoweb-http'
import crypto from 'node:crypto'
import process from 'node:process'
import User from './User.js'
import AuthDB from './DB.js'
import { IncomingMessage } from 'node:http'

class AuthServer {
	/**
	 * @param {object} options
	 * @param {string} [options.dbPath]
	 */
	constructor(options = {}) {
		this.db = new AuthDB({
			root: options.dbPath || './auth-data',
			cwd: process.cwd()
		})
		this.port = options.port || 3000
		this.router = new Router()
		this.server = createServer({
			port: this.port,
			router: this.router,
			ssl: options.ssl,
		})

		this.setupRoutes()
	}

	async start() {
		await this.db.connect()
		await this.db.load()
		const isEmpty = 0 === this.db.meta.size
		if (isEmpty) {
			const token = this.generateToken()
			const root = new User({
				name: 'root',
				email: 'root@localhost',
				passwordHash: this.hashPassword('root'),
				verified: true,
				role: 'root',
				createdAt: new Date().toISOString()
			})
			await this.db.saveUser(root)
			const dir = this.db.getUserPath(root.name)
			await this.db.saveDocument(`${dir}tokens.json`, {
				[token]: new Date().toISOString()
			})
			console.info([
				"Root user created with token",
				token
			].join(": "))
		}
		await this.server.listen()
	}

	async stop() {
		await this.server.close()
		await this.db.disconnect()
	}

	setupRoutes() {
		// Middleware to parse JSON bodies
		this.router.use(async (req, res, next) => {
			if (req.headers['content-type'] === 'application/json') {
				let body = ''
				req.on('data', chunk => body += chunk)
				req.on('end', () => {
					try {
						req.body = JSON.parse(body)
					} catch {
						req.body = {}
					}
					next()
				})
			} else {
				next()
			}
		})

		// Auth endpoints
		this.router.post('/auth/signup', this.handleSignup.bind(this))
		this.router.post('/auth/signup/:username', this.handleConfirmSignup.bind(this))
		this.router.delete('/auth/signup/:username', this.handleDeleteAccount.bind(this))
		this.router.post('/auth/signin/:username', this.handleSignin.bind(this))
		this.router.get('/auth/signin/:username', this.handleGetUser.bind(this))
		this.router.post('/auth/refresh/:token', this.handleRefreshToken.bind(this))
		this.router.post('/auth/forgot/:username', this.handleForgotPassword.bind(this))
		this.router.post('/auth/reset/:username', this.handleResetPassword.bind(this))
		this.router.delete('/auth/signin/:username', this.handleSignout.bind(this))
		this.router.get('/auth/info', this.handleListUsers.bind(this))
		this.router.get('/auth/info/:username', this.handleGetUser.bind(this))
	}

	getShortHash(value) {
		return crypto.createHash("sha256")
			.update(value)
			.digest("base64")
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')
	}

	generateToken() {
		return this.getShortHash(crypto.randomBytes(32).toString('hex'))
	}

	hashPassword(password) {
		return this.getShortHash(password)
	}

	/**
	 * @param {string} token
	 * @returns {Promise<User | null>} The user instance.
	 */
	async auth() {
		const token = req.headers.authorization?.split(' ')[1]
		return await this.db.auth(token)
	}

	/**
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @returns {Promise<void>}
	 */
	async handleGetUser(req, res) {
		const { username } = req.params
		const token = req.headers.authorization?.split(' ')[1]
		const me = await this.db.auth(token)

		if (!me) {
			return res.status(401).json({ error: "Authorize to get access" })
		}

		const user = await this.db.getUser(username)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		// Root can see all user data except passwords
		if (me.role === 'root') {
			const { passwordHash, verificationCode, resetCode, ...visible } = user
			return res.status(200).json(visible)
		}

		if (user.name === me.name) {
			const { passwordHash, verificationCode, resetCode, resetCodeAt, ...visible } = user
			return res.status(200).json(visible)
		}

		if (user.isPublic) {
			const { passwordHash, verificationCode, resetCode, resetCodeAt, ...visible } = user
			return res.status(200).json(visible)
		}

		res.status(200).json({
			username: user.name,
			email: user.email,
			createdAt: user.createdAt
		})
	}

	async handleSignup(req, res) {
		const { username, password, email } = req.body
		if (!username || !password || !email) {
			return res.status(400).json({ error: 'Missing required fields' })
		}

		const existingUser = await this.db.getUser(username)
		if (existingUser) {
			return res.status(409).json({ error: 'User already exists' })
		}

		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
		const user = new User({
			name: username,
			email,
			passwordHash: this.hashPassword(password),
			verified: false,
			verificationCode,
			createdAt: new Date().toISOString()
		})

		await this.db.saveUser(user)
		res.status(200).json({
			message: 'Verification code sent',
		})
	}

	async handleConfirmSignup(req, res) {
		const { username } = req.params
		const { code } = req.body

		const user = await this.db.getUser(username)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		if (user.verified) {
			return res.status(400).json({ error: 'User already verified' })
		}

		if (user.verificationCode !== code) {
			return res.status(401).json({ error: 'Invalid verification code' })
		}

		user.verified = true
		user.verificationCode = null
		user.updatedAt = new Date().toISOString()

		await this.db.saveUser(user)
		const token = this.generateToken()
		await this.db.updateToken(token, username)

		res.status(200).json({ message: 'Account verified', token })
	}

	async handleDeleteAccount(req, res) {
		const { username } = req.params
		const user = await this.db.getUser(username)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		await this.db.deleteUser(username)
		res.status(200).json({ message: 'Account deleted' })
	}

	async handleSignin(req, res) {
		const { username } = req.params
		const { password } = req.body

		const user = await this.db.getUser(username)
		if (!user) {
			return res.status(404).json({ error: 'Invalid password or username' })
		}

		if (!user.verified) {
			return res.status(403).json({ error: 'Account not verified' })
		}

		if (user.passwordHash !== this.hashPassword(password)) {
			return res.status(401).json({ error: 'Invalid password or username' })
		}

		const token = this.generateToken()
		await this.db.updateToken(token, username)

		res.status(200).json({ token })
	}

	async handleRefreshToken(req, res) {
		const { token } = req.params
		const { replace } = req.body

		const tokenData = this.db.tokens.get(token)
		if (!tokenData) {
			return res.status(404).json({ error: 'Token not found' })
		}

		const newToken = this.generateToken()
		await this.db.updateToken(newToken, tokenData.username)

		if (replace) {
			await this.db.deleteToken(token)
		}

		res.status(200).json({ token: newToken })
	}

	async handleForgotPassword(req, res) {
		const { username } = req.params

		const user = await this.db.getUser(username)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
		user.resetCode = resetCode
		// Use updatedAt instead of resetCodeCreatedAt
		user.updatedAt = new Date()
		await this.db.saveUser(user)

		res.status(200).json({ message: 'Reset code sent' })
	}

	async handleResetPassword(req, res) {
		const { username } = req.params
		const { code, password } = req.body

		const user = await this.db.getUser(username)
		if (!user) {
			/**
			 * @note show the same error to avoid searching for users this way.
			 */
			return res.status(404).json({ error: 'Invalid reset code' })
		}

		if (user.resetCode !== code) {
			return res.status(401).json({ error: 'Invalid reset code' })
		}

		user.passwordHash = this.hashPassword(password)
		user.resetCode = null
		user.updatedAt = new Date()

		// Invalidate all existing tokens
		for (const [token, data] of this.db.tokens.entries()) {
			if (data.username === username) {
				await this.db.deleteToken(token)
			}
		}

		const newToken = this.generateToken()
		await this.db.updateToken(newToken, username)
		await this.db.saveUser(user)

		res.status(200).json({ message: 'Password reset successful', token: newToken })
	}

	async handleSignout(req, res) {
		const { username } = req.params
		const token = req.headers.authorization?.split(' ')[1]

		if (!token) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const tokenData = this.db.tokens.get(token)
		if (!tokenData || tokenData.username !== username) {
			return res.status(401).json({ error: 'Unauthorized' })
		}

		await this.db.deleteToken(token)
		res.status(200).json({ message: 'Logged out successfully' })
	}

	async handleListUsers(req, res) {
		const token = req.headers.authorization?.split(' ')[1]
		const user = await this.db.auth(token)

		if (!user) {
			return res.status(401).json({ error: "Authorize to get access" })
		}

		const users = []
		for (const [key] of this.db.data.entries()) {
			if (!key.endsWith("/info.json")) continue
			users.push(key.split("/").slice(-2)[0])
		}
		res.status(200).json({ users })
	}
}

export default AuthServer

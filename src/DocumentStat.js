class DocumentStat {
	/** @type {number} */
	atimeMs
	/** @type {number} */
	btimeMs
	/** @type {number} */
	blksize
	/** @type {number} */
	blocks
	/** @type {number} */
	ctimeMs
	/** @type {number} */
	dev
	/** @type {number} */
	gid
	/** @type {number} */
	ino
	/** @type {number} */
	mode
	/** @type {number} */
	mtimeMs
	/** @type {number} */
	size
	/** @type {number} */
	nlink
	/** @type {number} */
	rdev
	/** @type {number} */
	uid

	/** @type {boolean} */
	isBlockDevice
	/** @type {boolean} */
	isDirectory
	/** @type {boolean} */
	isFile
	/** @type {boolean} */
	isFIFO
	/** @type {boolean} */
	isSocket
	/** @type {boolean} */
	isSymbolicLink

	/** @type {Error|null} */
	error

	/**
	 * @param {object} props
	 * @param {number} props.atimeMs
	 * @param {number} props.btimeMs
	 * @param {number} props.blksize
	 * @param {number} props.blocks
	 * @param {number} props.ctimeMs
	 * @param {number} props.dev
	 * @param {number} props.gid
	 * @param {number} props.ino
	 * @param {number} props.mode
	 * @param {number} props.mtimeMs
	 * @param {number} props.nlink
	 * @param {number} props.rdev
	 * @param {number} props.size
	 * @param {number} props.uid
	 * @param {boolean} props.isDirectory
	 * @param {boolean} props.isFile
	 * @param {boolean} props.isFIFO
	 * @param {boolean} props.isSocket
	 * @param {boolean} props.isSymbolicLink
	 * @param {Error} [props.error]
	 */
	constructor(props = {}) {
		const {
			atimeMs,
			btimeMs,
			blksize,
			blocks,
			ctimeMs,
			dev,
			gid,
			ino,
			mode,
			mtimeMs,
			size,
			nlink,
			rdev,
			uid,
			isBlockDevice,
			isDirectory,
			isFile,
			isFIFO,
			isSocket,
			isSymbolicLink,
			error = null,
		} = props
		this.atimeMs = atimeMs
		this.btimeMs = btimeMs
		this.blksize = blksize
		this.blocks = blocks
		this.ctimeMs = ctimeMs
		this.dev = dev
		this.gid = gid
		this.ino = ino
		this.mode = mode
		this.mtimeMs = mtimeMs
		this.size = size
		this.nlink = nlink
		this.rdev = rdev
		this.uid = uid
		this.isBlockDevice = "function" === typeof isBlockDevice ? isBlockDevice.bind(props)() : isBlockDevice
		this.isDirectory = "function" === typeof isDirectory ? isDirectory.bind(props)() : isDirectory
		this.isFile = "function" === typeof isFile ? isFile.bind(props)() : isFile
		this.isFIFO = "function" === typeof isFIFO ? isFIFO.bind(props)() : isFIFO
		this.isSocket = "function" === typeof isSocket ? isSocket.bind(props)() : isSocket
		this.isSymbolicLink = "function" === typeof isSymbolicLink ? isSymbolicLink.bind(props)() : isSymbolicLink
		this.error = error
	}
	get atime() {
		return new Date(this.atimeMs)
	}
	get btime() {
		return new Date(this.btimeMs)
	}
	get ctime() {
		return new Date(this.ctimeMs)
	}
	get mtime() {
		return new Date(this.mtimeMs)
	}
	get exists() {
		return Boolean(this.blksize || this.mtimeMs)
	}
	static from(props) {
		if (props instanceof DocumentStat) return props
		return new this(props)
	}
}

export default DocumentStat

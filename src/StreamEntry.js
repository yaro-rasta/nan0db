import DocumentEntry from "./DocumentEntry.js"

/**
 * Represents a stream entry with progress information
 */
class StreamEntry {
	/** @type {DocumentEntry} */
	file
	/** @type {DocumentEntry[]} */
	files
	/** @type {Map<string, DocumentEntry>} */
	dirs
	/** @type {Map<string, DocumentEntry>} */
	top
	/** @type {Map<string, string>} */
	errors
	/** @type {number} */
	progress
	/** @type {object} */
	totalSize

	/**
	 * @param {object} input
	 * @param {DocumentEntry} input.file
	 * @param {DocumentEntry[]} input.files
	 * @param {Map<string, DocumentEntry>} input.dirs
	 * @param {Map<string, DocumentEntry>} input.top
	 * @param {Map<string, string>} input.errors
	 * @param {number} input.progress
	 * @param {object} input.totalSize
	 */
	constructor(input = {}) {
		const {
			file = {},
			files = [],
			dirs = new Map(),
			top = new Map(),
			errors = new Map(),
			progress = 0,
			totalSize = { dirs: 0, files: 0 }
		} = input

		this.file = DocumentEntry.from(file)
		this.files = files.map(f => DocumentEntry.from(f))
		this.dirs = new Map(dirs)
		this.top = new Map(top)
		this.errors = new Map(errors)
		this.progress = Number(progress)
		this.totalSize = totalSize
	}
}

export default StreamEntry

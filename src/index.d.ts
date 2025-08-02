declare module '@nanoweb/db' {
	/**
	 * Base database class with common operations
	 */
	export class DB {
		encoding: string;
		/** @type {Map<string, DocumentEntry>} */
		data: Map<string, DocumentEntry>;
		/** @type {Map<string, DocumentStat>} */
		meta: Map<string, DocumentStat>;
		connected: boolean;
		/** @type {string} */
		root: string;
		/** @type {string} */
		cwd: string;
		/** @type {DB[]} */
		dbs: DB[];

		constructor(input?: {
			root?: string;
			cwd?: string;
			data?: Map<string, DocumentEntry>;
			meta?: Map<string, DocumentStat>;
			connected?: boolean;
			dbs?: DB[];
		});

		/**
		 * Attaches another DB instance
		 * @param {DB} db - Database to attach
		 * @returns {void}
		 */
		attach(db: DB): void;

		/**
		 * Detaches a database
		 * @param {DB} db - Database to detach
		 * @returns {void|string[]}
		 */
		detach(db: DB): void | boolean[];

		/**
		 * Creates a new DB instance with a subset of data
		 * @param {string} uri - URI to extract from current DB
		 * @returns {DB}
		 */
		extract(uri: string): DB;

		/**
		 * Gets file extension from URI
		 * @param {string} uri - Document URI
		 * @returns {string}
		 */
		extname(uri: string): string;

		/**
		 * Resolves relative path to absolute
		 * @note Must be overwritten by platform-specific implementation
		 * @param {string} from - Base directory
		 * @param {string} to - Target directory
		 * @returns {Promise<string>}
		 */
		relative(from: string, to: string): Promise<string>;

		/**
		 * Reads directory contents
		 * @param {string} uri - Directory URI
		 * @param {{ depth?: number, skipStat?: boolean, skipSymbolicLink?: boolean, filter?: (uri: string) => boolean }} options - Read options
		 * @yields {DocumentEntry}
		 * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
		 */
		readDir(uri: string, options: { depth?: number, skipStat?: boolean, skipSymbolicLink?: boolean, filter?: (uri: string) => boolean }): AsyncGenerator<DocumentEntry, void, unknown>;

		/**
		 * Reads a specific branch at given depth
		 * @param {string} uri - URI for the branch
		 * @param {number} [depth] - Depth of read
		 * @returns {AsyncGenerator<DocumentEntry, void, unknown>}
		 */
		readBranch(uri: string, depth?: number): AsyncGenerator<DocumentEntry, void, unknown>;

		/**
		 * Ensures DB is connected
		 * @returns {Promise<void>}
		 */
		requireConnected(): Promise<void>;

		/**
		 * Writes data to a document with overwrite
		 * @param {string} uri - Document URI
		 * @param {string} chunk - Data to write
		 * @returns {Promise<boolean>} Success
		 */
		writeDocument(uri: string, chunk: string): Promise<boolean>;

		/**
		 * Moves a document from one URI to another URI
		 * @param {string} from - Source URI
		 * @param {string} to - Target URI
		 * @returns {Promise<boolean>} Success
		 */
		moveDocument(from: string, to: string): Promise<boolean>;

		/**
		 * Searches for URI matching condition
		 * @param {string | ((key: string, value: any) => boolean)} uri - Search pattern or callback
		 * @param {number} [depth=0] - Maximum depth to search
		 * @yields {string} Full URI path of found documents
		 * @returns {AsyncGenerator<string, void, unknown>}
		 */
		find(uri: string | ((key: string, value: any) => boolean), depth?: number): AsyncGenerator<string, void, unknown>;

		/**
		 * Resolves path segments to absolute path
		 * @note Must be overwritten by platform-specific implementation
		 * @param  {...string[]} args - Path segments
		 * @returns {Promise<string>} Resolved absolute path
		 */
		resolve(...args: string[]): Promise<string>;

		/**
		 * Gets absolute path
		 * @note Must be overwritten by platform-specific implementation
		 * @param  {...string[]} args - Path segments
		 * @returns {Promise<string>} Absolute path
		 */
		absolute(...args: string[]): Promise<string>;

		/**
		 * Disconnect from database
		 * @returns {Promise<void>}
		 */
		disconnect(): Promise<void>;
		/**
		 * Gets document statistics
		 * @param {string} uri - Document URI
		 * @returns {Promise<DocumentStat>}
		 */
		stat(uri: string): Promise<DocumentStat>;

		/**
		 * Push changes to remote storage
		 * @param {string|undefined} [uri] Optional specific URI to save
		 * @returns {Promise<string[]>} Array of saved URIs
		 */
		push(uri?: string): Promise<string[]>;

		/**
		 * Creates DocumentStat for a specific document
		 * @note Must be overwritten by platform-specific implementation
		 * @throws
		 * @param {string} uri - Document URI
		 * @returns {Promise<DocumentStat>}
		 */
		statDocument(uri: string): Promise<DocumentStat>;

		/**
		 * Loads a document
		 * @param {string} uri - Document URI
		 * @param {any} [defaultValue=""] - Default value if document not found
		 * @returns {Promise<any>}
		 */
		loadDocument(uri: string, defaultValue?: any): Promise<any>;

		/**
		 * Saves a document
		 * @param {string} uri - Document URI
		 * @param {any} document - Document data.
		 * @returns {Promise<boolean>}
		 */
		saveDocument(uri: string, document: any): Promise<boolean>;

		/**
		 * Push stream of progress state
		 * @param {string} uri - Starting URI
		 * @param {{
		 *   filter?: (uri: string) => boolean,
		 *   limit?: number,
		 *   sort?: 'name' | 'mtime' | 'size',
		 *   order?: 'asc' | 'desc',
		 *   skipStat?: boolean,
		 *   skipSymbolicLink?: boolean
		 * }} options - Stream options
		 * @yields {StreamEntry} Progress state
		 * @returns {AsyncGenerator<StreamEntry>|undefined}
		 */
		async *findStream(uri: string, options: {
			filter?: (uri: string) => boolean,
			limit?: number,
			sort?: 'name' | 'mtime' | 'size',
			order?: 'asc' | 'desc',
			skipStat?: boolean,
			skipSymbolicLink?: boolean
		}): AsyncGenerator<StreamEntry, void, unknown>;

		/**
		 * Creates a new DB instance from properties if object provided
		 * @param {object|DB} props - Properties or DB instance
		 * @returns {DB}
		 */
		static from(props: object | DB): DB;
	}

	/**
	 * Document entry representation
	 */
	export class DocumentEntry {
		name: string;
		stat: DocumentStat;
		depth: number;
		path: string;
		parent: string;
		fulfilled: boolean;

		constructor(input?: {
			name?: string;
			stat?: DocumentStat;
			depth?: number;
			path?: string;
			parent?: string;
			fulfilled?: boolean;
		});

		/**
		 * @returns {boolean}
		 */
		get isDirectory(): boolean;

		/**
		 * @returns {boolean}
		 */
		get isFile(): boolean;

		/**
		 * @returns {boolean}
		 */
		get isSymbolicLink(): boolean;

		/**
		 * @returns {string}
		 */
		toString(): string;

		/**
		 * Create from plain object or existing instance
		 * @param {object|DocumentEntry} input
		 * @returns {DocumentEntry}
		 */
		static from(input: object | DocumentEntry): DocumentEntry;
	}

	/**
	 * Document statistics
	 */
	export class DocumentStat {
		readonly atimeMs?: number;
		readonly btimeMs?: number;
		readonly blksize?: number;
		readonly blocks?: number;
		readonly ctimeMs?: number;
		readonly dev?: number;
		readonly gid?: number;
		readonly ino?: number;
		readonly mode?: number;
		readonly mtimeMs?: number;
		readonly size?: number;
		readonly nlink?: number;
		readonly rdev?: number;
		readonly uid?: number;
		readonly isBlockDevice?: boolean;
		readonly isDirectory?: boolean;
		readonly isFile?: boolean;
		readonly isFIFO?: boolean;
		readonly isSocket?: boolean;
		readonly isSymbolicLink?: boolean;
		readonly error?: Error;

		constructor(props?: {
			atimeMs?: number;
			btimeMs?: number;
			blksize?: number;
			blocks?: number;
			ctimeMs?: number;
			dev?: number;
			gid?: number;
			ino?: number;
			mode?: number;
			mtimeMs?: number;
			size?: number;
			nlink?: number;
			rdev?: number;
			uid?: number;
			isBlockDevice?: boolean;
			isDirectory?: boolean;
			isFile?: boolean;
			isFIFO?: boolean;
			isSocket?: boolean;
			isSymbolicLink?: boolean;
			error?: Error;
		});

		/** @returns {Date} */
		get atime(): Date;

		/** @returns {Date} */
		get btime(): Date;

		/** @returns {Date} */
		get ctime(): Date;

		/** @returns {Date} */
		get mtime(): Date;

		/** @returns {boolean} */
		get exists(): boolean;

		/**
		 * Returns a new DocumentStat instance from props
		 * @param {object|DocumentStat} props
		 * @returns {DocumentStat}
		 */
		static from(props: object | DocumentStat): DocumentStat;
	}

	/**
	 * Stream entry with progress information
	 */
	export class StreamEntry {
		/** @type {DocumentEntry} */
		file: DocumentEntry;
		/** @type {DocumentEntry[]} */
		files: DocumentEntry[];
		/** @type {Map<string, DocumentEntry>} */
		dirs: Map<string, DocumentEntry>;
		/** @type {Map<string, DocumentEntry>} */
		top: Map<string, DocumentEntry>;
		/** @type {Map<string, string>} */
		errors: Map<string, string>;
		/** @type {number} */
		progress: number;
		/**
		 * @type {{
		 *   dirs: number;
		 *   files: number;
		 * }}
		 */
		totalSize: { dirs: number; files: number };

		constructor(input?: {
			file?: DocumentEntry;
			files?: DocumentEntry[];
			dirs?: Map<string, DocumentEntry>;
			top?: Map<string, DocumentEntry>;
			errors?: Map<string, string>;
			progress?: number;
			totalSize?: { dirs: number; files: number };
		});
	}

	/**
	 * Data manipulation utilities with typed operations
	 */
	export class Data {
		/** @see src/utils/data.js */
		static readonly OBJECT_DIVIDER: string;
		/** @see src/utils/data.js */
		static readonly ARRAY_WRAPPER: string;
		/** @see src/utils/data.js */
		static readonly MAX_DEEP_UNFLATTEN: number;

		/**
		 * Resets the default array wrapper
		 * @returns {void}
		 */
		static resetArrayWrapper(): void;

		/**
		 * Resets the default object divider
		 * @returns {void}
		 */
		static resetObjectDivider(): void;

		/**
		 * Sets a custom array wrapper
		 * @param {string} wrapper - New array wrapper
		 * @returns {void}
		 */
		static setArrayWrapper(wrapper: string): void;

		/**
		 * Sets a custom object divider
		 * @param {string} divider - New object divider
		 * @returns {void}
		 */
		static setObjectDivider(divider: string): void;

		/**
		 * Flattens nested object
		 * @param {Object} obj - Object to flatten
		 * @param {string} [parent=''] - Parent key prefix
		 * @param {Object} [res={}] - Result object
		 * @returns {Object} Flattened object
		 */
		static flatten(obj: object, parent?: string, res?: object): object;

		/**
		 * Finds value by path
		 * @param {string|string[]} path - Path to search for
		 * @param {Object} obj - Object to search
		 * @returns {any} Found value or undefined
		 */
		static find(path: string | string[], obj: object): any;

		/**
		 * Unflattens an object with path keys
		 * @param {Object} data - Flattened object
		 * @returns {Object} Nested object
		 */
		static unflatten(data: object): object;

		/**
		 * Merges objects deeply
		 * @param {Object} target - Target object
		 * @param {Object} source - Source object
		 * @returns {Object} Merged result
		 */
		static merge(target: object, source: object): object;

		/**
		 * Deeply finds a typed value
		 * @param {string[]} path - Path segments
		 * @param {Object} obj - Search object
		 * @param {boolean} [skipScalar=false] - Skip scalar values
		 * @returns {{value: any, path: string[]}} Typed value and path
		 */
		static findValue(path: string[], obj: object, skipScalar?: boolean): { value: any; path: string[] };
	}

	/**
	 * Data utilities re-exports
	 */
	export {
		flatten,
		unflatten,
		merge,
		find as findValue
	} from './utils/data.js';

	/**
	 * Main export - DB class
	 */
	export {
		DB
	} from './DB.js';

	/**
	 * Declare exports for module compatibility
	 */
	export default DB;
}

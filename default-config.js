const $cfg = require("./config");

/**
 * @name ApplicationConfig
 */
const ApplicationConfig = {
	/**
	 * Used for styles of Error reporting
	 * In development mode Errors will be shown in browser (browser errors not implemented yet) and in console
	 * In production mode Errors will be logged just to file if log enabled
	 * @type {Configurations.Deployment}
	 * @default Development
	 */
	deployment: $cfg.Configurations.Deployment.Development,

	/**
	 * For debuging; disable clustering and run app in one debugable process
	 * @default false
	 */
	debugMode: false,

	/**
	 * Protocol setting
	 * If you set HTTPS protocol specify privateKey and certificate paths
	 */
	protocol: {
		/**
		 * @type {Configurations.Protocols}
		 * @default Http
		 */
		protocol: $cfg.Configurations.Protocols.Http,

		/**
		 * Private key path (.key)
		 */
		privateKey: "",

		/**
		 * Certificate path (.crt)
		 */
		certificate: "",

		/**
		 * Or just PFX archive certificate
		 */
		pfx: "",

		/**
		 * Certifice passphrase
		 */
		passphrase: null
	},

	/**
	 * Multi-core support
	 */
	clustering: {
		/**
		 * 0 for automatic clustering driven by number of CPU's cores
		 * @type {number}
		 * @default 0
		 */
		numberOfWorkers: 0
	},

	/**
	 * Enable template cache and define memory limit
	 */
	cache: {
		/**
		 * @type {boolean}
		 * @default true
		 */
		enabled: true,

		// /**
		//  * @default HardDrive
		//  */
		// storage: $cfg.Cache.HardDrive,

		/**
		 * Size limit for templates saved in memory
		 * Jumbo store frequently used templates in memory
		 * @type {number}
		 * @default 10 MB
		 */
		memoryCacheSizeLimit: 10e6
	},

	/**
	 * Session configuration
	 */
	session: {
		/**
		 * Name of cookie which stores users's session ID
		 * @type {string}
		 */
		sessionsCookieName: "JUMBOSESID",

		/**
		 * Length of session's life in days. It'll be deleted from disk after that time
		 * @type {number}
		 * @default 30
		 */
		sessionLifetime: 30,

		/**
		 * Limit size of data saved in memory
		 * Not implemented yet
		 * @type {number}
		 */
		memorySizeLimit: 20e6,

		/**
		 * Disable sessions saving to disk - speed boost
		 * When true, memorySizeLimit is ignored
		 * @type {boolean}
		 * @default false
		 */
		justInMemory: false,
	},

	/**
	 * Enable log and set log level
	 */
	log: {
		/**
		 * @type {boolean}
		 * @default true
		 */
		enabled: true,

		/**
		 * @type {Configurations.LogLevels}
		 * @default Normal
		 */
		level: $cfg.Configurations.LogLevels.Normal
	},

	/**
	 * Maximal allowed number of requests per second. You can limit server stress.
	 * If more than specified request count will come, new requests in rest of one second obtain 429 code.
	 * Static files are counted into this number of requests
	 * @type { Number || null }
	 * @default null
	 */
	maxRequestPerSecond: null,

	/**
	 * Enable prevention of (D)DOS attacks
	 * It internally enable requests monitoring which will count number of requests per IP
	 * If IP makes more request per second new requests from that IP will be refused with code 403.
	 * Requests will be still accepted by server but framework will refuse to continue and save resources which
	 * proccessing of that request can framework take.
	 */
	DOSPrevention: {
		/**
		 * @type {boolean}
		 * @default true
		 */
		enabled: false,

		/**
		 * If you use framework static server and your index page have
		 * more than 100 links (scripts, styles, images etc.) client will be blocked!
		 * @type {number}
		 * @default 100
		 */
		maxRequestPerIP: 100,

		/**
		 * Duration of IP blocking [in seconds]
		 * @type {number}
		 * @default 3600
		 */
		blockTime: 3600
	},

	/**
	 * Allows you to use more languages (defined in URL right after first slash; eg. domain.tld/en/page/article/1)
	 */
	globalization: {
		/**
		 * Allow using languages
		 * @type {boolean}
		 * @default false
		 */
		enabled: false,

		/**
		 * Default language (used for URL without language)
		 * @type {string}
		 * @default en
		 */
		defaultLanguage: "en"
	},

	/**
	 * Maximal size of POST data
	 * @type {number}
	 * @default 5 MB
	 */
	maxPostDataSize: 5e6,

	/**
	 * Enable running tests before application start
	 * Not implemented yet
	 * @type {boolean}
	 * @default true
	 */
	doTestsAfterRun: false,

	// You can define your own settings here,.. it'll be available via global Jumbo.Config
};

module.exports = ApplicationConfig;
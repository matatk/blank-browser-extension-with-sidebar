'use strict'
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chalk = require('chalk')
const merge = require('deepmerge')
const archiver = require('archiver')
const oneSvgToManySizedPngs = require('one-svg-to-many-sized-pngs')
const replace = require('replace-in-file')
const glob = require('glob')
const rollup = require('rollup')
const terser = require('rollup-plugin-terser').terser
const esformatter = require('rollup-plugin-esformatter')

const packageJson = require(path.join('..', 'package.json'))
const extName = packageJson.name
const extVersion = packageJson.version
const buildDir = 'build'
const srcStaticDir = path.join('src', 'static')
const srcAssembleDir = path.join('src', 'assemble')
const srcCodeDir = path.join('src', 'code')
const svgPath = path.join(srcAssembleDir, 'logo.svg')
const pngCacheDir = path.join(buildDir, 'png-cache')
const localeSubPath = path.join('_locales', 'en_GB')
const messagesSubPath = path.join(localeSubPath, 'messages.json')

const validBrowsers = Object.freeze([
	'firefox',
	'chrome',
	'opera',
	'edge'
])
const buildTargets = Object.freeze(validBrowsers.concat(['all']))

const browserPngSizes = Object.freeze({
	'firefox': [
		18,  // Firefox (toolbar)
		32,  // Firefox (menu panel) + Chrome (Windows)
		36,  // Firefox (toolbar x2)
		48,  // Both (general)
		64,  // Firefox (menu panel x2)
		96   // Firefox (general x2)
	],
	'chrome': [
		16,  // Chrome (favicon)
		19,  // Chrome (toolbar)
		32,  // Chrome (Windows) + Firefox (menu panel)
		38,  // Chrome (tooblar x2)
		48,  // Both   (general)
		128  // Chrome (store)
	],
	'opera': [
		// https://dev.opera.com/extensions/manifest/#icons
		// https://dev.opera.com/extensions/browser-actions/
		16,  // Icon
		19,  // Browser action
		38,  // Browser action
		48,  // Icon
		128  // Icon
	],
	'edge': [
		// https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/design
		20,  // Normal browser action
		40,  // 2x browser action
		24,  // Management UI
		48,  // 2x Management UI
		44,  // Windows UI (App List, Settings -> System -> Apps & features
		50,  // Packaging requirement (not visible anywhere)
		150  // Icon for Windows Store
	]
})

const linters = Object.freeze({
	'firefox': lintFirefox
})

let testMode = false	// are we building a test (alpha/beta) version?


function doReplace(files, from, to, message) {
	try {
		const changes = replace.sync({
			'files': files,
			'from': from,
			'to': to
		})
		ok(message + ' in:', changes.join(', '))
	} catch (err) {
		error('Error occurred:', err)
	}
}


function ok() {
	const argStrings = [...arguments].map(x => String(x))
	console.error(chalk.green.apply(this, ['✔'].concat(argStrings)))
}


function error() {
	const argStrings = [...arguments].map(x => JSON.stringify(x, null, 2))
	console.error(chalk.bold.red.apply(this, ['✖'].concat(argStrings)))
	process.exit(42)
}


// Log the start of a new step (styled)
function logStep(name) {
	console.log(chalk.underline(name + '...'))
}


// First user argument is the name of a browser (or 'all').
// Second user argument is (optionally) 'test' to signify a test release.
function checkBuildMode() {
	const browser = process.argv[2]
	testMode = process.argv[3] === 'test' ? true : false

	if (!buildTargets.includes(browser)) {
		error(`Invalid build mode requested: expected one of [${buildTargets}] but received '${browser}'`)
	}

	if (testMode && browser !== 'chrome') {
		error('Test build requested for browser(s) other than Chrome. This is not advisable: e.g. for Firefox, a version number such as "2.1.0alpha1" can be set instead and the extension uploaded to the beta channel. Only Chrome needs a separate extension listing for test versions.')
	}

	return browser === 'all' ? validBrowsers : [browser]
}


// Return path for extension in build folder
function pathToBuild(browser) {
	if (validBrowsers.includes(browser)) {
		if (testMode) {
			return path.join(buildDir, browser + '-test')
		}
		return path.join(buildDir, browser)
	}

	error(`pathToBuild: invalid browser ${browser} given`)
}


async function flattenCode(browser) {
	logStep('Flattening JavaScript code')

	const ioPairsAndGlobals = [{
		input: path.join(srcCodeDir, '_background.js'),
		output: path.join(pathToBuild(browser), 'background.js')
	}, {
		input: path.join(srcCodeDir, '_content.js'),
		output: path.join(pathToBuild(browser), 'content.js')
	}, {
		input: path.join(srcCodeDir, '_options.js'),
		output: path.join(pathToBuild(browser), 'options.js')
	}, {
		input: path.join(srcCodeDir, '_gui.js'),
		output: path.join(pathToBuild(browser), 'popup.js'),
		globals: { INTERFACE: 'popup' }
	}]

	if (browser === 'firefox' || browser === 'opera') {
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_gui.js'),
			output: path.join(pathToBuild(browser), 'sidebarPanel.js'),
			globals: { INTERFACE: 'sidebar' }
		})
	}

	if (browser === 'firefox' || browser === 'chrome' || browser === 'opera') {
		// Root DevTools HTML page script
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_devtools.js'),
			output: path.join(pathToBuild(browser), 'devtools.js'),
			globals: { INTERFACE: 'devtools' }
		})

		// User-facing DevTools panel
		ioPairsAndGlobals.push({
			input: path.join(srcCodeDir, '_gui.js'),
			output: path.join(pathToBuild(browser), 'devtoolsPanel.js'),
			globals: { INTERFACE: 'devtools' }
		})
	}

	// Now create an array of full bundle options to pass to rollup. Each
	// element of these specifies all the common rollup and terser options.

	const bundleOptions = []

	for (const ioPair of ioPairsAndGlobals) {
		const bundleOption = {}

		const defines = {
			BROWSER: browser
		}

		for (const global in ioPair.globals) {
			defines[global] = ioPair.globals[global]
		}

		bundleOption.input = {
			input: ioPair.input,
			plugins: [terser({
				mangle: false,
				compress: {
					defaults: false,
					global_defs: defines,  // eslint-disable-line camelcase
					conditionals: true,
					dead_code: true,       // eslint-disable-line camelcase
					evaluate: true,
					side_effects: true,    // eslint-disable-line camelcase
					switches: true,
					unused: true,
					passes: 2  // stops stray "firefox" string in compatibility
				},
				output: {
					beautify: true,
					braces: true,
					comments: true
					// Others may be relevant: https://github.com/fabiosantoscode/terser/issues/92#issuecomment-410442271
				}
			}),
			esformatter()]
		}

		bundleOption.output = {
			file: ioPair.output,
			format: 'iife'
		}

		bundleOptions.push(bundleOption)
	}

	// Run each bundle through rollup, terser and esformatter.

	for (const options of bundleOptions) {
		await rollup.rollup(options.input)
			.then(bundle => {
				bundle.write(options.output)
			})
			.catch(error => {
				console.error(error)
				throw Error('there was an error')
			})
	}
}


function copyStaticFiles(browser) {
	logStep('Copying static files')
	fse.copySync(srcStaticDir, pathToBuild(browser))

	if (browser === 'chrome' || browser === 'edge') {
		doReplace(
			path.join(pathToBuild(browser), '*.html'),
			/<!-- ui -->[\s\S]*?<!-- \/ui -->\s*/g,
			'',
			'Removed UI options')
		doReplace(
			path.join(pathToBuild(browser), '*.css'),
			/\/\* ui \*\/[\s\S]*?\/\* \/ui \*\/\s*/g,
			'',
			'Removed UI styles')
	}
}


function copyGuiFiles(browser) {
	logStep('Copying root GUI HTML to create the popup and other bits')

	function copyOneGuiFile(destination) {
		fs.copyFileSync(
			path.join(srcAssembleDir, 'gui.html'),
			path.join(pathToBuild(browser), `${destination}.html`))

		doReplace(
			path.join(pathToBuild(browser), `${destination}.html`),
			'GUIJS',
			`${destination}.js`,
			`Included ${destination} code`)
	}

	copyOneGuiFile('popup')

	if (browser === 'firefox' || browser === 'opera') {
		copyOneGuiFile('sidebarPanel')
	}

	if (browser === 'firefox' || browser === 'chrome' || browser === 'opera') {
		copyOneGuiFile('devtoolsPanel')
	}
}


function mergeMessages(browser) {
	logStep('Merging messages JSON files')
	const common = path.join(srcAssembleDir, 'commonMessages.json')
	const destinationDir = path.join(pathToBuild(browser), localeSubPath)
	const destinationFile = path.join(pathToBuild(browser), messagesSubPath)

	fse.ensureDirSync(destinationDir)

	if (browser === 'firefox' || browser === 'opera') {
		const ui = path.join(srcAssembleDir, 'interfaceMessages.json')
		const commonJson = require('../' + common)  // TODO check Windows
		const uiJson = require('../' + ui)          // TODO check Windows
		const merged = merge(commonJson, uiJson)
		fs.writeFileSync(destinationFile, JSON.stringify(merged, null, 2))
	} else {
		// Instead of just copying the common file, write it in the same way as
		// the merged one, so that diffs between builds are minimal.
		const commonJson = require('../' + common)
		fs.writeFileSync(destinationFile, JSON.stringify(commonJson, null, 2))
	}

	ok(`messages.json written for ${browser}.`)
}


function checkMessages(browser) {
	logStep('Checking for unused messages (except role names)')

	const translationsFile = path.join(pathToBuild(browser), messagesSubPath)
	const messages = JSON.parse(fs.readFileSync(translationsFile))
	const files = glob.sync(path.join('src', '**'), {
		nodir: true,
		ignore: ['**/*Messages.json']
	})
	const messageSummary = {}	// count usages of each message

	for (const messageName in messages) {
		messageSummary[messageName] = 0

		for (const file of files) {
			messageSummary[messageName] +=
				(fs.readFileSync(file).toString().match(
					new RegExp(messageName, 'g')) || []).length
		}

		if (messageName.startsWith('role')) {
			// The role names' calls are constructed dynamically (and are
			// probably OK).
			messageSummary[messageName] = '(not checked)'
		}
	}

	if (Object.values(messageSummary).some((x) => x === 0)) {
		error('Some messages are unused:', messageSummary)
	}
}


function mergeManifest(browser) {
	logStep('Merging manifest.json')
	const common = path.join('..', srcAssembleDir, 'manifest.common.json')
	const extra = path.join('..', srcAssembleDir, `manifest.${browser}.json`)
	const commonJson = require(common)
	const extraJson = require(extra)

	// For pre-2.0.0 deepmerge behaviour...
	// https://github.com/KyleAMathews/deepmerge#examples (and scroll a bit)
	const emptyTarget = value => Array.isArray(value) ? [] : {}
	const clone = (value, options) => merge(emptyTarget(value), value, options)

	function legacyArrayMerge(target, source, options) {
		const destination = target.slice()

		source.forEach(function(e, i) {
			if (typeof destination[i] === 'undefined') {
				const cloneRequested = options.clone !== false
				const shouldClone = cloneRequested && options.isMergeableObject(e)
				destination[i] = shouldClone ? clone(e, options) : e
			} else if (options.isMergeableObject(e)) {
				destination[i] = merge(target[i], e, options)
			} else if (target.indexOf(e) === -1) {
				destination.push(e)
			}
		})
		return destination
	}

	// Merging this way 'round just happens to make it so that, when merging
	// the arrays of scripts to include, the compatibility one comes first.
	const merged = merge(extraJson, commonJson, { arrayMerge: legacyArrayMerge })
	merged.version = extVersion
	fs.writeFileSync(
		path.join(pathToBuild(browser), 'manifest.json'),
		JSON.stringify(merged, null, 2)
	)

	ok(`manifest.json written for ${browser}.`)
}


// Get PNG files from the cache (which will generate them if needed)
function getPngs(converter, browser) {
	logStep('Generating/copying in PNG files')
	browserPngSizes[browser].forEach((size) => {
		const pngPath = converter.getPngPath(size)
		const basename = path.basename(pngPath)
		fse.copySync(pngPath, path.join(pathToBuild(browser), basename))
	})
}


function renameTestVersion(browser) {
	logStep('Changing test version name in messages.json')
	doReplace(
		path.join(pathToBuild(browser), '**', 'messages.json'),
		/"WRITE THE EXPANDED STRING NAME OF EXTENSION HERE"/g,  // FIXME
		'"EXTENSION_NAME (test version)"',
		'Suffixed name to indicate test version')
}


function zipFileName(browser) {
	const test = testMode ? '-test' : ''
	return extName + '-' + extVersion + test + '-' + browser + '.zip'
}


async function makeZip(browser) {
	logStep('Createing ZIP file')
	const outputFileName = zipFileName(browser)
	const output = fs.createWriteStream(outputFileName)
	const archive = archiver('zip')

	archive.on('error', function(err) {
		throw err
	})

	archive.pipe(output)
	archive.directory(pathToBuild(browser), '')
	await archive.finalize().then(() => {
		ok(archive.pointer() + ' total bytes for ' + outputFileName)
	})
}


async function lint(browser) {
	if (browser in linters) {
		await linters[browser]()
	}
}


async function lintFirefox() {
	const linter = require('addons-linter').createInstance({
		config: {
			_: [zipFileName('firefox')],
			logLevel: process.env.VERBOSE ? 'debug' : 'fatal',
		}
	})

	await linter.run().catch((err) => {
		error(err)
	})
}


async function main() {
	console.log(chalk.bold(`Builing ${extName} ${extVersion}...`))
	const browsers = checkBuildMode()
	const sp = oneSvgToManySizedPngs(pngCacheDir, 'logo', svgPath)
	const testModeMessage = testMode ? ' (test version)' : ''

	for (const browser of browsers) {
		console.log()
		logStep(chalk.bold(`Building for ${browser}${testModeMessage}`))
		await flattenCode(browser)
		copyStaticFiles(browser)
		copyGuiFiles(browser)
		mergeMessages(browser)
		checkMessages(browser)
		mergeManifest(browser)
		getPngs(sp, browser)
		if (testMode) {
			renameTestVersion(browser)
		}
		await makeZip(browser)
		await lint(browser)
	}
}


main()

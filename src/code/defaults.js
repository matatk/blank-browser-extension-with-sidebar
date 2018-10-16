//
// User preferences
//

export const defaultDebugSettings = Object.freeze({
	debugInfo: false
})

export const defaultInterfaceSettings = Object.freeze({
	interface: 'popup'
})

let _defaultSettings

switch (BROWSER) {
	case 'firefox':
	case 'opera':
		_defaultSettings = Object.freeze(Object.assign({},
			// TODO put other default settings here
			defaultDebugSettings,
			defaultInterfaceSettings))
		break
	case 'chrome':
	case 'edge':
		_defaultSettings = Object.freeze(Object.assign({},
			// TODO put other default settings here
			defaultDebugSettings))
		break
	default:
		throw Error(`EXTENSION_NAME: invalid browser ${BROWSER} given.`)
}

export const defaultSettings = _defaultSettings


//
// Dismissal state of user interface messages
//

let _dismissalStates

if (BROWSER === 'firefox' || BROWSER === 'opera') {
	_dismissalStates = Object.freeze({
		dismissedSidebarNotAlone: false
	})
}

export const dismissalStates = _dismissalStates

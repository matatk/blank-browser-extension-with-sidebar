import './compatibility'
import contentScriptInjector from './contentScriptInjector'
import specialPages from './specialPages'
import { defaultInterfaceSettings } from './defaults'

console.log('Hello from EXTENSION_NAME background script')


if (BROWSER === 'firefox' || BROWSER === 'opera') {
	//
	// Sidebar handling
	//

	// If the user has elected to use the sidebar, the pop-up is disabled, and
	// we will receive events, which we can then use to open the sidebar.
	//
	// Have to do this in a really hacky way at the moment due to
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1438465
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1398833
	//
	// Also Opera doesn't have open().

	// eslint-disable-next-line no-inner-declarations
	function openSidebarWhenClicked() {
		browser.browserAction.onClicked.removeListener(openSidebarWhenClicked)
		browser.sidebarAction.open()
		browser.browserAction.onClicked.addListener(closeSidebarWhenClicked)
	}

	// eslint-disable-next-line no-inner-declarations
	function closeSidebarWhenClicked() {
		browser.browserAction.onClicked.removeListener(closeSidebarWhenClicked)
		browser.sidebarAction.close()
		browser.browserAction.onClicked.addListener(openSidebarWhenClicked)
	}

	// eslint-disable-next-line no-inner-declarations
	function switchInterface(mode) {
		switch (mode) {
			case 'sidebar':
				browser.browserAction.setPopup({ popup: '' })

				if (BROWSER === 'firefox') {
					// The sidebar will be closed because we are setting
					// "open_at_install" to false. It might be nice to actually
					// show the sidebar at install, but isOpen() isn't usable
					// because it breaks propogation of the user input event.
					browser.browserAction.onClicked.addListener(
						openSidebarWhenClicked)
				}
				break
			case 'popup':
				// On Firefox this could be set to null to return to the
				// default popup. However Chrome/Opera doesn't support this.
				browser.browserAction.setPopup({ popup: 'popup.html' })

				if (BROWSER === 'firefox') {
					browser.browserAction.onClicked.removeListener(
						openSidebarWhenClicked)
					browser.browserAction.onClicked.removeListener(
						closeSidebarWhenClicked)
				}
				break
			default:
				throw Error(`Invalid interface "${mode}" given`)
		}
	}

	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		switchInterface(items.interface)
	})

	browser.storage.onChanged.addListener(function(changes) {
		if (changes.hasOwnProperty('interface')) {
			switchInterface(changes.interface.newValue)
		}
	})

	// When the user moves between tabs, the sidebar needs updating. This
	// message will be sent even when the primary interface is set to the
	// pop-up, because we've no way to know if the sidebar is open or not; if
	// it's open it should update. If it is open, but the primary interface is
	// the pop-up, a note will be inserted (by the popup code) to alert the
	// user to the potential misconfiguration.
	browser.tabs.onActivated.addListener(function() {
		browser.runtime.sendMessage({
			request: 'update-sidebar'
		})
	})
}


//
// Install and update
//

browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === 'install' || details.reason === 'update') {
		// Don't inject the content script on Firefox
		if (BROWSER !== 'firefox') {
			contentScriptInjector()
		}
	}
})


//
// Guard against browser action being errantly enabled
//

// When the extension is loaded, if it's loaded into a page that is not an
// HTTP(S) page, then we need to disable the browser action button.  This is
// not done by default on Chrome or Firefox.
browser.tabs.query({}, function(tabs) {
	for (const i in tabs) {
		checkBrowserActionState(tabs[i].id, tabs[i].url)
	}
})

function checkBrowserActionState(tabId, url) {
	if (/^(https?|file):\/\//.test(url)) {  // TODO DRY
		for (const specialPage of specialPages) {
			if (specialPage.test(url)) {
				browser.browserAction.disable(tabId)
				return
			}
		}
		browser.browserAction.enable(tabId)
	} else {
		browser.browserAction.disable(tabId)
	}
}

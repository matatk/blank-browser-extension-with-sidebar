import './compatibility'
import { defaultInterfaceSettings, dismissalStates } from './defaults'

console.log(`Hello from EXTENSION_NAME ${INTERFACE} script`)

function makeButton(onClick, nameMessage) {
	const button = document.createElement('button')
	button.className = 'browser-style'
	button.appendChild(document.createTextNode(
		browser.i18n.getMessage(nameMessage)))
	button.onclick = onClick
	return button
}

if (INTERFACE === 'sidebar') {
	//
	// Sidebar - Live updates and Preferences note
	//

	// The sidebar can be open even if the user has chosen the pop-up as the
	// primary GUI. In this case, a note can be created in the sidebar to
	// explain this to the user.
	const noteId = 'note'

	function createNote() {  // eslint-disable-line no-inner-declarations
		browser.storage.sync.get(dismissalStates, function(items) {
			if (!items.dismissedSidebarNotAlone) {
				const para = document.createElement('p')
				para.appendChild(document.createTextNode(
					browser.i18n.getMessage('hintSidebarIsNotPrimary')))

				const optionsButton = makeButton(
					function() {
						browser.runtime.openOptionsPage()
					},
					'hintSidebarIsNotPrimaryOptions')

				const dismissButton = makeButton(
					function() {
						browser.storage.sync.set({
							dismissedSidebarNotAlone: true
						}, function() {
							removeNote()
						})
					},
					'hintDismiss')

				// Contains buttons; allows for them to be flexbox'd
				const buttons = document.createElement('div')
				buttons.appendChild(optionsButton)
				buttons.appendChild(dismissButton)

				const note = document.createElement('div')
				note.id = noteId
				note.appendChild(para)
				note.appendChild(buttons)

				document.body.insertBefore(note, document.body.firstChild)
			}
		})
	}

	function removeNote() {  // eslint-disable-line no-inner-declarations
		const message = document.getElementById(noteId)
		if (message) message.remove()
	}

	// Should we create the note in the sidebar when it opens?
	browser.storage.sync.get(defaultInterfaceSettings, function(items) {
		if (items.interface === 'popup') {
			createNote()
		}
	})

	// What about if the sidebar is open and the user changes their preference?
	browser.storage.onChanged.addListener(function(changes) {
		if (changes.hasOwnProperty('interface')) {
			switch (changes.interface.newValue) {
				case 'sidebar': removeNote()
					break
				case 'popup': createNote()
					break
				default:
					throw Error(`Unknown interface type "${changes.interface.newValue}`)
			}
		}
	})
}


//
// Management
//

// FIXME https://github.com/matatk/landmarks/issues/192
document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('heading').innerText =
		browser.i18n.getMessage('popupHeading')
})

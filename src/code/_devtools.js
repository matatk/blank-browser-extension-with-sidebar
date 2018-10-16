import './compatibility'

console.log('Hello from EXTENSION_NAME DevTools root page script')

browser.devtools.panels.create(
	'EXTENSION_NAME',
	'logo-32.png',
	'devtoolsPanel.html')

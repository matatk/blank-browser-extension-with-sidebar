'use strict'
const path = require('path')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const testCodePath = path.join(__dirname, 'test-code-in-harness-backgroundGreener.js')

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

exports['test the background is not already green'] = function(assert) {
	const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>')
	assert.ok(
		dom.window.document.body.style.backgroundColor !== 'green',
		'Background is not green at the start')
}

exports['test the background is made green'] = function(assert) {
	const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>')
	const BackgroundGreener = require(testCodePath)
	new BackgroundGreener(dom.window.document)
	assert.ok(
		dom.window.document.body.style.backgroundColor === 'green',
		'Background is turned green')
}

if (module === require.main) {
	require('test').run(exports)
}

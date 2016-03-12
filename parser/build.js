'use strict';

const peg = require('pegjs');
const fs = require('fs');
const path = require('path');
const destination = path.join(__dirname, '..', 'lib', 'parser.js');
const grammarFilename = path.join(__dirname, 'dust.pegjs');
const wrapperFilename = path.join(__dirname, 'wrapper.js');

const PARSER_SOURCE_PLACEHOLDER = '\'PARSER_CODE_HERE\'';
const SUCCESS_MESSAGE = 'Parser has been successfully built';

const PARSER_OPTIONS = {
	cache: false,
	trackLineAndColumn: true,
	output: 'source'
};

const readFile = (fileName, encoding) => new Promise((fulfill, reject) => {
	fs.readFile(fileName, encoding, (error, result) => {
		if (error) {
			reject(error);
			return;
		}
		fulfill(result);
	});
});

const writeFile = (fileName, content) => new Promise((fulfill, reject) => {
	fs.writeFile(fileName, content, (error, result) => {
		if (error) {
			reject(error);
			return;
		}
		fulfill(result);
	});
});

Promise.all([
	readFile(grammarFilename, 'utf8'),
	readFile(wrapperFilename, 'utf8')
])
	.then(files => {
		const parser = peg.buildParser(files[0], PARSER_OPTIONS);
		const wrapped = files[1].replace(PARSER_SOURCE_PLACEHOLDER, parser);
		return fs.writeFile(destination, wrapped);
	})

	/* eslint no-console: 0 */
	.then(() => console.log(SUCCESS_MESSAGE))
	.catch(reason => console.error(reason));

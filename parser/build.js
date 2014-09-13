/*
 * catberry-dust
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-dust's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry-dust that are not externally
 * maintained libraries.
 */

'use strict';

var peg = require('pegjs'),
	Promise = require('promise'),
	fs = require('fs'),
	path = require('path'),
	destination = path.join(__dirname, '..', 'lib', 'parser.js'),
	grammarFilename = path.join(__dirname, 'dust.pegjs'),
	wrapperFilename = path.join(__dirname, 'wrapper.js');

var PARSER_SOURCE_PLACEHOLDER = '\'PARSER_CODE_HERE\'',
	SUCCESS_MESSAGE = 'Parser has been successfully built';

var PARSER_OPTIONS = {
	cache: false,
	trackLineAndColumn: true,
	output: 'source'
};

Promise.all([
	Promise.denodeify(fs.readFile)(grammarFilename, 'utf8'),
	Promise.denodeify(fs.readFile)(wrapperFilename, 'utf8')
])
	.then(function (files) {
		var parser = peg.buildParser(files[0], PARSER_OPTIONS),
			wrapped = files[1].replace(PARSER_SOURCE_PLACEHOLDER, parser);
		return Promise.denodeify(fs.writeFile)(destination, wrapped);
	})
	.then(function () {
		console.log(SUCCESS_MESSAGE);
	}, function (reason) {
		console.error(reason);
	});


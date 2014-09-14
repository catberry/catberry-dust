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

module.exports = TemplateManager;

var util = require('util'),
	vm = require('vm'),
	compiler = require('compiler'),
	TemplateManagerBase = require('../base/TemplateManagerBase');

util.inherits(TemplateManager, TemplateManagerBase);

/**
 * Creates new instance of template manager.
 * @constructor
 */
function TemplateManager() {
	TemplateManagerBase.call(this);
	this._vmContext = vm.createContext({storage: this._storage});
}

/**
 * Current virtual machine context.
 * @type {Object}
 * @private
 */
TemplateManager.prototype._vmContext = null;

/**
 * Compiles template source into function source.
 * @param {string} source Dust template source.
 * @returns {string}
 */
TemplateManager.prototype.compile = function (source) {
	return compiler.compile(source);
};

/**
 * Register compiled function.
 * @param {string} name Template name.
 * @param {string} compiled Compiled function source.
 */
TemplateManager.prototype.registerCompiled = function (name, compiled) {
	var wrapped = 'storage[' + name + '] = ' + compiled;
	vm.runInContext(wrapped, this._vmContext, name);
};
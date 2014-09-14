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

module.exports = HelperManager;

var builtInHelpers = require('../helpers');

/**
 * Creates new instance of helper manager.
 * @constructor
 */
function HelperManager() {
	this._helpers = Object.create(builtInHelpers);
}

/**
 * Current set of helpers.
 * @type {null}
 * @private
 */
HelperManager.prototype._helpers = null;

/**
 * Adds helper ot helpers set.
 * @param {string} name Helper name.
 * @param {Function} helper Helper function.
 */
HelperManager.prototype.addHelper = function (name, helper) {
	if (name in this._helpers) {
		throw new Error('Such helper already exists');
	}

	if (typeof(helper) !== 'function') {
		throw new Error('Helper should be a function');
	}
	this._helpers[name] = helper;
};

/**
 * Remove helper from helper set.
 * @param {string} name Helper name.
 */
HelperManager.prototype.removeHelper = function (name) {
	delete this._helpers[name];
};

/**
 * Invoke helper.
 * @param {string} name Helper name.
 * @param {Chunk} chunk Current stream chunk.
 * @param {Context} context Current rendering context.
 * @param {Array} bodies Inner bodies.
 * @param {Object} params Helper params.
 * @returns {Chunk}
 */
HelperManager.prototype.invoke =
	function (name, chunk, context, bodies, params) {
		if (!(name in this._helpers)) {
			throw new Error('Helper "' + name + '" not found');
		}

		return this._helpers[name](chunk, context, bodies, params);
	};
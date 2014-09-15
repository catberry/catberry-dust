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

module.exports = FilterManager;

var util = require('util'),
	builtInFilters = require('../filters');

/**
 * Creates new instance of filter manager.
 * @constructor
 */
function FilterManager() {
	this._filters = Object.create(builtInFilters);
}

/**
 * Current filters set.
 * @type {Object}
 * @private
 */
FilterManager.prototype._filters = null;

/**
 * Adds filter to filters set.
 * @param {string} name Filter name.
 * @param {Function} filter Filter function.
 */
FilterManager.prototype.add = function (name, filter) {
	if (name in this._filters) {
		throw new Error('Such filter already exists');
	}

	if (typeof(filter) !== 'function') {
		throw new Error('Filter should be a function');
	}
	this._filters[name] = filter;
};

/**
 * Removes filter from filters set.
 * @param {string} name Filter name.
 */
FilterManager.prototype.remove = function (name) {
	delete this._filters[name];
};

/**
 * Filters specified value.
 * @param {string} value Value to filer.
 * @param {Array} filters Filter names to apply.
 * @returns {string} Filtered value.
 */
FilterManager.prototype.filterValue = function (value, filters) {
	if (util.isArray(filters) && filters.length > 0) {
		filters.forEach(function (filterName) {
			value = this._filters[filterName](value);
		}, this);
	}
	// if filters list is empty apply the h filter by default to escape HTML
	value = this._filters.h(value);
	return value;
};
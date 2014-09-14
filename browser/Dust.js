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

var Stub = require('../lib/Stub'),
	Context = require('../lib/Context'),
	Promise = require('promise'),
	TemplateManager = require('../lib/managers/TemplateManager'),
	HelperManager = require('../lib/managers/HelperManager'),
	FilterManager = require('../lib/managers/FilterManager');

module.exports = Dust;

/**
 * Creates new instance of Dust template engine.
 * @param {Logger} $logger Logger.
 * @constructor
 */
function Dust($logger) {
	this.helperManager = new HelperManager();
	this.filterManager = new FilterManager();
	this.templateManager = new TemplateManager();
	this.logger = $logger || this.logger;
}

/**
 * Current helper manager.
 * @type {HelperManager}
 */
Dust.prototype.helperManager = null;

/**
 * Current filter manager.
 * @type {FilterManager}
 */
Dust.prototype.filterManager = null;

/**
 * Current template manager.
 * @type {TemplateManager}
 */
Dust.prototype.templateManager = null;

/**
 * Current logger.
 * @type {Logger|Object}
 */
Dust.prototype.logger = {
	warn: function () {},
	error: function () {}
};

/**
 * Renders template.
 * @param {string} name Template name.
 * @param {Object} context Data context.
 * @returns {Promise} Promise for content.
 */
Dust.prototype.render = function (name, context) {
	var self = this;
	return new Promise(function (fulfill, reject) {
		var callback = function (error, content) {
			if (error) {
				reject(error);
				return;
			}
			fulfill(content);
		};
		var stub = new Stub(self, callback),
			chunk = stub.head,
			context = Context.wrap(context, name, self);

		self.templateManager
			.invoke(name, chunk, context)
			.end();
	});
};
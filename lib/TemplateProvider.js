'use strict';

const TemplateProviderBase = require('../browser/TemplateProvider');

class TemplateProvider extends TemplateProviderBase {

	/**
	 * Compiles dust template source to function.
	 * @param {string} source Dust template source.
	 * @returns {string} Compiled function source.
	 */
	compile(source) {
		return this._dust.templateManager.compile(source);
	}

	/**
	 * Renders template to stream with data context.
	 * @param {string} name Template name.
	 * @param {Object} context Data context.
	 * @returns {DustReadable} Content stream.
	 */
	getStream(name, context) {
		return this._dust.getStream(name, context);
	}
}

module.exports = TemplateProvider;

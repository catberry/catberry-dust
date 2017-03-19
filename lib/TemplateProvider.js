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
	 * Determines if the template provider can compile the template.
	 * @param {string} filename Absolute path to the template file.
	 * @param {string} templateString Template content.
	 * @returns {boolean} true if the provider is able to compile the template.
	 */
	isTemplateSupported(filename, templateString) {
		return /(\.dust)$/i.test(filename);
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

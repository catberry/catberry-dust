'use strict';

const TemplateManagerBase = require('../lib/base/TemplateManagerBase');

class TemplateManager extends TemplateManagerBase {

	/**
	 * Registers compiled template into storage.
	 * @param {string} name Template name.
	 * @param {string} compiled Compiled source of template.
	 */
	registerCompiled(name, compiled) {
		name = this.escapeName(name);
		const wrapped = `this._storage['${name}'] = ${compiled}`;
		try {

			/* eslint no-eval: 0 */
			eval(wrapped);
		} catch (e) {
			e.message = `${e.message} (${name})\n${compiled}`;
			throw e;
		}
	}
}

module.exports = TemplateManager;

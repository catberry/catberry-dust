'use strict';

const vm = require('vm');
const compiler = require('../compiler');
const TemplateManagerBase = require('../base/TemplateManagerBase');

class TemplateManager extends TemplateManagerBase {

	/**
	 * Creates new instance of template manager.
	 */
	constructor() {
		super();

		/**
		 * Current virtual machine context.
		 * @type {Object}
		 * @private
		 */
		this._vmContext = vm.createContext({
			storage: this._storage
		});
	}

	/**
	 * Compiles template source into function source.
	 * @param {string} source Dust template source.
	 * @returns {string} Compiled template source.
	 */
	compile(source) {
		return compiler.compile(source);
	}

	/**
	 * Register compiled function.
	 * @param {string} name Template name.
	 * @param {string} compiled Compiled function source.
	 */
	registerCompiled(name, compiled) {
		name = this.escapeName(name);
		const wrapped = `storage['${name}'] = ${compiled}`;
		const storage = this._storage;
		try {
			vm.runInContext(wrapped, this._vmContext, name);
		} catch (e) {
			e.message = `${e.message} (${name})\n${compiled}`;
			throw e;
		}
	}
}

module.exports = TemplateManager;

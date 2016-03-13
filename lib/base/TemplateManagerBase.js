'use strict';

class TemplateManagerBase {

	/**
	 * Creates new instance of template manager.
	 */
	constructor() {

		/**
		 * Current template storage
		 * @type {Object}
		 * @protected
		 */
		this._storage = Object.create(null);
	}

	/**
	 * Removes template from storage.
	 * @param {string} name Template name.
	 */
	remove(name) {
		delete this._storage[name];
	}

	/**
	 * Invoke template function.
	 * @param {string} name Name of template.
	 * @param {Chunk} chunk Stream chunk.
	 * @param {Context} context Rendering context.
	 * @returns {Chunk} First chunk.
	 */
	invoke(name, chunk, context) {
		if (!(name in this._storage)) {
			throw new Error(`Template with name "${name}" not found`);
		}

		return this._storage[name](chunk, context);
	}

	/**
	 * Escape template name.
	 * @param {string} name Template name.
	 * @returns {string} Safe template name.
	 */
	escapeName(name) {
		if (typeof (name) !== 'string') {
			throw new Error('Template name should be a string');
		}
		return name.replace(/\'/g, '\\\'');
	}
}

module.exports = TemplateManagerBase;

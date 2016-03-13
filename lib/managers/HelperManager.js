'use strict';

const builtInHelpers = require('../helpers');

class HelperManager {

	/**
	 * Creates new instance of helper manager.
	 */
	constructor() {

		/**
		 * Current set of helpers.
		 * @type {null}
		 * @private
		 */
		this._helpers = Object.create(builtInHelpers);
	}

	/**
	 * Adds helper ot helpers set.
	 * @param {string} name Helper name.
	 * @param {Function} helper Helper function.
	 */
	add(name, helper) {
		if (name in this._helpers) {
			throw new Error('Such helper already exists');
		}

		if (typeof (helper) !== 'function') {
			throw new Error('Helper should be a function');
		}
		this._helpers[name] = helper;
	}

	/**
	 * Remove helper from helper set.
	 * @param {string} name Helper name.
	 */
	remove(name) {
		delete this._helpers[name];
	}

	/**
	 * Invoke helper.
	 * @param {string} name Helper name.
	 * @param {Chunk} chunk Current stream chunk.
	 * @param {Context} context Current rendering context.
	 * @param {Array} bodies Inner bodies.
	 * @param {Object} params Helper params.
	 * @returns {Chunk}
	 */
	/* eslint max-params: 0 */
	invoke(name, chunk, context, bodies, params) {
		if (!(name in this._helpers)) {
			throw new Error(`Helper "${name}" not found`);
		}

		return this._helpers[name](chunk, context, bodies, params);
	}
}

module.exports = HelperManager;

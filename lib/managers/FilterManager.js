'use strict';

const builtInFilters = require('../filters');

class FilterManager {

	/**
	 * Creates new instance of filter manager.
	 */
	constructor() {

		/**
		 * Current filters set.
		 * @type {Object}
		 * @private
		 */
		this._filters = Object.create(builtInFilters);
	}

	/**
	 * Adds filter to filters set.
	 * @param {string} name Filter name.
	 * @param {Function} filter Filter function.
	 */
	add(name, filter) {
		if (name in this._filters) {
			throw new Error('Such filter already exists');
		}

		if (typeof (filter) !== 'function') {
			throw new Error('Filter should be a function');
		}
		this._filters[name] = filter;
	}

	/**
	 * Removes filter from filters set.
	 * @param {string} name Filter name.
	 */
	remove(name) {
		delete this._filters[name];
	}

	/**
	 * Filters specified value.
	 * @param {string} value Value to filer.
	 * @param {Array} filters Filter names to apply.
	 * @returns {string} Filtered value.
	 */
	filterValue(value, filters) {
		if (Array.isArray(filters) && filters.length > 0) {
			filters.forEach(filterName => {
				if (typeof (this._filters[filterName]) !== 'function') {
					throw new Error(`Helper "${filterName}" is not a function`);
				}
				value = this._filters[filterName](value);
			});
			return value;
		}
		// if filters list is empty apply the h filter by default to escape HTML
		value = this._filters.h(value);
		return value;
	}
}

module.exports = FilterManager;

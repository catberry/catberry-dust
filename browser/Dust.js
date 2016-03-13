'use strict';

const engineClasses = require('../lib/engineClasses');
const Stub = engineClasses.Stub;
const Context = engineClasses.Context;
const TemplateManager = require('../lib/managers/TemplateManager');
const HelperManager = require('../lib/managers/HelperManager');
const FilterManager = require('../lib/managers/FilterManager');

class Dust {

	static makeBase(global, options) {
		return new Context(undefined, global, options);
	}

	/**
	 * Creates new instance of Dust template engine.
	 * @param {ServiceLocator} locator Service locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current helper manager.
		 * @type {HelperManager}
		 */
		this.helperManager = new HelperManager();

		/**
		 * Current filter manager.
		 * @type {FilterManager}
		 */
		this.filterManager = new FilterManager();

		/**
		 * Current template manager.
		 * @type {TemplateManager}
		 */
		this.templateManager = new TemplateManager();

		let eventBus;
		try {
			eventBus = locator.resolve('eventBus');
		} catch (e) {
			// standalone mode
		}

		/**
		 * Current logger.
		 * @type {Object}
		 */
		this.logger = {

			/* eslint no-console: 0 */
			warn: msg => eventBus ? eventBus.emit('warn', msg) : console.warn(msg),
			error: msg => eventBus ? eventBus.emit('error', msg) : console.error(msg)
		};
	}

	/**
	 * Renders template.
	 * @param {string} name Template name.
	 * @param {Object} context Data context.
	 * @returns {Promise} Promise for content.
	 */
	render(name, context) {
		return new Promise((fulfill, reject) => {
			const callback = (error, content) => {
				if (error) {
					reject(error);
					return;
				}
				fulfill(content);
			};
			const stub = new Stub(this, callback);

			this.templateManager
				.invoke(name, stub.head, Context.wrap(context, name, this))
				.end();
		});
	}
}

module.exports = Dust;

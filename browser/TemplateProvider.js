'use strict';

class TemplateProvider {

	/**
	 * Creates new instance of template provider.
	 * @param {ServiceLocator} locator Service locator for resolving dependencies.
	 */
	constructor(locator) {
		this._dust = locator.resolve('dust');
		this._eventBus = locator.resolve('eventBus');
	}

	/**
	 * Gets the template provider name for identification.
	 * @returns {string} Name of the provider.
	 */
	getName() {
		return 'dust';
	}

	/**
	 * Registers compiled source of template.
	 * @param {string} name Template name.
	 * @param {string} compiled Template compiled source.
	 */
	registerCompiled(name, compiled) {
		this._dust.templateManager.registerCompiled(name, compiled);
		this._eventBus.emit('templateRegistered', {
			name,
			source: compiled
		});
	}

	/**
	 * Renders template with data context.
	 * @param {string} name Template name.
	 * @param {Object} context Data context.
	 * @returns {Promise<string>} Promise for rendered content.
	 */
	render(name, context) {
		return this._dust.render(name, context);
	}
}

module.exports = TemplateProvider;

'use strict';

const Dust = require('./lib/Dust');
const TemplateProvider = require('./lib/TemplateProvider');

module.exports = {
	register(locator) {
		locator.register('dust', Dust, true);
		locator.register('templateProvider', TemplateProvider, true);
	},
	Dust,
	TemplateProvider
};

'use strict';

const DustBase = require('../browser/Dust');
const engineClasses = require('./engineClasses');
const Context = engineClasses.Context;
const DustReadable = require('./DustReadable');

class Dust extends DustBase {

	/**
	 * Gets stream for template rendering.
	 * @param {string} name Name of template.
	 * @param {Object} context Data context.
	 * @returns {DustReadable} Stream with content.
	 */
	getStream(name, context) {
		const stream = new DustReadable(this);

		this.templateManager
			.invoke(name, stream.head, Context.wrap(context, name, this))
			.end();

		return stream;
	}
}

module.exports = Dust;

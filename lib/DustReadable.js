'use strict';

const stream = require('stream');
const engineClasses = require('./engineClasses');
const Chunk = engineClasses.Chunk;

class DustReadable extends stream.Readable {

	/**
	 * Creates new instance of Dust readable stream
	 * @param {Dust} dust Dust template engine.
	 * @param {Object} opt Stream options.
	 */
	constructor(dust, opt) {
		super(opt);
		this.dust = dust;
		this.head = new Chunk(this, null, null, dust);
	}

	/**
	 * Tells stream that it is time to read.
	 */
	flush() {
		this.read(0);
	}

	/**
	 * Reads next chunk from stream.
	 * @private
	 */
	_read() {
		if (!this.head) {
			this.push(null);
			return;
		}

		if (this.head.error) {
			this.emit('error', this.head.error);
			this.dust.logger.error(this.head.error);
			this.push(null);
			return;
		}

		if (!this.head.flushable) {
			this.push('');
			return;
		}

		const data = this.head.data.join('');
		this.push(data, 'utf8');
		this.head = this.head.next;
	}
}

module.exports = DustReadable;

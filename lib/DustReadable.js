/* 
 * catberry-dust
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-dust's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry-dust that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = DustReadable;

var util = require('util'),
	stream = require('stream'),
	Chunk = require('./Chunk');

util.inherits(DustReadable, stream.Readable);

/**
 * Creates new instance of Dust readable stream
 * @param {Dust} dust Dust template engine.
 * @param {Object} opt Stream options.
 * @inherits Readable
 * @constructor
 */
function DustReadable(dust, opt) {
	stream.Readable.call(this, opt);
	this.dust = dust;
	this.head = new Chunk(this, null, null, dust);
}

/**
 * Does nothing and exists for common interface with Stub.
 */
DustReadable.prototype.flush = function () {

};

/**
 * Reads next chunk from stream.
 * @private
 */
DustReadable.prototype._read = function () {
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

	if(!this.head.flushable){
		this.push('');
		return;
	}

	var data = this.head.data.join('');
	this.push(data, 'utf8');
	this.head = this.head.next;
};
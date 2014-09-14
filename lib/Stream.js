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

var util = require('util'),
	events = require('events'),
	Chunk = require('./Chunk');

util.inherits(Stream, events.EventEmitter);

function Stream(dust) {
	events.EventEmitter.call(this);
	this.head = new Chunk(this, null, null, dust);
}

Stream.prototype.flush = function () {
	var chunk = this.head;

	while (chunk) {
		if (chunk.flushable) {
			this.emit('data', chunk.data.join(''));
		} else if (chunk.error) {
			this.emit('error', chunk.error);
			this.dust.logger.error(chunk.error);
			this.flush = dummy;
			return;
		} else {
			return;
		}
		chunk = chunk.next;
		this.head = chunk;
	}
	this.emit('end');
};

Stream.prototype.pipe = function (stream) {
	var self = this;
	this.on('data', function (data) {
		try {
			stream.write(data, 'utf8');
		} catch (err) {
			self.emit('error', err);
		}
	}).on('end', function () {
		try {
			return stream.end();
		} catch (err) {
			self.emit('error', err);
		}
	}).on('error', function (err) {
		stream.error(err);
	});
	return this;
};

function dummy() {}
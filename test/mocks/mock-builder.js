'use strict';

var Readable = require('stream').Readable;
var util = require('util');
util.inherits(OneMessageStream, Readable);

/**
 * A stream which emits one 'data' event with a supplied message.
 * @param {String} message The data to be passed to the 'data' event
 * @param {Error} error If passed, an 'error' event is triggered with it upon reading the stream.
 */
function OneMessageStream(message, error) {
    var readOnce = false;
    Readable.call(this);
    this._read = function(){
        if (!readOnce) {
            this.push(message);
            if (error) {
                this.emit('error', error);
            }
            readOnce = true;
        } else {
            this.push(null);
        }
    };
}

/**
 * Mocks a mail builder.
 * @param {Object} envelope Envelope object
 * @param {String} message The message to include in the content stream
 * @param {Error} error If passed, it's emitted asynchronously by the content stream [optional]
 */
function MockBuilder(envelope, message, error) {
    this.getEnvelope = function() {
        return envelope;
    };

    this.createReadStream = function() {
        return new OneMessageStream(message, error);
    };

    this.getHeader = function() {
        return 'teretere';
    };
}

module.exports = MockBuilder;

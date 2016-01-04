'use strict';

var SMTPConnection = require('smtp-connection');
var packageData = require('../package.json');
var wellknown = require('nodemailer-wellknown');
var shared = require('nodemailer-shared');
var clone = require('clone');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

// expose to the world
module.exports = function (options) {
    return new SMTPTransport(options);
};

/**
 * Creates a SMTP transport object for Nodemailer
 *
 * @constructor
 * @param {Object} options Connection options
 */
function SMTPTransport(options) {
    EventEmitter.call(this);

    var hostData;

    if (options && typeof options === 'string') {
        options = {
            url: options
        };
    }

    this.options = options && clone(options) || {};

    if (this.options.service && (hostData = wellknown(this.options.service))) {
        Object.keys(hostData).forEach(function (key) {
            if (!(key in this.options)) {
                this.options[key] = hostData[key];
            }
        }.bind(this));
    }

    // parse a configuration URL into configuration options
    if (this.options.url) {
        hostData = shared.parseConnectionUrl(this.options.url);
        Object.keys(hostData).forEach(function (key) {
            if (!(key in this.options)) {
                this.options[key] = hostData[key];
            }
        }.bind(this));
    }

    this.logger = shared.getLogger(this.options);

    // temporary object
    var connection = new SMTPConnection(this.options);

    this.name = 'SMTP';
    this.version = packageData.version + '[client:' + connection.version + ']';
}
util.inherits(SMTPTransport, EventEmitter);

/**
 * Sends an e-mail using the selected settings
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function
 */
SMTPTransport.prototype.send = function (mail, callback) {
    var connection = new SMTPConnection(this.options);
    var returned = false;

    connection.once('error', function (err) {
        if (returned) {
            return;
        }
        returned = true;
        connection.close();
        return callback(err);
    });

    connection.once('end', function () {
        if (returned) {
            return;
        }
        returned = true;
        return callback(new Error('Connection closed'));
    });

    var sendMessage = function () {
        var envelope = mail.data.envelope || mail.message.getEnvelope();
        var messageId = (mail.message.getHeader('message-id') || '').replace(/[<>\s]/g, '');
        var recipients = [].concat(envelope.to || []);
        if (recipients.length > 3) {
            recipients.push('...and ' + recipients.splice(2).length + ' more');
        }

        this.logger.info('Sending message <%s> to <%s>', messageId, recipients.join(', '));

        connection.send(envelope, mail.message.createReadStream(), function (err, info) {
            if (returned) {
                return;
            }
            returned = true;

            connection.close();
            if (err) {
                return callback(err);
            }
            info.envelope = {
                from: envelope.from,
                to: envelope.to
            };
            info.messageId = messageId;
            return callback(null, info);
        });
    }.bind(this);

    connection.connect(function () {
        if (returned) {
            return;
        }

        if (this.options.auth) {
            connection.login(this.options.auth, function (err) {
                if (returned) {
                    return;
                }

                if (err) {
                    returned = true;
                    connection.close();
                    return callback(err);
                }

                sendMessage();
            });
        } else {
            sendMessage();
        }
    }.bind(this));
};

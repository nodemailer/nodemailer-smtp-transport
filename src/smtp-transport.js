'use strict';

var SMTPConnection = require('smtp-connection');
var packageData = require('../package.json');
var wellknown = require('nodemailer-wellknown');

// expose to the world
module.exports = function(options) {
    return new SMTPTransport(options);
};

/**
 * Creates a SMTP transport object for Nodemailer
 *
 * @constructor
 * @param {Object} options Connection options
 */
function SMTPTransport(options) {
    var hostData;

    this.options = options || {};

    if (this.options.service && (hostData = wellknown(this.options.service))) {
        Object.keys(hostData).forEach(function(key) {
            if (!(key in this.options)) {
                this.options[key] = hostData[key];
            }
        }.bind(this));
    }

    // temporary object
    var connection = new SMTPConnection(options);

    this.name = 'SMTP';
    this.version = packageData.version + '[client:' + connection.version + ']';
}

/**
 * Sends an e-mail using the selected settings
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function
 */
SMTPTransport.prototype.send = function(mail, callback) {
    var connection = new SMTPConnection(this.options),
        returned = false;

    connection.once('error', function(err) {
        if (returned) {
            return;
        }
        returned = true;
        return callback(err);
    });

    var sendMessage = function() {
        connection.send(mail.data.envelope || mail.message.getEnvelope(), mail.message.createReadStream(), function(err, info) {
            if (returned) {
                return;
            }
            returned = true;

            connection.close();
            if (err) {
                return callback(err);
            }
            return callback(null, info);
        });
    };

    connection.connect(function() {
        if (returned) {
            return;
        }

        if (this.options.auth) {
            connection.login(this.options.auth, function(err) {
                if (returned) {
                    return;
                }

                if (err) {
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
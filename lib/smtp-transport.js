'use strict';

var SMTPConnection = require('smtp-connection');
var packageData = require('../package.json');
var wellknown = require('nodemailer-wellknown');

module.exports = function(options) {
    return new SMTPTransport(options);
};

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
    this.version = packageData.version + '[client:' + connection.version + ']';
}

SMTPTransport.prototype.send = function(envelope, message, callback) {
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
        connection.send(envelope, message, function(err, info) {
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
/* eslint no-unused-expressions:0, no-invalid-this:0 */
/* globals afterEach, beforeEach, describe, it */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var chai = require('chai');
var net = require('net');
var expect = chai.expect;
var smtpTransport = require('../lib/smtp-transport');
var SMTPServer = require('smtp-server').SMTPServer;
chai.config.includeStack = true;

var PORT_NUMBER = 8397;

function MockBuilder(envelope, message) {
    this.envelope = envelope;
    this.message = message;
}

MockBuilder.prototype.getEnvelope = function () {
    return this.envelope;
};

MockBuilder.prototype.createReadStream = function () {
    return this.message;
};

MockBuilder.prototype.getHeader = function () {
    return 'teretere';
};

describe('SMTP Transport Tests', function () {
    this.timeout(10000);

    describe('Anonymous sender tests', function () {

        var server;

        beforeEach(function (done) {
            server = new SMTPServer({
                disabledCommands: ['STARTTLS', 'AUTH'],

                onData: function (stream, session, callback) {
                    stream.on('data', function () {});
                    stream.on('end', callback);
                },

                onMailFrom: function (address, session, callback) {
                    if (!/@valid.sender/.test(address.address)) {
                        return callback(new Error('Only user@valid.sender is allowed to send mail'));
                    }
                    return callback(); // Accept the address
                },

                onRcptTo: function (address, session, callback) {
                    if (!/@valid.recipient/.test(address.address)) {
                        return callback(new Error('Only user@valid.recipient is allowed to receive mail'));
                    }
                    return callback(); // Accept the address
                },
                logger: false
            });

            server.listen(PORT_NUMBER, done);
        });

        afterEach(function (done) {
            server.close(done);
        });

        it('Should expose version number', function () {
            var client = smtpTransport();
            expect(client.name).to.exist;
            expect(client.version).to.exist;
        });

        it('Should detect wellknown data', function () {
            var client = smtpTransport({
                service: 'google mail',
                logger: false
            });
            expect(client.options.host).to.equal('smtp.gmail.com');
            expect(client.options.port).to.equal(465);
            expect(client.options.secure).to.be.true;
        });

        it('Should fail envelope', function (done) {
            var client = smtpTransport({
                port: PORT_NUMBER,
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@invalid.sender',
                    to: 'test@valid.recipient'
                }, 'test')
            }, function (err) {
                expect(err.code).to.equal('EENVELOPE');
                done();
            });
        });

        it('Should fail message', function (done) {
            var client = smtpTransport({
                port: PORT_NUMBER,
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@valid.sender',
                    to: 'test@valid.recipient'
                }, '')
            }, function (err) {
                expect(err.code).to.equal('EMESSAGE');
                done();
            });
        });

        it('Should fail auth', function (done) {
            var client = smtpTransport({
                port: PORT_NUMBER,
                auth: {
                    user: 'zzz'
                },
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@valid.sender',
                    to: 'test@valid.recipient'
                }, 'message')
            }, function (err) {
                expect(err.code).to.equal('EAUTH');
                done();
            });
        });

        it('Should send mail', function (done) {
            var client = smtpTransport('smtp:localhost:' + PORT_NUMBER + '?logger=false');
            var chunks = [],
                message = new Array(1024).join('teretere, vana kere\n');

            server.on('data', function (connection, chunk) {
                chunks.push(chunk);
            });

            server.on('dataReady', function (connection, callback) {
                var body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(message.trim().replace(/\n/g, '\r\n'));
                callback(null, true);
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@valid.sender',
                    to: 'test@valid.recipient'
                }, message)
            }, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('Authenticated sender tests', function () {

        var server;

        beforeEach(function (done) {
            server = new SMTPServer({
                authMethods: ['PLAIN', 'XOAUTH2'],
                disabledCommands: ['STARTTLS'],

                onData: function (stream, session, callback) {
                    stream.on('data', function () {});
                    stream.on('end', callback);
                },

                onAuth: function (auth, session, callback) {
                    if (auth.method !== 'XOAUTH2') {
                        if (auth.username !== 'testuser' || auth.password !== 'testpass') {
                            return callback(new Error('Invalid username or password'));
                        }
                    } else if (auth.username !== 'testuser' || auth.accessToken !== 'testtoken') {
                        return callback(null, {
                            data: {
                                status: '401',
                                schemes: 'bearer mac',
                                scope: 'my_smtp_access_scope_name'
                            }
                        });
                    }
                    callback(null, {
                        user: 123
                    });
                },
                onMailFrom: function (address, session, callback) {
                    if (!/@valid.sender/.test(address.address)) {
                        return callback(new Error('Only user@valid.sender is allowed to send mail'));
                    }
                    return callback(); // Accept the address
                },
                onRcptTo: function (address, session, callback) {
                    if (!/@valid.recipient/.test(address.address)) {
                        return callback(new Error('Only user@valid.recipient is allowed to receive mail'));
                    }
                    return callback(); // Accept the address
                },
                logger: false
            });

            server.listen(PORT_NUMBER, done);
        });

        afterEach(function (done) {
            server.close(done);
        });

        it('Should login and send mail', function (done) {
            var client = smtpTransport({
                url: 'smtp:testuser:testpass@localhost:' + PORT_NUMBER,
                logger: false
            });
            var chunks = [],
                message = new Array(1024).join('teretere, vana kere\n');

            server.on('data', function (connection, chunk) {
                chunks.push(chunk);
            });

            server.on('dataReady', function (connection, callback) {
                var body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(message.trim().replace(/\n/g, '\r\n'));
                callback(null, true);
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@valid.sender',
                    to: 'test@valid.recipient'
                }, message)
            }, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('Should verify connection with success', function (done) {
            var client = smtpTransport({
                url: 'smtp:testuser:testpass@localhost:' + PORT_NUMBER,
                logger: false
            });

            client.verify(function (err, success) {
                expect(err).to.not.exist;
                expect(success).to.be.true;
                done();
            });
        });

        it('Should not verify connection', function (done) {
            var client = smtpTransport({
                url: 'smtp:testuser:testpass@localhost:999' + PORT_NUMBER,
                logger: false
            });

            client.verify(function (err) {
                expect(err).to.exist;
                done();
            });
        });

        it('Should login and send mail using proxied socket', function (done) {
            var client = smtpTransport({
                url: 'smtp:testuser:testpass@www.example.com:1234',
                logger: false,
                getSocket: function (options, callback) {
                    var socket = net.connect(PORT_NUMBER, 'localhost');
                    var errHandler = function (err) {
                        callback(err);
                    };
                    socket.on('error', errHandler);
                    socket.on('connect', function () {
                        socket.removeListener('error', errHandler);
                        callback(null, {
                            connection: socket
                        });
                    });
                }
            });
            var chunks = [],
                message = new Array(1024).join('teretere, vana kere\n');

            server.on('data', function (connection, chunk) {
                chunks.push(chunk);
            });

            server.on('dataReady', function (connection, callback) {
                var body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(message.trim().replace(/\n/g, '\r\n'));
                callback(null, true);
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: 'test@valid.sender',
                    to: 'test@valid.recipient'
                }, message)
            }, function (err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });
});

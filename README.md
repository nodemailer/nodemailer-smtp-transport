# SMTP transport module for Nodemailer

Applies for Nodemailer v1.x and not for v0.x where transports are built-in.

## Usage

Install with npm

    npm install nodemailer-smtp-transport

Require to your script

```javascript
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
```

Create a Nodemailer transport object

```javascript
var transporter = nodemailer.createTransport(smtpTransport(options))
```

Where

  * **options** defines connection data
    * **options.port** is the port to connect to (defaults to 25 or 465)
    * **options.host** is the hostname or IP address to connect to (defaults to 'localhost')
    * **options.secure** defines if the connection should use SSL (if `true`) or not (if `false`)
    * **options.ignoreTLS** turns off STARTTLS support if true
    * **options.name** optional hostname of the client, used for identifying to the server
    * **options.localAddress** is the local interface to bind to for network connections
    * **options.connectionTimeout** how many milliseconds to wait for the connection to establish
    * **options.greetingTimeout** how many milliseconds to wait for the greeting after connection is established
    * **options.socketTimeout** how many milliseconds of inactivity to allow
    * **options.debug** if true, the connection emits all traffic between client and server as 'log' events
    * **options.authMethod** defines preferred authentication method, eg. 'PLAIN'
    * **options.tls** defines additional options to be passed to the socket constructor, eg. *{rejectUnauthorized: true}*

**Example**

```javascript
var transport = nodemailer.createTransport(smtpTransport({
    host: 'localhost',
    port: 25,
    auth: {
        user: 'username',
        pass: 'password'
    },
    maxConnections: 5,
    maxMessages: 10
}));
```

## Using well-known services

If you do not want to specify the hostname, port and security settings for a well known service, you can use it by its name.

```javascript
smtpTransport({
    service: 'gmail',
    auth: ..
});
```

See the list of all supported services [here](https://github.com/andris9/nodemailer-wellknown#supported-services).


## License

**MIT**

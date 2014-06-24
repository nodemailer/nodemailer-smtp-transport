# SMTP transport module for Nodemailer

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
var transport = nodemailer.createTransport(smtpTransport({
    host: 'localhost',
    port: 25,
    auth: {
        user: 'username',
        pass: 'password'
    }
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

## License

**MIT**

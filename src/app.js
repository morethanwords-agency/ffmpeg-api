const express = require('express');
const app = express();
const compression = require('compression');
const all_routes = require('express-list-endpoints');

const logger = require('./utils/logger.js');
const constants = require('./constants.js');

const fileSizeLimit = constants.fileSizeLimit;
const timeout = 3600000;

// Catch SIGINT and SIGTERM and exit
function handle(signal) {
    logger.info(`Received ${signal}. Exiting...`);
    process.exit(1);
}
process.on('SIGINT', handle);
process.on('SIGTERM', handle);

app.use(compression());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(require('./routes/uploadfile.js'));
app.use('/convert', require('./routes/convert.js'));
app.use('/video/extract', require('./routes/extract.js'));
app.use('/probe', require('./routes/probe.js'));
app.use('/video/remux', require('./routes/remux.js')); // ✅ New route

require('express-readme')(app, {
    filename: 'index.md',
    routes: ['/'],
});

// Server
const server = app.listen(constants.serverPort, function () {
    let host = server.address().address;
    let port = server.address().port;
    logger.info('Server started and listening http://' + host + ':' + port);
});

server.on('connection', function (socket) {
    logger.debug(`new connection, timeout: ${timeout}`);
    socket.setTimeout(timeout);
    socket.server.timeout = timeout;
    server.keepAliveTimeout = timeout;
});

// List all endpoints
app.get('/endpoints', function (req, res) {
    res.status(200).send(all_routes(app));
});

// 404 handler
app.use(function (req, res, next) {
    res.status(404).send({ error: 'route not found' });
});

// Custom error handler
app.use(function (err, req, res, next) {
    let code = err.statusCode || 500;
    res.writeHead(code, { 'content-type': 'text/plain' });
    res.end(`${err.message}\n`);
});

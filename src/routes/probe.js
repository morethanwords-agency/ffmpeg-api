var express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const logger = require('../utils/logger.js');

var router = express.Router();

// Probe input file and return metadata
router.post('/', function (req, res, next) {
    const savedFile = req.body.file;

    logger.debug(`Probing ${savedFile}`);

    ffmpeg(savedFile).ffprobe(function (err, metadata) {
        if (err) {
            next(err);
        } else {
            res.status(200).send(metadata);
        }
    });
});

module.exports = router;

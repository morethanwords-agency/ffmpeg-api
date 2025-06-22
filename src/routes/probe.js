var express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

var router = express.Router();

// Probe input file and return metadata
router.post('/', function (req, res, next) {
    let savedFile = req.body.file;

    logger.debug(`Probing ${savedFile}`);

    var ffmpegCommand = ffmpeg(savedFile);

    ffmpegCommand.ffprobe(function (err, metadata) {
        if (err) {
            next(err);
        } else {
            // optional: do not delete if you're not uploading
            // utils.deleteFile(savedFile);
            res.status(200).send(metadata);
        }
    });
});

module.exports = router;

var express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');
const constants = require('../constants.js'); // 🔹 додаємо constants
const fileSizeLimit = constants.fileSizeLimit; // 🔹 отримуємо ліміт

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
            const fileSize = metadata.format?.size;
            const needsCompression = fileSize && fileSize > fileSizeLimit;

            logger.debug(`File size: ${fileSize} bytes, limit: ${fileSizeLimit}`);
            res.status(200).send({
                metadata,
                needsCompression,
                fileSize,
                fileSizeLimit
            });
        }
    });
});

module.exports = router;

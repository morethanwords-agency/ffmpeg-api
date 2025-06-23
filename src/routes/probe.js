var express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');
const constants = require('../constants.js'); 

var router = express.Router();

// Probe input file and return metadata
router.post('/', function (req, res, next) {
    let savedFile = req.body.file;

    logger.debug('Probing ' + savedFile);

    var ffmpegCommand = ffmpeg(savedFile);

    ffmpegCommand.ffprobe(function (err, metadata) {
        if (err) {
            next(err);
        } else {
            var fileSize = 0;
            if (metadata && metadata.format && metadata.format.size) {
                fileSize = metadata.format.size;
            }

            var fileSizeLimit = constants.fileSizeLimit;
            var needsCompression = fileSize > fileSizeLimit;

            logger.debug('File size: ' + fileSize + ' bytes, limit: ' + fileSizeLimit);
            res.status(200).send({
                metadata: metadata,
                needsCompression: needsCompression,
                fileSize: fileSize,
                fileSizeLimit: fileSizeLimit
            });
        }
    });
});

module.exports = router;

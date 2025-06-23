const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

const router = express.Router();

router.post('/', function (req, res, next) {
    const inputFile = (req.body && req.body.file) || res.locals.savedFile;
    const userOptions = (req.body && req.body.options) || {};

    if (!inputFile) {
        return res.status(400).json({ error: 'No input file provided' });
    }

    logger.debug(`Remuxing ${inputFile} with options: ${JSON.stringify(userOptions)}`);

    const path = require('path');
    const ext = path.extname(inputFile); // ".mp4"
    const base = inputFile.slice(0, -ext.length); // remove ".mp4" from the end
    const outputFile = base + '-remux' + ext;

    const ffmpegCommand = ffmpeg(inputFile);

    // If copyVideo is true → copy video stream
    if (userOptions.copyVideo) {
        ffmpegCommand.videoCodec('copy');
    }

    // If copyAudio is true → copy audio stream
    if (userOptions.copyAudio) {
        ffmpegCommand.audioCodec('copy');
    }

    const outputOptions = [];

    if (userOptions.movflags) {
        outputOptions.push('-movflags', userOptions.movflags);
    }

    ffmpegCommand
        .outputOptions(outputOptions)
        .on('error', function (err) {
            logger.error('Remux error: ' + err.message);
            return res.status(500).json({ error: err.message });
        })
        .on('end', function () {
            logger.debug(`Remux complete → ${outputFile}`);
            utils.deleteFile(inputFile);
            return utils.downloadFile(outputFile, null, req, res, next);
        })
        .save(outputFile);
});

module.exports = router;

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

    const outputFile = inputFile.replace(/\.mp4$/, '') + `-${Date.now()}-remux.mp4`;
    const ffmpegCommand = ffmpeg(inputFile);

    const outputOptions = [];

    // ⚡ Stream copy speeds up remuxing
    if (userOptions.copyVideo) ffmpegCommand.videoCodec('copy');
    if (userOptions.copyAudio) ffmpegCommand.audioCodec('copy');

    // ⚡ Safe faststart default for MP4 seeking in browsers
    outputOptions.push('-movflags', userOptions.movflags || 'faststart');

    // ⚡ Optional: drop extra metadata and limit to main video/audio streams
    outputOptions.push('-map', '0:v:0', '-map', '0:a:0', '-map_metadata', '-1');

    ffmpegCommand
        .outputOptions(outputOptions)
        .on('start', commandLine => logger.debug(`FFmpeg started: ${commandLine}`))
        .on('error', err => {
            logger.error('Remux error: ' + err.message);
            return res.status(500).json({ error: err.message });
        })
        .on('end', () => {
            logger.debug(`Remux complete → ${outputFile}`);
            utils.deleteFile(inputFile);
            return utils.downloadFile(outputFile, null, req, res, next);
        })
        .save(outputFile);
});

module.exports = router;

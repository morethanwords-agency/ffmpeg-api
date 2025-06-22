var express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const constants = require('../constants.js');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

var router = express.Router();

// ➕ Remux endpoint
router.post('/video/remux', (req, res, next) => {
    const inputFile = req.body?.file || res.locals.savedFile;
    const userOptions = req.body?.options || {};

    if (!inputFile) {
        return res.status(400).json({ error: 'No input file provided' });
    }

    const copyVideo = userOptions.copyVideo !== false; // default true
    const copyAudio = userOptions.copyAudio !== false; // default true

    const outputOptions = [
        ...(copyVideo ? ['-c:v copy'] : []),
        ...(copyAudio ? ['-c:a copy'] : []),
        '-movflags +faststart'
    ];

    const outputFile = inputFile + '-remux.mp4';

    logger.debug(`Remuxing file: ${inputFile}`);
    logger.debug(`FFmpeg options: ${outputOptions.join(' ')}`);

    let ffmpegCommand = ffmpeg(inputFile);
    ffmpegCommand
        .renice(constants.defaultFFMPEGProcessPriority)
        .outputOptions(outputOptions)
        .on('error', function (err) {
            logger.error(`${err}`);
            utils.deleteFile(inputFile);
            res.status(500).json({ error: `${err}` });
        })
        .on('end', function () {
            utils.deleteFile(inputFile);
            return utils.downloadFile(outputFile, null, req, res, next);
        })
        .save(outputFile);
});

module.exports = router;

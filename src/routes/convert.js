var express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const constants = require('../constants.js');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

var router = express.Router();

// Routes for /convert

router.post('/audio/to/mp3', (req, res, next) => {
    res.locals.conversion = "audio";
    res.locals.format = "mp3";
    return convert(req, res, next);
});

router.post('/audio/to/wav', (req, res, next) => {
    res.locals.conversion = "audio";
    res.locals.format = "wav";
    return convert(req, res, next);
});

router.post('/video/to/mp4', (req, res, next) => {
    res.locals.conversion = "video";
    res.locals.format = "mp4";
    return convert(req, res, next);
});

router.post('/image/to/jpg', (req, res, next) => {
    res.locals.conversion = "image";
    res.locals.format = "jpg";
    return convert(req, res, next);
});

// Universal convert handler
function convert(req, res, next) {
    const format = res.locals.format;
    const conversion = res.locals.conversion;
    logger.debug(`path: ${req.path}, conversion: ${conversion}, format: ${format}`);

    const userOptions = (req.body && req.body.options) ? req.body.options : {};
    const inputFile = (req.body && req.body.file) ? req.body.file : res.locals.savedFile;

    if (!inputFile) {
        return res.status(400).json({ error: 'No input file provided' });
    }

    const bitrate = userOptions.bitrate || '800k';
    const bufsize = userOptions.bufsize || bitrate;
    const audiobitrate = userOptions.audiobitrate || '96k';
    const profile = userOptions.profile || 'baseline';
    const level = userOptions.level || '3.0';
    const resolution = userOptions.resolution || null;
    const fps = userOptions.fps || null;
    const preset = userOptions.preset || null;

    let outputOptions = [];

    if (conversion === "image") {
        outputOptions = ['-pix_fmt yuv422p'];
    }

    if (conversion === "audio") {
        if (format === "mp3") {
            outputOptions = ['-codec:a libmp3lame'];
        } else if (format === "wav") {
            outputOptions = ['-codec:a pcm_s16le'];
        }
    }

    if (conversion === "video") {
        outputOptions = [
            '-c:v libx264',
            `-profile:v ${profile}`,
            `-level ${level}`,
            '-pix_fmt yuv420p',
            '-movflags +faststart',
            `-b:v ${bitrate}`,
            `-bufsize ${bufsize}`,
            '-c:a aac',
            `-b:a ${audiobitrate}`
        ];

        if (resolution) {
            outputOptions.push(`-vf scale=${resolution}`);
        }

        if (fps) {
            outputOptions.push(`-r ${fps}`);
        }

        if (preset) {
            outputOptions.push(`-preset ${preset}`);
        }
    }

    const outputFile = inputFile + '-output.' + format;
    logger.debug(`begin conversion from ${inputFile} to ${outputFile}`);
    logger.debug(`FFmpeg options: ${outputOptions.join(' ')}`);

    let ffmpegConvertCommand = ffmpeg(inputFile);
    ffmpegConvertCommand
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
}

module.exports = router;

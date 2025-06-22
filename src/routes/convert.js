var express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const constants = require('../constants.js');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

var router = express.Router();

// Routes for /convert

router.post('/audio/to/mp3', function (req, res, next) {
    res.locals.conversion = "audio";
    res.locals.format = "mp3";
    return convert(req, res, next);
});

router.post('/audio/to/wav', function (req, res, next) {
    res.locals.conversion = "audio";
    res.locals.format = "wav";
    return convert(req, res, next);
});

router.post('/video/to/mp4', function (req, res, next) {
    res.locals.conversion = "video";
    res.locals.format = "mp4";
    return convert(req, res, next);
});

router.post('/image/to/jpg', function (req, res, next) {
    res.locals.conversion = "image";
    res.locals.format = "jpg";
    return convert(req, res, next);
});

// Universal convert handler
function convert(req, res, next) {
    let format = res.locals.format;
    let conversion = res.locals.conversion;
    logger.debug(`path: ${req.path}, conversion: ${conversion}, format: ${format}`);

    const userOptions = (req.body && req.body.options) ? req.body.options : {};
    const bitrate = userOptions.bitrate || '800k';
    const bufsize = userOptions.bufsize || bitrate;
    const audiobitrate = userOptions.audiobitrate || '96k';
    const profile = userOptions.profile || 'baseline';
    const level = userOptions.level || '3.0';
    const resolution = userOptions.resolution || null; // e.g., "1280:720"
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

    const savedFile = res.locals.savedFile;
    const outputFile = savedFile + '-output.' + format;
    logger.debug(`begin conversion from ${savedFile} to ${outputFile}`);
    logger.debug(`FFmpeg options: ${outputOptions.join(' ')}`);

    let ffmpegConvertCommand = ffmpeg(savedFile);
    ffmpegConvertCommand
        .renice(constants.defaultFFMPEGProcessPriority)
        .outputOptions(outputOptions)
        .on('error', function (err) {
            logger.error(`${err}`);
            utils.deleteFile(savedFile);
            res.writeHead(500, { 'Connection': 'close' });
            res.end(JSON.stringify({ error: `${err}` }));
        })
        .on('end', function () {
            utils.deleteFile(savedFile);
            return utils.downloadFile(outputFile, null, req, res, next);
        })
        .save(outputFile);
}

module.exports = router;

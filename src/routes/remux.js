const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

const router = express.Router();

router.post('/', function (req, res, next) {
    const inputFile = (req.body && req.body.file) || res.locals.savedFile;
    let userOptions = (req.body && req.body.options) || {};

    if (typeof userOptions === 'string') {
        try {
            userOptions = JSON.parse(userOptions);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON in options' });
        }
    }

    if (!inputFile) {
        return res.status(400).json({ error: 'No input file provided' });
    }

    logger.debug(`Remuxing ${inputFile} with options: ${JSON.stringify(userOptions)}`);

    const outputFile = inputFile.replace(/\.mp4$/, '') + `-${Date.now()}-remux.mp4`;

    ffmpeg.ffprobe(inputFile, (err, metadata) => {
        if (err) {
            logger.error('ffprobe error: ' + err.message);
            return res.status(500).json({ error: 'Failed to analyze input file' });
        }

        const ffmpegCommand = ffmpeg(inputFile);
        const outputOptions = [];

        let videoCodec = null;
        let shouldSetAspect = false;

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (videoStream) {
            videoCodec = videoStream.codec_name;
            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            shouldSetAspect = height > width; // Only set aspect if portrait
        }

        const shouldForceEncode = videoCodec === 'vp9';
        logger.debug(`Input video codec: ${videoCodec} → ${shouldForceEncode ? 're-encoding to H.264/AAC' : 'stream copy allowed'}`);

        if (shouldForceEncode) {
            ffmpegCommand
                .videoCodec('libx264')
                .audioCodec('aac')
                .addOption('-preset', 'ultrafast')
                .addOption('-crf', '28')
                .addOption('-b:a', '128k');

            if (userOptions.bit_rate) {
                ffmpegCommand.addOption('-b:v', userOptions.bit_rate);
            } else {
                ffmpegCommand.addOption('-b:v', '4000k');
            }

            ffmpegCommand
                .addOption('-pix_fmt', 'yuv420p')
                .addOption('-movflags', '+faststart');

            if (shouldSetAspect) {
                ffmpegCommand.addOption('-aspect', '9:16');
            }
        } else {
            if (userOptions.copyVideo) ffmpegCommand.videoCodec('copy');
            if (userOptions.copyAudio) ffmpegCommand.audioCodec('copy');
            outputOptions.push('-movflags', userOptions.movflags || '+faststart');
        }

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
});

module.exports = router;

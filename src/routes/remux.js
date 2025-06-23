const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

const router = express.Router();

function hasFlag(optionsArray, flag) {
    if (!Array.isArray(optionsArray)) return false;
    return optionsArray.some(opt => typeof opt === 'string' && opt.includes(flag));
}

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

        // Apply scaling if requested
        if (userOptions.width && userOptions.height) {
            ffmpegCommand.videoFilters(`scale=${userOptions.width}:${userOptions.height}`);
        }

        // Apply extra ffmpeg options if any (trimmed)
        if (Array.isArray(userOptions.ffmpegOptions)) {
            userOptions.ffmpegOptions = userOptions.ffmpegOptions.map(s => (typeof s === 'string' ? s.trim() : s));
            ffmpegCommand.addOptions(userOptions.ffmpegOptions);
        }

        const outputOptions = [];

        let videoCodec = null;
        let shouldSetAspect = false;

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (videoStream) {
            videoCodec = videoStream.codec_name;
            const width = videoStream.width || 0;
            const height = videoStream.height || 0;
            shouldSetAspect = height > width;
        }

        const shouldForceEncode = videoCodec === 'vp9';
        logger.debug(`Input video codec: ${videoCodec} → ${shouldForceEncode ? 're-encoding to H.264/AAC' : 'stream copy allowed'}`);

        logger.debug('movflags option:', userOptions.movflags);

        if (shouldForceEncode) {
            const preset = userOptions.preset || 'ultrafast';
            const crf = typeof userOptions.crf !== 'undefined' ? userOptions.crf : 28;
            const audioBitrate = userOptions.audioBitrate || '128k';
            const videoBitrate = userOptions.bit_rate || '4000k';

            if (!hasFlag(userOptions.ffmpegOptions, '-preset')) {
                ffmpegCommand.addOption('-preset', preset);
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-crf')) {
                ffmpegCommand.addOption('-crf', crf);
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-b:a')) {
                ffmpegCommand.addOption('-b:a', audioBitrate);
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-b:v')) {
                ffmpegCommand.addOption('-b:v', videoBitrate);
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-pix_fmt')) {
                ffmpegCommand.addOption('-pix_fmt', 'yuv420p');
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-movflags')) {
                ffmpegCommand.addOption('-movflags', userOptions.movflags || '+faststart');
            }
            if (!hasFlag(userOptions.ffmpegOptions, '-fflags')) {
                ffmpegCommand.addOption('-fflags', '+genpts');
            }

            if (shouldSetAspect && !hasFlag(userOptions.ffmpegOptions, '-aspect')) {
                ffmpegCommand.addOption('-aspect', '9:16');
            }

            ffmpegCommand
                .videoCodec(userOptions.videoCodec || 'libx264')
                .audioCodec(userOptions.audioCodec || 'aac');
        } else {
            if (userOptions.copyVideo) ffmpegCommand.videoCodec('copy');
            if (userOptions.copyAudio) ffmpegCommand.audioCodec('copy');

            outputOptions.push('-movflags', userOptions.movflags || '+faststart');
            outputOptions.push('-fflags', '+genpts');
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

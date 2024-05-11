# Techinical notes for ffmpeg-api

## high444 profile of the H264 codec
The high444 profile of the H264 codec is not supported in the latest version of Firefox and some Safari releases as of May 2024. In this project, we included the option `-fix_fmt yuv420p` along with the `high` profile.

* More information: https://trac.ffmpeg.org/wiki/Chroma%20Subsampling

## Compile FFmpeg for ffmpeg-api

This article is an FFmpeg compilation guide that is used as a reference when you want to run it in a non-container environment.

### Required packages
* X264-devel (yum), libx264-dev (apt): available in major Linux distributions
* [Fraunhofer FDK AAC](https://github.com/mstorsjo/fdk-aac) (No GPL, Need compile from the source code)

### Download FFmpeg source code
* https://ffmpeg.org/download.html
* Direct link: https://ffmpeg.org/releases/ffmpeg-7.0.tar.xz

### Compile FFmpeg (Minimal options)

```bash
wget https://ffmpeg.org/releases/ffmpeg-7.0.tar.xz
tar xvf ffmpeg-7.0.tar.xz
cd ffmpeg-7.0
mkdir build
cd build
../configure --enable-gpl --enable-libx264 --enable-nonfree --enable-libfdk-aac
make
make install
#ln -s /usr/local/bin/ffmpeg /usr/bin/ffmpeg  # Or add /usr/local/bin to PATH variable
```

## Report abuse
* ActivityPub [@gnh1201@catswords.social](https://catswords.social/@gnh1201)
* abuse@catswords.net

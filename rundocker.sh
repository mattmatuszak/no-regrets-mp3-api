#!/bin/bash

docker run -d -u $(id -u ${USER}):$(id -g ${USER}) --name no-regrets-mp3-api -p 7002:7002 -v /tmp/no-regrets:/app/files -e "HOST=docker" -e "MP3_STORAGE_LOCATION=/app/files" no-regrets-mp3-api:1.0

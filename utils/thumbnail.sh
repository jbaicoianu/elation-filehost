#!/bin/sh

FULL=$(cat)
DIR=$(dirname $FULL)
FILENAME=$(basename $FULL)
THUMB="$DIR/.thumbs/$FILENAME"
if [ ! -d "$DIR/.thumbs" ]; then
  mkdir -p "$DIR/.thumbs"
fi

if [ ! -f "$THUMB" ]; then
  convert -resize 256x192 "$FULL" "$THUMB"
fi

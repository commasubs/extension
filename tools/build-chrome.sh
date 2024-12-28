#!/bin/bash

## Google Chrome

VER=${GITHUB_REF_NAME:-'v0.0.0'}
ANM=${Archive:-"chrome-$VER.zip"}

cp manifest-all.json manifest.json

echo "Version: $VER"

# set manifest version as git tag
jq "(.version) |= \"${VER/v/}\"" manifest.json > tmp && mv tmp manifest.json

# remove browser specific keys
jq 'del(.background.scripts)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.browser_specific_settings)' manifest.json > tmp && mv tmp manifest.json

# make extension archive if running in CI
if [ ! -z "$CI" ]; then
  echo "Archive: $ANM"
  zip -r $ANM content icons manifest.json
fi

#!/bin/bash

## Mozilla Firefox

VER=${GITHUB_REF_NAME:-'v0.0.0'}
ANM=${Archive:-"firefox-$VER.zip"}

cp manifest-all.json manifest.json

echo "Version: $VER"

# set manifest version as git tag
jq "(.version) |= \"${VER/v/}\"" manifest.json > tmp && mv tmp manifest.json

# remove browser specific keys
jq 'del(.background.service_worker)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.minimum_chrome_version)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.browser_specific_settings.safari)' manifest.json > tmp && mv tmp manifest.json

# make extension archive if running in CI
if [ ! -z "$CI" ]; then
  echo "Archive: $ANM"
  zip -r $ANM content icons manifest.json
fi

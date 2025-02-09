#!/bin/bash

## Apple Safari

VER=${GITHUB_REF_NAME:-'v0.0.0'}
ANM=${Archive:-"safari-$VER.zip"}

cp manifest-all.json manifest.json

echo "Version: $VER"

# set manifest version as git tag
jq "(.version) |= \"${VER/v/}\"" manifest.json > tmp && mv tmp manifest.json

# remove browser specific keys
jq 'del(.options_ui.open_in_tab)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.background.scripts)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.minimum_chrome_version)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.browser_specific_settings.gecko)' manifest.json > tmp && mv tmp manifest.json
jq 'del(.browser_specific_settings.gecko_android)' manifest.json > tmp && mv tmp manifest.json

# make extension archive if running in CI
if [ ! -z "$CI" ]; then
  echo "Archive: $ANM"
  zip -r $ANM content icons manifest.json
fi

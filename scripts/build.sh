#!/bin/bash

set -e  # exit immediately on error
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes
# set -x    # for debuging, trace what is being executed.

cd "$(dirname "$0")/.."

# Read the first argument, set it to "dev" if not set
export BUILD="${1-dev}"

# If no "node_modules" directory, do an install first
if [ ! -d "./node_modules" ]; then
    echo -e "\033[40m`basename "$0"`\033[0m 🚀 Installing dependencies"
    npm install
fi

rm -rf ./bin
npx rollup --config ./config/rollup.config.js

#!/usr/bin/env node
const path = require('node:path');
const {stagePackage} = require('../phone-package/package-staging.cjs');

const destination = process.argv[2];
const sourceCommit = process.argv[3] || null;
if (!destination) {
    console.error('Usage: node scripts/stage-phone-package.cjs <destination> [source-commit]');
    process.exitCode = 2;
} else {
    try {
        stagePackage(path.resolve(__dirname,'..'),destination,{sourceCommit});
        console.log(destination);
    } catch (error) {
        console.error(error.message);
        process.exitCode=1;
    }
}

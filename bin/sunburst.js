#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { SunburstStack } = require('../lib/sunburst-stack');

const app = new cdk.App();
new SunburstStack(app, 'SunburstStack');

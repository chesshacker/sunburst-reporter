const AWS = require("aws-sdk");
const { Sunburst } = require("./sunburst");

const {
  SUNBURST_CONFIG_VALUE,
  SUNBURST_REPORT_TOPIC,
  SUNBURST_CONFIG_PARAMETER_NAME = "sunburst-config",
  SUNBURST_GEO = '29.6434281,-98.4330558', // defaults to San Antonio, Texas
  TZ: timeZone = 'America/Chicago',
} = process.env;

let sunburst;

exports.handler = async function () {
  if (!sunburst) {
    const config = await getConfig();
    sunburst = new Sunburst(config);
  }
  const geo = SUNBURST_GEO;
  const quality = await sunburst.getQuality(geo);
  const body = JSON.stringify(quality);

  console.log({body});

  if (SUNBURST_REPORT_TOPIC) {
    reportQuality(quality);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body,
  };
};

async function getConfig() {
  const ssm = new AWS.SSM();
  let configValue = SUNBURST_CONFIG_VALUE;
  if (!configValue) {
    const configParameter = await ssm
      .getParameter({
        Name: SUNBURST_CONFIG_PARAMETER_NAME,
        WithDecryption: true,
      })
      .promise();
    configValue = configParameter.Parameter.Value;
  }
  const config = JSON.parse(configValue);
  if (!config.username || !config.password) {
    throw new Error(
      "Expected sunburst config to include username and password."
    );
  }
  return config;
}

async function reportQuality(quality) {
  const sns = new AWS.SNS();
  const features = quality.features || [];
  const message = features.map(f => {
    const {
      quality: qualityDescription = "Unknown",
      type = "unknown",
      quality_percent: qualityPercent = "??",
      last_updated: lastUpdated,
      dawn = {},
      dusk = {},
    } = (f.properties || {});
    const duskOrDawn = type === "Sunrise" ? dawn.civil : (type === "Sunset" ? dusk.civil : undefined);
    return [
      `${qualityDescription} ${type} (${qualityPercent}%) at ${formatDate(duskOrDawn)}.`,
      `Last updated at ${formatDate(lastUpdated)}.`
    ].join('\n');
  }).join('\n');
  console.log({message});
  if (message) {
    await sns.publish({
      Message: message,
      TopicArn: SUNBURST_REPORT_TOPIC,
    }).promise();
  }
}

function formatDate(utcDateString) {
  // TODO: remove seconds from output
  if (!utcDateString) {
    return "unknown";
  }
  const date = new Date(utcDateString);
  if (!date) {
    return "error";
  }
  return date.toLocaleTimeString('en-US', {timeZone});
}

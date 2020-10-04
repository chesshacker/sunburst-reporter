const config = require("config");
const cdk = require("@aws-cdk/core");
const lambda = require("@aws-cdk/aws-lambda");
const ssm = require("@aws-cdk/aws-ssm");
const events = require("@aws-cdk/aws-events");
const eventsTargets = require("@aws-cdk/aws-events-targets");
const sns = require("@aws-cdk/aws-sns");

const emailList = config.get('emailList');
const geo = config.get('geo');
const name = config.get('name');
const schedule = config.get('schedule');
const ssmParameterName = config.get('ssmParameterName');
const timeZone = config.get('timeZone');

class SunburstStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const myTopic = new sns.Topic(this, `${name}Topic`);
    emailList.forEach(endpoint => {
      new sns.Subscription(this, `${name}Sub${sanitizeLogicalId(endpoint)}`, {
        topic: myTopic,
        protocol: "EMAIL",
        endpoint,
      });
    });
    const referencedParameter = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "ConfigParameter",
      {
        parameterName: ssmParameterName,
      }
    );
    const myLambda = new lambda.Function(this, `${name}Lambda`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "getQuality.handler",
      environment: {
        SUNBURST_REPORT_TOPIC: myTopic.topicArn,
        SUNBURST_CONFIG_PARAMETER_NAME: referencedParameter.parameterName,
        SUNBURST_GEO: geo,
        TZ: timeZone,
      },
    });
    new events.Rule(this, `${name}Rule`, {
      schedule: events.Schedule.cron(schedule),
      targets: [new eventsTargets.LambdaFunction(myLambda)],
    });
    referencedParameter.grantRead(myLambda);
    myTopic.grantPublish(myLambda);
  }
}

function sanitizeLogicalId(str) {
  // remove any non-alphanumeric characters
  return str.replace(/[^0-9a-z]/gi, '');
}

module.exports = { SunburstStack };

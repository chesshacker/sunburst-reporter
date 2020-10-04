# Sunburst Email Subscription

I found a neat website called <https://sunsetwx.com/> that tries to predict the
quality of the sunrise and sunset based on the atmospheric conditions. It's
pretty cool, and it has an API to go with it.

I wanted to try out some things with AWS CDK, and I thought this could be a fun
opportunity to build something. This deployment will schedule a lambda to run
twice a day, sending you the upcoming sunrise/sunset information via email.

## Prerequisites

Add your login credentials to a SecureString parameter in AWS SSM:

```sh
aws ssm put-parameter --name sunburst-config --type SecureString \
  --overwrite --value '{"username":"your_username","password":"your_password"}'
```

Configure the list of emails to send to, and optionally update any other
configuration by creating a `config/local.yaml` file.

```yaml
emailList:
  - you@example.com
```

Note: after deploying for the first time, you should have an email that you will
have to confirm before you receive regular messages from the topic.

## Useful Commands

 * `npm run test`         perform the jest unit tests
 * `cdk deploy`           deploy this stack to your default AWS account/region
 * `cdk diff`             compare deployed stack with current state
 * `cdk synth`            emits the synthesized CloudFormation template

## Future Work

This is just a fun little project I worte to scratch an itch. There's a lot that
could still be done. Here are some of those ideas...

* Store the forecast results to S3 so they could be queried later with Athena or
  S3 Select.
* Require a minimum forecasted quality to send a notification.
* Support SMS text messages.
* Use SES to avoid having to confirm email subscriptions.
* Add option for SMS notifications.
* Better error handling in the API wrapper.
* Figure out how to run with sam-local.
* Unit Tests?

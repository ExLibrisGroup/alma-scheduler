# Alma Appointment Scheduler Service

## Introduction
This service provides the functionality for the [Appointment Scheduler Cloud App](https://developers.exlibrisgroup.com/appcenter/appointment-scheduler/) and the accompanying [Primo Add-On](https://github.com/ExLibrisGroup/alma-scheduler/tree/master/primo-explore-appointment-scheduler).

## Deployment to AWS
To deploy to AWS, follow the steps below. 
1. Create a `.npmrc` file with the following content:
```
s3_bucket_name = BUCKET_NAME # Name of bucket in your AWS account to upload the assets to
region = eu-central-1 # Region to deploy to
cloud_formation_stack_name = AlmaSchedulerService # Stack name
mongodb_uri = "mongodb+srv://.../alma-scheduler?retryWrites=true&w=majority"
twilio_account = 
twilio_auth = 
twilio_from = "+1..."
```
2. Run the following to deploy the CloudFormation template. The output will include the URL of the proxy. 
```
$ npm run deploy
```

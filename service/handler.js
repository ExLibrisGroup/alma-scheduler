const utils = require('./utils');
const { auth } = require('./authorizer/index');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const validateInstCode = process.env.VALIDATE_INST_CODE != 'false';
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});

let client = null;
let collection;

const handler = async (event, context) => {
  let result;
  context.callbackWaitsForEmptyEventLoop = false;
  const body = JSON.parse(event.body||'{}');
  const instCode = event.pathParameters && event.pathParameters.instCode;
  if (event.requestContext && event.requestContext.http.method == 'OPTIONS') {
    result = { statusCode: 204 };
    return utils.cors(result, event);
  }
  /* Validate token */
  const token = auth(event.headers.authorization);
  if (!token || (instCode && validateInstCode && instCode != token.inst_code)) {
    result = utils.responses.unauthorized();
    return utils.cors(result, event);
  }

  try {
    await connect(MONGODB_URI);
    if (instCode)
      collection = client.collection(instCode);
    switch (event.routeKey) {
      case 'GET /events/{instCode}':
        const date = event.queryStringParameters && event.queryStringParameters.date;
        const userId = event.queryStringParameters && event.queryStringParameters.userId;
        result = utils.responses.success(await getEvents(date, userId));
        break;
      case 'POST /events/{instCode}':
        result = utils.responses.success(await addEvent(body))
        break;
      case 'PUT /events/{instCode}/{id}':
        result = utils.responses.success(await updateEvent(event.pathParameters.id, body));
        break;
      case 'DELETE /events/{instCode}/{id}': 
        result = utils.responses.success(await deleteEvent(event.pathParameters.id));
        break;
      case 'GET /events/{instCode}/{id}':
        result = utils.responses.success(await getEvent(event.pathParameters.id));
        break;
      case 'POST /notifications':
        result = utils.responses.success(await sendNotification(body));
        break;
      default:
        result = utils.responses.notfound();
    }
  } catch (e) {
    console.error('error', e);
    result = utils.responses.error(e.message);
  }
  return utils.cors(result, event);
};

const getEvents = async (date, userId) => {
  let query = {};
  if (date) {
    let enddate = new Date(date);
    enddate.setDate(enddate.getDate() + 1);
    query.startTime = { $gt: date, $lt: enddate.toISOString() };
  }
  if (userId) query.userId = userId;
  return await collection.find(query).toArray();
}

const getEvent = async id => {
  return await collection.findOne({_id: new ObjectId(id)});
}

const addEvent = async body =>
  await collection.insertOne(body);

const updateEvent = async (id, body) => 
  await collection.findOneAndReplace({_id: new ObjectId(id)}, body)

const deleteEvent = async id => 
  await collection.findOneAndDelete({_id: new ObjectId(id)});

const sendNotification = async body => {
  if (!(  body.Destination && 
          body.Destination.ToAddresses.length>0 &&
          body.Message &&
          body.Message.Body &&
          body.Message.Body.Text
      )) throw new Error('Invalid email parameters');
  const params = {...body, Source: body.Source + ' <alma-scheduler@exldevnetwork.net>'};
  await new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
}

const connect = uri => {
  if (client) {
    return Promise.resolve(client);
  }
  return MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(connection => {
    client = connection.db();
    return client;
  });
}

module.exports = { handler };
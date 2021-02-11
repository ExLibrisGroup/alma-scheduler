const utils = require('./utils');
const { auth, authPrimo } = require('./authorizer');
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
  let result, userId, instCode, displayName;
  utils.fixEvent(event);
  context.callbackWaitsForEmptyEventLoop = false;
  const body = JSON.parse(event.body||'{}');
  instCode = event.pathParameters && event.pathParameters.instCode;
  userId = event.queryStringParameters && event.queryStringParameters.userId;
  if (event.requestContext && event.requestContext.http.method == 'OPTIONS') {
    result = { statusCode: 204 };
    return utils.cors(result, event);
  }
  /* Validate token */
  let token;
  if (event.routeKey.indexOf('/patron') >= 0) {
    /* Patron - use Primo VE JWT */
    token = await authPrimo(event.headers.authorization, event.headers['x-exl-apikey']);
    if (!token) return utils.cors(utils.responses.unauthorized(), event);
    instCode = token.institution;
    userId = token.userName;
    ({ displayName } = token);
  } else {
    token = await auth(event.headers.authorization);
    if (!token || (instCode && validateInstCode && instCode != token.inst_code)) {
      return utils.cors(utils.responses.unauthorized(), event);
    }
  }

  try {
    await connect(MONGODB_URI);
    if (event.routeKey.indexOf('/config') >= 0) {
      collection = client.collection('config');
    } else if (instCode) {
      collection = client.collection(instCode);
    } 
    const date = event.queryStringParameters && event.queryStringParameters.date; 
    switch (event.routeKey) {
      case 'GET /events/{instCode}':
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
      case 'GET /patron/events': 
        result = utils.responses.success(await getEvents(date, userId));
        break;
      case 'POST /patron/events':
        Object.assign(body, { userId, title: `${displayName} (${userId})`});
        result = utils.responses.success(await addEvent(body));
        break;
      case 'DELETE /patron/events/{id}': 
        const checkEvent = await getEvent(event.pathParameters.id);
        if (checkEvent.userId != userId) result = utils.responses.unauthorized();
        else result = utils.responses.success(await deleteEvent(event.pathParameters.id));
        break;      
      case 'GET /patron/slots':
        if (!date) result = utils.responses.error('Date required');
        else result = utils.responses.success(await getSlots(date));
        break;
      case 'POST /notifications/email':
        result = utils.responses.success(await sendNotification(body));
        break;
      case 'POST /notifications/sms':
        result = utils.responses.success(await sendSMSNotification(body));
        break; 
      case 'PUT /config/{instCode}':
        result = utils.responses.success(await updateConfig(instCode, body));
        break;
      case 'GET /patron/config':
        result = utils.responses.success(await getConfig(instCode));
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

const getEvent = async id =>
  await collection.findOne({_id: new ObjectId(id)});

const addEvent = async body =>
  await collection.insertOne(body);

const updateEvent = async (id, body) => 
  await collection.findOneAndReplace({_id: new ObjectId(id)}, body)

const deleteEvent = async id => 
  await collection.findOneAndDelete({_id: new ObjectId(id)});

const updateConfig = async (instCode, body) =>
  await collection.findOneAndReplace({instCode}, {instCode, ...body}, {upsert: true});

const getConfig = async instCode => 
  await collection.findOne({instCode});

const getSlots = async date => {
  /* Anonymized list of appointments */
  const list = await getEvents(date, null)
  return list.map(e=>(
    { startTime: e.startTime, location: e.location, duration: e.duration }
  ))
}

const sendNotification = async body => {
  if (!(  body.Destination && 
          body.Destination.ToAddresses.length>0 &&
          body.Message &&
          body.Message.Body &&
          body.Message.Body.Text
      )) throw new Error('Invalid email parameters');
  const params = {...body, Source: body.Source + ' <alma-scheduler@exldevnetwork.net>'};
  try {
    await new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();  
  } catch(e) {
    console.error('Error when sending email to ' + body.Destination.ToAddresses[0], e);
    throw e;
  }
}

const sendSMSNotification = async body => {
  if (!(process.env.TWILIO_ACCOUNT && process.env.TWILIO_AUTH)) {
    throw new Error('No SMS credentials');
  }
  const twilio = require('twilio');
  const client = new twilio(process.env.TWILIO_ACCOUNT, process.env.TWILIO_AUTH);
  await client.messages.create({
    body: body.message,
    to: body.to,  // Text this number
    from: body.from || process.env.TWILIO_FROM // From a valid Twilio number
  });
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
const utils = require('./utils');
const { success, notfound, error, unauthorized, nocontent } = require('./responses');
const { auth, authPrimo } = require('./authorizer');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const validateInstCode = process.env.VALIDATE_INST_CODE != 'false';
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const { setApikey, getApikey } = require('./apikeys');
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
    return nocontent().cors(event);
  }
  /* Validate token */
  let token;
  if (event.routeKey.indexOf('/patron') >= 0) {
    /* Patron - use Primo VE JWT */
    token = await authPrimo(event.headers.authorization, event.headers['x-exl-apikey']);
    if (!token) return unauthorized().cors(event);
    instCode = token.institution;
    userId = token.userName;
    ({ displayName } = token);
  } else {
    token = await auth(event.headers.authorization);
    if (!token || (instCode && validateInstCode && instCode != token.inst_code)) {
      return unauthorized().cors(event);
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
        result = success(await getEvents(date, userId));
        break;
      case 'POST /events/{instCode}':
        result = success(await addEvent(body))
        break;
      case 'PUT /events/{instCode}/{id}':
        result = success(await updateEvent(event.pathParameters.id, body));
        break;
      case 'DELETE /events/{instCode}/{id}': 
        result = success(await deleteEvent(event.pathParameters.id));
        break;
      case 'GET /events/{instCode}/{id}':
        result = success(await getEvent(event.pathParameters.id));
        break;
      case 'GET /patron/events': 
        result = success(await getEvents(date, userId));
        break;
      case 'POST /patron/events':
        Object.assign(body, { userId, title: `${displayName} (${userId})`});
        result = success(await addEvent(body));
        break;
      case 'DELETE /patron/events/{id}': 
        const checkEvent = await getEvent(event.pathParameters.id);
        if (checkEvent.userId != userId) result = unauthorized();
        else result = success(await deleteEvent(event.pathParameters.id));
        break;      
      case 'GET /patron/slots':
        if (!date) result = error('Date required');
        else result = success(await getSlots(date));
        break;
      case 'POST /notifications/email':
        result = success(await sendNotification(body));
        break;
      case 'POST /notifications/sms':
        result = success(await sendSMSNotification(body));
        break; 
      case 'PUT /config/{instCode}':
        result = success(await updateConfig(instCode, body));
        break;
      case 'GET /patron/config':
        result = success(await getConfig(instCode));
        break; 
      case 'PUT /config/{instCode}/apikey':
        result = success(await setApikey(instCode, body.apikey));
        break;
      case 'GET /config/{instCode}/apikey':
        let apikey = await getApikey(instCode);
        const re = new RegExp(`^.{1,${apikey.length-5}}`,"g");
        apikey = apikey.replace(re, m => "*".repeat(m.length))
        result = success(apikey);
        break;
      case 'GET /patron/hours/{libCode}':
        const libCode = event.pathParameters && event.pathParameters.libCode;
        result = success(await getHours(instCode, libCode))
                  .setHeader('Cache-Control', `max-age=${60*60}`);
        break; 
      default:
        result = notfound();
    }
  } catch (e) {
    console.error('error', e);
    result = error(e.message);
  }
  return result.cors(event);
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

const getHours = async (instCode, libcode) => {
  const alma = require('almarestapi-lib');
  const apikey = await getApikey(instCode);
  if (!apikey) {
    console.warn('No api key defined for ', instCode);
    return [];
  }
  alma.setOptions(await getApikey(instCode));
  const { DateTime } = require("luxon");
  var now = DateTime.now();
  const days = 90, chunk = 30;
  let from, to, requests = [];
  do {
    from = to || now;
    to = from.plus({ days: chunk });
    requests.push(alma.getp(`/conf/libraries/${libcode}/open-hours?from=${from.toISODate()}&to=${to.toISODate()}`))
  } while (to < now.plus({ days }))
  try {
    const hours = await Promise.all(requests);
    return Object.fromEntries(
      hours
      .map(h => h.day)
      .flat()
      .map(h => [ 
        h.date.substr(0, 10), 
        h.hour 
      ])
    );
  } catch(e) {
    console.error('e', e.message);
    return []
  }
}

module.exports = { handler };
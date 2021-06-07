const cors = ( response, event ) => {
  if (!response.headers) response.headers = {};
  response.headers['Access-Control-Allow-Origin'] = getOrigin(event);
  response.headers['Access-Control-Allow-Credentials'] = 'true';
  response.headers['Access-Control-Allow-Headers'] = 'authorization, content-type, x-exl-apikey';
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  response.headers['Access-Control-Max-Age'] = 86400;
  return response;
}

const responses = {
  success: body => ({ statusCode: 200, body: JSON.stringify(body) }),
  unauthorized: () => ({ statusCode: 401, body: JSON.stringify('Unauthorized') }),
  notfound: () => ({ statusCode: 404, body: JSON.stringify('Not Found') }),
  error: msg => ({ statusCode: 400, body: JSON.stringify(msg) }),
}

const getOrigin = event => event.headers.origin || event.headers.Origin || '*';

const fixEvent = event => {
  /* Lower case headers */
  Object.keys(event.headers).forEach(h=>{
    if (h!=h.toLowerCase()) {
      event.headers[h.toLowerCase()] = event.headers[h];
      delete event.headers[h];
    }
  })
  /* Fix route */
  event.routeKey = event.routeKey.replace(/[<>]/g, function (c) {
    switch (c) {
        case '<': return '{';
        case '>': return '}';
    }
  });
}

const toDate = date => {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

module.exports = { cors, responses, fixEvent, toDate };
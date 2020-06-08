const cors = ( response, event ) => {
  if (!response.headers) response.headers = {};
  response.headers['Access-Control-Allow-Origin'] = getOrigin(event);
  response.headers['Access-Control-Allow-Credentials'] = 'true';
  response.headers['Access-Control-Allow-Headers'] = 'authorization, content-type';
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  return response;
}

const responses = {
  success: body => ({ statusCode: 200, body: JSON.stringify(body) }),
  unauthorized: () => ({ statusCode: 401, body: JSON.stringify('Unauthorized') }),
  notfound: () => ({ statusCode: 404, body: JSON.stringify('Not Found') }),
  error: msg => ({ statusCode: 400, body: JSON.stringify(msg) }),
}

const getOrigin = event => event.headers.origin || event.headers.Origin || '*';

module.exports = { cors, responses };
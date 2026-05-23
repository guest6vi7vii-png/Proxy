const https = require('https');
const http = require('http');
const url = require('url');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!targetUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing url parameter' }) };
  }

  const allowed = ['https://api.elevenlabs.io', 'https://api.groq.com'];
  if (!allowed.some(d => targetUrl.startsWith(d))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Domain not allowed' }) };
  }

  try {
    const forwardHeaders = { ...event.headers };
    delete forwardHeaders['host'];
    delete forwardHeaders['connection'];

    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body) : undefined,
    });

    const responseBuffer = await response.arrayBuffer();
    const responseBody = Buffer.from(responseBuffer).toString('base64');

    const responseHeaders = { ...headers };
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Proxy failed: ' + error.message }),
    };
  }
};

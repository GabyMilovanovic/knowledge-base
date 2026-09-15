// CloudFront Function, JavaScript runtime 2.0, viewer-request event.
// Associate only with the temporary distribution while validating migration.
// This executes before S3, which has no objects named "en" or "en/".
function handler(event) {
  var request = event.request;
  if (request.uri !== '/en' && request.uri !== '/en/') {
    return request;
  }

  // CloudFront supplies URL-encoded query components. Keep repeated parameters
  // and their original encoding, without decoding/re-encoding attribution data.
  var parts = [];
  var query = request.querystring || {};
  Object.keys(query).forEach(function (key) {
    var values = query[key].multiValue || [query[key]];
    values.forEach(function (item) {
      parts.push(key + '=' + item.value);
    });
  });
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: '/' + (parts.length ? '?' + parts.join('&') : '') },
      'cache-control': { value: 'public, max-age=300' }
    }
  };
}

function extractId(body) {
  return body?.id || body?._id || body?.data?.id || body?.data?._id || null;
}

function extractArray(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

module.exports = {
  extractArray,
  extractId,
};

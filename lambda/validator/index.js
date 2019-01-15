exports.validate = async (event, context, callback) => {
  await require('./validate')(event.req, event.res)
  .then(() => callback(null, event))
  .catch(callback)
}
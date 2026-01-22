const { Notification } = require('../models/Notification');

async function createNotification({ user, type, title, body, job, workOrder, invoice }) {
  if (!user || !type || !title) return null;
  const doc = await Notification.create({
    user,
    type,
    title,
    body,
    job,
    workOrder,
    invoice,
  });
  return doc;
}

module.exports = { createNotification };

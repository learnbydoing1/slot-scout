/**
 * Notification module: desktop alerts and email.
 */

const notifier = require('node-notifier');
const nodemailer = require('nodemailer');
const logger = require('./logger');

const TITLE = 'Noura Slot Checker';
const MESSAGE = 'Final road test slots may be available! Book now at https://nouradc.com/trainee';
const EMAIL_SUBJECT = 'Noura: Final Road Test Slots Available';
const EMAIL_BODY = `
Final road test slots may have opened up at Noura Driving School.

Book as soon as possible: https://nouradc.com/trainee

This is an automated notification from the Noura Slot Checker agent.
`.trim();

function sendDesktopNotification() {
  try {
    notifier.notify({
      title: TITLE,
      message: MESSAGE,
      sound: true,
      wait: false,
    });
    logger.info('Desktop notification sent');
  } catch (err) {
    logger.error('Failed to send desktop notification:', err.message);
  }
}

async function sendEmail(config) {
  if (!config.emailEnabled) {
    logger.debug('Email not configured, skipping');
    return;
  }

  const { smtp, notifyEmail } = config;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  try {
    await transporter.sendMail({
      from: smtp.user || notifyEmail,
      to: notifyEmail,
      subject: EMAIL_SUBJECT,
      text: EMAIL_BODY,
    });
    logger.info('Email notification sent to', notifyEmail);
  } catch (err) {
    logger.error('Failed to send email:', err.message);
  }
}

async function notify(config) {
  sendDesktopNotification();
  await sendEmail(config);
}

module.exports = { notify };

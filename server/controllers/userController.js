// server/controllers/userController.js

const { ACCESS_CONTROL } = require("../config");

function checkEmailAccess(email) {
  if (!ACCESS_CONTROL.ENABLED) {
    return true;
  }

  return ACCESS_CONTROL.ALLOWED_EMAILS.includes(email);
}

module.exports = {
  checkEmailAccess,
};

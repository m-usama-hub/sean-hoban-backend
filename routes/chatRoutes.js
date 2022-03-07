const express = require('express');

const {
  getAllChatRooms,
  getAllMsg,
  sendNewMsg,
} = require('../controllers/chatContoller');

const router = express.Router();

// Protect all routes after this middleware
// router.use(authController.protect);

router.route('/chat-rooms').get(getAllChatRooms);
router.route('/get-messages').get(getAllMsg);
router.route('/send-message').post(sendNewMsg);

module.exports = router;

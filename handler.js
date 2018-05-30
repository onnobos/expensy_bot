'use strict';

const rp = require('request-promise');
const uuid = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');

const helper = require('./helper');

function parseCommand(message) {
  const tokens = message.split(' ');
  if (!tokens[0].match(/^\//)) {
    return null;
  }
  const command = [];
  const cmd = tokens.shift();
  const match = cmd.match(/\/(\w*)/);
  if (match.length > 0) {
    command[match[1]] = tokens;
  }
  return command;
}

function processCommands(message) {
  if (message) {
    const commandArguments = parseCommand(message.trim());
    console.log("commandArguments", commandArguments)
    if (commandArguments === null) {
      return message
    }

    const commandKeys = Object.keys(commandArguments);

    if (commandKeys.length === 0 ) {
      return message
    } else {
      const command = commandKeys[0];
      if(command == "help") {
        return "help"
      } else if(command == "start") {
        return "hello"
      } else {
        return message
      }
    }

  }
}


module.exports.expensy_bot = (event, context, callback) => {
  const env_variables = {
    BOT_NAME: process.env.BOT_NAME,
    BOT_ALIAS: process.env.BOT_ALIAS,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    TELEGRAM_API: process.env.TELEGRAM_API,
    AWS_REGION: process.env.MY_AWS_REGION,
    DYNAMODB_TABLE: process.env.DYNAMODB_TABLE,
    API_FILE_GATEWAY_URL: process.env.API_FILE_GATEWAY_URL,
    CONFIG_BUCKET: process.env.CONFIG_BUCKET,
    CONFIG_FILE:  process.env.CONFIG_FILE,
    SNS_TOPIC_TEXTREG: process.env.SNS_TOPIC_TEXTREG,
    SNS_TOPIC_LEXREG: process.env.SNS_TOPIC_LEXREG,
  }

  console.log("env_variables", env_variables)
  console.log("event", JSON.stringify(event))

  // Message
  var message;
  if (event.body.channel_post && event.body.channel_post.text) {
    message = event.body.channel_post.text;
  } else if (event.body.message && event.body.message.text) {
    message = event.body.message.text;
  }
  console.log("message", message)

  message = processCommands(message);

  // File
  var file_id;
  if (event.body.message.document && event.body.message.document.file_id) {
    file_id = event.body.message.document.file_id;
  }

  if (event.body.message.photo && event.body.message.photo instanceof Array) {
      file_id = event.body.message.photo[3].file_id;
  }
  console.log("file_id", file_id)

  // Chat ID
  var chatId;
  if (event.body.message && event.body.message.chat && event.body.message.chat.id) {
    chatId = event.body.message.chat.id;
  } else if (event.body.channel_post && event.body.channel_post.chat && event.body.channel_post.chat.id) {
    chatId = event.body.channel_post.chat.id;
  }
  console.log("chatId", chatId)

  // From
  var userNumber;
  if (event.body.message && event.body.message.from && event.body.message.from.id) {
    userNumber = event.body.message.from.id.toString();
  } else if (event.body.channel_post && event.body.channel_post.from && event.body.channel_post.from.id) {
    userNumber = event.body.channel_post.from.id.toString();
  }
  console.log("userNumber", userNumber)

  // message_id
  var message_id;
  if (event.body.message && event.body.message.message_id) {
    message_id = event.body.message.message_id.toString();
  }
  console.log("message_id", message_id)

  // first_name
  var first_name;
  if (event.body.message && event.body.message.from && event.body.message.from.first_name) {
    first_name = event.body.message.from.first_name;
  }
  console.log("first_name", first_name)

  // last_name
  var last_name;
  if (event.body.message && event.body.message.from && event.body.message.from.last_name) {
    last_name = event.body.message.from.last_name;
  }
  console.log("last_name", last_name)

  var response = {
    statusCode: 200,
    body: JSON.stringify({
      message: '',
      input: event,
    }),
  };

  if (chatId) {

    var keyboard = {}
    var detectedtext = {}

    if(file_id){
      /*
        file_id
        chatId,
        message_id
      */
      var config = {"file_id": file_id, "chatId":chatId, "message_id":message_id, "userNumber": userNumber, "message_id":message_id,"lastname": last_name, "firstname": first_name}
      const publishsns = helper.publish_sns(config, env_variables.SNS_TOPIC_TEXTREG);
      publishsns.then((data) => {
        console.log("published sns", data)
        return helper.sendChatActionToTelegram(chatId, "typing", env_variables.API_GATEWAY_URL);
      }).then((body) => {
        console.log("success message send", body)
        response.message = "success message send"
        callback(null, response);
      }).catch((err) => {
        response.statusCode =  400
        response.message = "Error"
        console.log("error", err)
        callback(err, "error");
      });

    } else {
      var config = {"file_id": file_id, "chatId":chatId, "message_id":message_id, "userNumber": userNumber, "message_id":message_id, "message":message,"lastname": last_name, "firstname": first_name}
      const publishsns = helper.publish_sns(config, env_variables.SNS_TOPIC_LEXREG);
      publishsns.then((data) => {
        console.log("published sns", data)
        return helper.sendChatActionToTelegram(chatId, "typing", env_variables.API_GATEWAY_URL);
      }).then((body) => {
        console.log("success message send", body)
        response.message = "success message send"
        callback(null, response);
      }).catch((err) => {
        response.statusCode =  400
        response.message = "Error"
        console.log("error", err)
        callback(err, "error");
      });

    }

  } else {
    response.statusCode = 400
    response.message = "No chatId"
    callback(response, "failed");
  }

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

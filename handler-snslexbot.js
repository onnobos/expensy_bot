'use strict';

const rp = require('request-promise');
const uuid = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');

const helper = require('./helper');

function contact_lex(botAlias, botName, message, userNumber,slots){
  const lexruntime = new AWS.LexRuntime();
  var request_slots = {}
  if(slots) request_slots = slots
  var params = {
    botAlias: botAlias,
    botName: botName,
    inputText: message,
    userId: userNumber,
    sessionAttributes: {},
    requestAttributes: request_slots
  };

  return lexruntime.postText(params).promise();
}

function processFulfillment(chatId, userNumber, message_id, action, data, sns_topics, first_name, last_name){
  console.log(`dialogState=${data.dialogState}, intentName=${data.intentName}`);
  if(data.dialogState == 'Fulfilled'){
    const snstopic = sns_topics[data.intentName];
    if(data.intentName == 'recordReceipt'){

      console.log("recordReceipt is Fulfilled")

      var slots = data.slots;

      // Convert amountType from string to float.
      slots.amountType =  parseFloat(slots.amountType);

      const datarecord = {
        chatId: chatId,
        userNumber: userNumber,
        message_id: message_id,
        first_name: first_name,
        last_name: last_name,
        action: action,
        dbrecord: slots
      }

      console.log("RecordSymptons is Fulfilled", JSON.stringify(datarecord))

      return helper.publish_sns(datarecord,snstopic)
    } else if(data.intentName == 'GetExpenseReport'){

          console.log("GetExpenseReport is Fulfilled")

          const datarecord = {
            chatId: chatId,
            userNumber: userNumber,
            message_id: message_id,
            period_id: data.slots.period,
            first_name: first_name,
            last_name: last_name,
          }

          console.log("GetExpenseReport is Fulfilled", JSON.stringify(datarecord))

          return helper.publish_sns(datarecord,snstopic)
        }

 }
 console.log("No Fulfillment.")

 return Promise.resolve(false)
}


module.exports.expensy_bot_snslexbot = (event, context, callback) => {
  const env_variables = {
    BOT_NAME: process.env.BOT_NAME,
    BOT_ALIAS: process.env.BOT_ALIAS,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    TELEGRAM_API: process.env.TELEGRAM_API,
    AWS_REGION: process.env.MY_AWS_REGION,
    API_FILE_GATEWAY_URL: process.env.API_FILE_GATEWAY_URL,
    SNS_TOPIC_DBASE: process.env.SNS_TOPIC_DBASE,
    SNS_TOPIC_REPORT: process.env.SNS_TOPIC_REPORT,
  }

  const sns_topics = {"recordReceipt":env_variables.SNS_TOPIC_DBASE, "GetExpenseReport": env_variables.SNS_TOPIC_REPORT};

  console.log("env_variables", env_variables);
  console.log("event", JSON.stringify(event));

  const message = JSON.parse(event.Records[0].Sns.Message);

  console.log("message", message)

  // File
  var file_id = message.file_id;
  console.log("file_id", file_id)

  // Chat ID
  var chatId = message.chatId;
  console.log("chatId", chatId)

  // From
  var userNumber = message.userNumber;
  console.log("userNumber", userNumber)

  // message_id
  var message_id = message.message_id;
  console.log("message_id", message_id)

  // lex_message
  var lex_message = message.message;
  console.log("lex_message", lex_message);

  // last_name
  var last_name;
  if (message.last_name) {
    last_name = message.last_name;
  } else {
    last_name = message.lastname;
  }
  console.log("last_name", last_name)

  // first_name
  var first_name;
  if (message.first_name) {
    first_name = message.first_name;
  } else {
    first_name = message.firstname;
  }
  console.log("first_name", first_name)

  var slots

  if (message.slots) {
    slots = message.slots
  }


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
    var config = {}

    const contactLex = contact_lex(env_variables.BOT_ALIAS, env_variables.BOT_NAME, lex_message, userNumber,slots)
    contactLex.then((data) => {
      console.log("Lex contracted. Trigger Fulfillment check.", data)
      lex_message = data.message
      return processFulfillment(chatId, userNumber, message_id, "insert", data, sns_topics,first_name, last_name)
    }).then((data) => {
      console.log("Fulfillment checked. Send message to Telegram", data)
      return helper.sendMessageToTelegram(chatId, message_id, lex_message , env_variables.API_GATEWAY_URL, keyboard);
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
    response.statusCode = 400
    response.message = "No chatId"
    callback(response, "failed");
  }

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

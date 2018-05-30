'use strict';

const rp = require('request-promise');
const uuid = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');
const textprocessor = require('./textprocessor');

const helper = require('./helper');

function getFileDetailsFromTelegram(file_id, uri) {
  const json = {
    file_id: file_id,
  }

  return rp({
    method: 'POST',
    uri: uri+"getFile",
    json: json
  });
}

function LoadFileFromTelegram(file_path, uri) {
  return rp({
    method: 'GET',
    uri: uri+file_path,
    encoding: null,
    resolveWithFullResponse: true
  });
}

function processDetectText(bytes){
  console.log("Object type", typeof bytes)
  const rekognition  = new AWS.Rekognition();
  var params = {
    Image: {
      Bytes: bytes
    }
  };
  return rekognition.detectText(params).promise();
}

function LoadFileFromS3(bucket, filename){
  const s3 = new AWS.S3();
  var params = {
    Bucket: bucket,
    Key: filename
  };
  return s3.getObject(params).promise();
}


module.exports.expensy_bot_textreg = (event, context, callback) => {
  const env_variables = {
    BOT_NAME: process.env.BOT_NAME,
    BOT_ALIAS: process.env.BOT_ALIAS,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    TELEGRAM_API: process.env.TELEGRAM_API,
    AWS_REGION: process.env.MY_AWS_REGION,
    DYNAMODB_TABLE: process.env.DYNAMODB_TABLE,
    API_FILE_GATEWAY_URL: process.env.API_FILE_GATEWAY_URL,
    CONFIG_BUCKET: process.env.CONFIG_BUCKET,
    CONFIG_FILE: process.env.CONFIG_FILE,
    SAVE_BUCKET:  process.env.SAVE_BUCKET,
    SNS_TOPIC_LEXREG: process.env.SNS_TOPIC_LEXREG,
  }

  console.log("env_variables", env_variables)
  console.log("event", JSON.stringify(event))

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

  var response = {
    statusCode: 200,
    body: JSON.stringify({
      message: '',
      input: event,
    }),
  };

  if (chatId) {

    var lex_message = "Hello."
    var keyboard = {}
    var detectedtext = {}
    var config = {}

    const getFileTelgram = getFileDetailsFromTelegram(file_id, env_variables.API_GATEWAY_URL)
    getFileTelgram.then((data) => {
      console.log("success File Retrieved", data.result)
      console.log("success File Retrieved", data.result.file_path)
      const loadfile = LoadFileFromTelegram(data.result.file_path, env_variables.API_FILE_GATEWAY_URL);
      return loadfile;
    }).then((bytes) => {
      console.log("Retrieved File - ", bytes)
      const detectText = processDetectText(bytes.body)
      return detectText;
    }).then((data) => {
      console.log("Text Detected - ", data)
      detectedtext = data
      const loadconfigfile = LoadFileFromS3(env_variables.CONFIG_BUCKET, env_variables.CONFIG_FILE);
      return loadconfigfile;
    }).then((json) => {
      config = JSON.parse(json.Body.toString('utf8'));
      console.log("Config File - ", config)
      lex_message = "Text Succesfull Detect"
      const processedtext = textprocessor.processText(detectedtext, config)
      console.log("processedtext:", JSON.stringify(processedtext))

      const amountType      = (processedtext.amount ? processedtext.amount : null);
      const receiptType     = (processedtext.receipttype ? processedtext.receipttype : null);
      const merchantType    = (processedtext.merchant ? processedtext.merchant : null);
      const amountCurrency  = (processedtext.currency ? processedtext.currency : null);
      const receiptdateType = (processedtext.receiptdate ? processedtext.receiptdate : null);

      var message_data = {
        file_id: file_id,
        chatId: chatId,
        userNumber: userNumber,
        message_id: message_id,
        message: "expense claim",
        last_name: last_name,
        first_name: last_name,
        slots: {
          amountType: amountType.toString(),
          receiptType: receiptType,
          merchantType: merchantType,
          amountCurrency: amountCurrency,
          receiptdateType: receiptdateType
        }
      };
      console.log("message_data:", JSON.stringify(message_data))
      return helper.publish_sns(message_data, env_variables.SNS_TOPIC_LEXREG);;
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

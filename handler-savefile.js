'use strict';

const rp = require('request-promise');
const uuid = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');
const textprocessor = require('./textprocessor');

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

function SaveFiletoS3(bucket, filename, bytes){
  const s3 = new AWS.S3();
  var params = {
    Bucket: bucket,
    Key: filename,
    Body: bytes
  };
  return s3.putObject(params).promise();
}


module.exports.expensy_bot_savefile = (event, context, callback) => {
  const env_variables = {
    BOT_NAME: process.env.BOT_NAME,
    BOT_ALIAS: process.env.BOT_ALIAS,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    TELEGRAM_API: process.env.TELEGRAM_API,
    AWS_REGION: process.env.MY_AWS_REGION,
    API_FILE_GATEWAY_URL: process.env.API_FILE_GATEWAY_URL,
    SAVE_BUCKET:  process.env.SAVE_BUCKET,
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
    var file_type = ""

    const getFileTelgram = getFileDetailsFromTelegram(file_id, env_variables.API_GATEWAY_URL)
    getFileTelgram.then((data) => {
      console.log("success File Retrieved", data.result)
      console.log("success File Retrieved", data.result.file_path)
      file_type = "." + data.result.file_path.split('.').pop()
      const loadfile = LoadFileFromTelegram(data.result.file_path, env_variables.API_FILE_GATEWAY_URL);
      return loadfile;
    }).then((bytes) => {
      console.log("Retrieved File - ", bytes)
      response.message = "success message send"
      var filename = userNumber + "-" + file_id + file_type
      console.log("filename", filename)
      return SaveFiletoS3(env_variables.SAVE_BUCKET, filename, bytes.body);
    }).then((body) => {
      console.log("File Saved successfully", body)
      response.message = "File Saved successfully"
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

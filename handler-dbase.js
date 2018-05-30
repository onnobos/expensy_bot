'use strict';

const uuid = require('uuid');
const moment = require('moment');

const AWS = require('aws-sdk');

function processFulfillment(chatId, action, slots, env_variables, first_name, last_name){
  const dynamoDb  = new AWS.DynamoDB.DocumentClient();
  const timestamp = moment();
  if(action == 'insert'){

    let receiptdate = moment(slots.receiptdateType,["DD-MM-YYYY", "YYYY-MM-DD", "DD.MM.YYYY","YYYY.MM.DD","DD/MM/YYYY","YYYY/MM/DD"]);

    const params = {
      TableName: env_variables.DYNAMODB_TABLE,
      Item: {
        id: uuid.v1(),
        receiptdateyear: receiptdate.format("YYYY"),
        receiptdatemonth: receiptdate.format("MM"),
        first_name: first_name,
        last_name: last_name,
        userid: chatId,
        slots: slots,
        createdAt: timestamp.format("YYYYMMDDHHmm")
      },
    };

    console.log("params", params);

    return dynamoDb.put(params).promise();
  }

  return Promise.resolve(false)
}

module.exports.expensy_bot_dbase = (event, context, callback) => {
  const env_variables = {
    AWS_REGION: process.env.MY_AWS_REGION,
    DYNAMODB_TABLE: process.env.DYNAMODB_TABLE,
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

  // action
  var action = message.action;
  console.log("action", action)

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

  // dbrecord
  var dbrecord = message.dbrecord;
  console.log("dbrecord", dbrecord)


  var response = {
    statusCode: 200,
    body: JSON.stringify({
      message: '',
      input: event,
    }),
  };

  if (chatId) {

    const process_dbase = processFulfillment(chatId, action, dbrecord, env_variables, first_name, last_name)
    process_dbase.then((data) => {
      console.log("success File Retrieved", data)
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

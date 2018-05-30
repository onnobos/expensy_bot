'use strict';

const rp            = require('request-promise');
const uuid          = require('uuid');
const moment        = require('moment');
const wkhtmltopdf   = require('wkhtmltopdf');
const fs            = require('fs');
const handlebars    = require('handlebars');

const AWS = require('aws-sdk');

const helper = require('./helper');

const StringDecoder = require('string_decoder').StringDecoder;

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];

function CreateHTMLData(data,period){
  let from_date = "";
  let to_date = "";
  let filename = "";

  if(period.length > 4) {
    const periodyear = parseInt(period.substr(0,4));
    const monthyear =  parseInt(period.substr(5,2));
    const daterange = helper.getMonthDateRange(periodyear, monthyear);
    from_date = daterange.start.format("DD/MM/YYYY");
    to_date   = daterange.end.format("DD/MM/YYYY");
    filename = daterange.start.format("DDMMYYYY") + "-" + daterange.end.format("DDMMYYYY")
  } else {
    from_date = "01/01/"+period;
    to_date   = "31/12/"+period;
    filename = period;
  }

  let lines = [];

  let counter = 1

  let total = {
    airtrans: 0.00,
    lodging: 0.00,
    meals: 0.00,
    mileage: 0.00,
    other: 0.00,
    grand: 0.00
  };

  data.forEach((line) => {

    const slot = line.slots;
    const receiptdate = moment(slot.receiptdateType,"YYYY-MM-DD");

    let receipt = {
      nr: counter,
      description: "",
      date: "",
      airtrans: 0.00,
      lodging: 0.00,
      meals: 0.00,
      mileage: 0.00,
      other: 0.00,
      total: 0.00,
    }

    if(slot.receiptType === "petrol") {
      receipt.description = "Diesel Volkswagen Company Car";
      receipt.date = receiptdate.format("DD/MM/YYYY");
      receipt.airtrans = slot.amountType;
      receipt.total = slot.amountType;
      total.airtrans = total.airtrans + receipt.airtrans;
      total.grand = total.grand + receipt.airtrans;
    } else if(slot.receiptType === "restaurant") {
      receipt.description = "Meal " + slot.merchantType;
      receipt.date = receiptdate.format("DD/MM/YYYY");
      receipt.meals = slot.amountType;
      receipt.total = slot.amountType;
      total.meals = total.meals + receipt.meals;
      total.grand = total.grand + receipt.meals;
    }

    lines.push(receipt);

    counter +=1;

  })

  let HTMLData = {
    name: data[0].first_name + " " + data[0].last_name,
    from_date: from_date,
    to_date: to_date,
    lines: lines,
    total: total,
    filename: filename
  }

  console.log("htmldata", JSON.stringify(HTMLData))


  return HTMLData;


}


function readDBase(chatId, period, env_variables){
  const dynamoDb  = new AWS.DynamoDB.DocumentClient();
  const timestamp = moment();

  let ExpressionAttributeValues = {};
  let KeyConditionExpression = "";

  if(period.length > 4) {
    KeyConditionExpression = "receiptdateyear = :receiptdateyear and receiptdatemonth = :receiptdatemonth";
    ExpressionAttributeValues = {
        ":receiptdateyear": period.substr(0,4),
        ":receiptdatemonth": period.substr(5,2)
    };
  } else {
    KeyConditionExpression = "receiptdateyear = :receiptdateyear";
    ExpressionAttributeValues = {
        ":receiptdateyear": period
    };
  };

  var params = {
      IndexName : env_variables.DYNAMODB_INDEX,
      TableName : env_variables.DYNAMODB_TABLE,
      KeyConditionExpression: KeyConditionExpression,
      ExpressionAttributeValues: ExpressionAttributeValues
  };

  return dynamoDb.query(params).promise();

}

function convertToPDF(htmlbuffer, chat_id, caption, url, filename, data){
  const options = { pageSize: 'A4', 'page-width': '297.039', 'orientation':'Landscape' };
  var decoder = new StringDecoder('utf8');

  const htmlInput = decoder.write(htmlbuffer);

  handlebars.registerHelper('set_decimal', function(num){
    return num.toFixed(2);
  });

  var template = handlebars.compile(htmlInput, { strict: true });
  var html = template(data);

  return new Promise((resolve, reject) => {
    let writeFile = fs.createWriteStream('/tmp/'+filename);

    wkhtmltopdf(html, options).pipe(writeFile);

    writeFile.on('finish', function(){

      const fileUpload = fs.createReadStream('/tmp/'+filename)

      var rp_options = {
        method: 'POST',
        uri: url + "sendDocument",
        qs: { chat_id: chat_id,
              caption: caption,
              document: fileUpload
        },
        formData: {
          document: fileUpload
        },
        headers: {
            'content-type': 'multipart/form-data'
        }
      };

      return resolve(rp(rp_options));
    });

    writeFile.on('error', function(){
      reject();
    });

  });

}


module.exports.expensy_bot_report = (event, context, callback) => {
  const env_variables = {
    AWS_REGION: process.env.MY_AWS_REGION,
    DYNAMODB_INDEX: process.env.DYNAMODB_INDEX,
    CONFIG_BUCKET: process.env.CONFIG_BUCKET,
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    HTML_TEMPLATE_FILE: process.env.HTML_TEMPLATE_FILE,
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

  // period_id
  var period_id = message.period_id;
  console.log("period_id", period_id)

  var response = {
    statusCode: 200,
    body: JSON.stringify({
      message: '',
      input: event,
    }),
  };

  if (chatId) {

    let htmltemplatebody = null;

    const loadconfigfile =  helper.LoadFileFromS3(env_variables.CONFIG_BUCKET, env_variables.HTML_TEMPLATE_FILE);
    loadconfigfile.then((data) => {
      console.log("success File Retrieved", data)
      htmltemplatebody = data.Body;
      return readDBase(chatId, period_id, env_variables);
    }).then((data) => {
      console.log("Database Queried successfully", data);
      response.message = "Database Queried successfully";
      const htmldata = CreateHTMLData(data.Items, period_id);
      return convertToPDF(htmltemplatebody, chatId, "Expenses Report", env_variables.API_GATEWAY_URL, htmldata.filename+"-expensesreport.pdf",htmldata);
    }).then((body) => {
      console.log("File Succesfull send to telegram", body);
      response.message = "File Succesfull send to telegram";
      callback(null, response);
    }).catch((err) => {
      response.statusCode =  400;
      response.message = "Error";
      console.log("error", err);
      callback(err, "error");
    });
    /*
    const loadconfigfile =  helper.LoadFileFromS3(env_variables.CONFIG_BUCKET, env_variables.HTML_TEMPLATE_FILE);
    loadconfigfile.then((data) => {
      console.log("success File Retrieved", data)
      const htmldata = {
        title: 'Month Report',
        author: '@azat_co',
        tags: ['express', 'node', 'javascript']
      }
      return convertToPDF(data.Body, chatId, "My file", env_variables.API_GATEWAY_URL, "test.pdf",htmldata);
    }).then((body) => {
      console.log("File Succesfull send to telegram", body);
      response.message = "File Succesfull send to telegram";
      callback(null, response);
    }).catch((err) => {
      response.statusCode =  400
      response.message = "Error"
      console.log("error", err)
      callback(err, "error");
    });
    */
  } else {
    response.statusCode = 400
    response.message = "No chatId";
    callback(response, "failed");
  }

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

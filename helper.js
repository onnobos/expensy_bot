'use strict';
const rp = require('request-promise');
const moment = require('moment');
const AWS = require('aws-sdk');
/**
 * Helper functions
 */
module.exports = {
	sendMessageToTelegram(chatId, message_id, message, uri, reply) {
	  const json = {
	    chat_id: chatId,
	    text: message,
	    parse_mode: 'HTML',
	  }

	  if(reply !== null){
	    json.reply_markup = reply
	  }

	  return rp({
	    method: 'POST',
	    uri: uri+"sendMessage",
	    json: json
	  });
	},

	publish_sns(data, snstopic){
	  const sns = new AWS.SNS();
	  const params = {
	    TopicArn: snstopic,
	    Message: JSON.stringify(data)
	  };

	  return sns.publish(params).promise();
	},

	getMonthDateRange(year, month) {

	    // month in moment is 0 based, so 9 is actually october, subtract 1 to compensate
	    // array is 'year', 'month', 'day', etc
	    var startDate = moment([year, month - 1]);

	    // Clone the value before .endOf()
	    var endDate = moment(startDate).endOf('month');

	    // just for demonstration:
	    console.log(startDate.toDate());
	    console.log(endDate.toDate());

	    // make sure to call toDate() for plain JavaScript date type
	    return { start: startDate, end: endDate };
	},


	sendChatActionToTelegram(chatId, action, uri) {
		const json = {
			chat_id: chatId,
			action: action,
		}

		return rp({
			method: 'POST',
			uri: uri+"sendChatAction",
			json: json
		});
	},

	LoadFileFromS3(bucket, filename){
	  const s3 = new AWS.S3();
	  var params = {
	    Bucket: bucket,
	    Key: filename
	  };
	  return s3.getObject(params).promise();
	}

};

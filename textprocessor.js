'use strict';

/**
 * textProcessor
 */
module.exports = {
	config: {},
	data: {},
	datatext: "",
	processText(data, config){
		this.data = data
		this.config = config
		var receipt = {}

		this.createLongString()

		receipt['receipttype'] = ""
		receipt['merchant'] = this.FindObjectReceipt("restaurants")
		if(!receipt['merchant']){
			receipt['merchant'] = this.FindObjectReceipt("petrolstations")
			if(receipt['merchant']) {
				receipt['receipttype'] = "petrolstation"
			}
		} else {
			receipt['receipttype'] = "restaurant"
		}
		receipt['currency'] = this.getCurrency().toLowerCase
		receipt['amount'] = this.getAmount()
		receipt['receiptdate'] = this.receiptDate(receipt['currency'])
		console.log("receipt", receipt)
		return receipt;
	},
	createLongString(){
		var self = this
		self.datatext = ""
		self.data.TextDetections.forEach((line) => {
			if(line.Type == "LINE"){
				self.datatext += line.DetectedText.toLowerCase() + "|"
			}
		});
	},
	FindObjectReceipt(receipttype){
		var self = this
		var result = false
		self.config[receipttype].some((restaurant) => {
			console.log("receipttype", receipttype, restaurant)
			const pos = self.datatext.indexOf(restaurant)
				if(pos >= 0){
					console.log("found record", receipttype, restaurant);
					result = restaurant;
					return true;
				}
		});
		return result
	},

	getCurrency(){
		var self = this
		var result = false

		console.log("self.datatext", self.datatext)
		self.config['currency'].some((currency) => {
			console.log("currency", currency)
			const pos = self.datatext.indexOf(currency)
			if(pos > 0){
				console.log("found record", currency);
				result = currency.toUpperCase();
				return true;
			}
		});

		return result;

	},


	getAmount(){
		var self = this
		var result = false

		var regex = /\b\d+[,.]\d{0,2}/g;
		var match;
		var NumbersArr = []
		while (match = regex.exec(self.datatext)) {
				NumbersArr.push(parseFloat(match[0]))
		}
		if(NumbersArr.length > 0){
			NumbersArr = NumbersArr.sort(function(a,b) { return b - a;});
			console.log("NumbersArr", NumbersArr[0], NumbersArr)
			result = NumbersArr[0]
			if(result < 0 && result > 500){
				result = null;
			}
		}

		return result;

	},
	receiptDate(currency){
		var self = this
		var result = false
		var regex
		var match;
		var NumbersArr = []

		if(currency != "USD"){
			// European Data Format
			regex = /\b(0?[1-9]|[12]\d|3[01])([\/\-\.])(0?[1-9]|1[012])\2(\d{2,4})/g;
		} else {
			// US Data Format
			regex = /\b(0?[1-9]|1[012])([\/\-\.])(0?[1-9]|[12]\d|3[01])\2(\d{2,4})/g;

		}

		while (match = regex.exec(self.datatext)) {
				NumbersArr.push({"datum":match[0], "DD":match[0], "MM":match[2], "YY":match[3]})
		}
		if(NumbersArr.length > 0){
			result = NumbersArr[0].datum
		}

		return result;
	},
};

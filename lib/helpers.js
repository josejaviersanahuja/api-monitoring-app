/**
 * Helpers for various tasks
 */
// Dependencies
const crypto = require("crypto");
const config = require("../config");
const https = require("https");
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");
const contractChecker = require("./contractChecker");

//container for all helpers
const helpers = {};

//Create a SHA256 hash
helpers.hash = function (str) {
  if (typeof str == "string" && str.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

// Parse a json string to an object in all cases, without throwing errors
helpers.parseJsonToObject = function (str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// create a random alphanumeric id of num length
helpers.createRandomString = function (num) {
  num = typeof num == "number" && num > 0 ? num : false;
  if (num) {
    const possibleCharacters =
      "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let finalID = "";

    for (let index = 0; index < num; index++) {
      const randomElement = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );

      finalID += randomElement;
    }

    return finalID;
  } else {
    return false;
  }
};

/****************************************************
 *                  TWILIO
 * ************************************************* */

helpers.sendTwilioSms = function (phone, msg, twilioCallbackError) {
  //Validate parameters
  phone =
    typeof phone == "string" && phone.trim().length === 11
      ? phone.trim()
      : false;
  msg =
    typeof msg == "string" && msg.trim().length > 0 && msg.length <= 1600
      ? msg.trim()
      : false;
  if (phone && msg) {
    //Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: "+" + phone,
      Body: msg,
    };

    // Stringify payload
    const stringPayload = querystring.stringify(payload);

    //Configure the request
    const requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path:
        "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
      auth: config.twilio.accountSid + ":" + config.twilio.authToken,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload),
      },
    };
    // Instantiate the request object
    const req = https.request(requestDetails, function (res) {
      //Grab the status of the sent request
      const status = res.statusCode;
      // Callback succesfully if the request went through
      if (status == 200 || status == 201) {
        twilioCallbackError(false);
      } else {
        twilioCallbackError("Status code returned was: " + status);
      }
    });

    // Bind to the error event
    req.on("error", function (e) {
      twilioCallbackError(e);
    });

    // Add the payload
    req.write(stringPayload);

    //End the request
    req.end();
  } else {
    twilioCallbackError("Given Parameters were missing or invalid");
  }
};

// GET HTML TEMPLATE
helpers.getTemplate = function (templateName, data, callback) {
  // we check is the template name is a not empty string, otherwise will be false
  templateName = contractChecker.notEmptyString(templateName);
	data = contractChecker.object(data)
  if (templateName) {
		const templateDir = path.join(__dirname, '/../templates/')
		//we start getting the header
		fs.readFile(templateDir+'_header.html', 'utf8', function(err, headerStr){
			let finalResponse = ''
			if (!err && headerStr) {
				//we add the header
				finalResponse+=helpers.interpolate(headerStr, data)
				//now we  get the template
				fs.readFile(templateDir+templateName+'.html','utf8', function(err, templateStr){
					if (!err && templateStr) {
						//we add the template to the response
						finalResponse+=helpers.interpolate(templateStr, data)
						//now we get the footer
						fs.readFile(templateDir+'_footer.html','utf8', function(err,footerStr){
							if (!err && footerStr) {
								//now we add the footer to the response
								finalResponse+=helpers.interpolate(footerStr, data)
								callback(false, finalResponse)
							} else {
								callback('Internal Error building the footer html')
							}
						})
					} else {
						callback('Internal Error building template html')
					}
				})
			} else {
				callback('Internal Error building header html')
			}
		})
  } else {
		callback('Not a valid template name')
  }
};

// FIND AND REPLACES ALL KEYS inside HTML TEMPLATES
helpers.interpolate = function(str, data){
	str = contractChecker.notEmptyString(str)
	data = contractChecker.object(data)

	//Add the template globals

	for (let keyName in config.templateGlobals) {
		data['global.'+keyName] = config.templateGlobals[keyName]
	}

	//For each key in the data object we want to insert its value into the str
	for (const key in data) {
		if (Object.hasOwnProperty.call(data, key) && typeof data[key] == 'string') {
			const replace = data[key];
			const find = '{'+key+'}'
			str = str.replace(find,replace)
		}
	}
	//returning the str mutated
	return str
}

//GET THE EXTENSION OF THE FILE
helpers.getFileContentType = function(fileFullName){
	if (fileFullName.includes('.css')) {
		return 'css'
	}
	/* else if (fileFullName.includes('.js')) {
		return 'plain'
	} */
	else if (fileFullName.includes('.png')) {
		return 'png'
	}
	else if (fileFullName.includes('.jpg')) {
		return 'jpg'
	}
	else if (fileFullName.includes('.ico')) {
		return 'favicon'
	}
	else if (fileFullName.includes('.png')) {
		return 'png'
	}
	else {
		return 'plain'
	}
}

//GET DATA FROM FILES
helpers.getStaticAsset = function(fileName, callback){
	fileName = contractChecker.notEmptyString(fileName)

	if (fileName) {
		const publicDir = path.join(__dirname,'/../public/')
		fs.readFile(publicDir+fileName, function(err, data){
			//no utf8 as we want the raw data
			if (!err && data) {
				callback(false, data)
			} else {
				callback('Error reading the file: ', fileName)
			}
		})
	} else {
		callback('Not a valid fileName')
	}
}

//getNumber function, dummie function for testing creation
helpers.getANumber = function() {
  return 1
}
// Export the module
module.exports = helpers;

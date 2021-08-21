/**
 * Worker-related tasks
 *
 */

// Dependencies
const http = require("http");
const https = require("https");
const { URL } = require("url");
const util = require('util')
const debug = util.debuglog('workers')
const { tokensModel, checksModel, logsModel} = require('../models')

// Instantiate the worker module object
const workers = {};

// Loop up the checks, get all their data, send to a validator
workers.gatherAllChecks = async function () {
  //GET ALL CHECKS
  try {
    const checksList = await checksModel.find()
    // if there are checks
    if (checksList.length > 0) {
      checksList.forEach((check) => {
        //Pass it to the check validator, and let that function continue and log errors
        workers.validateCheckData(check);
      });
    } else {
      debug("No Checks to process")
    }
  } catch (error) {
    debug("Error: Could not find any checks to process");
  }
};

//Timer to execute the worker-process once per 2minutes
workers.loop = function () {
  setInterval(function () {
    // puedo poner el gatherAllchecks directo???
    workers.gatherAllChecks();
  }, 1000 * 120);
};

//Timer to execute the log-delete proccess once per day
workers.logDeleteLoop = function () {
    setInterval(function () {
      // puedo poner el gatherAllchecks directo???
      workers.deleteLogs();
    }, 1000 * 60*60*24);
  };

// Delete the old logs Documents 7days
workers.deleteLogs = async function(){
    //List all logs
    try {
      //delete all logs with last checked less than date.now - 7days
      const answer = await logsModel.deleteMany({lastChecked: {$lte : (Date.now()- 1000*60*60*24*7)}})
      // if there were logs deleted
      if (answer.n > 0) {
        debug(answer.n,' items deleted from data base')
      } else {
        debug('No logs deleted from database')
      }
    } catch (error) {
      debug('Error: Problem with databse connection, cleaning logs worker');
    }
}

//Sanity-checking the checkData
workers.validateCheckData = function (checkData) {
  // validating check data
  checkData =
    typeof checkData == "object" && checkData !== null ? checkData : {};
  checkData.id =
    typeof checkData.id == "string" && checkData.id.trim().length === 20
      ? checkData.id.trim()
      : false;
  checkData.userPhone =
    typeof checkData.userPhone == "string" &&
    checkData.userPhone.trim().length === 11
      ? checkData.userPhone.trim()
      : false;
  checkData.protocol =
    typeof checkData.protocol == "string" &&
    ["http", "https"].includes(checkData.protocol.trim())
      ? checkData.protocol.trim()
      : false;
  checkData.url =
    typeof checkData.url == "string" && checkData.url.trim().length > 0
      ? checkData.url.trim()
      : false;
  checkData.method =
    typeof checkData.method == "string" &&
    ["post", "get", "put", "delete"].includes(
      checkData.method.toLowerCase().trim()
    )
      ? checkData.method.toLowerCase().trim()
      : false;
  checkData.successCodes =
    Array.isArray(checkData.successCodes) && checkData.successCodes.length > 0
      ? checkData.successCodes
      : false;
  checkData.timeoutSeconds =
    typeof checkData.timeoutSeconds == "number" &&
    checkData.timeoutSeconds % 1 === 0 &&
    checkData.timeoutSeconds >= 1 &&
    checkData.timeoutSeconds <= 5
      ? checkData.timeoutSeconds
      : false;

  // Set 2 new keys when the checks are being perfomed
  checkData.state =
    typeof checkData.state == "string" &&
    ["up", "down"].includes(checkData.state)
      ? checkData.state
      : "down";
  checkData.lastChecked =
    typeof checkData.lastChecked == "number" && checkData.lastChecked > 0
      ? checkData.lastChecked
      : 0;

    //If all the checks pass, pass the data along to the next step in the process
  if (
    checkData.id &&
    checkData.userPhone &&
    checkData.protocol &&
    checkData.url &&
    checkData.method &&
    checkData.successCodes &&
    checkData.timeoutSeconds
  ) {
    workers.performCheck(checkData);
  } else {
    debug(
      "Error: one of the checks is not properly formatted. skipping it"
    );
  }
};

//performCheck. send original checkData to the next step
workers.performCheck = function (checkData) {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: {},
    responseCode: 0,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // parse the hostname and the path from the checkData
  const parsedUrl = new URL(`${checkData.protocol}://${checkData.url}`);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.pathname;
  const queryString = parsedUrl.search;

  //Construct the request
  const requestDetails = {
    hostname: hostName,
    method: checkData.method.toUpperCase(),
    path: path + queryString,
    timeout: checkData.timeoutSeconds * 1000,
  };
  
  //Instantiate the request object (using either the http or https module)
  const _moduleToUse = checkData.protocol === "http" ? http : https;
  const req = _moduleToUse.request(requestDetails, function (res) {
    //Grab the status of the sent request
    const status = res.statusCode; 
    //Update the checkOutcome and pass the data along
    checkOutcome.responseCode = status;
    
    if (!outcomeSent) {
      checkOutcome.error={
        error:false,
        value: "No Error"
      }
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind the same code if there is an error
  req.on("error", function (e) {
    // Update the checkOutcome and pass it to the data along
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind the same code if the request last longer than the timeout set
  req.on("timeout", function (e) {
    // Update the checkOutcome and pass it to the data along
    checkOutcome.responseCode=0
    checkOutcome.error = {
      error: true,
      value: "timeout",
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  //End the request
  req.end();
};

// PROCESS CHECK OUTCOME and update the checkData, trigger an alert if needed
// Special logic, initial State of the check is down, we don´t want alerts on the initial State. only if its down after some checks
workers.processCheckOutcome = async function (checkData, checkOutcome) {
  //Decide if the check is considered up or down
  const state =
    !checkOutcome.error.error &&
    checkOutcome.responseCode &&
    checkData.successCodes.includes(checkOutcome.responseCode.toString())
      ? "up"
      : "down";
  // Decide if an alert is warranted
  const alertWarranted =
    checkData.lastChecked !== 0 && checkData.state !== state ? true : false;
  
  // Update the checkData
  try {
    const timeOfCheck = Date.now()
    const answer = await checksModel.updateOne({id:checkData.id},{state:state, lastChecked:timeOfCheck})
    //LOG DATA INTO DATABASE ONLY IF MUST ALERT 
  if (alertWarranted) {
    //creating the model to store in DB
    //LOGIC TO CHECK IF responsePayload.url ENDS WITH / or no
    const urlLength = checkData.url.length
    const lastChar = checkData.url.charAt(urlLength-1)
    // the final url to store un logs collection
    let urlForLink=''
    if(lastChar==="/"){
      urlForLink=checkData.url.slice(0, urlLength-1)
    } else {
      urlForLink = checkData.url
    }
    //END OF THIS LOGIC
    const logItem = new logsModel({
      id: checkData.id +'-'+ Date.now(),
      protocol: checkData.protocol,
      userPhone: checkData.userPhone,
      url: urlForLink,
      method: checkData.method,
      successCodes: checkData.successCodes,
      timeoutSeconds: checkData.timeoutSeconds,
      state: checkData.state,
      lastChecked: timeOfCheck,
      error: checkOutcome.error,
      responseCode: checkOutcome.responseCode,
      alert:alertWarranted
    })
    const logObject = await logItem.save()  
    workers.alertUser(logObject)
  } else {
    debug('Check outcome has not changed, no alert needed for: ', checkData.url);
  }
  if (answer.ok ===1) {
    debug('check update into the DB SUCCEDED');
  } else {
    debug('check update into DB FAILED');
  }
  } catch (error) {
    debug('Error when saving the updated check file: ', checkData.id, error);
  }
}

// Alerting the user that the status changed
workers.alertUser = function(newCheckData){
  debug('entro a alertar al user')
    const msg = 'Alert: your check ['+ newCheckData.method + '] '+newCheckData.protocol+'://'+newCheckData.url + ' is currently ' +newCheckData.state
    // send the message
    /* helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err){
        if(!err){
            console.log('\x1b[47m%s\x1b[0m','SUCCESS... user '+ newCheckData.userPhone +' alerted');
        }else{
            console.log('\x1b[41m%s\x1b[0m','Error, could not send SMS alert to user: ' + newCheckData.userPhone);
        }
    }) */
    //@TODO the real app would be with twilioSMS for now just check the log
    //console.log('\x1b[41m%s\x1b[0m','twilio service DOWN BY ZITROJJDEV... CHECK LOG instead ', newCheckData.url, newCheckData.error);
}

// If a token has expired, clean it
workers.cleanOldTokens = function(){
  setInterval(async function () {
    // que the list of tokens
    try {
      const answer = await tokensModel.deleteMany({expires:{$lte: Date.now()}})
      if (answer.n>0) {
       //console.log('\x1b[33m%s\x1b[0m','Old tokens were cleaned from DB. ', answer.n);
      }
    } catch (error) {
      //console.log('\x1b[41m%s\x1b[0m','Error detected during cleaning old token method _data.list'); 
    }
  }, 1000 * 60);
}
// Init script
workers.init = function () {
  //Execute all checks immediately
  workers.gatherAllChecks();

  //Call the loop so the checks will execute later on
  workers.loop();

  //delete old
  workers.deleteLogs()

  //Call the  compression loop so logs will be compressed later on
  workers.logDeleteLoop()

  //Call clean old tokens
  workers.cleanOldTokens()
  //logging that workers are on
  console.log('\x1b[33m%s\x1b[0m','Background workers are running');
};

module.exports = workers
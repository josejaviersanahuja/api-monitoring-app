/**
 * Worker-related tasks
 *
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers"); // to send twilioSMS dont erase
const http = require("http");
const https = require("https");
const { URL } = require("url");
const _logs = require('./logs')
const util = require('util')
const debug = util.debuglog('workers')

// Instantiate the worker module object
const workers = {};

// Loop up the checks, get all their data, send to a validator
workers.gatherAllChecks = function () {
  //GET ALL CHECKS
  _data.list("checks", function (err, checksList) {
    if (!err && checksList && checksList.length > 0) {
      checksList.forEach((check) => {
        //Read the check data
        _data.read("checks", check, function (err, checkData) {
          if (!err && checkData) {
            //Pass it to the check validator, and let that function continue and log errors
            workers.validateCheckData(checkData);
          } else {
            debug("Error reading the checks file in: " + check + ".json");
          }
        });
      });
    } else {
      debug("Error: Could not find any checks to process");
    }
  });
};

//Timer to execute the worker-process once per minute
workers.loop = function () {
  setInterval(function () {
    // puedo poner el gatherAllchecks directo???
    workers.gatherAllChecks();
  }, 1000 * 120);
};

//Timer to execute the log-rotation proccess one per day
workers.logRotationLoop = function () {
    setInterval(function () {
      // puedo poner el gatherAllchecks directo???
      workers.rotateLogs();
    }, 1000 * 60*60*24);
  };

// Rotate Compress  the logs files
workers.rotateLogs = function(){
    //List all none compressed logs
    _logs.list(false, function(err, logs){ 
        if (!err && logs && logs.length>0) {
            logs.forEach( log => {
                //Compress the data
                const logId = log.replace('.log','')
                const newFileID = logId+'-'+Date.now()
                _logs.compress(logId, newFileID, function(err){ 
                    if (!err) {
                        //Truncate the original log
                        _logs.truncate(logId, function(err){ 
                            if (!err) {
                              debug('Succes truncating log file');
                            } else {
                              debug('Error: Truncating the file: ' + logId);
                            }
                        })
                    } else {
                      debug('Error: compressing the file of id: ' + logId +' and the error is: ', err);
                    }
                }) 
            })
        } else {
          debug('Error: Could not find any logs to rotate');
        }
    })
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
      : false;

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
    error: false,
    responseCode: false,
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
workers.processCheckOutcome = function (checkData, checkOutcome) {

  //Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    checkData.successCodes.includes(checkOutcome.responseCode.toString())
      ? "up"
      : "down";

  // Decide if an alert is warranted
  const alertWarranted =
    checkData.lastChecked && checkData.state !== state ? true : false;
  
  // Update the checkData
  const newCheckData = checkData
  newCheckData.state = state
  newCheckData.lastChecked = Date.now()

  //LOG DATA INTO A FILELOG
  const timeOfCheck = newCheckData.lastChecked
  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck)
  //Save the update to disk
  _data.update('checks', newCheckData.id, newCheckData, function(err){
      if (!err) {
          //Send the new check and data to the next step and alert user if needed
          if (alertWarranted) {
              workers.alertUser(newCheckData)
          } else {
            debug('Check outcome has not changed, no alert needed for: ', newCheckData.url);
          }
      } else {
        debug('Error when saving the updated check file: ', newCheckData.id);
      }
  })
};

//workers LOG va a llevar a cabo un log de datos
workers.log = function(checkData, checkOutcome, state, alertWarranted, timeOfCheck){
    const date = new Date(timeOfCheck)
    const payloadObject = {
      date:date.toUTCString(),
      ...checkData,
      state:state.toUpperCase(),
      ...checkOutcome,
      alert:alertWarranted
    }
    const payload= JSON.stringify(payloadObject)
    const fileName = `${checkData.id}`
    
    // Append the log to the right file
    _logs.append(fileName, payload, function(err){
        if (!err) {
          debug('log into the file SUCCEDED');
        } else {
          debug('log into fie FAILED');
        }
    })
}

// Alerting the user that the status changed
workers.alertUser = function(newCheckData){
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
    console.log('\x1b[41m%s\x1b[0m','twilio service DOWN BY ZITROJJDEV... CHECK LOG instead ', newCheckData.id, newCheckData.url);
}

// If a token has expired, clean it
workers.cleanOldTokens = function(){
  setInterval(function () {
    // que the list of tokens
    _data.list('tokens', function(err, tokenList){
      if (!err) {
        if (tokenList.length>0) {
          //now we check all tokens and open get the data
         tokenList.forEach(token => {
          _data.read('tokens', token, function(err, tokenData){
            if (!err && tokenData) {
              //now we check if the token has expired
              if (tokenData.expires < Date.now()) {
                _data.delete('tokens', token, function(err){
                  if (!err) {
                    console.log('\x1b[32m%s\x1b[0m','token '+ token + ' had expired and was deleted' );
                  } else {
                    console.log('\x1b[41m%s\x1b[0m','Error detected during cleaning old token method _data.read')
                  }
                })
              }
            } else {
              console.log('\x1b[41m%s\x1b[0m','Error detected during cleaning old token method _data.read'); 
            }
          })
         }) 
        }
      } else {
       console.log('\x1b[41m%s\x1b[0m','Error detected during cleaning old token method _data.list'); 
      }
    })
  }, 1000 * 60);
}
// Init script
workers.init = function () {
  //Execute all checks immediately
  workers.gatherAllChecks();

  //Call the loop so the checks will execute later on
  workers.loop();

  //Compress all the logs inmediatly
  workers.rotateLogs()

  //Call the  compression loop so logs will be compressed later on
  workers.logRotationLoop()

  //Call clean old tokens
  workers.cleanOldTokens()
  //logging that workers are on
  console.log('\x1b[33m%s\x1b[0m','Background workers are running');
};

module.exports = workers
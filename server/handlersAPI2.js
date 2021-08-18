/**
 * Request handlers FOR API JSON
 *
 */

//Dependencies
const config = require("../config");
const _data = require("../lib/data");
const helpers = require("../lib/helpers");
const {URL} = require('url')
const dns = require('dns')
const { performance, PerformanceObserver } = require('perf_hooks');
const { usersModel, tokensModel, checksModel, logsModel} = require('../models')

//defining CONST handlers and router
const handler = {};

handler.ping = function (data, callback) {
  // calback a status code and a payload
  callback(200);
};

handler.notFound = function (data, callback) {
  // callback a status code 404 and maybe a payload
  callback(404);
};

handler.users = function (data, callback) {
  //figure out which methods to trigger
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handler._users[data.method](data, callback);
  } else {
    callback(405); // the method is not acceptable
  }
};

// methods like the nextone handler._users is a method that should be hidden for users methods, but available for the main methods handler.users
handler._users = {};

// users-post
//Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none
handler._users.post = function (data, callback) {
  //Check that all required fields are filled out
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 11 // check this line to integrate a universal use of phone numbers
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement === true;

  if (firstName && lastName && password && phone && tosAgreement) {
    //Make sure that the user doesnt already exist
    //usersModel.find({phone: phone})
    _data.read("users", phone, function (err, data) {
      if (err) {
        // Hash the password
        const hashedPasswor = helpers.hash(password);
        if (hashedPasswor) {
          // create the user Object
          const userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPasswor,
            tosAgreement: true,
          };

          // store the user
          _data.create("users", phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.error(err);
              callback(400, { Error: "Could not create the nue user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the users password" });
        }
      } else {
        callback(400, { Error: "User already exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields, or one or some of them don´t fit the contract. Probably the Phone number" });
  }
};
//users-get
// Required data: phone
// Optional data: none
handler._users.get = function (data, callback) {
  //Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.get("phone") == "string" &&
    data.queryStringObject.get("phone").trim().length === 11
      ? data.queryStringObject.get("phone").trim()
      : false;
  if (phone) {
    //Get the token from headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    handler._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Look up the user
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            // removed the hashed password from the user object
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required field token in headers or token invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
//users-put
//Required data: phone + 1 optional data
//Optional data: firstName, lastName, password
handler._users.put = function (data, callback) {
  // Check the required fields
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 11 // check this line to integrate a universal use of phone numbers
      ? data.payload.phone.trim()
      : false;

  // Check for the optional fields
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone) {
    //Error if no attributes to update
    if (firstName || lastName || password) {
      //Get the token from headers
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;

      handler._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          // Look up the user
          _data.read("users", phone, function (err, userData) {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // persist new data
              _data.update("users", phone, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.error(err);
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(404, { Error: "Specified User does not exist" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required field token in headers or token invalid",
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//users-delete
// Required data: phone
handler._users.delete = function (data, callback) {
  //Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.get("phone") == "string" &&
    data.queryStringObject.get("phone").trim().length === 11
      ? data.queryStringObject.get("phone").trim()
      : false;
  if (phone) {
    //Get the token from headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    handler._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Look up the user
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            const userChecks = Array.isArray(data.checks) ? data.checks : [];
            _data.delete("users", phone, function (err) {
              if (!err) {
                // Delete Checks
                if (userChecks.length > 0) {
                  let deletedChecksCountDown = userChecks.length;
                  let deletionErrors = false;
                  userChecks.forEach((id) => {
                    //Delete by id
                    _data.delete("checks", id, function (err) {
                      if (!err) {
                        deletedChecksCountDown = deletedChecksCountDown - 1;
                      } else {
                        deletionErrors = true;
                      }
                      if (!deletionErrors && deletedChecksCountDown === 0) {
                        callback(200);
                      } 
                      if (deletionErrors && deletedChecksCountDown === 0){
                        callback(500, {
                          Error: "Not all checks of the user, were deleted",
                        });
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            callback(404, { Error: "Could not find the specified user" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required field token in headers or token invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//************************************************
// TOKENS
//********************************************* */

handler.tokens = function (data, callback) {
  //figure out which methods to trigger
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handler._tokens[data.method](data, callback);
  } else {
    callback(405); // the method is not acceptable
  }
};

// handler._tokens is a container of private methods that should be hidden for everybody, but available for the main methods handler.tokens
handler._tokens = {};

// tokens-post
//Required data: phone, password
//Optional data: none
handler._tokens.post = function (data, callback) {
  //Check that all required fields are filled out
  performance.mark('entered post token function')
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 11 // check this line to integrate a universal use of phone numbers
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  performance.mark('begining user lookup post token')
  if (password && phone) {
    //Make sure that the user doesnt already exist
    _data.read("users", phone, function (err, userData) {
      performance.mark('user lookup complete')
      if (!err && userData) {
        // Hash the password
        performance.mark('begining password hashing')
        const hashedPasswor = helpers.hash(password);
        performance.mark('password hashing complete')
        if (hashedPasswor === userData.hashedPassword) {
          // create a new token with a random name and an expiration of 1 hour
          performance.mark('building the data for the token')
          const tokenID = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;

          const tokenObject = {
            phone: phone,
            id: tokenID,
            expires: expires,
          };
          performance.mark('begining storing token')
          //Store the token
          _data.create("tokens", tokenID, tokenObject, function (err) {
            performance.mark('storing token  complete')

            //GATHER all the performance
            performance.measure('Begining to end', 'entered post token function','storing token  complete')
            performance.measure('Validating user input', 'entered post token function', 'begining user lookup post token')
            performance.measure('user lookup', 'begining user lookup post token','user lookup complete' )
            performance.measure('password hashing', 'begining password hashing','password hashing complete' )
            performance.measure('token data creation', 'building the data for the token','begining storing token' )
            performance.measure('token storing', 'begining storing token','storing token  complete' )

            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the token" });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match specified user password",
          });
        }
      } else {
        callback(400, { Error: "Could not find specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};
// tokens-get
// Required data: id
// Optional data: none
handler._tokens.get = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { Error: "did not find that token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
//tokens-put
//Required data: id, extend
//Optional data: none
handler._tokens.put = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend = data.payload.extend === true;
  // Check for the optional fields
  if (id && extend) {
    // Look up the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // check that the token is still valid
        if (tokenData.expires > Date.now()) {
          // set the new extension
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          //store the token again
          _data.update("tokens", id, tokenData, function (err) {
            if (!err) {
              callback(200, { Message: "Token valid for 1 more hour" });
            } else {
              callback(500, { Error: "Could not extend the token" });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired and can´t be extended",
          });
        }
      } else {
        callback(400, { Error: "That token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields or they are invalid" });
  }
};

// tokens-delete
// Required data: id
handler._tokens.delete = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // delete the file
        _data.delete("tokens", id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(404, { Error: "Could not find the specified token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

handler._tokens.verifyToken = function (id, phone, booleanCallback) {
  //look up the token
  _data.read("tokens", id, function (err, tokenData) {
    if (!err && tokenData) {
      //Check if the token is for the current user
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        booleanCallback(true);
      } else {
        booleanCallback(false);
      }
    } else {
      booleanCallback(false);
    }
  });
};

/************************************************
 *                    CHECKS
 * ********************************************* */
// Lets define the main service of this API
handler.checks = function (data, callback) {
  //figure out which methods to trigger
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.includes(data.method)) {
    handler._checks[data.method](data, callback);
  } else {
    callback(405); // the method is not acceptable
  }
};

// handler._checks is a container of private methods that should be hidden for everybody, but available for the main methods handler.checks
handler._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, TimeOut seconds
// Optional data: none
handler._checks.post = function (data, callback) {
  //Validate inputs
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].includes(data.payload.protocol)
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].includes(data.payload.method.toLowerCase())
      ? data.payload.method.toLowerCase()
      : false;

  const successCodes = Array.isArray(data.payload.successCodes)
    ? data.payload.successCodes
    : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
 // console.log('DEBBUG SERVER:  ', data.payload);
  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get token from header
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Look up the user by reading the token
    _data.read("tokens", token, function (err, tokenData) {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        //look up the user data
        _data.read("users", userPhone, function (err, userData) {
          if (!err && userData) {
            const userChecks = Array.isArray(userData.checks)
              ? userData.checks
              : [];

            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              //BEFORE BLIDINGLY CREATE A CHECK ON A URL THAT MAY NOT EXIST, LETS CHECK IT WITH DNS entries
              const parsedURL = new URL({ toString: () => protocol+'://'+url });
              const hostname = typeof(parsedURL.hostname)=='string' && parsedURL.hostname.length >0 ? parsedURL.hostname: false

              dns.resolve(hostname, function(err, adressList) {
                if (!err && adressList) {
                      // Create the check object and include the users phone
                  const checkObject = {
                    id: checkId,
                    protocol: protocol,
                    userPhone: userPhone,
                    url: url,
                    method: method,
                    successCodes: successCodes,
                    timeoutSeconds: timeoutSeconds,
                  };

                  // Save this object
                  _data.create("checks", checkId, checkObject, function (err) {
                    if (!err) {
                      // Add the check ID to the users object
                      userData.checks = userChecks;
                      userData.checks.push(checkId);

                      // persist new user check
                      _data.update("users", userPhone, userData, function (err) {
                        if (!err) {
                          callback(200, checkObject);
                        } else {
                          callback(500, {
                            Error: "Could not update the user new check",
                          });
                        }
                      });
                    } else {
                      callback(500, { Error: "Could not create the new check" });
                    }
                  });
                } else {
                  callback(400, {Error: 'The URL that you entered didn´t resolve to any DNS entries'})
                }
              })
            } else {
              callback(400, {
                Error:
                  "The user already got the maximum number of checks: " +
                  config.maxChecks,
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403, { Error: "No Token or invalid token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};

// checks-get
// Required data: id
// Optional data: none
handler._checks.get = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    //Look up the check
    _data.read("checks", id, function (err, checkData) {
      if (!err && checkData) {
        // Look up the token
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        //verify that token is valid
        handler._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (tokenIsValid) {
            if (tokenIsValid) {
              callback(200, checkData);
            } else {
              callback(403, {
                Error: "No token in the headers or Token is not valid",
              });
            }
          }
        );
      } else {
        callback(404, { Error: "Could not find that check" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
//checks-put
//Required data: check id + 1 optional data
//Optional data: protocol, url, method, successCodes, timeoutSeconds
handler._checks.put = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  // Check for the optional fields
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].includes(data.payload.protocol)
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].includes(data.payload.method.toLowerCase())
      ? data.payload.method.toLowerCase()
      : false;

  const successCodes = Array.isArray(data.payload.successCodes)
    ? data.payload.successCodes
    : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  if (id && (protocol || url || method || successCodes || timeoutSeconds)) {
    // Look up the check
    _data.read("checks", id, function (err, checkData) {
      if (!err && checkData) {
        // Look up the token
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handler._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (isValidToken) {
            if (isValidToken) {
              // update the check
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }
              // persist new changes
              _data.update("checks", id, checkData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the check" });
                }
              });
            } else {
              callback(400, {
                Error: "No Token in the headers or invalid token",
              });
            }
          }
        );
      } else {
        callback(404, { Error: "No Checks with that ID" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields or they are invalid" });
  }
};

// checks-delete
// Required data: id
handler._checks.delete = function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the check
    _data.read("checks", id, function (err, checkData) {
      if (!err && checkData) {
        // Look up the token
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handler._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (isValidToken) {
            if (isValidToken) {
              const phone = checkData.userPhone;
              //Delete the checks data
              _data.delete("checks", id, function (err) {
                if (!err) {
                  // Get user to modify
                  _data.read("users", phone, function (err, userData) {
                    if (!err && userData) {
                      const oldChecks = Array.isArray(userData.checks)
                        ? [...userData.checks]
                        : [];
                      const newChecks = oldChecks.filter((e) => e !== id);
                      userData.checks = newChecks;
                      _data.update("users", phone, userData, function (err) {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Could not update the new users info. Contact the server manager",
                          });
                        }
                      });
                    } else {
                      callback(500, {
                        Error:
                          "Could not delete the check on users info. Contact the server manager",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not delete the check" });
                }
              });
            } else {
              callback(400, {
                Error: "No Token in the headers or invalid token",
              });
            }
          }
        );
      } else {
        callback(404, { Error: "No checks with that id" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

//Lets throw an error on porpous to bulletproof our logic an avoid crashings due to a simple error
handler.testErrors = function(data, callback) {
  const err = new Error()
  throw err
}
module.exports = handler;

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
handler._users.post = async function (data, callback) {
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
   let prevUser = false
   try {
     prevUser = await usersModel.findOne({phone: phone})
   } catch (error) {
     callback(500, {Eror:" connecting to data base"})
   }
   if (!prevUser) {
    // Hash the password
    const hashedPasswor = helpers.hash(password);
    if (hashedPasswor) {
      // create the user Object
      const userObject = new usersModel({
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        hashedPassword: hashedPasswor,
        tosAgreement: true,
      });
      // store the user

      userObject.save()
        .then(()=>{
          callback(200);
        }).catch(err=>{
          callback(400, { Error: "Could not create the nue user" });
        })
    } else {
      callback(500, { Error: "Could not hash the users password" });
    } 
  } else {
    callback(400, { Error: "User already exist" });
   }
  } else {
    callback(400, { Error: "Missing required fields, or one or some of them don´t fit the contract. Probably the Phone number" });
  }
};
//users-get
// Required data: phone
// Optional data: none
handler._users.get = async function (data, callback) {
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

    handler._tokens.verifyToken(token, phone, async function (tokenIsValid) {
      if (tokenIsValid) {
        // Look up the user
        try {
          const user= await usersModel.findOne({phone:phone})
          // removed the hashed password from the user object
          delete user.hashedPassword
          callback(200, data)
        } catch (error) {
          callback(404);
        }
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
handler._users.put = async function (data, callback) {
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

      handler._tokens.verifyToken(token, phone, async function (tokenIsValid) {
        if (tokenIsValid) {
          // Look up the user
          try {
            const user = await usersModel.findOne({phone:phone})
            if (firstName) {
              user.firstName = firstName;
            }
            if (lastName) {
              user.lastName = lastName;
            }
            if (password) {
              user.hashedPassword = helpers.hash(password);
            }
            // persist new data
            user.save()
              .then(()=>{
                callback(200);
              })
              .catch( err => {
                callback(500, { Error: "Could not update the user" });
              })
          } catch (error) {
            callback(404, { Error: "Specified User does not exist" });
          }
        } else {
          callback(403, { Error: "Missing required field token in headers or token invalid"});
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
handler._users.delete = async function (data, callback) {
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

    handler._tokens.verifyToken(token, phone, async function (tokenIsValid) {
      if (tokenIsValid) {
        // Look up the user
        try {
          const user = await usersModel.findOne({phone:phone})
          const userChecks = Array.isArray(user.checks) ? user.checks : [];
          const answer = await usersModel.deleteOne({phone:phone})
          if(userChecks.length > 0){
            userChecks.forEach(check => {
              checksModel.deleteOne({id:check})
            })
            if (answer.ok === 1) {
              callback(200)
            } else {
              callback(500, {Error:"The user wasn´t properly deleted"})
            }
          } else {
            if (answer.ok === 1) {
              callback(200)
            } else {
              callback(500, {Error:"The user wasn´t properly deleted"})
            }
          }
        } catch (error) {
          callback(404, { Error: "Could not find the specified user" });
        }
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
handler._tokens.post = async function (data, callback) {
  //Check that all required fields are filled out
  
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
  
  if (password && phone) {
    //Make sure that the user phone and password match
    try {
      const user = await usersModel.findOne({phone:phone})
      // Hash the password
      
      const hashedPasswor = helpers.hash(password);
      
      if (hashedPasswor === user.hashedPassword) {
        // create a new token with a random name and an expiration of 1 hour
        
        const tokenID = helpers.createRandomString(20);
        const expires = Date.now() + 1000 * 60 * 60;

        const tokenObject = new tokensModel({
          phone: phone,
          id: tokenID,
          expires: expires,
        });
        
        //Store the token
        tokenObject.save()
          .then(()=>{

            callback(200, tokenObject);
          })
          .catch(err=>{
            callback(500, { Error: "Could not create the token" });
          })
       
      } else {
        callback(400, {
          Error: "Password did not match specified user password",
        });
      }
    } catch (error) {
      callback(400, { Error: "Could not find specified user" });
    }
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};
// tokens-get
// Required data: id
// Optional data: none
handler._tokens.get = async function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the token
    try {
      const token = await tokensModel.findOne({id:id})
      callback(200, token);
    } catch (error) {
      callback(404, { Error: "did not find that token" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
//tokens-put
//Required data: id, extend
//Optional data: none
handler._tokens.put = async function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend = data.payload.extend === true;
  // Check for the optional fields
  if (id && extend) {
    // Look up the token
    try {
      const tokenData = await tokensModel.findOne({id:id})
      // check that the token is still valid
      if (tokenData.expires > Date.now()) {
        // set the new extension
        tokenData.expires = Date.now() + 1000 * 60 * 60;
        //store the token again
        tokenData.save()
          .then(()=>{
            callback(200, { Message: "Token valid for 1 more hour" });
          })
          .catch(err =>{
            callback(500, { Error: "Could not extend the token" });
          })
      } else {
        callback(400, {
          Error: "The token has already expired and can´t be extended",
        });
      }
    } catch (error) {
      callback(400, { Error: "That token does not exist" });
    }
  } else {
    callback(400, { Error: "Missing required fields or they are invalid" });
  }
};

// tokens-delete
// Required data: id
handler._tokens.delete = async function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the token
    try {
      const tokenData = await tokensModel.findOne({id:id})
      // delete the file
      const answer = await tokensModel.deleteOne({id:id})
      if (answer.ok === 1) {
        callback(200);
      } else {
        callback(500, { Error: "Could not delete the specified token" });
      }
    } catch (error) {
      callback(404, { Error: "Could not find the specified token" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

handler._tokens.verifyToken = async function (id, phone, booleanCallback) {
  //look up the token
  try {
    const token = await tokensModel.findOne({id:id})
    //Check if the token is for the current user
    if (token.phone === phone && token.expires > Date.now()) {
      booleanCallback(true);
    } else {
      booleanCallback(false);
    }
  } catch (error) {
    booleanCallback(false)
  }
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
handler._checks.post = async function (data, callback) {
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
    try {
      const tokenData = await tokensModel.findOne({id:token})
      const phone = tokenData.phone;

      //look up the user data
      try {
        const userData = await usersModel.findOne({phone:phone})
        const userChecks = Array.isArray(userData.checks)
        ? userData.checks
        : [];

        if (userChecks.length < config.maxChecks) {
          // Create a random id for the check
          const checkId = helpers.createRandomString(20);

          //BEFORE BLIDINGLY CREATE A CHECK ON A URL THAT MAY NOT EXIST, LETS CHECK IT WITH DNS entries
          const parsedURL = new URL({ toString: () => protocol+'://'+url });
          const hostname = typeof(parsedURL.hostname)=='string' && parsedURL.hostname.length >0 ? parsedURL.hostname: false

          dns.resolve(hostname, async function(err, adressList) {
            if (!err && adressList) {
             // Create the check object and include the users phone
              const checkObject = new checksModel({
                id: checkId,
                protocol: protocol,
                userPhone: phone,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds,
              });
              //sAVE THE CHECK
              try {
                const answerCheckCreation = await checkObject.save()
                // Add the check ID to the users object
                userData.checks = userChecks;
                userData.checks.push(checkId);

                userData.save()
                  .then(()=>{
                    delete answerCheckCreation._id
                    delete answerCheckCreation.__v
                    callback(200, answerCheckCreation);
                  })
                  .catch(err=>{
                    callback(500, {
                      Error: "Could not update the user new check",
                    });
                  })
              } catch (error) {
                callback(500, { Error: "Could not create the new check" });
              }
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
      } catch (error) {
        callback(403);
      }
    } catch (error) {
      callback(403, { Error: "No Token or invalid token" });
    }
  } else {
    callback(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};

// checks-get
// Required data: id
// Optional data: none
handler._checks.get = async function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    //Look up the check
    try {
      const checkData = await checksModel.findOne({id:id})
      // Look up the token
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;
      //verify that token is valid
      handler._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
        if (tokenIsValid) {
          callback(200, checkData);
        } else {
          callback(403, { Error: "No token in the headers or Token is not valid"});
        }
      });
    } catch (error) {
      callback(404, { Error: "Could not find that check" });      
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};
//checks-put
//Required data: check id + 1 optional data
//Optional data: protocol, url, method, successCodes, timeoutSeconds
handler._checks.put = async function (data, callback) {
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
    try {
      const checkData = await checksModel.findOne({id:id})
      // Look up the token
      const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
      handler._tokens.verifyToken(token, checkData.userPhone, function (isValidToken) {
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
          checkData.save()
            .then(()=>{
              callback(200);
            })
            .catch(err=>{
              callback(500, { Error: "Could not update the check" });
            })
        } else {
          callback(400, {Error: "No Token in the headers or invalid token" });
        }
      });
    } catch (error) {
      callback(404, { Error: "No Checks with that ID" });
    }
  } else {
    callback(400, { Error: "Missing required fields or they are invalid" });
  }
};

// checks-delete
// Required data: id
handler._checks.delete = async function (data, callback) {
  //Check that the id is valid
  const id =
    typeof data.queryStringObject.get("id") == "string" &&
    data.queryStringObject.get("id").trim().length === 20
      ? data.queryStringObject.get("id").trim()
      : false;
  if (id) {
    // Look up the check
    try {
      const checkData = await checksModel.findOne({id:id})
      // Look up the token
      const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
      handler._tokens.verifyToken(token, checkData.userPhone, async function (isValidToken) {
        if (isValidToken) {
          const phone = checkData.userPhone;
          //Delete the checks data
          try {
            const answerCheckDestroyed = await checksModel.deleteOne({id:id})
            // Get user to modify
            try {
              const userData = await usersModel.findOne({phone:phone})
              const oldChecks = Array.isArray(userData.checks)
                  ? [...userData.checks]
                  : [];
                const newChecks = oldChecks.filter((e) => e !== id);
                userData.checks = newChecks;
                userData.save()
                  .then(()=>{
                    if (answerCheckDestroyed.ok===1) {
                      callback(200)
                    } else {
                      callback(500,{Error:"Unexpected error, checks deleted in users info but check not deleted"})  
                    }
                  })
                  .catch(err=>{
                    callback(500, {Error:"Could not update the new users info. Contact the server manager"});
                  })
            } catch (error) {
              callback(500, {Error:"Could not delete the check on users info. Contact the server manager" });
            }
          } catch (error) {
            callback(500, { Error: "Could not delete the check" });
          }
        } else {
          callback(400, {Error: "No Token in the headers or invalid token" });
        }
      });
    } catch (error) {
      callback(404, { Error: "No checks with that id" });
    }
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

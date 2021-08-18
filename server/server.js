/**
 *  SERVER Starter
 */

// DEPENDENCIES
const http = require("http");
const config = require('../config')
const handlerAPI = require('./handlersAPI')
const handlerHTML = require('./handlerHTML')
const {URL} = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const helpers = require('../lib/helpers');
const util = require('util')
const debug = util.debuglog('server')
//------------------------------------------------------------------------------------------------------------
                            // defining the module object server
//------------------------------------------------------------------------------------------------------------
const server = {}
/*************************************************
 *        HTTP & HTTPS
 * ********************************************** */
// The server should respond to all requests with a string
  server.httpServer = http.createServer(function(req, res){
    server.unifiedServer(req, res)
  });
/**************************************************************
 *              UNIFIED --------------- SERVER
 * *********************************************************** */

 server.unifiedServer = (req, res) => {
 
  //get the url and pars it
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`) // url.parse(req.url, true); // second argument accepts another dependencies we haven´t used (query) that's why we pass true unti we get there

  // geth the path
  const path = parsedUrl.pathname; // http:localhost:3000/pokemon pathname would be /pokemon
  const trimmedPath = path.replace(/^\/+|\/+$/g, ""); // regex is to trimm of any extra slashes. i.e. localhost:3000/pokemon = localhost:3000/pokemon/ y cosas similares
 
  // Get query string as an object
  const queryStringObject = parsedUrl.searchParams

  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });
  req.on("end", () => {
    buffer += decoder.end();
    
  // construct the data object to send to the handlre
  const data = {
    'trimmedPath' : trimmedPath,
    'queryStringObject' : queryStringObject,
    'method' : method,
    'headers' : headers,
    'payload' : helpers.parseJsonToObject(buffer)
  }

  //we choose a handler and we use the route to do it
 let chosenHandler = server.router[trimmedPath] || server.router.notFound
 if(trimmedPath.includes('public')){
   chosenHandler = server.router.public
 }
      
// check entry data     console.log('recibimos estos datos: ', trimmedPath, buffer, method, headers);
    //Route the request to the handler specified

    try {
      chosenHandler(data, function(statusCode, payload, contentType = "json"){
        server.processHandlerResponse(res,method,trimmedPath,statusCode,payload,contentType)    
      })
    } catch (error) {
      debug('There was a crash on the response: ', error)
      server.processHandlerResponse(res, method,trimmedPath,500,{'Error':'An unkown error has occured'}, 'json')
    }
    
  });
} 

// refactored to handle errors coming from the handlers
server.processHandlerResponse = (res, method, trimmedPath, statusCode, payload, contentType) => {
    //use status code callback by the handler or default 200
    statusCode= typeof(statusCode) == 'number' ? statusCode : 200

    // convert the payload to a string. Depending on contentType
    let payloadString = ''
    if (contentType === 'json') {
      //use the payload callback by the handler or create a default empty object      
      payload = typeof(payload) == 'object' ? payload : {}
      payloadString = JSON.stringify(payload)  
      res.setHeader('Content-Type', 'application/json')  
    }

    if (contentType === 'html') {
      res.setHeader('Content-Type', 'text/html')
      payloadString = typeof payload == 'string' ? payload :''
    }

    if (contentType === 'favicon') {
      res.setHeader('Content-Type', 'image/x-icon')
      payloadString = typeof payload !== undefined ? payload :''
    }
    if (contentType === 'plain') {
      res.setHeader('Content-Type', 'text/plain')
      payloadString = typeof payload !== undefined ? payload :''
    }
    if (contentType === 'png') {
      res.setHeader('Content-Type', 'image/png')
      payloadString = typeof payload !== undefined ? payload :''
    }
    if (contentType === 'jpg') {
      res.setHeader('Content-Type', 'image/jpg')
      payloadString = typeof payload !== undefined ? payload :''
    }
    if (contentType === 'css') {
      res.setHeader('Content-Type', 'text/css')
      payloadString = typeof payload !== undefined ? payload :''
    }
            
    //return the response    
    res.writeHead(statusCode)
    res.end(payloadString)
    if (statusCode === 200) {
      console.log('\x1b[32m%s\x1b[0m','returning response: ', statusCode);  
    } else {
      console.log('\x1b[31m%s\x1b[0m','returning response: ', statusCode, payloadString);
    }    
}

/************************************************
 *                    ROUTER
 * ********************************************* */
// we define a router to choose which handler will handle which url req
server.router = {
    ping: handlerAPI.ping,
    notFound: handlerAPI.notFound,
    '':handlerHTML.index, //HTML ok
    'account/create':handlerHTML.accountCreate, //HTML ok
    'account/edit':handlerHTML.accountEdit, //HTML ok
    'account/deleted':handlerHTML.accountDeleted, //HTML ok
    'session/create':handlerHTML.sessionCreate, //HTML ok
    'session/deleted':handlerHTML.sessionDeleted, //HTML ok
    'checks/all':handlerHTML.checksList, //HTML protected by sign in ok
    'checks/create':handlerHTML.checksCreate, //HTML protected by sign in ok
    'checks/edit':handlerHTML.checksEdit, //HTML protected by sign in ok
    'favicon.ico': handlerHTML.favicon, // FAVICON ok
    'public': handlerHTML.public, // FILES CSS y JS ok
    'api/users': handlerAPI.users,
    'api/tokens': handlerAPI.tokens,
    'api/checks': handlerAPI.checks,
    'test/errors':handlerAPI.testErrors
};

//------------------------------------------------------------------------------------------------------------
                            // server starter function
//------------------------------------------------------------------------------------------------------------                            
server.init = function(){
    // Start the server, and have it listen on port 3000
    const port = process.env.PORT || config.httpPort
    server.httpServer.listen(port, () => {
        console.log('\x1b[35m%s\x1b[0m',"Server up and listening on port: " + config.httpPort +' in ' + config.envName + ' mode');
    });  
}

//------------------------------------------------------------------------------------------------------------
                            // EXPORTING MODULE
//------------------------------------------------------------------------------------------------------------

module.exports = server

  
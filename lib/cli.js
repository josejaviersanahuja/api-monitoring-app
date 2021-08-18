/**
 * library for the CLI of this APP
 *
 */
//DEPENDENCIES
const readLine = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");
class _events extends events {}
const os = require('os')
const v8 = require('v8')
const childProcess = require('child_process')

const _data = require('./data')
const _logs = require('./logs')
const helpers = require('./helpers')
const contractChecker = require("./contractChecker");

//codify the unique questions allowed
const e = new _events();

//INITIALIZING MODULE OBJ
const cli = {};
/*****************************
 *      INPUT HANDLERS
 *******************************/
// for help
e.on('man', function(strLine){
  cli.responders.help()
})
e.on('help', function(strLine){
  cli.responders.help()
})
// for exit
e.on('exit', function(strLine){
  cli.responders.exit()
})
//for stats
e.on('stats', function(strLine){
  cli.responders.stats()
})
//for LIST users
e.on('list users', function(strLine){
  cli.responders.listUsers()
})
//for more info of one user
e.on('more user info', function(strLine){
  //this method requires to check the inputline
  cli.responders.moreUserInfo(strLine)
})
//for list of checks
e.on('list checks', function(strLine){
  //this method requires to check the inputline
  cli.responders.listChecks(strLine)
})
//for more check info
e.on('more check info', function(strLine){
  //this method requires to check the inputline
  cli.responders.moreCheckInfo(strLine)
})
//for list logs
e.on('list logs', function(strLine){
  //this method requires to check the inputline
  cli.responders.listLogs(strLine)
})
//for more log info
e.on('more log info', function(strLine){
  //this method requires to check the inputline
  cli.responders.moreLogInfo(strLine)
})
 

/**********************************
 *      / INPUT HANDLERS
 ***********************************/

//Responders object
cli.responders= {}

/**********************************
 *       RESPONDERS
 ***********************************/

//HELP && MAN
cli.responders.help = function(){
  const commands = {
    "help":"Alias of the man command",
    "man":"Show this help page",
    "exit":"Kill the CLI (and the rest of the APP including the server)",
    "stats":"Get statistics on the onderlying operating system and resource utilization",
    "list users":"All registered undeleted users in the system",
    "more user info --{userId}":"Show details of specific user",
    "list checks --up --down":"Show a list of all the active checks in the system, including their state. --up or --down are optional",
    "more check info --{checkId}":"Show details of specified check",
    "list logs": "Show a list of all the log files available to be read (compressed only)",
    "more log info --{fileName}":"Show details of specified log file"
  };
  
  cli.renderObjectStyle('CLI MANUAL', commands)
  
  cli.verticalSpace(1)

  //End with another horizontal line
  cli.horizontalLine()
}

//EXIT
cli.responders.exit = function(){
  process.exit(0)
}

//STATS
cli.responders.stats = function(){
  //Compile an object of stats
  const stats = {
    'Load Average':os.loadavg().join(' '),
    'CPU Count':os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory':v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory':v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)':Math.round(v8.getHeapStatistics().used_heap_size*100/v8.getHeapStatistics().total_heap_size),
    'Allocated Heap Allocated (%)':Math.round(v8.getHeapStatistics().total_heap_size*100/v8.getHeapStatistics().heap_size_limit),
    'Uptime':os.uptime()+' Seconds'
  }

  //Create a Header
  cli.renderObjectStyle('SYSTEM STATS', stats)
  cli.verticalSpace()
  cli.horizontalLine()
   //
}

//List Users
cli.responders.listUsers = function(){
  //GET ALL USERS
  _data.list('users', function(err,userIds){
    if (!err && userIds && userIds.length>0) {
      cli.verticalSpace()
      userIds.forEach(userId => {
        _data.read('users', userId, function(err, userData){
          if (!err && userData) {
            let line = 'userId: '+userId+' Name: '+ userData.firstName + ' '+ userData.lastName+ ' Phone: +00'+userId + ' Checks: '
            const numberOfChecks = Array.isArray(userData.checks) ? userData.checks.length : 0
            line+=numberOfChecks
            console.log(line);
            cli.verticalSpace()
          } else {
            debug('Error reading user ', userId, ' data. line 146 cli.js')
          }
        })
      })
    } else {
      debug('Error getting the list users. line 151 cli.js')
    }
  })
}
//MORE USER INFO
cli.responders.moreUserInfo = function(str){
  const arr= str.split('--')
  const userId= contractChecker.notEmptyString(arr[1])
  if (userId) {
    //Look up the user
    _data.read('users', userId, function(err, userData){
      if (!err && userData) {
      //Remove the hashed Password
      delete userData.hashedPassword
  
      //Print the json
      cli.verticalSpace()
      console.dir(userData, {colors:true})
      } else {
        debug('Error reading user ', userId, ' data. line 170 cli.js')
      }
    })
  }
}
//LIST CHECKS
cli.responders.listChecks = function(str){
  _data.list('checks',function(err, checkList){
    if (!err && checkList) {
      cli.verticalSpace()
      checkList.forEach(checkId => {
        //get the check data
        _data.read('checks', checkId, function(err, checkData){
          if (!err && checkData) {
            const lowerString = str.toLowerCase()

            //Get the estate of the check, default to down
            const state = typeof checkData.state == 'string' ? checkData.state : 'down'
            // Get the state default to unkown
            const stateOrUnkown = typeof checkData.state == 'string' ? checkData.state : 'unkown'
            // If the user defines --up or --down or no state in particular
            
            if (lowerString.includes('--'+state) || (!lowerString.includes('--up') && !lowerString.includes('--down'))) {
              const line = 'ID: '+checkData.id+' '+checkData.method.toUpperCase()+' '+checkData.protocol+'://'+checkData.url+' State: '+stateOrUnkown
              console.log(line);
              cli.verticalSpace()
            }
          } else {
            debug('Error reading check ', checkId, ' data. line 199 cli.js')
          }
        })
      })
    } else {
      debug('Error getting the list of checks. line 204 cli.js')
    }
  })
}
//MORE CHECK INFO
cli.responders.moreCheckInfo = function(str){
  const arr= str.split('--')
  const checkId= contractChecker.notEmptyString(arr[1])

  if (checkId) {
    //Look up the check
    _data.read('checks', checkId, function(err, checkData){
      if (!err && checkData) {
      //Print the json
      cli.verticalSpace()
      console.dir(checkData, {colors:true})
      } else {
        debug('Error reading user ', checkId, ' data. line 221 cli.js')
      }
    })
  }
}
//LIST LOGS
cli.responders.listLogs = function(){
  const ls = childProcess.spawn('ls', ['./.logs/'])
  ls.stdout.on('data', function(dataObject){
    const dataStr = dataObject.toString()
    const logFileNames = dataStr.split('\n')

    if (logFileNames) {
      //console.log('entro ', logFileNames);
      cli.verticalSpace()
      logFileNames.forEach(logFileName => {
        
        //get the logs that are compressed
        if (typeof(logFileName) == 'string' && logFileName.includes('-')){
          console.log(logFileName.trim().split('.')[0]);
          cli.verticalSpace()
        }
      })
    } else {
      debug('Error getting the list of logs. line 245 cli.js')
    }
  })
}

//MORE LOG INFO
cli.responders.moreLogInfo = function(str){
  const arr= str.split('--')
  const logFileName= contractChecker.notEmptyString(arr[1])

  if(logFileName){
    cli.verticalSpace()
    //decompress de log file
    _logs.decompress(logFileName, function(err, logData){
      if (!err && logData) {
        //Split into lines, as each line represents one check
        const logArray= logData.split('\n')
        logArray.forEach(log => {
          const logObject = helpers.parseJsonToObject(log)
          if (logObject && logObject !== {}) {
            console.dir(logObject,{colors:true})
          } else {
            debug('Error parsing to Json a compressed data, line 266 cli.js')
          }
        })
      } else {
        debug('Error line 270 cli.js. in method decompression, no data of log: ', logFileName, err)
      }
    })
  }
}

/**********************************
 *       RESPONDERS
 ***********************************/

//Input Processor
cli.processInput = function (strLine) {
  strLine = contractChecker.notEmptyString(strLine.trim());
  const uniqueInputs = [
    "man",
    "help",
    "exit",
    "stats",
    "list users",
    "more user info",
    "list checks",
    "more check info",
    "list logs",
    "more log info",
  ];
  //only continue if there was an input
  if (strLine) {

    // Go through possible inputs, emmit an event when a match is found
    let match = false
    uniqueInputs.some(function(input){
        if (strLine.toLowerCase().includes(input)) {
            match=true
            //Emit an event matching the unique input, and include the strLine
            e.emit(input, strLine)
            return true
        }
    })

    //If no match was found
    if (!match) {
        console.log('   I don´t recognize that command. Sorry, try again with "help"');
    }
  }
};
/*********************************
 *        CLI FORMAT helper
 * ****************************** */

// draw a horizontal line of the console's width
cli.horizontalLine= function(){
  //GET available screen size
  const width = process.stdout.columns

  let line = ''
  for (let i = 0; i < width; i++) {
    line+='-'
  }
  console.log(line);
}

// centered will show a text CENTERED like a title
cli.centered = function(title){
  title = typeof title == 'string' && title.length > 0 ? title.trim() : ''
  
  // get the width
  const width = process.stdout.columns

  //calculate de left padding
  const leftPadding = Math.floor((width - title.length)/2)
  let line = ''
  for (let i = 0; i < leftPadding; i++) {
    line += ' ' 
  }
  line+=title
  console.log(line);
}

// determine de number of colums you want to format
cli.verticalSpace = function(lines=1){
  lines = typeof lines == 'number' && lines > 0 ? lines : 1
  for (let i = 0; i < lines; i++) {
    console.log('');    
  }
}

// 
cli.renderObjectStyle = function(title, object, color){
  
  const wasColorpassedAsParameter = Boolean(color)
  color = color? color : 33
  //CLI FORMAT Helpers
    cli.horizontalLine()
    cli.centered(title)
    cli.horizontalLine()
    //cli.verticalSpace()
    
    // Show each command, followed by its explination
    Object.keys(object).forEach(e=>{
      let line= e==='Fail'? '\x1b[31m'+e+'\x1b[0m' : `\x1b[${color}m`+e+'\x1b[0m'

      const value = object[e]
      const padding = wasColorpassedAsParameter ? 75-line.length :45- line.length
      for (let i = 0; i < padding; i++) {
        line += ' '
      }
      line +=  value
      console.log(line);
      //cli.verticalSpace()
    })
}

// initializing
cli.init = function () {
  //Start the message
  console.log("\x1b[35m%s\x1b[0m", "CLI is running");

  //input symbol - start the interface
  const _interface = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ">",
  });

  //Create an initial propmt
  _interface.prompt();

  //Handle each line of the input separately
  _interface.on("line", function (str) {
    //Send to the input processor
    cli.processInput(str)

    //Reinitialize the prompt afterwards
    _interface.prompt();
  });

  // if the user stops the CLI, kill all associated process
  _interface.on("close", function () {
    process.exit(0);
  });
};
//EXPORTING THE OBJECT
module.exports = cli;

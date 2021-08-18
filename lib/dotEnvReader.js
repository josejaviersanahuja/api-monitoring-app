const fs = require('fs')

/**************************************************
 *              DOTENVREADER
 * ********************************************* */
const lib={}
//QUE BELLO, el callback será app init. así iniciamos la app con todas las variables de entorno predefinidas.
lib.dotEnvReader = function(callback, testCallback){
    // Open .env file
    
    fs.open(__dirname + '/../.env', 'r', function(err, fd){
        if (!err) {
            // Read the .env file
          fs.readFile(fd, 'utf8', function(err, data){
              // If there is data, lets build the logic
              
            if (!err && data && data.length > 0) {
                const arrayData = [...data.trim()]
                // each key of this obj will contain a line
                const objLines = {}
                let numEtiqueta = 1
                objLines[`line${numEtiqueta}`]=[]
                // lets run the whole array of chars
                arrayData.forEach(char => {
                  
                    // if the char isn´t a carriege return or line feed push it to the
                    if (char !== '\n' && char !== '\r') {
                        objLines[`line${numEtiqueta}`].push(char)
                    } 
                    if (char === '\r') {
                        numEtiqueta++
                        objLines[`line${numEtiqueta}`]=[]
                    }
                })
                //We run each line
                Object.keys(objLines).forEach(line => {
                  
                    //get the index of the = char
                    const index = objLines[line].indexOf('=')
                    //slice var and value
                    const stringLine = objLines[line].join("").trim()
                    const varName = stringLine.slice(0,index).trim()
                    const varValue = stringLine.slice(index+1, arrayData.length).trim()
                    // persist the key value
                    lib.privateKeys[varName]=varValue
                })
                
                process.env = {
                  ...process.env,
                  ...lib.privateKeys
                }
                //console.log('DEBBUG: ', process.env.AUTH_TOKEN);
                
                callback(testCallback)
            } else {
              console.log('no se leyo bien el .env. PUEDE que la APP no funcione bien');
              callback()
            }
          })
        } else {
          console.log('no pude abrir .env');
        }
      })
      
    }
    
lib.privateKeys = {}
//lib.dotEnvReader()

module.exports = lib
    
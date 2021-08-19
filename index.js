/**
 * Primary file for the API
 * 
 * 
 */
process.env.NODE_ENV = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV : 'production'
// Dependencies
const server = require('./server/server')
const workers = require('./lib/workers')
const {dotEnvReader} = require('./lib/dotEnvReader')
const cli = require('./lib/cli')

// app container
const app = {}

// Initializing an app starts by initializing the server
app.init = function(callback){
  require('./mongo')  
  server.init()
  workers.init()
    
  callback()

}
//envolvemos el app init en nuestro dotENV para que las variables de entorno carguen antes de iniciar la app
if (require.main===module) { //solo se ejecuta si la ejecucion se pide por CLI node index.js por ejemplo
  dotEnvReader(app.init, function(){})  
}
//CUANDO NO SE EJECUTA? cuando desde nuestro test/api.js llamamos a la app

module.exports = app

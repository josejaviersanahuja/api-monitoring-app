/**
 * Primary file for the API
 *
 *
 */
// Dependencies
const server = require("./server/server");
const workers = require("./lib/workers");
const { dotEnvReader } = require("./lib/dotEnvReader");
const cli = require("./lib/cli");
const cluster = require("cluster");
const os = require("os");

// app container
const app = {};

// Initializing an app starts by initializing the server
app.init = function (callback) {
  //1IF cluster is master lets run the programs that dont need multiple cpu. just 1
  if (cluster.isMaster) {
    // workers
    workers.init();

    //cli must be shown after the initial messages
    setTimeout(function () {
      cli.init();

      callback();
    }, 50);

    //3 NOW WE MUST FORK THE PROCESS SO WE CAN REACH THE SERVER.INIT
    for (let i = 0; i < os.cpus().length; i++) {
      cluster.fork()
    }
  } else {
//2IF WE ARE NOT ON THE MASTER THREAD, start the server
  //lets run it in as many cpu as possible
  server.init();
  }
};
//envolvemos el app init en nuestro dotENV para que las variables de entorno carguen antes de iniciar la app
if (require.main === module) {
  //solo se ejecuta si la ejecucion se pide por CLI node index.js por ejemplo

  dotEnvReader(app.init, function () {});
}
//CUANDO NO SE EJECUTA? cuando desde nuestro test/api.js llamamos a la app

module.exports = app;

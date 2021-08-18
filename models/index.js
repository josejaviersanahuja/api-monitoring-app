/**
 * Lets Define the arquitech of our database
 *
 */
//DEPENDENCIES
const { Schema, model } = require("mongoose");

// All the Schemas
// users schema
const usersSchema = new Schema({
  firstName: String,
  lastName: String,
  phone: {
      type:String,
      unique:true,
      required:true
    },
  hashedPassword: String,
  tosAgreement: Boolean,
  checks:Array
});

//tokens schema
const tokensSchema = new Schema({
  phone: String,
  id: {
      type:String,
      unique:true,
      required:true
    },
  expires: Number,
});

//checks schema
const checksSchema = new Schema({
  id: {
      type:String,
      unique:true,
      required:true
  },
  protocol: String,
  userPhone: String,
  url: String,
  method: String,
  successCodes: Array,
  timeoutSeconds: Number,
  state: String,
  lastChecked: Number,
});

//logs Schema
const logsSchema = new Schema({
  date: String,
  id: {
    type:String,
    unique:true,
    required:true
    },
  protocol: String,
  userPhone: String,
  url: String,
  method: String,
  successCodes: Array,
  timeoutSeconds: Number,
  state: String,
  lastChecked: Number,
  error: Boolean,
  responseCode: Number,
  alert: Boolean,
});

// Modules of Models
const models = {}

models.usersModel = model("users", usersSchema);
models.tokensModel = model('tokens', tokensSchema)
models.checksModel = model('checks', checksSchema)
models.logsModel = model('logs', logsSchema)

//Export all models
module.exports = models;

/**
 * app.get('/api/combos/:id', (request, response, next) => {
  const id = Number(request.params.id)

  PokemonFullData.find({ id })
    .then(result => {
      if (result) {
        response.json(result)
      } else {
        response.status(400).end()
      }
    }).catch(err => {
      next(err)
    })
})

app.post('/api/combos', (request, response, next) => {
  const crearpokemon = new Zitropokemons(request.body)
  crearpokemon.save()
    .then(result => {
      console.log(result)
      response.json(result)
      // mongoose.connection.close() Si hago esto daño la app
    }).catch(e => {
      next(e)
    })
})
 */

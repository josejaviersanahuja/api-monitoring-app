/**
 * Unit tests
 *
 */

// Dependencies
const assert = require("assert");
const helpers = require("../lib/helpers");
const _data = require("../lib/data");
const _logs = require("../lib/logs");
const exampleDebuggerProblem = require("../lib/exampleDebuggingProblem");
const dotEnvReadeer = require("../lib/dotEnvReader");
const contractChecker = require("../lib/contractChecker");
const { usersModel, tokensModel, checksModel, logsModel} = require('../models')

//Holder
const unit = {};

//Assert the getNumber function is returning 2 SHOULD FAIL
unit["helpers.getANumber ERROR EXPECTED should be 0"] = function (done) {
  const val = helpers.getANumber();
  assert.strictEqual(val, 0);
  done();
};
//Assert the getNumber function is returning a number
unit["helpers.getANumber should return a number"] = function (done) {
  const val = helpers.getANumber();
  assert.strictEqual(typeof val, "number");
  done();
};

//Assert the getNumber function is returning 1
unit["helpers.getANumber should return 1"] = function (done) {
  const val = helpers.getANumber();
  assert.strictEqual(val, 1);
  done();
};


module.exports = unit;

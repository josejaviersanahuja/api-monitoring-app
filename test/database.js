/**
 * Unit tests
 *
 */

// Dependencies
const assert = require("assert");
const { usersModel, tokensModel, checksModel, logsModel} = require('../models')

//Holder
const database = {};

//Assert We can post users
database["We can post users correctly"] = function (done) {
    const user1 = new usersModel({
        firstName: "Jose Javier",
        lastName: "Sanahuja",
        phone: "34664531802",
        hashedPassword: "123456",
        tosAgreement: true,
    })

    user1.save()
        .then(()=>{
            assert.strictEqual(1, 1)
            done()
        }).catch(err=>{
            console.log(err);
            assert.strictEqual(1, 2)
            done()
        })
};
 //we can get a user by phone
database["We can get the user"] = async function(done){
    const user = await usersModel.findOne({phone:"34664531802"})
    assert.ok(user)
    assert.strictEqual(user.phone, "34664531802")
    done()
}
 
 //we can update a user
database["We can update a user "] = async function(done){
    const answer = await usersModel.updateOne({phone:"34664531802"}, {firstName:"JJ", lastName:"Sanahuja Ortiz"})
    assert.strictEqual(answer.n, 1)
    done()
}

//we can delete
database["We can delete a user "] = async function(done){
    const answer = await usersModel.deleteOne({phone:"34664531802"})
    assert.strictEqual(answer.n, 1)
    done()
}
module.exports = database;

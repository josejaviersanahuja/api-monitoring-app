/**
 * CHECKING THE TYPE OF A VARIABLE
 * generates a lot of repetitive code.
 * this file will gather this checks
 * 
 */

// creating the module object
const lib = {}

// NOTEMPTYSTRING: check if a variable is a not empty string.
lib.notEmptyString = function(str){
    if (typeof str == 'string' && str.length > 0) {
        return str
    } else {
        return false
    }
}

// OBJECT: if data is an object, return data if not an empty object {}
lib.object = function(data){
    if (typeof data == 'object' && data !== null) {
        return data
    } else {
        return {}
    }
}

//CHECK A VALID METHOD, string and one of post, get, put, delete
lib.mustBEValidMethod = function(method){
    const valid = ['POST', 'GET', 'PUT', 'DELETE']
    if (typeof method == 'string' && valid.includes(method.toUpperCase())) {
        return method
    } else {
        return 'GET'
    }
}
// exporting the module object
module.exports = lib
/**
 * FILE for storing and editing DATA
 */

const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')
// CONTAINER

const lib = {}

// BASE DIRRECTORY of the data folder
lib.baseDir = path.join(__dirname, '/../.data/')

lib.create= function(dir, file, data, callback) {
    // Open the file for writing
    fs.open(lib.baseDir + dir +'/'+ file + '.json', 'wx', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            //  CONVERT DATA TO STRING
            const stringData = JSON.stringify(data)

            //WRITE AND CLOSE FILE
            fs.writeFile(fileDescriptor, stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false)
                        }else{
                            callback("Error closing new file")
                        }
                    })
                } else {
                    callback('Error writing to new file')
                }
            })
        } else {
            callback('Could not create new file, it may already exist')
        }
    })
}

// READ DATA from a file
lib.read= function(dir, file,callback) {
    fs.readFile(lib.baseDir+ dir + '/' + file + '.json', 'utf8', function(err, data){
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        } else {
            callback(err, data)    
        }
    })
}

// UPDATE DATA FROM AN EXISTING FILE

lib.update = function (dir, file, data, callbak){
    //Open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err,fileDescriptor) {
        if(!err && fileDescriptor){
            const stringData = JSON.stringify(data)

            // Truncate the file
            fs.ftruncate(fileDescriptor, function(err){
                if(!err){
                    //write to the file and close it
                    fs.writeFile(fileDescriptor, stringData, function(err){
                        if(!err){
                            fs.close(fileDescriptor, function(err){
                                if(!err){
                                    callbak(false)
                                } else {
                                    callbak('Error closing the file')
                                }
                            })
                        }else {
                            callbak('Error writing to existing file')
                        }
                    })
                }else{
                    callbak('Error truncating the file')
                }
            })
        }else {
            callbak('Could not open the file for updating, it may not exist yet')
        }
    })
}

lib.delete = function(dir, file, callback){
    //unlink the file
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err){
        if(!err){
            callback(false)
        }else{
            callback('Error deleting the file')
        }
    })
}

// listing all files in a collection
lib.list = function(dir, callback){
    fs.readdir(lib.baseDir + dir + '/', function(err, data){
        if (!err && data && data.length>0) {
            const trimmedFileNames =  data.map(e => e.replace('.json', '') )
            callback(false, trimmedFileNames)
        } else {
            callback(err, data)
        }
    })
}

// export it
module.exports = lib
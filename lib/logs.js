/**
 * Library for storing and rotating logs into files
 *
 */

//Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

//Create exportable object module
const lib = {};

//Make directory constant baseDir
lib.baseDir = path.join(__dirname, "/../.logs/");

//Append a string to a file. Create the file if it doesn´t exist
lib.append = function (file, str, errorCallback) {
  //Open the file for appending
  fs.open(lib.baseDir + file + ".log", "a", function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      //Append the str adding a line down
      str += "\n";
      fs.appendFile(fileDescriptor, str, function (err) {
        if (!err) {
          fs.close(fileDescriptor, function (err) {
            if (!err) {
              errorCallback(false);
            } else {
              errorCallback("Error closing the file that was appended");
            }
          });
        } else {
          errorCallback("Error appending the file");
        }
      });
    } else {
      errorCallback("Could not open file for appending");
    }
  });
};

// list of all logs
lib.list = function (includeCompressLogs, errorCallback) {
  fs.readdir(lib.baseDir, function (err, data) {
    if (!err && data && data.length) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        //Add .log files
        if (fileName.includes(".log")) {
          trimmedFileNames.push(fileName.replace(".log", ""));
        }

        // Add .gz.b64 as well
        if (fileName.includes(".gz.b64") && includeCompressLogs) {
          trimmedFileNames.push(fileName.replace(".gz.b64", ""));
        }
      });
      errorCallback(false, trimmedFileNames);
    } else {
      errorCallback(err, data);
    }
  });
};

//Compress the contents of  one .log file into .gz.b64 file within the same directory
lib.compress = function (logId, newFileId, callback) {
  const sourceFile = logId + ".log";
  const destFile = newFileId + ".gz.b64";

  // Read the source file
  fs.readFile(lib.baseDir + sourceFile, "utf8", function (err, inputString) {
    if (!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, function (err, buffer) {
        if (!err && buffer) {
          //Send the data to the destination file
          fs.open(lib.baseDir + destFile, "wx", function (err, fileDescriptor) {
            if (!err && fileDescriptor) {
              //Write destination file
              fs.writeFile(
                fileDescriptor,
                buffer.toString("base64"),
                function (err) {
                  if (!err) {
                    //Close the destination file
                    fs.close(fileDescriptor, function (err) {
                      if (!err) {
                        callback(false);
                      } else {
                        callback("Error logs.js line 87: ", err);
                      }
                    });
                  } else {
                    callback("Error logs line 84: ", err);
                  }
                }
              );
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

//Decompress the content of a .gz.b64 file into a string var
lib.decompress = function (fileId, callback) {
  const fileName = fileId + ".gz.b64";
  fs.readFile(lib.baseDir + fileName, "utf8", function (err, str) {
    if (!err && str) {
      //Decompress the data
      const inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, function (err, outPutBuffer) {
        if (!err && outPutBuffer) {
          //Callback
          const finalString = outPutBuffer.toString();
          callback(false, finalString);
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Truncate a log file
lib.truncate = function (logId, callback) {
  // get the file descriptor of the file to be truncated
  fs.open(lib.baseDir + logId + ".log", "r+", function (err, fd) {
    if (!err && fd) {
      // Truncate the file
      fs.ftruncate(fd, 0, function (err) {
        if (!err) {
          fs.close(fd, function (err) {
            if (!err) {
              callback(false);
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Export module
module.exports = lib;

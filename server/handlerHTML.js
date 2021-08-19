/**
 * Request handlers HTML static web sites
 *
 */
// all this file will have a content type of html
// i prefer to work with renamed parameters instead of typeing repeteavly
const CONTENT_TYPE = 'html'
//-----------------------------------------
//Dependencies
const { type } = require("os");
const _data = require("../lib/data");
const helpers = require("../lib/helpers");

//defining CONST handlers and router
const handler = {};

//defining INDEX handler
handler.index = function (data, callback) {
	
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateIndexData = {
			'head.title':'Uptime Monitoring APP',
			'head.description':'We offer free uptime monitoring for HTTP/HTTPS sites of all kinds. When your site goes down, this app is prepared to send a text message to the user',
			'body.class':'index'
		}

		//Read in  a template as a string
		helpers.getTemplate('index', templateIndexData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE);	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
  
};

// account/create
handler.accountCreate = function(data, callback){
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateSignUpData = {
			'head.title':'Sign UP Uptime Monitoring',
			'head.description':'Sign up is easy and only take a few seconds',
			'body.class':'signup'
		}

		//Read in  a template as a string
		helpers.getTemplate('signup', templateSignUpData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

//Lets get the favicon
handler.favicon = function (data, callback) {
// Check the method, reject other than get
	if (data.method === "get") {
		//Read in the favicon data
		helpers.getStaticAsset('favicon.ico', function(err, data){
			if (!err && data) {
				callback(200, data, 'favicon')
			} else {
				callback(500)
			}
		})
	} else {
		callback(405,'Only GET is allowed', CONTENT_TYPE)
	}
}

//Lets get any public files
handler.public = function(data, callback){
	//check the method and reject others than get 
	if (data.method === 'get') {
		//get the file name and extension
		const trimmedAssetName = data.trimmedPath.replace('public/','').trim()
		if (trimmedAssetName.length >0) {
			//Lets read the file data
			helpers.getStaticAsset(trimmedAssetName, function(err, data){
				if (!err && data) {
					const contentType = helpers.getFileContentType(trimmedAssetName)
					callback(200, data, contentType)
				} else {
					callback(404,'that file doesnt exist', CONTENT_TYPE)
				}
			})
		} else {
			callback(404,'That file doesn´t exist', CONTENT_TYPE)
		}
		
	} else {
		callback(405,'Only GET is allowed', CONTENT_TYPE)
	}
}

// Log In
handler.sessionCreate = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateLogInData = {
			'head.title':'Log In to your account',
			'head.description':'Please enter your phone number and your password for login',
			'body.class':'login'
		}

		//Read in  a template as a string
		helpers.getTemplate('login', templateLogInData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

//Log out request
handler.sessionDeleted = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateLogOutData = {
			'head.title':'Logged out',
			'head.description':'You have logged out of your account',
			'body.class':'logout'
		}

		//Read in  a template as a string
		helpers.getTemplate('logout', templateLogOutData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

//Dashboard of the logged in user
handler.checksList = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateDashboardData = {
			'head.title':'Dashboard',
			'head.description':'You can have up to 5 CHECKS',
			'body.class':'dashboard'
		}

		//Read in  a template as a string
		helpers.getTemplate('dashboard', templateDashboardData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

//SETTINGS
handler.accountEdit = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateSettingsData = {
			'head.title':'Account Settings',
			'body.class':'settings',
			'subtitle': 'Edit your accountsettings'
		}

		//Read in  a template as a string
		helpers.getTemplate('settings', templateSettingsData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

// ACCOUNT HAS BEEN DELETED
handler.accountDeleted = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateData = {
			'head.title':'Account Deleted',
			'body.class':'accountDeleted',
			'subtitle': 'Your account has been deleted'
		}

		//Read in  a template as a string
		helpers.getTemplate('accountDeleted', templateData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

// Create a new CHECK
handler.checksCreate = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateData = {
			'head.title':'Create a Check',
			'body.class':'createCheck',
		}

		//Read in  a template as a string
		helpers.getTemplate('createCheck', templateData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}
// Edit CHECKS
handler.checksEdit = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
		//Prepare data for interpolation
		const templateData = {
			'head.title':'Edit a Check',
			'body.class':'checksEdit',
		}

		//Read in  a template as a string
		helpers.getTemplate('checksEdit', templateData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}

// log details
handler.log = function(data, callback){
	//Reject everything but GET
	if (data.method === "get") {
    //Check that the url is valid
    const url =
    typeof data.queryStringObject.get("url") == "string" &&
    data.queryStringObject.get("url").trim().length > 0
      ? data.queryStringObject.get("url").trim()
      : false;
    
		//Prepare data for interpolation
		const templateData = {
			'head.title':'Log of '+url,
			'head.description':'Last 7 days alerts when the url changed from up to down or viceversa',
			'body.class':'log',
			'clase.url':url
		}

		//Read in  a template as a string
		helpers.getTemplate('log', templateData ,function(err, str){
			if (!err && str) {
				callback(200, str, CONTENT_TYPE)
			} else {
				callback(500, 'Something is wrong with the template', CONTENT_TYPE)	
			}
		})
	} else {
		callback(405,undefined,CONTENT_TYPE)
	}
}
//Exporting the module
module.exports = handler

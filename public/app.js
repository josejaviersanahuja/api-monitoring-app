/**
 * Front end logic
 *
 */

const app = {};

//AJAX Client (for the restful API)
app.client = {};

//CONFIG
app.config = {
  sessionToken: false,
};

//interface for making API calls
app.client.request = function (
  headers,
  path,
  method,
  queryStringObject,
  payload,
  callback
) {
  //CHECKER
  const validMethods = ["POST", "GET", "PUT", "DELETE"];
  //Set defaults
  headers = typeof headers == "object" && headers !== null ? headers : {};
  path = typeof path == "string" ? path : "/";
  method =
    typeof method == "string" && validMethods.includes(method.toUpperCase())
      ? method.toUpperCase()
      : "GET";

  queryStringObject =
    typeof queryStringObject == "object" && queryStringObject !== null
      ? queryStringObject
      : {};
  payload = typeof payload == "object" && payload !== null ? payload : {};
  callback = typeof callback == "function" ? callback : false;

  //For each queryString parameter sent, add it to the path
  let requestUrl = path + "?";
  let counter = 0;
  for (const queryKey in queryStringObject) {
    if (Object.hasOwnProperty.call(queryStringObject, queryKey)) {
      counter++;
      //If at least on query string parameter has been passed, prepend new ones with the &
      if (counter > 1) {
        requestUrl += "&";
      }
      // Add the key value
      requestUrl += queryKey + "=" + queryStringObject[queryKey];
    }
  }

  //Form http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  //For each header sent, add it to the request
  for (const key in headers) {
    if (Object.hasOwnProperty.call(headers, key)) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }

  //If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  //When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statuCode = xhr.status;
      const responseReturned = xhr.responseText;

      //callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statuCode, parsedResponse);
        } catch (error) {
          callback(statuCode, error);
        }
      }
    }
  };
  // Send the payload as json
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// BIND LOGOUT BTN
app.bindLogoutButton = function () {
  document
    .getElementById("logout__btn")
    .addEventListener("click", function (e) {
      // Stop redirecting
      e.preventDefault();

      //Log the user out
      app.logUserOut();
    });
};

//Log out user and redirect
app.logUserOut = function (redirectUser = true) {
  //get the current tokenID
  const tokenId =
    typeof app.config.sessionToken.id == "string"
      ? app.config.sessionToken.id
      : "";
  //Prepare the queryStringObject
  const queryStringObject = {
    id: tokenId,
  };
  //send the request DELETE to api/tokens
  app.client.request(
    undefined,
    "api/tokens",
    "DELETE",
    queryStringObject,
    undefined,
    function (statusCode, responseData) {
      //Set the app.token to false
      app.setSessionToken(false);
      
      //Redirect to logged out page
      if (redirectUser) {
        window.location = '/session/deleted';
      }
    }
  );
};

// Bind the forms
app.bindForms = function () {
  if (document.querySelector("form")) {
    const allForms = document.querySelectorAll("form");
    for (var i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener("submit", function (e) {

        //Stoping from submitting and getting the settings of the form
        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        const method = this.attributes.method.value;
        //Hide the error message (if its currently shown due to a previous error)
        const formErrorMessage = document.querySelector(
          "#" + formId + " .form__fromError"
        );
        formErrorMessage.style.display = "none";
        // Hide the success message (if it's currently shown due to a previous error)
        if (document.querySelector("#" + formId + " .form__fromSucces")) {
          document.querySelector(
            "#" + formId + " .form__fromSucces"
          ).style.display = "none";
        }

        //Turn the inputs into a payload
        const payload = {};
        const elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          
          // Determine class of element and set value accordingly
          const classOfElement = typeof(element.classList.value) == 'string' && element.classList.value.length > 0 ? element.classList.value : '';
          const valueOfElement = element.type == 'checkbox' && !classOfElement.includes('multiselect') ? element.checked : !classOfElement.includes('intval') ? element.value : parseInt(element.value);
          const elementIsChecked = element.checked;
          // Override the method of the form if the input's name is _method
          let nameOfElement = element.name;

          // Create an payload field named "id" if the elements name is actually uid
          if(nameOfElement == 'uid'){
            nameOfElement = 'id';
          }

          // all input menos el boton, fieldset ni con nombre confirmePassword
          if (
            element.type !== "submit" &&
            element.type !== "fieldset" &&
            element.name !== "confirmPassword"
          ) {
              // FIRST LETS HANDLE CHECKBOXES
              if (element.type == "checkbox") {
                //IF the checkbox is for the creation CHECKS methods 200,201,300,301,302,400,403,405,406,500
                if (nameOfElement === "successCodes") {
                  //the post new check requires a field called method:[200,201 or whatever]
                  payload[nameOfElement]= Array.isArray(payload[nameOfElement]) ? payload[nameOfElement]:[]
                  //only pushing checkboxes selected
                  if (elementIsChecked) {
                    payload[nameOfElement].push(valueOfElement.toString())
                  }
                } else {
                //IF the checkbox is for tosAgreement (other that creations of checks)
                  payload[element.name]=elementIsChecked // we are passing true or false
                  /* HOW HANDLED TOSAGREEMENT BEFORE
                  const valueOfInput =
                  element.type == "checkbox" ? element.checked : element.value;
                  payload[element.name] = valueOfInput; */ 
                }
              } else {
                // FINISHED CHECKBOXES lets do the rest
                // as normal pair name:value
                payload[nameOfElement]= valueOfElement
              }
          }
        }
        // If the method is DELETE, the payload should be a queryStringObject instead
        const queryStringObject = method == 'DELETE' ? payload : {};
        //console.log('DEBBUGG 214 finalRquest = path:',path,' -method: ', method,' -queryStringObject: ', queryStringObject, '-payload: ', payload);
        
        //Call the API
        app.client.request(
          undefined,
          path,
          method,
          queryStringObject,
          payload,
          function (statusCode, responsePayload) {
            //Display an error on the form if needed
            if (statusCode !== 200) {
              // try to get the error from the API
              const errorMessage =
                typeof responsePayload.Error == "string"
                  ? responsePayload.Error
                  : DEFAULT_RESPONSE[statusCode];

              //Set the error Message field with the error text
              formErrorMessage.innerHTML = errorMessage;
              //show or unhide the error
              formErrorMessage.style.display = "block";
              // if there is no error
            } else {
              app.formResposeProcessor(formId, payload, responsePayload);
            }
          }
        );
      });
    }
  }
};
// form response processor
app.formResposeProcessor = function (formId, requestPayload, responsePayload) {
  let functionToCall = false;
  if (formId === "accountCreate") {
    //take the phone and password, and use it to log in the user automaticly
    const newPayload = {
      phone: requestPayload.phone,
      password: requestPayload.password,
    };

    app.client.request(
      undefined,
      "api/tokens",
      "POST",
      undefined,
      newPayload,
      function (statusCode, responseData) {
        if (statusCode !== 200) {
          // Set the formError field with the Error text
          const formErrorMessage = document.getElementById(
            "#" + formId + " .form__fromError"
          );
          formErrorMessage.innerHTML = "Internal Error, Please try again.";
          formErrorMessage.style.display = "block";
        } else {
          // succesful log in
          app.setSessionToken(responseData);
          window.location = "/checks/all";
        }
      }
    );
  }
  // For login form do this:
  if (formId === "sessionCreate") {
    //As login was succesful, set the new sessionToken
    app.setSessionToken(responsePayload);
    window.location = "/checks/all";
  }

  // For Edit Account Forms
  const formsWithSuccesMessages = ["accountEdit1", "accountEdit2"];
  if (formsWithSuccesMessages.includes(formId)) {
    document.querySelector("#" + formId + " .form__fromSucces").style.display =
      "block";
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if(formId == 'accountEdit3'){
    app.logUserOut(false);
    window.location = '/account/deleted';
  }
  
  // If the user just created a new check successfully, redirect back to the dashboard
  if(formId == 'checksCreate'){
    window.location = '/checks/all';
  }

   // If the user just created a new check successfully, redirect back to the dashboard
   if(formId == 'checksEdit1'){
    document.querySelector("#" + formId + " .form__fromSucces").style.display =
      "block";
  }

  // If the user just deleted a check, redirect them to the dashboard
  if(formId == 'checksEdit2'){
    window.location = '/checks/all';
  }
};

// get session token from coockies
app.getSessionToken = function () {
  //try to get it from local storage
  const tokenString = localStorage.getItem("token");
  //if exists
  if (typeof tokenString == "string") {
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (token && typeof token == "object") {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

//Set or remove loggedIn class from the body
app.setLoggedInClass = function (booleanAdd) {
  const target = document.querySelector("body");
  if (booleanAdd) {
    target.classList.add("loggedIn");
  } else {
    target.classList.remove("loggedIn");
  }
};

//Set a new sessionToken to the localStorage
app.setSessionToken = function (token) {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem("token", tokenString);
  if (token && typeof token == "object") {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

//Loop renewing the token
app.tokenRenewalLoop = function () {
  setInterval(function () {
    app.renewToken(function (err) {
      if (!err) {
        //console.log("Token renewd successfully at ", Date.now());
      }
    });
  }, 1000 * 120);
};

// Renew the token
app.renewToken = function (callback) {
  const currentToken =
    typeof app.config.sessionToken == "object"
      ? app.config.sessionToken
      : false;
  if (currentToken) {
    // Update the token with a new expiration
    const payload = {
      id: currentToken.id,
      extend: true,
    };
    app.client.request(
      undefined,
      "api/tokens",
      "PUT",
      undefined,
      payload,
      function (statusCode, responsePayload) {
        // Display an error on the form if needed
        if (statusCode == 200) {
          // Get the new token details
          const queryStringObject = { id: currentToken.id };
          app.client.request(
            undefined,
            "api/tokens",
            "GET",
            queryStringObject,
            undefined,
            function (statusCode, responsePayload) {
              // Display an error on the form if needed
              if (statusCode == 200) {
                app.setSessionToken(responsePayload);
                callback(false);
              } else {
                app.setSessionToken(false);
                callback(true);
              }
            }
          );
        } else {
          app.setSessionToken(false);
          callback(true);
        }
      }
    );
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = function () {
  // Get the current page from the body class
  const bodyClasses = document.querySelector("body").classList;
  const primaryClass =
    typeof bodyClasses[0] == "string" ? bodyClasses[0] : false;
  // Logic for account settings page
  if (primaryClass == "settings") {
    app.loadAccountEditPage();
  }

  // Logic for dashboard page
  if(primaryClass == 'dashboard'){
    app.loadChecksListPage();
  }

  // Logic for check details page
  if(primaryClass == 'checksEdit'){
    app.loadChecksEditPage();
  }
  // Logic for log alerts page
  if(primaryClass == 'log'){
    app.loadLogAlertsPage();
  }
};

// Load the account edit page specifically
app.loadLogAlertsPage = function(){
  // Get the phone number from the current token, or log the user out if none is there
  const phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if(phone){
    //GET the url from the class of the table
    const tabla = document.getElementsByTagName('table')[0]
    const urlToFetch =  tabla.classList[0]
    // El valor de la url ahora esta en tabla[0].classList[0], ver console.log(tabla[0].classList[0]);
    // Fetch the user data
    const queryStringObject = {
      'phone' : phone,
      'url' : urlToFetch
    };
    app.client.request(undefined,'api/logs','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){
        
        // Determine if there are log alerts history
        if (Array.isArray(responsePayload)) {
          if(responsePayload.length >0){
            // Show each created LOG as a new row in the table
            responsePayload.forEach(function(log){
              // Make the log data into a table row
              const table = document.getElementById("checksListTable");
              const tr = table.insertRow(-1);
              tr.classList.add('checkRow');
              const td0 = tr.insertCell(0);
              const td1 = tr.insertCell(1);
              const td2 = tr.insertCell(2);
              const td3 = tr.insertCell(3);
              const dateOfLog = new Date(log.lastChecked)
              td0.innerHTML = dateOfLog.toUTCString() // TODO añadir el formato
              td1.innerHTML = log.state
              //logic to add an error
              let errorCell = ''
              if(Object.keys(log.error).length >0){
                errorCell= log.error.value
              }
              //
              td2.innerHTML = errorCell
              td3.innerHTML = log.responseCode
            })
          } else {
            // Show 'you have no checks' message
            document.getElementById("noChecksMessage").style.display = 'table-row';
  
          /*   // Show the createCheck CTA
            document.getElementById("createCheckCTA").style.display = 'block';
   */
          } 
        } else {
          // Show 'you have no checks' message
          document.getElementById("noChecksMessage").style.display = 'table-row';
/* 
          // Show the createCheck CTA
          document.getElementById("createCheckCTA").style.display = 'block';
 */
        }
      } else {
        // If the request comes back as something other than 200, log the user out (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
}

// Load the account edit page specifically
app.loadAccountEditPage = function () {
  // Get the phone number from the current token, or log the user out if none is there
  const phone =
    typeof app.config.sessionToken.phone == "string"
      ? app.config.sessionToken.phone
      : false;
  const tokenID =
    typeof app.config.sessionToken.id == "string"
      ? app.config.sessionToken.id
      : false;
  if (phone && tokenID) {
    // Fetch the user data
    const queryStringObject = {
      phone: phone,
    };
    
    app.client.request(
      undefined,
      "api/users",
      "GET",
      queryStringObject,
      undefined,
      function (statusCode, responsePayload) {
        if (statusCode == 200) {
          // Put the data into the forms as values where needed
          document.querySelector("#accountEdit1 .firstNameInput").value =
            responsePayload.firstName;
          document.querySelector("#accountEdit1 .lastNameInput").value =
            responsePayload.lastName;
          document.querySelector("#accountEdit1 .displayPhoneInput").value =
            responsePayload.phone;

          // Put the hidden phone field into both forms
          const hiddenPhoneInputs = document.querySelectorAll(
            "input.hiddenPhoneNumberInput"
          );
          for (let i = 0; i < hiddenPhoneInputs.length; i++) {
            hiddenPhoneInputs[i].value = responsePayload.phone;
          }
        } else {
          // If the request comes back as something other than 200, log the user out (on the assumption that the api is temporarily down or the users token is bad)
          app.logUserOut();
        }
      }
    );
  } else {
    app.logUserOut();
  }
};

// Load the dashboard page specifically
app.loadChecksListPage = function(){
  // Get the phone number from the current token, or log the user out if none is there
  const phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if(phone){
    // Fetch the user data
    const queryStringObject = {
      'phone' : phone
    };
    app.client.request(undefined,'api/users','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){

        // Determine how many checks the user has
        const allChecks = typeof(responsePayload.checks) == 'object' && responsePayload.checks instanceof Array && responsePayload.checks.length > 0 ? responsePayload.checks : [];
        if(allChecks.length > 0){

          // Show each created check as a new row in the table
          allChecks.forEach(function(checkId){
            // Get the data for the check
            const newQueryStringObject = {
              'id' : checkId
            };
            app.client.request(undefined,'api/checks','GET',newQueryStringObject,undefined,function(statusCode,responsePayload){
              if(statusCode == 200){
                
                // Make the check data into a table row
                const table = document.getElementById("checksListTable");
                const tr = table.insertRow(-1);
                tr.classList.add('checkRow');
                const td0 = tr.insertCell(0);
                const td1 = tr.insertCell(1);
                const td2 = tr.insertCell(2);
                const td3 = tr.insertCell(3);
                const td4 = tr.insertCell(4);
                td0.innerHTML = responsePayload.method.toUpperCase();
                td1.innerHTML = responsePayload.protocol+'://';
                //LOGIC TO CHECK IF responsePayload.url ENDS WITH / or no
                const urlLength = responsePayload.url.length
                const lastChar = responsePayload.url.charAt(urlLength-1)
                let urlForLink=''
                if(lastChar==="/"){
                  urlForLink=responsePayload.url.slice(0, urlLength-1)
                } else {
                  urlForLink = responsePayload.url
                }
                //END OF THIS LOGIC
                td2.innerHTML = `<a href="/log?url=${urlForLink}">${responsePayload.url}</a>`
                const state = typeof(responsePayload.state) == 'string' ? responsePayload.state : 'unknown';
                td3.innerHTML = state;
                td4.innerHTML = '<a href="/checks/edit?id='+responsePayload.id+'">View / Edit / Delete</a>';
              } else {
                console.log("Error trying to load check ID: ",checkId);
              }
            });
          });

          if(allChecks.length < 5){
            // Show the createCheck CTA
            document.getElementById("createCheckCTA").style.display = 'block';
          }

        } else {
          // Show 'you have no checks' message
          document.getElementById("noChecksMessage").style.display = 'table-row';

          // Show the createCheck CTA
          document.getElementById("createCheckCTA").style.display = 'block';

        }
      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

// Load the checks edit page specifically
app.loadChecksEditPage = function(){
  // Get the check id from the query string, if none is found then redirect back to dashboard
  const id = typeof(window.location.href.split('=')[1]) == 'string' && window.location.href.split('=')[1].length > 0 ? window.location.href.split('=')[1] : false;
  if(id){
    // Fetch the check data
    const queryStringObject = {
      'id' : id
    };
    app.client.request(undefined,'api/checks','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){

        // Put the hidden id field into both forms
        const hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
        for(let i = 0; i < hiddenIdInputs.length; i++){
            hiddenIdInputs[i].value = responsePayload.id;
        }

        // Put the data into the top form as values where needed
        document.querySelector("#checksEdit1 .displayIdInput").value = responsePayload.id;
        document.querySelector("#checksEdit1 .displayStateInput").value = responsePayload.state;
        document.querySelector("#checksEdit1 .protocolInput").value = responsePayload.protocol;
        document.querySelector("#checksEdit1 .urlInput").value = responsePayload.url;
        document.querySelector("#checksEdit1 .methodInput").value = responsePayload.method;
        document.querySelector("#checksEdit1 .timeoutInput").value = responsePayload.timeoutSeconds;
        const successCodeCheckboxes = document.querySelectorAll("#checksEdit1 input.successCodesInput");
        for(let i = 0; i < successCodeCheckboxes.length; i++){
          if(responsePayload.successCodes.indexOf(parseInt(successCodeCheckboxes[i].value)) > -1){
            successCodeCheckboxes[i].checked = true;
          }
        }
      } else {
        // If the request comes back as something other than 200, redirect back to dashboard
        window.location = '/checks/all';
      }
    });
  } else {
    window.location = '/checks/all';
  }
};

// INIT BOOTSTRAPPING
app.init = function () {
  //Bind all form submissions
  app.bindForms();
  //bind logout button
  app.bindLogoutButton();
  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();
};

// CALL the init processes after the window loads
window.onload = function () {
  app.init();
};
/**
 * BURGUER BTN TOGGLE
 */
const handleMenuBtnClick = () => {
  const menu = document.getElementsByClassName("menu")[0];
  menu.classList.toggle("open");
};

/**
 * handling the signup btn disabled
 */
const handleSignUpButton = () => {
  // ONCHANGE

  const button = document.getElementById("form__button");
  const password1 = document.getElementsByName("password")[0];
  const password2 = document.getElementsByName("confirmPassword")[0];
  const firstName = document.getElementsByName("firstName")[0];
  const lastName = document.getElementsByName("lastName")[0];
  const tosAgreement = document.getElementsByName("tosAgreement")[0];
  const phone = document.getElementsByName("phone")[0];
  const span = document.getElementById("form__validPassword");
  const phonespan = document.getElementById("form__validPhone");
  //checks for the phone
  const valoresAceptados = /^[0-9]+$/;
  const contractCheckerPhone =
    phone.value.length === 11 && phone.value.match(valoresAceptados);

  if (
    password1.value !== "" &&
    password2.value !== "" &&
    password1.value === password2.value &&
    firstName.value !== "" &&
    lastName.value !== "" &&
    tosAgreement.checked &&
    contractCheckerPhone
  ) {
    button.disabled = false;
  } else {
    button.disabled = true;
  }

  if (
    password1.value !== "" &&
    password2.value !== "" &&
    password1.value === password2.value
  ) {
    span.style.visibility = "visible";
  } else {
    span.style.visibility = "hidden";
  }
  if (contractCheckerPhone) {
    phonespan.style.visibility = "visible";
  } else {
    phonespan.style.visibility = "hidden";
  }
};
// handle the btn in log in session
const handleLogInButton = () => {
  const button = document.getElementById("form__button");
  const password1 = document.getElementsByName("password")[0];
  const phone = document.getElementsByName("phone")[0];

  //checks for the phone
  const valoresAceptados = /^[0-9]+$/;
  const contractCheckerPhone =
    phone.value.length === 11 && phone.value.match(valoresAceptados);
  // enabling disabling the log in button
  if (contractCheckerPhone && password1.value !== "") {
    button.disabled = false;
  } else {
    button.disabled = true;
  }
};
// handle the btn in UPDATE NAMES
const handleUpdateNameButton = () => {
  const button = document.getElementById("updateNameBtn");
  const firstName = document.getElementsByName("firstName")[0].value;
  const lastName = document.getElementsByName("lastName")[0].value;

  // enabling disabling the log in button
  if (firstName !== "" || lastName !== "") {
    button.disabled = false;
  } else {
    button.disabled = true;
  }
};
// handle the btn in UPDATE NAMES
const handleUpdatePasswordButton = () => {
  const button = document.getElementById("updatePasswordBtn");
  const password = document.getElementsByName("password")[0].value;
  const confirmPassword =
    document.getElementsByName("confirmPassword")[0].value;

  // enabling disabling the log in button
  if (
    password !== "" &&
    confirmPassword !== "" &&
    password === confirmPassword
  ) {
    button.disabled = false;
  } else {
    button.disabled = true;
  }
};

const toggleInfoTable = () => {
  const infoTable = document.getElementById('infotable')
  const infoTableStyle = infoTable.style.display
  
  if (infoTableStyle === 'none') {
    infoTable.style.display = 'block'
  } else {
    infoTable.style.display = 'none'
  }
}

const DEFAULT_RESPONSE = {
  404: "Not Found Error. (dafault message)",
  403: "Operation Forbidden, normally happens when credentials are needed like a loggedin user. (dafault message)",
  405: "Invalid Method. (dafault message)",
  400: "Missing required data. (dafault message)",
};

var fileHelper = require("./file-helper.js");
var request = require("ajax-request");
var config = require("./config.js");

var apiUrl = config.routes.apiURL;
var access_token = config.access_token;

var json = {
  status: 200,
  success: true,
  result: [
    {
      Dribbble: "a",
      Behance: "",
      Blog: "http://blog.invisionapp.com/reimagine-web-design-process/",
      Youtube: "",
      Vimeo: "",
      Number: 3,
      Array: [1, 2, 3, 4, 5],
      MyObj: { name: "hej", value: 10 },
      ObjArray: [{ name: "hej", value: 10 }]
    },
    {
      Dribbble: "",
      Behance: "",
      Blog:
        "http://creative.mailchimp.com/paint-drips/?_ga=1.32574201.612462484.1431430487",
      Youtube: "",
      Vimeo: "",
      Number: 3,
      Array: [1, 2, 3, 4, 5]
    }
  ]
};

startModelGeneration();

function startModelGeneration() {
  let filename = "";
  let classname = "";
  let resourceEndpoint = "";

  // Check if no args
  if (process.argv.length < 3) {
    console.log(
      "No arguments passed. Enter filename, class name and optionally API endpoint"
    );
  } else {
    // Read arguments passed
    process.argv.forEach(function(val, index, array) {
      // Filename at index 2
      if (index === 2) {
        filename = val.replace(" ", "-");
      } else if (index === 3) {
        resourceEndpoint = val;
      }
      // TODO: Endpoint, done?
    });

    // Set classname to same as filename
    classname = firstToUpperCase(filename);

    // Add .ts to filename if not included
    var ending =
      filename.length > 3
        ? filename.substr(filename.length - 3, filename.length)
        : filename;
    if (ending !== ".ts") {
      filename += ".ts";
    }

    // Check if endpoint is provided as arg
    if (process.argv.length == 4) {
      request(
        {
          url: apiUrl + resourceEndpoint,
          method: "GET",
          headers: { Authorization: "bearer " + access_token }
        },
        function(err, res, body) {
          // console.log(body);
          if (err) {
            console.log("Something went wrong");
            throw err;
          }
          // Check error and set json to response
          if (res.statusCode === 200) {
            var jsonFromApi = JSON.parse(body);
            //let results = jsonFromApi;
            generateModel(jsonFromApi, true, filename, classname);
          } else
            console.log(
              "Error in request. Make sure API endpoint is correct. \nCurrent path is: " +
                config.routes.baseURL +
                res.req.path
            );
        }
      );
    } else {
      let results = json["result"];
      generateModel(results, true, filename, classname);
    }
  }
}

// Called when want to create a new file
function generateModel(json, export_model, filename, classname) {
  // Create the file
  let path = "./generated/";
  fileHelper.createFile(path + filename);

  // Get the content to be added to the file. (Parse json file into strings)
  let content = getContent(json, classname, export_model);
  var res = content.join("\n"); // A list of strings. Add them but separate by new line

  // Write the content to the file and save
  fileHelper.writeToFile(path + filename, res);
}

function getContent(json, classname, export_model) {
  let content = [];
  let model_heading = "class " + classname + " {";
  // If it is the main model, export it. Otherwise, just make the class
  model_heading =
    export_model == true ? "export " + model_heading : model_heading;
  content.push(model_heading);
  let results = null;

  // The format of the json differs. If its an array, then assume that all elements are the same. Pick first
  if (Array.isArray(json) && json.length > 0) {
    results = json[0];
  } else {
    results = json;
  }

  console.log(results);
  // The list of the models inside the model. Save to this list and loop through them later
  let unhandled_objects = [];

  // Make sure there exists elements in results
  if (results !== null) {
    let columnsIn = results;

    // Loop through all the results
    for (var key in columnsIn) {
      // Get the current value
      let curr_value = columnsIn[key];

      // Find out what type it is. Not optimal solution, but it works
      let type = getType(curr_value);

      // Handle different types
      if (type === "object") {
        type = key + "Entity";
        type = firstToUpperCase(type);
        unhandled_objects.push({ name: type, value: columnsIn[key] });
      } else if (type === "object[]") {
        let obj_classname = key + "Entity";
        obj_classname = firstToUpperCase(obj_classname);
        type = obj_classname + "[]";
        unhandled_objects.push({
          name: obj_classname,
          value: columnsIn[key][0]
        });
      }
      content.push("\t" + key + ": " + type + ";");
    }

    // OK, not super nice solution, but works for now
    content.push("\tconstructor(values: Object = {}) {");
    content.push("\tif (!values) {");
    content.push("\t\treturn null;");
    content.push("\t}");
    content.push("\tObject.assign(this, values);");
    content.push("\t}");
    content.push("}");

    unhandled_objects.forEach(e => {
      content = content.concat(getContent(e.value, e.name, false));
    });
    return content;
  } else {
    console.log("Empty object. Could not parse " + classname);
    return [];
  }
}

function getType(curr_value) {
  if (Array.isArray(curr_value)) {
    var first = curr_value.length > 0 ? curr_value[0] : null;
    if (first === null) {
      return "any[]"; // if its an array without any elements, then we cannot know what type it is. Set any
    } else if (getType(first) === "object") {
      return "object[]"; //return "object[]", handle this later in code
    } else {
      return typeof first + "[]";
    }
  } else if (curr_value === null) {
    // If obj is null, then we dont have a clue what type of object it is
    return "any";
  } else if (typeof curr_value == "object") {
    // Return object. Handle this in code
    return "object";
  }
  return typeof curr_value;
}

function firstToUpperCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

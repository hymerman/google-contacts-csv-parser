'use strict';

var fs = require('fs');
var q = require('q');
var csv = require('csv');
var parse = csv.parse;

function writeFilePromise(file_name, file_contents) {
  var deferred = q.defer();
  console.log("Write requested");

  fs.writeFile(file_name, file_contents, {encoding:"utf-8"}, function (error) {
    if(error) {
      console.log("Write error");
      deferred.reject(new Error(error));
    } else {
      console.log("Write success");
      deferred.resolve();
    }
  });

  return deferred.promise;
}

var parser = parse({delimiter: ',', quote:'"', columns:true}, function(err, data){
  if(err) {
    console.log("Error: " + err);
  } else {
    for(var contact_index in data) {
      var contact = data[contact_index];
      // Remove empty fields.
      for(var property_name in contact) {
        if(contact[property_name] === null || contact[property_name] === undefined || contact[property_name] == "") {
          delete contact[property_name];
        } else {
          // Create arrays of things that should be arrays.
          // todo: remove these things if they're useless, e.g. many of my contacts have a custom field with a type but no value.
          //console.log("Checking whether property should be an array: " + property_name);
          var properties_which_should_be_arrays = ['E-mail', 'Phone', 'Website', 'Custom Field', 'Address', 'Organization'];
          for(var property_which_should_be_array_index in properties_which_should_be_arrays) {
            var property_which_should_be_array = properties_which_should_be_arrays[property_which_should_be_array_index];
            //console.log("Checking " + property_which_should_be_array);
            if(property_name.indexOf(property_which_should_be_array) === 0) {
              //console.log("Found field which should be an array: " + property_name);
              // These fields are all of the form: "Field Name N - Inner Field Name", where both fields can have spaces. I think the best way to get both field names is to split on the number and hyphen.
              var regex = /(\d+)[ ]-[ ](.*)/;
              var result = property_name.substring(property_which_should_be_array.length + 1).match(regex);
              var array_index = result[1] - 1;
              var sub_object_property_name = result[2];
              //console.log("Extracted array index: " + array_index + ", property name: " + sub_object_property_name);
              if(contact[property_which_should_be_array] === undefined) {
                // Array doesn't exist yet. Create it!
                //console.log("Array doesn't exist yet. Creating it.");
                console.assert(array_index === 0);
                contact[property_which_should_be_array] = [{}];
              } else if(!(contact[property_which_should_be_array] instanceof Array)) {
                // Array field already exists, but not as array. This shouldn't ever happen!
                throw Error("Array field already exists, but not as array!");
              } else if(contact[property_which_should_be_array].length <= array_index) {
                // Array exists but we've come to a new item - append it to the array.
                //console.log("Array exists but we've come to a new item - appending it to the array.");
                console.assert(array_index === contact[property_which_should_be_array].length);
                contact[property_which_should_be_array].push({});
              } else {
                // Array exists, and object at this index exists; add data to it.
                //console.log("Array exists, and object at this index exists; adding data to it.");
              }
              contact[property_which_should_be_array][array_index][sub_object_property_name] = contact[property_name];
              delete contact[property_name];
            }
          }
        }
      }
    }
    writeFilePromise("contacts.json", JSON.stringify(data, null, " "));
  }
});

var input_file_path = process.argv[2];

fs.createReadStream(input_file_path).pipe(parser);

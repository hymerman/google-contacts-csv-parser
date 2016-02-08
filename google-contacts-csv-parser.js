'use strict';

var fs = require('fs');
var q = require('q');
var csv = require('csv');
var parse = csv.parse;
var stringify = require('json-stable-stringify');
var stable_sort = require('stable');
var yaml = require('js-yaml');

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

var properties_which_should_be_arrays = ['E-mail', 'Phone', 'Website', 'Custom Field', 'Address', 'Organization'];
var properties_objects_in_array_properties_should_have = {'E-mail':'Value', 'Phone':'Value', 'Website':'Value', 'Custom Field':'Value', 'Address':'Formatted'};
var array_field_regex = /(\d+)[ ]-[ ](.*)/;

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
          //console.log("Checking whether property should be an array: " + property_name);
          for(var property_which_should_be_array_index in properties_which_should_be_arrays) {
            var property_which_should_be_array = properties_which_should_be_arrays[property_which_should_be_array_index];
            //console.log("Checking " + property_which_should_be_array);
            if(property_name.indexOf(property_which_should_be_array) === 0) {
              //console.log("Found field which should be an array: " + property_name);
              // These fields are all of the form: "Field Name N - Inner Field Name", where both fields can have spaces. I think the best way to get both field names is to split on the number and hyphen.
              var result = property_name.substring(property_which_should_be_array.length + 1).match(array_field_regex);
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
      // Remove array fields if they're useless, e.g. many of my contacts have a custom field with a type but no value.
      for(var outer_property in properties_objects_in_array_properties_should_have)
      {
        var inner_property = properties_objects_in_array_properties_should_have[outer_property];

        if(contact[outer_property] === null || contact[outer_property] === undefined) {
          continue;
        }

        //console.log("Found contact with field to check: " + outer_property + "(length:" + contact[outer_property].length + ") each must have " + inner_property);

        for(var array_index = contact[outer_property].length - 1; array_index >= 0; --array_index) {
          //console.log("Checking whether " + JSON.stringify(contact[outer_property][array_index]) + " has property " + inner_property);
          if(contact[outer_property][array_index][inner_property] === null || contact[outer_property][array_index][inner_property] === undefined || contact[outer_property][array_index][inner_property] == "") {
            //console.log("Doesn't have property; deleting");
            contact[outer_property].splice(array_index, 1);
          }
        }

        if(contact[outer_property].length == 0) {
          //console.log("No more values exist in array; deleting whole property.");
          delete contact[outer_property];
        }
      }
    }

    // Sort contacts.
    stable_sort.inplace(data, function(lhs, rhs){
      if((lhs.Name === undefined || lhs.Name === null) && !(rhs.Name === undefined || rhs.Name === null)) return -1;
      if((rhs.Name === undefined || rhs.Name === null) && !(lhs.Name === undefined || lhs.Name === null)) return 1;
      if((lhs.Name === undefined || lhs.Name === null) &&  (rhs.Name === undefined || rhs.Name === null)) return 0; // todo: sort on email 1 if neither have a name?
      return lhs.Name.localeCompare(rhs.Name);
    });

    // Save file.
    writeFilePromise(output_file_path, stringify(data, { space: '  '}));
    writeFilePromise(output_file_path + ".yaml", yaml.safeDump(data));
  }
});

var input_file_path = process.argv[2];
var output_file_path = process.argv[3];

fs.createReadStream(input_file_path, {encoding:'ucs2'}).pipe(parser);

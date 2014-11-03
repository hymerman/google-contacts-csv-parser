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

var input_file_path = process.argv[2];

var parser = parse({delimiter: ',', quote:'"', columns:true}, function(err, data){
  if(err) {
    console.log("Error: " + err);
  } else {
    for(var contact_index in data) {
	  var contact = data[contact_index];
      for(var i in contact) {
        if(contact[i] === null || contact[i] === undefined || contact[i] == "") {
          delete contact[i];
        }
      }
	}
	writeFilePromise("contacts.json", JSON.stringify(data, null, " "));
  }
});

fs.createReadStream(input_file_path).pipe(parser);

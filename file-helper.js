var fs = require("fs");

module.exports = {
  createFile: function(filename) {
    fs.appendFile(filename, "", function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
  },
  writeToFile: function(filename, content) {
    var stream = fs.createWriteStream(filename);
    stream.once("open", function(fd) {
      stream.write(content);
      stream.end();
    });
  }
};

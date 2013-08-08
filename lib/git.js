exports.getRepoCommitsAndProcess = function (options, callback) {
    getAndProcessCommits(options, function(processedCommits){
        getRepositoryFromGit (options, function (fetchRepo) {
            callback(processedCommits, fetchRepo);
        });
    });
};

exports.processCommits = function (options, allCommits, callback) {
    allCommits = prepareCommits(allCommits);
    var commits = processCommits(allCommits, options);
    callback(commits);
};

function prepareCommits(allCommits){
    // Build the list of commits from git log
    allCommits = allCommits.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, '');
    // This return an object with the same properties described above
    allCommits = allCommits.split("\n");
    return allCommits;
}

function getAndProcessCommits(options, callback) {
	var spawn = require("child_process").spawn;
	var gitArgs = ["log", "--no-color", "--no-merges", "--branches=" + options.branch, "--format=" + formatOptions, options.range];
	var gitLog = spawn("git", gitArgs, {
		cwd : options.cwd,
		//stdio : ["ignore", "pipe", process.stderr]
	});

	var allCommits = "";
	gitLog.stdout.on('data', function (data) {
		allCommits += data;
	});

	gitLog.on("exit", function (code) {
		if (code === 0) {
            try{
                allCommits = prepareCommits(allCommits);
                var commits = processCommits(allCommits, options);
                callback(commits);
            }catch (err){
                console.log("Parsing commits failed: " + err);
            }
		}
    });
}

function getRepositoryFromGit (options, callback){
    var path = require("path");
    var spawn = require("child_process").spawn;
    var gitArgs = ["remote", "show", "-n", "origin"];
    var grepArgs = ["Fetch"];

    var gitRemote = spawn("git", gitArgs, {
        stdio : ["ignore", "pipe", process.stderr],
        cwd : options.cwd
    });

    var grep = spawn("grep", grepArgs);

    gitRemote.stdout.on('data', function (data) {
        grep.stdin.write(data);
    });

    gitRemote.on('close', function (code) {
        if( code !== 0){
            console.log("Git remote ended with: " + code);
        }
        grep.stdin.end();
    });

    var fetchRepo = "";
    grep.stdout.on('data', function (data){
        fetchRepo += data;
    });

    grep.on('exit', function (code){
        if(code === 0){
            fetchRepo = fetchRepo.substring(fetchRepo.indexOf(":")+1, fetchRepo.length);
            callback(path.basename(fetchRepo));
        }
    });
}

var newCommit = "___";
var formatOptions = [
	newCommit, "sha1:%H", "authorName:%an", "authorEmail:%ae", "authorDate:%aD",
	"committerName:%cn", "committerEmail:%ce", "committerDate:%cD",
	"title:%s", "%w(80,1,1)%b"
].join("%n");

function processCommits (commitMessages, options) {
	var commits = [];
	var workingCommit;
	commitMessages.forEach(function (rawLine) {
		var line = parseLine(rawLine);
		if (line.type === "new") {
			workingCommit = {
				messageLines : []
			};
			commits.push(workingCommit);
		} else if (typeof workingcommit !== 'undefined' && line.type === "message") {
            workingCommit.messageLines.push(line.message);
		} else if (line.type === "title") {
			var title = parseTitle(line.message, options);
			for (var prop in title) {
				workingCommit[prop] = title[prop];
			}
			if (!workingCommit.title) {
				// The parser doesn't return a title
				workingCommit.title = line.message;
			}
		} else if (typeof workingCommit !== 'undefined'){
            workingCommit[line.type] = line.message;
		}
	});
	return commits;
}

function parseLine (line) {
	if (line.trim() === newCommit) {
		return {
			type : "new"
		};
	}

	var match = line.match(/^([a-zA-Z]+1?)\s?:\s?(.*)$/i);

	if (match) {
		return {
			type : match[1],
			message : match[2].trim()
		};
	} else {
		return {
			type : "message",
			message : line.substring(1) // padding
		};
	}
}

function parseTitle (title, options) {
	var expression = options.title;
	var names = options.meaning;

	var match = title.match(expression);
	if (!match) {
		return {
			title : title
		};
	} else {
		var builtObject = {};
		for (var i = 0; i < names.length; i += 1) {
			var name = names[i];
			var index = i + 1;
			builtObject[name] = match[index];
		}
		return builtObject;
	}
}

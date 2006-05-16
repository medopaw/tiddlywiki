// Get characters from the right end of a string
String.prototype.right = function(n)
{
	if(n < this.length)
		return this.slice(this.length-n);
	else
		return this;
}

// Trim whitespace from both ends of a string
String.prototype.trim = function()
{
	return this.replace(/^\s*|\s*$/g,"");
}

// Convert a string from a CSS style property name to a JavaScript style name ("background-color" -> "backgroundColor")
String.prototype.unDash = function()
{
	var s = this.split("-");
	if(s.length > 1)
		for(var t=1; t<s.length; t++)
			s[t] = s[t].substr(0,1).toUpperCase() + s[t].substr(1);
	return s.join("");
}

// Substitute substrings from an array into a format string that includes '%1'-type specifiers
String.prototype.format = function(substrings)
{
	var subRegExp = new RegExp("(?:%(\\d+))","mg");
	var currPos = 0;
	var r = [];
	do {
		var match = subRegExp.exec(this);
		if(match && match[1])
			{
			if(match.index > currPos)
				r.push(this.substring(currPos,match.index));
			r.push(substrings[parseInt(match[1])]);
			currPos = subRegExp.lastIndex;
			}
	} while(match);
	if(currPos < this.length)
		r.push(this.substring(currPos,this.length));
	return r.join("");
}

// Escape any special RegExp characters with that character preceded by a backslash
String.prototype.escapeRegExp = function()
{
	var s = "\\^$*+?()=!|,{}[].";
	var c = this;
	for(var t=0; t<s.length; t++)
		c = c.replace(new RegExp("\\" + s.substr(t,1),"g"),"\\" + s.substr(t,1));
	return c;
}

// Convert & to "&amp;", < to "&lt;", > to "&gt;" and " to "&quot;"
String.prototype.htmlEncode = function()
{
	var regexpAmp = new RegExp("&","mg");
	var regexpLessThan = new RegExp("<","mg");
	var regexpGreaterThan = new RegExp(">","mg");
	var regexpQuote = new RegExp("\"","mg");
	return(this.replace(regexpAmp,"&amp;").replace(regexpLessThan,"&lt;").replace(regexpGreaterThan,"&gt;").replace(regexpQuote,"&quot;"));
}

// Convert "&amp;" to &, "&lt;" to <, "&gt;" to > and "&quot;" to "
String.prototype.htmlDecode = function()
{
	var regexpAmp = new RegExp("&amp;","mg");
	var regexpLessThan = new RegExp("&lt;","mg");
	var regexpGreaterThan = new RegExp("&gt;","mg");
	var regexpQuote = new RegExp("&quot;","mg");
	return(this.replace(regexpLessThan,"<").replace(regexpGreaterThan,">").replace(regexpQuote,"\"").replace(regexpAmp,"&"));
}

// Parse a space-separated string of name:value parameters where:
//   - the name or the value can be optional (and a separate default is used instead)
//     - in case of ambiguity, a lone word is taken to be a value
//   - if both the name and value are present they must be separated by a colon
//   - the name and the value may both be quoted with single- or double-quotes, double-square brackets
//   - names or values quoted with {{double-curly braces}} are evaluated as a JavaScript expression
// The result is an array of objects:
//   result[0] = object with a member for each parameter name, value of that member being an array of values
//   result[1..n] = one object for each parameter, with 'name' and 'value' members
String.prototype.parseParams = function(defaultName,defaultValue,allowEval,noNames)
{
	var parseToken = function(match,p)
		{
		var n;
		if(match[p]) // Double quoted
			n = match[p];
		else if(match[p+1]) // Single quoted
			n = match[p+1];
		else if(match[p+2]) // Double-square-bracket quoted
			n = match[p+2];
		else if(match[p+3]) // Double-brace quoted
			try
				{
				n = match[p+3];
				if(allowEval)
					n = window.eval(n);
				}
			catch(ex)
				{
				throw "Unable to evaluate {{" + match[p+3] + "}}: " + ex.toString();
				}
		else if(match[p+4]) // Unquoted
			n = match[p+4];
		return n;
		};
	var r = [{}];
	var dblQuote = "(?:\"((?:(?:\\\\\")|[^\"])*)\")";
	var sngQuote = "(?:'((?:(?:\\\\\')|[^'])*)')";
	var dblSquare = "(?:\\[\\[((?:\\s|\\S)*?)\\]\\])";
	var dblBrace = "(?:\\{\\{((?:\\s|\\S)*?)\\}\\})";
	var unQuoted = noNames ? "([^\"'\\s]\\S*)" : "([^\"':\\s][^\\s:]*)";
	var skipSpace = "(?:\\s*)";
	var token = "(?:" + dblQuote + "|" + sngQuote + "|" + dblSquare + "|" + dblBrace + "|" + unQuoted + ")";
	var re = noNames
		? new RegExp(token,"mg")
		: new RegExp(skipSpace + token + skipSpace + "(?:(\\:)" + skipSpace + token + "){0,1}","mg");
	var params = [];
	do {
		var match = re.exec(this);
		if(match)
			{
			var n = parseToken(match,1);
			if(noNames)
				r.push({name: "", value: n});
			else
				{
				var v = parseToken(match,7);
				if(v == null && defaultName)
					{
					v = n;
					n = defaultName;
					}
				else if(v == null && defaultValue)
					v = defaultValue;
				r.push({name: n, value: v});
				}
			}
	} while(match);
	// Summarise parameters into first element
	for(var t=1; t<r.length; t++)
		{
		if(r[0][r[t].name])
			r[0][r[t].name].push(r[t].value);
		else
			r[0][r[t].name] = [r[t].value];
		}
	return r;
}

// Process a string list of macro parameters into an array. Parameters can be quoted with "", '',
// [[]], {{ }} or left unquoted (and therefore space-separated). Double-braces {{}} results in
// an *evaluated* parameter: e.g. {{config.options.txtUserName}} results in the current user's name.
String.prototype.readMacroParams = function()
{
	var p = this.parseParams("list",null,true,true);
	var n = [];
	for(var t=1; t<p.length; t++)
		n.push(p[t].value);
	return n;
}

// Process a string list of unique tiddler names into an array. Tiddler names that have spaces in them must be [[bracketed]]
String.prototype.readBracketedList = function(unique)
{
	var p = this.parseParams("list",null,false,true);
	var n = [];
	for(var t=1; t<p.length; t++)
		n.pushUnique(p[t].value,unique);
	return n;
}

// Replace a chunk of a string given start and end markers
String.prototype.replaceChunk = function(start,end,sub)
{
	var s = this.indexOf(start);
	if(s != -1)
		{
		var e = this.indexOf(end,s + start.length);
		if(e != -1)
			return this.substring(0,s + start.length) + sub + this.substring(e);
		}
	return this;
}

// Static method to bracket a string with double square brackets if it contains a space
String.encodeTiddlyLink = function(title)
{
	if(title.indexOf(" ") == -1)
		return(title);
	else
		return("[[" + title + "]]");
}

// Static method to left-pad a string with 0s to a certain width
String.zeroPad = function(n,d)
{
	var s = n.toString();
	if(s.length < d)
		s = "000000000000000000000000000".substr(0,d-s.length) + s;
	return(s);
}

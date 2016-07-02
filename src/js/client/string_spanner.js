let sections = function(haystack, needle, remaining, acc, offset) {
  if (!acc) acc = [];
  if (!remaining) remaining = "";
  if (!offset) offset = 0;

  needle = needle.trim();
  let index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (index > -1) {
    if (remaining.length) {
      let remainingHaystack = haystack.substr(needle.length + index);
      let newAcc = acc.concat([[offset + index, offset + needle.length + index]]);
      return sections(remainingHaystack, remaining, null, newAcc, offset + needle.length + index);
    } else {
      return acc.concat([[offset + index, offset + needle.length + index]]);
    }
  } else if (needle.length > 1) {
    let nextNeedle = needle.substr(0, needle.length - 1);
    return sections(haystack, nextNeedle, needle.substr(needle.length - 1) + remaining, acc, offset);
  } else {
    return [];
  }
};

module.exports = function(haystack, needle, pre, post) {
  if (!pre) pre = "";
  if (!post) post = "";

  let matches = sections(haystack, needle);
  if (!matches.length) return haystack;
  let lastPos = 0;
  let result = "";

  for (let idx in matches) {
    let match = matches[idx];
    let start = match[0];
    let end = match[1];
    result += haystack.substring(lastPos, start);
    result += pre + haystack.substring(start, end) + post;
    lastPos = end;
  }

  result += haystack.substr(lastPos);

  return result;
};

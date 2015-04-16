var PrintStats = function()
{
  var tabIndex, frameIndex;
  var tabCount = 0, frameCount = 0, audioSourceCount = 0;
  for (tabIndex = 0; tabIndex < this.TabLruList.length; tabIndex++)
  {
    var tabInfo = this.TabInfoDict[this.TabLruList[tabIndex]];
    if (typeof(tabInfo) !== 'undefined')
    {
      tabCount++;
      for (frameIndex = 0; frameIndex < tabInfo.Frames.length; frameIndex++)
      {
        frameCount++;
        for (audioSourceIndex = 0; audioSourceIndex < tabInfo.Frames[frameIndex].AudioSources.length; audioSourceIndex++)
        {
          audioSourceCount++;
        }
      }
    }
  }
  console.log("# tabs: " + tabCount + ", # frames: " + frameCount + ", # possible audio sources: " + audioSourceCount + ", rough memory size of messaging: " + scope.RoughSizeOfObject(messaging));
};

// From http://stackoverflow.com/questions/1248302/javascript-object-size
function RoughSizeOfObject(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;

  while (stack.length) {
    var value = stack.pop();

    if (typeof value === 'boolean') {
      bytes += 4;
    }
    else if (typeof value === 'string') {
      bytes += value.length * 2;
    }
    else if (typeof value === 'number') {
      bytes += 8;
    }
    else if (typeof value === 'object' && objectList.indexOf(value) === -1)
    {
      objectList.push(value);

      for (var i in value) {
        stack.push(value[i]);
      }
    }
  }
  return bytes;
}

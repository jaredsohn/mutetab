var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-20791645-5']);

forge.prefs.get('analyticsEnabled', function(val) {
  if ((val === undefined) || (val === true)) {
     _gaq.push(['_trackPageview']);
  }
}, null);

// NOTE: Must include this and then ga.js to add analytics (change made due to manifestv2)

//(function() {
//  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//  ga.src = 'shared/ga.js';
//  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
//})();

// From http://snippets.dzone.com/posts/show/2630

// ----------------------------------------------------------------------------
// HasClassName
//
// Description : returns boolean indicating whether the object has the class name
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to add
//
function HasClassName(objElement, strClass)
{
   // if there is a class
   if ( objElement.className )
   {
      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // get uppercase class for comparison purposes
      var strClassUpper = strClass.toUpperCase();

      // find all instances and remove them
      for ( var i = 0; i < arrList.length; i++ )
      {
         // if class found
         if ( arrList[i].toUpperCase() == strClassUpper )
         {
            // we found it
            return true;
         }
      }
   }

   // if we got here then the class name is not there
   return false;
}
// 
// HasClassName
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// GetClassesWithPrefix (this method was written for mutetab)
//
// Description : returns boolean indicating whether the object has the class name
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name beginning to match
//
// Returns an array of matches

function GetClassesWithPrefix(objElement, strClassBegin)
{
   var matches = [];

   // if there is a class
   if ( objElement.className )
   {
      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // get uppercase class for comparison purposes
      var strClassUpper = strClassBegin.toUpperCase();
      // find all instances and remove them
      for ( var i = 0; i < arrList.length; i++ )
      {
         // if class found
         if ( (arrList[i].toUpperCase()).lastIndexOf(strClassUpper, 0) === 0)
         {
            // we found it
            matches.push(arrList[i]);
         }
      }
   }

   return matches;
}
// 
// GetClassesWithPrefix
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// AddClassName
//
// Description : adds a class to the class attribute of a DOM element
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to add
//
function AddClassName(objElement, strClass, blnMayAlreadyExist)
   {
   // if there is a class
   if ( objElement.className )
      {

      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // if the new class name may already exist in list
      if ( blnMayAlreadyExist )
         {

         // get uppercase class for comparison purposes
         var strClassUpper = strClass.toUpperCase();

         // find all instances and remove them
         for ( var i = 0; i < arrList.length; i++ )
            {

            // if class found
            if ( arrList[i].toUpperCase() == strClassUpper )
               {

               // remove array item
               arrList.splice(i, 1);

               // decrement loop counter as we have adjusted the array's contents
               i--;

               }

            }

         }

      // add the new class to end of list
      arrList[arrList.length] = strClass;

      // add the new class to beginning of list
      //arrList.splice(0, 0, strClass);

      // assign modified class name attribute
      objElement.className = arrList.join(' ');

      }
   // if there was no class
   else
   {
      // assign modified class name attribute      
      objElement.className = strClass;
   }
}
// 
// AddClassName
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// RemoveClassName
//
// Description : removes a class from the class attribute of a DOM element
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to remove
//
function RemoveClassName(objElement, strClass)
   {

   // if there is a class
   if ( objElement.className )
      {

      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // get uppercase class for comparison purposes
      var strClassUpper = strClass.toUpperCase();

      // find all instances and remove them
      for ( var i = 0; i < arrList.length; i++ )
         {

         // if class found
         if ( arrList[i].toUpperCase() == strClassUpper )
            {

            // remove array item
            arrList.splice(i, 1);

            // decrement loop counter as we have adjusted the array's contents
            i--;

            }

         }

      // assign modified class name attribute
      objElement.className = arrList.join(' ');

      }
   // if there was no class
   // there is nothing to remove

   }
// 
// RemoveClassName
// ----------------------------------------------------------------------------

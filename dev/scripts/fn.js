import React from 'react';
import firebase from 'firebase';
import { runInThisContext } from 'vm';

const fn = {};

fn.test = function (testString) {
  (testString) ? console.log(testString) : null ;
 console.log(`Should be the App`, this)
}

fn.thisApp = function () {
  return this;
}

fn.handleChange = function (e) {
  this.setState ({
    [e.target.name]: e.target.value
  });
}



fn.loginWithGoogle = function () {
	const provider = new firebase.auth.GoogleAuthProvider();

	firebase.auth().signInWithPopup(provider);
}

fn.logout = function () {
	firebase.auth().signOut();
}


fn.handleAuthChange = function (user) {
	//If the user info returned from google popup is not null, then the user is logged in
	if (user !== null) {
		let dbRefUser = firebase.database().ref('users/'+ user.uid);
		//Add value listener to user node in database
		dbRefUser.on('value', (snapshot) => {
		  if(snapshot.exists()) {
			let loggedInUser = snapshot.val();

			this.setState({
			  loggedIn: true,
			  user: loggedInUser,
			});

			this.dbRefUser = dbRefUser;
		  } else { //if the user does not already exist in the database- create them
			const loggedInUser = {
			  id: user.uid,
			  name: user.displayName,
			  photo: user.photoURL,
			  //savedEvents
			}
			this.setState({
			  loggedIn: true,
			  user: loggedInUser
			})
			dbRefUser.set(loggedInUser);
		  }

		});
	} else { //user is logging out
		this.setState({
		loggedIn: false,
		user: null
		});

		//Remove the value event listener
		if (this.dbRefUser) {
			this.dbRefUser.off();
		}
	}//end of else statement
}

fn.saveEvent = function (e, event) {
	e.preventDefault();
	console.log(event);

	//If user is logged in, push event to that user's savedEvents node
	if (this.state.user) {
		const dbRefSaved =  firebase.database().ref('users/' + this.state.user.id + '/savedEvents');
		dbRefSaved.push(event);
		this.setState({
			savedStart: 0
		})
	} else {
		//If user is not logged in prompt them to log in
		this.setState({
			showModal: true,
			message: 'Please login to save your event.'
		})
	}
} //end of saveEvent

fn.handleModalClick = function() {
	this.setState({
		showModal: false,
		message: ''
	})
}//end of modalClick

fn.sliceSavedEvents = function(array) {
	let i = this.state.savedStart;
	let initialSlice = array.slice(i, i + 4);
	let diff = 4 - initialSlice.length;

	if (array.length < 4) {
		return initialSlice.concat(array.slice(0,i));
	} else if (diff > 0) {
		let secondSlice = array.slice(0, diff);
		return initialSlice.concat(secondSlice);
	} else {
		return initialSlice;
	}
}

fn.isEventPassed = function (event) {
	const today = fn.todayDate();

	// console.log('isEventPassed');
	let dateComparison;
	if (event.enddate1) {
		dateComparison = fn.compareDates(event.enddate1, today);
		// console.log(event.title , dateComparison);
	} else {
		dateComparison = fn.compareDates(event.date1, today);
		// console.log(event.title , dateComparison);
	}

	return (dateComparison === 1) ? true : false;


}

fn.handleButtonLeft = function(numberSaved) {
	let initialStartIndex = this.state.savedStart;
	let currentIndex;
	if(initialStartIndex === 0) {
		currentIndex = numberSaved - 1;
	} else {
		currentIndex = initialStartIndex - 1;
	}
	this.setState({
		savedStart: currentIndex
	})
}
fn.handleButtonRight = function (numberSaved) {
	let initialStartIndex = this.state.savedStart;
	let currentIndex;
	if (numberSaved - 1 === initialStartIndex) {
		currentIndex = 0;
	} else {
		currentIndex = initialStartIndex + 1;
	}
	this.setState({
		savedStart: currentIndex
	})
}

fn.removeEvent = function(dbKey) {
	let userId = this.state.user.id;
	let dbRefEvent = firebase.database().ref('users/'+ userId + '/savedEvents/' + dbKey);
	dbRefEvent.remove();

}

fn.displayDropdown = function() {
	this.setState({
		displayHamMenu: !this.state.displayHamMenu
	})
}

fn.handleNavClick = function(e, id) {
	e.preventDefault();

	this.setState({
		displayHamMenu: false,
		savedMobileExpand: false
	});

	setTimeout(() => {
		document.querySelector('#'+ id).scrollIntoView({
			behavior: 'smooth'
		});
	}, 100);
}

fn.displayHomeButton = function() {
	let { displayHomeButton } = this.state
	window.scrollY >= 150 ?
		!displayHomeButton && this.setState({ displayHomeButton: true })
		:
		displayHomeButton && this.setState({ displayHomeButton: false })

	this.prev = window.scrollY;
}


fn.getAgeGroups = function (data) {
let ageGroups =  data.reduce( (allAges, event) => {
  let  ageGroups =  event["agegroups"];
  // console.log(ageGroups);

  ageGroups = ageGroups.split(',').map(age => age.trim() );
  return allAges.concat(ageGroups);

}, [] );

return fn.getUnique(ageGroups);

}

fn.getUnique = function(array) {
	const uniqueSet = new Set(array);
	return  Array.from(uniqueSet);
}


fn.getUniqueEventTypes = function (data) {
	let eventTypes = data.reduce(( allTypes, event) => {
		return allTypes.concat( [ event["eventtype1"] ]  );
	}, [] );

	return fn.getUnique( eventTypes );
}
//Function Calls to get the age groups and event types (not used at runtime)
		// console.log(`age groups`, fn.getAgeGroups(data) );
		// console.log(`get unique event types`,  fn.getUniqueEventTypes(data) );


//Takes dates in 'yyyy/mm/dd' format
fn.compareDates = function (date1, date2 ) {
	date1 = date1.split('/');
	date2 = date2.split('/');

	for (let i = 0; i < 3; i++) {
		if (date1[i] > date2[i]) {
		  return -1;
		} else if (date1[i] < date2[i]) {
		  return 1;
		}
	}
  //If it has not returned after the for loop this means the dates are equal.
	return 0;
}


fn.sortByDate = function (dataArr ) {
	// console.log(dataArr);

	const dataCopy = Array.from(dataArr);

	dataCopy.sort((a,b) => {
    // console.log(a['date1'], b['date1'], compareDates( a['date1'], b['date1'])  );

    //This sort it by starting date
	return fn.compareDates( a['date1'], b['date1']);

	} );
	return dataCopy;
}


  //Today's Date is given as a 'yyyy/mm/dd' string
  fn.getUpcoming = function (numberToGet, today, sortedData) {

    let upcoming = [];

    //Start at the end of the data array since the data is sorted for furthest future events to be low index.
    let i = sortedData.length - 1 ;
    while (upcoming.length < numberToGet && i >= 0) {
      if (fn.compareDates(today, sortedData[i]['date1'] )  >= 0 ) {
        upcoming.push( sortedData[i] )
      }

      i--;
    }

    return upcoming;

  }//End of get upcoming

fn.filterByAgeGroup = function (data, ageGroups) { //is array of age group strings
	return data.filter( (event) => {
		let result = false;

		ageGroups.forEach(group =>    {
			//If the event age groups string includes one of the selected age groups then set result to true. Else it will remain false.
		 if (event.agegroups.includes(group) === true ) {	result = true; }
		});
		return result;
	});
}

fn.filterByEventType = function (data, eventTypes) {
	return data.filter( (event) => {
		let result = false;

		eventTypes.forEach(type =>    {

		 if (event.eventtypes.includes(type) === true ) {	result = true; }
		});
		return result;
	});

}

fn.filterByBranch = function (data, branches) { //is array of branch strings strings
	return data.filter( (event) => {
		let result = false;

		branches.forEach(branch =>    {
			//If the event age groups string includes one of the selected age groups then set result to true. Else it will remain false.
		 if (event.library.includes(branch) === true ) {	result = true; }
		});
		return result;
	});
}

fn.filterEachEventCategory = function (data) {
	const ageFilters = {
		children: ['School-Age Children', 'Pre-School Children', 'All Children'],
		students: ['Teen'],
		seniors: ['Older Adult']
	}

	const typeFilters = {
		arts: [
		"Art Exhibits",
		"Museum & Arts Pass",
		"Artists in the Library"],

		newcomers: [
		"ESL & Newcomer Programs",
		"Adult Literacy"]
	   }

	const categories = {};
	categories.upcoming = data;
	categories.children = fn.filterByAgeGroup(data, ageFilters.children ) ;
	categories.students = fn.filterByAgeGroup(data, ageFilters.students) ;
	categories.seniors = fn.filterByAgeGroup(data, ageFilters.seniors)  ;
	categories.newcomers = fn.filterByEventType(data, typeFilters.newcomers) ;
	categories.arts = fn.filterByEventType(data, typeFilters.arts);
	// categories.saved = null;
	return categories;
}


fn.todayDate = function () {
	const dateObj = new Date;
	return `${dateObj.getFullYear()}/${
		//If the month + 1 is less than 10 add a zero
		(dateObj.getMonth()+1 < 10  ) ? '0' + (dateObj.getMonth()+1)  : dateObj.getMonth()+1
	}/${  dateObj.getDate() < 10  ?  '0' + dateObj.getDate()  :   dateObj.getDate()}`;
}

fn.filterCategoriesByDate = function (categories) {
	const today = fn.todayDate();
	for (const category in categories) {
		let catArr = categories[category];
		catArr = fn.sortByDate(catArr);
		categories[category] = fn.getUpcoming(20, today, catArr);
	}
	return categories;

}


//Geolocation

fn.getNearbyEvents = function (e) {
	e.preventDefault();
	const locationPromise = new Promise( (resolve, reject) => {
		navigator.geolocation.getCurrentPosition( (position) => resolve(position)   );
	});

	locationPromise.then( (position) => {

		console.log(position.coords.latitude, position.coords.longitude);

		const googleUserLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
		// console.log('Google object', googleMapsObj);

		let branchesWithDistance = this.state.branches.map((branch) => {
			const coord = branch.Point.coordinates.split(',');
			const lng = coord[0];
			const lat = coord[1];
			const googleBranchLocation =  new google.maps.LatLng(lat, lng);
			const distance = google.maps.geometry.spherical.computeDistanceBetween(googleUserLocation, googleBranchLocation);

			branch.distanceToUser = distance;

			return branch;
		});

		branchesWithDistance.sort((a,b) => {
			return a.distanceToUser - b.distanceToUser
		} );

		const closestBranches = branchesWithDistance.slice(0,3);

		const closestBranchNames = closestBranches.map(branch => branch.name  );

		const nearbyEvents = fn.filterByBranch(this.state.fullData, closestBranchNames);

		const filteredData =  fn.filterCategoriesByDate ( fn.filterEachEventCategory(nearbyEvents) );

		this.setState({
			nearbyEvents: filteredData,
			renderNearbyEvents: true
		});

	} );



}


// osition
// ​
// coords: Coordinates
// ​​
// accuracy: 30
// ​​
// altitude: 0
// ​​
// altitudeAccuracy: 0
// ​​
// heading: NaN
// ​​
// latitude: 43.648171600000005
// ​​
// longitude: -79.39789119999999
// ​​
// speed: NaN
// ​​
// __proto__: CoordinatesPrototype { latitude: Getter, longitude: Getter, altitude: Getter, … }
// ​
// timestamp: 1527618736525


fn.eventPageChange = function (event) {
	this.setState({
		eventPageData: event
	});

}

fn.getGoogleTime = function (event) {

	const startDate = event.date2.substring(0, 8)

	let startTime = parseInt(event.date2.substring(8, 12)) + 400

	if (startTime.toString().length < 4) {
		startTime = '0' + startTime.toString()
	} else {
		startTime = startTime.toString()
	}

	const googleStartDate = startDate + 'T' + startTime + '00Z'

	let endDate = ''

	let endTime = ''

	if (event.enddate1) {
		endDate = event.enddate1.replace(/\//g, '')
	} else {
		endDate = startDate
	}
	if (!event.endtime) {
		endTime = "N/A"
	}
	else if (event.endtime.includes('P')) {
		endTime = String(parseInt(event.endtime.substring(0, event.endtime.indexOf(':'))) + 16) + event.endtime.substring(event.endtime.indexOf(':') + 1, event.endtime.indexOf(':') + 3)
	} else {
		endTime = String(parseInt(event.endtime.substring(0, event.endtime.indexOf(':'))) + 4) + event.endtime.substring(event.endtime.indexOf(':') + 1, event.endtime.indexOf(':') + 3)
	}

	const googleEndDate = endDate + 'T' + endTime + '00Z'

	const googleFullDate = googleStartDate + '/' + googleEndDate;

	return googleFullDate

}





export default fn



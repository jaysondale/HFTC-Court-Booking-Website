(function($){
    let checkAdmin = async function() {
        return await firebase.firestore().collection('params').doc('admin').get().then(snap => {
            if (snap.exists){
                let currentUID = firebase.auth().currentUser.uid;
                let uids = snap.get('uid');
                return uids.includes(currentUID);
            } else {
                return false;
            }
        })
    };

    let isAdmin = false;


    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const typeConvert = {
        'tennis': 'Tennis',
        'pickle_front': 'Pickleball-Front',
        'pickle_back': 'Pickleball-Back'
    };

    // Hide success alert by default
    $('#view-bookings-alert').hide();

    let displayAlert = function(msg, isSuccess) {
        let alert = $('#main-alert');
        if (isSuccess) {
            $(alert).addClass('alert-success')
        } else {
            $(alert.addClass('alert-danger'))
        }
        $('#alert-msg').text(msg);
        $(alert).show();
    };

    let hideAlert= function() {
        let alert = $('#main-alert');
        if ($(alert).hasClass('alert-success')) {
            $(alert).removeClass('alert-success')
        } else if ($(alert).hasClass('alert-danger')) {
            $(alert).removeClass('alert-danger')
        }
        $(alert).hide();
    };
    hideAlert();

    // Firebase authentication
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            let displayName = user.displayName;
            (async () => {
                isAdmin = await checkAdmin();
                if (isAdmin) {
                    $("#admin-btn").show();
                    $('#admin-btn').click(function() {
                        window.location = 'admin.html'
                    });
                } else {
                    $('#admin-btn').hide();
                }
            })();
            if (displayName === null) {
                db.collection("users").doc(user.uid).get().then(snap => {
                    let data = snap.data();
                    displayName = data["displayName"];
                    $('#user-name').text("Hello, " + displayName);

                    // Set user displayName in auth system
                    user.updateProfile({
                        displayName: displayName
                    }).then(() => {
                        console.log("User profile updated");
                        $('#user-name').text("Hello, " + displayName);
                    })
                })
            } else {
                $('#user-name').text("Hello, " + displayName);
            }
        } else {
            window.location = "index.html"
        }
    });

    let firstDay = new Date();
    let bookingType = () => {
        if ($("#book-tennis").parent().hasClass("active")) {
            return "tennis"
        } else {
            return "pickle"
        }
    };

    let Booking = function(dayOfWeek, day, month, year, startTime, b_type) {
        this.dayOfWeek = dayOfWeek;
        this.day = day;
        this.month = month;
        this.year = year;
        this.startTime = startTime;
        this.b_type = b_type;
    };

    let SetDates = function(firstDate){
        let currentDate = new Date();
        currentDate.setDate(firstDate.getDate());
        for(let i = 1; i <= 7; i++) {
            let currentLabel = document.getElementById("day-" + i);
            currentLabel.innerHTML = days[currentDate.getDay()] + " " + months[currentDate.getMonth()] + " " + currentDate.getDate();
            currentDate.setDate(currentDate.getDate() + 1);
        }
    };

    let isInPastStringDate = function(date, refDate) {
        refDate = typeof refDate === 'undefined' ? new Date() : refDate;
        let splitDate = date.split('-');
        let dateFmt = new Date(splitDate[0], splitDate[1] - 1, splitDate[2]);
        return refDate > dateFmt;
    };

    let isInPast = function (day, month, year, time) {
        let rightNow = new Date();

        let dayInPast = false;
        if (year == rightNow.getFullYear()) {
            if (month == rightNow.getMonth()) {
                if (day < rightNow.getDate()) {
                    dayInPast = true;
                } else if (day === rightNow.getDate()) {
                    let est = parseInt(time, 10);
                    if (time.includes("pm") && est < 12) {
                        est += 12
                    }
                    if ((est + 4) < rightNow.getUTCHours()) {
                        dayInPast = true;
                    }
                }
            } else {
                dayInPast = month < rightNow.getMonth();
            }
        } else {
            dayInPast = year < rightNow.getFullYear();
        }

        return dayInPast;
    };

    let SetCurrentWeek = function() {
        // Get first day of current week
        firstDay = new Date();
        //firstDay.setDate(firstDay.getDate() - firstDay.getDay());
        SetDates(firstDay);
    };
    SetCurrentWeek();

    // Display booking modal
    let displayBookingModal = function() {
        

        // Display description field if user is admin
        /*

        if (isAdmin) {
            $(field).show();
        } else {

        }

         */
        let field = $('#booking-description-field');
        $(field).hide();

        console.log(isAdmin);

        // Get coordinates of selection
        let selected = $(".cell-selected");
        let h_index = selected.parent().index() - 1;
        let v_index = selected.parent().parent().index();

        // Get selected date
        let selectedDate = new Date();
        selectedDate.setDate(firstDay.getDate() + h_index);
        let month = selectedDate.getMonth();
        let day = selectedDate.getDate();
        let dayOfWeek = selectedDate.getDay();
        let year = selectedDate.getFullYear();

        // Get selected time
        let timeList = $(".th-time");
        let time = $(timeList[v_index]).text().split(" ")[0];

        // Check user booking limit
        let db = firebase.firestore();

        let bookingLimit = db.collection('params').doc('booking-limit');
        bookingLimit.get().then(function(doc) {
            const lim = doc.get('hours');

            let currentUser = firebase.auth().currentUser;

            let bookingRef = db.collection('bookings');
            let query = bookingRef.where('user', '==', currentUser.uid).where('year', '==', year).where('month', '==', month).where('day', '==', day);
            let hours = 1;
            query.get().then(querySnapshot => {
                querySnapshot.forEach(doc => {
                    hours += 1;
                });

                if (hours > lim) {
                    displayAlert('Unable to book court: You have already booked ' + lim + 'hrs of court time that day!', false)
                } else {
                    let b_type = "tennis";
                    if (bookingType() === 'pickle') {
                        b_type = (selected.index() === 0 ? 'pickle_front' : 'pickle_back')
                    }

                    // Update field
                    $("#booking-info").text("Confirm " + typeConvert[b_type] + " booking on " + days[dayOfWeek] + " " + months[month] + " " + day + " at " + time);

                    // Create booking object
                    let booking = new Booking(dayOfWeek, day, month, year, time, b_type);

                    $('#book-btn').unbind('click').bind('click', (function() {
                        bookCourt(booking);
                    }));

                    $('#book-modal').modal('show');
                }
            });
        });
    };

    let closeBookModal = function () {
        $('.cell-selected').removeClass("cell-selected");
        $('#book-modal').modal('hide');
    };

    // Display view booking modal
    let displayViewModal = function() {
        $('#view-modal').modal('show');

        let db = firebase.firestore();

        let currentUser = firebase.auth().currentUser;

        let bookingRef = db.collection('bookings');
        let query = bookingRef.where('user', '==', currentUser.uid);

        let activeBookings = [];

        // Perform query
        query.get().then(querySnapshot => {
            querySnapshot.forEach(function(booking) {
                activeBookings.push({
                    dayOfWeek: booking.get('dayOfWeek'),
                    day: booking.get('day'),
                    month: booking.get('month'),
                    year: booking.get('year'),
                    startTime: booking.get('startTime'),
                    b_type: booking.get('bookingType'),
                    doc_id: booking.id
                })
            });

            // Filter out bookings that occur in past
            activeBookings = activeBookings.filter(item => {
                return !isInPast(item.day, item.month, item.year, item.startTime)
            });



            // Display active bookings in modal
            activeBookings.forEach(booking => {
                $('#view-table-body').append(`<tr class="booking-row"><th class="align-middle">${days[booking.dayOfWeek]} ${months[booking.month]} ${booking.day}</th><th class="align-middle">${booking.startTime}</th><th class="align-middle">${typeConvert[booking.b_type]}</th><th class="align-middle"><button type="button" class="btn btn-danger text-white delete-btn">&times;</button></th></tr>`);
            });

            // Activate delete buttons
            $('.delete-btn').click(function() {
                let selectedIndex = $(this).parent().parent().index();
                let docIdToDelete = activeBookings[selectedIndex]['doc_id'];
                activeBookings.splice(selectedIndex, 1);
                bookingRef.doc(docIdToDelete).delete().then(function() {
                    $('.booking-row')[selectedIndex].remove();
                    $('#view-bookings-alert').show();
                });
            })
        })

    };

    $('#view-modal').on('hide.bs.modal', function(_) {
        $('.booking-row').remove();
        $('#view-bookings-alert').hide();
        PopulateAvailability();
    });

    $('#view-btn').click(displayViewModal);
    $('#view-close').click(() => {$('#view-modal').modal('hide');});

    // Populate Availability
    let PopulateAvailability = async function() {
        let num_cols = $('#booking-table > thead > tr').children().length - 2;
        let time_rows = $('#booking-table > tbody > tr');
        $('.content-cell').remove();

        $('.table-loading-overlay').show();

        hideAlert();

        // Retrieve current booking info
        let db = firebase.firestore();

        let getBookings = async function(collectionRef) {
            return await collectionRef.get().then(querySnap => {
                let results = [];
                querySnap.forEach(docSnap => {
                    results.push(docSnap.data())
                });
                return results;
            })
        };

        let specialBookings = await getBookings(db.collection('special_bookings_revised'));
        let memberBookings = await getBookings(db.collection('bookings'));

        // Load user info
        let displayNames = await db.collection('users').get().then(querySnap => {
            let users = {};
            querySnap.forEach(snap => {
                let userData = snap.data();
                let uid = snap.id;
                users[uid] = userData['displayName'];
            });
            return users;
        });

        // Load everything else
        for (let dayIndex = 0; dayIndex <= num_cols; dayIndex++) {
            let currDate = new Date();
            currDate.setDate(firstDay.getDate() + dayIndex);

            let specialBookingObjects = {};

            // Check special bookings

            specialBookings.forEach(booking => {
                // Check if day is in special booking range
                if (isInPastStringDate(booking['startDate'], currDate)) {
                    if (!isInPastStringDate(booking['endDate'], currDate)) {
                        // Check period
                        if (booking['period'] === 'Weekly') {
                            // Check if day in question is one of the selected days
                            if (booking[days[currDate.getDay()].toLowerCase()]) {
                                // Display at start Time
                                specialBookingObjects[booking['startTime']] = `<button type="button" class="btn btn-block a-content booking-special">${booking['bookingDescription']}</button>`
                            }
                        }
                    }
                }
            });

            let displayButton = function (row, btnText) {
                if (bookingType() === "tennis") {
                    $(row).append(`<td class="content-cell">${btnText}</td>`)
                } else {
                    $(row).append(`<td class="content-cell">${btnText}${btnText}</td>`)
                }
            };

            // Iterate through times
            time_rows.each((index, row) => {
                let startTime = $(row).find('.th-time').text().split(' ')[0];
                // If on first day, check for unavailable times
                let timeUsed = false;
                if (dayIndex === 0) {
                    if (isInPast(currDate.getDate(), currDate.getMonth(), currDate.getFullYear(), startTime)) {
                        displayButton(row, `<button type="button" class="btn btn-block a-content a-unavailable">Unavailable</button>`);
                        timeUsed = true;
                    }
                }
                if (!timeUsed) {
                    // Check special booking
                    if (startTime in specialBookingObjects) {
                        displayButton(row, specialBookingObjects[startTime]);
                        timeUsed = true;
                    } else {
                        // Check member bookings
                        let selectedBookings = [];
                        for (let i = 0; i < memberBookings.length; i++) {
                            let booking = memberBookings[i];
                            if (booking['year'] === currDate.getFullYear()) {
                                if (booking['month'] === currDate.getMonth()) {
                                    if (booking['day'] === currDate.getDate()) {
                                        if (booking['startTime'] === startTime) {
                                            // Display booking
                                            selectedBookings.push(booking);
                                            timeUsed = true;
                                        }
                                    }
                                }
                            }
                        }
                        let booking0Class = 'a-booked';
                        let booking1Class = 'a-booked';
                        if (selectedBookings.length > 0) {
                            booking0Class = selectedBookings[0]['user'] === firebase.auth().currentUser.uid ? 'a-my-booking' : 'a-booked';
                            if (selectedBookings.length > 1) {
                                booking1Class = selectedBookings[1]['user'] === firebase.auth().currentUser.uid ? 'a-my-booking' : 'a-booked';
                            }
                        }
                        if (selectedBookings.length === 1) {
                            if (selectedBookings[0]['bookingType'] === 'tennis') {
                                displayButton(row, `<button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button>`)
                            } else if (selectedBookings[0]['bookingType'] === 'pickle_front') {
                                if (bookingType() === 'pickle') {
                                    $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button><button type="button" class="btn btn-block a-content a-available">Back</button></td>`)
                                } else {
                                    $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button></td>`)
                                }

                            } else {
                                if (bookingType() === 'pickle') {
                                    $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content a-available">Front</button><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button></td>`)
                                } else {
                                    $(row).append(`<td><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button></td>`)
                                }

                            }

                        } else if (selectedBookings.length === 2) {
                            if (bookingType() === 'tennis') {
                                let bookingClass = booking0Class === 'a-my-booking' || booking1Class === 'a-my-booking' ? 'a-my-booking' : 'a-booked';
                                $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content ${bookingClass}">Booked</button></td>`)
                            } else {
                                if (selectedBookings[0]['bookingType'] === 'pickle_front') {
                                    $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button><button type="button" class="btn btn-block a-content ${booking1Class}">${displayNames[selectedBookings[1]['user']]}</button></td>`)
                                } else {
                                    $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content ${booking1Class}">${displayNames[selectedBookings[1]['user']]}</button><button type="button" class="btn btn-block a-content ${booking0Class}">${displayNames[selectedBookings[0]['user']]}</button></td>`)
                                }
                            }

                        }
                    }
                }
                // If no booking was placed, fill with available buttons
                if (!timeUsed) {
                    if (bookingType() === 'tennis') {
                        $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content a-available">Book</button></td>`);
                    } else {
                        $(row).append(`<td class="content-cell"><button type="button" class="btn btn-block a-content a-available">Front</button><button type="button" class="btn btn-block a-content a-available">Back</button></td>`);
                    }

                }
            });

            // Hide loader
            $('.table-loading-overlay').hide();

            // Add height class
            console.log('updated');
            if (bookingType() === 'tennis') {
                $('.a-content').addClass('tennis-cell');
            } else {
                $('.a-content').addClass('pickle-cell');
            }

            // Activate buttons
            $('.a-available').click(function() {
                $(this).addClass("cell-selected");
                displayBookingModal();
            });
        }
    };

    $('#book-tennis').click(PopulateAvailability);
    $('#book-pickle').click(PopulateAvailability);

    // Default
    PopulateAvailability();

    // Modal cancel button
    $('#book-cancel').click(closeBookModal);

    // Sign out button
    $('#sign-out-btn').click(function() {firebase.auth().signOut();});

    let bookCourt = function(booking) {
        let db = firebase.firestore();
        let user = firebase.auth().currentUser;

        if (!isAdmin || isAdmin) {
            db.collection("bookings").add({
                user: user.uid,
                bookingType: booking.b_type,
                dayOfWeek: booking.dayOfWeek,
                day: booking.day,
                month: booking.month,
                year: booking.year,
                startTime: booking.startTime
            }).catch(function(error) {
                console.error("Error adding document: ", error);
            });
        } else {
            // If admin, get booking description
            const description = $('#description').val();
            db.collection("special_bookings").add({
                bookingDescription: description,
                dayOfWeek: booking.dayOfWeek,
                day: booking.day,
                month: booking.month,
                year: booking.year,
                startTime: booking.startTime
            }).catch(function(error) {
                console.error("Error adding document: ", error);
            });
        }
        
        closeBookModal();

        PopulateAvailability();
        // Display success alert
        displayAlert(`Court booked for ${days[booking.dayOfWeek]} ${months[booking.month]} ${booking.day} at ${booking.startTime}.`, true)
    }

})(jQuery);
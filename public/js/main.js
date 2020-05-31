(function($){
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
            $('#user-name').text("Hello, " + user.displayName);
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
                    displayAlert('Unable to book court: You have already booked ' + lim + 'hrs of court time today!', false)
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
                $('#view-table-body').append(`<tr class="booking-row"><th class="align-middle">${days[booking.dayOfWeek]} ${months[booking.month]} ${booking.day}</th><th class="align-middle">${booking.startTime}</th><th class="align-middle">${typeConvert[booking.b_type]}</th><th class="align-middle"><a class="btn btn-danger text-white delete-btn">&times;</a></th></tr>`);
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

    // Populate Tennis availability
    let PopulateAvailability = function() {
        let num_cols = $('#booking-table > thead > tr').children().length - 2;
        let time_rows = $('#booking-table > tbody > tr');
        $('.content-cell').remove();

        $('.table-loading-overlay').show();

        hideAlert();

        // Retrieve current booking info
        let db = firebase.firestore();

        db.collection("bookings").get().then(function(querySnapshot){
            let bookings = [];
            querySnapshot.forEach(function(doc) {
               bookings.push({
                   uid: doc.get("user"),
                   day: doc.get("day"),
                   month: doc.get("month"),
                   year: doc.get("year"),
                   startTime: doc.get("startTime"),
                   b_type: doc.get("bookingType")
               })
            });

            time_rows.each((index, row) => {
                let time = $(row).find('.th-time').text().split(' ')[0];
                for (let i = 0; i<=num_cols; i++) {
                    let currDate = new Date();
                    currDate.setDate(firstDay.getDate() + i);

                    let day = currDate.getDate();
                    let month = currDate.getMonth();
                    let year = currDate.getFullYear();

                    if (isInPast(day, month, year, time)) {
                        if (bookingType() === "tennis") {
                            $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-unavailable">Unavailable</a></th>');
                        } else {
                            $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-unavailable">Unavailable</a><a class="btn btn-block a-content a-unavailable">Unavailable</a></th>');
                        }
                    } else {
                        let filter = {
                            day: day,
                            month: month,
                            year: year,
                            startTime: time
                        };
                        let filteredBookings = bookings.filter(function(item) {
                            for (let key in filter) {
                                if (item[key] === undefined || item[key] != filter[key]) {
                                    return false;
                                }
                            }
                            return true;
                        });

                        let currentUser = firebase.auth().currentUser;
                        let available = '<a class="btn btn-block a-content a-available">Book</a>';
                        let my_booking = '<a class="btn btn-block a-content a-my-booking">' + currentUser.displayName +'</a>';
                        let booked = '<a class="btn btn-block a-content a-booked">Booked</a>';

                        let front_available = '<a class="btn btn-block a-content a-available">Front</a>';
                        let back_available = '<a class="btn btn-block a-content a-available">Back</a>';

                        let usrUid = currentUser.uid;
                        if (bookingType() === "tennis"){
                            if (filteredBookings.length === 0) {
                                $(row).append('<th class="p-1 content-cell">' + available + '</th>');
                            } else {
                                if (filteredBookings[0]["uid"] === usrUid) {
                                    $(row).append('<th class="p-1 content-cell">' + my_booking + '</th>');
                                } else {
                                    $(row).append('<th class="p-1 content-cell">' + booked + '</th>');
                                }
                            }
                        } else {
                            let str = front_available + back_available;
                            if (filteredBookings.length === 1) {
                                let b_type = filteredBookings[0]['b_type'];
                                let bookedText = (filteredBookings[0]['uid'] === usrUid ? my_booking : booked);
                                if (b_type === 'pickle_front') {
                                    str = bookedText + back_available;
                                } else if (b_type === 'pickle_back') {
                                    str = front_available + bookedText;
                                } else if (b_type === 'tennis') {
                                    str = bookedText + bookedText;
                                }
                            } else if (filteredBookings.length === 2) {
                                let frontBooked = booked;
                                let backBooked = booked;
                                filteredBookings.forEach(booking => {
                                    if (booking['uid'] === usrUid) {
                                        if (booking['b_type'] === 'pickle_front') {
                                            frontBooked = my_booking;
                                        } else {
                                            backBooked = my_booking;
                                        }
                                    }
                                });
                                str = frontBooked + backBooked;
                            }
                            $(row).append('<th class="p-1 content-cell">' + str + "</th>")
                        }
                    }
                }
            });

            // Hide loader
            $('.table-loading-overlay').hide();

            // Activate buttons
            $('.a-available').click(function() {
                $(this).addClass("cell-selected");
                displayBookingModal();
            });
        }).catch(e => {
            console.log(e);
        });
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
        closeBookModal();

        PopulateAvailability();
        // Display success alert
        displayAlert(`Court booked for ${days[booking.dayOfWeek]} ${months[booking.month]} ${booking.day} at ${booking.startTime}.`, true)
    }

})(jQuery);
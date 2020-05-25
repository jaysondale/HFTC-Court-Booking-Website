(function($){
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Firebase authentication
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            $('#user-name').text("Hello, " + user.displayName);
        } else {
            window.location = "login.html"
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

    let Booking = function(day, month, year, startTime, b_type) {
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

    let SetCurrentWeek = function() {
        // Get first day of current week
        firstDay = new Date();
        firstDay.setDate(firstDay.getDate() - firstDay.getDay());
        SetDates(firstDay);
    };
    SetCurrentWeek();

    // Display booking modal
    let displayBookingModal = function() {
        $('#book-modal').modal('show');
        $('.booking-info').text("Booking");

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
        console.log(v_index);

        // Update field
        $("#booking-info").text("Confirm booking on " + days[dayOfWeek] + " " + months[month] + " " + day + " at " + time);

        // Create booking object
        let booking = new Booking(day, month, year, time, bookingType());

        $('#book-btn').click(function() {
            bookCourt(booking);
        });
    };

    let closeModal = function () {
        $('.cell-selected').removeClass("cell-selected");
        $('#book-modal').modal('hide');
    };

    // Populate Tennis availability
    let PopulateAvailability = function() {
        let num_cols = $('#booking-table > thead > tr').children().length - 2;
        let time_rows = $('#booking-table > tbody > tr');
        $('.content-cell').remove();

        // Retrieve current booking info
        let db = firebase.firestore();

        db.collection("bookings").get().then(function(querySnapshot){
            let bookings = new Array();
            querySnapshot.forEach(function(doc) {
               bookings.push({
                   day: doc.get("day"),
                   month: doc.get("month"),
                   year: doc.get("year"),
                   startTime: doc.get("startTime"),
                   b_type: doc.get("bookingType")
               })
            });
            time_rows.each((index, row) => {
                let time = $(row).find('.th-time').text().split(' ')[0];
                for (let i = 0; i<num_cols; i++) {
                    let currDate = new Date();
                    currDate.setDate(firstDay.getDate() + i);

                    let rightNow = new Date();


                    let day = currDate.getDate();
                    let month = currDate.getMonth();
                    let year = currDate.getFullYear();
                    let dayInPast = false;
                    if (year >= rightNow.getFullYear()) {
                        if (month >= rightNow.getMonth()) {
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
                        }
                    }
                    if (dayInPast) {
                        if (bookingType() == "tennis") {
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

                        if (bookingType() === "tennis"){
                            if (filteredBookings.length === 0) {
                                $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-available">Available</a></th>');
                            } else {
                                $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-booked">Booked</a></th>');
                            }
                        } else {
                            if (filteredBookings.length === 0) {
                                $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-available">Available</a><a class="btn btn-block a-content a-available">Available</a></th>');
                            } else if (filteredBookings.length === 1 && filteredBookings[0]["b_type"] === "pickle") {
                                $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-available">Available</a><a class="btn btn-block a-content a-booked">Booked</a></th>');
                            } else {
                                console.log(filteredBookings[0]);
                                $(row).append('<th class="p-1 content-cell"><a class="btn btn-block a-content a-booked">Booked</a><a class="btn btn-block a-content a-booked">Booked</a></th>');
                            }
                        }
                    }
                }
            });

            // Activate buttons
            $('.a-available').click(function() {
                $(this).addClass("cell-selected");
                displayBookingModal();
            });
        });
    };

    $('#book-tennis').click(PopulateAvailability);
    $('#book-pickle').click(PopulateAvailability);

    // Default
    PopulateAvailability();

    // Modal cancel button
    $('#book-cancel').click(closeModal);

    // Sign out button
    $('#sign-out-btn').click(function() {firebase.auth().signOut();});

    let bookCourt = function(booking) {
        let db = firebase.firestore();
        let user = firebase.auth().currentUser;
        db.collection("bookings").add({
            user: user.uid,
            bookingType: booking.b_type,
            day: booking.day,
            month: booking.month,
            year: booking.year,
            startTime: booking.startTime
        }).catch(function(error) {
            console.error("Error adding document: ", error);
        });
        closeModal();
        PopulateAvailability();
    }

})(jQuery);
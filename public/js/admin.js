/*!
    * Start Bootstrap - SB Admin v6.0.0 (https://startbootstrap.com/templates/sb-admin)
    * Copyright 2013-2020 Start Bootstrap
    * Licensed under MIT (https://github.com/BlackrockDigital/startbootstrap-sb-admin/blob/master/LICENSE)
    */
    (function($) {
    "use strict";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const typeConvert = {
        'tennis': 'Tennis',
        'pickle_front': 'Pickleball-Front',
        'pickle_back': 'Pickleball-Back'
    };

    // Add active state to sidbar nav links
    var path = window.location.href; // because the 'href' property of the DOM element is the absolute path
        $("#layoutSidenav_nav .sb-sidenav a.nav-link").each(function() {
            if (this.href === path) {
                $(this).addClass("active");
            }
        });

    // Toggle the side navigation
    $("#sidebarToggle").on("click", function(e) {
        e.preventDefault();
        $("body").toggleClass("sb-sidenav-toggled");
    });

        let saveSpecialBooking = async function(sbid) {
            // Get info from fields
            let description = $('#description-field').val();
            let startDate = $('#s-date-field').val();
            let endDate = $('#e-date-field').val();
            let startTime = $('#timeDropdown').text();
            startTime = startTime.split('-')[0];
            let sun = $('#sun').prop('checked');
            let mon = $('#mon').prop('checked');
            let tue = $('#tue').prop('checked');
            let wed = $('#wed').prop('checked');
            let thu = $('#thu').prop('checked');
            let fri = $('#fri').prop('checked');
            let sat = $('#sat').prop('checked');
            let period = $("#periodDropdown").text();
            let bookingData = {
                bookingDescription: description,
                startDate: startDate,
                endDate: endDate,
                startTime: startTime,
                sun: sun,
                mon: mon,
                tue: tue,
                wed: wed,
                thu: thu,
                fri: fri,
                sat: sat,
                period: period
            };
            if (!sbid) {
                await firebase.firestore().collection('special_bookings_revised').add(bookingData)
            } else {
                await firebase.firestore().collection('special_bookings_revised').doc(sbid).set(bookingData)
            }

        };

        // Firebase auth
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Set username
                $('#user-d-name').text(firebase.auth().currentUser.displayName);
            } else {
                window.location = 'index.html';
            }
        });

        $('#backBtn').click(function() {
            window.location = 'book.html'
        });

        let enableNewEventBtn = function() {
            $("#newClubEvent").click(function() {
                $('#special-booking-modal').modal('show');
                $('#sp-booking-modal-header').text('Create New Club Event');
                $('#sp-b-cancel').click(() => {
                    $('#special-booking-modal').modal('hide');
                });
                $('#sp-b-save').click(async function() {
                    $('.table-loading-overlay').show();
                    await saveSpecialBooking();
                    $('#special-booking-modal').modal('hide');
                    // Reload special events
                    await loadSpecialBookingsData();
                    $('.table-loading-overlay').hide();
                })
            })
        };
        $('#special-booking-modal').on('show.bs.modal', function() {
            $('.time-dropdown').click(function() {
                $('#timeDropdown').text($(this).text());
            });
            $('.period-dropdown-item').click(function() {
                $('#periodDropdown').text($(this).text());
            })
        });
        enableNewEventBtn();
        // Activate menu buttons
        $("#users-btn").click(() => {
            $('#users-wrapper').show();
            $('#m-booking-wrapper').hide();
            $('#sp-booking-wrapper').hide();
            $('#newClubEvent').hide();
        });

        $("#m-bookings-btn").click(() => {
            $('#users-wrapper').hide();
            $('#m-booking-wrapper').show();
            $('#sp-booking-wrapper').hide();
            $('#newClubEvent').hide();
        });

        $('#sp-bookings-btn').click(() => {
            $('#users-wrapper').hide();
            $('#m-booking-wrapper').hide();
            $('#sp-booking-wrapper').show();
            $('#newClubEvent').show();
        });

        // Activate data table
        let dtable = $('#usersTable').DataTable();
        let mBookingsTable = $('#m-bookingsTable').DataTable();
        let spBookingsTable = $('#sp-bookingsTable').DataTable();


        // Populate data table
        let functions = firebase.functions();
        // functions.useFunctionsEmulator('http://localhost:5001');

        let loadUserData = async function() {
            console.log("Calling cloud function");
            let users = await functions.httpsCallable('getUserData').call({});
            let userData = users.data;

            dtable.clear();
            let actionButtons = `<div class='btn-group'><button type="button" class="btn btn-outline-warning edit">Edit</button><button type="button" class="btn btn-danger delete">Delete</button></div>`;
            userData.forEach(user => {
                dtable.row.add([user['uid'], user['displayName'], user['email'], (user['disabled'] ? 'Disabled' : 'Enabled'), user['accountType'], actionButtons]).draw();
            });

            // Activate action buttons
            let enableActions = function() {
                console.log('Enabling actions');
                $('.edit').click(function() {
                    let tr = $(this).parent().parent().parent();
                    let uid = dtable.cell(tr, 0).data();
                    let $editModal = $('#edit-modal');
                    $('.dropdown-item').click(function() {
                        $('#dropdownMenuButton').text($(this).text());
                        $(this).addClass('active');
                        $(this).siblings().removeClass('active');
                    });
                    // Activate enable/disable radio buttons

                    console.log('Getting user data');
                    // Get user data
                    for (let user of userData) {
                        if (user.uid === uid) {
                            $('#name-field').val(user.displayName);
                            $('#email-field').val(user.email);
                            if (user.accountType === "Member") {
                                $("#a-member").addClass('active');
                                $("#a-admin").removeClass('active');
                                $('#dropdownMenuButton').text("Member");
                            } else {
                                $("#a-member").removeClass('active');
                                $("#a-admin").addClass('active');
                                $('#dropdownMenuButton').text("Admin");
                            };

                            if (!user.disabled) {
                                $('#enabled-radio').prop('checked', true);
                                $('#disabled-radio').prop('checked', false);
                            } else {
                                $('#disabled-radio').prop('checked', true);
                                $('#enabled-radio').prop('checked', false);
                            }
                        }
                    }
                    // Activate save button
                    $('#view-save').click(async function() {
                        // Get updated data
                        let displayName = $('#name-field').val();
                        let email = $('#email-field').val();
                        let accountType = $('#dropdownMenuButton').text();
                        let disabled = $('#disabled-radio').prop('checked');
                        let newPassword = $('#password-field').val();
                        // Update user
                        let updateUser = functions.httpsCallable('updateUser');
                        updateUser({
                            uid: uid,
                            displayName: displayName,
                            email: email,
                            accountType: accountType,
                            disabled: disabled,
                            password: newPassword
                        }).then(async () => {
                            console.log('Update complete. Reloading table data');
                            $editModal.modal('hide');
                            $('.table-loading-overlay').show();
                            await loadUserData();
                            $('.table-loading-overlay').hide();
                        });

                    });

                    // Activate cancel button
                    $('#view-close').click(function() {
                        $editModal.modal('hide');
                    });

                    $editModal.modal('show');
                });

                // Activate delete user button
                $('.delete').click(function() {
                    let tr = $(this).parent().parent().parent();
                    let name = dtable.cell(tr, 1).data();
                    let uid = dtable.cell(tr, 0).data();
                    $('#delete-message').text(`Are you sure you want to delete ${name}'s account?`);
                    $('#delete-modal').modal('show');
                    // Activate delete confirm buttons
                    $('#confirm-delete').click(async function() {
                        let deleteUser = functions.httpsCallable('deleteUser');
                        await deleteUser({
                            uid: uid
                        }).then(async function() {
                            // Close modal
                            $('#delete-modal').modal('hide');

                            // Reload user data
                            $('.table-loading-overlay').show();
                            await loadUserData();
                            $('.table-loading-overlay').hide();
                        });
                    });

                    // Activate cancel btn
                    $('#cancel-delete').click(function() {
                        $('#delete-modal').modal('hide');
                    })
                });
            };
            enableActions();
            dtable.on('draw', enableActions);
        };

        let loadMemberBookingsData = async function() {
            let db = firebase.firestore();
            // Get user displayNames
            let displayNames = await db.collection('users').get().then(querySnap => {
                let users = {};
                querySnap.forEach(snap => {
                    let userData = snap.data();
                    let uid = snap.id;
                    users[uid] = userData['displayName'];
                });
                return users;
            });
            await db.collection('bookings').get().then(querySnap => {
                if (querySnap) {
                    let actionButtons = `<button type="button" class="btn btn-danger booking-delete">Delete</button>`;
                    querySnap.forEach(snap => {
                        let data = snap.data();
                        let bid = snap.id;
                        mBookingsTable.row.add([
                            bid,
                            (data['user'] in displayNames ? displayNames[data['user']] : data['user']),
                            `${data['year']}/${data['month'] + 1}/${data['day']}`,
                            data['startTime'],
                            typeConvert[data['bookingType']],
                            actionButtons
                        ]).draw();
                    });
                    // Enable delete buttons
                    let enableActions = function() {
                        $('.booking-delete').click(async function() {
                            // Get booking id
                            let tr = $(this).parent().parent();
                            let bid = mBookingsTable.cell(tr, 0).data();
                            console.log(`Deleting booking: ${bid}`);
                            // Delete booking
                            await db.collection('bookings').doc(bid).delete().then(async function() {
                                $('.table-loading-overlay').show();
                                await loadMemberBookingsData();
                                $('.table-loading-overlay').hide();
                            });

                        })
                    };
                    enableActions();
                    mBookingsTable.on('draw', enableActions);

                }
            })
        };

        let getDays = function(days) {
            let output = "";
            let dayList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            for (let i = 0; i < days.length; i++) {
                if (days[i]) {
                    if (output === "") {
                        output += dayList[i]
                    } else {
                        output += `, ${dayList[i]}`
                    }
                }
            }
            return output;
        };

        // Enable actions
        let enableSpecialBookingActions = function() {
            $('.edit-sp').click(async function() {
                // Get booking data
                let tr = $(this).parent().parent().parent();
                let sbid = spBookingsTable.cell(tr, 0).data();
                let bookingData = await firebase.firestore().collection('special_bookings_revised').doc(sbid).get().then(snap => {
                    return snap.data();
                });

                // Display special bookings modal
                $('#special-booking-modal').modal('show');
                $('#sp-b-cancel').click(() => {
                    $('#special-booking-modal').modal('hide');
                });

                // Populate fields in modal
                $('#description-field').val(bookingData['bookingDescription']);
                $("#s-date-field").val(bookingData['startDate']);
                $("#e-date-field").val(bookingData['endDate']);
                // Find time from list and select it
                $('.time-dropdown').each((i, obj) => {
                    let txt = $(obj).text();
                    let spltTxt = txt.split('-');
                    if (spltTxt[0] === bookingData['startTime']) {
                        $("#timeDropdown").text(txt);
                    }
                });
                // Check days
                let dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                dayKeys.forEach(key => {
                    $(`#${key}`).prop('checked', bookingData[key])
                });

                // Update period
                $("#periodDropdown").text(bookingData['period']);
                $("#sp-b-save").click(async function() {
                    $('.table-loading-overlay').show();
                    await saveSpecialBooking(sbid);
                    $("#special-booking-modal").modal('hide');
                    // Refresh
                    await loadSpecialBookingsData();
                    $('.table-loading-overlay').hide();
                })
            })
        };
        spBookingsTable.on('draw', enableSpecialBookingActions);



        let loadSpecialBookingsData = async function() {
            let db = firebase.firestore();
            spBookingsTable.clear();
            await db.collection('special_bookings_revised').get().then(querySnap => {
                querySnap.forEach(snap => {
                    console.log('Adding special booking');
                    let sbid = snap.id;
                    let bData = snap.data();
                    let actions = `<div class='btn-group'><button type="button" class="btn btn-outline-warning edit-sp">Edit</button><button type="button" class="btn btn-danger delete-sp">Delete</button></div>`;
                    spBookingsTable.row.add([
                        sbid,
                        bData['bookingDescription'],
                        bData['startDate'],
                        bData['endDate'],
                        bData['startTime'],
                        getDays([bData['sun'], bData['mon'], bData['tue'], bData['wed'], bData['thu'], bData['fri'], bData['sat']]),
                        bData['period'],
                        actions
                    ]).draw();
                })
            })
        };

        (async () => {
            console.log('changed');
            $('.table-loading-overlay').show();
            await loadUserData();
            await loadMemberBookingsData();
            await loadSpecialBookingsData();
            $('.table-loading-overlay').hide();
        })();

})(jQuery);

/*!
    * Start Bootstrap - SB Admin v6.0.0 (https://startbootstrap.com/templates/sb-admin)
    * Copyright 2013-2020 Start Bootstrap
    * Licensed under MIT (https://github.com/BlackrockDigital/startbootstrap-sb-admin/blob/master/LICENSE)
    */
    (function($) {
    "use strict";

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

    // Activate menu buttons
        $("#users-btn").click(() => {
            $('#users-wrapper').show();
            $('#booking-wrapper').hide();
        });

        $("#bookings-btn").click(() => {
            $('#users-wrapper').hide();
            $('#booking-wrapper').show();
        });

        // Activate data table
        let dtable = $('#usersTable').DataTable();
        let bookingsTable = $('#bookingsTable').DataTable();


        // Populate data table
        let functions = firebase.functions();
        functions.useFunctionsEmulator('http://localhost:5001');
        let loadUserData = async function() {
            console.log("Calling cloud function");
            let users = await functions.httpsCallable('getUserData').call({});
            let userData = users.data;
            /* let userData = [
                {
                    uid: "ABCDEFG",
                    displayName: "Jayson Dale",
                    email: "jaysondale1@gmail.com",
                    disabled: false,
                    accountType: 'Admin'
                },
                {
                    uid: "123456",
                    displayName: "Lisa Dale",
                    email: "lisadale234@gmail.com",
                    disabled: false,
                    accountType: 'Member'
                },
                {
                    uid: "a2c4",
                    displayName: "Jim Dale",
                    email: "jimdale7@gmail.com",
                    disabled: false,
                    accountType: 'Member'
                }
            ];

             */
            dtable.clear();
            let actionButtons = `<div class='btn-group'><a class="btn btn-outline-warning edit">Edit</a><a class="btn btn-danger delete">Delete</a></div>`;
            userData.forEach(user => {
                dtable.row.add([user['uid'], user['displayName'], user['email'], (user['disabled'] ? 'Disabled' : 'Enabled'), user['accountType'], actionButtons]).draw();
            });

            // Activate action buttons
            $('.edit').click(function() {
                let tr = $(this).parent().parent().parent();
                let uid = dtable.cell(tr, 0).data();
                let $editModal = $('#edit-modal');
                $('.dropdown-item').click(function() {
                    $('#dropdownMenuButton').text($(this).text());
                    $(this).addClass('active');
                    $(this).siblings().removeClass('active');
                });
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
                        }

                        if (!user.disabled) {
                            $('#enable-btn-label').addClass('disabled');
                            $('#disable-btn').attr('checked');
                            $('#enable-btn').removeAttr('checked');
                        } else {
                            $('#disable-btn-label').addClass('disabled');
                            $('#enable-btn').attr('checked');
                            $('#disable-btn').removeAttr('checked');
                        }
                    }
                }
                // Activate save button
                $('#view-save').click(async function() {
                    // Get updated data
                    let displayName = $('#name-field').val();
                    let email = $('#email-field').val();
                    let accountType = $('#dropdownMenuButton').text();
                    let disabled = $('#disable-btn-label').hasClass('disabled');
                    let newPassword = $('#password-field').val();
                    // Update user
                    let updateUser = functions.httpsCallable('updateUser');
                    updateUser({
                        uid: uid,
                        displayName: displayName,
                        email: email,
                        accountType: accountType,
                        disabled: disabled,
                        newPassword: newPassword
                    }).then(async () => {
                        console.log('Update complete. Reloading table data');
                        $editModal.modal('hide');
                        await loadUserData()
                    });

                });
                $editModal.modal('show');
            })
        };
        (async () => {
            await loadUserData();
        })();

})(jQuery);

const functions = require('firebase-functions');
const admin = require("firebase-admin");

// var serviceAccount = require("/Users/jaysondale/Downloads/hftc-booking-firebase-adminsdk-642o4-caea15177c.json");

/*
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hftc-booking.firebaseio.com"
});

 */


admin.initializeApp();

const db = admin.firestore();

exports.getUserData = functions.https.onCall(async (data, context) => {
    try{
        if (!context.auth) {
            throw new functions.https.HttpsError('unknown', "User is not authenticated");
        }
        console.log('User authenticated');

        // Validate user admin user
        let currentUid = admin.auth.uid;
        let adminUids = await db.collection('params').doc('admin').get().then(snap => {
            if (snap) {
                let data = snap.data();
                return data['uid'];
            } else {
                return null;
            }
        });

        /*
        if (!adminUids.includes(currentUid)) {
            throw new functions.https.HttpsError('unknown',"User is not admin user");
        }

         */
        console.log('UID verified as admin');

        // User is authenticated, get data
        let users = await db.collection('users').get().then(querySnap => {
            if (querySnap) {
                let users = [];
                console.log('Collecting data');
                querySnap.forEach(doc => {
                    // Get user email address
                    users.push({
                        uid: doc.id,
                        displayName: doc.get('displayName'),
                        accountType: (adminUids.includes(doc.id) ? 'Admin' : 'Member')
                    });
                });
                return users;
            } else {
                throw new functions.https.HttpsError('unknown',"UID query snapshot invalid")
            }
        });
        console.log('Collected uids');
        console.log(users);
        // Get user emails and status
        for (let i = 0; i < users.length; i++) {
            let uid = users[i]['uid'];
            let vals = await admin.auth().getUser(uid).then(userRecord => {
                return [userRecord.email, userRecord.disabled];
            });
            // Add to data
            users[i]['email'] = vals[0];
            users[i]['disabled'] = vals[1];
        }
        console.log('Returning result');
        console.log(users);
        return users;

    } catch (er) {
        throw new functions.https.HttpsError('unknown',"There was an error trying to get user data.");
    }
});

exports.updateUser = functions.https.onCall(async (data, context) => {
    try{
        if (!context.auth) {
            throw new functions.https.HttpsError('unknown', "User is not authenticated");
        }
        console.log('User authenticated');

        // Validate user admin user
        let currentUid = admin.auth.uid;
        let adminUids = await db.collection('params').doc('admin').get().then(snap => {
            if (snap) {
                let data = snap.data();
                return data['uid'];
            } else {
                return null;
            }
        });

        /*
        if (!adminUids.includes(currentUid)) {
            throw new functions.https.HttpsError('unknown',"User is not admin user");
        }

         */

        console.log('UID verified as admin');
        let userData = data;
        console.log(userData);

        // Update user record
        if (userData.password) {
            console.log('Updating with new password');
            await admin.auth().updateUser(userData.uid, {
                email: userData.email,
                displayName: userData.displayName,
                disabled: userData.disabled,
                password: userData.password
            }).then(() => {
                console.log('User record updated')
            }).catch(function(error) {
                console.log('Error updating user:', error);
            })
        } else {
            console.log('Updating without new password');
            await admin.auth().updateUser(userData.uid, {
                email: userData.email,
                displayName: userData.displayName,
                disabled: userData.disabled
            }).then(() => {
                console.log('User record updated')
            }).catch(function(error) {
                console.log('Error updating user:', error);
            })
        }

        // Update user database
        console.log('Updating user database');
        await db.collection('users').doc(userData.uid).set({
            displayName: userData.displayName,
        }).then(() => {
            console.log('Updated user database')
        });

        // Check db for uid
        console.log('Updating admin settings');
        await db.collection('params').doc('admin').get().then(async snap => {
            let data = snap.data();
            let uids = data['uid'];
            let currentUid = userData.uid;
            // Update admin if admin
            console.log('Checking account type: ' + userData.accountType);
            if (userData.accountType === 'Admin') {
                if (!uids.includes(currentUid)) {
                    console.log('Adding admin user');
                    uids.push(currentUid);
                    console.log(uids);
                    await db.collection('params').doc('admin').set({
                        uid: uids
                    })
                }
            } else {
                if (uids.includes(userData.uid)) {
                    // Remove admin user
                    if (uids.length > 1) {
                        uids = uids.filter(el => {
                            return el !== currentUid
                        });
                        await db.collection('params').doc('admin').set({
                            uid: uids
                        })
                    }
                }
            }
            console.log('Update complete');

        })


    } catch (er) {
        throw new functions.https.HttpsError('unknown',"There was an error trying to update user data. " + er);
    }
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unknown', "User is not authenticated");
        }
        console.log('User authenticated');

        // Validate user admin user
        let currentUid = admin.auth.uid;
        let adminUids = await db.collection('params').doc('admin').get().then(snap => {
            if (snap) {
                let data = snap.data();
                return data['uid'];
            } else {
                return null;
            }
        });
        /*
        if (!adminUids.includes(currentUid)) {
            throw new functions.https.HttpsError('unknown', "User is not admin user");
        }

         */
        console.log('UID verified as admin');

        let uid = data.uid;

        // Delete user record
        console.log('Deleting user record');
        // await admin.auth().deleteUser(uid);

        // Delete user from database
        console.log('Deleting user from database');
        await db.collection('users').doc(uid).delete();

        // Delete uid from admin if exists
        if (adminUids.includes(uid)) {
            console.log('Deleting from admin user list');
            adminUids = adminUids.filter(el => {
                return el !== uid;
            });

            // Reset uid list
            await db.collection('params').doc('admin').set({
                uid: adminUids
            })
        }
    } catch (er) {
        throw new functions.https.HttpsError('unknown', "There was an error trying to delete a user")
    }

});
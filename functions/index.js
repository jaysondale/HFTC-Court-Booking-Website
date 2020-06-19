const functions = require('firebase-functions');
const admin = require("firebase-admin");


var serviceAccount = require("/Users/jaysondale/Downloads/hftc-booking-firebase-adminsdk-642o4-caea15177c.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hftc-booking.firebaseio.com"
});

const db = admin.firestore();

exports.getUserData = functions.https.onCall(async (data, context) => {
    try{
        if (!context.auth) {
            throw new functions.https.HttpsError('unknown', "User is not authenticated");
        }

        // Validate user admin user
        let currentUid = admin.auth.uid;
        let adminUid = await db.collection('params').doc('admin').get().then(snap => {
            if (snap) {
                let data = snap.data();
                return data['uid'];
            }
        });
        if (currentUid !== adminUid) {
            throw new functions.https.HttpsError('unknown',"User is not admin user");
        }

        // User is authenticated, get data
        let users = await db.collection('users').get().then(querySnap => {
            if (querySnap) {
                let users = [];
                querySnap.forEach(doc => {
                    // Get user email address
                    users.push({
                        uid: doc.id,
                        displayName: doc.get('displayName'),
                    });
                });
                return users;
            } else {
                throw new functions.https.HttpsError('unknown',"UID query snapshot invalid")
            }
        });

        console.log('Collected uids');
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
        return users;

    } catch (er) {
        throw new functions.https.HttpsError('unknown',"There was an error trying to get user data.");
    }
});
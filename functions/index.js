const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Verify if current user is an Administrator
exports.checkAdmin = functions.database.ref('/special_bookings').onCreate((snap, context) => {
    if (context.authType === 'ADMIN') {
        
    }
})
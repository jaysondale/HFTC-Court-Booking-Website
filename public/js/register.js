let auth = firebase.auth();
let db = firebase.firestore();

// Sign-up form
const su_form = document.querySelector("#sign-up-form");
if (su_form != null) {
    su_form.addEventListener('submit', (e) => {
        e.preventDefault();

        let email = su_form['email'].value;
        let password = su_form['password'].value;

        auth.createUserWithEmailAndPassword(email, password).then(() => {
            console.log("User created");
        });
    });
}

auth.onAuthStateChanged(user => {
    if (user) {
        // Update display name
        let fullName = su_form['fname'].value + " " + su_form['lname'].value;
        user.updateProfile( {
            displayName: fullName
        }).then(() => {
            console.log("Display name set");
            // Add to the database
            db.collection("users").doc(user.uid).set({
                displayName: fullName
            }).then(() => {
                console.log("Display name stored in database");
                // Redirect
                window.location = "book.html";
            });
        })
    }
});
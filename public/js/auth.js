let auth = firebase.auth();

const si_form = document.querySelector('#sign-in-form');
if (si_form != null){
    si_form.addEventListener('submit', (e) => {
        e.preventDefault();
        let email = si_form['email'].value;
        let password = si_form['password'].value;

        auth.signInWithEmailAndPassword(email, password).catch(function(error) {
            console.log(error.message);
        });

    });
}


// Sign-up form
const su_form = document.querySelector("#sign-up-form");
if (su_form != null) {
    su_form.addEventListener('submit', (e) => {
        e.preventDefault();
        let fullName = su_form['fname'].value + " " + su_form['lname'].value;
        let email = su_form['email'].value;
        let password = su_form['password'].value;

        auth.createUserWithEmailAndPassword(email, password).then((cred) => {
            su_form.reset();
            return cred.user.updateProfile({
                displayName: fullName
            });
        })
    });
}

auth.onAuthStateChanged(function(user) {
    if(user){
        window.location = "book.html";
    }
});
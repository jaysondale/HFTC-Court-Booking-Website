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

auth.onAuthStateChanged(function(user) {
    if(user){
        window.location = "book.html";
    }
});